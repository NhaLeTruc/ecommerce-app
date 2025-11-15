package api

import (
	"net/http"
	"strconv"
	"time"

	"github.com/ecommerce/inventory-service/internal/config"
	"github.com/ecommerce/inventory-service/internal/domain"
	"github.com/ecommerce/inventory-service/internal/events"
	"github.com/ecommerce/inventory-service/internal/repository"
	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

type Handler struct {
	repo      repository.InventoryRepository
	cache     repository.CacheRepository
	publisher events.Publisher
	config    *config.Config
	logger    *zap.Logger
}

func NewHandler(
	repo repository.InventoryRepository,
	cache repository.CacheRepository,
	publisher events.Publisher,
	cfg *config.Config,
	logger *zap.Logger,
) *Handler {
	return &Handler{
		repo:      repo,
		cache:     cache,
		publisher: publisher,
		config:    cfg,
		logger:    logger,
	}
}

// CreateInventoryItem creates a new inventory item
func (h *Handler) CreateInventoryItem(c *gin.Context) {
	var item domain.InventoryItem

	if err := c.ShouldBindJSON(&item); err != nil {
		h.logger.Warn("Invalid request body", zap.Error(err))
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body", "details": err.Error()})
		return
	}

	if err := h.repo.Create(c.Request.Context(), &item); err != nil {
		h.logger.Error("Failed to create inventory item", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create inventory item"})
		return
	}

	// Publish event
	if err := h.publisher.PublishInventoryCreated(c.Request.Context(), &item); err != nil {
		h.logger.Error("Failed to publish inventory created event", zap.Error(err))
	}

	// Cache the item
	if err := h.cache.Set(c.Request.Context(), item.ProductID, &item, 5*time.Minute); err != nil {
		h.logger.Warn("Failed to cache inventory item", zap.Error(err))
	}

	h.logger.Info("Inventory item created", zap.String("id", item.ID), zap.String("product_id", item.ProductID))
	c.JSON(http.StatusCreated, item)
}

// GetInventoryItem retrieves an inventory item by ID
func (h *Handler) GetInventoryItem(c *gin.Context) {
	id := c.Param("id")

	item, err := h.repo.GetByID(c.Request.Context(), id)
	if err == domain.ErrNotFound {
		c.JSON(http.StatusNotFound, gin.H{"error": "Inventory item not found"})
		return
	}
	if err != nil {
		h.logger.Error("Failed to get inventory item", zap.Error(err), zap.String("id", id))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get inventory item"})
		return
	}

	c.JSON(http.StatusOK, item)
}

// GetInventoryByProductID retrieves inventory by product ID (with caching)
func (h *Handler) GetInventoryByProductID(c *gin.Context) {
	productID := c.Param("productId")

	// Try cache first
	item, err := h.cache.Get(c.Request.Context(), productID)
	if err == nil && item != nil {
		h.logger.Debug("Cache hit", zap.String("product_id", productID))
		c.JSON(http.StatusOK, item)
		return
	}

	// Cache miss - query database
	item, err = h.repo.GetByProductID(c.Request.Context(), productID)
	if err == domain.ErrNotFound {
		c.JSON(http.StatusNotFound, gin.H{"error": "Inventory item not found"})
		return
	}
	if err != nil {
		h.logger.Error("Failed to get inventory item", zap.Error(err), zap.String("product_id", productID))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get inventory item"})
		return
	}

	// Cache the result
	if err := h.cache.Set(c.Request.Context(), productID, item, 5*time.Minute); err != nil {
		h.logger.Warn("Failed to cache inventory item", zap.Error(err))
	}

	c.JSON(http.StatusOK, item)
}

// ListInventoryItems lists inventory items with pagination
func (h *Handler) ListInventoryItems(c *gin.Context) {
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))

	if limit > 100 {
		limit = 100
	}

	items, err := h.repo.List(c.Request.Context(), limit, offset)
	if err != nil {
		h.logger.Error("Failed to list inventory items", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to list inventory items"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"items":  items,
		"limit":  limit,
		"offset": offset,
	})
}

