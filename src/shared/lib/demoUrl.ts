import { normalizePublicOrigin } from './publicUrls';

export interface DemoRuntime {
  isDevelopment: boolean;
  origin: string;
  allowRelative: boolean;
}

export interface DemoDestination {
  url: string | null;
  error: string | null;
}

const PUBLIC_DEMO_PATHS = new Set(['/demo', '/interaktivni-demo']);

export function isPublicDemoPath(pathname: string): boolean {
  const normalized = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  return PUBLIC_DEMO_PATHS.has(normalized) || normalized.startsWith('/demo/');
}

export function resolveDemoUrl(env: Record<string, unknown>, runtime: DemoRuntime): DemoDestination {
  const app = String(env.PUBLIC_APP_URL || '').trim();
  if (app) {
    const origin = normalizePublicOrigin(app, runtime.isDevelopment);
    if (!origin) {
      return { url: null, error: 'Odkaz na demo nelze odvodit z adresy aplikace.' };
    }
    return { url: `${origin}/demo`, error: null };
  }

  if (runtime.allowRelative) return { url: '/demo', error: null };
  return { url: null, error: 'Odkaz na demo není pro prodejní web nastavený.' };
}
