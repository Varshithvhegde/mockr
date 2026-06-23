import { useMemo } from 'react';
import type { RequestLog } from '../types';

interface Props {
  connected: boolean;
  logs: RequestLog[];
  routeCount: number;
}

export function StatsBar({ connected, logs, routeCount }: Props) {
  const stats = useMemo(() => {
    if (!logs.length) return { total: 0, successRate: null, avgMs: null, proxyPct: null };
    const total       = logs.length;
    const ok          = logs.filter(l => l.status >= 200 && l.status < 300).length;
    const totalMs     = logs.reduce((s, l) => s + l.duration, 0);
    const proxyCount  = logs.filter(l => l.source === 'proxy').length;
    return {
      total,
      successRate: Math.round(ok / total * 100),
      avgMs:       Math.round(totalMs / total),
      proxyPct:    proxyCount > 0 ? Math.round(proxyCount / total * 100) : null,
    };
  }, [logs]);

  return (
    <header className="flex items-center justify-between px-5 h-12 bg-slate-900 border-b border-slate-700 flex-shrink-0">
      <div className="flex items-center gap-2">
        <span className="text-white font-bold text-base tracking-tight">
          mock<span className="text-blue-400">r</span>
        </span>
        <span className="text-slate-500 text-xs">— live dashboard</span>
      </div>

      <div className="flex items-center gap-6">
        <Stat label="Routes"    value={String(routeCount)} />
        <Stat label="Requests"  value={String(stats.total)} color="text-white" />
        <Stat label="Success"   value={stats.successRate != null ? `${stats.successRate}%` : '—'} color="text-green-400" />
        <Stat label="Avg time"  value={stats.avgMs != null ? `${stats.avgMs}ms` : '—'} color="text-amber-400" />
        {stats.proxyPct != null && (
          <Stat label="Proxied" value={`${stats.proxyPct}%`} color="text-blue-400" />
        )}

        {/* Connection indicator */}
        <div className="flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400 shadow-[0_0_6px_#4ade80]' : 'bg-red-400'}`} />
          <span className="text-[10px] text-slate-400">{connected ? 'Live' : 'Reconnecting…'}</span>
        </div>
      </div>
    </header>
  );
}

function Stat({ label, value, color = 'text-slate-300' }: { label: string; value: string; color?: string }) {
  return (
    <div className="text-center">
      <div className={`text-sm font-bold leading-none ${color}`}>{value}</div>
      <div className="text-[9px] text-slate-500 uppercase tracking-wider mt-0.5">{label}</div>
    </div>
  );
}
