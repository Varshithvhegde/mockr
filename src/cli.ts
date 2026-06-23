import { Command } from 'commander';
import { faker } from '@faker-js/faker';
import chalk from 'chalk';
import http from 'http';
import chokidar from 'chokidar';
import { loadSpec } from './spec/loader';
import { parseSpec } from './spec/parser';
import { resolveSpec } from './spec/resolver';
import { createApp, AppOptions } from './server/app';
import { clearResponseCache } from './server/handlers/mock';
import { loadOverrides } from './server/overrides';
import { startDashboard, logPlain } from './tui/dashboard';
import { NormalisedSpec } from './spec/types';
import { runInit } from './commands/init';

const program = new Command();

program
  .name('mockr')
  .description('Zero-config OpenAPI mock server')
  .version('0.1.2');

function handleSpecError(err: unknown, specInput: string): never {
  const msg = (err as Error).message ?? String(err);
  if (msg.includes('ENOENT') || msg.includes('not found')) {
    console.error(chalk.red(`\n  ✗ File not found: ${specInput}`));
    console.error(chalk.gray('    Check the path is correct relative to your current directory.\n'));
  } else if (msg.includes('ECONNREFUSED') || msg.includes('fetch')) {
    console.error(chalk.red(`\n  ✗ Could not fetch spec from: ${specInput}`));
    console.error(chalk.gray('    Check the URL is accessible.\n'));
  } else if (msg.includes('YAMLException') || msg.includes('Unexpected token')) {
    console.error(chalk.red(`\n  ✗ Invalid YAML/JSON spec`));
    console.error(chalk.gray(`    ${msg}\n`));
  } else if (msg.includes('Missing required') || msg.includes('not a valid')) {
    console.error(chalk.red(`\n  ✗ Invalid OpenAPI spec`));
    console.error(chalk.gray(`    ${msg}`));
    console.error(chalk.gray('    Validate at https://editor.swagger.io\n'));
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
  .option('-p, --port <number>',         'Port to listen on',                         '3001')
  .option('--no-tui',                    'Disable terminal UI, use plain logging')
  .option('--delay <ms>',                'Artificial response delay in ms',            '0')
  .option('--seed <number>',             'Faker seed — same data on every run')
  .option('--watch',                     'Auto-reload on spec file change (local only)')
  .option('--proxy <url>',               'Proxy target — try real API first, fall back to mock')
  .option('--proxy-timeout <ms>',        'Timeout for proxy requests',                 '3000')
  .action(async (specInput: string, options: {
    port: string; tui: boolean; delay: string; seed?: string;
    watch?: boolean; proxy?: string; proxyTimeout: string;
  }) => {
    const port     = parseInt(options.port);
    const useCache = !!options.seed;

    if (options.seed) faker.seed(parseInt(options.seed));

    const overrides = loadOverrides();
    const appOptions: AppOptions = {
      delay:        parseInt(options.delay),
      useCache,
      proxyUrl:     options.proxy,
      proxyTimeout: parseInt(options.proxyTimeout),
      overrides,
    };

    let spec: NormalisedSpec;
    let server: http.Server;

    process.stdout.write(chalk.gray('  Loading spec...'));
    try {
      spec = await loadAndResolve(specInput);
    } catch (err) {
      handleSpecError(err, specInput);
    }
    process.stdout.write(chalk.green(` ✓  (${spec!.routes.length} routes)\n`));

    if (options.proxy) {
      console.log(chalk.cyan(`  Proxy → ${options.proxy}  (fallback to mock on error)\n`));
    }

    function startServer(s: NormalisedSpec): http.Server {
      const app = createApp(s, appOptions);
      const srv = app.listen(port, () => {
        if (options.tui !== false) {
          startDashboard(s.routes, port, s.title);
          console.log(chalk.gray(`  Web UI → `) + chalk.white(`http://localhost:${port}/__mockr/ui\n`));
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

    if (options.watch) {
      const isRemote = specInput.startsWith('http://') || specInput.startsWith('https://');
      if (isRemote) {
        console.warn(chalk.yellow('  ! --watch only works with local files.\n'));
      } else {
        const watcher = chokidar.watch(specInput, { ignoreInitial: true });
        watcher.on('change', async () => {
          console.log(chalk.cyan('\n  ↻ Spec changed — reloading...\n'));
          try {
            const newSpec = await loadAndResolve(specInput);
            if (options.seed) faker.seed(parseInt(options.seed!));
            clearResponseCache();
            server.close(() => { server = startServer(newSpec); });
          } catch (err) {
            console.error(chalk.red(`  ✗ Reload failed: ${(err as Error).message}`));
          }
        });
        process.on('SIGINT', () => {
          watcher.close();
          server.close(() => { console.log(chalk.gray('\n  mockr stopped.\n')); process.exit(0); });
        });
        return;
      }
    }

    process.on('SIGINT', () => {
      server.close(() => { console.log(chalk.gray('\n  mockr stopped.\n')); process.exit(0); });
    });
  });

program
  .command('init <spec>')
  .description('Generate a mockr.json config file with example overrides from an OpenAPI spec')
  .option('--force', 'Overwrite existing mockr.json')
  .action(async (specInput: string, options: { force?: boolean }) => {
    process.stdout.write(chalk.gray('  Loading spec...'));
    try {
      const raw    = await loadSpec(specInput);
      const parsed = await parseSpec(raw);
      const spec   = resolveSpec(parsed);
      process.stdout.write(chalk.green(` ✓  (${spec.routes.length} routes)\n`));
      runInit(spec, options.force ?? false);
    } catch (err) {
      handleSpecError(err, specInput);
    }
  });

program.parse(process.argv);
