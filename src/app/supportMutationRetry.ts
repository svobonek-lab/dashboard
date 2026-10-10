export type SupportLeadAction = 'create_lead' | 'update_lead' | 'update_status';

export interface SupportLeadMutationRequest {
  sessionId: string;
  action: SupportLeadAction;
  payload: Record<string, unknown>;
  leadId?: string;
  requestId: string;
}

type SupportLeadSender<T> = (request: SupportLeadMutationRequest) => Promise<T>;

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => [key, stableValue(item)]));
  }
  return value;
}

function createRequestId(): string {
  return typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `request-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function createSupportLeadMutator<T>(send: SupportLeadSender<T>, nextRequestId = createRequestId) {
  const pending = new Map<string, string>();

  return async (
    sessionId: string,
    action: SupportLeadAction,
    payload: Record<string, unknown>,
    leadId?: string,
  ): Promise<T> => {
    const operationKey = JSON.stringify(stableValue({ sessionId, action, leadId: leadId || null, payload }));
    let requestId = pending.get(operationKey);
    if (!requestId) {
      requestId = nextRequestId();
      pending.set(operationKey, requestId);
      if (pending.size > 128) pending.delete(pending.keys().next().value as string);
    }

    try {
      const result = await send({ sessionId, action, payload, leadId, requestId });
      pending.delete(operationKey);
      return result;
    } catch (error) {
      // A failed fetch can mean the write committed but its response was lost.
      // Retain the operation id so an identical retry is deduplicated by Postgres.
      throw error;
    }
  };
}
