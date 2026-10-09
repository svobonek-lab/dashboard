import type { SupabaseClient } from '@supabase/supabase-js';

import { authorizePlatformRequest, recordPlatformAudit } from '../auth.js';
import { runPlatformHandler } from '../handler.js';
import { PlatformHttpError, requireGet } from '../http.js';

export interface PlatformCompanySummary {
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
    subscription_status: ['trial', 'active', 'past_due', 'cancelled'].includes(row.subscription_status) ? row.subscription_status : 'not_configured',
    integration_status: 'not_verified' as const,
  }));
}

export default async function platformCompaniesHandler(request: any, response: any): Promise<void> {
  await runPlatformHandler(response, async () => {
    requireGet(request);
    const { userId, service } = await authorizePlatformRequest(request);
    const companies = await listPlatformCompanies(service, userId);
    await recordPlatformAudit(service, {
      actorUserId: userId,
      action: 'company_directory.viewed',
      reasonCode: 'platform_api_request',
    });
    return { companies };
  });
}
