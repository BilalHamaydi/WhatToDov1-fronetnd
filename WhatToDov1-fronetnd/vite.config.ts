import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// vite.config.ts
export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
})

