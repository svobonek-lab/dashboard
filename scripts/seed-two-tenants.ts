import { createClient, type SupabaseClient } from '@supabase/supabase-js';

type SeedTenant = {
  key: 'A' | 'B';
  companyName: string;
  companySlug: string;
  owner: { name: string; email: string; passwordVariable: string; role: 'owner' };
  employee: { name: string; email: string; passwordVariable: string; role: 'employee' };
};

export function buildTenantLeadFixture(key: 'A' | 'B', companyId: string, employeeId: string) {
  return {
    company_id: companyId,
    title: `StavbaFlow E2E Isolation Lead ${key}`,
    customer: `Synthetic Customer ${key}`,
    email: `e2e-lead-${key.toLowerCase()}@stavbaflow.example.test`,
    phone: '+420700000000',
    address: `Synthetic address ${key}`,
    description: 'Synthetic staging fixture for tenant isolation and Playwright acceptance.',
    status: 'new',
    value: 0,
    source: 'manual',
    assigned_to: employeeId,
  };
}

const SYNTHETIC_PDF = Buffer.from('%PDF-1.4\n% StavbaFlow synthetic isolation fixture\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n');

export function buildTenantLeadFileFixture(key: 'A' | 'B', companyId: string, leadId: string, authorId: string) {
  const id = key === 'A'
    ? 'f1000000-0000-4000-8000-000000000001'
    : 'f2000000-0000-4000-8000-000000000002';
  const fileName = `isolation-${key.toLowerCase()}.pdf`;
  return {
    id,
    company_id: companyId,
    lead_id: leadId,
    author_id: authorId,
    storage_path: `${companyId}/${leadId}/${id}-${fileName}`,
    file_name: fileName,
    mime_type: 'application/pdf',
    size_bytes: SYNTHETIC_PDF.byteLength,
  };
}

export function buildTenantIsolationFixtures(
  key: 'A' | 'B',
  companyId: string,
  ownerId: string,
  employeeId: string,
  leadId: string,
  now = Date.now(),
) {
  return {
    note: {
      company_id: companyId,
      lead_id: leadId,
      author: employeeId,
      body: `Synthetic E2E isolation note ${key}`,
    },
    invite: {
      company_id: companyId,
      email: `e2e-isolation-invite-${key.toLowerCase()}@stavbaflow.example.test`,
      name: `Synthetic Isolation Invite ${key}`,
      role: 'employee',
      expires_at: new Date(now + 30 * 24 * 60 * 60 * 1000).toISOString(),
    },
    audit: {
      company_id: companyId,
      actor: ownerId,
      action: 'E2E_ISOLATION_FIXTURE',
      entity_id: leadId,
    },
  };
}

const tenants: SeedTenant[] = [
  {
    key: 'A', companyName: 'StavbaFlow Synthetic Company A', companySlug: 'e2e-synthetic-company-a',
    owner: { name: 'Synthetic Owner A', email: 'owner-a@stavbaflow.example.test', passwordVariable: 'STAGING_OWNER_A_PASSWORD', role: 'owner' },
    employee: { name: 'Synthetic Employee A', email: 'employee-a@stavbaflow.example.test', passwordVariable: 'STAGING_EMPLOYEE_A_PASSWORD', role: 'employee' },
  },
  {
    key: 'B', companyName: 'StavbaFlow Synthetic Company B', companySlug: 'e2e-synthetic-company-b',
    owner: { name: 'Synthetic Owner B', email: 'owner-b@stavbaflow.example.test', passwordVariable: 'STAGING_OWNER_B_PASSWORD', role: 'owner' },
    employee: { name: 'Synthetic Employee B', email: 'employee-b@stavbaflow.example.test', passwordVariable: 'STAGING_EMPLOYEE_B_PASSWORD', role: 'employee' },
  },
];

export function assertStagingSeedTarget(environment: Record<string, string | undefined>): { url: string; ref: string } {
  const url = String(environment.STAGING_SUPABASE_URL || '').trim();
  const ref = String(environment.STAGING_SUPABASE_PROJECT_REF || '').trim();
  const productionRef = String(environment.PRODUCTION_SUPABASE_PROJECT_REF || '').trim();
  if (!/^[a-z0-9]{20}$/.test(ref) || !/^[a-z0-9]{20}$/.test(productionRef) || ref === productionRef) {
    throw new Error('Refusing to seed: staging and production project refs must be valid and different.');
  }
  let parsed: URL;
  try { parsed = new URL(url); } catch { throw new Error('Refusing to seed: STAGING_SUPABASE_URL is invalid.'); }
  if (parsed.protocol !== 'https:' || parsed.hostname !== `${ref}.supabase.co` || parsed.username || parsed.password || parsed.port || parsed.search || parsed.hash) {
    throw new Error('Refusing to seed: URL must be the declared hosted staging Supabase project.');
  }
  return { url: parsed.origin, ref };
}

