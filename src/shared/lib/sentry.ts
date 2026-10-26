import * as Sentry from '@sentry/react';

const WORKSPACE_ROLES = new Set(['owner', 'employee', 'platform_admin']);
const COMPANY_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function getSentryWorkspaceTags(identity: { companyId?: string | null; role?: string | null }): { company_id: string; role: string } {
  const companyId = typeof identity.companyId === 'string' && COMPANY_ID_PATTERN.test(identity.companyId)
    ? identity.companyId
    : '';
  const role = typeof identity.role === 'string' && WORKSPACE_ROLES.has(identity.role)
    ? identity.role
    : '';
  return { company_id: companyId, role };
}

export function setSentryWorkspaceContext(identity: { companyId?: string | null; role?: string | null }): void {
  const meta = import.meta as any;
  if (!meta.env?.VITE_SENTRY_DSN) return;

  const tags = getSentryWorkspaceTags(identity);
  Sentry.setTag('company_id', tags.company_id);
  Sentry.setTag('role', tags.role);
}

export function initSentry() {
  const meta = import.meta as any;
  const dsn = meta.env?.VITE_SENTRY_DSN;

  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: meta.env?.MODE,
    integrations: [
      Sentry.browserTracingIntegration(),
    ],
    tracesSampleRate: meta.env?.PROD ? 0.2 : 1.0,
  });
  
  console.log('Sentry úspěšně inicializováno.');
}
