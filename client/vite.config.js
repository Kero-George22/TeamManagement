import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/auth':        { target: 'http://localhost:3000', changeOrigin: true },
      '/projects':    { target: 'http://localhost:3000', changeOrigin: true },
      '/tasks':       { target: 'http://localhost:3000', changeOrigin: true },
      '/profile':     { target: 'http://localhost:3000', changeOrigin: true },
      '/assessments': { target: 'http://localhost:3000', changeOrigin: true },
      '/portfolio':   { target: 'http://localhost:3000', changeOrigin: true },
      '/office':      { target: 'http://localhost:3000', changeOrigin: true },
      '/analytics':   { target: 'http://localhost:3000', changeOrigin: true },
      '/submissions': { target: 'http://localhost:3000', changeOrigin: true },
      '/setup':       { target: 'http://localhost:3000', changeOrigin: true },
      '/health':      { target: 'http://localhost:3000', changeOrigin: true },
    },
  },
  build: {
    outDir: '../public/app',
    emptyOutDir: true,
  },
});
