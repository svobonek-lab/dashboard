import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { decryptInviteLink, encryptInviteLink } from '../api/_invite-link-crypto.js';
import { parseInviteLinkTtl, prepareAuthInviteEmail } from '../api/_invite-outbox.js';
import { deliverClaimedOutboxEmail, EmailProviderError } from '../api/_outbox-worker.js';

const key = Buffer.from(Array.from({ length: 32 }, (_, index) => index));

test('invite link encryption round trips without storing plaintext', () => {
  const link = 'https://auth.example.test/verify?token=secret-token';
  const encrypted = encryptInviteLink(link, key);
  assert.ok(!encrypted.includes('secret-token'));
  assert.equal(decryptInviteLink(encrypted, key), link);
});

test('invite link encryption rejects missing, malformed, and wrong-length keys', () => {
  assert.throws(() => encryptInviteLink('https://example.test', undefined), /EMAIL_LINK_ENCRYPTION_KEY_INVALID/);
  assert.throws(() => encryptInviteLink('https://example.test', Buffer.alloc(31)), /EMAIL_LINK_ENCRYPTION_KEY_INVALID/);
  assert.throws(() => decryptInviteLink('v1.invalid', key), /INVITE_LINK_CIPHERTEXT_INVALID/);
});

test('invite link TTL is bounded to the supported Auth expiry window', () => {
  assert.equal(parseInviteLinkTtl('3600'), 3600);
  assert.throws(() => parseInviteLinkTtl(undefined), /AUTH_EMAIL_LINK_TTL_INVALID/);
  assert.throws(() => parseInviteLinkTtl('3601'), /AUTH_EMAIL_LINK_TTL_INVALID/);
  assert.throws(() => parseInviteLinkTtl('not-a-number'), /AUTH_EMAIL_LINK_TTL_INVALID/);
});

test('invite link ciphertext authentication rejects tampering', () => {
  const encrypted = encryptInviteLink('https://auth.example.test/verify?token=secret', key);
  const parts = encrypted.split('.');
  parts[3] = `${parts[3].slice(0, -1)}${parts[3].endsWith('A') ? 'B' : 'A'}`;
  assert.throws(() => decryptInviteLink(parts.join('.'), key), /INVITE_LINK_CIPHERTEXT_INVALID/);
});

test('employee and platform invite RPCs enqueue safe delivery rows transactionally', async () => {
  const migration = await readFile(new URL('../supabase/staging/20261103_invitation_outbox.sql', import.meta.url), 'utf8');
  assert.match(migration, /create or replace function public\.app_create_invite[\s\S]*?insert into public\.app_invites[\s\S]*?insert into public\.app_email_outbox/i);
  assert.match(migration, /create or replace function public\.app_platform_create_company_onboarding[\s\S]*?insert into public\.app_email_outbox/i);
  assert.match(migration, /create or replace function public\.app_platform_resend_owner_invite[\s\S]*?insert into public\.app_email_outbox/i);
  assert.match(migration, /jsonb_build_object\('name',[\s\S]*?'role','employee'\)/i);
  assert.match(migration, /jsonb_build_object\('name',[\s\S]*?'role','owner'\)/i);
  assert.doesNotMatch(migration, /action_link|ConfirmationURL|token=/i);
});

test('worker persists an encrypted invite link before returning provider content', async () => {
  const calls: string[] = [];
  const store = {
    async loadInvite() { return { invite: { id: 'invite-a', company_id: 'company-a', email: 'worker@example.test', role: 'employee', name: 'Worker', expires_at: '2026-12-01T00:00:00Z' }, company: { id: 'company-a', name: 'Company A', active: true }, user: null }; },
    async claimInviteLink() { return true; }, async releaseInviteLink() {},
    async saveInviteLink(_row: string, _invite: string, encrypted: string) { calls.push(encrypted); assert.ok(!encrypted.includes('sensitive')); },
    async clearInviteLink() { calls.push('clear'); },
  };
  const auth = { async generateLink() { return { data: { properties: { action_link: 'https://auth.example.test/verify?token=sensitive' } }, error: null }; } };
  const result = await prepareAuthInviteEmail({
    row: { id: 'outbox-a', company_id: 'company-a', invite_id: 'invite-a', notification_kind: 'auth_invite', recipient: 'worker@example.test', template_data: {}, payload_generation: 1 },
    store, auth, encryptionKey: key.toString('base64'), linkTtlSeconds: '3600', redirectTo: 'https://app.example.test/login', now: new Date('2026-11-03T10:00:00Z'),
  });
  assert.equal(calls.length, 1);
  assert.match(result.body_html, /token=sensitive/);
  assert.equal(result.idempotencyKey, 'outbox/outbox-a/generation/1');
});

