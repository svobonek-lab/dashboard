import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import connectorRouter, { resolveConnectorRoute } from '../api/connector/[route]';

describe('connector API router', () => {
  it('only resolves the explicit connector route allowlist', () => {
    assert.equal(typeof resolveConnectorRoute('status'), 'function');
    assert.equal(resolveConnectorRoute('../status'), undefined);
    assert.equal(resolveConnectorRoute(['status']), undefined);
    assert.equal(resolveConnectorRoute('unknown'), undefined);
  });

  it('returns a safe 404 for unknown routes', async () => {
    let receivedStatus: number | undefined;
    let receivedBody: unknown;
    const json = (body: unknown) => { receivedBody = body; };
    const status = (code: number) => { receivedStatus = code; return { json }; };
    await connectorRouter({ query: { route: 'unknown' } }, { status });
    assert.equal(receivedStatus, 404);
    assert.deepEqual(receivedBody, { code: 'NOT_FOUND' });
  });
});
