import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { defineConfig, type Plugin, type PluginOption } from 'vite';
import { visualizer } from 'rollup-plugin-visualizer';
import inviteEmployeeHandler from './api/invite-employee.js';
import resetEmployeePasswordHandler from './api/reset-employee-password.js';
import outboxSchedulerHandler from './api/outbox-scheduler.js';
import outboxDispatchHandler from './api/outbox-dispatch.js';
import emailNotificationStatusHandler from './api/email-notification-status.js';
import incomingLeadHandler from './api/incoming-lead.js';
import incomingLeadConfigHandler from './api/incoming-lead-config.js';
import stripeWebhookHandler from './api/_billing/stripe-webhook.js';
import stripeCheckoutHandler from './api/_billing/stripe-checkout.js';
import stripePortalHandler from './api/_billing/stripe-portal.js';
import connectorRegisterHandler from './api/_connector/routes/register.js';
import connectorHeartbeatHandler from './api/_connector/routes/heartbeat.js';
import connectorIngestHandler from './api/_connector/routes/ingest.js';
import connectorCommandsHandler from './api/_connector/routes/commands.js';
import connectorEnrollHandler from './api/_connector/routes/enroll.js';
import connectorStatusHandler from './api/_connector/routes/status.js';
import connectorMappingHandler from './api/_connector/routes/mapping.js';
import connectorCommandHandler from './api/_connector/routes/command.js';

function apiMiddlewarePlugin(): Plugin {
  return {
    name: 'api-middleware',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const handleRoute = (handler: any, preserveRawBody = false) => {
          let body = '';
          let tooLarge = false;
          req.on('data', (chunk: any) => {
            if (tooLarge) return;
            body += chunk.toString();
            if (Buffer.byteLength(body, 'utf8') > 512 * 1024) tooLarge = true;
          });
          req.on('end', async () => {
            try {
              if (tooLarge) {
                res.statusCode = 413;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ code: 'REQUEST_TOO_LARGE' }));
                return;
              }
              const parsedBody = body ? JSON.parse(body) : {};
              const customReq = {
                method: req.method,
                headers: req.headers,
                body: preserveRawBody ? body : parsedBody,
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

        if (req.url === '/api/invite-employee' && req.method === 'POST') {
          handleRoute(inviteEmployeeHandler);
          return;
        }

        if (req.url === '/api/reset-employee-password' && req.method === 'POST') {
          handleRoute(resetEmployeePasswordHandler);
          return;
        }

        if ((req.url === '/api/outbox-scheduler' || req.url?.startsWith('/api/outbox-scheduler')) && (req.method === 'POST' || req.method === 'GET')) {
          handleRoute(outboxSchedulerHandler);
          return;
        }

        if (req.url === '/api/outbox-dispatch' && req.method === 'POST') {
          handleRoute(outboxDispatchHandler);
          return;
        }

        if (req.url === '/api/email-notification-status' && req.method === 'GET') {
          handleRoute(emailNotificationStatusHandler);
          return;
        }

        if (req.url?.startsWith('/api/incoming-lead') && req.method === 'POST') {
          handleRoute(incomingLeadHandler);
          return;
        }

        if (req.url?.startsWith('/api/incoming-lead-config') && req.method === 'GET') {
          handleRoute(incomingLeadConfigHandler);
          return;
        }

        if (req.url === '/api/stripe-webhook' && req.method === 'POST') {
          handleRoute(stripeWebhookHandler, true);
          return;
        }

        if (req.url === '/api/stripe-checkout' && req.method === 'POST') {
          handleRoute(stripeCheckoutHandler);
          return;
        }

        if (req.url === '/api/stripe-portal' && req.method === 'POST') {
          handleRoute(stripePortalHandler);
          return;
        }

        const connectorRoutes: Record<string, any> = {
          '/api/connector/register': connectorRegisterHandler,
          '/api/connector/heartbeat': connectorHeartbeatHandler,
          '/api/connector/ingest': connectorIngestHandler,
          '/api/connector/commands': connectorCommandsHandler,
          '/api/connector/enroll': connectorEnrollHandler,
          '/api/connector/status': connectorStatusHandler,
          '/api/connector/mapping': connectorMappingHandler,
          '/api/connector/command': connectorCommandHandler,
        };
        const connectorHandler = req.url ? connectorRoutes[req.url] : undefined;
        if (connectorHandler && req.method === 'POST') {
          handleRoute(connectorHandler, true);
          return;
        }

        next();
      });
    }
  };
}

export default defineConfig(({ command, mode }) => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      apiMiddlewarePlugin(),
      ...(command === 'build' && mode === 'production'
        ? [visualizer({
          filename: path.resolve(import.meta.dirname, 'stats.html'),
          template: 'treemap',
          gzipSize: true,
          brotliSize: true,
        }) as PluginOption]
        : []),
    ],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, 'src'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
    build: {
      rolldownOptions: {
        output: {
          codeSplitting: {
            groups: [
              {
                name: 'react-vendor',
                test: /node_modules[\\/](?:react|react-dom|react-router-dom|scheduler)(?:[\\/]|$)/,
                priority: 30,
              },
              {
                name: 'ui-vendor',
                test: /node_modules[\\/](?:lucide-react|clsx|tailwind-merge)(?:[\\/]|$)/,
                priority: 20,
              },
              {
                name: 'charts-vendor',
                test: /node_modules[\\/](?:recharts|chart\.js|react-chartjs-2|d3-[^\\/]+|@visx[\\/])(?:[\\/]|$)/,
                priority: 10,
              },
            ],
          },
        },
      },
    },
  };
});
