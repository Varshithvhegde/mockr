# MCP Server (AI Integration)

mockr ships with an MCP (Model Context Protocol) server that lets AI assistants like Claude inspect your spec, generate configs, and interact with the running mock server.

## Setup

Add mockr to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "mockr": {
      "command": "mockr-mcp"
    }
  }
}
```

Or using `npx` without a global install:

```json
{
  "mcpServers": {
    "mockr": {
      "command": "npx",
      "args": ["-y", "--package=@varshithvh/mockr", "mockr-mcp"]
    }
  }
}
```

Restart Claude Desktop after editing.

## Available tools

### `inspect_spec`

Reads and parses an OpenAPI spec, returning all routes with their schemas, parameters, and response types.

**Input:** `{ "spec": "./openapi.yaml" }`

**Output:** Full route list with schemas

---

### `generate_mock_config`

Generates a `mockr.json` config file from a spec, pre-filled with realistic data.

**Input:** `{ "spec": "./openapi.yaml", "outputPath": "./mockr.json" }`

**Output:** The generated config + writes the file

---

### `query_mock_server`

Makes a request to the running mock server and returns the response.

**Input:** `{ "method": "GET", "path": "/api/users", "baseUrl": "http://localhost:3001" }`

**Output:** `{ "status": 200, "body": { ... } }`

---

### `add_override`

Adds or updates an override in `mockr.json`.

**Input:**
```json
{
  "method": "POST",
  "path": "/auth/login",
  "status": 401,
  "body": { "error": "invalid_credentials" },
  "configPath": "./mockr.json"
}
```

---

### `explain_mockr`

Explains mockr capabilities and returns usage examples. Good for bootstrapping AI context.

**Input:** `{}`

## Example prompts

Once connected, you can ask Claude:

- *"Run mockr with the petstore spec and show me what routes are available"*
- *"Generate a mockr.json for my spec that simulates a 401 on the login endpoint"*
- *"Add an override to return an empty list for GET /api/products"*
- *"What does the `/api/users/:id` endpoint return according to the spec?"*

## SKILL.md

The project includes a `SKILL.md` file at the repo root — a comprehensive guide for AI assistants covering all commands, config format, token reference, and common tasks. You can reference it directly in a prompt:

```
Based on the SKILL.md in the mockr repo, help me set up overrides for my test suite.
```
