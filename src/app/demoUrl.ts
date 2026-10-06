export interface DemoRuntime {
  isDevelopment: boolean;
  origin: string;
  allowRelative: boolean;
}

export interface DemoDestination {
  url: string | null;
  error: string | null;
}

function safeAbsoluteUrl(raw: string, isDevelopment: boolean): URL | null {
  if (!raw || raw.startsWith('//')) return null;
  try {
    const url = new URL(raw);
    const local = url.hostname === 'localhost' || url.hostname === '127.0.0.1' || url.hostname === '[::1]';
    if (url.protocol !== 'https:' && !(isDevelopment && local && url.protocol === 'http:')) return null;
    if (url.username || url.password || url.search || url.hash) return null;
    return url;
  } catch {
    return null;
  }
}

export function resolveDemoUrl(env: Record<string, unknown>, runtime: DemoRuntime): DemoDestination {
  const explicit = String(env.VITE_DEMO_URL || '').trim();
  if (explicit) {
    const url = safeAbsoluteUrl(explicit, runtime.isDevelopment);
    if (!url) return { url: null, error: 'Odkaz na demo není bezpečně nakonfigurovaný.' };
    const normalizedPath = url.pathname === '/' ? '' : url.pathname.replace(/\/+$/, '');
    return { url: `${url.origin}${normalizedPath}`, error: null };
  }

  const app = String(env.VITE_APP_URL || '').trim();
  if (app) {
    const url = safeAbsoluteUrl(app, runtime.isDevelopment);
    if (!url || (url.pathname !== '/' && url.pathname !== '')) {
      return { url: null, error: 'Odkaz na demo nelze odvodit z adresy aplikace.' };
    }
    return { url: `${url.origin}/demo`, error: null };
  }

  if (runtime.allowRelative) return { url: '/demo', error: null };
  return { url: null, error: 'Odkaz na demo není pro prodejní web nastavený.' };
}
