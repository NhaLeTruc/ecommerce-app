# Data Model Specification

**Feature**: Enterprise-Grade Ecommerce Platform
**Date**: 2025-11-15
**Purpose**: Define all entity models, relationships, and data constraints across microservices

## Overview

This document defines the data models for all services in the ecommerce platform. Each service owns its data (database-per-service pattern), with relationships maintained through events and eventual consistency.

---

## Service Data Ownership

| Service | Primary Database | Entities |
|---------|-----------------|----------|
| **Catalog Service** | MongoDB | Product, Category, Review, Recommendation |
| **Cart Service** | Redis | Cart, CartItem |
| **Checkout Service** | PostgreSQL | CheckoutSession, ShippingAddress |
| **Payment Service** | PostgreSQL | Payment, PaymentMethod (tokenized) |
| **Inventory Service** | PostgreSQL | Inventory, Reservation |
| **Order Service** | PostgreSQL (Event Store) | Order, OrderEvent, OrderProjection |
| **Fulfillment Service** | PostgreSQL | Shipment, TrackingUpdate |
| **Account Service** | PostgreSQL | User, Profile, Address, Session |

---

## 1. Catalog Service (MongoDB)

### Product Entity

**Collection**: `products`

```json
{
  "_id": "ObjectId",
  "sku": "string (unique index)",
  "name": "string",
  "slug": "string (unique index)",
  "description": "string",
  "longDescription": "string (markdown)",
  "category": {
    "id": "ObjectId",
    "name": "string",
    "path": "string[]"  // ["Electronics", "Computers", "Laptops"]
  },
  "brand": "string",
  "price": {
    "amount": "decimal (stored as string)",
    "currency": "string (ISO 4217)",
    "compareAtPrice": "decimal|null"  // Original price if on sale
  },
  "images": [
    {
      "url": "string (MinIO URL)",
      "alt": "string",
      "isPrimary": "boolean",
      "order": "number"
    }
  ],
  "attributes": {
    // Dynamic attributes per category
    "color": "string",
    "size": "string",
    "weight": "number",
    "dimensions": {
      "length": "number",
      "width": "number",
      "height": "number",
      "unit": "string"
    }
    // ... additional attributes as needed
  },
  "variants": [
    {
      "sku": "string",
      "name": "string (e.g., 'Blue, Large')",
      "price": "decimal",
      "attributes": {
        "color": "Blue",
        "size": "Large"
      },
      "inventoryId": "uuid"  // Reference to Inventory Service
    }
  ],
  "searchKeywords": ["string"],  // For search optimization
  "seo": {
    "title": "string",
    "description": "string",
    "keywords": ["string"]
  },
  "status": "enum (DRAFT, ACTIVE, ARCHIVED, OUT_OF_STOCK)",
  "publishedAt": "ISODate|null",
  "createdAt": "ISODate",
  "updatedAt": "ISODate",
  "version": "number"  // For optimistic locking
}
```

**Indexes**:
- `sku`: unique
- `slug`: unique
- `category.id`: standard
- `status`: standard
- `searchKeywords`: text index
- `createdAt`: descending

**Validation Rules**:
- SKU must match pattern: `^[A-Z0-9-]{6,20}$`
- Price amount must be positive
- At least one image required for ACTIVE status
- slug must be URL-safe (lowercase, hyphens only)

---

### Category Entity

**Collection**: `categories`

```json
{
  "_id": "ObjectId",
  "name": "string",
  "slug": "string (unique)",
  "description": "string",
  "parentId": "ObjectId|null",
  "path": ["string"],  // Full path from root
  "level": "number",   // 0 = root, 1 = child, etc.
  "image": {
    "url": "string",
    "alt": "string"
  },
  "attributes": [
    {
      "name": "string",
      "type": "enum (TEXT, NUMBER, SELECT, MULTI_SELECT)",
      "required": "boolean",
      "options": ["string"]  // For SELECT/MULTI_SELECT
    }
  ],
  "displayOrder": "number",
  "isActive": "boolean",
  "createdAt": "ISODate",
  "updatedAt": "ISODate"
}
```