test('worker refuses a revoked invitation before generating an Auth link', async () => {
  let generated = false;
  await assert.rejects(prepareAuthInviteEmail({
    row: { id: 'outbox-a', company_id: 'company-a', invite_id: 'invite-a', notification_kind: 'auth_invite', recipient: 'worker@example.test' },
    store: { async loadInvite() { return { invite: { id: 'invite-a', company_id: 'company-a', email: 'worker@example.test', role: 'employee', revoked_at: '2026-11-03T09:00:00Z', expires_at: '2026-12-01T00:00:00Z' }, company: { id: 'company-a', active: true }, user: null }; }, async claimInviteLink() { return true; }, async releaseInviteLink() {}, async saveInviteLink() {}, async clearInviteLink() {} },
    auth: { async generateLink() { generated = true; return { data: null, error: null }; } },
    encryptionKey: key.toString('base64'), linkTtlSeconds: '3600', redirectTo: 'https://app.example.test/login', now: new Date('2026-11-03T10:00:00Z'),
  }), /AUTH_INVITE_NOT_ACTIVE/);
  assert.equal(generated, false);
});

test('worker rejects user metadata for a different pending invite', async () => {
  await assert.rejects(prepareAuthInviteEmail({
    row: { id: 'outbox-a', company_id: 'company-a', invite_id: 'invite-a', notification_kind: 'auth_invite', recipient: 'worker@example.test' },
    store: { async loadInvite() { return { invite: { id: 'invite-a', company_id: 'company-a', email: 'worker@example.test', role: 'employee', expires_at: '2026-12-01T00:00:00Z' }, company: { id: 'company-a', active: true }, user: { user_metadata: { invite_id: 'other-invite', company_id: 'company-a', role: 'employee' } } }; }, async claimInviteLink() { return true; }, async releaseInviteLink() {}, async saveInviteLink() {}, async clearInviteLink() {} },
    auth: { async generateLink() { throw new Error('must not generate'); } },
    encryptionKey: key.toString('base64'), linkTtlSeconds: '3600', redirectTo: 'https://app.example.test/login', now: new Date('2026-11-03T10:00:00Z'),
  }), /AUTH_INVITE_USER_REVIEW_REQUIRED/);
});

test('only the worker holding the database link lease can generate a fresh Auth link', async () => {
  let generated = false;
  await assert.rejects(prepareAuthInviteEmail({
    row: { id: 'outbox-a', company_id: 'company-a', invite_id: 'invite-a', notification_kind: 'auth_invite', recipient: 'worker@example.test' },
    store: {
      async loadInvite() { return { invite: { id: 'invite-a', company_id: 'company-a', email: 'worker@example.test', role: 'employee', expires_at: '2026-12-01T00:00:00Z' }, company: { id: 'company-a', active: true }, user: null }; },
      async claimInviteLink() { return false; }, async releaseInviteLink() {}, async saveInviteLink() {}, async clearInviteLink() {},
    },
    auth: { async generateLink() { generated = true; return { data: null, error: null }; } },
    encryptionKey: key.toString('base64'), linkTtlSeconds: '3600', redirectTo: 'https://app.example.test/login', now: new Date('2026-11-03T10:00:00Z'),
  }), /AUTH_INVITE_LINK_BUSY/);
  assert.equal(generated, false);
});

test('expired saved links rotate ciphertext and increment provider generation', async () => {
  let generated = 0;
  let savedGeneration = 0;
  let savedCipher = '';
  const store = {
    async loadInvite() { return { invite: { id: 'invite-a', company_id: 'company-a', email: 'worker@example.test', role: 'employee', expires_at: '2026-12-01T00:00:00Z' }, company: { id: 'company-a', name: 'Company A', active: true }, user: null }; },
    async claimInviteLink() { return true; }, async releaseInviteLink() {},
    async saveInviteLink(_row: string, _invite: string, encrypted: string, _expiry: string, generation: number) { savedCipher = encrypted; savedGeneration = generation; },
    async clearInviteLink() {},
  };
  const result = await prepareAuthInviteEmail({
    row: { id: 'outbox-a', company_id: 'company-a', invite_id: 'invite-a', notification_kind: 'auth_invite', recipient: 'worker@example.test', payload_generation: 3, invite_link_ciphertext: 'old-cipher', invite_link_expires_at: '2026-11-03T09:00:00Z' },
    store,
    auth: { async generateLink() { generated += 1; return { data: { properties: { action_link: 'https://auth.example.test/verify?token=fresh' } }, error: null }; } },
    encryptionKey: key.toString('base64'), linkTtlSeconds: '3600', redirectTo: 'https://app.example.test/login', now: new Date('2026-11-03T10:00:00Z'),
  });
  assert.equal(generated, 1);
  assert.equal(savedGeneration, 4);
  assert.ok(savedCipher && !savedCipher.includes('fresh'));
  assert.equal(result.idempotencyKey, 'outbox/outbox-a/generation/4');
});

