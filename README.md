# mockr

Zero-config OpenAPI mock server. Paste a spec, get a running server with realistic fake data instantly.

**[📖 Documentation](https://varshithvhegde.github.io/mockr/)**

## Install

```bash
npm install -g @varshithvh/mockr
# or run without installing
npx --package=@varshithvh/mockr mockr serve ./openapi.yaml
```

## Quick start

```bash
# From a local file
mockr serve ./openapi.yaml

# From a URL
mockr serve https://petstore3.swagger.io/api/v3/openapi.json

# Custom port + artificial delay
mockr serve ./openapi.yaml --port 4000 --delay 300
```

Open **http://localhost:3001/\_\_mockr/ui/** for the live dashboard — route explorer, Try it, request log, and override editor.

## Features

- **Realistic fake data** — field names like `email`, `name`, `createdAt`, `price` are auto-detected and filled with matching faker values
- **Web UI** — explore routes, send test requests, manage overrides in the browser
- **Overrides** — pin any route to a specific response via `mockr.json`
- **Response templating** — use `{{params.id}}`, `{{faker.email}}`, `{{now}}` in override bodies, resolved per-request
- **Stateful CRUD** — REST collections auto-detected; create/update/delete persists in memory
- **Scenarios** — global `--scenario error/empty/slow/chaos` for testing edge cases
- **Proxy + recording** — forward to real API, fall back to mocks, record responses for offline replay
- **Request validation** — validate bodies against spec schemas with Ajv (`--validate`, `--strict`)
- **MCP server** — AI tool integration for Claude and other agents
- **Postman collection** — auto-generated at `/__mockr/postman`

## Options

```
mockr serve <spec>

  -p, --port <number>         Port to listen on (default: 3001)
  --delay <ms>                Artificial response delay
  --seed <number>             Faker seed for reproducible data
  --watch                     Auto-reload on spec file changes
  --proxy <url>               Proxy to real API, fall back to mock
  --proxy-timeout <ms>        Proxy timeout (default: 3000)
  --scenario <name>           happy | error | empty | slow | chaos
  --validate                  Validate request bodies against spec
  --strict                    Return 400 on validation errors
  --record                    Save real API responses when proxying
  --recording-dir <path>      Where to save recordings (default: mockr-recordings/)
  --no-tui                    Plain log output
```

## Overrides (mockr.json)

Create `mockr.json` to pin routes to specific responses:

```json
{
  "overrides": [
    {
      "method": "GET",
      "path": "/api/users/:id",
      "status": 200,
      "body": {
        "id": "{{params.id}}",
        "email": "{{faker.email}}",
        "createdAt": "{{now}}"
      }
    },
    {
      "method": "POST",
      "path": "/auth/login",
      "status": 401,
      "body": { "error": "invalid_credentials" }
    }
  ]
}
```

Generate a pre-filled config from your spec:

```bash
mockr init ./openapi.yaml
```

## Built-in endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /__mockr/ui/` | Web dashboard |
| `GET /__mockr/health` | Server status |
| `GET /__mockr/routes` | All routes as JSON |
| `GET /__mockr/postman` | Postman collection download |
| `GET /__mockr/overrides` | Active overrides |

## MCP server

Add mockr as an MCP tool for Claude Desktop:

```json
{
  "mcpServers": {
    "mockr": { "command": "mockr-mcp" }
  }
}
```

## Dev

```bash
npm run dev -- serve https://petstore3.swagger.io/api/v3/openapi.json
npm run build
npm run docs:dev
```

## License

MIT
