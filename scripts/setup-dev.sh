#!/bin/bash
set -e

# Ecommerce Platform - Development Environment Setup
# This script sets up the complete development environment in one command

# Colors
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║   Ecommerce Platform - Development Environment Setup         ║${NC}"
echo -e "${CYAN}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"

cd "$PROJECT_ROOT"

# =============================================================================
# Step 1: Check Prerequisites
# =============================================================================
echo -e "${GREEN}[1/8] Checking prerequisites...${NC}"

check_command() {
    if ! command -v $1 &> /dev/null; then
        echo -e "${RED}✗ $1 is not installed${NC}"
        return 1
    else
        echo -e "${GREEN}✓ $1 is installed${NC}"
        return 0
    fi
}

MISSING_DEPS=0

check_command "docker" || MISSING_DEPS=$((MISSING_DEPS + 1))
check_command "docker-compose" || check_command "docker compose" || MISSING_DEPS=$((MISSING_DEPS + 1))
check_command "git" || MISSING_DEPS=$((MISSING_DEPS + 1))
check_command "make" || MISSING_DEPS=$((MISSING_DEPS + 1))

# Optional but recommended
check_command "node" || echo -e "${YELLOW}⚠ Node.js not found (optional for local dev)${NC}"
check_command "go" || echo -e "${YELLOW}⚠ Go not found (optional for local dev)${NC}"
check_command "python3" || echo -e "${YELLOW}⚠ Python 3 not found (optional for local dev)${NC}"

if [ $MISSING_DEPS -gt 0 ]; then
    echo -e "${RED}✗ Missing $MISSING_DEPS required dependencies${NC}"
    echo -e "${YELLOW}Please install the missing dependencies and try again${NC}"
    exit 1
fi

echo ""

# =============================================================================
# Step 2: Create .env file
# =============================================================================
echo -e "${GREEN}[2/8] Setting up environment configuration...${NC}"

if [ -f ".env" ]; then
    echo -e "${YELLOW}⚠ .env file already exists, skipping...${NC}"
else
    cp .env.example .env
    echo -e "${GREEN}✓ Created .env from .env.example${NC}"
    echo -e "${YELLOW}⚠ Please review and update .env with your configuration${NC}"
fi

echo ""

# =============================================================================
# Step 3: Create necessary directories
# =============================================================================
echo -e "${GREEN}[3/8] Creating project directories...${NC}"

mkdir -p logs
mkdir -p data/{postgres,mongodb,redis,opensearch}
mkdir -p infrastructure/docker-compose/init-scripts/{postgres,mongo}
mkdir -p observability/{prometheus,grafana/dashboards,grafana/datasources}
mkdir -p infrastructure/{kong,vault/config,kafka,rabbitmq}

echo -e "${GREEN}✓ Directories created${NC}"
echo ""

# =============================================================================
# Step 4: Generate TLS certificates (for development)
# =============================================================================
echo -e "${GREEN}[4/8] Generating TLS certificates...${NC}"

if [ ! -f "infrastructure/certs/server.crt" ]; then
    mkdir -p infrastructure/certs

    # Generate self-signed certificate for development
    openssl req -x509 -newkey rsa:4096 \
        -keyout infrastructure/certs/server.key \
        -out infrastructure/certs/server.crt \
        -days 365 -nodes \
        -subj "/C=US/ST=State/L=City/O=Ecommerce/CN=localhost" \
        2>/dev/null || echo -e "${YELLOW}⚠ OpenSSL not available, skipping cert generation${NC}"

    if [ -f "infrastructure/certs/server.crt" ]; then
        echo -e "${GREEN}✓ TLS certificates generated${NC}"
    fi
else
    echo -e "${YELLOW}⚠ TLS certificates already exist, skipping...${NC}"
fi

echo ""

# =============================================================================
# Step 5: Create Docker init scripts
# =============================================================================
echo -e "${GREEN}[5/8] Creating database initialization scripts...${NC}"

# PostgreSQL init script
cat > infrastructure/docker-compose/init-scripts/postgres/01-init.sql <<'EOF'
-- Create databases for different services
CREATE DATABASE IF NOT EXISTS inventory;
CREATE DATABASE IF NOT EXISTS orders;
CREATE DATABASE IF NOT EXISTS accounts;
CREATE DATABASE IF NOT EXISTS checkout;
CREATE DATABASE IF NOT EXISTS payment;

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE inventory TO ecommerce;
GRANT ALL PRIVILEGES ON DATABASE orders TO ecommerce;
GRANT ALL PRIVILEGES ON DATABASE accounts TO ecommerce;
GRANT ALL PRIVILEGES ON DATABASE checkout TO ecommerce;
GRANT ALL PRIVILEGES ON DATABASE payment TO ecommerce;
EOF

# MongoDB init script
cat > infrastructure/docker-compose/init-scripts/mongo/01-init.js <<'EOF'
// Create databases and collections
db = db.getSiblingDB('catalog');
db.createCollection('products');
db.createCollection('categories');
db.createCollection('reviews');

// Create indexes
db.products.createIndex({ sku: 1 }, { unique: true });
db.products.createIndex({ name: "text", description: "text" });
db.products.createIndex({ category: 1 });
db.categories.createIndex({ slug: 1 }, { unique: true });
EOF

