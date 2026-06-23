import { Router, Request, Response, NextFunction } from 'express';
import { NormalisedSpec, NormalisedRoute } from '../spec/types';
import { createMockHandler } from './handlers/mock';
import { createCrudHandler } from './handlers/crud';
import { createProxyHandler } from './handlers/proxy';
import { authMiddleware } from './middleware/auth';
import { CrudStore } from './store/crudStore';
import { AppOptions } from './app';
import { findOverride, Override } from './overrides';
import { processTemplate, extractPathParams } from './template';

/** Strip the last /:param segment to get the collection base path */
function deriveCollectionBase(route: NormalisedRoute): string | null {
  if (route.pathParams.length === 0) return route.path; // could be list endpoint itself
  // e.g. /api/users/:id → /api/users
  const lastParam = route.pathParams[route.pathParams.length - 1].name;
  const idx = route.path.lastIndexOf('/');
  const base = route.path.slice(0, idx);
  return base || null;
}

/** Build a set of all bare GET collection paths (no path params) */
function buildListPathSet(spec: NormalisedSpec): Set<string> {
  return new Set(
    spec.routes
      .filter(r => r.method === 'get' && r.pathParams.length === 0)
      .map(r => r.path)
  );
}

const NON_REST_FRAGMENTS = [
  'auth', 'login', 'logout', 'signup', 'refresh', 'otp', 'google',
  'chatbot', 'chat', 'media', 'contact', 'health', 'suggest',
  'send-otp', 'verify-otp', 'upload-avatar', 'complete-profile',
  'cloudinary', 'view', 'initiate', 'read-all', 'unread',
  'signature', 'discard', 'confirm', 'email-change', 'change-password',
  'delete', 'test', 'dashboard', 'stats',
];

function isNonRestPath(path: string): boolean {
  return NON_REST_FRAGMENTS.some(f => path.toLowerCase().includes(f));
}

function createOverrideMiddleware(overrides: Override[]) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const match = findOverride(overrides, req.method, req.path);
    if (!match) { next(); return; }

    if (match.delay && match.delay > 0) {
      await new Promise(r => setTimeout(r, match.delay));
    }
    if (match.headers) {
      for (const [k, v] of Object.entries(match.headers)) res.setHeader(k, v);
    }
    const status = match.status ?? 200;
    if (match.body === undefined) { res.status(status).end(); return; }

    // Process template tokens in the body
    const pathParams = extractPathParams(match.path, req.path);
    const resolvedBody = processTemplate(match.body, req, pathParams);

    res.status(status).json(resolvedBody);
  };
}

export function buildRouter(spec: NormalisedSpec, options: AppOptions): Router {
  const router    = Router();
  const store     = new CrudStore();
  const listPaths = buildListPathSet(spec);

  // Always register override middleware so hot-reload works even when
  // no overrides exist at startup (length check prevents registration)
  router.use(createOverrideMiddleware(options.overrides));

  for (const route of spec.routes) {
    const collectionBase = deriveCollectionBase(route);
    const isRestRoute = (
      collectionBase !== null &&
      listPaths.has(collectionBase) &&
      !isNonRestPath(route.path)
    );

    const baseHandler = isRestRoute
      ? createCrudHandler(route, store, collectionBase!)
      : createMockHandler(route, options.delay, options.useCache);

    const handler = options.proxyUrl
      ? createProxyHandler(
          options.proxyUrl,
          options.proxyTimeout,
          baseHandler,
          options.record,
          options.recordingDir
        )
      : baseHandler;

    (router as unknown as Record<string, Function>)[route.method](
      route.path,
      authMiddleware,
      handler
    );
  }

  return router;
}
