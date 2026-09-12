import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, Plugin } from 'vite';
import analyzeWebsiteHandler from './api/analyze-website';

function apiMiddlewarePlugin(): Plugin {
  return {
    name: 'api-middleware',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url === '/api/analyze-website' && req.method === 'POST') {
          try {
            let body = '';
            req.on('data', chunk => {
              body += chunk.toString();
            });
            req.on('end', async () => {
              try {
                const parsedBody = body ? JSON.parse(body) : {};
                const customReq = {
                  method: req.method,
                  body: parsedBody,
                  url: req.url
                };
                const customRes = {
                  setHeader: (key: string, val: any) => res.setHeader(key, val),
                  status: (code: number) => {
                    res.statusCode = code;
                    return {
                      json: (data: any) => {
                        res.setHeader('Content-Type', 'application/json');
                        res.end(JSON.stringify(data));
                      }
                    };
                  }
                };
                await analyzeWebsiteHandler(customReq, customRes);
              } catch (parseErr: any) {
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: parseErr.message }));
              }
            });
          } catch (e: any) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: e.message }));
          }
          return;
        }
        next();
      });
    }
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), apiMiddlewarePlugin()],
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
