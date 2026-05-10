import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // Needed for docker
    port: 5173,
    proxy: {
      '/api': {
        target: 'https://market_backend:5000',
        changeOrigin: true,
        secure: false,
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq, req) => {
            const clientIp = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '')
              .split(',')[0].trim().replace(/^::ffff:/, '');
            proxyReq.setHeader('X-Forwarded-For', clientIp);
          });
        }
      },
      '/uploads': {
        target: 'https://market_backend:5000',
        changeOrigin: true,
        secure: false,
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq, req) => {
            const clientIp = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '')
              .split(',')[0].trim().replace(/^::ffff:/, '');
            proxyReq.setHeader('X-Forwarded-For', clientIp);
          });
        }
      }
    }
  }
})
