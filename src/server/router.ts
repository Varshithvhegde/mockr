import { Router } from 'express';
import { NormalisedSpec } from '../spec/types';
import { createMockHandler } from './handlers/mock';
import { authMiddleware } from './middleware/auth';

export function buildRouter(spec: NormalisedSpec, delay: number, useCache: boolean): Router {
  const router = Router();

  for (const route of spec.routes) {
    const handler = createMockHandler(route, delay, useCache);
    (router as unknown as Record<string, Function>)[route.method](
      route.path,
      authMiddleware,
      handler
    );
  }

  return router;
}
