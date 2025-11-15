import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { config } from './config';
import { getPool, closePool } from './database/pool';
import { OrderRepository } from './database/orderRepository';
import { OrderService } from './services/orderService';
import { EventPublisher } from './services/eventPublisher';
import { createOrderRoutes } from './routes/orderRoutes';
import { correlationIdMiddleware } from './middleware/correlation';
import { logger } from './middleware/logger';

async function main() {
  const app = express();

  // Middleware
  app.use(helmet());
  app.use(cors({ origin: config.cors.origins, credentials: true }));
  app.use(compression());
  app.use(express.json());
  app.use(cookieParser());
  app.use(correlationIdMiddleware);

  // Request logging
  app.use((req, res, next) => {
    logger.info('Incoming request', {
      method: req.method,
      path: req.path,
      correlationId: (req as any).correlationId,
    });
    next();
  });

  // Initialize database
  const pool = getPool();
  logger.info('Database pool initialized');

  // Test database connection
  try {
    await pool.query('SELECT NOW()');
    logger.info('Database connection verified');
  } catch (error) {
    logger.error('Database connection failed', { error });
    process.exit(1);
  }

  // Initialize services
  const eventPublisher = new EventPublisher();
  await eventPublisher.connect();

  const orderRepo = new OrderRepository();
  const orderService = new OrderService(orderRepo, eventPublisher);

  // Routes
  app.get('/health', async (req, res) => {
    try {
      await pool.query('SELECT 1');
      res.json({
        status: 'healthy',
        service: 'order-service',
        version: '1.0.0',
        database: 'connected',
      });
    } catch (error) {
      res.status(503).json({
        status: 'unhealthy',
        service: 'order-service',
        database: 'disconnected',
      });
    }
  });

  app.use('/api/v1/orders', createOrderRoutes(orderService));

  // Error handling
  app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    logger.error('Unhandled error', { error: err.message, stack: err.stack });
    res.status(500).json({ error: 'Internal server error' });
  });

  // Start server
  const server = app.listen(config.port, () => {
    logger.info(`Order service listening on port ${config.port}`, {
      environment: config.environment,
      port: config.port,
    });
  });

  // Graceful shutdown
  const shutdown = async () => {
    logger.info('Shutting down gracefully...');

    server.close(async () => {
      await closePool();
      await eventPublisher.disconnect();
      logger.info('Server shutdown complete');
      process.exit(0);
    });

    // Force shutdown after 10 seconds
    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

main().catch((error) => {
  logger.error('Failed to start server', { error });
  process.exit(1);
});
