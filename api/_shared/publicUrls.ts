export type PublicUrlEnvironment = Record<string, unknown>;

export function normalizePublicOrigin(raw: unknown, allowLocalhost = false): string | null {
  const value = String(raw || '').trim();
  if (!value || value.startsWith('//')) return null;
  try {
    const url = new URL(value);
    const local = url.hostname === 'localhost' || url.hostname === '127.0.0.1' || url.hostname === '[::1]';
    if (url.username || url.password || url.search || url.hash || (url.pathname !== '/' && url.pathname !== '')) return null;
    if (/vercel\.app$/i.test(url.hostname)) return null;
    if (url.protocol !== 'https:' && !(allowLocalhost && local && url.protocol === 'http:')) return null;
    return url.origin;
  } catch {
    return null;
  }
}

export function getPublicAppUrl(environment: PublicUrlEnvironment = process.env): string | null {
  return normalizePublicOrigin(environment.PUBLIC_APP_URL, environment.NODE_ENV !== 'production');
}

export function getPublicLandingUrl(environment: PublicUrlEnvironment = process.env): string | null {
  return normalizePublicOrigin(environment.PUBLIC_LANDING_URL, environment.NODE_ENV !== 'production');
}

export function buildPublicAppUrl(path: string, environment: PublicUrlEnvironment = process.env): string | null {
  const origin = getPublicAppUrl(environment);
  if (!origin || !path.startsWith('/') || path.startsWith('//')) return null;
  return new URL(path, origin).toString();
}

export function replaceEmailAppOrigins(html: string, publicAppUrl: string | null): string {
  const needsAppOrigin = html.includes('{{PUBLIC_APP_URL}}') || /https?:\/\/[^\s"'<>)]*\.vercel\.app/i.test(html);
  if (!needsAppOrigin) return html;
  if (!publicAppUrl) throw new Error('PUBLIC_APP_URL_NOT_CONFIGURED');
  return html
    .replaceAll('{{PUBLIC_APP_URL}}', publicAppUrl)
    .replace(/https?:\/\/[^\s"'<>)]*\.vercel\.app/gi, publicAppUrl);
}
