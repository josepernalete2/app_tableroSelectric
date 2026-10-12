import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const backendPort = env.PORT || env.VITE_API_PORT || '3001'
  const target = env.VITE_API_URL || `http://localhost:${backendPort}`

  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        strategies: 'injectManifest',
        srcDir: 'public',
        filename: 'sw.js',
        registerType: 'autoUpdate',
        injectRegister: null, // Registro controlado en main.jsx
        manifestFilename: 'manifest.json',
        manifest: {
          name: 'Tablero Selectric',
          short_name: 'Selectric',
          description: 'Sistema de inspección técnica de tableros eléctricos, diagramas unifilares y sincronización offline',
          start_url: '/',
          scope: '/',
          id: '/',
          display: 'standalone',
          orientation: 'any',
          background_color: '#0f172a',
          theme_color: '#0f172a',
          lang: 'es',
          categories: ['utilities', 'productivity', 'business'],
          icons: [
            {
              src: '/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: '/pwa-maskable-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'maskable'
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: '/pwa-maskable-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable'
            }
          ]
        }
      })
    ],
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target,
          changeOrigin: true,
          secure: false,
        },
        '/uploads': {
          target,
          changeOrigin: true,
          secure: false,
        },
        '/socket.io': {
          target,
          ws: true,
          changeOrigin: true,
        }
      }
    }
  }
})

