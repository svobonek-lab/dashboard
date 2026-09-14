import { useOrganization } from '@/context/OrganizationContext';
import React from 'react';
import { QuotesPage } from '@/features/QuotesPage';

export const OwnerQuotesPage: React.FC = () => {
  const { currentOrg } = useOrganization();
  const branding = currentOrg?.branding || {};
  return <QuotesPage branding={branding} />;
};
