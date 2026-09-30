export type DeploymentSurface = 'unified' | 'landing' | 'app';

export interface DeploymentConfig {
  surface: DeploymentSurface;
  appUrl: string;
}

export function getDeploymentConfig(env: Record<string, unknown> = {}): DeploymentConfig {
  const hostname = typeof window !== 'undefined' ? window.location.hostname.toLowerCase() : '';
  const hostnameSurface = hostname.startsWith('jobflow-pro')
    ? 'landing'
    : hostname.startsWith('dashboard')
      ? 'app'
      : '';
  const rawSurface = String(env.VITE_DEPLOYMENT_SURFACE || hostnameSurface || 'unified').toLowerCase();
  const surface: DeploymentSurface = rawSurface === 'landing' || rawSurface === 'app' ? rawSurface : 'unified';
  const appUrl = String(env.VITE_APP_URL || '').trim().replace(/\/$/, '');
  return { surface, appUrl };
}

export function buildAppLoginUrl(appUrl: string, search = ''): string {
  const normalized = appUrl.trim().replace(/\/$/, '');
  if (!normalized) return '/login';
  return `${normalized}/login${search.startsWith('?') ? search : search ? `?${search}` : ''}`;
}
