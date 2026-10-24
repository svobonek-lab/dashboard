export function resolvePublicTenantKey(search: string, pathname: string): string {
  const queryKey = new URLSearchParams(search).get('org')?.trim();
  if (queryKey) return queryKey;
  const match = pathname.match(/^\/(?:form|inquiry)\/([^/?#]+)\/?$/i);
  if (!match) return '';
  try {
    return decodeURIComponent(match[1]).trim();
  } catch {
    return '';
  }
}
