import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Database, ShieldCheck, TriangleAlert } from 'lucide-react';
import type { ConnectorFieldMappingRuleV1 } from '../../../../shared/connectorProtocol';
import { connectorClient } from '../api/connectorClient';
import type { ConnectorSourceTable, ConnectorSummary } from '../api/connectorContract';
import { suggestCanonicalField } from '../model/byodbMapping';
import { buildConnectorMapping } from '../model/buildConnectorMapping';
import { SmartFieldMappingModal } from './SmartFieldMappingModal';

const tableKey = (table: ConnectorSourceTable) => `${table.schema}.${table.name}`;

export function ConnectorMapping({ companyId, connector, onSaved }: { companyId: string; connector: ConnectorSummary; onSaved: () => void }) {
  const sourceSchema = connector.sourceSchema;
  const tables = useMemo(() => sourceSchema?.tables ?? [], [sourceSchema]);
  const [entityType, setEntityType] = useState<'company' | 'lead'>('lead');
  const [selectedTable, setSelectedTable] = useState('');
  const [externalIdColumn, setExternalIdColumn] = useState('');
  const [updatedAtColumn, setUpdatedAtColumn] = useState('');
  const [fields, setFields] = useState<ConnectorFieldMappingRuleV1[]>([]);
  const [showFieldMapping, setShowFieldMapping] = useState(false);
  const [reviewed, setReviewed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const table = tables.find(item => tableKey(item) === selectedTable) ?? null;
  const columns = table?.columns ?? [];
  const entityMapping = connector.mappings?.filter(mapping => mapping.entityType === entityType).sort((a, b) => b.mappingVersion - a.mappingVersion)[0];
  const dryRun = entityMapping?.dryRun ?? connector.dryRun;
  const approvalVersion = entityMapping?.mappingVersion ?? connector.mappingVersion;

  useEffect(() => {
    if (!tables.length) return;
    setSelectedTable(current => tables.some(item => tableKey(item) === current) ? current : tableKey(tables[0]));
  }, [tables]);
  useEffect(() => {
    if (!table) return;
    const primaryKey = table.columns.find(column => column.primaryKey && !column.generated)?.name;
    const names = new Set(table.columns.map(column => column.name));
    const fallback = names.has('id') ? 'id' : table.columns[0]?.name ?? '';
    setExternalIdColumn(current => names.has(current) ? current : primaryKey ?? fallback);
    setUpdatedAtColumn(current => names.has(current) ? current : names.has('updated_at') ? 'updated_at' : '');
    const suggestions = table.columns.flatMap(column => {
      const suggestion = suggestCanonicalField(column);
      return suggestion?.entityType === entityType ? [{ sourceColumn: column.name, targetField: suggestion.targetField, conversion: suggestion.conversion }] : [];
    });
    setFields(current => {
      const validCurrent = current.filter(field => suggestions.some(suggestion => suggestion.targetField === field.targetField));
      const merged = new Map<string, ConnectorFieldMappingRuleV1>(suggestions.map(field => [field.targetField, field]));
      validCurrent.forEach(field => merged.set(field.targetField, field));
      return [...merged.values()];
    });
  }, [table, entityType]);

  const save = async () => {
    if (!table || !externalIdColumn) return;
    setBusy(true); setMessage(''); setError(''); setReviewed(false);
    try {
      const mapping = buildConnectorMapping({
        mappingVersion: (connector.mappingVersion ?? 0) + 1, entityType, sourceSystem: 'customer-database',
        schema: table.schema, table: table.name, externalIdColumn,
        ...(updatedAtColumn ? { updatedAtColumn } : {}), fields,
      });
      await connectorClient.saveMapping(companyId, connector.id, mapping);
      setMessage('Mapování je uložené. Konektor nyní provede kontrolní běh bez zápisu.');
      onSaved();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Mapování nelze uložit.'); }
    finally { setBusy(false); }
  };

  const approve = async () => {
    if (!approvalVersion || !dryRun || dryRun.failed > 0 || !reviewed) return;
    setBusy(true); setMessage(''); setError('');
    try {
      await connectorClient.approveMapping(companyId, connector.id, approvalVersion);
      setMessage('Kontrolní běh je schválený.'); onSaved();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Schválení mapování selhalo.'); }
    finally { setBusy(false); }
  };

  if (!sourceSchema) return <article className="workspace-panel p-5"><h3 className="font-semibold text-slate-950">Mapování firemních dat</h3><p className="mt-2 text-sm text-slate-500">Nejdřív připojte konektor. Ten načte pouze metadata tabulek a sloupců; žádné řádky.</p></article>;

  return <>
    <article className="workspace-panel p-6 sm:p-7">
      <div className="flex items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600"><Database className="h-5 w-5" /></span><div><h3 className="font-semibold text-slate-950">Mapování zdrojové databáze</h3><p className="mt-1 text-sm text-slate-500">Každou mapu ověřte zvlášť. Návrhy používají pouze názvy a datové typy sloupců.</p></div></div>
      {tables.length ? <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="text-xs font-semibold text-slate-600">Co mapujete<select value={entityType} onChange={event => setEntityType(event.target.value as 'company' | 'lead')} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal text-slate-950"><option value="lead">Poptávky</option><option value="company">Firemní profil</option></select></label>
        <label className="text-xs font-semibold text-slate-600">Zdrojová tabulka<select value={selectedTable} onChange={event => setSelectedTable(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal text-slate-950">{tables.map(item => <option key={tableKey(item)} value={tableKey(item)}>{tableKey(item)}</option>)}</select></label>
        <label className="text-xs font-semibold text-slate-600">Jedinečný klíč<select value={externalIdColumn} onChange={event => setExternalIdColumn(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal text-slate-950">{columns.map(column => <option key={column.name} value={column.name}>{column.name}{column.primaryKey ? ', primární klíč' : ''}{column.generated ? ', generovaný' : ''}</option>)}</select></label>
        <label className="text-xs font-semibold text-slate-600">Sloupec poslední změny<select value={updatedAtColumn} onChange={event => setUpdatedAtColumn(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal text-slate-950"><option value="">Bez časového razítka (kontrola fingerprintem)</option>{columns.map(column => <option key={column.name} value={column.name}>{column.name}, {column.dataType}</option>)}</select></label>
        <div className="sm:col-span-2"><p className="text-xs text-slate-500">Namapovaná pole: {fields.length ? fields.map(field => field.targetField).join(', ') : 'zatím žádná'}</p><button type="button" onClick={() => setShowFieldMapping(true)} className="mt-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold">Zkontrolovat a upravit pole</button></div>
      </div> : <p className="mt-5 flex items-center gap-2 text-sm text-amber-700"><TriangleAlert className="h-4 w-4" />Konektor nenašel žádnou dostupnou tabulku.</p>}
      {table && !columns.some(column => column.name === externalIdColumn && column.primaryKey && !column.generated) ? <p className="mt-3 text-xs text-amber-700">Tato tabulka nemá ověřený stabilní primární klíč. Čtení lze zkontrolovat, ale vytváření záznamů zůstane vypnuté.</p> : null}
      <button type="button" disabled={busy || !table || !externalIdColumn} onClick={() => void save()} className="workspace-primary-action mt-5 min-h-10 px-4 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50">Uložit a spustit kontrolní běh</button>
      {dryRun ? <section className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4" aria-label="Výsledek kontrolního běhu">
        <div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 text-emerald-600" /><div><h4 className="text-sm font-semibold text-slate-950">Kontrolní běh dokončen</h4><p className="mt-1 text-xs text-slate-500">Bez zápisu dat, {new Date(dryRun.completedAt).toLocaleString('cs-CZ')}</p></div></div>
        <dl className="mt-4 grid grid-cols-3 gap-3 text-center"><div><dt className="text-xs text-slate-400">Celkem</dt><dd className="mt-1 text-lg font-semibold text-slate-900">{dryRun.total}</dd></div><div><dt className="text-xs text-slate-400">Připraveno</dt><dd className="mt-1 text-lg font-semibold text-emerald-700">{dryRun.valid}</dd></div><div><dt className="text-xs text-slate-400">Chyby</dt><dd className="mt-1 text-lg font-semibold text-rose-700">{dryRun.failed}</dd></div></dl>
        {!dryRun.approvedAt && dryRun.failed === 0 ? <><label className="mt-4 flex items-start gap-2 text-xs leading-5 text-slate-600"><input type="checkbox" checked={reviewed} onChange={event => setReviewed(event.target.checked)} className="mt-0.5 h-4 w-4 rounded border-slate-300" />Zkontroloval(a) jsem vybranou tabulku a její mapování.</label><button type="button" disabled={busy || !reviewed} onClick={() => void approve()} className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"><CheckCircle2 className="h-4 w-4" />Schválit kontrolní běh</button></> : null}
        {dryRun.failed > 0 ? <p role="alert" className="mt-4 text-sm text-rose-700">Nejdřív opravte mapování. Import s chybami nelze schválit.</p> : null}
        {dryRun.approvedAt ? <p className="mt-4 flex items-center gap-2 text-sm font-medium text-emerald-700"><CheckCircle2 className="h-4 w-4" />Schváleno {new Date(dryRun.approvedAt).toLocaleString('cs-CZ')}</p> : null}
      </section> : null}
      {message ? <p aria-live="polite" className="mt-3 text-sm text-slate-600">{message}</p> : null}{error ? <p role="alert" className="mt-3 text-sm text-rose-700">{error}</p> : null}
    </article>
    {showFieldMapping && table ? <SmartFieldMappingModal entityType={entityType} columns={columns} fields={fields} onChange={setFields} onClose={() => setShowFieldMapping(false)} /> : null}
  </>;
}
