import companies from '../_platform/routes/companies.js';
import session from '../_platform/routes/session.js';

type Handler = (request: any, response: any) => Promise<void>;

const routes: Readonly<Record<string, Handler>> = Object.freeze({ companies, session });

export function resolvePlatformRoute(value: unknown): Handler | undefined {
  if (typeof value !== 'string') return undefined;
  return Object.prototype.hasOwnProperty.call(routes, value) ? routes[value] : undefined;
}

export default async function platformRouter(request: any, response: any): Promise<void> {
  const handler = resolvePlatformRoute(request.query?.route);
  if (!handler) {
    response.status(404).json({ code: 'NOT_FOUND' });
    return;
  }
  await handler(request, response);
}
