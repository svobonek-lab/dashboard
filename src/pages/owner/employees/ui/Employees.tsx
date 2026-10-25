import { useOrganization } from '@/entities/session';
import React from 'react';
import { EmployeesPage } from '@/features/manage-employees';
import type { Employee } from '@/entities/employee';
import type { Lead } from '@/entities/lead';

interface OwnerEmployeesPageProps {
  employees: Employee[];
  leads: Lead[];
  onEmployeeAdded?: (newEmp?: any) => void;
}

export const OwnerEmployeesPage: React.FC<OwnerEmployeesPageProps> = ({ employees, leads, onEmployeeAdded }) => {
  const { currentOrg, fetchEmployees, inviteEmployee, resendEmployeeInvite, resetEmployeePassword } = useOrganization();
  const branding = currentOrg?.branding || {};
  return <EmployeesPage employees={employees} leads={leads} branding={branding} onEmployeeAdded={onEmployeeAdded} fetchEmployees={fetchEmployees} inviteEmployee={inviteEmployee} resendEmployeeInvite={resendEmployeeInvite} resetEmployeePassword={resetEmployeePassword} />;
};
