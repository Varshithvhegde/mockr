import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: '/__mockr/ui/',
  build: {
    outDir: '../ui-dist',
    emptyOutDir: true,
  },
  server: {
    proxy: {
      '/__mockr': 'http://localhost:3001',
    },
  },
})
