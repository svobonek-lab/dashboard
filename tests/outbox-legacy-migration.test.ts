import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const migrationPath = new URL('../supabase/staging/20261103_outbox_worker_legacy_compat.sql', import.meta.url);

test('legacy outbox compatibility preserves queued payloads and expands states additively', async () => {
  const sql = await readFile(migrationPath, 'utf8');

  assert.match(sql, /add column if not exists body\b/i);
  assert.match(sql, /add column if not exists body_html\b/i);
  assert.match(sql, /add column if not exists provider_message_id\b/i);
  assert.match(sql, /add column if not exists delivered_at\b/i);
  assert.match(sql, /add column if not exists updated_at\b/i);
  assert.match(sql, /body_html\s*=\s*coalesce\(body_html,\s*html\)/i);
  assert.match(sql, /provider_message_id\s*=\s*coalesce\(provider_message_id,\s*provider_id\)/i);
  assert.match(sql, /delivered_at\s*=\s*coalesce\(delivered_at,\s*sent_at\)/i);
  for (const status of ['pending', 'sending', 'sent', 'failed', 'cancelled', 'processing', 'delivered', 'retry']) {
    assert.match(sql, new RegExp(`'${status}'`, 'i'));
  }
  assert.doesNotMatch(sql, /drop\s+column|truncate\s+|delete\s+from/i);
  assert.match(sql, /revoke all on table public\.app_email_outbox from public, anon, authenticated/i);
  assert.match(sql, /grant select, insert, update on table public\.app_email_outbox to service_role/i);
});
