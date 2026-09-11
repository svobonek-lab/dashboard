import React from 'react';
import { QuotesPage } from '@/features/QuotesPage';
import { useBranding } from '@/hooks/useBranding';

export const OwnerQuotesPage: React.FC = () => {
  const { branding } = useBranding();
  return <QuotesPage branding={branding} />;
};
