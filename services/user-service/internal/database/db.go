package database

import (
	"database/sql"
	"fmt"

	_ "github.com/lib/pq"
	"go.uber.org/zap"

	"github.com/ecommerce/user-service/internal/config"
)

func Connect(cfg *config.Config, logger *zap.Logger) (*sql.DB, error) {
	dsn := fmt.Sprintf(
		"host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
		cfg.DBHost,
		cfg.DBPort,
		cfg.DBUser,
		cfg.DBPassword,
		cfg.DBName,
	)

	db, err := sql.Open("postgres", dsn)
	if err != nil {
		return nil, fmt.Errorf("failed to open database: %w", err)
	}

	if err := db.Ping(); err != nil {
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	logger.Info("Database connected successfully",
		zap.String("host", cfg.DBHost),
		zap.String("database", cfg.DBName),
	)

	return db, nil
}

func InitSchema(db *sql.DB, logger *zap.Logger) error {
	schema := `
	CREATE TABLE IF NOT EXISTS users (
		id VARCHAR(36) PRIMARY KEY,
		email VARCHAR(255) UNIQUE NOT NULL,
		password_hash VARCHAR(255) NOT NULL,
		first_name VARCHAR(100) NOT NULL,
		last_name VARCHAR(100) NOT NULL,
		phone VARCHAR(20),
		role VARCHAR(20) NOT NULL DEFAULT 'customer',
		is_active BOOLEAN NOT NULL DEFAULT true,
		created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
		updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
	);

	CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
	CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
	`

	if _, err := db.Exec(schema); err != nil {
		return fmt.Errorf("failed to initialize schema: %w", err)
	}

	logger.Info("Database schema initialized successfully")
	return nil
}
