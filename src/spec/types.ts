export type HttpMethod = 'get' | 'post' | 'put' | 'patch' | 'delete' | 'head' | 'options';

export interface ParamSchema {
  name: string;
  required: boolean;
  schema: JSONSchema;
}

export type JSONSchema = Record<string, unknown>;

export interface NormalisedRoute {
  path: string;          // Express-style: /users/:id
  openApiPath: string;   // Original: /users/{id}
  method: HttpMethod;
  operationId?: string;
  tags: string[];
  summary?: string;
  pathParams: ParamSchema[];
  queryParams: ParamSchema[];
  requestBodySchema?: JSONSchema;
  responseSchema: JSONSchema;
  statusCode: number;
  security: boolean;
}

export interface NormalisedSpec {
  title: string;
  version: string;
  routes: NormalisedRoute[];
  raw: Record<string, unknown>;
}
