import type { SupabaseClient, User } from '@supabase/supabase-js';

import { authorizePlatformRequest, recordPlatformAudit } from '../auth.js';
import { runPlatformHandler } from '../handler.js';
import { PlatformHttpError } from '../http.js';
import { hasOwnerLegalConsent, type OwnerLegalConsent } from '../../../src/shared/model/legalConsent.js';
import { normalizePublicOrigin } from '../../_shared/publicUrls.js';

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface PlatformCompanyOnboardingInput {
  name: string;
  slug: string;
  ownerName: string;
  ownerEmail: string;
  plan?: 'pilot';
  legalConsent: OwnerLegalConsent;
}

export interface PlatformCompanyOnboardingResult {
  companyId: string;
  inviteId: string;
  slug: string;
  invitationStatus: 'queued';
}

export interface PlatformCompanySummary {
  id: string;
  name: string;
  slug: string;
  active: boolean;
  onboarding_completed: boolean;
  created_at: string;
  member_count: number;
  plan: 'pilot' | 'starter' | 'growth' | 'pro' | 'not_configured';
  subscription_status: 'not_configured' | 'pilot' | 'trial' | 'active' | 'past_due' | 'canceled';
  integration_status: 'not_verified';
  invitation_status: 'not_sent' | 'queued' | 'sent' | 'failed' | 'review_required' | 'accepted';
  first_lead_at: string | null;
}

export async function listPlatformCompanies(service: SupabaseClient, actorUserId: string): Promise<PlatformCompanySummary[]> {
  const { data, error } = await service.rpc('app_platform_list_companies', { p_actor_user_id: actorUserId });
  if (error) throw new PlatformHttpError('COMPANY_DIRECTORY_UNAVAILABLE', 502);
  const rows = data || [];
  const ids = rows.map((row: any) => String(row.id || '')).filter(Boolean);
  const { data: planRows, error: planError } = ids.length
    ? await service.from('app_companies').select('id,plan').in('id', ids)
    : { data: [], error: null };
  if (planError) throw new PlatformHttpError('COMPANY_DIRECTORY_UNAVAILABLE', 502);
  const plans = new Map((planRows || []).map((row: any) => [String(row.id), String(row.plan || '')]));
  return rows.map((row: any) => ({
    id: String(row.id),
    name: String(row.name || ''),
    slug: String(row.slug || ''),
    active: row.active !== false,
    onboarding_completed: row.onboarding_completed === true,
    created_at: String(row.created_at || ''),
    member_count: Number.isFinite(Number(row.member_count)) ? Number(row.member_count) : 0,
    plan: ['pilot', 'starter', 'growth', 'pro'].includes(plans.get(String(row.id)) || '')
      ? plans.get(String(row.id)) as 'pilot' | 'starter' | 'growth' | 'pro'
      : 'not_configured',
    subscription_status: ['pilot', 'trial', 'active', 'past_due', 'canceled'].includes(row.subscription_status) ? row.subscription_status : 'not_configured',
    integration_status: 'not_verified' as const,
    invitation_status: ['queued', 'sent', 'failed', 'review_required', 'accepted'].includes(row.invitation_status) ? row.invitation_status : 'not_sent',
    first_lead_at: row.first_lead_at ? String(row.first_lead_at) : null,
  }));
}

export async function setPlatformBillingPlan(
  service: SupabaseClient,
  actorUserId: string,
  companyId: string,
  plan: string,
): Promise<{ companyId: string; plan: 'pilot' | 'starter' | 'growth' | 'pro' }> {
  if (!companyId) throw new PlatformHttpError('COMPANY_ID_REQUIRED', 400);
  if (!['pilot', 'starter', 'growth', 'pro'].includes(plan)) throw new PlatformHttpError('BILLING_PLAN_INVALID', 400);
  const { data, error } = await service.rpc('app_platform_set_billing_plan', {
    p_actor_user_id: actorUserId,
    p_company_id: companyId,
    p_plan: plan,
  });
  if (error) throw new PlatformHttpError('BILLING_PLAN_UPDATE_FAILED', 502);
  const row = readRpcRow(data);
  if (String(row?.company_id || '') !== companyId || String(row?.plan || '') !== plan) {
    throw new PlatformHttpError('BILLING_PLAN_UPDATE_FAILED', 502);
  }
  return { companyId, plan: plan as 'pilot' | 'starter' | 'growth' | 'pro' };
}

function readRpcRow(data: unknown): any {
  return Array.isArray(data) ? data[0] : data;
}

