import { useState, useEffect, useRef } from 'react';
import type { Route } from '../types';

interface Props { route: Route }

interface SequenceStep {
  status: string;
  body: string;
  delay: string;
}

interface ActiveOverride {
  method: string;
  path: string;
  status?: number;
  body?: unknown;
  delay?: number;
  sequence?: { status?: number; body?: unknown; delay?: number }[];
}

const DEFAULT_STEP = (): SequenceStep => ({ status: '200', body: '{}', delay: '0' });

// Template token reference groups
const TOKEN_GROUPS = [
  {
    label: 'Request',
    color: 'text-sky-400',
    tokens: [
      { token: '{{params.id}}',    desc: 'Path param — replace "id" with your param name' },
      { token: '{{query.page}}',   desc: 'Query string param' },
      { token: '{{body.email}}',   desc: 'Request body field — echo back what was sent' },
      { token: '{{headers.authorization}}', desc: 'Request header value' },
      { token: '{{method}}',       desc: 'HTTP method (GET, POST…)' },
      { token: '{{path}}',         desc: 'Full request path' },
      { token: '{{now}}',          desc: 'Current ISO datetime' },
      { token: '{{timestamp}}',    desc: 'Unix timestamp (seconds)' },
    ],
  },
  {
    label: 'Identity',
    color: 'text-purple-400',
    tokens: [
      { token: '{{faker.uuid}}',      desc: 'Random UUID' },
      { token: '{{faker.email}}',     desc: 'Random email address' },
      { token: '{{faker.name}}',      desc: 'Full name' },
      { token: '{{faker.firstName}}', desc: 'First name' },
      { token: '{{faker.lastName}}',  desc: 'Last name' },
      { token: '{{faker.username}}',  desc: 'Username' },
      { token: '{{faker.phone}}',     desc: 'Phone number' },
    ],
  },
  {
    label: 'Data',
    color: 'text-green-400',
    tokens: [
      { token: '{{faker.number}}',    desc: 'Random integer 1–1000' },
      { token: '{{faker.price}}',     desc: 'Price (float)' },
      { token: '{{faker.boolean}}',   desc: 'true or false' },
      { token: '{{faker.date}}',      desc: 'ISO date (YYYY-MM-DD)' },
      { token: '{{faker.datetime}}',  desc: 'ISO datetime string' },
      { token: '{{faker.slug}}',      desc: 'URL-friendly slug' },
      { token: '{{faker.color}}',     desc: 'Color name' },
    ],
  },
  {
    label: 'Text & Place',
    color: 'text-amber-400',
    tokens: [
      { token: '{{faker.word}}',      desc: 'Single lorem word' },
      { token: '{{faker.sentence}}',  desc: 'Lorem sentence' },
      { token: '{{faker.paragraph}}', desc: 'Lorem paragraph' },
      { token: '{{faker.url}}',       desc: 'URL' },
      { token: '{{faker.image}}',     desc: 'Image URL' },
      { token: '{{faker.city}}',      desc: 'City name' },
      { token: '{{faker.country}}',   desc: 'Country name' },
      { token: '{{faker.company}}',   desc: 'Company name' },
    ],
  },
];

// Common HTTP status codes with labels
const STATUS_OPTIONS = [
  { code: 200, label: 'OK' },
  { code: 201, label: 'Created' },
  { code: 204, label: 'No Content' },
  { code: 400, label: 'Bad Request' },
  { code: 401, label: 'Unauthorized' },
  { code: 403, label: 'Forbidden' },
  { code: 404, label: 'Not Found' },
  { code: 409, label: 'Conflict' },
  { code: 422, label: 'Unprocessable' },
  { code: 429, label: 'Rate Limited' },
  { code: 500, label: 'Server Error' },
  { code: 503, label: 'Unavailable' },
];

// Delay presets
const DELAY_PRESETS = [
  { ms: 0,    label: 'None' },
  { ms: 500,  label: '500ms' },
  { ms: 1000, label: '1s' },
  { ms: 2000, label: '2s' },
  { ms: 5000, label: '5s' },
];

