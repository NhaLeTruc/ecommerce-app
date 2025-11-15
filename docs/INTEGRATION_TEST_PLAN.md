# Integration Test Plan - Phase 4 User Stories

This document outlines the comprehensive integration testing strategy for validating the end-to-end user journey through the ecommerce platform, covering Product Browse & Search (Phase 3) and Checkout & Payment (Phase 4).

## Test Environment Setup

### Prerequisites
- All microservices running (Catalog, Inventory, Cart, Order, Payment, Notification)
- Infrastructure services running (PostgreSQL, MongoDB, Redis, Kafka, OpenSearch)
- Customer Web application running on http://localhost:3002
- Mock user: `user_123`

### Service Endpoints
- **Catalog Service**: http://localhost:8000
- **Inventory Service**: http://localhost:8001
- **Cart Service**: http://localhost:3000
- **Order Service**: http://localhost:3001
- **Payment Service**: http://localhost:8002
- **Customer Web**: http://localhost:3002

### Database Setup
- MongoDB: Catalog database with sample products
- PostgreSQL: Inventory, Order, Payment databases
- Redis: Cart data
- OpenSearch: Product search index

## Test Scenarios

### Test Scenario 1: Complete Happy Path - Product to Payment

**Objective**: Validate the complete user journey from browsing products to receiving order confirmation.

#### Steps:

1. **Browse Products**
   - Navigate to http://localhost:3002/products
   - Verify: Product grid displays with 4 sample products
   - Verify: Each product shows image, name, description, price, stock status
   - Verify: Pagination controls work (Previous/Next buttons)
   - Expected Result: ✓ Products load successfully from Catalog Service

2. **View Product Details**
   - Click on "Premium Laptop" product
   - Navigate to /products/{product_id}
   - Verify: Product details display correctly
   - Verify: SKU, brand, description, price all visible
   - Verify: Quantity selector works (increment/decrement)
   - Verify: Stock availability shown
   - Expected Result: ✓ Product detail loads from Catalog Service

3. **Add to Cart**
   - Set quantity to 2
   - Click "Add to Cart" button
   - Verify: Button shows "✓ Added to Cart" confirmation
   - Verify: No errors in browser console
   - Expected Result: ✓ Item added to Cart Service (Redis)

4. **Add Second Product**
   - Navigate back to /products
   - Click on "Wireless Mouse"
   - Set quantity to 1
   - Click "Add to Cart"
   - Expected Result: ✓ Second item added to cart

5. **View Cart**
   - Navigate to /cart
   - Verify: Both items display in cart
   - Verify: Quantities are correct (Laptop: 2, Mouse: 1)
   - Verify: Individual prices shown correctly
   - Verify: Subtotal calculation is correct
   - Verify: Total items count is 3
   - Expected Result: ✓ Cart loads from Cart Service

6. **Update Cart**
   - Update Laptop quantity to 1 (decrement)
   - Verify: Subtotal updates immediately
   - Verify: Item total updates
   - Expected Result: ✓ Cart updates in Cart Service

7. **Remove Item**
   - Click "Remove" on Wireless Mouse
   - Confirm removal
   - Verify: Mouse removed from cart
   - Verify: Subtotal recalculates
   - Expected Result: ✓ Item removed from Cart Service

8. **Proceed to Checkout**
   - Click "Proceed to Checkout" button
   - Navigate to /checkout
   - Verify: Cart items display in order summary
   - Verify: Subtotal, tax (8%), shipping ($10) calculated
   - Verify: Total amount correct
   - Expected Result: ✓ Checkout page loads with cart data

9. **Enter Shipping Address**
   - Fill in shipping form:
     - Full Name: "John Doe"
     - Street: "123 Main Street"
     - City: "San Francisco"
     - State: "CA"
     - ZIP: "94102"
     - Phone: "+14155551234"
   - Verify: Form accepts input
   - Expected Result: ✓ Shipping form validates

