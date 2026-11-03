import { createServerlessSupabaseClient } from './_shared/supabaseClient.js';
import { decryptInviteLink, encryptInviteLink } from './_invite-link-crypto.js';
import { randomUUID } from 'node:crypto';

export interface InviteLinkStore {
  loadInvite(inviteId: string): Promise<{ invite: any | null; company: any | null; user: any | null }>;
  claimInviteLink(rowId: string, lockId: string, lockUntil: string, now: string): Promise<boolean>;
  releaseInviteLink(rowId: string, lockId: string): Promise<void>;
  saveInviteLink(rowId: string, inviteId: string, encrypted: string, expiresAt: string, generation: number, lockId: string, expectedGeneration: number): Promise<void>;
  clearInviteLink(rowId: string): Promise<void>;
}

export interface InviteLinkAuth {
  generateLink(input: { type: 'invite' | 'magiclink'; email: string; options: { redirectTo: string; data: Record<string, string> } }): Promise<{ data: any; error: any }>;
}

export function parseInviteLinkTtl(raw: string | undefined): number {
  const ttl = Number(raw);
  if (!Number.isInteger(ttl) || ttl < 300 || ttl > 3600) throw new Error('AUTH_EMAIL_LINK_TTL_INVALID');
  return ttl;
}

function safeTemplateValue(value: unknown, max = 160): string {
  return String(value || '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, max);
}

export async function prepareAuthInviteEmail(input: {
  row: any;
  store: InviteLinkStore;
  auth: InviteLinkAuth;
  encryptionKey: string | undefined;
  linkTtlSeconds: string | undefined;
  redirectTo: string;
  now?: Date;
}): Promise<{ recipient: string; subject: string; body_html: string; idempotencyKey: string; generation: number }> {
  const now = input.now || new Date();
  const row = input.row;
  const inviteId = String(row?.invite_id || '');
  if (!inviteId || String(row?.notification_kind || '') !== 'auth_invite') throw new Error('AUTH_INVITE_RECORD_INVALID');
  const { invite, company, user } = await input.store.loadInvite(inviteId);
  if (!invite || !company || invite.accepted_at || invite.revoked_at || !invite.expires_at || Date.parse(invite.expires_at) <= now.getTime()) {
    throw new Error('AUTH_INVITE_NOT_ACTIVE');
  }
  if (!['owner', 'employee'].includes(String(invite.role))) throw new Error('AUTH_INVITE_SCOPE_MISMATCH');
  const recipient = String(row.recipient || '').trim().toLowerCase();
  if (recipient !== String(invite.email || '').trim().toLowerCase() || String(invite.company_id) !== String(row.company_id)
    || String(company.id) !== String(row.company_id) || !company.active) throw new Error('AUTH_INVITE_SCOPE_MISMATCH');
  const metadata = user?.user_metadata || {};
  let generation = Math.max(1, Number(row.payload_generation) || 1);
  let encrypted = row.invite_link_ciphertext as string | null;
  let expiresAt = row.invite_link_expires_at as string | null;
  if (user && (metadata.invite_id !== inviteId || metadata.company_id !== String(row.company_id) || metadata.role !== String(invite.role))) {
    throw new Error('AUTH_INVITE_USER_REVIEW_REQUIRED');
  }
  const ttl = parseInviteLinkTtl(input.linkTtlSeconds);
  const linkIsCurrent = Boolean(encrypted && expiresAt && Date.parse(expiresAt) > now.getTime() + 30_000);
  if (!linkIsCurrent) {
    if (encrypted) generation += 1;
    const lockId = randomUUID();
    const claimed = await input.store.claimInviteLink(String(row.id), lockId, new Date(now.getTime() + 5 * 60_000).toISOString(), now.toISOString());
    if (!claimed) throw new Error('AUTH_INVITE_LINK_BUSY');
    let persisted = false;
    try {
    const type = user ? 'magiclink' : 'invite';
    const { data, error } = await input.auth.generateLink({
      type,
      email: recipient,
      options: {
        redirectTo: input.redirectTo,
        data: {
          company_id: String(row.company_id), invite_id: inviteId, role: String(invite.role),
          name: safeTemplateValue(invite.name || row.template_data?.name),
          company_name: safeTemplateValue(company.name),
        },
      },
    });
    if (error || typeof data?.properties?.action_link !== 'string') throw new Error('AUTH_INVITE_LINK_GENERATION_FAILED');
    const actionLink = data.properties.action_link as string;
    encrypted = encryptInviteLink(actionLink, input.encryptionKey);
    expiresAt = new Date(now.getTime() + ttl * 1000).toISOString();
    await input.store.saveInviteLink(String(row.id), inviteId, encrypted, expiresAt, generation, lockId, Math.max(1, Number(row.payload_generation) || 1));
    persisted = true;
    } finally {
      if (!persisted) await input.store.releaseInviteLink(String(row.id), lockId).catch(() => undefined);
    }
  }
  const actionLink = decryptInviteLink(encrypted!, input.encryptionKey);
  const name = safeTemplateValue(invite.name || row.template_data?.name || recipient);
  const companyName = safeTemplateValue(company.name);
  const escapedLink = actionLink.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const bodyHtml = `<p>Dobrý den ${name},</p><p>Byli jste pozváni do firmy ${companyName} ve StavbaFlow.</p><p><a href="${escapedLink}">Přijmout pozvánku</a></p><p>Odkaz je jednorázový a brzy vyprší.</p>`;
  return { recipient, subject: `Pozvánka do ${companyName}`, body_html: bodyHtml, idempotencyKey: `outbox/${row.id}/generation/${generation}`, generation };
}

export async function createInviteLinkDependencies(input: {
  service: any;
  redirectTo: string;
  now?: Date;
}): Promise<{ store: InviteLinkStore; auth: InviteLinkAuth }> {
  const service = input.service;
  return {
    store: {
      async loadInvite(inviteId) {
        const { data: invite, error: inviteError } = await service.from('app_invites').select('id,company_id,email,name,role,accepted_at,revoked_at,expires_at').eq('id', inviteId).maybeSingle();
        if (inviteError) throw new Error('AUTH_INVITE_LOOKUP_FAILED');
        if (!invite) return { invite: null, company: null, user: null };
        const { data: company, error: companyError } = await service.from('app_companies').select('id,name,active').eq('id', invite.company_id).maybeSingle();
        if (companyError) throw new Error('AUTH_COMPANY_LOOKUP_FAILED');
        if (!company) return { invite, company: null, user: null };
        const admin = service.auth?.admin;
        if (typeof admin?.listUsers !== 'function') throw new Error('AUTH_INVITE_USER_LOOKUP_FAILED');
        let user: any = null;
        for (let page = 1; page <= 10; page += 1) {
          const { data: users, error: usersError } = await admin.listUsers({ page, perPage: 1000 });
          if (usersError) throw new Error('AUTH_INVITE_USER_LOOKUP_FAILED');
          const pageUsers = users?.users || [];
          user = pageUsers.find((candidate: any) => String(candidate.email || '').trim().toLowerCase() === String(invite.email || '').trim().toLowerCase()) || null;
          if (user || pageUsers.length < 1000) break;
        }
        return { invite, company, user };
      },
      async claimInviteLink(rowId, lockId, lockUntil, now) {
        const { data, error } = await service.from('app_email_outbox').update({ invite_link_lock_id: lockId, invite_link_lock_until: lockUntil, updated_at: now })
          .eq('id', rowId).eq('status', 'processing').or(`invite_link_lock_id.is.null,invite_link_lock_until.lte.${now}`).select('id').maybeSingle();
        if (error) throw new Error('AUTH_INVITE_LINK_LOCK_FAILED');
        return Boolean(data?.id);
      },
      async releaseInviteLink(rowId, lockId) {
        const { error } = await service.from('app_email_outbox').update({ invite_link_lock_id: null, invite_link_lock_until: null }).eq('id', rowId).eq('invite_link_lock_id', lockId);
        if (error) throw new Error('AUTH_INVITE_LINK_LOCK_RELEASE_FAILED');
      },
      async saveInviteLink(rowId, inviteId, encrypted, expiresAt, generation, lockId, expectedGeneration) {
        const { data, error } = await service.from('app_email_outbox').update({ invite_link_ciphertext: encrypted, invite_link_expires_at: expiresAt, payload_generation: generation, invite_link_lock_id: null, invite_link_lock_until: null, updated_at: new Date().toISOString() }).eq('id', rowId).eq('invite_id', inviteId).eq('status', 'processing').eq('invite_link_lock_id', lockId).eq('payload_generation', expectedGeneration).select('id').maybeSingle();
        if (error || !data) throw new Error('AUTH_INVITE_LINK_PERSIST_FAILED');
      },
      async clearInviteLink(rowId) {
        const { error } = await service.from('app_email_outbox').update({ invite_link_ciphertext: null, invite_link_expires_at: null, invite_link_lock_id: null, invite_link_lock_until: null, updated_at: new Date().toISOString() }).eq('id', rowId);
        if (error) throw new Error('AUTH_INVITE_LINK_CLEANUP_FAILED');
      },
    },
    auth: {
      async generateLink(args) {
        return service.auth.admin.generateLink({ type: args.type, email: args.email, options: { redirectTo: args.options.redirectTo, data: args.options.data } });
      },
    },
  };
}

export function configuredInviteService(): any {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('OUTBOX_SERVER_CONFIGURATION_MISSING');
  return createServerlessSupabaseClient(url, key, { auth: { persistSession: false } });
}
