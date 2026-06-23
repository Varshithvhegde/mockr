import { Router } from 'express';
import { NormalisedSpec, NormalisedRoute } from '../spec/types';
import { createMockHandler } from './handlers/mock';
import { createCrudHandler } from './handlers/crud';
import { createProxyHandler } from './handlers/proxy';
import { authMiddleware } from './middleware/auth';
import { CrudStore } from './store/crudStore';
import { AppOptions } from './app';

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

export function buildRouter(spec: NormalisedSpec, options: AppOptions): Router {
  const router    = Router();
  const store     = new CrudStore();
  const listPaths = buildListPathSet(spec);

  for (const route of spec.routes) {
    const collectionBase = deriveCollectionBase(route);
    const isRestRoute = (
      collectionBase !== null &&
      listPaths.has(collectionBase) &&
      !isNonRestPath(route.path)
    );

    // Pick base handler
    const baseHandler = isRestRoute
      ? createCrudHandler(route, store, collectionBase!)
      : createMockHandler(route, options.delay, options.useCache);

    // Wrap with proxy if enabled
    const handler = options.proxyUrl
      ? createProxyHandler(options.proxyUrl, options.proxyTimeout, baseHandler)
      : baseHandler;

    (router as unknown as Record<string, Function>)[route.method](
      route.path,
      authMiddleware,
      handler
    );
  }

  return router;
}
