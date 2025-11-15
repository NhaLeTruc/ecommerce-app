import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

export interface RequestWithCorrelation extends Request {
  correlationId?: string;
}

export function correlationIdMiddleware(req: RequestWithCorrelation, res: Response, next: NextFunction): void {
  const correlationId = (req.headers['x-correlation-id'] as string) || uuidv4();
  req.correlationId = correlationId;
  res.setHeader('X-Correlation-ID', correlationId);
  next();
}
