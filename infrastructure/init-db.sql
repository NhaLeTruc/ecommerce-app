-- Initialize PostgreSQL databases for all services

-- Create databases
CREATE DATABASE inventory_db;
CREATE DATABASE orders_db;
CREATE DATABASE payments_db;
CREATE DATABASE users_db;

-- Connect to inventory_db and create schema
\c inventory_db;

CREATE TABLE IF NOT EXISTS inventory (
    id VARCHAR(36) PRIMARY KEY,
    sku VARCHAR(100) UNIQUE NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 0,
    reserved_quantity INTEGER NOT NULL DEFAULT 0,
    available_quantity INTEGER GENERATED ALWAYS AS (quantity - reserved_quantity) STORED,
    location VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_inventory_sku ON inventory(sku);
CREATE INDEX idx_inventory_available ON inventory(available_quantity);

-- Insert sample inventory data matching MongoDB products
INSERT INTO inventory (id, sku, quantity, reserved_quantity, location, created_at, updated_at) VALUES
('inv-001', 'LAPTOP-001', 25, 0, 'Warehouse A', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('inv-002', 'LAPTOP-002', 15, 0, 'Warehouse A', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('inv-003', 'MOUSE-001', 150, 0, 'Warehouse B', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('inv-004', 'KEYBOARD-001', 80, 0, 'Warehouse B', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('inv-005', 'HEADSET-001', 60, 0, 'Warehouse C', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('inv-006', 'MONITOR-001', 40, 0, 'Warehouse A', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('inv-007', 'WEBCAM-001', 90, 0, 'Warehouse B', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('inv-008', 'SPEAKER-001', 70, 0, 'Warehouse C', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('inv-009', 'TABLET-001', 35, 0, 'Warehouse A', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('inv-010', 'ROUTER-001', 45, 0, 'Warehouse B', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('inv-011', 'SSD-001', 120, 0, 'Warehouse B', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('inv-012', 'CHAIR-001', 30, 0, 'Warehouse C', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (sku) DO NOTHING;

-- Connect to orders_db and create schema
\c orders_db;

CREATE TABLE IF NOT EXISTS orders (
    id VARCHAR(36) PRIMARY KEY,
    order_number VARCHAR(20) UNIQUE NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    subtotal DECIMAL(10, 2) NOT NULL,
    tax_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    shipping_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    total_amount DECIMAL(10, 2) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    payment_status VARCHAR(20) NOT NULL DEFAULT 'pending',
    payment_method VARCHAR(50),
    shipping_address JSONB NOT NULL,
    billing_address JSONB NOT NULL,
    tracking_number VARCHAR(100),
    carrier VARCHAR(50),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS order_items (
    id VARCHAR(36) PRIMARY KEY,
    order_id VARCHAR(36) NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id VARCHAR(36) NOT NULL,
    sku VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    quantity INTEGER NOT NULL,
    image_url TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX idx_order_items_order_id ON order_items(order_id);

-- Connect to payments_db and create schema
\c payments_db;

CREATE TABLE IF NOT EXISTS payments (
    id VARCHAR(36) PRIMARY KEY,
    order_id VARCHAR(36) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    payment_method VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    transaction_id VARCHAR(255),
    gateway_response JSONB,
    error_message TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_payments_order_id ON payments(order_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_created_at ON payments(created_at DESC);

-- Connect to users_db and create schema
\c users_db;

CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    role VARCHAR(20) NOT NULL DEFAULT 'customer',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- Insert default admin user (password: admin123)
-- Password hash generated with bcrypt cost 12
INSERT INTO users (id, email, password_hash, first_name, last_name, role, is_active, created_at, updated_at)
VALUES (
    'admin-001',
    'admin@ecommerce.local',
    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYBq.lEXB1u',
    'Admin',
    'User',
    'admin',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT (email) DO NOTHING;

-- Insert demo customer user (password: customer123)
INSERT INTO users (id, email, password_hash, first_name, last_name, phone, role, is_active, created_at, updated_at)
VALUES (
    'customer-001',
    'customer@ecommerce.local',
    '$2a$12$K9Z8W4qQwQb.Xw2YFa7m7.fY3zqPJQZ2kX1Y5YQa7m7.fY3zqPJQZ',
    'John',
    'Doe',
    '+1-555-0123',
    'customer',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT (email) DO NOTHING;
