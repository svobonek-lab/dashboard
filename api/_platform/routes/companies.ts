import type { SupabaseClient, User } from '@supabase/supabase-js';

import { authorizePlatformRequest, recordPlatformAudit } from '../auth.js';
import { runPlatformHandler } from '../handler.js';
import { PlatformHttpError } from '../http.js';

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface PlatformCompanyOnboardingInput {
  name: string;
  slug: string;
  ownerName: string;
  ownerEmail: string;
  plan?: 'pilot';
}

export interface PlatformCompanyOnboardingResult {
  companyId: string;
  inviteId: string;
  slug: string;
  invitationStatus: 'sent';
}

export interface PlatformCompanySummary {
  id: string;
  name: string;
  slug: string;
  active: boolean;
  onboarding_completed: boolean;
  created_at: string;
  member_count: number;
  subscription_status: 'not_configured' | 'pilot' | 'trial' | 'active' | 'past_due' | 'cancelled';
  integration_status: 'not_verified';
  invitation_status: 'not_sent' | 'sent' | 'accepted';
  first_lead_at: string | null;
}

export async function listPlatformCompanies(service: SupabaseClient, actorUserId: string): Promise<PlatformCompanySummary[]> {
  const { data, error } = await service.rpc('app_platform_list_companies', { p_actor_user_id: actorUserId });
  if (error) throw new PlatformHttpError('COMPANY_DIRECTORY_UNAVAILABLE', 502);
  return (data || []).map((row: any) => ({
    id: String(row.id),
    name: String(row.name || ''),
    slug: String(row.slug || ''),
    active: row.active !== false,
    onboarding_completed: row.onboarding_completed === true,
    created_at: String(row.created_at || ''),
    member_count: Number.isFinite(Number(row.member_count)) ? Number(row.member_count) : 0,
    subscription_status: ['pilot', 'trial', 'active', 'past_due', 'cancelled'].includes(row.subscription_status) ? row.subscription_status : 'not_configured',
    integration_status: 'not_verified' as const,
    invitation_status: ['sent', 'accepted'].includes(row.invitation_status) ? row.invitation_status : 'not_sent',
    first_lead_at: row.first_lead_at ? String(row.first_lead_at) : null,
  }));
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
  };
  if (normalized.name.length < 2) throw new PlatformHttpError('COMPANY_NAME_INVALID', 400);
  if (!SLUG_PATTERN.test(normalized.slug) || normalized.slug.length > 80) throw new PlatformHttpError('COMPANY_SLUG_INVALID', 400);
  if (normalized.ownerName.length < 2) throw new PlatformHttpError('COMPANY_OWNER_NAME_INVALID', 400);
  if (!EMAIL_PATTERN.test(normalized.ownerEmail) || normalized.ownerEmail.length > 254) throw new PlatformHttpError('COMPANY_OWNER_EMAIL_INVALID', 400);
  return normalized;
}

function inviteRedirect(appUrl: string): string {
  try {
    const url = new URL(appUrl);
    if (url.protocol !== 'https:' || url.username || url.password) throw new Error('unsafe URL');
    return new URL('/login', url).toString();
  } catch {
    throw new PlatformHttpError('COMPANY_INVITE_CONFIG_MISSING', 503);
  }
}

