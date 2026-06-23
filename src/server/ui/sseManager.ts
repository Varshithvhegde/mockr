import { Response } from 'express';
import { RequestEvent } from '../../tui/eventBus';

export interface FullRequestEvent extends RequestEvent {
  id: number;
  requestBody?: unknown;
  responseBody?: unknown;
}

class SseManager {
  private clients  = new Set<Response>();
  private history: FullRequestEvent[] = [];
  private counter  = 0;
  private readonly MAX = 200;

  addClient(res: Response, routes: unknown[]): void {
    res.setHeader('Content-Type',  'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection',    'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    // Send existing history + routes on connect
    this.send(res, 'init', { history: this.history, routes });
    this.clients.add(res);
  }

  removeClient(res: Response): void {
    this.clients.delete(res);
  }

  push(event: Omit<FullRequestEvent, 'id'>): void {
    const full: FullRequestEvent = { ...event, id: ++this.counter };
    this.history.push(full);
    if (this.history.length > this.MAX) this.history.shift();
    for (const client of this.clients) {
      this.send(client, 'request', full);
    }
  }

  private send(res: Response, type: string, data: unknown): void {
    try {
      res.write(`event: ${type}\ndata: ${JSON.stringify(data)}\n\n`);
    } catch {
      this.clients.delete(res);
    }
  }
}

export const sseManager = new SseManager();
