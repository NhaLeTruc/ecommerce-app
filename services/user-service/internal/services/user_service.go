package services

import (
	"fmt"

	"go.uber.org/zap"

	"github.com/ecommerce/user-service/internal/auth"
	"github.com/ecommerce/user-service/internal/database"
	"github.com/ecommerce/user-service/internal/models"
)

type UserService struct {
	repo       *database.UserRepository
	jwtService *auth.JWTService
	logger     *zap.Logger
}

func NewUserService(repo *database.UserRepository, jwtService *auth.JWTService, logger *zap.Logger) *UserService {
	return &UserService{
		repo:       repo,
		jwtService: jwtService,
		logger:     logger,
	}
}

func (s *UserService) Register(req models.RegisterRequest) (*models.LoginResponse, error) {
	// Check if email already exists
	exists, err := s.repo.EmailExists(req.Email)
	if err != nil {
		s.logger.Error("Failed to check email existence", zap.Error(err))
		return nil, fmt.Errorf("failed to check email: %w", err)
	}
	if exists {
		return nil, fmt.Errorf("email already registered")
	}

	// Hash password
	passwordHash, err := auth.HashPassword(req.Password)
	if err != nil {
		s.logger.Error("Failed to hash password", zap.Error(err))
		return nil, fmt.Errorf("failed to hash password: %w", err)
	}

	// Create user
	user := &models.User{
		Email:        req.Email,
		PasswordHash: passwordHash,
		FirstName:    req.FirstName,
		LastName:     req.LastName,
		Phone:        req.Phone,
		Role:         models.RoleCustomer, // Default role
		IsActive:     true,
	}

	if err := s.repo.Create(user); err != nil {
		s.logger.Error("Failed to create user", zap.Error(err))
		return nil, fmt.Errorf("failed to create user: %w", err)
	}

	// Generate JWT token
	token, err := s.jwtService.GenerateToken(user)
	if err != nil {
		s.logger.Error("Failed to generate token", zap.Error(err))
		return nil, fmt.Errorf("failed to generate token: %w", err)
	}

	s.logger.Info("User registered successfully",
		zap.String("user_id", user.ID),
		zap.String("email", user.Email),
	)

	return &models.LoginResponse{
		Token: token,
		User:  *user,
	}, nil
}

func (s *UserService) Login(req models.LoginRequest) (*models.LoginResponse, error) {
	// Find user by email
	user, err := s.repo.FindByEmail(req.Email)
	if err != nil {
		s.logger.Warn("Login attempt with non-existent email", zap.String("email", req.Email))
		return nil, fmt.Errorf("invalid credentials")
	}

	// Check if user is active
	if !user.IsActive {
		s.logger.Warn("Login attempt for inactive user", zap.String("user_id", user.ID))
		return nil, fmt.Errorf("account is inactive")
	}

	// Verify password
	if err := auth.ComparePassword(user.PasswordHash, req.Password); err != nil {
		s.logger.Warn("Login attempt with incorrect password",
			zap.String("user_id", user.ID),
			zap.String("email", req.Email),
		)
		return nil, fmt.Errorf("invalid credentials")
	}

	// Generate JWT token
	token, err := s.jwtService.GenerateToken(user)
	if err != nil {
		s.logger.Error("Failed to generate token", zap.Error(err))
		return nil, fmt.Errorf("failed to generate token: %w", err)
	}

	s.logger.Info("User logged in successfully",
		zap.String("user_id", user.ID),
		zap.String("email", user.Email),
	)

	return &models.LoginResponse{
		Token: token,
		User:  *user,
	}, nil
}

func (s *UserService) GetProfile(userID string) (*models.User, error) {
	user, err := s.repo.FindByID(userID)
	if err != nil {
		s.logger.Error("Failed to get user profile", zap.String("user_id", userID), zap.Error(err))
		return nil, fmt.Errorf("failed to get profile: %w", err)
	}

	return user, nil
}

func (s *UserService) UpdateProfile(userID string, req models.UpdateProfileRequest) (*models.User, error) {
	user, err := s.repo.FindByID(userID)
	if err != nil {
		s.logger.Error("Failed to find user for update", zap.String("user_id", userID), zap.Error(err))
		return nil, fmt.Errorf("user not found: %w", err)
	}

	// Update fields if provided
	if req.FirstName != "" {
		user.FirstName = req.FirstName
	}
	if req.LastName != "" {
		user.LastName = req.LastName
	}
	if req.Phone != "" {
		user.Phone = req.Phone
	}

	if err := s.repo.Update(user); err != nil {
		s.logger.Error("Failed to update user", zap.String("user_id", userID), zap.Error(err))
		return nil, fmt.Errorf("failed to update profile: %w", err)
	}

	s.logger.Info("User profile updated", zap.String("user_id", userID))

	return user, nil
}

func (s *UserService) ChangePassword(userID string, req models.ChangePasswordRequest) error {
	user, err := s.repo.FindByID(userID)
	if err != nil {
		s.logger.Error("Failed to find user for password change", zap.String("user_id", userID), zap.Error(err))
		return fmt.Errorf("user not found: %w", err)
	}

	// Verify current password
	if err := auth.ComparePassword(user.PasswordHash, req.CurrentPassword); err != nil {
		s.logger.Warn("Password change attempt with incorrect current password", zap.String("user_id", userID))
		return fmt.Errorf("current password is incorrect")
	}

	// Hash new password
	newPasswordHash, err := auth.HashPassword(req.NewPassword)
	if err != nil {
		s.logger.Error("Failed to hash new password", zap.Error(err))
		return fmt.Errorf("failed to hash new password: %w", err)
	}

	// Update password
	if err := s.repo.UpdatePassword(userID, newPasswordHash); err != nil {
		s.logger.Error("Failed to update password", zap.String("user_id", userID), zap.Error(err))
		return fmt.Errorf("failed to update password: %w", err)
	}

	s.logger.Info("User password changed", zap.String("user_id", userID))

	return nil
}

func (s *UserService) ValidateToken(tokenString string) (*auth.Claims, error) {
	claims, err := s.jwtService.ValidateToken(tokenString)
	if err != nil {
		return nil, fmt.Errorf("invalid token: %w", err)
	}

	return claims, nil
}
