import { useState } from 'react';
import { useSSE } from './hooks/useSSE';
import { StatsBar } from './components/StatsBar';
import { Sidebar } from './components/Sidebar';
import { RouteDetail } from './components/RouteDetail';
import { RequestLogPanel } from './components/RequestLog';

export default function App() {
  const { connected, routes, logs, clearLogs } = useSSE();
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const selectedRoute = selectedIdx != null ? routes[selectedIdx] : null;

  return (
    <div className="flex flex-col h-screen bg-slate-900 text-slate-200 overflow-hidden">
      <StatsBar connected={connected} logs={logs} routeCount={routes.length} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar routes={routes} selectedIdx={selectedIdx} onSelect={setSelectedIdx} />
        <main className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-hidden flex flex-col">
            {selectedRoute ? (
              <RouteDetail route={selectedRoute} />
            ) : (
              <div className="flex-1 flex items-center justify-center flex-col gap-3 text-slate-600">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
                </svg>
                <p className="text-sm">Select a route from the sidebar to inspect</p>
                <p className="text-xs text-slate-700">or make API requests to see them in the log below</p>
              </div>
            )}
          </div>
          <RequestLogPanel logs={logs} onClear={clearLogs} />
        </main>
      </div>
    </div>
  );
}
