import { randomBytes } from 'node:crypto';
import { appendFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const OWNER_EMAIL = 'billing-owner-c@stavbaflow.example.test';

function required(env, name) {
  const value = String(env[name] || '').trim();
  if (!value) throw new Error(`Missing private billing credential path: ${name}.`);
  return value;
}

export function assertBillingCompanyCCredentialsBranch(repository, ref) {
  if (repository !== 'svobonek-lab/dashboard' || ref !== 'refs/heads/codex/billing-blocked-to-granted') {
    throw new Error('Refusing company C credentials outside the approved staging billing branch.');
  }
}

function privateFilePath(env) {
  const file = resolve(required(env, 'STAGING_BILLING_CREDENTIALS_FILE'));
  const tempRoot = resolve(required(env, 'RUNNER_TEMP'));
  const relative = path.relative(tempRoot, file);
  if (!relative || relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throw new Error('Refusing company C credentials outside this run temporary directory.');
  }
  return file;
}

export async function prepareBillingCompanyCCredentials(env = process.env, writeMaskCommand = (value) => process.stdout.write(value)) {
  assertBillingCompanyCCredentialsBranch(env.GITHUB_REPOSITORY, env.GITHUB_REF);
  const file = privateFilePath(env);
  const password = randomBytes(36).toString('base64url');
  const githubEnv = required(env, 'GITHUB_ENV');
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, JSON.stringify({ email: OWNER_EMAIL, password }, null, 2), { encoding: 'utf8', mode: 0o600 });
  writeMaskCommand(`::add-mask::${password}\n`);
  await appendFile(githubEnv, `STAGING_OWNER_C_PASSWORD=${password}\n`, { encoding: 'utf8', mode: 0o600 });
  return { ownerEmail: OWNER_EMAIL, credentialsFile: file };
}

export async function loadBillingCompanyCCredentials(env = process.env, writeMaskCommand = (value) => process.stdout.write(value)) {
  assertBillingCompanyCCredentialsBranch(env.GITHUB_REPOSITORY, env.GITHUB_REF);
  const file = privateFilePath(env);
  const githubEnv = required(env, 'GITHUB_ENV');
  let credentials;
  try { credentials = JSON.parse(await readFile(file, 'utf8')); }
  catch { throw new Error('Company C private credential artifact is missing or invalid.'); }
  if (credentials?.email !== OWNER_EMAIL || typeof credentials?.password !== 'string' ||
      !/^[A-Za-z0-9_-]{40,}$/.test(credentials.password)) {
    throw new Error('Company C private credential artifact does not contain the expected synthetic account.');
  }
  writeMaskCommand(`::add-mask::${credentials.password}\n`);
  await appendFile(githubEnv, `STAGING_OWNER_C_PASSWORD=${credentials.password}\n`, { encoding: 'utf8', mode: 0o600 });
  return { ownerEmail: OWNER_EMAIL };
}

async function main() {
  const action = process.argv[2];
  if (action === 'prepare') {
    await prepareBillingCompanyCCredentials(process.env);
    console.log('Synthetic company C credentials are available only in this private, one-day Actions artifact.');
    return;
  }
  if (action === 'load') {
    await loadBillingCompanyCCredentials(process.env);
    console.log('Private synthetic company C credentials are ready for the staging verification job.');
    return;
  }
  throw new Error('Expected prepare or load.');
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch(error => {
    console.error(error instanceof Error ? error.message : 'Private company C credentials failed.');
    process.exitCode = 1;
  });
}
