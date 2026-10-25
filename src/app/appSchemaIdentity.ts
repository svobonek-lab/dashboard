import type { Organization } from '../entities/session';
import type { AppCompanyRow, AppMemberRow } from '../shared/api/productionSchema';
export type { AppCompanyRow } from '../shared/api/productionSchema';

export interface AppSchemaIdentity {
  member: AppMemberRow;
  organization: Organization;
  organizations: Organization[];
}

export function toAppOrganization(row: AppCompanyRow): Organization {
  return {
    id: row.id,
    name: row.name || 'Stavební firma',
    slug: row.slug || row.id,
    email: row.email || '',
    phone: row.phone || '',
    address: row.address || '',
    primary_color: row.color || '#2563eb',
    logo_url: row.logo_url || '',
    status: row.active === false ? 'Suspended' : 'Active',
    plan: row.plan || 'pilot',
    email_notifications: row.email_notifications !== false,
    subscription_status: row.subscription_status,
  };
}

export function resolveAppIdentity(members: AppMemberRow[], companies: AppCompanyRow[], userId: string, email?: string): AppSchemaIdentity | null {
  const normalizedEmail = email?.trim().toLowerCase();
  const member = members.find((item) => item.user_id === userId && item.active)
    || members.find((item) => normalizedEmail && item.email.trim().toLowerCase() === normalizedEmail && item.active);
  if (!member) return null;
  if (member.role !== 'owner' && member.role !== 'employee') return null;
  const organization = companies.find((company) => company.id === member.company_id && company.active !== false);
  if (!organization) return null;
  const mapped = toAppOrganization(organization);
  return { member, organization: mapped, organizations: [mapped] };
}

export async function readAppSchemaIdentity(client: any, userId: string, email?: string): Promise<AppSchemaIdentity | null> {
  // Resolve the membership server-side by the authenticated identity first.
  // Never download every company's member list into the browser.
  const { data: userMembers, error: memberError } = await client
    .from('app_members')
    .select('company_id,user_id,name,email,role,active')
    .eq('user_id', userId)
    .eq('active', true);
  if (memberError) throw memberError;
  let matchingMembers = (userMembers || []) as AppMemberRow[];
  if (!matchingMembers.length && email) {
    const { data: emailMembers, error: emailError } = await client
      .from('app_members')
      .select('company_id,user_id,name,email,role,active')
      .eq('email', email.trim().toLowerCase())
      .eq('active', true);
    if (emailError) throw emailError;
    matchingMembers = (emailMembers || []) as AppMemberRow[];
  }
  if (!matchingMembers.length) return null;
  const companyIds = [...new Set(matchingMembers.map((item) => item.company_id))];
  const { data: companies, error: companyError } = await client
    .from('app_companies')
    .select('id,name,slug,email,phone,address,color,logo_url,active,onboarding_completed,plan,email_notifications,subscription_status')
    .in('id', companyIds);
  if (companyError) throw companyError;
  return resolveAppIdentity(matchingMembers, (companies || []) as AppCompanyRow[], userId, email);
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function resolveOrAcceptAppIdentity(
  client: any,
  user: { id: string; email?: string; user_metadata?: Record<string, unknown> },
): Promise<AppSchemaIdentity | null> {
  const existing = await readAppSchemaIdentity(client, user.id, user.email);
  if (existing) return existing;
  const inviteId = String(user.user_metadata?.invite_id || '');
  if (!UUID.test(inviteId)) return null;
  const { error } = await client.rpc('app_accept_invite', { p_invite_id: inviteId });
  if (error) throw new Error(error.message || 'Pozvánku se nepodařilo aktivovat.');
  return readAppSchemaIdentity(client, user.id, user.email);
}
