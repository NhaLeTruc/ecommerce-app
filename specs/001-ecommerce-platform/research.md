# Technology Research & Architectural Decisions

**Feature**: Enterprise-Grade Ecommerce Platform
**Date**: 2025-11-15
**Purpose**: Document all technology choices, architectural patterns, and implementation approaches

## Executive Summary

This document captures the research and decision-making process for building a production-grade ecommerce platform using open-source technologies. All decisions prioritize constitution compliance (TDD, SOLID, SRE, Observability, Security) while maintaining cost-effectiveness through open-source tooling.

---

## 1. Service Architecture Pattern

### Decision: Microservices with Event-Driven Architecture

**Rationale**:
- **Independent Scaling**: Catalog service can scale differently than payment service based on traffic patterns
- **Team Autonomy**: Different teams can own different services with minimal coordination
- **Technology Flexibility**: Use Go for performance-critical services, Python for ML, Node.js for API Gateway
- **Fault Isolation**: Failure in recommendations doesn't impact checkout
- **Deployment Independence**: Deploy catalog updates without touching payment service

**Alternatives Considered**:
1. **Monolithic**: Rejected due to:
   - Single scaling unit (can't scale checkout independently from browse)
   - Technology lock-in (all code must be in same language)
   - Deployment coupling (all changes deploy together)
   - Testing complexity (full integration test suite for every change)

2. **Modular Monolith**: Rejected due to:
   - Still requires entire application deployment for any change
   - Scaling limitations (can't independently scale modules)
   - Risk of module boundary erosion over time

**Implementation Approach**:
- 8 core microservices: catalog, cart, checkout, payment, inventory, orders, fulfillment, accounts, recommendations
- Event-driven communication via Kafka for asynchronous workflows
- API Gateway (Kong/APISIX) for synchronous client-to-service communication
- Service mesh (Istio/Linkerd) for service-to-service communication with mTLS

---

## 2. Backend Language Selection

### Decision: Polyglot - Go + Node.js/TypeScript + Python/FastAPI

**Rationale**:
- **Go 1.21+** for performance-critical, high-throughput services
  - Payment processing: Low latency critical for user experience
  - Inventory management: High concurrency for stock reservations
  - Checkout: Fast order creation and validation
  - Excellent concurrency model (goroutines), strong typing, fast compilation

- **Node.js 20 LTS + TypeScript 5.3** for I/O-bound services and API orchestration
  - API Gateway: Event loop excels at request routing
  - Cart service: Simple CRUD with session management
  - Fulfillment service: Webhook integrations with shipping providers
  - Rich ecosystem for API development (Express, Fastify)

- **Python 3.11 + FastAPI 0.104** for data-intensive and ML services
  - Catalog service: MongoDB integration, full-text search
  - Recommendation service: ML libraries (scikit-learn, transformers)
  - Search service: OpenSearch integration, ranking algorithms
  - Excellent data science ecosystem, async support with FastAPI

**Alternatives Considered**:
1. **Single Language (e.g., Java)**: Rejected due to:
   - Heavier resource footprint
   - Slower startup times (impacts auto-scaling responsiveness)
   - Less optimal for ML workloads (recommendation service)

2. **Rust for All**: Rejected due to:
   - Steeper learning curve increases development velocity
   - Smaller ecosystem for web services compared to Go/Node.js
   - Overkill for I/O-bound services
   - (Still an option for future ultra-performance optimization)

**Implementation Approach**:
- Go services use hexagonal architecture (ports & adapters)
- Node.js services use layered architecture with dependency injection
- Python services use FastAPI with async/await throughout
- All services expose OpenAPI/GraphQL schemas for contract testing

---

## 3. Data Storage Strategy

### Decision: Polyglot Persistence - PostgreSQL + MongoDB + Redis + OpenSearch

**Rationale**:

**PostgreSQL 15** for transactional data:
- ACID guarantees for orders, payments, inventory
- Strong consistency for financial transactions
- Mature replication and backup solutions
- Extensions: Citus (horizontal scaling), TimescaleDB (time-series), PgBouncer (connection pooling)

**MongoDB 7 Community** for product catalog:
- Flexible schema for varying product attributes
- Horizontal scaling with sharding
- Change streams for event sourcing
- Fast reads for product browsing

**Redis 7** for caching and sessions:
- Sub-millisecond latency for hot data
- Pub/sub for real-time notifications
- Lua scripts for atomic multi-key operations (cart totaling)
- Cluster mode for high availability

**OpenSearch 2.x** for full-text search:
- Product search with faceted navigation
- Log aggregation for observability
- Real-time analytics aggregations
- Open source alternative to Elasticsearch

**MinIO** for object storage:
- S3-compatible for product images, documents
- Self-hosted alternative to cloud storage
- High throughput for media delivery

**Alternatives Considered**:
1. **Single Database (PostgreSQL only)**: Rejected due to:
   - Suboptimal for full-text search (OpenSearch is purpose-built)
   - Schema rigidity for product catalog (attributes vary wildly)
   - Cache performance inferior to Redis

2. **CockroachDB everywhere**: Rejected due to:
   - Operational complexity for single-region deployment
   - Higher resource requirements
   - Not optimal for caching or search workloads

**Implementation Approach**:
- Database per service pattern (no shared databases)
- Connection pooling: PgBouncer for PostgreSQL
- Read replicas for analytical queries
- CQRS for catalog: MongoDB (write model), OpenSearch (read model)
- Event sourcing for orders: PostgreSQL event store with projections

---

## 4. Event Streaming & Messaging

### Decision: Apache Kafka + RabbitMQ

**Rationale**:

**Apache Kafka** for event streaming:
- High-throughput event backbone (100k+ msg/sec per broker)
- Event replay capability (debugging, new service onboarding)
- Persistent log guarantees delivery
- Consumer groups for load balancing
- Topics: order-events, inventory-events, payment-events, user-events

**RabbitMQ** for task queues:
- Traditional work queue pattern (email notifications, report generation)
- Dead letter exchanges for failed message handling
- Priority queues for critical tasks
- Simpler operational model for task queuing

**Alternatives Considered**:
1. **Redpanda instead of Kafka**: Considered, but:
   - Kafka has larger ecosystem and more mature tooling
   - Team familiarity with Kafka
   - Redpanda benefits (no Zookeeper, better performance) not critical for current scale

2. **NATS**: Rejected due to:
   - Less mature ecosystem
   - No persistent log (critical for event sourcing)

3. **Kafka for everything (no RabbitMQ)**: Considered, but:
   - Kafka is overkill for simple task queues
   - RabbitMQ provides better queue management features

**Implementation Approach**:
- Kafka topics partitioned by aggregate ID (e.g., order ID) for ordering guarantees
- Exactly-once semantics using idempotent producers and transactional consumers
- Schema registry (Confluent Schema Registry) for event schema evolution
- RabbitMQ for async tasks: email, notifications, reports

---

## 5. Frontend Architecture

### Decision: Next.js 14 (Customer) + Remix (Admin) + React Native (Mobile - Future)

**Rationale**:

**Next.js 14** for customer-facing site:
- App Router for file-based routing and layouts
- Server Components for improved performance
- Edge runtime for fast global CDN delivery
- Built-in image optimization
- SEO-friendly SSR for product pages
- ISR (Incremental Static Regeneration) for product catalog

**Remix** for admin dashboard:
- Nested routing perfect for complex admin UIs
- Progressive enhancement (works without JavaScript)
- Strong focus on web fundamentals
- Simpler than Next.js for form-heavy applications
- Built-in data loading and mutations

**React Native** for mobile apps (future phase):
- Code sharing with web (React components)
- Native performance
- Largest community for hybrid mobile development

**Alternatives Considered**:
1. **Vue.js/Nuxt everywhere**: Rejected due to:
   - React ecosystem larger for complex applications
   - More developers familiar with React

2. **SvelteKit**: Rejected due to:
   - Smaller ecosystem and community
   - Less mature than Next.js/Remix
   - Team familiarity with React

**Implementation Approach**:
- Next.js: Server Components for product pages, Client Components for interactive features
- Shared component library (using shadcn/ui) between Next.js and Remix
- State management: Zustand for client state, TanStack Query for server state
- Styling: TailwindCSS for utility-first CSS

---

## 6. API Gateway & Service Mesh

### Decision: Kong Gateway (OSS) + Istio Service Mesh

**Rationale**:

**Kong Gateway**:
- OSS version provides essential features (routing, rate limiting, authentication)
- Plugin ecosystem for common concerns (JWT, OAuth2, rate limiting)
- High performance (C + Lua on nginx)
- Active community and mature project

**Istio Service Mesh**:
- mTLS for service-to-service communication (zero-trust)
- Traffic management (retries, timeouts, circuit breakers)
- Observability (automatic metrics, tracing)
- Policy enforcement

**Alternatives Considered**:
1. **Apache APISIX**: Considered, feature parity with Kong, equally valid choice
2. **Linkerd instead of Istio**: Rejected due to:
   - Less feature-rich (no Lua scripting, fewer routing options)
   - Though lighter weight and simpler
3. **No service mesh**: Rejected due to:
   - Would require implementing mTLS, retries, circuit breakers in every service
   - Observability gaps

**Implementation Approach**:
- Kong for north-south traffic (clients → services)
- Istio for east-west traffic (service → service)
- Kong plugins: rate limiting, JWT validation, CORS
- Istio VirtualServices for traffic splitting (canary deployments)

---

## 7. Observability Stack

### Decision: OpenTelemetry + Prometheus + Grafana + Jaeger + Fluentd + OpenSearch

**Rationale**:

**OpenTelemetry** for instrumentation:
- Vendor-neutral standard for metrics, logs, traces
- Single SDK for all three signals
- Automatic instrumentation for common frameworks
- Future-proof (industry standard)

**Prometheus** for metrics:
- Pull-based model ideal for Kubernetes
- Powerful query language (PromQL)
- Built-in alerting (Alertmanager)
- De facto standard for cloud-native metrics

**Grafana** for visualization:
- Supports multiple data sources (Prometheus, Jaeger, OpenSearch)
- Rich dashboard ecosystem
- Alerting and notification channels
- Open source with strong community

**Jaeger** for distributed tracing:
- OpenTelemetry-native
- Trace sampling to control volume
- Dependency graphs and service maps
- Root cause analysis for latency issues

**Fluentd** for log collection:
- Unified logging layer
- Rich plugin ecosystem
- Buffering and retry logic
- Kubernetes-native (Fluentd DaemonSet)

**OpenSearch** for log storage:
- Full-text search on logs
- Log aggregation and analysis
- OpenSearch Dashboards for visualization
- Open source (no licensing concerns)

**Alternatives Considered**:
1. **Grafana Stack (Loki + Tempo + Mimir)**: Considered, but:
   - OpenSearch provides more powerful log querying
   - Jaeger more mature for tracing
   - Mix-and-match approach chosen for best-of-breed

2. **ELK Stack (Elasticsearch)**: Rejected due to:
   - Elasticsearch licensing concerns (non-open source since 7.11)
   - OpenSearch is truly open source fork

**Implementation Approach**:
- OpenTelemetry collectors in each service
- Prometheus scrapes metrics from /metrics endpoints
- Jaeger receives traces via OpenTelemetry Protocol (OTLP)
- Fluentd ships logs to OpenSearch
- Grafana dashboards for: Business metrics, Technical metrics, SLO tracking
- Alerts for SLO violations routed to PagerDuty/Opsgenie

---

## 8. Security & Secrets Management

### Decision: HashiCorp Vault + Trivy + OWASP ZAP + ModSecurity

**Rationale**:

**HashiCorp Vault**:
- Dynamic secrets (database credentials rotated automatically)
- Encryption as a service
- Audit logging of secret access
- Kubernetes integration (Vault Agent Injector)

**Trivy** for vulnerability scanning:
- Scans container images for CVEs
- Fast and accurate
- CI/CD integration
- Open source (Apache 2.0)

**OWASP ZAP** for security testing:
- Automated security scans in CI/CD
- API security testing
- Active and passive scanning
- Open source DAST tool

**ModSecurity** with OWASP Core Rule Set:
- Web Application Firewall (WAF)
- Protection against OWASP Top 10
- Runs in Kong Gateway
- Open source rule set

**Alternatives Considered**:
1. **Infisical instead of Vault**: Rejected due to:
   - Less mature project
   - Smaller ecosystem

2. **Sealed Secrets**: Rejected as primary solution due to:
   - No dynamic secrets
   - No encryption as a service
   - (Still useful for GitOps secrets)

**Implementation Approach**:
- Vault deployed in Kubernetes (HA mode)
- Services authenticate to Vault using Kubernetes Service Accounts
- Secrets injected as environment variables or mounted files
- Trivy scans in CI/CD pipeline (block on HIGH/CRITICAL)
- OWASP ZAP baseline scan on every deploy
- ModSecurity in Kong Gateway with OWASP Core Rule Set

---

## 9. Testing Strategy

### Decision: Multi-Layer Testing with TDD

**Rationale**: Constitution mandates strict TDD with 80% coverage

**Testing Pyramid**:

**Unit Tests** (70% of tests):
- Go: `testing` + `testify` + `go-sqlmock`
- Node.js: `jest` + `@testing-library`
- Python: `pytest` + `pytest-asyncio`
- Fast execution (<1 second per test)
- Mocked dependencies

**Integration Tests** (20% of tests):
- TestContainers for real database/Redis/Kafka
- Test service with actual dependencies
- API endpoint testing with real database
- Slower execution (~5-10 seconds per test)

**Contract Tests** (5% of tests):
- Pact for consumer-driven contracts
- Ensure service API compatibility
- Run before deployment

**E2E Tests** (5% of tests):
- Playwright for full user journeys
- Browse → Cart → Checkout → Order Confirmation
- Run against staging environment
- Slowest execution (~30-60 seconds per scenario)

**Load Tests** (run separately):
- k6 for performance testing
- Scenarios: Browse, Search, Checkout, Black Friday
- 2x peak traffic simulation
- Run nightly and before major releases

**Security Tests** (run in CI/CD):
- OWASP ZAP baseline scan
- Trivy container scanning
- Nuclei vulnerability scanning
- Run on every PR

**Alternatives Considered**:
1. **Cypress instead of Playwright**: Rejected due to:
   - Playwright better multi-browser support
   - Faster execution
   - Better debugging tools

2. **Locust instead of k6**: Considered, but:
   - k6 more modern and performant
   - JavaScript-based (team familiarity)

**Implementation Approach**:
- TDD workflow: Write failing test → Implement → Refactor
- CI/CD runs: Lint → Unit → Integration → Contract → Build → E2E (staging)
- Coverage gates: 80% minimum, PR fails if coverage drops
- Mutation testing (Stryker) for critical services
- Pre-commit hooks run unit tests

---

## 10. CI/CD & GitOps

### Decision: GitHub Actions (or GitLab CE) + ArgoCD + Canary Deployments

**Rationale**:

**GitHub Actions** (or GitLab CE):
- Native GitHub integration
- Marketplace for reusable actions
- Self-hosted runners for cost control
- Matrix builds for multiple languages/versions

**ArgoCD** for GitOps:
- Declarative deployments (Git as source of truth)
- Automatic sync from Git repository
- Rollback via Git revert
- Kubernetes-native

**Canary Deployments**:
- Deploy to 5% of traffic → 25% → 50% → 100%
- Automatic rollback on error rate increase
- Metrics-driven promotion (Prometheus metrics)

**Feature Flags** (Unleash):
- Instant disabling of problematic features (no deployment)
- A/B testing
- Gradual rollout

**Alternatives Considered**:
1. **Flux instead of ArgoCD**: Considered, equally valid choice
2. **Jenkins**: Rejected due to:
   - Higher maintenance overhead
   - Less cloud-native than GitHub Actions

**Implementation Approach**:
- GitHub Actions workflows: `.github/workflows/`
  - `ci.yml`: Lint → Test → Build
  - `cd.yml`: Deploy to staging/production
  - `security-scan.yml`: Trivy + OWASP ZAP
- ArgoCD Applications for each service
- Canary deployment strategy in Argo Rollouts
- Unleash feature flags for runtime toggling

---

## 11. Infrastructure as Code

### Decision: OpenTofu (Terraform) + Kubernetes + Helm

**Rationale**:

**OpenTofu**:
- Terraform fork (truly open source)
- No licensing concerns
- Manages cloud resources (VMs, networks, storage)
- State management for infrastructure

**Kubernetes**:
- Container orchestration standard
- K3s for development (lightweight)
- Full K8s for production
- Auto-scaling, self-healing, rolling updates

**Helm**:
- Package manager for Kubernetes
- Templating for Kubernetes manifests
- Version management for applications
- Chart repositories for sharing configurations

**Alternatives Considered**:
1. **Pulumi**: Rejected due to:
   - Less mature ecosystem
   - Team familiarity with Terraform/OpenTofu

2. **Ansible for everything**: Rejected due to:
   - Not cloud-native
   - Better suited for configuration management than infrastructure provisioning

**Implementation Approach**:
- OpenTofu modules for:
  - VPC/networking
  - Kubernetes clusters
  - Database instances
  - Object storage
- Helm charts for:
  - Microservices
  - Observability stack (Prometheus, Grafana, Jaeger)
  - Data stores (PostgreSQL, MongoDB, Redis)
- GitOps: ArgoCD watches Helm charts in Git

---

## 12. Development Environment

### Decision: Docker Compose for Local + K3s for Integration

**Rationale**:

**Docker Compose** for local development:
- Defined in `docker-compose.yml`
- All dependencies: PostgreSQL, MongoDB, Redis, Kafka, RabbitMQ, OpenSearch
- Fast startup (<30 seconds)
- Isolated environments per developer

**K3s** for integration testing:
- Lightweight Kubernetes (single binary)
- Same environment as production (Kubernetes API)
- Used in CI/CD for integration tests

**TestContainers** for integration tests:
- Programmatic Docker containers in tests
- Real databases (no mocking)
- Automatic cleanup

**Alternatives Considered**:
1. **Kind (Kubernetes in Docker)**: Considered, but:
   - K3s faster to start
   - K3s single binary easier to install

2. **Minikube**: Rejected due to:
   - Slower than K3s
   - More resource-intensive

**Implementation Approach**:
- `infrastructure/docker-compose/docker-compose.yml`:
  - postgres:15-alpine
  - mongo:7
  - redis:7-alpine
  - opensearchproject/opensearch:2
  - bitnami/kafka:latest
  - rabbitmq:3-management-alpine
  - prom/prometheus
  - grafana/grafana-oss
  - jaegertracing/all-in-one
  - minio/minio
- `scripts/setup-dev.sh`: One-command environment setup
- `.env.example`: Template for environment variables
- Makefile for common commands (make dev, make test, make clean)

---

## 13. Data Migration & Versioning

### Decision: Flyway (PostgreSQL) + MongoDB Migrations + Schema Registry (Kafka)

**Rationale**:

**Flyway** for PostgreSQL:
- Version-controlled SQL migrations
- Automatic migration on startup
- Rollback support
- Idempotent migrations

**MongoDB Migrations**:
- Custom migration scripts (JavaScript)
- Version tracking in `migrations` collection
- Applied on service startup

**Confluent Schema Registry** for Kafka:
- Avro/Protobuf/JSON Schema
- Backward/forward compatibility checks
- Schema evolution without breaking consumers

**Alternatives Considered**:
1. **Liquibase**: Rejected due to:
   - XML-based (less readable than SQL)
   - Heavier than Flyway

2. **No migrations (manual)**: Rejected due to:
   - Error-prone
   - Not repeatable
   - Doesn't scale with team size

**Implementation Approach**:
- Flyway migrations in `services/*/migrations/`
- Versioned SQL files: `V1__create_orders_table.sql`
- MongoDB migrations in `services/catalog-service/src/migrations/`
- Schema Registry for Kafka event schemas
- CI/CD validates migrations before deployment

---

## 14. Performance Optimization Patterns

### Decision: CQRS + Event Sourcing + Multi-Layer Caching

**Rationale**:

**CQRS (Command Query Responsibility Segregation)**:
- Separate read and write models
- Write to PostgreSQL/MongoDB
- Read from denormalized views in OpenSearch
- Optimized queries without impacting writes

**Event Sourcing** (for orders):
- All state changes stored as events
- Complete audit trail
- Replay events to rebuild state
- Debugging and compliance

**Multi-Layer Caching**:
- **L1: Browser cache** (1 hour for static assets)
- **L2: CDN** (Cloudflare, 5 minutes for product images)
- **L3: Varnish** (30 seconds for product pages)
- **L4: Redis** (5 minutes for hot data: bestsellers, user sessions)
- **L5: Database** (with read replicas)

**Alternatives Considered**:
1. **CRUD everywhere**: Rejected due to:
   - Read performance suffers from complex joins
   - Write performance suffers from indexes needed for reads

2. **Event Sourcing everywhere**: Rejected due to:
   - Complexity overkill for simple entities (product catalog)
   - Only needed for audit-critical domains (orders, payments)

**Implementation Approach**:
- CQRS for catalog: MongoDB (write) → Kafka → OpenSearch (read)
- Event sourcing for orders: PostgreSQL event store with projections
- Cache invalidation via Kafka events
- Cache warming for popular products (background job)
- Redis Lua scripts for atomic cart operations

---

## 15. Monitoring & Alerting Strategy

### Decision: SLO-Based Alerting with Grafana + Prometheus + PagerDuty

**Rationale**:

**SLO-Based Alerts** (not symptom-based):
- Alert on error budget consumption rate
- Avoid alert fatigue from transient blips
- Focus on user impact

**Prometheus Alerting Rules**:
- Error budget burn rate alerts
- Latency percentile alerts (p95, p99)
- Saturation alerts (CPU, memory, disk)

**Grafana Dashboards**:
- Business metrics (conversion rate, cart abandonment)
- Technical metrics (RED: Rate, Errors, Duration)
- SLO tracking (error budget remaining)

**PagerDuty** for on-call:
- Escalation policies
- Incident management
- Post-incident reviews

**Alternatives Considered**:
1. **Opsgenie**: Equally valid choice, team preference for PagerDuty
2. **Email alerts**: Rejected due to:
   - No escalation
   - Easy to miss critical alerts

**Implementation Approach**:
- Prometheus recording rules for error budget calculation
- Alerting rules in `observability/prometheus/alerts/`
- Grafana dashboards in `observability/grafana/dashboards/`
- PagerDuty integration via Alertmanager
- Runbooks linked from alerts

---

## 16. Disaster Recovery & High Availability

### Decision: Multi-AZ Deployment + Automated Backups + Failover

**Rationale**:

**Multi-AZ Deployment**:
- Services deployed across 3 availability zones
- Database replication across AZs
- Survives single AZ failure

**Automated Backups**:
- PostgreSQL: Continuous archiving (WAL) + daily full backups
- MongoDB: Replica set with oplog backups
- Redis: RDB snapshots every hour
- Object storage (MinIO): Versioned buckets

**Failover**:
- PostgreSQL: Patroni for automatic failover
- MongoDB: Replica set election
- Redis: Redis Sentinel for failover

**RTO/RPO Targets**:
- **RTO (Recovery Time Objective)**: 15 minutes
- **RPO (Recovery Point Objective)**: 0 for transactional data (synchronous replication)

**Alternatives Considered**:
1. **Single AZ**: Rejected due to:
   - Doesn't meet 99.9% availability SLO
   - Vulnerable to AZ outages

2. **Multi-Region**: Deferred to future phase due to:
   - Complexity of cross-region data consistency
   - Not required for initial launch

**Implementation Approach**:
- Kubernetes cluster spans 3 AZs
- PostgreSQL with synchronous replication (1 primary, 2 sync replicas)
- MongoDB replica set (1 primary, 2 secondaries)
- Redis Cluster mode (3 masters, 3 replicas)
- Backup retention: 30 days
- Disaster recovery drills: Monthly

---

## Summary of Key Decisions

| Domain | Decision | Primary Rationale |
|--------|----------|-------------------|
| **Architecture** | Microservices + Event-Driven | Independent scaling, fault isolation, team autonomy |
| **Languages** | Go + Node.js/TS + Python | Optimal language per domain, performance where needed |
| **Databases** | PostgreSQL + MongoDB + Redis + OpenSearch | Polyglot persistence for optimal data modeling |
| **Messaging** | Kafka + RabbitMQ | Event streaming (Kafka) + task queues (RabbitMQ) |
| **Frontend** | Next.js 14 + Remix | SEO + performance (Next.js), admin UI (Remix) |
| **API Gateway** | Kong OSS | Open source, feature-rich, high performance |
| **Service Mesh** | Istio | mTLS, traffic management, observability |
| **Observability** | OpenTelemetry + Prometheus + Grafana + Jaeger | Industry standards, open source, unified instrumentation |
| **Security** | Vault + Trivy + OWASP ZAP + ModSecurity | Secrets management, vulnerability scanning, WAF |
| **Testing** | TDD with multi-layer pyramid | Constitution mandated, 80% coverage, contract tests |
| **CI/CD** | GitHub Actions + ArgoCD + Canary | GitOps, automated rollbacks, gradual rollout |
| **IaC** | OpenTofu + Kubernetes + Helm | Declarative infrastructure, open source, cloud-native |
| **Dev Environment** | Docker Compose + K3s | Fast local dev, Kubernetes parity |
| **Caching** | Multi-layer (CDN → Varnish → Redis → DB) | Optimal cache hit rates, performance |
| **HA/DR** | Multi-AZ + Automated backups | 99.9% availability, 15-minute RTO |

---

## Next Steps

All technology decisions have been documented and justified. Proceed to Phase 1:

1. **data-model.md**: Define entity models for all services
2. **contracts/**: Generate OpenAPI schemas for all service APIs
3. **quickstart.md**: Document local development environment setup
4. **Agent context update**: Add technology stack to agent memory
