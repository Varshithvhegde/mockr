import fs from 'fs';
import path from 'path';

export interface SequenceStep {
  status?: number;
  body?: unknown;
  delay?: number;
  headers?: Record<string, string>;
}

export interface Override {
  method: string;
  path: string;
  status?: number;
  body?: unknown;
  delay?: number;
  headers?: Record<string, string>;
  /** Ordered list of responses — served one per call, last one repeats */
  sequence?: SequenceStep[];
}

export interface OverridesConfig {
  overrides: Override[];
}

const CONFIG_FILES = ['mockr.json', '.mockr.json', 'mockr.config.json'];

export function loadOverrides(cwd = process.cwd()): Override[] {
  for (const file of CONFIG_FILES) {
    const full = path.resolve(cwd, file);
    if (fs.existsSync(full)) {
      try {
        const raw = JSON.parse(fs.readFileSync(full, 'utf8')) as OverridesConfig;
        const list = raw.overrides ?? [];
        console.log(`  Loaded ${list.length} override(s) from ${file}`);
        return list;
      } catch (err) {
        console.warn(`  Warning: failed to parse ${file}: ${(err as Error).message}`);
      }
    }
  }
  return [];
}

export function findOverride(overrides: Override[], method: string, path: string): Override | undefined {
  return overrides.find(o =>
    o.method.toLowerCase() === method.toLowerCase() &&
    matchPath(o.path, path)
  );
}

/** Simple path matcher — supports :param wildcards */
function matchPath(pattern: string, actual: string): boolean {
  if (pattern === actual) return true;
  const patParts = pattern.split('/');
  const actParts = actual.split('/');
  if (patParts.length !== actParts.length) return false;
  return patParts.every((p, i) => p.startsWith(':') || p === actParts[i]);
}
