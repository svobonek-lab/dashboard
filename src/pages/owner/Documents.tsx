import { useOrganization } from '@/context/OrganizationContext';
import React from 'react';
import { DocumentsPage } from '@/features/DocumentsPage';

export const OwnerDocumentsPage: React.FC = () => {
  const { currentOrg } = useOrganization();
  const branding = currentOrg?.branding || {};
  return <DocumentsPage branding={branding} />;
};
