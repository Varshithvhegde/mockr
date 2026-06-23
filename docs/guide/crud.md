# Stateful CRUD

mockr automatically detects REST CRUD patterns in your spec and creates an in-memory store for them. Create, read, update, and delete operations persist within a server session.

## How it works

mockr looks for route groups that follow REST conventions:

```
GET    /api/users          → list
POST   /api/users          → create
GET    /api/users/:id      → read one
PUT    /api/users/:id      → replace
PATCH  /api/users/:id      → update
DELETE /api/users/:id      → delete
```

When this pattern is detected, all six routes share a single in-memory collection. Changes made via `POST`, `PUT`, `PATCH`, and `DELETE` are reflected in subsequent `GET` requests.

## Example session

```bash
# List (starts empty)
curl http://localhost:3001/api/users
# → { "items": [], "total": 0 }

# Create
curl -X POST http://localhost:3001/api/users \
  -H "Content-Type: application/json" \
  -d '{"name": "Alice", "email": "alice@example.com"}'
# → { "id": "uuid-1", "name": "Alice", "email": "alice@example.com" }

# List again
curl http://localhost:3001/api/users
# → { "items": [{ "id": "uuid-1", "name": "Alice", ... }], "total": 1 }

# Get one
curl http://localhost:3001/api/users/uuid-1
# → { "id": "uuid-1", "name": "Alice", "email": "alice@example.com" }

# Update
curl -X PATCH http://localhost:3001/api/users/uuid-1 \
  -H "Content-Type: application/json" \
  -d '{"name": "Alice Smith"}'
# → { "id": "uuid-1", "name": "Alice Smith", "email": "alice@example.com" }

# Delete
curl -X DELETE http://localhost:3001/api/users/uuid-1
# → 204 No Content

# List again
curl http://localhost:3001/api/users
# → { "items": [], "total": 0 }
```

## Detection heuristics

CRUD is detected when:
1. There's a `GET /collection` route (no path params)
2. There's at least one `GET /collection/:id` route
3. The path doesn't contain non-REST fragments like `auth`, `login`, `chatbot`, `media`, `health`, etc.

Routes that don't match the pattern fall back to generating fake data on every request.

## State lifetime

The in-memory store lives only for the duration of the server process. Restarting mockr resets all state.

## Seeded initial data

Use `--seed <number>` to get consistent generated items for collection endpoints across restarts. The seed affects faker data generation but not the CRUD store (which starts empty).
