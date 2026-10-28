import assert from 'node:assert/strict';
import test from 'node:test';

test('staging Preview validation accepts only a distinct HTTPS Vercel deployment', async () => {
  const module = await import('../scripts/validate-staging-preview.mjs').catch(() => ({})) as {
    validateStagingPreview?: (preview: string, production: string) => string;
  };
  assert.equal(typeof module.validateStagingPreview, 'function');
  const validate = module.validateStagingPreview!;
  assert.equal(validate('https://dashboard-git-branch-svobonek-6462s-projects.vercel.app/path', 'https://dashboard.vercel.app'), 'https://dashboard-git-branch-svobonek-6462s-projects.vercel.app');
  assert.throws(() => validate('https://attacker.example/steal', 'https://dashboard.vercel.app'), /trusted Vercel Preview/);
  assert.throws(() => validate('https://dashboard-git-branch-other-team.vercel.app', 'https://dashboard.vercel.app'), /trusted Vercel Preview/);
  assert.throws(() => validate('https://vercel.app.attacker.example', 'https://dashboard.vercel.app'), /trusted Vercel Preview/);
  assert.throws(() => validate('https://dashboard-git-branch-svobonek-6462s-projects.vercel.app', 'https://dashboard-git-branch-svobonek-6462s-projects.vercel.app/path'), /distinct from production/);
  assert.throws(() => validate('https://user:secret@dashboard-git-branch-team.vercel.app', 'https://dashboard.vercel.app'), /trusted Vercel Preview/);
});
