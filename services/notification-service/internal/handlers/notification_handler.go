package handlers

import (
	"context"
	"fmt"
	"strings"

	"github.com/ecommerce/notification-service/internal/consumer"
	"github.com/ecommerce/notification-service/internal/email"
	"github.com/ecommerce/notification-service/internal/sms"
	"github.com/ecommerce/notification-service/internal/templates"
	"go.uber.org/zap"
)

// NotificationHandler handles notification events
type NotificationHandler struct {
	emailSender    *email.EmailSender
	smsSender      *sms.SMSSender
	templateEngine *templates.TemplateEngine
	logger         *zap.Logger
}

// NewNotificationHandler creates a new notification handler
func NewNotificationHandler(
	emailSender *email.EmailSender,
	smsSender *sms.SMSSender,
	templateEngine *templates.TemplateEngine,
	logger *zap.Logger,
) *NotificationHandler {
	return &NotificationHandler{
		emailSender:    emailSender,
		smsSender:      smsSender,
		templateEngine: templateEngine,
		logger:         logger,
	}
}

// Handle routes events to appropriate notification methods
func (h *NotificationHandler) Handle(ctx context.Context, event consumer.Event) error {
	h.logger.Info("Handling notification event",
		zap.String("event_type", event.EventType),
		zap.String("order_id", event.OrderID),
		zap.String("payment_id", event.PaymentID),
	)

	switch event.EventType {
	case "order.created":
		return h.sendOrderConfirmation(ctx, event)
	case "payment.successful":
		return h.sendPaymentConfirmation(ctx, event)
	case "payment.failed":
		return h.sendPaymentFailure(ctx, event)
	case "order.shipped":
		return h.sendShippingNotification(ctx, event)
	case "order.delivered":
		return h.sendDeliveryNotification(ctx, event)
	case "order.cancelled":
		return h.sendOrderCancellation(ctx, event)
	default:
		h.logger.Warn("Unknown event type", zap.String("event_type", event.EventType))
		return nil
	}
}

func (h *NotificationHandler) sendOrderConfirmation(ctx context.Context, event consumer.Event) error {
	// Extract data from event
	customerEmail, ok := event.Data["customer_email"].(string)
	if !ok || customerEmail == "" {
		return fmt.Errorf("missing customer_email in event data")
	}

	orderNumber, _ := event.Data["order_number"].(string)
	totalAmount, _ := event.Data["total_amount"].(float64)
	items := event.Data["items"]

	// Render email template
	data := map[string]interface{}{
		"OrderID":      event.OrderID,
		"OrderNumber":  orderNumber,
		"TotalAmount":  totalAmount,
		"Items":        items,
		"CustomerName": event.Data["customer_name"],
	}

	subject, body, err := h.templateEngine.Render("order_confirmation", data)
	if err != nil {
		return fmt.Errorf("failed to render template: %w", err)
	}

	// Send email
	emailMsg := email.Email{
		To:      customerEmail,
		Subject: subject,
		Body:    body,
	}

	if err := h.emailSender.Send(emailMsg); err != nil {
		return fmt.Errorf("failed to send email: %w", err)
	}

	h.logger.Info("Order confirmation email sent",
		zap.String("order_id", event.OrderID),
		zap.String("email", customerEmail),
	)

	// Send SMS if phone number is provided
	if phone, ok := event.Data["customer_phone"].(string); ok && phone != "" {
		smsMsg := fmt.Sprintf("Your order %s has been confirmed! Total: $%.2f. Track your order at https://shop.example.com/orders/%s",
			orderNumber, totalAmount, event.OrderID)
		if err := h.smsSender.Send(phone, smsMsg); err != nil {
			h.logger.Error("Failed to send SMS", zap.Error(err))
			// Don't fail the entire notification if SMS fails
		} else {
			h.logger.Info("Order confirmation SMS sent",
				zap.String("order_id", event.OrderID),
				zap.String("phone", maskPhone(phone)),
			)
		}
	}

	return nil
}

func (h *NotificationHandler) sendPaymentConfirmation(ctx context.Context, event consumer.Event) error {
	customerEmail, ok := event.Data["customer_email"].(string)
	if !ok || customerEmail == "" {
		return fmt.Errorf("missing customer_email in event data")
	}

	orderNumber, _ := event.Data["order_number"].(string)
	amount, _ := event.Data["amount"].(float64)
	paymentMethod, _ := event.Data["payment_method"].(string)

	data := map[string]interface{}{
		"OrderID":       event.OrderID,
		"OrderNumber":   orderNumber,
		"PaymentID":     event.PaymentID,
		"Amount":        amount,
		"PaymentMethod": paymentMethod,
		"TransactionID": event.Data["transaction_id"],
		"CustomerName":  event.Data["customer_name"],
	}

	subject, body, err := h.templateEngine.Render("payment_confirmation", data)
	if err != nil {
		return fmt.Errorf("failed to render template: %w", err)
	}

	emailMsg := email.Email{
		To:      customerEmail,
		Subject: subject,
		Body:    body,
	}

	if err := h.emailSender.Send(emailMsg); err != nil {
		return fmt.Errorf("failed to send email: %w", err)
	}

	h.logger.Info("Payment confirmation email sent",
		zap.String("order_id", event.OrderID),
		zap.String("payment_id", event.PaymentID),
		zap.String("email", customerEmail),
	)

	return nil
}

