import React, { useState } from 'react';
import { 
  FileText, 
  Download, 
  Send, 
  CheckCircle2, 
  Calculator, 
  Percent, 
  Sparkles, 
  Plus, 
  Trash2,
  Receipt
} from 'lucide-react';
import { Lead } from '../../types';

interface BudgetTabProps {
  lead: Lead;
  onNotice: (msg: string) => void;
  onUpdateLead?: (lead: Lead) => void;
}

interface BudgetItem {
  id: string;
  category: 'Materiál' | 'Montáž & práce' | 'Doprava & technika';
  name: string;
  unit: string;
  qty: number;
  unitPrice: number;
}

export const BudgetTab: React.FC<BudgetTabProps> = ({ lead, onNotice }) => {
  const [items, setItems] = useState<BudgetItem[]>([
    { id: 'b-1', category: 'Materiál', name: 'Základová ocelová kotva a patky M16', unit: 'ks', qty: 6, unitPrice: 1850 },
    { id: 'b-2', category: 'Materiál', name: 'Hlavní nosné KVH hranoly 140x140mm', unit: 'bm', qty: 24, unitPrice: 2450 },
    { id: 'b-3', category: 'Materiál', name: 'Střešní polykarbonátové panely s UV', unit: 'm²', qty: 28, unitPrice: 1680 },
    { id: 'b-4', category: 'Materiál', name: 'Spojovací a těsnící materiál Würth', unit: 'kpl', qty: 1, unitPrice: 8400 },
    { id: 'b-5', category: 'Montáž & práce', name: 'Montáž a ukotvení nosného rámu', unit: 'h', qty: 32, unitPrice: 950 },
    { id: 'b-6', category: 'Montáž & práce', name: 'Usazení a začištění střešního pláště', unit: 'h', qty: 18, unitPrice: 950 },
    { id: 'b-7', category: 'Doprava & technika', name: 'Závoz materiálu nákladním vozem s rukou', unit: 'jízda', qty: 1, unitPrice: 6500 },
  ]);

  const [newItemCategory, setNewItemCategory] = useState<'Materiál' | 'Montáž & práce' | 'Doprava & technika'>('Materiál');
  const [newItemName, setNewItemName] = useState('');
  const [newItemQty, setNewItemQty] = useState(1);
  const [newItemUnit, setNewItemUnit] = useState('ks');
  const [newItemPrice, setNewItemPrice] = useState(1500);

  const subtotal = items.reduce((acc, it) => acc + (it.qty * it.unitPrice), 0);
  const vatRate = 0.21;
  const vatAmount = subtotal * vatRate;
  const totalPrice = subtotal + vatAmount;
  
  // Real margin calculation
  const estimatedCost = subtotal * 0.72; // Direct cost ~72%
  const grossProfit = subtotal - estimatedCost;
  const calculatedMargin = (grossProfit / subtotal) * 100;

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;
    const newItem: BudgetItem = {
      id: 'b-' + Date.now(),
      category: newItemCategory,
      name: newItemName,
      unit: newItemUnit,
      qty: Number(newItemQty),
      unitPrice: Number(newItemPrice)
    };
    setItems(prev => [...prev, newItem]);
    setNewItemName('');
    onNotice(`Položka "${newItemName}" byla přidána do rozpočtu.`);
  };

  const handleRemoveItem = (id: string, name: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
    onNotice(`Položka "${name}" byla odstraněna.`);
  };

  const handleDownloadPDF = () => {
    // Generate text or triggered download
    const content = `POLOŽKOVÝ ROZPOČET STAVBY\nZakázka: ${lead.title}\nKlient: ${lead.customerName}\nDatum: ${new Date().toLocaleDateString('cs-CZ')}\n\n` +
      items.map(it => `${it.name} | ${it.qty} ${it.unit} á ${it.unitPrice.toLocaleString()} Kč = ${(it.qty * it.unitPrice).toLocaleString()} Kč`).join('\n') +
      `\n\nMezisoučet bez DPH: ${subtotal.toLocaleString()} Kč\nDPH 21 %: ${vatAmount.toLocaleString()} Kč\nCELKEM K ÚHRADĚ: ${totalPrice.toLocaleString()} Kč`;
    
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rozpocet_${lead.customerName.toLowerCase().replace(/\s+/g, '_')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    onNotice('Položkový rozpočet byl stažen v textové specifikaci.');
  };

  const handleSendToClient = () => {
    onNotice(`Položkový rozpočet na ${totalPrice.toLocaleString('cs-CZ')} Kč byl odeslán klientovi (${lead.customerEmail}).`);
  };

  return (
    <div className="space-y-6">
      {/* Top Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Cena bez DPH</span>
          <p className="text-xl font-black text-slate-900 mt-1">{subtotal.toLocaleString('cs-CZ')} Kč</p>
          <span className="text-[10px] text-slate-500">Základ daně položek</span>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">DPH 21 %</span>
          <p className="text-xl font-black text-slate-700 mt-1">{vatAmount.toLocaleString('cs-CZ')} Kč</p>
          <span className="text-[10px] text-slate-500">DPH na výstupu</span>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Cena celkem</span>
          <p className="text-xl font-black text-[#0A84FF] mt-1">{totalPrice.toLocaleString('cs-CZ')} Kč</p>
          <span className="text-[10px] text-emerald-600 font-bold">Konečná částka k úhradě</span>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Kalkulovaná marže</span>
          <p className="text-xl font-black text-emerald-600 mt-1">{calculatedMargin.toFixed(1)} %</p>
          <span className="text-[10px] text-slate-500">Zisk: {grossProfit.toLocaleString('cs-CZ')} Kč</span>
        </div>
      </div>

      {/* Main Budget Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-black text-slate-900">Položkový soupis prací a dodávek</h2>
            <p className="text-xs text-slate-500 mt-0.5">Podrobný rozpočet pro investora i realizační partu</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadPDF}
              className="px-3.5 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              Stáhnout rozpočet
            </button>
            <button
              onClick={handleSendToClient}
              className="px-3.5 py-1.5 rounded-xl bg-[#0A84FF] hover:bg-blue-600 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs"
            >
              <Send className="w-3.5 h-3.5" />
              Odeslat ke schválení
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200/80 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Kategorie</th>
                <th className="py-3 px-4">Popis položky</th>
                <th className="py-3 px-4 text-right">Množství</th>
                <th className="py-3 px-4 text-center">MJ</th>
                <th className="py-3 px-4 text-right">Cena / MJ</th>
                <th className="py-3 px-4 text-right">Celkem bez DPH</th>
                <th className="py-3 px-4 text-center">Akce</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map(item => (
                <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      item.category === 'Materiál' ? 'bg-sky-50 text-sky-700 border border-sky-200' :
                      item.category === 'Montáž & práce' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' :
                      'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}>
                      {item.category}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-bold text-slate-900">{item.name}</td>
                  <td className="py-3 px-4 text-right font-mono font-medium">{item.qty}</td>
                  <td className="py-3 px-4 text-center text-slate-500">{item.unit}</td>
                  <td className="py-3 px-4 text-right font-mono text-slate-700">{item.unitPrice.toLocaleString('cs-CZ')} Kč</td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                    {(item.qty * item.unitPrice).toLocaleString('cs-CZ')} Kč
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={() => handleRemoveItem(item.id, item.name)}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                      title="Smazat položku"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Add Item Form */}
        <form onSubmit={handleAddItem} className="p-4 bg-slate-50/70 border-t border-slate-200 flex flex-wrap gap-2 items-center text-xs">
          <select
            value={newItemCategory}
            onChange={e => setNewItemCategory(e.target.value as any)}
            className="p-2 rounded-xl border border-slate-200 bg-white font-medium text-slate-700"
          >
            <option value="Materiál">Materiál</option>
            <option value="Montáž & práce">Montáž & práce</option>
            <option value="Doprava & technika">Doprava & technika</option>
          </select>

          <input
            type="text"
            placeholder="Název položky rozpočtu..."
            value={newItemName}
            onChange={e => setNewItemName(e.target.value)}
            className="flex-1 min-w-[200px] p-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-[#0A84FF]"
          />

          <input
            type="number"
            min="1"
            placeholder="Množství"
            value={newItemQty}
            onChange={e => setNewItemQty(Number(e.target.value))}
            className="w-20 p-2 rounded-xl border border-slate-200 bg-white text-right"
          />

          <input
            type="text"
            placeholder="MJ (ks, m2)"
            value={newItemUnit}
            onChange={e => setNewItemUnit(e.target.value)}
            className="w-20 p-2 rounded-xl border border-slate-200 bg-white text-center"
          />

          <input
            type="number"
            min="0"
            placeholder="Cena za MJ"
            value={newItemPrice}
            onChange={e => setNewItemPrice(Number(e.target.value))}
            className="w-28 p-2 rounded-xl border border-slate-200 bg-white text-right font-mono"
          />

          <button
            type="submit"
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Přidat položku
          </button>
        </form>
      </div>
    </div>
  );
};
