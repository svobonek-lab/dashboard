import { createServerlessSupabaseClient } from './_shared/supabaseClient.js';
import { timingSafeEqual } from 'node:crypto';
import {
  createResendEmailProvider,
  deliverClaimedOutboxEmail,
  MAX_OUTBOX_ATTEMPTS,
  type OutboxDeliveryStore,
} from './_outbox-worker.js';
import {
  buildOutboxRunEvidence,
  persistOutboxRun,
  startOutboxRun,
  type OutboxRunItemStatus,
} from './_outbox-run-evidence.js';

function secretsMatch(provided: string, expected: string): boolean {
  const actualBuffer = Buffer.from(provided);
  const expectedBuffer = Buffer.from(expected);
  if (actualBuffer.length !== expectedBuffer.length) {
    timingSafeEqual(expectedBuffer, expectedBuffer);
    return false;
  }
  return timingSafeEqual(actualBuffer, expectedBuffer);
}

export async function queueStaleLeadAlerts(service: { rpc: (name: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: any }> }): Promise<number> {
  const { data, error } = await service.rpc('app_queue_stale_lead_alerts', { p_older_than: '24 hours' });
  if (error) throw new Error('STALE_ALERT_QUEUE_FAILED');
  const queued = Number(data || 0);
  if (!Number.isInteger(queued) || queued < 0) throw new Error('STALE_ALERT_QUEUE_FAILED');
  return queued;
}

