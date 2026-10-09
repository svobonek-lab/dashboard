import type { SupabaseClient } from '@supabase/supabase-js';

import { authorizePlatformRequest } from '../auth.js';
import { runPlatformHandler } from '../handler.js';
import { PlatformHttpError } from '../http.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const REQUEST_ID = /^[A-Za-z0-9._:-]{8,120}$/;
const ACTIONS = new Set(['create_lead', 'update_lead', 'update_status']);

export interface SupportLeadMutation {
  action: 'create_lead' | 'update_lead' | 'update_status';
  requestId: string;
  leadId?: string;
  payload: Record<string, unknown>;
}

function requireSessionId(value: unknown): string {
  const id = String(value || '').trim();
  if (!UUID.test(id)) throw new PlatformHttpError('INVALID_SUPPORT_SESSION', 400);
  return id;
}

export async function getSupportWorkspace(service: SupabaseClient, actorUserId: string, sessionId: string): Promise<unknown> {
  const { data, error } = await service.rpc('app_platform_support_workspace', {
    p_actor_user_id: actorUserId,
    p_session_id: requireSessionId(sessionId),
  });
  if (error || !data || typeof data !== 'object') throw new PlatformHttpError('SUPPORT_WORKSPACE_DENIED', 403);
  return data;
}

export async function mutateSupportLead(
  service: SupabaseClient,
  actorUserId: string,
  sessionId: string,
  input: SupportLeadMutation,
): Promise<unknown> {
  if (!ACTIONS.has(input.action) || !REQUEST_ID.test(String(input.requestId || '')) || !input.payload || typeof input.payload !== 'object' || Array.isArray(input.payload)) {
    throw new PlatformHttpError('INVALID_SUPPORT_MUTATION', 400);
  }
  if (input.action !== 'create_lead' && !UUID.test(String(input.leadId || ''))) throw new PlatformHttpError('INVALID_SUPPORT_MUTATION', 400);
  const { data, error } = await service.rpc('app_platform_support_mutate_lead', {
    p_actor_user_id: actorUserId,
    p_session_id: requireSessionId(sessionId),
    p_action: input.action,
    p_lead_id: input.leadId || null,
    p_payload: input.payload,
    p_request_id: input.requestId,
  });
  if (error || !data || typeof data !== 'object') throw new PlatformHttpError('SUPPORT_MUTATION_DENIED', 403);
  return data;
}

export default async function platformSupportWorkspaceHandler(request: any, response: any): Promise<void> {
  await runPlatformHandler(response, async () => {
    const { userId, service } = await authorizePlatformRequest(request);
    const header = request.headers?.['x-support-session'];
    const sessionId = requireSessionId(request.query?.sessionId || (Array.isArray(header) ? header[0] : header));
    if (request.method === 'GET') return { workspace: await getSupportWorkspace(service, userId, sessionId) };
    if (request.method === 'POST') {
      const body = request.body || {};
      return { lead: await mutateSupportLead(service, userId, sessionId, {
        action: body.action,
        requestId: body.requestId,
        leadId: body.leadId,
        payload: body.payload,
      }) };
    }
    throw new PlatformHttpError('METHOD_NOT_ALLOWED', 405);
  });
}
