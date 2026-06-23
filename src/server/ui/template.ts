import { NormalisedRoute } from '../../spec/types';

const METHOD_COLORS: Record<string, string> = {
  GET:    '#22c55e', POST:   '#f59e0b', PUT:    '#3b82f6',
  PATCH:  '#06b6d4', DELETE: '#ef4444', HEAD:   '#8b5cf6', OPTIONS: '#6b7280',
};

export function buildUiHtml(routes: NormalisedRoute[]): string {
  const routesByTag: Record<string, NormalisedRoute[]> = {};
  for (const r of routes) {
    const tag = r.tags[0] ?? 'General';
    (routesByTag[tag] ??= []).push(r);
  }

  const sidebarItems = Object.entries(routesByTag).map(([tag, rs]) => `
    <div class="tag-group">
      <div class="tag-label">${esc(tag)}</div>
      ${rs.map((r, i) => `
        <div class="route-item" data-index="${routes.indexOf(r)}" onclick="selectRoute(${routes.indexOf(r)})">
          <span class="mbadge" style="background:${METHOD_COLORS[r.method.toUpperCase()] ?? '#6b7280'}22;color:${METHOD_COLORS[r.method.toUpperCase()] ?? '#6b7280'}">${r.method.toUpperCase()}</span>
          <span class="rpath">${esc(r.path)}</span>
        </div>`).join('')}
    </div>`).join('');

  const routesJson = JSON.stringify(routes.map(r => ({
    method:      r.method,
    path:        r.path,
    operationId: r.operationId ?? '',
    summary:     r.summary ?? '',
    tags:        r.tags,
    statusCode:  r.statusCode,
    pathParams:  r.pathParams.map(p => p.name),
    queryParams: r.queryParams.map(p => p.name),
    schema:      JSON.stringify(r.responseSchema, null, 2),
  })));

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>mockr UI</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
:root{--bg:#0f172a;--surface:#1e293b;--border:#334155;--text:#e2e8f0;--muted:#94a3b8;--accent:#3b82f6}
body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:var(--bg);color:var(--text);height:100vh;display:flex;flex-direction:column;font-size:13px}
/* Top bar */
.topbar{display:flex;align-items:center;justify-content:space-between;padding:0 20px;height:48px;background:var(--surface);border-bottom:1px solid var(--border);flex-shrink:0}
.topbar .logo{font-weight:800;font-size:16px;letter-spacing:-.3px;color:#fff}
.topbar .logo span{color:var(--accent)}
.stats{display:flex;gap:20px}
.stat{text-align:center}
.stat .sv{font-size:18px;font-weight:700;line-height:1}
.stat .sl{font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:.5px}
.stat.ok .sv{color:#22c55e}
.stat.fail .sv{color:#ef4444}
/* Main layout */
.main{display:flex;flex:1;overflow:hidden}
/* Sidebar */
.sidebar{width:260px;flex-shrink:0;border-right:1px solid var(--border);overflow-y:auto;padding:12px 0}
.sidebar-search{margin:0 10px 10px;position:relative}
.sidebar-search input{width:100%;background:#1e293b;border:1px solid var(--border);color:var(--text);padding:6px 10px;border-radius:6px;font-size:12px;outline:none}
.sidebar-search input:focus{border-color:var(--accent)}
.tag-label{font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.6px;color:var(--muted);padding:10px 14px 4px}
.route-item{display:flex;align-items:center;gap:8px;padding:6px 14px;cursor:pointer;border-radius:0;transition:background .1s}
.route-item:hover{background:#1e293b}
.route-item.active{background:#1e3a5f}
.mbadge{font-size:9px;font-weight:700;padding:2px 5px;border-radius:3px;min-width:44px;text-align:center;letter-spacing:.3px}
.rpath{font-family:monospace;font-size:11px;color:var(--muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
/* Center panel */
.panel{flex:1;display:flex;flex-direction:column;overflow:hidden}
.route-detail{flex:1;overflow-y:auto;padding:24px}
.detail-header{display:flex;align-items:center;gap:12px;margin-bottom:16px}
.detail-method{font-size:13px;font-weight:700;padding:4px 10px;border-radius:5px}
.detail-path{font-family:monospace;font-size:16px;font-weight:600;color:#fff}
.detail-summary{color:var(--muted);margin-bottom:20px;font-size:13px}
.section-title{font-size:11px;text-transform:uppercase;letter-spacing:.5px;color:var(--muted);font-weight:600;margin:16px 0 8px}
.schema-box{background:#0f172a;border:1px solid var(--border);border-radius:6px;padding:14px;overflow:auto;max-height:300px}
.schema-box pre{font-family:monospace;font-size:11px;color:#93c5fd;line-height:1.6;white-space:pre-wrap;word-break:break-word}
.params-list{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px}
.param-chip{background:#1e293b;border:1px solid var(--border);border-radius:4px;padding:3px 8px;font-family:monospace;font-size:11px;color:#7dd3fc}
.curl-box{background:#0f172a;border:1px solid var(--border);border-radius:6px;padding:12px;position:relative;margin-top:4px}
.curl-box pre{font-family:monospace;font-size:11px;color:#86efac;line-height:1.5;white-space:pre-wrap;word-break:break-word}
.copy-btn{position:absolute;top:8px;right:8px;background:#1e293b;border:1px solid var(--border);color:var(--muted);padding:3px 8px;border-radius:4px;font-size:10px;cursor:pointer}
.copy-btn:hover{color:#fff}
.empty-state{display:flex;align-items:center;justify-content:center;height:100%;color:var(--muted);flex-direction:column;gap:8px}
.empty-state .ei{font-size:40px}
/* Request log */
.log-panel{height:240px;border-top:1px solid var(--border);display:flex;flex-direction:column;flex-shrink:0}
.log-header{display:flex;align-items:center;justify-content:space-between;padding:8px 16px;border-bottom:1px solid var(--border);background:var(--surface)}
.log-header span{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.5px;color:var(--muted)}
.log-header button{background:none;border:1px solid var(--border);color:var(--muted);padding:2px 8px;border-radius:4px;font-size:10px;cursor:pointer}
.log-header button:hover{color:#fff}
.log-table-wrap{flex:1;overflow-y:auto}
table{width:100%;border-collapse:collapse}
th{position:sticky;top:0;background:var(--surface);padding:6px 12px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.4px;color:var(--muted);border-bottom:1px solid var(--border);font-weight:600}
.log-row td{padding:6px 12px;border-bottom:1px solid #1e293b;font-size:11px;cursor:pointer}
.log-row:hover td{background:#1e293b}
.log-row.expanded td{background:#1e293b}
.status-ok{color:#22c55e;font-weight:600}
.status-fail{color:#ef4444;font-weight:600}
.status-other{color:#f59e0b;font-weight:600}
.source-proxy{background:#1e3a5f;color:#7dd3fc;padding:1px 5px;border-radius:3px;font-size:9px;font-weight:600}
.source-mock{background:#1e2d1e;color:#86efac;padding:1px 5px;border-radius:3px;font-size:9px;font-weight:600}
.expand-row{display:none}
.expand-row.open{display:table-row}
.expand-row td{background:#0a1628;padding:12px 16px}
.expand-row pre{font-family:monospace;font-size:11px;color:#e2e8f0;line-height:1.5;white-space:pre-wrap;word-break:break-word;max-height:180px;overflow:auto}
.conn-dot{width:7px;height:7px;border-radius:50%;display:inline-block;margin-right:6px}
.conn-dot.on{background:#22c55e;box-shadow:0 0 6px #22c55e}
.conn-dot.off{background:#ef4444}
</style>
</head>
<body>
<div class="topbar">
  <div class="logo">mock<span>r</span> <span style="font-size:11px;font-weight:400;color:var(--muted)">— live UI</span></div>
  <div class="stats">
    <div class="stat total"><div class="sv" id="s-total">0</div><div class="sl">Requests</div></div>
    <div class="stat ok"><div class="sv" id="s-ok">—</div><div class="sl">Success %</div></div>
    <div class="stat"><div class="sv" id="s-avg" style="color:#f59e0b">—</div><div class="sl">Avg ms</div></div>
    <div class="stat"><div class="sv" style="font-size:13px"><span class="conn-dot off" id="conn-dot"></span><span id="conn-txt" style="font-size:11px;color:var(--muted)">Connecting</span></div><div class="sl">Stream</div></div>
  </div>
</div>
<div class="main">
  <div class="sidebar">
    <div class="sidebar-search"><input type="text" placeholder="Filter routes…" oninput="filterRoutes(this.value)" id="route-search"></div>
    <div id="sidebar-list">${sidebarItems}</div>
  </div>
  <div class="panel">
    <div class="route-detail" id="route-detail">
      <div class="empty-state"><div class="ei">📋</div><div>Select a route to inspect</div></div>
    </div>
    <div class="log-panel">
      <div class="log-header">
        <span><span class="conn-dot on" id="log-dot" style="display:none"></span> Request Log</span>
        <button onclick="clearLog()">Clear</button>
      </div>
      <div class="log-table-wrap">
        <table>
          <thead><tr><th style="width:70px">Method</th><th>Path</th><th style="width:60px">Status</th><th style="width:60px">Time</th><th style="width:70px">Source</th><th style="width:140px">Time</th></tr></thead>
          <tbody id="log-body"></tbody>
        </table>
      </div>
    </div>
  </div>
</div>
<script>
const ROUTES = ${routesJson};
const MC = ${JSON.stringify(METHOD_COLORS)};
let selectedIdx = -1;
let logItems = [];
let expandedRow = null;

// Stats
let totalReqs = 0, okReqs = 0, totalMs = 0;

function esc(s){ const d=document.createElement('div'); d.textContent=s; return d.innerHTML; }

function selectRoute(idx) {
  document.querySelectorAll('.route-item').forEach(el => el.classList.remove('active'));
  const el = document.querySelector('[data-index="' + idx + '"]');
  if (el) el.classList.add('active');
  selectedIdx = idx;
  const r = ROUTES[idx];
  if (!r) return;
  const mc = MC[r.method.toUpperCase()] || '#6b7280';
  const paramStr = r.pathParams.length ? r.pathParams.map(p => p + '=test').join('&') : '';
  const curl = 'curl -s ' + (r.method.toUpperCase() !== 'GET' ? '-X ' + r.method.toUpperCase() + ' ' : '') +
    '"http://localhost:3001' + r.path.replace(/:([a-z_]+)/gi, 'test') + '"' +
    (r.method.toUpperCase() !== 'GET' ? " \\\n  -H 'Content-Type: application/json' \\\n  -d '{}'" : '');

  document.getElementById('route-detail').innerHTML =
    '<div class="detail-header">' +
      '<span class="detail-method" style="background:' + mc + '22;color:' + mc + '">' + r.method.toUpperCase() + '</span>' +
      '<span class="detail-path">' + esc(r.path) + '</span>' +
    '</div>' +
    (r.summary ? '<div class="detail-summary">' + esc(r.summary) + '</div>' : '') +
    (r.operationId ? '<div style="color:var(--muted);font-size:11px;margin-bottom:16px">Operation: <code style="color:#7dd3fc">' + esc(r.operationId) + '</code></div>' : '') +
    (r.pathParams.length ? '<div class="section-title">Path params</div><div class="params-list">' + r.pathParams.map(p => '<span class="param-chip">:' + p + '</span>').join('') + '</div>' : '') +
    (r.queryParams.length ? '<div class="section-title">Query params</div><div class="params-list">' + r.queryParams.map(p => '<span class="param-chip">?' + p + '</span>').join('') + '</div>' : '') +
    '<div class="section-title">Response schema</div>' +
    '<div class="schema-box"><pre>' + esc(r.schema || '(no schema defined)') + '</pre></div>' +
    '<div class="section-title">curl</div>' +
    '<div class="curl-box"><pre>' + esc(curl) + '</pre><button class="copy-btn" onclick="navigator.clipboard.writeText(' + JSON.stringify(curl) + ');this.textContent=\'Copied!\';setTimeout(()=>this.textContent=\'Copy\',1500)">Copy</button></div>';
}

function filterRoutes(q) {
  const lower = q.toLowerCase();
  document.querySelectorAll('.route-item').forEach(el => {
    const txt = el.textContent.toLowerCase();
    el.style.display = txt.includes(lower) ? '' : 'none';
  });
  document.querySelectorAll('.tag-group').forEach(g => {
    const visible = Array.from(g.querySelectorAll('.route-item')).some(el => el.style.display !== 'none');
    g.style.display = visible ? '' : 'none';
  });
}

function statusClass(s) {
  if (s >= 200 && s < 300) return 'status-ok';
  if (s >= 400) return 'status-fail';
  return 'status-other';
}

function addLogRow(evt) {
  const id = evt.id;
  const mc = MC[evt.method.toUpperCase()] || '#6b7280';
  const ts = new Date(evt.timestamp).toTimeString().slice(0,8);
  const srcHtml = evt.source === 'proxy'
    ? '<span class="source-proxy">PROXY</span>'
    : evt.source === 'mock' ? '<span class="source-mock">MOCK</span>' : '';
  const hasBody = evt.requestBody || evt.responseBody;

  const tr = document.createElement('tr');
  tr.className = 'log-row';
  tr.setAttribute('data-id', id);
  tr.onclick = () => toggleExpand(id, evt, tr);
  tr.innerHTML =
    '<td><span class="mbadge" style="background:' + mc + '22;color:' + mc + '">' + evt.method.toUpperCase() + '</span></td>' +
    '<td style="font-family:monospace;max-width:260px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(evt.path) + '</td>' +
    '<td class="' + statusClass(evt.status) + '">' + evt.status + '</td>' +
    '<td style="color:var(--muted)">' + evt.duration + 'ms</td>' +
    '<td>' + srcHtml + '</td>' +
    '<td style="color:var(--muted)">' + ts + '</td>';

  const expand = document.createElement('tr');
  expand.className = 'expand-row';
  expand.setAttribute('data-expand', id);
  const reqStr  = evt.requestBody  ? JSON.stringify(evt.requestBody,  null, 2) : '(none)';
  const respStr = evt.responseBody ? JSON.stringify(evt.responseBody, null, 2) : '(none)';
  expand.innerHTML = '<td colspan="6"><pre><b style="color:#94a3b8">Request body:</b>\n' + esc(reqStr) + '\n\n<b style="color:#94a3b8">Response body:</b>\n' + esc(respStr) + '</pre></td>';

  const tbody = document.getElementById('log-body');
  tbody.insertBefore(expand, tbody.firstChild);
  tbody.insertBefore(tr, tbody.firstChild);

  // Keep max 200 rows
  while (tbody.children.length > 400) tbody.removeChild(tbody.lastChild);
}

function toggleExpand(id, evt, tr) {
  const row = document.querySelector('[data-expand="' + id + '"]');
  if (!row) return;
  const isOpen = row.classList.contains('open');
  // Close any open
  document.querySelectorAll('.expand-row.open').forEach(r => r.classList.remove('open'));
  document.querySelectorAll('.log-row.expanded').forEach(r => r.classList.remove('expanded'));
  if (!isOpen) { row.classList.add('open'); tr.classList.add('expanded'); }
}

function clearLog() {
  document.getElementById('log-body').innerHTML = '';
  totalReqs = 0; okReqs = 0; totalMs = 0;
  updateStats();
}

function updateStats() {
  document.getElementById('s-total').textContent = totalReqs;
  document.getElementById('s-ok').textContent = totalReqs ? Math.round(okReqs/totalReqs*100) + '%' : '—';
  document.getElementById('s-avg').textContent = totalReqs ? Math.round(totalMs/totalReqs) + 'ms' : '—';
}

// SSE connection
function connect() {
  const es = new EventSource('/__mockr/events');
  const dot = document.getElementById('conn-dot');
  const txt = document.getElementById('conn-txt');
  const logDot = document.getElementById('log-dot');

  es.addEventListener('init', e => {
    dot.className = 'conn-dot on'; txt.textContent = 'Live';
    logDot.style.display = '';
    const data = JSON.parse(e.data);
    (data.history || []).forEach(evt => {
      totalReqs++; if(evt.status>=200&&evt.status<300) okReqs++; totalMs+=evt.duration;
      addLogRow(evt);
    });
    updateStats();
  });

  es.addEventListener('request', e => {
    const evt = JSON.parse(e.data);
    // Skip /__mockr internal requests
    if (evt.path.startsWith('/__mockr')) return;
    totalReqs++; if(evt.status>=200&&evt.status<300) okReqs++; totalMs+=evt.duration;
    updateStats();
    addLogRow(evt);
  });

  es.onerror = () => {
    dot.className = 'conn-dot off'; txt.textContent = 'Reconnecting…';
    logDot.style.display = 'none';
    es.close();
    setTimeout(connect, 2000);
  };
}

connect();
</script>
</body>
</html>`;
}

function esc(s: string): string {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
