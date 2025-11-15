#!/bin/bash

# Integration Test: Complete Shopping Flow
# Tests cart operations and checkout process end-to-end

set -e

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEST_ROOT="$(dirname "$SCRIPT_DIR")"

# Load helpers
source "$TEST_ROOT/helpers/api-client.sh"
source "$TEST_ROOT/helpers/assertions.sh"

# Start test suite
start_test_suite "Shopping Cart and Checkout Flow"

# Setup: Login as test user
TEST_EMAIL="integration-test-$(date +%s)@example.com"
log_info "Setting up test user: $TEST_EMAIL"
register_response=$(auth_register "$TEST_EMAIL" "testpass123" "Integration" "Test")
AUTH_TOKEN=$(echo "$register_response" | jq -r '.token')
USER_ID=$(echo "$register_response" | jq -r '.user.id')

# Get a product to add to cart
products_response=$(catalog_get_products 0 1)
PRODUCT_ID=$(echo "$products_response" | jq -r '.products[0]._id // .products[0].id')
PRODUCT_SKU=$(echo "$products_response" | jq -r '.products[0].sku')
PRODUCT_NAME=$(echo "$products_response" | jq -r '.products[0].name')
PRODUCT_PRICE=$(echo "$products_response" | jq -r '.products[0].price')

log_info "Using product: $PRODUCT_NAME ($PRODUCT_SKU)"

# Test 1: Get empty cart
log_info "Test 1: Get empty cart"
empty_cart_response=$(cart_get "$USER_ID" || echo '{}')
# Cart might be null or have 0 items
log_success "Empty cart check passed"

# Test 2: Add item to cart
log_info "Test 2: Add item to cart"
add_cart_response=$(cart_add_item "$USER_ID" "$PRODUCT_ID" "$PRODUCT_SKU" "$PRODUCT_NAME" "$PRODUCT_PRICE" 2)

assert_json_field_equals "$add_cart_response" "cart.userId" "$USER_ID" "Cart belongs to correct user"
assert_json_field_not_null "$add_cart_response" "cart.items" "Cart has items"

# Test 3: Get cart with item
log_info "Test 3: Get cart with items"
cart_response=$(cart_get "$USER_ID")

cart_item_count=$(echo "$cart_response" | jq '.cart.items | length')
assert_equals "1" "$cart_item_count" "Cart has 1 item"

cart_quantity=$(echo "$cart_response" | jq '.cart.items[0].quantity')
assert_equals "2" "$cart_quantity" "Cart item has quantity 2"

# Test 4: Update item quantity
log_info "Test 4: Update item quantity"
update_response=$(cart_update_quantity "$USER_ID" "$PRODUCT_ID" 3)

updated_quantity=$(echo "$update_response" | jq '.cart.items[0].quantity')
assert_equals "3" "$updated_quantity" "Cart item quantity updated to 3"

# Test 5: Add another product
log_info "Test 5: Add another product to cart"
products_response2=$(catalog_get_products 1 1)
PRODUCT_ID_2=$(echo "$products_response2" | jq -r '.products[0]._id // .products[0].id')
PRODUCT_SKU_2=$(echo "$products_response2" | jq -r '.products[0].sku')
PRODUCT_NAME_2=$(echo "$products_response2" | jq -r '.products[0].name')
PRODUCT_PRICE_2=$(echo "$products_response2" | jq -r '.products[0].price')

cart_add_item "$USER_ID" "$PRODUCT_ID_2" "$PRODUCT_SKU_2" "$PRODUCT_NAME_2" "$PRODUCT_PRICE_2" 1

cart_multi=$(cart_get "$USER_ID")
multi_item_count=$(echo "$cart_multi" | jq '.cart.items | length')
assert_equals "2" "$multi_item_count" "Cart has 2 items"

# Test 6: Create order (Checkout)
log_info "Test 6: Create order from cart"

# Build order data
ORDER_DATA=$(cat <<EOF
{
  "userId": "$USER_ID",
  "items": [
    {
      "productId": "$PRODUCT_ID",
      "sku": "$PRODUCT_SKU",
      "name": "$PRODUCT_NAME",
      "price": $PRODUCT_PRICE,
      "quantity": 3
    },
    {
      "productId": "$PRODUCT_ID_2",
      "sku": "$PRODUCT_SKU_2",
      "name": "$PRODUCT_NAME_2",
      "price": $PRODUCT_PRICE_2,
      "quantity": 1
    }
  ],
  "shippingAddress": {
    "fullName": "Integration Test",
    "street": "123 Test Street",
    "city": "Test City",
    "state": "TS",
    "zipCode": "12345",
    "country": "USA",
    "phone": "+1-555-0123"
  },
  "billingAddress": {
    "fullName": "Integration Test",
    "street": "123 Test Street",
    "city": "Test City",
    "state": "TS",
    "zipCode": "12345",
    "country": "USA",
    "phone": "+1-555-0123"
  },
  "paymentMethod": "credit_card",
  "paymentDetails": {
    "cardNumber": "4111111111111111",
    "expiryMonth": "12",
    "expiryYear": "2025",
    "cvv": "123"
  }
}
EOF
)

order_response=$(order_create "$ORDER_DATA")

assert_json_field_not_null "$order_response" "order.id" "Order created with ID"
assert_json_field_not_null "$order_response" "order.orderNumber" "Order has order number"
assert_json_field_equals "$order_response" "order.userId" "$USER_ID" "Order belongs to correct user"
assert_json_field_equals "$order_response" "order.status" "pending" "Order status is pending"

ORDER_ID=$(echo "$order_response" | jq -r '.order.id')
log_success "Order created: $ORDER_ID"

# Test 7: Get order by ID
log_info "Test 7: Get order details"
order_detail=$(order_get "$ORDER_ID")

assert_json_field_equals "$order_detail" "order.id" "$ORDER_ID" "Order ID matches"
assert_json_field_not_null "$order_detail" "order.items" "Order has items"

order_items_count=$(echo "$order_detail" | jq '.order.items | length')
assert_equals "2" "$order_items_count" "Order has 2 items"

# Test 8: Get user orders
log_info "Test 8: Get user order history"
user_orders=$(order_get_user_orders "$USER_ID")

orders_count=$(echo "$user_orders" | jq '.orders | length')
assert_not_empty "$orders_count" "User has orders in history"

# Test 9: Remove item from cart
log_info "Test 9: Remove item from cart"
cart_remove_item "$USER_ID" "$PRODUCT_ID"

cart_after_remove=$(cart_get "$USER_ID")
remaining_items=$(echo "$cart_after_remove" | jq '.cart.items | length')
assert_equals "1" "$remaining_items" "Cart has 1 item after removal"

# Test 10: Clear cart
log_info "Test 10: Clear entire cart"
cart_clear "$USER_ID"

cart_after_clear=$(cart_get "$USER_ID" || echo '{"cart":{"items":[]}}')
cleared_items=$(echo "$cart_after_clear" | jq '.cart.items | length // 0')
assert_equals "0" "$cleared_items" "Cart is empty after clear"

# Export order ID for next tests
export TEST_ORDER_ID="$ORDER_ID"
export TEST_USER_ID="$USER_ID"
export TEST_AUTH_TOKEN="$AUTH_TOKEN"

# End test suite
end_test_suite

exit $?