**Indexes**:
- `slug`: unique
- `parentId`: standard
- `level`: standard

---

### Review Entity

**Collection**: `reviews`

```json
{
  "_id": "ObjectId",
  "productId": "ObjectId",
  "sku": "string",  // Denormalized for querying
  "userId": "uuid",  // Reference to Account Service
  "rating": "number (1-5)",
  "title": "string",
  "content": "string",
  "verifiedPurchase": "boolean",
  "helpfulCount": "number",
  "images": ["string (URLs)"],
  "status": "enum (PENDING, APPROVED, REJECTED, FLAGGED)",
  "moderatedBy": "uuid|null",
  "moderatedAt": "ISODate|null",
  "createdAt": "ISODate",
  "updatedAt": "ISODate"
}
```

**Indexes**:
- `productId + status`: compound
- `userId`: standard
- `createdAt`: descending

---

## 2. Cart Service (Redis)

### Cart Entity

**Key Pattern**: `cart:{userId}` or `cart:session:{sessionId}`

```json
{
  "userId": "uuid|null",
  "sessionId": "uuid",
  "items": [
    {
      "sku": "string",
      "productId": "string",  // MongoDB ObjectId as string
      "name": "string",  // Denormalized
      "price": "decimal (string)",
      "quantity": "number",
      "image": "string (URL)",
      "addedAt": "ISO8601 timestamp"
    }
  ],
  "totals": {
    "subtotal": "decimal (string)",
    "tax": "decimal (string)",
    "shipping": "decimal (string)",
    "discount": "decimal (string)",
    "total": "decimal (string)"
  },
  "promoCode": "string|null",
  "createdAt": "ISO8601 timestamp",
  "updatedAt": "ISO8601 timestamp",
  "expiresAt": "ISO8601 timestamp"  // TTL = 24 hours for guests, 30 days for users
}
```

**Redis Commands**:
- GET `cart:{userId}`: Retrieve cart
- SET `cart:{userId}` + EXPIRE: Save cart with TTL
- DEL `cart:{userId}`: Clear cart after checkout

**Validation Rules**:
- Quantity must be positive integer ≤99
- Price must match current product price (verified on checkout)
- Maximum 100 items per cart

---

## 3. Checkout Service (PostgreSQL)

### CheckoutSession Table

```sql
CREATE TABLE checkout_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,  -- NULL for guest checkout
  session_id UUID NOT NULL UNIQUE,
  cart_snapshot JSONB NOT NULL,  -- Full cart at checkout time
  shipping_address_id UUID REFERENCES shipping_addresses(id),
  billing_address_id UUID REFERENCES shipping_addresses(id),
  shipping_method VARCHAR(50),
  shipping_cost DECIMAL(10, 2),
  tax_amount DECIMAL(10, 2),
  total_amount DECIMAL(10, 2) NOT NULL,
  status VARCHAR(20) NOT NULL,  -- PENDING, PAYMENT_PROCESSING, COMPLETED, ABANDONED, EXPIRED
  payment_intent_id VARCHAR(100),  -- Stripe Payment Intent ID
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMP,
  CONSTRAINT checkout_sessions_status_check CHECK (status IN ('PENDING', 'PAYMENT_PROCESSING', 'COMPLETED', 'ABANDONED', 'EXPIRED'))
);

CREATE INDEX idx_checkout_sessions_user_id ON checkout_sessions(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_checkout_sessions_status ON checkout_sessions(status);
CREATE INDEX idx_checkout_sessions_expires_at ON checkout_sessions(expires_at) WHERE status = 'PENDING';
```

### ShippingAddress Table

