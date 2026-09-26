import path from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
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
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    setupFiles: ['./tests/setup.ts'],
    fileParallelism: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'json-summary'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['**/*.test.ts', '**/*.test.tsx', 'src/main.tsx'],
      thresholds: { lines: 60, functions: 60, branches: 50, statements: 60 },
    },
  },
});
