import chalk from 'chalk';
import { NormalisedRoute } from '../spec/types';
import { eventBus, RequestEvent } from './eventBus';

const METHOD_COLORS: Record<string, (s: string) => string> = {
  get:     s => chalk.green(s),
  post:    s => chalk.yellow(s),
  put:     s => chalk.blue(s),
  patch:   s => chalk.cyan(s),
  delete:  s => chalk.red(s),
  head:    s => chalk.magenta(s),
  options: s => chalk.gray(s),
};

function colorMethod(method: string): string {
  const fn = METHOD_COLORS[method.toLowerCase()] ?? ((s: string) => s);
  return fn(method.toUpperCase().padEnd(7));
}

function colorStatus(status: number): string {
  if (status >= 500) return chalk.red(String(status));
  if (status >= 400) return chalk.yellow(String(status));
  if (status >= 300) return chalk.cyan(String(status));
  return chalk.green(String(status));
}

function pad(s: string, len: number): string {
  return s.length >= len ? s.slice(0, len - 1) + '…' : s.padEnd(len);
}

export function startDashboard(routes: NormalisedRoute[], port: number, specTitle: string): void {
  console.clear();

  // Header
  console.log(chalk.bold.white('\n  ███╗   ███╗ ██████╗  ██████╗██╗  ██╗██████╗ '));
  console.log(chalk.bold.white('  ████╗ ████║██╔═══██╗██╔════╝██║ ██╔╝██╔══██╗'));
  console.log(chalk.bold.white('  ██╔████╔██║██║   ██║██║     █████╔╝ ██████╔╝'));
  console.log(chalk.bold.white('  ██║╚██╔╝██║██║   ██║██║     ██╔═██╗ ██╔══██╗'));
  console.log(chalk.bold.white('  ██║ ╚═╝ ██║╚██████╔╝╚██████╗██║  ██╗██║  ██║'));
  console.log(chalk.bold.white('  ╚═╝     ╚═╝ ╚═════╝  ╚═════╝╚═╝  ╚═╝╚═╝  ╚═╝'));
  console.log();
  console.log(chalk.gray(`  ${specTitle}  •  `) + chalk.white.bold(`http://localhost:${port}`));
  console.log(chalk.gray('  ' + '─'.repeat(60)));
  console.log();

  // Route table
  console.log(chalk.gray('  ' + 'METHOD '.padEnd(9) + 'PATH'.padEnd(45) + 'OPERATION'));
  console.log(chalk.gray('  ' + '─'.repeat(70)));
  for (const route of routes) {
    const method = colorMethod(route.method);
    const path = chalk.white(pad(route.path, 44));
    const op = chalk.gray(route.operationId ?? route.summary ?? '');
    const sec = route.security ? chalk.yellow(' 🔒') : '';
    console.log(`  ${method}  ${path}  ${op}${sec}`);
  }

  console.log();
  console.log(chalk.gray('  ' + '─'.repeat(70)));
  console.log(chalk.gray('  Requests:\n'));

  // Live request log
  eventBus.on('request', (evt: RequestEvent) => {
    const time = evt.timestamp.toTimeString().slice(0, 8);
    const method = colorMethod(evt.method);
    const path = chalk.white(pad(evt.path, 40));
    const status = colorStatus(evt.status);
    const duration = chalk.gray(`${evt.duration}ms`);
    console.log(`  ${chalk.gray(time)}  ${method}  ${path}  ${status}  ${duration}`);
  });
}

export function logPlain(routes: NormalisedRoute[], port: number, specTitle: string): void {
  console.log(`\nmockr — ${specTitle}`);
  console.log(`Server: http://localhost:${port}\n`);
  for (const r of routes) {
    console.log(`  ${r.method.toUpperCase().padEnd(7)} ${r.path}`);
  }
  console.log('\nListening for requests...\n');

  eventBus.on('request', (evt: RequestEvent) => {
    const time = evt.timestamp.toTimeString().slice(0, 8);
    console.log(`[${time}] ${evt.method.toUpperCase()} ${evt.path} ${evt.status} ${evt.duration}ms`);
  });
}
