import type { SupabaseClient } from '@supabase/supabase-js';

import { createServerlessSupabaseClient } from '../_shared/supabaseClient.js';

export function getPlatformServiceClient(): SupabaseClient {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error('platform service is not configured');
  return createServerlessSupabaseClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

export function getPlatformAuthClient(): SupabaseClient {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !anonKey) throw new Error('platform auth is not configured');
  return createServerlessSupabaseClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
}
