import { defineConfig } from 'vite';

export default defineConfig({
  base: '/BrowserGame/',
  server: {
    host: 'localhost',
    port: 3000,
    strictPort: true,
    open: true
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    emptyOutDir: true,
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
  },
}); 