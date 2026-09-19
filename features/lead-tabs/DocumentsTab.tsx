import React, { useState } from 'react';
import { 
  FolderOpen, 
  FileText, 
  Download, 
  Upload, 
  CheckCircle2, 
  ShieldCheck, 
  Plus, 
  Eye,
  Trash2
} from 'lucide-react';
import { Lead } from '../../types';

interface DocumentsTabProps {
  lead: Lead;
  onNotice: (msg: string) => void;
}

interface DocFile {
  id: string;
  name: string;
  category: 'Smlouva o dílo' | 'Projektová dokumentace' | 'Technický list' | 'Povolení & BOZP';
  fileSize: string;
  date: string;
  status: 'Podepsáno' | 'Schváleno' | 'Platné';
}

export const DocumentsTab: React.FC<DocumentsTabProps> = ({ lead, onNotice }) => {
  const [docs, setDocs] = useState<DocFile[]>([
    {
      id: 'd-1',
      name: 'Smlouva_o_dilo_SOD-2026-089.pdf',
      category: 'Smlouva o dílo',
      fileSize: '2.4 MB',
      date: '02. 10. 2026',
      status: 'Podepsáno'
    },
    {
      id: 'd-2',
      name: 'Polozkovy_rozpocet_v1.3_schvaleny.pdf',
      category: 'Projektová dokumentace',
      fileSize: '840 KB',
      date: '03. 10. 2026',
      status: 'Schváleno'
    },
    {
      id: 'd-3',
      name: 'Vykres_pudorysu_a_kotveni_A3.pdf',
      category: 'Projektová dokumentace',
      fileSize: '4.8 MB',
      date: '28. 09. 2026',
      status: 'Schváleno'
    },
    {
      id: 'd-4',
      name: 'Certifikat_shody_KVH_hranoly_Si.pdf',
      category: 'Technický list',
      fileSize: '1.1 MB',
      date: '05. 10. 2026',
      status: 'Platné'
    },
    {
      id: 'd-5',
      name: 'Ohlaseni_stavby_a_vyjadreni_MU.pdf',
      category: 'Povolení & BOZP',
      fileSize: '1.7 MB',
      date: '01. 10. 2026',
      status: 'Platné'
    }
  ]);

  const [newDocName, setNewDocName] = useState('');
  const [newCategory, setNewCategory] = useState<DocFile['category']>('Projektová dokumentace');

  const handleUploadDoc = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDocName.trim()) return;

    const newDoc: DocFile = {
      id: 'd-' + Date.now(),
      name: newDocName.endsWith('.pdf') ? newDocName : `${newDocName}.pdf`,
      category: newCategory,
      fileSize: '1.5 MB',
      date: 'Dnes',
      status: 'Schváleno'
    };

    setDocs(prev => [...prev, newDoc]);
    setNewDocName('');
    onNotice(`Dokument "${newDoc.name}" byl nahrán do spisu zakázky.`);
  };

  const handleDownload = (docName: string) => {
    onNotice(`Stahování dokumentu "${docName}" bylo zahájeno.`);
  };

  const handleRemoveDoc = (id: string, name: string) => {
    setDocs(prev => prev.filter(d => d.id !== id));
    onNotice(`Dokument "${name}" byl smazán.`);
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-black text-slate-900">Spis a dokumentace zakázky</h2>
          <p className="text-xs text-slate-500 mt-0.5">Smlouvy o dílo, technické výkresy, certifikáty a povolení</p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
            {docs.length} souborů v cloudu
          </span>
        </div>
      </div>

      {/* Documents table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200/80 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Typ dokumentu</th>
                <th className="py-3 px-4">Název souboru</th>
                <th className="py-3 px-4 text-center">Velikost</th>
                <th className="py-3 px-4 text-center">Datum nahrání</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Akce</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {docs.map(doc => (
                <tr key={doc.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-[#0A84FF] border border-blue-200">
                      {doc.category}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-bold text-slate-900 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-slate-400" />
                    <span>{doc.name}</span>
                  </td>
                  <td className="py-3 px-4 text-center text-slate-500">{doc.fileSize}</td>
                  <td className="py-3 px-4 text-center text-slate-500">{doc.date}</td>
                  <td className="py-3 px-4 text-center">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {doc.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => handleDownload(doc.name)}
                        className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
                        title="Stáhnout"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleRemoveDoc(doc.id, doc.name)}
                        className="p-1.5 rounded-lg border border-slate-200 hover:bg-rose-50 hover:text-rose-600 text-slate-400 transition-colors"
                        title="Smazat"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Upload new document form */}
        <form onSubmit={handleUploadDoc} className="p-4 bg-slate-50/80 border-t border-slate-200 flex flex-wrap gap-2 items-center text-xs">
          <input
            type="text"
            placeholder="Název souboru (např. Revizni_zprava.pdf)..."
            value={newDocName}
            onChange={e => setNewDocName(e.target.value)}
            className="flex-1 min-w-[200px] p-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-[#0A84FF]"
          />

          <select
            value={newCategory}
            onChange={e => setNewCategory(e.target.value as any)}
            className="p-2 rounded-xl border border-slate-200 bg-white font-medium text-slate-700"
          >
            <option value="Smlouva o dílo">Smlouva o dílo</option>
            <option value="Projektová dokumentace">Projektová dokumentace</option>
            <option value="Technický list">Technický list</option>
            <option value="Povolení & BOZP">Povolení & BOZP</option>
          </select>

          <button
            type="submit"
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold flex items-center gap-1.5 transition-colors"
          >
            <Upload className="w-3.5 h-3.5" />
            Nahrát do spisu
          </button>
        </form>
      </div>
    </div>
  );
};
