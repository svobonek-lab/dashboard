import { getEmployees } from '../../../entities/employee';
import { getLeads } from '../../../entities/lead';
import { isValidUUID, supabase } from '../../../shared/api/supabaseClient';
import { buildCompanyExportCsv } from '../model/exportCsv';

export interface CompanyExportResult {
  csv: string;
  historyAvailable: boolean;
}

export async function exportCompanyData(companyId: string, role: string): Promise<CompanyExportResult> {
  if (role !== 'owner') throw new Error('Export dat je dostupný pouze vlastníkovi firmy.');
  if (!isValidUUID(companyId)) throw new Error('Firma pro export není platná.');
  if (!supabase) throw new Error('Připojení k firemnímu účtu není dostupné.');

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new Error('Pro export je nutné být přihlášen jako vlastník firmy.');

  const [leads, employees] = await Promise.all([
    getLeads(companyId),
    getEmployees(companyId),
  ]);

  const historyResult = await supabase.from('app_lead_events')
    .select('lead_id,operation,old_status,new_status,created_at')
    .eq('company_id', companyId)
    .order('created_at', { ascending: true });
  const historyAvailable = !historyResult.error;

  return {
    csv: buildCompanyExportCsv({
      leads,
      employees,
      events: historyAvailable ? historyResult.data || [] : [],
    }),
    historyAvailable,
  };
}
