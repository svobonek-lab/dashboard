import React, { useState } from 'react';
import { Lead, LeadStatus } from '@/types';
import { LeadsKanban } from '@/features/LeadsKanban';
import { LeadDetail } from '@/features/LeadDetail';

interface OwnerLeadsPageProps {
  leads: Lead[];
  selectedLead: Lead | null;
  onSelectLead: (lead: Lead | null) => void;
  onUpdateLeadStatus: (leadId: string, newStatus: LeadStatus) => void;
  onUpdateLead: (updatedLead: Lead) => void;
}

export const OwnerLeadsPage: React.FC<OwnerLeadsPageProps> = ({
  leads,
  selectedLead,
  onSelectLead,
  onUpdateLeadStatus,
  onUpdateLead
}) => {
  const [photoViewer, setPhotoViewer] = useState<{ url: string; title: string; category: string } | null>(null);

  if (selectedLead) {
    return (
      <LeadDetail
        lead={selectedLead}
        onBack={() => onSelectLead(null)}
        onOpenPhoto={(url, title, category) => setPhotoViewer({ url, title, category })}
        onOpenVoiceNotes={() => {}}
        onUpdateLead={onUpdateLead}
      />
    );
  }

  return (
    <LeadsKanban
      leads={leads}
      onSelectLead={onSelectLead}
      onUpdateLeadStatus={onUpdateLeadStatus}
    />
  );
};
