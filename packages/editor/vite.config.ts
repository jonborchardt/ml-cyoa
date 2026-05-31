/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'MlCyoaEditor',
      fileName: 'editor',
    },
    rollupOptions: {
      external: [
        'react', 'react-dom', 'react-router-dom',
        '@mui/material', '@mui/icons-material',
        '@emotion/react', '@emotion/styled',
        '@xyflow/react', '@monaco-editor/react',
      ],
      output: { globals: { react: 'React', 'react-dom': 'ReactDOM' } },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    pool: 'forks',
    setupFiles: ['src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/test/**', 'src/**/*.stories.*'],
      thresholds: { lines: 70, functions: 70, branches: 65 },
    },
  },
});
