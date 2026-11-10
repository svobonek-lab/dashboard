import type { LeadSource } from './types';

export function getLeadSourceBadge(source: LeadSource | undefined): { icon: 'inbox' | 'globe'; label: string } | null {
  if (source === 'ai_inbox') return { icon: 'inbox', label: 'AI zpracováno' };
  if (source === 'widget' || source === 'public_form') return { icon: 'globe', label: 'Z webu' };
  return null;
}
