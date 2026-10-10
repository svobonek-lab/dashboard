import type { Employee, Lead } from '../../types';

export function canEditLeadDetails(role: string | undefined): boolean {
  return role === 'owner' || role === 'super_admin';
}

export async function persistBeforeApply<T>(persist: () => Promise<T>, apply: (value: T) => void): Promise<T> {
  const value = await persist();
  apply(value);
  return value;
}

export function getAssignableEmployees(employees: Employee[], companyId: string | undefined): Employee[] {
  if (!companyId) return [];
  return employees.filter((employee) =>
    employee.organization_id === companyId
    && employee.role === 'employee'
    && employee.active !== false
    && employee.invitationStatus !== 'Pending'
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(employee.id),
  );
}

export function buildLeadAssignment(
  lead: Lead,
  employeeId: string,
  employees: Employee[],
  companyId: string | undefined,
): Lead {
  if (!employeeId) {
    return { ...lead, assignedEmployeeId: '', assignedEmployeeName: '' };
  }
  const employee = getAssignableEmployees(employees, companyId).find((item) => item.id === employeeId);
  if (!employee) throw new Error('Vyberte aktivního zaměstnance stejné firmy.');
  return { ...lead, assignedEmployeeId: employee.id, assignedEmployeeName: employee.name };
}

export function buildLeadAssignmentPatch(leadId: string, employee?: Pick<Employee, 'id' | 'name'>): Pick<Lead, 'id' | 'assignedEmployeeId' | 'assignedEmployeeName'> {
  return {
    id: leadId,
    assignedEmployeeId: employee?.id || '',
    assignedEmployeeName: employee?.name || '',
  };
}

export function hydrateLeadAssignments(leads: Lead[], employees: Employee[]): Lead[] {
  const employeesById = new Map(employees.map((employee) => [employee.id, employee]));
  return leads.map((lead) => {
    const employee = employeesById.get(lead.assignedEmployeeId || '');
    if (!employee || employee.organization_id !== lead.organization_id || employee.active === false) return lead;
    return { ...lead, assignedEmployeeName: employee.name };
  });
}

export function canWritePilot(env: Record<string, unknown>): boolean {
  return env.VITE_PILOT_WRITES === 'true'
    && env.VITE_SUPABASE_URL === 'https://oncmtmrhmjlerbwkrecv.supabase.co';
}

const statuses: Record<string,string> = {New:'new',Contacted:'contacted',Quote:'scheduled','In Progress':'in_progress',Completed:'won',Lost:'lost'};
const priorities: Record<string,string> = {Low:'low',Medium:'normal',High:'high'};
export function toLeadPatch(lead: Partial<Lead>): Record<string,unknown> {
  const patch: Record<string,unknown> = {};
  const fields = {title:'title',customerName:'customer',customerEmail:'email',customerPhone:'phone',address:'address',description:'description'} as const;
  for (const [source,target] of Object.entries(fields)) {
    const value = lead[source as keyof typeof fields];
    if(value !== undefined) patch[target] = String(value);
  }
  if(lead.price !== undefined) {
    if(!Number.isFinite(lead.price) || lead.price < 0) throw new Error('Cena musí být nezáporné číslo.');
    patch.value=lead.price;
  }
  if(lead.status !== undefined) {
    if(!statuses[lead.status]) throw new Error('Neplatný stav zakázky.');
    patch.status=statuses[lead.status];
  }
  if(lead.priority !== undefined) {
    if(!priorities[lead.priority]) throw new Error('Neplatná priorita.');
    patch.priority=priorities[lead.priority];
  }
  if(lead.assignedEmployeeId !== undefined) {
    if(lead.assignedEmployeeId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(lead.assignedEmployeeId)) throw new Error('Vyberte skutečného člena firmy.');
    patch.assigned_to=lead.assignedEmployeeId || null;
  }
  if(lead.preferredDate !== undefined) {
    if(lead.preferredDate && !Number.isFinite(Date.parse(lead.preferredDate))) throw new Error('Zadejte platný termín.');
    patch.scheduled_at=lead.preferredDate ? new Date(lead.preferredDate).toISOString() : null;
  }
  return patch;
}
