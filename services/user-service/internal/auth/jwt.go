package auth

import (
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"

	"github.com/ecommerce/user-service/internal/config"
	"github.com/ecommerce/user-service/internal/models"
)

type Claims struct {
	UserID string          `json:"user_id"`
	Email  string          `json:"email"`
	Role   models.UserRole `json:"role"`
	jwt.RegisteredClaims
}

type JWTService struct {
	config *config.Config
}

func NewJWTService(cfg *config.Config) *JWTService {
	return &JWTService{config: cfg}
}

func (s *JWTService) GenerateToken(user *models.User) (string, error) {
	expirationTime := time.Now().Add(time.Duration(s.config.JWTExpiryHours) * time.Hour)

	claims := &Claims{
		UserID: user.ID,
		Email:  user.Email,
		Role:   user.Role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expirationTime),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Issuer:    "ecommerce-user-service",
			Subject:   user.ID,
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString([]byte(s.config.JWTSecret))
	if err != nil {
		return "", fmt.Errorf("failed to sign token: %w", err)
	}

	return tokenString, nil
}

func (s *JWTService) ValidateToken(tokenString string) (*Claims, error) {
	claims := &Claims{}

	token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
		// Validate signing method
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return []byte(s.config.JWTSecret), nil
	})

	if err != nil {
		return nil, fmt.Errorf("failed to parse token: %w", err)
	}

	if !token.Valid {
		return nil, fmt.Errorf("invalid token")
	}

	return claims, nil
}

func (s *JWTService) RefreshToken(oldTokenString string) (string, error) {
	claims, err := s.ValidateToken(oldTokenString)
	if err != nil {
		return "", fmt.Errorf("invalid token for refresh: %w", err)
	}

	// Create new token with fresh expiration
	expirationTime := time.Now().Add(time.Duration(s.config.JWTExpiryHours) * time.Hour)
	claims.ExpiresAt = jwt.NewNumericDate(expirationTime)
	claims.IssuedAt = jwt.NewNumericDate(time.Now())

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString([]byte(s.config.JWTSecret))
	if err != nil {
		return "", fmt.Errorf("failed to sign refreshed token: %w", err)
	}

	return tokenString, nil
}