function required(environment: Record<string, string | undefined>, name: string): string {
  const value = String(environment[name] || '').trim();
  if (!value) throw new Error(`Missing required environment variable ${name}.`);
  return value;
}

async function findAuthUser(client: SupabaseClient, email: string) {
  for (let page = 1; page <= 100; page += 1) {
    const { data, error } = await client.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error('Unable to inspect staging Auth users.');
    const users = data.users as Array<{ id: string; email?: string }>;
    const found = users.find(user => user.email?.toLowerCase() === email.toLowerCase());
    if (found) return found;
    if (data.users.length < 1000) return null;
  }
  throw new Error('Staging Auth user search exceeded the safety limit.');
}

async function ensureAuthUser(client: SupabaseClient, name: string, email: string, role: 'owner' | 'employee', password: string): Promise<string> {
  const existing = await findAuthUser(client, email);
  if (existing) {
    const { data, error } = await client.auth.admin.updateUserById(existing.id, { password, email_confirm: true, user_metadata: { name, role } });
    if (error || !data.user) throw new Error(`Unable to refresh synthetic Auth user ${email}.`);
    return data.user.id;
  }
  const { data, error } = await client.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { name, role } });
  if (error || !data.user) throw new Error(`Unable to create synthetic Auth user ${email}.`);
  return data.user.id;
}

async function ensureCompany(client: SupabaseClient, name: string, slug: string): Promise<string> {
  const existing = await client.from('app_companies').select('id').eq('slug', slug).maybeSingle();
  if (existing.error) throw new Error('Unable to inspect staging company metadata.');
  if (existing.data?.id) {
    const updated = await client.from('app_companies').update({ name, active: true }).eq('id', existing.data.id);
    if (updated.error) throw new Error('Unable to activate synthetic staging company.');
    return existing.data.id;
  }
  const created = await client.from('app_companies').insert({ name, slug, active: true }).select('id').single();
  if (created.error || !created.data?.id) throw new Error('Unable to create synthetic staging company.');
  return created.data.id;
}

async function ensureMembership(client: SupabaseClient, companyId: string, userId: string, name: string, email: string, role: 'owner' | 'employee') {
  const existing = await client.from('app_members').select('company_id,user_id').eq('company_id', companyId).eq('user_id', userId).maybeSingle();
  if (existing.error) throw new Error('Unable to inspect synthetic staging membership.');
  if (existing.data) {
    const updated = await client.from('app_members').update({ name, email, role, active: true }).eq('company_id', companyId).eq('user_id', userId);
    if (updated.error) throw new Error('Unable to refresh synthetic staging membership.');
    return;
  }
  const inserted = await client.from('app_members').insert({ company_id: companyId, user_id: userId, name, email, role, active: true });
  if (inserted.error) throw new Error('Unable to create synthetic staging membership.');
}

async function ensureLeadFixture(client: SupabaseClient, lead: ReturnType<typeof buildTenantLeadFixture>): Promise<string> {
  const existing = await client.from('app_leads').select('id')
    .eq('company_id', lead.company_id)
    .eq('title', lead.title)
    .eq('email', lead.email)
    .limit(1)
    .maybeSingle();
  if (existing.error) throw new Error('Unable to inspect synthetic staging lead fixture.');
  if (existing.data?.id) {
    const updated = await client.from('app_leads').update(lead).eq('id', existing.data.id).eq('company_id', lead.company_id);
    if (updated.error) throw new Error('Unable to refresh synthetic staging lead fixture.');
    return existing.data.id;
  }
  const inserted = await client.from('app_leads').insert(lead).select('id').single();
  if (inserted.error || !inserted.data?.id) throw new Error('Unable to create synthetic staging lead fixture.');
  return inserted.data.id;
}

async function ensureNoteFixture(client: SupabaseClient, note: ReturnType<typeof buildTenantIsolationFixtures>['note']) {
  const existing = await client.from('app_notes').select('id')
    .eq('company_id', note.company_id)
    .eq('lead_id', note.lead_id)
    .eq('body', note.body)
    .maybeSingle();
  if (existing.error) throw new Error('Unable to inspect synthetic staging note fixture.');
  if (existing.data?.id) return existing.data.id;
  const inserted = await client.from('app_notes').insert(note).select('id').single();
  if (inserted.error || !inserted.data?.id) throw new Error('Unable to create synthetic staging note fixture.');
  return inserted.data.id;
}

async function ensureInviteFixture(client: SupabaseClient, invite: ReturnType<typeof buildTenantIsolationFixtures>['invite']) {
  const existing = await client.from('app_invites').select('id')
    .eq('company_id', invite.company_id)
    .eq('email', invite.email)
    .maybeSingle();
  if (existing.error) throw new Error('Unable to inspect synthetic staging invitation fixture.');
  if (existing.data?.id) return existing.data.id;
  const inserted = await client.from('app_invites').insert(invite).select('id').single();
  if (inserted.error || !inserted.data?.id) throw new Error('Unable to create synthetic staging invitation fixture.');
  return inserted.data.id;
}

