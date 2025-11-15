package config

import (
	"fmt"
	"os"
	"strconv"
)

// Config holds application configuration
type Config struct {
	// Server
	Port int
	Environment string

	// Database
	DatabaseURL string

	// Redis
	RedisAddr     string
	RedisPassword string
	RedisDB       int

	// Kafka
	KafkaBrokers string
	KafkaTopic   string

	// OpenTelemetry
	OTLPEndpoint string

	// Business logic
	ReservationTTL int // in minutes
}

// Load loads configuration from environment variables
func Load() (*Config, error) {
	port, err := strconv.Atoi(getEnv("PORT", "8080"))
	if err != nil {
		return nil, fmt.Errorf("invalid PORT: %w", err)
	}

	redisDB, err := strconv.Atoi(getEnv("REDIS_DB", "0"))
	if err != nil {
		return nil, fmt.Errorf("invalid REDIS_DB: %w", err)
	}

	reservationTTL, err := strconv.Atoi(getEnv("RESERVATION_TTL_MINUTES", "15"))
	if err != nil {
		return nil, fmt.Errorf("invalid RESERVATION_TTL_MINUTES: %w", err)
	}

	return &Config{
		Port:           port,
		Environment:    getEnv("ENVIRONMENT", "development"),
		DatabaseURL:    getEnv("DATABASE_URL", "postgres://ecommerce:dev_password@postgres:5432/ecommerce?sslmode=disable"),
		RedisAddr:      getEnv("REDIS_ADDR", "redis:6379"),
		RedisPassword:  getEnv("REDIS_PASSWORD", ""),
		RedisDB:        redisDB,
		KafkaBrokers:   getEnv("KAFKA_BROKERS", "kafka:9092"),
		KafkaTopic:     getEnv("KAFKA_TOPIC", "inventory-events"),
		OTLPEndpoint:   getEnv("OTLP_ENDPOINT", "otel-collector:4317"),
		ReservationTTL: reservationTTL,
	}, nil
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
