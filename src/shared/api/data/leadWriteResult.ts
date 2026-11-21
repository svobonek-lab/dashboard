import type { AppLeadRow } from '../productionSchema';

type ExpectedLeadWrite = Partial<Pick<AppLeadRow, 'id' | 'status' | 'assigned_to'>>;
type LeadWriteResponse = { data: unknown; error: { message?: string } | null };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function requireLeadWriteResult(
  response: LeadWriteResponse, companyId: string, expected: ExpectedLeadWrite = {},
): AppLeadRow {
  const row = response.data as AppLeadRow | null;
  if (response.error || !row || row.company_id !== companyId || !uuid.test(row.id)
    || Object.entries(expected).some(([field, value]) => row[field as keyof ExpectedLeadWrite] !== value)) {
    throw new Error('Změnu zakázky se nepodařilo potvrdit. Obnovte stránku a zkuste to znovu.');
  }
  return row;
}
