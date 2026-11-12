import React, { useState } from 'react';
import { Cable, Check, Copy, Database, Download, Loader2, ShieldCheck } from 'lucide-react';
import { connectorClient } from '../api/connectorClient';
import type { EnrollmentResponse } from '../api/connectorContract';
import { buildConnectorPackage, isImmutableConnectorImage, type ConnectorPackageDriver } from '../model/buildConnectorPackage';

type DatabaseDriver = ConnectorPackageDriver;

const driverLabels: Record<DatabaseDriver, string> = {
  postgres: 'PostgreSQL',
  mariadb: 'MariaDB / MySQL',
  mssql: 'Microsoft SQL Server',
  mysql: 'MySQL',
};

export function ConnectorSetup({ companyId, onCreated, initialDriver, onDriverChange }: { companyId: string; onCreated: () => void; initialDriver?: DatabaseDriver; onDriverChange?: (driver: DatabaseDriver) => void }) {
  const [driver, setDriver] = useState<DatabaseDriver>(initialDriver ?? 'postgres');
  const [enrollment, setEnrollment] = useState<EnrollmentResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [packageBusy, setPackageBusy] = useState(false);
  const image = import.meta.env.VITE_CONNECTOR_IMAGE ?? '';
  const imageReady = isImmutableConnectorImage(image);

  const create = async () => {
    setBusy(true);
    setError('');
    try {
      setEnrollment(await connectorClient.createEnrollment(companyId));
      onCreated();
    } catch {
      setError('Připojení se nepřipravilo. Zkontrolujte nastavení a zkuste to znovu.');
    } finally {
      setBusy(false);
    }
  };

  const copyCode = async () => {
    if (!enrollment) return;
    try {
      await navigator.clipboard.writeText(enrollment.enrollmentCode);
      setCopied(true);
    } catch {
      setError('Kód se nepodařilo zkopírovat. Označte ho a zkopírujte ručně.');
    }
  };

  const downloadPackage = async () => {
    setPackageBusy(true); setError('');
    try {
      const bytes = await buildConnectorPackage({ image, driver, apiBaseUrl: window.location.origin, companyId });
      const url = URL.createObjectURL(new Blob([bytes as unknown as BlobPart], { type: 'application/zip' }));
      const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'stavbaflow-synology-connector.zip'; anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : '';
      setError(message === 'CONNECTOR_IMAGE_DIGEST_REQUIRED'
        ? 'Instalační balíček zatím není připravený. Počkejte na schválené vydání konektoru a zkuste stažení znovu.'
        : 'Balíček se nepřipravil. Zkontrolujte nastavení a zkuste to znovu.');
    }
    finally { setPackageBusy(false); }
  };

  return (
    <article className="workspace-panel p-6 sm:p-7" aria-live="polite">
      <div className="flex items-start gap-4"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600"><Cable className="h-5 w-5" /></span><div><h2 className="text-lg font-semibold text-slate-950">Databáze na Synology</h2><p className="mt-1 text-sm leading-6 text-slate-500">Konektor nejdřív načte metadata a provede kontrolní běh. Do vaší databáze začne zapisovat jen po schváleném mapování a výslovném zapnutí BYODB.</p></div></div>
      <div className="mt-5 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <label className="text-xs font-semibold text-slate-600">Typ databáze
            <select value={driver} onChange={event => { const nextDriver = event.target.value as DatabaseDriver; setDriver(nextDriver); onDriverChange?.(nextDriver); }} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal text-slate-950">
            {Object.entries(driverLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        {!enrollment ? <button type="button" disabled={busy || !imageReady} onClick={() => void create()} className="workspace-primary-action inline-flex min-h-11 items-center justify-center gap-2 px-4 text-sm font-semibold disabled:opacity-50">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}Připravit napojení</button> : null}
      </div>
      {!imageReady && !enrollment ? <p className="mt-2 text-xs text-amber-700">Připojení půjde připravit až po publikaci a kontrole neměnného vydání konektoru s image digestem.</p> : null}
      <div className="mt-4 flex items-center gap-2 text-sm text-emerald-700"><ShieldCheck className="h-4 w-4" />Bez příchozího portu. Hesla zůstávají jako lokální soubory na NAS</div>

      {enrollment ? <div className="mt-6 rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
        <p className="text-xs font-semibold text-blue-700">Jednorázový kód pro {driverLabels[driver]}, platí 15 minut</p>
        <div className="mt-2 flex items-center gap-2"><code className="min-w-0 flex-1 break-all rounded-xl bg-white px-3 py-2 text-sm text-slate-900">{enrollment.enrollmentCode}</code><button type="button" aria-label="Kopírovat kód" onClick={() => void copyCode()} className="rounded-xl border border-blue-200 bg-white p-2 text-blue-700">{copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}</button></div>
        <ol className="mt-4 grid gap-2 text-xs leading-5 text-slate-600 sm:grid-cols-3"><li><strong className="text-slate-800">1.</strong> Stáhněte instalační balíček z prověřeného vydání.</li><li><strong className="text-slate-800">2.</strong> Uložte kód do souboru pouze na NAS.</li><li><strong className="text-slate-800">3.</strong> Po prvním spojení se kód zneplatní.</li></ol>
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3"><p className="text-xs font-semibold text-amber-900">Jednorázový klíč konektoru</p><code className="mt-1 block break-all text-xs text-amber-950">{enrollment.connectorSecret}</code><p className="mt-1 text-xs text-amber-800">Uložte tento klíč pouze do souboru connector-identity na NAS. Po zavření stránky ho už nezobrazíme.</p></div>
        <button type="button" disabled={packageBusy} onClick={() => void downloadPackage()} className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"><Download className="h-4 w-4" />{packageBusy ? 'Připravuji balíček…' : 'Stáhnout balíček pro Synology'}</button>
        {!imageReady && <p className="mt-2 text-xs text-amber-700">Balíček bude ke stažení po schválení vydání konektoru.</p>}
        <p className="mt-3 text-xs text-slate-500">Platnost jednorázového kódu končí {new Date(enrollment.expiresAt).toLocaleString('cs-CZ')}. Přístupové údaje SQL doplňte jen na NAS; stáhnutý balíček obsahuje bezpečné zástupné hodnoty.</p>
      </div> : null}
      {error ? <p role="alert" className="mt-4 text-sm text-rose-700">{error}</p> : null}
    </article>
  );
}
