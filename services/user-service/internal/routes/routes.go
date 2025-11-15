package routes

import (
	"github.com/gin-gonic/gin"

	"github.com/ecommerce/user-service/internal/handlers"
	"github.com/ecommerce/user-service/internal/middleware"
)

func SetupRoutes(
	router *gin.Engine,
	userHandler *handlers.UserHandler,
	authMiddleware *middleware.AuthMiddleware,
) {
	// Health check
	router.GET("/health", userHandler.HealthCheck)

	// API v1
	v1 := router.Group("/api/v1")
	{
		// Public auth routes
		auth := v1.Group("/auth")
		{
			auth.POST("/register", userHandler.Register)
			auth.POST("/login", userHandler.Login)
			auth.POST("/logout", userHandler.Logout)
			auth.POST("/validate", userHandler.ValidateToken)
		}

		// Protected user routes
		users := v1.Group("/users")
		users.Use(authMiddleware.Authenticate())
		{
			users.GET("/profile", userHandler.GetProfile)
			users.PUT("/profile", userHandler.UpdateProfile)
			users.POST("/change-password", userHandler.ChangePassword)
		}
	}
}
