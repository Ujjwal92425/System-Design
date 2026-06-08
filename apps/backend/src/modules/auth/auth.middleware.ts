import { Request, Response, NextFunction } from 'express';
export function issueTokens() {
  return (req: Request, res: Response, next: NextFunction) => {
    next();
  };
}
export function setRefreshCookie() {
  return (req: Request, res: Response, next: NextFunction) => {
    next();
  };
}
