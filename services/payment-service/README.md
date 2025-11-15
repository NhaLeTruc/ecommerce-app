# Payment Service

Payment processing service built with Python, FastAPI, and PostgreSQL.

## Features

- Payment processing with simulated payment gateway
- Support for multiple payment methods (credit/debit card, PayPal, Stripe)
- Payment authorization and capture
- Refund processing (full and partial)
- Event-driven architecture with Kafka
- PostgreSQL for transactional data
- Comprehensive payment status tracking

## Development

```bash
# Install dependencies
poetry install

# Run database migrations
psql -f migrations/001_create_payment_tables.sql

# Run in development mode
poetry run python -m src.main

# Run with uvicorn directly
uvicorn src.main:app --reload --port 8001
```

## API Endpoints

### Payments
- `POST /api/v1/payments/process` - Process payment
- `POST /api/v1/payments/refund` - Refund payment
- `GET /api/v1/payments/payment/{payment_id}` - Get payment by ID
- `GET /api/v1/payments/order/{order_id}` - Get payment for order
- `GET /api/v1/payments/transaction/{transaction_id}` - Get by transaction ID

### Health
- `GET /health` - Health check

## Payment Flow

### Processing Payment
1. Create payment record with PENDING status
2. Update to PROCESSING status
3. Call payment gateway (simulated)
4. On success:
   - Update to CAPTURED status
   - Store transaction details
   - Publish success event
5. On failure:
   - Update to FAILED status
   - Store error message
   - Publish failure event

### Refund Flow
1. Find payment by transaction ID
2. Verify payment can be refunded (CAPTURED or PARTIALLY_REFUNDED)
3. Call payment gateway for refund
4. Update payment status
5. Create refund record
6. Publish refund event

## Payment Statuses

- **PENDING** - Payment created, not yet processed
- **PROCESSING** - Payment being processed
- **AUTHORIZED** - Funds authorized but not captured
- **CAPTURED** - Payment successful, funds captured
- **FAILED** - Payment failed
- **REFUNDED** - Fully refunded
- **PARTIALLY_REFUNDED** - Partially refunded

## Simulated Payment Gateway

The service includes a simulated payment processor that mimics real gateway behavior:
- 95% success rate (configurable)
- Simulated processing delay
- Random failure scenarios (insufficient funds, declined card, etc.)
- Transaction ID generation
- Payment intent ID generation

**Note**: In production, replace with actual payment gateway integration (Stripe, PayPal, etc.)

## Database Schema

### payments
- Payment records with amounts, methods, status
- Transaction and payment intent IDs
- Provider responses and error messages
- Timestamps for all payment lifecycle events

### refunds
- Refund records linked to payments
- Refund amounts and reasons
- Audit trail

## Events Published

- `payment.successful` - Payment captured successfully
- `payment.failed` - Payment processing failed
- `payment.refunded` - Payment refunded

## Architecture

- **FastAPI**: Async HTTP framework
- **SQLAlchemy**: ORM with async support
- **PostgreSQL**: Transactional database
- **Kafka**: Event publishing
- **Structlog**: Structured logging

## Integration

The Payment Service integrates with:
- **Order Service**: Receives payment processing requests
- **Notification Service**: Triggers email/SMS notifications (via events)

## Security

- Non-root Docker container
- Input validation with Pydantic
- Secure database connections
- No sensitive data in logs
- CORS configuration
