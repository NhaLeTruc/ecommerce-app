import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { logger } from './logger';
import { JWTPayload } from './auth';

/**
 * Token Refresh Middleware - Sliding Session Implementation
 */

interface TokenRefreshConfig {
  refreshWindow: number;
  newTokenExpiration: number;
  enabled: boolean;
}

const defaultConfig: TokenRefreshConfig = {
  refreshWindow: 3600, // 1 hour
  newTokenExpiration: 86400, // 24 hours
  enabled: process.env.TOKEN_REFRESH_ENABLED !== 'false',
};

function shouldRefreshToken(payload: JWTPayload, config: TokenRefreshConfig): boolean {
  if (!payload.exp) {
    return false;
  }

  const currentTime = Math.floor(Date.now() / 1000);
  const expirationTime = payload.exp;
  const timeUntilExpiration = expirationTime - currentTime;

  return timeUntilExpiration <= config.refreshWindow && timeUntilExpiration > 0;
}

function generateNewToken(payload: JWTPayload, expirationSeconds: number): string {
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

export function refreshTokenIfNeeded(
  customConfig: Partial<TokenRefreshConfig> = {}
) {
  const refreshConfig = { ...defaultConfig, ...customConfig };

  return (req: Request, res: Response, next: NextFunction): void => {
    if (!refreshConfig.enabled || !req.user) {
      return next();
    }

    try {
      if (shouldRefreshToken(req.user, refreshConfig)) {
        const newToken = generateNewToken(req.user, refreshConfig.newTokenExpiration);

        res.cookie('auth_token', newToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: refreshConfig.newTokenExpiration * 1000,
        });

        logger.info('JWT token refreshed', {
          userId: req.user.user_id,
          email: req.user.email,
        });

        res.setHeader('X-Token-Refreshed', 'true');
        res.setHeader('X-Token-Expires', (Date.now() + refreshConfig.newTokenExpiration * 1000).toString());
      }
    } catch (error) {
      logger.error('Error refreshing token', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.user.user_id,
      });
    }

    next();
  };
}

export function refreshTokenEndpoint(req: Request, res: Response): void {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  try {
    const newToken = generateNewToken(req.user, defaultConfig.newTokenExpiration);

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
