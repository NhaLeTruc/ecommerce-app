package repository

import (
	"context"
	"database/sql"
	"errors"
	"time"

	"github.com/ecommerce/inventory-service/internal/domain"
	"github.com/google/uuid"
	_ "github.com/lib/pq"
)

type postgresRepository struct {
	db *sql.DB
}

// NewPostgresRepository creates a new PostgreSQL repository
func NewPostgresRepository(db *sql.DB) InventoryRepository {
	return &postgresRepository{db: db}
}

// Create creates a new inventory item
func (r *postgresRepository) Create(ctx context.Context, item *domain.InventoryItem) error {
	if item.ID == "" {
		item.ID = uuid.New().String()
	}

	now := time.Now()
	item.CreatedAt = now
	item.UpdatedAt = now
	item.CalculateAvailableQuantity()
	item.UpdateStatus()

	query := `
		INSERT INTO inventory_items (
			id, product_id, sku, quantity, reserved_quantity, available_quantity,
			reorder_level, reorder_quantity, status, location, created_at, updated_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
	`

	_, err := r.db.ExecContext(ctx, query,
		item.ID, item.ProductID, item.SKU, item.Quantity, item.ReservedQuantity,
		item.AvailableQuantity, item.ReorderLevel, item.ReorderQuantity,
		item.Status, item.Location, item.CreatedAt, item.UpdatedAt,
	)

	return err
}

// GetByID retrieves an inventory item by ID
func (r *postgresRepository) GetByID(ctx context.Context, id string) (*domain.InventoryItem, error) {
	query := `
		SELECT id, product_id, sku, quantity, reserved_quantity, available_quantity,
			   reorder_level, reorder_quantity, status, location, created_at, updated_at
		FROM inventory_items WHERE id = $1
	`

	item := &domain.InventoryItem{}
	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&item.ID, &item.ProductID, &item.SKU, &item.Quantity, &item.ReservedQuantity,
		&item.AvailableQuantity, &item.ReorderLevel, &item.ReorderQuantity,
		&item.Status, &item.Location, &item.CreatedAt, &item.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, domain.ErrNotFound
	}

	return item, err
}

// GetByProductID retrieves an inventory item by product ID
func (r *postgresRepository) GetByProductID(ctx context.Context, productID string) (*domain.InventoryItem, error) {
	query := `
		SELECT id, product_id, sku, quantity, reserved_quantity, available_quantity,
			   reorder_level, reorder_quantity, status, location, created_at, updated_at
		FROM inventory_items WHERE product_id = $1
	`

	item := &domain.InventoryItem{}
	err := r.db.QueryRowContext(ctx, query, productID).Scan(
		&item.ID, &item.ProductID, &item.SKU, &item.Quantity, &item.ReservedQuantity,
		&item.AvailableQuantity, &item.ReorderLevel, &item.ReorderQuantity,
		&item.Status, &item.Location, &item.CreatedAt, &item.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, domain.ErrNotFound
	}

	return item, err
}

// GetBySKU retrieves an inventory item by SKU
func (r *postgresRepository) GetBySKU(ctx context.Context, sku string) (*domain.InventoryItem, error) {
	query := `
		SELECT id, product_id, sku, quantity, reserved_quantity, available_quantity,
			   reorder_level, reorder_quantity, status, location, created_at, updated_at
		FROM inventory_items WHERE sku = $1
	`

	item := &domain.InventoryItem{}
	err := r.db.QueryRowContext(ctx, query, sku).Scan(
		&item.ID, &item.ProductID, &item.SKU, &item.Quantity, &item.ReservedQuantity,
		&item.AvailableQuantity, &item.ReorderLevel, &item.ReorderQuantity,
		&item.Status, &item.Location, &item.CreatedAt, &item.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, domain.ErrNotFound
	}

	return item, err
}