test('transient invite send retries with the same encrypted link and idempotency key', async () => {
  const now = new Date('2026-11-03T10:00:00Z');
  let encrypted = '';
  let expiry = '';
  let generation = 1;
  let linksGenerated = 0;
  const store = {
    async loadInvite() { return { invite: { id: 'invite-a', company_id: 'company-a', email: 'worker@example.test', role: 'employee', expires_at: '2026-12-01T00:00:00Z' }, company: { id: 'company-a', name: 'Company A', active: true }, user: null }; },
    async claimInviteLink() { return true; }, async releaseInviteLink() {},
    async saveInviteLink(_row: string, _invite: string, value: string, expiryValue: string, generationValue: number) { encrypted = value; expiry = expiryValue; generation = generationValue; },
    async clearInviteLink() {},
  };
  const auth = { async generateLink() { linksGenerated += 1; return { data: { properties: { action_link: 'https://auth.example.test/verify?token=stable' } }, error: null }; } };
  const first = await prepareAuthInviteEmail({ row: { id: 'outbox-a', company_id: 'company-a', invite_id: 'invite-a', notification_kind: 'auth_invite', recipient: 'worker@example.test', payload_generation: generation }, store, auth, encryptionKey: key.toString('base64'), linkTtlSeconds: '3600', redirectTo: 'https://app.example.test/login', now });
  let sends = 0;
  let firstLink = '';
  const provider = { async send(email: any, idempotencyKey: string) { sends += 1; firstLink ||= email.body_html; assert.match(email.body_html, /token=stable/); assert.equal(idempotencyKey, first.idempotencyKey); if (sends === 1) throw new EmailProviderError('EMAIL_PROVIDER_TEMPORARY', true); return { id: 'provider-ok' }; } };
  const deliveryStore = { async markDelivered() {}, async markFailure() {} };
  assert.equal((await deliverClaimedOutboxEmail({ id: 'outbox-a', attempts: 1, subject: first.subject, body_html: first.body_html }, { provider, store: deliveryStore, idempotencyKey: first.idempotencyKey, now: () => now })).status, 'retry');
  const retry = await prepareAuthInviteEmail({ row: { id: 'outbox-a', company_id: 'company-a', invite_id: 'invite-a', notification_kind: 'auth_invite', recipient: 'worker@example.test', payload_generation: generation, invite_link_ciphertext: encrypted, invite_link_expires_at: expiry }, store, auth, encryptionKey: key.toString('base64'), linkTtlSeconds: '3600', redirectTo: 'https://app.example.test/login', now });
  assert.equal(retry.idempotencyKey, first.idempotencyKey);
  assert.equal(retry.body_html, firstLink);
  assert.equal(linksGenerated, 1);
  assert.equal((await deliverClaimedOutboxEmail({ id: 'outbox-a', attempts: 2, subject: retry.subject, body_html: retry.body_html }, { provider, store: deliveryStore, idempotencyKey: retry.idempotencyKey, now: () => now })).status, 'delivered');
  assert.equal(sends, 2);
});

test('Auth link generation is not sent when ciphertext persistence fails', async () => {
  let generated = false;
  let providerCalled = false;
  await assert.rejects(prepareAuthInviteEmail({
    row: { id: 'outbox-a', company_id: 'company-a', invite_id: 'invite-a', notification_kind: 'auth_invite', recipient: 'worker@example.test' },
    store: { async loadInvite() { return { invite: { id: 'invite-a', company_id: 'company-a', email: 'worker@example.test', role: 'employee', expires_at: '2026-12-01T00:00:00Z' }, company: { id: 'company-a', active: true }, user: null }; }, async claimInviteLink() { return true; }, async releaseInviteLink() {}, async saveInviteLink() { throw new Error('AUTH_INVITE_LINK_PERSIST_FAILED'); }, async clearInviteLink() {} },
    auth: { async generateLink() { generated = true; return { data: { properties: { action_link: 'https://auth.example.test/verify?token=orphan' } }, error: null }; } },
    encryptionKey: key.toString('base64'), linkTtlSeconds: '3600', redirectTo: 'https://app.example.test/login', now: new Date('2026-11-03T10:00:00Z'),
  }), /AUTH_INVITE_LINK_PERSIST_FAILED/);
  assert.equal(generated, true);
  assert.equal(providerCalled, false);
});

test('staging invitation SQL keeps the encrypted queue service-only and the cron proposal uses Vault', async () => {
  const migration = await readFile(new URL('../supabase/staging/20261103_invitation_outbox.sql', import.meta.url), 'utf8');
  const scheduler = await readFile(new URL('../supabase/staging/20261103_outbox_minute_scheduler.sql', import.meta.url), 'utf8');
  assert.match(migration, /invite_link_ciphertext text/i);
  assert.match(migration, /invite_link_lock_until timestamptz/i);
  assert.match(migration, /drop policy/i);
  assert.match(migration, /revoke all on table public\.app_email_outbox from public, anon, authenticated/i);
  assert.match(migration, /grant select, insert, update on table public\.app_email_outbox to service_role/i);
  assert.match(scheduler, /vault\.decrypted_secrets/i);
  assert.match(scheduler, /\* \* \* \* \*/);
  assert.doesNotMatch(scheduler, /Bearer\s+[A-Za-z0-9_-]{20,}/);
});
