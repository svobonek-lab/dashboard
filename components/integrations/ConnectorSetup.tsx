import React, { useState } from 'react';
import { Cable, Check, Copy, Database, Loader2, ShieldCheck } from 'lucide-react';
import { connectorClient } from '@/src/app/connectorClient';
import type { EnrollmentResponse } from '@/src/app/connectorContract';

type DatabaseDriver = 'postgres' | 'mariadb' | 'mssql';

const driverLabels: Record<DatabaseDriver, string> = {
  postgres: 'PostgreSQL',
  mariadb: 'MariaDB / MySQL',
  mssql: 'Microsoft SQL Server',
};

export function ConnectorSetup({ companyId, onCreated }: { companyId: string; onCreated: () => void }) {
  const [driver, setDriver] = useState<DatabaseDriver>('postgres');
  const [enrollment, setEnrollment] = useState<EnrollmentResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  const create = async () => {
    setBusy(true);
    setError('');
    try {
      setEnrollment(await connectorClient.createEnrollment(companyId));
      onCreated();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Připojení nelze připravit.');
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

  return (
    <article className="workspace-panel p-6 sm:p-7" aria-live="polite">
      <div className="flex items-start gap-4"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600"><Cable className="h-5 w-5" /></span><div><h2 className="text-lg font-semibold text-slate-950">Databáze na Synology</h2><p className="mt-1 text-sm leading-6 text-slate-500">Konektor pouze čte vybraná data a odesílá je šifrovaným spojením ven. Přístupové údaje zůstávají na vašem NAS.</p></div></div>
      <div className="mt-5 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <label className="text-xs font-semibold text-slate-600">Typ databáze
          <select value={driver} onChange={event => setDriver(event.target.value as DatabaseDriver)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal text-slate-950">
            {Object.entries(driverLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        {!enrollment ? <button type="button" disabled={busy} onClick={() => void create()} className="workspace-primary-action inline-flex min-h-11 items-center justify-center gap-2 px-4 text-sm font-semibold disabled:opacity-50">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}Připravit napojení</button> : null}
      </div>
      <div className="mt-4 flex items-center gap-2 text-sm text-emerald-700"><ShieldCheck className="h-4 w-4" />Bez příchozího portu a bez zápisu do zdroje</div>

      {enrollment ? <div className="mt-6 rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Jednorázový kód pro {driverLabels[driver]} · platí 15 minut</p>
        <div className="mt-2 flex items-center gap-2"><code className="min-w-0 flex-1 break-all rounded-xl bg-white px-3 py-2 text-sm text-slate-900">{enrollment.enrollmentCode}</code><button type="button" aria-label="Kopírovat kód" onClick={() => void copyCode()} className="rounded-xl border border-blue-200 bg-white p-2 text-blue-700">{copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}</button></div>
        <ol className="mt-4 grid gap-2 text-xs leading-5 text-slate-600 sm:grid-cols-3"><li><strong className="text-slate-800">1.</strong> Stáhněte instalační balíček z prověřeného vydání.</li><li><strong className="text-slate-800">2.</strong> Uložte kód do souboru pouze na NAS.</li><li><strong className="text-slate-800">3.</strong> Po prvním spojení se kód zneplatní.</li></ol>
        <p className="mt-3 text-xs text-slate-500">Platnost končí {new Date(enrollment.expiresAt).toLocaleString('cs-CZ')}. Instalační balíček bude zpřístupněn až po úspěšném vydání v CI; nepoužívejte neznámý obraz.</p>
      </div> : null}
      {error ? <p role="alert" className="mt-4 text-sm text-rose-700">{error}</p> : null}
    </article>
  );
}
