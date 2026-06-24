import { Request, Response } from 'express';
import { faker } from '@faker-js/faker';
import { NormalisedRoute } from '../../spec/types';
import { generateFromSchema } from '../../faker/generator';

const PAGINATION_PARAMS = new Set(['page', 'limit', 'offset', 'per_page', 'size', 'cursor', 'skip', 'take']);
const MUTATING_METHODS = new Set(['post', 'put', 'patch']);

// Fix 4 — per-route cache so same endpoint returns same shape every run
const responseCache = new Map<string, unknown>();

function cacheKey(route: NormalisedRoute, req: Request): string {
  return `${route.method}:${req.path}`;
}

function applyPagination(data: unknown, query: Record<string, string>): unknown {
  if (!Array.isArray(data)) return data;
  const page   = parseInt(query.page  ?? '1');
  const limit  = parseInt(query.limit ?? query.per_page ?? query.size ?? '20');
  const offset = parseInt(query.offset ?? query.skip ?? String((page - 1) * limit));
  return data.slice(offset, offset + limit);
}

function wrapWithEnvelope(
  schema: Record<string, unknown>,
  items: unknown[],
  query: Record<string, string>
): unknown {
  const props = schema.properties as Record<string, unknown> | undefined;
  if (!props) return items;

  const result: Record<string, unknown> = {};
  for (const key of Object.keys(props)) {
    const lower = key.toLowerCase();
    if (['items', 'data', 'results', 'records', 'list'].includes(lower)) {
      result[key] = items;
    } else if (['total', 'count', 'totalcount', 'totalitems'].includes(lower)) {
      result[key] = faker.number.int({ min: items.length, max: 500 });
    } else if (lower === 'page') {
      result[key] = parseInt(query.page ?? '1');
    } else if (['limit', 'perpage', 'per_page', 'pagesize'].includes(lower)) {
      result[key] = parseInt(query.limit ?? '20');
    } else if (['hasprevious', 'has_previous'].includes(lower)) {
      result[key] = parseInt(query.page ?? '1') > 1;
    } else if (['hasnext', 'has_next', 'hasnextpage'].includes(lower)) {
      result[key] = true;
    } else if (lower === 'pages' || lower === 'totalpages') {
      result[key] = faker.number.int({ min: 1, max: 20 });
    } else {
      result[key] = generateFromSchema(props[key] as Record<string, unknown>, key);
    }
  }
  return result;
}

// Fix 2 — merge request body into response for mutating methods
function mergeRequestBody(responseData: unknown, body: unknown): unknown {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return responseData;
  if (!responseData || typeof responseData !== 'object' || Array.isArray(responseData)) return responseData;

  // Request body fields win — they reflect what the user sent
  return { ...(responseData as object), ...(body as object) };
}

export function clearResponseCache(): void {
  responseCache.clear();
}

export function createMockHandler(route: NormalisedRoute, delay: number, useCache: boolean) {
  return async (req: Request, res: Response): Promise<void> => {
    // Per-route delay (x-mockr-delay) takes precedence over global --delay
    const effectiveDelay = route.routeDelay ?? delay;
    if (effectiveDelay > 0) {
      await new Promise(r => setTimeout(r, effectiveDelay));
    }

    const schema = route.responseSchema;
    let responseData: unknown;
    const key = cacheKey(route, req);

    // Spec example takes highest priority — use as-is
    if (route.responseExample !== undefined) {
      responseData = route.responseExample;
      res.setHeader('X-Mockr-Source', 'spec-example');
    }
    // Fix 4 — serve cached response for reproducibility (GET only)
    else if (useCache && route.method === 'get' && responseCache.has(key)) {
      responseData = responseCache.get(key);
    } else {
      if (Object.keys(schema).length === 0) {
        responseData = route.method === 'delete' ? undefined : {};
      } else {
        responseData = generateFromSchema(schema);
      }

      // Cache GET responses
      if (useCache && route.method === 'get') {
        responseCache.set(key, responseData);
      }
    }

    // Handle pagination
    const hasPaginationParams = Object.keys(req.query).some(k => PAGINATION_PARAMS.has(k));
    if (hasPaginationParams) {
      if (Array.isArray(responseData)) {
        responseData = applyPagination(responseData, req.query as Record<string, string>);
      } else if (responseData && typeof responseData === 'object') {
        const obj = responseData as Record<string, unknown>;
        for (const [, val] of Object.entries(obj)) {
          if (Array.isArray(val)) {
            const paginated = applyPagination(val, req.query as Record<string, string>);
            responseData = wrapWithEnvelope(
              schema as Record<string, unknown>,
              paginated as unknown[],
              req.query as Record<string, string>
            );
            break;
          }
        }
      }
    }

    // Seed path params (e.g. GET /users/42 → id: "42")
    if (
      route.pathParams.length > 0 &&
      responseData &&
      typeof responseData === 'object' &&
      !Array.isArray(responseData)
    ) {
      const obj = responseData as Record<string, unknown>;
      for (const param of route.pathParams) {
        const value = req.params[param.name];
        if (value !== undefined) {
          if ('id'  in obj) obj.id  = value;
          if ('_id' in obj) obj._id = value;
        }
      }
    }

    // Fix 2 — POST/PUT/PATCH: echo back request body merged with fake data
    if (MUTATING_METHODS.has(route.method) && req.body && Object.keys(req.body).length > 0) {
      responseData = mergeRequestBody(responseData, req.body);
    }

    if (route.statusCode === 204 || responseData === undefined) {
      res.status(route.statusCode).end();
      return;
    }

    res.status(route.statusCode).json(responseData);
  };
}
