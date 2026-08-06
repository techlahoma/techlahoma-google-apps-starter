import { defineConfig } from 'vite';

export default defineConfig({
  resolve: {
    preserveSymlinks: true,
  },
  build: {
    chunkSizeWarningLimit: 4000,
  },
});
