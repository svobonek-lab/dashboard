import { useOrganization } from '@/context/OrganizationContext';
import React from 'react';
import { AnalyticsPage } from '@/features/AnalyticsPage';

export const OwnerAnalyticsPage: React.FC = () => {
  const { currentOrg } = useOrganization();
  const branding = currentOrg?.branding || {};
  return <AnalyticsPage branding={branding} />;
};
