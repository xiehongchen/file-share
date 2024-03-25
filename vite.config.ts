import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
  ],
  server: {
    port: 3000,
    origin: 'http://localhost:3000'
  },
  build: {
    outDir: 'dist/assets',
    assetsDir: '',
    rollupOptions: {
      output: {
        
      },
    }
  },
})
