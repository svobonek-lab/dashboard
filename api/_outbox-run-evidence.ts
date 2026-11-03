import { randomUUID } from 'node:crypto';

export type OutboxRunItemStatus = 'delivered' | 'retry' | 'failed' | 'claim_failed' | 'skipped';
const SAFE_ERROR_CODES = new Set([
  'EMAIL_PROVIDER_REJECTED', 'EMAIL_PROVIDER_UNCONFIRMED', 'EMAIL_PROVIDER_TEMPORARY',
  'EMAIL_PROVIDER_RATE_LIMITED', 'OUTBOX_ATTEMPTS_EXHAUSTED', 'OUTBOX_DELIVERY_STATE_WRITE_FAILED',
  'OUTBOX_DELIVERY_STATE_UNKNOWN',
  'EMAIL_DELIVERY_FAILED', 'OUTBOX_CLAIM_FAILED', 'OUTBOX_UNAVAILABLE',
  'STALE_ALERT_QUEUE_FAILED', 'OUTBOX_WORKER_FAILED',
]);

export interface OutboxRunEvidence {
  status: 'success' | 'partial' | 'failed';
  started_at: string;
  completed_at: string;
  stale_lead_alerts_queued: number;
  selected_count: number;
  delivered_count: number;
  retry_count: number;
  failed_count: number;
  skipped_count: number;
  error_code: string | null;
}

export async function startOutboxRun(
  service: { from: (table: string) => { insert: (record: Record<string, unknown>) => { select: (columns: string) => { single: () => Promise<{ data: { id?: string } | null; error: unknown }> } } } },
  startedAt: string,
  id: string = randomUUID(),
): Promise<string> {
  try {
    const { data, error } = await service.from('app_email_outbox_runs').insert({
      id,
      status: 'running',
      started_at: startedAt,
      completed_at: null,
    }).select('id').single();
    if (error || !data?.id) throw new Error('OUTBOX_RUN_EVIDENCE_UNAVAILABLE');
    return data.id;
  } catch {
    throw new Error('OUTBOX_RUN_EVIDENCE_UNAVAILABLE');
  }
}

export function buildOutboxRunEvidence(input: {
  startedAt: string;
  completedAt: string;
  staleLeadAlertsQueued: number;
  selectedCount: number;
  itemStatuses: OutboxRunItemStatus[];
  errorCode?: string | null;
}): OutboxRunEvidence {
  const counts = {
    delivered_count: input.itemStatuses.filter((status) => status === 'delivered').length,
    retry_count: input.itemStatuses.filter((status) => status === 'retry' || status === 'claim_failed').length,
    failed_count: input.itemStatuses.filter((status) => status === 'failed').length,
    skipped_count: input.itemStatuses.filter((status) => status === 'skipped').length,
  };
  const hasItemFailures = counts.retry_count > 0 || counts.failed_count > 0;
  const errorCode = input.errorCode
    ? SAFE_ERROR_CODES.has(input.errorCode) ? input.errorCode : 'OUTBOX_WORKER_FAILED'
    : null;

  return {
    status: errorCode
      ? counts.delivered_count + counts.retry_count + counts.failed_count + counts.skipped_count > 0 ? 'partial' : 'failed'
      : hasItemFailures ? 'partial' : 'success',
    started_at: input.startedAt,
    completed_at: input.completedAt,
    stale_lead_alerts_queued: Math.max(0, Math.trunc(input.staleLeadAlertsQueued)),
    selected_count: Math.max(0, Math.trunc(input.selectedCount)),
    ...counts,
    error_code: errorCode,
  };
}

export async function persistOutboxRun(
  service: { from: (table: string) => { update: (record: OutboxRunEvidence) => { eq: (column: string, value: string) => { select: (columns: string) => { maybeSingle: () => Promise<{ data: { id?: string } | null; error: unknown }> } } } } },
  runId: string,
  record: OutboxRunEvidence,
): Promise<void> {
  try {
    const { data, error } = await service.from('app_email_outbox_runs')
      .update(record).eq('id', runId).select('id').maybeSingle();
    if (error || !data?.id) throw new Error('OUTBOX_RUN_EVIDENCE_FAILED');
  } catch {
    throw new Error('OUTBOX_RUN_EVIDENCE_FAILED');
  }
}

