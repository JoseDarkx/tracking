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
  },
  // 👇 NUEVA SECCIÓN DE OPTIMIZACIÓN PARA PRODUCCIÓN 👇
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Separamos las librerías principales de React
          vendor: ['react', 'react-dom', 'react-router-dom'],
          // Separamos los gráficos pesados
          charts: ['recharts'],
        }
      }
    }
  }
})