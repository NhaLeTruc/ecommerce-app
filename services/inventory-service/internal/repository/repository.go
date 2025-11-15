package repository

import (
	"context"
	"time"

	"github.com/ecommerce/inventory-service/internal/domain"
)

// InventoryRepository defines inventory data operations
type InventoryRepository interface {
	// Inventory Items
	Create(ctx context.Context, item *domain.InventoryItem) error
	GetByID(ctx context.Context, id string) (*domain.InventoryItem, error)
	GetByProductID(ctx context.Context, productID string) (*domain.InventoryItem, error)
	GetBySKU(ctx context.Context, sku string) (*domain.InventoryItem, error)
	List(ctx context.Context, limit, offset int) ([]*domain.InventoryItem, error)
	Update(ctx context.Context, item *domain.InventoryItem) error
	Delete(ctx context.Context, id string) error

	// Reservations
	CreateReservation(ctx context.Context, reservation *domain.Reservation) error
	GetReservation(ctx context.Context, id string) (*domain.Reservation, error)
	GetReservationsByProductID(ctx context.Context, productID string) ([]*domain.Reservation, error)
	GetReservationsByOrderID(ctx context.Context, orderID string) ([]*domain.Reservation, error)
	UpdateReservation(ctx context.Context, reservation *domain.Reservation) error
	DeleteReservation(ctx context.Context, id string) error
	GetExpiredReservations(ctx context.Context) ([]*domain.Reservation, error)

	// Adjustments
	CreateAdjustment(ctx context.Context, adjustment *domain.InventoryAdjustment) error
	GetAdjustmentsByProductID(ctx context.Context, productID string, limit int) ([]*domain.InventoryAdjustment, error)

	// Stock checks
	GetLowStockItems(ctx context.Context) ([]*domain.InventoryItem, error)
	GetOutOfStockItems(ctx context.Context) ([]*domain.InventoryItem, error)
}

// CacheRepository defines caching operations
type CacheRepository interface {
	Get(ctx context.Context, key string) (*domain.InventoryItem, error)
	Set(ctx context.Context, key string, item *domain.InventoryItem, ttl time.Duration) error
	Delete(ctx context.Context, key string) error
	FlushAll(ctx context.Context) error
}
