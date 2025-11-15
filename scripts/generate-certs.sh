#!/bin/bash
set -e

# TLS Certificates Generation Script
# Generates self-signed certificates for development environment

# Colors
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║         TLS Certificates Generation                           ║${NC}"
echo -e "${CYAN}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo ""

CERTS_DIR="infrastructure/certs"
mkdir -p "$CERTS_DIR"

# Configuration
COUNTRY="US"
STATE="California"
CITY="San Francisco"
ORG="Ecommerce Platform"
OU="Development"
DAYS_VALID=365

echo -e "${GREEN}[1/6] Generating Certificate Authority (CA)...${NC}"

# Generate CA private key
openssl genrsa -out "$CERTS_DIR/ca.key" 4096

# Generate CA certificate
openssl req -new -x509 -days $DAYS_VALID -key "$CERTS_DIR/ca.key" -out "$CERTS_DIR/ca.crt" \
    -subj "/C=$COUNTRY/ST=$STATE/L=$CITY/O=$ORG/OU=$OU/CN=Ecommerce Platform CA"

echo -e "${GREEN}✓ CA certificate generated${NC}"
echo ""

# Service certificates
SERVICES=(
    "api-gateway:localhost,api-gateway,kong"
    "catalog-service:localhost,catalog-service"
    "cart-service:localhost,cart-service"
    "checkout-service:localhost,checkout-service"
    "payment-service:localhost,payment-service"
    "inventory-service:localhost,inventory-service"
    "orders-service:localhost,orders-service"
    "accounts-service:localhost,accounts-service"
    "fulfillment-service:localhost,fulfillment-service"
    "recommendations-service:localhost,recommendations-service"
)

echo -e "${GREEN}[2/6] Generating service certificates...${NC}"

for service_entry in "${SERVICES[@]}"; do
    IFS=':' read -r SERVICE_NAME SANS <<< "$service_entry"

    echo -e "${CYAN}  → Generating certificate for $SERVICE_NAME...${NC}"

    # Create OpenSSL config for SAN
    cat > "$CERTS_DIR/$SERVICE_NAME.cnf" <<EOF
[req]
default_bits = 2048
prompt = no
default_md = sha256
req_extensions = req_ext
distinguished_name = dn

[dn]
C = $COUNTRY
ST = $STATE
L = $CITY
O = $ORG
OU = $OU
CN = $SERVICE_NAME

[req_ext]
subjectAltName = @alt_names

[alt_names]
EOF

    # Add SAN entries
    INDEX=1
    IFS=',' read -ra SAN_ARRAY <<< "$SANS"
    for san in "${SAN_ARRAY[@]}"; do
        echo "DNS.$INDEX = $san" >> "$CERTS_DIR/$SERVICE_NAME.cnf"
        INDEX=$((INDEX + 1))
    done

    # Generate private key
    openssl genrsa -out "$CERTS_DIR/$SERVICE_NAME.key" 2048

    # Generate CSR
    openssl req -new -key "$CERTS_DIR/$SERVICE_NAME.key" \
        -out "$CERTS_DIR/$SERVICE_NAME.csr" \
        -config "$CERTS_DIR/$SERVICE_NAME.cnf"

    # Sign with CA
    openssl x509 -req -in "$CERTS_DIR/$SERVICE_NAME.csr" \
        -CA "$CERTS_DIR/ca.crt" -CAkey "$CERTS_DIR/ca.key" -CAcreateserial \
        -out "$CERTS_DIR/$SERVICE_NAME.crt" -days $DAYS_VALID \
        -extensions req_ext -extfile "$CERTS_DIR/$SERVICE_NAME.cnf"

    # Clean up CSR and config
    rm "$CERTS_DIR/$SERVICE_NAME.csr" "$CERTS_DIR/$SERVICE_NAME.cnf"
done

echo -e "${GREEN}✓ Service certificates generated${NC}"
echo ""

echo -e "${GREEN}[3/6] Generating database certificates...${NC}"

for db in postgres mongodb redis; do
    echo -e "${CYAN}  → Generating certificate for $db...${NC}"

    openssl genrsa -out "$CERTS_DIR/$db.key" 2048

    openssl req -new -key "$CERTS_DIR/$db.key" -out "$CERTS_DIR/$db.csr" \
        -subj "/C=$COUNTRY/ST=$STATE/L=$CITY/O=$ORG/OU=$OU/CN=$db"

    openssl x509 -req -in "$CERTS_DIR/$db.csr" \
        -CA "$CERTS_DIR/ca.crt" -CAkey "$CERTS_DIR/ca.key" -CAcreateserial \
        -out "$CERTS_DIR/$db.crt" -days $DAYS_VALID

    rm "$CERTS_DIR/$db.csr"
