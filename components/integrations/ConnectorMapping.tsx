import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Database, ShieldCheck, TriangleAlert } from 'lucide-react';
import { connectorClient } from '@/src/app/connectorClient';
import type { ConnectorSourceTable, ConnectorSummary } from '@/src/app/connectorContract';

const tableKey = (table: ConnectorSourceTable) => `${table.schema}.${table.name}`;

export function ConnectorMapping({ companyId, connector, onSaved }: { companyId: string; connector: ConnectorSummary; onSaved: () => void }) {
  const sourceSchema = connector.sourceSchema;
  const tables = useMemo(() => sourceSchema?.tables ?? [], [sourceSchema]);
  const [selectedTable, setSelectedTable] = useState('');
  const [externalIdColumn, setExternalIdColumn] = useState('');
  const [updatedAtColumn, setUpdatedAtColumn] = useState('');
  const [titleColumn, setTitleColumn] = useState('');
  const [reviewed, setReviewed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const table = tables.find(item => tableKey(item) === selectedTable) ?? null;
  const columns = table?.columns ?? [];

  useEffect(() => {
    if (!tables.length) return;
    setSelectedTable(current => tables.some(item => tableKey(item) === current) ? current : tableKey(tables[0]));
  }, [tables]);

  useEffect(() => {
    if (!table) return;
    const names = new Set(table.columns.map(column => column.name));
    const first = table.columns[0]?.name ?? '';
    setExternalIdColumn(current => names.has(current) ? current : (names.has('id') ? 'id' : first));
    setUpdatedAtColumn(current => names.has(current) ? current : (names.has('updated_at') ? 'updated_at' : ''));
    setTitleColumn(current => names.has(current) ? current : (names.has('title') ? 'title' : names.has('name') ? 'name' : first));
  }, [table]);

  const save = async () => {
    if (!table || !externalIdColumn || !titleColumn) return;
    setBusy(true);
    setMessage('');
    setError('');
    setReviewed(false);
    try {
      await connectorClient.saveMapping(companyId, connector.id, {
        version: 1,
        mappingVersion: (connector.mappingVersion ?? 0) + 1,
        entityType: 'lead',
        sourceSystem: 'customer-database',
        schema: table.schema,
        table: table.name,
        externalIdColumn,
        ...(updatedAtColumn ? { updatedAtColumn } : {}),
        fields: [{ sourceColumn: titleColumn, targetField: 'title', conversion: { kind: 'text' }, required: true }],
      });
      setMessage('Mapování je uložené. Konektor nyní provede kontrolní běh bez zápisu.');
      onSaved();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Mapování nelze uložit.');
    } finally {
      setBusy(false);
    }
  };

  const approve = async () => {
    if (!connector.mappingVersion || !connector.dryRun || connector.dryRun.failed > 0 || !reviewed) return;
    setBusy(true);
    setMessage('');
    setError('');
    try {
      await connectorClient.approveMapping(companyId, connector.id, connector.mappingVersion);
      setMessage('Kontrolní běh je schválený. Konektor může bezpečně zahájit první import.');
      onSaved();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Kontrolní běh nelze schválit.');
    } finally {
      setBusy(false);
    }
  };

  if (!sourceSchema) {
    return (
      <article className="workspace-panel p-6">
        <h3 className="font-semibold text-slate-950">Čekáme na schéma zdroje</h3>
        <p className="mt-2 text-sm leading-6 text-slate-500">Po připojení NAS konektor bezpečně odešle pouze názvy tabulek, sloupců a datové typy. Žádné hodnoty řádků ani přístupové údaje se v tomto kroku nepřenášejí.</p>
      </article>
    );
  }

  return (
    <article className="workspace-panel p-6 sm:p-7">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600"><Database className="h-5 w-5" /></span>
        <div><h3 className="font-semibold text-slate-950">Mapování poptávek</h3><p className="mt-1 text-sm text-slate-500">Vyberte skutečnou tabulku a sloupce zkontrolované konektorem.</p></div>
      </div>

      {tables.length ? (
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="text-xs font-semibold text-slate-600">Zdrojová tabulka
            <select value={selectedTable} onChange={event => setSelectedTable(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal text-slate-950">
              {tables.map(item => <option key={tableKey(item)} value={tableKey(item)}>{tableKey(item)}</option>)}
            </select>
          </label>
          <label className="text-xs font-semibold text-slate-600">Jedinečné ID
            <select value={externalIdColumn} onChange={event => setExternalIdColumn(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal text-slate-950">
              {columns.map(column => <option key={column.name} value={column.name}>{column.name} · {column.dataType}</option>)}
            </select>
          </label>
          <label className="text-xs font-semibold text-slate-600">Název poptávky
            <select value={titleColumn} onChange={event => setTitleColumn(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal text-slate-950">
              {columns.map(column => <option key={column.name} value={column.name}>{column.name} · {column.dataType}</option>)}
            </select>
          </label>
          <label className="text-xs font-semibold text-slate-600">Čas poslední změny
            <select value={updatedAtColumn} onChange={event => setUpdatedAtColumn(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal text-slate-950">
              <option value="">Bez průběžné změny</option>
              {columns.map(column => <option key={column.name} value={column.name}>{column.name} · {column.dataType}</option>)}
            </select>
          </label>
        </div>
      ) : <p className="mt-5 flex items-center gap-2 text-sm text-amber-700"><TriangleAlert className="h-4 w-4" />Konektor nenašel žádnou dostupnou tabulku.</p>}

      <button type="button" disabled={busy || !table || !externalIdColumn || !titleColumn} onClick={() => void save()} className="workspace-primary-action mt-5 min-h-10 px-4 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50">Uložit a spustit kontrolní běh</button>

      {connector.dryRun ? (
        <section className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4" aria-label="Výsledek kontrolního běhu">
          <div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 text-emerald-600" /><div><h4 className="text-sm font-semibold text-slate-950">Kontrolní běh dokončen</h4><p className="mt-1 text-xs text-slate-500">Bez zápisu dat · {new Date(connector.dryRun.completedAt).toLocaleString('cs-CZ')}</p></div></div>
          <dl className="mt-4 grid grid-cols-3 gap-3 text-center"><div><dt className="text-xs text-slate-400">Celkem</dt><dd className="mt-1 text-lg font-semibold text-slate-900">{connector.dryRun.total}</dd></div><div><dt className="text-xs text-slate-400">Připraveno</dt><dd className="mt-1 text-lg font-semibold text-emerald-700">{connector.dryRun.valid}</dd></div><div><dt className="text-xs text-slate-400">Chyby</dt><dd className="mt-1 text-lg font-semibold text-rose-700">{connector.dryRun.failed}</dd></div></dl>
          {!connector.dryRun.approvedAt && connector.dryRun.failed === 0 ? <><label className="mt-4 flex items-start gap-2 text-xs leading-5 text-slate-600"><input type="checkbox" checked={reviewed} onChange={event => setReviewed(event.target.checked)} className="mt-0.5 h-4 w-4 rounded border-slate-300" />Zkontroloval(a) jsem vybranou tabulku a povoluji první jednosměrný import do StavbaFlow.</label><button type="button" disabled={busy || !reviewed} onClick={() => void approve()} className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"><CheckCircle2 className="h-4 w-4" />Schválit kontrolní běh</button></> : null}
          {connector.dryRun.failed > 0 ? <p role="alert" className="mt-4 text-sm text-rose-700">Nejdřív opravte mapování. Import s chybami nelze schválit.</p> : null}
          {connector.dryRun.approvedAt ? <p className="mt-4 flex items-center gap-2 text-sm font-medium text-emerald-700"><CheckCircle2 className="h-4 w-4" />Schváleno {new Date(connector.dryRun.approvedAt).toLocaleString('cs-CZ')}</p> : null}
        </section>
      ) : null}

      {message ? <p aria-live="polite" className="mt-3 text-sm text-slate-600">{message}</p> : null}
      {error ? <p role="alert" className="mt-3 text-sm text-rose-700">{error}</p> : null}
    </article>
  );
}
