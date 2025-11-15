package database

import (
	"database/sql"
	"fmt"
	"time"

	"github.com/ecommerce/user-service/internal/models"
	"github.com/google/uuid"
)

type UserRepository struct {
	db *sql.DB
}

func NewUserRepository(db *sql.DB) *UserRepository {
	return &UserRepository{db: db}
}

func (r *UserRepository) Create(user *models.User) error {
	user.ID = uuid.New().String()
	user.CreatedAt = time.Now()
	user.UpdatedAt = time.Now()

	query := `
		INSERT INTO users (id, email, password_hash, first_name, last_name, phone, role, is_active, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
	`

	_, err := r.db.Exec(
		query,
		user.ID,
		user.Email,
		user.PasswordHash,
		user.FirstName,
		user.LastName,
		user.Phone,
		user.Role,
		user.IsActive,
		user.CreatedAt,
		user.UpdatedAt,
	)

	if err != nil {
		return fmt.Errorf("failed to create user: %w", err)
	}

	return nil
}

func (r *UserRepository) FindByEmail(email string) (*models.User, error) {
	user := &models.User{}

	query := `
		SELECT id, email, password_hash, first_name, last_name, phone, role, is_active, created_at, updated_at
		FROM users
		WHERE email = $1
	`

	err := r.db.QueryRow(query, email).Scan(
		&user.ID,
		&user.Email,
		&user.PasswordHash,
		&user.FirstName,
		&user.LastName,
		&user.Phone,
		&user.Role,
		&user.IsActive,
		&user.CreatedAt,
		&user.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("user not found")
	}
	if err != nil {
		return nil, fmt.Errorf("failed to find user: %w", err)
	}

	return user, nil
}

func (r *UserRepository) FindByID(id string) (*models.User, error) {
	user := &models.User{}

	query := `
		SELECT id, email, password_hash, first_name, last_name, phone, role, is_active, created_at, updated_at
		FROM users
		WHERE id = $1
	`

	err := r.db.QueryRow(query, id).Scan(
		&user.ID,
		&user.Email,
		&user.PasswordHash,
		&user.FirstName,
		&user.LastName,
		&user.Phone,
		&user.Role,
		&user.IsActive,
		&user.CreatedAt,
		&user.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("user not found")
	}
	if err != nil {
		return nil, fmt.Errorf("failed to find user: %w", err)
	}

	return user, nil
}

func (r *UserRepository) Update(user *models.User) error {
	user.UpdatedAt = time.Now()

	query := `
		UPDATE users
		SET first_name = $1, last_name = $2, phone = $3, updated_at = $4
		WHERE id = $5
	`

	result, err := r.db.Exec(
		query,
		user.FirstName,
		user.LastName,
		user.Phone,
		user.UpdatedAt,
		user.ID,
	)

	if err != nil {
		return fmt.Errorf("failed to update user: %w", err)
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rows == 0 {
		return fmt.Errorf("user not found")
	}

	return nil
}

func (r *UserRepository) UpdatePassword(userID, newPasswordHash string) error {
	query := `
		UPDATE users
		SET password_hash = $1, updated_at = $2
		WHERE id = $3
	`

	result, err := r.db.Exec(query, newPasswordHash, time.Now(), userID)
	if err != nil {
		return fmt.Errorf("failed to update password: %w", err)
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rows == 0 {
		return fmt.Errorf("user not found")
	}

	return nil
}

func (r *UserRepository) EmailExists(email string) (bool, error) {
	var exists bool
	query := `SELECT EXISTS(SELECT 1 FROM users WHERE email = $1)`

	err := r.db.QueryRow(query, email).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("failed to check email existence: %w", err)
	}

	return exists, nil
}
