import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  main: {
    build: {
      rollupOptions: {
        input: {
          index: path.resolve(__dirname, 'electron/main.ts')
        },
        external: ['electron']
      }
    },
    plugins: [externalizeDepsPlugin()]
  },
  preload: {
    build: {
      rollupOptions: {
        input: {
          index: path.resolve(__dirname, 'electron/preload.ts')
        }
      }
    },
    plugins: [externalizeDepsPlugin()]
  },
  renderer: {
    build: {
      rollupOptions: {
        input: {
          index: path.resolve(__dirname, 'index.html')
        }
      }
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@/lib': path.resolve(__dirname, './src/renderer/lib'),
        '@/components': path.resolve(__dirname, './src/renderer/components'),
        '@/hooks': path.resolve(__dirname, './src/renderer/hooks'),
        '@/pages': path.resolve(__dirname, './src/renderer/pages'),
        '@shared': path.resolve(__dirname, './src/shared'),
        '@renderer': path.resolve(__dirname, './src/renderer'),
        '@components': path.resolve(__dirname, './src/renderer/components'),
        '@pages': path.resolve(__dirname, './src/renderer/pages'),
        '@hooks': path.resolve(__dirname, './src/renderer/hooks'),
        '@stores': path.resolve(__dirname, './src/renderer/stores'),
        '@lib': path.resolve(__dirname, './src/renderer/lib'),
        '@styles': path.resolve(__dirname, './src/renderer/styles')
      }
    },
    plugins: [react()]
  }
})
