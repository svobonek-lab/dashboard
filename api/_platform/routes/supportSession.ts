import type { SupabaseClient } from '@supabase/supabase-js';

import { authorizePlatformRequest } from '../auth.js';
import { runPlatformHandler } from '../handler.js';
import { PlatformHttpError } from '../http.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

function firstRow(data: unknown): any {
  const value = Array.isArray(data) ? data[0] : data;
  if (!value || typeof value !== 'object') throw new PlatformHttpError('SUPPORT_SESSION_UNAVAILABLE', 502);
  return value;
}

export async function createPlatformSupportSession(service: SupabaseClient, actorUserId: string, companyId: string, reason: string): Promise<PlatformSupportSession> {
  if (!UUID.test(companyId) || reason.trim().length < 3 || reason.trim().length > 500) throw new PlatformHttpError('INVALID_SUPPORT_REQUEST', 400);
  const { data, error } = await service.rpc('app_platform_create_support_session', { p_actor_user_id: actorUserId, p_company_id: companyId, p_reason: reason.trim() });
  if (error) throw new PlatformHttpError('SUPPORT_SESSION_DENIED', 403);
  return firstRow(data) as PlatformSupportSession;
}

export async function getPlatformSupportSession(service: SupabaseClient, actorUserId: string, sessionId: string): Promise<PlatformSupportSession> {
  if (!UUID.test(sessionId)) throw new PlatformHttpError('INVALID_SUPPORT_SESSION', 400);
  const { data, error } = await service.rpc('app_platform_get_support_session', { p_actor_user_id: actorUserId, p_session_id: sessionId });
  if (error) throw new PlatformHttpError('SUPPORT_SESSION_DENIED', 403);
  return firstRow(data) as PlatformSupportSession;
}

export async function revokePlatformSupportSession(service: SupabaseClient, actorUserId: string, sessionId: string): Promise<void> {
  if (!UUID.test(sessionId)) throw new PlatformHttpError('INVALID_SUPPORT_SESSION', 400);
  const { data, error } = await service.rpc('app_platform_revoke_support_session', { p_actor_user_id: actorUserId, p_session_id: sessionId });
  if (error || data !== true) throw new PlatformHttpError('SUPPORT_SESSION_DENIED', 403);
}

export default async function platformSupportSessionHandler(request: any, response: any): Promise<void> {
  await runPlatformHandler(response, async () => {
    const { userId, service } = await authorizePlatformRequest(request);
    if (request.method === 'POST') {
      const session = await createPlatformSupportSession(service, userId, String(request.body?.companyId || ''), String(request.body?.reason || ''));
      return { session };
    }
    const header = request.headers?.['x-support-session'];
    const sessionId = String(request.query?.sessionId || (Array.isArray(header) ? header[0] : header) || '');
    if (request.method === 'GET') return { session: await getPlatformSupportSession(service, userId, sessionId) };
    if (request.method === 'DELETE') {
      await revokePlatformSupportSession(service, userId, sessionId);
      return { revoked: true };
    }
    throw new PlatformHttpError('METHOD_NOT_ALLOWED', 405);
  });
}
