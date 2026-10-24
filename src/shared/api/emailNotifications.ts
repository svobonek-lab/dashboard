export type ImmediateOutboxState = 'delivered' | 'queued' | 'provider_not_configured' | 'worker_unavailable';

export async function requestImmediateOutboxDispatch(
  fetcher: typeof fetch = fetch,
): Promise<ImmediateOutboxState> {
  try {
    const response = await fetcher('/api/outbox-dispatch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
      keepalive: true,
    });
    const payload = await response.json().catch(() => ({}));
    if (response.status === 503 && payload?.code === 'EMAIL_PROVIDER_NOT_CONFIGURED') {
      return 'provider_not_configured';
    }
    if (!response.ok) return 'worker_unavailable';
    return Number(payload?.processedCount || 0) > 0 ? 'delivered' : 'queued';
  } catch {
    return 'worker_unavailable';
  }
}
