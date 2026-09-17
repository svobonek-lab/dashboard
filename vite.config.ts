import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, Plugin } from 'vite';
import analyzeWebsiteHandler from './api/analyze-website';
import testSqlHandler from './api/test-sql';
import inviteEmployeeHandler from './api/invite-employee';
import resetEmployeePasswordHandler from './api/reset-employee-password';

function apiMiddlewarePlugin(): Plugin {
  return {
    name: 'api-middleware',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const handleRoute = (handler: any) => {
          let body = '';
          req.on('data', (chunk: any) => {
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
              await handler(customReq, customRes);
            } catch (parseErr: any) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: parseErr.message }));
            }
          });
        };

        if (req.url === '/api/test-sql' && req.method === 'POST') {
          handleRoute(testSqlHandler);
          return;
        }

        if (req.url === '/api/analyze-website' && req.method === 'POST') {
          handleRoute(analyzeWebsiteHandler);
          return;
        }

        if (req.url === '/api/invite-employee' && req.method === 'POST') {
          handleRoute(inviteEmployeeHandler);
          return;
        }

        if (req.url === '/api/reset-employee-password' && req.method === 'POST') {
          handleRoute(resetEmployeePasswordHandler);
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
