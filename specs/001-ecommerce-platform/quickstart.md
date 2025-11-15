# Development Environment Quickstart

**Feature**: Enterprise-Grade Ecommerce Platform
**Date**: 2025-11-15
**Purpose**: Step-by-step guide to set up local development environment

## Prerequisites

### Required Software

- **Docker** 24.0+ & **Docker Compose** 2.20+
- **Git** 2.40+
- **Make** 4.0+ (optional but recommended)

### Language Runtimes (for local development)

- **Go** 1.21+
- **Node.js** 20 LTS
- **Python** 3.11+

### Recommended Tools

- **k3s** or **kind** (for Kubernetes testing)
- **kubectl** (Kubernetes CLI)
- **VS Code** with extensions:
  - Go
  - ESLint
  - Pylance
  - Docker
  - Kubernetes
  - OpenAPI (Swagger) Editor

---

## Quick Start (5 Minutes)

### 1. Clone Repository

```bash
git clone https://github.com/NhaLeTruc/ecommerce-app.git
cd ecommerce-app
```

### 2. Run Setup Script

```bash
./scripts/setup-dev.sh
```

This script will:
- Check prerequisites
- Copy `.env.example` to `.env`
- Start Docker Compose services
- Run database migrations
- Seed test data
- Display service URLs

### 3. Verify Services

```bash
# Check all services are running
docker-compose ps

# Expected output:
# postgres        Up      5432/tcp
# mongo           Up      27017/tcp
# redis           Up      6379/tcp
# opensearch      Up      9200/tcp, 9600/tcp
# kafka           Up      9092/tcp
# rabbitmq        Up      5672/tcp, 15672/tcp
# prometheus      Up      9090/tcp
# grafana         Up      3000/tcp
# jaeger          Up      16686/tcp, 4318/tcp
# minio           Up      9000/tcp, 9001/tcp
```

### 4. Access Services

| Service | URL | Credentials |
|---------|-----|-------------|
| **Grafana** | http://localhost:3000 | admin / admin |
| **Prometheus** | http://localhost:9090 | - |
| **Jaeger UI** | http://localhost:16686 | - |
| **RabbitMQ Management** | http://localhost:15672 | guest / guest |
| **MinIO Console** | http://localhost:9001 | minioadmin / minioadmin |
| **OpenSearch Dashboards** | http://localhost:5601 | admin / admin |

---

## Manual Setup (Step-by-Step)

### 1. Environment Configuration

```bash
# Copy environment template
cp infrastructure/docker-compose/.env.example .env

# Edit environment variables
nano .env
```

**Key Variables**:
```env
# Database
POSTGRES_USER=ecommerce
POSTGRES_PASSWORD=dev_password_change_in_production
POSTGRES_DB=ecommerce

# MongoDB
MONGO_INITDB_ROOT_USERNAME=root
MONGO_INITDB_ROOT_PASSWORD=dev_password_change_in_production

# Redis
REDIS_PASSWORD=dev_password_change_in_production

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRY=15m
JWT_REFRESH_EXPIRY=30d

# Stripe (use test keys)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...

# Email (development)
SMTP_HOST=localhost
SMTP_PORT=1025  # MailHog
SMTP_USER=
SMTP_PASSWORD=

# OpenTelemetry
OTEL_EXPORTER_OTLP_ENDPOINT=http://jaeger:4318
OTEL_SERVICE_NAME=ecommerce-platform

# Feature Flags
UNLEASH_API_URL=http://unleash:4242/api
UNLEASH_API_TOKEN=*:development.your-token-here
```

### 2. Start Infrastructure Services

```bash
cd infrastructure/docker-compose
docker-compose up -d

# Or use specific services
docker-compose up -d postgres mongo redis kafka
```

**Service Startup Order**:
1. Databases (PostgreSQL, MongoDB, Redis)
2. Message Queues (Kafka, RabbitMQ)
3. Search (OpenSearch)
4. Observability (Prometheus, Grafana, Jaeger)
5. Object Storage (MinIO)

### 3. Initialize Databases

**PostgreSQL**:
```bash
# Connect to PostgreSQL
docker-compose exec postgres psql -U ecommerce

# Create databases for each service
CREATE DATABASE catalog;
CREATE DATABASE cart;
CREATE DATABASE checkout;
CREATE DATABASE payment;
CREATE DATABASE inventory;
CREATE DATABASE orders;
CREATE DATABASE fulfillment;
CREATE DATABASE accounts;

# Grant permissions
GRANT ALL PRIVILEGES ON DATABASE catalog TO ecommerce;
# ... repeat for all databases
```

