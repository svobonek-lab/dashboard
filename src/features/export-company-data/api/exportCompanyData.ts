import { isAppSchemaReadsEnabled } from '../../../shared/api/productionDataPolicy';
import { isValidUUID, supabase } from '../../../shared/api/supabaseClient';
import { toAppLead } from '../../../shared/api/productionSchema';
import { buildCompanyExportCsv } from '../model/exportCsv';

export interface CompanyExportResult {
  csv: string;
  historyAvailable: boolean;
}

type ExportLead = Parameters<typeof buildCompanyExportCsv>[0]['leads'][number];
type ExportEmployee = Parameters<typeof buildCompanyExportCsv>[0]['employees'][number];

const runtimeEnv = (import.meta as any).env || {};
const appSchemaReadsEnabled = Boolean(runtimeEnv.PROD) || isAppSchemaReadsEnabled(runtimeEnv);

async function readAppSchemaCompany(companyId: string): Promise<{ leads: ExportLead[]; employees: ExportEmployee[] }> {
  const [leadResult, memberResult, inviteResult] = await Promise.all([
    supabase!.from('app_leads')
      .select('id,company_id,title,customer,email,phone,address,description,status,priority,assigned_to,scheduled_at,duration_minutes,value,source,created_at,updated_at,revision')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false }),
    supabase!.from('app_members')
      .select('company_id,user_id,name,email,role,active')
      .eq('company_id', companyId)
      .eq('active', true),
    supabase!.from('app_invites')
      .select('company_id,name,email,expires_at,created_at,accepted_at')
      .eq('company_id', companyId)
      .is('accepted_at', null)
      .gt('expires_at', new Date().toISOString()),
  ]);
  if (leadResult.error || memberResult.error || inviteResult.error) {
    throw new Error('Firemní data se nepodařilo načíst přes zabezpečené připojení.');
  }

  const members = memberResult.data || [];
  const names = new Map(members.map((member) => [member.user_id, member.name]));
  const memberEmails = new Set(members.map((member) => member.email.toLowerCase()));
  const employees: ExportEmployee[] = members.map((member) => ({
    name: member.name,
    email: member.email,
    active: member.active,
  }));
  for (const invite of inviteResult.data || []) {
    if (memberEmails.has(invite.email.toLowerCase())) continue;
    memberEmails.add(invite.email.toLowerCase());
    employees.push({ name: invite.name || invite.email, email: invite.email, active: false, invitationStatus: 'Pending' });
  }

  const leads: ExportLead[] = (leadResult.data || []).map((row) => {
    const mapped = toAppLead(row as any, names.get(row.assigned_to || '') || '');
    return {
      id: mapped.id,
      title: mapped.title,
      customerName: mapped.customerName,
      customerEmail: mapped.customerEmail,
      customerPhone: mapped.customerPhone,
      description: mapped.description,
      status: mapped.status,
      priority: mapped.priority,
      preferredDate: mapped.preferredDate,
      price: mapped.price,
      source: mapped.source,
      createdDate: mapped.createdDate,
      assignedEmployeeName: mapped.assignedEmployeeName,
    };
  });
  return { leads, employees };
}

async function readLegacyCompany(companyId: string): Promise<{ leads: ExportLead[]; employees: ExportEmployee[] }> {
  const [leadResult, employeeResult] = await Promise.all([
    supabase!.from('leads')
      .select('id,title,customer_name,email,phone,description,status,priority,preferred_date,budget,source,created_at,assigned_employee_name')
      .eq('organization_id', companyId)
      .order('created_at', { ascending: false }),
    supabase!.from('employees')
      .select('name,email,phone,specialization,capacity,active,invitation_status')
      .eq('organization_id', companyId),
  ]);
  if (leadResult.error || employeeResult.error) {
    throw new Error('Firemní data se nepodařilo načíst přes zabezpečené připojení.');
  }

  return {
    leads: (leadResult.data || []).map((row) => ({
      id: row.id,
      title: row.title || '',
      customerName: row.customer_name || '',
      customerEmail: row.email || '',
      customerPhone: row.phone || '',
      description: row.description || '',
      status: row.status || '',
      priority: row.priority || '',
      preferredDate: row.preferred_date || '',
      price: row.budget || '',
      source: row.source || '',
      createdDate: row.created_at || '',
    })),
    employees: (employeeResult.data || []).map((employee) => ({
      name: employee.name || '',
      email: employee.email || '',
      phone: employee.phone || '',
      specialization: employee.specialization || '',
      capacity: employee.capacity,
      active: employee.active ?? true,
      invitationStatus: employee.invitation_status,
    })),
  };
}

async function verifyOwnerMembership(companyId: string, userId: string): Promise<boolean> {
  if (appSchemaReadsEnabled) {
    const membership = await supabase!.from('app_members')
      .select('role,active')
      .eq('company_id', companyId)
      .eq('user_id', userId)
      .eq('active', true)
      .maybeSingle();
    return !membership.error && membership.data?.role === 'owner' && membership.data?.active === true;
  }

  const membership = await supabase!.from('users')
    .select('role')
    .eq('organization_id', companyId)
    .eq('id', userId)
    .maybeSingle();
  return !membership.error && membership.data?.role === 'owner';
}

export async function exportCompanyData(companyId: string, role: string): Promise<CompanyExportResult> {
  if (role !== 'owner') throw new Error('Export dat je dostupný pouze vlastníkovi firmy.');
  if (!isValidUUID(companyId)) throw new Error('Firma pro export není platná.');
  if (!supabase) throw new Error('Připojení k firemnímu účtu není dostupné.');

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new Error('Pro export je nutné být přihlášen jako vlastník firmy.');
  if (!await verifyOwnerMembership(companyId, user.id)) {
    throw new Error('Export dat je dostupný pouze aktivnímu vlastníkovi této firmy.');
  }

  const { leads, employees } = appSchemaReadsEnabled
    ? await readAppSchemaCompany(companyId)
    : await readLegacyCompany(companyId);

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
