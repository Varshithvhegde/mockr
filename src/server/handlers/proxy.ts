import { Request, Response, NextFunction, RequestHandler } from 'express';
import { RecordingManager } from '../recording/recorder';

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
  fallback: RequestHandler,
  record = false,
  recordingDir?: string
): RequestHandler {
  const recorder = (record || recordingDir) ? new RecordingManager(recordingDir) : null;

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const query = req.search ?? req.url?.split('?')[1] ?? '';

    // --- Replay from recording if proxy is unavailable ---
    if (recorder) {
      const existing = recorder.load(req.method, req.path, query);
      if (existing && !record) {
        // replay-only mode: serve from recording
        res.locals.mockrSource = 'recording';
        res.status(existing.status).json(existing.body);
        return;
      }
    }

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
        let data: unknown;
        try {
          data = await proxyRes.json();
        } catch {
          const text = await proxyRes.text();
          res.send(text);
          return;
        }

        // Record the response
        if (recorder) {
          recorder.save({
            method:     req.method,
            path:       req.path,
            query,
            status:     proxyRes.status,
            headers:    { 'content-type': ct },
            body:       data,
            recordedAt: new Date().toISOString(),
          });
          res.setHeader('X-Mockr-Recorded', 'true');
        }

        res.json(data);
        return;
      }
      // 4xx/5xx from proxy — fall through to recording or mock
    } catch {
      clearTimeout(timer);
      // Network error or timeout — try recording then mock
    }

    // Try to serve from a recording before falling back to mock
    if (recorder) {
      const recorded = recorder.load(req.method, req.path, query);
      if (recorded) {
        res.locals.mockrSource = 'recording';
        res.status(recorded.status).json(recorded.body);
        return;
      }
    }

    res.locals.mockrSource = 'mock';
    return fallback(req, res, next);
  };
}
