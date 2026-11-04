const PUBLIC_ROUTES = new Set([
  '/', '/landing', '/prezentace', '/login', '/unauthorized', '/register-paid',
  '/widget-iframe', '/widget-iframe.html', '/inquiry', '/poptavka', '/form', '/portal',
]);

const APP_ROUTES = new Set([
  ...PUBLIC_ROUTES,
  '/owner/login', '/employee/login', '/admin/login',
  '/admin', '/admin/dashboard', '/admin/companies',
  '/employee', '/employee/dashboard', '/employee/jobs', '/employee/photos',
  '/billing/return',
  '/dashboard', '/leads', '/projects', '/employees', '/widget', '/integrations', '/settings',
  '/calendar', '/analytics', '/quotes', '/documents', '/communication', '/integrations/synology',
]);

function normalizePath(pathname: string): string {
  return pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
}

export function isPublicAppPath(pathname: string): boolean {
  const path = normalizePath(pathname);
  return PUBLIC_ROUTES.has(path)
    || path.startsWith('/inquiry/')
    || path.startsWith('/form/')
    || path.startsWith('/portal/');
}

export function shouldRedirectProtectedRoute(
  pathname: string,
  isConfigured: boolean,
  hasUser: boolean,
  hasResolvedMembership: boolean,
): boolean {
  return !isPublicAppPath(pathname) && (!isConfigured || !hasUser || !hasResolvedMembership);
}

export function isKnownAppPath(pathname: string): boolean {
  const path = normalizePath(pathname);
  return APP_ROUTES.has(path)
    || /^\/inquiry\/[^/]+$/.test(path)
    || /^\/form\/[^/]+$/.test(path)
    || /^\/portal\/.*$/.test(path)
    || /^\/support\/[^/]+(?:\/(?:dashboard|leads|projects))?$/.test(path);
}
