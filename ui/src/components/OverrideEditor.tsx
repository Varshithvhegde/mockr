import { useState, useEffect } from 'react';
import type { Route } from '../types';

interface Props { route: Route }

interface ActiveOverride {
  method: string;
  path: string;
  status?: number;
  body?: unknown;
  delay?: number;
}

export function OverrideEditor({ route }: Props) {
  const [active, setActive]       = useState<ActiveOverride | null>(null);
  const [status, setStatus]       = useState('');
  const [body, setBody]           = useState('');
  const [delay, setDelay]         = useState('');
  const [saving, setSaving]       = useState(false);
  const [saved, setSaved]         = useState(false);
  const [removing, setRemoving]   = useState(false);
  const [error, setError]         = useState('');
  const [bodyError, setBodyError] = useState('');

  // Fetch current overrides on mount / route change
  useEffect(() => {
    fetch('/__mockr/overrides')
      .then(r => r.json())
      .then((overrides: ActiveOverride[]) => {
        const match = overrides.find(
          o => o.method.toLowerCase() === route.method.toLowerCase() && o.path === route.path
        );
        if (match) {
          setActive(match);
          setStatus(String(match.status ?? ''));
          setBody(match.body !== undefined ? JSON.stringify(match.body, null, 2) : '');
          setDelay(String(match.delay ?? ''));
        } else {
          setActive(null);
          setStatus('');
          setBody('');
          setDelay('');
        }
      })
      .catch(() => {});
  }, [route.path, route.method]);

  const validate = (): boolean => {
    setBodyError('');
    if (body.trim()) {
      try { JSON.parse(body); } catch { setBodyError('Body must be valid JSON'); return false; }
    }
    return true;
  };

  const save = async () => {
    if (!validate()) return;
    setSaving(true);
    setError('');
    try {
      let parsedBody: unknown = undefined;
      if (body.trim()) parsedBody = JSON.parse(body);

      const res = await fetch('/__mockr/override', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: route.method,
          path:   route.path,
          status: status ? parseInt(status) : undefined,
          body:   parsedBody,
          delay:  delay ? parseInt(delay) : undefined,
        }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      setSaved(true);
      setActive({ method: route.method, path: route.path,
        status: status ? parseInt(status) : undefined,
        body: parsedBody,
        delay: delay ? parseInt(delay) : undefined,
      });
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    setRemoving(true);
    setError('');
    try {
      await fetch('/__mockr/override', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method: route.method, path: route.path, remove: true }),
      });
      setActive(null);
      setStatus(''); setBody(''); setDelay('');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setRemoving(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Active override badge */}
      {active ? (
        <div className="flex items-center gap-2 bg-amber-900/30 border border-amber-700/50 rounded px-3 py-2">
          <span className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" />
          <span className="text-amber-300 text-xs font-medium">Override active</span>
          {active.status && <span className="text-amber-400 font-mono text-xs ml-auto">→ {active.status}</span>}
        </div>
      ) : (
        <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded px-3 py-2">
          <span className="w-2 h-2 rounded-full bg-slate-500 flex-shrink-0" />
          <span className="text-slate-500 text-xs">No override — using generated mock</span>
        </div>
      )}

      {/* Status */}
      <div>
        <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 block mb-1.5">
          Status code
        </label>
        <input
          type="number"
          value={status}
          onChange={e => setStatus(e.target.value)}
          placeholder={`${route.statusCode} (default)`}
          className="w-32 bg-slate-800 border border-slate-600 text-slate-200 text-xs px-2 py-1.5 rounded outline-none focus:border-blue-500 font-mono"
        />
      </div>

      {/* Body */}
      <div>
        <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 block mb-1.5">
          Response body (JSON)
        </label>
        <textarea
          value={body}
          onChange={e => { setBody(e.target.value); setBodyError(''); }}
          rows={6}
          placeholder='{ "key": "value" }'
          className={`w-full bg-slate-800 border text-slate-200 text-xs px-3 py-2 rounded outline-none font-mono resize-y ${bodyError ? 'border-red-500' : 'border-slate-600 focus:border-blue-500'}`}
        />
        {bodyError && <p className="text-red-400 text-xs mt-1">{bodyError}</p>}
      </div>

      {/* Delay */}
      <div>
        <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 block mb-1.5">
          Delay (ms)
        </label>
        <input
          type="number"
          value={delay}
          onChange={e => setDelay(e.target.value)}
          placeholder="0"
          className="w-32 bg-slate-800 border border-slate-600 text-slate-200 text-xs px-2 py-1.5 rounded outline-none focus:border-blue-500 font-mono"
        />
      </div>

      {error && (
        <div className="text-red-400 text-xs bg-red-900/20 border border-red-800 rounded px-3 py-2">{error}</div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={save}
          disabled={saving}
          className={`flex-1 py-2 text-sm font-semibold rounded transition-colors ${
            saved
              ? 'bg-green-700 text-white'
              : 'bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white'
          }`}
        >
          {saved ? '✓ Saved' : saving ? 'Saving…' : 'Apply override'}
        </button>
        {active && (
          <button
            onClick={remove}
            disabled={removing}
            className="px-4 py-2 text-sm font-semibold rounded bg-slate-700 hover:bg-red-900/50 hover:text-red-400 text-slate-300 transition-colors"
          >
            {removing ? '…' : 'Remove'}
          </button>
        )}
      </div>

      <p className="text-[10px] text-slate-600">
        Writes to mockr.json instantly. Restart server or use --watch to see changes.
      </p>
    </div>
  );
}
