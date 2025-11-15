#!/bin/bash
set -e

# Ecommerce Platform - Database Seeding Script
# Populates databases with test data for development

# Colors
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║          Ecommerce Platform - Database Seeding                ║${NC}"
echo -e "${CYAN}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Load environment variables
if [ -f .env ]; then
    source .env
fi

POSTGRES_HOST=${POSTGRES_HOST:-localhost}
POSTGRES_PORT=${POSTGRES_PORT:-5432}
POSTGRES_USER=${POSTGRES_USER:-ecommerce}
POSTGRES_PASSWORD=${POSTGRES_PASSWORD:-dev_password}

MONGO_HOST=${MONGO_HOST:-localhost}
MONGO_PORT=${MONGO_PORT:-27017}
MONGO_USER=${MONGO_USER:-ecommerce}
MONGO_PASSWORD=${MONGO_PASSWORD:-dev_password}

# =============================================================================
# Seed PostgreSQL (Inventory, Orders, Accounts, Checkout, Payment)
# =============================================================================
echo -e "${GREEN}[1/3] Seeding PostgreSQL databases...${NC}"

seed_postgres() {
    PGPASSWORD=$POSTGRES_PASSWORD psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $1 -c "$2" 2>/dev/null || \
    docker exec -i ecommerce-postgres psql -U $POSTGRES_USER -d $1 -c "$2"
}

