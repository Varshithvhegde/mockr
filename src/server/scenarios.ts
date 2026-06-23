/**
 * Scenario mode — flip the entire server behaviour with one flag.
 *
 * happy  → normal mock responses (default)
 * error  → all endpoints return 500 Internal Server Error
 * empty  → lists return [], objects return {}, strings return ""
 * slow   → random 1–5s delay added to every response
 * chaos  → random mix: 30% errors, 30% slow, 20% empty, 20% normal
 */

import { Request, Response, NextFunction } from 'express';
import { faker } from '@faker-js/faker';

export type Scenario = 'happy' | 'error' | 'empty' | 'slow' | 'chaos';

export const SCENARIOS: Scenario[] = ['happy', 'error', 'empty', 'slow', 'chaos'];

function emptyValue(val: unknown): unknown {
  if (Array.isArray(val))           return [];
  if (val === null)                 return null;
  if (typeof val === 'object')      return {};
  if (typeof val === 'string')      return '';
  if (typeof val === 'number')      return 0;
  if (typeof val === 'boolean')     return false;
  return null;
}

function deepEmpty(val: unknown): unknown {
  if (Array.isArray(val))      return [];
  if (val && typeof val === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(val as Record<string, unknown>)) {
      out[k] = emptyValue(v);
    }
    return out;
  }
  return emptyValue(val);
}

export function createScenarioMiddleware(scenario: Scenario) {
  if (scenario === 'happy') return null; // no-op

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Skip internal mockr routes
    if (req.path.startsWith('/__mockr')) { next(); return; }

    // Chaos: random behaviour per request
    const active = scenario === 'chaos'
      ? (faker.helpers.arrayElement(['error', 'slow', 'empty', 'normal', 'normal']) as string)
      : scenario;

    if (active === 'error') {
      res.status(500).json({
        error:   'internal_server_error',
        message: 'Scenario: error mode active',
        scenario,
      });
      return;
    }

    if (active === 'slow') {
      const delay = faker.number.int({ min: 1000, max: 5000 });
      await new Promise(r => setTimeout(r, delay));
      next(); // still returns mock data, just slowly
      return;
    }

    if (active === 'empty') {
      // Let the mock handler run, then intercept res.json to empty the body
      const origJson = res.json.bind(res) as typeof res.json;
      res.json = function(body: unknown) {
        return origJson(deepEmpty(body));
      };
      next();
      return;
    }

    // normal (chaos only)
    next();
  };
}
