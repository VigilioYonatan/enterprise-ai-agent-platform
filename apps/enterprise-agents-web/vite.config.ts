import path from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@enterprise-agents/contracts': path.resolve(
        __dirname,
        '../enterprise-agents-impl/packages/contracts/dist/contracts.js',
      ),
      '@': path.resolve(__dirname, './src/features'),
      '~': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:3000', changeOrigin: true },
      '/realms': { target: 'http://127.0.0.1:8081', changeOrigin: true },
    },
  },
  preview: {
    host: '0.0.0.0',
    port: 8080,
    proxy: {
      '/api': { target: 'http://localhost:3000', changeOrigin: true },
      '/realms': { target: 'http://127.0.0.1:8081', changeOrigin: true },
    },
  },
});
