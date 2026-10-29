import { randomBytes } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { assertStagingSeedTarget } from './seed-two-tenants';

type Role = 'owner' | 'employee';
type Entry = { companyId?: string; userId?: string; leadId?: string; slug: string; email: string };
type Manifest = { projectRef: string; runId: string; entries: Entry[] };

export function loadFixturePlan(runId: string, smoke = false) {
  if (!/^[a-f0-9]{12}$/.test(runId)) throw new Error('Invalid synthetic load run ID.');
  return [
    ...Array.from({ length: smoke ? 1 : 30 }, (_, index) => ({ role: 'owner' as Role, index: index + 1 })),
    ...Array.from({ length: smoke ? 1 : 100 }, (_, index) => ({ role: 'employee' as Role, index: index + 1 })),
  ].map(({ role, index }) => {
    const slug = `load-${runId}-${role}-${String(index).padStart(3, '0')}`;
    return { role, slug, email: `${slug}@stavbaflow.example.test` };
  });
}

function required(environment: NodeJS.ProcessEnv, name: string): string {
  const value = environment[name]?.trim();
  if (!value) throw new Error(`Missing ${name}.`);
  return value;
}

async function saveManifest(path: string, manifest: Manifest) {
  await writeFile(path, JSON.stringify(manifest), { encoding: 'utf8', mode: 0o600 });
}

export async function provisionLoadFixtures(environment = process.env, smoke = false) {
  const { url, ref } = assertStagingSeedTarget(environment);
  const serviceKey = required(environment, 'STAGING_SUPABASE_SERVICE_ROLE_KEY');
  const publishableKey = required(environment, 'STAGING_SUPABASE_PUBLISHABLE_KEY');
  const outputRoot = required(environment, 'STAGING_LOAD_OUTPUT_DIR');
  const runId = randomBytes(6).toString('hex');
  const service = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const browser = createClient(url, publishableKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const manifest: Manifest = { projectRef: ref, runId, entries: [] };
  const owners: object[] = [];
  const employees: object[] = [];
  await mkdir(outputRoot, { recursive: true, mode: 0o700 });
  const manifestPath = join(outputRoot, 'manifest.json');
  await saveManifest(manifestPath, manifest);

  for (const item of loadFixturePlan(runId, smoke)) {
    const entry: Entry = { slug: item.slug, email: item.email };
    manifest.entries.push(entry);
    const company = await service.from('app_companies').insert({
      name: `Synthetic Load ${item.slug}`, slug: item.slug, active: true,
      subscription_status: 'active', plan: 'starter', public_form: false,
    }).select('id').single();
    if (company.error || !company.data?.id) {
      throw new Error(`Unable to create a staging load company (${company.error?.code || 'UNKNOWN'}, HTTP ${company.status}).`);
    }
    entry.companyId = company.data.id;
    await saveManifest(manifestPath, manifest);

    const password = randomBytes(30).toString('base64url');
    const user = await service.auth.admin.createUser({
      email: item.email, password, email_confirm: true,
      user_metadata: { name: `Synthetic Load ${item.role}` },
    });
    if (user.error || !user.data.user) {
      throw new Error(`Unable to create a staging load Auth user (${user.error?.code || 'UNKNOWN'}, HTTP ${user.error?.status || 0}).`);
    }
    entry.userId = user.data.user.id;
    await saveManifest(manifestPath, manifest);

    const member = await service.from('app_members').insert({
      company_id: entry.companyId, user_id: entry.userId, name: `Synthetic Load ${item.role}`,
      email: item.email, role: item.role, active: true,
    });
    if (member.error) throw new Error(`Unable to create a staging load membership (${member.error.code || 'UNKNOWN'}, HTTP ${member.status}).`);

    const lead = await service.from('app_leads').insert({
      company_id: entry.companyId, title: `Synthetic Load Lead ${item.slug}`,
      customer: 'Synthetic Load Customer', email: item.email, phone: '+420700000000',
      status: 'new', source: 'manual', value: 0,
      assigned_to: item.role === 'employee' ? entry.userId : null,
    }).select('id').single();
    if (lead.error || !lead.data?.id) {
      throw new Error(`Unable to create a staging load lead (${lead.error?.code || 'UNKNOWN'}, HTTP ${lead.status}).`);
    }
    entry.leadId = lead.data.id;
    await saveManifest(manifestPath, manifest);

    // Supabase Auth applies an IP token bucket to password sign-ins. Pace the
    // one-shot fixture run so it does not exhaust the burst allowance.
    await new Promise((resolve) => setTimeout(resolve, 2100));
    let session = await browser.auth.signInWithPassword({ email: item.email, password });
    for (let attempt = 0; session.error?.status === 429 && attempt < 5; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 5000));
      session = await browser.auth.signInWithPassword({ email: item.email, password });
    }
    const token = session.data.session?.access_token;
    if (session.error || !token) {
      throw new Error(`Unable to sign in a staging load user (${session.error?.code || 'UNKNOWN'}, HTTP ${session.error?.status || 0}, fixture ${manifest.entries.length}).`);
    }
    const claims = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8'));
    if (claims.sub !== entry.userId || claims.app_metadata?.tenant_id !== entry.companyId) {
      throw new Error('Staging load token is missing its exact tenant claim.');
    }
    const fixture = { accessToken: token, companyId: entry.companyId, userId: entry.userId,
      role: item.role, leadId: entry.leadId, restoreStatus: 'new' };
    (item.role === 'owner' ? owners : employees).push(fixture);
  }

  const ownerPath = join(outputRoot, 'owners.json');
  const employeePath = join(outputRoot, 'employees.json');
  await writeFile(ownerPath, JSON.stringify(owners), { encoding: 'utf8', mode: 0o600 });
  await writeFile(employeePath, JSON.stringify(employees), { encoding: 'utf8', mode: 0o600 });
  return { runId, count: manifest.entries.length, manifestPath, ownerPath, employeePath };
}

