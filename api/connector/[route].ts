import command from '../_connector/routes/command.js';
import commands from '../_connector/routes/commands.js';
import enroll from '../_connector/routes/enroll.js';
import heartbeat from '../_connector/routes/heartbeat.js';
import ingest from '../_connector/routes/ingest.js';
import mapping from '../_connector/routes/mapping.js';
import operations from '../_connector/routes/operations.js';
import register from '../_connector/routes/register.js';
import status from '../_connector/routes/status.js';

type Handler = (request: any, response: any) => Promise<void>;

const routes: Readonly<Record<string, Handler>> = Object.freeze({
  command,
  commands,
  enroll,
  heartbeat,
  ingest,
  mapping,
  operations,
  register,
  status,
});

export function resolveConnectorRoute(value: unknown): Handler | undefined {
  if (typeof value !== 'string') return undefined;
  return Object.prototype.hasOwnProperty.call(routes, value) ? routes[value] : undefined;
}

export default async function connectorRouter(request: any, response: any): Promise<void> {
  const handler = resolveConnectorRoute(request.query?.route);
  if (!handler) {
    response.status(404).json({ code: 'NOT_FOUND' });
    return;
  }
  await handler(request, response);
}
