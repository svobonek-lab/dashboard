const LEGACY_TOKEN_FALLBACK = 'synology-nas-bearer-token';

export function getConfiguredSynologyToken(token?: string | null): string | undefined {
  const normalizedToken = token?.trim();
  if (!normalizedToken || normalizedToken === LEGACY_TOKEN_FALLBACK) return undefined;
  return normalizedToken;
}
