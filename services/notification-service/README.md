# Notification Service

Event-driven notification service built with Go. Consumes events from Kafka and sends email and SMS notifications to customers.

## Features

- **Multi-channel notifications**: Email and SMS support
- **Event-driven architecture**: Kafka consumer for real-time notifications
- **Email templates**: Professional HTML email templates
- **Email delivery**: SMTP integration with Gmail, SendGrid, etc.
- **SMS delivery**: Twilio integration (simulated in development)
- **Development mode**: Logs notifications instead of sending
- **Graceful shutdown**: Proper Kafka consumer cleanup
- **Structured logging**: JSON logging with zap

## Supported Notifications

### Order Events
- **Order Confirmation** (`order.created`): Sent when order is created
- **Order Shipped** (`order.shipped`): Sent when order ships with tracking info
- **Order Delivered** (`order.delivered`): Sent when order is delivered
- **Order Cancelled** (`order.cancelled`): Sent when order is cancelled

### Payment Events
- **Payment Successful** (`payment.successful`): Sent when payment is captured
- **Payment Failed** (`payment.failed`): Sent when payment fails with retry link

## Architecture

```
┌─────────────┐         ┌──────────────┐
│   Kafka     │────────▶│  Consumer    │
│   Topics    │         │  (Goroutines)│
└─────────────┘         └──────┬───────┘
                                │
                                ▼
                        ┌──────────────┐
                        │   Handler    │
                        │   Router     │
                        └──────┬───────┘
                                │
                    ┌───────────┴───────────┐
                    ▼                       ▼
            ┌──────────────┐        ┌──────────────┐
            │Email Sender  │        │ SMS Sender   │
            │   (SMTP)     │        │  (Twilio)    │
            └──────────────┘        └──────────────┘
```

## Development

### Prerequisites
- Go 1.21+
- Kafka running (local or docker)
- SMTP credentials (optional, uses simulation in dev)

### Setup

```bash
# Install dependencies
go mod download

# Run in development mode
go run cmd/server/main.go

# Build binary
go build -o notification-service cmd/server/main.go

# Run binary
./notification-service
```

### Configuration

Set via environment variables:

#### Kafka
- `KAFKA_BROKERS`: Comma-separated Kafka brokers (default: `kafka:9092`)
- `KAFKA_TOPICS`: Comma-separated topics to subscribe (default: `order-events,payment-events`)
- `KAFKA_CONSUMER_GROUP`: Consumer group name (default: `notification-service`)

#### Email (SMTP)
- `SMTP_HOST`: SMTP server hostname (default: `smtp.gmail.com`)
- `SMTP_PORT`: SMTP server port (default: `587`)
- `SMTP_USERNAME`: SMTP username/email
- `SMTP_PASSWORD`: SMTP password/app password
- `FROM_EMAIL`: Sender email address (default: `noreply@ecommerce.com`)
- `FROM_NAME`: Sender name (default: `Ecommerce Platform`)

#### SMS (Twilio)
- `TWILIO_ACCOUNT_SID`: Twilio account SID
- `TWILIO_AUTH_TOKEN`: Twilio auth token
- `TWILIO_FROM_NUMBER`: Twilio phone number

#### Service
- `ENVIRONMENT`: `development` or `production` (default: `development`)
- `TEMPLATES_DIR`: Custom templates directory (optional, uses embedded templates by default)

### Email Configuration

#### Gmail
1. Enable 2-factor authentication
2. Create app password: https://myaccount.google.com/apppasswords
3. Set environment variables:
   ```bash
   export SMTP_HOST=smtp.gmail.com
   export SMTP_PORT=587
   export SMTP_USERNAME=your-email@gmail.com
   export SMTP_PASSWORD=your-app-password
   export FROM_EMAIL=your-email@gmail.com
   ```

#### SendGrid
```bash
export SMTP_HOST=smtp.sendgrid.net
export SMTP_PORT=587
export SMTP_USERNAME=apikey
export SMTP_PASSWORD=your-sendgrid-api-key
export FROM_EMAIL=verified-sender@yourdomain.com
```

## Event Formats

### Order Created Event
```json
{
  "event_type": "order.created",
  "order_id": "ord_abc123",
  "timestamp": "2024-01-15T10:30:00Z",
  "data": {
    "order_number": "ORD-20240115-00001",
    "customer_email": "customer@example.com",
    "customer_name": "John Doe",
    "customer_phone": "+1234567890",
    "total_amount": 149.99,
    "items": [
      {
        "product_name": "Product A",
        "quantity": 2,
        "price": 49.99
      }
    ]
  }
}
```

### Payment Successful Event
```json
{
  "event_type": "payment.successful",
  "order_id": "ord_abc123",
  "payment_id": "pay_xyz789",
  "timestamp": "2024-01-15T10:30:05Z",
  "data": {
    "order_number": "ORD-20240115-00001",
    "customer_email": "customer@example.com",
    "customer_name": "John Doe",
    "amount": 149.99,
    "payment_method": "credit_card",
    "transaction_id": "txn_123456"
  }
}
```

### Order Shipped Event
```json
{
  "event_type": "order.shipped",
  "order_id": "ord_abc123",
  "timestamp": "2024-01-16T14:20:00Z",
  "data": {
    "order_number": "ORD-20240115-00001",
    "customer_email": "customer@example.com",
    "customer_name": "John Doe",
    "customer_phone": "+1234567890",
    "tracking_number": "1Z999AA10123456784",
    "carrier": "UPS"
  }
}
```

