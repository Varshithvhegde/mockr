import { useEffect, useRef, useState } from 'react';
import type { Route, RequestLog } from '../types';

interface SSEState {
  connected: boolean;
  routes: Route[];
  logs: RequestLog[];
}

export function useSSE() {
  const [state, setState] = useState<SSEState>({ connected: false, routes: [], logs: [] });
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    function connect() {
      const es = new EventSource('/__mockr/events');
      esRef.current = es;

      es.addEventListener('init', (e) => {
        const data = JSON.parse(e.data);
        setState(prev => ({
          connected: true,
          routes: data.routes ?? prev.routes,
          logs: (data.history ?? []).filter((r: RequestLog) => !r.path.startsWith('/__mockr')),
        }));
      });

      es.addEventListener('request', (e) => {
        const evt: RequestLog = JSON.parse(e.data);
        if (evt.path.startsWith('/__mockr')) return;
        setState(prev => ({
          ...prev,
          logs: [evt, ...prev.logs].slice(0, 200),
        }));
      });

      es.onerror = () => {
        setState(prev => ({ ...prev, connected: false }));
        es.close();
        setTimeout(connect, 2000);
      };
    }
    connect();
    return () => esRef.current?.close();
  }, []);

  const clearLogs = () => setState(prev => ({ ...prev, logs: [] }));

  return { ...state, clearLogs };
}
