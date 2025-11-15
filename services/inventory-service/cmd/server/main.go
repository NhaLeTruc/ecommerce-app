package main

import (
	"context"
	"database/sql"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"github.com/ecommerce/inventory-service/internal/api"
	"github.com/ecommerce/inventory-service/internal/config"
	"github.com/ecommerce/inventory-service/internal/events"
	"github.com/ecommerce/inventory-service/internal/middleware"
	"github.com/ecommerce/inventory-service/internal/repository"
	"github.com/ecommerce/inventory-service/pkg/logger"
	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
	"go.opentelemetry.io/contrib/instrumentation/github.com/gin-gonic/gin/otelgin"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc"
	"go.opentelemetry.io/otel/sdk/resource"
	sdktrace "go.opentelemetry.io/otel/sdk/trace"
	semconv "go.opentelemetry.io/otel/semconv/v1.4.0"
	"go.uber.org/zap"

	_ "github.com/lib/pq"
)

func main() {
	// Load configuration
	cfg, err := config.Load()
	if err != nil {
		fmt.Printf("Failed to load config: %v\n", err)
		os.Exit(1)
	}

	// Initialize logger
	log, err := logger.NewLogger(cfg.Environment)
	if err != nil {
		fmt.Printf("Failed to initialize logger: %v\n", err)
		os.Exit(1)
	}
	defer log.Sync()

	log.Info("Starting Inventory Service",
		zap.String("environment", cfg.Environment),
		zap.Int("port", cfg.Port),
	)

	// Initialize OpenTelemetry
	cleanup, err := initTelemetry(cfg)
	if err != nil {
		log.Fatal("Failed to initialize telemetry", zap.Error(err))
	}
	defer cleanup()

	// Initialize PostgreSQL
	db, err := sql.Open("postgres", cfg.DatabaseURL)
	if err != nil {
		log.Fatal("Failed to connect to database", zap.Error(err))
	}
	defer db.Close()

	// Test database connection
	if err := db.Ping(); err != nil {
		log.Fatal("Failed to ping database", zap.Error(err))
	}
	log.Info("Database connected")

	// Initialize Redis
	redisClient := redis.NewClient(&redis.Options{
		Addr:     cfg.RedisAddr,
		Password: cfg.RedisPassword,
		DB:       cfg.RedisDB,
	})
	defer redisClient.Close()

	// Test Redis connection
	ctx := context.Background()
	if err := redisClient.Ping(ctx).Err(); err != nil {
		log.Fatal("Failed to connect to Redis", zap.Error(err))
	}
	log.Info("Redis connected")

	// Initialize repositories
	inventoryRepo := repository.NewPostgresRepository(db)
	cacheRepo := repository.NewRedisRepository(redisClient)

	// Initialize Kafka publisher
	brokers := strings.Split(cfg.KafkaBrokers, ",")
	publisher := events.NewKafkaPublisher(brokers, cfg.KafkaTopic, log)
	defer publisher.Close()

	// Initialize handler
	handler := api.NewHandler(inventoryRepo, cacheRepo, publisher, cfg, log)

	// Setup Gin
	if cfg.Environment == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	router := gin.New()
	router.Use(gin.Recovery())
	router.Use(middleware.CorrelationID())
	router.Use(otelgin.Middleware("inventory-service"))

	// Health check
	router.GET("/health", handler.HealthCheck)

	// API routes
	v1 := router.Group("/api/v1")
	{
		inventory := v1.Group("/inventory")
		{
			inventory.GET("", handler.ListInventoryItems)
			inventory.POST("", handler.CreateInventoryItem)
			inventory.GET("/:id", handler.GetInventoryItem)
			inventory.PUT("/:id", handler.UpdateInventoryItem)
			inventory.POST("/:id/reserve", handler.ReserveInventory)
			inventory.POST("/:id/adjust", handler.AdjustInventory)
			inventory.GET("/low-stock", handler.GetLowStockItems)
		}

		inventory.GET("/product/:productId", handler.GetInventoryByProductID)

		reservations := v1.Group("/reservations")
		{
			reservations.DELETE("/:reservationId", handler.ReleaseReservation)
		}
	}

	// Create HTTP server
	srv := &http.Server{
		Addr:         fmt.Sprintf(":%d", cfg.Port),
		Handler:      router,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Start server in goroutine
	go func() {
		log.Info("Server starting", zap.Int("port", cfg.Port))
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatal("Server failed to start", zap.Error(err))
		}
	}()

	// Wait for interrupt signal
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Info("Shutting down server...")

	// Graceful shutdown
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		log.Fatal("Server forced to shutdown", zap.Error(err))
	}

	log.Info("Server shutdown complete")
}

func initTelemetry(cfg *config.Config) (func(), error) {
	ctx := context.Background()

	res, err := resource.New(ctx,
		resource.WithAttributes(
			semconv.ServiceNameKey.String("inventory-service"),
			semconv.ServiceVersionKey.String("1.0.0"),
		),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create resource: %w", err)
	}

	traceExporter, err := otlptracegrpc.New(ctx,
		otlptracegrpc.WithEndpoint(cfg.OTLPEndpoint),
		otlptracegrpc.WithInsecure(),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create trace exporter: %w", err)
	}

	bsp := sdktrace.NewBatchSpanProcessor(traceExporter)
	tracerProvider := sdktrace.NewTracerProvider(
		sdktrace.WithSampler(sdktrace.AlwaysSample()),
		sdktrace.WithResource(res),
		sdktrace.WithSpanProcessor(bsp),
	)

	otel.SetTracerProvider(tracerProvider)

	return func() {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		if err := tracerProvider.Shutdown(ctx); err != nil {
			fmt.Printf("Failed to shutdown tracer provider: %v\n", err)
		}
	}, nil
}
