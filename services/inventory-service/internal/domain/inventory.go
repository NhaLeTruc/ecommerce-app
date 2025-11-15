package domain

import (
	"errors"
	"time"
)

// InventoryStatus represents the status of an inventory item
type InventoryStatus string

const (
	StatusInStock    InventoryStatus = "in_stock"
	StatusLowStock   InventoryStatus = "low_stock"
	StatusOutOfStock InventoryStatus = "out_of_stock"
	StatusReserved   InventoryStatus = "reserved"
)

// InventoryItem represents an inventory item in the system
type InventoryItem struct {
	ID                string          `json:"id"`
	ProductID         string          `json:"product_id"`
	SKU               string          `json:"sku"`
	Quantity          int             `json:"quantity"`
	ReservedQuantity  int             `json:"reserved_quantity"`
	AvailableQuantity int             `json:"available_quantity"`
	ReorderLevel      int             `json:"reorder_level"`
	ReorderQuantity   int             `json:"reorder_quantity"`
	Status            InventoryStatus `json:"status"`
	Location          string          `json:"location"`
	CreatedAt         time.Time       `json:"created_at"`
	UpdatedAt         time.Time       `json:"updated_at"`
}

// Reservation represents a temporary hold on inventory
type Reservation struct {
	ID            string    `json:"id"`
	ProductID     string    `json:"product_id"`
	Quantity      int       `json:"quantity"`
	OrderID       string    `json:"order_id"`
	CustomerID    string    `json:"customer_id"`
	ExpiresAt     time.Time `json:"expires_at"`
	Status        string    `json:"status"` // pending, confirmed, cancelled, expired
	CreatedAt     time.Time `json:"created_at"`
}

// InventoryAdjustment represents a change in inventory
type InventoryAdjustment struct {
	ID           string    `json:"id"`
	ProductID    string    `json:"product_id"`
	Quantity     int       `json:"quantity"` // Positive for increase, negative for decrease
	Reason       string    `json:"reason"`
	AdjustedBy   string    `json:"adjusted_by"`
	Notes        string    `json:"notes"`
	CreatedAt    time.Time `json:"created_at"`
}

// Common errors
var (
	ErrInsufficientStock = errors.New("insufficient stock available")
	ErrInvalidQuantity   = errors.New("invalid quantity")
	ErrNotFound          = errors.New("inventory item not found")
	ErrReservationExpired = errors.New("reservation has expired")
	ErrReservationNotFound = errors.New("reservation not found")
)

// CalculateAvailableQuantity computes available quantity
func (i *InventoryItem) CalculateAvailableQuantity() {
	i.AvailableQuantity = i.Quantity - i.ReservedQuantity
}

// UpdateStatus updates the inventory status based on quantity
func (i *InventoryItem) UpdateStatus() {
	i.CalculateAvailableQuantity()

	switch {
	case i.AvailableQuantity == 0:
		i.Status = StatusOutOfStock
	case i.AvailableQuantity <= i.ReorderLevel:
		i.Status = StatusLowStock
	case i.ReservedQuantity > 0:
		i.Status = StatusReserved
	default:
		i.Status = StatusInStock
	}
}

// CanReserve checks if quantity can be reserved
func (i *InventoryItem) CanReserve(quantity int) bool {
	return i.AvailableQuantity >= quantity
}

// Reserve reserves inventory
func (i *InventoryItem) Reserve(quantity int) error {
	if quantity <= 0 {
		return ErrInvalidQuantity
	}

	if !i.CanReserve(quantity) {
		return ErrInsufficientStock
	}

	i.ReservedQuantity += quantity
	i.UpdateStatus()
	i.UpdatedAt = time.Now()

	return nil
}

// ReleaseReservation releases a reservation
func (i *InventoryItem) ReleaseReservation(quantity int) error {
	if quantity <= 0 {
		return ErrInvalidQuantity
	}

	if quantity > i.ReservedQuantity {
		return errors.New("cannot release more than reserved quantity")
	}

	i.ReservedQuantity -= quantity
	i.UpdateStatus()
	i.UpdatedAt = time.Now()

	return nil
}

// Deduct deducts inventory (confirms reservation)
func (i *InventoryItem) Deduct(quantity int) error {
	if quantity <= 0 {
		return ErrInvalidQuantity
	}

	if quantity > i.Quantity {
		return ErrInsufficientStock
	}

	i.Quantity -= quantity

	// Also reduce reserved if this was a reservation confirmation
	if i.ReservedQuantity >= quantity {
		i.ReservedQuantity -= quantity
	}

	i.UpdateStatus()
	i.UpdatedAt = time.Now()

	return nil
}

// Add adds inventory
func (i *InventoryItem) Add(quantity int) error {
	if quantity <= 0 {
		return ErrInvalidQuantity
	}

	i.Quantity += quantity
	i.UpdateStatus()
	i.UpdatedAt = time.Now()

	return nil
}

// ShouldReorder checks if reorder is needed
func (i *InventoryItem) ShouldReorder() bool {
	return i.AvailableQuantity <= i.ReorderLevel
}
