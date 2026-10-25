import assert from 'node:assert/strict';
import test from 'node:test';

import { buildByodbCompanyPayload, buildByodbLeadPayload, mapByodbProjectionToBranding, mapByodbProjectionToLead, ByodbOperationPendingError, byodbFeatureEnabled, ModeAwareRepository, stablePendingReference } from '../src/shared/api/data/ByodbRepository.js';
import type { ICRMRepository } from '../src/shared/api/data/types.js';

const context = { mode: 'byodb' as const, driver: 'postgres' as const, connectorId: 'c89e7d49-38fd-4f2b-b5ec-19a31de19d26', mappingVersion: 3, mappedTargets: ['title', 'customer', 'email', 'status', 'value'], companyMappingVersion: 4, companyMappedTargets: ['name', 'email', 'phone', 'address', 'city', 'website'], writeEnabled: true, connectorStatus: 'success' };

test('BYODB projection maps canonical source truth to the existing lead view without a saved fiction', () => {
  const lead = mapByodbProjectionToLead({ externalId: 'customer-row-1', fingerprint: 'a'.repeat(64), payload: { title: 'Rekonstrukce', customer: 'Novák', email: 'n@example.test', phone: '+420123456789', status: 'in_progress', value: 150000 } }, 'company-1');
  assert.equal(lead.id, 'customer-row-1');
  assert.equal(lead.customerName, 'Novák');
  assert.equal(lead.customerPhone, '+420123456789');
  assert.equal(lead.status, 'In Progress');
  assert.equal(lead.sourceVersion, 'a'.repeat(64));
});

test('BYODB writes include only mapped canonical fields and reject unmapped business edits', () => {
  assert.deepEqual(buildByodbLeadPayload({ title: 'Nová zakázka', customerName: 'Novák', status: 'New' }, context), { title: 'Nová zakázka', customer: 'Novák', status: 'new' });
  assert.throws(() => buildByodbLeadPayload({ customerPhone: '+420123456789' }, context), /BYODB_FIELD_NOT_MAPPED/);
  assert.throws(() => buildByodbLeadPayload({ assignedEmployeeId: 'employee-1' }, context), /BYODB_FIELD_NOT_MAPPED/);
  assert.throws(() => buildByodbLeadPayload({ status: 'Unknown' }, context), /BYODB_STATUS_INVALID/);
});

test('company profile projections and writes use approved canonical company fields', () => {
  assert.deepEqual(mapByodbProjectionToBranding({ externalId: 'company-row-1', fingerprint: 'b'.repeat(64), payload: { name: 'Stavby Novák', email: 'info@example.test', address: 'Hlavní 1', city: 'Brno', phone: '+420123456789', website: 'https://example.test' } }, { name: 'Old cloud name', primaryColor: '#123456' }, ['name', 'email', 'address', 'city', 'phone', 'website']), {
    name: 'Stavby Novák', email: 'info@example.test', address: 'Hlavní 1', city: 'Brno', phone: '+420123456789', website: 'https://example.test', primaryColor: '#123456',
  });
  assert.deepEqual(buildByodbCompanyPayload({ name: 'Nové jméno', email: 'owner@example.test', phone: '+420987654321', address: 'Nová 2', city: 'Praha', website: 'https://owner.test' }, ['name', 'email', 'phone', 'address', 'city', 'website']), {
    name: 'Nové jméno', email: 'owner@example.test', phone: '+420987654321', address: 'Nová 2', city: 'Praha', website: 'https://owner.test',
  });
  assert.throws(() => buildByodbCompanyPayload({ name: 'Nové jméno' }, ['email']), /BYODB_FIELD_NOT_MAPPED/);
  assert.equal(buildByodbCompanyPayload({ name: 'Nové jméno', email: '' }, ['name']).name, 'Nové jméno');
});

