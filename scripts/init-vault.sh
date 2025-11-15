#!/bin/bash
set -e

# HashiCorp Vault Initialization Script
# Initializes Vault, enables secret engines, and configures database credential rotation

# Colors
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║         HashiCorp Vault Initialization                        ║${NC}"
echo -e "${CYAN}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo ""

VAULT_ADDR=${VAULT_ADDR:-http://localhost:8200}
VAULT_TOKEN=${VAULT_TOKEN:-dev-token}

export VAULT_ADDR
export VAULT_TOKEN

# Wait for Vault to be ready
echo -e "${GREEN}[1/7] Waiting for Vault to be ready...${NC}"
until curl -sf "$VAULT_ADDR/v1/sys/health" > /dev/null 2>&1; do
    echo "Waiting for Vault..."
    sleep 2
done
echo -e "${GREEN}✓ Vault is ready${NC}"
echo ""

# Enable KV v2 secrets engine
echo -e "${GREEN}[2/7] Enabling KV v2 secrets engine...${NC}"
vault secrets enable -version=2 -path=secret kv 2>/dev/null || echo "KV engine already enabled"
echo ""

# Enable database secrets engine
echo -e "${GREEN}[3/7] Configuring database secrets engine...${NC}"
vault secrets enable database 2>/dev/null || echo "Database engine already enabled"

# Configure PostgreSQL
vault write database/config/postgresql \
    plugin_name=postgresql-database-plugin \
    allowed_roles="ecommerce-readonly,ecommerce-readwrite" \
    connection_url="postgresql://{{username}}:{{password}}@postgres:5432/ecommerce?sslmode=disable" \
    username="ecommerce" \
    password="dev_password"

# Create readonly role
vault write database/roles/ecommerce-readonly \
    db_name=postgresql \
    creation_statements="CREATE ROLE \"{{name}}\" WITH LOGIN PASSWORD '{{password}}' VALID UNTIL '{{expiration}}'; \
        GRANT SELECT ON ALL TABLES IN SCHEMA public TO \"{{name}}\";" \
    default_ttl="1h" \
    max_ttl="24h"

# Create readwrite role
vault write database/roles/ecommerce-readwrite \
    db_name=postgresql \
    creation_statements="CREATE ROLE \"{{name}}\" WITH LOGIN PASSWORD '{{password}}' VALID UNTIL '{{expiration}}'; \
        GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO \"{{name}}\";" \
    default_ttl="1h" \
    max_ttl="24h"

echo -e "${GREEN}✓ Database secrets engine configured${NC}"
echo ""

# Store application secrets
echo -e "${GREEN}[4/7] Storing application secrets...${NC}"

# Shared secrets
vault kv put secret/shared/jwt \
    secret="$(openssl rand -base64 32)" \
    algorithm="HS256" \
    expiration="24h"

vault kv put secret/shared/encryption \
    key="$(openssl rand -base64 32)" \
    algorithm="aes-256-gcm"

vault kv put secret/shared/kafka \
    brokers="kafka:9092" \
    sasl_mechanism="PLAIN"

# Catalog service secrets
vault kv put secret/catalog-service/mongodb \
    uri="mongodb://ecommerce:dev_password@mongodb:27017/catalog?authSource=admin"

vault kv put secret/catalog-service/opensearch \
    url="http://opensearch:9200" \
    username="admin" \
    password="admin"

# Cart service secrets
vault kv put secret/cart-service/redis \
    url="redis://:dev_password@redis:6379/0" \
    ttl="86400"

# Checkout service secrets
vault kv put secret/checkout-service/database \
    host="postgres" \
    port="5432" \
    database="checkout" \
    username="ecommerce" \
    password="dev_password"

# Payment service secrets (most sensitive)
vault kv put secret/payment-service/stripe \
    secret_key="sk_test_changeme" \
    publishable_key="pk_test_changeme" \
    webhook_secret="whsec_changeme"

vault kv put secret/payment-service/database \
    host="postgres" \
    port="5432" \
    database="payment" \
    username="ecommerce" \
    password="dev_password"

# Inventory service secrets
vault kv put secret/inventory-service/database \
    host="postgres" \
    port="5432" \
    database="inventory" \
    username="ecommerce" \
    password="dev_password"

# Orders service secrets
vault kv put secret/orders-service/database \
    host="postgres" \
    port="5432" \
    database="orders" \
    username="ecommerce" \
    password="dev_password"

# Accounts service secrets
vault kv put secret/accounts-service/database \
    host="postgres" \
    port="5432" \
    database="accounts" \
    username="ecommerce" \
    password="dev_password"

vault kv put secret/accounts-service/smtp \
    host="localhost" \
    port="1025" \
    from_email="noreply@ecommerce-platform.com"

echo -e "${GREEN}✓ Application secrets stored${NC}"
echo ""

# Load and apply policies
echo -e "${GREEN}[5/7] Applying Vault policies...${NC}"

if [ -f "infrastructure/vault/config/policies.hcl" ]; then
    vault policy write ecommerce-admin infrastructure/vault/config/policies.hcl
    echo -e "${GREEN}✓ Policies applied${NC}"
else
    echo -e "${YELLOW}⚠ Policies file not found${NC}"
fi
echo ""

# Enable AppRole authentication
echo -e "${GREEN}[6/7] Configuring AppRole authentication...${NC}"
vault auth enable approle 2>/dev/null || echo "AppRole already enabled"

# Create AppRole for each service
for service in catalog cart checkout payment inventory orders accounts fulfillment recommendations; do
    vault write auth/approle/role/${service}-service \
        token_policies="${service}-service" \
        token_ttl=1h \
        token_max_ttl=4h

    # Get RoleID
    ROLE_ID=$(vault read -field=role_id auth/approle/role/${service}-service/role-id)

    # Generate SecretID
    SECRET_ID=$(vault write -field=secret_id -f auth/approle/role/${service}-service/secret-id)

    echo -e "${CYAN}${service}-service:${NC} role_id=${ROLE_ID}"
done

echo -e "${GREEN}✓ AppRole authentication configured${NC}"
echo ""

# Enable audit logging
echo -e "${GREEN}[7/7] Enabling audit logging...${NC}"
vault audit enable file file_path=/vault/logs/audit.log 2>/dev/null || echo "Audit logging already enabled"
echo ""

echo -e "${GREEN}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║           Vault Initialization Complete! 🎉                   ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${CYAN}Vault is configured and ready to use${NC}"
echo ""
echo -e "${YELLOW}Important:${NC}"
echo "  • Root token: $VAULT_TOKEN"
echo "  • Vault address: $VAULT_ADDR"
echo "  • Database credentials auto-rotate every 1h"
echo "  • Audit logs: /vault/logs/audit.log"
echo ""
echo -e "${CYAN}Test database credential rotation:${NC}"
echo "  vault read database/creds/ecommerce-readonly"
echo ""
