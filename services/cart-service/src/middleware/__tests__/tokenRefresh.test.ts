import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { refreshTokenIfNeeded, refreshTokenEndpoint, getTokenInfo } from '../tokenRefresh';
import { config } from '../../config';
import { JWTPayload } from '../auth';

// Mock logger
jest.mock('../logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
  },
}));

describe('Token Refresh Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;
  let cookieSpy: jest.Mock;
  let setHeaderSpy: jest.Mock;

  beforeEach(() => {
    cookieSpy = jest.fn();
    setHeaderSpy = jest.fn();

    mockRequest = {
      user: undefined,
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      cookie: cookieSpy,
      setHeader: setHeaderSpy,
    };
    nextFunction = jest.fn();
  });

  describe('refreshTokenIfNeeded', () => {
    it('should skip refresh if user is not authenticated', () => {
      mockRequest.user = undefined;

      const middleware = refreshTokenIfNeeded();
      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(cookieSpy).not.toHaveBeenCalled();
    });

    it('should not refresh token if plenty of time until expiration', () => {
      // Token expires in 12 hours (well beyond refresh window)
      const futureExp = Math.floor(Date.now() / 1000) + 12 * 60 * 60;
      mockRequest.user = {
        user_id: 'user123',
        email: 'test@example.com',
        role: 'customer',
        exp: futureExp,
        iat: Math.floor(Date.now() / 1000),
        iss: 'ecommerce-user-service',
        sub: 'user123',
      };

      const middleware = refreshTokenIfNeeded();
      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(cookieSpy).not.toHaveBeenCalled();
    });

    it('should refresh token if close to expiration', () => {
      // Token expires in 30 minutes (within default 1 hour refresh window)
      const soonExp = Math.floor(Date.now() / 1000) + 30 * 60;
      mockRequest.user = {
        user_id: 'user123',
        email: 'test@example.com',
        role: 'customer',
        exp: soonExp,
        iat: Math.floor(Date.now() / 1000) - 23 * 60 * 60, // Issued 23 hours ago
        iss: 'ecommerce-user-service',
        sub: 'user123',
      };

      const middleware = refreshTokenIfNeeded();
      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(cookieSpy).toHaveBeenCalledWith(
        'auth_token',
        expect.any(String),
        expect.objectContaining({
          httpOnly: true,
          sameSite: 'strict',
        })
      );
      expect(setHeaderSpy).toHaveBeenCalledWith('X-Token-Refreshed', 'true');
    });

    it('should not refresh expired token', () => {
      // Token already expired
      const expiredTime = Math.floor(Date.now() / 1000) - 60;
      mockRequest.user = {
        user_id: 'user123',
        email: 'test@example.com',
        role: 'customer',
        exp: expiredTime,
        iat: Math.floor(Date.now() / 1000) - 25 * 60 * 60,
        iss: 'ecommerce-user-service',
        sub: 'user123',
      };

      const middleware = refreshTokenIfNeeded();
      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(cookieSpy).not.toHaveBeenCalled();
    });

    it('should respect custom refresh window', () => {
      // Token expires in 2 hours
      const futureExp = Math.floor(Date.now() / 1000) + 2 * 60 * 60;
      mockRequest.user = {
        user_id: 'user123',
        email: 'test@example.com',
        role: 'customer',
        exp: futureExp,
        iat: Math.floor(Date.now() / 1000) - 22 * 60 * 60,
        iss: 'ecommerce-user-service',
        sub: 'user123',
      };

      // Custom refresh window of 3 hours (should refresh)
      const middleware = refreshTokenIfNeeded({ refreshWindow: 3 * 60 * 60 });
      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(cookieSpy).toHaveBeenCalled();
      expect(nextFunction).toHaveBeenCalled();
    });

    it('should not refresh when disabled', () => {
      const soonExp = Math.floor(Date.now() / 1000) + 30 * 60;
      mockRequest.user = {
        user_id: 'user123',
        email: 'test@example.com',
        role: 'customer',
        exp: soonExp,
        iat: Math.floor(Date.now() / 1000),
        iss: 'ecommerce-user-service',
        sub: 'user123',
      };

      const middleware = refreshTokenIfNeeded({ enabled: false });
      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(cookieSpy).not.toHaveBeenCalled();
    });

    it('should generate valid JWT when refreshing', () => {
      const soonExp = Math.floor(Date.now() / 1000) + 30 * 60;
      mockRequest.user = {
        user_id: 'user123',
        email: 'test@example.com',
        role: 'customer',
        exp: soonExp,
        iat: Math.floor(Date.now() / 1000),
        iss: 'ecommerce-user-service',
        sub: 'user123',
      };

      const middleware = refreshTokenIfNeeded();
      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(cookieSpy).toHaveBeenCalled();

      // Verify the token is valid
      const newToken = cookieSpy.mock.calls[0][1];
      const decoded = jwt.verify(newToken, config.jwt.secret) as any;

      expect(decoded.user_id).toBe('user123');
      expect(decoded.email).toBe('test@example.com');
      expect(decoded.role).toBe('customer');
      expect(decoded.iss).toBe('ecommerce-user-service');
    });
  });

  describe('refreshTokenEndpoint', () => {
    it('should require authentication', () => {
      mockRequest.user = undefined;

      refreshTokenEndpoint(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Authentication required' });
    });

    it('should refresh token for authenticated user', () => {
      mockRequest.user = {
        user_id: 'user123',
        email: 'test@example.com',
        role: 'customer',
        exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60,
        iat: Math.floor(Date.now() / 1000),
        iss: 'ecommerce-user-service',
        sub: 'user123',
      };

      refreshTokenEndpoint(mockRequest as Request, mockResponse as Response);

      expect(cookieSpy).toHaveBeenCalledWith(
        'auth_token',
        expect.any(String),
        expect.objectContaining({
          httpOnly: true,
        })
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Token refreshed successfully',
        expiresAt: expect.any(String),
      });
    });

    it('should generate valid JWT', () => {
      mockRequest.user = {
        user_id: 'user123',
        email: 'test@example.com',
        role: 'admin',
        exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60,
        iat: Math.floor(Date.now() / 1000),
        iss: 'ecommerce-user-service',
        sub: 'user123',
      };

      refreshTokenEndpoint(mockRequest as Request, mockResponse as Response);

      const newToken = cookieSpy.mock.calls[0][1];
      const decoded = jwt.verify(newToken, config.jwt.secret) as any;

      expect(decoded.user_id).toBe('user123');
      expect(decoded.email).toBe('test@example.com');
      expect(decoded.role).toBe('admin');
    });
  });

  describe('getTokenInfo', () => {
    it('should require authentication', () => {
      mockRequest.user = undefined;

      getTokenInfo(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Authentication required' });
    });

    it('should return token information', () => {
      const now = Math.floor(Date.now() / 1000);
      const exp = now + 12 * 60 * 60; // 12 hours from now

      mockRequest.user = {
        user_id: 'user123',
        email: 'test@example.com',
        role: 'customer',
        exp: exp,
        iat: now,
        iss: 'ecommerce-user-service',
        sub: 'user123',
      };

      getTokenInfo(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({
        userId: 'user123',
        email: 'test@example.com',
        role: 'customer',
        issuedAt: expect.any(String),
        expiresAt: expect.any(String),
        secondsUntilExpiration: expect.any(Number),
        shouldRefresh: false,
      });
    });

    it('should indicate when token should be refreshed', () => {
      const now = Math.floor(Date.now() / 1000);
      const exp = now + 30 * 60; // 30 minutes from now (within refresh window)

      mockRequest.user = {
        user_id: 'user123',
        email: 'test@example.com',
        role: 'customer',
        exp: exp,
        iat: now - 23 * 60 * 60,
        iss: 'ecommerce-user-service',
        sub: 'user123',
      };

      getTokenInfo(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          shouldRefresh: true,
        })
      );
    });
  });
});
