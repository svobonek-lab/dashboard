import outboxSchedulerHandler from './outbox-scheduler.js';

export interface ImmediateDispatchResult {
  statusCode: number;
  body: Record<string, unknown>;
}

export async function runImmediateOutboxDispatch(): Promise<ImmediateDispatchResult> {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return { statusCode: 503, body: { success: false, code: 'OUTBOX_WORKER_NOT_CONFIGURED' } };
  }
  let statusCode = 500;
  let body: Record<string, unknown> = { success: false, code: 'OUTBOX_WORKER_FAILED' };
  await outboxSchedulerHandler({
    method: 'POST',
    headers: {
      authorization: `Bearer ${cronSecret}`,
      'x-stavbaflow-immediate': '1',
    },
  }, {
    status(code: number) {
      statusCode = code;
      return {
        json(value: Record<string, unknown>) {
          body = value;
          return value;
        },
      };
    },
  });
  return { statusCode, body };
}

export default async function outboxDispatchHandler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ success: false, error: 'Method Not Allowed. Use POST.' });
    return;
  }
  const result = await runImmediateOutboxDispatch();
  res.status(result.statusCode).json({
    success: result.body.success === true,
    code: result.body.code,
    processedCount: Number(result.body.processedCount || 0),
    queued: result.statusCode === 503 && result.body.code === 'EMAIL_PROVIDER_NOT_CONFIGURED',
  });
}
