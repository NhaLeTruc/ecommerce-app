// API Gateway - Main Entry Point
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';
import { config } from './config';
import { logger } from './logger';
import { correlationIdMiddleware } from '../../../shared/nodejs/middleware/correlation';
import { initTelemetry } from '../../../shared/nodejs/otel';
import { healthRouter } from './routes/health';
import { setupProxies } from './routes/proxies';

// Initialize OpenTelemetry
initTelemetry({
  serviceName: 'api-gateway',
  serviceVersion: '1.0.0',
  environment: config.environment,
  otlpEndpoint: config.otlpEndpoint,
});

const app = express();

// Security middleware
app.use(helmet());

// CORS
app.use(cors({
  origin: config.corsOrigins,
  credentials: true,
}));

// Compression
app.use(compression());

// Request logging
app.use(morgan('combined', {
  stream: { write: (message) => logger.info(message.trim()) },
}));

// Correlation ID
app.use(correlationIdMiddleware);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check routes
app.use('/health', healthRouter);

// Setup service proxies
setupProxies(app);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`,
    correlationId: req.correlationId,
  });
});

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error', { error: err, correlationId: req.correlationId });

  res.status(err.status || 500).json({
    error: err.name || 'Internal Server Error',
    message: err.message || 'An unexpected error occurred',
    correlationId: req.correlationId,
  });
});

// Start server
const PORT = config.port;
app.listen(PORT, () => {
  logger.info(`API Gateway listening on port ${PORT}`);
  logger.info(`Environment: ${config.environment}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});
