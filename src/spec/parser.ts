import SwaggerParser from '@apidevtools/swagger-parser';

export async function parseSpec(raw: Record<string, unknown>): Promise<Record<string, unknown>> {
  try {
    // Try strict dereference first (resolves all $refs inline)
    const api = await SwaggerParser.dereference(raw as never) as Record<string, unknown>;
    return api;
  } catch (err) {
    const msg = (err as Error).message ?? '';

    // If broken/missing $ref — fall back to bundle (leaves unresolvable $refs as-is)
    // and then do a best-effort manual inline of whatever CAN be resolved
    if (msg.includes('$ref') || msg.includes('pointer') || msg.includes('does not exist')) {
      try {
        const bundled = await SwaggerParser.bundle(raw as never) as Record<string, unknown>;
        return stripUnresolvableRefs(bundled);
      } catch {
        // Last resort — return raw spec and let resolver handle what it can
        return stripUnresolvableRefs(raw);
      }
    }

    throw err;
  }
}

/**
 * Walk the spec and replace any leftover $ref objects with an empty object schema
 * so the faker can still generate something reasonable.
 */
function stripUnresolvableRefs(obj: unknown, seen = new WeakSet<object>()): unknown {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(item => stripUnresolvableRefs(item, seen));

  const o = obj as Record<string, unknown>;
  if (seen.has(o)) return {};
  seen.add(o);

  // If this object IS a $ref, replace with permissive schema
  if (typeof o.$ref === 'string') {
    return { type: 'object', description: `[unresolved ref: ${o.$ref}]` };
  }

  const result: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(o)) {
    result[key] = stripUnresolvableRefs(val, seen);
  }
  return result;
}