async function ensureAuditFixture(client: SupabaseClient, audit: ReturnType<typeof buildTenantIsolationFixtures>['audit']) {
  const existing = await client.from('app_audit').select('id')
    .eq('company_id', audit.company_id)
    .eq('actor', audit.actor)
    .eq('action', audit.action)
    .eq('entity_id', audit.entity_id)
    .maybeSingle();
  if (existing.error) throw new Error('Unable to inspect synthetic staging audit fixture.');
  if (existing.data?.id) return existing.data.id;
  const inserted = await client.from('app_audit').insert(audit).select('id').single();
  if (inserted.error || !inserted.data?.id) throw new Error('Unable to create synthetic staging audit fixture.');
  return inserted.data.id;
}

async function ensureLeadFileFixture(client: SupabaseClient, file: ReturnType<typeof buildTenantLeadFileFixture>): Promise<string> {
  const existing = await client.from('app_lead_files').select('id')
    .eq('company_id', file.company_id)
    .eq('storage_path', file.storage_path)
    .maybeSingle();
  if (existing.error) throw new Error('Unable to inspect the staging lead-file contract.');

  const uploaded = await client.storage.from('lead-files').upload(file.storage_path, SYNTHETIC_PDF, {
    contentType: file.mime_type,
    upsert: true,
  });
  if (uploaded.error) throw new Error('Unable to upload the synthetic staging Storage fixture.');

  if (existing.data?.id) return file.storage_path;
  const inserted = await client.from('app_lead_files').insert(file).select('id').single();
  if (inserted.error || !inserted.data?.id) {
    await client.storage.from('lead-files').remove([file.storage_path]);
    throw new Error('Unable to create the synthetic staging file metadata.');
  }
  return file.storage_path;
}

export async function seedTwoTenants(environment: Record<string, string | undefined>, apply = false) {
  const { url, ref } = assertStagingSeedTarget(environment);
  if (!apply) return { applied: false, stagingProjectRef: ref, tenants: [] };
  const serviceRoleKey = required(environment, 'STAGING_SUPABASE_SERVICE_ROLE_KEY');
  const users = tenants.flatMap(tenant => [tenant.owner, tenant.employee]);
  const passwords = new Map(users.map(user => [user.email, required(environment, user.passwordVariable)]));
  const client = createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const seedLeadFiles = environment.STAGING_LEAD_FILES_ENABLED === 'true';
  const result = [];
  for (const tenant of tenants) {
    const companyId = await ensureCompany(client, tenant.companyName, tenant.companySlug);
    const ownerId = await ensureAuthUser(client, tenant.owner.name, tenant.owner.email, tenant.owner.role, passwords.get(tenant.owner.email)!);
    const employeeId = await ensureAuthUser(client, tenant.employee.name, tenant.employee.email, tenant.employee.role, passwords.get(tenant.employee.email)!);
    await ensureMembership(client, companyId, ownerId, tenant.owner.name, tenant.owner.email, 'owner');
    await ensureMembership(client, companyId, employeeId, tenant.employee.name, tenant.employee.email, 'employee');
    const leadId = await ensureLeadFixture(client, buildTenantLeadFixture(tenant.key, companyId, employeeId));
    const isolation = buildTenantIsolationFixtures(tenant.key, companyId, ownerId, employeeId, leadId);
    await ensureNoteFixture(client, isolation.note);
    await ensureInviteFixture(client, isolation.invite);
    await ensureAuditFixture(client, isolation.audit);
    const leadFilePath = seedLeadFiles
      ? await ensureLeadFileFixture(client, buildTenantLeadFileFixture(tenant.key, companyId, leadId, ownerId))
      : null;
    result.push({ key: tenant.key, companyId, ownerId, employeeId, leadId, leadFilePath, ownerEmail: tenant.owner.email, employeeEmail: tenant.employee.email });
  }
  return { applied: apply, stagingProjectRef: ref, tenants: result };
}

async function main() {
  const apply = process.argv.includes('--apply');
  if (process.argv.slice(2).some(argument => argument !== '--apply')) throw new Error('Only --apply is supported.');
  const environment = process.env;
  assertStagingSeedTarget(environment);
  if (!apply) {
    console.log('Staging target validated. No rows written. Set --apply to create or refresh the four synthetic accounts and memberships. File fixtures are opt-in via STAGING_LEAD_FILES_ENABLED=true after the notes/files migration is applied.');
    return;
  }
  const result = await seedTwoTenants(environment, true);
  console.log(JSON.stringify(result, null, 2));
}

if (process.argv[1]?.replaceAll('\\', '/').endsWith('/scripts/seed-two-tenants.ts')) {
  main().catch(error => {
    console.error(error instanceof Error ? error.message : 'Staging tenant seed failed.');
    process.exitCode = 1;
  });
}
