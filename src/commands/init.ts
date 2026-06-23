import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { NormalisedSpec } from '../spec/types';
import { generateFromSchema } from '../faker/generator';

const CONFIG_FILE = 'mockr.json';

export function runInit(spec: NormalisedSpec, force: boolean): void {
  const outPath = path.resolve(process.cwd(), CONFIG_FILE);

  if (fs.existsSync(outPath) && !force) {
    console.error(chalk.yellow(`\n  ! ${CONFIG_FILE} already exists. Use --force to overwrite.\n`));
    process.exit(1);
  }

  const overrides: object[] = [];

  // Generate one example override per route
  for (const route of spec.routes) {
    const method = route.method.toUpperCase();
    const ex: Record<string, unknown> = {
      method,
      path: route.path,
      // Default: pass-through (no override active) — user uncomments to activate
    };

    // Show example body from schema
    if (Object.keys(route.responseSchema).length > 0) {
      try {
        ex['body'] = generateFromSchema(route.responseSchema);
      } catch {
        ex['body'] = {};
      }
    } else {
      ex['body'] = {};
    }

    ex['status'] = route.statusCode;
    // Comment hint — we store it as _comment since JSON has no comments
    ex['_comment'] = `Remove "_comment", "status", "body" keys you don't want to override`;

    overrides.push(ex);
  }

  const config = {
    _readme: [
      'mockr.json — custom response overrides',
      'Each entry overrides a specific endpoint when the server starts.',
      'Fields: method (required), path (required), status, body, delay (ms), headers',
      'Delete entries you don\'t want to override — mockr will use generated fake data for those.',
      'Docs: https://github.com/Varshithvhegde/mockr',
    ],
    overrides,
  };

  fs.writeFileSync(outPath, JSON.stringify(config, null, 2));

  console.log(chalk.green(`\n  ✓ Generated ${CONFIG_FILE} with ${overrides.length} endpoint overrides`));
  console.log(chalk.gray(`    Edit the file to customize responses, then run:`));
  console.log(chalk.white(`    node dist/cli.js serve <spec>\n`));

  // Print a quick summary
  console.log(chalk.gray('  Routes included:'));
  for (const r of spec.routes.slice(0, 8)) {
    console.log(chalk.gray(`    ${r.method.toUpperCase().padEnd(7)} ${r.path}`));
  }
  if (spec.routes.length > 8) {
    console.log(chalk.gray(`    ... and ${spec.routes.length - 8} more`));
  }
  console.log();
}