func (h *NotificationHandler) sendPaymentFailure(ctx context.Context, event consumer.Event) error {
	customerEmail, ok := event.Data["customer_email"].(string)
	if !ok || customerEmail == "" {
		return fmt.Errorf("missing customer_email in event data")
	}

	orderNumber, _ := event.Data["order_number"].(string)
	amount, _ := event.Data["amount"].(float64)
	errorMessage, _ := event.Data["error_message"].(string)

	data := map[string]interface{}{
		"OrderID":      event.OrderID,
		"OrderNumber":  orderNumber,
		"Amount":       amount,
		"ErrorMessage": errorMessage,
		"CustomerName": event.Data["customer_name"],
	}

	subject, body, err := h.templateEngine.Render("payment_failure", data)
	if err != nil {
		return fmt.Errorf("failed to render template: %w", err)
	}

	emailMsg := email.Email{
		To:      customerEmail,
		Subject: subject,
		Body:    body,
	}

	if err := h.emailSender.Send(emailMsg); err != nil {
		return fmt.Errorf("failed to send email: %w", err)
	}

	h.logger.Info("Payment failure email sent",
		zap.String("order_id", event.OrderID),
		zap.String("email", customerEmail),
	)

	return nil
}

func (h *NotificationHandler) sendShippingNotification(ctx context.Context, event consumer.Event) error {
	customerEmail, ok := event.Data["customer_email"].(string)
	if !ok || customerEmail == "" {
		return fmt.Errorf("missing customer_email in event data")
	}

	orderNumber, _ := event.Data["order_number"].(string)
	trackingNumber, _ := event.Data["tracking_number"].(string)
	carrier, _ := event.Data["carrier"].(string)

	data := map[string]interface{}{
		"OrderID":        event.OrderID,
		"OrderNumber":    orderNumber,
		"TrackingNumber": trackingNumber,
		"Carrier":        carrier,
		"CustomerName":   event.Data["customer_name"],
	}

	subject, body, err := h.templateEngine.Render("shipping_notification", data)
	if err != nil {
		return fmt.Errorf("failed to render template: %w", err)
	}

	emailMsg := email.Email{
		To:      customerEmail,
		Subject: subject,
		Body:    body,
	}

	if err := h.emailSender.Send(emailMsg); err != nil {
		return fmt.Errorf("failed to send email: %w", err)
	}

	h.logger.Info("Shipping notification email sent",
		zap.String("order_id", event.OrderID),
		zap.String("email", customerEmail),
	)

	// Send SMS notification
	if phone, ok := event.Data["customer_phone"].(string); ok && phone != "" {
		smsMsg := fmt.Sprintf("Your order %s has shipped! Track with %s: %s",
			orderNumber, carrier, trackingNumber)
		if err := h.smsSender.Send(phone, smsMsg); err != nil {
			h.logger.Error("Failed to send SMS", zap.Error(err))
		} else {
			h.logger.Info("Shipping notification SMS sent",
				zap.String("order_id", event.OrderID),
				zap.String("phone", maskPhone(phone)),
			)
		}
	}

	return nil
}

func (h *NotificationHandler) sendDeliveryNotification(ctx context.Context, event consumer.Event) error {
	customerEmail, ok := event.Data["customer_email"].(string)
	if !ok || customerEmail == "" {
		return fmt.Errorf("missing customer_email in event data")
	}

	orderNumber, _ := event.Data["order_number"].(string)

	data := map[string]interface{}{
		"OrderID":      event.OrderID,
		"OrderNumber":  orderNumber,
		"CustomerName": event.Data["customer_name"],
	}

	subject, body, err := h.templateEngine.Render("delivery_notification", data)
	if err != nil {
		return fmt.Errorf("failed to render template: %w", err)
	}

	emailMsg := email.Email{
		To:      customerEmail,
		Subject: subject,
		Body:    body,
	}

	if err := h.emailSender.Send(emailMsg); err != nil {
		return fmt.Errorf("failed to send email: %w", err)
	}

	h.logger.Info("Delivery notification email sent",
		zap.String("order_id", event.OrderID),
		zap.String("email", customerEmail),
	)

	return nil
}

func (h *NotificationHandler) sendOrderCancellation(ctx context.Context, event consumer.Event) error {
	customerEmail, ok := event.Data["customer_email"].(string)
	if !ok || customerEmail == "" {
		return fmt.Errorf("missing customer_email in event data")
	}

	orderNumber, _ := event.Data["order_number"].(string)
	reason, _ := event.Data["cancellation_reason"].(string)

	data := map[string]interface{}{
		"OrderID":      event.OrderID,
		"OrderNumber":  orderNumber,
		"Reason":       reason,
		"CustomerName": event.Data["customer_name"],
	}

	subject, body, err := h.templateEngine.Render("order_cancellation", data)
	if err != nil {
		return fmt.Errorf("failed to render template: %w", err)
	}

	emailMsg := email.Email{
		To:      customerEmail,
		Subject: subject,
		Body:    body,
	}

	if err := h.emailSender.Send(emailMsg); err != nil {
		return fmt.Errorf("failed to send email: %w", err)
	}

	h.logger.Info("Order cancellation email sent",
		zap.String("order_id", event.OrderID),
		zap.String("email", customerEmail),
	)

	return nil
}

// maskPhone masks phone number for logging (shows last 4 digits)
func maskPhone(phone string) string {
	if len(phone) <= 4 {
		return "****"
	}
	return strings.Repeat("*", len(phone)-4) + phone[len(phone)-4:]
}
