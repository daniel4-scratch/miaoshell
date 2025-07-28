import { defineConfig } from 'vite'
import { copyFileSync, mkdirSync } from 'fs'
import { join } from 'path'

export default defineConfig({
  root: './src',
  base: './',
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
    },
    copyPublicDir: false // We'll handle copying manually
  },
  publicDir: './assets',
  plugins: [
    {
      name: 'copy-assets',
      writeBundle() {
        // Create assets directory in dist
        mkdirSync('dist/assets', { recursive: true })
        // Copy miao.txt to assets folder
        copyFileSync('src/assets/miao.txt', 'dist/assets/miao.txt')
      }
    }
  ]
})
