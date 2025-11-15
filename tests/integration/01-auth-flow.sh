#!/bin/bash

# Integration Test: Authentication Flow
# Tests user registration, login, token validation, and profile access

set -e

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEST_ROOT="$(dirname "$SCRIPT_DIR")"

# Load helpers
source "$TEST_ROOT/helpers/api-client.sh"
source "$TEST_ROOT/helpers/assertions.sh"

# Start test suite
start_test_suite "Authentication Flow"

# Test data
TEST_EMAIL="test-user-$(date +%s)@example.com"
TEST_PASSWORD="testpass123"
TEST_FIRST_NAME="Test"
TEST_LAST_NAME="User"

# Test 1: Register new user
log_info "Test 1: Register new user"
register_response=$(auth_register "$TEST_EMAIL" "$TEST_PASSWORD" "$TEST_FIRST_NAME" "$TEST_LAST_NAME")

assert_json_field_not_null "$register_response" "token" "Registration returns JWT token"
assert_json_field_not_null "$register_response" "user.id" "Registration returns user ID"
assert_json_field_equals "$register_response" "user.email" "$TEST_EMAIL" "Registration returns correct email"
assert_json_field_equals "$register_response" "user.role" "customer" "New user has customer role"

# Save token and user ID
REG_TOKEN=$(echo "$register_response" | jq -r '.token')
REG_USER_ID=$(echo "$register_response" | jq -r '.user.id')

# Test 2: Attempt duplicate registration
log_info "Test 2: Attempt duplicate registration (should fail)"
dup_response=$(auth_register "$TEST_EMAIL" "$TEST_PASSWORD" "$TEST_FIRST_NAME" "$TEST_LAST_NAME" || true)
assert_contains "$dup_response" "already registered" "Duplicate email registration fails"

# Test 3: Login with correct credentials
log_info "Test 3: Login with correct credentials"
login_response=$(auth_login "$TEST_EMAIL" "$TEST_PASSWORD")

assert_json_field_not_null "$login_response" "token" "Login returns JWT token"
assert_json_field_equals "$login_response" "user.id" "$REG_USER_ID" "Login returns same user ID"

# Test 4: Login with incorrect password
log_info "Test 4: Login with incorrect password (should fail)"
bad_login_response=$(auth_login "$TEST_EMAIL" "wrongpassword" || true)
assert_contains "$bad_login_response" "Invalid credentials" "Login with wrong password fails"

# Test 5: Access protected endpoint with valid token
log_info "Test 5: Access protected endpoint with valid token"
profile_response=$(auth_get_profile)

assert_json_field_equals "$profile_response" "id" "$REG_USER_ID" "Profile returns correct user ID"
assert_json_field_equals "$profile_response" "email" "$TEST_EMAIL" "Profile returns correct email"
assert_json_field_equals "$profile_response" "first_name" "$TEST_FIRST_NAME" "Profile returns correct first name"
assert_json_field_equals "$profile_response" "last_name" "$TEST_LAST_NAME" "Profile returns correct last name"

# Test 6: Access protected endpoint without token
log_info "Test 6: Access protected endpoint without token (should fail)"
AUTH_TOKEN="" # Clear token
unauth_response=$(auth_get_profile || true)
assert_contains "$unauth_response" "Authorization header required" "Unauth access to protected endpoint fails"

# Test 7: Login as admin user
log_info "Test 7: Login as admin user"
admin_login_response=$(auth_login "admin@ecommerce.local" "admin123")

assert_json_field_not_null "$admin_login_response" "token" "Admin login returns token"
assert_json_field_equals "$admin_login_response" "user.role" "admin" "Admin user has admin role"

# Cleanup: Set token back for other tests
AUTH_TOKEN="$REG_TOKEN"
USER_ID="$REG_USER_ID"

# End test suite
end_test_suite

exit $?