```sql
CREATE TABLE shipping_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checkout_session_id UUID REFERENCES checkout_sessions(id),
  user_id UUID,  -- NULL for guest checkout
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  company VARCHAR(200),
  address_line1 VARCHAR(200) NOT NULL,
  address_line2 VARCHAR(200),
  city VARCHAR(100) NOT NULL,
  state_province VARCHAR(100) NOT NULL,
  postal_code VARCHAR(20) NOT NULL,
  country VARCHAR(2) NOT NULL,  -- ISO 3166-1 alpha-2
  phone VARCHAR(20),
  validated BOOLEAN DEFAULT FALSE,
  validation_metadata JSONB,  -- Address validation service response
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_shipping_addresses_user_id ON shipping_addresses(user_id) WHERE user_id IS NOT NULL;
```

**Validation Rules**:
- Checkout session expires after 15 minutes if not completed
- Address must be validated before proceeding to payment
- Total amount must match cart totals + tax + shipping

---

## 4. Payment Service (PostgreSQL)

### Payment Table

```sql
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL,
  checkout_session_id UUID NOT NULL,
  user_id UUID,
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  status VARCHAR(20) NOT NULL,  -- PENDING, AUTHORIZED, CAPTURED, FAILED, REFUNDED, PARTIALLY_REFUNDED
  payment_method_type VARCHAR(20) NOT NULL,  -- CARD, DIGITAL_WALLET, BANK_TRANSFER
  stripe_payment_intent_id VARCHAR(100) UNIQUE,
  stripe_charge_id VARCHAR(100),
  last4 VARCHAR(4),  -- Last 4 digits of card
  card_brand VARCHAR(20),  -- visa, mastercard, amex, etc.
  failure_code VARCHAR(50),
  failure_message TEXT,
  metadata JSONB,  -- Additional payment metadata
  idempotency_key UUID NOT NULL UNIQUE,  -- For idempotent operations
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  authorized_at TIMESTAMP,
  captured_at TIMESTAMP,
  failed_at TIMESTAMP,
  CONSTRAINT payments_status_check CHECK (status IN ('PENDING', 'AUTHORIZED', 'CAPTURED', 'FAILED', 'REFUNDED', 'PARTIALLY_REFUNDED')),
  CONSTRAINT payments_amount_check CHECK (amount > 0)
);

CREATE INDEX idx_payments_order_id ON payments(order_id);
CREATE INDEX idx_payments_user_id ON payments(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_created_at ON payments(created_at DESC);
CREATE INDEX idx_payments_stripe_payment_intent_id ON payments(stripe_payment_intent_id) WHERE stripe_payment_intent_id IS NOT NULL;
```

### PaymentMethod Table (Tokenized)

```sql
CREATE TABLE payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  stripe_payment_method_id VARCHAR(100) NOT NULL UNIQUE,  -- Stripe tokenized payment method
  type VARCHAR(20) NOT NULL,  -- CARD, BANK_ACCOUNT
  last4 VARCHAR(4),
  card_brand VARCHAR(20),
  exp_month INT,
  exp_year INT,
  is_default BOOLEAN DEFAULT FALSE,
  billing_address JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payment_methods_user_id ON payment_methods(user_id);
CREATE INDEX idx_payment_methods_is_default ON payment_methods(user_id, is_default) WHERE is_default = TRUE;
```

**Security**:
- **NO raw credit card data stored** - all cards tokenized via Stripe
- PCI DSS compliance through tokenization
- Stripe handles sensitive data

**Validation Rules**:
- Idempotency key prevents duplicate charges
- Payment amount must match order total
- Only one default payment method per user

---

## 5. Inventory Service (PostgreSQL)

### Inventory Table

```sql
CREATE TABLE inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku VARCHAR(50) NOT NULL UNIQUE,
  warehouse_id UUID NOT NULL,  -- Future: multiple warehouses
  available_quantity INT NOT NULL DEFAULT 0,
  reserved_quantity INT NOT NULL DEFAULT 0,
  reorder_point INT NOT NULL DEFAULT 10,
  reorder_quantity INT NOT NULL DEFAULT 50,
  last_restock_date DATE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT inventory_available_quantity_check CHECK (available_quantity >= 0),
  CONSTRAINT inventory_reserved_quantity_check CHECK (reserved_quantity >= 0)
);

CREATE INDEX idx_inventory_sku ON inventory(sku);
CREATE INDEX idx_inventory_warehouse_id ON inventory(warehouse_id);
CREATE INDEX idx_inventory_low_stock ON inventory(available_quantity) WHERE available_quantity <= reorder_point;
```

