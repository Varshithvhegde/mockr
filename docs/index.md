---
layout: home

hero:
  name: "mockr"
  text: "Zero-config OpenAPI mock server"
  tagline: Paste a spec, get a running server with realistic fake data in seconds. No sign-up, no config.
  actions:
    - theme: brand
      text: Get Started
      link: /guide/getting-started
    - theme: alt
      text: View on GitHub
      link: https://github.com/Varshithvhegde/mockr

features:
  - icon: ⚡
    title: Instant setup
    details: Point mockr at any OpenAPI 3.x or Swagger 2.x spec — local file or URL — and it spins up a fully working server immediately.

  - icon: 🎲
    title: Realistic fake data
    details: Field names like email, name, phone, createdAt are auto-detected and filled with matching faker data. No more "string" everywhere.

  - icon: ✏️
    title: Override anything
    details: Pin specific routes to exact responses with mockr.json. Flip between happy path, error states, and edge cases in seconds.

  - icon: 🧩
    title: Response templating
    details: Use tokens like &#123;&#123;faker.uuid&#125;&#125;, &#123;&#123;params.id&#125;&#125;, &#123;&#123;body.name&#125;&#125; inside override bodies. Values resolve per-request — dynamic mocks without a real server.

  - icon: 🔄
    title: Proxy with fallback
    details: Try the real API first, fall back to mocks on failure. Record real responses and replay them offline.

  - icon: 🤖
    title: MCP Server
    details: Works as an MCP tool server — let Claude or any AI agent inspect your spec, generate configs, and query the running mock.
---
