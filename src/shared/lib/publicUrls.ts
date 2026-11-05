export function normalizePublicOrigin(raw: unknown, allowLocalhost = false): string {
  const value = String(raw || '').trim();
  if (!value || value.startsWith('//')) return '';
  try {
    const url = new URL(value);
    const local = url.hostname === 'localhost' || url.hostname === '127.0.0.1' || url.hostname === '[::1]';
    if (url.username || url.password || url.search || url.hash || (url.pathname !== '/' && url.pathname !== '')) return '';
    if (url.protocol !== 'https:' && !(allowLocalhost && local && url.protocol === 'http:')) return '';
    return url.origin;
  } catch {
    return '';
  }
}

export function buildPublicAppPath(rawOrigin: unknown, path: string, allowLocalhost = false): string {
  if (!path.startsWith('/') || path.startsWith('//')) return '/';
  const origin = normalizePublicOrigin(rawOrigin, allowLocalhost);
  return origin ? new URL(path, origin).toString() : path;
}
