# Integration Tests - Quick Start Guide

## Running Tests in 3 Steps

### Step 1: Start the Platform

```bash
cd /home/user/ecommerce-app
./start.sh
```

Wait for all services to be healthy (~1-2 minutes).

### Step 2: Run Tests

```bash
cd tests
./run-tests.sh
```

### Step 3: View Results

Tests will run automatically and show results:

```
========================================
Test Results Summary
========================================
Total Suites:  3
Passed:        3
Failed:        0

ALL TESTS PASSED! ✓
```

## What Gets Tested

### Test Suite 1: Authentication Flow (~2 seconds)
- ✅ User registration
- ✅ Duplicate email prevention
- ✅ User login
- ✅ Wrong password handling
- ✅ Protected endpoint access
- ✅ Admin role verification

### Test Suite 2: Product Browse (~1 second)
- ✅ List all products
- ✅ Get product by ID
- ✅ Search products
- ✅ Get categories
- ✅ Check inventory levels

### Test Suite 3: Cart & Checkout Flow (~5 seconds)
- ✅ Add items to cart
- ✅ Update quantities
- ✅ Remove items
- ✅ Create order
- ✅ Process checkout
- ✅ View order history
- ✅ Clear cart

**Total Time: ~8 seconds**

## Troubleshooting

### Services Not Available

```bash
# Check service status
docker-compose ps

# All should show "healthy"
```

### Tests Fail

```bash
# View service logs
docker-compose logs -f <service-name>

# Reset platform
./stop.sh --volumes
./start.sh
```

### Run Specific Test

```bash
cd tests/integration
./01-auth-flow.sh
```

## Requirements

- Docker & Docker Compose running
- Platform started with `./start.sh`
- `jq` installed (for JSON parsing)
- `curl` installed (for API calls)

## Continuous Integration

```yaml
# GitHub Actions example
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Start platform
        run: docker-compose up -d
      - name: Wait for services
        run: sleep 60
      - name: Run tests
        run: cd tests && ./run-tests.sh
```

## Test Output Example

```
======================================
Test Suite: Authentication Flow
======================================

ℹ Test 1: Register new user
✓ PASS: Registration returns JWT token
✓ PASS: Registration returns user ID
✓ PASS: Registration returns correct email
✓ PASS: New user has customer role

ℹ Test 2: Attempt duplicate registration (should fail)
✓ PASS: Duplicate email registration fails

ℹ Test 3: Login with correct credentials
✓ PASS: Login returns JWT token
✓ PASS: Login returns same user ID

--------------------------------------
Results:
  Total:  7
  Passed: 7
  Failed: 0
--------------------------------------
```

## Next Steps

After tests pass:

1. **Explore the APIs** - Use the test scripts as examples
2. **Add more tests** - Follow the pattern in existing tests
3. **Run in CI/CD** - Automate testing on every commit
4. **Monitor coverage** - Track which flows are tested

## Support

For issues:
- Check logs: `docker-compose logs -f`
- Reset data: `./stop.sh --volumes`
- Review test code in `tests/integration/`
