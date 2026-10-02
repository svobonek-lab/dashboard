import type { Employee, Lead, LeadStatus, Priority } from '@/types';

export interface AppMemberRow {
  company_id: string;
  user_id: string;
  name: string;
  email: string;
  role: 'owner' | 'employee';
  active: boolean;
}

export interface AppLeadRow {
  id: string;
  company_id: string;
  title: string;
  customer: string;
  email: string;
  phone: string;
  address: string;
  description: string;
  status: 'new' | 'contacted' | 'scheduled' | 'in_progress' | 'won' | 'lost';
  priority: 'low' | 'normal' | 'high';
  assigned_to: string | null;
  scheduled_at: string | null;
  duration_minutes: number;
  value: number;
  source: string;
  created_at: string;
  updated_at: string;
  revision: number;
}

export interface AppInviteRow {
  id: string;
  company_id: string;
  name: string;
  email: string;
  expires_at: string;
  created_at: string;
  accepted_at: string | null;
}

const leadStatus: Record<AppLeadRow['status'], LeadStatus> = {
  new: 'New',
  contacted: 'Contacted',
  scheduled: 'Quote',
  in_progress: 'In Progress',
  won: 'Completed',
  lost: 'Lost',
};

const priority: Record<AppLeadRow['priority'], Priority> = {
  low: 'Low',
  normal: 'Medium',
  high: 'High',
};

export function toAppMember(row: AppMemberRow): Employee {
  return {
    id: row.user_id,
    auth_user_id: row.user_id,
    organization_id: row.company_id,
    name: row.name,
    email: row.email,
    role: row.role,
    active: row.active,
    avatar: '',
    specialization: '',
    capacity: 0,
    maxCapacity: 0,
    todaysJobsCount: 0,
    status: 'Green',
    phone: '',
  };
}

export function toPendingInvite(row: AppInviteRow): Employee {
  return {
    id: row.id,
    organization_id: row.company_id,
    name: row.name || row.email,
    email: row.email,
    role: 'employee',
    active: false,
    invitationStatus: 'Pending',
    invitedAt: row.created_at,
    avatar: '',
    specialization: '',
    capacity: 0,
    maxCapacity: 0,
    todaysJobsCount: 0,
    status: 'Green',
    phone: '',
  };
}

export function toAppLead(row: AppLeadRow, assignedEmployeeName = ''): Lead {
  return {
    id: row.id,
    organization_id: row.company_id,
    title: row.title,
    description: row.description,
    city: '',
    address: row.address,
    customerName: row.customer,
    customerPhone: row.phone,
    customerEmail: row.email,
    preferredDate: row.scheduled_at || '',
    price: Number(row.value) || 0,
    status: leadStatus[row.status],
    priority: priority[row.priority],
    assignedEmployeeId: row.assigned_to || '',
    assignedEmployeeName,
    thumbnail: '',
    photos: [],
    files: [],
    checklist: [],
    aiSummary: {
      jobType: '',
      complexity: 'Medium',
      estimatedRange: row.value > 0 ? `${row.value} CZK` : 'Cena není uvedena',
      assignedEmployee: assignedEmployeeName,
      risks: [],
      recommendedNextStep: '',
    },
    timeline: [],
    aiChat: [],
    history: [],
    createdDate: row.created_at,
    projectType: '',
  };
}

export function isAssignedToMember(row: AppLeadRow, member: AppMemberRow): boolean {
  return row.company_id === member.company_id && row.assigned_to === member.user_id && member.active;
}
