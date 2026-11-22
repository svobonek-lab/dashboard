import * as Sentry from '@sentry/react';

const WORKSPACE_ROLES = new Set(['owner', 'employee', 'platform_admin']);
const COMPANY_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const STAGING_SUPABASE_ORIGIN = 'https://xwzweltjvreqhjpbjrxa.supabase.co';

export function resolveSentryEnvironment(mode: string, requested: string | undefined, supabaseUrl: string | undefined): string {
  return requested === 'staging' && supabaseUrl === STAGING_SUPABASE_ORIGIN ? 'staging' : mode;
}

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
  if (!import.meta.env.VITE_SENTRY_DSN) return;

  const tags = getSentryWorkspaceTags(identity);
  Sentry.setTag('company_id', tags.company_id);
  Sentry.setTag('role', tags.role);
}

export function initSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN;

  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: resolveSentryEnvironment(import.meta.env.MODE, import.meta.env.VITE_SENTRY_ENVIRONMENT, import.meta.env.VITE_SUPABASE_URL),
    integrations: [
      Sentry.browserTracingIntegration(),
    ],
    tracesSampleRate: import.meta.env.PROD ? 0.2 : 1.0,
  });
  
  console.log('Sentry úspěšně inicializováno.');
}
