# Cart Service

Shopping cart management service built with Node.js, TypeScript, Express, and Redis.

## Features

- Real-time cart management with Redis
- Session-based carts with TTL
- Event-driven architecture with Kafka
- Input validation and quantity limits
- Automatic cart expiration
- OpenTelemetry observability
- Correlation ID tracking

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build TypeScript
npm run build

# Run production build
npm start

# Run tests
npm test

# Run tests with coverage
npm run test:coverage
```

## API Endpoints

- `GET /health` - Health check
- `GET /api/v1/cart/:userId` - Get user's cart
- `POST /api/v1/cart/:userId/items` - Add item to cart
- `PUT /api/v1/cart/:userId/items/:productId` - Update item quantity
- `DELETE /api/v1/cart/:userId/items/:productId` - Remove item from cart
- `DELETE /api/v1/cart/:userId` - Clear cart

## Architecture

- **Express**: HTTP server framework
- **Redis**: Cart data storage with TTL
- **Kafka**: Event publishing
- **TypeScript**: Type-safe development
- **Winston**: Structured logging
- **OpenTelemetry**: Distributed tracing

## Business Rules

- Maximum 100 items per cart
- Maximum 10 quantity per item
- Cart expires after 24 hours of inactivity
- Automatic recalculation of subtotals
- Event publishing for all cart operations
