import { EventEmitter } from 'events';

export interface RequestEvent {
  method: string;
  path: string;
  status: number;
  duration: number;
  timestamp: Date;
}

class MockrEventBus extends EventEmitter {}

export const eventBus = new MockrEventBus();
