import assert from 'node:assert/strict';
import test from 'node:test';

import type { ConnectorCommandV1, ConnectorMappingDefinitionV1 } from '../../../shared/connectorProtocol.js';
import { processConnectorCommands } from '../../src/commands/processCommands.js';

const mapping: ConnectorMappingDefinitionV1 = {
  version: 1,
  mappingVersion: 2,
  entityType: 'lead',
  sourceSystem: 'fixture',
  schema: 'public',
  table: 'leads',
  externalIdColumn: 'id',
  fields: [{ sourceColumn: 'title', targetField: 'title', conversion: { kind: 'text' }, required: true }],
};

const command = (value: Partial<ConnectorCommandV1> & Pick<ConnectorCommandV1, 'id' | 'type'>): ConnectorCommandV1 => ({
  version: 1,
  connectorId: 'connector-1',
  expiresAt: '2026-10-05T12:00:00Z',
  ...value,
});

test('processes mapping, approval, sync and pause commands in order before acknowledging them', async () => {
  const calls: string[] = [];
  const commands = [
    command({ id: 'map', type: 'refresh_mapping', mappingVersion: 2, mappingDefinition: mapping }),
    command({ id: 'approve', type: 'approve_mapping', mappingVersion: 2 }),
    command({ id: 'sync', type: 'sync_now' }),
    command({ id: 'pause', type: 'pause' }),
    command({ id: 'resume', type: 'resume' }),
  ];
  await processConnectorCommands(commands, {
    refreshMapping: async definition => { calls.push(`map:${definition.mappingVersion}`); },
    approveMapping: async version => { calls.push(`approve:${version}`); },
    syncNow: async () => { calls.push('sync'); },
    setPaused: async paused => { calls.push(paused ? 'pause' : 'resume'); },
    acknowledge: async id => { calls.push(`ack:${id}`); },
  });
  assert.deepEqual(calls, ['map:2', 'ack:map', 'approve:2', 'ack:approve', 'sync', 'ack:sync', 'pause', 'ack:pause', 'resume', 'ack:resume']);
});

test('does not acknowledge an invalid or failed mapping command', async () => {
  const acknowledged: string[] = [];
  await assert.rejects(processConnectorCommands([command({ id: 'bad', type: 'refresh_mapping', mappingVersion: 2 })], {
    refreshMapping: async () => undefined,
    approveMapping: async () => undefined,
    syncNow: async () => undefined,
    setPaused: async () => undefined,
    acknowledge: async id => { acknowledged.push(id); },
  }), /mapping definition/i);
  assert.deepEqual(acknowledged, []);
});
