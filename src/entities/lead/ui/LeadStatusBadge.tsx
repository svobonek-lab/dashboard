import type { LeadStatus } from '../model';

const labels: Record<LeadStatus, string> = {
  New: 'Nová',
  Contacted: 'Kontaktováno',
  Quote: 'Nabídka',
  'In Progress': 'V realizaci',
  Completed: 'Dokončeno',
  Lost: 'Nezískáno',
};

export function LeadStatusBadge({ status }: { status: LeadStatus }) {
  return <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">{labels[status]}</span>;
}
