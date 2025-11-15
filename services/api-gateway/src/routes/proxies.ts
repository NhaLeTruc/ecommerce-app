// Service proxy configuration
import { Express } from 'express';
import { createProxyMiddleware, Options } from 'http-proxy-middleware';
import logger from '../logger';

// Service URLs from environment or defaults
const CATALOG_SERVICE_URL = process.env.CATALOG_SERVICE_URL || 'http://localhost:8000';
const INVENTORY_SERVICE_URL = process.env.INVENTORY_SERVICE_URL || 'http://localhost:8001';
const CART_SERVICE_URL = process.env.CART_SERVICE_URL || 'http://localhost:3000';
const ORDER_SERVICE_URL = process.env.ORDER_SERVICE_URL || 'http://localhost:3001';
const PAYMENT_SERVICE_URL = process.env.PAYMENT_SERVICE_URL || 'http://localhost:8003';
const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://localhost:8084';
const NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:8085';

interface ProxyConfig {
  path: string;
  target: string;
  pathRewrite?: { [key: string]: string };
}

const proxyConfigs: ProxyConfig[] = [
  {
    path: '/api/v1/products',
    target: CATALOG_SERVICE_URL,
  },
  {
    path: '/api/v1/categories',
    target: CATALOG_SERVICE_URL,
  },
  {
    path: '/api/v1/search',
    target: CATALOG_SERVICE_URL,
  },
  {
    path: '/api/v1/inventory',
    target: INVENTORY_SERVICE_URL,
  },
  {
    path: '/api/v1/cart',
    target: CART_SERVICE_URL,
  },
  {
    path: '/api/v1/orders',
    target: ORDER_SERVICE_URL,
  },
  {
    path: '/api/v1/payments',
    target: PAYMENT_SERVICE_URL,
  },
  {
    path: '/api/v1/auth',
    target: USER_SERVICE_URL,
  },
  {
    path: '/api/v1/users',
    target: USER_SERVICE_URL,
  },
  {
    path: '/api/v1/notifications',
    target: NOTIFICATION_SERVICE_URL,
  },
];

export function setupProxies(app: Express) {
  proxyConfigs.forEach(({ path, target, pathRewrite }) => {
    const proxyOptions: Options = {
      target,
      changeOrigin: true,
      pathRewrite: pathRewrite || undefined,
      on: {
        proxyReq: (proxyReq, req, res) => {
          logger.info('Proxying request', {
            method: req.method,
            path: req.path,
            target,
          });
        },
        proxyRes: (proxyRes, req, res) => {
          logger.debug('Proxy response received', {
            statusCode: proxyRes.statusCode,
            path: req.path,
          });
        },
        error: (err, req, res) => {
          logger.error('Proxy error', {
            error: err.message,
            path: req.path,
            target,
          });

          if (res && typeof (res as any).status === 'function') {
            (res as any).status(502).json({
              error: 'Bad Gateway',
              message: `Failed to reach ${target}`,
            });
          }
        },
      },
    };

    app.use(path, createProxyMiddleware(proxyOptions));

    logger.info('Proxy route configured', {
      path,
      target,
    });
  });

  logger.info('All proxy routes configured successfully');
}
