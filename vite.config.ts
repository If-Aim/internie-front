// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      i18next: "i18next/dist/esm/i18next.js",
    },
  },
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
      '/api': {
        target: 'https://aim-internie-app.p-e.kr',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})