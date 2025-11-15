package templates

import (
	"bytes"
	"fmt"
	"html/template"
	"path/filepath"

	"go.uber.org/zap"
)

// TemplateEngine handles email template rendering
type TemplateEngine struct {
	templates map[string]*template.Template
	logger    *zap.Logger
}

// NewTemplateEngine creates a new template engine
func NewTemplateEngine(templatesDir string, logger *zap.Logger) (*TemplateEngine, error) {
	engine := &TemplateEngine{
		templates: make(map[string]*template.Template),
		logger:    logger,
	}

	// Define templates
	templateNames := []string{
		"order_confirmation",
		"payment_confirmation",
		"payment_failure",
		"shipping_notification",
		"delivery_notification",
		"order_cancellation",
	}

	// If templatesDir is provided, load from files
	// Otherwise, use embedded templates
	if templatesDir != "" {
		for _, name := range templateNames {
			tmplPath := filepath.Join(templatesDir, name+".html")
			tmpl, err := template.ParseFiles(tmplPath)
			if err != nil {
				logger.Warn("Failed to load template file, using embedded",
					zap.String("template", name),
					zap.Error(err),
				)
				engine.templates[name] = getEmbeddedTemplate(name)
			} else {
				engine.templates[name] = tmpl
			}
		}
	} else {
		// Load embedded templates
		for _, name := range templateNames {
			engine.templates[name] = getEmbeddedTemplate(name)
		}
	}

	return engine, nil
}

// Render renders a template with the given data
func (e *TemplateEngine) Render(templateName string, data map[string]interface{}) (subject string, body string, err error) {
	tmpl, ok := e.templates[templateName]
	if !ok {
		return "", "", fmt.Errorf("template not found: %s", templateName)
	}

	var buf bytes.Buffer
	if err := tmpl.Execute(&buf, data); err != nil {
		return "", "", fmt.Errorf("failed to execute template: %w", err)
	}

	// Get subject from template name
	subject = getSubjectForTemplate(templateName, data)
	body = buf.String()

	return subject, body, nil
}

func getSubjectForTemplate(templateName string, data map[string]interface{}) string {
	orderNumber := ""
	if on, ok := data["OrderNumber"].(string); ok {
		orderNumber = on
	}

	switch templateName {
	case "order_confirmation":
		if orderNumber != "" {
			return fmt.Sprintf("Order Confirmation - %s", orderNumber)
		}
		return "Order Confirmation"
	case "payment_confirmation":
		return "Payment Received"
	case "payment_failure":
		return "Payment Failed - Action Required"
	case "shipping_notification":
		if orderNumber != "" {
			return fmt.Sprintf("Your Order %s Has Shipped!", orderNumber)
		}
		return "Your Order Has Shipped!"
	case "delivery_notification":
		return "Your Order Has Been Delivered"
	case "order_cancellation":
		return "Order Cancelled"
	default:
		return "Notification from E-Commerce Platform"
	}
}

func getEmbeddedTemplate(name string) *template.Template {
	var tmplStr string

	switch name {
	case "order_confirmation":
		tmplStr = orderConfirmationTemplate
	case "payment_confirmation":
		tmplStr = paymentConfirmationTemplate
	case "payment_failure":
		tmplStr = paymentFailureTemplate
	case "shipping_notification":
		tmplStr = shippingNotificationTemplate
	case "delivery_notification":
		tmplStr = deliveryNotificationTemplate
	case "order_cancellation":
		tmplStr = orderCancellationTemplate
	default:
		tmplStr = "<html><body><h1>Notification</h1></body></html>"
	}

	tmpl, _ := template.New(name).Parse(tmplStr)
	return tmpl
}

