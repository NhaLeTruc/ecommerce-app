import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { logger } from './logger';

/**
 * CSRF (Cross-Site Request Forgery) Protection
 *
 * This middleware provides CSRF protection for state-changing operations.
 * It works in conjunction with httpOnly cookies by:
 * 1. Generating a CSRF token and storing it in a signed cookie
 * 2. Requiring the token to be sent in a header for state-changing requests
 * 3. Validating the token matches the cookie value
 *
 * This prevents CSRF attacks even when using httpOnly cookies for authentication.
 */

const CSRF_COOKIE_NAME = 'csrf_token';
const CSRF_HEADER_NAME = 'x-csrf-token';
const CSRF_TOKEN_LENGTH = 32;

/**
 * Generate a cryptographically secure CSRF token
 */
export function generateCsrfToken(): string {
  return crypto.randomBytes(CSRF_TOKEN_LENGTH).toString('hex');
}

/**
 * Middleware to generate and set CSRF token cookie
 * Should be called on login or when starting a session
 */
export function setCsrfToken(req: Request, res: Response, next: NextFunction): void {
  // Check if CSRF token already exists
  const existingToken = req.cookies?.[CSRF_COOKIE_NAME];

  if (!existingToken) {
    const token = generateCsrfToken();

    // Set CSRF token in cookie
    // Note: NOT httpOnly so JavaScript can read it to include in requests
    res.cookie(CSRF_COOKIE_NAME, token, {
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      secure: process.env.NODE_ENV === 'production', // HTTPS only in production
      sameSite: 'strict', // Prevent CSRF
      signed: true, // Prevent tampering
    });

    logger.debug('CSRF token generated and set');
  }

  next();
}

/**
 * Middleware to validate CSRF token on state-changing requests
 * Should be used on POST, PUT, PATCH, DELETE routes
 */
export function validateCsrfToken(req: Request, res: Response, next: NextFunction): void {
  // Skip CSRF validation for safe methods
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
  if (safeMethods.includes(req.method)) {
    return next();
  }

  // Skip CSRF validation for service-to-service requests
  // (they use their own authentication mechanism)
  if (req.serviceId) {
    logger.debug('Skipping CSRF validation for service-to-service request', {
      serviceId: req.serviceId,
    });
    return next();
  }

  // Get token from header
  const headerToken = req.headers[CSRF_HEADER_NAME] as string;

  // Get token from signed cookie
  const cookieToken = req.signedCookies?.[CSRF_COOKIE_NAME];

  // Check if tokens exist
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

  // Validate tokens match using timing-safe comparison
  let tokensMatch = false;
  try {
    tokensMatch = crypto.timingSafeEqual(
      Buffer.from(headerToken),
      Buffer.from(cookieToken)
    );
  } catch (error) {
    // Tokens are different lengths or invalid
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

/**
 * Middleware to refresh CSRF token
 * Useful for rotating tokens periodically
 */
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

/**
 * Endpoint to get CSRF token
 * Frontend can call this to get the token for subsequent requests
 */
export function getCsrfTokenEndpoint(req: Request, res: Response): void {
  const token = req.signedCookies?.[CSRF_COOKIE_NAME];

  if (!token) {
    // Generate new token if none exists
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

/**
 * Combined middleware for authentication + CSRF protection
 * Use this on routes that require both
 */
export function requireAuthWithCsrf(
  authenticateMiddleware: (req: Request, res: Response, next: NextFunction) => void
) {
  return [
    authenticateMiddleware,
    setCsrfToken,
    validateCsrfToken,
  ];
}
