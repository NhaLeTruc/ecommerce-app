import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { authenticateJWT, requireRole, requireAdmin } from '../auth';
import { config } from '../../config';

// Mock logger
jest.mock('../logger', () => ({
  logger: {
    debug: jest.fn(),
    warn: jest.fn(),
  },
}));

describe('Authentication Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    mockRequest = {
      headers: {},
      cookies: {},
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    nextFunction = jest.fn();
  });

  describe('authenticateJWT', () => {
    it('should authenticate valid JWT from Authorization header', () => {
      const validToken = jwt.sign(
        { user_id: 'user123', email: 'test@example.com', role: 'customer' },
        config.jwt.secret,
        { issuer: 'ecommerce-user-service', expiresIn: '1h' }
      );

      mockRequest.headers = { authorization: `Bearer ${validToken}` };

      authenticateJWT(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockRequest.user).toBeDefined();
      expect(mockRequest.user?.user_id).toBe('user123');
      expect(mockRequest.user?.email).toBe('test@example.com');
      expect(mockRequest.user?.role).toBe('customer');
    });

    it('should authenticate valid JWT from cookie', () => {
      const validToken = jwt.sign(
        { user_id: 'user456', email: 'cookie@example.com', role: 'admin' },
        config.jwt.secret,
        { issuer: 'ecommerce-user-service', expiresIn: '1h' }
      );

      mockRequest.cookies = { auth_token: validToken };

      authenticateJWT(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockRequest.user).toBeDefined();
      expect(mockRequest.user?.user_id).toBe('user456');
      expect(mockRequest.user?.role).toBe('admin');
    });

    it('should reject request without token', () => {
      authenticateJWT(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Authorization required' });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should reject expired token', () => {
      const expiredToken = jwt.sign(
        { user_id: 'user789', email: 'expired@example.com', role: 'customer' },
        config.jwt.secret,
        { issuer: 'ecommerce-user-service', expiresIn: '-1h' } // Expired 1 hour ago
      );

      mockRequest.headers = { authorization: `Bearer ${expiredToken}` };

      authenticateJWT(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Token has expired' });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should reject token with invalid signature', () => {
      const invalidToken = jwt.sign(
        { user_id: 'user999', email: 'invalid@example.com', role: 'customer' },
        'wrong-secret',
        { issuer: 'ecommerce-user-service', expiresIn: '1h' }
      );

      mockRequest.headers = { authorization: `Bearer ${invalidToken}` };

      authenticateJWT(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Invalid token' });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should reject malformed Authorization header', () => {
      mockRequest.headers = { authorization: 'InvalidFormat token123' };

      authenticateJWT(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Authorization required' });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should prefer Authorization header over cookie', () => {
      const headerToken = jwt.sign(
        { user_id: 'header-user', email: 'header@example.com', role: 'customer' },
        config.jwt.secret,
        { issuer: 'ecommerce-user-service', expiresIn: '1h' }
      );

      const cookieToken = jwt.sign(
        { user_id: 'cookie-user', email: 'cookie@example.com', role: 'customer' },
        config.jwt.secret,
        { issuer: 'ecommerce-user-service', expiresIn: '1h' }
      );

      mockRequest.headers = { authorization: `Bearer ${headerToken}` };
      mockRequest.cookies = { auth_token: cookieToken };

      authenticateJWT(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockRequest.user?.user_id).toBe('header-user');
    });
  });

  describe('requireRole', () => {
    beforeEach(() => {
      mockRequest.user = {
        user_id: 'user123',
        email: 'test@example.com',
        role: 'customer',
        iat: Date.now(),
        exp: Date.now() + 3600,
        iss: 'ecommerce-user-service',
        sub: 'user123',
      };
    });

    it('should allow access for matching role', () => {
      const middleware = requireRole('customer');
      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should allow access for multiple allowed roles', () => {
      const middleware = requireRole('admin', 'customer');
      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
    });

    it('should deny access for non-matching role', () => {
      const middleware = requireRole('admin');
      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Insufficient permissions' });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should deny access when user is not authenticated', () => {
      mockRequest.user = undefined;
      const middleware = requireRole('customer');
      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Authentication required' });
      expect(nextFunction).not.toHaveBeenCalled();
    });
  });

  describe('requireAdmin', () => {
    it('should allow access for admin role', () => {
      mockRequest.user = {
        user_id: 'admin123',
        email: 'admin@example.com',
        role: 'admin',
        iat: Date.now(),
        exp: Date.now() + 3600,
        iss: 'ecommerce-user-service',
        sub: 'admin123',
      };

      requireAdmin(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
    });

    it('should deny access for customer role', () => {
      mockRequest.user = {
        user_id: 'user123',
        email: 'user@example.com',
        role: 'customer',
        iat: Date.now(),
        exp: Date.now() + 3600,
        iss: 'ecommerce-user-service',
        sub: 'user123',
      };

      requireAdmin(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Insufficient permissions' });
      expect(nextFunction).not.toHaveBeenCalled();
    });
  });
});
