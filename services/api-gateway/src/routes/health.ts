// Health check endpoints for API Gateway
import { Router } from 'express';
import Redis from 'ioredis';
import { config } from '../config';

const router = Router();
const redis = new Redis(config.redisUrl);

// Liveness probe - is the service running?
router.get('/live', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'api-gateway',
    timestamp: new Date().toISOString(),
  });
});

// Readiness probe - is the service ready to accept traffic?
router.get('/ready', async (req, res) => {
  try {
    // Check Redis connectivity
    await redis.ping();

    res.status(200).json({
      status: 'ready',
      service: 'api-gateway',
      checks: {
        redis: 'ok',
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      status: 'not_ready',
      service: 'api-gateway',
      checks: {
        redis: 'failed',
      },
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
});

// Aggregated health check for all downstream services
router.get('/', async (req, res) => {
  // TODO: Implement health aggregation for all services
  res.status(200).json({
    status: 'ok',
    service: 'api-gateway',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

export { router as healthRouter };
