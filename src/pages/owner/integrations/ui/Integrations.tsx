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
  const [databaseMode, setDatabaseMode] = useState<'managed_cloud' | 'byodb'>('managed_cloud');
  const [databaseDriver, setDatabaseDriver] = useState<'postgres' | 'mysql' | 'mariadb' | 'mssql'>('postgres');
  const [modeBusy, setModeBusy] = useState(false);
  const [copied, setCopied] = useState<'inbox' | 'widget' | null>(null);
  const [securedIncomingLeadUrl, setSecuredIncomingLeadUrl] = useState('');
  const [incomingLeadError, setIncomingLeadError] = useState('');
  const [incomingLeadLoading, setIncomingLeadLoading] = useState(true);
  const connectorEnabled = import.meta.env.VITE_CONNECTOR_ENABLED === 'true';
  const byodbEnabled = import.meta.env.VITE_BYODB_ENABLED === 'true';
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
    try {
      setConnectorError('');
      const [status, mode] = await Promise.all([connectorClient.status(currentOrg.id, signal), connectorClient.databaseMode(currentOrg.id, signal)]);
      setConnectors(status.connectors);
      setDatabaseMode(mode.mode);
      if (mode.driver) setDatabaseDriver(mode.driver as typeof databaseDriver);
    }
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
  const canActivateByodb = byodbEnabled
    && Boolean(activeConnector?.mappings?.some(mapping => mapping.entityType === 'company' && mapping.approvedAt && mapping.mappedTargets.includes('name')))
    && Boolean(activeConnector?.mappings?.some(mapping => mapping.entityType === 'lead' && mapping.approvedAt && mapping.mappedTargets.includes('assignedToEmail')))
    && ['ready', 'success', 'partial_failure', 'paused'].includes(activeConnector?.status ?? '');
  const changeDatabaseMode = async (nextMode: 'managed_cloud' | 'byodb') => {
    if (!currentOrg?.id || modeBusy) return;
    if (nextMode === 'byodb' && (!activeConnector || !canActivateByodb)) return;
    setModeBusy(true);
    setConnectorError('');
    try {
      await connectorClient.setDatabaseMode(currentOrg.id, nextMode === 'byodb' ? activeConnector!.id : null,
        nextMode, nextMode === 'byodb' ? databaseDriver : null, nextMode === 'byodb');
      setDatabaseMode(nextMode);
      await fetchLeads();
    } catch {
      setConnectorError('Režim databáze se nepodařilo bezpečně změnit. Zkontrolujte schválené mapování a stav konektoru.');
    } finally { setModeBusy(false); }
  };

  const importCsv = async (
    _rows: Record<string, unknown>[],
    mapping: FieldMappingConfig,
    _deduplicate: boolean,
    _updateExisting: boolean,
    source: { fileName: string; csv: string },
  ) => {
    if (!currentOrg?.id) throw new Error('Import vyžaduje aktivní firmu.');
    if (databaseMode === 'byodb') throw new Error('CSV zápis do firemní databáze ještě není podporovaný. CSV import je při zapnutém BYODB vypnutý.');
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
        <div><p className="workspace-kicker">Chytrý dispečink</p><h1 className="workspace-title">Příjem poptávek a data</h1><p className="workspace-subtitle">Poptávky z e-mailu, webu a CSV jsou dostupné v režimu Managed Cloud. BYODB směruje pouze schválené mapované změny do firemní databáze.</p></div>
        <button type="button" disabled={databaseMode === 'byodb'} title={databaseMode === 'byodb' ? 'CSV import do firemní databáze není podporovaný.' : undefined} onClick={() => setIsCsvOpen(true)} className="workspace-primary-action inline-flex min-h-11 items-center justify-center gap-2 px-4 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"><UploadCloud className="h-4 w-4" /> Nahrát CSV</button>
      </header>

      {databaseMode === 'managed_cloud' ? <section className="mb-6 grid gap-4 lg:grid-cols-2">
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
      </section> : <p className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Veřejné formuláře a AI příjem zatím zapisují do cloudu, proto jsou v režimu BYODB skryté. Jejich bezpečné směrování do zdrojové databáze čeká na oddělený veřejný ingest kontrakt.</p>}

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
          <p className="mt-2 text-sm leading-6 text-slate-500">CSV je vhodné pro jednorázový start v Managed Cloud. Ověřený Synology konektor níže předává schválená mapovaná čtení a změny mezi aplikací a firemní databází.</p>
          <div className="mt-5 flex items-center gap-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-600"><Database className="h-4 w-4" /><span>PostgreSQL · MariaDB · SQL Server</span></div>
        </aside>
      </section>

      {isEnterprise && <section className="mt-6 space-y-4">
        <div>
          <p className="workspace-kicker">Průběžné napojení</p>
          <h2 className="mt-1 text-xl font-semibold tracking-tight text-slate-950">Databáze firmy navíc</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Nemusíte přecházet ze stávající databáze. V režimu Managed Cloud zůstává zdrojem Supabase. V režimu BYODB je zdrojem vaše schválená firemní mapa a potvrzené změny se přes odchozí konektor zapíší do vaší databáze.</p>
          <p className="mt-1 text-xs text-slate-400">Synology · PostgreSQL · MariaDB / MySQL · SQL Server</p>
        </div>
        {!connectorEnabled && <div className="workspace-panel p-5 text-sm leading-6 text-slate-600">Konektor není na tomto nasazení aktivovaný. CSV import zůstává dostupný a žádné ukázkové připojení se nezobrazuje jako živé.</div>}
        {connectorEnabled && currentOrg?.id ? <>
          {!activeConnector ? <ConnectorSetup companyId={currentOrg.id} onCreated={() => void refreshConnectors()} /> : null}
          <ConnectorStatus companyId={currentOrg.id} items={connectors} onRefresh={() => void refreshConnectors()} />
          {activeConnector && activeConnector.status !== 'awaiting_enrollment' ? <ConnectorMapping companyId={currentOrg.id} connector={activeConnector} onSaved={() => void refreshConnectors()} /> : null}
          <article className="workspace-panel grid gap-4 p-5 sm:grid-cols-[1fr_auto_auto] sm:items-end" aria-busy={modeBusy}>
            <div><h3 className="font-semibold text-slate-950">Režim databáze</h3><p className="mt-1 text-sm text-slate-500">Firemní režim se zapne až po schválené mapě. Zápisy zůstávají vypnuté, dokud connector build nemá schválený image digest.</p></div>
            <label className="text-xs font-semibold text-slate-600">Databázový server<select aria-label="Typ firemní databáze" value={databaseDriver} onChange={event => setDatabaseDriver(event.target.value as typeof databaseDriver)} className="mt-1 block min-h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-normal"><option value="postgres">PostgreSQL</option><option value="mysql">MySQL</option><option value="mariadb">MariaDB</option><option value="mssql">Microsoft SQL Server</option></select></label>
            <label className="text-xs font-semibold text-slate-600">Ukládání dat<select aria-label="Režim databáze" value={databaseMode} disabled={modeBusy} onChange={event => void changeDatabaseMode(event.target.value as 'managed_cloud' | 'byodb')} className="mt-1 block min-h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-normal"><option value="managed_cloud">Managed Cloud · Supabase</option><option value="byodb" disabled={!canActivateByodb}>Firemní databáze (BYODB){!byodbEnabled ? ' · čeká na staging ověření' : ''}</option></select></label>
            {!byodbEnabled && <p className="text-xs text-amber-700 sm:col-span-3">BYODB zůstává na tomto nasazení vypnuté, dokud nebude dokončeno oddělené staging ověření a vydán neměnný obraz konektoru.</p>}
          </article>
        </> : null}
        {connectorError && <p role="alert" className="text-sm text-amber-700">{connectorError}</p>}
      </section>}

      {databaseMode === 'managed_cloud' && <CSVImportModal isOpen={isCsvOpen} onClose={() => setIsCsvOpen(false)} onImportBatch={importCsv} />}
    </div>
  );
};