export async function cleanupLoadFixtures(manifestPath: string, environment = process.env) {
  const { url, ref } = assertStagingSeedTarget(environment);
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as Manifest;
  if (manifest.projectRef !== ref || !/^[a-f0-9]{12}$/.test(manifest.runId)
    || !Array.isArray(manifest.entries) || manifest.entries.length > 130) {
    throw new Error('Refusing to clean an invalid staging load manifest.');
  }
  const seen = new Set<string>();
  for (const entry of manifest.entries) {
    if (typeof entry.slug !== 'string'
      || !/^load-[a-f0-9]{12}-(owner|employee)-\d{3}$/.test(entry.slug)
      || !entry.slug.startsWith(`load-${manifest.runId}-`)
      || entry.email !== `${entry.slug}@stavbaflow.example.test`
      || seen.has(entry.slug)) {
      throw new Error('Refusing a non-load fixture.');
    }
    seen.add(entry.slug);
  }
  const service = createClient(url, required(environment, 'STAGING_SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  for (const entry of [...manifest.entries].reverse()) {
    if (entry.userId) {
      const user = await service.auth.admin.getUserById(entry.userId);
      if ((user.error && user.error.status !== 404)
        || (user.data.user && user.data.user.email !== entry.email)) {
        throw new Error('Load Auth user identity mismatch.');
      }
    }
    if (entry.companyId) {
      const company = await service.from('app_companies').select('slug').eq('id', entry.companyId).maybeSingle();
      if (company.error || (company.data && company.data.slug !== entry.slug)) {
        throw new Error(`Load company identity mismatch (${company.error?.code || 'SLUG'}, HTTP ${company.status}).`);
      }
      if (company.data) {
        for (const table of ['app_audit', 'app_leads', 'app_members'] as const) {
          const deletion = await service.from(table).delete().eq('company_id', entry.companyId);
          if (deletion.error) throw new Error(`Unable to remove synthetic rows from ${table}.`);
        }
        const deletion = await service.from('app_companies').delete().eq('id', entry.companyId).eq('slug', entry.slug);
        if (deletion.error) throw new Error('Unable to remove synthetic load company.');
      }
    }
    if (entry.userId) {
      const deletion = await service.auth.admin.deleteUser(entry.userId);
      if (deletion.error && deletion.error.status !== 404) throw new Error('Unable to remove synthetic load Auth user.');
    }
  }
  return { runId: manifest.runId, count: manifest.entries.length };
}

export async function recoverLoadFixtures(runId: string, environment = process.env) {
  const { url, ref } = assertStagingSeedTarget(environment);
  if (!/^[a-f0-9]{12}$/.test(runId)) throw new Error('Refusing an invalid staging load recovery ID.');
  const service = createClient(url, required(environment, 'STAGING_SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const prefix = `load-${runId}-`;
  const companies = await service.from('app_companies').select('id,slug,name').like('slug', `${prefix}%`).limit(200);
  if (companies.error) throw new Error(`Unable to list staging load companies (${companies.error.code || 'UNKNOWN'}, HTTP ${companies.status}).`);
  if ((companies.data?.length || 0) > 130) throw new Error('Refusing to recover more than 130 load companies.');
  const entries = new Map<string, Entry>();
  for (const company of companies.data || []) {
    if (!/^load-[a-f0-9]{12}-(owner|employee)-\d{3}$/.test(company.slug)
      || !company.slug.startsWith(prefix) || company.name !== `Synthetic Load ${company.slug}`) {
      throw new Error('Refusing a company outside the exact synthetic load run.');
    }
    entries.set(company.slug, { slug: company.slug, email: `${company.slug}@stavbaflow.example.test`, companyId: company.id });
  }
  for (let page = 1; page <= 100; page += 1) {
    const response = await service.auth.admin.listUsers({ page, perPage: 1000 });
    if (response.error) throw new Error(`Unable to list staging load users (${response.error.code || 'UNKNOWN'}, HTTP ${response.error.status || 0}).`);
    for (const user of response.data.users) {
      const email = user.email || '';
      if (!email.startsWith(prefix) || !email.endsWith('@stavbaflow.example.test')) continue;
      const slug = email.slice(0, -'@stavbaflow.example.test'.length);
      if (!/^load-[a-f0-9]{12}-(owner|employee)-\d{3}$/.test(slug)
        || !slug.startsWith(prefix) || entries.size > 130) {
        throw new Error('Refusing an Auth user outside the exact synthetic load run.');
      }
      const entry = entries.get(slug) || { slug, email };
      entry.userId = user.id;
      entries.set(slug, entry);
    }
    if (response.data.users.length < 1000) break;
  }
  if (entries.size > 130) throw new Error('Refusing to recover more than 130 load identities.');
  const outputRoot = required(environment, 'STAGING_LOAD_OUTPUT_DIR');
  await mkdir(outputRoot, { recursive: true, mode: 0o700 });
  const manifestPath = join(outputRoot, 'recovery-manifest.json');
  await saveManifest(manifestPath, { projectRef: ref, runId, entries: [...entries.values()] });
  return cleanupLoadFixtures(manifestPath, environment);
}

async function main() {
  const command = process.argv[2];
  if ((command === '--apply' || command === '--smoke') && process.argv.length === 3) {
    const result = await provisionLoadFixtures(process.env, command === '--smoke');
    if (command === '--smoke') {
      await cleanupLoadFixtures(result.manifestPath);
      console.log(`Created and removed ${result.count} synthetic staging smoke fixtures.`);
      return;
    }
    if (process.env.GITHUB_OUTPUT) {
      await writeFile(process.env.GITHUB_OUTPUT,
        `owner_file=${result.ownerPath}\nemployee_file=${result.employeePath}\nmanifest_file=${result.manifestPath}\nrun_id=${result.runId}\n`,
        { flag: 'a' });
    }
    console.log(`Created ${result.count} synthetic staging load fixtures for run ${result.runId}.`);
  } else if (command === '--cleanup' && process.argv.length === 3) {
    const result = await cleanupLoadFixtures(required(process.env, 'STAGING_LOAD_MANIFEST_FILE'));
    console.log(`Removed ${result.count} synthetic staging load fixtures for run ${result.runId}.`);
  } else if (command === '--recover' && process.argv.length === 3) {
    const result = await recoverLoadFixtures(required(process.env, 'STAGING_LOAD_RUN_ID'));
    console.log(`Recovered ${result.count} synthetic staging load identities for run ${result.runId}.`);
  } else {
    throw new Error('Use --smoke, --apply, --cleanup or --recover with the declared staging target.');
  }
}

if (process.argv[1]?.replaceAll('\\', '/').endsWith('/scripts/seed-load-fixtures.ts')) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : 'Staging load fixture operation failed.');
    process.exitCode = 1;
  });
}
