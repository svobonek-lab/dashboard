import React, { useMemo, useState } from 'react';
import { BriefcaseBusiness, CircleAlert, Search, UsersRound } from 'lucide-react';
import type { CompanyBranding } from '@/entities/company';
import type { Lead } from '@/entities/lead';
import { useOrganization } from '@/entities/session';
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
  const [attentionOnly, setAttentionOnly] = useState(false);
  const userName = dbUser?.name?.split(' ')[0] || user?.email?.split('@')[0] || 'majiteli';
  const attentionItems = useMemo(() => getOwnerAttentionItems(leads), [leads]);
  const activeJobs = getOwnerActiveJobs(leads);
  const newLeads = leads.filter((lead) => lead.status === 'New');
  const pipelineValue = leads.filter((lead) => lead.status !== 'Lost' && lead.status !== 'Completed').reduce((sum, lead) => sum + (lead.price || 0), 0);
  const visibleLeads = useMemo(() => {
    const normalized = searchQuery.trim().toLocaleLowerCase('cs-CZ');
    const attentionIds = new Set(attentionItems.map((item) => item.leadId));
    const candidates = attentionOnly ? leads.filter((lead) => attentionIds.has(lead.id)) : leads;
    if (!normalized) return candidates.slice(0, 6);
    return candidates.filter((lead) => [lead.title, lead.customerName, lead.city, lead.address]
      .some((value) => value?.toLocaleLowerCase('cs-CZ').includes(normalized))).slice(0, 8);
  }, [attentionItems, attentionOnly, leads, searchQuery]);

  return (
    <div className="workspace-page owner-workspace">
      <header className="workspace-page-header">
        <div>
          <p className="workspace-kicker">{currentOrg?.name || 'StavbaFlow'}</p>
          <h1 className="workspace-title">Dobrý den, {userName}</h1>
        </div>
        {!readOnly && <button type="button" onClick={() => onNavigateTab('leads')} className="workspace-primary-action inline-flex min-h-11 items-center justify-center gap-2 px-4 text-sm font-semibold">Otevřít poptávky </button>}
      </header>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3" aria-label="Souhrn firmy">
        <button type="button" onClick={() => onNavigateTab('leads')} className="workspace-metric text-left">
          <span className="workspace-metric-icon bg-blue-50 text-blue-600"><CircleAlert className="h-5 w-5" /></span><span className="workspace-metric-label">Zobrazit nové poptávky</span><strong>{newLeads.length}</strong><small>čeká na první reakci</small>
        </button>
        <button type="button" onClick={() => onNavigateTab('projects')} className="workspace-metric text-left">
          <span className="workspace-metric-icon bg-emerald-50 text-emerald-700"><BriefcaseBusiness className="h-5 w-5" /></span><span className="workspace-metric-label">Zobrazit realizace</span><strong>{activeJobs.length}</strong><small>právě probíhá</small>
        </button>
        <button type="button" onClick={() => onNavigateTab('leads')} className="workspace-metric col-span-2 text-left sm:col-span-1">
          <span className="workspace-metric-icon bg-blue-50 text-blue-700"><UsersRound className="h-5 w-5" /></span><span className="workspace-metric-label">Zobrazit otevřené zakázky</span><strong className="workspace-metric-money tabular-nums">{currency.format(pipelineValue)}</strong><small>bez dokončených a nezískaných</small>
        </button>
      </section>

      <div className="sf-work-grid"><section className="workspace-panel overflow-hidden">
        <div className="workspace-toolbar">
          <h2 className="text-base font-semibold text-slate-950">Poptávky a zakázky</h2>
          <label className="relative w-full sm:w-80"><span className="sr-only">Hledat zakázku</span><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Hledat zákazníka nebo zakázku" className="workspace-search" /></label>
        </div>
        <div className="border-b border-slate-200 px-4 py-2 sm:px-5">
          <button type="button" aria-pressed={attentionOnly} onClick={() => setAttentionOnly((selected) => !selected)} className={`min-h-11 rounded-lg border px-3 text-sm font-semibold ${attentionOnly ? 'border-blue-300 bg-blue-50 text-blue-800' : 'border-slate-200 text-slate-700 hover:bg-slate-50'}`}>
            Zobrazit k vyřízení ({attentionItems.length})
          </button>
        </div>
        <div className="divide-y divide-slate-100">
          {visibleLeads.map((lead) => (
            <button key={lead.id} type="button" aria-label={`Otevřít zakázku ${lead.title || lead.customerName}`} onClick={() => onSelectLead(lead)} className="workspace-list-row group">
              <span className="min-w-0"><strong className="block break-words text-sm font-semibold text-slate-950">{lead.title || 'Zakázka bez názvu'}</strong><small className="mt-1 block truncate text-xs text-slate-500">{lead.customerName || 'Zákazník neuveden'}{lead.city ? `, ${lead.city}` : ''}</small></span>
              <span data-status={lead.status} className="workspace-row-status w-fit rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">{statusLabel[lead.status]}</span>
              <span className="text-right tabular-nums text-sm font-semibold text-slate-800">{lead.price ? currency.format(lead.price) : 'Cena neuvedena'}</span>

            </button>
          ))}
          {!visibleLeads.length && <div className="px-5 py-12 text-center text-sm text-slate-500"><p>{searchQuery.trim() ? 'Žádná zakázka neodpovídá hledání.' : attentionOnly ? 'Žádné poptávky ani nabídky k vyřízení.' : 'Zatím tu nejsou žádné poptávky ani zakázky.'}</p><button type="button" onClick={() => searchQuery.trim() ? setSearchQuery('') : attentionOnly ? setAttentionOnly(false) : onNavigateTab('leads')} className="mt-3 font-semibold text-blue-700">{searchQuery.trim() ? 'Vymazat hledání' : attentionOnly ? 'Zobrazit všechny zakázky' : 'Otevřít poptávky'}</button></div>}
        </div>
        <div className="border-t border-slate-100 bg-slate-50/70 px-5 py-3 text-right"><button type="button" onClick={() => onNavigateTab('leads')} className="text-sm font-semibold text-blue-600 hover:text-blue-700">Zobrazit celý přehled</button></div>
      </section>
      <aside className="sf-work-focus" aria-label="Další kroky">
        <div className="sf-focus-heading"><span className="sf-focus-dot" /><h2>K vyřízení</h2><span>{attentionItems.length}</span></div>
        <p>Začněte zákazníky, kteří čekají na další krok.</p>
        {attentionItems.slice(0, 4).map(item => <button type="button" key={item.id} aria-label={`Otevřít zakázku ${item.client}`} onClick={() => { const lead = leads.find(candidate => candidate.id === item.leadId); if (lead) onSelectLead(lead); }} className="sf-focus-item"><small>{item.tag}</small><strong>{item.client}</strong><span>{item.deadline}</span></button>)}
        {!attentionItems.length && <div className="sf-focus-empty"><p>Žádné nové poptávky ani nabídky k vyřízení.</p><button type="button" onClick={() => onNavigateTab('leads')} className="mt-3 font-semibold text-blue-700">Otevřít poptávky</button></div>}
        <div className="sf-pipeline"><h3>Rozložení zakázek</h3>{(['New', 'Quote', 'In Progress', 'Completed'] as Lead['status'][]).map(status => { const count = leads.filter(lead => lead.status === status).length; return <div key={status}><span>{statusLabel[status]}<strong>{count}</strong></span><meter min={0} max={Math.max(leads.length, 1)} value={count} aria-label={statusLabel[status]} /></div>; })}</div>
      </aside></div>
    </div>
  );
};
