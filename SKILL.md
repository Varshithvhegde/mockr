# mockr — AI Skill Guide

> This file teaches an AI assistant everything needed to use mockr.
> When a user asks about mocking APIs, running a mock server, or testing
> against fake data — use the commands and patterns below.

---

## What is mockr?

mockr is a zero-config OpenAPI mock server. Give it a spec file or URL,
it spins up a local HTTP server that returns realistic fake data for every
endpoint. No sign-up, no config required to get started.

**npm package:** `@varshithvh/mockr`
**GitHub:** https://github.com/Varshithvhegde/mockr
**Docs:** https://varshithvhegde.github.io/mockr/
**npm:** https://www.npmjs.com/package/@varshithvh/mockr

---

## Installation

```bash
# Install globally (recommended)
npm install -g @varshithvh/mockr

# Run without installing
npx @varshithvh/mockr serve ./openapi.yaml

# Check version
mockr --version
```

---

## Quick start

```bash
# From a local file
mockr serve ./openapi.yaml

# From a remote URL
mockr serve https://petstore3.swagger.io/api/v3/openapi.json

# With options
mockr serve ./spec.yaml --port 4000 --delay 500 --seed 42
```

After starting, open **http://localhost:3001/__mockr/ui/** for the live dashboard.

---

## All commands

### `serve` — start a mock server

```bash
mockr serve <spec> [options]

Options:
  -p, --port <number>       Port to listen on (default: 3001)
  --delay <ms>              Global response delay for all endpoints
  --seed <number>           Faker seed — same data on every restart
  --watch                   Auto-reload server when spec file changes
  --proxy <url>             Try real API first, fall back to mock on failure
  --proxy-timeout <ms>      Timeout for proxy requests (default: 3000)
  --scenario <name>         happy | error | empty | slow | chaos
  --validate                Validate request bodies against spec schemas
  --strict                  Return 400 on validation errors (requires --validate)
  --record                  Save real API responses when using --proxy
  --recording-dir <path>    Where to save recordings (default: mockr-recordings/)
  --no-tui                  Plain log output instead of terminal dashboard
```

### `init` — generate a mockr.json config

```bash
mockr init <spec> [--force]
```

Reads the spec, generates `mockr.json` with one override entry per endpoint
pre-filled with realistic fake data. Edit the entries you want to customise
and delete the rest.

### `mockr-mcp` — start the MCP server

```bash
mockr-mcp
```

---

## Development (working from source)

```bash
cd /Users/varshit.hegde/my_own/mockr

# Run from source (no build needed)
node dist/cli.js serve ./openapi.yaml

# Build CLI + UI + MCP
npm run build

# Dev mode with auto-reload
npm run dev -- serve ./openapi.yaml

# Docs site
npm run docs:dev
```

---

## Built-in endpoints (while server is running)

| URL | What it does |
|-----|-------------|
| `GET /__mockr/ui/` | Live web dashboard — route explorer + request log |
| `GET /__mockr/health` | Server health: `{ ok, routes, title }` |
| `GET /__mockr/routes` | All mocked routes as JSON array |
| `GET /__mockr/postman` | Download Postman collection (import directly) |
| `GET /__mockr/events` | SSE stream for live request events |
| `GET /__mockr/overrides` | Current active overrides |
| `POST /__mockr/override` | Add/update an override at runtime |
| `POST /__mockr/reset` | Reset CRUD store + sequence counters + response cache |

---

## mockr.json — custom overrides

Create `mockr.json` in the directory where you run mockr.
Only entries in this file are overridden — all other endpoints still return
generated fake data. The file is watched — changes apply without restarting.

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
- `path` — required. Exact path or with `:param` wildcards e.g. `/api/users/:id`
- `status` — HTTP status code to return (default: 200)
- `body` — JSON response body (supports template tokens)
- `delay` — milliseconds to wait before responding
- `headers` — extra response headers to set

---

## Spec examples

If your OpenAPI spec defines `example` or `examples` on a response, mockr uses them directly instead of generating faker data:

```yaml
responses:
  '200':
    content:
      application/json:
        example:
          id: "user-123"
          name: "Alice Smith"
          role: "admin"
```

Responses served from spec examples include an `X-Mockr-Source: spec-example` header.

Priority order: **override → spec example → faker generated**

---

## Reset endpoint

Useful in CI/CD or between test runs to wipe all state without restarting:

```bash
curl -X POST http://localhost:3001/__mockr/reset
# { "ok": true, "message": "CRUD store, sequence counters, and response cache cleared" }
```

Resets:
- CRUD in-memory store (all created/updated/deleted items)
- Sequence counters (sequences restart from step 1)
- Response cache (forces fresh faker data on next request)

---

## Response templating

Override bodies support `{{token}}` placeholders resolved per-request.

```json
{
  "method": "GET",
  "path": "/api/users/:id",
  "status": 200,
  "body": {
    "id": "{{params.id}}",
    "email": "{{faker.email}}",
    "name": "{{faker.name}}",
    "createdAt": "{{now}}"
  }
}
```

### Request context tokens

