# What is mockr?

mockr is a **zero-config OpenAPI mock server**. Give it a spec file or URL and it spins up a local HTTP server that returns realistic fake data for every endpoint — no sign-up, no config required to get started.

## Why mockr?

When building frontend apps or writing integration tests you often need a backend that isn't ready yet, or you want to test against error states and edge cases that are hard to reproduce against a real API.

mockr solves this by:

- **Reading your OpenAPI/Swagger spec** to know every endpoint, its parameters, and its response schema
- **Generating realistic fake data** that matches your field names and types — not just `"string"` everywhere
- **Letting you pin any route** to a specific response with a `mockr.json` config file
- **Providing a live web UI** to explore routes, run requests, and manage overrides without leaving the browser

## How it works

```
openapi.yaml  →  mockr  →  http://localhost:3001
                              ├── GET  /api/users      → [{id, name, email, ...}]
                              ├── POST /api/users      → {id, name, email, ...}
                              ├── GET  /api/users/:id  → {id, name, email, ...}
                              └── ...all your routes
```

1. mockr reads and dereferences your spec
2. For every route, it registers an Express handler
3. Handlers generate fake responses from the response schema using `@faker-js/faker`
4. If a `mockr.json` override exists for a route, that response is used instead
5. The web UI at `/__mockr/ui/` lets you explore and control everything

## Spec support

| Format | Support |
|--------|---------|
| OpenAPI 3.x (YAML or JSON) | ✅ Full |
| Swagger 2.x (YAML or JSON) | ✅ Full |
| Local file path | ✅ |
| Remote URL | ✅ |
| `$ref` resolution | ✅ |

## Data generation

mockr generates data that *makes sense*, not random garbage:

- `email` → `john.doe@example.com`
- `createdAt`, `updatedAt` → ISO datetime strings
- `phoneNumber`, `phone` → `+1-555-123-4567`
- `avatarUrl`, `imageUrl` → valid image URLs
- `id`, `userId`, `productId` → UUID
- `price`, `amount`, `total` → realistic floats
- `boolean` fields → `true` / `false`
- Array fields → 2–5 items

## Next steps

- [Getting Started](/guide/getting-started) — install and run your first mock server
- [Overrides](/guide/overrides) — pin routes to specific responses
- [Response Templating](/guide/templating) — dynamic per-request values in overrides
