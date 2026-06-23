# Getting Started

## Prerequisites

- Node.js 18 or later

## Install

::: code-group

```bash [npm (global)]
npm install -g mockr
```

```bash [npx (no install)]
npx mockr serve ./openapi.yaml
```

:::

## Start a mock server

```bash
# From a local file
mockr serve ./openapi.yaml

# From a remote URL
mockr serve https://petstore3.swagger.io/api/v3/openapi.json

# Custom port
mockr serve ./openapi.yaml --port 4000
```

When the server starts you'll see a TUI dashboard listing all routes:

```
mockr — Petstore API
Server: http://localhost:3001

  GET     /pet
  POST    /pet
  GET     /pet/:petId
  POST    /pet/:petId
  DELETE  /pet/:petId
  ...

Listening for requests...
```

## Open the web UI

Navigate to **[http://localhost:3001/\_\_mockr/ui/](http://localhost:3001/__mockr/ui/)** in your browser.

The UI shows:
- All routes from your spec with method badges
- Click any route → Schema, **Try it**, and **Override** tabs
- Live request log on the right

## Make your first request

```bash
curl http://localhost:3001/pet/123
```

```json
{
  "id": "a3f4c21d-...",
  "name": "Buddy",
  "status": "available",
  "photoUrls": ["https://example.com/image.jpg"]
}
```

## Pin a route to a specific response

Create `mockr.json` in the same directory:

```json
{
  "overrides": [
    {
      "method": "GET",
      "path": "/pet/:id",
      "status": 404,
      "body": { "error": "Pet not found" }
    }
  ]
}
```

Restart (or use `--watch` to auto-reload) and `GET /pet/anything` now returns 404.

## Next steps

- [CLI Reference](/guide/cli) — all flags and options
- [Overrides](/guide/overrides) — full override format
- [Response Templating](/guide/templating) — `&#123;&#123;params.id&#125;&#125;`, `&#123;&#123;faker.email&#125;&#125;` in override bodies
- [Web UI](/guide/web-ui) — what the UI can do