## Email Templates

The service includes professional HTML email templates for all notification types:

- **Order Confirmation**: Green themed, includes order details and items table
- **Payment Confirmation**: Blue themed with checkmark, includes payment details
- **Payment Failure**: Red themed with error details and retry button
- **Shipping Notification**: Orange themed with tracking information
- **Delivery Notification**: Green themed with review prompt
- **Order Cancellation**: Gray themed with cancellation details

### Custom Templates

To use custom templates, set `TEMPLATES_DIR` environment variable:

```bash
export TEMPLATES_DIR=/path/to/templates
```

Create HTML files:
- `order_confirmation.html`
- `payment_confirmation.html`
- `payment_failure.html`
- `shipping_notification.html`
- `delivery_notification.html`
- `order_cancellation.html`

Templates use Go's `html/template` syntax. Available data varies by template type.

## Development Mode

In development mode (`ENVIRONMENT=development`) or when SMTP credentials are not provided:
- Emails are logged instead of sent
- SMS messages are logged instead of sent
- Full notification content is logged for debugging

Example log output:
```
INFO  Email (simulated)  to=customer@example.com  subject="Order Confirmation - ORD-20240115-00001"
INFO  SMS (simulated)  to=+1234567890  message="Your order ORD-20240115-00001 has been confirmed!"
```

## Production Deployment

### Docker

```bash
# Build image
docker build -t notification-service:latest .

# Run container
docker run -d \
  --name notification-service \
  -e KAFKA_BROKERS=kafka:9092 \
  -e SMTP_HOST=smtp.gmail.com \
  -e SMTP_PORT=587 \
  -e SMTP_USERNAME=your-email@gmail.com \
  -e SMTP_PASSWORD=your-app-password \
  -e FROM_EMAIL=your-email@gmail.com \
  -e ENVIRONMENT=production \
  notification-service:latest
```

### Docker Compose

```yaml
notification-service:
  build: ./services/notification-service
  environment:
    - KAFKA_BROKERS=kafka:9092
    - KAFKA_TOPICS=order-events,payment-events
    - SMTP_HOST=smtp.gmail.com
    - SMTP_PORT=587
    - SMTP_USERNAME=${SMTP_USERNAME}
    - SMTP_PASSWORD=${SMTP_PASSWORD}
    - FROM_EMAIL=${FROM_EMAIL}
    - TWILIO_ACCOUNT_SID=${TWILIO_ACCOUNT_SID}
    - TWILIO_AUTH_TOKEN=${TWILIO_AUTH_TOKEN}
    - ENVIRONMENT=production
  depends_on:
    - kafka
```

## Testing

### Manual Testing

Publish test events to Kafka:

```bash
# Order created event
kafka-console-producer --bootstrap-server localhost:9092 --topic order-events
{"event_type":"order.created","order_id":"test-order-1","timestamp":"2024-01-15T10:30:00Z","data":{"order_number":"ORD-TEST-001","customer_email":"test@example.com","customer_name":"Test User","total_amount":99.99}}

# Payment successful event
kafka-console-producer --bootstrap-server localhost:9092 --topic payment-events
{"event_type":"payment.successful","order_id":"test-order-1","payment_id":"test-pay-1","timestamp":"2024-01-15T10:30:05Z","data":{"order_number":"ORD-TEST-001","customer_email":"test@example.com","customer_name":"Test User","amount":99.99,"payment_method":"credit_card","transaction_id":"txn-test-123"}}
```

## Monitoring

The service logs all notification activities:

```
INFO  Starting Notification Service
INFO  Configuration loaded  kafka_brokers=[kafka:9092]  kafka_topics=[order-events,payment-events]
INFO  Template engine initialized
INFO  Email sender initialized
INFO  SMS sender initialized
INFO  Notification handler initialized
INFO  Kafka consumer initialized
INFO  Notification Service started successfully  subscribed_topics=[order-events,payment-events]
INFO  Handling notification event  event_type=order.created  order_id=ord_abc123
INFO  Order confirmation email sent  order_id=ord_abc123  email=customer@example.com
INFO  Order confirmation SMS sent  order_id=ord_abc123  phone=*******890
```

## Error Handling

- Failed email sends are logged but don't stop the consumer
- Failed SMS sends are logged but don't fail the entire notification
- Invalid event formats are logged and skipped
- Kafka consumer automatically commits messages after processing

## Security

- **Non-root container**: Runs as user `appuser` (UID 1000)
- **No secrets in code**: All credentials via environment variables
- **Phone masking**: Phone numbers masked in logs (shows last 4 digits)
- **SMTP TLS**: Uses TLS for email transmission

## Performance

- **Concurrent processing**: One goroutine per Kafka topic
- **Lightweight**: ~10MB Docker image (Alpine-based)
- **Fast startup**: <1 second to full operation
- **Graceful shutdown**: Waits for in-flight notifications

## Integration

The Notification Service integrates with:
- **Order Service**: Consumes order lifecycle events
- **Payment Service**: Consumes payment events
- **Kafka**: Event streaming platform

## Future Enhancements

- [ ] Push notifications (Firebase Cloud Messaging)
- [ ] In-app notifications
- [ ] Notification preferences per user
- [ ] Retry logic for failed sends
- [ ] Dead letter queue for failed notifications
- [ ] Metrics (Prometheus)
- [ ] Distributed tracing (OpenTelemetry)
