import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  root: '.',
  resolve: {
    alias: [
      {
        find: /^@shared\/(.*)$/,
        replacement: path.resolve(__dirname, './src/shared/$1')
      },
      {
        find: /^@\/renderer\/(.*)$/,
        replacement: path.resolve(__dirname, './src/renderer/$1')
      },
      {
        find: /^@renderer\/(.*)$/,
        replacement: path.resolve(__dirname, './src/renderer/$1')
      },
      {
        find: /^@\/(.*)$/,
        replacement: path.resolve(__dirname, './src/renderer/$1')
      },
      {
        find: '@renderer',
        replacement: path.resolve(__dirname, './src/renderer')
      }
    ]
  },
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    open: false
  }
})
