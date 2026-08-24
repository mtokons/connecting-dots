import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// COOP/COEP headers are required for `SharedArrayBuffer` so that
// ffmpeg.wasm can load the multi-threaded core used by the Post-Production
// editor. They have no effect on routes that don't use it.
const setIsolationHeaders = (_req: any, res: any, next: any) => {
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
  next();
};

const crossOriginIsolation = {
  name: 'cross-origin-isolation',
  configureServer(server: any) {
    server.middlewares.use(setIsolationHeaders);
  },
  configurePreviewServer(server: any) {
    server.middlewares.use(setIsolationHeaders);
  },
};

export default defineConfig({
  plugins: [react(), crossOriginIsolation],
  optimizeDeps: {
    exclude: ['@ffmpeg/ffmpeg', '@ffmpeg/util'],
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});
