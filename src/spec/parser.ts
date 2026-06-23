import SwaggerParser from '@apidevtools/swagger-parser';

export async function parseSpec(raw: Record<string, unknown>): Promise<Record<string, unknown>> {
  const api = await SwaggerParser.dereference(raw as never) as Record<string, unknown>;
  return api;
}
