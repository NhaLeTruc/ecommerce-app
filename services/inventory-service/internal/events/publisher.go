package events

import (
	"context"
	"encoding/json"
	"time"

	"github.com/ecommerce/inventory-service/internal/domain"
	"github.com/segmentio/kafka-go"
	"go.uber.org/zap"
)

type Publisher interface {
	PublishInventoryCreated(ctx context.Context, item *domain.InventoryItem) error
	PublishInventoryUpdated(ctx context.Context, item *domain.InventoryItem) error
	PublishInventoryReserved(ctx context.Context, item *domain.InventoryItem, reservation *domain.Reservation) error
	PublishReservationReleased(ctx context.Context, item *domain.InventoryItem, reservation *domain.Reservation) error
	PublishInventoryAdjusted(ctx context.Context, item *domain.InventoryItem, adjustment *domain.InventoryAdjustment) error
	Close() error
}

type kafkaPublisher struct {
	writer *kafka.Writer
	logger *zap.Logger
}

func NewKafkaPublisher(brokers []string, topic string, logger *zap.Logger) Publisher {
	writer := &kafka.Writer{
		Addr:         kafka.TCP(brokers...),
		Topic:        topic,
		Balancer:     &kafka.LeastBytes{},
		RequiredAcks: kafka.RequireOne,
		Async:        false,
	}

	return &kafkaPublisher{
		writer: writer,
		logger: logger,
	}
}

type InventoryEvent struct {
	EventType string                 `json:"event_type"`
	ProductID string                 `json:"product_id"`
	Timestamp time.Time              `json:"timestamp"`
	Data      map[string]interface{} `json:"data"`
}

func (p *kafkaPublisher) publishEvent(ctx context.Context, event *InventoryEvent) error {
	data, err := json.Marshal(event)
	if err != nil {
		p.logger.Error("Failed to marshal event", zap.Error(err))
		return err
	}

	message := kafka.Message{
		Key:   []byte(event.ProductID),
		Value: data,
		Time:  event.Timestamp,
	}

	if err := p.writer.WriteMessages(ctx, message); err != nil {
		p.logger.Error("Failed to publish event", zap.Error(err), zap.String("event_type", event.EventType))
		return err
	}

	p.logger.Debug("Event published", zap.String("event_type", event.EventType), zap.String("product_id", event.ProductID))
	return nil
}

func (p *kafkaPublisher) PublishInventoryCreated(ctx context.Context, item *domain.InventoryItem) error {
	event := &InventoryEvent{
		EventType: "inventory.created",
		ProductID: item.ProductID,
		Timestamp: time.Now(),
		Data: map[string]interface{}{
			"id":                 item.ID,
			"product_id":         item.ProductID,
			"sku":                item.SKU,
			"quantity":           item.Quantity,
			"available_quantity": item.AvailableQuantity,
			"status":             item.Status,
		},
	}

	return p.publishEvent(ctx, event)
}

func (p *kafkaPublisher) PublishInventoryUpdated(ctx context.Context, item *domain.InventoryItem) error {
	event := &InventoryEvent{
		EventType: "inventory.updated",
		ProductID: item.ProductID,
		Timestamp: time.Now(),
		Data: map[string]interface{}{
			"id":                 item.ID,
			"product_id":         item.ProductID,
			"quantity":           item.Quantity,
			"reserved_quantity":  item.ReservedQuantity,
			"available_quantity": item.AvailableQuantity,
			"status":             item.Status,
		},
	}

	return p.publishEvent(ctx, event)
}

func (p *kafkaPublisher) PublishInventoryReserved(ctx context.Context, item *domain.InventoryItem, reservation *domain.Reservation) error {
	event := &InventoryEvent{
		EventType: "inventory.reserved",
		ProductID: item.ProductID,
		Timestamp: time.Now(),
		Data: map[string]interface{}{
			"product_id":         item.ProductID,
			"reservation_id":     reservation.ID,
			"order_id":           reservation.OrderID,
			"quantity":           reservation.Quantity,
			"reserved_quantity":  item.ReservedQuantity,
			"available_quantity": item.AvailableQuantity,
			"expires_at":         reservation.ExpiresAt,
		},
	}

	return p.publishEvent(ctx, event)
}

func (p *kafkaPublisher) PublishReservationReleased(ctx context.Context, item *domain.InventoryItem, reservation *domain.Reservation) error {
	event := &InventoryEvent{
		EventType: "inventory.reservation_released",
		ProductID: item.ProductID,
		Timestamp: time.Now(),
		Data: map[string]interface{}{
			"product_id":         item.ProductID,
			"reservation_id":     reservation.ID,
			"order_id":           reservation.OrderID,
			"quantity":           reservation.Quantity,
			"reserved_quantity":  item.ReservedQuantity,
			"available_quantity": item.AvailableQuantity,
		},
	}

	return p.publishEvent(ctx, event)
}

func (p *kafkaPublisher) PublishInventoryAdjusted(ctx context.Context, item *domain.InventoryItem, adjustment *domain.InventoryAdjustment) error {
	event := &InventoryEvent{
		EventType: "inventory.adjusted",
		ProductID: item.ProductID,
		Timestamp: time.Now(),
		Data: map[string]interface{}{
			"product_id":         item.ProductID,
			"adjustment_id":      adjustment.ID,
			"quantity_change":    adjustment.Quantity,
			"new_quantity":       item.Quantity,
			"available_quantity": item.AvailableQuantity,
			"reason":             adjustment.Reason,
			"adjusted_by":        adjustment.AdjustedBy,
		},
	}

	return p.publishEvent(ctx, event)
}

func (p *kafkaPublisher) Close() error {
	return p.writer.Close()
}
