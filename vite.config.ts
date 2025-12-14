// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/auth': {
        target: 'https://aim-internie-app.p-e.kr',
        changeOrigin: true,
        secure: false,
      },

      '/events': {
        target: 'https://aim-internie-app.p-e.kr',
        changeOrigin: true,
        secure: false,
      },
      
      '/schedules': {
        target: 'https://aim-internie-app.p-e.kr',
        changeOrigin: true,
        secure: false,
      },

      '/event-days': {
        target: 'https://aim-internie-app.p-e.kr',
        changeOrigin: true,
        secure: false,
      },

      '/questions': {
        target: 'https://aim-internie-app.p-e.kr',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})