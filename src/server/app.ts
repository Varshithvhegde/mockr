import express, { Express } from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { NormalisedSpec } from '../spec/types';
import { buildRouter } from './router';
import { requestLogger } from './middleware/logger';
import { sseManager } from './ui/sseManager';
import { buildPostmanCollection } from './postman';
import { createScenarioMiddleware, Scenario } from './scenarios';
import { createValidatorMiddleware } from './middleware/validator';

// Path to the compiled React UI (ui-dist/ sits next to dist/ at project root)
const UI_DIST = path.resolve(__dirname, '../ui-dist');

export interface AppOptions {
  delay: number;
  useCache: boolean;
  proxyUrl?: string;
  proxyTimeout: number;
  overrides: import('./overrides').Override[];
  scenario: Scenario;
  validate: boolean;
  strict: boolean;
  record: boolean;
  recordingDir?: string;
}

export function createApp(spec: NormalisedSpec, options: AppOptions): Express {
  const app = express();

  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Serialise routes for the UI — pathParams/queryParams as string arrays
  const uiRoutes = spec.routes.map(r => ({
    method:      r.method,
    path:        r.path,
    operationId: r.operationId ?? '',
    summary:     r.summary ?? '',
    tags:        r.tags,
    statusCode:  r.statusCode,
    pathParams:  r.pathParams.map(p => p.name),
    queryParams: r.queryParams.map(p => p.name),
    schema:      JSON.stringify(r.responseSchema, null, 2),
  }));

  // SSE endpoint — before requestLogger so it doesn't flood the log
  app.get('/__mockr/events', (req, res) => {
    sseManager.addClient(res, uiRoutes);
    req.on('close', () => sseManager.removeClient(res));
  });

  app.use(requestLogger);

  // Validation middleware
  if (options.validate || options.strict) {
    app.use(createValidatorMiddleware(spec.routes, options.strict));
  }

  // Scenario middleware — applied globally before route handlers
  const scenarioMiddleware = createScenarioMiddleware(options.scenario);
  if (scenarioMiddleware) app.use(scenarioMiddleware);

  // System routes
  app.get('/__mockr/health', (_req, res) => {
    res.json({ ok: true, routes: spec.routes.length, title: spec.title });
  });

  app.get('/__mockr/routes', (_req, res) => {
    res.json(uiRoutes);
  });

  // Postman collection export
  app.get('/__mockr/postman', (req, res) => {
    const proto    = req.headers['x-forwarded-proto'] ?? req.protocol;
    const host     = req.headers.host ?? `localhost`;
    const baseUrl  = `${proto}://${host}`;
    const collection = buildPostmanCollection(spec, baseUrl);
    const filename   = `${spec.title.replace(/[^a-z0-9]/gi, '_')}_mockr.json`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.json(collection);
  });

  // Web UI — serve React app from ui-dist, fallback to inline template
  if (fs.existsSync(UI_DIST)) {
    app.use('/__mockr/ui', express.static(UI_DIST));
    app.get('/__mockr/ui/{*path}', (_req, res) => {
      res.sendFile(path.join(UI_DIST, 'index.html'));
    });
  } else {
    // Fallback: serve simple inline page pointing user to build the UI
    app.get('/__mockr/ui', (_req, res) => {
      res.setHeader('Content-Type', 'text/html');
      res.send('<html><body style="font-family:monospace;padding:40px;background:#0f172a;color:#e2e8f0"><h2>mockr UI</h2><p>Run <code>cd ui && npm run build</code> to build the UI, then restart mockr.</p></body></html>');
    });
  }

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
