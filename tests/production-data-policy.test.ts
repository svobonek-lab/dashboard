import test from 'node:test';
import assert from 'node:assert/strict';
import { APP_SCHEMA_WRITES_BLOCKED_MESSAGE, isAppSchemaReadsEnabled, shouldBlockLegacyWrites } from '../src/app/productionDataPolicy';

test('production app schema reads are opt in', () => {
  assert.equal(isAppSchemaReadsEnabled({}), false);
  assert.equal(isAppSchemaReadsEnabled({ VITE_APP_SCHEMA_READS: 'true' }), true);
  assert.equal(isAppSchemaReadsEnabled({ VITE_APP_SCHEMA_READS: 'TRUE' }), true);
});

test('legacy writes are blocked whenever the app schema read path is enabled', () => {
  assert.equal(shouldBlockLegacyWrites({}), false);
  assert.equal(shouldBlockLegacyWrites({ VITE_APP_SCHEMA_READS: 'true' }), true);
  assert.match(APP_SCHEMA_WRITES_BLOCKED_MESSAGE, /RLS/);
});