test('BYODB company profile changes are queued and never fall through to a cloud profile write', async () => {
  const calls: string[] = [];
  const fallback = {
    getBranding: async () => ({ name: 'Cloud name', primaryColor: '#123456' }),
    saveBranding: async () => { calls.push('cloud-write'); },
  } as unknown as ICRMRepository;
  const repository = new ModeAwareRepository(fallback, { enabled: true, request: async (_companyId, body) => {
    calls.push(String(body.action));
    if (body.action === 'context') return { ...context, mode: 'byodb' } as never;
    if (body.action === 'records') return { records: [{ externalId: 'company-row-1', fingerprint: 'b'.repeat(64), payload: { name: 'Source name', email: 'info@example.test', phone: '+420123456789', address: 'Hlavní 1' } }] } as never;
    return { operationId: 'company-operation-1', status: 'pending' } as never;
  } });
  const branding = await repository.getBranding('company-1');
  assert.equal(branding.name, 'Source name');
  await assert.rejects(repository.saveBranding('company-1', { name: 'Changed', email: 'new@example.test' }), error => error instanceof ByodbOperationPendingError);
  assert.deepEqual(calls, ['context', 'context', 'records', 'context', 'context', 'records', 'create']);
  assert.equal(calls.includes('cloud-write'), false);
});

test('queued writes surface a typed pending state and never masquerade as a saved record', () => {
  const error = new ByodbOperationPendingError('operation-1', 'processing', 'lead-1');
  assert.equal(error.status, 'processing');
  assert.equal(error.externalId, 'lead-1');
  assert.match(error.message, /čeká|zpracovává/i);
});

test('BYODB stays on Managed Cloud unless the frontend release flag is enabled', () => {
  assert.equal(byodbFeatureEnabled({}), false);
  assert.equal(byodbFeatureEnabled({ VITE_BYODB_ENABLED: 'true' }), true);
  assert.equal(byodbFeatureEnabled({ VITE_BYODB_ENABLED: '1' }), false);
});

test('Managed Cloud preserves the existing repository reads and writes', async () => {
  const calls: string[] = [];
  const fallback = {
    getLeads: async () => { calls.push('cloud-read'); return [{ id: 'cloud-lead' }]; },
    saveLead: async () => { calls.push('cloud-write'); return { id: 'cloud-lead' }; },
  } as unknown as ICRMRepository;
  const repository = new ModeAwareRepository(fallback, { enabled: false, request: async () => { throw new Error('unexpected connector call'); } });
  assert.deepEqual(await repository.getLeads('company-1'), [{ id: 'cloud-lead' }]);
  assert.deepEqual(await repository.saveLead('company-1', { title: 'Cloud lead' }), { id: 'cloud-lead' });
  assert.deepEqual(calls, ['cloud-read', 'cloud-write']);
});

test('BYODB pending writes are reported as pending and never fall through to a cloud write', async () => {
  const calls: string[] = [];
  const fallback = {
    saveLead: async () => { calls.push('cloud-write'); return { id: 'wrong' }; },
    getEmployees: async () => [],
  } as unknown as ICRMRepository;
  const repository = new ModeAwareRepository(fallback, { enabled: true, request: async (_companyId, body) => {
    calls.push(String(body.action));
    if (body.action === 'context') return { ...context, mode: 'byodb' } as never;
    return { operationId: 'operation-1', status: 'pending' } as never;
  } });
  await assert.rejects(repository.saveLead('company-1', { title: 'Pending lead' }), (error: unknown) => error instanceof ByodbOperationPendingError && error.status === 'pending');
  assert.deepEqual(calls, ['context', 'context', 'create']);
});

test('retrying the same create reuses a stable source id and idempotency key without storing lead content', async () => {
  const values = new Map<string, string>();
  const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value), removeItem: (key: string) => values.delete(key) };
  const first = await stablePendingReference('company-1', 'lead', 'create', null, null, { title: 'Private customer name' }, storage);
  const retry = await stablePendingReference('company-1', 'lead', 'create', null, null, { title: 'Private customer name' }, storage);
  assert.deepEqual(retry, first);
  assert.equal(values.size, 1);
  assert.doesNotMatch([...values.values()][0]!, /Private customer name/);
});
