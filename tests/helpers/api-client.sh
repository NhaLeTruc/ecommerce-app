#!/bin/bash

# API Client Helper Functions
# Reusable functions for making API calls

# Base URLs
USER_SERVICE_URL="${USER_SERVICE_URL:-http://localhost:8084}"
CATALOG_SERVICE_URL="${CATALOG_SERVICE_URL:-http://localhost:8000}"
CART_SERVICE_URL="${CART_SERVICE_URL:-http://localhost:3000}"
ORDER_SERVICE_URL="${ORDER_SERVICE_URL:-http://localhost:3001}"
PAYMENT_SERVICE_URL="${PAYMENT_SERVICE_URL:-http://localhost:8001}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Global variable to store auth token
AUTH_TOKEN=""
USER_ID=""

# Logging functions
log_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

log_success() {
    echo -e "${GREEN}✓${NC} $1"
}

log_error() {
    echo -e "${RED}✗${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# HTTP request helper
http_request() {
    local method=$1
    local url=$2
    local data=$3
    local headers=$4

    if [ -n "$VERBOSE" ]; then
        log_info "Request: $method $url"
        [ -n "$data" ] && log_info "Data: $data"
    fi

    if [ -n "$headers" ]; then
        curl -s -X "$method" "$url" \
            -H "Content-Type: application/json" \
            -H "$headers" \
            -d "$data"
    elif [ -n "$data" ]; then
        curl -s -X "$method" "$url" \
            -H "Content-Type: application/json" \
            -d "$data"
    else
        curl -s -X "$method" "$url"
    fi
}

# Auth API functions
auth_register() {
    local email=$1
    local password=$2
    local first_name=$3
    local last_name=$4

    local data=$(cat <<EOF
{
  "email": "$email",
  "password": "$password",
  "first_name": "$first_name",
  "last_name": "$last_name"
}
EOF
)

    local response=$(http_request "POST" "$USER_SERVICE_URL/api/v1/auth/register" "$data")
    echo "$response"
}

auth_login() {
    local email=$1
    local password=$2

    local data=$(cat <<EOF
{
  "email": "$email",
  "password": "$password"
}
EOF
)

    local response=$(http_request "POST" "$USER_SERVICE_URL/api/v1/auth/login" "$data")

    # Extract token and user_id
    AUTH_TOKEN=$(echo "$response" | jq -r '.token // empty')
    USER_ID=$(echo "$response" | jq -r '.user.id // empty')

    echo "$response"
}

auth_get_profile() {
    http_request "GET" "$USER_SERVICE_URL/api/v1/users/profile" "" "Authorization: Bearer $AUTH_TOKEN"
}

# Catalog API functions
catalog_get_products() {
    local skip=${1:-0}
    local limit=${2:-20}

    http_request "GET" "$CATALOG_SERVICE_URL/api/v1/products?skip=$skip&limit=$limit"
}

catalog_get_product() {
    local product_id=$1
    http_request "GET" "$CATALOG_SERVICE_URL/api/v1/products/$product_id"
}

catalog_search_products() {
    local query=$1
    http_request "GET" "$CATALOG_SERVICE_URL/api/v1/search?q=$query"
}

# Cart API functions
cart_get() {
    local user_id=${1:-$USER_ID}
    http_request "GET" "$CART_SERVICE_URL/api/v1/cart/$user_id" "" "Authorization: Bearer $AUTH_TOKEN"
}

cart_add_item() {
    local user_id=$1
    local product_id=$2
    local sku=$3
    local name=$4
    local price=$5
    local quantity=$6

    local data=$(cat <<EOF
{
  "productId": "$product_id",
  "sku": "$sku",
  "name": "$name",
  "price": $price,
  "quantity": $quantity
}
EOF
)

    http_request "POST" "$CART_SERVICE_URL/api/v1/cart/$user_id/items" "$data" "Authorization: Bearer $AUTH_TOKEN"
}

cart_update_quantity() {
    local user_id=$1
    local product_id=$2
    local quantity=$3

    local data=$(cat <<EOF
{
  "quantity": $quantity
}
EOF
)

    http_request "PUT" "$CART_SERVICE_URL/api/v1/cart/$user_id/items/$product_id" "$data" "Authorization: Bearer $AUTH_TOKEN"
}

cart_remove_item() {
    local user_id=$1
    local product_id=$2

    http_request "DELETE" "$CART_SERVICE_URL/api/v1/cart/$user_id/items/$product_id" "" "Authorization: Bearer $AUTH_TOKEN"
}

cart_clear() {
    local user_id=$1
    http_request "DELETE" "$CART_SERVICE_URL/api/v1/cart/$user_id" "" "Authorization: Bearer $AUTH_TOKEN"
}

# Order API functions
order_create() {
    local data=$1
    http_request "POST" "$ORDER_SERVICE_URL/api/v1/orders" "$data" "Authorization: Bearer $AUTH_TOKEN"
}

order_get() {
    local order_id=$1
    http_request "GET" "$ORDER_SERVICE_URL/api/v1/orders/$order_id" "" "Authorization: Bearer $AUTH_TOKEN"
}

order_get_user_orders() {
    local user_id=${1:-$USER_ID}
    local skip=${2:-0}
    local limit=${3:-20}

    http_request "GET" "$ORDER_SERVICE_URL/api/v1/orders?userId=$user_id&skip=$skip&limit=$limit" "" "Authorization: Bearer $AUTH_TOKEN"
}

order_cancel() {
    local order_id=$1
    http_request "POST" "$ORDER_SERVICE_URL/api/v1/orders/$order_id/cancel" "" "Authorization: Bearer $AUTH_TOKEN"
}

order_ship() {
    local order_id=$1
    local tracking_number=$2
    local carrier=$3

    local data=$(cat <<EOF
{
  "trackingNumber": "$tracking_number",
  "carrier": "$carrier"
}
EOF
)

    http_request "POST" "$ORDER_SERVICE_URL/api/v1/orders/$order_id/ship" "$data" "Authorization: Bearer $AUTH_TOKEN"
}

order_deliver() {
    local order_id=$1
    http_request "POST" "$ORDER_SERVICE_URL/api/v1/orders/$order_id/deliver" "" "Authorization: Bearer $AUTH_TOKEN"
}

# Utility functions
extract_json_field() {
    local json=$1
    local field=$2
    echo "$json" | jq -r ".$field // empty"
}

wait_for_service() {
    local url=$1
    local max_attempts=30
    local attempt=1

    log_info "Waiting for service at $url..."

    while [ $attempt -le $max_attempts ]; do
        if curl -s "$url" > /dev/null 2>&1; then
            log_success "Service is ready"
            return 0
        fi
        sleep 1
        attempt=$((attempt + 1))
    done

    log_error "Service not available after $max_attempts attempts"
    return 1
}
