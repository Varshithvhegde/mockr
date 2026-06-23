/**
 * Response templating engine for mockr.json override bodies.
 *
 * Supported tokens:
 *
 * Request context:
 *   {{params.id}}          path param value  (e.g. /api/users/:id → "42")
 *   {{query.page}}         query string param
 *   {{body.name}}          request body field
 *   {{headers.authorization}} request header value
 *   {{method}}             HTTP method (GET, POST …)
 *   {{path}}               request path (/api/users/42)
 *
 * Faker shortcuts:
 *   {{faker.uuid}}         random UUID
 *   {{faker.email}}        random email
 *   {{faker.name}}         full name
 *   {{faker.firstName}}    first name
 *   {{faker.lastName}}     last name
 *   {{faker.phone}}        phone number
 *   {{faker.url}}          URL
 *   {{faker.image}}        image URL
 *   {{faker.number}}       random integer 1-1000
 *   {{faker.price}}        price (float)
 *   {{faker.date}}         ISO date string
 *   {{faker.datetime}}     ISO datetime string
 *   {{faker.word}}         single lorem word
 *   {{faker.sentence}}     lorem sentence
 *   {{faker.paragraph}}    lorem paragraph
 *   {{faker.boolean}}      true/false
 *   {{faker.slug}}         url-friendly slug
 *   {{faker.username}}     username
 *   {{faker.color}}        color name
 *   {{faker.city}}         city name
 *   {{faker.country}}      country name
 *   {{faker.company}}      company name
 *
 * Date helpers:
 *   {{now}}                current ISO datetime
 *   {{timestamp}}          unix timestamp (seconds)
 *
 * Examples:
 *   { "id": "{{params.id}}", "email": "{{faker.email}}" }
 *   { "message": "Hello {{body.name}}, your order {{params.orderId}} is ready" }
 */

import { faker } from '@faker-js/faker';
import { Request } from 'express';

type PathParams = Record<string, string>;

// Resolve a single token like "params.id" or "faker.email"
function resolveToken(token: string, req: Request, pathParams: PathParams): unknown {
  const t = token.trim();

  // Request context
  if (t === 'method')  return req.method;
  if (t === 'path')    return req.path;
  if (t === 'now')     return new Date().toISOString();
  if (t === 'timestamp') return Math.floor(Date.now() / 1000);

  if (t.startsWith('params.')) {
    const key = t.slice('params.'.length);
    return pathParams[key] ?? req.params?.[key] ?? null;
  }
  if (t.startsWith('query.')) {
    const key = t.slice('query.'.length);
    return (req.query as Record<string, unknown>)[key] ?? null;
  }
  if (t.startsWith('body.')) {
    const key = t.slice('body.'.length);
    if (req.body && typeof req.body === 'object') {
      return (req.body as Record<string, unknown>)[key] ?? null;
    }
    return null;
  }
  if (t.startsWith('headers.')) {
    const key = t.slice('headers.'.length).toLowerCase();
    return req.headers[key] ?? null;
  }

  // Faker shortcuts
  if (t.startsWith('faker.')) {
    const fn = t.slice('faker.'.length);
    switch (fn) {
      case 'uuid':        return faker.string.uuid();
      case 'email':       return faker.internet.email();
      case 'name':        return faker.person.fullName();
      case 'firstName':   return faker.person.firstName();
      case 'lastName':    return faker.person.lastName();
      case 'phone':       return faker.phone.number();
      case 'url':         return faker.internet.url();
      case 'image':       return faker.image.url();
      case 'number':      return faker.number.int({ min: 1, max: 1000 });
      case 'price':       return parseFloat(faker.commerce.price());
      case 'date':        return faker.date.recent().toISOString().split('T')[0];
      case 'datetime':    return faker.date.recent().toISOString();
      case 'word':        return faker.lorem.word();
      case 'sentence':    return faker.lorem.sentence();
      case 'paragraph':   return faker.lorem.paragraph();
      case 'boolean':     return faker.datatype.boolean();
      case 'slug':        return faker.helpers.slugify(faker.lorem.words(2));
      case 'username':    return faker.internet.username();
      case 'color':       return faker.color.human();
      case 'city':        return faker.location.city();
      case 'country':     return faker.location.country();
      case 'company':     return faker.company.name();
      default:            return `{{${t}}}`;  // unknown — leave as-is
    }
  }

  return `{{${t}}}`; // unrecognised — return original
}

// Replace all {{token}} occurrences in a string
function processString(str: string, req: Request, pathParams: PathParams): string {
  return str.replace(/\{\{([^}]+)\}\}/g, (_match, token) => {
    const value = resolveToken(token, req, pathParams);
    return value === null || value === undefined ? '' : String(value);
  });
}

// Walk the entire body recursively and process templates
export function processTemplate(body: unknown, req: Request, pathParams: PathParams): unknown {
  if (typeof body === 'string') {
    // Check if the ENTIRE string is a single token — preserve type
    const singleToken = body.match(/^\{\{([^}]+)\}\}$/);
    if (singleToken) {
      return resolveToken(singleToken[1], req, pathParams);
    }
    return processString(body, req, pathParams);
  }

  if (Array.isArray(body)) {
    return body.map(item => processTemplate(item, req, pathParams));
  }

  if (body && typeof body === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(body as Record<string, unknown>)) {
      out[key] = processTemplate(val, req, pathParams);
    }
    return out;
  }

  return body; // number, boolean, null — pass through
}

// Extract path params by matching override pattern against actual path
export function extractPathParams(pattern: string, actual: string): PathParams {
  const params: PathParams = {};
  const patParts = pattern.split('/');
  const actParts = actual.split('/');
  for (let i = 0; i < patParts.length; i++) {
    if (patParts[i].startsWith(':')) {
      params[patParts[i].slice(1)] = actParts[i] ?? '';
    }
  }
  return params;
}
