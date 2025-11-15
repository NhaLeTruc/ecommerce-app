# Inventory Service

Inventory management and reservation service built with Go, PostgreSQL, and Redis.

## Features

- Real-time inventory tracking
- Stock reservation system with TTL
- Automatic reorder alerts
- Inventory adjustments and audit trail
- Redis caching for high-performance reads
- Event-driven architecture with Kafka
- OpenTelemetry observability

## Development

```bash
# Install dependencies
go mod download

# Run service
go run cmd/server/main.go

# Run tests
go test ./...

# Run with coverage
go test -cover ./...
```

## API Endpoints

- `GET /health` - Health check
- `GET /api/v1/inventory` - List inventory items
- `GET /api/v1/inventory/{id}` - Get inventory item
- `POST /api/v1/inventory` - Create inventory item
- `PUT /api/v1/inventory/{id}` - Update inventory item
- `POST /api/v1/inventory/{id}/reserve` - Reserve inventory
- `POST /api/v1/inventory/{id}/release` - Release reservation
- `POST /api/v1/inventory/{id}/adjust` - Adjust inventory
- `GET /api/v1/inventory/low-stock` - Get low stock items

## Architecture

- **Domain Layer**: Business logic and entities
- **Repository Layer**: Data persistence (PostgreSQL + Redis)
- **API Layer**: HTTP handlers (Gin framework)
- **Events Layer**: Kafka event publishing
- **Middleware**: Logging, tracing, correlation ID

## Database Schema

### inventory_items
- Tracks product quantities and reservations
- Includes reorder levels and locations

### reservations
- Temporary holds on inventory
- Auto-expires after TTL

### inventory_adjustments
- Audit trail for all quantity changes
