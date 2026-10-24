import type { LeadSource } from './types';

export function getLeadSourceBadge(source: LeadSource | undefined): { icon: string; label: string } | null {
  if (source === 'ai_inbox') return { icon: '🤖', label: 'AI zpracováno' };
  if (source === 'widget' || source === 'public_form') return { icon: '🌐', label: 'Z webu' };
  return null;
}
