import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';

const ipLimitMap = new Map<string, { count: number; reset: number }>();

export function rateLimit(options: { requests: number; window: string }) {
  const windowMs = 60000; // default 1 minute
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || 'unknown';
    const now = Date.now();

    const record = ipLimitMap.get(ip);
    if (!record || now > record.reset) {
      ipLimitMap.set(ip, { count: 1, reset: now + windowMs });
      return next();
    }

    record.count++;
    if (record.count > options.requests) {
      return next(new AppError('RATE_LIMIT_EXCEEDED', 'Too many requests, please slow down', 429));
    }
    next();
  };
}
