export type HttpMethod = 'get' | 'post' | 'put' | 'patch' | 'delete' | 'head' | 'options';

export interface Route {
  method: HttpMethod;
  path: string;
  operationId?: string;
  summary?: string;
  tags: string[];
  statusCode: number;
  pathParams: string[];
  queryParams: string[];
  schema: string;
}

export interface RequestLog {
  id: number;
  method: string;
  path: string;
  status: number;
  duration: number;
  timestamp: string;
  source?: 'proxy' | 'mock';
  requestBody?: unknown;
  responseBody?: unknown;
}
