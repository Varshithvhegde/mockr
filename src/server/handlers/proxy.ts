import { Request, Response, NextFunction, RequestHandler } from 'express';

const HOP_BY_HOP = new Set([
  'connection', 'keep-alive', 'proxy-authenticate', 'proxy-authorization',
  'te', 'trailers', 'transfer-encoding', 'upgrade', 'host',
]);

function buildForwardHeaders(req: Request): Record<string, string> {
  const headers: Record<string, string> = {};
  for (const [key, val] of Object.entries(req.headers)) {
    if (!HOP_BY_HOP.has(key.toLowerCase()) && typeof val === 'string') {
      headers[key] = val;
    }
  }
  if (!headers['content-type'] && ['POST','PUT','PATCH'].includes(req.method)) {
    headers['content-type'] = 'application/json';
  }
  return headers;
}

export function createProxyHandler(
  proxyUrl: string,
  proxyTimeout: number,
  fallback: RequestHandler
): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const targetUrl = new URL(req.path + (req.search ?? ''), proxyUrl).toString();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), proxyTimeout);

    try {
      const hasBody = ['POST','PUT','PATCH'].includes(req.method);
      const body    = hasBody && req.body ? JSON.stringify(req.body) : undefined;
      const headers = buildForwardHeaders(req);

      const proxyRes = await fetch(targetUrl, {
        method:  req.method,
        headers,
        body,
        signal:  controller.signal,
      });

      clearTimeout(timer);

      if (proxyRes.ok) {
        res.locals.mockrSource = 'proxy';
        res.status(proxyRes.status);
        const ct = proxyRes.headers.get('content-type') ?? 'application/json';
        res.setHeader('content-type', ct);
        try {
          const data = await proxyRes.json();
          res.json(data);
        } catch {
          const text = await proxyRes.text();
          res.send(text);
        }
        return;
      }
      // 4xx/5xx — fall through to mock
    } catch {
      clearTimeout(timer);
      // Network error or timeout — fall through
    }

    res.locals.mockrSource = 'mock';
    return fallback(req, res, next);
  };
}