echo -e "${GREEN}✓ Database initialization scripts created${NC}"
echo ""

# =============================================================================
# Step 6: Create Kafka topics initialization script
# =============================================================================
echo -e "${GREEN}[6/8] Creating Kafka configuration...${NC}"

cat > infrastructure/kafka/create-topics.sh <<'EOF'
#!/bin/bash
# Wait for Kafka to be ready
sleep 10

# Create topics
kafka-topics --bootstrap-server localhost:9092 --create --if-not-exists --topic order-events --partitions 3 --replication-factor 1
kafka-topics --bootstrap-server localhost:9092 --create --if-not-exists --topic inventory-events --partitions 3 --replication-factor 1
kafka-topics --bootstrap-server localhost:9092 --create --if-not-exists --topic payment-events --partitions 3 --replication-factor 1
kafka-topics --bootstrap-server localhost:9092 --create --if-not-exists --topic user-events --partitions 3 --replication-factor 1
kafka-topics --bootstrap-server localhost:9092 --create --if-not-exists --topic product-events --partitions 3 --replication-factor 1

echo "Kafka topics created successfully"
EOF

chmod +x infrastructure/kafka/create-topics.sh

echo -e "${GREEN}✓ Kafka configuration created${NC}"
echo ""

# =============================================================================
# Step 7: Create Kong configuration
# =============================================================================
echo -e "${GREEN}[7/8] Creating Kong Gateway configuration...${NC}"

cat > infrastructure/kong/kong.yml <<'EOF'
_format_version: "3.0"

services:
  - name: catalog-service
    url: http://host.docker.internal:5001
    routes:
      - name: catalog-route
        paths:
          - /api/catalog
        strip_path: true

  - name: cart-service
    url: http://host.docker.internal:5002
    routes:
      - name: cart-route
        paths:
          - /api/cart
        strip_path: true

  - name: checkout-service
    url: http://host.docker.internal:5003
    routes:
      - name: checkout-route
        paths:
          - /api/checkout
        strip_path: true

plugins:
  - name: rate-limiting
    config:
      minute: 100
      policy: local

  - name: cors
    config:
      origins:
        - http://localhost:3000
        - http://localhost:3001
      methods:
        - GET
        - POST
        - PUT
        - DELETE
        - PATCH
        - OPTIONS
      headers:
        - Accept
        - Authorization
        - Content-Type
        - X-Correlation-ID
      credentials: true
EOF

echo -e "${GREEN}✓ Kong configuration created${NC}"
echo ""

# =============================================================================
# Step 8: Start Docker infrastructure
# =============================================================================
echo -e "${GREEN}[8/8] Starting Docker infrastructure...${NC}"

cd infrastructure/docker-compose

# Pull images first
echo -e "${CYAN}Pulling Docker images...${NC}"
docker-compose pull

# Start services
echo -e "${CYAN}Starting services...${NC}"
docker-compose up -d

# Wait for services to be healthy
echo -e "${CYAN}Waiting for services to be ready...${NC}"
sleep 10

# Check service health
echo ""
echo -e "${CYAN}Checking service health:${NC}"

check_service() {
    SERVICE_NAME=$1
    URL=$2

    if curl -sf "$URL" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ $SERVICE_NAME is healthy${NC}"
    else
        echo -e "${YELLOW}⚠ $SERVICE_NAME is not responding yet${NC}"
    fi
}

check_service "Kong API Gateway" "http://localhost:8001/status"
check_service "Prometheus" "http://localhost:9090/-/healthy"
check_service "Grafana" "http://localhost:3000/api/health"
check_service "Jaeger" "http://localhost:16686"

echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║              Setup Complete! 🎉                                ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${CYAN}Services running at:${NC}"
echo "  • Kong API Gateway:    http://localhost:8000"
echo "  • Kong Admin API:      http://localhost:8001"
echo "  • PostgreSQL:          localhost:5432"
echo "  • MongoDB:             localhost:27017"
echo "  • Redis:               localhost:6379"
echo "  • OpenSearch:          http://localhost:9200"
echo "  • Kafka:               localhost:9093"
echo "  • RabbitMQ:            localhost:5672"
echo "  • RabbitMQ Management: http://localhost:15672"
echo "  • Prometheus:          http://localhost:9090"
echo "  • Grafana:             http://localhost:3000 (admin/admin)"
echo "  • Jaeger UI:           http://localhost:16686"
echo "  • Vault:               http://localhost:8200"
echo "  • Adminer:             http://localhost:8080"
echo "  • MailHog:             http://localhost:8025"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "  1. Review and update .env file with your configuration"
echo "  2. Run 'make seed' to populate test data"
echo "  3. Start developing your services"
echo "  4. Run 'make test' to execute tests"
echo "  5. Run 'make validate' before committing code"
echo ""
echo -e "${CYAN}Common commands:${NC}"
echo "  • make help          - Show all available commands"
echo "  • make dev           - Start development environment"
echo "  • make dev-stop      - Stop development environment"
echo "  • make test          - Run all tests"
echo "  • make lint          - Run linters"
echo "  • make logs-tail     - View application logs"
echo ""
echo -e "${GREEN}Happy coding! 🚀${NC}"
