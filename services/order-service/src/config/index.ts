import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  environment: process.env.NODE_ENV || 'development',

  database: {
    host: process.env.DB_HOST || 'postgres',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME || 'ecommerce',
    user: process.env.DB_USER || 'ecommerce',
    password: process.env.DB_PASSWORD || 'dev_password',
    max: parseInt(process.env.DB_POOL_MAX || '20', 10),
    idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000', 10),
  },

  kafka: {
    brokers: (process.env.KAFKA_BROKERS || 'kafka:9092').split(','),
    topic: process.env.KAFKA_TOPIC || 'order-events',
  },

  services: {
    inventoryUrl: process.env.INVENTORY_SERVICE_URL || 'http://inventory-service:8080',
    paymentUrl: process.env.PAYMENT_SERVICE_URL || 'http://payment-service:8001',
    cartUrl: process.env.CART_SERVICE_URL || 'http://cart-service:3000',
  },

  otel: {
    endpoint: process.env.OTLP_ENDPOINT || 'otel-collector:4317',
  },

  order: {
    taxRate: parseFloat(process.env.TAX_RATE || '0.08'), // 8% default
    shippingFlatRate: parseFloat(process.env.SHIPPING_FLAT_RATE || '9.99'),
  },

  cors: {
    origins: (process.env.CORS_ORIGINS || '*').split(','),
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'dev_jwt_secret_change_in_production',
    expiryHours: parseInt(process.env.JWT_EXPIRY_HOURS || '24', 10),
  },
};
