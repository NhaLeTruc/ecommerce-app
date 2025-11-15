import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  environment: process.env.NODE_ENV || 'development',

  redis: {
    host: process.env.REDIS_HOST || 'redis',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || '',
    db: parseInt(process.env.REDIS_DB || '0', 10),
  },

  kafka: {
    brokers: (process.env.KAFKA_BROKERS || 'kafka:9092').split(','),
    topic: process.env.KAFKA_TOPIC || 'cart-events',
  },

  otel: {
    endpoint: process.env.OTLP_ENDPOINT || 'otel-collector:4317',
  },

  cart: {
    ttlMinutes: parseInt(process.env.CART_TTL_MINUTES || '1440', 10), // 24 hours default
    maxItems: parseInt(process.env.CART_MAX_ITEMS || '100', 10),
    maxQuantityPerItem: parseInt(process.env.CART_MAX_QUANTITY_PER_ITEM || '10', 10),
  },

  cors: {
    origins: (process.env.CORS_ORIGINS || '*').split(','),
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'dev_jwt_secret_change_in_production',
    expiryHours: parseInt(process.env.JWT_EXPIRY_HOURS || '24', 10),
  },
};