// Server-side email scheduler & outbox worker. Run evidence is aggregate-only;
// email content, recipient addresses, provider IDs and raw errors stay private.
export default async function outboxSchedulerHandler(req: any, res: any) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    res.status(405).json({ error: 'Method Not Allowed. Use GET or POST.' });
    return;
  }

  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers?.authorization || req.headers?.Authorization;
  const providedSecret = String(authHeader || '').replace(/^Bearer\s+/i, '').trim();
  if (!cronSecret || !providedSecret || !secretsMatch(providedSecret, cronSecret)) {
    res.status(401).json({ error: 'Neautorizovaný přístup.' });
    return;
  }

  const providerApiKey = process.env.EMAIL_PROVIDER_API_KEY;
  const emailFrom = process.env.EMAIL_FROM;
  if (!providerApiKey || !emailFrom) {
    res.status(503).json({ success: false, code: 'EMAIL_PROVIDER_NOT_CONFIGURED' });
    return;
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    res.status(500).json({ success: false, code: 'OUTBOX_SERVER_CONFIGURATION_MISSING' });
    return;
  }

  const service = createServerlessSupabaseClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });
  const provider = createResendEmailProvider(providerApiKey, emailFrom);
  const startedAt = new Date().toISOString();
  let runId: string;
  try {
    runId = await startOutboxRun(service as any, startedAt);
  } catch {
    res.status(503).json({ success: false, code: 'OUTBOX_RUN_EVIDENCE_UNAVAILABLE', timestamp: new Date().toISOString() });
    return;
  }
  let staleLeadAlertsQueued = 0;
  let selectedCount = 0;
  const itemStatuses: OutboxRunItemStatus[] = [];
  const itemErrorCodes: string[] = [];

  const recordRun = async (errorCode?: string) => {
    const record = buildOutboxRunEvidence({
      startedAt,
      completedAt: new Date().toISOString(),
      staleLeadAlertsQueued,
      selectedCount,
      itemStatuses,
      errorCode: errorCode || itemErrorCodes[0] || null,
    });
    await persistOutboxRun(service as any, runId, record);
    return record;
  };

  try {
    const immediateDispatch = String(req.headers?.['x-stavbaflow-immediate'] || '') === '1';
    staleLeadAlertsQueued = immediateDispatch ? 0 : await queueStaleLeadAlerts(service as any);

    const now = new Date();
    const nowIso = now.toISOString();
    const staleProcessingBefore = new Date(now.getTime() - 15 * 60 * 1000).toISOString();
    const deliveryUnknownBefore = new Date(now.getTime() - 20 * 60 * 60 * 1000).toISOString();
    const { data: pendingEmails, error: fetchError } = await service
      .from('app_email_outbox')
      .select('*')
      .or(`and(status.in.(pending,retry),scheduled_for.lte.${nowIso}),and(status.eq.processing,updated_at.lte.${staleProcessingBefore})`)
      .order('created_at', { ascending: true })
      .limit(40);

    if (fetchError) {
      await recordRun('OUTBOX_UNAVAILABLE');
      res.status(503).json({ success: false, code: 'OUTBOX_UNAVAILABLE', processedCount: 0, timestamp: new Date().toISOString() });
      return;
    }

    selectedCount = Math.min(pendingEmails?.length || 0, 20);
    if (!pendingEmails || pendingEmails.length === 0) {
      const record = await recordRun();
      res.status(200).json({
        success: true,
        processedCount: 0,
        staleLeadAlertsQueued,
        run: record,
      });
      return;
    }

    const batch = pendingEmails.slice(0, 20);
    for (const email of batch) {
      try {
        const attempts = Math.max(0, Number(email.attempts) || 0);
        const staleProcessing = email.status === 'processing';
        const processingAgeMs = staleProcessing && email.updated_at
          ? now.getTime() - new Date(email.updated_at).getTime()
          : 0;
        if (staleProcessing && processingAgeMs >= 20 * 60 * 60 * 1000) {
          const { data: uncertain, error: uncertainError } = await service
            .from('app_email_outbox')
            .update({ status: 'failed', last_error: 'OUTBOX_DELIVERY_STATE_UNKNOWN', updated_at: nowIso })
            .eq('id', email.id)
            .eq('status', 'processing')
            .lte('updated_at', deliveryUnknownBefore)
            .select('id')
            .maybeSingle();
          if (uncertainError) {
            itemStatuses.push('claim_failed');
            itemErrorCodes.push('OUTBOX_CLAIM_FAILED');
          } else {
            itemStatuses.push(uncertain ? 'failed' : 'skipped');
            if (uncertain) itemErrorCodes.push('OUTBOX_DELIVERY_STATE_UNKNOWN');
          }
          continue;
        }
        if (attempts >= MAX_OUTBOX_ATTEMPTS) {
          const { data: exhausted, error: exhaustedError } = await service
            .from('app_email_outbox')
            .update({ status: 'failed', last_error: 'OUTBOX_ATTEMPTS_EXHAUSTED', updated_at: new Date().toISOString() })
            .eq('id', email.id)
            .eq('status', email.status)
            .select('id')
            .maybeSingle();
          if (exhaustedError) {
            itemStatuses.push('claim_failed');
            itemErrorCodes.push('OUTBOX_CLAIM_FAILED');
          } else {
            itemStatuses.push(exhausted ? 'failed' : 'skipped');
            if (exhausted) itemErrorCodes.push('OUTBOX_ATTEMPTS_EXHAUSTED');
          }
          continue;
        }
        const claimedAt = new Date();
        const isStaleProcessing = staleProcessing;
        const { data: claimed, error: claimError } = await service
          .from('app_email_outbox')
          .update({ status: 'processing', updated_at: claimedAt.toISOString(), attempts: attempts + 1 })
          .eq('id', email.id)
          .eq('status', email.status)
          .lt('attempts', MAX_OUTBOX_ATTEMPTS)
          .lte(isStaleProcessing ? 'updated_at' : 'scheduled_for', isStaleProcessing ? staleProcessingBefore : nowIso)
          .select('id')
          .maybeSingle();
        if (claimError) {
          itemStatuses.push('claim_failed');
          itemErrorCodes.push('OUTBOX_CLAIM_FAILED');
          continue;
        }
        if (!claimed) {
          itemStatuses.push('skipped');
          continue;
        }

        const store: OutboxDeliveryStore = {
          async markDelivered(id, providerMessageId, deliveredAt) {
            const { data, error } = await service
              .from('app_email_outbox')
              .update({ status: 'delivered', delivered_at: deliveredAt, provider_message_id: providerMessageId })
              .eq('id', id)
              .eq('status', 'processing')
              .select('id')
              .maybeSingle();
            if (error || !data) throw new Error('OUTBOX_DELIVERY_STATE_WRITE_FAILED');
          },
          async markFailure(update) {
            const { data, error } = await service
              .from('app_email_outbox')
              .update({
                status: update.status,
                attempts: update.attempts,
                last_error: update.lastError,
                ...(update.scheduledFor ? { scheduled_for: update.scheduledFor } : {}),
                updated_at: new Date().toISOString(),
              })
              .eq('id', update.id)
              .eq('status', 'processing')
              .select('id')
              .maybeSingle();
            if (error || !data) throw new Error('OUTBOX_DELIVERY_STATE_WRITE_FAILED');
          },
        };
        const outcome = await deliverClaimedOutboxEmail({ ...email, attempts: attempts + 1 }, { provider, store });
        itemStatuses.push(outcome.status);
        if (outcome.errorCode) itemErrorCodes.push(outcome.errorCode);
      } catch (deliveryError) {
        const errorCode = deliveryError instanceof Error && deliveryError.message === 'OUTBOX_DELIVERY_STATE_WRITE_FAILED'
          ? 'OUTBOX_DELIVERY_STATE_WRITE_FAILED'
          : 'EMAIL_DELIVERY_FAILED';
        itemErrorCodes.push(errorCode);
        itemStatuses.push('claim_failed');
      }
    }

    const record = await recordRun();
    res.status(200).json({
      success: record.failed_count === 0 && record.retry_count === 0,
      processedCount: record.delivered_count,
      staleLeadAlertsQueued,
      run: record,
    });
  } catch (error) {
    const code = error instanceof Error && error.message === 'OUTBOX_RUN_EVIDENCE_FAILED'
      ? 'OUTBOX_RUN_EVIDENCE_FAILED'
      : error instanceof Error && error.message === 'STALE_ALERT_QUEUE_FAILED'
        ? 'STALE_ALERT_QUEUE_FAILED'
        : 'OUTBOX_WORKER_FAILED';
    if (code !== 'OUTBOX_RUN_EVIDENCE_FAILED') {
      try { await recordRun(code); } catch { /* The safe response still reports evidence persistence failure. */ }
    }
    res.status(500).json({ success: false, code, timestamp: new Date().toISOString() });
  }
}
