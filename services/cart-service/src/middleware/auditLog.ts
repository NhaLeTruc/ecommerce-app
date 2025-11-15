import { Request, Response, NextFunction } from 'express';
import { logger } from './logger';

export enum AuditEventType {
  // Authentication events
  LOGIN_SUCCESS = 'auth.login.success',
  LOGIN_FAILURE = 'auth.login.failure',
  LOGOUT = 'auth.logout',
  TOKEN_EXPIRED = 'auth.token.expired',
  TOKEN_INVALID = 'auth.token.invalid',

  // Authorization events
  ACCESS_DENIED = 'authz.access.denied',
  ADMIN_ACCESS = 'authz.admin.access',

  // Cart events
  CART_ACCESSED = 'cart.accessed',
  CART_MODIFIED = 'cart.modified',
  CART_CLEARED = 'cart.cleared',

  // Security events
  RATE_LIMIT_EXCEEDED = 'security.rate_limit.exceeded',
  VALIDATION_FAILED = 'security.validation.failed',
  SUSPICIOUS_ACTIVITY = 'security.suspicious.activity',
}

export interface AuditLogEntry {
  timestamp: Date;
  eventType: AuditEventType;
  userId?: string;
  userEmail?: string;
  userRole?: string;
  ipAddress?: string;
  userAgent?: string;
  method?: string;
  path?: string;
  statusCode?: number;
  message?: string;
  metadata?: Record<string, any>;
  correlationId?: string;
}

/**
 * Audit logger for security-sensitive events
 */
export class AuditLogger {
  /**
   * Log an audit event
   */
  static log(entry: AuditLogEntry): void {
    const logEntry = {
      ...entry,
      timestamp: entry.timestamp || new Date(),
    };

    // Log to structured logger
    logger.info('AUDIT', logEntry);

    // In production, you would also:
    // 1. Write to a separate audit log file
    // 2. Send to SIEM (Security Information and Event Management) system
    // 3. Store in database for compliance
    // 4. Alert on critical events
  }

  /**
   * Log authentication success
   */
  static logAuthSuccess(userId: string, userEmail: string, req: Request): void {
    this.log({
      timestamp: new Date(),
      eventType: AuditEventType.LOGIN_SUCCESS,
      userId,
      userEmail,
      ipAddress: this.getClientIp(req),
      userAgent: req.headers['user-agent'],
      message: 'User logged in successfully',
      correlationId: (req as any).correlationId,
    });
  }

  /**
   * Log authentication failure
   */
  static logAuthFailure(email: string, reason: string, req: Request): void {
    this.log({
      timestamp: new Date(),
      eventType: AuditEventType.LOGIN_FAILURE,
      userEmail: email,
      ipAddress: this.getClientIp(req),
      userAgent: req.headers['user-agent'],
      message: `Login failed: ${reason}`,
      correlationId: (req as any).correlationId,
    });
  }

  /**
   * Log access denied event
   */
  static logAccessDenied(req: Request, reason: string): void {
    this.log({
      timestamp: new Date(),
      eventType: AuditEventType.ACCESS_DENIED,
      userId: req.user?.user_id,
      userEmail: req.user?.email,
      userRole: req.user?.role,
      ipAddress: this.getClientIp(req),
      userAgent: req.headers['user-agent'],
      method: req.method,
      path: req.path,
      message: `Access denied: ${reason}`,
      correlationId: (req as any).correlationId,
    });
  }

  /**
   * Log admin access
   */
  static logAdminAccess(req: Request): void {
    this.log({
      timestamp: new Date(),
      eventType: AuditEventType.ADMIN_ACCESS,
      userId: req.user?.user_id,
      userEmail: req.user?.email,
      userRole: req.user?.role,
      ipAddress: this.getClientIp(req),
      userAgent: req.headers['user-agent'],
      method: req.method,
      path: req.path,
      message: 'Admin accessed protected resource',
      correlationId: (req as any).correlationId,
    });
  }

  /**
   * Log cart modification
   */
  static logCartModification(userId: string, action: string, req: Request, metadata?: any): void {
    this.log({
      timestamp: new Date(),
      eventType: AuditEventType.CART_MODIFIED,
      userId,
      userEmail: req.user?.email,
      ipAddress: this.getClientIp(req),
      method: req.method,
      path: req.path,
      message: `Cart ${action}`,
      metadata,
      correlationId: (req as any).correlationId,
    });
  }

  /**
   * Log rate limit exceeded
   */
  static logRateLimitExceeded(req: Request): void {
    this.log({
      timestamp: new Date(),
      eventType: AuditEventType.RATE_LIMIT_EXCEEDED,
      userId: req.user?.user_id,
      ipAddress: this.getClientIp(req),
      userAgent: req.headers['user-agent'],
      method: req.method,
      path: req.path,
      message: 'Rate limit exceeded',
      correlationId: (req as any).correlationId,
    });
  }

  /**
   * Log validation failure
   */
  static logValidationFailure(req: Request, errors: any[]): void {
    this.log({
      timestamp: new Date(),
      eventType: AuditEventType.VALIDATION_FAILED,
      userId: req.user?.user_id,
      ipAddress: this.getClientIp(req),
      method: req.method,
      path: req.path,
      message: 'Input validation failed',
      metadata: { errors },
      correlationId: (req as any).correlationId,
    });
  }

  /**
   * Log suspicious activity
   */
  static logSuspiciousActivity(req: Request, description: string, metadata?: any): void {
    this.log({
      timestamp: new Date(),
      eventType: AuditEventType.SUSPICIOUS_ACTIVITY,
      userId: req.user?.user_id,
      userEmail: req.user?.email,
      ipAddress: this.getClientIp(req),
      userAgent: req.headers['user-agent'],
      method: req.method,
      path: req.path,
      message: `Suspicious activity detected: ${description}`,
      metadata,
      correlationId: (req as any).correlationId,
    });

    // In production, trigger alerts for suspicious activity
    // e.g., send to PagerDuty, Slack, email, etc.
  }

  /**
   * Extract client IP address from request
   * Handles proxies and load balancers
   */
  private static getClientIp(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
      return forwarded.split(',')[0].trim();
    }
    return req.ip || req.socket.remoteAddress || 'unknown';
  }
}

/**
 * Middleware to automatically log HTTP requests for audit
 * Use this on sensitive routes
 */
export function auditMiddleware(req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now();

  // Capture response
  const originalSend = res.send;
  res.send = function (data: any): Response {
    const duration = Date.now() - startTime;

    // Log if it's a security-sensitive operation
    if (req.user && (req.method !== 'GET' || res.statusCode >= 400)) {
      AuditLogger.log({
        timestamp: new Date(),
        eventType: AuditEventType.CART_ACCESSED,
        userId: req.user.user_id,
        userEmail: req.user.email,
        userRole: req.user.role,
        ipAddress: AuditLogger['getClientIp'](req),
        userAgent: req.headers['user-agent'],
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        message: `${req.method} ${req.path} - ${res.statusCode}`,
        metadata: { durationMs: duration },
        correlationId: (req as any).correlationId,
      });
    }

    return originalSend.call(this, data);
  };

  next();
}
