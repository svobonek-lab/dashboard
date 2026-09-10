import React, { useState } from 'react';
import { FileText, Download, Check, Plus, Trash2, Send, Percent, Calculator, Sparkles, History, CreditCard, ThumbsUp, MessageSquare } from 'lucide-react';
import { CompanyBranding, QuoteItem } from '../types';

interface QuotesPageProps {
  branding: CompanyBranding;
}

export const QuotesPage: React.FC<QuotesPageProps> = ({ branding }) => {
  const [customerName, setCustomerName] = useState('Ing. Jan Svoboda');
  const [customerAddress, setCustomerAddress] = useState('Zahradní 12, ' + branding.city);
  const [vatRate, setVatRate] = useState<number>(21);
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [quoteTitle, setQuoteTitle] = useState('Kompletní stavební realizace');
  
  const [items, setItems] = useState<QuoteItem[]>([
    { id: '1', description: 'Dodávka a montáž konstrukce vč. kotvení', quantity: 1, unit: 'kpl', unitPrice: 140000, total: 140000 },
    { id: '2', description: 'Zastřešení a izolační doplňky', quantity: 1, unit: 'kpl', unitPrice: 50000, total: 50000 },
    { id: '3', description: 'Doprava, montáž a stavební příprava', quantity: 1, unit: 'kpl', unitPrice: 30000, total: 30000 },
  ]);

  const [newItemDesc, setNewItemDesc] = useState('');
  const [newItemPrice, setNewItemPrice] = useState(15000);

  const [downloaded, setDownloaded] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [currentVersion, setCurrentVersion] = useState('v2 (Active)');

  const versions = ['v1 (Draft - 220k CZK)', 'v2 (Active - 220k CZK)', 'v3 (Pending client review)'];

  // Smart Builder: Typing or selecting "Pergola" suggests materials, labor, accessories
  const applySmartBuilder = (type: string) => {
    if (type === 'Pergola') {
      setQuoteTitle('Dřevěná Pergola na klíč s LED osvětlením');
      setItems([
        { id: 'p1', description: 'Leštěné dubové trámy a nosná konstrukce', quantity: 1, unit: 'kpl', unitPrice: 95000, total: 95000 },
        { id: 'p2', description: 'Polykarbonátové střešní panely s UV filtrem', quantity: 1, unit: 'kpl', unitPrice: 45000, total: 45000 },
        { id: 'p3', description: 'Integrované LED osvětlení vč. stmívače', quantity: 1, unit: 'kpl', unitPrice: 18000, total: 18000 },
        { id: 'p4', description: 'Odborná montáž, kotvení a dovoz', quantity: 2, unit: 'dny', unitPrice: 16000, total: 32000 }
      ]);
    } else if (type === 'Carport') {
      setQuoteTitle('Ocelový přístřešek pro 2 auta');
      setItems([
        { id: 'c1', description: 'Ocelová žárově zinkovaná konstrukce', quantity: 1, unit: 'kpl', unitPrice: 160000, total: 160000 },
        { id: 'c2', description: 'Trapézový plech s okapovým systémem', quantity: 1, unit: 'kpl', unitPrice: 55000, total: 55000 },
        { id: 'c3', description: 'Montáž a ukotvení do základů', quantity: 2, unit: 'dny', unitPrice: 20000, total: 40000 }
      ]);
    }
  };

  const addItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemDesc.trim()) return;
    const newItem: QuoteItem = {
      id: 'item-' + Date.now(),
      description: newItemDesc,
      quantity: 1,
      unit: 'ks',
      unitPrice: newItemPrice,
      total: newItemPrice
    };
    setItems([...items, newItem]);
    setNewItemDesc('');
  };

  const removeItem = (id: string) => {
    setItems(items.filter(i => i.id !== id));
  };

  const subtotal = items.reduce((acc, curr) => acc + (curr.quantity * curr.unitPrice), 0);
  const discountedSubtotal = subtotal * (1 - discountPercent / 100);
  const taxAmount = discountedSubtotal * (vatRate / 100);
  const grandTotal = discountedSubtotal + taxAmount;

  const handleDownload = () => {
    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 3000);
  };

  const handleSendEmail = () => {
    setEmailSent(true);
    setTimeout(() => setEmailSent(false), 3000);
  };

  const handleCustomerAction = (action: string) => {
    if (action === 'accept') {
      setActionNotice('Offer successfully accepted by customer! Digital contract generated.');
    } else if (action === 'deposit') {
      setActionNotice('50% Deposit payment gateway initiated (110,000 CZK via card/wire).');
    } else if (action === 'changes') {
      setActionNotice('Change request form sent to customer. Revision v3 created.');
    }
    setTimeout(() => setActionNotice(null), 5000);
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-16">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Quick Quote Builder & PDF Generator</h2>
          <p className="text-xs text-slate-500 mt-0.5">Smart Builder suggestions, customer action buttons, AI summary & version history.</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSendEmail}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-xs flex items-center gap-2 transition-all"
          >
            {emailSent ? <Check className="w-4 h-4 text-emerald-600" /> : <Send className="w-4 h-4" />}
            <span>{emailSent ? 'Email Sent!' : 'Send by Email'}</span>
          </button>
          <button
            onClick={handleDownload}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold text-white shadow-md flex items-center gap-2 transition-all hover:opacity-95"
            style={{ backgroundColor: branding.primaryColor }}
          >
            {downloaded ? <Check className="w-4 h-4" /> : <Download className="w-4 h-4" />}
            <span>{downloaded ? 'PDF Generated!' : 'Export PDF'}</span>
          </button>
        </div>
      </div>

      {/* Action Notice Banner */}
      {actionNotice && (
        <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl text-emerald-800 text-xs flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2 font-semibold">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>{actionNotice}</span>
          </div>
          <button onClick={() => setActionNotice(null)} className="text-emerald-700 font-bold">Dismiss</button>
        </div>
      )}

      {/* Smart Builder & Version Control Toolbar */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Smart Builder Assistant</h3>
              <p className="text-[11px] text-slate-500">Instantly populate materials, labor, and accessories:</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => applySmartBuilder('Pergola')}
              className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
            >
              <span>+ Pergola (Complete)</span>
            </button>
            <button
              onClick={() => applySmartBuilder('Carport')}
              className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
            >
              <span>+ Carport Ocel</span>
            </button>
          </div>
        </div>

        <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-slate-400" />
            <span className="text-slate-500 font-semibold">Revision History:</span>
            <select
              value={currentVersion}
              onChange={(e) => setCurrentVersion(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-slate-800 font-medium focus:outline-none"
            >
              {versions.map((v, i) => (
                <option key={i} value={v}>{v}</option>
              ))}
            </select>
          </div>
          <span className="text-emerald-600 font-bold bg-emerald-50 px-2.5 py-1 rounded-md">Status: Active & Valid</span>
        </div>
      </div>

      {/* Builder Controls */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
        <div>
          <label className="text-xs font-semibold text-slate-700">Customer Name</label>
          <input
            type="text"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-semibold text-slate-800"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-700">VAT Rate (%)</label>
          <select
            value={vatRate}
            onChange={(e) => setVatRate(Number(e.target.value))}
            className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-semibold text-slate-800"
          >
            <option value={21}>21% (Standard)</option>
            <option value={15}>15% (Reduced Construction)</option>
            <option value={0}>0% (Exempt)</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-700">Client Discount (%)</label>
          <input
            type="number"
            value={discountPercent}
            onChange={(e) => setDiscountPercent(Number(e.target.value))}
            className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-semibold text-slate-800"
          />
        </div>
      </div>

      {/* PDF Document Preview Box */}
      <div className="bg-white p-10 rounded-3xl border border-slate-200 shadow-2xl space-y-8 text-slate-800 relative overflow-hidden">
        
        {/* AI Summary Banner at Top of PDF */}
        <div className="bg-gradient-to-r from-blue-900 to-slate-900 text-white p-4 rounded-2xl flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-300">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-300">AI Project Summary</span>
              <p className="text-xs font-bold text-white">“2-day installation with LED lighting and integrated oak timber framework.”</p>
            </div>
          </div>
          <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-950 px-2 py-1 rounded-md border border-emerald-800">Verified Scope</span>
        </div>

        {/* PDF Header */}
        <div className="flex items-start justify-between border-b border-slate-200 pb-6">
          <div className="flex items-center gap-3">
            <div 
              className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-md"
              style={{ backgroundColor: branding.primaryColor }}
            >
              {branding.name ? branding.name.substring(0, 2).toUpperCase() : 'NS'}
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">{branding.name}</h3>
              <p className="text-xs text-slate-500">{branding.address}, {branding.city}</p>
              <p className="text-xs text-slate-500">IČO: 28492011 • DIČ: CZ28492011</p>
            </div>
          </div>

          <div className="text-right">
            <h4 className="text-xl font-black text-slate-900">CENOVÁ NABÍDKA</h4>
            <p className="text-xs text-slate-500 mt-1">Číslo: Q-2026-0492 ({currentVersion})</p>
            <p className="text-xs text-slate-500">Datum vydání: 10.09.2026</p>
          </div>
        </div>

        {/* Customer & Project info */}
        <div className="grid grid-cols-2 gap-6 text-xs bg-slate-50 p-6 rounded-2xl border border-slate-200">
          <div>
            <span className="font-semibold text-slate-500 uppercase tracking-wider block mb-1">Odběratel (Zákazník):</span>
            <p className="font-bold text-slate-900 text-sm">{customerName}</p>
            <p className="text-slate-600">{customerAddress}</p>
            <p className="text-slate-600">Tel: +420 603 456 789</p>
          </div>
          <div>
            <span className="font-semibold text-slate-500 uppercase tracking-wider block mb-1">Předmět díla:</span>
            <p className="font-bold text-slate-900 text-sm">{quoteTitle}</p>
            <p className="text-slate-600">Místo: {branding.city}</p>
            <p className="text-slate-600">Platnost nabídky: 30 dnů</p>
          </div>
        </div>

        {/* Pricing Table with Editable Items */}
        <div className="space-y-4">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 font-semibold uppercase">
                <th className="pb-3">Položka / Popis práce</th>
                <th className="pb-3 text-center">Množství</th>
                <th className="pb-3 text-right">Cena / MJ</th>
                <th className="pb-3 text-right">Celkem (CZK)</th>
                <th className="pb-3 text-center w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {items.map((item) => (
                <tr key={item.id} className="group">
                  <td className="py-3 font-medium text-slate-900">{item.description}</td>
                  <td className="py-3 text-center">{item.quantity} {item.unit}</td>
                  <td className="py-3 text-right">{item.unitPrice.toLocaleString()} Kč</td>
                  <td className="py-3 text-right font-bold text-slate-900">{(item.quantity * item.unitPrice).toLocaleString()} Kč</td>
                  <td className="py-3 text-center">
                    <button onClick={() => removeItem(item.id)} className="text-slate-400 hover:text-rose-600 opacity-0 group-hover:opacity-100 transition-all">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Add Item Form */}
          <form onSubmit={addItem} className="flex gap-2 pt-2">
            <input
              type="text"
              value={newItemDesc}
              onChange={(e) => setNewItemDesc(e.target.value)}
              placeholder="Add new quote item description..."
              className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
            <input
              type="number"
              value={newItemPrice}
              onChange={(e) => setNewItemPrice(Number(e.target.value))}
              placeholder="Price (CZK)"
              className="w-32 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
            <button
              type="submit"
              className="px-4 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-all flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Add Item
            </button>
          </form>

          {/* Totals Calculation */}
          <div className="flex justify-end pt-6 border-t border-slate-200">
            <div className="w-80 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Mezisoučet:</span>
                <span>{subtotal.toLocaleString()} Kč</span>
              </div>
              {discountPercent > 0 && (
                <div className="flex justify-between text-emerald-600 font-semibold">
                  <span>Sleva ({discountPercent}%):</span>
                  <span>-{(subtotal * (discountPercent / 100)).toLocaleString()} Kč</span>
                </div>
              )}
              <div className="flex justify-between text-slate-600">
                <span>DPH {vatRate}%:</span>
                <span>{taxAmount.toLocaleString()} Kč</span>
              </div>
              <div className="flex justify-between text-base font-extrabold text-slate-900 pt-2 border-t border-slate-200">
                <span>Celkem k úhradě:</span>
                <span style={{ color: branding.primaryColor }}>{grandTotal.toLocaleString()} CZK</span>
              </div>
            </div>
          </div>
        </div>

        {/* Customer Action Buttons inside PDF / Preview */}
        <div className="bg-slate-900 text-white p-6 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 mt-6">
          <div>
            <h4 className="text-sm font-bold text-white">Client Interactive Actions</h4>
            <p className="text-[11px] text-slate-400">Customer can interact directly with this quotation offer:</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleCustomerAction('accept')}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md flex items-center gap-1.5"
            >
              <ThumbsUp className="w-4 h-4" /> Accept Offer
            </button>
            <button
              onClick={() => handleCustomerAction('deposit')}
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-md flex items-center gap-1.5"
            >
              <CreditCard className="w-4 h-4" /> Pay Deposit (50%)
            </button>
            <button
              onClick={() => handleCustomerAction('changes')}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-all border border-slate-700 flex items-center gap-1.5"
            >
              <MessageSquare className="w-4 h-4" /> Request Changes
            </button>
          </div>
        </div>

        {/* Terms & Digital Signature with QR Code */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t border-slate-200 text-xs text-slate-500 items-end">
          <div>
            <span className="font-semibold text-slate-700 block mb-1">Platební podmínky a záruka:</span>
            <p>Záloha 50% při podpisu smlouvy, doplatek 50% po předání díla. Záruka na stavební práce 60 měsíců.</p>
          </div>

          <div className="flex flex-col items-center justify-center p-3 bg-slate-50 rounded-2xl border border-slate-200 text-center">
            {/* Simulated QR Code for instant mobile deposit payment & client signing */}
            <div className="w-16 h-16 bg-slate-900 rounded-lg p-1 flex items-center justify-center text-white text-[8px] font-mono shadow-xs">
              <div className="grid grid-cols-4 gap-0.5 w-full h-full p-0.5 bg-white text-slate-900 rounded">
                <div className="bg-slate-900 rounded-xs"></div>
                <div className="bg-white"></div>
                <div className="bg-slate-900 rounded-xs"></div>
                <div className="bg-slate-900"></div>
                <div className="bg-white"></div>
                <div className="bg-slate-900 rounded-xs"></div>
                <div className="bg-white"></div>
                <div className="bg-slate-900"></div>
                <div className="bg-slate-900"></div>
                <div className="bg-white"></div>
                <div className="bg-slate-900"></div>
                <div className="bg-white"></div>
                <div className="bg-slate-900 rounded-xs"></div>
                <div className="bg-white"></div>
                <div className="bg-slate-900 rounded-xs"></div>
                <div className="bg-slate-900"></div>
              </div>
            </div>
            <span className="text-[10px] font-bold text-slate-700 mt-1.5">Naskenovat pro QR platbu</span>
            <span className="text-[9px] text-slate-400">QR Platba / SPAYD Standard</span>
          </div>

          <div className="text-right space-y-2">
            <div>
              <p className="font-semibold text-slate-700">Digitální podpis & razítko:</p>
              <div className="h-12 border border-slate-200 bg-slate-50/80 rounded-xl mt-1 p-2 flex items-center justify-between text-[11px] text-emerald-700 font-mono">
                <span className="font-semibold">✓ Podepsáno online</span>
                <span className="text-[9px] text-slate-400">SHA256: 8f9b...a102</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Vystavil: Jan Novák ({branding.name})</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
