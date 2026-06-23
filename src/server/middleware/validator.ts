import { Request, Response, NextFunction } from 'express';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { NormalisedRoute } from '../../spec/types';

const ajv = new Ajv({ allErrors: true, coerceTypes: true });
addFormats(ajv as never);

// Pre-compile validators keyed by operationId or method:path
const validators = new Map<string, ReturnType<typeof ajv.compile>>();

function getValidator(route: NormalisedRoute) {
  if (!route.requestBodySchema || Object.keys(route.requestBodySchema).length === 0) return null;
  const key = route.operationId ?? `${route.method}:${route.path}`;
  if (!validators.has(key)) {
    try {
      validators.set(key, ajv.compile(route.requestBodySchema));
    } catch {
      return null; // schema too complex to compile — skip
    }
  }
  return validators.get(key)!;
}

export function createValidatorMiddleware(routes: NormalisedRoute[], strict: boolean) {
  // Build a map of method+path → route for fast lookup
  const routeMap = new Map<string, NormalisedRoute>();
  for (const r of routes) {
    routeMap.set(`${r.method}:${r.path}`, r);
  }

  return (req: Request, res: Response, next: NextFunction): void => {
    if (req.path.startsWith('/__mockr')) { next(); return; }

    // Find matching route (handle path params)
    let matchedRoute: NormalisedRoute | undefined;
    for (const [, route] of routeMap) {
      if (route.method !== req.method.toLowerCase()) continue;
      if (pathMatches(route.path, req.path)) {
        matchedRoute = route;
        break;
      }
    }

    if (!matchedRoute) { next(); return; }

    const validate = getValidator(matchedRoute);
    if (!validate) { next(); return; }

    const hasBody = ['POST','PUT','PATCH'].includes(req.method);
    if (!hasBody || !req.body || Object.keys(req.body).length === 0) {
      next();
      return;
    }

    const valid = validate(req.body);
    if (!valid) {
      const errors = (validate.errors ?? []).map(e => ({
        field:   e.instancePath || '(root)',
        message: e.message,
        params:  e.params,
      }));

      if (strict) {
        // Strict mode: reject with 400
        res.status(400).json({
          error:    'validation_error',
          message:  'Request body failed schema validation',
          errors,
        });
        return;
      } else {
        // Warn mode: log to console but continue
        console.warn(
          `  \x1b[33m⚠ Validation warning\x1b[0m  ${req.method} ${req.path}`
        );
        for (const e of errors) {
          console.warn(`    field: ${e.field}  →  ${e.message}`);
        }
        // Add validation warnings to response header for debugging
        res.setHeader('X-Mockr-Validation-Warnings', JSON.stringify(errors).slice(0, 500));
      }
    }

    next();
  };
}

function pathMatches(routePath: string, reqPath: string): boolean {
  const rParts = routePath.split('/');
  const aParts = reqPath.split('/');
  if (rParts.length !== aParts.length) return false;
  return rParts.every((p, i) => p.startsWith(':') || p === aParts[i]);
}
