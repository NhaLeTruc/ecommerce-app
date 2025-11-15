import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import { config } from './config';
import { CartService } from './services/cartService';
import { EventPublisher } from './services/eventPublisher';
import { createCartRoutes } from './routes/cartRoutes';
import { correlationIdMiddleware } from './middleware/correlation';
import { logger } from './middleware/logger';

async function main() {
  const app = express();

  // Middleware
  app.use(helmet());
  app.use(cors({ origin: config.cors.origins, credentials: true }));
  app.use(compression());
  app.use(express.json());
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

  // Initialize services
  const eventPublisher = new EventPublisher();
  await eventPublisher.connect();

  const cartService = new CartService(eventPublisher);
  await cartService.connect();

  // Routes
  app.get('/health', (req, res) => {
    res.json({
      status: 'healthy',
      service: 'cart-service',
      version: '1.0.0',
    });
  });

  app.use('/api/v1/cart', createCartRoutes(cartService));

  // Error handling
  app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    logger.error('Unhandled error', { error: err.message, stack: err.stack });
    res.status(500).json({ error: 'Internal server error' });
  });

  // Start server
  const server = app.listen(config.port, () => {
    logger.info(`Cart service listening on port ${config.port}`, {
      environment: config.environment,
      port: config.port,
    });
  });

  // Graceful shutdown
  const shutdown = async () => {
    logger.info('Shutting down gracefully...');

    server.close(async () => {
      await cartService.disconnect();
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
