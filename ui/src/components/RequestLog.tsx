import { useState } from 'react';
import type { RequestLog } from '../types';
import { MethodBadge } from './MethodBadge';

interface Props {
  logs: RequestLog[];
  onClear: () => void;
}

function StatusBadge({ status }: { status: number }) {
  const cls = status >= 200 && status < 300
    ? 'text-green-400'
    : status >= 400
    ? 'text-red-400'
    : 'text-amber-400';
  return <span className={`font-mono font-bold text-xs ${cls}`}>{status}</span>;
}

function SourceBadge({ source }: { source?: 'proxy' | 'mock' }) {
  if (!source) return null;
  return source === 'proxy'
    ? <span className="text-[9px] font-bold bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded">PROXY</span>
    : <span className="text-[9px] font-bold bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded">MOCK</span>;
}

function ExpandedRow({ log }: { log: RequestLog }) {
  const req  = log.requestBody  ? JSON.stringify(log.requestBody,  null, 2) : null;
  const resp = log.responseBody ? JSON.stringify(log.responseBody, null, 2) : null;

  return (
    <tr className="bg-slate-950">
      <td colSpan={6} className="px-4 py-3">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Request body</div>
            <pre className="text-[11px] font-mono text-slate-300 bg-slate-900 rounded p-3 overflow-auto max-h-40 leading-relaxed">
              {req ?? <span className="text-slate-600">(none)</span>}
            </pre>
          </div>
          <div>
            <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Response body</div>
            <pre className="text-[11px] font-mono text-slate-300 bg-slate-900 rounded p-3 overflow-auto max-h-40 leading-relaxed">
              {resp ?? <span className="text-slate-600">(none)</span>}
            </pre>
          </div>
        </div>
      </td>
    </tr>
  );
}

export function RequestLogPanel({ logs, onClear }: Props) {
  const [expanded, setExpanded] = useState<number | null>(null);
  const [methodFilter, setMethodFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const filtered = logs.filter(l => {
    const mOk = methodFilter === 'ALL' || l.method.toUpperCase() === methodFilter;
    const sOk = statusFilter === 'ALL'
      || (statusFilter === '2xx' && l.status >= 200 && l.status < 300)
      || (statusFilter === '4xx' && l.status >= 400 && l.status < 500)
      || (statusFilter === '5xx' && l.status >= 500);
    return mOk && sOk;
  });

  return (
    <div className="flex flex-col border-t border-slate-700" style={{ height: 280 }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-800 border-b border-slate-700 flex-shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
            Request Log
          </span>
          <span className="text-[10px] text-slate-500">{filtered.length} requests</span>
        </div>
        <div className="flex items-center gap-2">
          {/* Filters */}
          {['ALL','GET','POST','PUT','PATCH','DELETE'].map(m => (
            <button key={m} onClick={() => setMethodFilter(m)}
              className={`text-[9px] font-bold px-1.5 py-0.5 rounded transition-colors ${
                methodFilter === m ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
              }`}>{m}</button>
          ))}
          <div className="w-px h-3 bg-slate-600" />
          {['ALL','2xx','4xx','5xx'].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`text-[9px] font-bold px-1.5 py-0.5 rounded transition-colors ${
                statusFilter === s ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
              }`}>{s}</button>
          ))}
          <div className="w-px h-3 bg-slate-600" />
          <button onClick={onClear}
            className="text-[10px] px-2 py-0.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded transition-colors">
            Clear
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex items-center justify-center h-full text-slate-600 text-sm">
            No requests yet — make an API call to see it here
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="sticky top-0 bg-slate-800 border-b border-slate-700">
                {['Method','Path','Status','Time','Source','When'].map(h => (
                  <th key={h} className="px-3 py-1.5 text-left text-[9px] font-semibold uppercase tracking-wider text-slate-500">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((log) => (
                <>
                  <tr
                    key={log.id}
                    onClick={() => setExpanded(expanded === log.id ? null : log.id)}
                    className={`border-b border-slate-800 cursor-pointer transition-colors ${
                      expanded === log.id ? 'bg-slate-800' : 'hover:bg-slate-800/50'
                    }`}
                  >
                    <td className="px-3 py-2"><MethodBadge method={log.method} size="xs" /></td>
                    <td className="px-3 py-2 font-mono text-[11px] text-slate-300 max-w-xs truncate">{log.path}</td>
                    <td className="px-3 py-2"><StatusBadge status={log.status} /></td>
                    <td className="px-3 py-2 text-[11px] text-slate-500">{log.duration}ms</td>
                    <td className="px-3 py-2"><SourceBadge source={log.source} /></td>
                    <td className="px-3 py-2 text-[11px] text-slate-500">
                      {new Date(log.timestamp).toTimeString().slice(0, 8)}
                    </td>
                  </tr>
                  {expanded === log.id && <ExpandedRow key={`exp-${log.id}`} log={log} />}
                </>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
