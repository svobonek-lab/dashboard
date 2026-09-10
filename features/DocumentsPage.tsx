import React, { useState } from 'react';
import { FileText, FolderOpen, Download, FileSpreadsheet, ShieldCheck, Search, Sparkles, AlertTriangle, Link2, Eye } from 'lucide-react';
import { CompanyBranding } from '../types';

interface DocumentsPageProps {
  branding: CompanyBranding;
}

export const DocumentsPage: React.FC<DocumentsPageProps> = ({ branding }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [ocrModalDoc, setOcrModalDoc] = useState<any | null>(null);

  const documents = [
    { 
      id: '1', 
      name: 'Smlouva_o_dilo_standard_2026.pdf', 
      type: 'PDF Contract', 
      date: '2026-09-01', 
      size: '2.4 MB',
      expires: '2027-09-01',
      relatedProject: 'Dřevěná Pergola - Ing. Jan Svoboda',
      ocrText: 'SMLOUVA O DÍLO • Dodavatel: ' + branding.name + ' • Klient: Ing. Jan Svoboda • Celková cena: 220 000 CZK • Záruka: 60 měsíců.'
    },
    { 
      id: '2', 
      name: 'Stavebni_povoleni_Trinec_okr.pdf', 
      type: 'Official PDF', 
      date: '2026-08-28', 
      size: '4.1 MB',
      expires: '2026-09-18', // Expiring soon
      relatedProject: 'Ocelový přístřešek - MěÚ Třinec',
      ocrText: 'STAVEBNÍ POVOLENÍ • Vydáno stavebním úřadem Třinec. Platnost do 18.09.2026. Podmínky realizace splněny.'
    },
    { 
      id: '3', 
      name: 'Cenikova_struktura_materialu_2026.xlsx', 
      type: 'Spreadsheet', 
      date: '2026-08-15', 
      size: '1.1 MB',
      expires: '2026-12-31',
      relatedProject: 'Interní firemní standard',
      ocrText: 'CENÍK MATERIÁLU • Dubové dřevo, ocelové profily, spojovací materiál. Slevové rabaty pro partnery.'
    },
    { 
      id: '4', 
      name: 'Predavaci_protokol_vzor.pdf', 
      type: 'Protocol', 
      date: '2026-08-10', 
      size: '840 KB',
      expires: '2028-01-01',
      relatedProject: 'Všechny realizace',
      ocrText: 'PŘEDÁVACÍ PROTOKOL • Prohlášení o bezvadném stavu díla při předání zákazníkovi.'
    },
  ];

  const filteredDocs = documents.filter(d => 
    d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.relatedProject.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.ocrText.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-16">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Enterprise Documents & AI Repository</h2>
          <p className="text-xs text-slate-500">AI-powered search, OCR extraction, project links & expiring document alerts for {branding.name}</p>
        </div>

        {/* AI Search Bar */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="AI Search docs (e.g. 'contract', 'Třinec')..."
            className="w-full bg-white border border-slate-200 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-xs"
          />
        </div>
      </div>

      {/* Expiring Document Alert Banner */}
      <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl text-amber-900 text-xs flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-2.5 font-semibold">
          <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <span><strong>Expiring Document Alert:</strong> "Stavebni_povoleni_Trinec_okr.pdf" expires in 8 days (September 18, 2026). Renewal application required.</span>
        </div>
        <span className="px-2.5 py-1 bg-amber-200/60 rounded-lg text-amber-900 font-bold text-[10px]">Action Needed</span>
      </div>

      {/* Documents List */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="divide-y divide-slate-100">
          {filteredDocs.map(doc => {
            const isExpiringSoon = doc.expires.startsWith('2026-09-18');
            return (
              <div key={doc.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 transition-all">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold text-slate-900">{doc.name}</h4>
                      {isExpiringSoon && (
                        <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-rose-100 text-rose-700">Expires Soon</span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500">{doc.type} • Uploaded {doc.date} • Size: {doc.size}</p>
                    
                    {/* Related Project Link */}
                    <div className="flex items-center gap-1.5 text-[11px] text-blue-600 font-semibold pt-0.5">
                      <Link2 className="w-3 h-3" />
                      <span>Linked Project: {doc.relatedProject}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <button
                    onClick={() => setOcrModalDoc(doc)}
                    className="px-3 py-1.5 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 text-xs font-semibold text-blue-700 flex items-center gap-1.5 transition-all"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>OCR Preview</span>
                  </button>
                  <button className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <Download className="w-3.5 h-3.5" />
                    <span>Download</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* OCR Preview Modal */}
      {ocrModalDoc && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl animate-in fade-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">AI OCR Text Extraction</h3>
              </div>
              <button onClick={() => setOcrModalDoc(null)} className="text-xs font-bold text-slate-400 hover:text-slate-700">✕</button>
            </div>

            <div className="space-y-3">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400">Document Name</span>
                <p className="text-xs font-bold text-slate-900">{ocrModalDoc.name}</p>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs text-slate-700 font-mono space-y-2">
                <p className="text-[10px] font-bold text-blue-600 uppercase">Extracted Plaintext (OCR Index)</p>
                <p>{ocrModalDoc.ocrText}</p>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button onClick={() => setOcrModalDoc(null)} className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

