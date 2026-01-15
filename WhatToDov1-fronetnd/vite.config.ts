import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  build: {
    outDir: '../WhatToDov1/src/main/resources/static',
    emptyOutDir: true,
  },
})
