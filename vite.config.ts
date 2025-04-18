import { defineConfig } from 'vite';

export default defineConfig({
  base: '',
  server: {
    host: 'localhost',
    port: 5173,
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