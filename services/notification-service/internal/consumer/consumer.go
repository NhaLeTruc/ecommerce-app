package consumer

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/ecommerce/notification-service/internal/config"
	"github.com/ecommerce/notification-service/internal/handlers"
	"github.com/segmentio/kafka-go"
	"go.uber.org/zap"
)

// Event represents a Kafka event
type Event struct {
	EventType string                 `json:"event_type"`
	OrderID   string                 `json:"order_id"`
	PaymentID string                 `json:"payment_id"`
	Timestamp string                 `json:"timestamp"`
	Data      map[string]interface{} `json:"data"`
}

// Consumer handles Kafka message consumption
type Consumer struct {
	reader  *kafka.Reader
	handler *handlers.NotificationHandler
	logger  *zap.Logger
}

// NewConsumer creates a new Kafka consumer
func NewConsumer(cfg *config.Config, handler *handlers.NotificationHandler, logger *zap.Logger) *Consumer {
	reader := kafka.NewReader(kafka.ReaderConfig{
		Brokers:  cfg.KafkaBrokers,
		GroupID:  cfg.ConsumerGroup,
		Topic:    "", // Will subscribe to multiple topics
		MinBytes: 10e3,
		MaxBytes: 10e6,
	})

	return &Consumer{
		reader:  reader,
		handler: handler,
		logger:  logger,
	}
}

// Start starts consuming messages
func (c *Consumer) Start(ctx context.Context, topics []string) error {
	c.logger.Info("Starting Kafka consumer", zap.Strings("topics", topics))

	// Create readers for each topic
	readers := make([]*kafka.Reader, len(topics))
	for i, topic := range topics {
		readers[i] = kafka.NewReader(kafka.ReaderConfig{
			Brokers:  c.reader.Config().Brokers,
			GroupID:  c.reader.Config().GroupID,
			Topic:    topic,
			MinBytes: 10e3,
			MaxBytes: 10e6,
		})
	}

	// Start a goroutine for each topic
	for _, reader := range readers {
		go c.consumeTopic(ctx, reader)
	}

	<-ctx.Done()
	c.logger.Info("Stopping Kafka consumer")

	// Close all readers
	for _, reader := range readers {
		if err := reader.Close(); err != nil {
			c.logger.Error("Failed to close reader", zap.Error(err))
		}
	}

	return nil
}

func (c *Consumer) consumeTopic(ctx context.Context, reader *kafka.Reader) {
	for {
		select {
		case <-ctx.Done():
			return
		default:
			msg, err := reader.FetchMessage(ctx)
			if err != nil {
				if err == context.Canceled {
					return
				}
				c.logger.Error("Failed to fetch message", zap.Error(err))
				continue
			}

			if err := c.processMessage(ctx, msg); err != nil {
				c.logger.Error("Failed to process message",
					zap.Error(err),
					zap.String("topic", msg.Topic),
					zap.Int64("offset", msg.Offset),
				)
			}

			// Commit the message
			if err := reader.CommitMessages(ctx, msg); err != nil {
				c.logger.Error("Failed to commit message", zap.Error(err))
			}
		}
	}
}

func (c *Consumer) processMessage(ctx context.Context, msg kafka.Message) error {
	c.logger.Debug("Processing message",
		zap.String("topic", msg.Topic),
		zap.Int64("offset", msg.Offset),
		zap.String("key", string(msg.Key)),
	)

	// Parse event
	var event Event
	if err := json.Unmarshal(msg.Value, &event); err != nil {
		return fmt.Errorf("failed to unmarshal event: %w", err)
	}

	// Route to appropriate handler
	return c.handler.Handle(ctx, event)
}

// Close closes the consumer
func (c *Consumer) Close() error {
	return c.reader.Close()
}
