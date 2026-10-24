import React, { useMemo, useState } from 'react';
import { ArrowRight, BriefcaseBusiness, CircleAlert, Plus, Search, UsersRound } from 'lucide-react';
import { CompanyBranding, Lead } from '@/types';
import { useOrganization } from '@/context/OrganizationContextBase';
import { getOwnerActiveJobs, getOwnerAttentionItems } from '../model/dashboardMetrics';

interface OwnerDashboardProps {
  branding: CompanyBranding;
  leads: Lead[];
  onSelectLead: (lead: Lead) => void;
  onNavigateTab: (tab: string) => void;
  employees?: unknown[];
  readOnly?: boolean;
}

const currency = new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: 'CZK', maximumFractionDigits: 0 });

const statusLabel: Record<Lead['status'], string> = {
  New: 'Nová poptávka', Contacted: 'Kontaktováno', Quote: 'Nabídka',
  'In Progress': 'V realizaci', Completed: 'Dokončeno', Lost: 'Nezískáno',
};

export const OwnerDashboard: React.FC<OwnerDashboardProps> = ({ leads, onSelectLead, onNavigateTab, readOnly = false }) => {
  const { currentOrg, dbUser, user } = useOrganization();
  const [searchQuery, setSearchQuery] = useState('');
  const userName = dbUser?.name?.split(' ')[0] || user?.email?.split('@')[0] || 'majiteli';
  const attentionItems = getOwnerAttentionItems(leads);
  const activeJobs = getOwnerActiveJobs(leads);
  const newLeads = leads.filter((lead) => lead.status === 'New');
  const pipelineValue = leads.filter((lead) => lead.status !== 'Lost' && lead.status !== 'Completed').reduce((sum, lead) => sum + (lead.price || 0), 0);
  const visibleLeads = useMemo(() => {
    const normalized = searchQuery.trim().toLocaleLowerCase('cs-CZ');
    if (!normalized) return leads.slice(0, 6);
    return leads.filter((lead) => [lead.title, lead.customerName, lead.city, lead.address]
      .some((value) => value?.toLocaleLowerCase('cs-CZ').includes(normalized))).slice(0, 8);
  }, [leads, searchQuery]);

  return (
    <div className="workspace-page">
      <header className="workspace-page-header">
        <div>
          <p className="workspace-kicker">{currentOrg?.name || 'StavbaFlow'}</p>
          <h1 className="workspace-title">Dobrý den, {userName}</h1>
          <p className="workspace-subtitle">{attentionItems.length ? `${attentionItems.length} ${attentionItems.length === 1 ? 'položka potřebuje' : 'položky potřebují'} vaši pozornost.` : 'Poptávky i rozpracované zakázky jsou pod kontrolou.'}</p>
        </div>
        {!readOnly && <button type="button" onClick={() => onNavigateTab('leads')} className="workspace-primary-action inline-flex min-h-11 items-center justify-center gap-2 px-4 text-sm font-semibold"><Plus className="h-4 w-4" /> Nová poptávka</button>}
      </header>

      <section className="grid gap-3 sm:grid-cols-3" aria-label="Souhrn firmy">
        <button type="button" onClick={() => onNavigateTab('leads')} className="workspace-metric text-left">
          <span className="workspace-metric-icon bg-blue-50 text-blue-600"><CircleAlert className="h-5 w-5" /></span><span className="workspace-metric-label">Nové poptávky</span><strong>{newLeads.length}</strong><small>čeká na první reakci</small>
        </button>
        <button type="button" onClick={() => onNavigateTab('projects')} className="workspace-metric text-left">
          <span className="workspace-metric-icon bg-emerald-50 text-emerald-700"><BriefcaseBusiness className="h-5 w-5" /></span><span className="workspace-metric-label">Zakázky v realizaci</span><strong>{activeJobs.length}</strong><small>právě probíhá</small>
        </button>
        <button type="button" onClick={() => onNavigateTab('leads')} className="workspace-metric text-left">
          <span className="workspace-metric-icon bg-violet-50 text-violet-700"><UsersRound className="h-5 w-5" /></span><span className="workspace-metric-label">Aktivní pipeline</span><strong className="workspace-metric-money">{currency.format(pipelineValue)}</strong><small>bez dokončených a nezískaných</small>
        </button>
      </section>

      <section className="workspace-panel overflow-hidden">
        <div className="workspace-toolbar">
          <div><h2 className="text-base font-semibold text-slate-950">Poptávky a zakázky</h2><p className="mt-1 text-sm text-slate-500">Nejdůležitější práce firmy na jednom místě.</p></div>
          <label className="relative w-full sm:w-80"><span className="sr-only">Hledat zakázku</span><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Hledat zákazníka nebo zakázku" className="workspace-search" /></label>
        </div>
        <div className="divide-y divide-slate-100">
          {visibleLeads.map((lead) => (
            <button key={lead.id} type="button" onClick={() => onSelectLead(lead)} className="workspace-list-row group">
              <span className="min-w-0"><strong className="block truncate text-sm font-semibold text-slate-950">{lead.title || 'Zakázka bez názvu'}</strong><small className="mt-1 block truncate text-xs text-slate-500">{lead.customerName || 'Zákazník neuveden'}{lead.city ? ` · ${lead.city}` : ''}</small></span>
              <span className="hidden rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 sm:inline-flex">{statusLabel[lead.status]}</span>
              <span className="text-right text-sm font-semibold text-slate-800">{lead.price ? currency.format(lead.price) : 'Cena neuvedena'}</span>
              <ArrowRight className="h-4 w-4 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-blue-600" />
            </button>
          ))}
          {!visibleLeads.length && <div className="px-5 py-12 text-center text-sm text-slate-500">Žádná zakázka neodpovídá hledání.</div>}
        </div>
        <div className="border-t border-slate-100 bg-slate-50/70 px-5 py-3 text-right"><button type="button" onClick={() => onNavigateTab('leads')} className="text-sm font-semibold text-blue-600 hover:text-blue-700">Zobrazit celý přehled</button></div>
      </section>
    </div>
  );
};
