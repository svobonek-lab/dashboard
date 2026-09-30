import { Employee, Lead } from '@/types';

/**
 * Returns only work assigned to the authenticated employee.
 * Owners and admins must use the unfiltered company list instead.
 */
export function getEmployeeLeads(
  leads: Lead[],
  employees: Employee[],
  userId?: string | null,
  email?: string | null
): Lead[] {
  if (!userId && !email) return [];

  const normalizedEmail = email?.trim().toLowerCase();
  const employeeIds = new Set(
    employees
      .filter((employee) => (
        employee.auth_user_id === userId ||
        employee.id === userId ||
        (normalizedEmail && employee.email.trim().toLowerCase() === normalizedEmail)
      ))
      .map((employee) => employee.id)
  );

  return leads.filter((lead) => (
    employeeIds.has(lead.assignedEmployeeId) || lead.assignedEmployeeId === userId
  ));
}

/**
 * Client-side guard for mutation handlers. Server-side RLS remains the
 * authority, but the UI must also fail closed when a forged lead object is
 * passed into an employee action.
 */
export function canEmployeeAccessLead(
  leadId: string,
  leads: Lead[],
  employees: Employee[],
  userId?: string | null,
  email?: string | null
): boolean {
  return getEmployeeLeads(leads, employees, userId, email).some((lead) => lead.id === leadId);
}
