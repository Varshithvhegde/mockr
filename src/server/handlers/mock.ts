import { Request, Response } from 'express';
import { faker } from '@faker-js/faker';
import { NormalisedRoute } from '../../spec/types';
import { generateFromSchema } from '../../faker/generator';

const PAGINATION_PARAMS = new Set(['page', 'limit', 'offset', 'per_page', 'size', 'cursor', 'skip', 'take']);

function applyPagination(data: unknown, query: Record<string, string>): unknown {
  if (!Array.isArray(data)) return data;

  const page  = parseInt(query.page ?? '1');
  const limit = parseInt(query.limit ?? query.per_page ?? query.size ?? '20');
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

export function createMockHandler(route: NormalisedRoute, delay: number) {
  return async (req: Request, res: Response): Promise<void> => {
    if (delay > 0) {
      await new Promise(r => setTimeout(r, delay));
    }

    const schema = route.responseSchema;
    let responseData: unknown;

    // Generate base response
    if (Object.keys(schema).length === 0) {
      // No schema defined — return empty object for non-GET, nothing for DELETE
      responseData = route.method === 'delete' ? undefined : {};
    } else {
      responseData = generateFromSchema(schema);
    }

    // Handle pagination if response is an array inside an envelope
    const hasPaginationParams = Object.keys(req.query).some(k => PAGINATION_PARAMS.has(k));
    if (hasPaginationParams) {
      if (Array.isArray(responseData)) {
        responseData = applyPagination(responseData, req.query as Record<string, string>);
      } else if (responseData && typeof responseData === 'object') {
        // Check if response is an envelope containing an array
        const obj = responseData as Record<string, unknown>;
        for (const [key, val] of Object.entries(obj)) {
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

    // Seed path params into response for consistency
    // e.g. GET /users/42 → response.id === 42
    if (route.pathParams.length > 0 && responseData && typeof responseData === 'object' && !Array.isArray(responseData)) {
      const obj = responseData as Record<string, unknown>;
      for (const param of route.pathParams) {
        const value = req.params[param.name];
        if (value !== undefined) {
          // Set id field if present
          if ('id' in obj || '_id' in obj) {
            if ('id' in obj) obj.id = value;
            if ('_id' in obj) obj._id = value;
          }
        }
      }
    }

    if (route.statusCode === 204 || responseData === undefined) {
      res.status(route.statusCode).end();
      return;
    }

    res.status(route.statusCode).json(responseData);
  };
}
