import { faker } from '@faker-js/faker';
import { JSONSchema } from '../spec/types';
import { applyHeuristic } from './heuristics';

const MAX_DEPTH = 8;
const ARRAY_DEFAULT_MIN = 1;
const ARRAY_DEFAULT_MAX = 4;

export function generateFromSchema(
  schema: JSONSchema,
  fieldName?: string,
  depth = 0,
  seen = new WeakSet<object>()
): unknown {
  if (!schema || typeof schema !== 'object') return null;

  // Circular reference guard
  if (seen.has(schema)) return null;
  seen.add(schema);

  // Depth guard
  if (depth > MAX_DEPTH) return null;

  try {
    // Use example/default if present
    if (schema.example !== undefined) return schema.example;
    if (schema.default !== undefined) return schema.default;

    // Enum
    if (Array.isArray(schema.enum) && schema.enum.length > 0) {
      return faker.helpers.arrayElement(schema.enum as unknown[]);
    }

    // Const
    if (schema.const !== undefined) return schema.const;

    // Nullable — sometimes produce null
    if (schema.nullable && faker.datatype.boolean({ probability: 0.1 })) return null;

    // Combiners
    if (schema.allOf) return handleAllOf(schema.allOf as JSONSchema[], fieldName, depth, seen);
    if (schema.oneOf) return handleOneOf(schema.oneOf as JSONSchema[], fieldName, depth, seen);
    if (schema.anyOf) return handleOneOf(schema.anyOf as JSONSchema[], fieldName, depth, seen);

    const type = schema.type as string | string[] | undefined;
    const types = Array.isArray(type) ? type : type ? [type] : [];

    // Pick first non-null type if array of types
    const resolvedType = types.find(t => t !== 'null') ?? (
      schema.properties ? 'object' :
      schema.items ? 'array' :
      types[0] ?? 'string'
    );

    switch (resolvedType) {
      case 'object':  return handleObject(schema, fieldName, depth, seen);
      case 'array':   return handleArray(schema, fieldName, depth, seen);
      case 'string':  return handleString(schema, fieldName);
      case 'number':  return handleNumber(schema);
      case 'integer': return handleInteger(schema);
      case 'boolean': return faker.datatype.boolean();
      case 'null':    return null;
      default:
        // No type — try heuristic then fallback
        if (fieldName) {
          const { value, matched } = applyHeuristic(fieldName);
          if (matched) return value;
        }
        return faker.lorem.word();
    }
  } finally {
    seen.delete(schema);
  }
}

function handleObject(
  schema: JSONSchema,
  _fieldName: string | undefined,
  depth: number,
  seen: WeakSet<object>
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const properties = schema.properties as Record<string, JSONSchema> | undefined;
  const required = (schema.required as string[]) ?? [];

  if (properties) {
    for (const [key, propSchema] of Object.entries(properties)) {
      const isRequired = required.includes(key);
      // Generate optional fields with 75% probability
      if (!isRequired && !faker.datatype.boolean({ probability: 0.75 })) continue;
      result[key] = generateFromSchema(propSchema, key, depth + 1, seen);
    }
  }

  // additionalProperties
  const addlProps = schema.additionalProperties;
  if (addlProps && typeof addlProps === 'object' && Object.keys(result).length === 0) {
    const count = faker.number.int({ min: 2, max: 4 });
    for (let i = 0; i < count; i++) {
      const key = faker.lorem.word();
      result[key] = generateFromSchema(addlProps as JSONSchema, key, depth + 1, seen);
    }
  }

  return result;
}

function handleArray(
  schema: JSONSchema,
  fieldName: string | undefined,
  depth: number,
  seen: WeakSet<object>
): unknown[] {
  const min = (schema.minItems as number) ?? ARRAY_DEFAULT_MIN;
  const max = Math.min((schema.maxItems as number) ?? ARRAY_DEFAULT_MAX, 10);
  const count = faker.number.int({ min, max });
  const items = schema.items as JSONSchema | undefined;
  if (!items) return Array.from({ length: count }, () => faker.lorem.word());

  return Array.from({ length: count }, () =>
    generateFromSchema(items, fieldName, depth + 1, seen)
  );
}

function handleString(schema: JSONSchema, fieldName?: string): string {
  const format = schema.format as string | undefined;

  // Format-based generation
  switch (format) {
    case 'date-time': return faker.date.recent().toISOString();
    case 'date':      return faker.date.recent().toISOString().split('T')[0];
    case 'time':      return faker.date.recent().toTimeString().split(' ')[0];
    case 'email':     return faker.internet.email();
    case 'uri':
    case 'url':       return faker.internet.url();
    case 'uuid':      return faker.string.uuid();
    case 'hostname':  return faker.internet.domainName();
    case 'ipv4':      return faker.internet.ip();
    case 'ipv6':      return faker.internet.ipv6();
    case 'password':  return faker.internet.password();
    case 'byte':      return Buffer.from(faker.lorem.word()).toString('base64');
    case 'binary':    return faker.string.alphanumeric(16);
  }

  // Field name heuristic
  if (fieldName) {
    const { value, matched } = applyHeuristic(fieldName);
    if (matched && typeof value === 'string') return value;
  }

  // Pattern
  if (schema.pattern) return faker.lorem.word();

  // Length constraints
  const minLen = (schema.minLength as number) ?? 1;
  const maxLen = (schema.maxLength as number) ?? 30;
  const len = faker.number.int({ min: minLen, max: Math.min(maxLen, 50) });

  if (len <= 10) return faker.lorem.word().slice(0, len) || faker.string.alphanumeric(len);
  if (len <= 50) return faker.lorem.sentence().slice(0, len);
  return faker.lorem.paragraph().slice(0, len);
}

function handleNumber(schema: JSONSchema): number {
  const min = (schema.minimum as number) ?? 0;
  const max = (schema.maximum as number) ?? 10000;
  return faker.number.float({ min, max, fractionDigits: 2 });
}

function handleInteger(schema: JSONSchema): number {
  const min = (schema.minimum as number) ?? 1;
  const max = (schema.maximum as number) ?? 10000;
  return faker.number.int({ min, max });
}

function handleAllOf(
  schemas: JSONSchema[],
  fieldName: string | undefined,
  depth: number,
  seen: WeakSet<object>
): Record<string, unknown> {
  const merged: Record<string, unknown> = {};
  for (const s of schemas) {
    const generated = generateFromSchema(s, fieldName, depth, seen);
    if (generated && typeof generated === 'object' && !Array.isArray(generated)) {
      Object.assign(merged, generated);
    }
  }
  return merged;
}

function handleOneOf(
  schemas: JSONSchema[],
  fieldName: string | undefined,
  depth: number,
  seen: WeakSet<object>
): unknown {
  const picked = faker.helpers.arrayElement(schemas);
  return generateFromSchema(picked, fieldName, depth, seen);
}