# Inventory Service Data
echo -e "${CYAN}  → Seeding inventory database...${NC}"
seed_postgres "inventory" "
CREATE TABLE IF NOT EXISTS inventory (
    id SERIAL PRIMARY KEY,
    sku VARCHAR(100) UNIQUE NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 0,
    reserved INTEGER NOT NULL DEFAULT 0,
    available INTEGER GENERATED ALWAYS AS (quantity - reserved) STORED,
    warehouse_location VARCHAR(50),
    reorder_point INTEGER DEFAULT 10,
    reorder_quantity INTEGER DEFAULT 50,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO inventory (sku, quantity, warehouse_location) VALUES
    ('LAPTOP-001', 50, 'WH-A1'),
    ('LAPTOP-002', 30, 'WH-A1'),
    ('PHONE-001', 100, 'WH-B2'),
    ('PHONE-002', 75, 'WH-B2'),
    ('TABLET-001', 45, 'WH-C3'),
    ('HEADPHONES-001', 200, 'WH-D4'),
    ('KEYBOARD-001', 150, 'WH-D4'),
    ('MOUSE-001', 180, 'WH-D4'),
    ('MONITOR-001', 40, 'WH-A1'),
    ('WEBCAM-001', 90, 'WH-C3')
ON CONFLICT (sku) DO NOTHING;
"

echo -e "${GREEN}  ✓ Inventory data seeded${NC}"

# Orders Service Data
echo -e "${CYAN}  → Seeding orders database...${NC}"
seed_postgres "orders" "
CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    order_number VARCHAR(50) UNIQUE NOT NULL,
    user_id INTEGER NOT NULL,
    status VARCHAR(50) NOT NULL,
    total_amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    shipping_address_id INTEGER,
    billing_address_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO orders (order_number, user_id, status, total_amount) VALUES
    ('ORD-2024-0001', 1, 'delivered', 1299.99),
    ('ORD-2024-0002', 2, 'shipped', 899.99),
    ('ORD-2024-0003', 1, 'processing', 549.99),
    ('ORD-2024-0004', 3, 'pending', 799.99)
ON CONFLICT (order_number) DO NOTHING;
"

echo -e "${GREEN}  ✓ Orders data seeded${NC}"

# Accounts Service Data
echo -e "${CYAN}  → Seeding accounts database...${NC}"
seed_postgres "accounts" "
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    email_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO users (email, password_hash, first_name, last_name, email_verified) VALUES
    ('john.doe@example.com', '\$2a\$10\$abcdefghijklmnopqrstuvwxyz1234567890', 'John', 'Doe', TRUE),
    ('jane.smith@example.com', '\$2a\$10\$abcdefghijklmnopqrstuvwxyz1234567890', 'Jane', 'Smith', TRUE),
    ('bob.johnson@example.com', '\$2a\$10\$abcdefghijklmnopqrstuvwxyz1234567890', 'Bob', 'Johnson', FALSE)
ON CONFLICT (email) DO NOTHING;
"

echo -e "${GREEN}  ✓ Accounts data seeded${NC}"

echo ""

# =============================================================================
# Seed MongoDB (Catalog, Recommendations)
# =============================================================================
echo -e "${GREEN}[2/3] Seeding MongoDB databases...${NC}"

seed_mongo() {
    mongosh "mongodb://$MONGO_USER:$MONGO_PASSWORD@$MONGO_HOST:$MONGO_PORT/$1?authSource=admin" --quiet --eval "$2" 2>/dev/null || \
    docker exec -i ecommerce-mongodb mongosh -u $MONGO_USER -p $MONGO_PASSWORD --authenticationDatabase admin $1 --quiet --eval "$2"
}

# Catalog Service Data
echo -e "${CYAN}  → Seeding catalog database...${NC}"

seed_mongo "catalog" '
// Categories
db.categories.insertMany([
    {
        slug: "laptops",
        name: "Laptops",
        description: "High-performance laptops for work and play",
        parent: null,
        level: 0,
        createdAt: new Date(),
        updatedAt: new Date()
    },
    {
        slug: "smartphones",
        name: "Smartphones",
        description: "Latest smartphones with cutting-edge technology",
        parent: null,
        level: 0,
        createdAt: new Date(),
        updatedAt: new Date()
    },
    {
        slug: "tablets",
        name: "Tablets",
        description: "Versatile tablets for productivity and entertainment",
        parent: null,
        level: 0,
        createdAt: new Date(),
        updatedAt: new Date()
    },
    {
        slug: "accessories",
        name: "Accessories",
        description: "Essential accessories for your devices",
        parent: null,
        level: 0,
        createdAt: new Date(),
        updatedAt: new Date()
    }
], { ordered: false });

// Products
db.products.insertMany([
    {
        sku: "LAPTOP-001",
        name: "Professional Laptop Pro 15",
        slug: "professional-laptop-pro-15",
        description: "High-performance laptop with 15-inch display, perfect for professionals",
        price: 1299.99,
        currency: "USD",
        category: "laptops",
        brand: "TechBrand",
        images: [
            "https://placehold.co/600x400/0066CC/FFFFFF/png?text=Laptop+Pro+15"
        ],
        specifications: {
            processor: "Intel Core i7 12th Gen",
            ram: "16GB DDR4",
            storage: "512GB SSD",
            display: "15.6 inch Full HD",
            graphics: "Integrated Intel Iris Xe"
        },
        tags: ["laptop", "professional", "business"],
        rating: 4.5,
        reviewCount: 128,
        inStock: true,
        createdAt: new Date(),
        updatedAt: new Date()
    },
    {
        sku: "LAPTOP-002",
        name: "Gaming Laptop X-Force",
        slug: "gaming-laptop-x-force",
        description: "Ultimate gaming laptop with powerful graphics and high refresh rate display",
        price: 1899.99,
        currency: "USD",
        category: "laptops",
        brand: "GameTech",
        images: [
            "https://placehold.co/600x400/CC0000/FFFFFF/png?text=Gaming+Laptop"
        ],
        specifications: {
            processor: "AMD Ryzen 9",
            ram: "32GB DDR5",
            storage: "1TB NVMe SSD",
            display: "17.3 inch 144Hz",
            graphics: "NVIDIA RTX 4060"
        },
        tags: ["laptop", "gaming", "high-performance"],
        rating: 4.8,
        reviewCount: 256,
        inStock: true,
        createdAt: new Date(),
        updatedAt: new Date()
    },
    {
        sku: "PHONE-001",
        name: "SmartPhone Pro Max",
        slug: "smartphone-pro-max",
        description: "Flagship smartphone with advanced camera system and 5G connectivity",
        price: 999.99,
        currency: "USD",
        category: "smartphones",
        brand: "MobileTech",
        images: [
            "https://placehold.co/600x400/009900/FFFFFF/png?text=Phone+Pro+Max"
        ],
        specifications: {
            processor: "A16 Bionic",
            ram: "8GB",
            storage: "256GB",
            display: "6.7 inch OLED",
            camera: "48MP Triple Camera"
        },
        tags: ["smartphone", "5G", "flagship"],
        rating: 4.7,
        reviewCount: 512,
        inStock: true,
        createdAt: new Date(),
        updatedAt: new Date()
    },
    {
        sku: "PHONE-002",
        name: "Budget Phone Essential",
        slug: "budget-phone-essential",
        description: "Affordable smartphone with essential features",
        price: 299.99,
        currency: "USD",
        category: "smartphones",
        brand: "ValueTech",
        images: [
            "https://placehold.co/600x400/6600CC/FFFFFF/png?text=Budget+Phone"
        ],
        specifications: {
            processor: "MediaTek Helio G85",
            ram: "4GB",
            storage: "64GB",
            display: "6.5 inch LCD",
            camera: "13MP Dual Camera"
        },
        tags: ["smartphone", "budget", "affordable"],
        rating: 4.2,
        reviewCount: 89,
        inStock: true,
        createdAt: new Date(),
        updatedAt: new Date()
    },
    {
        sku: "TABLET-001",
        name: "Tablet Pro 11",
        slug: "tablet-pro-11",
        description: "Professional tablet with stunning display and all-day battery",
        price: 699.99,
        currency: "USD",
        category: "tablets",
        brand: "TechBrand",
        images: [
            "https://placehold.co/600x400/FF6600/FFFFFF/png?text=Tablet+Pro+11"
        ],
        specifications: {
            processor: "M1 Chip",
            ram: "8GB",
            storage: "128GB",
            display: "11 inch Liquid Retina",
            battery: "10 hours"
        },
        tags: ["tablet", "professional", "productivity"],
        rating: 4.6,
        reviewCount: 203,
        inStock: true,
        createdAt: new Date(),
        updatedAt: new Date()
    },
    {
        sku: "HEADPHONES-001",
        name: "Wireless Noise-Cancelling Headphones",
        slug: "wireless-nc-headphones",
        description: "Premium wireless headphones with active noise cancellation",
        price: 249.99,
        currency: "USD",
        category: "accessories",
        brand: "AudioTech",
        images: [
            "https://placehold.co/600x400/000000/FFFFFF/png?text=Headphones"
        ],
        specifications: {
            type: "Over-ear",
            connectivity: "Bluetooth 5.0",
            batteryLife: "30 hours",
            noiseCancellation: "Active ANC"
        },
        tags: ["headphones", "wireless", "noise-cancelling"],
        rating: 4.4,
        reviewCount: 445,
        inStock: true,
        createdAt: new Date(),
        updatedAt: new Date()
    },
    {
        sku: "KEYBOARD-001",
        name: "Mechanical Gaming Keyboard RGB",
        slug: "mechanical-gaming-keyboard",
        description: "Mechanical keyboard with customizable RGB lighting",
        price: 129.99,
        currency: "USD",
        category: "accessories",
        brand: "GameTech",
        images: [
            "https://placehold.co/600x400/CC00CC/FFFFFF/png?text=Keyboard"
        ],
        specifications: {
            switchType: "Cherry MX Red",
            backlighting: "RGB Per-key",
            connectivity: "USB-C",
            layout: "Full-size"
        },
        tags: ["keyboard", "gaming", "mechanical"],
        rating: 4.5,
        reviewCount: 312,
        inStock: true,
        createdAt: new Date(),
        updatedAt: new Date()
    },
    {
        sku: "MOUSE-001",
        name: "Wireless Gaming Mouse",
        slug: "wireless-gaming-mouse",
        description: "High-precision wireless gaming mouse with customizable buttons",
        price: 79.99,
        currency: "USD",
        category: "accessories",
        brand: "GameTech",
        images: [
            "https://placehold.co/600x400/0099CC/FFFFFF/png?text=Mouse"
        ],
        specifications: {
            dpi: "Up to 25,600",
            connectivity: "Wireless 2.4GHz",
            batteryLife: "70 hours",
            programmableButtons: 8
        },
        tags: ["mouse", "gaming", "wireless"],
        rating: 4.6,
        reviewCount: 189,
        inStock: true,
        createdAt: new Date(),
        updatedAt: new Date()
    },
    {
        sku: "MONITOR-001",
        name: "4K Gaming Monitor 27 inch",
        slug: "4k-gaming-monitor-27",
        description: "Ultra HD 4K monitor with high refresh rate for gaming",
        price: 549.99,
        currency: "USD",
        category: "accessories",
        brand: "DisplayTech",
        images: [
            "https://placehold.co/600x400/003366/FFFFFF/png?text=Monitor"
        ],
        specifications: {
            resolution: "3840x2160",
            refreshRate: "144Hz",
            size: "27 inch",
            panelType: "IPS",
            responseTime: "1ms"
        },
        tags: ["monitor", "4K", "gaming"],
        rating: 4.7,
        reviewCount: 276,
        inStock: true,
        createdAt: new Date(),
        updatedAt: new Date()
    },
    {
        sku: "WEBCAM-001",
        name: "4K Webcam Pro",
        slug: "4k-webcam-pro",
        description: "Professional 4K webcam for video conferencing and streaming",
        price: 149.99,
        currency: "USD",
        category: "accessories",
        brand: "VideoTech",
        images: [
            "https://placehold.co/600x400/660000/FFFFFF/png?text=Webcam"
        ],
        specifications: {
            resolution: "4K 30fps",
            fieldOfView: "90 degrees",
            autofocus: "Yes",
            microphone: "Dual stereo mics"
        },
        tags: ["webcam", "4K", "streaming"],
        rating: 4.3,
        reviewCount: 167,
        inStock: true,
        createdAt: new Date(),
        updatedAt: new Date()
    }
], { ordered: false });

print("✓ Catalog data seeded successfully");
'

echo -e "${GREEN}  ✓ Catalog data seeded${NC}"
echo ""

# =============================================================================
# Seed Redis (Cart data - temporary)
# =============================================================================
echo -e "${GREEN}[3/3] Seeding Redis cache...${NC}"

# Redis is typically ephemeral, so we just verify it's working
redis-cli -h ${REDIS_HOST} -p ${REDIS_PORT} -a ${REDIS_PASSWORD} PING > /dev/null 2>&1 || \
docker exec ecommerce-redis redis-cli -a ${REDIS_PASSWORD} PING > /dev/null 2>&1

if [ $? -eq 0 ]; then
    echo -e "${GREEN}  ✓ Redis is ready${NC}"
else
    echo -e "${YELLOW}  ⚠ Redis connection failed${NC}"
fi

echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║             Database Seeding Complete! 🎉                     ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${CYAN}Seeded data:${NC}"
echo "  • PostgreSQL:"
echo "    - 10 inventory items"
echo "    - 4 sample orders"
echo "    - 3 user accounts"
echo "  • MongoDB:"
echo "    - 4 product categories"
echo "    - 10 products with specifications"
echo "  • Redis:"
echo "    - Verified connectivity"
echo ""
echo -e "${YELLOW}Test credentials:${NC}"
echo "  • Email: john.doe@example.com"
echo "  • Email: jane.smith@example.com"
echo "  • (Passwords are hashed - implement authentication to use)"
echo ""
echo -e "${GREEN}Ready for development! 🚀${NC}"
