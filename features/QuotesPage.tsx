import { useOrganization } from '@/context/OrganizationContext';
import React, { useState } from 'react';
import { FileText, Download, Check, Plus, Trash2, Send, Percent, Calculator, Sparkles, History, CreditCard, ThumbsUp, MessageSquare } from 'lucide-react';
import { CompanyBranding, QuoteItem } from '../types';

interface QuotesPageProps {
  branding: CompanyBranding;
}

export const QuotesPage: React.FC<QuotesPageProps> = ({ branding: propBranding }) => {
  const { currentOrg } = useOrganization();
  const branding = currentOrg?.branding || {};
  const activeCompanyName = branding.name || propBranding.name || 'Stavební Společnost';
  const activeCity = branding.city || propBranding.city || 'Praha';

  const [customerName, setCustomerName] = useState('Ing. Jan Svoboda');
  const [customerAddress, setCustomerAddress] = useState('Zahradní 12, ' + activeCity);
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
      setActionNotice('Nabídka byla úspěšně schválena investorem! Digitální smlouva byla vygenerována.');
    } else if (action === 'deposit') {
      setActionNotice('Zálohová platba 50% byla iniciována (110 000 Kč platební kartou/QR kódem).');
    } else if (action === 'changes') {
      setActionNotice('Formulář požadavku na změnu byl odeslán. Revize v3 byla vytvořena.');
    }
    setTimeout(() => setActionNotice(null), 5000);
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-16 text-slate-900 font-sans">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Tvorba stavebních rozpočtů & nabídek</h2>
          <p className="text-xs text-slate-500 mt-0.5">Kalkulační šablony, revize nabídek, generování PDF a digitální akceptace investorem.</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSendEmail}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-white border border-slate-300 text-slate-800 hover:bg-slate-800 shadow-xs flex items-center gap-2 transition-all"
          >
            {emailSent ? <Check className="w-4 h-4 text-green-400" /> : <Send className="w-4 h-4 text-slate-500" />}
            <span>{emailSent ? 'Odesláno e-mailem!' : 'Odeslat investorovi'}</span>
          </button>
          <button
            onClick={handleDownload}
            style={{
              backgroundColor: 'var(--brand-primary)',
              color: '#ffffff',
              boxShadow: '0 4px 14px 0 rgba(0,0,0,0.1)'
            }}
            className="px-4 py-2.5 rounded-xl text-xs font-bold shadow-md flex items-center gap-2 transition-all active:scale-[0.98]"
          >
            {downloaded ? <Check className="w-4 h-4" /> : <Download className="w-4 h-4" />}
            <span>{downloaded ? 'PDF vygenerováno!' : 'Stáhnout PDF nabídku'}</span>
          </button>
        </div>
      </div>

      {/* Action Notice Banner */}
      {actionNotice && (
        <div className="bg-green-950/90 border border-green-800 p-4 rounded-2xl text-green-300 text-xs flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2 font-semibold">
            <Check className="w-4 h-4 text-green-400" />
            <span>{actionNotice}</span>
          </div>
          <button onClick={() => setActionNotice(null)} className="text-green-400 font-bold hover:underline">Zavřít</button>
        </div>
      )}

      {/* Smart Builder & Version Control Toolbar */}
      <div className="bg-white/90 backdrop-blur-md p-6 rounded-[24px] border border-slate-200 shadow-md space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div 
              className="w-7 h-7 rounded-lg flex items-center justify-center border"
              style={{
                backgroundColor: 'var(--brand-primary-soft)',
                borderColor: 'var(--border)',
                color: 'var(--brand-primary)'
              }}
            >
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Kalkulační šablony</h3>
              <p className="text-[11px] text-slate-500">Rychlé načtení položek pro typické stavby:</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => applySmartBuilder('Pergola')}
              style={{
                backgroundColor: 'var(--brand-primary-soft)',
                borderColor: 'var(--border)',
                color: 'var(--brand-primary)'
              }}
              className="px-3.5 py-2 rounded-xl border text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 hover:opacity-90"
            >
              <span>+ Pergola (komplet)</span>
            </button>
            <button
              onClick={() => applySmartBuilder('Carport')}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-800 border border-slate-300 text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
            >
              <span>+ Přístřešek na auta</span>
            </button>
          </div>
        </div>

        <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-slate-500" />
            <span className="text-slate-500 font-semibold">Historie revizí:</span>
            <select
              value={currentVersion}
              onChange={(e) => setCurrentVersion(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1 text-slate-800 font-medium focus:outline-none"
            >
              {versions.map((v, i) => (
                <option key={i} value={v}>{v}</option>
              ))}
            </select>
          </div>
          <span className="text-green-400 font-bold bg-green-950/80 border border-green-800 px-2.5 py-1 rounded-md">Stav: Aktivní & Platná</span>
        </div>
      </div>

      {/* Builder Controls */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-white/90 p-6 rounded-[24px] border border-slate-200 shadow-md">
        <div>
          <label className="text-xs font-semibold text-slate-700">Jméno zákazníka / investora</label>
          <input
            type="text"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-semibold text-slate-800 focus:outline-none"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-700">Sazba DPH (%)</label>
          <select
            value={vatRate}
            onChange={(e) => setVatRate(Number(e.target.value))}
            className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-semibold text-slate-800 focus:outline-none"
          >
            <option value={21}>21% (Základní sazba)</option>
            <option value={15}>15% (Snížená pro bytovou výstavbu)</option>
            <option value={0}>0% (Režim přenesení daňové povinnosti)</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-700">Sleva pro investora (%)</label>
          <input
            type="number"
            value={discountPercent}
            onChange={(e) => setDiscountPercent(Number(e.target.value))}
            className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-semibold text-slate-800 focus:outline-none"
          />
        </div>
      </div>

      {/* PDF Document Preview Box */}
      <div 
        className="bg-white/95 p-10 rounded-[28px] border border-slate-200 shadow-2xl space-y-8 text-slate-800 relative overflow-hidden"
        style={{
          borderTop: `4px solid ${'var(--brand-primary)'}`
        }}
      >
        {/* AI Summary Banner at Top of PDF */}
        <div className="bg-slate-50 border border-slate-200 text-slate-900 p-4 rounded-2xl flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3">
            <div 
              className="w-8 h-8 rounded-lg flex items-center justify-center border"
              style={{
                backgroundColor: 'var(--brand-primary-soft)',
                borderColor: 'var(--border)',
                color: 'var(--brand-primary)'
              }}
            >
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--brand-primary)' }}>
                Shrnutí položkového rozpočtu
              </span>
              <p className="text-xs font-bold text-slate-800">„Kompletní montáž díla vč. materiálu a certifikované instalace.“</p>
            </div>
          </div>
          <span className="text-[10px] font-semibold text-green-400 bg-green-950 px-2 py-1 rounded-md border border-green-800">Ověřený rozsah prací</span>
        </div>

        {/* PDF Header */}
        <div className="flex items-start justify-between border-b border-slate-200 pb-6">
          <div className="flex items-center gap-3.5">
            {branding.logoUrl ? (
              <img src={branding.logoUrl} alt={activeCompanyName} className="w-12 h-12 rounded-2xl object-cover border border-slate-300 bg-white p-1 shadow-md" />
            ) : (
              <div 
                className="w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl shadow-md"
                style={{
                  backgroundColor: 'var(--brand-primary)',
                  color: '#ffffff'
                }}
              >
                {activeCompanyName.substring(0, 2).toUpperCase()}
              </div>
            )}
            <div>
              <h3 className="text-lg font-bold text-slate-900">{activeCompanyName}</h3>
              <p className="text-xs text-slate-500">{branding.address || 'Průmyslová 100'}, {activeCity}</p>
              <p className="text-xs text-slate-500">IČO: 28492011 • DIČ: CZ28492011</p>
            </div>
          </div>

          <div className="text-right">
            <h4 className="text-xl font-black" style={{ color: 'var(--brand-primary)' }}>
              CENOVÁ NABÍDKA / ROZPOČET
            </h4>
            <p className="text-xs text-slate-500 mt-1">Číslo: Q-2026-0492 ({currentVersion})</p>
            <p className="text-xs text-slate-500">Datum vystavení: 10.09.2026</p>
          </div>
        </div>

        {/* Customer & Project info */}
        <div className="grid grid-cols-2 gap-6 text-xs bg-slate-50 p-6 rounded-2xl border border-slate-200">
          <div>
            <span className="font-semibold text-slate-500 uppercase tracking-wider block mb-1">Odběratel (Objednatel):</span>
            <p className="font-bold text-slate-900 text-sm">{customerName}</p>
            <p className="text-slate-500">{customerAddress}</p>
            <p className="text-slate-500">Tel: +420 603 456 789</p>
          </div>
          <div>
            <span className="font-semibold text-slate-500 uppercase tracking-wider block mb-1">Předmět díla:</span>
            <p className="font-bold text-slate-900 text-sm">{quoteTitle}</p>
            <p className="text-slate-500">Lokalita: {activeCity}</p>
            <p className="text-slate-500">Platnost nabídky: 30 dnů</p>
          </div>
        </div>

        {/* Pricing Table with Editable Items */}
        <div className="space-y-4 overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[500px]">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 font-semibold uppercase">
                <th className="pb-3">Položka / Popis stavební práce</th>
                <th className="pb-3 text-center">Množství</th>
                <th className="pb-3 text-right">Cena / MJ</th>
                <th className="pb-3 text-right">Celkem</th>
                <th className="pb-3 text-center w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-700">
              {items.map((item) => (
                <tr key={item.id} className="group">
                  <td className="py-3 font-medium text-slate-800">{item.description}</td>
                  <td className="py-3 text-center text-slate-500">{item.quantity} {item.unit}</td>
                  <td className="py-3 text-right font-mono">{item.unitPrice.toLocaleString()} Kč</td>
                  <td className="py-3 text-right font-bold font-mono" style={{ color: 'var(--brand-primary)' }}>
                    {(item.quantity * item.unitPrice).toLocaleString()} Kč
                  </td>
                  <td className="py-3 text-center">
                    <button onClick={() => removeItem(item.id)} className="text-slate-500 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-all">
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
              placeholder="Zadat novou rozpočtovou položku..."
              className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:outline-none"
            />
            <input
              type="number"
              value={newItemPrice}
              onChange={(e) => setNewItemPrice(Number(e.target.value))}
              placeholder="Cena (Kč)"
              className="w-32 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:outline-none font-mono"
            />
            <button
              type="submit"
              style={{
                backgroundColor: 'var(--brand-primary-soft)',
                borderColor: 'var(--border)',
                color: 'var(--brand-primary)'
              }}
              className="px-4 py-2.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Přidat položku
            </button>
          </form>

          {/* Totals Calculation */}
          <div className="flex justify-end pt-6 border-t border-slate-200">
            <div className="w-80 space-y-2 text-xs">
              <div className="flex justify-between text-slate-500">
                <span>Základ bez DPH:</span>
                <span className="font-mono text-slate-800">{subtotal.toLocaleString()} Kč</span>
              </div>
              {discountPercent > 0 && (
                <div className="flex justify-between text-green-400 font-semibold">
                  <span>Sleva ({discountPercent}%):</span>
                  <span className="font-mono">-{(subtotal * (discountPercent / 100)).toLocaleString()} Kč</span>
                </div>
              )}
              <div className="flex justify-between text-slate-500">
                <span>DPH {vatRate}%:</span>
                <span className="font-mono text-slate-800">{taxAmount.toLocaleString()} Kč</span>
              </div>
              <div className="flex justify-between text-base font-extrabold text-slate-900 pt-2 border-t border-slate-200">
                <span>Celkem k úhradě:</span>
                <span className="font-mono" style={{ color: 'var(--brand-primary)' }}>
                  {grandTotal.toLocaleString()} CZK
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Customer Action Buttons inside PDF / Preview */}
        <div className="bg-slate-50 text-slate-900 p-6 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 mt-6">
          <div>
            <h4 className="text-sm font-bold text-slate-900">Interaktivní akce investora</h4>
            <p className="text-[11px] text-slate-500">Možnosti pro investora v online náhledu nabídky:</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleCustomerAction('accept')}
              className="px-4 py-2.5 rounded-xl bg-green-600 hover:bg-green-500 text-slate-900 text-xs font-bold transition-all shadow-md flex items-center gap-1.5 active:scale-95"
            >
              <ThumbsUp className="w-4 h-4" /> Schválit a podepsat nabídku
            </button>
            <button
              onClick={() => handleCustomerAction('deposit')}
              style={{
                backgroundColor: 'var(--brand-primary)',
                color: '#ffffff',
                boxShadow: '0 4px 14px 0 rgba(0,0,0,0.1)'
              }}
              className="px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5 active:scale-95"
            >
              <CreditCard className="w-4 h-4" /> Zaplatit zálohu 50% (QR / Převod)
            </button>
            <button
              onClick={() => handleCustomerAction('changes')}
              className="px-4 py-2.5 rounded-xl bg-white hover:bg-slate-800 text-slate-700 text-xs font-bold transition-all border border-slate-300 flex items-center gap-1.5"
            >
              <MessageSquare className="w-4 h-4" /> Požádat o úpravu položek
            </button>
          </div>
        </div>

        {/* Terms & Digital Signature with QR Code */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t border-slate-200 text-xs text-slate-500 items-end">
          <div>
            <span className="font-semibold text-slate-700 block mb-1">Platební podmínky a záruka:</span>
            <p>Záloha 50% při podpisu smlouvy o dílo, doplatek 50% po předání díla. Záruka na stavební práce 60 měsíců. Splatnost faktury 14 dní.</p>
          </div>

          <div className="flex flex-col items-center justify-center p-3 bg-slate-50 rounded-2xl border border-slate-200 text-center">
            {/* Simulated QR Code for instant mobile deposit payment & client signing */}
            <div className="w-20 h-20 bg-white rounded-lg p-1.5 flex items-center justify-center text-slate-900 text-[8px] font-mono shadow-xs border border-slate-300">
              <div className="grid grid-cols-4 gap-0.5 w-full h-full p-1 bg-white text-slate-900 rounded">
                <div className="bg-white rounded-xs"></div>
                <div className="bg-white"></div>
                <div className="bg-white rounded-xs"></div>
                <div className="bg-white"></div>
                <div className="bg-white"></div>
                <div className="bg-white rounded-xs"></div>
                <div className="bg-white"></div>
                <div className="bg-white"></div>
                <div className="bg-white"></div>
                <div className="bg-white"></div>
                <div className="bg-white"></div>
                <div className="bg-white"></div>
                <div className="bg-white rounded-xs"></div>
                <div className="bg-white"></div>
                <div className="bg-white rounded-xs"></div>
                <div className="bg-white"></div>
              </div>
            </div>
            <span className="text-[11px] font-bold text-slate-800 mt-1.5">Okamžitá QR platba zálohy</span>
            <span className="text-[9px] font-mono font-semibold" style={{ color: 'var(--brand-primary)' }}>
              {(grandTotal * 0.5).toLocaleString()} CZK • SPAYD
            </span>
          </div>

          <div className="text-right space-y-2">
            <div>
              <p className="font-semibold text-slate-700">Elektronický podpis investora:</p>
              <div 
                onClick={() => handleCustomerAction('accept')}
                className="h-14 border border-dashed border-green-500/70 bg-green-950/40 rounded-xl mt-1 p-2.5 flex items-center justify-between text-[11px] text-green-300 font-mono cursor-pointer hover:bg-green-950/70 transition-all"
              >
                <div className="text-left">
                  <span className="font-bold flex items-center gap-1"><Check className="w-3.5 h-3.5" /> {customerName}</span>
                  <span className="text-[9px] text-green-400">Klikněte pro elektronický podpis</span>
                </div>
                <span className="text-[9px] text-green-400 bg-green-900/80 px-1.5 py-0.5 rounded font-bold border border-green-700">SHA-256</span>
              </div>
              <p className="text-[10px] text-slate-500 mt-1">Zhotovitel: {activeCompanyName} (IČO: 28491022)</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

