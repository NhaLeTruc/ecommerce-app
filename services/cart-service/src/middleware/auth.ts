import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { logger } from './logger';
import { AuditLogger, AuditEventType } from './auditLog';

export interface JWTPayload {
  user_id: string;
  email: string;
  role: string;
  iat: number;
  exp: number;
  iss: string;
  sub: string;
}

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}

/**
 * Middleware to authenticate JWT tokens from Authorization header or cookie
 */
export function authenticateJWT(req: Request, res: Response, next: NextFunction): void {
  let token: string | undefined;

  // Try to get token from Authorization header first
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const parts = authHeader.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer') {
      token = parts[1];
    }
  }

  // If no token in header, try to get from cookie
  if (!token && req.cookies?.auth_token) {
    token = req.cookies.auth_token;
  }

  // If still no token, return unauthorized
  if (!token) {
    res.status(401).json({ error: 'Authorization required' });
    return;
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, config.jwt.secret, {
      algorithms: ['HS256'],
      issuer: 'ecommerce-user-service',
    }) as JWTPayload;

    // Attach user to request
    req.user = decoded;

    logger.debug('User authenticated', {
      userId: decoded.user_id,
      email: decoded.email,
      role: decoded.role,
    });

    next();
  } catch (error: any) {
    logger.warn('JWT validation failed', { error: error.message });

    // Audit log authentication failures
    if (error.name === 'TokenExpiredError') {
      AuditLogger.log({
        timestamp: new Date(),
        eventType: AuditEventType.TOKEN_EXPIRED,
        ipAddress: req.ip || req.socket.remoteAddress || 'unknown',
        userAgent: req.headers['user-agent'],
        message: 'Token expired',
        correlationId: (req as any).correlationId,
      });
      res.status(401).json({ error: 'Token has expired' });
      return;
    }

    if (error.name === 'JsonWebTokenError') {
      AuditLogger.log({
        timestamp: new Date(),
        eventType: AuditEventType.TOKEN_INVALID,
        ipAddress: req.ip || req.socket.remoteAddress || 'unknown',
        userAgent: req.headers['user-agent'],
        message: 'Invalid token',
        correlationId: (req as any).correlationId,
      });
      res.status(401).json({ error: 'Invalid token' });
      return;
    }

    res.status(401).json({ error: 'Authentication failed' });
  }
}

/**
 * Middleware to require specific roles
 */
export function requireRole(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      logger.warn('Access denied - insufficient permissions', {
        userId: req.user.user_id,
        userRole: req.user.role,
        requiredRoles: allowedRoles,
      });

      // Audit log access denied
      AuditLogger.logAccessDenied(req, `Required role: ${allowedRoles.join(', ')}, User role: ${req.user.role}`);

      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    // Audit log admin access
    if (allowedRoles.includes('admin') && req.user.role === 'admin') {
      AuditLogger.logAdminAccess(req);
    }

    next();
  };
}

/**
 * Convenience middleware for admin-only routes
 */
export const requireAdmin = requireRole('admin');
