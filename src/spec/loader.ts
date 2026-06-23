import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

export async function loadSpec(input: string): Promise<Record<string, unknown>> {
  let raw: string;

  if (input.startsWith('http://') || input.startsWith('https://')) {
    const res = await fetch(input);
    if (!res.ok) throw new Error(`Failed to fetch spec: ${res.status} ${res.statusText}`);
    raw = await res.text();
  } else {
    const resolved = path.resolve(process.cwd(), input);
    if (!fs.existsSync(resolved)) throw new Error(`File not found: ${resolved}`);
    raw = fs.readFileSync(resolved, 'utf8');
  }

  const ext = input.split('?')[0].toLowerCase();
  if (ext.endsWith('.yaml') || ext.endsWith('.yml')) {
    return yaml.load(raw) as Record<string, unknown>;
  }
  return JSON.parse(raw);
}
