import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { config } from '../config';
import { logger } from './logger';

/**
 * Service-to-service authentication using API keys and HMAC signatures
 */

declare global {
  namespace Express {
    interface Request {
      serviceId?: string;
      serviceName?: string;
    }
  }
}

interface ServiceCredentials {
  serviceName: string;
  apiKey: string;
  allowedEndpoints?: string[];
}

const SERVICE_REGISTRY: Record<string, ServiceCredentials> = {
  'order-service': {
    serviceName: 'order-service',
    apiKey: process.env.ORDER_SERVICE_API_KEY || 'dev-order-service-key-change-in-production',
    allowedEndpoints: ['/api/v1/cart/:userId'], // Can access carts
  },
  'inventory-service': {
    serviceName: 'inventory-service',
    apiKey: process.env.INVENTORY_SERVICE_API_KEY || 'dev-inventory-service-key-change-in-production',
    allowedEndpoints: ['/api/v1/cart/:userId/validate'], // Can validate inventory
  },
};

/**
 * Generate HMAC signature for request
 */
export function generateServiceSignature(
  method: string,
  path: string,
  body: any,
  timestamp: string,
  apiKey: string
): string {
  const payload = `${method}:${path}:${JSON.stringify(body)}:${timestamp}`;
  return crypto.createHmac('sha256', apiKey).update(payload).digest('hex');
}

/**
 * Verify HMAC signature
 */
function verifySignature(
  method: string,
  path: string,
  body: any,
  timestamp: string,
  signature: string,
  apiKey: string
): boolean {
  const expectedSignature = generateServiceSignature(method, path, body, timestamp, apiKey);

  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch {
    return false;
  }
}

/**
 * Middleware to authenticate service-to-service requests
 */
export function authenticateService(req: Request, res: Response, next: NextFunction): void {
  const serviceKey = req.headers['x-service-key'] as string;
  const signature = req.headers['x-signature'] as string;
  const timestamp = req.headers['x-timestamp'] as string;
  const serviceId = req.headers['x-service-id'] as string;

  if (!serviceKey || !signature || !timestamp || !serviceId) {
    logger.warn('Service authentication failed - missing headers', {
      path: req.path,
    });
    res.status(401).json({ error: 'Service authentication required' });
    return;
  }

  const serviceCredentials = SERVICE_REGISTRY[serviceId];
  if (!serviceCredentials) {
    logger.warn('Service authentication failed - unknown service', {
      serviceId,
    });
    res.status(401).json({ error: 'Unknown service' });
    return;
  }

  if (serviceKey !== serviceCredentials.apiKey) {
    logger.warn('Service authentication failed - invalid API key', {
      serviceId,
    });
    res.status(401).json({ error: 'Invalid service credentials' });
    return;
  }

  // Verify timestamp (5 minute window)
  const requestTime = parseInt(timestamp, 10);
  const currentTime = Date.now();
  const timeDiff = Math.abs(currentTime - requestTime);
  const MAX_TIME_DIFF = 5 * 60 * 1000;

  if (timeDiff > MAX_TIME_DIFF) {
    logger.warn('Service authentication failed - timestamp out of range', {
      serviceId,
      timeDiff,
    });
    res.status(401).json({ error: 'Request timestamp out of acceptable range' });
    return;
  }

  const isValidSignature = verifySignature(
    req.method,
    req.path,
    req.body,
    timestamp,
    signature,
    serviceCredentials.apiKey
  );

  if (!isValidSignature) {
    logger.warn('Service authentication failed - invalid signature', {
      serviceId,
    });
    res.status(401).json({ error: 'Invalid request signature' });
    return;
  }

  // Check endpoint authorization
  if (serviceCredentials.allowedEndpoints && serviceCredentials.allowedEndpoints.length > 0) {
    const isAllowed = serviceCredentials.allowedEndpoints.some(endpoint => {
      const pattern = endpoint.replace(/:\w+/g, '[^/]+');
      const regex = new RegExp(`^${pattern}$`);
      return regex.test(req.path);
    });

    if (!isAllowed) {
      logger.warn('Service authentication failed - endpoint not allowed', {
        serviceId,
        path: req.path,
      });
      res.status(403).json({ error: 'Service not authorized for this endpoint' });
      return;
    }
  }

  req.serviceId = serviceId;
  req.serviceName = serviceCredentials.serviceName;

  logger.debug('Service authenticated successfully', {
    serviceId,
    serviceName: serviceCredentials.serviceName,
  });

  next();
}

/**
 * Utility class for making authenticated service-to-service requests
 */
export class ServiceClient {
  constructor(
    private serviceId: string,
    private apiKey: string
  ) {}

  generateHeaders(method: string, path: string, body?: any): Record<string, string> {
    const timestamp = Date.now().toString();
    const signature = generateServiceSignature(method, path, body || {}, timestamp, this.apiKey);

    return {
      'X-Service-Id': this.serviceId,
      'X-Service-Key': this.apiKey,
      'X-Timestamp': timestamp,
      'X-Signature': signature,
      'Content-Type': 'application/json',
    };
  }

  async get(baseUrl: string, path: string): Promise<any> {
    const headers = this.generateHeaders('GET', path);
    const response = await fetch(`${baseUrl}${path}`, {
      method: 'GET',
      headers,
    });
    return response.json();
  }

  async post(baseUrl: string, path: string, body: any): Promise<any> {
    const headers = this.generateHeaders('POST', path, body);
    const response = await fetch(`${baseUrl}${path}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    return response.json();
  }

  async put(baseUrl: string, path: string, body: any): Promise<any> {
    const headers = this.generateHeaders('PUT', path, body);
    const response = await fetch(`${baseUrl}${path}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(body),
    });
    return response.json();
  }

  async patch(baseUrl: string, path: string, body: any): Promise<any> {
    const headers = this.generateHeaders('PATCH', path, body);
    const response = await fetch(`${baseUrl}${path}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(body),
    });
    return response.json();
  }

  async delete(baseUrl: string, path: string): Promise<any> {
    const headers = this.generateHeaders('DELETE', path);
    const response = await fetch(`${baseUrl}${path}`, {
      method: 'DELETE',
      headers,
    });
    return response.json();
  }
}

export const serviceClients = {
  orderService: new ServiceClient(
    'order-service',
    process.env.ORDER_SERVICE_API_KEY || 'dev-order-service-key-change-in-production'
  ),
  inventoryService: new ServiceClient(
    'inventory-service',
    process.env.INVENTORY_SERVICE_API_KEY || 'dev-inventory-service-key-change-in-production'
  ),
};
