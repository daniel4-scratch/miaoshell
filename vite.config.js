import { defineConfig } from 'vite'

export default defineConfig({
  root: './src',
  base: '/xtermtest/',
  server: {
    port: 3000,
    open: true
  },
  build: {
    outDir: '../dist',
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        manualChunks: undefined
      }
    }
  }
})
