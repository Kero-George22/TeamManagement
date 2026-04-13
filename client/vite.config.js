import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/app/',
  build: {
    outDir: '../public/app',
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    proxy: {
      '/auth':     'http://localhost:3000',
      '/projects': 'http://localhost:3000',
      '/tasks':    'http://localhost:3000',
      '/profile':  'http://localhost:3000',
      '/office':   'http://localhost:3000',
      '/dms':      'http://localhost:3000',
      '/posts':    'http://localhost:3000',
      '/health':   'http://localhost:3000',
    },
  },
});
