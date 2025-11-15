import request from 'supertest';
import express, { Express } from 'express';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { authenticateJWT, requireRole } from '../middleware/auth';
import { setCsrfToken, validateCsrfToken, getCsrfTokenEndpoint } from '../middleware/csrf';
import { refreshTokenIfNeeded, refreshTokenEndpoint } from '../middleware/tokenRefresh';
import { authenticateService, ServiceClient } from '../middleware/serviceAuth';

/**
 * Security Integration Tests
 *
 * These tests verify that multiple security layers work together correctly:
 * 1. JWT Authentication
 * 2. CSRF Protection
 * 3. Token Refresh
 * 4. Service-to-Service Authentication
 * 5. Role-Based Access Control
 */

// Mock logger
jest.mock('../logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('Security Integration Tests', () => {
  let app: Express;
  let validToken: string;
  let adminToken: string;
  let csrfToken: string;

  beforeAll(() => {
    // Create test app
    app = express();
    app.use(express.json());
    app.use(cookieParser('test-secret'));

    // Public endpoint
    app.get('/api/v1/public', (req, res) => {
      res.json({ message: 'Public endpoint' });
    });

    // CSRF token endpoint
    app.get('/api/v1/csrf-token', setCsrfToken, getCsrfTokenEndpoint);

    // Authenticated endpoint with CSRF
    app.post(
      '/api/v1/protected',
      authenticateJWT,
      setCsrfToken,
      validateCsrfToken,
      (req, res) => {
        res.json({ message: 'Protected endpoint', userId: req.user?.user_id });
      }
    );

    // Authenticated endpoint with token refresh
    app.get(
      '/api/v1/with-refresh',
      authenticateJWT,
      refreshTokenIfNeeded(),
      (req, res) => {
        res.json({ message: 'Endpoint with refresh', userId: req.user?.user_id });
      }
    );

    // Admin-only endpoint
    app.get(
      '/api/v1/admin',
      authenticateJWT,
      requireRole('admin'),
      (req, res) => {
        res.json({ message: 'Admin endpoint', userId: req.user?.user_id });
      }
    );

    // Token refresh endpoint
    app.post('/api/v1/auth/refresh', authenticateJWT, refreshTokenEndpoint);

    // Service-to-service endpoint
    app.post('/api/v1/service', authenticateService, (req, res) => {
      res.json({
        message: 'Service endpoint',
        serviceId: req.serviceId,
        serviceName: req.serviceName,
      });
    });

    // Generate test tokens
    validToken = jwt.sign(
      {
        user_id: 'user123',
        email: 'test@example.com',
        role: 'customer',
        sub: 'user123',
      },
      config.jwt.secret,
      {
        expiresIn: '24h',
        issuer: 'ecommerce-user-service',
      }
    );

    adminToken = jwt.sign(
      {
        user_id: 'admin123',
        email: 'admin@example.com',
        role: 'admin',
        sub: 'admin123',
      },
      config.jwt.secret,
      {
        expiresIn: '24h',
        issuer: 'ecommerce-user-service',
      }
    );
  });

  describe('Public Endpoint Access', () => {
    it('should allow access without authentication', async () => {
      const response = await request(app).get('/api/v1/public');

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Public endpoint');
    });
  });

  describe('JWT Authentication Flow', () => {
    it('should reject request without token', async () => {
      const response = await request(app).post('/api/v1/protected');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Authorization required');
    });

    it('should accept valid token in Authorization header', async () => {
      // First get CSRF token
      const csrfResponse = await request(app)
        .get('/api/v1/csrf-token')
        .set('Authorization', `Bearer ${validToken}`);

      csrfToken = csrfResponse.body.csrfToken;

      const response = await request(app)
        .post('/api/v1/protected')
        .set('Authorization', `Bearer ${validToken}`)
        .set('X-CSRF-Token', csrfToken)
        .send({ test: 'data' });

      expect(response.status).toBe(200);
      expect(response.body.userId).toBe('user123');
    });

    it('should accept valid token in cookie', async () => {
      // Get CSRF token
      const csrfResponse = await request(app)
        .get('/api/v1/csrf-token')
        .set('Cookie', `auth_token=${validToken}`);

      csrfToken = csrfResponse.body.csrfToken;

      const response = await request(app)
        .post('/api/v1/protected')
        .set('Cookie', `auth_token=${validToken}`)
        .set('X-CSRF-Token', csrfToken)
        .send({ test: 'data' });

      expect(response.status).toBe(200);
      expect(response.body.userId).toBe('user123');
    });

    it('should reject expired token', async () => {
      const expiredToken = jwt.sign(
        {
          user_id: 'user123',
          email: 'test@example.com',
          role: 'customer',
          sub: 'user123',
        },
        config.jwt.secret,
        {
          expiresIn: '-1h',
          issuer: 'ecommerce-user-service',
        }
      );

      const response = await request(app)
        .post('/api/v1/protected')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Token has expired');
    });

    it('should reject invalid token signature', async () => {
      const invalidToken = jwt.sign(
        {
          user_id: 'user123',
          email: 'test@example.com',
          role: 'customer',
          sub: 'user123',
        },
        'wrong-secret',
        {
          expiresIn: '24h',
          issuer: 'ecommerce-user-service',
        }
      );

      const response = await request(app)
        .post('/api/v1/protected')
        .set('Authorization', `Bearer ${invalidToken}`);

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid token');
    });
  });

  describe('CSRF Protection Flow', () => {
    it('should allow GET request without CSRF token', async () => {
      const response = await request(app)
        .get('/api/v1/with-refresh')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
    });

    it('should reject POST without CSRF token', async () => {
      const response = await request(app)
        .post('/api/v1/protected')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ test: 'data' });

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('CSRF token missing');
    });

    it('should reject POST with invalid CSRF token', async () => {
      const response = await request(app)
        .post('/api/v1/protected')
        .set('Authorization', `Bearer ${validToken}`)
        .set('X-CSRF-Token', 'invalid-token')
        .send({ test: 'data' });

      expect(response.status).toBe(403);
    });

    it('should complete full CSRF flow', async () => {
      // Step 1: Get CSRF token
      const csrfResponse = await request(app)
        .get('/api/v1/csrf-token')
        .set('Authorization', `Bearer ${validToken}`);

      expect(csrfResponse.status).toBe(200);
      expect(csrfResponse.body.csrfToken).toBeDefined();
      csrfToken = csrfResponse.body.csrfToken;

      // Step 2: Use CSRF token in POST request
      const response = await request(app)
        .post('/api/v1/protected')
        .set('Authorization', `Bearer ${validToken}`)
        .set('X-CSRF-Token', csrfToken)
        .send({ test: 'data' });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Protected endpoint');
    });
  });

  describe('Role-Based Access Control', () => {
    it('should allow customer to access non-admin endpoint', async () => {
      const response = await request(app)
        .get('/api/v1/with-refresh')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
    });

    it('should deny customer access to admin endpoint', async () => {
      const response = await request(app)
        .get('/api/v1/admin')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Insufficient permissions');
    });

    it('should allow admin to access admin endpoint', async () => {
      const response = await request(app)
        .get('/api/v1/admin')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Admin endpoint');
      expect(response.body.userId).toBe('admin123');
    });
  });

  describe('Token Refresh Flow', () => {
    it('should refresh token when close to expiration', async () => {
      // Create token expiring in 30 minutes
      const soonExpiringToken = jwt.sign(
        {
          user_id: 'user123',
          email: 'test@example.com',
          role: 'customer',
          sub: 'user123',
        },
        config.jwt.secret,
        {
          expiresIn: '30m',
          issuer: 'ecommerce-user-service',
        }
      );

      const response = await request(app)
        .get('/api/v1/with-refresh')
        .set('Authorization', `Bearer ${soonExpiringToken}`);

      expect(response.status).toBe(200);
      expect(response.headers['x-token-refreshed']).toBe('true');
      expect(response.headers['set-cookie']).toBeDefined();
    });

    it('should explicitly refresh token via endpoint', async () => {
      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Token refreshed successfully');
      expect(response.body.expiresAt).toBeDefined();
      expect(response.headers['set-cookie']).toBeDefined();
    });
  });

  describe('Service-to-Service Authentication', () => {
    it('should authenticate valid service request', async () => {
      const client = new ServiceClient(
        'cart-service',
        'dev-cart-service-key-change-in-production'
      );

      const headers = client.generateHeaders('POST', '/api/v1/service', {
        test: 'data',
      });

      const response = await request(app)
        .post('/api/v1/service')
        .set(headers)
        .send({ test: 'data' });

      expect(response.status).toBe(200);
      expect(response.body.serviceId).toBe('cart-service');
      expect(response.body.serviceName).toBe('cart-service');
    });

    it('should reject service request with invalid signature', async () => {
      const headers = {
        'X-Service-Id': 'cart-service',
        'X-Service-Key': 'dev-cart-service-key-change-in-production',
        'X-Timestamp': Date.now().toString(),
        'X-Signature': 'invalid-signature',
      };

      const response = await request(app)
        .post('/api/v1/service')
        .set(headers)
        .send({ test: 'data' });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid request signature');
    });

    it('should reject service request with old timestamp', async () => {
      const oldTimestamp = (Date.now() - 10 * 60 * 1000).toString(); // 10 minutes ago
      const client = new ServiceClient(
        'cart-service',
        'dev-cart-service-key-change-in-production'
      );

      const headers = client.generateHeaders('POST', '/api/v1/service', {
        test: 'data',
      });
      headers['X-Timestamp'] = oldTimestamp;

      // Regenerate signature with old timestamp
      const crypto = require('crypto');
      const payload = `POST:/api/v1/service:${JSON.stringify({ test: 'data' })}:${oldTimestamp}`;
      headers['X-Signature'] = crypto
        .createHmac('sha256', 'dev-cart-service-key-change-in-production')
        .update(payload)
        .digest('hex');

      const response = await request(app)
        .post('/api/v1/service')
        .set(headers)
        .send({ test: 'data' });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Request timestamp out of acceptable range');
    });
  });

  describe('Combined Security Layers', () => {
    it('should require both JWT and CSRF for protected POST', async () => {
      // Missing both
      let response = await request(app)
        .post('/api/v1/protected')
        .send({ test: 'data' });
      expect(response.status).toBe(401);

      // Has JWT but missing CSRF
      response = await request(app)
        .post('/api/v1/protected')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ test: 'data' });
      expect(response.status).toBe(403);

      // Has both - should succeed
      const csrfResponse = await request(app)
        .get('/api/v1/csrf-token')
        .set('Authorization', `Bearer ${validToken}`);
      csrfToken = csrfResponse.body.csrfToken;

      response = await request(app)
        .post('/api/v1/protected')
        .set('Authorization', `Bearer ${validToken}`)
        .set('X-CSRF-Token', csrfToken)
        .send({ test: 'data' });
      expect(response.status).toBe(200);
    });

    it('should enforce role after authentication', async () => {
      // Customer tries to access admin endpoint
      const response = await request(app)
        .get('/api/v1/admin')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Insufficient permissions');
    });
  });
});
