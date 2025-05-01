import { defineConfig } from 'vite';

export default defineConfig({
  base: process.env.NODE_ENV === 'production' ? '/browser-game/' : '/',
  server: {
    host: true,
    port: 3000,
    strictPort: true,
    open: true
  },
  build: {
    assetsDir: 'assets',
    outDir: 'dist',
    emptyOutDir: true,
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
  },
}); 