| Token | Returns |
|-------|---------|
| `{{params.x}}` | Path param — e.g. `{{params.id}}` for `/api/users/:id` |
| `{{query.x}}` | Query string param — e.g. `{{query.page}}` |
| `{{body.x}}` | Request body field — e.g. `{{body.email}}` |
| `{{headers.x}}` | Request header — e.g. `{{headers.authorization}}` |
| `{{method}}` | HTTP method (GET, POST, …) |
| `{{path}}` | Request path (/api/users/42) |
| `{{now}}` | Current ISO datetime |
| `{{timestamp}}` | Unix timestamp (seconds) |

### Faker tokens

| Token | Returns |
|-------|---------|
| `{{faker.uuid}}` | Random UUID |
| `{{faker.email}}` | Random email |
| `{{faker.name}}` | Full name |
| `{{faker.firstName}}` | First name |
| `{{faker.lastName}}` | Last name |
| `{{faker.phone}}` | Phone number |
| `{{faker.url}}` | URL |
| `{{faker.image}}` | Image URL |
| `{{faker.number}}` | Integer 1–1000 |
| `{{faker.price}}` | Float price |
| `{{faker.date}}` | ISO date string |
| `{{faker.datetime}}` | ISO datetime string |
| `{{faker.boolean}}` | true/false |
| `{{faker.slug}}` | URL slug |
| `{{faker.username}}` | Username |
| `{{faker.color}}` | Color name |
| `{{faker.city}}` | City name |
| `{{faker.country}}` | Country name |
| `{{faker.company}}` | Company name |
| `{{faker.word}}` | Single word |
| `{{faker.sentence}}` | Lorem sentence |
| `{{faker.paragraph}}` | Lorem paragraph |

**Type preservation:** single-token fields keep native type — `"price": "{{faker.price}}"` → `42.99` (float, not string).

---

## Scenarios

```bash
mockr serve ./spec.yaml --scenario error    # every endpoint returns 500
mockr serve ./spec.yaml --scenario empty    # all values set to empty/zero
mockr serve ./spec.yaml --scenario slow     # random 1–5s delay
mockr serve ./spec.yaml --scenario chaos    # random behaviour per request
mockr serve ./spec.yaml --scenario happy    # normal (default)
```

Overrides always take priority over the active scenario.

---

## Proxy + recording

```bash
# Forward to real API, fall back to mock
mockr serve ./spec.yaml --proxy https://api.example.com

# Record real responses to disk
mockr serve ./spec.yaml --proxy https://api.example.com --record

# Replay recordings offline (no --proxy needed)
mockr serve ./spec.yaml
```

Recordings saved to `mockr-recordings/` by default.

---

## Request validation

```bash
# Warn mode — log errors, add X-Mockr-Validation-Warnings header
mockr serve ./spec.yaml --validate

# Strict mode — return 400 on invalid request body
mockr serve ./spec.yaml --validate --strict
```

---

## Stateful CRUD

Routes matching REST patterns are automatically stateful:
- `GET /api/users` → list (starts empty)
- `POST /api/users` → create, store in memory, return created item
- `GET /api/users/:id` → read one, 404 if not found
- `PUT/PATCH /api/users/:id` → update stored item
- `DELETE /api/users/:id` → remove, return 204

State resets on server restart.

---

## MCP server (for AI assistants)

```bash
# If installed globally
mockr-mcp

# Configure in Claude Desktop (~/.../Claude/claude_desktop_config.json)
```

```json
{
  "mcpServers": {
    "mockr": { "command": "mockr-mcp" }
  }
}
```

**Or using npx (no install required):**

```json
{
  "mcpServers": {
    "mockr": {
      "command": "npx",
      "args": ["-y", "--package=@varshithvh/mockr", "mockr-mcp"]
    }
  }
}
```

**Available MCP tools:**

| Tool | What it does |
|------|-------------|
| `inspect_spec` | Load a spec, get route/schema summary |
| `generate_mock_config` | Generate mockr.json with fake data from spec |
| `query_mock_server` | Health check, list routes, or make a test request |
| `add_override` | Add/update a single override in mockr.json |
| `explain_mockr` | Full usage guide |

---

## Common tasks for AI assistants

### Start a mock server
```bash
mockr serve <spec-path-or-url> --port 3001
# Then: http://localhost:3001/__mockr/ui/
```

### Generate a config file
```bash
mockr init <spec> --force
# Edit mockr.json to customise responses
```

### Make an endpoint return an error
Add to `mockr.json`:
```json
{ "method": "GET", "path": "/api/that-endpoint", "status": 500, "body": { "error": "something went wrong" } }
```

### Make an endpoint slow
```json
{ "method": "GET", "path": "/api/slow", "delay": 3000 }
```

### Download a Postman collection
```bash
curl http://localhost:3001/__mockr/postman -o collection.json
```

### List all routes
```bash
curl http://localhost:3001/__mockr/routes
```

### Test an endpoint
```bash
curl http://localhost:3001/api/users/123
curl -X POST http://localhost:3001/api/users -H "Content-Type: application/json" -d '{"name":"Alice"}'
```

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Port already in use | Add `--port 3002` |
| Spec has broken `$ref` | mockr handles gracefully — unresolved refs become empty objects |
| All endpoints return `{}` | Response schema not defined in spec — use `mockr.json` overrides |
| UI shows "Connecting..." | SSE blocked — try `--no-tui` and check browser console |
| CRUD not working | Path must match REST pattern: `GET /items` + `GET /items/:id` in same spec |
| npx not found | Use `npx @varshithvh/mockr serve` or install globally first |
