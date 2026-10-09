import test from 'node:test';
import assert from 'node:assert/strict';
import { APP_SCHEMA_WRITES_BLOCKED_MESSAGE, isAppSchemaReadsEnabled, shouldBlockLegacyWrites, shouldInitializeProductionData } from '../src/app/productionDataPolicy';

test('the explicit app schema flag is still opt in outside production', () => {
  assert.equal(isAppSchemaReadsEnabled({}), false);
  assert.equal(isAppSchemaReadsEnabled({ VITE_APP_SCHEMA_READS: 'true' }), true);
  assert.equal(isAppSchemaReadsEnabled({ VITE_APP_SCHEMA_READS: 'TRUE' }), true);
});

test('public demo routes never initialize production data clients', () => {
  assert.equal(shouldInitializeProductionData('/demo', { PROD: true }), false);
  assert.equal(shouldInitializeProductionData('/interaktivni-demo', { PROD: true }), false);
  assert.equal(shouldInitializeProductionData('/login', { PROD: true }), true);
});

test('legacy writes are blocked whenever the app schema read path is enabled', () => {
  assert.equal(shouldBlockLegacyWrites({}), false);
  assert.equal(shouldBlockLegacyWrites({ PROD: true }), true);
  assert.equal(shouldBlockLegacyWrites({ PROD: true, VITE_APP_SCHEMA_READS: 'false' }), true);
  assert.equal(shouldBlockLegacyWrites({ VITE_APP_SCHEMA_READS: 'true' }), true);
  assert.match(APP_SCHEMA_WRITES_BLOCKED_MESSAGE, /RLS/);
});