function normalizeInput(input: PlatformCompanyOnboardingInput): Required<PlatformCompanyOnboardingInput> {
  const normalized = {
    name: String(input?.name || '').trim().slice(0, 160),
    slug: String(input?.slug || '').trim().toLowerCase(),
    ownerName: String(input?.ownerName || '').trim().slice(0, 160),
    ownerEmail: String(input?.ownerEmail || '').trim().toLowerCase(),
    plan: 'pilot' as const,
    legalConsent: input?.legalConsent,
  };
  if (!hasOwnerLegalConsent(normalized.legalConsent)) throw new PlatformHttpError('LEGAL_CONSENT_REQUIRED', 400);
  if (normalized.name.length < 2) throw new PlatformHttpError('COMPANY_NAME_INVALID', 400);
  if (!SLUG_PATTERN.test(normalized.slug) || normalized.slug.length > 80) throw new PlatformHttpError('COMPANY_SLUG_INVALID', 400);
  if (normalized.ownerName.length < 2) throw new PlatformHttpError('COMPANY_OWNER_NAME_INVALID', 400);
  if (!EMAIL_PATTERN.test(normalized.ownerEmail) || normalized.ownerEmail.length > 254) throw new PlatformHttpError('COMPANY_OWNER_EMAIL_INVALID', 400);
  return normalized;
}

function assertInviteRedirect(appUrl: string): void {
  if (!normalizePublicOrigin(appUrl)) {
    throw new PlatformHttpError('COMPANY_INVITE_CONFIG_MISSING', 503);
  }
}

async function compensateFailedOnboarding(service: SupabaseClient, actorUserId: string, companyId: string, inviteId: string): Promise<void> {
  const { error } = await service.rpc('app_platform_cancel_company_onboarding', {
    p_actor_user_id: actorUserId, p_company_id: companyId, p_invite_id: inviteId,
  });
  if (error) throw new PlatformHttpError('COMPANY_ONBOARDING_ROLLBACK_FAILED', 503);
}

async function assertInvitationQueued(service: SupabaseClient, inviteId: string): Promise<void> {
  const { data, error } = await service.from('app_email_outbox').select('id,status,last_error')
    .eq('invite_id', inviteId).eq('notification_kind', 'auth_invite').maybeSingle();
  if (error || !data) throw new PlatformHttpError('COMPANY_INVITE_QUEUE_FAILED', 503);
  if (!['pending', 'retry', 'processing', 'sending'].includes(String(data.status))) {
    const reviewRequired = ['AUTH_INVITE_USER_REVIEW_REQUIRED', 'AUTH_INVITE_SCOPE_MISMATCH'].includes(String(data.last_error));
    throw new PlatformHttpError(reviewRequired ? 'COMPANY_INVITE_REVIEW_REQUIRED' : 'COMPANY_INVITE_QUEUE_FAILED', reviewRequired ? 409 : 503);
  }
}

async function findAuthUser(service: SupabaseClient, email: string): Promise<User | null> {
  const admin = service.auth?.admin;
  const listUsers = admin?.listUsers?.bind(admin);
  if (!listUsers) return null;
  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await listUsers({ page, perPage: 1000 });
    if (error) throw new PlatformHttpError('COMPANY_OWNER_LOOKUP_FAILED', 503);
    const match = (data?.users || []).find((user) => String(user.email || '').trim().toLowerCase() === email);
    if (match) return match;
    if ((data?.users || []).length < 1000) return null;
  }
  throw new PlatformHttpError('COMPANY_OWNER_LOOKUP_FAILED', 503);
}

export async function createPlatformCompanyOnboarding(
  service: SupabaseClient,
  actorUserId: string,
  input: PlatformCompanyOnboardingInput,
  appUrl: string,
): Promise<PlatformCompanyOnboardingResult> {
  assertInviteRedirect(appUrl);
  const value = normalizeInput(input);
  const existingAuthUser = await findAuthUser(service, value.ownerEmail);
  if (existingAuthUser) throw new PlatformHttpError('COMPANY_OWNER_ALREADY_REGISTERED', 409);
  const { data, error } = await service.rpc('app_platform_create_company_onboarding', {
    p_actor_user_id: actorUserId,
    p_name: value.name,
    p_slug: value.slug,
    p_owner_name: value.ownerName,
    p_owner_email: value.ownerEmail,
    p_plan: value.plan,
    p_terms_accepted_at: value.legalConsent.acceptedAt,
    p_dpa_accepted_at: value.legalConsent.acceptedAt,
  });
  if (error?.code === '23505') throw new PlatformHttpError('COMPANY_SLUG_EXISTS', 409);
  if (error) throw new PlatformHttpError('COMPANY_ONBOARDING_CREATE_FAILED', 502);
  const row = readRpcRow(data);
  const companyId = String(row?.company_id || '');
  const inviteId = String(row?.invite_id || '');
  if (!companyId || !inviteId) throw new PlatformHttpError('COMPANY_ONBOARDING_CREATE_FAILED', 502);

  try {
    await assertInvitationQueued(service, inviteId);
  } catch {
    await compensateFailedOnboarding(service, actorUserId, companyId, inviteId);
    throw new PlatformHttpError('COMPANY_INVITE_QUEUE_FAILED', 503);
  }
  return { companyId, inviteId, slug: String(row?.slug || value.slug), invitationStatus: 'queued' };
}