**MongoDB**:
```bash
# Connect to MongoDB
docker-compose exec mongo mongosh -u root -p dev_password_change_in_production

# Create collections (done automatically by services)
use catalog;
db.createCollection('products');
db.createCollection('categories');
db.createCollection('reviews');
```

**OpenSearch**:
```bash
# Create product index
curl -X PUT "localhost:9200/products" -H 'Content-Type: application/json' -d'
{
  "mappings": {
    "properties": {
      "sku": { "type": "keyword" },
      "name": { "type": "text", "analyzer": "standard" },
      "description": { "type": "text" },
      "category": { "type": "keyword" },
      "brand": { "type": "keyword" },
      "price": { "type": "float" },
      "searchKeywords": { "type": "text" }
    }
  }
}
'
```

### 4. Run Database Migrations

**Go Services** (using golang-migrate):
```bash
# Checkout service
cd services/checkout-service
migrate -path migrations -database "postgres://ecommerce:dev_password@localhost:5432/checkout?sslmode=disable" up

# Payment service
cd services/payment-service
migrate -path migrations -database "postgres://ecommerce:dev_password@localhost:5432/payment?sslmode=disable" up

# Repeat for inventory, orders, fulfillment, accounts services
```

**Node.js Services** (using Prisma):
```bash
# Cart service
cd services/cart-service
npx prisma migrate dev

# Fulfillment service
cd services/fulfillment-service
npx prisma migrate dev

# Accounts service
cd services/account-service
npx prisma migrate dev
```

**Python Services** (using Alembic):
```bash
# Catalog service
cd services/catalog-service
alembic upgrade head

# Recommendation service
cd services/recommendation-service
alembic upgrade head
```

### 5. Seed Test Data

```bash
# Run seed script
./scripts/seed-data.sh

# Or manually:
cd services/catalog-service
python scripts/seed_products.py

cd services/account-service
npm run seed:users
```

**Test Data Created**:
- 100 sample products across 10 categories
- 5 test user accounts (user1@example.com ... user5@example.com, password: Test123!)
- 20 product reviews
- Sample inventory (1000 units per SKU)

---

## Running Services Locally

### Option 1: Docker Compose (Recommended for full-stack testing)

```bash
# Start all services
docker-compose -f docker-compose.yml -f docker-compose.services.yml up

# Start specific services
docker-compose up catalog-service cart-service
```

### Option 2: Run Services Natively (for development)

**Catalog Service** (Python/FastAPI):
```bash
cd services/catalog-service

# Install dependencies
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt

# Run development server
uvicorn src.main:app --reload --port 8001

# Run tests
pytest

# Run with OpenTelemetry
opentelemetry-instrument uvicorn src.main:app --port 8001
```

**Cart Service** (Node.js/TypeScript):
```bash
cd services/cart-service

# Install dependencies
npm install

# Run development server
npm run dev

# Run tests
npm test

# Run with coverage
npm run test:coverage
```

**Checkout Service** (Go):
```bash
cd services/checkout-service

# Install dependencies
go mod download

# Run development server
go run cmd/server/main.go

# Run tests
go test ./...

# Run with coverage
go test -cover ./...

# Build binary
go build -o bin/checkout-service cmd/server/main.go
```

**Frontend** (Next.js):
```bash
cd frontend/customer-web

# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Run tests
npm test
```

**Admin Dashboard** (Remix):
```bash
cd frontend/admin-dashboard

# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

---

## Development Workflow

### 1. Create Feature Branch

```bash
git checkout main
git pull origin main
git checkout -b feature/add-wishlist
```

### 2. Write Tests First (TDD)

```go
// services/catalog-service/internal/domain/product_test.go
func TestProductValidation(t *testing.T) {
    // Red: Write failing test
    product := NewProduct("", -10.00)  // Invalid
    err := product.Validate()
    assert.Error(t, err)  // Expect failure
}
```

### 3. Implement Feature

```go
// services/catalog-service/internal/domain/product.go
func (p *Product) Validate() error {
    if p.Name == "" {
        return errors.New("product name required")
    }
    if p.Price < 0 {
        return errors.New("price must be positive")
    }
    return nil  // Green: Test passes
}
```

### 4. Refactor & Run Tests

```bash
# Run tests
go test ./...

# Check coverage
go test -cover ./...

# Run linter
golangci-lint run
```

### 5. Commit & Push

```bash
git add .
git commit -m "feat(catalog): add product validation with TDD

- Add validation for product name and price
- Tests achieve 85% coverage
- Implement error handling per constitution"

git push origin feature/add-wishlist
```

### 6. Create Pull Request

- CI/CD runs: Lint → Unit Tests → Integration Tests → Build
- Code review required (≥1 approval)
- Merge to main triggers deployment to staging

---

## Testing

### Unit Tests

```bash
# Go
go test ./... -v