10. **Enter Billing Address**
    - Check "Same as shipping" checkbox
    - Verify: Billing address auto-filled
    - Expected Result: ✓ Billing address populated

11. **Enter Payment Details**
    - Select "Credit/Debit Card"
    - Enter card details:
      - Card Number: "4111111111111111"
      - Expiry Month: "12"
      - Expiry Year: "2025"
      - CVV: "123"
    - Verify: Form accepts input
    - Expected Result: ✓ Payment form validates

12. **Place Order**
    - Click "Place Order" button
    - Verify: Button shows "Processing..."
    - Wait for processing (2-3 seconds)
    - Expected Result: ✓ Order created in Order Service

13. **Backend Workflow Validation**
    - **Order Service**:
      - Verify: Order created with status "pending"
      - Verify: Order items stored in order_items table
      - Verify: Shipping/billing addresses stored
      - Check logs: `docker logs order-service`

    - **Inventory Service**:
      - Verify: Inventory reserved for order items
      - Check inventory quantity decreased
      - Check reserved_quantity increased
      - Check logs: `docker logs inventory-service`

    - **Cart Service**:
      - Verify: Cart cleared for user_123
      - Query Redis: `redis-cli GET cart:user_123`
      - Expected: null or empty

    - **Payment Service**:
      - Verify: Payment record created with status "processing"
      - Verify: Payment processed (95% success rate)
      - Verify: Transaction ID generated
      - Check logs: `docker logs payment-service`

    - **Kafka Events**:
      - Check order-events topic:
        ```bash
        kafka-console-consumer --bootstrap-server kafka:9092 --topic order-events --from-beginning
        ```
      - Expected events: order.created

      - Check payment-events topic:
        ```bash
        kafka-console-consumer --bootstrap-server kafka:9092 --topic payment-events --from-beginning
        ```
      - Expected events: payment.successful OR payment.failed

    - **Notification Service**:
      - Check logs: `docker logs notification-service`
      - Expected: "Order confirmation email sent"
      - Expected: "Payment confirmation email sent" (if successful)
      - Verify: Email logged (simulated mode)
      - Verify: SMS logged (simulated mode)

14. **Order Confirmation Page**
    - Verify: Redirected to /orders/{order_id}
    - Verify: Success banner displays (green)
    - Verify: Order number shown (ORD-YYYYMMDD-XXXXX format)
    - Verify: Order date displayed
    - Verify: Order status badge (should be "confirmed")
    - Verify: Payment status badge (should be "captured")
    - Verify: Items ordered list correct
    - Verify: Shipping address displayed
    - Verify: Billing address displayed
    - Verify: Order summary with subtotal, tax, shipping, total
    - Verify: Payment method shown
    - Expected Result: ✓ Order confirmation displays correctly

15. **Email Notifications**
    - Check Notification Service logs
    - Expected emails (simulated):
      - Order confirmation email
      - Payment confirmation email
    - Verify: Email contains order number, items, total
    - Expected Result: ✓ Notifications sent

### Expected Results Summary
- ✓ Product browsing works
- ✓ Cart operations work (add, update, remove)
- ✓ Checkout form works
- ✓ Order creation succeeds
- ✓ Inventory reservation works
- ✓ Payment processing succeeds
- ✓ Events published to Kafka
- ✓ Notifications sent
- ✓ Order confirmation displays

---

### Test Scenario 2: Payment Failure Recovery

**Objective**: Test the system's behavior when payment fails.

#### Steps:

1. Complete steps 1-11 from Scenario 1 (up to payment details)
2. **Simulate Payment Failure** (5% chance in simulated gateway)
   - Place order multiple times until payment fails
   - OR modify payment processor to force failure
3. **Verify Failure Handling**:
   - Order status: "pending" or "payment_pending"
   - Payment status: "failed"
   - Error message displayed on order page
   - Inventory reservation released
   - User can retry payment
4. **Check Notifications**:
   - Payment failure email sent
   - Email contains retry link
