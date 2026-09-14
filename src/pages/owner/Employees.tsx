import { useOrganization } from '@/context/OrganizationContext';
import React from 'react';
import { EmployeesPage } from '@/features/EmployeesPage';
import { Employee, CompanyBranding } from '@/types';

interface OwnerEmployeesPageProps {
  employees: Employee[];
}

export const OwnerEmployeesPage: React.FC<OwnerEmployeesPageProps> = ({ employees }) => {
  const { currentOrg } = useOrganization();
  const branding = currentOrg?.branding || {};
  return <EmployeesPage employees={employees} branding={branding} />;
};
