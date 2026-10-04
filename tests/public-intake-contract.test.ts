import test from 'node:test';
import assert from 'node:assert/strict';
import { resolvePublicTenantKey } from '../src/app/publicIntakeRoute';
import { readFileSync } from 'node:fs';

const sql = readFileSync(new URL('../supabase/staging/pilot_public_intake.sql', import.meta.url), 'utf8');
const supabaseClient = readFileSync(new URL('../lib/supabase.ts', import.meta.url), 'utf8');
const widget = readFileSync(new URL('../features/WidgetIframePage.tsx', import.meta.url), 'utf8');

test('public intake uses tenant slug, stores the resulting lead id, and rate limits unique requests', () => {
  assert.match(sql, /add column if not exists lead_id uuid/i);
  assert.match(sql, /p_public_key text/i);
  assert.match(sql, /where slug=lower\(trim\(p_public_key\)\)/i);
  assert.match(sql, /set lead_id=v_lead_id/i);
  assert.match(sql, /created_at>now\(\)-interval '1 minute'/i);
  assert.doesNotMatch(sql, /p_company_id uuid/);
});

test('public intake resolves only an explicit tenant key from query or supported path', () => {
  assert.equal(resolvePublicTenantKey('?org=pilot-mail-test', '/inquiry'), 'pilot-mail-test');
  assert.equal(resolvePublicTenantKey('', '/form/pilot-mail-test'), 'pilot-mail-test');
  assert.equal(resolvePublicTenantKey('', '/inquiry/pilot-mail-test'), 'pilot-mail-test');
  assert.equal(resolvePublicTenantKey('', '/inquiry'), '');
  assert.equal(resolvePublicTenantKey('', '/portal/pilot-mail-test'), '');
});

test('public intake never inherits an authenticated dashboard session', () => {
  assert.match(supabaseClient, /export const publicSupabase/);
  assert.match(supabaseClient, /persistSession:\s*false/);
  assert.match(supabaseClient, /storageKey:\s*['"]stavbaflow-public-anon['"]/);
  assert.match(supabaseClient, /autoRefreshToken:\s*false/);
  assert.match(supabaseClient, /detectSessionInUrl:\s*false/);
  assert.match(widget, /publicSupabase\.rpc\('app_get_public_company'/);
  assert.match(widget, /publicSupabase\.rpc\('app_submit_public_lead'/);
  assert.doesNotMatch(widget, /supabase\.rpc\('app_get_public_company'/);
  assert.doesNotMatch(widget, /supabase\.rpc\('app_submit_public_lead'/);
});
