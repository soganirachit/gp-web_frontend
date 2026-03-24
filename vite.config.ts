import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  css: {
    postcss: './postcss.config.cjs'
  },
  build: {
    chunkSizeWarningLimit: 500,
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-motion': ['framer-motion'],
          'vendor-charts': ['chart.js', 'react-chartjs-2'],
          'vendor-maps': ['@react-google-maps/api'],
          'vendor-ui': ['react-hot-toast', 'react-icons', 'lucide-react'],
          'vendor-forms': ['react-hook-form', 'react-datepicker', 'date-fns'],
        }
      }
    }
  }
})
