import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const backendPort = env.PORT || env.VITE_API_PORT || '3001'
  const target = env.VITE_API_URL || `http://localhost:${backendPort}`

  return {
    plugins: [
      react(),
      tailwindcss()
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

