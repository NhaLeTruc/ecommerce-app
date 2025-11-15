import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { logger } from './logger';
import { JWTPayload } from './auth';

/**
 * Token Refresh Middleware
 *
 * Implements sliding session by refreshing JWT tokens that are close to expiration.
 * This provides better UX by keeping users logged in during active sessions
 * without requiring a separate refresh token.
 *
 * How it works:
 * 1. Check if JWT is close to expiration (within refresh window)
 * 2. If yes, generate new JWT with extended expiration
 * 3. Set new JWT as httpOnly cookie
 * 4. Continue processing request
 *
 * Benefits:
 * - Simpler than separate refresh tokens
 * - No database storage needed
 * - Automatic token rotation for active users
 * - Configurable refresh window
 */

interface TokenRefreshConfig {
  /**
   * Time before expiration to refresh token (in seconds)
   * Default: 1 hour (3600 seconds)
   */
  refreshWindow: number;

  /**
   * New token expiration time (in seconds)
   * Default: 24 hours (86400 seconds)
   */
  newTokenExpiration: number;

  /**
   * Whether to refresh tokens
   * Can be disabled in development
   */
  enabled: boolean;
}

const defaultConfig: TokenRefreshConfig = {
  refreshWindow: 3600, // 1 hour
  newTokenExpiration: 86400, // 24 hours
  enabled: process.env.TOKEN_REFRESH_ENABLED !== 'false',
};

/**
 * Check if token should be refreshed
 */
function shouldRefreshToken(payload: JWTPayload, config: TokenRefreshConfig): boolean {
  if (!payload.exp) {
    return false;
  }

  const currentTime = Math.floor(Date.now() / 1000);
  const expirationTime = payload.exp;
  const timeUntilExpiration = expirationTime - currentTime;

  return timeUntilExpiration <= config.refreshWindow && timeUntilExpiration > 0;
}

/**
 * Generate new JWT token
 */
function generateNewToken(payload: JWTPayload, expirationSeconds: number): string {
  // Create new payload without exp and iat (will be set by jwt.sign)
  const newPayload = {
    user_id: payload.user_id,
    email: payload.email,
    role: payload.role,
    sub: payload.sub,
  };

  return jwt.sign(newPayload, config.jwt.secret, {
    expiresIn: expirationSeconds,
    issuer: payload.iss || 'ecommerce-user-service',
    algorithm: 'HS256',
  });
}

/**
 * Middleware to refresh JWT token if close to expiration
 * Should be used after authenticateJWT middleware
 */
export function refreshTokenIfNeeded(
  customConfig: Partial<TokenRefreshConfig> = {}
) {
  const refreshConfig = { ...defaultConfig, ...customConfig };

  return (req: Request, res: Response, next: NextFunction): void => {
    // Skip if disabled
    if (!refreshConfig.enabled) {
      return next();
    }

    // Skip if no user (not authenticated)
    if (!req.user) {
      return next();
    }

    try {
      // Check if token should be refreshed
      if (shouldRefreshToken(req.user, refreshConfig)) {
        // Generate new token
        const newToken = generateNewToken(req.user, refreshConfig.newTokenExpiration);

        // Set new token as httpOnly cookie
        res.cookie('auth_token', newToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: refreshConfig.newTokenExpiration * 1000,
        });

        logger.info('JWT token refreshed', {
          userId: req.user.user_id,
          email: req.user.email,
          oldExpiration: new Date(req.user.exp * 1000).toISOString(),
          newExpiration: new Date(Date.now() + refreshConfig.newTokenExpiration * 1000).toISOString(),
        });

        // Also send new token in response header for clients that need it
        res.setHeader('X-Token-Refreshed', 'true');
        res.setHeader('X-Token-Expires', (Date.now() + refreshConfig.newTokenExpiration * 1000).toString());
      }
    } catch (error) {
      // Log error but don't fail the request
      logger.error('Error refreshing token', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.user.user_id,
      });
    }

    next();
  };
}

/**
 * Middleware for explicit token refresh endpoint
 * POST /api/v1/auth/refresh
 */
export function refreshTokenEndpoint(req: Request, res: Response): void {
  // User must be authenticated
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  try {
    // Generate new token regardless of expiration
    const newToken = generateNewToken(req.user, defaultConfig.newTokenExpiration);

    // Set new token as httpOnly cookie
    res.cookie('auth_token', newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: defaultConfig.newTokenExpiration * 1000,
    });

    logger.info('JWT token explicitly refreshed', {
      userId: req.user.user_id,
      email: req.user.email,
    });

    res.json({
      message: 'Token refreshed successfully',
      expiresAt: new Date(Date.now() + defaultConfig.newTokenExpiration * 1000).toISOString(),
    });
  } catch (error) {
    logger.error('Error in explicit token refresh', {
      error: error instanceof Error ? error.message : 'Unknown error',
      userId: req.user.user_id,
    });
    res.status(500).json({ error: 'Failed to refresh token' });
  }
}

/**
 * Get token expiration info
 * Useful for frontend to know when to refresh
 */
export function getTokenInfo(req: Request, res: Response): void {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  const currentTime = Math.floor(Date.now() / 1000);
  const expirationTime = req.user.exp || 0;
  const timeUntilExpiration = Math.max(0, expirationTime - currentTime);

  res.json({
    userId: req.user.user_id,
    email: req.user.email,
    role: req.user.role,
    issuedAt: new Date(req.user.iat * 1000).toISOString(),
    expiresAt: new Date(expirationTime * 1000).toISOString(),
    secondsUntilExpiration: timeUntilExpiration,
    shouldRefresh: shouldRefreshToken(req.user, defaultConfig),
  });
}

/**
 * Example usage in route setup:
 *
 * import { authenticateJWT } from './middleware/auth';
 * import { refreshTokenIfNeeded, refreshTokenEndpoint, getTokenInfo } from './middleware/tokenRefresh';
 *
 * // Apply to all authenticated routes
 * router.use(authenticateJWT);
 * router.use(refreshTokenIfNeeded());
 *
 * // Explicit refresh endpoint
 * router.post('/api/v1/auth/refresh', authenticateJWT, refreshTokenEndpoint);
 *
 * // Token info endpoint
 * router.get('/api/v1/auth/token-info', authenticateJWT, getTokenInfo);
 */
