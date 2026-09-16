import React, { useState } from 'react';
import { SynologyDatabaseConfig, SynologyDbDriver } from '@/types/synology';
import { FieldMappingConfig, TargetFieldType } from '@/types/integrations';
import { suggestFieldMapping } from '@/lib/integrations/fieldMapping';
import { 
  X, 
  Database, 
  Check, 
  Sparkles, 
  ArrowRight, 
  SlidersHorizontal,
  RefreshCw
} from 'lucide-react';

interface DatabaseMappingModalProps {
  isOpen: boolean;
  onClose: () => void;
  databaseConfig: SynologyDatabaseConfig;
  onSave: (updatedConfig: SynologyDatabaseConfig) => void;
}

interface MappingFieldDef {
  target: TargetFieldType;
  label: string;
  defaultCol: string;
}

const CRM_TARGET_FIELDS: MappingFieldDef[] = [
  { target: 'customerName', label: 'Jméno zákazníka / Klient', defaultCol: 'jmeno_zakaznika' },
  { target: 'title', label: 'Název projektu / Zakázky', defaultCol: 'nazev_projektu' },
  { target: 'price', label: 'Cena / Rozpočet bez DPH', defaultCol: 'rozpocet_kc' },
  { target: 'status', label: 'Stav zakázky / Pipeline', defaultCol: 'stav_zakazky' },
  { target: 'assignedEmployeeName', label: 'Odpovědný technik / Montážník', defaultCol: 'odpovedny_technik' },
  { target: 'customerPhone', label: 'Telefon klienta', defaultCol: 'telefon_klient' },
  { target: 'customerEmail', label: 'E-mail klienta', defaultCol: 'email_klient' },
  { target: 'city', label: 'Město / Obec', defaultCol: 'mesto' },
  { target: 'address', label: 'Ulice & Číslo popisné', defaultCol: 'ulice_cp' },
  { target: 'preferredDate', label: 'Termín zahájení / Realizace', defaultCol: 'termin_zahajeni' },
  { target: 'description', label: 'Technická poznámka / Popis', defaultCol: 'technicka_poznamka' },
];

