import { useOrganization } from '@/entities/session';
import React from 'react';
import { EmbedWidgetPage } from '../../../public/embed';
import { useRouter } from '@/shared/lib/router';
import type { Lead } from '@/entities/lead';

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
