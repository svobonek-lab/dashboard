import React from 'react';
import { EmployeesPage } from '@/features/EmployeesPage';
import { Employee, CompanyBranding } from '@/types';
import { useBranding } from '@/hooks/useBranding';

interface OwnerEmployeesPageProps {
  employees: Employee[];
}

export const OwnerEmployeesPage: React.FC<OwnerEmployeesPageProps> = ({ employees }) => {
  const { branding } = useBranding();
  return <EmployeesPage employees={employees} branding={branding} />;
};
