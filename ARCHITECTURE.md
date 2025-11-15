# Ecommerce Platform - Architecture Documentation

Complete technical architecture documentation for the ecommerce platform.

## Overview

A production-ready, enterprise-scale ecommerce platform built with microservices architecture, event-driven communication, and polyglot persistence.

### Key Characteristics

- **Microservices Architecture**: 7 independent services
- **Polyglot Stack**: Python, Go, Node.js/TypeScript
- **Event-Driven**: Kafka for async communication
- **Polyglot Persistence**: PostgreSQL, MongoDB, Redis
- **Cloud-Native**: Docker, Kubernetes-ready
- **Full-Stack**: Next.js frontend + RESTful APIs

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                              │
│  ┌──────────────┐              ┌──────────────┐                 │
│  │ Customer Web │              │  Admin Web   │                 │
│  │  (Next.js)   │              │  (Next.js)   │                 │
│  └──────┬───────┘              └──────┬───────┘                 │
└─────────┼──────────────────────────────┼──────────────────────────┘
          │                              │
┌─────────┼──────────────────────────────┼──────────────────────────┐
│         │         API GATEWAY (Future)  │                          │
└─────────┼──────────────────────────────┼──────────────────────────┘
          │                              │
┌─────────┴──────────────────────────────┴──────────────────────────┐
│                   MICROSERVICES LAYER                              │
│                                                                    │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐         │
│  │ Catalog  │  │Inventory │  │   Cart   │  │  Order   │         │
│  │  Python  │  │    Go    │  │  Node.js │  │ Node.js  │         │
│  │  FastAPI │  │   Gin    │  │  Express │  │  Express │         │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘         │
│       │             │             │             │                 │
│  ┌────▼─────┐  ┌────▼─────┐  ┌───▼──────┐  ┌───▼──────┐         │
│  │ MongoDB  │  │Postgres  │  │  Redis   │  │ Postgres │         │
│  └──────────┘  └──────────┘  └──────────┘  └────┬─────┘         │
│                                                   │                │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────▼────┐           │
│  │ Payment  │  │   User   │  │     Notification      │           │
│  │  Python  │  │    Go    │  │         Go            │           │
│  │  FastAPI │  │   Gin    │  │                       │           │
│  └────┬─────┘  └────┬─────┘  └──────────────────────┘           │
│       │             │                     ▲                       │
│  ┌────▼─────┐  ┌────▼─────┐               │                      │
│  │Postgres  │  │ Postgres │               │                      │
│  └──────────┘  └──────────┘               │                      │
└────────────────────────────────────────────┼──────────────────────┘
                                             │
