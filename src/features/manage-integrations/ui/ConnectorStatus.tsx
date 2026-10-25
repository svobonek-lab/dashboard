import React, { useState } from 'react';
import { Activity, AlertTriangle, Pause, Play, RefreshCw, Unplug } from 'lucide-react';
import { connectorClient } from '../api/connectorClient';
import type { ConnectorSummary } from '../api/connectorContract';

const labels: Record<ConnectorSummary['status'], string> = {
  awaiting_enrollment: 'Čeká na připojení NAS',
  mapping_required: 'Vyžaduje mapování',
  dry_run_required: 'Čeká na kontrolu importu',
  ready: 'Připraveno k prvnímu importu',
  running: 'Synchronizuje',
  success: 'Data jsou aktuální',
  partial_failure: 'Část záznamů vyžaduje opravu',
  paused: 'Synchronizace je pozastavená',
  outdated: 'Konektor vyžaduje aktualizaci',
  revoked: 'Napojení je odpojené',
  not_configured: 'Napojení není nastavené',
};

const dateLabel = (value: string | null) => value
  ? new Date(value).toLocaleString('cs-CZ')
  : 'zatím neproběhlo';

export function ConnectorStatus({ companyId, items, onRefresh }: { companyId: string; items: ConnectorSummary[]; onRefresh: () => void }) {
  const [pending, setPending] = useState<string | null>(null);
  const [confirmRevokeId, setConfirmRevokeId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const command = async (item: ConnectorSummary, value: 'sync_now' | 'pause' | 'resume' | 'revoke') => {
    const operation = `${item.id}:${value}`;
    setPending(operation);
    setError('');
    try {
      await connectorClient.command(companyId, item.id, value);
      if (value === 'revoke') setConfirmRevokeId(null);
      onRefresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Příkaz se nepodařilo bezpečně předat konektoru.');
    } finally {
      setPending(null);
    }
  };

  if (!items.length) return null;

  return (
    <section className="space-y-3" aria-label="Stav databázových napojení" aria-busy={pending !== null}>
      {items.map((item) => {
        const isRevoked = item.status === 'revoked';
        const metrics = item.lastRun;
        return (
          <article key={item.id} className="workspace-panel p-5 sm:p-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex min-w-0 items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-600"><Activity className="h-5 w-5" /></span>
                <div className="min-w-0">
                  <p className="font-semibold text-slate-950">{labels[item.status] ?? 'Stav není dostupný'}</p>
                  <p className="mt-1 text-xs text-slate-500">Poslední spojení: {dateLabel(item.lastHeartbeatAt)}</p>
                  {item.nextSyncAt ? <p className="mt-1 text-xs text-slate-500">Další kontrola: {dateLabel(item.nextSyncAt)}</p> : null}
                  {item.pauseReason ? <p className="mt-2 flex items-center gap-1.5 text-xs text-amber-700"><AlertTriangle className="h-3.5 w-3.5" />{item.pauseReason}</p> : null}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button type="button" disabled={Boolean(pending) || isRevoked || item.status === 'dry_run_required'} onClick={() => void command(item, 'sync_now')} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50"><RefreshCw className="mr-1 inline h-3.5 w-3.5" />Synchronizovat</button>
                {item.status === 'paused'
                  ? <button type="button" disabled={Boolean(pending) || isRevoked} onClick={() => void command(item, 'resume')} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold disabled:opacity-50"><Play className="mr-1 inline h-3.5 w-3.5" />Obnovit</button>
                  : <button type="button" disabled={Boolean(pending) || isRevoked} onClick={() => void command(item, 'pause')} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold disabled:opacity-50"><Pause className="mr-1 inline h-3.5 w-3.5" />Pozastavit</button>}
                {confirmRevokeId === item.id ? <>
                  <button type="button" disabled={Boolean(pending)} onClick={() => void command(item, 'revoke')} className="rounded-xl bg-rose-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">Potvrdit odpojení</button>
                  <button type="button" disabled={Boolean(pending)} onClick={() => setConfirmRevokeId(null)} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 disabled:opacity-50">Zrušit</button>
                </> : <button type="button" disabled={Boolean(pending) || isRevoked} onClick={() => setConfirmRevokeId(item.id)} className="rounded-xl border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700 disabled:opacity-50"><Unplug className="mr-1 inline h-3.5 w-3.5" />Odpojit</button>}
              </div>
            </div>

            <dl className="mt-5 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 text-xs sm:grid-cols-4">
              <div><dt className="text-slate-400">Verze konektoru</dt><dd className="mt-1 font-semibold text-slate-700">{item.version ?? '—'}</dd></div>
              <div><dt className="text-slate-400">Verze mapování</dt><dd className="mt-1 font-semibold text-slate-700">{item.mappingVersion ?? '—'}</dd></div>
              <div><dt className="text-slate-400">Zpracováno</dt><dd className="mt-1 font-semibold text-slate-700">{metrics?.processed ?? '—'}</dd></div>
              <div><dt className="text-slate-400">Chyby</dt><dd className="mt-1 font-semibold text-slate-700">{metrics?.failed ?? '—'}</dd></div>
            </dl>
          </article>
        );
      })}
      {error ? <p role="alert" className="text-sm text-rose-700">{error}</p> : null}
    </section>
  );
}
