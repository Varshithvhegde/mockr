# mockr

Zero-config OpenAPI mock server. Paste a spec, get a running server with realistic fake data instantly.

## Install

```bash
npm install -g mockr
# or run without installing
npx mockr serve ./openapi.yaml
```

## Usage

```bash
mockr serve ./openapi.yaml
mockr serve ./swagger.json --port 4000
mockr serve https://petstore3.swagger.io/api/v3/openapi.json
```

## Options

```
mockr serve <spec>

  -p, --port <number>   Port to listen on (default: 3001)
  --delay <ms>          Artificial response delay (default: 0)
  --seed <number>       Faker seed for reproducible data
  --no-tui              Plain logging instead of terminal UI
```

## What it does

- Reads OpenAPI 3.x or Swagger 2.x (JSON or YAML, local file or URL)
- Spins up an Express server with all your endpoints
- Returns realistic fake data that matches your schema types and field names
- Auto-fills `email`, `name`, `phone`, `url`, `id`, `createdAt` etc from field name heuristics
- Handles path params, query params, pagination
- Accepts any auth token — never rejects

## Built-in endpoints

```
GET /__mockr/health    → server status
GET /__mockr/routes    → list all mocked routes as JSON
```

## Dev

```bash
npm run dev -- serve https://petstore3.swagger.io/api/v3/openapi.json
npm run build
```
