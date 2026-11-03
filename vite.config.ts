import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { createRequire } from 'module';
import path from 'path';
import { defineConfig } from 'vite';

const require = createRequire(import.meta.url);

function expressApiMiddlewarePlugin() {
  return {
    name: 'express-api-middleware',
    configureServer(server: any) {
      try {
        const expressApp = require('./src/server.js');
        server.middlewares.use((req: any, res: any, next: any) => {
          if (req.url && req.url.startsWith('/api')) {
            return expressApp(req, res, next);
          }
          next();
        });
      } catch (e) {
        console.error('Erro ao montar Express API no Vite:', e);
      }
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [expressApiMiddlewarePlugin(), react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
