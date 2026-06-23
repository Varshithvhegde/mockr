import express, { Express } from 'express';
import cors from 'cors';
import { NormalisedSpec } from '../spec/types';
import { buildRouter } from './router';
import { requestLogger } from './middleware/logger';
import { sseManager } from './ui/sseManager';
import { buildUiHtml } from './ui/template';

export interface AppOptions {
  delay: number;
  useCache: boolean;
  proxyUrl?: string;
  proxyTimeout: number;
}

export function createApp(spec: NormalisedSpec, options: AppOptions): Express {
  const app = express();

  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // SSE endpoint — before requestLogger so it doesn't flood the log
  app.get('/__mockr/events', (req, res) => {
    sseManager.addClient(res, spec.routes as unknown[]);
    req.on('close', () => sseManager.removeClient(res));
  });

  app.use(requestLogger);

  // System routes
  app.get('/__mockr/health', (_req, res) => {
    res.json({ ok: true, routes: spec.routes.length, title: spec.title });
  });

  app.get('/__mockr/routes', (_req, res) => {
    res.json(spec.routes.map(r => ({
      method:      r.method.toUpperCase(),
      path:        r.path,
      operationId: r.operationId,
      summary:     r.summary,
      statusCode:  r.statusCode,
      tags:        r.tags,
    })));
  });

  // Web UI
  app.get('/__mockr/ui', (_req, res) => {
    res.setHeader('Content-Type', 'text/html');
    res.send(buildUiHtml(spec.routes));
  });

  app.use(buildRouter(spec, options));

  // 404 catch-all
  app.use((req, res) => {
    res.status(404).json({
      error:   'not_found',
      message: `No mock defined for ${req.method} ${req.path}`,
      hint:    'Check /__mockr/routes or visit /__mockr/ui',
    });
  });

  return app;
}