### Reservation Table

```sql
CREATE TABLE reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_id UUID NOT NULL REFERENCES inventory(id),
  checkout_session_id UUID NOT NULL,
  sku VARCHAR(50) NOT NULL,
  quantity INT NOT NULL,
  status VARCHAR(20) NOT NULL,  -- RESERVED, RELEASED, FULFILLED, EXPIRED
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  released_at TIMESTAMP,
  CONSTRAINT reservations_status_check CHECK (status IN ('RESERVED', 'RELEASED', 'FULFILLED', 'EXPIRED')),
  CONSTRAINT reservations_quantity_check CHECK (quantity > 0)
);

CREATE INDEX idx_reservations_inventory_id ON reservations(inventory_id);
CREATE INDEX idx_reservations_checkout_session_id ON reservations(checkout_session_id);
CREATE INDEX idx_reservations_status ON reservations(status);
CREATE INDEX idx_reservations_expires_at ON reservations(expires_at) WHERE status = 'RESERVED';
```

**Business Rules**:
- Reservations expire after 15 minutes
- Reserved quantity must not exceed available quantity
- Inventory alerts triggered when available <= reorder_point
- Atomic operations for reserve/release using row-level locking

---

## 6. Order Service (PostgreSQL - Event Sourcing)

### Order Events Table

```sql
CREATE TABLE order_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aggregate_id UUID NOT NULL,  -- Order ID
  event_type VARCHAR(50) NOT NULL,  -- ORDER_CREATED, PAYMENT_RECEIVED, ORDER_SHIPPED, etc.
  event_data JSONB NOT NULL,
  metadata JSONB,
  sequence_number BIGSERIAL,
  correlation_id UUID NOT NULL,  -- For tracing
  causation_id UUID,  -- Event that caused this event
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT order_events_sequence_unique UNIQUE (aggregate_id, sequence_number)
);

CREATE INDEX idx_order_events_aggregate_id ON order_events(aggregate_id, sequence_number);
CREATE INDEX idx_order_events_event_type ON order_events(event_type);
CREATE INDEX idx_order_events_created_at ON order_events(created_at DESC);
CREATE INDEX idx_order_events_correlation_id ON order_events(correlation_id);
```

### Order Projection Table (Read Model)

```sql
CREATE TABLE orders (
  id UUID PRIMARY KEY,
  order_number VARCHAR(20) NOT NULL UNIQUE,  -- e.g., "ORD-2025-001234"
  user_id UUID,
  email VARCHAR(255) NOT NULL,
  items JSONB NOT NULL,  -- Array of order items
  subtotal DECIMAL(10, 2) NOT NULL,
  tax DECIMAL(10, 2) NOT NULL,
  shipping DECIMAL(10, 2) NOT NULL,
  discount DECIMAL(10, 2) DEFAULT 0,
  total DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  status VARCHAR(20) NOT NULL,  -- PENDING, CONFIRMED, PROCESSING, SHIPPED, DELIVERED, CANCELLED, REFUNDED
  payment_status VARCHAR(20) NOT NULL,  -- PENDING, PAID, FAILED, REFUNDED
  shipping_address JSONB NOT NULL,
  billing_address JSONB NOT NULL,
  tracking_number VARCHAR(100),
  carrier VARCHAR(50),
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL,
  shipped_at TIMESTAMP,
  delivered_at TIMESTAMP,
  cancelled_at TIMESTAMP,
  CONSTRAINT orders_status_check CHECK (status IN ('PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED')),
  CONSTRAINT orders_total_check CHECK (total > 0)
);

CREATE INDEX idx_orders_user_id ON orders(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_orders_email ON orders(email);
CREATE INDEX idx_orders_order_number ON orders(order_number);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);
```

