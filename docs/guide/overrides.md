# Overrides

Overrides let you pin any route to an exact response. Everything else still returns auto-generated fake data.

## mockr.json

Create `mockr.json` in the directory where you run `mockr serve`:

```json
{
  "overrides": [
    {
      "method": "GET",
      "path": "/api/users",
      "status": 200,
      "body": {
        "users": [],
        "total": 0
      }
    }
  ]
}
```

The server watches this file for changes — edits apply without restarting.

## Override fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `method` | string | ✅ | HTTP method (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`) |
| `path` | string | ✅ | Route path, matching the spec (e.g. `/api/users/:id`) |
| `status` | number | | HTTP status code (default: `200`) |
| `body` | object/array | | Response body as JSON |
| `headers` | object | | Extra response headers |
| `delay` | number | | Artificial delay in milliseconds |

## Path matching

Override paths match the same way Express does — `:param` segments match any value.

```json
{
  "method": "GET",
  "path": "/api/users/:id",
  "status": 404,
  "body": { "error": "User not found" }
}
```

This matches `GET /api/users/123`, `GET /api/users/abc`, etc.

## Multiple overrides

You can have many overrides — the first matching method + path wins:

```json
{
  "overrides": [
    {
      "method": "POST",
      "path": "/auth/login",
      "status": 401,
      "body": { "error": "invalid_credentials" }
    },
    {
      "method": "GET",
      "path": "/api/account",
      "status": 200,
      "body": { "id": "u1", "name": "Alice", "email": "alice@example.com" }
    }
  ]
}
```

## Custom headers

```json
{
  "method": "GET",
  "path": "/api/products",
  "status": 200,
  "headers": {
    "X-Total-Count": "150",
    "Cache-Control": "no-cache"
  },
  "body": { "items": [] }
}
```

## Artificial delay

Simulate slow endpoints:

```json
{
  "method": "GET",
  "path": "/api/reports/export",
  "status": 200,
  "delay": 2000,
  "body": { "url": "https://example.com/report.pdf" }
}
```

## Via the Web UI

You don't need to edit `mockr.json` by hand. In the [Web UI](/guide/web-ui):

1. Click a route
2. Open the **Override** tab
3. Fill in status, headers, body, delay
4. Click **Apply override**

Changes are written to `mockr.json` immediately and take effect for the next request.

## Via the `mockr init` command

`mockr init <spec>` auto-generates `mockr.json` with one entry per endpoint, pre-filled with realistic data from the response schema. Delete the entries you don't need and keep the ones you want to customise.

## Removing an override

Delete the entry from `mockr.json` (or via the UI) and the route reverts to auto-generated data.

## Template tokens in override bodies

Override bodies support `&#123;&#123;token&#125;&#125;` placeholders that are resolved per-request. See [Response Templating](/guide/templating).

```json
{
  "method": "GET",
  "path": "/api/users/:id",
  "status": 200,
  "body": {
    "id": "{{params.id}}",
    "email": "{{faker.email}}",
    "createdAt": "{{now}}"
  }
}
```
