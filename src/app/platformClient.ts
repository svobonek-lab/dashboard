import { supabase } from '@/lib/supabase';
import type { AppCompanyRow } from './appSchemaIdentity';
import type { AppLeadRow, AppMemberRow } from './productionSchema';
import { createSupportLeadMutator } from './supportMutationRetry';

export interface PlatformCompany {
  id: string;
  name: string;
  slug: string;
  active: boolean;
  onboarding_completed: boolean;
  created_at: string;
  member_count: number;
  plan: 'pilot' | 'starter' | 'growth' | 'not_configured';
  subscription_status: 'not_configured' | 'pilot' | 'trial' | 'active' | 'past_due' | 'canceled';
  integration_status: 'not_verified';
  invitation_status: 'not_sent' | 'sent' | 'accepted';
  first_lead_at: string | null;
}

export interface NewPlatformCompany {
  name: string;
  slug: string;
  ownerName: string;
  ownerEmail: string;
  plan: 'pilot';
}

export interface PlatformSupportSession {
  id: string;
  company_id: string;
  company_name?: string;
  member_count?: number;
  subscription_status?: string;
  access_mode: 'full_support';
  created_at: string;
  expires_at: string;
}

export interface PlatformSupportWorkspace {
  company: AppCompanyRow;
  leads: AppLeadRow[];
  members: AppMemberRow[];
}

async function platformRequest<T>(route: 'session' | 'companies' | 'support-session' | 'support-workspace', options: RequestInit = {}): Promise<T> {
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
  if (!response.ok) {
    const messages: Record<string, string> = {
      COMPANY_SLUG_EXISTS: 'Tento identifikátor firmy už používá jiná firma.',
      COMPANY_SLUG_INVALID: 'Identifikátor může obsahovat jen malá písmena, čísla a spojovníky.',
      COMPANY_OWNER_ALREADY_REGISTERED: 'Tento e-mail už má účet. Pro nového vlastníka použijte dosud neregistrovaný e-mail.',
      COMPANY_INVITE_SEND_FAILED: 'Firmu se nepodařilo vytvořit, protože pozvánka nebyla doručena. Změny byly vráceny zpět.',
      COMPANY_INVITE_DELIVERY_UNAVAILABLE: 'E-mailovou pozvánku nelze odeslat. Ověřte vlastní SMTP v Supabase; firma nebyla aktivována.',
      PLATFORM_ACCESS_DENIED: 'Tuto akci může provést pouze správce platformy.',
    };
    throw new Error(messages[payload?.code] || 'Správa platformy není dostupná. Zkuste akci zopakovat.');
  }
  return payload as T;
}

export async function getPlatformSession(): Promise<{ role: 'platform_admin'; active: true }> {
  return platformRequest('session');
}

export async function listPlatformCompanies(): Promise<PlatformCompany[]> {
  const payload = await platformRequest<{ companies?: PlatformCompany[] }>('companies');
  return Array.isArray(payload.companies) ? payload.companies : [];
}

export async function createPlatformCompany(input: NewPlatformCompany): Promise<void> {
  await platformRequest('companies', { method: 'POST', body: JSON.stringify(input) });
}

export async function resendPlatformOwnerInvite(companyId: string): Promise<void> {
  await platformRequest('companies', { method: 'POST', body: JSON.stringify({ action: 'resend_owner_invite', companyId }) });
}

export async function getPlatformPublicFormLink(companyId: string): Promise<string> {
  const result = await platformRequest<{ publicFormPath: string }>('companies', {
    method: 'POST', body: JSON.stringify({ action: 'public_form_link', companyId }),
  });
  return new URL(result.publicFormPath, window.location.origin).toString();
}

export async function setPlatformCompanyBillingPlan(companyId: string, plan: 'pilot' | 'starter' | 'growth'): Promise<void> {
  await platformRequest('companies', {
    method: 'POST', body: JSON.stringify({ action: 'set_billing_plan', companyId, plan }),
  });
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

export async function getPlatformSupportWorkspace(sessionId: string): Promise<PlatformSupportWorkspace> {
  const payload = await platformRequest<{ workspace: PlatformSupportWorkspace }>('support-workspace', { headers: { 'X-Support-Session': sessionId } });
  return payload.workspace;
}

export const mutatePlatformSupportLead = createSupportLeadMutator<AppLeadRow>(async ({ sessionId, action, payload, leadId, requestId }) => {
  const result = await platformRequest<{ lead: AppLeadRow }>('support-workspace', {
    method: 'POST', headers: { 'X-Support-Session': sessionId },
    body: JSON.stringify({ action, requestId, leadId, payload }),
  });
  return result.lead;
});
