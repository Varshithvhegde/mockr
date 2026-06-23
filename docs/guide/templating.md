# Response Templating

Override bodies support `&#123;&#123;token&#125;&#125;` placeholders that resolve per-request. This lets you write dynamic mock responses without a real server.

## Quick example

```json
{
  "method": "GET",
  "path": "/api/users/:id",
  "status": 200,
  "body": {
    "id": "{{params.id}}",
    "email": "{{faker.email}}",
    "name": "{{faker.name}}",
    "createdAt": "{{now}}",
    "message": "Hello {{body.name}}, your order {{params.orderId}} is ready"
  }
}
```

## Token reference

### Request context

| Token | Returns |
|-------|---------|
| `&#123;&#123;params.x&#125;&#125;` | Path param value — e.g. `&#123;&#123;params.id&#125;&#125;` for `/api/users/:id` |
| `&#123;&#123;query.x&#125;&#125;` | Query string param — e.g. `&#123;&#123;query.page&#125;&#125;` |
| `&#123;&#123;body.x&#125;&#125;` | Request body field — e.g. `&#123;&#123;body.email&#125;&#125;` |
| `&#123;&#123;headers.x&#125;&#125;` | Request header value — e.g. `&#123;&#123;headers.authorization&#125;&#125;` |
| `&#123;&#123;method&#125;&#125;` | HTTP method (`GET`, `POST`, …) |
| `&#123;&#123;path&#125;&#125;` | Full request path (`/api/users/42`) |

### Date & time

| Token | Returns |
|-------|---------|
| `&#123;&#123;now&#125;&#125;` | Current ISO datetime (`2024-01-15T10:30:00.000Z`) |
| `&#123;&#123;timestamp&#125;&#125;` | Unix timestamp in seconds (`1705312200`) |

### Identity & network

| Token | Returns |
|-------|---------|
| `&#123;&#123;faker.uuid&#125;&#125;` | Random UUID (`a3f4c21d-...`) |
| `&#123;&#123;faker.email&#125;&#125;` | Random email (`john.doe@example.com`) |
| `&#123;&#123;faker.url&#125;&#125;` | Random URL (`https://example.com`) |
| `&#123;&#123;faker.image&#125;&#125;` | Random image URL |
| `&#123;&#123;faker.username&#125;&#125;` | Username (`john_doe42`) |

### People

| Token | Returns |
|-------|---------|
| `&#123;&#123;faker.name&#125;&#125;` | Full name (`John Doe`) |
| `&#123;&#123;faker.firstName&#125;&#125;` | First name (`John`) |
| `&#123;&#123;faker.lastName&#125;&#125;` | Last name (`Doe`) |
| `&#123;&#123;faker.phone&#125;&#125;` | Phone number (`+1-555-123-4567`) |

### Numbers & booleans

| Token | Returns |
|-------|---------|
| `&#123;&#123;faker.number&#125;&#125;` | Random integer 1–1000 |
| `&#123;&#123;faker.price&#125;&#125;` | Price float (`42.99`) |
| `&#123;&#123;faker.boolean&#125;&#125;` | `true` or `false` |

### Text & place

| Token | Returns |
|-------|---------|
| `&#123;&#123;faker.word&#125;&#125;` | Single word |
| `&#123;&#123;faker.sentence&#125;&#125;` | Lorem sentence |
| `&#123;&#123;faker.paragraph&#125;&#125;` | Lorem paragraph |
| `&#123;&#123;faker.slug&#125;&#125;` | URL-friendly slug (`cool-product`) |
| `&#123;&#123;faker.color&#125;&#125;` | Color name (`coral`) |
| `&#123;&#123;faker.city&#125;&#125;` | City name (`Berlin`) |
| `&#123;&#123;faker.country&#125;&#125;` | Country name (`Germany`) |
| `&#123;&#123;faker.company&#125;&#125;` | Company name (`Acme Corp`) |

### Business

| Token | Returns |
|-------|---------|
| `&#123;&#123;faker.date&#125;&#125;` | ISO date string (`2024-01-15`) |
| `&#123;&#123;faker.datetime&#125;&#125;` | ISO datetime string |

## Type preservation

When a JSON field's value is **exactly** a single token, the native type is preserved:

```json
{ "price": "{{faker.price}}" }
```
→ `{ "price": 42.99 }` — a **float**, not `"42.99"`

```json
{ "active": "{{faker.boolean}}" }
```
→ `{ "active": true }` — a **boolean**, not `"true"`

Mixed strings always return a string:
```json
{ "label": "Item #{{faker.number}}" }
```
→ `{ "label": "Item #573" }` — a **string**

## Using tokens in the Web UI

In the **Override** tab, click **`{{}} Template tokens`** to expand the token panel. Click any token to insert it at your cursor position in the body editor. Route-specific path params (like `:id`) appear in a separate section.

## Nested objects and arrays

Templates work recursively — tokens inside nested objects and arrays all resolve:

```json
{
  "method": "GET",
  "path": "/api/orders/:orderId",
  "body": {
    "id": "{{params.orderId}}",
    "customer": {
      "name": "{{faker.name}}",
      "email": "{{faker.email}}"
    },
    "items": [
      { "sku": "{{faker.slug}}", "price": "{{faker.price}}" }
    ],
    "createdAt": "{{now}}"
  }
}
```
