import { useState } from 'react';
import type { Route } from '../types';
import { MethodBadge } from './MethodBadge';

interface Props { route: Route }

interface TryResult {
  status: number;
  headers: Record<string, string>;
  body: unknown;
  durationMs: number;
}

function statusColor(s: number) {
  if (s >= 200 && s < 300) return 'text-green-400';
  if (s >= 400) return 'text-red-400';
  return 'text-amber-400';
}

export function TryIt({ route }: Props) {
  // Fill path params
  const [params, setParams] = useState<Record<string, string>>(
    Object.fromEntries(route.pathParams.map(p => [p, '']))
  );
  const [body, setBody] = useState(
    ['post','put','patch'].includes(route.method.toLowerCase()) ? '{}' : ''
  );
  const [extraHeaders, setExtraHeaders] = useState('');
  const [result, setResult] = useState<TryResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const resolvedPath = route.path.replace(/:([a-z_]+)/gi, (_, p) => params[p] || `:${p}`);

  const send = async () => {
    setLoading(true);
    setError('');
    setResult(null);

    let hdrs: Record<string, string> = {};
    try {
      if (extraHeaders.trim()) hdrs = JSON.parse(extraHeaders);
    } catch { setError('Headers must be valid JSON'); setLoading(false); return; }

    let parsedBody: unknown = undefined;
    if (body.trim()) {
      try { parsedBody = JSON.parse(body); }
      catch { setError('Body must be valid JSON'); setLoading(false); return; }
    }

    const t0 = Date.now();
    try {
      const res = await fetch('/__mockr/try', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: route.method,
          path:   resolvedPath,
          body:   parsedBody,
          headers: hdrs,
          params,
        }),
      });
      const data = await res.json();
      setResult({ ...data, durationMs: Date.now() - t0 });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const hasBody = ['post','put','patch'].includes(route.method.toLowerCase());

  return (
    <div className="flex flex-col gap-4">
      {/* Resolved URL preview */}
      <div className="flex items-center gap-2 bg-slate-800 rounded px-3 py-2 font-mono text-xs">
        <MethodBadge method={route.method} size="xs" />
        <span className="text-slate-300">{resolvedPath}</span>
      </div>

      {/* Path params */}
      {route.pathParams.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-2">Path params</p>
          <div className="grid grid-cols-2 gap-2">
            {route.pathParams.map(p => (
              <div key={p}>
                <label className="text-[10px] text-slate-500 font-mono">:{p}</label>
                <input
                  value={params[p] ?? ''}
                  onChange={e => setParams(prev => ({ ...prev, [p]: e.target.value }))}
                  placeholder={p}
                  className="w-full bg-slate-800 border border-slate-600 text-slate-200 text-xs px-2 py-1.5 rounded outline-none focus:border-blue-500 mt-0.5 font-mono"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Request body */}
      {hasBody && (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-2">Request body (JSON)</p>
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            rows={5}
            className="w-full bg-slate-800 border border-slate-600 text-slate-200 text-xs px-3 py-2 rounded outline-none focus:border-blue-500 font-mono resize-y"
            placeholder='{ "key": "value" }'
          />
        </div>
      )}

      {/* Extra headers */}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-2">Headers (JSON, optional)</p>
        <input
          value={extraHeaders}
          onChange={e => setExtraHeaders(e.target.value)}
          placeholder='{ "Authorization": "Bearer token" }'
          className="w-full bg-slate-800 border border-slate-600 text-slate-200 text-xs px-3 py-1.5 rounded outline-none focus:border-blue-500 font-mono"
        />
      </div>

      {/* Send button */}
      <button
        onClick={send}
        disabled={loading}
        className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white text-sm font-semibold py-2 rounded transition-colors"
      >
        {loading ? (
          <><span className="animate-spin text-base">⟳</span> Sending…</>
        ) : (
          <>▶ Send Request</>
        )}
      </button>

      {error && (
        <div className="text-red-400 text-xs bg-red-900/20 border border-red-800 rounded px-3 py-2">{error}</div>
      )}

      {/* Response */}
      {result && (
        <div className="border border-slate-700 rounded overflow-hidden">
          <div className="flex items-center gap-3 px-3 py-2 bg-slate-800 border-b border-slate-700">
            <span className={`font-mono font-bold text-sm ${statusColor(result.status)}`}>
              {result.status}
            </span>
            <span className="text-slate-500 text-xs">{result.durationMs}ms</span>
            <span className="text-slate-500 text-xs ml-auto">{result.headers['content-type'] ?? ''}</span>
          </div>
          <pre className="text-xs font-mono text-slate-300 p-3 overflow-auto max-h-64 bg-slate-950 whitespace-pre-wrap break-words leading-relaxed">
            {JSON.stringify(result.body, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