// One-click scenario presets — body depends on route context
function buildPresets(route: Route) {
  const isListRoute = !route.path.includes(':') && ['get'].includes(route.method.toLowerCase());
  const resourceName = route.path.split('/').filter(Boolean).pop()?.replace(/[-_]/g, ' ') ?? 'resource';

  return [
    {
      label: '✓ Success (empty)',
      status: 200,
      body: isListRoute ? [] : {},
      delay: 0,
      description: 'Return success with no data',
    },
    {
      label: '404 Not found',
      status: 404,
      body: { error: 'not_found', message: `${resourceName} not found` },
      delay: 0,
      description: 'Resource does not exist',
    },
    {
      label: '401 Unauthorized',
      status: 401,
      body: { error: 'unauthorized', message: 'Authentication required' },
      delay: 0,
      description: 'User is not authenticated',
    },
    {
      label: '500 Server error',
      status: 500,
      body: { error: 'internal_server_error', message: 'Something went wrong' },
      delay: 0,
      description: 'Unexpected server failure',
    },
    {
      label: '⏱ Slow response',
      status: 200,
      body: isListRoute ? [] : {},
      delay: 3000,
      description: 'Simulate a slow endpoint (3s)',
    },
    {
      label: '429 Rate limited',
      status: 429,
      body: { error: 'rate_limit_exceeded', message: 'Too many requests', retry_after: 60 },
      delay: 0,
      description: 'Simulate rate limiting',
    },
  ];
}

// Generate a body example from the route schema
function schemaToExample(schemaJson: string): string {
  try {
    const schema = JSON.parse(schemaJson);
    if (!schema || Object.keys(schema).length === 0) return '';
    return JSON.stringify(buildExampleFromSchema(schema), null, 2);
  } catch {
    return '';
  }
}

function buildExampleFromSchema(schema: Record<string, unknown>, depth = 0): unknown {
  if (depth > 4) return null;
  if (schema.example !== undefined) return schema.example;
  if (schema.default !== undefined) return schema.default;
  if (Array.isArray(schema.enum)) return schema.enum[0];

  const type = schema.type as string;
  if (type === 'array') {
    const items = schema.items as Record<string, unknown> | undefined;
    return items ? [buildExampleFromSchema(items, depth + 1)] : [];
  }
  if (type === 'object' || schema.properties) {
    const props = schema.properties as Record<string, Record<string, unknown>> | undefined;
    if (!props) return {};
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(props).slice(0, 8)) {
      out[k] = buildExampleFromSchema(v, depth + 1);
    }
    return out;
  }
  if (type === 'string')  return 'string';
  if (type === 'number' || type === 'integer') return 0;
  if (type === 'boolean') return true;
  return null;
}

