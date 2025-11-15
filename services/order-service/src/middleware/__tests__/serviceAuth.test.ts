import { Request, Response, NextFunction } from 'express';
import {
  authenticateService,
  generateServiceSignature,
  ServiceClient,
} from '../serviceAuth';

// Mock logger
jest.mock('../logger', () => ({
  logger: {
    debug: jest.fn(),
    warn: jest.fn(),
  },
}));

describe('Service Authentication Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  const validApiKey = 'dev-cart-service-key-change-in-production';
  const validServiceId = 'cart-service';

  beforeEach(() => {
    mockRequest = {
      method: 'POST',
      path: '/api/v1/orders',
      body: { userId: 'user123', items: [] },
      headers: {},
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    nextFunction = jest.fn();
  });

  describe('generateServiceSignature', () => {
    it('should generate consistent signatures for same input', () => {
      const method = 'POST';
      const path = '/api/v1/orders';
      const body = { test: 'data' };
      const timestamp = '1234567890';
      const apiKey = 'test-key';

      const sig1 = generateServiceSignature(method, path, body, timestamp, apiKey);
      const sig2 = generateServiceSignature(method, path, body, timestamp, apiKey);

      expect(sig1).toBe(sig2);
      expect(sig1).toHaveLength(64); // SHA256 hex is 64 characters
    });

    it('should generate different signatures for different inputs', () => {
      const timestamp = '1234567890';
      const apiKey = 'test-key';
      const body = { test: 'data' };

      const sig1 = generateServiceSignature('POST', '/api/v1/orders', body, timestamp, apiKey);
      const sig2 = generateServiceSignature('GET', '/api/v1/orders', body, timestamp, apiKey);
      const sig3 = generateServiceSignature('POST', '/api/v1/users', body, timestamp, apiKey);

      expect(sig1).not.toBe(sig2);
      expect(sig1).not.toBe(sig3);
      expect(sig2).not.toBe(sig3);
    });
  });

  describe('authenticateService', () => {
    it('should authenticate valid service request', () => {
      const timestamp = Date.now().toString();
      const signature = generateServiceSignature(
        'POST',
        '/api/v1/orders',
        mockRequest.body,
        timestamp,
        validApiKey
      );

      mockRequest.headers = {
        'x-service-id': validServiceId,
        'x-service-key': validApiKey,
        'x-timestamp': timestamp,
        'x-signature': signature,
      };

      authenticateService(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockRequest.serviceId).toBe(validServiceId);
      expect(mockRequest.serviceName).toBe('cart-service');
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should reject request without service headers', () => {
      mockRequest.headers = {};

      authenticateService(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Service authentication required',
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should reject request with missing service-id header', () => {
      const timestamp = Date.now().toString();
      const signature = generateServiceSignature(
        'POST',
        '/api/v1/orders',
        mockRequest.body,
        timestamp,
        validApiKey
      );

      mockRequest.headers = {
        'x-service-key': validApiKey,
        'x-timestamp': timestamp,
        'x-signature': signature,
      };

      authenticateService(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should reject request from unknown service', () => {
      const timestamp = Date.now().toString();
      const unknownServiceId = 'unknown-service';
      const signature = generateServiceSignature(
        'POST',
        '/api/v1/orders',
        mockRequest.body,
        timestamp,
        validApiKey
      );

      mockRequest.headers = {
        'x-service-id': unknownServiceId,
        'x-service-key': validApiKey,
        'x-timestamp': timestamp,
        'x-signature': signature,
      };

      authenticateService(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Unknown service' });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should reject request with invalid API key', () => {
      const timestamp = Date.now().toString();
      const invalidApiKey = 'wrong-api-key';
      const signature = generateServiceSignature(
        'POST',
        '/api/v1/orders',
        mockRequest.body,
        timestamp,
        invalidApiKey
      );

      mockRequest.headers = {
        'x-service-id': validServiceId,
        'x-service-key': invalidApiKey,
        'x-timestamp': timestamp,
        'x-signature': signature,
      };

      authenticateService(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Invalid service credentials',
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should reject request with expired timestamp', () => {
      // Timestamp from 10 minutes ago
      const oldTimestamp = (Date.now() - 10 * 60 * 1000).toString();
      const signature = generateServiceSignature(
        'POST',
        '/api/v1/orders',
        mockRequest.body,
        oldTimestamp,
        validApiKey
      );

      mockRequest.headers = {
        'x-service-id': validServiceId,
        'x-service-key': validApiKey,
        'x-timestamp': oldTimestamp,
        'x-signature': signature,
      };

      authenticateService(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Request timestamp out of acceptable range',
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should reject request with future timestamp beyond window', () => {
      // Timestamp 10 minutes in the future
      const futureTimestamp = (Date.now() + 10 * 60 * 1000).toString();
      const signature = generateServiceSignature(
        'POST',
        '/api/v1/orders',
        mockRequest.body,
        futureTimestamp,
        validApiKey
      );

      mockRequest.headers = {
        'x-service-id': validServiceId,
        'x-service-key': validApiKey,
        'x-timestamp': futureTimestamp,
        'x-signature': signature,
      };

      authenticateService(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Request timestamp out of acceptable range',
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should reject request with invalid signature', () => {
      const timestamp = Date.now().toString();
      const invalidSignature = 'invalid-signature-hash';

      mockRequest.headers = {
        'x-service-id': validServiceId,
        'x-service-key': validApiKey,
        'x-timestamp': timestamp,
        'x-signature': invalidSignature,
      };

      authenticateService(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Invalid request signature',
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should reject request when signature is for different body', () => {
      const timestamp = Date.now().toString();
      const signature = generateServiceSignature(
        'POST',
        '/api/v1/orders',
        { different: 'body' },
        timestamp,
        validApiKey
      );

      mockRequest.headers = {
        'x-service-id': validServiceId,
        'x-service-key': validApiKey,
        'x-timestamp': timestamp,
        'x-signature': signature,
      };

      authenticateService(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should reject request to unauthorized endpoint', () => {
      const timestamp = Date.now().toString();
      const unauthorizedPath = '/api/v1/admin/settings';
      mockRequest.path = unauthorizedPath;

      const signature = generateServiceSignature(
        'POST',
        unauthorizedPath,
        mockRequest.body,
        timestamp,
        validApiKey
      );

      mockRequest.headers = {
        'x-service-id': validServiceId,
        'x-service-key': validApiKey,
        'x-timestamp': timestamp,
        'x-signature': signature,
      };

      authenticateService(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Service not authorized for this endpoint',
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should allow request within timestamp window', () => {
      // Timestamp 2 minutes ago (within 5 minute window)
      const recentTimestamp = (Date.now() - 2 * 60 * 1000).toString();
      const signature = generateServiceSignature(
        'POST',
        '/api/v1/orders',
        mockRequest.body,
        recentTimestamp,
        validApiKey
      );

      mockRequest.headers = {
        'x-service-id': validServiceId,
        'x-service-key': validApiKey,
        'x-timestamp': recentTimestamp,
        'x-signature': signature,
      };

      authenticateService(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });
  });

  describe('ServiceClient', () => {
    it('should generate valid authentication headers', () => {
      const client = new ServiceClient('cart-service', validApiKey);
      const headers = client.generateHeaders('POST', '/api/v1/orders', { test: 'data' });

      expect(headers).toHaveProperty('X-Service-Id', 'cart-service');
      expect(headers).toHaveProperty('X-Service-Key', validApiKey);
      expect(headers).toHaveProperty('X-Timestamp');
      expect(headers).toHaveProperty('X-Signature');
      expect(headers).toHaveProperty('Content-Type', 'application/json');

      // Verify signature is valid
      const timestamp = headers['X-Timestamp'];
      const expectedSignature = generateServiceSignature(
        'POST',
        '/api/v1/orders',
        { test: 'data' },
        timestamp,
        validApiKey
      );
      expect(headers['X-Signature']).toBe(expectedSignature);
    });

    it('should generate different timestamps for sequential calls', async () => {
      const client = new ServiceClient('cart-service', validApiKey);
      const headers1 = client.generateHeaders('GET', '/api/v1/orders');

      // Small delay
      await new Promise(resolve => setTimeout(resolve, 10));

      const headers2 = client.generateHeaders('GET', '/api/v1/orders');

      expect(headers1['X-Timestamp']).not.toBe(headers2['X-Timestamp']);
    });
  });
});