async function compensateFailedOnboarding(service: SupabaseClient, actorUserId: string, companyId: string, inviteId: string): Promise<void> {
  const { error } = await service.rpc('app_platform_cancel_company_onboarding', {
    p_actor_user_id: actorUserId, p_company_id: companyId, p_invite_id: inviteId,
  });
  if (error) throw new PlatformHttpError('COMPANY_ONBOARDING_ROLLBACK_FAILED', 503);
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
  });
  if (error?.code === '23505') throw new PlatformHttpError('COMPANY_SLUG_EXISTS', 409);
  if (error) throw new PlatformHttpError('COMPANY_ONBOARDING_CREATE_FAILED', 502);
  const row = readRpcRow(data);
  const companyId = String(row?.company_id || '');
  const inviteId = String(row?.invite_id || '');
  if (!companyId || !inviteId) throw new PlatformHttpError('COMPANY_ONBOARDING_CREATE_FAILED', 502);

  const invitation = await service.auth.admin.inviteUserByEmail(value.ownerEmail, {
    redirectTo: inviteRedirect(appUrl),
    data: { company_id: companyId, invite_id: inviteId, role: 'owner', name: value.ownerName },
  });
  if (invitation.error || !invitation.data.user?.id) {
    const orphanUserId = invitation.data.user?.id || (await findAuthUser(service, value.ownerEmail).catch(() => null))?.id;
    let authCleanupFailed = false;
    if (orphanUserId) {
      const cleanup = await service.auth.admin.deleteUser(orphanUserId).catch(() => ({ error: new Error('cleanup failed') }));
      authCleanupFailed = Boolean(cleanup.error);
    }
    await compensateFailedOnboarding(service, actorUserId, companyId, inviteId);
    if (authCleanupFailed) throw new PlatformHttpError('COMPANY_INVITE_CLEANUP_FAILED', 503);
    throw new PlatformHttpError('COMPANY_INVITE_SEND_FAILED', 502);
  }
  return { companyId, inviteId, slug: String(row?.slug || value.slug), invitationStatus: 'sent' };
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
): Promise<{ invitationStatus: 'sent' }> {
  if (!companyId) throw new PlatformHttpError('COMPANY_ID_REQUIRED', 400);
  const { data, error } = await service.rpc('app_platform_resend_owner_invite', {
    p_actor_user_id: actorUserId, p_company_id: companyId,
  });
  if (error) throw new PlatformHttpError('COMPANY_INVITE_RESEND_FAILED', 502);
  const row = readRpcRow(data);
  const inviteId = String(row?.invite_id || '');
  const ownerEmail = String(row?.owner_email || '').toLowerCase();
  const ownerName = String(row?.owner_name || '');
  if (!inviteId || !EMAIL_PATTERN.test(ownerEmail)) throw new PlatformHttpError('COMPANY_INVITE_RESEND_FAILED', 502);
  const previousAuthUser = await findAuthUser(service, ownerEmail);
  if (previousAuthUser) {
    const metadata = previousAuthUser.user_metadata || {};
    const belongsToPendingInvite = !previousAuthUser.email_confirmed_at
      && metadata.company_id === companyId && metadata.role === 'owner';
    if (!belongsToPendingInvite) {
      await service.rpc('app_platform_cancel_owner_invite', {
        p_actor_user_id: actorUserId, p_company_id: companyId, p_invite_id: inviteId,
      });
      throw new PlatformHttpError('COMPANY_OWNER_ALREADY_REGISTERED', 409);
    }
    const removed = await service.auth.admin.deleteUser(previousAuthUser.id);
    if (removed.error) {
      await service.rpc('app_platform_cancel_owner_invite', {
        p_actor_user_id: actorUserId, p_company_id: companyId, p_invite_id: inviteId,
      });
      throw new PlatformHttpError('COMPANY_INVITE_CLEANUP_FAILED', 503);
    }
  }
  const invitation = await service.auth.admin.inviteUserByEmail(ownerEmail, {
    redirectTo: inviteRedirect(appUrl),
    data: { company_id: companyId, invite_id: inviteId, role: 'owner', name: ownerName },
  });
  if (invitation.error || !invitation.data.user?.id) {
    let authCleanupFailed = false;
    if (invitation.data.user?.id) {
      const cleanup = await service.auth.admin.deleteUser(invitation.data.user.id).catch(() => ({ error: new Error('cleanup failed') }));
      authCleanupFailed = Boolean(cleanup.error);
    }
    await service.rpc('app_platform_cancel_owner_invite', {
      p_actor_user_id: actorUserId, p_company_id: companyId, p_invite_id: inviteId,
    });
    if (authCleanupFailed) throw new PlatformHttpError('COMPANY_INVITE_CLEANUP_FAILED', 503);
    throw new PlatformHttpError('COMPANY_INVITE_SEND_FAILED', 502);
  }
  return { invitationStatus: 'sent' };
}

export default async function platformCompaniesHandler(request: any, response: any): Promise<void> {
  await runPlatformHandler(response, async () => {
    const { userId, service } = await authorizePlatformRequest(request);
    if (request.method === 'POST') {
      if (request.body?.action === 'public_form_link') {
        return getPlatformCompanyAction(service, userId, String(request.body?.companyId || ''), 'public_form_link');
      }
      if (request.body?.action === 'resend_owner_invite') {
        return resendPlatformOwnerInvite(service, userId, String(request.body?.companyId || ''), String(process.env.APP_URL || ''));
      }
      if (request.body?.action) throw new PlatformHttpError('COMPANY_ACTION_INVALID', 400);
      return { company: await createPlatformCompanyOnboarding(service, userId, request.body, String(process.env.APP_URL || '')) };
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
