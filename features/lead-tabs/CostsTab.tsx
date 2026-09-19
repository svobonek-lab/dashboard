import React, { useState } from 'react';
import { 
  Receipt, 
  DollarSign, 
  TrendingUp, 
  AlertTriangle, 
  Plus, 
  FileText, 
  CheckCircle2, 
  ExternalLink,
  Trash2
} from 'lucide-react';
import { Lead } from '../../types';

interface CostsTabProps {
  lead: Lead;
  onNotice: (msg: string) => void;
}

interface Expense {
  id: string;
  docNumber: string;
  supplier: string;
  description: string;
  date: string;
  amountWithoutVat: number;
  vatAmount: number;
  paid: boolean;
}

export const CostsTab: React.FC<CostsTabProps> = ({ lead, onNotice }) => {
  const [expenses, setExpenses] = useState<Expense[]>([
    {
      id: 'e-1',
      docNumber: 'FP-2026-118',
      supplier: 'Stavebniny DEK a.s.',
      description: 'Hydroizolační asfaltové pásy, penetrační nátěr a kotevní terče',
      date: '09. 10. 2026',
      amountWithoutVat: 7840,
      vatAmount: 1646,
      paid: true
    },
    {
      id: 'e-2',
      docNumber: 'FP-2026-124',
      supplier: 'Würth spol. s r.o.',
      description: 'Konstrukční vruty s talířovou hlavou 8x240, chemické kotvy a doplňky',
      date: '10. 10. 2026',
      amountWithoutVat: 3420,
      vatAmount: 718,
      paid: true
    },
    {
      id: 'e-3',
      docNumber: 'FP-2026-135',
      supplier: 'Dřevomateriál Holý',
      description: 'KVH sušené lepené hranoly Si 140x140mm délky 4m (nosná konstrukce)',
      date: '11. 10. 2026',
      amountWithoutVat: 48200,
      vatAmount: 10122,
      paid: false
    }
  ]);

  const [newSupplier, setNewSupplier] = useState('');
  const [newDoc, setNewDoc] = useState('FP-' + Math.floor(1000 + Math.random() * 9000));
  const [newDesc, setNewDesc] = useState('');
  const [newAmount, setNewAmount] = useState(4500);

  const totalMaterialCosts = expenses.reduce((acc, e) => acc + e.amountWithoutVat, 0);
  const laborCosts = 19500; // estimated labor hours recorded
  const contractPriceWithoutVat = (lead.price || 353000) / 1.21;
  const currentTotalCost = totalMaterialCosts + laborCosts;
  const grossProfit = contractPriceWithoutVat - currentTotalCost;
  const currentMargin = (grossProfit / contractPriceWithoutVat) * 100;

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSupplier.trim() || !newDesc.trim()) return;

    const amt = Number(newAmount);
    const newExp: Expense = {
      id: 'e-' + Date.now(),
      docNumber: newDoc,
      supplier: newSupplier,
      description: newDesc,
      date: 'Dnes',
      amountWithoutVat: amt,
      vatAmount: Math.round(amt * 0.21),
      paid: true
    };

    setExpenses(prev => [...prev, newExp]);
    setNewSupplier('');
    setNewDesc('');
    setNewDoc('FP-' + Math.floor(1000 + Math.random() * 9000));
    onNotice(`Nákladový doklad od ${newSupplier} (${amt.toLocaleString('cs-CZ')} Kč) byl zaúčtován.`);
  };

  const handleRemoveExpense = (id: string, doc: string) => {
    setExpenses(prev => prev.filter(e => e.id !== id));
    onNotice(`Doklad ${doc} byl odstraněn.`);
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Live Margin & Financial Health */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Materiálové náklady</span>
          <p className="text-xl font-black text-slate-900 mt-1">{totalMaterialCosts.toLocaleString('cs-CZ')} Kč</p>
          <span className="text-[10px] text-slate-500">{expenses.length} přijatých faktur / účtenek</span>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Mzdové náklady</span>
          <p className="text-xl font-black text-slate-900 mt-1">{laborCosts.toLocaleString('cs-CZ')} Kč</p>
          <span className="text-[10px] text-slate-500">Montáž a tesařské práce</span>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Aktuální čistá marže</span>
          <p className="text-xl font-black text-emerald-600 mt-1">{currentMargin.toFixed(1)} %</p>
          <span className="text-[10px] text-emerald-600 font-bold">Zisk: {Math.round(grossProfit).toLocaleString('cs-CZ')} Kč</span>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Rozpočtová rezerva</span>
          <p className="text-xl font-black text-[#0A84FF] mt-1">21 400 Kč</p>
          <span className="text-[10px] text-slate-500">Zbývá k vyčerpání</span>
        </div>
      </div>

      {/* Expenses List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-black text-slate-900">Kniha skutečných nákladů stavby</h2>
            <p className="text-xs text-slate-500 mt-0.5">Přijaté faktury za materiál, subdodávky a dopravu</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200/80 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Doklad</th>
                <th className="py-3 px-4">Dodavatel</th>
                <th className="py-3 px-4">Položky / Popis</th>
                <th className="py-3 px-4 text-center">Datum</th>
                <th className="py-3 px-4 text-right">Bez DPH</th>
                <th className="py-3 px-4 text-right">S DPH (21 %)</th>
                <th className="py-3 px-4 text-center">Stav</th>
                <th className="py-3 px-4 text-center">Akce</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {expenses.map(exp => (
                <tr key={exp.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-slate-800">{exp.docNumber}</td>
                  <td className="py-3 px-4 font-bold text-slate-900">{exp.supplier}</td>
                  <td className="py-3 px-4 text-slate-600">{exp.description}</td>
                  <td className="py-3 px-4 text-center text-slate-500">{exp.date}</td>
                  <td className="py-3 px-4 text-right font-mono text-slate-700">{exp.amountWithoutVat.toLocaleString('cs-CZ')} Kč</td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                    {(exp.amountWithoutVat + exp.vatAmount).toLocaleString('cs-CZ')} Kč
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      exp.paid ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                      'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}>
                      {exp.paid ? 'Uhrazeno' : 'K proplacení'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={() => handleRemoveExpense(exp.id, exp.docNumber)}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                      title="Smazat doklad"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Add Expense Form */}
        <form onSubmit={handleAddExpense} className="p-4 bg-slate-50/80 border-t border-slate-200 flex flex-wrap gap-2 items-center text-xs">
          <input
            type="text"
            placeholder="Číslo dokladu..."
            value={newDoc}
            onChange={e => setNewDoc(e.target.value)}
            className="w-32 p-2 rounded-xl border border-slate-200 bg-white font-mono"
          />

          <input
            type="text"
            placeholder="Dodavatel (např. DEK, Würth)..."
            value={newSupplier}
            onChange={e => setNewSupplier(e.target.value)}
            className="w-48 p-2 rounded-xl border border-slate-200 bg-white"
          />

          <input
            type="text"
            placeholder="Popis materiálu..."
            value={newDesc}
            onChange={e => setNewDesc(e.target.value)}
            className="flex-1 min-w-[180px] p-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-[#0A84FF]"
          />

          <input
            type="number"
            min="0"
            placeholder="Částka bez DPH"
            value={newAmount}
            onChange={e => setNewAmount(Number(e.target.value))}
            className="w-32 p-2 rounded-xl border border-slate-200 bg-white text-right font-mono"
          />

          <button
            type="submit"
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Zaúčtovat nákup
          </button>
        </form>
      </div>
    </div>
  );
};
