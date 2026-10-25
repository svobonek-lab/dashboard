import React, { useCallback, useEffect, useState } from 'react';
import { Bot, Check, CheckCircle2, Copy, Database, FileSpreadsheet, Globe2, LockKeyhole, UploadCloud } from 'lucide-react';
import { CSVImportModal } from '@/features/import-leads';
import { useOrganization } from '@/entities/session';
import { supabase } from '@/shared/api/supabase';
import type { Employee } from '@/entities/employee';
import type { Lead } from '@/entities/lead';
import type { FieldMappingConfig } from '@/features/import-leads';
import { ConnectorSetup, ConnectorStatus, ConnectorMapping } from '@/features/manage-integrations';
import { connectorClient } from '@/features/manage-integrations';
import type { ConnectorSummary } from '@/features/manage-integrations';

interface IntegrationsProps {
  leads?: Lead[];
  employees?: Employee[];
  onAddLead?: (lead: Lead) => void;
}

export const Integrations: React.FC<IntegrationsProps> = () => {
  const { currentOrg, fetchLeads } = useOrganization();
  const [isCsvOpen, setIsCsvOpen] = useState(false);
  const [connectors, setConnectors] = useState<ConnectorSummary[]>([]);
  const [connectorError, setConnectorError] = useState('');
  const [copied, setCopied] = useState<'inbox' | 'widget' | null>(null);
  const [securedIncomingLeadUrl, setSecuredIncomingLeadUrl] = useState('');
  const [incomingLeadError, setIncomingLeadError] = useState('');
  const [incomingLeadLoading, setIncomingLeadLoading] = useState(true);
  const connectorEnabled = import.meta.env.VITE_CONNECTOR_ENABLED === 'true';
  const isEnterprise = String(currentOrg?.plan || '').toUpperCase() === 'ENTERPRISE';
  const origin = typeof window === 'undefined' ? 'https://[DOMENA]' : window.location.origin;
  const publicTenantKey = currentOrg?.slug || '[PUBLIC_KEY]';
  const widgetSnippet = `<script src="${origin}/widget.js?org_id=${encodeURIComponent(publicTenantKey)}"></script>`;

  const copyValue = async (kind: 'inbox' | 'widget', value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(kind);
      window.setTimeout(() => setCopied((current) => current === kind ? null : current), 1800);
    } catch {
      setCopied(null);
    }
  };
  const refreshConnectors = useCallback(async (signal?: AbortSignal) => {
    if (!connectorEnabled || !currentOrg?.id) return;
    try { setConnectorError(''); setConnectors((await connectorClient.status(currentOrg.id, signal)).connectors); }
    catch (cause) { if (!(cause instanceof DOMException && cause.name === 'AbortError')) setConnectorError('Napojení databáze zatím není na tomto prostředí dostupné.'); }
  }, [connectorEnabled, currentOrg?.id]);
  useEffect(() => { const controller = new AbortController(); void refreshConnectors(controller.signal); return () => controller.abort(); }, [refreshConnectors]);
  useEffect(() => {
    const controller = new AbortController();
    const loadWebhook = async () => {
      setIncomingLeadLoading(true);
      setSecuredIncomingLeadUrl('');
      setIncomingLeadError('');
      try {
        if (!currentOrg?.id || !supabase) throw new Error('AI inbox není nakonfigurovaný.');
        const { data } = await supabase.auth.getSession();
        const accessToken = data.session?.access_token;
        if (!accessToken) throw new Error('Před zobrazením URL se znovu přihlaste.');
        const response = await fetch(`/api/incoming-lead-config?companyId=${encodeURIComponent(currentOrg.id)}`, {
          headers: { Authorization: `Bearer ${accessToken}` }, signal: controller.signal,
        });
        const body = await response.json();
        if (!response.ok || typeof body?.webhookUrl !== 'string') throw new Error('AI inbox není aktivní.');
        setSecuredIncomingLeadUrl(body.webhookUrl);
      } catch (error) {
        if (!(error instanceof DOMException && error.name === 'AbortError')) setIncomingLeadError('Webhook zatím není na tomto prostředí aktivovaný.');
      } finally {
        if (!controller.signal.aborted) setIncomingLeadLoading(false);
      }
    };
    void loadWebhook();
    return () => controller.abort();
  }, [currentOrg?.id]);
  const activeConnector = connectors.find(item => item.status !== 'revoked');

  const importCsv = async (
    _rows: Record<string, unknown>[],
    mapping: FieldMappingConfig,
    _deduplicate: boolean,
    _updateExisting: boolean,
    source: { fileName: string; csv: string },
  ) => {
    if (!currentOrg?.id) throw new Error('Import vyžaduje aktivní firmu.');
    const { data } = await supabase?.auth.getSession() || { data: { session: null } };
    const token = data.session?.access_token;
    if (!token) throw new Error('Před importem se znovu přihlaste.');

    const dryRun = await fetch('/api/import-leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'dry_run', companyId: currentOrg.id, fileName: source.fileName, csv: source.csv, mapping }),
    });
    const preview = await dryRun.json();
    if (!dryRun.ok) throw new Error(preview?.error || 'Kontrolní náhled importu selhal.');

    const commit = await fetch('/api/import-leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ mode: 'commit', companyId: currentOrg.id, fileName: source.fileName, csv: source.csv, mapping, fingerprint: preview.fingerprint }),
    });
    const result = await commit.json();
    if (!commit.ok) throw new Error(result?.error || 'Import se nepodařilo bezpečně uložit.');
    await fetchLeads();
    const created = Number(result?.created ?? result?.inserted ?? result?.imported_count ?? 0);
    const updated = Number(result?.updated ?? result?.updated_count ?? 0);
    return { ...result, message: `Import byl uložen. Nové záznamy: ${created}, aktualizované: ${updated}.` };
  };

  return (
    <div className="workspace-page mx-auto max-w-5xl">
      <header className="workspace-page-header">
        <div><p className="workspace-kicker">Chytrý dispečink</p><h1 className="workspace-title">Příjem poptávek a data</h1><p className="workspace-subtitle">Poptávky z e-mailu a webu míří rovnou do StavbaFlow. CSV zůstává bezpečnou cestou pro první import stávajících dat.</p></div>
        <button type="button" onClick={() => setIsCsvOpen(true)} className="workspace-primary-action inline-flex min-h-11 items-center justify-center gap-2 px-4 text-sm font-semibold"><UploadCloud className="h-4 w-4" /> Nahrát CSV</button>
      </header>

      <section className="mb-6 grid gap-4 lg:grid-cols-2">
        <article className="workspace-panel overflow-hidden p-6 sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-50 text-violet-700"><Bot className="h-5 w-5" /></span>
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-emerald-700">AI příjem</span>
          </div>
          <h2 className="mt-5 text-lg font-semibold tracking-tight text-slate-950">AI Dispečer (e-mail)</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">Unikátní webhook URL přijímá poptávky právě pro tuto firmu. Vložte ji do Make.com nebo do ověřené e-mailové automatizace.</p>
          <div className="mt-5 flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-2">
            <code className="min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap px-2 text-xs text-slate-700">
              {incomingLeadLoading ? 'Načítám zabezpečenou URL…' : securedIncomingLeadUrl || 'Webhook není aktivní'}
            </code>
            <button type="button" disabled={!securedIncomingLeadUrl} onClick={() => void copyValue('inbox', securedIncomingLeadUrl)} className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-xl bg-slate-950 px-3 text-xs font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40" aria-label="Kopírovat webhook AI dispečera">
              {copied === 'inbox' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}{copied === 'inbox' ? 'Zkopírováno' : 'Kopírovat'}
            </button>
          </div>
          {incomingLeadError && <p role="alert" className="mt-2 text-xs text-amber-700">{incomingLeadError}</p>}
          <p className="mt-3 text-xs leading-5 text-slate-400">URL obsahuje podepsaný token firmy. Sdílejte ji pouze s integrační službou; AI rozpozná poptávku a uloží ji do správného workspace.</p>
        </article>

        <article className="workspace-panel overflow-hidden p-6 sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-700"><Globe2 className="h-5 w-5" /></span>
            <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-blue-700">Web firmy</span>
          </div>
          <h2 className="mt-5 text-lg font-semibold tracking-tight text-slate-950">Webový formulář</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">Vložte jediný řádek před koncovou značku <code>&lt;/body&gt;</code> na webu firmy.</p>
          <div className="mt-5 flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-2">
            <code className="min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap px-2 text-xs text-slate-700">{widgetSnippet}</code>
            <button type="button" onClick={() => void copyValue('widget', widgetSnippet)} className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-xl bg-slate-950 px-3 text-xs font-semibold text-white hover:bg-slate-800" aria-label="Kopírovat kód webového formuláře">
              {copied === 'widget' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}{copied === 'widget' ? 'Zkopírováno' : 'Kopírovat'}
            </button>
          </div>
          <p className="mt-3 text-xs leading-5 text-slate-400">Formulář se otevře nad existujícím webem a uloží poptávku do správné firmy.</p>
        </article>
      </section>

      <section className="grid gap-4 md:grid-cols-[1.25fr_.75fr]">
        <article className="workspace-panel p-6 sm:p-7">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600"><FileSpreadsheet className="h-5 w-5" /></span>
          <h2 className="mt-5 text-lg font-semibold tracking-tight text-slate-950">Kontrolovaný CSV import</h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">Nejdřív zkontrolujete sloupce a jejich mapování. Server následně ověří firmu, oprávnění majitele a fingerprint souboru. Opakovaný import nevytvoří stejné záznamy podruhé.</p>
          <ul className="mt-5 grid gap-3 text-sm text-slate-700 sm:grid-cols-2">
            {['Náhled před zápisem', 'Mapování polí', 'Kontrola duplicit', 'Auditovatelný fingerprint'].map((item) => <li key={item} className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600" />{item}</li>)}
          </ul>
          <button type="button" onClick={() => setIsCsvOpen(true)} className="mt-6 inline-flex min-h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50">Vybrat CSV soubor</button>
        </article>

        <aside className="workspace-panel p-6 sm:p-7">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-600"><LockKeyhole className="h-5 w-5" /></span>
          <h2 className="mt-5 text-base font-semibold text-slate-950">Dvě bezpečné cesty</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">CSV je vhodné pro jednorázový start. Ověřený Synology konektor níže drží vybraná data průběžně aktuální bez zápisu zpět do firemní databáze.</p>
          <div className="mt-5 flex items-center gap-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-600"><Database className="h-4 w-4" /><span>PostgreSQL · MariaDB · SQL Server</span></div>
        </aside>
      </section>

      {isEnterprise && <section className="mt-6 space-y-4">
        <div><p className="workspace-kicker">Průběžné napojení</p><h2 className="mt-1 text-xl font-semibold tracking-tight text-slate-950">Synology Database Connector</h2></div>
        {!connectorEnabled && <div className="workspace-panel p-5 text-sm leading-6 text-slate-600">Konektor není na tomto nasazení aktivovaný. CSV import zůstává dostupný a žádné ukázkové připojení se nezobrazuje jako živé.</div>}
        {connectorEnabled && currentOrg?.id ? <>
          {!activeConnector ? <ConnectorSetup companyId={currentOrg.id} onCreated={() => void refreshConnectors()} /> : null}
          <ConnectorStatus companyId={currentOrg.id} items={connectors} onRefresh={() => void refreshConnectors()} />
          {activeConnector && activeConnector.status !== 'awaiting_enrollment' ? <ConnectorMapping companyId={currentOrg.id} connector={activeConnector} onSaved={() => void refreshConnectors()} /> : null}
        </> : null}
        {connectorError && <p role="alert" className="text-sm text-amber-700">{connectorError}</p>}
      </section>}

      <CSVImportModal isOpen={isCsvOpen} onClose={() => setIsCsvOpen(false)} onImportBatch={importCsv} />
    </div>
  );
};