function statusColor(code: number | string) {
  const n = parseInt(String(code));
  if (n >= 200 && n < 300) return 'bg-green-900/40 border-green-700 text-green-300';
  if (n >= 400 && n < 500) return 'bg-amber-900/40 border-amber-700 text-amber-300';
  if (n >= 500)            return 'bg-red-900/40 border-red-700 text-red-300';
  return 'bg-slate-700 border-slate-600 text-slate-300';
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
  const [showTokens, setShowTokens] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sequence mode
  const [useSequence, setUseSequence] = useState(false);
  const [steps, setSteps] = useState<SequenceStep[]>([DEFAULT_STEP(), DEFAULT_STEP()]);
  const [activeStep, setActiveStep] = useState(0);

  const presets = buildPresets(route);
  const schemaExample = schemaToExample(route.schema ?? '');

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
          if (match.sequence && match.sequence.length > 0) {
            setUseSequence(true);
            setSteps(match.sequence.map(s => ({
              status: String(s.status ?? 200),
              body: s.body !== undefined ? JSON.stringify(s.body, null, 2) : '{}',
              delay: String(s.delay ?? 0),
            })));
            setActiveStep(0);
          } else {
            setUseSequence(false);
            setStatus(String(match.status ?? ''));
            setBody(match.body !== undefined ? JSON.stringify(match.body, null, 2) : '');
            setDelay(String(match.delay ?? ''));
          }
        } else {
          setActive(null);
          setStatus('');
          setBody(schemaExample);
          setDelay('');
          setUseSequence(false);
          setSteps([DEFAULT_STEP(), DEFAULT_STEP()]);
        }
      })
      .catch(() => {});
  }, [route.path, route.method]);

  const insertToken = (token: string) => {
    const ta = textareaRef.current;
    if (!ta) { setBody(prev => prev + token); return; }
    const start = ta.selectionStart ?? body.length;
    const end   = ta.selectionEnd   ?? body.length;
    const next  = body.slice(0, start) + token + body.slice(end);
    setBody(next);
    setBodyError('');
    // Restore cursor after the inserted token
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(start + token.length, start + token.length);
    });
  };

  const applyPreset = (preset: typeof presets[0]) => {
    setStatus(String(preset.status));
    setBody(JSON.stringify(preset.body, null, 2));
    setDelay(String(preset.delay));
    setBodyError('');
  };

  const validate = (): boolean => {
    setBodyError('');
    if (body.trim()) {
      try { JSON.parse(body); } catch { setBodyError('Body must be valid JSON'); return false; }
    }
    return true;
  };

  const save = async () => {
    if (!useSequence && !validate()) return;
    setSaving(true); setError('');
    try {
      let payload: Record<string, unknown> = { method: route.method, path: route.path };

      if (useSequence) {
        const parsedSteps = steps.map(s => {
          let b: unknown = undefined;
          try { if (s.body.trim()) b = JSON.parse(s.body); } catch {}
          return {
            status: s.status ? parseInt(s.status) : 200,
            body: b,
            delay: s.delay ? parseInt(s.delay) : undefined,
          };
        });
        payload.sequence = parsedSteps;
      } else {
        let parsedBody: unknown = undefined;
        if (body.trim()) parsedBody = JSON.parse(body);
        payload = {
          ...payload,
          status: status ? parseInt(status) : undefined,
          body:   parsedBody,
          delay:  delay ? parseInt(delay) : undefined,
        };
      }

      const res = await fetch('/__mockr/override', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      setSaved(true);
      setActive({ method: route.method, path: route.path, ...(useSequence ? { sequence: payload.sequence as ActiveOverride['sequence'] } : { status: status ? parseInt(status) : undefined }) });
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setError((e as Error).message);
    } finally { setSaving(false); }
  };

  const remove = async () => {
    setRemoving(true); setError('');
    try {
      await fetch('/__mockr/override', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method: route.method, path: route.path, remove: true }),
      });
      setActive(null);
      setStatus(''); setBody(schemaExample); setDelay('');
    } catch (e) { setError((e as Error).message); }
    finally { setRemoving(false); }
  };

  return (
    <div className="flex flex-col gap-5">

      {/* Active status banner */}
      {active ? (
        <div className="flex items-center gap-2 bg-amber-900/30 border border-amber-700/50 rounded-lg px-3 py-2.5">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse flex-shrink-0" />
          <span className="text-amber-300 text-xs font-medium">Override active</span>
          {active.status && (
            <span className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded border ${statusColor(active.status)}`}>
              {active.status}
            </span>
          )}
          {active.delay && active.delay > 0 && (
            <span className="text-amber-400/70 text-[10px]">+{active.delay}ms</span>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-2 bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2.5">
          <span className="w-2 h-2 rounded-full bg-slate-600 flex-shrink-0" />
          <span className="text-slate-500 text-xs">No override — endpoint returns generated mock data</span>
        </div>
      )}

      {/* Quick presets */}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-2">
          Quick presets — click to fill the fields below
        </p>
        <div className="grid grid-cols-2 gap-1.5">
          {presets.map(p => (
            <button
              key={p.label}
              onClick={() => applyPreset(p)}
              title={p.description}
              className="text-left px-2.5 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-500 rounded text-xs text-slate-300 transition-colors"
            >
              <span className="block font-medium">{p.label}</span>
              <span className="block text-[10px] text-slate-500 mt-0.5">{p.description}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Mode toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setUseSequence(false)}
          className={`flex-1 py-2 text-xs font-semibold rounded border transition-colors ${
            !useSequence ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'
          }`}
        >
          Single response
        </button>
        <button
          onClick={() => setUseSequence(true)}
          className={`flex-1 py-2 text-xs font-semibold rounded border transition-colors ${
            useSequence ? 'bg-purple-700 border-purple-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'
          }`}
        >
          ⚡ Sequence
        </button>
      </div>

      {/* Sequence editor */}
      {useSequence && (
        <div className="border border-purple-800/50 rounded-lg overflow-hidden">
          <div className="bg-purple-900/20 px-3 py-2 border-b border-purple-800/40 flex items-center justify-between">
            <div>
              <p className="text-purple-300 text-xs font-semibold">Response sequence</p>
              <p className="text-purple-400/60 text-[10px] mt-0.5">Each call advances to the next step. Last step repeats.</p>
            </div>
            <button
              onClick={() => setSteps(s => [...s, DEFAULT_STEP()])}
              className="text-[10px] px-2 py-1 bg-purple-800/50 hover:bg-purple-700/50 text-purple-300 rounded border border-purple-700/50 transition-colors"
            >
              + Add step
            </button>
          </div>

          {/* Step tabs */}
          <div className="flex border-b border-slate-700 bg-slate-800/50 overflow-x-auto">
            {steps.map((s, i) => (
              <button
                key={i}
                onClick={() => setActiveStep(i)}
                className={`flex items-center gap-1.5 px-3 py-2 text-[10px] font-semibold border-b-2 flex-shrink-0 transition-colors ${
                  i === activeStep
                    ? 'border-purple-500 text-purple-300'
                    : 'border-transparent text-slate-500 hover:text-slate-300'
                }`}
              >
                <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold ${
                  statusColor(parseInt(s.status) || 200).replace('border-', '').replace('text-', 'text-')
                } bg-slate-700`}>
                  {i + 1}
                </span>
                <span className={`font-mono ${statusColor(parseInt(s.status) || 200).split(' ').find(c => c.startsWith('text-')) ?? 'text-slate-300'}`}>
                  {s.status || '200'}
                </span>
                {steps.length > 1 && i === activeStep && (
                  <span
                    onClick={e => { e.stopPropagation(); setSteps(s => s.filter((_, j) => j !== i)); setActiveStep(Math.max(0, i - 1)); }}
                    className="ml-1 text-slate-600 hover:text-red-400 cursor-pointer"
                  >×</span>
                )}
              </button>
            ))}
          </div>

          {/* Active step editor */}
          {steps[activeStep] && (
            <div className="p-3 space-y-3 bg-slate-900/50">
              <div className="flex gap-2 items-center">
                <div>
                  <p className="text-[9px] text-slate-500 mb-1">Status</p>
                  <div className="flex gap-1 flex-wrap">
                    {[200,201,202,400,401,404,500,503].map(c => (
                      <button key={c} onClick={() => setSteps(s => s.map((st, i) => i === activeStep ? { ...st, status: String(c) } : st))}
                        className={`text-[9px] px-1.5 py-0.5 rounded border transition-colors ${String(c) === steps[activeStep].status ? statusColor(c) : 'bg-slate-800 border-slate-700 text-slate-500 hover:text-slate-300'}`}>
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="ml-auto">
                  <p className="text-[9px] text-slate-500 mb-1">Delay</p>
                  <input type="number" value={steps[activeStep].delay}
                    onChange={e => setSteps(s => s.map((st, i) => i === activeStep ? { ...st, delay: e.target.value } : st))}
                    placeholder="0ms"
                    className="w-20 bg-slate-800 border border-slate-600 text-slate-200 text-xs px-2 py-1 rounded outline-none focus:border-purple-500 font-mono"
                  />
                </div>
              </div>
              <div>
                <p className="text-[9px] text-slate-500 mb-1">Body (JSON)</p>
                <textarea
                  value={steps[activeStep].body}
                  onChange={e => setSteps(s => s.map((st, i) => i === activeStep ? { ...st, body: e.target.value } : st))}
                  rows={5}
                  spellCheck={false}
                  className="w-full bg-slate-950 border border-slate-700 focus:border-purple-500 text-slate-200 text-xs px-3 py-2 rounded outline-none font-mono resize-y leading-relaxed"
                  placeholder='{ "status": "pending" }'
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Status code (single mode only) */}
      {!useSequence && <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-2">
          Status code — what HTTP status to return
        </p>
        {/* Quick-pick chips */}
        <div className="flex flex-wrap gap-1.5 mb-2">
          {STATUS_OPTIONS.map(s => (
            <button
              key={s.code}
              onClick={() => setStatus(String(s.code))}
              className={`text-[9px] font-bold px-2 py-1 rounded border transition-colors ${
                String(s.code) === status
                  ? statusColor(s.code)
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200'
              }`}
            >
              {s.code} {s.label}
            </button>
          ))}
        </div>
        <input
          type="number"
          value={status}
          onChange={e => setStatus(e.target.value)}
          placeholder={`${route.statusCode} (spec default)`}
          className="w-36 bg-slate-800 border border-slate-600 text-slate-200 text-xs px-2.5 py-1.5 rounded outline-none focus:border-blue-500 font-mono"
        />
      </div>}

      {/* Response body (single mode only) */}
      {!useSequence && <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Response body — JSON to return instead of generated data
          </p>
          {schemaExample && (
            <button
              onClick={() => setBody(schemaExample)}
              className="text-[9px] text-blue-400 hover:text-blue-300 transition-colors"
            >
              Fill from schema
            </button>
          )}
        </div>
        <textarea
          ref={textareaRef}
          value={body}
          onChange={e => { setBody(e.target.value); setBodyError(''); }}
          rows={7}
          spellCheck={false}
          className={`w-full bg-slate-950 border text-slate-200 text-xs px-3 py-2.5 rounded outline-none font-mono resize-y leading-relaxed ${
            bodyError ? 'border-red-500' : 'border-slate-700 focus:border-blue-500'
          }`}
          placeholder={schemaExample || '{\n  "key": "value"\n}'}
        />
        {bodyError && <p className="text-red-400 text-xs mt-1">{bodyError}</p>}
        <p className="text-[10px] text-slate-600 mt-1">Must be valid JSON. Leave empty to use generated data.</p>

        {/* Template token reference */}
        <div className="mt-2 border border-slate-700 rounded overflow-hidden">
          <button
            onClick={() => setShowTokens(v => !v)}
            className="w-full flex items-center justify-between px-3 py-2 bg-slate-800 hover:bg-slate-750 text-xs text-slate-400 hover:text-slate-200 transition-colors"
          >
            <span className="flex items-center gap-1.5">
              <span className="text-purple-400 font-mono font-bold">{'{{}}'}</span>
              Template tokens — click any to insert at cursor
            </span>
            <span className="text-slate-500 text-[10px]">{showTokens ? '▲ hide' : '▼ show'}</span>
          </button>

          {showTokens && (
            <div className="bg-slate-900 p-3 space-y-4">
              {TOKEN_GROUPS.map(group => (
                <div key={group.label}>
                  <p className={`text-[9px] font-bold uppercase tracking-widest mb-2 ${group.color}`}>
                    {group.label}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {group.tokens.map(({ token, desc }) => (
                      <button
                        key={token}
                        onClick={() => insertToken(token)}
                        title={desc}
                        className="font-mono text-[10px] px-2 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-500 text-slate-300 hover:text-white rounded transition-colors"
                      >
                        {token}
                      </button>
                    ))}
                  </div>
                </div>
              ))}

              {/* Route-specific param tokens */}
              {route.pathParams.length > 0 && (
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-widest mb-2 text-sky-400">
                    This route's path params
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {route.pathParams.map(p => (
                      <button
                        key={p}
                        onClick={() => insertToken(`{{params.${p}}}`)}
                        title={`Value of :${p} from the URL`}
                        className="font-mono text-[10px] px-2 py-1 bg-sky-900/30 hover:bg-sky-900/50 border border-sky-800/50 text-sky-300 rounded transition-colors"
                      >
                        {`{{params.${p}}}`}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <p className="text-[9px] text-slate-600 pt-1 border-t border-slate-800">
                Single-token fields preserve type: <code className="text-slate-500">"price": "{'{{faker.price}}'}"</code> → <code className="text-slate-500">{"price: 42.5"}</code> (float, not string)
              </p>
            </div>
          )}
        </div>
      </div>}

      {/* Delay (single mode only) */}
      {!useSequence && <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-2">
          Delay — artificial wait before responding (test loading states)
        </p>
        <div className="flex items-center gap-2 flex-wrap">
          {DELAY_PRESETS.map(d => (
            <button
              key={d.ms}
              onClick={() => setDelay(String(d.ms))}
              className={`text-[9px] font-bold px-2.5 py-1 rounded border transition-colors ${
                String(d.ms) === delay
                  ? 'bg-blue-600 border-blue-500 text-white'
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'
              }`}
            >
              {d.label}
            </button>
          ))}
          <input
            type="number"
            value={delay}
            onChange={e => setDelay(e.target.value)}
            placeholder="ms"
            className="w-20 bg-slate-800 border border-slate-600 text-slate-200 text-xs px-2.5 py-1 rounded outline-none focus:border-blue-500 font-mono"
          />
        </div>
      </div>}

      {error && (
        <div className="text-red-400 text-xs bg-red-900/20 border border-red-800 rounded px-3 py-2">{error}</div>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <button
          onClick={save}
          disabled={saving}
          className={`flex-1 py-2.5 text-sm font-semibold rounded transition-colors ${
            saved
              ? 'bg-green-700 text-white'
              : 'bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white'
          }`}
        >
          {saved ? '✓ Override applied' : saving ? 'Saving…' : 'Apply override'}
        </button>
        {active && (
          <button
            onClick={remove}
            disabled={removing}
            className="px-4 py-2.5 text-sm font-semibold rounded bg-slate-700 hover:bg-red-900/50 hover:text-red-400 text-slate-300 transition-colors"
          >
            {removing ? '…' : 'Remove'}
          </button>
        )}
      </div>

      <p className="text-[10px] text-slate-600 -mt-2">
        Writes to <code className="text-slate-500">mockr.json</code> instantly. Use <code className="text-slate-500">--watch</code> to auto-reload without restarting.
      </p>
    </div>
  );
}
