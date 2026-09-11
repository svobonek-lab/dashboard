import React from 'react';
import { EmbedWidgetPage } from '@/features/EmbedWidgetPage';
import { useBranding } from '@/hooks/useBranding';
import { useRouter } from '../../app/router';
import { Lead } from '@/types';

interface OwnerWidgetPageProps {
  onAddLead: (lead: Lead) => void;
}

export const OwnerWidgetPage: React.FC<OwnerWidgetPageProps> = ({ onAddLead }) => {
  const { branding } = useBranding();
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
