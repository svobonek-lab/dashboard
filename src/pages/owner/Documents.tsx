import { useOrganization } from '@/context/OrganizationContext';
import React from 'react';
import { DocumentsPage } from '@/features/DocumentsPage';
import { DEFAULT_DEMO_ORG_ID } from '@/lib/supabase';

export const OwnerDocumentsPage: React.FC = () => {
  const { currentOrg } = useOrganization();
  const branding = currentOrg?.branding || {};
  const isDemoOrg = currentOrg?.id === DEFAULT_DEMO_ORG_ID || currentOrg?.slug === 'pergoly-praha';
  return <DocumentsPage branding={branding} isDemo={isDemoOrg} />;
};
