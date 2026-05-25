/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Served from https://jonborchardt.github.io/ml-cyoa/ on GitHub Pages.
// Change `base` if you fork to a different repo name.
export default defineConfig({
    base: '/ml-cyoa/',
    plugins: [react()],
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
