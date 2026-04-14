import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // Needed for docker
    port: 5173,
    proxy: {
      // /api 요청 → 백엔드 컨테이너로 프록시
      '/api': {
        target: 'https://market_backend:5000',
        changeOrigin: true,
        secure: false  // 자체 서명 인증서 허용
      },
      // /uploads 요청 → 백엔드 컨테이너로 프록시
      '/uploads': {
        target: 'https://market_backend:5000',
        changeOrigin: true,
        secure: false
      }
    }
  }
})