**Event Sourcing Pattern**:
- All state changes stored as events in `order_events`
- Current state rebuilt from events (event replay)
- `orders` table is materialized view (projection) for queries
- Immutable events provide complete audit trail

**Event Types**:
- `ORDER_CREATED`: Initial order creation
- `PAYMENT_AUTHORIZED`: Payment authorized
- `PAYMENT_CAPTURED`: Payment captured
- `INVENTORY_RESERVED`: Inventory reserved
- `ORDER_CONFIRMED`: Order confirmed, ready for fulfillment
- `ORDER_SHIPPED`: Order shipped
- `ORDER_DELIVERED`: Order delivered
- `ORDER_CANCELLED`: Order cancelled
- `ORDER_REFUNDED`: Order refunded

---

## 7. Fulfillment Service (PostgreSQL)

### Shipment Table

```sql
CREATE TABLE shipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL,
  order_number VARCHAR(20) NOT NULL,  -- Denormalized for querying
  tracking_number VARCHAR(100) NOT NULL UNIQUE,
  carrier VARCHAR(50) NOT NULL,  -- UPS, FedEx, USPS, DHL
  service_level VARCHAR(50),  -- Ground, 2-Day, Overnight
  items JSONB NOT NULL,  -- Items in this shipment (for split shipments)
  shipping_address JSONB NOT NULL,
  status VARCHAR(20) NOT NULL,  -- PENDING, PICKED, PACKED, SHIPPED, IN_TRANSIT, DELIVERED, EXCEPTION, RETURNED
  label_url VARCHAR(500),  -- Shipping label PDF URL
  estimated_delivery_date DATE,
  actual_delivery_date DATE,
  weight_grams INT,
  dimensions JSONB,  -- {length, width, height, unit}
  metadata JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  shipped_at TIMESTAMP,
  delivered_at TIMESTAMP,
  CONSTRAINT shipments_status_check CHECK (status IN ('PENDING', 'PICKED', 'PACKED', 'SHIPPED', 'IN_TRANSIT', 'DELIVERED', 'EXCEPTION', 'RETURNED'))
);

CREATE INDEX idx_shipments_order_id ON shipments(order_id);
CREATE INDEX idx_shipments_tracking_number ON shipments(tracking_number);
CREATE INDEX idx_shipments_status ON shipments(status);
CREATE INDEX idx_shipments_created_at ON shipments(created_at DESC);
```

### TrackingUpdate Table

```sql
CREATE TABLE tracking_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id UUID NOT NULL REFERENCES shipments(id),
  tracking_number VARCHAR(100) NOT NULL,
  status VARCHAR(50) NOT NULL,
  location VARCHAR(200),
  description TEXT,
  timestamp TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tracking_updates_shipment_id ON tracking_updates(shipment_id, timestamp DESC);
CREATE INDEX idx_tracking_updates_tracking_number ON tracking_updates(tracking_number);
```

**Business Rules**:
- One order can have multiple shipments (split shipments)
- Tracking updates fetched from carrier APIs
- Webhook notifications sent to customer on status changes

---

## 8. Account Service (PostgreSQL)

### User Table

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,  -- bcrypt/Argon2 hash
  email_verified BOOLEAN DEFAULT FALSE,
  email_verification_token VARCHAR(100),
  email_verification_expires_at TIMESTAMP,
  password_reset_token VARCHAR(100),
  password_reset_expires_at TIMESTAMP,
  two_factor_enabled BOOLEAN DEFAULT FALSE,
  two_factor_secret VARCHAR(100),
  role VARCHAR(20) NOT NULL DEFAULT 'CUSTOMER',  -- CUSTOMER, ADMIN, SUPPORT
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',  -- ACTIVE, SUSPENDED, DELETED
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  last_login_at TIMESTAMP,
  CONSTRAINT users_role_check CHECK (role IN ('CUSTOMER', 'ADMIN', 'SUPPORT')),
  CONSTRAINT users_status_check CHECK (status IN ('ACTIVE', 'SUSPENDED', 'DELETED'))
);

