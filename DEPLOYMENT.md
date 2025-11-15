# Ecommerce Platform - Deployment Guide

Complete guide for deploying the ecommerce platform to production environments.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Local Development](#local-development)
3. [Production Deployment](#production-deployment)
4. [Environment Configuration](#environment-configuration)
5. [Database Setup](#database-setup)
6. [Service Health Checks](#service-health-checks)
7. [Monitoring](#monitoring)
8. [Backup & Recovery](#backup--recovery)
9. [Scaling](#scaling)
10. [Troubleshooting](#troubleshooting)

## Prerequisites

### Required Software
- Docker 20.10+
- Docker Compose 2.0+
- 8GB+ RAM
- 20GB+ disk space

### Optional (for production)
- Kubernetes cluster
- PostgreSQL managed service
- MongoDB Atlas
- Redis Cloud
- Kafka managed service
- Load balancer

## Local Development

### Quick Start

```bash
# 1. Clone repository
git clone <repository-url>
cd ecommerce-app

# 2. Start platform
./start.sh

# 3. Verify services
docker-compose ps

# 4. Run tests
cd tests && ./run-tests.sh

# 5. Access platform
open http://localhost:3001
```

### Services & Ports

| Service | Port | URL |
|---------|------|-----|
| Customer Web | 3001 | http://localhost:3001 |
| Catalog API | 8000 | http://localhost:8000 |
| Inventory API | 8081 | http://localhost:8081 |
| Cart API | 3000 | http://localhost:3000 |
| Order API | 3001 | http://localhost:3001 |
| Payment API | 8001 | http://localhost:8001 |
| User API | 8084 | http://localhost:8084 |
| MailHog UI | 8025 | http://localhost:8025 |
| PostgreSQL | 5432 | localhost:5432 |
| MongoDB | 27017 | localhost:27017 |
| Redis | 6379 | localhost:6379 |
| Kafka | 9092 | localhost:9092 |
| OpenSearch | 9200 | http://localhost:9200 |

## Production Deployment

### Architecture Overview

```
                     ┌─────────────────┐
                     │   Load Balancer │
                     └────────┬────────┘
                              │
                ┌─────────────┴─────────────┐
                │                           │
         ┌──────▼──────┐             ┌─────▼──────┐
         │  Customer   │             │   Admin    │
         │     Web     │             │    Web     │
         └──────┬──────┘             └─────┬──────┘
                │                           │
         ┌──────┴───────────────────────────┴──────┐
         │          API Gateway (Kong)              │
         └──────┬───────────────────────────────────┘
                │
     ┌──────────┼──────────┬──────────┬──────────┐
     │          │          │          │          │
┌────▼───┐ ┌───▼────┐ ┌───▼────┐ ┌───▼────┐ ┌──▼─────┐
│Catalog │ │ Cart   │ │ Order  │ │Payment │ │  User  │
│Service │ │Service │ │Service │ │Service │ │Service │
└────┬───┘ └───┬────┘ └───┬────┘ └───┬────┘ └───┬────┘
     │         │          │          │          │
┌────▼───┐ ┌───▼────┐ ┌───▼────┐ ┌───▼────┐ ┌──▼─────┐
│MongoDB │ │ Redis  │ │Postgres│ │Postgres│ │Postgres│
└────────┘ └────────┘ └────┬───┘ └────────┘ └────────┘
                           │
                      ┌────▼────┐
                      │  Kafka  │
                      └────┬────┘
                           │
                    ┌──────▼─────────┐
                    │  Notification  │
                    │    Service     │
                    └────────────────┘
```

### Deployment Steps

#### 1. Set Up Infrastructure

```bash
# Create VPC and networking
# Set up managed databases
# Configure load balancer
# Set up Kafka cluster
# Configure Redis cluster
```

#### 2. Configure Secrets

```bash
# Create secrets for:
# - Database credentials
# - JWT secret
# - API keys
# - TLS certificates
```

#### 3. Deploy Services

**Option A: Docker Compose (Small Scale)**

```bash
# Update production environment variables
cp .env.example .env
# Edit .env with production values

# Deploy
docker-compose -f docker-compose.prod.yml up -d
```

**Option B: Kubernetes (Large Scale)**

```bash
# Apply Kubernetes manifests
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/secrets.yaml
kubectl apply -f k8s/configmaps.yaml
kubectl apply -f k8s/deployments/
kubectl apply -f k8s/services/
kubectl apply -f k8s/ingress.yaml
```

#### 4. Initialize Databases

```bash
# PostgreSQL
psql -h <postgres-host> -U postgres -f infrastructure/init-db.sql

# MongoDB
mongosh <mongodb-uri> < infrastructure/init-mongo.js
```

#### 5. Verify Deployment

```bash
# Check all services are healthy
curl https://api.yourplatform.com/health

# Run integration tests
cd tests && ./run-tests.sh
```

## Environment Configuration

### Production Environment Variables

```bash
# Application
NODE_ENV=production
ENVIRONMENT=production

# Databases
POSTGRES_HOST=your-rds-endpoint.amazonaws.com
POSTGRES_PORT=5432
POSTGRES_USER=ecommerce
POSTGRES_PASSWORD=<secure-password>

MONGODB_URL=mongodb+srv://user:pass@cluster.mongodb.net/catalog_db
REDIS_URL=redis://your-redis.cache.amazonaws.com:6379

# Services
CATALOG_SERVICE_URL=https://api.yourplatform.com/catalog
CART_SERVICE_URL=https://api.yourplatform.com/cart
ORDER_SERVICE_URL=https://api.yourplatform.com/orders
USER_SERVICE_URL=https://api.yourplatform.com/users

# Security
JWT_SECRET=<strong-random-secret-min-32-chars>
JWT_EXPIRY_HOURS=24

# Kafka
KAFKA_BROKERS=kafka-1.yourplatform.com:9092,kafka-2.yourplatform.com:9092

# Email
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=<sendgrid-api-key>
SMTP_FROM_EMAIL=noreply@yourplatform.com

# Monitoring
SENTRY_DSN=<sentry-dsn>
NEW_RELIC_LICENSE_KEY=<key>
```

### Security Checklist

- [ ] Change all default passwords
- [ ] Use strong JWT secret (32+ characters)
- [ ] Enable TLS/SSL for all services
- [ ] Configure firewall rules
- [ ] Set up VPC/private networking
- [ ] Enable database encryption at rest
- [ ] Configure backup encryption
- [ ] Set up secrets management (Vault, AWS Secrets Manager)
- [ ] Enable audit logging
- [ ] Configure rate limiting
- [ ] Set up DDoS protection
- [ ] Implement WAF rules

## Database Setup

### PostgreSQL

```sql
-- Create production databases
CREATE DATABASE inventory_db;
CREATE DATABASE orders_db;
CREATE DATABASE payments_db;
CREATE DATABASE users_db;

-- Create read-only user for reporting
CREATE USER readonly WITH PASSWORD '<password>';
GRANT CONNECT ON DATABASE orders_db TO readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO readonly;
```

### MongoDB

```javascript
// Create indexes for production
db.products.createIndex({ name: "text", description: "text" });
db.products.createIndex({ sku: 1 }, { unique: true });
db.products.createIndex({ category_id: 1 });
db.products.createIndex({ price: 1 });
db.products.createIndex({ is_active: 1 });
```

### Redis

```bash
# Configure persistence
CONFIG SET save "900 1 300 10 60 10000"

# Set max memory policy
CONFIG SET maxmemory 2gb
CONFIG SET maxmemory-policy allkeys-lru
```

## Service Health Checks

### Health Check Endpoints

All services expose `/health`:

```bash
curl http://localhost:8000/health  # Catalog
curl http://localhost:8081/health  # Inventory
curl http://localhost:3000/health  # Cart
curl http://localhost:3001/health  # Order
curl http://localhost:8001/health  # Payment
curl http://localhost:8084/health  # User
```

### Monitoring Script

```bash
#!/bin/bash
# health-check.sh

services=(
  "http://localhost:8000/health:Catalog"
  "http://localhost:8081/health:Inventory"
  "http://localhost:3000/health:Cart"
  "http://localhost:3001/health:Order"
  "http://localhost:8001/health:Payment"
  "http://localhost:8084/health:User"
)

for service in "${services[@]}"; do
  url=$(echo $service | cut -d: -f1,2,3)
  name=$(echo $service | cut -d: -f4)

  if curl -sf "$url" > /dev/null; then
    echo "✓ $name is healthy"
  else
    echo "✗ $name is DOWN"
    # Send alert
  fi
done
```

## Monitoring

### Metrics to Track

**Application Metrics:**
- Request rate
- Response time (p50, p95, p99)
- Error rate
- Active users
- Orders per minute
- Cart abandonment rate

**Infrastructure Metrics:**
- CPU usage
- Memory usage
- Disk I/O
- Network I/O
- Database connections
- Cache hit rate

**Business Metrics:**
- Revenue
- Conversion rate
- Average order value
- Customer lifetime value

### Alerting Rules

```yaml
alerts:
  - name: HighErrorRate
    condition: error_rate > 5%
    duration: 5m
    severity: critical

  - name: HighResponseTime
    condition: p95_response_time > 1s
    duration: 10m
    severity: warning

  - name: ServiceDown
    condition: health_check_failed
    duration: 1m
    severity: critical
```

## Backup & Recovery

### Database Backups

**PostgreSQL:**
```bash
# Daily backup
pg_dump -h <host> -U postgres orders_db | gzip > orders_db_$(date +%Y%m%d).sql.gz

# Point-in-time recovery setup
# Enable WAL archiving in postgresql.conf
```

**MongoDB:**
```bash
# Backup
mongodump --uri="mongodb+srv://..." --out=/backup/$(date +%Y%m%d)

# Restore
mongorestore --uri="mongodb+srv://..." /backup/20240101
```

**Redis:**
```bash
# Backup RDB snapshot
redis-cli --rdb /backup/dump.rdb

# Enable AOF for durability
```

### Disaster Recovery Plan

1. **Database Failure:**
   - Promote read replica to master
   - Restore from latest backup
   - Verify data integrity

2. **Service Failure:**
   - Auto-scaling kicks in
   - Load balancer routes to healthy instances
   - Alert on-call engineer

3. **Complete Outage:**
   - Activate DR region
   - Restore databases from backup
   - Update DNS to DR environment

## Scaling

### Horizontal Scaling

**Stateless Services:**
```bash
# Scale up
docker-compose up -d --scale catalog-service=3
docker-compose up -d --scale order-service=5

# Kubernetes
kubectl scale deployment catalog-service --replicas=3
kubectl scale deployment order-service --replicas=5
```

**Database Scaling:**
- PostgreSQL: Read replicas for queries
- MongoDB: Sharding for large datasets
- Redis: Redis Cluster for high throughput

### Vertical Scaling

```yaml
# Increase resources
services:
  catalog-service:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 4G
        reservations:
          cpus: '1'
          memory: 2G
```

### Caching Strategy

```
┌─────────────┐
│   Request   │
└──────┬──────┘
       │
   ┌───▼────┐
   │ Cache  │ Hit? → Return
   └───┬────┘
       │ Miss
   ┌───▼────┐
   │   DB   │
   └───┬────┘
       │
   ┌───▼────┐
   │ Update │
   │ Cache  │
   └────────┘
```

## Troubleshooting

### Common Issues

**Service Won't Start:**
```bash
# Check logs
docker-compose logs -f <service-name>

# Check dependencies
docker-compose ps

# Verify environment variables
docker-compose config
```

**Database Connection Issues:**
```bash
# Test connection
telnet <host> <port>

# Check credentials
psql -h <host> -U <user> -d <database>

# Verify firewall rules
```

**High Memory Usage:**
```bash
# Check container stats
docker stats

# Increase memory limits
# Update docker-compose.yml
```

**Kafka Issues:**
```bash
# List topics
kafka-topics --list --bootstrap-server localhost:9092

# Check consumer groups
kafka-consumer-groups --list --bootstrap-server localhost:9092

# View messages
kafka-console-consumer --bootstrap-server localhost:9092 --topic order-events
```

### Performance Optimization

1. **Database:**
   - Add indexes
   - Optimize queries
   - Connection pooling
   - Read replicas

2. **Caching:**
   - Cache frequently accessed data
   - Set appropriate TTL
   - Cache invalidation strategy

3. **API:**
   - Response compression
   - Pagination
   - Rate limiting
   - Request batching

4. **Frontend:**
   - CDN for static assets
   - Image optimization
   - Code splitting
   - Lazy loading

## Production Checklist

- [ ] All services have health checks
- [ ] Database backups configured
- [ ] Monitoring and alerting set up
- [ ] TLS/SSL certificates installed
- [ ] Secrets properly managed
- [ ] Rate limiting enabled
- [ ] CORS configured correctly
- [ ] Logging centralized
- [ ] Error tracking enabled
- [ ] Load testing performed
- [ ] Disaster recovery tested
- [ ] Documentation updated
- [ ] Runbooks created
- [ ] On-call rotation established
- [ ] Security audit completed

## Next Steps

1. Set up CI/CD pipeline
2. Implement automated rollbacks
3. Add feature flags
4. Set up A/B testing
5. Implement chaos engineering
6. Add performance monitoring
7. Create admin dashboards
8. Set up customer support tools

## Support

For deployment issues:
- Check service logs
- Review health checks
- Consult troubleshooting guide
- Contact DevOps team
