import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  root: 'client',
  plugins: [react()],
  build: {
    outDir: '../public/app-build',
    emptyOutDir: true,
    rollupOptions: {
      output: { entryFileNames: 'assets/index.js', chunkFileNames: 'assets/[name].js', assetFileNames: 'assets/[name][extname]' },
    },
  },
  server: {
    port: 5173,
    proxy: { '/api': 'http://localhost:3000', '/download': 'http://localhost:3000' },
  },
});
