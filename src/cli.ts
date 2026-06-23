import { Command } from 'commander';
import { faker } from '@faker-js/faker';
import chalk from 'chalk';
import http from 'http';
import chokidar from 'chokidar';
import { loadSpec } from './spec/loader';
import { parseSpec } from './spec/parser';
import { resolveSpec } from './spec/resolver';
import { createApp } from './server/app';
import { clearResponseCache } from './server/handlers/mock';
import { startDashboard, logPlain } from './tui/dashboard';
import { NormalisedSpec } from './spec/types';

const program = new Command();

program
  .name('mockr')
  .description('Zero-config OpenAPI mock server')
  .version('0.1.1');

// Fix 5 — clean error messages with helpful hints
function handleSpecError(err: unknown, specInput: string): never {
  const msg = (err as Error).message ?? String(err);

  if (msg.includes('ENOENT') || msg.includes('not found')) {
    console.error(chalk.red(`\n  ✗ File not found: ${specInput}`));
    console.error(chalk.gray('    Make sure the path is correct relative to your current directory.\n'));
  } else if (msg.includes('ECONNREFUSED') || msg.includes('fetch')) {
    console.error(chalk.red(`\n  ✗ Could not fetch spec from: ${specInput}`));
    console.error(chalk.gray('    Check the URL is accessible and returns a valid OpenAPI spec.\n'));
  } else if (msg.includes('YAMLException') || msg.includes('Unexpected token')) {
    console.error(chalk.red(`\n  ✗ Failed to parse spec — invalid YAML or JSON`));
    console.error(chalk.gray(`    ${msg}\n`));
  } else if (msg.includes('Missing required') || msg.includes('not a valid')) {
    console.error(chalk.red(`\n  ✗ Invalid OpenAPI spec`));
    console.error(chalk.gray(`    ${msg}`));
    console.error(chalk.gray('    Validate your spec at https://editor.swagger.io\n'));
  } else {
    console.error(chalk.red(`\n  ✗ ${msg}\n`));
  }

  process.exit(1);
}

async function loadAndResolve(specInput: string): Promise<NormalisedSpec> {
  const raw    = await loadSpec(specInput);
  const parsed = await parseSpec(raw);
  return resolveSpec(parsed);
}

program
  .command('serve <spec>')
  .description('Start mock server from an OpenAPI spec file or URL')
  .option('-p, --port <number>', 'Port to listen on', '3001')
  .option('--no-tui', 'Disable terminal UI, use plain logging')
  .option('--delay <ms>', 'Artificial response delay in milliseconds', '0')
  .option('--seed <number>', 'Faker seed — makes every run return identical data')
  .option('--watch', 'Watch spec file for changes and auto-reload (local files only)')
  .action(async (specInput: string, options: {
    port: string;
    tui: boolean;
    delay: string;
    seed?: string;
    watch?: boolean;
  }) => {
    const port     = parseInt(options.port);
    const delay    = parseInt(options.delay);
    const useCache = !!options.seed;   // Fix 4 — only cache when seed is set

    // Fix 4 — set seed before any generation so all runs produce same data
    if (options.seed) {
      faker.seed(parseInt(options.seed));
    }

    // Load + start initial server
    let spec: NormalisedSpec;
    let server: http.Server;

    process.stdout.write(chalk.gray('  Loading spec...'));
    try {
      spec = await loadAndResolve(specInput);
    } catch (err) {
      handleSpecError(err, specInput);
    }
    process.stdout.write(chalk.green(` ✓  (${spec!.routes.length} routes)\n`));

    function startServer(s: NormalisedSpec): http.Server {
      const app = createApp(s, delay, useCache);
      const srv = app.listen(port, () => {
        if (options.tui !== false) {
          startDashboard(s.routes, port, s.title);
        } else {
          logPlain(s.routes, port, s.title);
        }
      });

      srv.on('error', (err: NodeJS.ErrnoException) => {
        if (err.code === 'EADDRINUSE') {
          console.error(chalk.red(`\n  ✗ Port ${port} is already in use.`));
          console.error(chalk.gray(`    Try: mockr serve ${specInput} --port ${port + 1}\n`));
          process.exit(1);
        }
        throw err;
      });

      return srv;
    }

    server = startServer(spec!);

    // Fix 3 — watch mode (local files only)
    if (options.watch) {
      const isRemote = specInput.startsWith('http://') || specInput.startsWith('https://');
      if (isRemote) {
        console.warn(chalk.yellow('  ! --watch only works with local files. Skipping.\n'));
      } else {
        const watcher = chokidar.watch(specInput, { ignoreInitial: true });

        watcher.on('change', async () => {
          console.log(chalk.cyan('\n  ↻ Spec changed — reloading...\n'));
          try {
            const newSpec = await loadAndResolve(specInput);

            // Reset seed + cache for fresh data on reload
            if (options.seed) faker.seed(parseInt(options.seed));
            clearResponseCache();

            server.close(() => {
              server = startServer(newSpec);
            });
          } catch (err) {
            console.error(chalk.red(`  ✗ Reload failed: ${(err as Error).message}`));
            console.error(chalk.gray('  Server still running with previous spec.\n'));
          }
        });

        process.on('SIGINT', () => {
          watcher.close();
          server.close(() => {
            console.log(chalk.gray('\n  mockr stopped.\n'));
            process.exit(0);
          });
        });

        return; // SIGINT handler set above, skip the one below
      }
    }

    process.on('SIGINT', () => {
      server.close(() => {
        console.log(chalk.gray('\n  mockr stopped.\n'));
        process.exit(0);
      });
    });
  });

program.parse(process.argv);
