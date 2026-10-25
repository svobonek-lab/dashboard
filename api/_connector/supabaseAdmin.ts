import type { SupabaseClient } from '@supabase/supabase-js';

import { createServerlessSupabaseClient } from '../_shared/supabaseClient.js';

export function getConnectorServiceClient(): SupabaseClient {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error('connector service is not configured');
  return createServerlessSupabaseClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
}
