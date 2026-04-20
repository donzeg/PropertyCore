import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// In development, Vite runs on :5173 and proxies API calls to the engine on :8080.
// In production the built files are served by the hub (nginx or the engine itself)
// at the same origin, so relative URLs work without a proxy.
export default defineConfig({
  plugins: [react()],
  base: '/admin/',
  server: {
    proxy: {
      '/api':    { target: 'http://localhost:8080', changeOrigin: true },
      '/status': { target: 'http://localhost:8080', changeOrigin: true },
    },
  },
})
