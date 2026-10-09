import { supabase } from '@/lib/supabase';

export interface PlatformCompany {
  id: string;
  name: string;
  slug: string;
  active: boolean;
  onboarding_completed: boolean;
  created_at: string;
  member_count: number;
  subscription_status: 'not_configured' | 'trial' | 'active' | 'past_due' | 'cancelled';
  integration_status: 'not_verified';
}

export interface PlatformSupportSession {
  id: string;
  company_id: string;
  company_name?: string;
  member_count?: number;
  subscription_status?: string;
  access_mode: 'read_only';
  created_at: string;
  expires_at: string;
}

async function platformRequest<T>(route: 'session' | 'companies' | 'support-session', options: RequestInit = {}): Promise<T> {
  if (!supabase) throw new Error('Správa platformy není v tomto prostředí dostupná.');
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('Přihlášení správce vypršelo. Přihlaste se znovu.');
  const response = await fetch(`/api/platform/${route}`, {
    method: options.method || 'GET',
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers, Authorization: `Bearer ${token}` },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.code || 'Správa platformy není dostupná.');
  return payload as T;
}

export async function getPlatformSession(): Promise<{ role: 'platform_admin'; active: true }> {
  return platformRequest('session');
}

export async function listPlatformCompanies(): Promise<PlatformCompany[]> {
  const payload = await platformRequest<{ companies?: PlatformCompany[] }>('companies');
  return Array.isArray(payload.companies) ? payload.companies : [];
}

export async function createPlatformSupportSession(companyId: string, reason: string): Promise<PlatformSupportSession> {
  const payload = await platformRequest<{ session: PlatformSupportSession }>('support-session', { method: 'POST', body: JSON.stringify({ companyId, reason }) });
  return payload.session;
}

export async function getPlatformSupportSession(sessionId: string): Promise<PlatformSupportSession> {
  const payload = await platformRequest<{ session: PlatformSupportSession }>('support-session', { headers: { 'X-Support-Session': sessionId } });
  return payload.session;
}

export async function revokePlatformSupportSession(sessionId: string): Promise<void> {
  await platformRequest('support-session', { method: 'DELETE', headers: { 'X-Support-Session': sessionId } });
}
