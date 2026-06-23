# Proxy & Recording

mockr can sit in front of a real API — forwarding requests when the real server is available and falling back to mocks when it isn't. It can also record real responses and replay them offline.

## Proxy mode

```bash
mockr serve ./openapi.yaml --proxy https://api.example.com
```

With `--proxy`:
1. Every incoming request is forwarded to the real API
2. If the real API responds successfully (2xx), that response is returned
3. If the real API fails (timeout, error, unreachable), mockr falls back to generated fake data

### Proxy timeout

```bash
mockr serve ./openapi.yaml --proxy https://api.example.com --proxy-timeout 5000
```

Default timeout is 3000ms. Increase it for slow APIs.

## Recording

Add `--record` to save real API responses to disk:

```bash
mockr serve ./openapi.yaml --proxy https://api.example.com --record
```

Responses are saved to `mockr-recordings/` (or `--recording-dir <path>`):

```
mockr-recordings/
  GET/
    api-users.json
    api-users-:id.json
  POST/
    api-users.json
  ...
```

Each file contains the full response body. If you make the same request with different query strings, separate recordings are saved (keyed by query hash).

## Offline replay

Once you have recordings, you can use them without the `--proxy` flag — mockr automatically serves recordings when they exist, falling back to fake data only when there's no recording:

```bash
# Record from the real API
mockr serve ./openapi.yaml --proxy https://api.example.com --record

# Later, work offline — recordings are served automatically
mockr serve ./openapi.yaml
```

## Fallback priority

With proxy + recording enabled, mockr follows this order:

```
Request comes in
  → Try real API (--proxy)
    → 2xx? Return real response + save recording (--record)
    → Failed? Try recording file
      → Recording exists? Return recording
      → No recording? Return generated fake data
```

Without `--proxy`:

```
Request comes in
  → Check for override in mockr.json
    → Override exists? Return override (with template resolution)
    → No override? Check for recording
      → Recording exists? Return recording
      → No recording? Return generated fake data
```

## Custom recording directory

```bash
mockr serve ./openapi.yaml --proxy https://api.example.com --record --recording-dir ./fixtures
```

Recordings are committed to version control and shared with your team as stable test fixtures.
