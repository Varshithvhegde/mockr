# Built-in Endpoints

These endpoints are available on every mockr server regardless of your spec.

| Endpoint | Description |
|----------|-------------|
| `GET /__mockr/ui/` | Live web dashboard |
| `GET /__mockr/health` | Server health check |
| `GET /__mockr/routes` | All mocked routes as JSON |
| `GET /__mockr/postman` | Download Postman collection |
| `GET /__mockr/events` | SSE stream for live request events |
| `GET /__mockr/overrides` | Current active overrides |
| `POST /__mockr/override` | Add or update an override |
| `POST /__mockr/try` | Internal — used by the web UI Try it feature |

## `GET /__mockr/health`

```json
{
  "ok": true,
  "routes": 42,
  "title": "Petstore API",
  "version": "1.0.0"
}
```

## `GET /__mockr/routes`

Returns an array of all registered routes:

```json
[
  {
    "method": "get",
    "path": "/api/users",
    "summary": "List all users",
    "operationId": "listUsers",
    "tags": ["users"],
    "statusCode": 200,
    "pathParams": [],
    "queryParams": ["page", "limit"],
    "schema": "{ \"type\": \"array\", ... }"
  },
  ...
]
```

## `GET /__mockr/overrides`

Returns the current active overrides array (same as the contents of `mockr.json`):

```json
[
  {
    "method": "GET",
    "path": "/api/users/:id",
    "status": 404,
    "body": { "error": "Not found" }
  }
]
```

## `POST /__mockr/override`

Add or update an override at runtime. The body is written to `mockr.json` and takes effect immediately.

**Request:**
```json
{
  "method": "POST",
  "path": "/auth/login",
  "status": 401,
  "body": { "error": "invalid_credentials" }
}
```

**Response:** `200 { "ok": true }`

## `GET /__mockr/events`

Server-Sent Events stream. Each event is a JSON object:

```
data: {"method":"GET","path":"/api/users","status":200,"durationMs":3}
data: {"method":"POST","path":"/api/users","status":201,"durationMs":7}
```

Used by the web UI to display the live request log.
