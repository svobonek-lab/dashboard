export const PILOT_OWNER_ROUTES = new Set([
  '/dashboard',
  '/sales',
  '/leads',
  '/inquiry',
  '/projects',
  '/employees',
  '/widget',
  '/integrations',
  '/settings',
]);

export const PILOT_UNAVAILABLE_ROUTES = new Set([
  '/calendar',
  '/analytics',
  '/quotes',
  '/documents',
  '/communication',
  '/integrations/synology',
  '/portal',
]);

export function isPilotOwnerNavigationPath(path: string): boolean {
  return PILOT_OWNER_ROUTES.has(path.split('?')[0]);
}

export function isPilotUnavailablePath(path: string): boolean {
  return PILOT_UNAVAILABLE_ROUTES.has(path);
}
