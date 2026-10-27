import assert from 'node:assert/strict';
import test from 'node:test';
import { assertStagingSeedTarget } from '../scripts/seed-two-tenants';

const env = {
  STAGING_SUPABASE_URL: 'https://bbbbbbbbbbbbbbbbbbbb.supabase.co',
  STAGING_SUPABASE_PROJECT_REF: 'bbbbbbbbbbbbbbbbbbbb',
  PRODUCTION_SUPABASE_PROJECT_REF: 'aaaaaaaaaaaaaaaaaaaa',
};

test('two-tenant seed accepts only the declared non-production Supabase staging project', () => {
  assert.deepEqual(assertStagingSeedTarget(env), { url: env.STAGING_SUPABASE_URL, ref: env.STAGING_SUPABASE_PROJECT_REF });
  assert.throws(() => assertStagingSeedTarget({ ...env, STAGING_SUPABASE_URL: 'https://aaaaaaaaaaaaaaaaaaaa.supabase.co' }), /Refusing to seed/);
  assert.throws(() => assertStagingSeedTarget({ ...env, STAGING_SUPABASE_PROJECT_REF: env.PRODUCTION_SUPABASE_PROJECT_REF }), /different/);
  assert.throws(() => assertStagingSeedTarget({ ...env, STAGING_SUPABASE_URL: 'https://evil.example/https://bbbbbbbbbbbbbbbbbbbb.supabase.co' }), /Refusing to seed/);
  assert.throws(() => assertStagingSeedTarget({ ...env, STAGING_SUPABASE_URL: 'http://bbbbbbbbbbbbbbbbbbbb.supabase.co' }), /Refusing to seed/);
});
