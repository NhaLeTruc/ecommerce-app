#!/bin/bash

# Main Test Runner for Ecommerce Platform
# Runs all integration tests in sequence

set -e

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Test results
TOTAL_SUITES=0
PASSED_SUITES=0
FAILED_SUITES=0

echo "========================================"
echo "Ecommerce Platform - Integration Tests"
echo "========================================"
echo ""

# Check if services are running
echo "Checking if services are available..."

check_service() {
    local name=$1
    local url=$2

    if curl -sf "$url" > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} $name is available"
        return 0
    else
        echo -e "${RED}✗${NC} $name is NOT available at $url"
        return 1
    fi
}

ALL_SERVICES_UP=true

check_service "User Service" "http://localhost:8084/health" || ALL_SERVICES_UP=false
check_service "Catalog Service" "http://localhost:8000/health" || ALL_SERVICES_UP=false
check_service "Cart Service" "http://localhost:3000/health" || ALL_SERVICES_UP=false
check_service "Order Service" "http://localhost:3001/health" || ALL_SERVICES_UP=false
check_service "Inventory Service" "http://localhost:8081/health" || ALL_SERVICES_UP=false

echo ""

if [ "$ALL_SERVICES_UP" = false ]; then
    echo -e "${RED}ERROR: Not all services are running!${NC}"
    echo "Please start the platform with: ./start.sh"
    exit 1
fi

echo -e "${GREEN}All services are running!${NC}"
echo ""
echo "Starting integration tests..."
echo ""

# Function to run a test suite
run_test_suite() {
    local test_file=$1
    local test_name=$(basename "$test_file" .sh)

    TOTAL_SUITES=$((TOTAL_SUITES + 1))

    echo "========================================"
    echo "Running: $test_name"
    echo "========================================"

    if bash "$test_file"; then
        PASSED_SUITES=$((PASSED_SUITES + 1))
        echo -e "${GREEN}✓ $test_name PASSED${NC}"
    else
        FAILED_SUITES=$((FAILED_SUITES + 1))
        echo -e "${RED}✗ $test_name FAILED${NC}"

        if [ -z "$CONTINUE_ON_FAILURE" ]; then
            echo ""
            echo "Stopping tests due to failure."
            echo "Set CONTINUE_ON_FAILURE=1 to run all tests regardless of failures."
            exit 1
        fi
    fi

    echo ""
}

# Run all test suites in order
run_test_suite "$SCRIPT_DIR/integration/01-auth-flow.sh"
run_test_suite "$SCRIPT_DIR/integration/02-product-browse.sh"
run_test_suite "$SCRIPT_DIR/integration/03-cart-checkout-flow.sh"

# Final summary
echo "========================================"
echo "Test Results Summary"
echo "========================================"
echo "Total Suites:  $TOTAL_SUITES"
echo -e "${GREEN}Passed:        $PASSED_SUITES${NC}"

if [ $FAILED_SUITES -gt 0 ]; then
    echo -e "${RED}Failed:        $FAILED_SUITES${NC}"
    echo ""
    echo -e "${RED}TESTS FAILED${NC}"
    exit 1
else
    echo "Failed:        $FAILED_SUITES"
    echo ""
    echo -e "${GREEN}ALL TESTS PASSED! ✓${NC}"
    exit 0
fi
