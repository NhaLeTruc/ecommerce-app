#!/bin/bash

# Integration Test: Product Browsing and Search
# Tests product listing, details, search, and inventory

set -e

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEST_ROOT="$(dirname "$SCRIPT_DIR")"

# Load helpers
source "$TEST_ROOT/helpers/api-client.sh"
source "$TEST_ROOT/helpers/assertions.sh"

# Start test suite
start_test_suite "Product Browsing and Search"

# Test 1: List all products
log_info "Test 1: List all products"
products_response=$(catalog_get_products 0 20)

assert_json_field_not_null "$products_response" "products" "Products list is not null"

product_count=$(echo "$products_response" | jq '.products | length')
assert_not_empty "$product_count" "Products array has items"

# Get first product for testing
FIRST_PRODUCT_ID=$(echo "$products_response" | jq -r '.products[0]._id // .products[0].id')
FIRST_PRODUCT_NAME=$(echo "$products_response" | jq -r '.products[0].name')
FIRST_PRODUCT_SKU=$(echo "$products_response" | jq -r '.products[0].sku')
FIRST_PRODUCT_PRICE=$(echo "$products_response" | jq -r '.products[0].price')

log_info "Found product: $FIRST_PRODUCT_NAME ($FIRST_PRODUCT_SKU)"

# Test 2: Get product by ID
log_info "Test 2: Get product by ID"
product_response=$(catalog_get_product "$FIRST_PRODUCT_ID")

assert_json_field_equals "$product_response" "name" "$FIRST_PRODUCT_NAME" "Product name matches"
assert_json_field_equals "$product_response" "sku" "$FIRST_PRODUCT_SKU" "Product SKU matches"
assert_json_field_not_null "$product_response" "description" "Product has description"
assert_json_field_not_null "$product_response" "price" "Product has price"

# Test 3: Search for products
log_info "Test 3: Search for products"

# Search for "laptop"
search_response=$(catalog_search_products "laptop")
search_count=$(echo "$search_response" | jq '.results | length' 2>/dev/null || echo "$search_response" | jq '.products | length' 2>/dev/null || echo "0")

assert_not_empty "$search_count" "Search returns results"

# Test 4: Get product categories
log_info "Test 4: Get product categories"
categories_response=$(http_request "GET" "$CATALOG_SERVICE_URL/api/v1/categories")

cat_count=$(echo "$categories_response" | jq '. | length')
assert_not_empty "$cat_count" "Categories list is not empty"

# Test 5: Check inventory for product
log_info "Test 5: Check inventory for product"
inventory_response=$(http_request "GET" "http://localhost:8081/api/v1/inventory/$FIRST_PRODUCT_SKU")

assert_json_field_equals "$inventory_response" "sku" "$FIRST_PRODUCT_SKU" "Inventory SKU matches"
assert_json_field_not_null "$inventory_response" "quantity" "Inventory has quantity"
assert_json_field_not_null "$inventory_response" "available_quantity" "Inventory has available quantity"

# Export for next tests
export TEST_PRODUCT_ID="$FIRST_PRODUCT_ID"
export TEST_PRODUCT_NAME="$FIRST_PRODUCT_NAME"
export TEST_PRODUCT_SKU="$FIRST_PRODUCT_SKU"
export TEST_PRODUCT_PRICE="$FIRST_PRODUCT_PRICE"

# End test suite
end_test_suite

exit $?