// Embedded HTML templates
const orderConfirmationTemplate = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
        .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; }
        .order-details { background-color: #f5f5f5; padding: 15px; margin: 20px 0; border-radius: 5px; }
        .footer { background-color: #f5f5f5; padding: 15px; text-align: center; font-size: 12px; color: #666; }
        .button { background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 10px 0; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Order Confirmed!</h1>
    </div>
    <div class="content">
        <p>Hi {{.CustomerName}},</p>
        <p>Thank you for your order! We're preparing your items for shipment.</p>

        <div class="order-details">
            <h2>Order Details</h2>
            <p><strong>Order Number:</strong> {{.OrderNumber}}</p>
            <p><strong>Order ID:</strong> {{.OrderID}}</p>
            <p><strong>Total Amount:</strong> ${{printf "%.2f" .TotalAmount}}</p>
        </div>

        {{if .Items}}
        <h3>Items Ordered:</h3>
        <table>
            <thead>
                <tr>
                    <th>Product</th>
                    <th>Quantity</th>
                    <th>Price</th>
                </tr>
            </thead>
            <tbody>
                {{range .Items}}
                <tr>
                    <td>{{.ProductName}}</td>
                    <td>{{.Quantity}}</td>
                    <td>${{printf "%.2f" .Price}}</td>
                </tr>
                {{end}}
            </tbody>
        </table>
        {{end}}

        <p style="text-align: center;">
            <a href="https://shop.example.com/orders/{{.OrderID}}" class="button">Track Your Order</a>
        </p>

        <p>You'll receive another email when your order ships.</p>
    </div>
    <div class="footer">
        <p>Questions? Contact us at support@example.com</p>
        <p>&copy; 2024 E-Commerce Platform. All rights reserved.</p>
    </div>
</body>
</html>
`

const paymentConfirmationTemplate = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
        .header { background-color: #2196F3; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; }
        .payment-details { background-color: #f5f5f5; padding: 15px; margin: 20px 0; border-radius: 5px; }
        .footer { background-color: #f5f5f5; padding: 15px; text-align: center; font-size: 12px; color: #666; }
        .checkmark { font-size: 48px; color: #4CAF50; }
    </style>
</head>
<body>
    <div class="header">
        <div class="checkmark">✓</div>
        <h1>Payment Received</h1>
    </div>
    <div class="content">
        <p>Hi {{.CustomerName}},</p>
        <p>Your payment has been successfully processed.</p>

        <div class="payment-details">
            <h2>Payment Details</h2>
            <p><strong>Order Number:</strong> {{.OrderNumber}}</p>
            <p><strong>Payment ID:</strong> {{.PaymentID}}</p>
            <p><strong>Transaction ID:</strong> {{.TransactionID}}</p>
            <p><strong>Amount:</strong> ${{printf "%.2f" .Amount}}</p>
            <p><strong>Payment Method:</strong> {{.PaymentMethod}}</p>
        </div>

        <p>Your order is now being processed and will ship soon.</p>
    </div>
    <div class="footer">
        <p>Questions? Contact us at support@example.com</p>
        <p>&copy; 2024 E-Commerce Platform. All rights reserved.</p>
    </div>
</body>
</html>
`

const paymentFailureTemplate = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
        .header { background-color: #f44336; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; }
        .error-details { background-color: #ffebee; padding: 15px; margin: 20px 0; border-radius: 5px; border-left: 4px solid #f44336; }
        .footer { background-color: #f5f5f5; padding: 15px; text-align: center; font-size: 12px; color: #666; }
        .button { background-color: #f44336; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 10px 0; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Payment Failed</h1>
    </div>
    <div class="content">
        <p>Hi {{.CustomerName}},</p>
        <p>Unfortunately, we were unable to process your payment for order {{.OrderNumber}}.</p>

        <div class="error-details">
            <h3>Error Details</h3>
            <p><strong>Order Number:</strong> {{.OrderNumber}}</p>
            <p><strong>Amount:</strong> ${{printf "%.2f" .Amount}}</p>
            <p><strong>Error:</strong> {{.ErrorMessage}}</p>
        </div>

        <p>Please try again with a different payment method, or contact your bank if the problem persists.</p>

        <p style="text-align: center;">
            <a href="https://shop.example.com/orders/{{.OrderID}}/retry-payment" class="button">Retry Payment</a>
        </p>
    </div>
    <div class="footer">
        <p>Need help? Contact us at support@example.com</p>
        <p>&copy; 2024 E-Commerce Platform. All rights reserved.</p>
    </div>
</body>
</html>
`

const shippingNotificationTemplate = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
        .header { background-color: #FF9800; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; }
        .shipping-details { background-color: #fff3e0; padding: 15px; margin: 20px 0; border-radius: 5px; }
        .footer { background-color: #f5f5f5; padding: 15px; text-align: center; font-size: 12px; color: #666; }
        .button { background-color: #FF9800; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 10px 0; }
    </style>
</head>
<body>
    <div class="header">
        <h1>📦 Your Order Has Shipped!</h1>
    </div>
    <div class="content">
        <p>Hi {{.CustomerName}},</p>
        <p>Great news! Your order is on its way.</p>

        <div class="shipping-details">
            <h2>Shipping Information</h2>
            <p><strong>Order Number:</strong> {{.OrderNumber}}</p>
            <p><strong>Carrier:</strong> {{.Carrier}}</p>
            <p><strong>Tracking Number:</strong> {{.TrackingNumber}}</p>
        </div>

        <p style="text-align: center;">
            <a href="https://shop.example.com/track/{{.TrackingNumber}}" class="button">Track Your Package</a>
        </p>

        <p>You'll receive another notification when your package is delivered.</p>
    </div>
    <div class="footer">
        <p>Questions? Contact us at support@example.com</p>
        <p>&copy; 2024 E-Commerce Platform. All rights reserved.</p>
    </div>
</body>
</html>
`

const deliveryNotificationTemplate = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
        .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; }
        .delivery-details { background-color: #e8f5e9; padding: 15px; margin: 20px 0; border-radius: 5px; }
        .footer { background-color: #f5f5f5; padding: 15px; text-align: center; font-size: 12px; color: #666; }
        .button { background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 10px 0; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🎉 Delivered!</h1>
    </div>
    <div class="content">
        <p>Hi {{.CustomerName}},</p>
        <p>Your order has been delivered! We hope you enjoy your purchase.</p>

        <div class="delivery-details">
            <h2>Delivery Confirmation</h2>
            <p><strong>Order Number:</strong> {{.OrderNumber}}</p>
            <p>Your package has been successfully delivered.</p>
        </div>

        <p>How was your experience? We'd love to hear your feedback!</p>

        <p style="text-align: center;">
            <a href="https://shop.example.com/orders/{{.OrderID}}/review" class="button">Leave a Review</a>
        </p>
    </div>
    <div class="footer">
        <p>Questions? Contact us at support@example.com</p>
        <p>&copy; 2024 E-Commerce Platform. All rights reserved.</p>
    </div>
</body>
</html>
`

const orderCancellationTemplate = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
        .header { background-color: #9E9E9E; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; }
        .cancellation-details { background-color: #f5f5f5; padding: 15px; margin: 20px 0; border-radius: 5px; }
        .footer { background-color: #f5f5f5; padding: 15px; text-align: center; font-size: 12px; color: #666; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Order Cancelled</h1>
    </div>
    <div class="content">
        <p>Hi {{.CustomerName}},</p>
        <p>Your order has been cancelled as requested.</p>

        <div class="cancellation-details">
            <h2>Cancellation Details</h2>
            <p><strong>Order Number:</strong> {{.OrderNumber}}</p>
            {{if .Reason}}
            <p><strong>Reason:</strong> {{.Reason}}</p>
            {{end}}
        </div>

        <p>If you paid for this order, your refund will be processed within 5-7 business days.</p>
        <p>We hope to serve you again soon!</p>
    </div>
    <div class="footer">
        <p>Questions? Contact us at support@example.com</p>
        <p>&copy; 2024 E-Commerce Platform. All rights reserved.</p>
    </div>
</body>
</html>
`
