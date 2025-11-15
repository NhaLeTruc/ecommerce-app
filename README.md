# Ecommerce Platform - Microservices Architecture

A production-ready, enterprise-scale ecommerce platform built with microservices architecture, featuring polyglot services, event-driven communication, and complete observability.

## 🏗️ Architecture Overview

### Microservices

| Service | Technology | Port | Purpose |
|---------|-----------|------|---------|
| **Catalog Service** | Python/FastAPI | 8000 | Product catalog management |
| **Inventory Service** | Go/Gin | 8081 | Stock level tracking |
| **Cart Service** | Node.js/Express | 3000 | Shopping cart operations |
| **Order Service** | Node.js/Express | 3001 | Order management & orchestration |
| **Payment Service** | Python/FastAPI | 8001 | Payment processing |
| **User Service** | Go/Gin | 8084 | Authentication & user management |
| **Notification Service** | Go | - | Email/SMS notifications (event-driven) |
| **Customer Web** | Next.js 14 | 3001 | Customer-facing frontend |

### Infrastructure

| Component | Technology | Port | Purpose |
|-----------|-----------|------|---------|
| PostgreSQL | 15-alpine | 5432 | Transactional data (orders, payments, users, inventory) |
| MongoDB | 7 | 27017 | Product catalog (document store) |
| Redis | 7-alpine | 6379 | Cart sessions & caching |
| Apache Kafka | Confluent 7.5 | 9092 | Event streaming |
| OpenSearch | 2.11 | 9200 | Product search |
| MailHog | Latest | 8025 | Email testing (dev) |

## 🚀 Quick Start

### Prerequisites

- Docker 20.10+
- Docker Compose 2.0+
- 8GB+ RAM
- 20GB+ disk space

### 1. Clone and Setup

```bash
git clone <repository-url>
cd ecommerce-app
```

### 2. Start All Services

```bash
# Start infrastructure and all services
docker-compose up -d

# View logs
docker-compose logs -f

# Check service health
docker-compose ps
```

### 3. Wait for Services to be Healthy

```bash
# Monitor service startup
watch docker-compose ps

# All services should show "healthy" status
```

### 4. Access the Platform

- **Customer Web**: http://localhost:3001
- **Catalog API**: http://localhost:8000
- **User Auth API**: http://localhost:8084
- **MailHog (Email)**: http://localhost:8025
- **OpenSearch**: http://localhost:9200

### 5. Test the Platform

#### Register a New User
```bash
curl -X POST http://localhost:8084/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "test1234",
    "first_name": "Test",
    "last_name": "User"
  }'
```

#### Login
```bash
curl -X POST http://localhost:8084/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "test1234"
  }'
```

#### Browse Products
```bash
curl http://localhost:8000/api/v1/products
```

#### Add to Cart
```bash
curl -X POST http://localhost:3000/api/v1/cart/user_123/items \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "prod-laptop-001",
    "sku": "LAPTOP-001",
    "name": "Premium Ultrabook Pro 15",
    "price": 1299.99,
    "quantity": 1
  }'
```

## 📊 Sample Data

The platform initializes with:

- **5 Product Categories**: Electronics, Computers, Peripherals, Audio, Gaming
- **12 Sample Products**: Laptops, keyboards, mice, monitors, headphones, etc.
- **2 Demo Users**:
  - Admin: `admin@ecommerce.local` / `admin123`
  - Customer: `customer@ecommerce.local` / `customer123`
- **Inventory Records**: Matching all products with stock levels

## 🔧 Development

### Stop All Services

```bash
docker-compose down
```

### Stop and Remove All Data

```bash
docker-compose down -v
```

### Rebuild a Specific Service

```bash
docker-compose up -d --build catalog-service
```

### View Logs for a Service

```bash
docker-compose logs -f order-service
```

### Execute Commands in a Container

```bash
# PostgreSQL
docker-compose exec postgres psql -U postgres -d orders_db

# MongoDB
docker-compose exec mongodb mongosh -u admin -p admin123

# Redis
docker-compose exec redis redis-cli
```

## 🏛️ Architecture Patterns

