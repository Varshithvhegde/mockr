# Postman Collection

mockr automatically generates a Postman collection from your spec while the server is running.

## Download

With the server running, visit:

```
GET http://localhost:3001/__mockr/postman
```

Or download via curl:

```bash
curl http://localhost:3001/__mockr/postman -o mockr-collection.json
```

## Import into Postman

1. Open Postman
2. Click **Import** (top left)
3. Drag in `mockr-collection.json` or paste the URL directly
4. All your endpoints appear as a collection with example requests

## What's included

- Every endpoint from your spec as a separate request
- Path params pre-filled with example values
- Request bodies for POST/PUT/PATCH with schema-based examples
- Organised by tag (if your spec uses tags)

## Environment variable

The collection uses a `&#123;&#123;baseUrl&#125;&#125;` variable set to `http://localhost:3001`. To change the port or host, update the variable in Postman's environment settings.
