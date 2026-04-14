import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// For GitHub Pages: set base to your repo name
// e.g. if your repo is https://github.com/username/imdf-floor-plan-builder
// then base should be '/imdf-floor-plan-builder/'
// For custom domain or Vercel/Netlify, use '/'
export default defineConfig({
  plugins: [react()],
  base: '/imdf-floor-plan-builder/',
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
