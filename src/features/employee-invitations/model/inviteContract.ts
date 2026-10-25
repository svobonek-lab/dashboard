import type { Employee } from '../../../entities/employee';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface InviteEmployeeResponse {
  invited: boolean;
  inviteId?: string;
  expiresInDays?: number;
}

export function buildInviteRequest(companyId: string, employee: { name?: string; email?: string }) {
  if (!UUID.test(companyId)) throw new Error('Firma nemá platný identifikátor.');
  const email = String(employee.email || '').trim().toLowerCase();
  const name = String(employee.name || '').trim();
  if (!name || !/^\S+@\S+\.\S+$/.test(email)) throw new Error('Vyplňte jméno a platný e-mail.');
  return { companyId, name, email };
}

export function toPendingEmployee(
  response: InviteEmployeeResponse,
  employee: { name?: string; email?: string; specialization?: string; role?: string },
  companyId: string,
): Employee {
  if (!response.invited || !response.inviteId || !UUID.test(response.inviteId)) {
    throw new Error('Server nepotvrdil vytvoření pozvánky.');
  }
  return {
    id: 'invite:' + response.inviteId,
    organization_id: companyId,
    name: String(employee.name || 'Zaměstnanec'),
    email: String(employee.email || '').trim().toLowerCase(),
    role: 'employee',
    specialization: employee.specialization || employee.role || '',
    capacity: 0,
    maxCapacity: 100,
    todaysJobsCount: 0,
    status: 'Green',
    phone: '',
    avatar: '',
    active: false,
    invitationStatus: 'Pending',
    invitedAt: new Date().toISOString(),
  };
}

