const COLORS: Record<string, string> = {
  GET:     'bg-green-500/15 text-green-400',
  POST:    'bg-amber-500/15 text-amber-400',
  PUT:     'bg-blue-500/15 text-blue-400',
  PATCH:   'bg-cyan-500/15 text-cyan-400',
  DELETE:  'bg-red-500/15 text-red-400',
  HEAD:    'bg-purple-500/15 text-purple-400',
  OPTIONS: 'bg-slate-500/15 text-slate-400',
};

export function MethodBadge({ method, size = 'sm' }: { method: string; size?: 'sm' | 'xs' }) {
  const cls = COLORS[method.toUpperCase()] ?? 'bg-slate-500/15 text-slate-400';
  const pad = size === 'xs' ? 'px-1.5 py-0.5 text-[9px]' : 'px-2 py-0.5 text-[10px]';
  return (
    <span className={`inline-block font-bold rounded tracking-wide min-w-[46px] text-center ${cls} ${pad}`}>
      {method.toUpperCase()}
    </span>
  );
}