export const DatabaseMappingModal: React.FC<DatabaseMappingModalProps> = ({
  isOpen,
  onClose,
  databaseConfig,
  onSave
}) => {
  const [driver, setDriver] = useState<SynologyDbDriver>(databaseConfig.driver);
  const [port, setPort] = useState(databaseConfig.port || (driver === 'postgresql' ? 5432 : 3306));
  const [database, setDatabase] = useState(databaseConfig.database || 'firma_stavby');
  const [selectedTable, setSelectedTable] = useState(databaseConfig.table || 'v_zakazky_nas');
  const [enabled, setEnabled] = useState(databaseConfig.enabled);

  // Initialize reverse lookup from target field to column
  const [columnMap, setColumnMap] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    const existing = databaseConfig.fieldMapping || {};
    
    CRM_TARGET_FIELDS.forEach(f => {
      // Find which column maps to this target field
      const matchedCol = Object.entries(existing).find(([_, target]) => target === f.target)?.[0];
      initial[f.target] = matchedCol || f.defaultCol;
    });

    return initial;
  });

  if (!isOpen) return null;

  const mockAvailableColumns = [
    'id_zakazky',
    'jmeno_zakaznika',
    'nazev_projektu',
    'rozpocet_kc',
    'stav_zakazky',
    'odpovedny_technik',
    'telefon_klient',
    'email_klient',
    'mesto',
    'ulice_cp',
    'termin_zahajeni',
    'technicka_poznamka',
    'datum_vytvoreni'
  ];

  const handleDriverChange = (newDriver: SynologyDbDriver) => {
    setDriver(newDriver);
    if (newDriver === 'postgresql') setPort(5432);
    else if (newDriver === 'mariadb') setPort(3306);
  };

  const handleAiAutoMap = () => {
    const updated: Record<string, string> = {};
    // For each available column, use AI suggestion engine
    mockAvailableColumns.forEach(col => {
      const suggestion = suggestFieldMapping(col);
      if (suggestion.targetField !== 'ignore' && suggestion.confidence >= 70) {
        updated[suggestion.targetField] = col;
      }
    });

    setColumnMap(prev => ({
      ...prev,
      ...updated
    }));
  };

  const handleSave = () => {
    const finalFieldMapping: FieldMappingConfig = {};
    CRM_TARGET_FIELDS.forEach(f => {
      const col = columnMap[f.target];
      if (col) {
        finalFieldMapping[col] = f.target;
      }
    });

    onSave({
      driver,
      port,
      database,
      table: selectedTable,
      enabled,
      fieldMapping: finalFieldMapping,
      discoveredTables: databaseConfig.discoveredTables || ['v_zakazky_nas', 'poptavky_crm', 'stavebni_denik']
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white tracking-tight">Databáze na Synology NAS</h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 uppercase">
                  {driver}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Konfigurace přímého čtení zakázek z MariaDB nebo PostgreSQL na NAS.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6 bg-slate-50">
          
          {/* Engine & Connection */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-cyan-600" />
                Nastavení databázového enginu
              </h4>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(e) => setEnabled(e.target.checked)}
                  className="rounded text-brand-primary focus:ring-brand-primary w-4 h-4"
                />
                <span className="text-xs font-bold text-slate-800">Aktivovat synchronizaci DB</span>
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">Typ databáze</label>
                <select
                  value={driver}
                  onChange={(e) => handleDriverChange(e.target.value as SynologyDbDriver)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-brand-primary"
                >
                  <option value="mariadb">MariaDB 10 (Synology Package)</option>
                  <option value="postgresql">PostgreSQL (Docker / DSM)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">Port</label>
                <input
                  type="number"
                  value={port}
                  onChange={(e) => setPort(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-800 focus:outline-none focus:border-brand-primary"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">Název databáze</label>
                <input
                  type="text"
                  value={database}
                  onChange={(e) => setDatabase(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:border-brand-primary"
                />
              </div>
            </div>

            {/* Discovered Table Selector */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Vybraná tabulka / SQL View zakázek
              </label>
              <div className="flex items-center gap-2">
                <select
                  value={selectedTable}
                  onChange={(e) => setSelectedTable(e.target.value)}
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-cyan-900 focus:outline-none focus:border-brand-primary"
                >
                  {(databaseConfig.discoveredTables || ['v_zakazky_nas', 'poptavky_crm', 'stavebni_denik']).map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                <span className="px-2.5 py-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" />
                  Nalezeno 4 zakázek
                </span>
              </div>
            </div>
          </div>

          {/* Smart Field Mapping Grid */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-cyan-600" />
                  Mapování sloupců na CRM pole BuildFlow
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">Přiřaďte sloupce z tabulky Synology MariaDB k atributům zakázky v CRM.</p>
              </div>
              <button
                type="button"
                onClick={handleAiAutoMap}
                className="px-3 py-1.5 text-xs font-bold text-cyan-700 hover:text-cyan-800 bg-cyan-50 hover:bg-cyan-100 border border-cyan-200 rounded-xl flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Spustit AI mapování
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {CRM_TARGET_FIELDS.map(f => (
                <div key={f.target} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-3">
                  <div className="min-w-[140px]">
                    <span className="text-xs font-semibold text-slate-800 block">{f.label}</span>
                    <span className="text-[10px] text-slate-400 font-mono">{f.target}</span>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <select
                    value={columnMap[f.target] || ''}
                    onChange={(e) => setColumnMap(prev => ({ ...prev, [f.target]: e.target.value }))}
                    className="flex-1 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-mono font-medium text-slate-800 focus:outline-none focus:border-brand-primary"
                  >
                    <option value="">-- Nepřiřazeno --</option>
                    {mockAvailableColumns.map(col => (
                      <option key={col} value={col}>{col}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-white border-t border-slate-200 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
          >
            Zrušit
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2.5 bg-brand-primary hover:bg-brand-primary/90 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-2"
          >
            <Check className="w-4 h-4" />
            Uložit konfiguraci databáze
          </button>
        </div>

      </div>
    </div>
  );
};
