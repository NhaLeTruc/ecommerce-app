## Description

<!-- Provide a clear description of what this PR does -->

## Related Issues

<!-- Link to related issues: Fixes #123, Relates to #456 -->

## Constitution Compliance Checklist

> **CRITICAL**: Per [constitution.md](/.specify/memory/constitution.md), ALL items must be checked or explicitly justified below. Unchecked items block PR merge.

### I. Test-Driven Development (NON-NEGOTIABLE)

- [ ] Tests were written **BEFORE** implementation code
- [ ] Tests failed first (Red phase documented)
- [ ] Implementation makes tests pass (Green phase)
- [ ] Code refactored while keeping tests green (Refactor phase)
- [ ] Test coverage ≥80% (verified in CI coverage report)
- [ ] Integration tests cover API contracts
- [ ] E2E tests cover critical user journeys (if applicable)

**Test Evidence**:
<!-- Paste link to CI test results or screenshot showing: -->
<!-- 1. Initial test failures -->
<!-- 2. Final test passes -->
<!-- 3. Coverage report ≥80% -->

### II. Clean Code & SOLID Principles

- [ ] Functions are ≤20 lines each
- [ ] Cyclomatic complexity ≤10 per function (SonarQube check)
- [ ] No magic numbers or strings (replaced with named constants)
- [ ] Code duplication eliminated through abstraction
- [ ] Single Responsibility: each class/module has one reason to change
- [ ] Dependency Inversion: dependencies injected via constructors/interfaces
- [ ] Meaningful names: variables are nouns, functions are verbs

**SOLID Compliance**:
<!-- If any principles were challenging to apply, explain why -->

### III. Decoupled Architecture

- [ ] No circular dependencies (verified by CI)
- [ ] Dependencies injected (not instantiated directly)
- [ ] Event-driven communication used for cross-service interaction
- [ ] API contracts versioned and backward-compatible
- [ ] Feature toggles used for new features (if applicable)
- [ ] No direct database access from presentation layer

**Architecture Impact**:
<!-- Describe how this change fits into the layered architecture -->

### IV. Site Reliability Engineering (SRE)

- [ ] Does not violate SLOs (99.9% checkout uptime, p95 latency targets)
- [ ] External service calls use circuit breakers
- [ ] Retry logic with exponential backoff implemented
- [ ] Graceful degradation for non-critical features
- [ ] Error handling prevents cascading failures
- [ ] Load tested at 2x expected peak traffic (if performance-critical)

**SRE Considerations**:
<!-- How does this change affect reliability? Any new failure modes? -->

### V. Observability

- [ ] Structured JSON logging with correlation IDs
- [ ] OpenTelemetry instrumentation added
- [ ] Metrics exposed (RED: Rate, Errors, Duration)
- [ ] Health check endpoint updated (if applicable)
- [ ] Distributed tracing propagates context
- [ ] Alerts configured for SLO violations (if applicable)

**Observability Evidence**:
<!-- Paste example log output showing correlation IDs and structured format -->

### VI. Web Security Best Practices

- [ ] OWASP Top 10 mitigations applied:
  - [ ] SQL Injection: parameterized queries used
  - [ ] XSS: output encoding applied
  - [ ] Authentication: secure session management
  - [ ] Sensitive Data: encrypted at rest and in transit
  - [ ] Access Control: RBAC enforced
- [ ] No secrets in code (Vault/env vars used)
- [ ] Input validation and sanitization applied
- [ ] Security headers configured (CSP, HSTS, etc.)
- [ ] PCI DSS compliance maintained (no raw card data)
- [ ] GDPR compliance: no PII exposure in logs

**Security Review**:
<!-- Any security considerations or threat model changes? -->

---

## Performance & Scalability

- [ ] Database queries indexed appropriately
- [ ] Caching strategy applied (if applicable)
- [ ] No N+1 query problems
- [ ] Resource limits configured (timeouts, connection pools)
- [ ] Tested under expected load

**Performance Impact**:
<!-- Describe performance characteristics or paste benchmark results -->

---

## Code Quality Gates (Automated)

The following are checked automatically by CI:

- [ ] All tests pass ✅ (verified by CI)
- [ ] Coverage ≥80% ✅ (verified by CI)
- [ ] Linting passes ✅ (golangci-lint/ESLint/Pylint)
- [ ] SonarQube quality gate passes ✅
- [ ] Security scan passes ✅ (Trivy/OWASP ZAP)
- [ ] No circular dependencies ✅ (verified by CI)
- [ ] No hardcoded secrets ✅ (TruffleHog scan)

---

## Justification for Deviations

<!-- REQUIRED if ANY checkbox above is unchecked -->

**Unchecked Items**:
<!-- List item number and reason -->

**Architectural Review Required?**
<!-- Constitution section 4.2: "Any deviation requires architectural review and explicit justification" -->

- [ ] No deviations - full compliance ✅
- [ ] Deviations justified above and reviewed by @architecture-team

---

## Reviewer Notes

**For Reviewers**: Per constitution governance rules:
1. Verify all checkboxes are marked or justified
2. Review for SOLID violations and architectural deviations
3. Confirm test coverage in CI report
4. Check SonarQube dashboard for code smells
5. Validate security considerations

**Constitution Violations Block Merge** - do not approve if compliance is incomplete.

---

## Screenshots / Demo

<!-- If applicable, add screenshots or demo links -->

---

## Deployment Notes

<!-- Any special deployment considerations? Database migrations? Feature flags? -->

- [ ] No database migrations required
- [ ] Database migrations included and tested
- [ ] Feature flag configuration documented
- [ ] Backward compatible with current production version
- [ ] Rollback plan documented (if risky change)

---

## Checklist for Merging

- [ ] All CI checks passing
- [ ] ≥1 approval from senior engineer
- [ ] All review comments resolved
- [ ] Constitution compliance verified
- [ ] Documentation updated (if applicable)
- [ ] CHANGELOG updated (if applicable)

---

**By submitting this PR, I confirm**:
- I have reviewed the [Constitution](/.specify/memory/constitution.md)
- I have followed TDD methodology (tests first)
- I have not committed security vulnerabilities
- I have maintained test coverage ≥80%
- I understand constitution violations will block merge
