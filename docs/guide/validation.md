# Request Validation

mockr can validate incoming request bodies against your OpenAPI spec schemas using Ajv.

## Enable validation

```bash
# Warn mode — log errors, add header, but still respond
mockr serve ./openapi.yaml --validate

# Strict mode — return 400 on invalid requests
mockr serve ./openapi.yaml --validate --strict
```

## Warn mode (default with `--validate`)

Invalid requests are still served but mockr:
- Logs the validation errors to the console
- Adds an `X-Mockr-Validation-Warnings` response header with the error list

This is useful during development — your app still gets a response so you can see how it handles data, but you're also told what's wrong with the request.

## Strict mode (`--strict`)

Invalid requests are rejected with `400 Bad Request`:

```json
HTTP 400 Bad Request
{
  "error": "Request validation failed",
  "errors": [
    {
      "instancePath": "/email",
      "message": "must match format \"email\""
    },
    {
      "instancePath": "/age",
      "message": "must be >= 0"
    }
  ]
}
```

## What gets validated

- **Request body** — validated against the `requestBody` schema in your spec
- Routes without a defined `requestBody` schema are not validated

Query params and path params are not currently validated (only bodies).

## Ajv formats

mockr uses `ajv-formats` to validate format keywords like `email`, `date`, `date-time`, `uuid`, `uri`, etc.

## Example

Given a spec with:

```yaml
/api/users:
  post:
    requestBody:
      content:
        application/json:
          schema:
            type: object
            required: [email, name]
            properties:
              email:
                type: string
                format: email
              name:
                type: string
                minLength: 1
```

```bash
# This gets rejected in strict mode
curl -X POST http://localhost:3001/api/users \
  -H "Content-Type: application/json" \
  -d '{"name": ""}'

# Response: 400
# { "error": "Request validation failed", "errors": [...] }
```