done

echo -e "${GREEN}✓ Database certificates generated${NC}"
echo ""

echo -e "${GREEN}[4/6] Generating wildcard certificate (*.ecommerce.local)...${NC}"

# Create wildcard config
cat > "$CERTS_DIR/wildcard.cnf" <<EOF
[req]
default_bits = 2048
prompt = no
default_md = sha256
req_extensions = req_ext
distinguished_name = dn

[dn]
C = $COUNTRY
ST = $STATE
L = $CITY
O = $ORG
OU = $OU
CN = *.ecommerce.local

[req_ext]
subjectAltName = @alt_names

[alt_names]
DNS.1 = *.ecommerce.local
DNS.2 = ecommerce.local
DNS.3 = localhost
EOF

openssl genrsa -out "$CERTS_DIR/wildcard.key" 2048

openssl req -new -key "$CERTS_DIR/wildcard.key" -out "$CERTS_DIR/wildcard.csr" \
    -config "$CERTS_DIR/wildcard.cnf"

openssl x509 -req -in "$CERTS_DIR/wildcard.csr" \
    -CA "$CERTS_DIR/ca.crt" -CAkey "$CERTS_DIR/ca.key" -CAcreateserial \
    -out "$CERTS_DIR/wildcard.crt" -days $DAYS_VALID \
    -extensions req_ext -extfile "$CERTS_DIR/wildcard.cnf"

rm "$CERTS_DIR/wildcard.csr" "$CERTS_DIR/wildcard.cnf"

echo -e "${GREEN}✓ Wildcard certificate generated${NC}"
echo ""

echo -e "${GREEN}[5/6] Generating client certificates...${NC}"

for client in admin developer; do
    echo -e "${CYAN}  → Generating client certificate for $client...${NC}"

    openssl genrsa -out "$CERTS_DIR/client-$client.key" 2048

    openssl req -new -key "$CERTS_DIR/client-$client.key" \
        -out "$CERTS_DIR/client-$client.csr" \
        -subj "/C=$COUNTRY/ST=$STATE/L=$CITY/O=$ORG/OU=$OU/CN=$client"

    openssl x509 -req -in "$CERTS_DIR/client-$client.csr" \
        -CA "$CERTS_DIR/ca.crt" -CAkey "$CERTS_DIR/ca.key" -CAcreateserial \
        -out "$CERTS_DIR/client-$client.crt" -days $DAYS_VALID

    rm "$CERTS_DIR/client-$client.csr"
done

echo -e "${GREEN}✓ Client certificates generated${NC}"
echo ""

echo -e "${GREEN}[6/6] Setting permissions...${NC}"

chmod 600 "$CERTS_DIR"/*.key
chmod 644 "$CERTS_DIR"/*.crt

echo -e "${GREEN}✓ Permissions set${NC}"
echo ""

echo -e "${GREEN}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║         Certificate Generation Complete! 🎉                   ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${CYAN}Generated certificates:${NC}"
echo "  • CA certificate: $CERTS_DIR/ca.crt"
echo "  • CA private key: $CERTS_DIR/ca.key"
echo "  • 10 service certificates (api-gateway, services)"
echo "  • 3 database certificates (postgres, mongodb, redis)"
echo "  • 1 wildcard certificate (*.ecommerce.local)"
echo "  • 2 client certificates (admin, developer)"
echo ""
echo -e "${YELLOW}Important:${NC}"
echo "  • These are self-signed certificates for DEVELOPMENT ONLY"
echo "  • For production, use certificates from a trusted CA (Let's Encrypt, DigiCert, etc.)"
echo "  • Add ca.crt to your system's trusted certificates to avoid browser warnings"
echo ""
echo -e "${CYAN}To trust the CA on macOS:${NC}"
echo "  sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain $CERTS_DIR/ca.crt"
echo ""
echo -e "${CYAN}To trust the CA on Linux:${NC}"
echo "  sudo cp $CERTS_DIR/ca.crt /usr/local/share/ca-certificates/ecommerce-ca.crt"
echo "  sudo update-ca-certificates"
echo ""
