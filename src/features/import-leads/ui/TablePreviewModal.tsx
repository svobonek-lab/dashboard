import React from 'react';
import { Database, X, Table2 } from 'lucide-react';

interface TablePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableTables: string[];
  sampleColumns: string[];
  sampleRows: any[];
}

export const TablePreviewModal: React.FC<TablePreviewModalProps> = ({
  isOpen,
  onClose,
  availableTables,
  sampleColumns,
  sampleRows
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden text-slate-900">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 flex items-center justify-center font-bold">
              <Table2 className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 tracking-tight">Preview Tables & Data</h2>
              <p className="text-xs text-slate-500 font-medium">Náčrt struktury databáze a náhled záznamů</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div>
            <h3 className="text-sm font-bold text-slate-800 mb-2 flex items-center gap-2">
              <Database className="w-4 h-4 text-slate-500" />
              Dostupné tabulky v databázi ({availableTables.length})
            </h3>
            <div className="flex flex-wrap gap-2">
              {availableTables.map(t => (
                <span key={t} className="px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-xs text-slate-700">
                  {t}
                </span>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-bold text-slate-800 mb-2">Náhled dat vybrané tabulky</h3>
            <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      {sampleColumns.map(col => (
                        <th key={col} className="px-4 py-3 font-bold text-slate-600 whitespace-nowrap">{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {sampleRows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 transition-colors">
                        {sampleColumns.map(col => (
                          <td key={col} className="px-4 py-3 text-slate-700 truncate max-w-[200px]" title={String(row[col] || '')}>
                            {row[col] !== null && row[col] !== undefined ? String(row[col]) : <span className="text-slate-300 italic">null</span>}
                          </td>
                        ))}
                      </tr>
                    ))}
                    {sampleRows.length === 0 && (
                      <tr>
                        <td colSpan={sampleColumns.length || 1} className="px-4 py-8 text-center text-slate-500">
                          Žádná data k náhledu.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
