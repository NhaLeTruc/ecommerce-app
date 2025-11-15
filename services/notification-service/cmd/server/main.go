package main

import (
	"context"
	"fmt"
	"os"
	"os/signal"
	"syscall"

	"github.com/ecommerce/notification-service/internal/config"
	"github.com/ecommerce/notification-service/internal/consumer"
	"github.com/ecommerce/notification-service/internal/email"
	"github.com/ecommerce/notification-service/internal/handlers"
	"github.com/ecommerce/notification-service/internal/sms"
	"github.com/ecommerce/notification-service/internal/templates"
	"go.uber.org/zap"
)

func main() {
	// Initialize logger
	logger, err := initLogger()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to initialize logger: %v\n", err)
		os.Exit(1)
	}
	defer logger.Sync()

	logger.Info("Starting Notification Service")

	// Load configuration
	cfg, err := config.LoadConfig()
	if err != nil {
		logger.Fatal("Failed to load configuration", zap.Error(err))
	}

	logger.Info("Configuration loaded",
		zap.Strings("kafka_brokers", cfg.KafkaBrokers),
		zap.Strings("kafka_topics", cfg.KafkaTopics),
		zap.String("smtp_host", cfg.SMTPHost),
		zap.Int("smtp_port", cfg.SMTPPort),
	)

	// Initialize template engine
	templateEngine, err := templates.NewTemplateEngine(cfg.TemplatesDir, logger)
	if err != nil {
		logger.Fatal("Failed to initialize template engine", zap.Error(err))
	}
	logger.Info("Template engine initialized")

	// Initialize email sender
	emailSender := email.NewEmailSender(cfg, logger)
	logger.Info("Email sender initialized")

	// Initialize SMS sender
	smsSender := sms.NewSMSSender(cfg, logger)
	logger.Info("SMS sender initialized")

	// Initialize notification handler
	notificationHandler := handlers.NewNotificationHandler(
		emailSender,
		smsSender,
		templateEngine,
		logger,
	)
	logger.Info("Notification handler initialized")

	// Initialize Kafka consumer
	kafkaConsumer := consumer.NewConsumer(cfg, notificationHandler, logger)
	logger.Info("Kafka consumer initialized")

	// Start consumer in a goroutine
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	errChan := make(chan error, 1)
	go func() {
		if err := kafkaConsumer.Start(ctx, cfg.KafkaTopics); err != nil {
			errChan <- err
		}
	}()

	logger.Info("Notification Service started successfully",
		zap.Strings("subscribed_topics", cfg.KafkaTopics),
	)

	// Wait for interrupt signal to gracefully shut down
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, os.Interrupt, syscall.SIGTERM)

	select {
	case <-sigChan:
		logger.Info("Received shutdown signal")
	case err := <-errChan:
		logger.Error("Consumer error", zap.Error(err))
	}

	// Graceful shutdown
	logger.Info("Shutting down gracefully...")
	cancel()

	if err := kafkaConsumer.Close(); err != nil {
		logger.Error("Failed to close Kafka consumer", zap.Error(err))
	}

	logger.Info("Notification Service stopped")
}

func initLogger() (*zap.Logger, error) {
	env := os.Getenv("ENVIRONMENT")
	if env == "production" {
		return zap.NewProduction()
	}
	return zap.NewDevelopment()
}
