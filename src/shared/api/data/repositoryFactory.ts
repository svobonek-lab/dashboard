import type { ICRMRepository } from './types';
import { SupabaseRepository } from './SupabaseRepository';

// The browser application has one reviewed data path. Synology and database
// connectors run in the separate server-side connector package and must never
// silently replace the authenticated Supabase repository.
export const crmRepo: ICRMRepository = new SupabaseRepository();