5. **Expected Result**: ✓ System handles payment failure gracefully

---

### Test Scenario 3: Insufficient Inventory

**Objective**: Test inventory validation during order creation.

#### Steps:

1. **Reduce Product Inventory**:
   - Call Inventory API to reduce stock:
     ```bash
     curl -X PUT http://localhost:8001/api/v1/inventory/{product_id} \
       -H "Content-Type: application/json" \
       -d '{"quantity": 0}'
     ```

2. **Attempt to Order Out-of-Stock Item**:
   - Add product to cart
   - Proceed to checkout
   - Place order
   - Expected: Order creation fails with "Insufficient stock" error

3. **Verify Error Handling**:
   - Error message displayed to user
   - Cart not cleared
   - No order created
   - No payment attempted

4. **Expected Result**: ✓ System prevents ordering out-of-stock items

---

### Test Scenario 4: Cart Persistence

**Objective**: Verify cart data persists in Redis.

#### Steps:

1. **Add Items to Cart**:
   - Add 2-3 products to cart
   - Note the items and quantities

2. **Close Browser/Tab**:
   - Simulate session interruption

3. **Return to Cart**:
   - Navigate to /cart
   - Expected: Cart items still present (loaded from Redis)

4. **Verify Redis**:
   ```bash
   redis-cli GET cart:user_123
   ```
   - Expected: JSON cart data with items

5. **Expected Result**: ✓ Cart persists across sessions

---

### Test Scenario 5: Concurrent Orders

**Objective**: Test system behavior with multiple simultaneous orders for the same product.

#### Steps:

1. **Setup**:
   - Product with inventory quantity: 5
   - Two users: user_123, user_456

2. **Simultaneous Orders**:
   - User 1: Order 3 units
   - User 2: Order 3 units (overlapping)
   - Both submit simultaneously

3. **Expected Behavior**:
   - First order succeeds
   - Second order fails with insufficient inventory
   - OR both succeed if inventory sufficient
   - Inventory count accurate

4. **Verify Inventory**:
   - Check final inventory quantity
   - Check reserved quantity
   - Ensure no overselling

5. **Expected Result**: ✓ Inventory management handles concurrency correctly

---

### Test Scenario 6: Event-Driven Flow Validation

**Objective**: Validate all Kafka events are published and consumed correctly.

#### Steps:

1. **Monitor Kafka Topics**:
   ```bash
   # Terminal 1: Order events
   kafka-console-consumer --bootstrap-server kafka:9092 --topic order-events --from-beginning

   # Terminal 2: Payment events
   kafka-console-consumer --bootstrap-server kafka:9092 --topic payment-events --from-beginning

   # Terminal 3: Inventory events
   kafka-console-consumer --bootstrap-server kafka:9092 --topic inventory-events --from-beginning
   ```

2. **Complete Order Flow**:
   - Place an order through Customer Web

3. **Verify Events Published**:
   - **order-events**:
     - order.created
   - **payment-events**:
     - payment.successful OR payment.failed
   - **inventory-events**:
     - inventory.reserved
     - inventory.reserved.success OR inventory.reserved.failed

4. **Verify Event Consumption**:
   - Notification Service consumes order.created
   - Notification Service consumes payment.successful
   - Check service logs for event processing

5. **Expected Result**: ✓ All events published and consumed correctly

---

### Test Scenario 7: API Integration Tests

**Objective**: Test all API endpoints used in the user journey.

#### API Endpoints to Test:

1. **Catalog Service**:
   ```bash
   # List products
   curl http://localhost:8000/api/v1/products

   # Get product
   curl http://localhost:8000/api/v1/products/{product_id}

   # Search products
   curl http://localhost:8000/api/v1/search?q=laptop
   ```

