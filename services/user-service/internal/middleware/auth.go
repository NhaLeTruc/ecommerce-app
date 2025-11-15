package middleware

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"

	"github.com/ecommerce/user-service/internal/auth"
	"github.com/ecommerce/user-service/internal/models"
)

type AuthMiddleware struct {
	jwtService *auth.JWTService
	logger     *zap.Logger
}

func NewAuthMiddleware(jwtService *auth.JWTService, logger *zap.Logger) *AuthMiddleware {
	return &AuthMiddleware{
		jwtService: jwtService,
		logger:     logger,
	}
}

// Authenticate validates JWT token from Authorization header or cookie
func (m *AuthMiddleware) Authenticate() gin.HandlerFunc {
	return func(c *gin.Context) {
		var token string

		// Try to get token from Authorization header first
		authHeader := c.GetHeader("Authorization")
		if authHeader != "" {
			// Extract token from "Bearer <token>"
			parts := strings.Split(authHeader, " ")
			if len(parts) == 2 && parts[0] == "Bearer" {
				token = parts[1]
			}
		}

		// If no token in header, try to get from cookie
		if token == "" {
			cookieToken, err := c.Cookie("auth_token")
			if err == nil && cookieToken != "" {
				token = cookieToken
			}
		}

		// If still no token, return unauthorized
		if token == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Authorization required"})
			c.Abort()
			return
		}
		claims, err := m.jwtService.ValidateToken(token)
		if err != nil {
			m.logger.Warn("Invalid token", zap.Error(err))
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid or expired token"})
			c.Abort()
			return
		}

		// Set user info in context
		c.Set("user_id", claims.UserID)
		c.Set("user_email", claims.Email)
		c.Set("user_role", claims.Role)

		c.Next()
	}
}

// RequireRole checks if user has the required role
func (m *AuthMiddleware) RequireRole(allowedRoles ...models.UserRole) gin.HandlerFunc {
	return func(c *gin.Context) {
		role, exists := c.Get("user_role")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "User role not found in context"})
			c.Abort()
			return
		}

		userRole, ok := role.(models.UserRole)
		if !ok {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Invalid role type"})
			c.Abort()
			return
		}

		// Check if user role is in allowed roles
		for _, allowedRole := range allowedRoles {
			if userRole == allowedRole {
				c.Next()
				return
			}
		}

		m.logger.Warn("Access denied - insufficient permissions",
			zap.String("user_role", string(userRole)),
			zap.Any("required_roles", allowedRoles),
		)

		c.JSON(http.StatusForbidden, gin.H{"error": "Insufficient permissions"})
		c.Abort()
	}
}

// RequireAdmin is a convenience method for admin-only routes
func (m *AuthMiddleware) RequireAdmin() gin.HandlerFunc {
	return m.RequireRole(models.RoleAdmin)
}
