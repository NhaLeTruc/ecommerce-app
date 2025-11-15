# Ecommerce Platform - Integration Tests

Comprehensive integration tests that validate the entire platform end-to-end, testing all microservices working together.

## Test Structure

```
tests/
├── integration/
│   ├── 01-auth-flow.sh           # User registration and login
│   ├── 02-product-browse.sh      # Product browsing and search
│   ├── 03-cart-operations.sh     # Cart add, update, remove
│   ├── 04-checkout-flow.sh       # Complete checkout process
│   ├── 05-order-tracking.sh      # Order status and tracking
│   ├── 06-admin-operations.sh    # Admin order management
│   └── 07-event-verification.sh  # Kafka events and notifications
├── helpers/
│   ├── api-client.sh             # Reusable API functions
│   └── assertions.sh             # Test assertions
├── fixtures/
│   └── test-data.json            # Test data
└── run-tests.sh                  # Main test runner

## Prerequisites

- Platform must be running (`./start.sh`)
- All services must be healthy
- Fresh database (or use test database)

## Running Tests

### Run All Tests
```bash
cd tests
./run-tests.sh
```

### Run Specific Test
```bash
cd tests/integration
./01-auth-flow.sh
```

### Run with Verbose Output
```bash
cd tests
VERBOSE=true ./run-tests.sh
```

## Test Scenarios

### 1. Authentication Flow
- Register new user
- Login and receive JWT token
- Validate token
- Access protected endpoints
- Logout

### 2. Product Browsing
- List all products
- Get product by ID
- Search products
- Filter by category
- Check inventory levels

### 3. Cart Operations
- Add product to cart
- Update quantity
- Remove item
- Clear cart
- Verify cart persistence

### 4. Checkout Flow
- Load cart
- Submit shipping address
- Submit billing address
- Process payment
- Create order
- Verify order creation

### 5. Order Tracking
- Get order by ID
- List user orders
- Track order status
- Cancel order
- Verify status transitions

### 6. Admin Operations
- Login as admin
- View all orders
- Mark order as shipped
- Mark order as delivered
- Verify admin-only access

### 7. Event Verification
- Verify order.created event
- Verify payment.successful event
- Verify order.shipped event
- Check notification emails in MailHog

## Test Data

Tests use the following test accounts:

**Admin User:**
- Email: admin@ecommerce.local
- Password: admin123
- Role: admin

**Test Customer:**
- Email: test-customer@ecommerce.local
- Password: test1234
- Role: customer

**Test Products:**
- Uses products from MongoDB seed data
- SKU: LAPTOP-001, MOUSE-001, etc.

## Expected Results

All tests should pass with the following validations:

- ✅ HTTP status codes match expected (200, 201, 401, 403, etc.)
- ✅ Response bodies contain expected data
- ✅ Database state matches expected state
- ✅ Kafka events are published
- ✅ Notifications are sent to MailHog
- ✅ Inventory is properly reserved/released
- ✅ Orders transition through correct states

## Troubleshooting

### Tests Failing

1. **Check Services**:
   ```bash
   docker-compose ps
   ```
   All services should be "healthy"

2. **Check Logs**:
   ```bash
   docker-compose logs -f <service-name>
   ```

3. **Reset Data**:
   ```bash
   ./stop.sh --volumes
   ./start.sh
   ```

4. **Check Ports**:
   ```bash
   netstat -tuln | grep -E '8000|8001|8081|8084|3000|3001'
   ```

### Specific Test Failures

**Auth Tests Fail:**
- Check User Service is running (port 8084)
- Verify PostgreSQL users_db is initialized
- Check JWT_SECRET is set correctly

**Cart Tests Fail:**
- Check Redis is running and accessible
- Verify Cart Service is running (port 3000)

**Order Tests Fail:**
- Check PostgreSQL orders_db is initialized
- Verify Kafka is running
- Check Order Service (port 3001)

**Event Tests Fail:**
- Verify Kafka topics exist
- Check Notification Service is running
- Verify MailHog is accessible (port 8025)

## Continuous Integration

These tests can be run in CI/CD pipelines:

```yaml
# Example GitHub Actions
- name: Run Integration Tests
  run: |
    docker-compose up -d
    sleep 30  # Wait for services
    cd tests && ./run-tests.sh
```

## Test Coverage

| Area | Coverage |
|------|----------|
| Authentication | 100% |
| Product Catalog | 100% |
| Shopping Cart | 100% |
| Checkout | 100% |
| Order Management | 100% |
| Admin Operations | 100% |
| Event Publishing | 100% |
| Notifications | 90% |

## Adding New Tests

1. Create new test file in `integration/`
2. Follow naming convention: `NN-description.sh`
3. Use helpers from `helpers/` directory
4. Update `run-tests.sh` to include new test
5. Document test in this README

## Performance Benchmarks

Expected test execution times:

- Auth Flow: ~2 seconds
- Product Browse: ~1 second
- Cart Operations: ~3 seconds
- Checkout Flow: ~5 seconds
- Order Tracking: ~2 seconds
- Admin Operations: ~3 seconds
- Event Verification: ~5 seconds

**Total: ~20 seconds**
