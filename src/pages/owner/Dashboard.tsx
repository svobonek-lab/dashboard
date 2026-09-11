import React from 'react';
import { useBranding } from '@/hooks/useBranding';
import { useRouter } from '../../app/router';
import { OwnerDashboard } from '@/features/OwnerDashboard';
import { Lead } from '@/types';

interface OwnerDashboardPageProps {
  leads: Lead[];
  onSelectLead: (lead: Lead) => void;
}

export const OwnerDashboardPage: React.FC<OwnerDashboardPageProps> = ({
  leads,
  onSelectLead
}) => {
  const { branding } = useBranding();
  const { navigate } = useRouter();

  return (
    <OwnerDashboard
      branding={branding}
      leads={leads}
      onSelectLead={(l) => {
        onSelectLead(l);
        navigate('/leads');
      }}
      onNavigateTab={(tab) => {
        navigate(`/${tab}`);
      }}
    />
  );
};
