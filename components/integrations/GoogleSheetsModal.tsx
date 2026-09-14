import React, { useState } from 'react';
import { GoogleSheetsConfig, FieldMappingConfig } from '@/types/integrations';
import { testGoogleSheetsConnection, GoogleSheetsPreviewResult } from '@/lib/integrations/sheetsConnector';
import { SmartFieldMappingModal } from './SmartFieldMappingModal';
import { 
  FileSpreadsheet, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  Play, 
  SlidersHorizontal, 
  Table2,
  ExternalLink
} from 'lucide-react';

interface GoogleSheetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialConfig?: GoogleSheetsConfig;
  initialMapping?: FieldMappingConfig;
  onSaveConfig: (config: GoogleSheetsConfig, mapping: FieldMappingConfig) => void;
  onRunSync: (config: GoogleSheetsConfig, mapping: FieldMappingConfig) => Promise<any>;
}

export const GoogleSheetsModal: React.FC<GoogleSheetsModalProps> = ({
  isOpen,
  onClose,
  initialConfig,
  initialMapping,
  onSaveConfig,
  onRunSync
}) => {
  const [spreadsheetUrl, setSpreadsheetUrl] = useState(
    initialConfig?.spreadsheetUrlOrId || 'https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit'
  );
  const [sheetName, setSheetName] = useState(initialConfig?.sheetName || 'Poptávky 2026');
  const [autoSync, setAutoSync] = useState(initialConfig?.autoSync ?? true);
  const [syncInterval, setSyncInterval] = useState(initialConfig?.syncIntervalMinutes || 30);

  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [previewData, setPreviewData] = useState<GoogleSheetsPreviewResult | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);

  const [isMappingOpen, setIsMappingOpen] = useState(false);
  const [currentMapping, setCurrentMapping] = useState<FieldMappingConfig>(initialMapping || {
    'Číslo zakázky': 'ignore',
    'Klient / Objednatel': 'customerName',
    'Typ projektu': 'title',
    'Telefon': 'customerPhone',
    'E-mail': 'customerEmail',
    'Město': 'city',
    'Adresa': 'address',
    'Předpokládaná cena': 'price',
    'Stav': 'status',
    'Montážník / Mistr': 'assignedEmployeeName',
    'Termín montáže': 'preferredDate',
    'Poznámka ke stavbě': 'description'
  });

  if (!isOpen) return null;

  const handleTestAndPreview = async () => {
    setIsLoadingPreview(true);
    setPreviewData(null);
    setSyncNotice(null);
    try {
      const config: GoogleSheetsConfig = {
        spreadsheetUrlOrId: spreadsheetUrl,
        sheetName,
        autoSync,
        syncIntervalMinutes: Number(syncInterval)
      };
      const res = await testGoogleSheetsConnection(config);
      setPreviewData(res);
      if (res.availableSheets && res.availableSheets.length > 0 && !res.availableSheets.includes(sheetName)) {
        setSheetName(res.availableSheets[0]);
      }
    } catch (e: any) {
      setPreviewData({
        success: false,
        spreadsheetTitle: '',
        availableSheets: [],
        selectedSheet: '',
        headers: [],
        previewRows: [],
        totalRowCount: 0,
        message: e.message || 'Nepodařilo se načíst Google Sheet.'
      });
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const handleSaveAndConnect = () => {
    const config: GoogleSheetsConfig = {
      spreadsheetUrlOrId: spreadsheetUrl,
      sheetName,
      autoSync,
      syncIntervalMinutes: Number(syncInterval)
    };
    onSaveConfig(config, currentMapping);
    onClose();
  };

  const handleExecuteSync = async () => {
    setIsSyncing(true);
    setSyncNotice(null);
    try {
      const config: GoogleSheetsConfig = {
        spreadsheetUrlOrId: spreadsheetUrl,
        sheetName,
        autoSync,
        syncIntervalMinutes: Number(syncInterval)
      };
      const res = await onRunSync(config, currentMapping);
      setSyncNotice(res.message || 'Synchronizace s Google Sheets dokončena.');
    } catch (e: any) {
      setSyncNotice(`Chyba: ${e.message || 'Synchronizace selhala'}`);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden text-slate-900">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 flex items-center justify-center font-bold">
              <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 tracking-tight">Google Sheets Live Connector</h2>
              <p className="text-xs text-slate-500 font-medium">Automatické obousměrné načítání zakázek a poptávek z Google Tabulek</p>
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
          
          {/* URL & Worksheet Configuration */}
          <div className="space-y-3 bg-slate-50 border border-slate-200/80 rounded-2xl p-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                <span>URL adresa nebo ID Google Tabulky</span>
                <span className="text-[11px] text-slate-500 font-normal">Podporuje sdílené firemní tabulky i CSV export</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={spreadsheetUrl}
                  onChange={e => setSpreadsheetUrl(e.target.value)}
                  placeholder="https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5n.../edit"
                  className="flex-1 px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500"
                />
                <button
                  type="button"
                  onClick={handleTestAndPreview}
                  disabled={isLoadingPreview}
                  className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50 shrink-0"
                >
                  {isLoadingPreview ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Table2 className="w-3.5 h-3.5" />}
                  <span>Načíst data & Náhled</span>
                </button>
              </div>
            </div>

            {/* Select Worksheet */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Název listu (Worksheet / Záložka)</label>
                {previewData && previewData.availableSheets.length > 0 ? (
                  <select
                    value={sheetName}
                    onChange={e => setSheetName(e.target.value)}
                    className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                  >
                    {previewData.availableSheets.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={sheetName}
                    onChange={e => setSheetName(e.target.value)}
                    placeholder="Poptávky 2026 nebo List1"
                    className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500"
                  />
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Automatická synchronizace</label>
                <div className="flex items-center gap-3 h-9">
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoSync}
                      onChange={e => setAutoSync(e.target.checked)}
                      className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
                    />
                    Aktivní
                  </label>
                  <select
                    value={syncInterval}
                    onChange={e => setSyncInterval(Number(e.target.value))}
                    disabled={!autoSync}
                    className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 disabled:opacity-50 cursor-pointer"
                  >
                    <option value="15">Každých 15 minut</option>
                    <option value="30">Každých 30 minut</option>
                    <option value="60">Každou hodinu</option>
                    <option value="180">Každé 3 hodiny</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Preview Table Panel */}
          {previewData && previewData.success && (
            <div className="space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>{previewData.message}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMappingOpen(true)}
                  className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  Upravit mapování polí ({Object.keys(currentMapping).length})
                </button>
              </div>

              {/* Data Table Preview */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm max-h-64 overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse font-sans">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold">
                      {previewData.headers.slice(0, 7).map(h => (
                        <th key={h} className="px-3.5 py-2.5 whitespace-nowrap text-[11px] font-mono">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {previewData.previewRows.map((row, i) => (
                      <tr key={i} className="hover:bg-slate-50 transition-colors">
                        {previewData.headers.slice(0, 7).map(h => (
                          <td key={h} className="px-3.5 py-2 whitespace-nowrap text-slate-800 font-medium">
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

          {previewData && !previewData.success && (
            <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-900 text-xs font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{previewData.message}</span>
            </div>
          )}

          {/* Sync Notice Banner */}
          {syncNotice && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{syncNotice}</span>
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/80 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsMappingOpen(true)}
              className="px-3.5 py-2.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-300 text-xs font-bold text-slate-700 flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
              <span>Mapování sloupců</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExecuteSync}
              disabled={isSyncing}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-2 shadow-sm transition-all cursor-pointer disabled:opacity-50"
            >
              {isSyncing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
              <span>{isSyncing ? 'Synchronizuji...' : 'Sync Now'}</span>
            </button>

            <button
              type="button"
              onClick={handleSaveAndConnect}
              className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold flex items-center gap-2 shadow-lg transition-all cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Uložit konfiguraci</span>
            </button>
          </div>
        </div>

      </div>

      {/* Field Mapping Sub-Modal */}
      <SmartFieldMappingModal
        isOpen={isMappingOpen}
        onClose={() => setIsMappingOpen(false)}
        headers={previewData?.headers || Object.keys(currentMapping)}
        sampleRow={previewData?.previewRows?.[0]}
        initialMapping={currentMapping}
        onConfirmMapping={(newMap) => {
          setCurrentMapping(newMap);
          setSyncNotice('Mapování sloupců pro Google Sheets uloženo.');
        }}
        title="Mapování sloupců Google Sheets do CRM"
        sourceName={`List: ${sheetName}`}
      />
    </div>
  );
};
