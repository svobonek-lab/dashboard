import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, Plugin } from 'vite';
import analyzeWebsiteHandler from './api/analyze-website';
import inviteEmployeeHandler from './api/invite-employee';
import resetEmployeePasswordHandler from './api/reset-employee-password';
import outboxSchedulerHandler from './api/outbox-scheduler';
import outboxDispatchHandler from './api/outbox-dispatch';
import emailNotificationStatusHandler from './api/email-notification-status';
import incomingLeadHandler from './api/incoming-lead';
import incomingLeadConfigHandler from './api/incoming-lead-config';
import stripeWebhookHandler from './api/stripe-webhook';
import connectorRegisterHandler from './api/_connector/routes/register';
import connectorHeartbeatHandler from './api/_connector/routes/heartbeat';
import connectorIngestHandler from './api/_connector/routes/ingest';
import connectorCommandsHandler from './api/_connector/routes/commands';
import connectorEnrollHandler from './api/_connector/routes/enroll';
import connectorStatusHandler from './api/_connector/routes/status';
import connectorMappingHandler from './api/_connector/routes/mapping';
import connectorCommandHandler from './api/_connector/routes/command';

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
