import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { DockerComposeModal } from '../components/synology/DockerComposeModal.tsx';
import { generateSynologyDockerCompose } from '../lib/synology/synologyConnector.ts';
import { generateSynologyToken } from '../lib/synology/storage.ts';
import { SynologyLocalRepository } from '../lib/data/SynologyLocalRepository.ts';
import type { SynologyConfig } from '../types/synology.ts';

const config = (apiToken = ''): SynologyConfig => ({
  id: 'fixture',
  organizationId: 'fixture-company',
  name: 'Fixture NAS',
  status: 'disconnected',
  nasAddress: 'nas.example.test',
  port: 5001,
  useHttps: true,
  authMode: 'token',
  apiToken,
  username: '',
  passwordEncrypted: '',
  detectedModel: '',
  dsmVersion: '',
  serialNumberMasked: '',
  ipAddress: '',
  uptimeHours: 0,
  cpuUsagePercent: 0,
  ramUsagePercent: 0,
  storageUsagePercent: 0,
  containerManagerInstalled: false,
  dockerConnectorRunning: false,
  connectorVersion: '1.0.0',
  databaseSync: {
    driver: 'none',
    port: 0,
    database: '',
    table: '',
    enabled: false,
    fieldMapping: {} as SynologyConfig['databaseSync']['fieldMapping'],
    discoveredTables: [],
  },
  sharedFolders: [],
  autoSync: false,
  syncIntervalMinutes: 5,
  totalFilesSynced: 0,
  totalProjectsSynced: 0,
  createdAt: '',
  updatedAt: '',
});

test('Docker Compose generation rejects a missing or blank API token', () => {
  assert.throws(() => generateSynologyDockerCompose(config(), 'fixture-company'), /API token/i);
  assert.throws(() => generateSynologyDockerCompose(config('  '), 'fixture-company'), /API token/i);
  assert.throws(() => generateSynologyDockerCompose(config('synology-nas-bearer-token'), 'fixture-company'), /API token/i);
});

test('Docker Compose generation uses an explicitly configured API token', () => {
  const generated = generateSynologyDockerCompose(config('fixture-token'), 'fixture-company');
  assert.match(generated, /BUILDFLOW_API_TOKEN=fixture-token/);
});

test('generated Synology API tokens use cryptographic randomness', () => {
  const originalRandom = Math.random;
  Math.random = () => { throw new Error('Math.random must not generate API tokens'); };

  try {
    const first = generateSynologyToken('fixture-company');
    const second = generateSynologyToken('fixture-company');
    assert.match(first, /^syn_tok_fixture-_[0-9a-f]{64}$/);
    assert.notEqual(first, second);
  } finally {
    Math.random = originalRandom;
  }
});

test('Docker Compose modal asks for a token instead of crashing when configuration is incomplete', () => {
  const html = renderToStaticMarkup(React.createElement(DockerComposeModal, {
    isOpen: true,
    onClose: () => undefined,
    config: config(),
    organizationId: 'fixture-company',
  }));

  assert.match(html, /API token/i);
  assert.doesNotMatch(html, /buildflow-syn-token-replace-me|synology-nas-bearer-token/);
});

test('Synology requests fail before network access when no real API token is configured', async () => {
  const originalFetch = globalThis.fetch;
  let requests = 0;
  globalThis.fetch = async () => {
    requests++;
    return new Response('{}', { status: 200 });
  };

  try {
    for (const token of [undefined, '  ', 'synology-nas-bearer-token']) {
      const status = await new SynologyLocalRepository('https://nas.example.test/api', token).getHealthStatus();
      assert.equal(status.ok, false);
      assert.match(status.message, /API token/i);
    }
    assert.equal(requests, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('changing the Synology endpoint without a replacement token clears the old token', async () => {
  const originalFetch = globalThis.fetch;
  let authorization: string | null = null;
  globalThis.fetch = async (_input, init) => {
    authorization = new Headers(init?.headers).get('Authorization');
    return new Response('{}', { status: 200 });
  };

  try {
    const repository = new SynologyLocalRepository('https://old.example.test/api', 'fixture-token');
    repository.setEndpoint('https://new.example.test/api');
    await repository.getHealthStatus();
    assert.equal(authorization, null);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
