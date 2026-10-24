import React, { useState } from 'react';
import { Employee, Lead, LeadStatus } from '@/types';
import { LeadsKanban, LeadDetail } from '@/src/features/manage-leads';
import { useOrganization } from '@/context/OrganizationContext';

interface OwnerLeadsPageProps {
  leads: Lead[];
  employees: Employee[];
  selectedLead: Lead | null;
  onSelectLead: (lead: Lead | null) => void;
  onUpdateLeadStatus: (leadId: string, newStatus: LeadStatus) => void;
  onUpdateLead: (updatedLead: Partial<Lead> & Pick<Lead, 'id'>) => Promise<unknown> | void;
  onAddLead: (newLead: Lead) => Promise<Lead> | Lead | void;
}

export const OwnerLeadsPage: React.FC<OwnerLeadsPageProps> = ({
  leads,
  employees,
  selectedLead,
  onSelectLead,
  onUpdateLeadStatus,
  onUpdateLead,
  onAddLead
}) => {
  const { dbUser } = useOrganization();
  const [photoViewer, setPhotoViewer] = useState<{ url: string; title: string; category: string } | null>(null);

  if (selectedLead) {
    return (
      <LeadDetail
        lead={selectedLead}
        employees={employees}
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
      onAddLead={onAddLead}
      author={dbUser?.email || 'owner'}
    />
  );
};