2. **Inventory Service**:
   ```bash
   # Get inventory
   curl http://localhost:8001/api/v1/inventory/{product_id}

   # Reserve inventory
   curl -X POST http://localhost:8001/api/v1/inventory/reserve \
     -H "Content-Type: application/json" \
     -d '{"product_id": "123", "quantity": 2, "order_id": "ord_123"}'
   ```

3. **Cart Service**:
   ```bash
   # Get cart
   curl http://localhost:3000/api/v1/cart/user_123

   # Add to cart
   curl -X POST http://localhost:3000/api/v1/cart/user_123/items \
     -H "Content-Type: application/json" \
     -d '{"productId": "123", "sku": "SKU-001", "name": "Product", "price": 99.99, "quantity": 1}'

   # Update quantity
   curl -X PUT http://localhost:3000/api/v1/cart/user_123/items/123 \
     -H "Content-Type: application/json" \
     -d '{"quantity": 2}'

   # Remove item
   curl -X DELETE http://localhost:3000/api/v1/cart/user_123/items/123
   ```

4. **Order Service**:
   ```bash
   # Create order
   curl -X POST http://localhost:3001/api/v1/orders \
     -H "Content-Type: application/json" \
     -d @order_request.json

   # Get order
   curl http://localhost:3001/api/v1/orders/{order_id}

   # Process payment
   curl -X POST http://localhost:3001/api/v1/orders/{order_id}/payment
   ```

5. **Payment Service**:
   ```bash
   # Process payment
   curl -X POST http://localhost:8002/api/v1/payments/process \
     -H "Content-Type: application/json" \
     -d @payment_request.json

   # Get payment
   curl http://localhost:8002/api/v1/payments/payment/{payment_id}
   ```

#### Expected Results:
- All endpoints return 200/201 status codes
- Response bodies match expected schemas
- Error cases return appropriate 4xx/5xx codes

---

## Metrics and Observability

### Service Health Checks
```bash
curl http://localhost:8000/health  # Catalog
curl http://localhost:8001/health  # Inventory
curl http://localhost:3000/health  # Cart
curl http://localhost:3001/health  # Order
curl http://localhost:8002/health  # Payment
```

### Database Verification

**MongoDB (Catalog)**:
```javascript
use catalog_db
db.products.find().pretty()
db.categories.find().pretty()
```

**PostgreSQL (Inventory)**:
```sql
SELECT * FROM inventory_items;
SELECT * FROM reservations;
SELECT * FROM inventory_adjustments;
```

**PostgreSQL (Orders)**:
```sql
SELECT * FROM orders ORDER BY created_at DESC LIMIT 10;
SELECT * FROM order_items WHERE order_id = 'ord_xxx';
SELECT * FROM order_history WHERE order_id = 'ord_xxx';
```

**PostgreSQL (Payments)**:
```sql
SELECT * FROM payments ORDER BY created_at DESC LIMIT 10;
SELECT * FROM refunds;
```

**Redis (Cart)**:
```bash
redis-cli
KEYS cart:*
GET cart:user_123
```

### Kafka Verification

**List Topics**:
```bash
kafka-topics --list --bootstrap-server kafka:9092
```

**Consumer Groups**:
```bash
kafka-consumer-groups --bootstrap-server kafka:9092 --list
kafka-consumer-groups --bootstrap-server kafka:9092 --describe --group notification-service
```

**Message Count**:
```bash
kafka-run-class kafka.tools.GetOffsetShell \
  --broker-list kafka:9092 \
  --topic order-events
```

---

## Performance Tests

### Load Testing Scenarios

1. **Concurrent Product Browsing**:
   - 100 users browsing products simultaneously
   - Expected: < 500ms response time
   - Expected: No errors

2. **Cart Operations**:
   - 50 users adding items to cart
   - Expected: < 200ms response time
   - Expected: Redis handles load

3. **Checkout Flow**:
   - 20 concurrent checkouts
   - Expected: Orders processed successfully
   - Expected: No inventory conflicts
   - Expected: < 3s end-to-end time

### Tools:
- Apache JMeter
- k6 load testing
- Locust

