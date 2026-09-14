import React, { useState, useEffect } from 'react';
import { FieldMappingConfig, FieldMappingRule, TargetFieldType } from '@/types/integrations';
import { generateSmartMappings } from '@/lib/integrations/fieldMapping';
import { Sparkles, ArrowRight, CheckCircle2, SlidersHorizontal, RefreshCw } from 'lucide-react';

interface SmartFieldMappingModalProps {
  isOpen: boolean;
  onClose: () => void;
  headers: string[];
  sampleRow?: Record<string, any>;
  initialMapping?: FieldMappingConfig;
  onConfirmMapping: (mapping: FieldMappingConfig) => void;
  title?: string;
  sourceName?: string;
}

const TARGET_FIELDS: { value: TargetFieldType; label: string; desc: string }[] = [
  { value: 'customerName', label: 'Jméno zákazníka / Klient', desc: 'Např. Ing. Jan Novák, Logis s.r.o.' },
  { value: 'title', label: 'Název projektu / Zakázky', desc: 'Např. Bioklimatická pergola 6x4m' },
  { value: 'price', label: 'Cena / Rozpočet (Kč)', desc: 'Např. 250 000 Kč' },
  { value: 'assignedEmployeeName', label: 'Přiřazený montážník / Technik', desc: 'Např. Petr Novotný' },
  { value: 'status', label: 'Stav zakázky', desc: 'Např. Nová, V jednání, Realizace, Hotovo' },
  { value: 'customerPhone', label: 'Telefon zákazníka', desc: 'Např. +420 774 123 456' },
  { value: 'customerEmail', label: 'E-mail zákazníka', desc: 'Např. zakaznik@email.cz' },
  { value: 'city', label: 'Město / Obec', desc: 'Např. Praha, Brno, Beroun' },
  { value: 'address', label: 'Adresa stavby', desc: 'Např. K Lesu 14, Beroun' },
  { value: 'preferredDate', label: 'Požadovaný termín zahájení', desc: 'Např. 2026-09-25 nebo 25.09.2026' },
  { value: 'description', label: 'Popis / Technická specifikace', desc: 'Detaily stavby, rozměry, barva' },
  { value: 'priority', label: 'Priorita / Spěchá', desc: 'Urgentní, Vysoká, Střední' },
  { value: 'ignore', label: '— Ignorovat sloupec —', desc: 'Tento sloupec se nebude importovat' }
];

export const SmartFieldMappingModal: React.FC<SmartFieldMappingModalProps> = ({
  isOpen,
  onClose,
  headers,
  sampleRow,
  initialMapping,
  onConfirmMapping,
  title = 'Inteligentní mapování sloupců',
  sourceName = 'Externí zdroj dat'
}) => {
  const [rules, setRules] = useState<FieldMappingRule[]>([]);

  useEffect(() => {
    if (isOpen && headers && headers.length > 0) {
      const generated = generateSmartMappings(headers, sampleRow);
      
      // Merge with initialMapping if present
      if (initialMapping) {
        const merged = generated.map(r => ({
          ...r,
          targetField: initialMapping[r.sourceColumn] || r.targetField
        }));
        setRules(merged);
      } else {
        setRules(generated);
      }
    }
  }, [isOpen, headers, sampleRow, initialMapping]);

  if (!isOpen) return null;

  const handleFieldChange = (sourceCol: string, newTarget: TargetFieldType) => {
    setRules(prev => prev.map(r => r.sourceColumn === sourceCol ? { ...r, targetField: newTarget, isAutoDetected: false } : r));
  };

  const handleAutoRemap = () => {
    const generated = generateSmartMappings(headers, sampleRow);
    setRules(generated);
  };

  const handleSave = () => {
    const config: FieldMappingConfig = {};
    rules.forEach(r => {
      config[r.sourceColumn] = r.targetField;
    });
    onConfirmMapping(config);
    onClose();
  };

  const mappedCount = rules.filter(r => r.targetField !== 'ignore').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden text-slate-900">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-600 flex items-center justify-center font-bold">
              <Sparkles className="w-5 h-5 text-cyan-600" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 tracking-tight">{title}</h2>
              <p className="text-xs text-slate-500 font-medium">Zdroj: <span className="font-bold text-slate-700">{sourceName}</span> • Nalezeno {headers.length} sloupců</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleAutoRemap}
              type="button"
              className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-cyan-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Znovu detekovat AI
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* AI Banner */}
        <div className="bg-gradient-to-r from-cyan-50 via-sky-50 to-blue-50 border-b border-cyan-100 px-6 py-3 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 font-semibold text-cyan-900">
            <Sparkles className="w-4 h-4 text-cyan-600 shrink-0" />
            <span>AI automaticky spárovala <strong>{mappedCount} z {rules.length}</strong> sloupců. Můžete libovolné pole ručně upravit.</span>
          </div>
          <span className="px-2.5 py-0.5 rounded-full bg-cyan-600 text-white font-black text-[10px] tracking-wide uppercase">
            Smart Parser v7.0
          </span>
        </div>

        {/* Mapping Table */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          <div className="grid grid-cols-12 gap-3 text-[11px] font-black uppercase tracking-wider text-slate-600 px-4 py-1.5">
            <div className="col-span-4">Sloupec v externím souboru / DB</div>
            <div className="col-span-3">Ukázková hodnota (Řádek 1)</div>
            <div className="col-span-1 text-center">Směr</div>
            <div className="col-span-4">Cílové pole v BuildFlow CRM</div>
          </div>

          <div className="space-y-2">
            {rules.map((rule) => {
              const isIgnored = rule.targetField === 'ignore';
              return (
                <div 
                  key={rule.sourceColumn} 
                  className={`grid grid-cols-12 gap-3 items-center p-3.5 rounded-2xl border transition-all ${
                    isIgnored 
                      ? 'bg-slate-50/60 border-slate-200/60 opacity-60' 
                      : 'bg-white border-slate-200 shadow-sm hover:border-cyan-300'
                  }`}
                >
                  {/* Source Column */}
                  <div className="col-span-4">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200 truncate">
                        {rule.sourceColumn}
                      </span>
                      {rule.confidence && rule.confidence >= 80 && !isIgnored && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                          {rule.confidence}%
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Sample Value */}
                  <div className="col-span-3">
                    <span className="text-xs text-slate-600 italic truncate block font-sans" title={rule.sampleValue || '(prázdné)'}>
                      {rule.sampleValue ? `"${rule.sampleValue}"` : <span className="text-slate-300">—</span>}
                    </span>
                  </div>

                  {/* Arrow */}
                  <div className="col-span-1 flex justify-center">
                    <ArrowRight className={`w-4 h-4 ${isIgnored ? 'text-slate-300' : 'text-cyan-500'}`} />
                  </div>

                  {/* Target Field Selector */}
                  <div className="col-span-4">
                    <select
                      value={rule.targetField}
                      onChange={(e) => handleFieldChange(rule.sourceColumn, e.target.value as TargetFieldType)}
                      className={`w-full px-3 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                        isIgnored
                          ? 'bg-slate-100 border-slate-200 text-slate-400'
                          : 'bg-slate-50 border-cyan-200 text-slate-900 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500'
                      }`}
                    >
                      {TARGET_FIELDS.map(f => (
                        <option key={f.value} value={f.value}>
                          {f.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            Namapováno <strong className="text-slate-800">{mappedCount}</strong> polí pro přímý import do Kanbanu a harmonogramu.
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Zrušit
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold flex items-center gap-2 shadow-lg transition-all cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Potvrdit mapování ({mappedCount} polí)
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
