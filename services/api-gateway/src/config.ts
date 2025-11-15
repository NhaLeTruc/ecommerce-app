// Configuration for API Gateway
import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '8000', 10),
  environment: process.env.NODE_ENV || 'development',
  otlpEndpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://otel-collector:4317',
  redisUrl: process.env.REDIS_URL || 'redis://:dev_password@redis:6379/0',
  corsOrigins: (process.env.CORS_ORIGIN || 'http://localhost:3000,http://localhost:3001').split(','),
};
