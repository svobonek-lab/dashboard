import assert from 'node:assert/strict';
import test from 'node:test';
import { buildOutboxRunEvidence, persistOutboxRun, startOutboxRun } from '../api/_outbox-run-evidence';

test('run evidence contains only aggregate counts, timestamps and bounded error codes', () => {
  const result = buildOutboxRunEvidence({
    startedAt: '2026-10-26T10:00:00.000Z',
    completedAt: '2026-10-26T10:01:00.000Z',
    staleLeadAlertsQueued: 2,
    selectedCount: 3,
    itemStatuses: ['delivered', 'retry', 'skipped'],
    errorCode: 'EMAIL_PROVIDER_REJECTED',
  });

  assert.deepEqual(result, {
    status: 'partial',
    started_at: '2026-10-26T10:00:00.000Z',
    completed_at: '2026-10-26T10:01:00.000Z',
    stale_lead_alerts_queued: 2,
    selected_count: 3,
    delivered_count: 1,
    retry_count: 1,
    failed_count: 0,
    skipped_count: 1,
    error_code: 'EMAIL_PROVIDER_REJECTED',
  });
  assert.doesNotMatch(JSON.stringify(result), /email@example|customer|secret|provider-message-id/i);

  const untrustedError = buildOutboxRunEvidence({
    startedAt: '2026-10-26T10:00:00.000Z', completedAt: '2026-10-26T10:01:00.000Z',
    staleLeadAlertsQueued: 0, selectedCount: 0, itemStatuses: [], errorCode: 'customer@example.test secret',
  });
  assert.equal(untrustedError.error_code, 'OUTBOX_WORKER_FAILED');
  assert.doesNotMatch(JSON.stringify(untrustedError), /customer@example|secret/i);
});

test('run evidence is created before processing and updates only its aggregate record', async () => {
  let table = '';
  let runId = '';
  let stored: unknown;
  const service = {
    from(name: string) {
      table = name;
      return {
        insert(record) {
          stored = record;
          return { select: () => ({ single: async () => ({ data: { id: String(record.id) }, error: null }) }) };
        },
        update(record) {
          stored = record;
          return { eq: (_column, value) => {
            runId = value;
            return { select: () => ({ maybeSingle: async () => ({ data: { id: value }, error: null }) }) };
          } };
        },
      };
    },
  };
  const id = await startOutboxRun(service, '2026-10-26T10:00:00.000Z', 'run-internal-id');
  assert.equal(id, 'run-internal-id');
  assert.equal((stored as any).status, 'running');
  assert.equal((stored as any).completed_at, null);

  await persistOutboxRun(service, id, buildOutboxRunEvidence({
    startedAt: '2026-10-26T10:00:00.000Z', completedAt: '2026-10-26T10:00:01.000Z',
    staleLeadAlertsQueued: 0, selectedCount: 0, itemStatuses: [],
  }));
  assert.equal(table, 'app_email_outbox_runs');
  assert.ok(stored);
  assert.equal(runId, id);

  await assert.rejects(
    () => persistOutboxRun({ from: () => ({ update: () => ({ eq: () => ({ select: () => ({ maybeSingle: async () => ({ data: null, error: new Error('private db detail') }) }) }) }) }) }, id, stored as any),
    { message: 'OUTBOX_RUN_EVIDENCE_FAILED' },
  );
});
