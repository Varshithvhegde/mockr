import { useState } from 'react';
import type { Route } from '../types';
import { MethodBadge } from './MethodBadge';
import { TryIt } from './TryIt';
import { OverrideEditor } from './OverrideEditor';

interface Props { route: Route }

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className="text-[10px] px-2 py-0.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded transition-colors"
    >
      {copied ? 'Copied!' : 'Copy'}
    </button>
  );
}

type Tab = 'schema' | 'try' | 'override';

export function RouteDetail({ route }: Props) {
  const [tab, setTab] = useState<Tab>('schema');

  const curlPath = route.path.replace(/:([a-z_]+)/gi, 'test-id');
  const hasBody  = ['post','put','patch'].includes(route.method.toLowerCase());
  const curl = [
    'curl -s',
    route.method.toUpperCase() !== 'GET' ? `-X ${route.method.toUpperCase()}` : '',
    `"http://localhost:3001${curlPath}"`,
    hasBody ? `-H "Content-Type: application/json" \\\n  -d '{}'` : '',
  ].filter(Boolean).join(' \\\n  ');

  const TABS: { id: Tab; label: string }[] = [
    { id: 'schema',   label: 'Schema' },
    { id: 'try',      label: '▶ Try it' },
    { id: 'override', label: '✎ Override' },
  ];

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-5 pt-5 pb-0 flex-shrink-0">
        <div className="flex items-center gap-3 mb-1">
          <MethodBadge method={route.method} />
          <span className="font-mono text-base font-semibold text-white">{route.path}</span>
        </div>
        {route.summary && <p className="text-sm text-slate-400 mb-3">{route.summary}</p>}
        <div className="flex flex-wrap gap-3 text-xs text-slate-400 mb-4">
          {route.operationId && (
            <span>Op: <code className="text-sky-400">{route.operationId}</code></span>
          )}
          <span>Status: <code className="text-green-400">{route.statusCode}</code></span>
          {route.tags.length > 0 && (
            <span>{route.tags.map(t => (
              <code key={t} className="ml-1 bg-slate-700 px-1.5 py-0.5 rounded text-slate-300">{t}</code>
            ))}</span>
          )}
        </div>

        {/* Tab bar */}
        <div className="flex border-b border-slate-700">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2 text-xs font-semibold transition-colors border-b-2 -mb-px ${
                tab === t.id
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-slate-500 hover:text-slate-300'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto px-5 py-4">

        {tab === 'schema' && (
          <div className="space-y-4">
            {route.pathParams.length > 0 && (
              <Section title="Path params">
                <div className="flex flex-wrap gap-2">
                  {route.pathParams.map(p => (
                    <span key={p} className="font-mono text-xs bg-slate-800 border border-slate-600 text-sky-300 px-2 py-1 rounded">:{p}</span>
                  ))}
                </div>
              </Section>
            )}
            {route.queryParams.length > 0 && (
              <Section title="Query params">
                <div className="flex flex-wrap gap-2">
                  {route.queryParams.map(p => (
                    <span key={p} className="font-mono text-xs bg-slate-800 border border-slate-600 text-purple-300 px-2 py-1 rounded">?{p}</span>
                  ))}
                </div>
              </Section>
            )}
            <Section title="Response schema">
              <div className="relative">
                <pre className="bg-slate-950 border border-slate-700 rounded p-3 text-xs text-sky-300 font-mono leading-relaxed overflow-auto max-h-60 whitespace-pre-wrap break-words">
                  {route.schema || '(no schema defined)'}
                </pre>
                <div className="absolute top-2 right-2"><CopyButton text={route.schema} /></div>
              </div>
            </Section>
            <Section title="curl">
              <div className="relative">
                <pre className="bg-slate-950 border border-slate-700 rounded p-3 text-xs text-green-300 font-mono leading-relaxed whitespace-pre-wrap break-words">
                  {curl}
                </pre>
                <div className="absolute top-2 right-2"><CopyButton text={curl} /></div>
              </div>
            </Section>
          </div>
        )}

        {tab === 'try' && <TryIt route={route} />}

        {tab === 'override' && <OverrideEditor route={route} />}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-2">{title}</h3>
      {children}
    </div>
  );
}
