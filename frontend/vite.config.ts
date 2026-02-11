import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // ✅ SOLO proxy las rutas de API
      '/api': {
        target: 'http://localhost:5173',
        changeOrigin: true,
      }
      // ❌ ELIMINA el proxy '/c' - déjalo que React Router lo maneje
    }
  }
})