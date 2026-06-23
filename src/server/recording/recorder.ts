/**
 * Mock recorder — saves proxied responses to disk.
 * When real API is unavailable, replays from recordings.
 *
 * Recordings stored as:
 *   mockr-recordings/<METHOD>/<path-slugified>.json
 *   e.g. mockr-recordings/GET/api-products.json
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const DEFAULT_DIR = 'mockr-recordings';

export interface Recording {
  method: string;
  path: string;
  query: string;
  status: number;
  headers: Record<string, string>;
  body: unknown;
  recordedAt: string;
}

function slugify(str: string): string {
  return str.replace(/^\//, '').replace(/\//g, '-').replace(/[^a-z0-9-]/gi, '_') || 'root';
}

function recordingKey(method: string, reqPath: string, query: string): string {
  const base = `${method.toUpperCase()}-${slugify(reqPath)}`;
  if (!query) return base;
  // Include query hash so ?page=1 and ?page=2 get separate recordings
  const hash = crypto.createHash('md5').update(query).digest('hex').slice(0, 6);
  return `${base}-${hash}`;
}

export class RecordingManager {
  private dir: string;

  constructor(dir = DEFAULT_DIR) {
    this.dir = path.resolve(process.cwd(), dir);
  }

  private filePath(method: string, reqPath: string, query: string): string {
    const key = recordingKey(method, reqPath, query);
    const methodDir = path.join(this.dir, method.toUpperCase());
    fs.mkdirSync(methodDir, { recursive: true });
    return path.join(methodDir, `${key}.json`);
  }

  save(recording: Recording): void {
    const file = this.filePath(recording.method, recording.path, recording.query);
    fs.writeFileSync(file, JSON.stringify(recording, null, 2));
  }

  load(method: string, reqPath: string, query: string): Recording | null {
    const file = this.filePath(method, reqPath, query);
    if (!fs.existsSync(file)) return null;
    try {
      return JSON.parse(fs.readFileSync(file, 'utf8')) as Recording;
    } catch {
      return null;
    }
  }

  exists(method: string, reqPath: string, query: string): boolean {
    return fs.existsSync(this.filePath(method, reqPath, query));
  }

  count(): number {
    if (!fs.existsSync(this.dir)) return 0;
    let total = 0;
    for (const sub of fs.readdirSync(this.dir)) {
      const subDir = path.join(this.dir, sub);
      if (fs.statSync(subDir).isDirectory()) {
        total += fs.readdirSync(subDir).filter(f => f.endsWith('.json')).length;
      }
    }
    return total;
  }
}
