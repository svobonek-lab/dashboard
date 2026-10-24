import { useOrganization } from '@/context/OrganizationContext';
import React from 'react';
import { EmbedWidgetPage } from '../../../public/embed';
import { useRouter } from '@/src/app/router';
import { Lead } from '@/types';

interface OwnerWidgetPageProps {
  onAddLead: (lead: Lead) => void;
}

export const OwnerWidgetPage: React.FC<OwnerWidgetPageProps> = ({ onAddLead }) => {
  const { currentOrg } = useOrganization();
  const branding = currentOrg?.branding || {};
  const { navigate } = useRouter();

  return (
    <EmbedWidgetPage
      branding={branding}
      onCreateLeadFromWidget={onAddLead}
      onNavigateTab={(tab) => {
        if (tab === 'leads') navigate('/leads');
        else if (tab === 'settings') navigate('/settings');
        else navigate('/dashboard');
      }}
    />
  );
};
