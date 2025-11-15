import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { logger } from './logger';

/**
 * CSRF (Cross-Site Request Forgery) Protection
 *
 * This middleware provides CSRF protection for state-changing operations.
 */

const CSRF_COOKIE_NAME = 'csrf_token';
const CSRF_HEADER_NAME = 'x-csrf-token';
const CSRF_TOKEN_LENGTH = 32;

export function generateCsrfToken(): string {
  return crypto.randomBytes(CSRF_TOKEN_LENGTH).toString('hex');
}

export function setCsrfToken(req: Request, res: Response, next: NextFunction): void {
  const existingToken = req.cookies?.[CSRF_COOKIE_NAME];

  if (!existingToken) {
    const token = generateCsrfToken();

    res.cookie(CSRF_COOKIE_NAME, token, {
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      signed: true,
    });

    logger.debug('CSRF token generated and set');
  }

  next();
}

export function validateCsrfToken(req: Request, res: Response, next: NextFunction): void {
  // Skip CSRF validation for safe methods
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
  if (safeMethods.includes(req.method)) {
    return next();
  }

  // Skip CSRF validation for service-to-service requests
  if (req.serviceId) {
    logger.debug('Skipping CSRF validation for service-to-service request', {
      serviceId: req.serviceId,
    });
    return next();
  }

  const headerToken = req.headers[CSRF_HEADER_NAME] as string;
  const cookieToken = req.signedCookies?.[CSRF_COOKIE_NAME];

  if (!headerToken || !cookieToken) {
    logger.warn('CSRF validation failed - missing token', {
      hasHeaderToken: !!headerToken,
      hasCookieToken: !!cookieToken,
      method: req.method,
      path: req.path,
      userId: req.user?.user_id,
    });
    res.status(403).json({
      error: 'CSRF token missing',
      message: 'Please include CSRF token in X-CSRF-Token header',
    });
    return;
  }

  let tokensMatch = false;
  try {
    tokensMatch = crypto.timingSafeEqual(
      Buffer.from(headerToken),
      Buffer.from(cookieToken)
    );
  } catch (error) {
    logger.warn('CSRF validation failed - token comparison error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      method: req.method,
      path: req.path,
      userId: req.user?.user_id,
    });
    res.status(403).json({ error: 'Invalid CSRF token' });
    return;
  }

  if (!tokensMatch) {
    logger.warn('CSRF validation failed - token mismatch', {
      method: req.method,
      path: req.path,
      userId: req.user?.user_id,
    });
    res.status(403).json({ error: 'Invalid CSRF token' });
    return;
  }

  logger.debug('CSRF token validated successfully', {
    method: req.method,
    path: req.path,
    userId: req.user?.user_id,
  });

  next();
}

export function refreshCsrfToken(req: Request, res: Response, next: NextFunction): void {
  const token = generateCsrfToken();

  res.cookie(CSRF_COOKIE_NAME, token, {
    maxAge: 24 * 60 * 60 * 1000,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    signed: true,
  });

  logger.debug('CSRF token refreshed');
  next();
}

export function getCsrfTokenEndpoint(req: Request, res: Response): void {
  const token = req.signedCookies?.[CSRF_COOKIE_NAME];

  if (!token) {
    const newToken = generateCsrfToken();
    res.cookie(CSRF_COOKIE_NAME, newToken, {
      maxAge: 24 * 60 * 60 * 1000,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      signed: true,
    });

    res.json({ csrfToken: newToken });
  } else {
    res.json({ csrfToken: token });
  }
}

export function requireAuthWithCsrf(
  authenticateMiddleware: (req: Request, res: Response, next: NextFunction) => void
) {
  return [
    authenticateMiddleware,
    setCsrfToken,
    validateCsrfToken,
  ];
}
