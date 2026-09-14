import { useOrganization } from '@/context/OrganizationContext';
import React from 'react';
import { EmployeesPage } from '@/features/EmployeesPage';
import { Employee, CompanyBranding } from '@/types';

interface OwnerEmployeesPageProps {
  employees: Employee[];
  onEmployeeAdded?: (newEmp?: any) => void;
}

export const OwnerEmployeesPage: React.FC<OwnerEmployeesPageProps> = ({ employees, onEmployeeAdded }) => {
  const { currentOrg } = useOrganization();
  const branding = currentOrg?.branding || {};
  return <EmployeesPage employees={employees} branding={branding} onEmployeeAdded={onEmployeeAdded} />;
};
