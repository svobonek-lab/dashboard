import type { SupabaseClient } from '@supabase/supabase-js';

import { ConnectorHttpError } from './http.js';
import { getConnectorServiceClient } from './supabaseAdmin.js';
import { createServerlessSupabaseClient } from '../_shared/supabaseClient.js';

export type ConnectorMemberRole = 'owner' | 'employee';

export async function authorizeConnectorOwner(
  request: { headers?: Record<string, string | string[] | undefined> },
  companyId: string,
  clients?: { auth: SupabaseClient; service: SupabaseClient },
): Promise<{ userId: string; service: SupabaseClient }> {
  const value = request.headers?.authorization ?? request.headers?.Authorization;
  const token = String(Array.isArray(value) ? value[0] : value ?? '').replace(/^Bearer\s+/i, '').trim();
  if (!token) throw new ConnectorHttpError('OWNER_AUTH_REQUIRED', 401);
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  if (!clients && (!url || !anonKey)) throw new ConnectorHttpError('OWNER_API_UNAVAILABLE', 503);
  const auth = clients?.auth ?? createServerlessSupabaseClient(url!, anonKey!, { auth: { persistSession: false, autoRefreshToken: false } });
  const service = clients?.service ?? getConnectorServiceClient();
  const { data, error } = await auth.auth.getUser(token);
  if (error || !data.user) throw new ConnectorHttpError('OWNER_AUTH_INVALID', 401);
  const { data: membership, error: memberError } = await service.from('app_members').select('role').eq('company_id', companyId).eq('user_id', data.user.id).eq('active', true).maybeSingle();
  if (memberError || membership?.role !== 'owner') throw new ConnectorHttpError('OWNER_ACCESS_DENIED', 403);
  return { userId: data.user.id, service };
}

export async function authorizeConnectorMember(
  request: { headers?: Record<string, string | string[] | undefined> },
  companyId: string,
  clients?: { auth: SupabaseClient; service: SupabaseClient },
): Promise<{ userId: string; userEmail: string; companyId: string; role: ConnectorMemberRole; service: SupabaseClient }> {
  const value = request.headers?.authorization ?? request.headers?.Authorization;
  const token = String(Array.isArray(value) ? value[0] : value ?? '').replace(/^Bearer\s+/i, '').trim();
  if (!token) throw new ConnectorHttpError('OWNER_AUTH_REQUIRED', 401);
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  if (!clients && (!url || !anonKey)) throw new ConnectorHttpError('OWNER_API_UNAVAILABLE', 503);
  const auth = clients?.auth ?? createServerlessSupabaseClient(url!, anonKey!, { auth: { persistSession: false, autoRefreshToken: false } });
  const service = clients?.service ?? getConnectorServiceClient();
  const { data, error } = await auth.auth.getUser(token);
  if (error || !data.user || !data.user.email) throw new ConnectorHttpError('OWNER_AUTH_INVALID', 401);
  const { data: membership, error: memberError } = await service.from('app_members').select('role').eq('company_id', companyId).eq('user_id', data.user.id).eq('active', true).maybeSingle();
  const role = membership?.role;
  if (memberError || (role !== 'owner' && role !== 'employee')) throw new ConnectorHttpError('OWNER_ACCESS_DENIED', 403);
  return { userId: data.user.id, userEmail: data.user.email, companyId, role, service };
}
