import {
  createClient,
  type SupabaseClient,
  type SupabaseClientOptions,
} from '@supabase/supabase-js';

import { createRetryingFetch } from './retryingFetch.js';

export function createServerlessSupabaseClient(
  url: string,
  key: string,
  options: SupabaseClientOptions<'public'> = {},
): SupabaseClient {
  const fetchImpl = options.global?.fetch ?? ((input, init) => globalThis.fetch(input, init));
  return createClient(url, key, {
    ...options,
    global: {
      ...options.global,
      fetch: createRetryingFetch(fetchImpl),
    },
  });
}
