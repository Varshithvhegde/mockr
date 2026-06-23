import express, { Express } from 'express';
import cors from 'cors';
import { NormalisedSpec } from '../spec/types';
import { buildRouter } from './router';
import { requestLogger } from './middleware/logger';

export function createApp(spec: NormalisedSpec, delay: number): Express {
  const app = express();

  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(requestLogger);

  // Health check
  app.get('/__mockr/health', (_req, res) => {
    res.json({ ok: true, routes: spec.routes.length, title: spec.title });
  });

  // Routes endpoint — list all mocked routes
  app.get('/__mockr/routes', (_req, res) => {
    res.json(spec.routes.map(r => ({
      method: r.method.toUpperCase(),
      path: r.path,
      operationId: r.operationId,
      statusCode: r.statusCode,
    })));
  });

  app.use(buildRouter(spec, delay));

  // 404 for unmatched routes
  app.use((req, res) => {
    res.status(404).json({
      error: 'not_found',
      message: `No mock defined for ${req.method} ${req.path}`,
      hint: 'Check /__mockr/routes for available endpoints',
    });
  });

  return app;
}
