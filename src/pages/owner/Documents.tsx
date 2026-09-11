import React from 'react';
import { DocumentsPage } from '@/features/DocumentsPage';
import { useBranding } from '@/hooks/useBranding';

export const OwnerDocumentsPage: React.FC = () => {
  const { branding } = useBranding();
  return <DocumentsPage branding={branding} />;
};
