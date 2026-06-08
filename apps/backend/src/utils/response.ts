import { Response } from 'express';

export function success(res: Response, data: any, statusCode: number = 200, meta?: any) {
  return res.status(statusCode).json({
    success: true,
    data,
    ...(meta ? { meta } : {})
  });
}
