package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"

	"github.com/ecommerce/user-service/internal/models"
	"github.com/ecommerce/user-service/internal/services"
)

type UserHandler struct {
	userService *services.UserService
	logger      *zap.Logger
}

func NewUserHandler(userService *services.UserService, logger *zap.Logger) *UserHandler {
	return &UserHandler{
		userService: userService,
		logger:      logger,
	}
}

// Register handles user registration
// POST /auth/register
func (h *UserHandler) Register(c *gin.Context) {
	var req models.RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.logger.Warn("Invalid registration request", zap.Error(err))
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request data", "details": err.Error()})
		return
	}

	response, err := h.userService.Register(req)
	if err != nil {
		if err.Error() == "email already registered" {
			c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
			return
		}
		h.logger.Error("Failed to register user", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to register user"})
		return
	}

	c.JSON(http.StatusCreated, response)
}

// Login handles user login
// POST /auth/login
func (h *UserHandler) Login(c *gin.Context) {
	var req models.LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.logger.Warn("Invalid login request", zap.Error(err))
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request data", "details": err.Error()})
		return
	}

	response, err := h.userService.Login(req)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, response)
}

// GetProfile returns the current user's profile
// GET /users/profile
func (h *UserHandler) GetProfile(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	user, err := h.userService.GetProfile(userID.(string))
	if err != nil {
		h.logger.Error("Failed to get user profile", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get profile"})
		return
	}

	c.JSON(http.StatusOK, user)
}

// UpdateProfile updates the current user's profile
// PUT /users/profile
func (h *UserHandler) UpdateProfile(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	var req models.UpdateProfileRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.logger.Warn("Invalid update profile request", zap.Error(err))
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request data", "details": err.Error()})
		return
	}

	user, err := h.userService.UpdateProfile(userID.(string), req)
	if err != nil {
		h.logger.Error("Failed to update profile", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update profile"})
		return
	}

	c.JSON(http.StatusOK, user)
}

// ChangePassword changes the current user's password
// POST /users/change-password
func (h *UserHandler) ChangePassword(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	var req models.ChangePasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.logger.Warn("Invalid change password request", zap.Error(err))
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request data", "details": err.Error()})
		return
	}

	if err := h.userService.ChangePassword(userID.(string), req); err != nil {
		if err.Error() == "current password is incorrect" {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		h.logger.Error("Failed to change password", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to change password"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Password changed successfully"})
}

// ValidateToken validates a JWT token
// POST /auth/validate
func (h *UserHandler) ValidateToken(c *gin.Context) {
	var req struct {
		Token string `json:"token" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Token is required"})
		return
	}

	claims, err := h.userService.ValidateToken(req.Token)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"valid": false, "error": "Invalid token"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"valid":   true,
		"user_id": claims.UserID,
		"email":   claims.Email,
		"role":    claims.Role,
	})
}

// HealthCheck returns service health status
// GET /health
func (h *UserHandler) HealthCheck(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"status":  "healthy",
		"service": "user-service",
	})
}
