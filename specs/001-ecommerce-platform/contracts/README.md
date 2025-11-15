# API Contracts

This directory contains OpenAPI 3.0 specifications for all microservices in the ecommerce platform.

## Service APIs

### catalog-service.yaml ✅
**Base Path**: `/api/v1`
**Port**: 8001
**Key Endpoints**:
- `GET /products` - List products with pagination and filtering
- `POST /products` - Create product (admin)
- `GET /products/{id}` - Get product by ID
- `PUT /products/{id}` - Update product (admin)
- `GET /products/sku/{sku}` - Get product by SKU
- `GET /search` - Full-text product search with facets

**Authentication**: JWT Bearer token for admin endpoints

---

### cart-service.yaml (To be created)
**Base Path**: `/api/v1/cart`
**Port**: 8002
**Key Endpoints**:
- `GET /cart` - Get current cart (user or session)
- `POST /cart/items` - Add item to cart
- `PUT /cart/items/{sku}` - Update item quantity
- `DELETE /cart/items/{sku}` - Remove item from cart
- `DELETE /cart` - Clear cart
- `POST /cart/merge` - Merge guest cart with user cart (on login)

---

### checkout-service.yaml (To be created)
**Base Path**: `/api/v1/checkout`
**Port**: 8003
**Key Endpoints**:
- `POST /checkout/sessions` - Create checkout session
- `GET /checkout/sessions/{id}` - Get checkout session
- `PUT /checkout/sessions/{id}/shipping-address` - Set shipping address
- `PUT /checkout/sessions/{id}/billing-address` - Set billing address
- `POST /checkout/sessions/{id}/shipping-method` - Select shipping method
- `POST /checkout/sessions/{id}/complete` - Complete checkout

---

### payment-service.yaml (To be created)
**Base Path**: `/api/v1/payments`
**Port**: 8004
**Key Endpoints**:
- `POST /payments/intents` - Create payment intent (Stripe)
- `POST /payments/confirm` - Confirm payment
- `GET /payments/{id}` - Get payment details
- `POST /payments/{id}/refund` - Process refund (admin)
- `GET /payment-methods` - List saved payment methods
- `POST /payment-methods` - Add payment method
- `DELETE /payment-methods/{id}` - Remove payment method

---

### inventory-service.yaml (To be created)
**Base Path**: `/api/v1/inventory`
**Port**: 8005
**Key Endpoints**:
- `GET /inventory/{sku}` - Get inventory for SKU
- `POST /inventory/reserve` - Reserve inventory (checkout)
- `POST /inventory/release` - Release reservation
- `POST /inventory/fulfill` - Fulfill reservation (on shipment)
- `PUT /inventory/{sku}` - Update inventory levels (admin)
- `GET /inventory/low-stock` - Get low stock alerts (admin)

---

### order-service.yaml (To be created)
**Base Path**: `/api/v1/orders`
**Port**: 8006
**Key Endpoints**:
- `POST /orders` - Create order
- `GET /orders/{id}` - Get order details
- `GET /orders` - List user's orders
- `GET /orders/{id}/events` - Get order event history
- `POST /orders/{id}/cancel` - Cancel order
- `GET /admin/orders` - List all orders (admin)
- `PUT /admin/orders/{id}/status` - Update order status (admin)

---

### fulfillment-service.yaml (To be created)
**Base Path**: `/api/v1/fulfillment`
**Port**: 8007
**Key Endpoints**:
- `POST /shipments` - Create shipment
- `GET /shipments/{id}` - Get shipment details
- `GET /shipments/tracking/{trackingNumber}` - Track shipment
- `POST /shipments/{id}/updates` - Add tracking update
- `GET /orders/{orderId}/shipments` - Get order shipments

---

### account-service.yaml (To be created)
**Base Path**: `/api/v1/accounts`
**Port**: 8008
**Key Endpoints**:
- `POST /auth/register` - Register new user
- `POST /auth/login` - Login
- `POST /auth/logout` - Logout
- `POST /auth/refresh` - Refresh access token
- `POST /auth/forgot-password` - Request password reset
- `POST /auth/reset-password` - Reset password
- `GET /users/me` - Get current user profile
- `PUT /users/me` - Update profile
- `GET /users/me/addresses` - List addresses
- `POST /users/me/addresses` - Add address
- `PUT /users/me/addresses/{id}` - Update address
- `DELETE /users/me/addresses/{id}` - Delete address

---

### recommendation-service.yaml (To be created)
**Base Path**: `/api/v1/recommendations`
**Port**: 8009
**Key Endpoints**:
- `GET /recommendations/personalized` - Get personalized recommendations
- `GET /recommendations/similar/{productId}` - Get similar products
- `GET /recommendations/frequently-bought-together/{productId}` - Get frequently bought together
- `GET /recommendations/trending` - Get trending products

---

## API Gateway Routes

**Kong Gateway** aggregates all service endpoints under:

```
https://api.ecommerce.example.com/
├── /catalog/*        → catalog-service:8001
├── /cart/*           → cart-service:8002
├── /checkout/*       → checkout-service:8003
├── /payments/*       → payment-service:8004
├── /inventory/*      → inventory-service:8005
├── /orders/*         → order-service:8006
├── /fulfillment/*    → fulfillment-service:8007
├── /accounts/*       → account-service:8008
└── /recommendations/*→ recommendation-service:8009
```

## Authentication Flow

1. Client authenticates: `POST /accounts/auth/login`
2. Receives JWT access token (15 min expiry) + refresh token (30 days)
3. Includes access token in `Authorization: Bearer <token>` header
4. On expiry, refreshes: `POST /accounts/auth/refresh`
5. Kong validates JWT and routes to services

## Contract Testing

All service contracts tested using **Pact** for consumer-driven contract testing:

```bash
# Run contract tests
npm run test:contract

# Publish contracts to Pact Broker
npm run pact:publish

# Verify provider against contracts
npm run pact:verify
```

## Generating Client SDKs

OpenAPI contracts can generate client SDKs:

```bash
# TypeScript client for Next.js frontend
npx @openapitools/openapi-generator-cli generate \
  -i contracts/catalog-service.yaml \
  -g typescript-axios \
  -o frontend/customer-web/src/api/catalog

# Go client for service-to-service calls
openapi-generator-cli generate \
  -i contracts/order-service.yaml \
  -g go \
  -o services/fulfillment-service/pkg/orderclient
```

## Versioning Strategy

- API version in path: `/api/v1/products`
- Major version bump for breaking changes
- Backward compatibility maintained within major version
- Deprecated endpoints marked in OpenAPI with `deprecated: true`
- Sunset header indicates deprecation timeline: `Sunset: Sat, 31 Dec 2025 23:59:59 GMT`

## Error Handling

All services return consistent error format:

```json
{
  "code": "ERROR_CODE",
  "message": "Human-readable error message",
  "details": {
    "field": "validation error details"
  },
  "traceId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Standard Error Codes**:
- `BAD_REQUEST` - Invalid input (400)
- `UNAUTHORIZED` - Authentication required (401)
- `FORBIDDEN` - Insufficient permissions (403)
- `NOT_FOUND` - Resource not found (404)
- `CONFLICT` - Resource conflict (409)
- `RATE_LIMIT_EXCEEDED` - Too many requests (429)
- `INTERNAL_ERROR` - Server error (500)
- `SERVICE_UNAVAILABLE` - Service temporarily unavailable (503)

## Documentation

Generated API documentation available at:

- **Development**: http://localhost:8080/docs
- **Production**: https://docs.api.ecommerce.example.com

Uses **Redoc** for OpenAPI rendering.
