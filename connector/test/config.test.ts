import assert from 'node:assert/strict';
import test from 'node:test';
import { parseConnectorConfig } from '../src/config.js';

const expectedCompanyId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

const config = (companyId: string) => ({
  apiBaseUrl: 'https://app.example.test',
  stateRoot: '/var/lib/stavbaflow',
  identityPath: '/var/lib/stavbaflow/connector-identity.json',
  mappingPath: '/var/lib/stavbaflow/mapping.json',
  enrollmentCodeFile: '/run/secrets/enrollment-code',
  syncIntervalSeconds: 300,
  expectedCompanyId: companyId,
  database: {
    driver: 'postgres', host: 'db.internal', port: 5432, database: 'company',
    username: 'reader', passwordFile: '/run/secrets/source-db-password',
  },
});

test('connector config accepts a valid expected company id for tenant-pinned deployment', () => {
  const parsed = parseConnectorConfig(config(expectedCompanyId));
  assert.equal(parsed.expectedCompanyId, expectedCompanyId);
});

test('connector config rejects a malformed expected company id', () => {
  assert.throws(() => parseConnectorConfig(config('not-a-company-id')), /expectedCompanyId is invalid/);
});
