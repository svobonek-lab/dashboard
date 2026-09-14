import React, { useState } from 'react';
import { FileText, Download, Search, Sparkles, AlertTriangle, Link2 } from 'lucide-react';
import { CompanyBranding } from '../types';

interface DocumentsPageProps {
  branding: CompanyBranding;
}

export const DocumentsPage: React.FC<DocumentsPageProps> = ({ branding }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [ocrModalDoc, setOcrModalDoc] = useState<any | null>(null);

  const activeColor = branding.primaryColor || '#2563eb';

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
    <div className="space-y-6 pb-16 text-slate-900 font-sans">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Správa dokumentace & digitální archiv staveb</h1>
          <p className="text-xs text-slate-500 mt-0.5">Smlouvy o dílo, stavební povolení, předávací protokoly s OCR vyhledáváním a hlídáním termínů platnosti</p>
        </div>

        {/* AI Search Bar */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Hledat v dokumentech (např. 'smlouva', 'povolení')..."
            className="w-full bg-white border border-slate-200 focus:border-brand-primary rounded-2xl pl-10 pr-4 py-2.5 text-xs text-slate-800 focus:outline-none shadow-xs"
          />
        </div>
      </div>

      {/* Expiring Document Alert Banner */}
      <div className="bg-rose-50 border border-rose-200 p-4 rounded-2xl text-rose-900 text-xs flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-2.5 font-semibold">
          <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
          <span><strong>Upozornění na vypršení lhůty:</strong> Dokument „Stavebni_povoleni_Trinec_okr.pdf“ končí platnost za 8 dní (18. září 2026). Je nutné podat žádost o prodloužení.</span>
        </div>
        <span className="px-2.5 py-1 bg-rose-100 border border-rose-300 rounded-lg text-rose-800 font-bold text-[10px]">Vyžaduje akci</span>
      </div>

      {/* Documents List */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="divide-y divide-slate-100">
          {filteredDocs.map(doc => {
            const isExpiringSoon = doc.expires.startsWith('2026-09-18');
            return (
              <div key={doc.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 transition-all">
                <div className="flex items-start gap-3">
                  <div 
                    className="w-10 h-10 rounded-xl border flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ backgroundColor: `${activeColor}10`, borderColor: `${activeColor}30`, color: activeColor }}
                  >
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold text-slate-900">{doc.name}</h4>
                      {isExpiringSoon && (
                        <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-rose-50 border border-rose-200 text-rose-700">Brzy vyprší</span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500">{doc.type} • Nahráno {doc.date} • Velikost: {doc.size}</p>
                    
                    {/* Related Project Link */}
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold pt-0.5" style={{ color: activeColor }}>
                      <Link2 className="w-3 h-3" />
                      <span>Navázáno na zakázku: {doc.relatedProject}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <button
                    onClick={() => setOcrModalDoc(doc)}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-800 flex items-center gap-1.5 transition-all"
                  >
                    <Sparkles className="w-3.5 h-3.5" style={{ color: activeColor }} />
                    <span>OCR text</span>
                  </button>
                  <button className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-800 flex items-center gap-1.5 transition-all">
                    <Download className="w-3.5 h-3.5" />
                    <span>Stáhnout</span>
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
          <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl animate-in fade-in text-slate-900">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5" style={{ color: activeColor }} />
                <h3 className="text-sm font-bold text-slate-900">Extrahovaný text z dokumentu (OCR)</h3>
              </div>
              <button onClick={() => setOcrModalDoc(null)} className="text-xs font-bold text-slate-400 hover:text-slate-800">✕</button>
            </div>

            <div className="space-y-3">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500">Název souboru</span>
                <p className="text-xs font-bold text-slate-800">{ocrModalDoc.name}</p>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs text-slate-700 font-mono space-y-2">
                <p className="text-[10px] font-bold uppercase" style={{ color: activeColor }}>Rozpoznaný obsah (Indexováno pro vyhledávání)</p>
                <p className="leading-relaxed">{ocrModalDoc.ocrText}</p>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button 
                onClick={() => setOcrModalDoc(null)} 
                className="px-4 py-2 rounded-xl text-white text-xs font-bold shadow-xs hover:opacity-95"
                style={{ backgroundColor: activeColor }}
              >
                Zavřít náhled
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
