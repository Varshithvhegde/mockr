# Scenarios

Scenarios let you globally change the behaviour of every endpoint without touching `mockr.json`. Useful for testing how your app handles different server states.

## Usage

```bash
mockr serve ./openapi.yaml --scenario <name>
```

## Available scenarios

| Scenario | Behaviour |
|----------|-----------|
| `happy` | Normal operation — returns generated fake data (default) |
| `error` | Every endpoint returns `500 Internal Server Error` |
| `empty` | Every endpoint returns its normal structure but with all values set to empty/zero |
| `slow` | Adds a random 1–5 second delay to every request |
| `chaos` | Random per-request behaviour — sometimes errors, sometimes slow, sometimes empty |

## Examples

```bash
# Test your error state UI
mockr serve ./openapi.yaml --scenario error

# Test loading states and skeletons
mockr serve ./openapi.yaml --scenario slow

# Test empty state screens
mockr serve ./openapi.yaml --scenario empty

# Chaos testing — unpredictable responses
mockr serve ./openapi.yaml --scenario chaos
```

## Scenario + overrides

Overrides take priority over scenarios. If a route has an override, it always uses the override response regardless of the active scenario.

This lets you override specific routes to have known good data while testing how everything else behaves under a scenario:

```json
{
  "overrides": [
    {
      "method": "POST",
      "path": "/auth/login",
      "status": 200,
      "body": { "token": "test-token-123" }
    }
  ]
}
```

```bash
# Auth works fine, but all other endpoints are slow
mockr serve ./openapi.yaml --scenario slow
```

## Error scenario response

```json
HTTP 500 Internal Server Error
{
  "error": "Internal Server Error",
  "message": "Something went wrong"
}
```

## Empty scenario

The empty scenario deep-walks the response body and sets:
- Strings → `""`
- Numbers → `0`
- Booleans → `false`
- Arrays → `[]`
- Objects → `{}`

This is useful for testing how your UI handles "zero state" responses.
