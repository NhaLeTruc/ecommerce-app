#!/bin/bash
set -e

# Kafka Topics Initialization Script
# Creates all required Kafka topics for the ecommerce platform

# Colors
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║           Kafka Topics Initialization                         ║${NC}"
echo -e "${CYAN}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo ""

KAFKA_BROKER=${KAFKA_BROKER:-localhost:9093}
PARTITIONS=${PARTITIONS:-3}
REPLICATION_FACTOR=${REPLICATION_FACTOR:-1}

# Wait for Kafka to be ready
echo -e "${GREEN}[1/2] Waiting for Kafka to be ready...${NC}"
until kafka-broker-api-versions --bootstrap-server $KAFKA_BROKER > /dev/null 2>&1; do
    echo "Waiting for Kafka..."
    sleep 2
done
echo -e "${GREEN}✓ Kafka is ready${NC}"
echo ""

# Create topics
echo -e "${GREEN}[2/2] Creating Kafka topics...${NC}"

# Topic configurations
declare -A TOPICS=(
    ["order-events"]="Event stream for order lifecycle (created, confirmed, fulfilled, cancelled)"
    ["inventory-events"]="Event stream for inventory updates (reserved, released, restocked)"
    ["payment-events"]="Event stream for payment processing (initiated, completed, failed, refunded)"
    ["user-events"]="Event stream for user activities (registered, updated, logged-in)"
    ["product-events"]="Event stream for product catalog changes (created, updated, price-changed, deleted)"
    ["cart-events"]="Event stream for cart operations (created, updated, abandoned, converted)"
    ["fulfillment-events"]="Event stream for order fulfillment (shipped, delivered, returned)"
    ["notification-events"]="Event stream for sending notifications (email, sms, push)"
    ["analytics-events"]="Event stream for analytics and business intelligence"
    ["audit-events"]="Event stream for audit logging and compliance"
)

for topic in "${!TOPICS[@]}"; do
    description="${TOPICS[$topic]}"
    echo -e "${CYAN}  → Creating topic: ${topic}${NC}"
    echo -e "     Description: ${description}"

    kafka-topics --bootstrap-server $KAFKA_BROKER \
        --create \
        --if-not-exists \
        --topic $topic \
        --partitions $PARTITIONS \
        --replication-factor $REPLICATION_FACTOR \
        --config retention.ms=604800000 \
        --config compression.type=snappy \
        --config cleanup.policy=delete \
        --config min.insync.replicas=1

    echo -e "${GREEN}  ✓ Topic created: ${topic}${NC}"
    echo ""
done

# Create compacted topics for state stores
echo -e "${CYAN}Creating compacted topics for state management...${NC}"

COMPACTED_TOPICS=(
    "product-state"
    "inventory-state"
    "cart-state"
    "order-state"
)

for topic in "${COMPACTED_TOPICS[@]}"; do
    echo -e "${CYAN}  → Creating compacted topic: ${topic}${NC}"

    kafka-topics --bootstrap-server $KAFKA_BROKER \
        --create \
        --if-not-exists \
        --topic $topic \
        --partitions $PARTITIONS \
        --replication-factor $REPLICATION_FACTOR \
        --config cleanup.policy=compact \
        --config compression.type=snappy \
        --config min.compaction.lag.ms=3600000 \
        --config delete.retention.ms=86400000

    echo -e "${GREEN}  ✓ Compacted topic created: ${topic}${NC}"
    echo ""
done

# List all topics
echo -e "${GREEN}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║         Kafka Topics Created Successfully! 🎉                  ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${CYAN}All topics:${NC}"
kafka-topics --bootstrap-server $KAFKA_BROKER --list
echo ""
echo -e "${CYAN}Topic details:${NC}"
for topic in "${!TOPICS[@]}"; do
    echo -e "  • $topic: ${PARTITIONS} partitions, ${REPLICATION_FACTOR} replicas"
done
echo ""