# Node.js
npm test

# Python
pytest -v
```

### Integration Tests (with TestContainers)

```bash
# Go
go test ./tests/integration -tags=integration

# Node.js
npm run test:integration

# Python
pytest tests/integration -m integration
```

### Contract Tests (Pact)

```bash
# Run consumer tests
npm run test:contract

# Publish contracts
npm run pact:publish

# Verify provider
npm run pact:verify
```

### E2E Tests (Playwright)

```bash
cd tests/e2e

# Install browsers
npx playwright install

# Run E2E tests
npx playwright test

# Run with UI
npx playwright test --ui

# Debug mode
npx playwright test --debug
```

### Load Tests (k6)

```bash
cd tests/load

# Run browse scenario
k6 run browse-scenario.js

# Run checkout scenario (100 VUs)
k6 run --vus 100 --duration 30s checkout-scenario.js

# Run Black Friday simulation
k6 run black-friday.js
```

---

## Debugging

### Logs

```bash
# View service logs
docker-compose logs -f catalog-service

# View all logs
docker-compose logs -f

# View Kubernetes logs
kubectl logs -f deployment/catalog-service
```

### Distributed Tracing (Jaeger)

1. Open Jaeger UI: http://localhost:16686
2. Select service (e.g., `catalog-service`)
3. Click "Find Traces"
4. Click on trace to view span details
5. See cross-service calls with latency

### Metrics (Prometheus + Grafana)

1. Open Grafana: http://localhost:3000
2. Navigate to Dashboards → Browse
3. Select "Business Metrics" or "Technical Metrics"
4. Query Prometheus directly: http://localhost:9090

**Example PromQL Queries**:
```promql
# Request rate
rate(http_requests_total[5m])

# Error rate
rate(http_requests_total{status=~"5.."}[5m])

# p95 latency
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))
```

### Database Debugging

```bash
# PostgreSQL
docker-compose exec postgres psql -U ecommerce -d orders
SELECT * FROM orders WHERE status = 'PENDING';

# MongoDB
docker-compose exec mongo mongosh -u root -p dev_password
use catalog;
db.products.find({status: "ACTIVE"}).limit(10);

# Redis
docker-compose exec redis redis-cli
AUTH dev_password
KEYS cart:*
GET cart:user:123
```

---

## Common Issues & Solutions

### Issue: Port Already in Use

```bash
# Check what's using port 5432
lsof -i :5432

# Kill process
kill -9 <PID>

# Or change port in docker-compose.yml
ports:
  - "5433:5432"  # Use 5433 instead
```

### Issue: Docker Out of Space

```bash
# Clean up Docker
docker system prune -a --volumes

# Remove unused images
docker image prune -a

# Remove unused volumes
docker volume prune
```

### Issue: Database Connection Refused

```bash
# Check if PostgreSQL is running
docker-compose ps postgres

# Restart PostgreSQL
docker-compose restart postgres

# Check logs
docker-compose logs postgres
```

### Issue: Kafka Connection Timeout

```bash
# Kafka takes time to start, wait 30 seconds
sleep 30

# Check Kafka logs
docker-compose logs kafka

# Verify Kafka topics
docker-compose exec kafka kafka-topics --list --bootstrap-server localhost:9092
```

---

## IDE Setup

### VS Code

**Recommended Extensions**:
```json
{
  "recommendations": [
    "golang.go",
    "ms-python.python",
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "ms-azuretools.vscode-docker",
    "ms-kubernetes-tools.vscode-kubernetes-tools",
    "42crunch.vscode-openapi"
  ]
}
```

**Settings**:
```json
{
  "go.testFlags": ["-v"],
  "go.coverOnSave": true,
  "editor.formatOnSave": true,
  "python.testing.pytestEnabled": true,
  "typescript.preferences.importModuleSpecifier": "relative"
}
```

### GoLand / IntelliJ IDEA

1. Install Go plugin
2. Enable "Go Modules" in Settings → Go → Go Modules
3. Configure Test Runner: Settings → Go → Test Framework → Use Testify
4. Enable golangci-lint: Settings → Tools → File Watchers

---

## Next Steps

1. **Read Architecture Docs**: `docs/architecture/`
2. **Review ADRs**: `docs/architecture/adr/`
3. **Explore API Docs**: `specs/001-ecommerce-platform/contracts/`
4. **Run `/speckit.tasks`**: Generate implementation tasks
5. **Start Contributing**: Pick a task from `tasks.md`

---

## Support

- **Documentation**: `docs/`
- **Runbooks**: `docs/runbooks/`
- **Slack**: #ecommerce-platform-dev
- **Issues**: https://github.com/NhaLeTruc/ecommerce-app/issues

Happy Coding! 🚀
