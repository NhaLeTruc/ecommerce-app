#!/bin/bash

# Test Assertion Functions

# Load colors from api-client if not already loaded
RED="${RED:-\033[0;31m}"
GREEN="${GREEN:-\033[0;32m}"
NC="${NC:-\033[0m}"

# Test counters
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

# Assert functions
assert_equals() {
    local expected=$1
    local actual=$2
    local message=$3

    TESTS_RUN=$((TESTS_RUN + 1))

    if [ "$expected" == "$actual" ]; then
        TESTS_PASSED=$((TESTS_PASSED + 1))
        echo -e "${GREEN}✓${NC} PASS: $message"
        return 0
    else
        TESTS_FAILED=$((TESTS_FAILED + 1))
        echo -e "${RED}✗${NC} FAIL: $message"
        echo "   Expected: $expected"
        echo "   Actual:   $actual"
        return 1
    fi
}

assert_not_empty() {
    local value=$1
    local message=$2

    TESTS_RUN=$((TESTS_RUN + 1))

    if [ -n "$value" ]; then
        TESTS_PASSED=$((TESTS_PASSED + 1))
        echo -e "${GREEN}✓${NC} PASS: $message"
        return 0
    else
        TESTS_FAILED=$((TESTS_FAILED + 1))
        echo -e "${RED}✗${NC} FAIL: $message (value is empty)"
        return 1
    fi
}

assert_contains() {
    local haystack=$1
    local needle=$2
    local message=$3

    TESTS_RUN=$((TESTS_RUN + 1))

    if echo "$haystack" | grep -q "$needle"; then
        TESTS_PASSED=$((TESTS_PASSED + 1))
        echo -e "${GREEN}✓${NC} PASS: $message"
        return 0
    else
        TESTS_FAILED=$((TESTS_FAILED + 1))
        echo -e "${RED}✗${NC} FAIL: $message"
        echo "   Expected '$needle' in '$haystack'"
        return 1
    fi
}

assert_http_status() {
    local url=$1
    local expected_status=$2
    local message=$3
    local method=${4:-GET}
    local headers=${5:-}

    TESTS_RUN=$((TESTS_RUN + 1))

    if [ -n "$headers" ]; then
        actual_status=$(curl -s -o /dev/null -w "%{http_code}" -X "$method" -H "$headers" "$url")
    else
        actual_status=$(curl -s -o /dev/null -w "%{http_code}" -X "$method" "$url")
    fi

    if [ "$expected_status" == "$actual_status" ]; then
        TESTS_PASSED=$((TESTS_PASSED + 1))
        echo -e "${GREEN}✓${NC} PASS: $message"
        return 0
    else
        TESTS_FAILED=$((TESTS_FAILED + 1))
        echo -e "${RED}✗${NC} FAIL: $message"
        echo "   Expected HTTP $expected_status, got $actual_status"
        return 1
    fi
}

assert_json_field_equals() {
    local json=$1
    local field=$2
    local expected=$3
    local message=$4

    TESTS_RUN=$((TESTS_RUN + 1))

    actual=$(echo "$json" | jq -r ".$field // empty")

    if [ "$expected" == "$actual" ]; then
        TESTS_PASSED=$((TESTS_PASSED + 1))
        echo -e "${GREEN}✓${NC} PASS: $message"
        return 0
    else
        TESTS_FAILED=$((TESTS_FAILED + 1))
        echo -e "${RED}✗${NC} FAIL: $message"
        echo "   Expected $field: $expected"
        echo "   Actual $field:   $actual"
        return 1
    fi
}

assert_json_field_not_null() {
    local json=$1
    local field=$2
    local message=$3

    TESTS_RUN=$((TESTS_RUN + 1))

    actual=$(echo "$json" | jq -r ".$field // empty")

    if [ -n "$actual" ] && [ "$actual" != "null" ]; then
        TESTS_PASSED=$((TESTS_PASSED + 1))
        echo -e "${GREEN}✓${NC} PASS: $message"
        return 0
    else
        TESTS_FAILED=$((TESTS_FAILED + 1))
        echo -e "${RED}✗${NC} FAIL: $message (field is null or empty)"
        return 1
    fi
}

# Test suite management
start_test_suite() {
    local suite_name=$1
    echo ""
    echo "======================================"
    echo "Test Suite: $suite_name"
    echo "======================================"
    echo ""
    TESTS_RUN=0
    TESTS_PASSED=0
    TESTS_FAILED=0
}

end_test_suite() {
    echo ""
    echo "--------------------------------------"
    echo "Results:"
    echo "  Total:  $TESTS_RUN"
    echo -e "  ${GREEN}Passed: $TESTS_PASSED${NC}"
    if [ $TESTS_FAILED -gt 0 ]; then
        echo -e "  ${RED}Failed: $TESTS_FAILED${NC}"
    else
        echo "  Failed: $TESTS_FAILED"
    fi
    echo "--------------------------------------"
    echo ""

    return $TESTS_FAILED
}
