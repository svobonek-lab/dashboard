import React from 'react';
import { AnalyticsPage } from '@/features/AnalyticsPage';
import { useBranding } from '@/hooks/useBranding';

export const OwnerAnalyticsPage: React.FC = () => {
  const { branding } = useBranding();
  return <AnalyticsPage branding={branding} />;
};