// List retrieves inventory items with pagination
func (r *postgresRepository) List(ctx context.Context, limit, offset int) ([]*domain.InventoryItem, error) {
	query := `
		SELECT id, product_id, sku, quantity, reserved_quantity, available_quantity,
			   reorder_level, reorder_quantity, status, location, created_at, updated_at
		FROM inventory_items
		ORDER BY created_at DESC
		LIMIT $1 OFFSET $2
	`

	rows, err := r.db.QueryContext(ctx, query, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []*domain.InventoryItem
	for rows.Next() {
		item := &domain.InventoryItem{}
		err := rows.Scan(
			&item.ID, &item.ProductID, &item.SKU, &item.Quantity, &item.ReservedQuantity,
			&item.AvailableQuantity, &item.ReorderLevel, &item.ReorderQuantity,
			&item.Status, &item.Location, &item.CreatedAt, &item.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		items = append(items, item)
	}

	return items, rows.Err()
}

// Update updates an inventory item
func (r *postgresRepository) Update(ctx context.Context, item *domain.InventoryItem) error {
	item.UpdatedAt = time.Now()
	item.CalculateAvailableQuantity()
	item.UpdateStatus()

	query := `
		UPDATE inventory_items
		SET quantity = $1, reserved_quantity = $2, available_quantity = $3,
			reorder_level = $4, reorder_quantity = $5, status = $6,
			location = $7, updated_at = $8
		WHERE id = $9
	`

	result, err := r.db.ExecContext(ctx, query,
		item.Quantity, item.ReservedQuantity, item.AvailableQuantity,
		item.ReorderLevel, item.ReorderQuantity, item.Status,
		item.Location, item.UpdatedAt, item.ID,
	)

	if err != nil {
		return err
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}

	if rows == 0 {
		return domain.ErrNotFound
	}

	return nil
}

// Delete deletes an inventory item
func (r *postgresRepository) Delete(ctx context.Context, id string) error {
	query := `DELETE FROM inventory_items WHERE id = $1`

	result, err := r.db.ExecContext(ctx, query, id)
	if err != nil {
		return err
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}

	if rows == 0 {
		return domain.ErrNotFound
	}

	return nil
}

// CreateReservation creates a new reservation
func (r *postgresRepository) CreateReservation(ctx context.Context, reservation *domain.Reservation) error {
	if reservation.ID == "" {
		reservation.ID = uuid.New().String()
	}
	reservation.CreatedAt = time.Now()

	query := `
		INSERT INTO reservations (id, product_id, quantity, order_id, customer_id, expires_at, status, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
	`

	_, err := r.db.ExecContext(ctx, query,
		reservation.ID, reservation.ProductID, reservation.Quantity,
		reservation.OrderID, reservation.CustomerID, reservation.ExpiresAt,
		reservation.Status, reservation.CreatedAt,
	)

	return err
}

// GetReservation retrieves a reservation by ID
func (r *postgresRepository) GetReservation(ctx context.Context, id string) (*domain.Reservation, error) {
	query := `
		SELECT id, product_id, quantity, order_id, customer_id, expires_at, status, created_at
		FROM reservations WHERE id = $1
	`

	reservation := &domain.Reservation{}
	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&reservation.ID, &reservation.ProductID, &reservation.Quantity,
		&reservation.OrderID, &reservation.CustomerID, &reservation.ExpiresAt,
		&reservation.Status, &reservation.CreatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, domain.ErrReservationNotFound
	}

	return reservation, err
}

// GetReservationsByProductID retrieves reservations by product ID
func (r *postgresRepository) GetReservationsByProductID(ctx context.Context, productID string) ([]*domain.Reservation, error) {
	query := `
		SELECT id, product_id, quantity, order_id, customer_id, expires_at, status, created_at
		FROM reservations WHERE product_id = $1 AND status = 'pending'
		ORDER BY created_at DESC
	`

	return r.queryReservations(ctx, query, productID)
}

// GetReservationsByOrderID retrieves reservations by order ID
func (r *postgresRepository) GetReservationsByOrderID(ctx context.Context, orderID string) ([]*domain.Reservation, error) {
	query := `
		SELECT id, product_id, quantity, order_id, customer_id, expires_at, status, created_at
		FROM reservations WHERE order_id = $1
		ORDER BY created_at DESC
	`

	return r.queryReservations(ctx, query, orderID)
}

// UpdateReservation updates a reservation
func (r *postgresRepository) UpdateReservation(ctx context.Context, reservation *domain.Reservation) error {
	query := `
		UPDATE reservations
		SET status = $1
		WHERE id = $2
	`

	result, err := r.db.ExecContext(ctx, query, reservation.Status, reservation.ID)
	if err != nil {
		return err
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}

	if rows == 0 {
		return domain.ErrReservationNotFound
	}

	return nil
}

// DeleteReservation deletes a reservation
func (r *postgresRepository) DeleteReservation(ctx context.Context, id string) error {
	query := `DELETE FROM reservations WHERE id = $1`

	result, err := r.db.ExecContext(ctx, query, id)
	if err != nil {
		return err
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}

	if rows == 0 {
		return domain.ErrReservationNotFound
	}

	return nil
}

// GetExpiredReservations retrieves expired reservations
func (r *postgresRepository) GetExpiredReservations(ctx context.Context) ([]*domain.Reservation, error) {
	query := `
		SELECT id, product_id, quantity, order_id, customer_id, expires_at, status, created_at
		FROM reservations
		WHERE status = 'pending' AND expires_at < $1
	`

	return r.queryReservations(ctx, query, time.Now())
}

// CreateAdjustment creates an inventory adjustment record
func (r *postgresRepository) CreateAdjustment(ctx context.Context, adjustment *domain.InventoryAdjustment) error {
	if adjustment.ID == "" {
		adjustment.ID = uuid.New().String()
	}
	adjustment.CreatedAt = time.Now()

	query := `
		INSERT INTO inventory_adjustments (id, product_id, quantity, reason, adjusted_by, notes, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
	`

	_, err := r.db.ExecContext(ctx, query,
		adjustment.ID, adjustment.ProductID, adjustment.Quantity,
		adjustment.Reason, adjustment.AdjustedBy, adjustment.Notes, adjustment.CreatedAt,
	)

	return err
}

// GetAdjustmentsByProductID retrieves adjustments for a product
func (r *postgresRepository) GetAdjustmentsByProductID(ctx context.Context, productID string, limit int) ([]*domain.InventoryAdjustment, error) {
	query := `
		SELECT id, product_id, quantity, reason, adjusted_by, notes, created_at
		FROM inventory_adjustments
		WHERE product_id = $1
		ORDER BY created_at DESC
		LIMIT $2
	`

	rows, err := r.db.QueryContext(ctx, query, productID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var adjustments []*domain.InventoryAdjustment
	for rows.Next() {
		adj := &domain.InventoryAdjustment{}
		err := rows.Scan(
			&adj.ID, &adj.ProductID, &adj.Quantity, &adj.Reason,
			&adj.AdjustedBy, &adj.Notes, &adj.CreatedAt,
		)
		if err != nil {
			return nil, err
		}
		adjustments = append(adjustments, adj)
	}

	return adjustments, rows.Err()
}

// GetLowStockItems retrieves items with low stock
func (r *postgresRepository) GetLowStockItems(ctx context.Context) ([]*domain.InventoryItem, error) {
	query := `
		SELECT id, product_id, sku, quantity, reserved_quantity, available_quantity,
			   reorder_level, reorder_quantity, status, location, created_at, updated_at
		FROM inventory_items
		WHERE status = 'low_stock' OR available_quantity <= reorder_level
		ORDER BY available_quantity ASC
	`

	return r.queryInventoryItems(ctx, query)
}

// GetOutOfStockItems retrieves out of stock items
func (r *postgresRepository) GetOutOfStockItems(ctx context.Context) ([]*domain.InventoryItem, error) {
	query := `
		SELECT id, product_id, sku, quantity, reserved_quantity, available_quantity,
			   reorder_level, reorder_quantity, status, location, created_at, updated_at
		FROM inventory_items
		WHERE status = 'out_of_stock' OR available_quantity = 0
	`

	return r.queryInventoryItems(ctx, query)
}

// Helper methods

func (r *postgresRepository) queryReservations(ctx context.Context, query string, args ...interface{}) ([]*domain.Reservation, error) {
	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var reservations []*domain.Reservation
	for rows.Next() {
		res := &domain.Reservation{}
		err := rows.Scan(
			&res.ID, &res.ProductID, &res.Quantity,
			&res.OrderID, &res.CustomerID, &res.ExpiresAt,
			&res.Status, &res.CreatedAt,
		)
		if err != nil {
			return nil, err
		}
		reservations = append(reservations, res)
	}

	return reservations, rows.Err()
}

func (r *postgresRepository) queryInventoryItems(ctx context.Context, query string, args ...interface{}) ([]*domain.InventoryItem, error) {
	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []*domain.InventoryItem
	for rows.Next() {
		item := &domain.InventoryItem{}
		err := rows.Scan(
			&item.ID, &item.ProductID, &item.SKU, &item.Quantity, &item.ReservedQuantity,
			&item.AvailableQuantity, &item.ReorderLevel, &item.ReorderQuantity,
			&item.Status, &item.Location, &item.CreatedAt, &item.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		items = append(items, item)
	}

	return items, rows.Err()
}
