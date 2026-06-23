import { NormalisedSpec, NormalisedRoute, HttpMethod, ParamSchema, JSONSchema } from './types';

const HTTP_METHODS: HttpMethod[] = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options'];

function toExpressPath(openApiPath: string): string {
  return openApiPath.replace(/\{([^}]+)\}/g, ':$1');
}

function pickStatusCode(responses: Record<string, unknown>, method: HttpMethod): number {
  const codes = Object.keys(responses).map(Number).filter(n => !isNaN(n));
  if (method === 'post' && codes.includes(201)) return 201;
  const success = codes.find(c => c >= 200 && c < 300);
  return success ?? codes[0] ?? 200;
}

function extractResponseSchema(responses: Record<string, unknown>, statusCode: number): JSONSchema {
  const resp = responses[statusCode] as Record<string, unknown> | undefined
    ?? responses['default'] as Record<string, unknown> | undefined;
  if (!resp) return {};

  // OAS3: content['application/json'].schema
  const content = resp.content as Record<string, unknown> | undefined;
  if (content) {
    const json = content['application/json'] as Record<string, unknown> | undefined;
    if (json?.schema) return json.schema as JSONSchema;
    // try first content type
    const first = Object.values(content)[0] as Record<string, unknown> | undefined;
    if (first?.schema) return first.schema as JSONSchema;
  }

  // Swagger 2: schema directly on response
  if (resp.schema) return resp.schema as JSONSchema;

  return {};
}

function extractRequestBodySchema(operation: Record<string, unknown>): JSONSchema | undefined {
  // OAS3
  const rb = operation.requestBody as Record<string, unknown> | undefined;
  if (rb) {
    const content = rb.content as Record<string, unknown> | undefined;
    if (content) {
      const json = content['application/json'] as Record<string, unknown> | undefined;
      if (json?.schema) return json.schema as JSONSchema;
    }
  }

  // Swagger 2: body param
  const params = (operation.parameters as Record<string, unknown>[] | undefined) ?? [];
  const bodyParam = params.find(p => p.in === 'body');
  if (bodyParam?.schema) return bodyParam.schema as JSONSchema;

  return undefined;
}

function extractParams(operation: Record<string, unknown>, location: 'path' | 'query'): ParamSchema[] {
  const params = (operation.parameters as Record<string, unknown>[] | undefined) ?? [];
  return params
    .filter(p => p.in === location)
    .map(p => ({
      name: p.name as string,
      required: (p.required as boolean) ?? false,
      schema: (p.schema as JSONSchema | undefined) ?? { type: p.type ?? 'string' },
    }));
}

function hasSecurity(operation: Record<string, unknown>, globalSecurity: unknown[]): boolean {
  const opSec = operation.security as unknown[] | undefined;
  if (opSec !== undefined) return opSec.length > 0;
  return globalSecurity.length > 0;
}

export function resolveSpec(api: Record<string, unknown>): NormalisedSpec {
  const info = api.info as Record<string, unknown>;
  const paths = api.paths as Record<string, Record<string, unknown>>;
  const globalSecurity = (api.security as unknown[]) ?? [];
  const routes: NormalisedRoute[] = [];

  for (const [openApiPath, pathItem] of Object.entries(paths ?? {})) {
    for (const method of HTTP_METHODS) {
      const operation = pathItem[method] as Record<string, unknown> | undefined;
      if (!operation) continue;

      const responses = (operation.responses as Record<string, unknown>) ?? {};
      const statusCode = pickStatusCode(responses, method);
      const responseSchema = extractResponseSchema(responses, statusCode);

      routes.push({
        path: toExpressPath(openApiPath),
        openApiPath,
        method,
        operationId: operation.operationId as string | undefined,
        tags: (operation.tags as string[]) ?? [],
        summary: operation.summary as string | undefined,
        pathParams: extractParams(operation, 'path'),
        queryParams: extractParams(operation, 'query'),
        requestBodySchema: extractRequestBodySchema(operation),
        responseSchema,
        statusCode,
        security: hasSecurity(operation, globalSecurity),
        routeDelay: typeof operation['x-mockr-delay'] === 'number' ? operation['x-mockr-delay'] as number : undefined,
      });
    }
  }

  return {
    title: (info?.title as string) ?? 'API',
    version: (info?.version as string) ?? '1.0.0',
    routes,
    raw: api,
  };
}
