import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const connectorRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

test('container runs non-root with a local-only health probe', async () => {
  const dockerfile = await readFile(join(connectorRoot, 'Dockerfile'), 'utf8');
  assert.match(dockerfile, /USER 10001:10001/);
  assert.match(dockerfile, /127\.0\.0\.1:8787\/health/);
  assert.match(dockerfile, /apt-get upgrade -y/);
  assert.match(dockerfile, /rm -rf \/usr\/local\/lib\/node_modules\/npm/);
  assert.doesNotMatch(dockerfile, /COPY\s+\.\s+\./);
});

test('Synology compose publishes no port and hardens the container', async () => {
  const compose = await readFile(join(connectorRoot, 'compose.yaml'), 'utf8');
  assert.doesNotMatch(compose, /^\s+ports:/m);
  assert.match(compose, /read_only: true/);
  assert.match(compose, /no-new-privileges:true/);
  assert.match(compose, /\/volume1\/docker\/stavbaflow\/config:.*:ro/);
  assert.match(compose, /\/volume1\/docker\/stavbaflow\/state:.*:rw/);
  assert.doesNotMatch(compose, /(?:password|secret|token)\s*=\s*\S+/i);
});

test('root Synology project uses the released agent and file-backed enrollment code', async () => {
  const compose = await readFile(join(connectorRoot, '..', 'docker-compose.synology.yml'), 'utf8');
  assert.match(compose, /DB_HOST: \$\{DB_HOST:\?/);
  assert.match(compose, /DB_PORT: \$\{DB_PORT:\?/);
  assert.match(compose, /file: \$\{CONNECTOR_SECRET:\?/);
  assert.match(compose, /read_only: true/);
  assert.doesNotMatch(compose, /^\s+ports:/m);
  assert.doesNotMatch(compose, /npm install|node server\.js|API_TOKEN=/);
});

test('example configuration contains paths and placeholders but no secret value', async () => {
  const config = JSON.parse(await readFile(join(connectorRoot, 'config.example.json'), 'utf8')) as Record<string, unknown>;
  const serialized = JSON.stringify(config);
  assert.match(serialized, /CUSTOMER_READ_ONLY_USER/);
  assert.match(serialized, /\/run\/secrets\/source_db_password/);
  assert.doesNotMatch(serialized, /AP11|service_role|eyJ[A-Za-z0-9_-]+\./);
});
