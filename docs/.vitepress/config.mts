import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'mockr',
  description: 'Zero-config OpenAPI mock server',
  base: '/mockr/',

  head: [
    ['link', { rel: 'icon', href: '/mockr/favicon.svg', type: 'image/svg+xml' }],
  ],

  themeConfig: {
    siteTitle: 'mockr',
    nav: [
      { text: 'Guide', link: '/guide/getting-started' },
      { text: 'Reference', link: '/reference/mockr-json' },
      { text: 'Templates', link: '/guide/templating' },
      { text: 'MCP', link: '/guide/mcp' },
      { text: 'GitHub', link: 'https://github.com/Varshithvhegde/mockr' },
    ],

    sidebar: [
      {
        text: 'Introduction',
        items: [
          { text: 'What is mockr?', link: '/guide/what-is-mockr' },
          { text: 'Getting Started', link: '/guide/getting-started' },
        ],
      },
      {
        text: 'Guide',
        items: [
          { text: 'CLI Reference', link: '/guide/cli' },
          { text: 'Web UI', link: '/guide/web-ui' },
          { text: 'Overrides', link: '/guide/overrides' },
          { text: 'Response Templating', link: '/guide/templating' },
          { text: 'Scenarios', link: '/guide/scenarios' },
          { text: 'Proxy & Recording', link: '/guide/proxy-recording' },
          { text: 'Validation', link: '/guide/validation' },
          { text: 'Stateful CRUD', link: '/guide/crud' },
        ],
      },
      {
        text: 'Configuration',
        items: [
          { text: 'mockr.json', link: '/reference/mockr-json' },
          { text: 'Built-in Endpoints', link: '/reference/built-in-endpoints' },
        ],
      },
      {
        text: 'Integrations',
        items: [
          { text: 'MCP Server (AI)', link: '/guide/mcp' },
          { text: 'Postman Collection', link: '/guide/postman' },
        ],
      },
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/Varshithvhegde/mockr' },
    ],

    search: { provider: 'local' },

    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Built by Varshith Hegde',
    },

    editLink: {
      pattern: 'https://github.com/Varshithvhegde/mockr/edit/main/docs/:path',
      text: 'Edit this page on GitHub',
    },
  },

  markdown: {
    theme: { light: 'github-light', dark: 'github-dark' },
  },

  // Don't fail the build on localhost links in code examples
  ignoreDeadLinks: [/localhost/],
})
