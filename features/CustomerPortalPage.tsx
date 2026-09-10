import React, { useState } from 'react';
import { Sparkles, CheckCircle2, Clock, FileText, Download, Calendar, MapPin, Phone, MessageSquare, ShieldCheck, Check, Send } from 'lucide-react';
import { CompanyBranding, Lead } from '../types';

interface CustomerPortalPageProps {
  branding: CompanyBranding;
  lead: Lead;
  onBackToCRM: () => void;
}

export const CustomerPortalPage: React.FC<CustomerPortalPageProps> = ({
  branding,
  lead,
  onBackToCRM
}) => {
  const [activeTab, setActiveTab] = useState<'timeline' | 'documents' | 'chat'>('timeline');
  const [chatMessage, setChatMessage] = useState('');
  const [messages, setMessages] = useState(lead.aiChat || [
    { id: '1', sender: 'ai', text: `Dobrý den, pane ${lead.customerName.split(' ').pop()}. Váš projekt "${lead.title}" je aktivně naplánován a materiály jsou připraveny na skladě.`, timestamp: 'Dnes 09:30' },
    { id: '2', sender: 'user', text: `Děkuji za zprávu. Kdy přesně přijdou řemeslníci?`, timestamp: 'Dnes 09:42' },
    { id: '3', sender: 'ai', text: `Technik Petr Novotný dorazí zítra v 08:00 ráno.`, timestamp: 'Dnes 09:43' }
  ]);

  const [approvedQuote, setApprovedQuote] = useState(false);
  const [paidDeposit, setPaidDeposit] = useState(false);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessage.trim()) return;
    const newMsg = {
      id: 'msg-' + Date.now(),
      sender: 'user' as const,
      text: chatMessage,
      timestamp: 'Právě teď'
    };
    setMessages([...messages, newMsg]);
    setChatMessage('');

    setTimeout(() => {
      setMessages(prev => [...prev, {
        id: 'msg-ai-' + Date.now(),
        sender: 'ai',
        text: `Děkuji za Váš dotaz. Předal jsem informaci vedoucímu projektu Petru Novotnému. Ozveme se Vám do 15 minut.`,
        timestamp: 'Právě teď'
      }]);
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20">
      {/* Top Banner */}
      <div className="bg-slate-900 text-white border-b border-slate-800 py-6 px-6">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div 
              className="w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg shadow-lg text-white"
              style={{ backgroundColor: branding.primaryColor }}
            >
              {branding.name ? branding.name.substring(0, 2).toUpperCase() : 'NS'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Secure Client Portal
                </span>
                <span className="text-xs text-slate-400">• ID: #{lead.id}</span>
              </div>
              <h1 className="text-xl font-black text-white mt-1">{lead.title}</h1>
              <p className="text-xs text-slate-400">{branding.name} • {lead.customerName}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onBackToCRM}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
            >
              Zpět do Administrace
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* Status Overview Card */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Aktuální stav</span>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-bold text-slate-900 text-sm">{lead.status}</span>
            </div>
            <p className="text-[11px] text-slate-500">Předpokládané dokončení za 3 dny</p>
          </div>

          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Přiřazený mistr</span>
            <p className="font-bold text-slate-900 text-sm">{lead.assignedEmployeeName}</p>
            <p className="text-[11px] text-slate-500">Tel: +420 777 999 111</p>
          </div>

          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Celková cena díla</span>
            <p className="font-extrabold text-slate-900 text-base">{lead.price.toLocaleString()} CZK</p>
            <p className="text-[11px] text-emerald-600 font-medium">Vč. DPH a záruky 5 let</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 gap-8">
          <button
            onClick={() => setActiveTab('timeline')}
            className={`pb-3 text-xs font-bold tracking-wider uppercase border-b-2 transition-all ${
              activeTab === 'timeline' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            Průběh a Fotogalerie
          </button>
          <button
            onClick={() => setActiveTab('documents')}
            className={`pb-3 text-xs font-bold tracking-wider uppercase border-b-2 transition-all ${
              activeTab === 'documents' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            Rozpočty a Faktury ({lead.files?.length || 3})
          </button>
          <button
            onClick={() => setActiveTab('chat')}
            className={`pb-3 text-xs font-bold tracking-wider uppercase border-b-2 transition-all ${
              activeTab === 'chat' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            AI Asistent & Zprávy
          </button>
        </div>

        {/* Tab 1: Timeline & Photos */}
        {activeTab === 'timeline' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">WhatsApp-styl harmonogram realizace</h3>

              <div className="space-y-6 relative before:absolute before:left-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                {(lead.timeline || [
                  { id: '1', title: 'Poptávka přijata a AI analýza hotova', status: 'Completed', timestamp: 'Dnes 09:00', responsibleEmployee: 'AI System' },
                  { id: '2', title: 'Přiřazen specialista Petr Novotný', status: 'Completed', timestamp: 'Dnes 09:15', responsibleEmployee: 'Jan Svoboda (Owner)' },
                  { id: '3', title: 'Materiály naskladněny a připraveny', status: 'Current', timestamp: 'Zítra 08:00', responsibleEmployee: 'Sklad & Logistika' },
                  { id: '4', title: 'Instalace na místě realizace', status: 'Pending', timestamp: 'Za 2 dny', responsibleEmployee: 'Petr Novotný' },
                  { id: '5', title: 'Předání díla a garanční list', status: 'Pending', timestamp: 'Za 4 dny', responsibleEmployee: 'Petr Novotný' }
                ]).map((step, idx) => (
                  <div key={step.id || idx} className="flex items-start gap-4 relative">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 z-10 font-bold text-xs ${
                      step.status === 'Completed' ? 'bg-emerald-500 text-white shadow-md' :
                      step.status === 'Current' ? 'bg-blue-600 text-white ring-4 ring-blue-100' : 'bg-slate-200 text-slate-500'
                    }`}>
                      {step.status === 'Completed' ? '✓' : idx + 1}
                    </div>
                    <div className="flex-1 bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                      <div className="flex justify-between items-start">
                        <h4 className="font-bold text-slate-900 text-sm">{step.title}</h4>
                        <span className="text-[11px] text-slate-400">{step.timestamp}</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">Odpovědná osoba: <span className="font-semibold text-slate-700">{step.responsibleEmployee}</span></p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Photos & Before/After */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Fotodokumentace realizace</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {(lead.photos || [
                  { id: 'p1', name: 'Před zahájením prací', url: lead.thumbnail || 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&q=80&w=800', category: 'Before' }
                ]).map((photo: any, idx: number) => (
                  <div key={idx} className="group relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 aspect-video">
                    <img src={photo.url} alt={photo.name || 'Foto'} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3 text-white">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-blue-600">{photo.category || 'Průběh'}</span>
                      <p className="text-xs font-semibold mt-1 truncate">{photo.name || 'Dokumentace'}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Documents & Quotes */}
        {activeTab === 'documents' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Cenové nabídky & Smlouvy</h3>
                  <p className="text-xs text-slate-500">Schvalte nabídku nebo uhraďte zálohu online.</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setApprovedQuote(true)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm ${
                      approvedQuote ? 'bg-emerald-600 text-white' : 'bg-blue-600 hover:bg-blue-500 text-white'
                    }`}
                  >
                    {approvedQuote ? '✓ Nabídka schválena' : 'Schválit nabídku'}
                  </button>
                </div>
              </div>

              <div className="border border-slate-200 rounded-2xl p-5 space-y-4 bg-slate-50/50">
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">Rozpočet č. Q-2026-8841</h4>
                    <p className="text-xs text-slate-500">Vystaveno {branding.name} • Platnost do 30.4.2026</p>
                  </div>
                  <span className="text-base font-black text-slate-900">{lead.price.toLocaleString()} CZK</span>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                  <div className="flex items-center gap-2 text-xs text-slate-600">
                    <FileText className="w-4 h-4 text-blue-600" />
                    <span>Kompletní PDF rozpis materiálů a prací</span>
                  </div>
                  <button 
                    onClick={() => alert('Stahuji PDF rozpočet...')}
                    className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100 flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" /> Stáhnout PDF
                  </button>
                </div>
              </div>

              {/* Deposit Payment Banner */}
              <div className="bg-gradient-to-r from-blue-900 to-indigo-950 p-6 rounded-2xl text-white space-y-4 shadow-lg">
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="font-bold text-white text-sm">Zálohová faktura (50% díla)</h4>
                    <p className="text-xs text-blue-200 mt-0.5">Uhrazením zálohy ve výši {(lead.price * 0.5).toLocaleString()} CZK závazně potvrdíte termín zahájení.</p>
                  </div>
                  <button
                    onClick={() => setPaidDeposit(true)}
                    className={`px-5 py-2.5 rounded-xl text-xs font-bold shadow-md transition-all ${
                      paidDeposit ? 'bg-emerald-500 text-white' : 'bg-white text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    {paidDeposit ? '✓ Záloha uhrazena' : 'Uhradit zálohu kartou'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Chat */}
        {activeTab === 'chat' && (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[500px]">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-bold text-slate-900 text-xs">AI Asistent & Vedoucí projektu online</span>
              </div>
              <span className="text-[11px] text-slate-500">Odpovídáme obvykle do 5 minut</span>
            </div>

            <div className="flex-1 p-6 overflow-y-auto space-y-4">
              {messages.map((m: any) => (
                <div key={m.id} className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-md p-4 rounded-2xl text-xs space-y-1 ${
                    m.sender === 'user' 
                      ? 'bg-blue-600 text-white rounded-br-xs' 
                      : 'bg-slate-100 text-slate-800 rounded-bl-xs border border-slate-200'
                  }`}>
                    <p>{m.text}</p>
                    <span className={`block text-[10px] ${m.sender === 'user' ? 'text-blue-200' : 'text-slate-400'} text-right`}>{m.timestamp}</span>
                  </div>
                </div>
              ))}
            </div>

            <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-200 bg-white flex gap-3">
              <input
                type="text"
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                placeholder="Napište zprávu mistrovi nebo AI asistentovi..."
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                className="px-5 py-3 rounded-xl text-xs font-bold text-white shadow-md flex items-center gap-1.5 hover:opacity-95"
                style={{ backgroundColor: branding.primaryColor }}
              >
                <span>Odeslat</span> <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
