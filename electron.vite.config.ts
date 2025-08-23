import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      outDir: 'dist-electron/main',
      lib: {
        entry: 'electron/main.ts',
        formats: ['cjs']
      },
      rollupOptions: {
        output: { entryFileNames: 'index.js' }
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      outDir: 'dist-electron/preload',
      lib: {
        entry: 'electron/preload.ts',
        formats: ['cjs']
      },
      rollupOptions: {
        output: { entryFileNames: 'index.js' }
      }
    }
  },
  renderer: {
    plugins: [
      react()
    ],
    build: {
      outDir: 'dist/renderer',
      rollupOptions: {
        input: 'src/renderer/index.html',
        output: {
          manualChunks: {
            monaco: ['monaco-editor']
          }
        }
      }
    }
  }
});

