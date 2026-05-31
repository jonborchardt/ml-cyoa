/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'url';
import { resolve } from 'path';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  base: '/ml-cyoa/',
  plugins: [react()],
  resolve: {
    alias: {
      '@ml-cyoa/editor': resolve(__dirname, '../../packages/editor/src/index.ts'),
    },
    dedupe: ['react', 'react-dom'],
  },
});
