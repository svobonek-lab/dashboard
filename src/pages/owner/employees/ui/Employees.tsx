import { useOrganization } from '@/context/OrganizationContext';
import React from 'react';
import { EmployeesPage } from '@/src/features/manage-employees';
import { Employee, Lead } from '@/types';

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
