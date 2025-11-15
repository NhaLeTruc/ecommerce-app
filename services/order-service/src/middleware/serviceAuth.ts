import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { config } from '../config';
import { logger } from './logger';

/**
 * Service-to-service authentication using API keys and HMAC signatures
 *
 * This middleware validates requests from other microservices by:
 * 1. Checking the X-Service-Key header against known service API keys
 * 2. Verifying the HMAC signature in X-Signature header
 * 3. Validating the timestamp to prevent replay attacks
 */

// Extend Express Request to include service metadata
declare global {
  namespace Express {
    interface Request {
      serviceId?: string;
      serviceName?: string;
    }
  }
}

/**
 * Service registry with API keys
 * In production, store these in environment variables or secret management system
 */
interface ServiceCredentials {
  serviceName: string;
  apiKey: string;
  allowedEndpoints?: string[];
}

const SERVICE_REGISTRY: Record<string, ServiceCredentials> = {
  'cart-service': {
    serviceName: 'cart-service',
    apiKey: process.env.CART_SERVICE_API_KEY || 'dev-cart-service-key-change-in-production',
    allowedEndpoints: ['/api/v1/orders'], // Can create orders
  },
  'payment-service': {
    serviceName: 'payment-service',
    apiKey: process.env.PAYMENT_SERVICE_API_KEY || 'dev-payment-service-key-change-in-production',
    allowedEndpoints: ['/api/v1/orders/:orderId/payment'], // Can update payment status
  },
  'inventory-service': {
    serviceName: 'inventory-service',
    apiKey: process.env.INVENTORY_SERVICE_API_KEY || 'dev-inventory-service-key-change-in-production',
    allowedEndpoints: ['/api/v1/orders/:orderId/inventory'], // Can update inventory status
  },
};

/**
 * Generate HMAC signature for request
 * Used by calling services to sign their requests
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
    // Use timing-safe comparison to prevent timing attacks
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

  // Check if headers are present
  if (!serviceKey || !signature || !timestamp || !serviceId) {
    logger.warn('Service authentication failed - missing headers', {
      path: req.path,
      hasServiceKey: !!serviceKey,
      hasSignature: !!signature,
      hasTimestamp: !!timestamp,
      hasServiceId: !!serviceId,
    });
    res.status(401).json({ error: 'Service authentication required' });
    return;
  }

  // Validate service exists in registry
  const serviceCredentials = SERVICE_REGISTRY[serviceId];
  if (!serviceCredentials) {
    logger.warn('Service authentication failed - unknown service', {
      serviceId,
      path: req.path,
    });
    res.status(401).json({ error: 'Unknown service' });
    return;
  }

  // Verify API key
  if (serviceKey !== serviceCredentials.apiKey) {
    logger.warn('Service authentication failed - invalid API key', {
      serviceId,
      path: req.path,
    });
    res.status(401).json({ error: 'Invalid service credentials' });
    return;
  }

  // Verify timestamp to prevent replay attacks (allow 5 minute window)
  const requestTime = parseInt(timestamp, 10);
  const currentTime = Date.now();
  const timeDiff = Math.abs(currentTime - requestTime);
  const MAX_TIME_DIFF = 5 * 60 * 1000; // 5 minutes

  if (timeDiff > MAX_TIME_DIFF) {
    logger.warn('Service authentication failed - timestamp out of range', {
      serviceId,
      path: req.path,
      timeDiff,
      maxAllowed: MAX_TIME_DIFF,
    });
    res.status(401).json({ error: 'Request timestamp out of acceptable range' });
    return;
  }

  // Verify HMAC signature
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
      path: req.path,
    });
    res.status(401).json({ error: 'Invalid request signature' });
    return;
  }

  // Check if service is allowed to access this endpoint
  if (serviceCredentials.allowedEndpoints && serviceCredentials.allowedEndpoints.length > 0) {
    const isAllowed = serviceCredentials.allowedEndpoints.some(endpoint => {
      // Simple pattern matching (in production, use a proper router matcher)
      const pattern = endpoint.replace(/:\w+/g, '[^/]+');
      const regex = new RegExp(`^${pattern}$`);
      return regex.test(req.path);
    });

    if (!isAllowed) {
      logger.warn('Service authentication failed - endpoint not allowed', {
        serviceId,
        path: req.path,
        allowedEndpoints: serviceCredentials.allowedEndpoints,
      });
      res.status(403).json({ error: 'Service not authorized for this endpoint' });
      return;
    }
  }

  // Attach service metadata to request
  req.serviceId = serviceId;
  req.serviceName = serviceCredentials.serviceName;

  logger.debug('Service authenticated successfully', {
    serviceId,
    serviceName: serviceCredentials.serviceName,
    path: req.path,
  });

  next();
}

/**
 * Middleware to require either user JWT OR service authentication
 * Useful for endpoints that can be called by both users and services
 */
