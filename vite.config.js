import { defineConfig } from 'vite'
import { copyFileSync, mkdirSync, readdirSync, statSync } from 'fs'
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
        
        // Automatically copy all files from src/assets to dist/assets
        const assetsDir = 'src/assets'
        try {
          const files = readdirSync(assetsDir)
          files.forEach(file => {
            const srcPath = join(assetsDir, file)
            const destPath = join('dist/assets', file)
            
            // Only copy files (not directories)
            if (statSync(srcPath).isFile()) {
              copyFileSync(srcPath, destPath)
              console.log(`Copied: ${file}`)
            }
          })
        } catch (error) {
          console.warn('Could not copy assets:', error.message)
        }
      }
    }
  ]
})
