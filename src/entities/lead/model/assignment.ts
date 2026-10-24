import type { Lead } from './types';
import type { Employee } from '../../employee/model';

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
