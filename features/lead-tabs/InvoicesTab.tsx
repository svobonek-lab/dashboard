import React, { useState } from 'react';
import { 
  DollarSign, 
  Receipt, 
  CheckCircle2, 
  Clock, 
  Download, 
  ArrowUpRight, 
  ShieldCheck, 
  Plus,
  QrCode,
  Building2
} from 'lucide-react';
import { Lead } from '../../types';

interface InvoicesTabProps {
  lead: Lead;
  onNotice: (msg: string) => void;
}

interface InvoiceItem {
  id: string;
  type: 'Zálohová faktura' | 'Konečná daňová faktura' | 'Dobropis';
  number: string;
  variableSymbol: string;
  issueDate: string;
  dueDate: string;
  amount: number;
  vatRate: number;
  status: 'Uhrazeno' | 'Po splatnosti' | 'Připraveno';
  pohodaSynced: boolean;
}

export const InvoicesTab: React.FC<InvoicesTabProps> = ({ lead, onNotice }) => {
  const totalPrice = typeof lead.price === 'number' && lead.price > 0 ? lead.price : null;
  const depositPrice = totalPrice === null ? 0 : Math.round(totalPrice * 0.5);
  const finalPrice = totalPrice === null ? 0 : totalPrice - depositPrice;

  const [invoices, setInvoices] = useState<InvoiceItem[]>(totalPrice === null ? [] : [
    {
      id: 'inv-1',
      type: 'Zálohová faktura',
      number: 'ZF-2026-042',
      variableSymbol: '2026042',
      issueDate: '29. 09. 2026',
      dueDate: '13. 10. 2026',
      amount: depositPrice,
      vatRate: 21,
      status: 'Uhrazeno',
      pohodaSynced: true
    },
    {
      id: 'inv-2',
      type: 'Konečná daňová faktura',
      number: 'VF-2026-088',
      variableSymbol: '2026088',
      issueDate: '19. 10. 2026',
      dueDate: '02. 11. 2026',
      amount: finalPrice,
      vatRate: 21,
      status: 'Připraveno',
      pohodaSynced: false
    }
  ]);

  const [showQR, setShowQR] = useState<string | null>(null);

  const handleExportToPohoda = (inv: InvoiceItem) => {
    // Generate Stormware POHODA XML for this specific invoice with ISO date format (YYYY-MM-DD)
    const todayIso = new Date().toISOString().split('T')[0];
    const dueIso = new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0];

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<dat:dataPack xmlns:dat="http://www.stormware.cz/schema/version_2/data.xsd"
              xmlns:inv="http://www.stormware.cz/schema/version_2/invoice.xsd"
              xmlns:typ="http://www.stormware.cz/schema/version_2/type.xsd"
              id="INV_${inv.variableSymbol}" ico="12345678" application="StavbaFlow CRM" version="2.0">
  <dat:dataPackItem id="${inv.variableSymbol}" version="2.0">
    <inv:invoice version="2.0">
      <inv:invoiceHeader>
        <inv:invoiceType>${inv.type === 'Zálohová faktura' ? 'proformaInvoice' : 'issuedInvoice'}</inv:invoiceType>
        <inv:number><typ:numberRequested>${inv.number}</typ:numberRequested></inv:number>
        <inv:symVar>${inv.variableSymbol}</inv:symVar>
        <inv:date>${todayIso}</inv:date>
        <inv:dateDue>${dueIso}</inv:dateDue>
        <inv:text>Realizace díla: ${lead.title || 'Stavební zakázka'}</inv:text>
        <inv:partnerIdentity>
          <typ:address>
            <typ:name>${lead.customerName || 'Zákazník'}</typ:name>
            <typ:city>${lead.address || lead.city || 'Praha'}</typ:city>
          </typ:address>
        </inv:partnerIdentity>
        <inv:priceHigh>${inv.amount}</inv:priceHigh>
      </inv:invoiceHeader>
    </inv:invoice>
  </dat:dataPackItem>
</dat:dataPack>`;

    const blob = new Blob([xml], { type: 'application/xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `POHODA_${inv.number}.xml`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setInvoices(prev => prev.map(i => i.id === inv.id ? { ...i, pohodaSynced: true } : i));
    onNotice(`Faktura ${inv.number} byla exportována do XML Stormware POHODA (dataPack 2.0).`);
  };

  const handleIssueInvoice = (inv: InvoiceItem) => {
    setInvoices(prev => prev.map(i => i.id === inv.id ? { ...i, status: 'Uhrazeno' } : i));
    onNotice(`Faktura ${inv.number} na ${inv.amount.toLocaleString('cs-CZ')} Kč byla označena jako uhrazená.`);
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Celková hodnota díla</span>
          <p className="text-xl font-black text-slate-900 mt-1">{totalPrice === null ? 'Cena není zadána' : `${totalPrice.toLocaleString('cs-CZ')} Kč`}</p>
          <span className="text-[10px] text-slate-500">{totalPrice === null ? 'Doplňte cenu poptávky před vystavením dokladu' : 'Včetně 21 % DPH'}</span>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Uhrazená záloha</span>
          <p className="text-xl font-black text-emerald-600 mt-1">{depositPrice.toLocaleString('cs-CZ')} Kč</p>
          <span className="text-[10px] text-emerald-600 font-bold">50 % připsáno na bankovní účet</span>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Doplatek po předání</span>
          <p className="text-xl font-black text-[#0A84FF] mt-1">{finalPrice.toLocaleString('cs-CZ')} Kč</p>
          <span className="text-[10px] text-slate-500">Splatnost do 14 dnů od předání</span>
        </div>
      </div>

      {/* Invoices List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-black text-slate-900">Faktury, zálohy a POHODA synchronizace</h2>
            <p className="text-xs text-slate-500 mt-0.5">Přehled vystavených dokladů a napojení na účetnictví</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5" />
              POHODA XML Aktivní
            </span>
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {invoices.map(inv => (
            <div key={inv.id} className="p-5 hover:bg-slate-50/50 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0A84FF] flex items-center justify-center font-black text-xs shrink-0">
                  <Receipt className="w-5 h-5" />
                </div>

                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-xs font-black text-slate-900">{inv.type} {inv.number}</h3>
                    <span className="text-slate-400">·</span>
                    <span className="text-xs font-mono text-slate-600">VS: {inv.variableSymbol}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      inv.status === 'Uhrazeno' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                      'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}>
                      {inv.status}
                    </span>
                    {inv.pohodaSynced && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-[#0A84FF] border border-blue-200 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> POHODA OK
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Vystaveno: {inv.issueDate} · Splatnost: {inv.dueDate} · DPH 21 %
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 text-xs pl-13 md:pl-0">
                <div className="text-right">
                  <span className="text-base font-black text-slate-900 block font-mono">
                    {inv.amount.toLocaleString('cs-CZ')} Kč
                  </span>
                  <span className="text-[10px] text-slate-400">Včetně DPH</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleExportToPohoda(inv)}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition-colors"
                    title="Export do Stormware POHODA XML"
                  >
                    <Download className="w-3.5 h-3.5 text-slate-500" />
                    POHODA XML
                  </button>

                  {inv.status !== 'Uhrazeno' && (
                    <button
                      onClick={() => handleIssueInvoice(inv)}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors"
                    >
                      Označit jako uhrazené
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
