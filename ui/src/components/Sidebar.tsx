import { useState, useMemo } from 'react';
import type { Route } from '../types';
import { MethodBadge } from './MethodBadge';

interface Props {
  routes: Route[];
  selectedIdx: number | null;
  onSelect: (idx: number) => void;
}

export function Sidebar({ routes, selectedIdx, onSelect }: Props) {
  const [search, setSearch] = useState('');
  const [methodFilter, setMethodFilter] = useState<string>('ALL');

  const methods = useMemo(() => {
    const s = new Set(routes.map(r => r.method.toUpperCase()));
    return ['ALL', ...Array.from(s)];
  }, [routes]);

  const filtered = useMemo(() => {
    return routes
      .map((r, i) => ({ r, i }))
      .filter(({ r }) => {
        const matchMethod = methodFilter === 'ALL' || r.method.toUpperCase() === methodFilter;
        const matchSearch = !search ||
          r.path.toLowerCase().includes(search.toLowerCase()) ||
          (r.operationId ?? '').toLowerCase().includes(search.toLowerCase()) ||
          (r.summary ?? '').toLowerCase().includes(search.toLowerCase());
        return matchMethod && matchSearch;
      });
  }, [routes, search, methodFilter]);

  const byTag = useMemo(() => {
    const map: Record<string, { r: Route; i: number }[]> = {};
    for (const item of filtered) {
      const tag = item.r.tags[0] ?? 'General';
      (map[tag] ??= []).push(item);
    }
    return map;
  }, [filtered]);

  return (
    <aside className="w-64 flex-shrink-0 border-r border-slate-700 flex flex-col overflow-hidden bg-slate-900">
      {/* Search */}
      <div className="p-3 border-b border-slate-700 space-y-2">
        <input
          type="text"
          placeholder="Search routes…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-slate-800 border border-slate-600 text-slate-200 text-xs px-3 py-1.5 rounded-md outline-none focus:border-blue-500 placeholder-slate-500"
        />
        {/* Method filter pills */}
        <div className="flex flex-wrap gap-1">
          {methods.map(m => (
            <button
              key={m}
              onClick={() => setMethodFilter(m)}
              className={`text-[9px] font-bold px-1.5 py-0.5 rounded transition-colors ${
                methodFilter === m
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* Route list */}
      <div className="flex-1 overflow-y-auto">
        {Object.entries(byTag).map(([tag, items]) => (
          <div key={tag}>
            <div className="px-3 pt-3 pb-1 text-[9px] font-semibold uppercase tracking-widest text-slate-500">
              {tag}
            </div>
            {items.map(({ r, i }) => (
              <button
                key={i}
                onClick={() => onSelect(i)}
                className={`w-full flex items-center gap-2 px-3 py-2 text-left transition-colors ${
                  selectedIdx === i
                    ? 'bg-blue-600/20 border-r-2 border-blue-500'
                    : 'hover:bg-slate-800'
                }`}
              >
                <MethodBadge method={r.method} size="xs" />
                <span className="font-mono text-[10px] text-slate-400 truncate">{r.path}</span>
              </button>
            ))}
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="p-4 text-center text-xs text-slate-500">No routes match</div>
        )}
      </div>

      <div className="px-3 py-2 border-t border-slate-700 text-[10px] text-slate-500">
        {filtered.length} / {routes.length} routes
      </div>
    </aside>
  );
}
