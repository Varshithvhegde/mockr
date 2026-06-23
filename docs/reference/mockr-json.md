# mockr.json Reference

`mockr.json` is the config file for pinning routes to specific responses (overrides).

## Location

Place it in the directory where you run `mockr serve`. mockr watches the file for changes — edits apply without restarting.

## Full schema

```json
{
  "overrides": [
    {
      "method": "GET",
      "path": "/api/users/:id",
      "status": 200,
      "headers": {
        "X-Request-Id": "abc-123"
      },
      "body": {
        "id": "{{params.id}}",
        "name": "{{faker.name}}",
        "email": "{{faker.email}}",
        "createdAt": "{{now}}"
      },
      "delay": 500
    }
  ]
}
```

## Fields

### `method` (required)

HTTP method. Case-insensitive.

```
"GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD" | "OPTIONS"
```

### `path` (required)

Route path with optional `:param` segments. Must match the path in your spec.

```json
"/api/users"
"/api/users/:id"
"/api/users/:userId/orders/:orderId"
```

### `status`

HTTP response status code. Defaults to `200`.

```json
200 | 201 | 204 | 400 | 401 | 403 | 404 | 422 | 500
```

### `body`

JSON response body. Can be an object, array, string, number, or `null`.

Template tokens (`&#123;&#123;params.id&#125;&#125;`, `&#123;&#123;faker.email&#125;&#125;`, etc.) are resolved per-request. See [Response Templating](/guide/templating) for the full token reference.

If omitted, mockr responds with the `status` code and no body.

### `headers`

Extra response headers as a string-keyed object:

```json
{
  "headers": {
    "X-Rate-Limit-Remaining": "99",
    "Cache-Control": "no-cache",
    "Content-Language": "en"
  }
}
```

### `delay`

Artificial response delay in milliseconds. Applied before sending the response.

```json
{ "delay": 2000 }
```

## Example: testing different auth states

```json
{
  "overrides": [
    {
      "method": "POST",
      "path": "/auth/login",
      "status": 200,
      "body": {
        "token": "mock-jwt-token",
        "user": {
          "id": "{{faker.uuid}}",
          "email": "test@example.com"
        }
      }
    },
    {
      "method": "GET",
      "path": "/api/account",
      "status": 200,
      "body": {
        "id": "{{faker.uuid}}",
        "email": "test@example.com",
        "name": "Test User",
        "plan": "pro"
      }
    },
    {
      "method": "DELETE",
      "path": "/api/account/delete",
      "status": 204
    }
  ]
}
```

## Generate from spec

Use `mockr init` to generate a `mockr.json` pre-filled from your spec:

```bash
mockr init ./openapi.yaml
```

This creates one entry per endpoint with realistic data. Delete the entries you don't want to override.