CREATE UNIQUE INDEX idx_users_email ON users(LOWER(email));
CREATE INDEX idx_users_status ON users(status);
```

### Profile Table

```sql
CREATE TABLE profiles (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  phone VARCHAR(20),
  date_of_birth DATE,
  avatar_url VARCHAR(500),
  preferences JSONB,  -- {emailNotifications: true, language: 'en', currency: 'USD'}
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

### Address Table

```sql
CREATE TABLE addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL,  -- SHIPPING, BILLING, BOTH
  is_default BOOLEAN DEFAULT FALSE,
  label VARCHAR(50),  -- "Home", "Work", "Parents' House"
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  company VARCHAR(200),
  address_line1 VARCHAR(200) NOT NULL,
  address_line2 VARCHAR(200),
  city VARCHAR(100) NOT NULL,
  state_province VARCHAR(100) NOT NULL,
  postal_code VARCHAR(20) NOT NULL,
  country VARCHAR(2) NOT NULL,
  phone VARCHAR(20),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT addresses_type_check CHECK (type IN ('SHIPPING', 'BILLING', 'BOTH'))
);

CREATE INDEX idx_addresses_user_id ON addresses(user_id);
CREATE INDEX idx_addresses_is_default ON addresses(user_id, is_default) WHERE is_default = TRUE;
```

### Session Table

```sql
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  refresh_token_hash VARCHAR(255) NOT NULL,
  device_info JSONB,  -- {userAgent, ipAddress, deviceType}
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  last_accessed_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);
```

**Security**:
- Passwords hashed with bcrypt (cost factor 12)
- Email verification required before full account access
- Password reset tokens expire after 1 hour
- Sessions expire after 24 hours, refresh tokens after 30 days
- Two-factor authentication optional (TOTP)

---

## Cross-Service Data Consistency

### Eventual Consistency via Events

Services communicate via Kafka events to maintain data consistency:

1. **Order Creation Flow**:
   ```
   Checkout Service → ORDER_CHECKOUT_INITIATED event → Kafka
   ├─→ Inventory Service: Reserve inventory
   ├─→ Payment Service: Create payment intent
   └─→ Order Service: Create order aggregate

   Payment Service → PAYMENT_CAPTURED event → Kafka
   ├─→ Order Service: Confirm order
   └─→ Fulfillment Service: Create shipment

   Fulfillment Service → ORDER_SHIPPED event → Kafka
   └─→ Order Service: Update order status
   ```

2. **Product Price Update Flow**:
   ```
   Catalog Service → PRODUCT_PRICE_CHANGED event → Kafka
   └─→ Cart Service: Invalidate cached prices
   ```

3. **Inventory Update Flow**:
   ```
   Inventory Service → INVENTORY_UPDATED event → Kafka
   ├─→ Catalog Service: Update stock status
   └─→ Recommendation Service: Adjust recommendations
   ```

### Data Denormalization

Strategic denormalization improves read performance:

- **Cart items**: Store product name, price, image (snapshot at add-to-cart time)
- **Order items**: Store complete product details (snapshot at order time)
- **Shipment**: Store order number (avoid join to Order Service)

---

## Data Validation & Constraints Summary

| Entity | Key Validations |
|--------|----------------|
| **Product** | SKU format, positive price, at least 1 image for ACTIVE |
| **Cart** | Max 100 items, quantity 1-99, prices match current catalog |
| **Checkout** | Address validated, totals correct, expires in 15 min |
| **Payment** | Idempotent, amount matches order, tokenized (no raw cards) |
| **Inventory** | Non-negative quantities, atomic reserve/release |
| **Order** | Immutable events, positive total, valid status transitions |
| **Shipment** | Valid tracking number, status progression enforced |
| **User** | Unique email (case-insensitive), verified before full access |

---

## Next Steps

Data model complete. Proceed to:
1. **contracts/**: Generate OpenAPI schemas for each service
2. **quickstart.md**: Document local development setup
