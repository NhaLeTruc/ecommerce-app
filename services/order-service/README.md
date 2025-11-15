# Order Service

Order management and checkout service built with Node.js, TypeScript, Express, and PostgreSQL.

## Features

- Complete order lifecycle management
- Payment processing integration
- Inventory reservation coordination
- Order status tracking with history
- Event-driven architecture with Kafka
- PostgreSQL for transactional data
- Integration with Payment, Inventory, and Cart services

## Development

```bash
# Install dependencies
npm install

# Run database migrations
npm run migrate

# Run in development mode
npm run dev

# Build TypeScript
npm run build

# Run production build
npm start

# Run tests
npm test
```

## API Endpoints

### Orders
- `POST /api/v1/orders` - Create new order
- `GET /api/v1/orders/:orderId` - Get order details
- `GET /api/v1/orders/user/:userId` - Get user's orders
- `POST /api/v1/orders/:orderId/payment` - Process payment
- `PUT /api/v1/orders/:orderId/status` - Update order status
- `POST /api/v1/orders/:orderId/cancel` - Cancel order

### Health
- `GET /health` - Health check

## Order Lifecycle

1. **Pending** - Order created, awaiting payment
2. **Payment Pending** - Payment processing initiated
3. **Payment Failed** - Payment declined/failed
4. **Confirmed** - Payment captured successfully
5. **Processing** - Order being prepared
6. **Shipped** - Order in transit
7. **Delivered** - Order received by customer
8. **Cancelled** - Order cancelled
9. **Refunded** - Payment refunded

## Architecture

- **Express**: HTTP server framework
- **PostgreSQL**: Transactional order data
- **Kafka**: Event publishing
- **TypeScript**: Type-safe development
- **Winston**: Structured logging

## Business Logic

### Order Creation Flow
1. Validate inventory availability
2. Create order in database
3. Reserve inventory for all items
4. Clear user's shopping cart
5. Publish order created event

### Payment Flow
1. Update order status to payment_pending
2. Call Payment Service API
3. If successful: confirm order, publish success event
4. If failed: mark failed, release inventory, publish failure event

### Cancellation Flow
1. Verify order can be cancelled (not shipped/delivered)
2. Update order status to cancelled
3. Release inventory reservations
4. Initiate refund if payment was captured
5. Publish cancellation event

## Database Schema

### orders
- Order details, pricing, addresses
- Payment information
- Status tracking
- Timestamps

### order_items
- Line items for each order
- Product references
- Pricing and quantities

### order_history
- Audit trail of status changes
- Automatic logging via triggers

## Events Published

- `order.created`
- `order.status_changed`
- `order.payment_successful`
- `order.payment_failed`
- `order.cancelled`
- `order.shipped`
- `order.delivered`
