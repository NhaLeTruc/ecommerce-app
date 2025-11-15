// Correlation ID middleware for Node.js/Express services
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

export const CORRELATION_ID_HEADER = 'X-Correlation-ID';

declare global {
  namespace Express {
    interface Request {
      correlationId?: string;
    }
  }
}

/**
 * Middleware to extract or generate correlation IDs for request tracing
 * Adds correlation ID to request object and response headers
 */
export function correlationIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Extract from header or generate new
  const correlationId = req.headers[CORRELATION_ID_HEADER.toLowerCase()] as string || uuidv4();

  // Attach to request
  req.correlationId = correlationId;

  // Add to response headers
  res.setHeader(CORRELATION_ID_HEADER, correlationId);

  // Add to all logs (if logger supports it)
  if (req.log) {
    req.log = req.log.child({ correlationId });
  }

  next();
}

/**
 * Get correlation ID from request
 */
export function getCorrelationId(req: Request): string {
  return req.correlationId || 'unknown';
}
