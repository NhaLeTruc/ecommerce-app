import winston from 'winston';
import { config } from '../config';

const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

export const logger = winston.createLogger({
  level: config.environment === 'production' ? 'info' : 'debug',
  format,
  defaultMeta: { service: 'order-service' },
  transports: [
    new winston.transports.Console({
      format: config.environment === 'production'
        ? format
        : winston.format.combine(winston.format.colorize(), winston.format.simple()),
    }),
  ],
});
