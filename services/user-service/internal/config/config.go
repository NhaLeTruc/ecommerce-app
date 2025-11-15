package config

import (
	"os"
	"strconv"
)

type Config struct {
	Port           string
	DBHost         string
	DBPort         string
	DBUser         string
	DBPassword     string
	DBName         string
	JWTSecret      string
	JWTExpiryHours int
	Environment    string
}

func Load() *Config {
	jwtExpiryHours := 24 // default 24 hours
	if exp := os.Getenv("JWT_EXPIRY_HOURS"); exp != "" {
		if hours, err := strconv.Atoi(exp); err == nil {
			jwtExpiryHours = hours
		}
	}

	return &Config{
		Port:           getEnv("PORT", "8084"),
		DBHost:         getEnv("DB_HOST", "localhost"),
		DBPort:         getEnv("DB_PORT", "5432"),
		DBUser:         getEnv("DB_USER", "postgres"),
		DBPassword:     getEnv("DB_PASSWORD", "postgres"),
		DBName:         getEnv("DB_NAME", "users_db"),
		JWTSecret:      getEnv("JWT_SECRET", "your-secret-key-change-in-production"),
		JWTExpiryHours: jwtExpiryHours,
		Environment:    getEnv("ENVIRONMENT", "development"),
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
