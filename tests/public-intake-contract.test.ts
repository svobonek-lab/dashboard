import test from 'node:test';
import assert from 'node:assert/strict';
import { resolvePublicTenantKey } from '../src/features/submit-inquiry';
import { readFileSync } from 'node:fs';

const sql = readFileSync(new URL('../supabase/staging/pilot_public_intake.sql', import.meta.url), 'utf8');
const supabaseClient = readFileSync(new URL('../src/shared/api/supabaseClient.ts', import.meta.url), 'utf8');
const widget = readFileSync(new URL('../src/features/submit-inquiry/ui/WidgetIframePage.tsx', import.meta.url), 'utf8');
const intakeApi = readFileSync(new URL('../api/public-intake.ts', import.meta.url), 'utf8');
const app = readFileSync(new URL('../src/app/App.tsx', import.meta.url), 'utf8');
const protectedRoute = readFileSync(new URL('../src/app/ProtectedRoute.tsx', import.meta.url), 'utf8');
const verifyWorkflow = readFileSync(new URL('../.github/workflows/verify.yml', import.meta.url), 'utf8');

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

test('tenant-key intake paths render publicly even when a dashboard session exists', () => {
  assert.match(app, /pathname\.startsWith\('\/inquiry\/'\)/);
  assert.match(protectedRoute, /pathname\.startsWith\('\/inquiry\/'\)/);
  assert.match(protectedRoute, /pathname\.startsWith\('\/form\/'\)/);
});

test('public intake never inherits an authenticated dashboard session', () => {
  assert.match(supabaseClient, /export const publicSupabase/);
  assert.match(supabaseClient, /persistSession:\s*false/);
  assert.match(supabaseClient, /storageKey:\s*['"]stavbaflow-public-anon['"]/);
  assert.match(supabaseClient, /autoRefreshToken:\s*false/);
  assert.match(supabaseClient, /detectSessionInUrl:\s*false/);
  assert.match(widget, /publicSupabase\.rpc\('app_get_public_company'/);
  assert.match(widget, /fetch\('\/api\/public-intake'/);
  assert.match(intakeApi, /p_client_ip_hash:\s*input\.clientIpHash/);
  assert.doesNotMatch(widget, /supabase\.rpc\('app_get_public_company'/);
  assert.doesNotMatch(widget, /supabase\.rpc\('app_submit_public_lead'/);
});

test('disposable PostgreSQL CI runs the 50-request same-IP burst acceptance', () => {
  assert.match(verifyWorkflow, /docker cp supabase\/tests\/public_intake_burst\.sh public-intake-postgres:/);
  assert.match(verifyWorkflow, /docker exec public-intake-postgres sh \/tmp\/public_intake_burst\.sh/);
});

test('isolated SQL acceptance covers oversized fields and exactly-once retries', () => {
  const verify = readFileSync(new URL('../supabase/tests/public_intake_security_verify.sql', import.meta.url), 'utf8');
  for (const field of ['customer name', 'email', 'title', 'description']) {
    assert.match(verify, new RegExp(`oversized ${field} was accepted by SQL`, 'i'));
  }
  assert.match(verify, /out-of-range value was accepted by SQL/i);
  assert.match(verify, /idempotent retry must create exactly one lead/i);
  assert.match(verify, /request_key = 'rate-request-5'/i);
});
