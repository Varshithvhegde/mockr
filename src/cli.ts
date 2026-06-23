import { Command } from 'commander';
import { faker } from '@faker-js/faker';
import chalk from 'chalk';
import { loadSpec } from './spec/loader';
import { parseSpec } from './spec/parser';
import { resolveSpec } from './spec/resolver';
import { createApp } from './server/app';
import { startDashboard, logPlain } from './tui/dashboard';

const program = new Command();

program
  .name('mockr')
  .description('Zero-config OpenAPI mock server')
  .version('0.1.0');

program
  .command('serve <spec>')
  .description('Start mock server from an OpenAPI spec file or URL')
  .option('-p, --port <number>', 'Port to listen on', '3001')
  .option('--no-tui', 'Disable terminal UI, use plain logging')
  .option('--delay <ms>', 'Artificial response delay in milliseconds', '0')
  .option('--seed <number>', 'Faker seed for reproducible data')
  .action(async (specInput: string, options: {
    port: string;
    tui: boolean;
    delay: string;
    seed?: string;
  }) => {
    const port   = parseInt(options.port);
    const delay  = parseInt(options.delay);

    if (options.seed) {
      faker.seed(parseInt(options.seed));
    }

    try {
      process.stdout.write(chalk.gray('  Loading spec...'));
      const raw = await loadSpec(specInput);
      process.stdout.write(chalk.green(' ✓\n'));

      process.stdout.write(chalk.gray('  Parsing & dereferencing...'));
      const parsed = await parseSpec(raw);
      process.stdout.write(chalk.green(' ✓\n'));

      process.stdout.write(chalk.gray('  Building routes...'));
      const spec = resolveSpec(parsed);
      process.stdout.write(chalk.green(` ✓  (${spec.routes.length} routes)\n`));

      const app = createApp(spec, delay);

      const server = app.listen(port, () => {
        if (options.tui !== false) {
          startDashboard(spec.routes, port, spec.title);
        } else {
          logPlain(spec.routes, port, spec.title);
        }
      });

      server.on('error', (err: NodeJS.ErrnoException) => {
        if (err.code === 'EADDRINUSE') {
          console.error(chalk.red(`\n  ✗ Port ${port} is already in use.`));
          console.error(chalk.gray(`    Try: mockr serve ${specInput} --port ${port + 1}\n`));
          process.exit(1);
        }
        throw err;
      });

      // Graceful shutdown
      process.on('SIGINT', () => {
        server.close(() => {
          console.log(chalk.gray('\n  mockr stopped.\n'));
          process.exit(0);
        });
      });

    } catch (err) {
      console.error(chalk.red(`\n  ✗ ${(err as Error).message}\n`));
      process.exit(1);
    }
  });

program.parse(process.argv);