---

## Failure Scenarios

### Database Failures

1. **MongoDB Down**:
   - Stop MongoDB
   - Attempt to browse products
   - Expected: Error message, graceful degradation

2. **PostgreSQL Down**:
   - Stop PostgreSQL
   - Attempt to checkout
   - Expected: Error message, order not created

3. **Redis Down**:
   - Stop Redis
   - Attempt to add to cart
   - Expected: Error message OR fallback to session storage

### Service Failures

1. **Catalog Service Down**:
   - Stop Catalog Service
   - Attempt to browse products
   - Expected: Error message

2. **Payment Service Down**:
   - Stop Payment Service
   - Attempt to checkout
   - Expected: Payment failure, order pending

3. **Kafka Down**:
   - Stop Kafka
   - Complete checkout
   - Expected: Events not published, notifications not sent
   - Recovery: Events should retry when Kafka restarts

---

## Security Tests

1. **SQL Injection**:
   - Attempt SQL injection in search query
   - Expected: Parameterized queries prevent injection

2. **XSS**:
   - Attempt to inject JavaScript in product name
   - Expected: Input sanitization prevents XSS

3. **CORS**:
   - Cross-origin requests from unauthorized domain
   - Expected: CORS policy blocks request

4. **Authentication** (when implemented):
   - Access cart without authentication
   - Expected: 401 Unauthorized

---

## Test Execution Checklist

- [ ] All services started successfully
- [ ] Databases initialized with sample data
- [ ] Kafka topics created
- [ ] Test Scenario 1: Happy Path - PASSED
- [ ] Test Scenario 2: Payment Failure - PASSED
- [ ] Test Scenario 3: Insufficient Inventory - PASSED
- [ ] Test Scenario 4: Cart Persistence - PASSED
- [ ] Test Scenario 5: Concurrent Orders - PASSED
- [ ] Test Scenario 6: Event Flow - PASSED
- [ ] Test Scenario 7: API Integration - PASSED
- [ ] Performance tests completed
- [ ] Failure scenarios tested
- [ ] Security tests completed
- [ ] All logs reviewed for errors
- [ ] All metrics verified

---

## Known Issues and Limitations

1. **Mock Authentication**: Using hardcoded user_123 instead of real auth
2. **Simulated Payments**: Payment gateway is simulated, not real
3. **Email/SMS**: Notifications are logged, not actually sent
4. **Development Mode**: Services running in development configuration

---

## Next Steps

After successful integration testing:

1. **Deploy to Staging Environment**
2. **User Acceptance Testing (UAT)**
3. **Performance Tuning**
4. **Security Audit**
5. **Production Deployment**

---

## Test Results Log

### Test Execution: [DATE]

| Scenario | Status | Duration | Notes |
|----------|--------|----------|-------|
| Happy Path | ⏳ | - | Pending execution |
| Payment Failure | ⏳ | - | Pending execution |
| Insufficient Inventory | ⏳ | - | Pending execution |
| Cart Persistence | ⏳ | - | Pending execution |
| Concurrent Orders | ⏳ | - | Pending execution |
| Event Flow | ⏳ | - | Pending execution |
| API Integration | ⏳ | - | Pending execution |

---

## Conclusion

This integration test plan covers the complete end-to-end user journey for the ecommerce platform, validating all microservices, databases, message queues, and frontend components working together seamlessly.

**Test Coverage**:
- ✓ Frontend (Customer Web)
- ✓ Microservices (Catalog, Inventory, Cart, Order, Payment, Notification)
- ✓ Databases (MongoDB, PostgreSQL, Redis)
- ✓ Message Queue (Kafka)
- ✓ Event-driven communication
- ✓ Error handling
- ✓ Performance
- ✓ Security

**Success Criteria**:
- All test scenarios pass
- No critical errors in logs
- Events flow correctly through Kafka
- Data persists correctly in databases
- Notifications sent successfully
- Response times within acceptable limits
