import { toLeadPatch } from './leadWritePatch';
import type { Lead } from './types';

type RpcResponse = { data: unknown; error: { message?: string } | null };
type RpcClient = { rpc: (name: string, args: { p_lead_id: string; p_status: string }) => PromiseLike<RpcResponse> };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function persistStagingLeadStatus(
  client: RpcClient, companyId: string, leadId: string, requestedStatus: string,
): Promise<void> {
  if (!uuid.test(companyId) || !uuid.test(leadId)) throw new Error('Neplatná firma nebo zakázka.');
  const patch = toLeadPatch({ status: requestedStatus as Lead['status'] });
  const status = patch.status as string;
  const { data, error } = await client.rpc('app_change_lead_status', { p_lead_id: leadId, p_status: status });
  if (error || !Array.isArray(data) || data.length !== 1
    || data[0]?.lead_id !== leadId || data[0]?.status !== status) {
    throw new Error('Změnu stavu se nepodařilo uložit. Obnovte stránku a zkuste to znovu.');
  }
}
