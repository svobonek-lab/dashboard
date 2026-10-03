import React, { useState, useRef } from 'react';
import { FieldMappingConfig, TargetFieldType } from '@/types/integrations';
import { parseUploadedFile, ParsedFileResult } from '@/lib/integrations/fileParser';
import { SmartFieldMappingModal } from './SmartFieldMappingModal';
import { 
  UploadCloud, 
  FileText, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  Play, 
  SlidersHorizontal, 
  Layers,
  ArrowRight
} from 'lucide-react';

interface CSVImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportBatch: (
    rows: Record<string, any>[], 
    mapping: FieldMappingConfig, 
    deduplicate: boolean,
    updateExisting: boolean
  ) => Promise<any>;
}

export const CSVImportModal: React.FC<CSVImportModalProps> = ({
  isOpen,
  onClose,
  onImportBatch
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedFileResult | null>(null);
  const [parsingError, setParsingError] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);

  const [deduplicate, setDeduplicate] = useState(true);
  const [updateExisting, setUpdateExisting] = useState(true);

  const [isMappingOpen, setIsMappingOpen] = useState(false);
  const [currentMapping, setCurrentMapping] = useState<FieldMappingConfig>({});
  const [isImporting, setIsImporting] = useState(false);
  const [importSummary, setImportSummary] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFile = async (file: File) => {
    setIsParsing(true);
    setParsingError(null);
    setImportSummary(null);
    try {
      const res = await parseUploadedFile(file);
      setParsedData(res);
      // Auto open mapping if needed
      setIsMappingOpen(true);
    } catch (e: any) {
      setParsingError(e.message || 'Chyba při čtení souboru.');
    } finally {
      setIsParsing(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleExecuteImport = async () => {
    if (!parsedData || parsedData.rows.length === 0) return;

    setIsImporting(true);
    setImportSummary(null);
    try {
      const res = await onImportBatch(
        parsedData.rows,
        currentMapping,
        deduplicate,
        updateExisting
      );
      setImportSummary(res.message || 'Import úspěšně dokončen.');
    } catch (e: any) {
      setImportSummary(`Chyba: ${e.message || 'Import selhal'}`);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden text-slate-900">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 flex items-center justify-center font-bold">
              <UploadCloud className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 tracking-tight">Kontrolovaný CSV import</h2>
              <p className="text-xs text-slate-500 font-medium">Hromadný import poptávek s náhledem a kontrolou mapování</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          
          {/* Drag & Drop Area */}
          {!parsedData ? (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-3xl p-8 text-center transition-all cursor-pointer ${
                isDragging 
                  ? 'border-amber-500 bg-amber-50/50 scale-[0.99]' 
                  : 'border-slate-300 hover:border-amber-400 hover:bg-slate-50/70 bg-slate-50/30'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                onChange={e => {
                  if (e.target.files && e.target.files.length > 0) {
                    handleFile(e.target.files[0]);
                  }
                }}
                className="hidden"
              />
              <div className="w-14 h-14 rounded-2xl bg-amber-100/80 border border-amber-200 text-amber-700 mx-auto flex items-center justify-center mb-4 shadow-sm">
                {isParsing ? <RefreshCw className="w-7 h-7 animate-spin" /> : <UploadCloud className="w-7 h-7" />}
              </div>
              <h3 className="text-sm font-black text-slate-900 mb-1">
                {isParsing ? 'Zpracovávám soubor...' : 'Přetáhněte sem soubor CSV'}
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Pilot podporuje <strong>.csv</strong> s náhledem před importem. Excel nejprve exportujte do CSV.
              </p>
              <div className="mt-4 inline-flex items-center gap-2 px-4 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-bold shadow-sm">
                <FileText className="w-3.5 h-3.5" />
                Vybrat soubor z počítače
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* File Info Pill */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 font-black flex items-center justify-center text-xs uppercase font-mono">
                    {parsedData.format}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">{parsedData.fileName}</h4>
                    <p className="text-[11px] text-slate-500 font-medium">
                      {(parsedData.fileSize / 1024).toFixed(1)} KB • {parsedData.totalRows} řádků • {parsedData.headers.length} sloupců
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsMappingOpen(true)}
                    className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-xs font-bold text-slate-800 flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5 text-amber-600" />
                    Zkontrolovat mapování ({Object.keys(currentMapping).length})
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setParsedData(null);
                      setImportSummary(null);
                    }}
                    className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
                    title="Nahrát jiný soubor"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Deduplication & Merge settings */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-slate-600" />
                    <span className="text-xs font-bold text-slate-800">Inteligentní deduplikace</span>
                  </div>
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={deduplicate}
                      onChange={e => setDeduplicate(e.target.checked)}
                      className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-slate-300"
                    />
                    Aktivní
                  </label>
                </div>
                <p className="text-[11px] text-slate-500">
                  Porovnává telefonní číslo, e-mail a název stavby se stávajícími záznamy v organizaci.
                </p>
                {deduplicate && (
                  <div className="pt-2 flex items-center gap-4 text-xs font-medium text-slate-700">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="dupAction"
                        checked={updateExisting}
                        onChange={() => setUpdateExisting(true)}
                        className="text-amber-600"
                      />
                      Aktualizovat stávající zakázku
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="dupAction"
                        checked={!updateExisting}
                        onChange={() => setUpdateExisting(false)}
                        className="text-amber-600"
                      />
                      Přeskočit duplicitu
                    </label>
                  </div>
                )}
              </div>

              {/* Preview Table */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm max-h-52 overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse font-sans">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold">
                      {parsedData.headers.slice(0, 6).map(h => (
                        <th key={h} className="px-3.5 py-2 whitespace-nowrap text-[11px] font-mono">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {parsedData.rows.slice(0, 5).map((row, i) => (
                      <tr key={i} className="hover:bg-slate-50">
                        {parsedData.headers.slice(0, 6).map(h => (
                          <td key={h} className="px-3.5 py-1.5 whitespace-nowrap text-slate-800 font-medium text-[11px]">
                            {row[h] !== undefined && row[h] !== null ? String(row[h]) : '—'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {parsingError && (
            <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-900 text-xs font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{parsingError}</span>
            </div>
          )}

          {importSummary && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{importSummary}</span>
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
          >
            Zavřít
          </button>

          {parsedData && (
            <button
              type="button"
              onClick={handleExecuteImport}
              disabled={isImporting}
              className="px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center gap-2 shadow-lg transition-all cursor-pointer disabled:opacity-50"
            >
              {isImporting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              <span>{isImporting ? 'Importuji data do CRM...' : `Importovat ${parsedData.totalRows} zakázek do Kanbanu`}</span>
            </button>
          )}
        </div>

      </div>

      {/* Field Mapping Sub-Modal */}
      {parsedData && (
        <SmartFieldMappingModal
          isOpen={isMappingOpen}
          onClose={() => setIsMappingOpen(false)}
          headers={parsedData.headers}
          sampleRow={parsedData.rows[0]}
          initialMapping={currentMapping}
          onConfirmMapping={(newMap) => {
            setCurrentMapping(newMap);
            setImportSummary('Mapování sloupců uloženo. Připraveno k importu.');
          }}
          title="Mapování sloupců importovaného souboru"
          sourceName={parsedData.fileName}
        />
      )}
    </div>
  );
};
