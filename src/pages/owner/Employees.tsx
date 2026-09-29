import { useOrganization } from '@/context/OrganizationContext';
import React from 'react';
import { EmployeesPage } from '@/features/EmployeesPage';
import { Employee, Lead } from '@/types';

interface OwnerEmployeesPageProps {
  employees: Employee[];
  leads: Lead[];
  onEmployeeAdded?: (newEmp?: any) => void;
}

export const OwnerEmployeesPage: React.FC<OwnerEmployeesPageProps> = ({ employees, leads, onEmployeeAdded }) => {
  const { currentOrg } = useOrganization();
  const branding = currentOrg?.branding || {};
  return <EmployeesPage employees={employees} leads={leads} branding={branding} onEmployeeAdded={onEmployeeAdded} />;
};
