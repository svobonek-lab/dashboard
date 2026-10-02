import type { Lead } from '../../types';

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

