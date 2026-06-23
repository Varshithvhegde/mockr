import { Request, Response, NextFunction } from 'express';
import { eventBus } from '../../tui/eventBus';

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();
  res.on('finish', () => {
    eventBus.emit('request', {
      method: req.method,
      path: req.originalUrl || req.path,
      status: res.statusCode,
      duration: Date.now() - start,
      timestamp: new Date(),
    });
  });
  next();
}
