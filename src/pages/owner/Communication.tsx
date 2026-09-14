import { useOrganization } from '@/context/OrganizationContext';
import React from 'react';
import { CommunicationCenterPage } from '@/features/CommunicationCenterPage';
import { Lead } from '@/types';

interface OwnerCommunicationPageProps {
  leads: Lead[];
}

export const OwnerCommunicationPage: React.FC<OwnerCommunicationPageProps> = ({ leads }) => {
  const { currentOrg } = useOrganization();
  const branding = currentOrg?.branding || {};
  return <CommunicationCenterPage branding={branding} leads={leads} />;
};
