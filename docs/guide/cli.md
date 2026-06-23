# CLI Reference

## `mockr serve`

Start a mock server from an OpenAPI or Swagger spec.

```bash
mockr serve <spec> [options]
```

`<spec>` can be a local file path or a remote URL (http/https).

### Options

| Flag | Default | Description |
|------|---------|-------------|
| `-p, --port <number>` | `3001` | Port to listen on |
| `--delay <ms>` | `0` | Add a fixed delay to every response |
| `--seed <number>` | random | Faker seed — same seed → same data on every run |
| `--watch` | off | Auto-reload when the spec file changes |
| `--proxy <url>` | — | Try real API first, fall back to mock on failure |
| `--proxy-timeout <ms>` | `3000` | Timeout for proxy requests |
| `--scenario <name>` | `happy` | Global scenario (`happy`, `error`, `empty`, `slow`, `chaos`) |
| `--validate` | off | Validate request bodies against spec schemas |
| `--strict` | off | Return 400 on validation errors (instead of just warning) |
| `--record` | off | Save real API responses when using `--proxy` |
| `--recording-dir <path>` | `mockr-recordings/` | Where to save recorded responses |
| `--no-tui` | — | Plain log output instead of the terminal dashboard |

### Examples

```bash
# Basic usage
mockr serve ./openapi.yaml

# Custom port + artificial delay
mockr serve ./openapi.yaml --port 4000 --delay 300

# Reproducible fake data
mockr serve ./openapi.yaml --seed 42

# Watch for spec changes
mockr serve ./openapi.yaml --watch

# Proxy to real API with recording
mockr serve ./openapi.yaml --proxy https://api.example.com --record

# Error scenario — every endpoint returns 500
mockr serve ./openapi.yaml --scenario error

# Validate request bodies
mockr serve ./openapi.yaml --validate --strict
```

---

## `mockr init`

Generate a `mockr.json` config file pre-filled with realistic fake data from the spec.

```bash
mockr init <spec> [--force]
```

### Flags

| Flag | Description |
|------|-------------|
| `--force` | Overwrite existing `mockr.json` |

### What it generates

For each endpoint in the spec, `mockr init` creates one override entry pre-filled with realistic data matching the response schema. You can then:

1. Delete entries you don't want to override (they fall back to auto-generation)
2. Edit entries to match your test fixtures
3. Commit the file to version control for consistent test data

```bash
# Generate config
mockr init ./openapi.yaml

# Then edit mockr.json, then serve
mockr serve ./openapi.yaml
```

---

## `mockr-mcp`

Start the MCP (Model Context Protocol) server for AI tool integration.

```bash
mockr-mcp
```

See [MCP Server](/guide/mcp) for setup and available tools.
