import type { SupabaseClient } from '@supabase/supabase-js';

import { parseConnectorBody, requirePost } from './http.js';
import { authenticateConnectorRequest, type StoredConnectorIdentity } from './signature.js';
import { getConnectorServiceClient } from './supabaseAdmin.js';

export async function authenticateConnectorHttpRequest(
  request: { method?: string; headers?: Record<string, string | string[] | undefined>; body?: unknown },
  pathname: string,
  requiredScope: string,
): Promise<{ body: Record<string, unknown>; identity: StoredConnectorIdentity; service: SupabaseClient }> {
  requirePost(request);
  const parsed = parseConnectorBody(request);
  const service = getConnectorServiceClient();
  const connectorId = String(request.headers?.['x-sf-connector-id'] ?? request.headers?.['X-Sf-Connector-Id'] ?? '');
  const { data } = await service
    .from('app_connectors')
    .select('id, company_id, public_key, revoked_at, scopes')
    .eq('id', connectorId)
    .maybeSingle();
  const identity: StoredConnectorIdentity | null = data ? {
    connectorId: String(data.id),
    companyId: String(data.company_id),
    publicKey: String(data.public_key),
    revoked: Boolean(data.revoked_at),
    scopes: Array.isArray(data.scopes) ? data.scopes.map(String) : [],
  } : null;
  const verified = await authenticateConnectorRequest({
    method: 'POST', pathname, headers: request.headers ?? {}, rawBody: parsed.rawBody, body: parsed.body,
    requiredScope, identity,
    reserveNonce: async (verifiedConnectorId, requestId, expiresAt) => {
      const { data: reserved, error } = await service.rpc('app_reserve_connector_request', {
        p_connector_id: verifiedConnectorId,
        p_request_id: requestId,
        p_expires_at: expiresAt.toISOString(),
      });
      return !error && reserved === true;
    },
  });
  return { body: parsed.body, identity: verified, service };
}
