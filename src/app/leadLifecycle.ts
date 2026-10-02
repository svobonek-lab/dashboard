import type { LeadStatus } from '@/types';

export type LifecycleRole = 'owner' | 'employee' | 'super_admin';

const employeeTransitions: Record<LeadStatus, LeadStatus[]> = {
  New: ['Contacted', 'Lost'],
  Contacted: ['Quote', 'In Progress', 'Lost'],
  Quote: ['In Progress', 'Lost'],
  'In Progress': ['Completed', 'Lost'],
  Completed: [],
  Lost: [],
};

const employeeNextStatus: Record<LeadStatus, LeadStatus | null> = {
  New: 'Contacted',
  Contacted: 'Quote',
  Quote: 'In Progress',
  'In Progress': 'Completed',
  Completed: null,
  Lost: null,
};

export function getEmployeeNextStatus(status: LeadStatus): LeadStatus | null {
  return employeeNextStatus[status] ?? null;
}

export function canTransitionLeadStatus(
  from: LeadStatus,
  to: LeadStatus,
  role: LifecycleRole = 'owner',
): boolean {
  if (from === to) return true;
  if (role === 'owner' || role === 'super_admin') return true;
  return employeeTransitions[from]?.includes(to) ?? false;
}

export function getLeadTransitionError(from: LeadStatus, to: LeadStatus, role: LifecycleRole): string | null {
  if (canTransitionLeadStatus(from, to, role)) return null;
  if (role === 'employee' && (from === 'Completed' || from === 'Lost')) {
    return 'Dokončenou nebo stornovanou zakázku může znovu otevřít pouze majitel.';
  }
  return 'Tento krok není v pracovním postupu povolený.';
}
