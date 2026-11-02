import { defineConfig } from 'vite';
export default defineConfig({
  server: {
    port: 5174,
    strictPort: true,
    proxy: { '/v1': { target: process.env['VITE_API_PROXY'] ?? 'http://127.0.0.1:3000' } },
  },
  build: { sourcemap: true },
});
