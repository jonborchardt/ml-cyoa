import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Served from https://jonborchardt.github.io/ml-cyoa/ on GitHub Pages.
// Change `base` if you fork to a different repo name.
export default defineConfig({
    base: '/ml-cyoa/',
    plugins: [react()],
});
