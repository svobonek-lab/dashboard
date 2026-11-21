import assert from 'node:assert/strict';
import test from 'node:test';
import { canWriteAppLeads } from '../src/shared/api/pilotWritePolicy';
import { requireLeadWriteResult } from '../src/shared/api/data/leadWriteResult';

const staging = 'https://xwzweltjvreqhjpbjrxa.supabase.co';
const production = 'https://oncmtmrhmjlerbwkrecv.supabase.co';

test('the candidate requires explicit lead writes and separate approval for the exact production origin', () => {
  const candidate = { VITE_APP_LEAD_WRITES: 'true' };
  const approved = { ...candidate, VITE_PRODUCTION_APP_LEAD_WRITES_APPROVED: 'true' };
  assert.equal(canWriteAppLeads({ ...candidate, VITE_SUPABASE_URL: staging }), true);
  assert.equal(canWriteAppLeads({ ...candidate, VITE_SUPABASE_URL: production }), false);
  assert.equal(canWriteAppLeads({ ...approved, VITE_SUPABASE_URL: production }), true);
  assert.equal(canWriteAppLeads({ ...approved, VITE_SUPABASE_URL: production + '.example.invalid' }), false);
  assert.equal(canWriteAppLeads({ ...approved, VITE_SUPABASE_URL: production + '/api' }), false);
  assert.equal(canWriteAppLeads({ VITE_PILOT_WRITES: 'true', VITE_SUPABASE_URL: staging }), false);
});

test('a denied or mismatched write response cannot be applied locally', () => {
  const company = 'a0000000-0000-4000-8000-000000000001';
  const id = 'a1000000-0000-4000-8000-000000000001';
  const row = { company_id: company, id, status: 'contacted', assigned_to: null };
  assert.equal(requireLeadWriteResult({ data: row, error: null }, company, { id, status: 'contacted' }), row);
  assert.throws(() => requireLeadWriteResult({ data: null, error: { message: 'denied' } }, company));
  assert.throws(() => requireLeadWriteResult({ data: row, error: null }, company, { id, status: 'won' }));
  assert.throws(() => requireLeadWriteResult({ data: row, error: null }, id));
});
