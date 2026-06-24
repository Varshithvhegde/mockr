import express, { Express } from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { NormalisedSpec } from '../spec/types';
import { buildRouter } from './router';
import { clearResponseCache } from './handlers/mock';
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

  // Override editor — write/delete an override from the UI
  app.post('/__mockr/override', async (req, res) => {
    const { method, path: overridePath, status, body, delay, headers: hdrs, sequence, remove } = req.body ?? {};
    if (!method || !overridePath) {
      res.status(400).json({ error: 'method and path are required' });
      return;
    }

    const configFile = ['mockr.json', '.mockr.json', 'mockr.config.json']
      .map(f => path.resolve(process.cwd(), f))
      .find(f => fs.existsSync(f)) ?? path.resolve(process.cwd(), 'mockr.json');

    let config: { overrides: Record<string, unknown>[] } = { overrides: [] };
    if (fs.existsSync(configFile)) {
      try { config = JSON.parse(fs.readFileSync(configFile, 'utf8')); } catch {}
    }

    // Remove existing entry for this method+path
    config.overrides = (config.overrides ?? []).filter(
      (o: Record<string, unknown>) => !(o.method === method.toUpperCase() && o.path === overridePath)
    );

    if (!remove) {
      const entry: Record<string, unknown> = { method: method.toUpperCase(), path: overridePath };
      if (sequence !== undefined) {
        entry.sequence = sequence;
      } else {
        if (status  !== undefined) entry.status  = status;
        if (body    !== undefined) entry.body    = body;
        if (delay   !== undefined) entry.delay   = delay;
        if (hdrs    !== undefined) entry.headers = hdrs;
      }
      config.overrides.push(entry);
    }

    fs.writeFileSync(configFile, JSON.stringify(config, null, 2));

    // Hot-reload overrides in memory without restart
    options.overrides.splice(0, options.overrides.length, ...config.overrides.map((o: Record<string, unknown>) => o as import('./overrides').Override));

    res.json({ ok: true, total: config.overrides.length, file: path.basename(configFile) });
  });

  // Try it — proxy a request through the mock server and return result
  app.post('/__mockr/try', async (req, res) => {
    const { method, path: tryPath, body: tryBody, headers: tryHeaders, params } = req.body ?? {};
    if (!method || !tryPath) {
      res.status(400).json({ error: 'method and path are required' });
      return;
    }

    // Resolve path params
    let resolvedPath = tryPath;
    if (params && typeof params === 'object') {
      for (const [k, v] of Object.entries(params as Record<string, string>)) {
        resolvedPath = resolvedPath.replace(`:${k}`, encodeURIComponent(v));
      }
    }

    const proto = req.protocol;
    const host  = req.headers.host ?? 'localhost';
    const url   = `${proto}://${host}${resolvedPath}`;

    try {
      const fetchRes = await fetch(url, {
        method: method.toUpperCase(),
        headers: {
          'Content-Type': 'application/json',
          ...(tryHeaders ?? {}),
        },
        body: ['GET','DELETE','HEAD'].includes(method.toUpperCase())
          ? undefined
          : JSON.stringify(tryBody ?? {}),
      });

      const ct = fetchRes.headers.get('content-type') ?? '';
      let responseBody: unknown;
      try { responseBody = await fetchRes.json(); }
      catch { responseBody = await fetchRes.text(); }

      res.json({
        status:  fetchRes.status,
        headers: Object.fromEntries(fetchRes.headers.entries()),
        body:    responseBody,
      });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // Current overrides — so UI can show what's active
  app.get('/__mockr/overrides', (_req, res) => {
    res.json(options.overrides);
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

  const { router, reset } = buildRouter(spec, options);

  app.post('/__mockr/reset', (_req, res) => {
    reset();
    clearResponseCache();
    res.json({ ok: true, message: 'CRUD store, sequence counters, and response cache cleared' });
  });

  app.use(router);

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
