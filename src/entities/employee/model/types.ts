export type EmployeeStatus = 'Green' | 'Orange' | 'Red';
export type EmployeeAccountStatus = 'Pending' | 'Active' | 'Disabled';

export interface Employee {
  id: string;
  name: string;
  avatar: string;
  specialization: string;
  role?: string;
  capacity: number; // percentage
  maxCapacity: number;
  todaysJobsCount: number;
  status: EmployeeStatus;
  invitationStatus?: EmployeeAccountStatus;
  active?: boolean;
  phone: string;
  email: string;
  currentLocation?: string;
  distanceKm?: number;
  inviteToken?: string;
  invitedAt?: string;
  organization_id?: string;
  auth_user_id?: string;
}

