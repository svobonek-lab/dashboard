const EMPLOYEE_DELETE_WINDOW_MS = 15 * 60 * 1000;

export function canDeleteLeadAttachment(
  role: string | undefined,
  userId: string | undefined,
  authorId: string,
  createdAt: string,
  now = new Date(),
): boolean {
  if (!userId) return false;
  if (role === 'owner') return true;
  if (role !== 'employee' || userId !== authorId) return false;
  const age = now.getTime() - new Date(createdAt).getTime();
  return Number.isFinite(age) && age >= 0 && age <= EMPLOYEE_DELETE_WINDOW_MS;
}
