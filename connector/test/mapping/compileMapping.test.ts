import assert from 'node:assert/strict';
import test from 'node:test';

import { compileMapping } from '../../src/mapping/compileMapping.js';
import type { EntityMappingV1 } from '../../src/mapping/types.js';
import type { SourceSchema } from '../../src/adapters/types.js';

const schema: SourceSchema = {
  inspectedAt: '2026-10-04T10:00:00.000Z',
  tables: [{
    schema: 'public',
    name: 'customers',
    columns: [
      { name: 'id', dataType: 'bigint', nullable: false, primaryKey: true },
      { name: 'name', dataType: 'text', nullable: false, primaryKey: false },
      { name: 'active', dataType: 'boolean', nullable: false, primaryKey: false },
      { name: 'revenue', dataType: 'numeric', nullable: true, primaryKey: false },
      { name: 'created_at', dataType: 'timestamp', nullable: false, primaryKey: false },
      { name: 'category', dataType: 'text', nullable: true, primaryKey: false },
    ],
  }],
};

const mapping: EntityMappingV1 = {
  version: 1,
  mappingVersion: 3,
  entityType: 'customer',
  sourceSystem: 'fixture',
  schema: 'public',
  table: 'customers',
  externalIdColumn: 'id',
  fields: [
    { sourceColumn: 'name', targetField: 'name', conversion: { kind: 'text' }, required: true },
    { sourceColumn: 'active', targetField: 'archived', conversion: { kind: 'boolean', invert: true } },
    { sourceColumn: 'revenue', targetField: 'companyNumber', conversion: { kind: 'number' } },
    { sourceColumn: 'created_at', targetField: 'address', conversion: { kind: 'datetime' } },
    { sourceColumn: 'category', targetField: 'country', conversion: { kind: 'enum', values: { local: 'CZ', foreign: 'EU' } } },
  ],
};

test('compiles typed conversions without leaking source values into issues', () => {
  const compiled = compileMapping(mapping, schema);
  const result = compiled.mapRow({ id: 7, name: 'Firma', active: true, revenue: '123', created_at: '2026-10-04T08:00:00Z', category: 'local' });
  assert.deepEqual(result.issues, []);
  assert.equal(result.record?.externalId, '7');
  assert.deepEqual(result.record?.payload, {
    name: 'Firma', archived: false, companyNumber: 123, address: '2026-10-04T08:00:00.000Z', country: 'CZ',
  });
});

test('supports email, phone and currency normalization', () => {
  const custom = { ...mapping, fields: [
    { sourceColumn: 'name', targetField: 'email', conversion: { kind: 'email' } },
    { sourceColumn: 'category', targetField: 'phone', conversion: { kind: 'phone' } },
    { sourceColumn: 'revenue', targetField: 'companyNumber', conversion: { kind: 'currency', decimalSeparator: ',' } },
  ] } as EntityMappingV1;
  const result = compileMapping(custom, schema).mapRow({ id: 1, name: ' SALES@EXAMPLE.TEST ', category: '+420 777 111 222', revenue: '1 234,50 Kč' });
  assert.equal(result.record?.payload.email, 'sales@example.test');
  assert.equal(result.record?.payload.phone, '+420777111222');
  assert.equal(result.record?.payload.companyNumber, 1234.5);
});

test('rejects expressions, duplicate targets, secrets and unknown destination fields', () => {
  assert.throws(() => compileMapping({ ...mapping, expression: 'row.name' } as EntityMappingV1, schema), /unknown mapping field: expression/);
  assert.throws(() => compileMapping({ ...mapping, fields: [...mapping.fields, { sourceColumn: 'category', targetField: 'name', conversion: { kind: 'text' } }] }, schema), /duplicate target field: name/);
  assert.throws(() => compileMapping({ ...mapping, fields: [{ sourceColumn: 'name', targetField: 'name', conversion: { kind: 'enum', values: { password: 'secret-value' } } }] }, schema), /secret-like mapping key/);
  assert.throws(() => compileMapping({ ...mapping, fields: [{ sourceColumn: 'name', targetField: 'unknown', conversion: { kind: 'text' } }] } as EntityMappingV1, schema), /unknown destination field: unknown/);
});

test('returns safe issues for missing IDs, required fields and incompatible values', () => {
  const compiled = compileMapping(mapping, schema);
  const result = compiled.mapRow({ name: '', active: 'maybe', revenue: 'not-number', created_at: 'not-date', category: 'missing' });
  assert.equal(result.record, null);
  assert.deepEqual(result.issues.map(issue => issue.code), ['EXTERNAL_ID_MISSING', 'REQUIRED_VALUE_MISSING', 'CONVERSION_INVALID', 'CONVERSION_INVALID', 'CONVERSION_INVALID', 'ENUM_VALUE_UNKNOWN']);
  assert.doesNotMatch(JSON.stringify(result.issues), /not-number|not-date|maybe/);
});
