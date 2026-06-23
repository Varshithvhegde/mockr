import { useState } from 'react';
import type { Route } from '../types';
import { MethodBadge } from './MethodBadge';

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

export function RouteDetail({ route }: Props) {
  const curlPath = route.path.replace(/:([a-z_]+)/gi, 'test-id');
  const hasBody  = ['post','put','patch'].includes(route.method.toLowerCase());
  const curl = [
    `curl -s`,
    route.method.toUpperCase() !== 'GET' ? `-X ${route.method.toUpperCase()}` : '',
    `"http://localhost:3001${curlPath}"`,
    hasBody ? `-H "Content-Type: application/json" \\\n  -d '{}'` : '',
  ].filter(Boolean).join(' \\\n  ');

  return (
    <div className="p-6 overflow-y-auto flex-1">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <MethodBadge method={route.method} />
        <span className="font-mono text-lg font-semibold text-white">{route.path}</span>
      </div>

      {route.summary && (
        <p className="text-sm text-slate-400 mb-4">{route.summary}</p>
      )}

      <div className="flex flex-wrap gap-3 mb-6 text-xs text-slate-400">
        {route.operationId && (
          <span>Operation: <code className="text-sky-400">{route.operationId}</code></span>
        )}
        <span>Status: <code className="text-green-400">{route.statusCode}</code></span>
        {route.tags.length > 0 && (
          <span>Tags: {route.tags.map(t => (
            <code key={t} className="ml-1 bg-slate-700 px-1.5 py-0.5 rounded text-slate-300">{t}</code>
          ))}</span>
        )}
      </div>

      {/* Params */}
      {route.pathParams.length > 0 && (
        <Section title="Path params">
          <div className="flex flex-wrap gap-2">
            {route.pathParams.map(p => (
              <span key={p} className="font-mono text-xs bg-slate-800 border border-slate-600 text-sky-300 px-2 py-1 rounded">
                :{p}
              </span>
            ))}
          </div>
        </Section>
      )}

      {route.queryParams.length > 0 && (
        <Section title="Query params">
          <div className="flex flex-wrap gap-2">
            {route.queryParams.map(p => (
              <span key={p} className="font-mono text-xs bg-slate-800 border border-slate-600 text-purple-300 px-2 py-1 rounded">
                ?{p}
              </span>
            ))}
          </div>
        </Section>
      )}

      {/* Schema */}
      <Section title="Response schema">
        <div className="relative">
          <pre className="bg-slate-950 border border-slate-700 rounded-md p-4 text-xs text-sky-300 font-mono leading-relaxed overflow-auto max-h-64 whitespace-pre-wrap break-words">
            {route.schema || '(no schema defined)'}
          </pre>
          <div className="absolute top-2 right-2">
            <CopyButton text={route.schema} />
          </div>
        </div>
      </Section>

      {/* curl */}
      <Section title="curl">
        <div className="relative">
          <pre className="bg-slate-950 border border-slate-700 rounded-md p-4 text-xs text-green-300 font-mono leading-relaxed whitespace-pre-wrap break-words">
            {curl}
          </pre>
          <div className="absolute top-2 right-2">
            <CopyButton text={curl} />
          </div>
        </div>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <h3 className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-2">{title}</h3>
      {children}
    </div>
  );
}
