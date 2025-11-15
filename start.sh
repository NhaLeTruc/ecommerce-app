#!/bin/bash

# Ecommerce Platform Startup Script
# This script starts all microservices using Docker Compose

set -e

echo "=================================="
echo "Ecommerce Platform - Startup"
echo "=================================="
echo ""

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}Error: Docker is not running${NC}"
    echo "Please start Docker and try again"
    exit 1
fi

# Check if Docker Compose is available
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}Error: docker-compose is not installed${NC}"
    echo "Please install docker-compose and try again"
    exit 1
fi

echo -e "${BLUE}Starting Ecommerce Platform...${NC}"
echo ""

# Pull latest images (optional, comment out if not needed)
echo -e "${YELLOW}Pulling latest images...${NC}"
docker-compose pull

echo ""
echo -e "${YELLOW}Starting services...${NC}"

# Start all services
docker-compose up -d

echo ""
echo -e "${GREEN}Services started!${NC}"
echo ""

# Wait for services to be healthy
echo -e "${YELLOW}Waiting for services to be healthy...${NC}"
echo "This may take 1-2 minutes..."
echo ""

# Function to check service health
check_health() {
    local service=$1
    local max_attempts=30
    local attempt=1

    while [ $attempt -le $max_attempts ]; do
        if docker-compose ps | grep $service | grep -q "healthy\|running"; then
            echo -e "${GREEN}✓${NC} $service is ready"
            return 0
        fi
        sleep 2
        attempt=$((attempt + 1))
    done

    echo -e "${RED}✗${NC} $service failed to start"
    return 1
}

# Check critical services
check_health "postgres"
check_health "mongodb"
check_health "redis"
check_health "kafka"
check_health "opensearch"

echo ""
echo -e "${BLUE}Backend services starting...${NC}"
sleep 5

check_health "catalog-service"
check_health "inventory-service"
check_health "cart-service"
check_health "order-service"
check_health "payment-service"
check_health "user-service"

echo ""
echo "=================================="
echo -e "${GREEN}Platform Ready!${NC}"
echo "=================================="
echo ""
echo "Access the platform:"
echo ""
echo -e "  Customer Web:  ${BLUE}http://localhost:3001${NC}"
echo -e "  Catalog API:   ${BLUE}http://localhost:8000${NC}"
echo -e "  User Auth API: ${BLUE}http://localhost:8084${NC}"
echo -e "  MailHog UI:    ${BLUE}http://localhost:8025${NC}"
echo ""
echo "Demo accounts:"
echo -e "  ${GREEN}Admin:${NC}    admin@ecommerce.local / admin123"
echo -e "  ${GREEN}Customer:${NC} customer@ecommerce.local / customer123"
echo ""
echo "Useful commands:"
echo -e "  View logs:    ${YELLOW}docker-compose logs -f${NC}"
echo -e "  Stop all:     ${YELLOW}./stop.sh${NC}"
echo -e "  Service list: ${YELLOW}docker-compose ps${NC}"
echo ""
echo "=================================="
