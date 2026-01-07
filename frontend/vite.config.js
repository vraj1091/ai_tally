import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    proxy: {
      // Proxy /api to backend - use base URL (without /api suffix)
      '/api': {
        target: process.env.VITE_BACKEND_URL || 'http://localhost:8000',
        changeOrigin: true,
        timeout: 1800000,  // 30 minutes for large file uploads
        proxyTimeout: 1800000,  // 30 minutes proxy timeout
        configure: (proxy, _options) => {
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            // Set longer timeout for upload requests
            if (req.url?.includes('/backup/upload')) {
              proxyReq.setTimeout(1800000);  // 30 minutes
            }
          });
        }
      },
      // Proxy WebSocket connections
      '/ws': {
        target: process.env.VITE_BACKEND_URL || 'http://localhost:8000',
        changeOrigin: true,
        ws: true  // Enable WebSocket proxying
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: false, // Disable sourcemaps for production
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'chart-vendor': ['recharts'],
        }
      }
    },
    // Ensure _redirects file is copied to dist
    copyPublicDir: true
  },
  // Ensure public files are copied to dist
  publicDir: 'public',
  // Base path for production
  base: '/'
})
 
