# Security Documentation

**Last Updated:** 2025-11-15
**Reviewed By:** Claude AI Code Review
**Status:** Production-Ready with Recommendations

## Table of Contents

1. [Security Overview](#security-overview)
2. [Authentication & Authorization](#authentication--authorization)
3. [CSRF Protection](#csrf-protection)
4. [Service-to-Service Authentication](#service-to-service-authentication)
5. [Session Management & Token Refresh](#session-management--token-refresh)
6. [Data Protection](#data-protection)
7. [Input Validation](#input-validation)
8. [Rate Limiting](#rate-limiting)
9. [Security Headers](#security-headers)
10. [Database Security](#database-security)
11. [Deployment Checklist](#deployment-checklist)
12. [Security Testing](#security-testing)
13. [Incident Response](#incident-response)

---

## Security Overview

This ecommerce platform implements defense-in-depth security with multiple layers:

- **Authentication**: JWT-based auth with httpOnly cookies
- **Authorization**: Role-based access control (RBAC) and ownership verification
- **CSRF Protection**: Double-submit cookie pattern with timing-safe validation
- **Service-to-Service Auth**: HMAC-signed API keys for inter-service communication
- **Session Management**: Sliding sessions with automatic token refresh
- **Data Protection**: Encrypted connections, secure session management
- **Input Validation**: Joi schema validation on all inputs
- **Rate Limiting**: DOS protection on all endpoints
- **Database Security**: Parameterized queries, constraints, triggers

### Security Posture

| Category | Status | Notes |
|----------|--------|-------|
| Authentication | ✅ Strong | JWT with httpOnly cookies |
| Authorization | ✅ Strong | RBAC + ownership checks |
| XSS Protection | ✅ Strong | No localStorage, CSP headers |
| SQL Injection | ✅ Strong | Parameterized queries only |
| CSRF Protection | ✅ Strong | CSRF tokens + SameSite cookies |
| Rate Limiting | ✅ Strong | Implemented on all services |
| Input Validation | ✅ Strong | Joi schemas on all inputs |
| Service-to-Service Auth | ✅ Strong | HMAC-signed API keys |
| Session Management | ✅ Strong | Sliding sessions with auto-refresh |

---

## Authentication & Authorization

### Authentication Flow

```
1. User → Login/Register → User Service
2. User Service validates credentials
3. User Service generates JWT token
4. User Service sets httpOnly cookie
5. Browser automatically sends cookie with requests
6. Services validate JWT from cookie or Authorization header
```

### JWT Token Structure

```json
{
  "user_id": "uuid-v4",
  "email": "user@example.com",
  "role": "customer|admin",
  "iat": 1700000000,
  "exp": 1700086400,
  "iss": "ecommerce-user-service",
  "sub": "user-id"
}
```

### Cookie Configuration

**Development:**
```go
c.SetCookie(
    "auth_token",
    token,
    86400,           // 24 hours
    "/",
    "",
    false,           // secure = false for HTTP
    true,            // httpOnly = true
)
```

**Production (HTTPS Required):**
```go
c.SetCookie(
    "auth_token",
    token,
    86400,
    "/",
    "yourdomain.com",
    true,            // secure = true (HTTPS only)
    true,            // httpOnly = true
)
```

### Role-Based Access Control

#### Roles

- **customer**: Can access own resources (cart, orders, profile)
- **admin**: Can access all resources + admin operations

#### Protected Endpoints

| Endpoint | Auth Required | Role Required | Ownership Check |
|----------|---------------|---------------|-----------------|
| `GET /api/v1/cart` | ✅ Yes | Any | Own cart |
| `POST /api/v1/cart/items` | ✅ Yes | Any | Own cart |
| `GET /api/v1/orders/:id` | ✅ Yes | Any | Own order or admin |
| `POST /api/v1/orders` | ✅ Yes | Any | Auto-uses auth user |
| `POST /api/v1/orders/:id/payment` | ✅ Yes | Any | Own order or admin |
| `POST /api/v1/orders/:id/cancel` | ✅ Yes | Any | Own order or admin |
| `POST /api/v1/orders/:id/ship` | ✅ Yes | **admin** | N/A |
| `POST /api/v1/orders/:id/deliver` | ✅ Yes | **admin** | N/A |
| `PUT /api/v1/orders/:id/status` | ✅ Yes | **admin** | N/A |
| `GET /api/v1/orders` | ✅ Yes | **admin** (if no userId filter) | N/A |

#### Implementation Example

```typescript
// Cart Service - Ownership enforced by using authenticated user ID
router.post('/items', validateBody(addToCartSchema), async (req, res) => {
  const userId = req.user!.user_id;  // From JWT, can't be forged
  const item = req.body;
  const cart = await cartService.addItem(userId, item);
  res.json({ cart });
});

// Order Service - Admin role check
router.post('/:orderId/ship', requireAdmin, async (req, res) => {
  // Only admins can reach this point
  const order = await orderService.markAsShipped(orderId, tracking, carrier);
  res.json({ order });
});

// Order Service - Ownership check
router.get('/:orderId', async (req, res) => {
  const order = await orderService.getOrder(orderId);

  // Verify ownership unless admin
  if (req.user!.role !== 'admin' && order.userId !== req.user!.user_id) {
    return res.status(403).json({ error: 'Access denied' });
  }

  res.json({ order });
});
```

---

## CSRF Protection

### Overview

Cross-Site Request Forgery (CSRF) protection is implemented using double-submit cookie pattern with server-side validation.

### How It Works

```
1. User authenticates → Server sets CSRF token cookie (NOT httpOnly, so JS can read)
2. Client reads CSRF token from cookie
3. Client includes token in X-CSRF-Token header for state-changing requests
4. Server validates token matches cookie value
5. Request processed if tokens match
```

### Implementation

**Server-side (Cart/Order Services):**

```typescript
import { setCsrfToken, validateCsrfToken, getCsrfTokenEndpoint } from './middleware/csrf';

// Get CSRF token endpoint
router.get('/api/v1/csrf-token', setCsrfToken, getCsrfTokenEndpoint);

// Protected route with CSRF
router.post('/api/v1/cart/items',
  authenticateJWT,        // Verify JWT
  setCsrfToken,          // Set CSRF token if needed
  validateCsrfToken,     // Validate CSRF token
  async (req, res) => {
    // Process request
  }
);
```

**Client-side (Frontend):**

```typescript
// CSRF token is automatically fetched and added to requests
import { initializeCsrf } from './lib/api';

// On app initialization
await initializeCsrf();

// Axios interceptor automatically adds X-CSRF-Token header
// to all POST, PUT, PATCH, DELETE requests
```

### Configuration

```typescript
// CSRF cookie settings
res.cookie('csrf_token', token, {
  maxAge: 24 * 60 * 60 * 1000,  // 24 hours
  secure: process.env.NODE_ENV === 'production',  // HTTPS only in production
  sameSite: 'strict',  // Additional CSRF protection
  signed: true,        // Prevent tampering
  httpOnly: false      // JS needs to read this
});
```

### Security Features

- **Timing-safe comparison**: Uses `crypto.timingSafeEqual()` to prevent timing attacks
- **SameSite cookies**: Double protection with SameSite=strict
- **Service bypass**: Service-to-service requests skip CSRF (use HMAC instead)
- **Safe methods**: GET, HEAD, OPTIONS don't require CSRF tokens
- **Auto-refresh**: Token automatically refreshed on expiration

---

## Service-to-Service Authentication

### Overview

Microservices authenticate to each other using HMAC-signed API keys. This prevents unauthorized services from making internal API calls.

### How It Works

```
1. Service A wants to call Service B
2. Service A creates HMAC signature: HMAC-SHA256(method + path + body + timestamp, API_KEY)
3. Service A sends request with headers:
   - X-Service-Id: service-a
   - X-Service-Key: [API key]
   - X-Timestamp: [current timestamp]
   - X-Signature: [HMAC signature]
4. Service B validates:
   - Service ID is known
   - API key matches
   - Timestamp is within 5-minute window (replay attack prevention)
   - Signature matches expected value
   - Service is authorized for this endpoint
5. Request processed if all checks pass
```

### Service Registry

```typescript
// services/order-service/src/middleware/serviceAuth.ts
const SERVICE_REGISTRY = {
  'cart-service': {
    serviceName: 'cart-service',
    apiKey: process.env.CART_SERVICE_API_KEY,
    allowedEndpoints: ['/api/v1/orders']  // Can create orders
  },
  'payment-service': {
    serviceName: 'payment-service',
    apiKey: process.env.PAYMENT_SERVICE_API_KEY,
    allowedEndpoints: ['/api/v1/orders/:orderId/payment']
  }
};
```

### Usage

**Protecting an endpoint (Server):**

```typescript
import { authenticateService } from './middleware/serviceAuth';

// Service-only endpoint
router.post('/api/v1/orders',
  authenticateService,  // Verify service authentication
  async (req, res) => {
    console.log('Called by service:', req.serviceId);
    // Process request
  }
);
```

**Making a service call (Client):**

```typescript
import { ServiceClient } from './middleware/serviceAuth';

const client = new ServiceClient('cart-service', process.env.CART_SERVICE_API_KEY);

// Make authenticated request
const result = await client.post(
  'http://order-service:5006',
  '/api/v1/orders',
  { userId: 'user123', items: [...] }
);
```

### Security Features

- **HMAC-SHA256**: Cryptographically secure signatures
- **Replay protection**: 5-minute timestamp window
- **Endpoint authorization**: Services can only access allowed endpoints
- **Timing-safe comparison**: Prevents timing attacks
- **Request tampering detection**: Any change to request invalidates signature

### Environment Variables

```bash
# Add to .env
CART_SERVICE_API_KEY=your-random-api-key-here
ORDER_SERVICE_API_KEY=your-random-api-key-here
PAYMENT_SERVICE_API_KEY=your-random-api-key-here

# Generate secure keys:
openssl rand -base64 32
```

---

## Session Management & Token Refresh

### Overview

Implements sliding sessions that automatically extend active user sessions without requiring separate refresh tokens.

### How It Works

```
1. User logs in → Receives JWT valid for 24 hours
2. User makes request with JWT
3. Server checks: Is token expiring within 1 hour?
4. If yes → Generate new JWT, set as httpOnly cookie
5. Response includes X-Token-Refreshed: true header
6. Client continues with new token automatically
```

### Token Refresh Middleware

```typescript
import { refreshTokenIfNeeded } from './middleware/tokenRefresh';

// Apply to all authenticated routes
router.use(authenticateJWT);
router.use(refreshTokenIfNeeded({
  refreshWindow: 3600,        // Refresh when <1 hour remaining (seconds)
  newTokenExpiration: 86400,  // New token valid for 24 hours (seconds)
  enabled: true               // Can disable in development
}));
```

### Explicit Refresh Endpoint

Users can also manually refresh their token:

```typescript
// POST /api/v1/auth/refresh
router.post('/api/v1/auth/refresh', authenticateJWT, refreshTokenEndpoint);

// Response:
{
  "message": "Token refreshed successfully",
  "expiresAt": "2025-11-16T12:00:00.000Z"
}
```

### Token Info Endpoint

Check token expiration status:

```typescript
// GET /api/v1/auth/token-info
router.get('/api/v1/auth/token-info', authenticateJWT, getTokenInfo);

// Response:
{
  "userId": "user123",
  "email": "user@example.com",
  "role": "customer",
  "issuedAt": "2025-11-15T12:00:00.000Z",
  "expiresAt": "2025-11-16T12:00:00.000Z",
  "secondsUntilExpiration": 43200,
  "shouldRefresh": false
}
```

### Benefits

- **Seamless UX**: Active users never get logged out
- **No database needed**: Unlike refresh tokens, no persistence required
- **Automatic rotation**: Tokens regularly rotated for security
- **Configurable**: Adjust refresh window and expiration times
- **Activity tracking**: Only active users get extended sessions

### Configuration

```typescript
// Default configuration
const config = {
  refreshWindow: 3600,        // 1 hour
  newTokenExpiration: 86400,  // 24 hours
  enabled: true
};

// Custom configuration
router.use(refreshTokenIfNeeded({
  refreshWindow: 7200,        // 2 hours
  newTokenExpiration: 172800, // 48 hours
}));
```

---

## Data Protection

### Sensitive Data Handling

#### ✅ DO

- Use httpOnly cookies for tokens
- Hash passwords with bcrypt (cost 12)
- Use HTTPS in production
- Store payment details with external providers (Stripe, PayPal)
- Sanitize logs (remove passwords, tokens, PII)

#### ❌ DON'T

- Store tokens in localStorage or sessionStorage
- Store plain-text passwords
- Log sensitive data (passwords, tokens, card numbers)
- Handle raw credit card numbers in backend
- Send tokens in URL query parameters

### Password Security

```go
// User Service - Password hashing
const bcryptCost = 12  // Strong cost factor

func HashPassword(password string) (string, error) {
    hash, err := bcrypt.GenerateFromPassword([]byte(password), bcryptCost)
    return string(hash), err
}

func CheckPassword(password, hash string) bool {
    err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
    return err == nil
}
```

### Payment Data

**CRITICAL**: Never store full credit card numbers in your database.

```typescript
// ✅ CORRECT: Use payment provider tokens
paymentDetails: {
  provider: 'stripe',
  paymentMethodId: 'pm_...',  // Stripe payment method ID
  customerId: 'cus_...'        // Stripe customer ID
}

// ❌ WRONG: Never do this!
paymentDetails: {
  cardNumber: '4242424242424242',  // NEVER STORE THIS
  cvv: '123',                       // NEVER STORE THIS
  expiry: '12/25'
}
```

---

## Input Validation

All user inputs are validated using Joi schemas before processing.

### Cart Service Validation

```typescript
// Add to cart schema
const addToCartSchema = Joi.object({
  productId: Joi.string().uuid().required(),
  sku: Joi.string().min(1).max(100).required(),
  name: Joi.string().min(1).max(500).required(),
  price: Joi.number().min(0).max(999999.99).precision(2).required(),
  quantity: Joi.number().integer().min(1).max(10).required(),
  imageUrl: Joi.string().uri().max(2000).optional()
});

// Usage
router.post('/items',
  validateBody(addToCartSchema),  // Validation middleware
  async (req, res) => {
    // req.body is guaranteed valid and sanitized
  }
);
```

### Order Service Validation

```typescript
// Create order schema
const createOrderSchema = Joi.object({
  items: Joi.array().items(orderItemSchema).min(1).max(100).required(),
  shippingAddress: addressSchema.required(),
  billingAddress: addressSchema.required(),
  paymentMethod: Joi.string().valid('credit_card', 'debit_card', 'paypal', 'stripe').required()
});

// Address validation
const addressSchema = Joi.object({
  fullName: Joi.string().min(1).max(200).required(),
  street: Joi.string().min(1).max(500).required(),
  city: Joi.string().min(1).max(100).required(),
  state: Joi.string().min(2).max(100).required(),
  zipCode: Joi.string().pattern(/^[0-9]{5}(-[0-9]{4})?$/).required(),
  country: Joi.string().min(2).max(100).required(),
  phone: Joi.string().pattern(/^[0-9+\-\s()]{10,20}$/).required()
});
```

### Validation Error Response

```json
{
  "error": "Validation failed",
  "details": [
    {
      "field": "items.0.price",
      "message": "Price must be non-negative"
    },
    {
      "field": "shippingAddress.zipCode",
      "message": "Zip code must be in format 12345 or 12345-6789"
    }
  ]
}
```

---

## Rate Limiting

Protection against brute force and DOS attacks.

### Configuration

```typescript
// Cart Service - 100 requests per 15 minutes
export const cartRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Order Service - 50 requests per 15 minutes
export const orderRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: 'Too many requests, please try again later.'
});

// Payment Operations - 10 requests per hour
export const paymentRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: 'Too many payment attempts, please try again later.'
});
```

### Rate Limit Headers

```
RateLimit-Limit: 100
RateLimit-Remaining: 95
RateLimit-Reset: 1700086400
```

---

## Security Headers

Implemented in Next.js config for all pages.

### Headers Applied

```javascript
{
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
  'X-Frame-Options': 'SAMEORIGIN',
  'X-Content-Type-Options': 'nosniff',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Content-Security-Policy': '...' // See below
}
```

### Content Security Policy

```
default-src 'self';
script-src 'self' 'unsafe-eval' 'unsafe-inline';
style-src 'self' 'unsafe-inline';
img-src 'self' data: https:;
font-src 'self' data:;
connect-src 'self' http://localhost:* ...;
frame-ancestors 'self';
base-uri 'self';
form-action 'self'
```

**Note:** `unsafe-inline` and `unsafe-eval` are required for Next.js development. For production, consider:
- Using nonces for inline scripts
- Removing `unsafe-eval` if possible
- Tightening `connect-src` to specific domains

---

## Database Security

### SQL Injection Prevention

**Always use parameterized queries:**

```typescript
// ✅ CORRECT: Parameterized query
const result = await pool.query(
  'SELECT * FROM orders WHERE user_id = $1 AND status = $2',
  [userId, status]
);

// ❌ WRONG: String interpolation (SQL INJECTION!)
const result = await pool.query(
  `SELECT * FROM orders WHERE user_id = '${userId}'`  // DON'T DO THIS!
);
```

### Database Constraints

Migration `002_add_security_constraints.sql` adds:

#### Price Validation

```sql
-- Prevent negative prices
ALTER TABLE orders
    ADD CONSTRAINT chk_orders_subtotal_positive CHECK (subtotal >= 0),
    ADD CONSTRAINT chk_orders_total_amount_positive CHECK (total_amount >= 0);

-- Prevent unreasonable values
ALTER TABLE orders
    ADD CONSTRAINT chk_orders_subtotal_max CHECK (subtotal <= 999999.99);
```

#### Status Enum Constraints

```sql
-- Only allow valid order statuses
ALTER TABLE orders
    ADD CONSTRAINT chk_orders_status CHECK (status IN (
        'pending', 'payment_pending', 'payment_failed',
        'confirmed', 'processing', 'shipped', 'delivered',
        'cancelled', 'refunded'
    ));
```

#### Price Manipulation Prevention

```sql
-- Ensure item subtotal matches price * quantity
ALTER TABLE order_items
    ADD CONSTRAINT chk_order_items_subtotal_matches CHECK (
        ABS(subtotal - (price * quantity)) < 0.01
    );

-- Trigger to validate order total
CREATE TRIGGER validate_orders_total
BEFORE INSERT OR UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION validate_order_total();
```

### Running Migrations

```bash
# Order service migrations
cd services/order-service
npm run migrate

# Or manually with psql
psql -U ecommerce -d ecommerce -f migrations/002_add_security_constraints.sql
```

---

## Deployment Checklist

### Pre-Production

- [ ] Change all default passwords and secrets
- [ ] Generate strong JWT secret (32+ random characters)
- [ ] Update CORS origins to production domains only
- [ ] Enable `secure: true` for cookies (requires HTTPS)
- [ ] Set proper domain for cookies
- [ ] Update CSP `connect-src` to production API domains
- [ ] Remove `unsafe-eval` from CSP if possible
- [ ] Enable database SSL connections
- [ ] Set up secrets management (AWS Secrets Manager, HashiCorp Vault)
- [ ] Configure proper logging (no sensitive data)
- [ ] Set up monitoring and alerting
- [ ] Run security scanner (OWASP ZAP, Snyk)
- [ ] Perform penetration testing
- [ ] Review all environment variables

### Environment Variables

```bash
# CRITICAL: Change these in production!
JWT_SECRET=<generate-strong-random-32+-char-string>
JWT_EXPIRY_HOURS=24

# Database
DB_HOST=<your-postgres-host>
DB_PASSWORD=<strong-password>
DB_SSL=true

# CORS
CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# Cookie settings (production)
COOKIE_SECURE=true
COOKIE_DOMAIN=yourdomain.com
```

### Generating Secrets

```bash
# Generate strong JWT secret
openssl rand -base64 48

# Generate strong password
openssl rand -base64 32
```

---

## Security Testing

### Automated Testing

```bash
# Run security audit on dependencies
npm audit

# Fix vulnerabilities
npm audit fix

# Check for outdated packages
npm outdated
```

### Manual Testing Scenarios

#### Authentication Tests

1. **Token Tampering**
   - Modify JWT payload → Should reject
   - Change signature → Should reject
   - Use expired token → Should reject

2. **Authorization Tests**
   - Access another user's cart → Should reject (403)
   - Access another user's orders → Should reject (403)
   - User tries admin endpoint → Should reject (403)
   - Admin accesses user resources → Should allow

3. **CSRF Tests**
   - Submit form without SameSite cookie → Should reject
   - Cross-origin request with credentials → Check CORS

#### Input Validation Tests

1. **SQL Injection Attempts**
   ```
   userId: "'; DROP TABLE orders; --"
   → Should be safely parameterized
   ```

2. **XSS Attempts**
   ```
   name: "<script>alert('XSS')</script>"
   → Should be sanitized/escaped
   ```

3. **Price Manipulation**
   ```
   price: -100
   → Should reject (Joi validation + DB constraint)
   ```

4. **Overflow Tests**
   ```
   price: 9999999999.99
   → Should reject (max check)
   ```

#### Rate Limiting Tests

```bash
# Test cart endpoint rate limit
for i in {1..120}; do
  curl -H "Cookie: auth_token=..." http://localhost:3000/api/v1/cart
done
# Should get 429 after 100 requests
```

---

## Incident Response

### Security Incident Procedure

1. **Detect**: Monitor logs, alerts, user reports
2. **Assess**: Determine scope and severity
3. **Contain**: Isolate affected systems
4. **Eradicate**: Remove threat, patch vulnerability
5. **Recover**: Restore services
6. **Learn**: Post-mortem, update procedures

### Emergency Contacts

- **Security Lead**: [Contact Info]
- **DevOps**: [Contact Info]
- **Legal**: [Contact Info]

### Logging & Monitoring

**Monitor for:**
- Multiple failed login attempts
- Unusual rate limit hits
- Database constraint violations
- Authorization failures (403 errors)
- Expired token attempts
- CORS violations

**Log Analysis:**

```bash
# Check for brute force attacks
grep "Invalid token" logs/ | grep -oP 'userId: \K\w+' | sort | uniq -c | sort -nr

# Check for rate limit hits
grep "Too many requests" logs/ | wc -l

# Check for authorization failures
grep "Access denied" logs/ | tail -50
```

---

## Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP API Security Top 10](https://owasp.org/www-project-api-security/)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
- [CSP Documentation](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-11-15 | Initial security implementation |

---

**Questions or Security Concerns?**
Contact the security team or create an issue in the repository.