export async function getPlatformCompanyAction(
  service: SupabaseClient,
  actorUserId: string,
  companyId: string,
  action: 'public_form_link',
): Promise<{ publicFormPath: string }> {
  if (!companyId) throw new PlatformHttpError('COMPANY_ID_REQUIRED', 400);
  if (action !== 'public_form_link') throw new PlatformHttpError('COMPANY_ACTION_INVALID', 400);
  const { data, error } = await service.rpc('app_platform_get_public_form_link', {
    p_actor_user_id: actorUserId, p_company_id: companyId,
  });
  if (error) throw new PlatformHttpError('COMPANY_ACTION_FAILED', 502);
  const slug = String(readRpcRow(data)?.slug || '');
  if (!slug) throw new PlatformHttpError('COMPANY_ACTION_FAILED', 502);
  return { publicFormPath: `/inquiry?org=${encodeURIComponent(slug)}` };
}

export async function resendPlatformOwnerInvite(
  service: SupabaseClient,
  actorUserId: string,
  companyId: string,
  appUrl: string,
): Promise<{ invitationStatus: 'queued' }> {
  assertInviteRedirect(appUrl);
  if (!companyId) throw new PlatformHttpError('COMPANY_ID_REQUIRED', 400);
  const { data, error } = await service.rpc('app_platform_resend_owner_invite', {
    p_actor_user_id: actorUserId, p_company_id: companyId,
  });
  if (error) throw new PlatformHttpError('COMPANY_INVITE_RESEND_FAILED', 502);
  const row = readRpcRow(data);
  const inviteId = String(row?.invite_id || '');
  const ownerEmail = String(row?.owner_email || '').toLowerCase();
  if (!inviteId || !EMAIL_PATTERN.test(ownerEmail)) throw new PlatformHttpError('COMPANY_INVITE_RESEND_FAILED', 502);
  try {
    await assertInvitationQueued(service, inviteId);
  } catch (error) {
    if (error instanceof PlatformHttpError && error.code === 'COMPANY_INVITE_REVIEW_REQUIRED') throw error;
    await service.rpc('app_platform_cancel_owner_invite', {
      p_actor_user_id: actorUserId, p_company_id: companyId, p_invite_id: inviteId,
    });
    throw new PlatformHttpError('COMPANY_INVITE_QUEUE_FAILED', 503);
  }
  return { invitationStatus: 'queued' };
}

export default async function platformCompaniesHandler(request: any, response: any): Promise<void> {
  await runPlatformHandler(response, async () => {
    const { userId, service } = await authorizePlatformRequest(request);
    if (request.method === 'POST') {
      if (request.body?.action === 'public_form_link') {
        return getPlatformCompanyAction(service, userId, String(request.body?.companyId || ''), 'public_form_link');
      }
      if (request.body?.action === 'resend_owner_invite') {
        return resendPlatformOwnerInvite(service, userId, String(request.body?.companyId || ''), String(process.env.PUBLIC_APP_URL || ''));
      }
      if (request.body?.action === 'set_billing_plan') {
        return setPlatformBillingPlan(service, userId, String(request.body?.companyId || ''), String(request.body?.plan || ''));
      }
      if (request.body?.action) throw new PlatformHttpError('COMPANY_ACTION_INVALID', 400);
      return { company: await createPlatformCompanyOnboarding(service, userId, request.body, String(process.env.PUBLIC_APP_URL || '')) };
    }
    if (request.method !== 'GET') throw new PlatformHttpError('METHOD_NOT_ALLOWED', 405);
    const companies = await listPlatformCompanies(service, userId);
    await recordPlatformAudit(service, {
      actorUserId: userId,
      action: 'company_directory.viewed',
      reasonCode: 'platform_api_request',
    });
    return { companies };
  });
}
