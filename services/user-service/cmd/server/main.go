package main

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"go.uber.org/zap"

	"github.com/ecommerce/user-service/internal/auth"
	"github.com/ecommerce/user-service/internal/config"
	"github.com/ecommerce/user-service/internal/database"
	"github.com/ecommerce/user-service/internal/handlers"
	"github.com/ecommerce/user-service/internal/middleware"
	"github.com/ecommerce/user-service/internal/routes"
	"github.com/ecommerce/user-service/internal/services"
)

func main() {
	// Initialize logger
	logger, err := zap.NewProduction()
	if err != nil {
		panic(fmt.Sprintf("Failed to initialize logger: %v", err))
	}
	defer logger.Sync()

	// Load configuration
	cfg := config.Load()
	logger.Info("Configuration loaded",
		zap.String("environment", cfg.Environment),
		zap.String("port", cfg.Port),
	)

	// Connect to database
	db, err := database.Connect(cfg, logger)
	if err != nil {
		logger.Fatal("Failed to connect to database", zap.Error(err))
	}
	defer db.Close()

	// Initialize database schema
	if err := database.InitSchema(db, logger); err != nil {
		logger.Fatal("Failed to initialize database schema", zap.Error(err))
	}

	// Initialize repositories
	userRepo := database.NewUserRepository(db)

	// Initialize services
	jwtService := auth.NewJWTService(cfg)
	userService := services.NewUserService(userRepo, jwtService, logger)

	// Initialize handlers
	userHandler := handlers.NewUserHandler(userService, logger)

	// Initialize middleware
	authMiddleware := middleware.NewAuthMiddleware(jwtService, logger)

	// Setup router
	if cfg.Environment == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	router := gin.Default()

	// CORS middleware
	router.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:3000", "http://localhost:3001"},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	// Setup routes
	routes.SetupRoutes(router, userHandler, authMiddleware)

	// Create HTTP server
	srv := &http.Server{
		Addr:    ":" + cfg.Port,
		Handler: router,
	}

	// Start server in goroutine
	go func() {
		logger.Info("Starting User Service", zap.String("port", cfg.Port))
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Fatal("Failed to start server", zap.Error(err))
		}
	}()

	// Wait for interrupt signal for graceful shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	logger.Info("Shutting down server...")

	// Graceful shutdown with 5 second timeout
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		logger.Fatal("Server forced to shutdown", zap.Error(err))
	}

	logger.Info("User Service stopped")
}
