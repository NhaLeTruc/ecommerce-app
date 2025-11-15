import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import {
  generateCsrfToken,
  setCsrfToken,
  validateCsrfToken,
  getCsrfTokenEndpoint,
} from '../csrf';

// Mock logger
jest.mock('../logger', () => ({
  logger: {
    debug: jest.fn(),
    warn: jest.fn(),
  },
}));

describe('CSRF Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;
  let cookieSpy: jest.Mock;

  beforeEach(() => {
    cookieSpy = jest.fn();
    mockRequest = {
      method: 'POST',
      path: '/api/v1/cart/items',
      cookies: {},
      signedCookies: {},
      headers: {},
      user: { user_id: 'user123', email: 'test@example.com', role: 'customer' } as any,
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      cookie: cookieSpy,
    };
    nextFunction = jest.fn();
  });

  describe('generateCsrfToken', () => {
    it('should generate a token of correct length', () => {
      const token = generateCsrfToken();
      expect(token).toHaveLength(64); // 32 bytes = 64 hex chars
    });

    it('should generate unique tokens', () => {
      const token1 = generateCsrfToken();
      const token2 = generateCsrfToken();
      expect(token1).not.toBe(token2);
    });

    it('should generate hex string', () => {
      const token = generateCsrfToken();
      expect(token).toMatch(/^[0-9a-f]+$/);
    });
  });

  describe('setCsrfToken', () => {
    it('should set CSRF token cookie when none exists', () => {
      setCsrfToken(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(cookieSpy).toHaveBeenCalledWith(
        'csrf_token',
        expect.any(String),
        expect.objectContaining({
          maxAge: 24 * 60 * 60 * 1000,
          sameSite: 'strict',
          signed: true,
        })
      );
      expect(nextFunction).toHaveBeenCalled();
    });

    it('should not set cookie if token already exists', () => {
      mockRequest.cookies = { csrf_token: 'existing-token' };

      setCsrfToken(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(cookieSpy).not.toHaveBeenCalled();
      expect(nextFunction).toHaveBeenCalled();
    });

    it('should set secure flag in production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      setCsrfToken(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(cookieSpy).toHaveBeenCalledWith(
        'csrf_token',
        expect.any(String),
        expect.objectContaining({
          secure: true,
        })
      );

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('validateCsrfToken', () => {
    const validToken = 'a'.repeat(64); // Valid hex token

    it('should allow GET requests without CSRF token', () => {
      mockRequest.method = 'GET';

      validateCsrfToken(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should allow HEAD requests without CSRF token', () => {
      mockRequest.method = 'HEAD';

      validateCsrfToken(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
    });

    it('should allow OPTIONS requests without CSRF token', () => {
      mockRequest.method = 'OPTIONS';

      validateCsrfToken(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
    });

    it('should skip validation for service-to-service requests', () => {
      mockRequest.serviceId = 'order-service';

      validateCsrfToken(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should reject POST without CSRF token', () => {
      mockRequest.method = 'POST';

      validateCsrfToken(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'CSRF token missing',
        })
      );
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should reject when header token is missing', () => {
      mockRequest.signedCookies = { csrf_token: validToken };

      validateCsrfToken(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should reject when cookie token is missing', () => {
      mockRequest.headers = { 'x-csrf-token': validToken };

      validateCsrfToken(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should reject when tokens do not match', () => {
      mockRequest.headers = { 'x-csrf-token': 'a'.repeat(64) };
      mockRequest.signedCookies = { csrf_token: 'b'.repeat(64) };

      validateCsrfToken(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Invalid CSRF token' });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should accept when tokens match', () => {
      mockRequest.headers = { 'x-csrf-token': validToken };
      mockRequest.signedCookies = { csrf_token: validToken };

      validateCsrfToken(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should reject tokens of different lengths', () => {
      mockRequest.headers = { 'x-csrf-token': 'short' };
      mockRequest.signedCookies = { csrf_token: 'a'.repeat(64) };

      validateCsrfToken(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should validate all state-changing methods', () => {
      const methods = ['POST', 'PUT', 'PATCH', 'DELETE'];

      methods.forEach(method => {
        mockRequest.method = method;
        mockRequest.headers = {};
        mockRequest.signedCookies = {};
        nextFunction.mockClear();
        (mockResponse.status as jest.Mock).mockClear();

        validateCsrfToken(mockRequest as Request, mockResponse as Response, nextFunction);

        expect(mockResponse.status).toHaveBeenCalledWith(403);
        expect(nextFunction).not.toHaveBeenCalled();
      });
    });
  });

  describe('getCsrfTokenEndpoint', () => {
    it('should return existing token from cookie', () => {
      const existingToken = 'a'.repeat(64);
      mockRequest.signedCookies = { csrf_token: existingToken };

      getCsrfTokenEndpoint(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({ csrfToken: existingToken });
      expect(cookieSpy).not.toHaveBeenCalled();
    });

    it('should generate and set new token if none exists', () => {
      mockRequest.signedCookies = {};

      getCsrfTokenEndpoint(mockRequest as Request, mockResponse as Response);

      expect(cookieSpy).toHaveBeenCalledWith(
        'csrf_token',
        expect.any(String),
        expect.objectContaining({
          maxAge: 24 * 60 * 60 * 1000,
          sameSite: 'strict',
          signed: true,
        })
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        csrfToken: expect.any(String),
      });
    });
  });

  describe('Timing attack protection', () => {
    it('should use constant-time comparison', () => {
      // This test verifies that timingSafeEqual is being used
      const token1 = 'a'.repeat(64);
      const token2 = 'b'.repeat(64);

      mockRequest.headers = { 'x-csrf-token': token1 };
      mockRequest.signedCookies = { csrf_token: token2 };

      const timingSafeEqualSpy = jest.spyOn(crypto, 'timingSafeEqual');

      validateCsrfToken(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(timingSafeEqualSpy).toHaveBeenCalled();

      timingSafeEqualSpy.mockRestore();
    });
  });
});
