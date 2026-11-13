import { buildPublicAppPath, normalizePublicOrigin } from '../shared/lib/publicUrls';

export type DeploymentSurface = 'unified' | 'landing' | 'app';

export interface DeploymentConfig {
  surface: DeploymentSurface;
  appUrl: string;
  landingUrl: string;
}

export function getDeploymentConfig(env: Record<string, unknown> = {}): DeploymentConfig {
  const hostname = typeof window !== 'undefined' ? window.location.hostname.toLowerCase() : '';
  const hostnameSurface = hostname.startsWith('jobflow-pro') || hostname.startsWith('stavbaflow-landing')
    ? 'landing'
    : hostname.startsWith('dashboard') || hostname.startsWith('stavbaflow')
      ? 'app'
      : '';
  const rawSurface = String(env.VITE_DEPLOYMENT_SURFACE || hostnameSurface || 'unified').toLowerCase();
  const surface: DeploymentSurface = rawSurface === 'landing' || rawSurface === 'app' ? rawSurface : 'unified';
  const appUrl = normalizePublicOrigin(env.PUBLIC_APP_URL, Boolean(env.DEV));
  const landingUrl = normalizePublicOrigin(env.PUBLIC_LANDING_URL, Boolean(env.DEV));
  return { surface, appUrl, landingUrl };
}

export function buildAppLoginUrl(appUrl: string, search = '', allowLocalhost = false): string {
  const normalized = normalizePublicOrigin(appUrl, allowLocalhost);
  if (!normalized) return '/login';
  return `${normalized}/login${search.startsWith('?') ? search : search ? `?${search}` : ''}`;
}

export function getLandingLoginUrl(appUrl: string, search = '', allowLocalhost = false): string | null {
  const origin = normalizePublicOrigin(appUrl, allowLocalhost);
  return origin ? buildAppLoginUrl(origin, search, allowLocalhost) : null;
}

export function buildAppRouteUrl(appUrl: string, path: string, allowLocalhost = false): string {
  return buildPublicAppPath(appUrl, path, allowLocalhost);
}

export function shouldShowLandingAtRoot(surface: DeploymentSurface): boolean {
  return surface === 'landing';
}