┌────────────────────────────────────────────┼──────────────────────┐
│               EVENT STREAMING LAYER        │                      │
│                 ┌──────────────────────────┴────┐                 │
│                 │         Apache Kafka          │                 │
│                 │  Topics: order-events,        │                 │
│                 │         payment-events        │                 │
│                 └───────────────────────────────┘                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                  INFRASTRUCTURE LAYER                            │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│  │PostgreSQL│  │ MongoDB  │  │  Redis   │  │  Kafka   │        │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘        │
│  ┌──────────┐  ┌──────────┐                                     │
│  │OpenSearch│  │ MailHog  │                                     │
│  └──────────┘  └──────────┘                                     │
└─────────────────────────────────────────────────────────────────┘
```

## Microservices

### 1. Catalog Service (Python/FastAPI)

**Purpose**: Product catalog management and search

**Technology Stack:**
- Python 3.11
- FastAPI framework
- MongoDB for product data
- OpenSearch for full-text search

**Responsibilities:**
- Product CRUD operations
- Category management
- Product search
- Inventory quantity display

**Key Endpoints:**
- `GET /api/v1/products` - List products
- `GET /api/v1/products/:id` - Get product details
- `GET /api/v1/search` - Search products
- `GET /api/v1/categories` - List categories

**Database Schema:**
```javascript
// MongoDB collection: products
{
  _id: ObjectId,
  sku: String (unique),
  name: String,
  slug: String (unique),
  description: String,
  price: Number,
  category_id: String,
  brand: String,
  image_url: String,
  specifications: Object,
  is_active: Boolean,
  inventory_quantity: Number,
  created_at: Date,
  updated_at: Date
}
```

### 2. Inventory Service (Go/Gin)

**Purpose**: Real-time inventory management

**Technology Stack:**
- Go 1.21
- Gin framework
- PostgreSQL for inventory data

**Responsibilities:**
- Track stock levels
- Reserve inventory for orders
- Release reservations
- Update quantities

**Key Endpoints:**
- `GET /api/v1/inventory/:sku` - Get stock level
- `POST /api/v1/inventory/:sku/reserve` - Reserve stock
- `POST /api/v1/inventory/:sku/release` - Release reservation
- `PUT /api/v1/inventory/:sku` - Update quantity

**Database Schema:**
```sql
CREATE TABLE inventory (
    id VARCHAR(36) PRIMARY KEY,
    sku VARCHAR(100) UNIQUE NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 0,
    reserved_quantity INTEGER NOT NULL DEFAULT 0,
    available_quantity INTEGER GENERATED ALWAYS AS (quantity - reserved_quantity) STORED,
    location VARCHAR(255),
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

### 3. Cart Service (Node.js/Express)

**Purpose**: Shopping cart session management

**Technology Stack:**
- Node.js 20
- TypeScript
- Express framework
- Redis for session storage

**Responsibilities:**
- Cart CRUD operations
- Session management
- Cart expiration
- Price calculation

**Key Endpoints:**
- `GET /api/v1/cart/:userId` - Get cart
- `POST /api/v1/cart/:userId/items` - Add item
- `PUT /api/v1/cart/:userId/items/:productId` - Update quantity
- `DELETE /api/v1/cart/:userId/items/:productId` - Remove item
- `DELETE /api/v1/cart/:userId` - Clear cart

**Data Structure (Redis):**
```typescript
{
  userId: string,
  items: [{
    productId: string,
    sku: string,
    name: string,
    price: number,
    quantity: number,
    imageUrl?: string
  }],
  subtotal: number,
  totalItems: number,
  updatedAt: string
}
```

### 4. Order Service (Node.js/Express)

**Purpose**: Order orchestration and management

**Technology Stack:**
- Node.js 20
- TypeScript
- Express framework
- PostgreSQL for order data
- Kafka for event publishing

**Responsibilities:**
- Order creation (orchestrate checkout)
- Order status management
- Shipping tracking
- Order history
- Event publishing

**Key Endpoints:**
- `POST /api/v1/orders` - Create order
- `GET /api/v1/orders/:id` - Get order details
- `GET /api/v1/orders` - List orders
- `POST /api/v1/orders/:id/cancel` - Cancel order
- `POST /api/v1/orders/:id/ship` - Mark as shipped
- `POST /api/v1/orders/:id/deliver` - Mark as delivered

**Database Schema:**
```sql
CREATE TABLE orders (
    id VARCHAR(36) PRIMARY KEY,
    order_number VARCHAR(20) UNIQUE NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    subtotal DECIMAL(10, 2) NOT NULL,
    tax_amount DECIMAL(10, 2) NOT NULL,
    shipping_amount DECIMAL(10, 2) NOT NULL,
    total_amount DECIMAL(10, 2) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    payment_status VARCHAR(20) NOT NULL DEFAULT 'pending',
    payment_method VARCHAR(50),
    shipping_address JSONB NOT NULL,
    billing_address JSONB NOT NULL,
    tracking_number VARCHAR(100),
    carrier VARCHAR(50),
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

CREATE TABLE order_items (
    id VARCHAR(36) PRIMARY KEY,
    order_id VARCHAR(36) REFERENCES orders(id),
    product_id VARCHAR(36) NOT NULL,
    sku VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    quantity INTEGER NOT NULL,
    image_url TEXT,
    created_at TIMESTAMP
);
```

### 5. Payment Service (Python/FastAPI)

**Purpose**: Payment processing

**Technology Stack:**
- Python 3.11
- FastAPI framework
- PostgreSQL for payment records
- Kafka for event publishing

**Responsibilities:**
- Process payments
- Payment validation
- Payment status tracking
- Refund processing

**Key Endpoints:**
- `POST /api/v1/payments` - Process payment
- `GET /api/v1/payments/:id` - Get payment status
- `POST /api/v1/payments/:id/refund` - Process refund

**Database Schema:**
```sql
CREATE TABLE payments (
    id VARCHAR(36) PRIMARY KEY,
    order_id VARCHAR(36) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    payment_method VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    transaction_id VARCHAR(255),
    gateway_response JSONB,
    error_message TEXT,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

### 6. User Service (Go/Gin)

**Purpose**: Authentication and user management

**Technology Stack:**
- Go 1.21
- Gin framework
- PostgreSQL for user data
- JWT for authentication
- bcrypt for password hashing

**Responsibilities:**
- User registration
- User login
- JWT token generation/validation
- Profile management
- Role-based access control

**Key Endpoints:**
- `POST /api/v1/auth/register` - Register user
- `POST /api/v1/auth/login` - Login
- `POST /api/v1/auth/validate` - Validate token
- `GET /api/v1/users/profile` - Get profile (protected)
- `PUT /api/v1/users/profile` - Update profile (protected)
- `POST /api/v1/users/change-password` - Change password (protected)

**Database Schema:**
```sql
CREATE TABLE users (
    id VARCHAR(36) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    role VARCHAR(20) NOT NULL DEFAULT 'customer',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

### 7. Notification Service (Go)

**Purpose**: Event-driven notifications

**Technology Stack:**
- Go 1.21
- Kafka consumer
- SMTP for email
- Twilio for SMS (simulated)

**Responsibilities:**
- Consume Kafka events
- Send email notifications
- Send SMS notifications (simulated)
- Template rendering

**Event Types Handled:**
- `order.created` - Order confirmation
- `payment.successful` - Payment confirmation
- `payment.failed` - Payment failure notification
- `order.shipped` - Shipping notification
- `order.delivered` - Delivery confirmation
- `order.cancelled` - Cancellation notification

## Data Flow Patterns

### 1. Order Creation Flow (Saga Pattern)

```
┌──────────┐
│  Client  │
└────┬─────┘
     │ 1. Create Order
     ▼
┌──────────────┐
│Order Service │
└────┬─────────┘
     │ 2. Reserve Inventory
     ▼
┌────────────────┐         Success
│Inventory Service│──────────────┐
└────────────────┘              │
     │ 3. Process Payment        │
     ▼                           │
┌────────────────┐         ┌─────▼──────┐
│Payment Service │────────▶│  Confirm   │
└────────────────┘   4.    │   Order    │
     │ 5. Publish Events   └────────────┘
     ▼
┌────────────────┐
│     Kafka      │
└────┬───────────┘
     │ 6. Consume
     ▼
┌────────────────────┐
│Notification Service│
└────────────────────┘
     │ 7. Send Email
     ▼
┌──────────┐
│  Customer│
└──────────┘
```

### 2. Product Search Flow

```
┌──────────┐
│  Client  │
└────┬─────┘
     │ 1. Search Query
     ▼
┌──────────────┐
│Catalog Service│
└────┬─────────┘
     │ 2. Query OpenSearch
     ▼
┌───────────────┐
│  OpenSearch   │
└────┬──────────┘
     │ 3. Results
     ▼
┌──────────────┐
│    Client    │
└──────────────┘
```

### 3. Cart to Order Flow

```
1. User adds items → Cart Service (Redis)
2. User proceeds to checkout → Load cart
3. User submits order → Order Service
4. Reserve inventory → Inventory Service
5. Process payment → Payment Service
6. Update order status → Order Service
7. Publish events → Kafka
8. Send notifications → Notification Service
9. Clear cart → Cart Service
10. Show confirmation → Client
```

## Communication Patterns

### Synchronous (REST)

- Client → Services: REST APIs
- Service → Service: HTTP calls
- Used for: Read operations, direct queries

### Asynchronous (Events)

- Service → Kafka → Service
- Used for: Notifications, state changes, auditing
- Eventual consistency model

## Data Persistence Strategy

### PostgreSQL (Relational)

**Use Cases:**
- Orders (ACID compliance required)
- Payments (financial transactions)
- Users (structured data)
- Inventory (stock tracking)

**Why:** Strong consistency, transactions, relationships

### MongoDB (Document)

**Use Cases:**
- Product catalog (flexible schema)
- Product specifications (nested data)

**Why:** Flexible schema, fast reads, horizontal scaling

### Redis (Key-Value)

**Use Cases:**
- Shopping cart (session data)
- Cache (frequently accessed data)

**Why:** In-memory speed, TTL support, simple data model

### OpenSearch (Search)

**Use Cases:**
- Product search
- Full-text queries
- Faceted search

**Why:** Optimized for search, relevance ranking

## Security Architecture

### Authentication Flow

```
1. User submits credentials
     ↓
2. User Service validates
     ↓
3. Generate JWT token (HS256)
     ↓
4. Return token to client
     ↓
5. Client stores token (localStorage)
     ↓
6. Client includes token in requests
     ↓
7. Services validate token
     ↓
8. Grant/deny access
```

### Security Layers

1. **Transport Security**: TLS/SSL
2. **Authentication**: JWT tokens
3. **Authorization**: Role-based (customer, admin)
4. **Data Security**: Password hashing (bcrypt)
5. **Network Security**: VPC, firewalls
6. **Rate Limiting**: Prevent abuse

## Scalability

### Horizontal Scaling

**Stateless Services** (can scale freely):
- Catalog Service
- Inventory Service
- Order Service
- Payment Service
- User Service

**Stateful Services** (need special handling):
- Cart Service (Redis Cluster)

### Vertical Scaling

Increase resources per service:
- CPU
- Memory
- Network bandwidth

### Database Scaling

**PostgreSQL:**
- Read replicas for queries
- Connection pooling
- Partitioning for large tables

**MongoDB:**
- Sharding for horizontal scaling
- Replica sets for availability

**Redis:**
- Redis Cluster for scaling
- Redis Sentinel for HA

## Observability

### Logging

- Structured JSON logs
- Correlation IDs for tracing
- Centralized logging (ELK/CloudWatch)

### Metrics

- Request rate
- Response time
- Error rate
- Resource usage

### Tracing

- Distributed tracing (Jaeger)
- Request flow visualization
- Performance bottleneck identification

## Deployment Architecture

### Container Orchestration

**Development:** Docker Compose
**Production:** Kubernetes

### CI/CD Pipeline

```
Code Push → Build → Test → Deploy to Staging → Integration Tests → Deploy to Production
```

### Blue-Green Deployment

```
┌─────────┐
│  Blue   │ ← Current (100% traffic)
└─────────┘

┌─────────┐
│  Green  │ ← New version (0% traffic)
└─────────┘
     ↓ Deploy & Test
┌─────────┐
│  Green  │ ← Switch traffic (100%)
└─────────┘

┌─────────┐
│  Blue   │ ← Keep for rollback
└─────────┘
```

## Technology Decisions

### Why Microservices?

- **Independence**: Deploy services independently
- **Scalability**: Scale services based on load
- **Technology Freedom**: Use best tool for each job
- **Team Autonomy**: Teams own services
- **Fault Isolation**: Failures don't cascade

### Why Polyglot?

- **Python**: Fast development, ML integration
- **Go**: High performance, low latency
- **Node.js**: JavaScript ecosystem, async I/O

### Why Event-Driven?

- **Decoupling**: Services don't depend on each other
- **Scalability**: Handle high throughput
- **Reliability**: Retry failed events
- **Audit Trail**: Event log for debugging

## Future Enhancements

1. **API Gateway** (Kong/NGINX)
2. **Service Mesh** (Istio)
3. **GraphQL** layer
4. **ML Recommendations**
5. **Advanced Analytics**
6. **Mobile Apps** (React Native)
7. **Real-time Updates** (WebSockets)
8. **Multi-region Deployment**

## References

- Microservices Pattern: https://microservices.io
- Event-Driven Architecture: Martin Fowler
- Domain-Driven Design: Eric Evans