### Microservices Patterns
- **Database per Service**: Each service owns its data
- **API Gateway**: (Coming) Kong for unified API access
- **Service Discovery**: Docker DNS
- **Circuit Breaker**: Resilience patterns in services
- **Saga Pattern**: Order orchestration across services

### Event-Driven Architecture
- **Event Sourcing**: Order status changes
- **CQRS**: Separate read/write models for products
- **Event Notifications**: Kafka for async communication

### Data Patterns
- **Polyglot Persistence**:
  - PostgreSQL: Transactional data (orders, payments)
  - MongoDB: Product catalog (flexible schema)
  - Redis: Sessions, caching
  - OpenSearch: Full-text search

## 🔐 Security

### Authentication & Authorization
- **JWT with httpOnly Cookies**: Secure token storage preventing XSS attacks
- **bcrypt Password Hashing**: Cost factor 12 for strong password protection
- **Role-Based Access Control (RBAC)**: Customer and Admin roles with granular permissions
- **Ownership Verification**: Users can only access their own resources
- **Admin Gates**: Privileged operations require admin role

### Input Validation
- **Joi Schemas**: Comprehensive validation for all user inputs
- **Type Checking**: Strict type validation and sanitization
- **SQL Injection Prevention**: Parameterized queries only
- **XSS Protection**: Input sanitization and Content Security Policy headers

### Rate Limiting
- **Cart Service**: 100 requests/15 min per IP
- **Order Service**: 50 requests/15 min per IP
- **Payment Operations**: 10 requests/hour per IP
- **DOS Protection**: Rate limiting on all endpoints

### Database Security
- **Constraints**: CHECK constraints prevent invalid data (negative prices, invalid enums)
- **Triggers**: Automatic validation of order totals and price manipulation detection
- **Timestamps**: Logical ordering validation (paid_at > created_at, etc.)
- **Transaction Support**: ACID guarantees for critical operations

### Security Headers (Next.js)
- **Strict-Transport-Security**: Enforce HTTPS
- **X-Frame-Options**: Prevent clickjacking
- **X-Content-Type-Options**: Prevent MIME sniffing
- **Content-Security-Policy**: Restrict resource loading
- **X-XSS-Protection**: Browser-level XSS filtering

### Audit Logging
- **Security Events**: All authentication/authorization events logged
- **Access Tracking**: Admin operations tracked with IP and user agent
- **Failed Attempts**: Login failures and token validation errors logged
- **Suspicious Activity**: Automated detection and alerting

### Testing
- **Unit Tests**: Authentication middleware (15+ test cases)
- **Validation Tests**: Input validation schemas (25+ test cases)
- **Security Scanning**: Ready for OWASP ZAP/Burp integration

**📖 Detailed Security Documentation**: See [SECURITY.md](./SECURITY.md) for comprehensive security practices, deployment checklist, and incident response procedures.

## 📡 API Documentation

### Catalog Service (Port 8000)
- `GET /api/v1/products` - List products
- `GET /api/v1/products/:id` - Get product details
- `GET /api/v1/search?q=<query>` - Search products
- `GET /api/v1/categories` - List categories

### Inventory Service (Port 8081)
- `GET /api/v1/inventory/:sku` - Get stock level
- `POST /api/v1/inventory/:sku/reserve` - Reserve inventory
- `POST /api/v1/inventory/:sku/release` - Release reservation

### Cart Service (Port 3000)
- `GET /api/v1/cart/:userId` - Get user cart
- `POST /api/v1/cart/:userId/items` - Add item
- `PUT /api/v1/cart/:userId/items/:productId` - Update quantity
- `DELETE /api/v1/cart/:userId/items/:productId` - Remove item

### Order Service (Port 3001)
- `POST /api/v1/orders` - Create order
- `GET /api/v1/orders/:id` - Get order details
- `GET /api/v1/orders?userId=<id>` - Get user orders
- `POST /api/v1/orders/:id/cancel` - Cancel order
- `POST /api/v1/orders/:id/ship` - Mark as shipped (admin)
- `POST /api/v1/orders/:id/deliver` - Mark as delivered (admin)

### Payment Service (Port 8001)
- `POST /api/v1/payments` - Process payment
- `GET /api/v1/payments/:id` - Get payment status

