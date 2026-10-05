import type { SupabaseClient } from '@supabase/supabase-js';

import { PlatformHttpError } from './http.js';
import { getPlatformAuthClient, getPlatformServiceClient } from './supabaseAdmin.js';

type PlatformClients = { auth: SupabaseClient; service: SupabaseClient };

export interface PlatformAuditInput {
  actorUserId: string;
  action: 'platform_session.verified' | 'company_directory.viewed';
  reasonCode: 'platform_api_request';
}

export async function recordPlatformAudit(
  service: SupabaseClient,
  input: PlatformAuditInput,
): Promise<void> {
  const { error } = await service.from('app_platform_audit_events').insert({
    actor_user_id: input.actorUserId,
    action: input.action,
    outcome: 'allowed',
    reason_code: input.reasonCode,
  });
  if (error) throw new PlatformHttpError('PLATFORM_AUDIT_UNAVAILABLE', 503);
}

function readBearer(headers: Record<string, string | string[] | undefined> = {}): string {
  const raw = headers.authorization ?? headers.Authorization;
  const value = Array.isArray(raw) ? raw[0] : raw;
  const match = typeof value === 'string' ? /^Bearer ([^\s]+)$/i.exec(value.trim()) : null;
  return match?.[1] || '';
}

export async function authorizePlatformRequest(
  request: { headers?: Record<string, string | string[] | undefined> },
  clients?: PlatformClients,
): Promise<{ userId: string; service: SupabaseClient }> {
  const token = readBearer(request.headers);
  if (!token) throw new PlatformHttpError('PLATFORM_AUTH_REQUIRED', 401);

  let auth: SupabaseClient;
  let service: SupabaseClient;
  try {
    auth = clients?.auth ?? getPlatformAuthClient();
    service = clients?.service ?? getPlatformServiceClient();
  } catch {
    throw new PlatformHttpError('PLATFORM_API_UNAVAILABLE', 503);
  }

  const { data, error } = await auth.auth.getUser(token);
  if (error || !data.user) throw new PlatformHttpError('PLATFORM_AUTH_INVALID', 401);

  const { data: admin, error: adminError } = await service
    .from('app_platform_admins')
    .select('active,revoked_at')
    .eq('user_id', data.user.id)
    .eq('active', true)
    .maybeSingle();
  if (adminError || !admin || admin.revoked_at) throw new PlatformHttpError('PLATFORM_ACCESS_DENIED', 403);
  return { userId: data.user.id, service };
}
