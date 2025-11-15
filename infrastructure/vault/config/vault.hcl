# HashiCorp Vault Configuration
# Secrets management for ecommerce platform

# Storage backend - file storage for development
storage "file" {
  path = "/vault/data"
}

# TCP listener
listener "tcp" {
  address       = "0.0.0.0:8200"
  tls_disable   = 1  # Disable TLS for development only
  # For production:
  # tls_cert_file = "/vault/config/tls/vault.crt"
  # tls_key_file  = "/vault/config/tls/vault.key"
}

# API address
api_addr = "http://127.0.0.1:8200"
cluster_addr = "https://127.0.0.1:8201"

# UI
ui = true

# Telemetry
telemetry {
  prometheus_retention_time = "30s"
  disable_hostname = false
}

# Max lease TTL
max_lease_ttl = "768h"
default_lease_ttl = "768h"

# Plugin directory
plugin_directory = "/vault/plugins"

# Log level
log_level = "info"
