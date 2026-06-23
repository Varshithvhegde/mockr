# Web UI

mockr ships with a built-in web dashboard. Once the server is running, open:

**[http://localhost:3001/\_\_mockr/ui/](http://localhost:3001/__mockr/ui/)**

## Layout

```
┌─────────────────┬──────────────────────────────┬────────────────┐
│  Route list     │  Route detail                │  Request log   │
│                 │                              │                │
│  GET  /users    │  GET /users/:id              │  12:01 GET /.. │
│  POST /users ◄──│                              │  12:01 POST /. │
│  GET  /users/:id│  [Schema] [▶ Try it] [Override]              │
│  ...            │                              │                │
└─────────────────┴──────────────────────────────┴────────────────┘
```

## Route list

The left panel lists every endpoint from your spec. Routes are grouped and searchable. Click any route to open its detail panel.

Each route shows:
- HTTP method badge (color coded)
- Path with params highlighted
- Active override indicator if an override is set

## Route detail tabs

### Schema tab

Shows the route's response schema (formatted JSON Schema), path params, query params, and a pre-built `curl` command you can copy and run directly.

### Try it tab

Send a real request to the running mock server without leaving the browser:

1. Fill in any path params (e.g. `:id`)
2. Add a request body (POST/PUT/PATCH routes)
3. Optionally add custom headers as JSON
4. Click **▶ Send Request**

Response shows status code, timing, headers, and formatted JSON body.

### Override tab

Pin this route to a specific response. See [Overrides](/guide/overrides) for full details.

Features:
- **Status code** — pick from common codes or type any number
- **Headers** — add custom response headers as key/value pairs
- **Response body** — JSON editor with schema autofill
- **Delay** — add per-override artificial latency
- **Template tokens** — click `{{}} Template tokens` to expand a panel of all available tokens; click any to insert at cursor
- **Try it** button — apply the override and immediately test it

## Request log

The right panel streams every incoming request in real time via SSE. Each entry shows:
- Timestamp
- Method + path
- Status code
- Response time

Click an entry to see full request/response details.

## Keyboard shortcuts

| Key | Action |
|-----|--------|
| `/` | Focus route search |
| `Esc` | Clear search |
