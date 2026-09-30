import React, { useState } from 'react';
import { 
  AlertTriangle, 
  Plus, 
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
  // Costs are intentionally empty until app_costs is connected. Never show
  // invented supplier invoices or labour totals in a real company workspace.
  const [expenses, setExpenses] = useState<Expense[]>([]);

  const [newSupplier, setNewSupplier] = useState('');
  const [newDoc, setNewDoc] = useState('FP-' + Math.floor(1000 + Math.random() * 9000));
  const [newDesc, setNewDesc] = useState('');
  const [newAmount, setNewAmount] = useState(4500);

  const totalMaterialCosts = expenses.reduce((acc, e) => acc + e.amountWithoutVat, 0);
  const laborCosts = 0;
  const contractPriceWithoutVat = lead.price > 0 ? lead.price / 1.21 : 0;
  const currentTotalCost = totalMaterialCosts + laborCosts;
  const grossProfit = contractPriceWithoutVat > 0 ? contractPriceWithoutVat - currentTotalCost : 0;
  const currentMargin = contractPriceWithoutVat > 0 ? (grossProfit / contractPriceWithoutVat) * 100 : 0;

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
    onNotice(`Ukázková položka od ${newSupplier} (${amt.toLocaleString('cs-CZ')} Kč) byla přidána pouze do této ukázky.`);
  };

  const handleRemoveExpense = (id: string, doc: string) => {
    setExpenses(prev => prev.filter(e => e.id !== id));
    onNotice(`Ukázkový doklad ${doc} byl odebrán pouze z tohoto přehledu.`);
  };

  return (
    <div className="space-y-6 font-sans">
      <div role="note" className="flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-amber-950">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" aria-hidden="true" />
        <div>
          <p className="text-sm font-bold">Náklady zatím nejsou napojené na účetní data</p>
          <p className="mt-1 text-xs leading-relaxed">Tato obrazovka zobrazuje pouze doklady připojené k zakázce. Dokud není aktivní napojení na náklady, částky a marže zůstávají prázdné. Záznamy přidané v tomto náhledu se neukládají.</p>
        </div>
      </div>

      {/* Illustrative demo margin, not persisted financial data */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Materiál</span>
          <p className="text-xl font-black text-slate-900 mt-1">{expenses.length ? `${totalMaterialCosts.toLocaleString('cs-CZ')} Kč` : '—'}</p>
          <span className="text-[10px] text-slate-500">{expenses.length ? `${expenses.length} dokladů v náhledu` : 'Bez připojených dokladů'}</span>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Práce</span>
          <p className="text-xl font-black text-slate-900 mt-1">—</p>
          <span className="text-[10px] text-slate-500">Časové výkazy nejsou připojené</span>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Marže</span>
          <p className="text-xl font-black text-slate-500 mt-1">—</p>
          <span className="text-[10px] text-slate-500">Dopočítá se ze skutečných nákladů</span>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Rezerva</span>
          <p className="text-xl font-black text-slate-500 mt-1">—</p>
          <span className="text-[10px] text-slate-500">Dostupná po napojení rozpočtu</span>
        </div>
      </div>

      {/* Expenses List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-black text-slate-900">Ukázkový přehled nákladů</h2>
            <p className="text-xs text-slate-500 mt-0.5">Fiktivní příklady materiálu, subdodávek a dopravy</p>
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
                      {exp.paid ? 'Vzorově uhrazeno' : 'Vzorově čeká'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={() => handleRemoveExpense(exp.id, exp.docNumber)}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                      title="Odebrat ukázkový doklad"
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
            Přidat do ukázky
          </button>
        </form>
      </div>
    </div>
  );
};
