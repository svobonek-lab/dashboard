/**
 * Browser cache boundary for the active company workspace.
 *
 * This cache is only an offline UI convenience. It must never be treated as
 * an authorization boundary; Supabase/RLS remains the source of truth.
 */
const CACHE_VERSION = 'v2';
const DEMO_SCOPE = 'demo';

function safeScope(scope?: string | null): string {
  const value = String(scope || '').trim();
  return value || DEMO_SCOPE;
}

export function tenantCacheKey(name: string, organizationId?: string | null): string {
  const normalizedName = name.trim().replace(/[^a-zA-Z0-9_-]/g, '_');
  return `stavbacore:${CACHE_VERSION}:${safeScope(organizationId)}:${normalizedName}`;
}

export function readTenantCache<T>(name: string, organizationId?: string | null): T | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(tenantCacheKey(name, organizationId));
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function writeTenantCache<T>(name: string, value: T, organizationId?: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(tenantCacheKey(name, organizationId), JSON.stringify(value));
  } catch {
    // Private browsing and quota errors should never break CRM workflows.
  }
}

export function removeTenantCache(name: string, organizationId?: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(tenantCacheKey(name, organizationId));
  } catch {
    // Cache cleanup is best effort.
  }
}

export function clearTenantCaches(
  storage: Pick<Storage, 'length' | 'key' | 'removeItem'> | null = typeof window === 'undefined' ? null : window.localStorage,
): void {
  if (!storage) return;
  try {
    const keys = Array.from({ length: storage.length }, (_, index) => storage.key(index)).filter((key): key is string => key !== null);
    for (const key of keys) {
      const tenantCache = key.startsWith('stavbacore:');
      const legacyLeadCache = key.startsWith('leads_cache_') || key === 'demo_leads_cache' || key.startsWith('demo_leads_cache_');
      if (tenantCache || legacyLeadCache) storage.removeItem(key);
    }
  } catch {
    // Private browsing and storage errors must never interrupt sign-out.
  }
}

export const TENANT_CACHE_NAMES = {
  leads: 'leads',
  onboarding: 'onboarding',
} as const;
