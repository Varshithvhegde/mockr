import { Request, Response, NextFunction } from 'express';
import { eventBus } from '../../tui/eventBus';
import { sseManager } from '../ui/sseManager';

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  // Skip internal mockr routes from the log
  if (req.path.startsWith('/__mockr')) { next(); return; }

  const start       = Date.now();
  const reqBody     = req.body && Object.keys(req.body).length > 0 ? req.body : undefined;
  let   responseBody: unknown;

  // Capture response body by wrapping res.json
  const origJson = res.json.bind(res) as typeof res.json;
  res.json = function(body: unknown) {
    responseBody = body;
    return origJson(body);
  };

  res.on('finish', () => {
    const evt = {
      method:       req.method,
      path:         req.originalUrl || req.path,
      status:       res.statusCode,
      duration:     Date.now() - start,
      timestamp:    new Date(),
      source:       (res.locals.mockrSource as 'proxy' | 'mock' | undefined),
      requestBody:  reqBody,
      responseBody,
    };
    eventBus.emit('request', evt);
    sseManager.push(evt);
  });

  next();
}
