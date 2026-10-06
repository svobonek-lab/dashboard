import { supabase } from '@/lib/supabase';

export interface PlatformCompany {
  id: string;
  name: string;
  slug: string;
  active: boolean;
  onboarding_completed: boolean;
  created_at: string;
  integration_status: 'not_verified';
}

async function platformGet<T>(route: 'session' | 'companies'): Promise<T> {
  if (!supabase) throw new Error('Správa platformy není v tomto prostředí dostupná.');
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('Přihlášení správce vypršelo. Přihlaste se znovu.');
  const response = await fetch(`/api/platform/${route}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.code || 'Správa platformy není dostupná.');
  return payload as T;
}

export async function getPlatformSession(): Promise<{ role: 'platform_admin'; active: true }> {
  return platformGet('session');
}

export async function listPlatformCompanies(): Promise<PlatformCompany[]> {
  const payload = await platformGet<{ companies?: PlatformCompany[] }>('companies');
  return Array.isArray(payload.companies) ? payload.companies : [];
}