export function authenticateUserOrService(req: Request, res: Response, next: NextFunction): void {
  // Check if service authentication headers are present
  const hasServiceHeaders =
    req.headers['x-service-key'] &&
    req.headers['x-signature'] &&
    req.headers['x-timestamp'] &&
    req.headers['x-service-id'];

  if (hasServiceHeaders) {
    // Try service authentication
    return authenticateService(req, res, next);
  }

  // Check if user JWT is present
  const hasUserAuth = req.headers.authorization || req.cookies?.auth_token;

  if (hasUserAuth) {
    // Try user authentication (this assumes authenticateJWT middleware is available)
    // In practice, you would import and call authenticateJWT here
    return next();
  }

  // Neither service nor user authentication present
  res.status(401).json({ error: 'Authentication required' });
}

/**
 * Utility class for making authenticated service-to-service requests
 */
export class ServiceClient {
  constructor(
    private serviceId: string,
    private apiKey: string
  ) {}

  /**
   * Generate headers for authenticated service request
   */
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

  /**
   * Make authenticated GET request
   */
  async get(baseUrl: string, path: string): Promise<any> {
    const headers = this.generateHeaders('GET', path);
    const response = await fetch(`${baseUrl}${path}`, {
      method: 'GET',
      headers,
    });
    return response.json();
  }

  /**
   * Make authenticated POST request
   */
  async post(baseUrl: string, path: string, body: any): Promise<any> {
    const headers = this.generateHeaders('POST', path, body);
    const response = await fetch(`${baseUrl}${path}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    return response.json();
  }

  /**
   * Make authenticated PUT request
   */
  async put(baseUrl: string, path: string, body: any): Promise<any> {
    const headers = this.generateHeaders('PUT', path, body);
    const response = await fetch(`${baseUrl}${path}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(body),
    });
    return response.json();
  }

  /**
   * Make authenticated PATCH request
   */
  async patch(baseUrl: string, path: string, body: any): Promise<any> {
    const headers = this.generateHeaders('PATCH', path, body);
    const response = await fetch(`${baseUrl}${path}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(body),
    });
    return response.json();
  }

  /**
   * Make authenticated DELETE request
   */
  async delete(baseUrl: string, path: string): Promise<any> {
    const headers = this.generateHeaders('DELETE', path);
    const response = await fetch(`${baseUrl}${path}`, {
      method: 'DELETE',
      headers,
    });
    return response.json();
  }
}

/**
 * Create service clients for known services
 */
export const serviceClients = {
  cartService: new ServiceClient(
    'cart-service',
    process.env.CART_SERVICE_API_KEY || 'dev-cart-service-key-change-in-production'
  ),
  paymentService: new ServiceClient(
    'payment-service',
    process.env.PAYMENT_SERVICE_API_KEY || 'dev-payment-service-key-change-in-production'
  ),
  inventoryService: new ServiceClient(
    'inventory-service',
    process.env.INVENTORY_SERVICE_API_KEY || 'dev-inventory-service-key-change-in-production'
  ),
};
