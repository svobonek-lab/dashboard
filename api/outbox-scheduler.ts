import { createServerlessSupabaseClient } from './_shared/supabaseClient.js';
import { timingSafeEqual } from 'node:crypto';
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

function sendFailureCode(error: unknown): string {
  const message = error instanceof Error ? error.message : '';
  if (message === 'EMAIL_PROVIDER_REJECTED') return message;
  if (message === 'EMAIL_PROVIDER_UNCONFIRMED') return message;
  if (message === 'OUTBOX_DELIVERY_STATE_WRITE_FAILED') return message;
  return 'EMAIL_DELIVERY_FAILED';
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

  const resendApiKey = process.env.RESEND_API_KEY;
  const emailFrom = process.env.EMAIL_FROM;
  if (!resendApiKey || !emailFrom) {
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

    const { data: pendingEmails, error: fetchError } = await service
      .from('app_email_outbox')
      .select('*')
      .in('status', ['pending', 'retry'])
      .lte('scheduled_for', new Date().toISOString())
      .order('created_at', { ascending: true })
      .limit(20);

    if (fetchError) {
      await recordRun('OUTBOX_UNAVAILABLE');
      res.status(503).json({ success: false, code: 'OUTBOX_UNAVAILABLE', processedCount: 0, timestamp: new Date().toISOString() });
      return;
    }

    selectedCount = pendingEmails?.length || 0;
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

    for (const email of pendingEmails) {
      try {
        const { data: claimed, error: claimError } = await service
          .from('app_email_outbox')
          .update({ status: 'processing', updated_at: new Date().toISOString() })
          .eq('id', email.id)
          .in('status', ['pending', 'retry'])
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

        const resendResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${resendApiKey}`,
            'Idempotency-Key': `outbox/${email.id}`,
          },
          body: JSON.stringify({
            from: emailFrom,
            to: email.recipient || email.to,
            subject: email.subject,
            ...(email.body_html ? { html: email.body_html } : { text: email.body || '' }),
          }),
        });
        const resendData = await resendResponse.json();
        if (!resendResponse.ok) throw new Error('EMAIL_PROVIDER_REJECTED');
        if (!resendData?.id) throw new Error('EMAIL_PROVIDER_UNCONFIRMED');

        const { data: delivered, error: deliveryUpdateError } = await service
          .from('app_email_outbox')
          .update({
            status: 'delivered',
            delivered_at: new Date().toISOString(),
            provider_message_id: resendData.id,
            attempts: (email.attempts || 0) + 1,
          })
          .eq('id', email.id)
          .eq('status', 'processing')
          .select('id')
          .maybeSingle();
        if (deliveryUpdateError || !delivered) throw new Error('OUTBOX_DELIVERY_STATE_WRITE_FAILED');
        itemStatuses.push('delivered');
      } catch (sendError) {
        const errorCode = sendFailureCode(sendError);
        itemErrorCodes.push(errorCode);
        const nextAttempts = (email.attempts || 0) + 1;
        const newStatus = nextAttempts >= 3 ? 'failed' : 'retry';
        await service
          .from('app_email_outbox')
          .update({
            status: newStatus,
            last_error: errorCode,
            attempts: nextAttempts,
            scheduled_for: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
          })
          .eq('id', email.id)
          .eq('status', 'processing');
        itemStatuses.push(newStatus);
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
