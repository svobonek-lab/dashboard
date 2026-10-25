import type { Lead } from '../entities/lead';

export function canEditLeadDetails(role: string | undefined): boolean {
  // The database mutation guard remains authoritative. Assigned employees can
  // reach the editor, while RLS limits them to the reviewed operational fields.
  return role === 'owner' || role === 'super_admin' || role === 'employee';
}

export async function persistBeforeApply<T>(persist: () => Promise<T>, apply: (value: T) => void): Promise<T> {
  const value = await persist();
  apply(value);
  return value;
}

export { buildLeadAssignment, buildLeadAssignmentPatch, getAssignableEmployees, hydrateLeadAssignments } from '../entities/lead';
export { canWritePilot } from '../shared/api/pilotWritePolicy';
export { toLeadPatch } from '../shared/api/data/leadWritePatch';