// UpdateInventoryItem updates an inventory item
func (h *Handler) UpdateInventoryItem(c *gin.Context) {
	id := c.Param("id")

	var item domain.InventoryItem
	if err := c.ShouldBindJSON(&item); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body", "details": err.Error()})
		return
	}

	item.ID = id
	if err := h.repo.Update(c.Request.Context(), &item); err == domain.ErrNotFound {
		c.JSON(http.StatusNotFound, gin.H{"error": "Inventory item not found"})
		return
	} else if err != nil {
		h.logger.Error("Failed to update inventory item", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update inventory item"})
		return
	}

	// Invalidate cache
	if err := h.cache.Delete(c.Request.Context(), item.ProductID); err != nil {
		h.logger.Warn("Failed to invalidate cache", zap.Error(err))
	}

	// Publish event
	if err := h.publisher.PublishInventoryUpdated(c.Request.Context(), &item); err != nil {
		h.logger.Error("Failed to publish inventory updated event", zap.Error(err))
	}

	c.JSON(http.StatusOK, item)
}

// ReserveInventory reserves inventory for an order
func (h *Handler) ReserveInventory(c *gin.Context) {
	id := c.Param("id")

	var req struct {
		Quantity   int    `json:"quantity" binding:"required,min=1"`
		OrderID    string `json:"order_id" binding:"required"`
		CustomerID string `json:"customer_id" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body", "details": err.Error()})
		return
	}

	// Get inventory item
	item, err := h.repo.GetByID(c.Request.Context(), id)
	if err == domain.ErrNotFound {
		c.JSON(http.StatusNotFound, gin.H{"error": "Inventory item not found"})
		return
	}
	if err != nil {
		h.logger.Error("Failed to get inventory item", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get inventory item"})
		return
	}

	// Reserve inventory
	if err := item.Reserve(req.Quantity); err == domain.ErrInsufficientStock {
		c.JSON(http.StatusConflict, gin.H{"error": "Insufficient stock", "available": item.AvailableQuantity})
		return
	} else if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Update database
	if err := h.repo.Update(c.Request.Context(), item); err != nil {
		h.logger.Error("Failed to update inventory", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to reserve inventory"})
		return
	}

	// Create reservation record
	reservation := &domain.Reservation{
		ProductID:  item.ProductID,
		Quantity:   req.Quantity,
		OrderID:    req.OrderID,
		CustomerID: req.CustomerID,
		ExpiresAt:  time.Now().Add(time.Duration(h.config.ReservationTTL) * time.Minute),
		Status:     "pending",
	}

	if err := h.repo.CreateReservation(c.Request.Context(), reservation); err != nil {
		h.logger.Error("Failed to create reservation", zap.Error(err))
		// Attempt to rollback
		_ = item.ReleaseReservation(req.Quantity)
		_ = h.repo.Update(c.Request.Context(), item)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create reservation"})
		return
	}

	// Invalidate cache
	_ = h.cache.Delete(c.Request.Context(), item.ProductID)

	// Publish event
	if err := h.publisher.PublishInventoryReserved(c.Request.Context(), item, reservation); err != nil {
		h.logger.Error("Failed to publish reservation event", zap.Error(err))
	}

	h.logger.Info("Inventory reserved", zap.String("product_id", item.ProductID), zap.Int("quantity", req.Quantity))
	c.JSON(http.StatusOK, gin.H{
		"reservation_id": reservation.ID,
		"expires_at":     reservation.ExpiresAt,
		"item":           item,
	})
}

// ReleaseReservation releases a reservation
func (h *Handler) ReleaseReservation(c *gin.Context) {
	reservationID := c.Param("reservationId")

	// Get reservation
	reservation, err := h.repo.GetReservation(c.Request.Context(), reservationID)
	if err == domain.ErrReservationNotFound {
		c.JSON(http.StatusNotFound, gin.H{"error": "Reservation not found"})
		return
	}
	if err != nil {
		h.logger.Error("Failed to get reservation", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get reservation"})
		return
	}

	// Get inventory item
	item, err := h.repo.GetByProductID(c.Request.Context(), reservation.ProductID)
	if err != nil {
		h.logger.Error("Failed to get inventory item", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get inventory item"})
		return
	}

	// Release reservation
	if err := item.ReleaseReservation(reservation.Quantity); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Update database
	if err := h.repo.Update(c.Request.Context(), item); err != nil {
		h.logger.Error("Failed to update inventory", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to release reservation"})
		return
	}

	// Update reservation status
	reservation.Status = "cancelled"
	if err := h.repo.UpdateReservation(c.Request.Context(), reservation); err != nil {
		h.logger.Error("Failed to update reservation", zap.Error(err))
	}

	// Invalidate cache
	_ = h.cache.Delete(c.Request.Context(), item.ProductID)

	// Publish event
	if err := h.publisher.PublishReservationReleased(c.Request.Context(), item, reservation); err != nil {
		h.logger.Error("Failed to publish release event", zap.Error(err))
	}

	h.logger.Info("Reservation released", zap.String("reservation_id", reservationID))
	c.JSON(http.StatusOK, item)
}

// AdjustInventory adjusts inventory quantity
func (h *Handler) AdjustInventory(c *gin.Context) {
	id := c.Param("id")

	var req struct {
		Quantity   int    `json:"quantity" binding:"required"`
		Reason     string `json:"reason" binding:"required"`
		AdjustedBy string `json:"adjusted_by" binding:"required"`
		Notes      string `json:"notes"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body", "details": err.Error()})
		return
	}

	// Get inventory item
	item, err := h.repo.GetByID(c.Request.Context(), id)
	if err == domain.ErrNotFound {
		c.JSON(http.StatusNotFound, gin.H{"error": "Inventory item not found"})
		return
	}
	if err != nil {
		h.logger.Error("Failed to get inventory item", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get inventory item"})
		return
	}

	// Apply adjustment
	if req.Quantity > 0 {
		_ = item.Add(req.Quantity)
	} else {
		_ = item.Deduct(-req.Quantity)
	}

	// Update database
	if err := h.repo.Update(c.Request.Context(), item); err != nil {
		h.logger.Error("Failed to update inventory", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to adjust inventory"})
		return
	}

	// Create adjustment record
	adjustment := &domain.InventoryAdjustment{
		ProductID:  item.ProductID,
		Quantity:   req.Quantity,
		Reason:     req.Reason,
		AdjustedBy: req.AdjustedBy,
		Notes:      req.Notes,
	}

	if err := h.repo.CreateAdjustment(c.Request.Context(), adjustment); err != nil {
		h.logger.Error("Failed to create adjustment record", zap.Error(err))
	}

	// Invalidate cache
	_ = h.cache.Delete(c.Request.Context(), item.ProductID)

	// Publish event
	if err := h.publisher.PublishInventoryAdjusted(c.Request.Context(), item, adjustment); err != nil {
		h.logger.Error("Failed to publish adjustment event", zap.Error(err))
	}

	h.logger.Info("Inventory adjusted", zap.String("product_id", item.ProductID), zap.Int("quantity", req.Quantity))
	c.JSON(http.StatusOK, item)
}

// GetLowStockItems retrieves items with low stock
func (h *Handler) GetLowStockItems(c *gin.Context) {
	items, err := h.repo.GetLowStockItems(c.Request.Context())
	if err != nil {
		h.logger.Error("Failed to get low stock items", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get low stock items"})
		return
	}

	c.JSON(http.StatusOK, items)
}

// HealthCheck handler
func (h *Handler) HealthCheck(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"status":  "healthy",
		"service": "inventory-service",
		"version": "1.0.0",
	})
}
