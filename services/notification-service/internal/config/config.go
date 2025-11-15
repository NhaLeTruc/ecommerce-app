package config

import (
	"fmt"
	"os"
	"strconv"
	"strings"
)

// Config holds application configuration
type Config struct {
	// Kafka
	KafkaBrokers []string
	KafkaTopics  []string
	ConsumerGroup string

	// SMTP Email
	SMTPHost     string
	SMTPPort     int
	SMTPUsername string
	SMTPPassword string
	FromEmail    string
	FromName     string

	// SMS (Twilio)
	TwilioAccountSID string
	TwilioAuthToken  string
	TwilioFromNumber string

	// Service
	Environment  string
	TemplatesDir string
}

// LoadConfig loads configuration from environment variables
func LoadConfig() (*Config, error) {
	return Load()
}

// Load loads configuration from environment variables
func Load() (*Config, error) {
	smtpPort, err := strconv.Atoi(getEnv("SMTP_PORT", "587"))
	if err != nil {
		return nil, fmt.Errorf("invalid SMTP_PORT: %w", err)
	}

	kafkaBrokers := strings.Split(getEnv("KAFKA_BROKERS", "kafka:9092"), ",")
	kafkaTopics := strings.Split(
		getEnv("KAFKA_TOPICS", "order-events,payment-events"),
		",",
	)

	return &Config{
		KafkaBrokers:  kafkaBrokers,
		KafkaTopics:   kafkaTopics,
		ConsumerGroup: getEnv("KAFKA_CONSUMER_GROUP", "notification-service"),

		SMTPHost:     getEnv("SMTP_HOST", "smtp.gmail.com"),
		SMTPPort:     smtpPort,
		SMTPUsername: getEnv("SMTP_USERNAME", ""),
		SMTPPassword: getEnv("SMTP_PASSWORD", ""),
		FromEmail:    getEnv("FROM_EMAIL", "noreply@ecommerce.com"),
		FromName:     getEnv("FROM_NAME", "Ecommerce Platform"),

		TwilioAccountSID: getEnv("TWILIO_ACCOUNT_SID", ""),
		TwilioAuthToken:  getEnv("TWILIO_AUTH_TOKEN", ""),
		TwilioFromNumber: getEnv("TWILIO_FROM_NUMBER", ""),

		Environment:  getEnv("ENVIRONMENT", "development"),
		TemplatesDir: getEnv("TEMPLATES_DIR", ""),
	}, nil
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