### User Service (Port 8084)
- `POST /api/v1/auth/register` - Register user
- `POST /api/v1/auth/login` - Login
- `POST /api/v1/auth/validate` - Validate token
- `GET /api/v1/users/profile` - Get profile (auth required)
- `PUT /api/v1/users/profile` - Update profile (auth required)
- `POST /api/v1/users/change-password` - Change password (auth required)

## 🧪 Testing

### Integration Test Flow

1. **Register User** → User Service
2. **Browse Products** → Catalog Service
3. **Add to Cart** → Cart Service (Redis)
4. **Create Order** → Order Service (orchestrates)
   - Reserve inventory → Inventory Service
   - Process payment → Payment Service
   - Publish events → Kafka
5. **Receive Notifications** → Notification Service
6. **Track Order** → Order Service

### Test with the Platform

```bash
# 1. Open Customer Web
open http://localhost:3001

# 2. Register account
# Click "Sign Up"

# 3. Browse and add products to cart

# 4. Checkout

# 5. View order history

# 6. Admin dashboard (if admin user)
open http://localhost:3001/admin
```

## 📦 Service Communication

```
Customer Web (Next.js)
    ↓
    ├→ Catalog Service → MongoDB (Products)
    ├→ Cart Service → Redis (Sessions)
    ├→ Order Service → PostgreSQL (Orders)
    │   ├→ Inventory Service → PostgreSQL (Stock)
    │   ├→ Payment Service → PostgreSQL (Payments)
    │   └→ Kafka (Events) → Notification Service
    └→ User Service → PostgreSQL (Users)
```

## 🛠️ Troubleshooting

### Services Not Starting

```bash
# Check logs
docker-compose logs

# Check disk space
df -h

# Check memory
docker stats
```

### Database Connection Issues

```bash
# Restart infrastructure
docker-compose restart postgres mongodb redis

# Check health
docker-compose ps
```

### Port Conflicts

```bash
# Stop conflicting services
sudo lsof -i :8000  # Find process using port
sudo kill -9 <PID>  # Kill process
```

### Reset Everything

```bash
# Nuclear option: remove all containers, volumes, networks
docker-compose down -v
docker system prune -af --volumes
docker-compose up -d
```

## 📈 Monitoring

### Service Health Checks

All services expose `/health` endpoints:

```bash
curl http://localhost:8000/health  # Catalog
curl http://localhost:8081/health  # Inventory
curl http://localhost:3000/health  # Cart
curl http://localhost:3001/health  # Order
curl http://localhost:8001/health  # Payment
curl http://localhost:8084/health  # User
```

### View Kafka Events

```bash
# Access Kafka container
docker-compose exec kafka bash

# List topics
kafka-topics --list --bootstrap-server localhost:9092

# Consume order events
kafka-console-consumer --bootstrap-server localhost:9092 \
  --topic order-events --from-beginning
```

### View Emails (Development)

Open MailHog UI: http://localhost:8025

All emails sent by the platform will appear here.

## 🔄 Data Flow Examples

### Order Creation Flow

1. User submits order → Order Service
2. Order Service validates order
3. Order Service reserves inventory → Inventory Service
4. Order Service processes payment → Payment Service
5. Payment Service publishes event → Kafka
6. Order Service updates status
7. Order Service publishes event → Kafka
8. Notification Service sends confirmation email
9. Cart Service clears user cart

### Product Search Flow

1. User searches → Catalog Service
2. Catalog Service queries OpenSearch
3. Results returned with facets
4. Frontend displays products

## 🏆 Features

- ✅ User authentication & authorization (JWT)
- ✅ Product browsing & search
- ✅ Shopping cart management
- ✅ Order checkout & payment
- ✅ Order tracking
- ✅ Admin dashboard
- ✅ Email notifications
- ✅ Inventory management
- ✅ Event-driven architecture
- ✅ Microservices architecture

## 📝 License

MIT License - See LICENSE file for details

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Commit changes
4. Push to branch
5. Create Pull Request

## 📞 Support

For issues and questions:
- GitHub Issues: <repository-url>/issues
- Documentation: See `/docs` folder
