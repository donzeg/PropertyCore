import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

function adminSlashRedirect() {
  return {
    name: 'propertycore-admin-slash-redirect',
    configureServer(server: { middlewares: { use: (fn: (req: { url?: string }, res: { statusCode: number; setHeader: (name: string, value: string) => void; end: () => void }, next: () => void) => void) => void } }) {
      server.middlewares.use((req, res, next) => {
        if (req.url === '/admin') {
          res.statusCode = 302
          res.setHeader('Location', '/admin/')
          res.end()
          return
        }
        next()
      })
    },
  }
}

// In development, Vite runs on :5173+ and proxies API/WS calls to the engine on :8080.
// In production the built files are served by the hub (nginx or the engine itself)
// at the same origin, so relative URLs work without a proxy.
export default defineConfig({
  plugins: [adminSlashRedirect(), react()],
  base: '/admin/',
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    hmr: {
      host: '192.168.31.223',
      protocol: 'ws',
      port: 5173,
    },
    proxy: {
      '/api':    { target: 'http://localhost:8080', changeOrigin: true },
      '/status': { target: 'http://localhost:8080', changeOrigin: true },
      '/health': { target: 'http://localhost:8080', changeOrigin: true },
      '/ws':     { target: 'ws://localhost:8080',   changeOrigin: true, ws: true },
      '/esphome': {
        target: 'http://localhost:6052',
        changeOrigin: true,
        ws: true,
      },
    },
  },
})
