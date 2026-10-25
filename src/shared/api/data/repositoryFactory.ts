import { SupabaseRepository } from './SupabaseRepository';
import { ModeAwareRepository } from './ByodbRepository';

// The browser application has one reviewed data path. Synology and database
// connectors run in the separate server-side connector package and must never
// silently replace the authenticated Supabase repository.
export const crmRepo = new ModeAwareRepository(new SupabaseRepository());
