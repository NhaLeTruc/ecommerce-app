#!/bin/bash
# Constitution Compliance Validator
# Run this in CI/CD to enforce constitution rules

set -e

REPO_ROOT=$(git rev-parse --show-toplevel)
CONSTITUTION="$REPO_ROOT/.specify/memory/constitution.md"
EXIT_CODE=0

echo "🔍 Validating Constitution Compliance..."
echo "========================================"

# I. Test-Driven Development
echo ""
echo "✓ Checking TDD Compliance..."

# Check test coverage
if command -v go &> /dev/null; then
    echo "  - Checking Go test coverage..."
    GO_COVERAGE=$(go test -cover ./... 2>/dev/null | grep coverage | awk '{sum+=$NF; count++} END {print sum/count}' || echo "0")
    if (( $(echo "$GO_COVERAGE < 80" | bc -l) )); then
        echo "  ❌ FAIL: Go coverage ($GO_COVERAGE%) < 80%"
        EXIT_CODE=1
    else
        echo "  ✅ PASS: Go coverage ($GO_COVERAGE%)"
    fi
fi

if [ -f "package.json" ]; then
    echo "  - Checking Node.js test coverage..."
    if npm test -- --coverage --silent 2>&1 | grep -q "All files.*[8-9][0-9]%\|100%"; then
        echo "  ✅ PASS: Node.js coverage ≥80%"
    else
        echo "  ❌ FAIL: Node.js coverage < 80%"
        EXIT_CODE=1
    fi
fi

# II. Clean Code & SOLID
echo ""
echo "✓ Checking Clean Code Compliance..."

# Check for magic numbers
MAGIC_NUMBERS=$(git diff --cached | grep -E "^\+.*[^a-zA-Z_][0-9]{2,}" | grep -v "//" | wc -l || echo "0")
if [ "$MAGIC_NUMBERS" -gt 0 ]; then
    echo "  ⚠️  WARNING: Found $MAGIC_NUMBERS potential magic numbers in staged changes"
fi

# Check function complexity (basic heuristic: lines per function)
if command -v cloc &> /dev/null; then
    echo "  - Checking cyclomatic complexity..."
    # This is a placeholder - integrate actual complexity tools
    echo "  ℹ️  Use SonarQube for detailed complexity analysis"
fi

# III. Decoupled Architecture
echo ""
echo "✓ Checking Architecture Decoupling..."

# Check for circular dependencies
if [ -d "services" ]; then
    echo "  - Checking for import cycles..."
    for service in services/*/; do
        if [ -f "$service/go.mod" ]; then
            if go list -f '{{.ImportPath}}{{if .DepsErrors}} {{index .DepsErrors 0}}{{end}}' ./... 2>&1 | grep -q "import cycle"; then
                echo "  ❌ FAIL: Circular dependency detected in $(basename $service)"
                EXIT_CODE=1
            fi
        fi
    done
    echo "  ✅ PASS: No circular dependencies detected"
fi

# IV. SRE
echo ""
echo "✓ Checking SRE Compliance..."

# Check for circuit breaker usage when calling external services
EXTERNAL_CALLS=$(git diff --cached | grep -E "http\.Get|http\.Post|axios\." | wc -l || echo "0")
CIRCUIT_BREAKERS=$(git diff --cached | grep -E "CircuitBreaker|Breaker|resilience4j" | wc -l || echo "0")

if [ "$EXTERNAL_CALLS" -gt 0 ] && [ "$CIRCUIT_BREAKERS" -eq 0 ]; then
    echo "  ⚠️  WARNING: Found $EXTERNAL_CALLS external HTTP calls but no circuit breakers"
fi

# V. Observability
echo ""
echo "✓ Checking Observability Compliance..."

# Check for correlation ID usage in new code
NEW_HANDLERS=$(git diff --cached | grep -E "func.*Handler|router\." | wc -l || echo "0")
CORRELATION_IDS=$(git diff --cached | grep -E "correlation.*id|request.*id|trace.*id" -i | wc -l || echo "0")

if [ "$NEW_HANDLERS" -gt 0 ] && [ "$CORRELATION_IDS" -eq 0 ]; then
    echo "  ⚠️  WARNING: Found $NEW_HANDLERS new handlers without correlation ID usage"
fi

# VI. Security
echo ""
echo "✓ Checking Security Compliance..."

# Check for hardcoded secrets
if git diff --cached | grep -iE "(password|secret|api.?key|token)\s*[:=]\s*[\"'][^\"']+[\"']"; then
    echo "  ❌ FAIL: Potential hardcoded secret detected"
    EXIT_CODE=1
else
    echo "  ✅ PASS: No hardcoded secrets detected"
fi

# Check for SQL injection vulnerabilities
if git diff --cached | grep -E "query.*\+.*|exec.*\+.*|sql\.Raw.*\+" | grep -v "Param"; then
    echo "  ❌ FAIL: Potential SQL injection vulnerability (string concatenation in query)"
    EXIT_CODE=1
else
    echo "  ✅ PASS: No obvious SQL injection patterns"
fi

# Check for XSS vulnerabilities
if git diff --cached | grep -E "innerHTML|dangerouslySetInnerHTML" | grep -v "DOMPurify\|sanitize"; then
    echo "  ⚠️  WARNING: Potential XSS vulnerability (innerHTML without sanitization)"
fi

# Summary
echo ""
echo "========================================"
if [ $EXIT_CODE -eq 0 ]; then
    echo "✅ Constitution compliance check PASSED"
else
    echo "❌ Constitution compliance check FAILED"
    echo ""
    echo "Constitution violations block PR merges."
    echo "Please fix the issues above or provide explicit justification in PR description."
fi

exit $EXIT_CODE
