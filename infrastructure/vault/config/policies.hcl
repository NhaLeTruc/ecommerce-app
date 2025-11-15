# Vault Policies for Ecommerce Services

# ==========================================================================
# Database Credentials Policy
# ==========================================================================

path "database/creds/ecommerce-*" {
  capabilities = ["read"]
}

path "database/config/*" {
  capabilities = ["read", "list"]
}

# ==========================================================================
# Service-Specific Policies
# ==========================================================================

# Catalog Service
path "secret/data/catalog-service/*" {
  capabilities = ["read", "list"]
}

path "database/creds/catalog-readonly" {
  capabilities = ["read"]
}

# Cart Service
path "secret/data/cart-service/*" {
  capabilities = ["read", "list"]
}

path "database/creds/cart-readwrite" {
  capabilities = ["read"]
}

# Checkout Service
path "secret/data/checkout-service/*" {
  capabilities = ["read", "list"]
}

path "database/creds/checkout-readwrite" {
  capabilities = ["read"]
}

# Payment Service (most restrictive)
path "secret/data/payment-service/*" {
  capabilities = ["read", "list"]
}

path "secret/data/payment-service/stripe/*" {
  capabilities = ["read"]
}

path "database/creds/payment-readwrite" {
  capabilities = ["read"]
}

# Inventory Service
path "secret/data/inventory-service/*" {
  capabilities = ["read", "list"]
}

path "database/creds/inventory-readwrite" {
  capabilities = ["read"]
}

# Orders Service
path "secret/data/orders-service/*" {
  capabilities = ["read", "list"]
}

path "database/creds/orders-readwrite" {
  capabilities = ["read"]
}

# Accounts Service
path "secret/data/accounts-service/*" {
  capabilities = ["read", "list"]
}

path "database/creds/accounts-readwrite" {
  capabilities = ["read"]
}

# Fulfillment Service
path "secret/data/fulfillment-service/*" {
  capabilities = ["read", "list"]
}

# Recommendations Service
path "secret/data/recommendations-service/*" {
  capabilities = ["read", "list"]
}

# ==========================================================================
# Shared Secrets
# ==========================================================================

path "secret/data/shared/jwt" {
  capabilities = ["read"]
}

path "secret/data/shared/encryption" {
  capabilities = ["read"]
}

path "secret/data/shared/kafka" {
  capabilities = ["read"]
}

path "secret/data/shared/rabbitmq" {
  capabilities = ["read"]
}

# ==========================================================================
# Admin Policy
# ==========================================================================

path "secret/*" {
  capabilities = ["create", "read", "update", "delete", "list"]
}

path "database/*" {
  capabilities = ["create", "read", "update", "delete", "list"]
}

path "sys/policies/*" {
  capabilities = ["create", "read", "update", "delete", "list"]
}

path "auth/*" {
  capabilities = ["create", "read", "update", "delete", "list", "sudo"]
}
