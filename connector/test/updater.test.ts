import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

test('updater is digest-pinned, bounded and restores the exact previous digest', async () => {
  const script = await readFile(join(root, 'scripts/update.ps1'), 'utf8');
  assert.match(script, /sha256:\[a-f0-9\]\{64\}/);
  assert.match(script, /Action='noop'/);
  assert.match(script, /Action='disabled'/);
  assert.match(script, /HealthTimeoutSeconds -lt 15/);
  assert.match(script, /lastHeartbeatAt/);
  assert.match(script, /previousDigest=\$priorDigest/);
  assert.match(script, /STAVBAFLOW_CONNECTOR_IMAGE = "\$\(\$manifest\.image\)@\$priorDigest"/);
  assert.doesNotMatch(script, /docker\.sock|Write-Host.*(?:secret|token|password)/i);
});

test('installer validates the dedicated DSM path and never creates placeholder secrets', async () => {
  const script = await readFile(join(root, 'scripts/install.ps1'), 'utf8');
  assert.match(script, /\^\/volume\[0-9\]\+\/docker\/stavbaflow\$/);
  assert.match(script, /Missing non-empty secret file/);
  assert.doesNotMatch(script, /Set-Content[^\n]+(?:password|enrollment-code)/i);
});

test('release manifest accepts only immutable StavbaFlow image digests', async () => {
  const schema = JSON.parse(await readFile(join(root, 'release-manifest.schema.json'), 'utf8'));
  assert.equal(schema.properties.image.const, 'ghcr.io/svobonek-lab/stavbaflow-connector');
  assert.equal(schema.properties.digest.pattern, '^sha256:[a-f0-9]{64}$');
  assert.equal(schema.additionalProperties, false);
});
