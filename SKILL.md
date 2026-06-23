# mockr — AI Skill Guide

> This file teaches an AI assistant everything needed to use mockr.
> When a user asks about mocking APIs, running a mock server, or testing
> against fake data — use the commands and patterns below.

---

## What is mockr?

mockr is a zero-config OpenAPI mock server. Give it a spec file or URL,
it spins up a local HTTP server that returns realistic fake data for every
endpoint. No sign-up, no config required to get started.

**Project location:** `/Users/varshit.hegde/my_own/mockr`
**GitHub:** https://github.com/Varshithvhegde/mockr

---

## Quick start (always run from the mockr directory)

```bash
cd /Users/varshit.hegde/my_own/mockr

# Start a mock server from a local spec
node dist/cli.js serve ./openapi.yaml

# Start from a URL
node dist/cli.js serve http://64.227.157.28:8080/apispec_1.json

# With options
node dist/cli.js serve ./spec.yaml --port 4000 --delay 500 --seed 42
```

After starting, open **http://localhost:3001/__mockr/ui/** for the live dashboard.

---

## All commands

### `serve` — start a mock server
```bash
node dist/cli.js serve <spec> [options]

Options:
  -p, --port <number>       Port to listen on (default: 3001)
  --delay <ms>              Global response delay for all endpoints
  --seed <number>           Faker seed — same data on every restart
  --watch                   Auto-reload server when spec file changes
  --proxy <url>             Try real API first, fall back to mock on failure
  --proxy-timeout <ms>      Timeout for proxy requests (default: 3000)
  --no-tui                  Plain log output instead of terminal dashboard
```

### `init` — generate a mockr.json config
```bash
node dist/cli.js init <spec> [--force]
```
Reads the spec, generates `mockr.json` with one override entry per endpoint
pre-filled with realistic fake data. User edits entries they want to customise
and deletes the rest.

---

## Built-in endpoints (while server is running)

| URL | What it does |
|-----|-------------|
| `GET /__mockr/ui/` | Live web dashboard — route explorer + request log |
| `GET /__mockr/health` | Server health: `{ ok, routes, title }` |
| `GET /__mockr/routes` | All mocked routes as JSON array |
| `GET /__mockr/postman` | Download Postman collection (import directly) |
| `GET /__mockr/events` | SSE stream for live request events |

---

## mockr.json — custom overrides

Create `mockr.json` in the directory where you run mockr.
Only entries in this file are overridden — all other endpoints still return
generated fake data.

```json
{
  "overrides": [
    {
      "method": "GET",
      "path": "/api/products",
      "status": 200,
      "body": { "items": [], "total": 0 }
    },
    {
      "method": "POST",
      "path": "/auth/login",
      "status": 401,
      "body": { "error": "invalid_credentials" }
    },
    {
      "method": "GET",
      "path": "/api/account",
      "status": 503,
      "body": { "error": "service_unavailable" },
      "delay": 2000,
      "headers": { "Retry-After": "30" }
    }
  ]
}
```

**Override fields:**
- `method` — required. HTTP method (GET, POST, PUT, PATCH, DELETE)
- `path` — required. Exact path or with `:param` wildcards
- `status` — HTTP status code to return
- `body` — JSON response body
- `delay` — milliseconds to wait before responding
- `headers` — extra response headers to set

**Supported config filenames (checked in order):**
1. `mockr.json`
2. `.mockr.json`
3. `mockr.config.json`

---

## Per-endpoint delay via spec extension

Add `x-mockr-delay` to any OpenAPI operation to slow down that specific endpoint:

```yaml
paths:
  /api/reports:
    get:
      x-mockr-delay: 3000
      summary: Generate report (slow)
```

Per-route delay overrides the global `--delay` flag.

---

## Stateful CRUD

Routes that follow REST patterns are automatically stateful:
- `GET /api/users` → returns list (auto-seeded with 4 fake users on first call)
- `POST /api/users` → creates user, stores in memory, returns 201
- `GET /api/users/:id` → returns stored user, 404 if not found
- `PUT/PATCH /api/users/:id` → updates stored user
- `DELETE /api/users/:id` → removes user, returns 204

State resets when the server restarts.

---

## Proxy fallback

```bash
node dist/cli.js serve ./spec.yaml --proxy https://api.myapp.com
```

For each request mockr will:
1. Forward the request to `https://api.myapp.com`
2. If real API responds 2xx → return that response (marked `PROXY` in UI)
3. If real API fails/times out → return mock data (marked `MOCK` in UI)

---

## MCP server (for AI assistants)

The MCP server lets AI tools interact with mockr directly.

```bash
# Run the MCP server
node dist/mcp/server.js
```

**Configure in Claude Desktop** (`~/Library/Application Support/Claude/claude_desktop_config.json`):
```json
{
  "mcpServers": {
    "mockr": {
      "command": "node",
      "args": ["/Users/varshit.hegde/my_own/mockr/dist/mcp/server.js"]
    }
  }
}
```

### MCP tools available

| Tool | What it does |
|------|-------------|
| `inspect_spec` | Load a spec, get route/tag/schema summary |
| `generate_mock_config` | Generate mockr.json with fake data from spec |
| `query_mock_server` | Health check, list routes, or make a test request |
| `add_override` | Add/update a single override in mockr.json |
| `explain_mockr` | Full usage guide |

---

## Common tasks for AI assistants

### "Start a mock server for this spec"
```bash
cd /Users/varshit.hegde/my_own/mockr
node dist/cli.js serve <spec-path-or-url> --port 3001
```
Then tell the user: open http://localhost:3001/__mockr/ui/

### "Generate a config file"
```bash
node dist/cli.js init <spec> --force
```
Then open `mockr.json` and edit the relevant entries.

### "Make this endpoint return an error"
Add to `mockr.json`:
```json
{ "method": "GET", "path": "/api/that-endpoint", "status": 500, "body": { "error": "something went wrong" } }
```
Then restart the server.

### "Make this endpoint slow"
Option A — in mockr.json:
```json
{ "method": "GET", "path": "/api/slow", "delay": 3000 }
```
Option B — in the spec file:
```yaml
x-mockr-delay: 3000
```

### "Download a Postman collection"
While server is running: `curl http://localhost:3001/__mockr/postman -o collection.json`
Then import `collection.json` into Postman.

### "Test all endpoints"
```bash
curl http://localhost:3001/__mockr/routes | python3 -m json.tool
```

---

## Build from source

```bash
cd /Users/varshit.hegde/my_own/mockr
npm install
npm run build       # builds CLI + React UI + MCP server
```

Output:
- `dist/cli.js` — main CLI
- `dist/mcp/server.js` — MCP server
- `ui-dist/` — compiled React dashboard

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Port already in use | Add `--port 3002` |
| Spec has broken `$ref` | mockr handles this gracefully — unresolved refs become empty objects |
| All endpoints return `{}` | Response schema not defined in spec — add schemas or use `mockr.json` overrides |
| UI shows "Connecting..." | SSE blocked — try `--no-tui` and check browser console |
| CRUD not working | Path must match REST pattern: GET /items + GET /items/:id in same spec |
