import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteStaticCopy } from 'vite-plugin-static-copy';

// For GitHub Pages: set base to your repo name
// e.g. if your repo is https://github.com/username/imdf-floor-plan-builder
// then base should be '/imdf-floor-plan-builder/'
// For custom domain or Vercel/Netlify, use '/'
export default defineConfig({
  plugins: [
    react(),
    viteStaticCopy({
      targets: [
        { src: 'node_modules/tesseract.js/dist/worker.min.js', dest: 'ocr', rename: { stripBase: true } },
        { src: 'node_modules/tesseract.js-core/tesseract-core*-lstm.wasm.js', dest: 'ocr', rename: { stripBase: true } },
        { src: 'node_modules/@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz', dest: 'ocr', rename: { stripBase: true } },
      ],
    }),
  ],
  base: '/imdf-floor-plan-builder/',
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
