import React from 'react';
import { CommunicationCenterPage } from '@/features/CommunicationCenterPage';
import { useBranding } from '@/hooks/useBranding';
import { Lead } from '@/types';

interface OwnerCommunicationPageProps {
  leads: Lead[];
}

export const OwnerCommunicationPage: React.FC<OwnerCommunicationPageProps> = ({ leads }) => {
  const { branding } = useBranding();
  return <CommunicationCenterPage branding={branding} leads={leads} />;
};
