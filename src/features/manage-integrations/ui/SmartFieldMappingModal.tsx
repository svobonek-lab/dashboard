import React from 'react';
import type { ConnectorFieldMappingRuleV1 } from '../../../../shared/connectorProtocol';
import type { ConnectorSourceColumn } from '../api/connectorContract';
import { suggestCanonicalField } from '../model/byodbMapping';

const TARGETS = {
  company: ['name', 'companyNumber', 'vatNumber', 'email', 'phone', 'address', 'city', 'postalCode', 'country'],
  lead: ['title', 'customer', 'description', 'email', 'phone', 'assignedToEmail', 'value', 'currency', 'status', 'priority', 'address', 'city', 'scheduledAt'],
} as const;
const LABELS: Record<string, string> = { name: 'Název firmy', title: 'Název poptávky', customer: 'Zákazník', email: 'E-mail', phone: 'Telefon', assignedToEmail: 'Přiřazený zaměstnanec', status: 'Stav', value: 'Hodnota', address: 'Adresa', city: 'Město' };
type ConversionKind = Exclude<ConnectorFieldMappingRuleV1['conversion']['kind'], 'enum'>;
const CONVERSIONS: ConversionKind[] = ['text', 'email', 'phone', 'number', 'currency', 'datetime', 'boolean'];

export function SmartFieldMappingModal({
  entityType, columns, fields, onChange, onClose,
}: {
  entityType: 'company' | 'lead';
  columns: ConnectorSourceColumn[];
  fields: ConnectorFieldMappingRuleV1[];
  onChange: (fields: ConnectorFieldMappingRuleV1[]) => void;
  onClose: () => void;
}) {
  const targets = TARGETS[entityType];
  const suggested = (target: string) => columns.find(column => {
    const mapping = suggestCanonicalField(column);
    return mapping?.entityType === entityType && mapping.targetField === target;
  })?.name;
  const setField = (targetField: string, sourceColumn: string, kind?: ConversionKind) => {
    const rest = fields.filter(field => field.targetField !== targetField);
    if (!sourceColumn) { onChange(rest); return; }
    const previous = fields.find(field => field.targetField === targetField);
    const inferred = suggestCanonicalField(columns.find(column => column.name === sourceColumn)!)?.conversion;
    const conversion: ConnectorFieldMappingRuleV1['conversion'] = kind ? { kind } : previous?.sourceColumn === sourceColumn ? previous.conversion : inferred ?? { kind: 'text' };
    onChange([...rest, { sourceColumn, targetField, conversion }]);
  };
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <section role="dialog" aria-modal="true" aria-labelledby="byodb-map-title" className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
      <h3 id="byodb-map-title" className="text-lg font-semibold text-slate-950">Mapování {entityType === 'company' ? 'firmy' : 'poptávek'}</h3>
      <p className="mt-1 text-sm text-slate-500">Návrhy vycházejí jen z názvů sloupců a jejich datových typů. Nečteme zde hodnoty řádků.</p>
      <div className="mt-5 space-y-3">{targets.map(target => {
        const current = fields.find(field => field.targetField === target);
        const sourceColumn = current?.sourceColumn ?? suggested(target) ?? '';
        const required = target === (entityType === 'company' ? 'name' : 'title');
        const selectedColumn = columns.find(column => column.name === sourceColumn);
        const currentKind = current?.conversion.kind;
        const inferredKind: ConversionKind = currentKind && currentKind !== 'enum' ? currentKind : (selectedColumn ? suggestCanonicalField(selectedColumn)?.conversion.kind : undefined) ?? (['value', 'companyNumber', 'postalCode'].includes(target) ? 'number' : 'text');
        return <div key={target} className="grid gap-2 rounded-xl border border-slate-100 p-3 sm:grid-cols-[1fr_1.2fr_1fr] sm:items-center">
          <label className="text-xs font-semibold text-slate-700">{LABELS[target] ?? target}{required ? ' · povinné' : ''}<select aria-label={`Cílové pole ${target}`} value={target} disabled className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-sm font-normal">{<option value={target}>{LABELS[target] ?? target}</option>}</select></label>
          <label className="text-xs font-semibold text-slate-700">Zdrojový sloupec<select aria-label={`Zdroj pro ${target}`} value={sourceColumn} onChange={event => setField(target, event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm font-normal"><option value="">Nepoužívat</option>{columns.filter(column => !/password|secret|token|private[_-]?key|api[_-]?key/i.test(column.name)).map(column => <option key={column.name} value={column.name}>{column.name} · {column.dataType}</option>)}</select></label>
          <label className="text-xs font-semibold text-slate-700">Převod<select aria-label={`Převod pro ${target}`} value={inferredKind} disabled={!sourceColumn} onChange={event => setField(target, sourceColumn, event.target.value as ConversionKind)} className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm font-normal">{CONVERSIONS.map(kind => <option key={kind} value={kind}>{kind}</option>)}</select></label>
        </div>;
      })}</div>
      <div className="mt-5 flex justify-end gap-2"><button type="button" onClick={onClose} className="min-h-10 rounded-xl border border-slate-200 px-4 text-sm font-semibold">Zrušit</button><button type="button" onClick={onClose} className="workspace-primary-action min-h-10 px-4 text-sm font-semibold">Použít mapování</button></div>
    </section>
  </div>;
}
