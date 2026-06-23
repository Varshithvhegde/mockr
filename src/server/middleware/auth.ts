import { Request, Response, NextFunction } from 'express';

export function authMiddleware(req: Request, _res: Response, next: NextFunction): void {
  // Accept any auth header — never reject
  // This lets devs test without real tokens
  next();
}
