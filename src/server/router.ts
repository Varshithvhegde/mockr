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
  // Counter per "METHOD:path-pattern" — tracks which sequence step to serve next
  const sequenceCounters = new Map<string, number>();

  const middleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const match = findOverride(overrides, req.method, req.path);
    if (!match) { next(); return; }

    // Resolve sequence step if present
    let step: { status?: number; body?: unknown; delay?: number; headers?: Record<string, string> } = match;
    if (match.sequence && match.sequence.length > 0) {
      const key = `${match.method.toUpperCase()}:${match.path}`;
      const idx = sequenceCounters.get(key) ?? 0;
      // Stay on last step once exhausted (don't cycle)
      const stepIdx = Math.min(idx, match.sequence.length - 1);
      step = match.sequence[stepIdx];
      // Advance counter only if not yet at last step
      if (idx < match.sequence.length - 1) sequenceCounters.set(key, idx + 1);
      // Add header so clients can see which step was served
      res.setHeader('X-Mockr-Sequence-Step', `${stepIdx + 1}/${match.sequence.length}`);
    }

    if (step.delay && step.delay > 0) {
      await new Promise(r => setTimeout(r, step.delay));
    }
    if (step.headers) {
      for (const [k, v] of Object.entries(step.headers)) res.setHeader(k, v);
    }
    const status = step.status ?? 200;
    if (step.body === undefined) { res.status(status).end(); return; }

    // Process template tokens in the body
    const pathParams = extractPathParams(match.path, req.path);
    const resolvedBody = processTemplate(step.body, req, pathParams);

    res.status(status).json(resolvedBody);
  };

  const reset = () => sequenceCounters.clear();
  return { middleware, reset };
}

export interface RouterBundle {
  router: Router;
  reset: () => void;
}

export function buildRouter(spec: NormalisedSpec, options: AppOptions): RouterBundle {
  const router    = Router();
  const store     = new CrudStore();
  const listPaths = buildListPathSet(spec);

  const { middleware: overrideMiddleware, reset: resetSequences } = createOverrideMiddleware(options.overrides);

  const reset = () => {
    store.clear();
    resetSequences();
  };

  // Always register override middleware so hot-reload works even when
  // no overrides exist at startup (length check prevents registration)
  router.use(overrideMiddleware);

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

  return { router, reset };
}
