import { useOrganization } from '@/context/OrganizationContext';
import React, { useState } from 'react';
import { Sparkles, CheckCircle2, Clock, FileText, Download, Calendar, MapPin, Phone, MessageSquare, ShieldCheck, Check, Send, ArrowLeft } from 'lucide-react';
import { CompanyBranding, Lead } from '../types';

interface CustomerPortalPageProps {
  branding: CompanyBranding;
  lead: Lead;
  onBackToCRM: () => void;
}

export const CustomerPortalPage: React.FC<CustomerPortalPageProps> = ({
  branding: propBranding,
  lead: propLead,
  onBackToCRM
}) => {
  const { currentOrg } = useOrganization();
  const [activeTab, setActiveTab] = useState<'timeline' | 'documents' | 'chat'>('timeline');
  const [chatMessage, setChatMessage] = useState('');
  
  const activeCompanyName = currentOrg?.name || propBranding.name || 'Stavební Společnost';
  const activeLogo = currentOrg?.logo_url !== undefined ? currentOrg.logo_url : (propBranding.logoUrl || '');

  const safeLead: Lead = propLead || {
    id: 'lead-preview-demo',
    title: 'Realizace stavebního projektu',
    description: 'Kompletní realizace stavebního projektu na klíč.',
    city: currentOrg?.city || 'Praha',
    customerName: 'Vážený zákazník',
    customerPhone: '+420 777 123 456',
    customerEmail: 'klient@email.cz',
    address: currentOrg?.city || 'Praha',
    preferredDate: new Date().toISOString().substring(0, 10),
    price: 185000,
    status: 'In Progress',
    priority: 'Medium',
    assignedEmployeeId: 'emp-1',
    assignedEmployeeName: 'Technik realizací',
    thumbnail: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=400&q=80',
    photos: [],
    files: [],
    createdDate: new Date().toLocaleDateString('cs-CZ'),
    urgency: 'Medium',
    aiSummary: {
      jobType: 'Stavba',
      complexity: 'Medium',
      estimatedRange: '185 000 Kč',
      assignedEmployee: 'Petr Novotný',
      risks: [],
      recommendedNextStep: 'Zahájit montáž',
      sentiment: 'Positive',
      riskScore: 5,
      suggestedPrice: 185000,
      materials: ['Základové patky', 'Dřevěné trámy KVH'],
      estimatedDays: 4
    },
    aiChat: [],
    timeline: [
      { id: 't-1', title: 'Podpis smlouvy a zahájení zakázky', date: 'Včera', completed: true, description: 'Smlouva o dílo byla oboustranně potvrzena.' },
      { id: 't-2', title: 'Příprava materiálu a montáž', date: 'Dnes', completed: true, description: 'Materiál byl dovezen na staveniště.' },
      { id: 't-3', title: 'Předání a kolaudace', date: 'Příští týden', completed: false, description: 'Finální kontrola kvality se zákazníkem.' }
    ],
    checklist: [],
    history: []
  };
  const lead = safeLead;

  const [messages, setMessages] = useState(lead.aiChat || [
    { id: '1', sender: 'ai', text: `Dobrý den, pane ${lead.customerName.split(' ').pop()}. Váš projekt "${lead.title}" je aktivně naplánován a materiály jsou připraveny na skladě společnosti ${activeCompanyName}.`, timestamp: 'Dnes 09:30' },
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
        text: `Děkuji za Váš dotaz. Předal jsem informaci vedoucímu projektu ve firmě ${activeCompanyName}. Ozveme se Vám do 15 minut.`,
        timestamp: 'Právě teď'
      }]);
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20 font-sans">
      {/* Top Banner */}
      <div 
        className="text-slate-900 border-b border-slate-200 py-6 px-6 relative overflow-hidden"
        style={{
          background: `linear-gradient(135deg, #FFFFFF 0%, #F8FAFC 100%)`
        }}
      >
        <div 
          className="absolute -top-12 -right-12 w-64 h-64 rounded-full blur-3xl opacity-25 pointer-events-none"
          style={{ backgroundColor: 'var(--brand-primary)' }}
        ></div>

        <div className="max-w-4xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3.5">
            {activeLogo ? (
              <img 
                src={activeLogo} 
                alt={activeCompanyName} 
                className="w-12 h-12 rounded-2xl object-cover border border-slate-300 shadow-md bg-white p-1" 
              />
            ) : (
              <div 
                className="w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg shadow-lg"
                style={{
                  backgroundColor: 'var(--brand-primary)',
                  color: '#ffffff'
                }}
              >
                {activeCompanyName.substring(0, 2).toUpperCase()}
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <span 
                  className="text-[10px] uppercase font-extrabold tracking-wider px-2.5 py-0.5 rounded-full border"
                  style={{
                    backgroundColor: 'var(--brand-primary-soft)',
                    color: 'var(--brand-primary)',
                    borderColor: 'var(--border)'
                  }}
                >
                  Klientský portál zakázky
                </span>
                <span className="text-xs text-slate-500 font-mono">• ID: #{lead.id}</span>
              </div>
              <h1 className="text-xl font-black text-slate-900 mt-1">{lead.title}</h1>
              <p className="text-xs text-slate-500">{activeCompanyName} • Investor: <span className="text-slate-800 font-semibold">{lead.customerName}</span></p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onBackToCRM}
              className="px-4 py-2.5 rounded-xl text-xs font-bold bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 flex items-center gap-1.5 transition-all shadow-sm"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Zpět do Administrace</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Status Overview Card */}
        <div 
          className="bg-white/90 backdrop-blur-md p-6 rounded-[24px] border border-slate-200 shadow-xl grid grid-cols-1 sm:grid-cols-3 gap-6"
          style={{
            borderTop: `4px solid ${'var(--brand-primary)'}`
          }}
        >
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Aktuální stav</span>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full animate-pulse" style={{ backgroundColor: 'var(--brand-primary)' }} />
              <span className="font-extrabold text-slate-900 text-sm">{lead.status}</span>
            </div>
            <p className="text-[11px] text-slate-500">Předpokládané dokončení za 3 dny</p>
          </div>

          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Přiřazený mistr</span>
            <p className="font-bold text-slate-900 text-sm">{lead.assignedEmployeeName}</p>
            <p className="text-[11px] text-slate-500">Tel: +420 777 999 111</p>
          </div>

          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Celková cena díla</span>
            <p className="font-black text-lg font-mono" style={{ color: 'var(--brand-primary)' }}>
              {lead.price.toLocaleString()} Kč
            </p>
            <p className="text-[11px] text-green-600 font-medium">Vč. DPH a záruky 5 let</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 gap-8">
          <button
            onClick={() => setActiveTab('timeline')}
            style={activeTab === 'timeline' ? { borderColor: 'var(--brand-primary)', color: 'var(--brand-primary)' } : undefined}
            className={`pb-3 text-xs font-bold tracking-wider uppercase border-b-2 transition-all ${
              activeTab === 'timeline' ? '' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Průběh a Fotogalerie
          </button>
          <button
            onClick={() => setActiveTab('documents')}
            style={activeTab === 'documents' ? { borderColor: 'var(--brand-primary)', color: 'var(--brand-primary)' } : undefined}
            className={`pb-3 text-xs font-bold tracking-wider uppercase border-b-2 transition-all ${
              activeTab === 'documents' ? '' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Rozpočty a Faktury ({lead.files?.length || 3})
          </button>
          <button
            onClick={() => setActiveTab('chat')}
            style={activeTab === 'chat' ? { borderColor: 'var(--brand-primary)', color: 'var(--brand-primary)' } : undefined}
            className={`pb-3 text-xs font-bold tracking-wider uppercase border-b-2 transition-all ${
              activeTab === 'chat' ? '' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            AI Asistent & Zprávy
          </button>
        </div>

        {/* Tab 1: Timeline & Photos */}
        {activeTab === 'timeline' && (
          <div className="space-y-6">
            <div className="bg-white/90 p-6 rounded-[24px] border border-slate-200 shadow-md space-y-6">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Průběžný harmonogram a milníky stavby</h3>

              <div className="space-y-6 relative before:absolute before:left-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
                {(lead.timeline || [
                  { id: '1', title: 'Poptávka přijata a AI analýza hotova', status: 'Completed', timestamp: 'Dnes 09:00', responsibleEmployee: 'AI System' },
                  { id: '2', title: 'Přiřazen specialista Petr Novotný', status: 'Completed', timestamp: 'Dnes 09:15', responsibleEmployee: 'Jan Svoboda (Majitel)' },
                  { id: '3', title: 'Materiály naskladněny a připraveny', status: 'Current', timestamp: 'Zítra 08:00', responsibleEmployee: 'Sklad & Logistika' },
                  { id: '4', title: 'Instalace na místě realizace', status: 'Pending', timestamp: 'Za 2 dny', responsibleEmployee: 'Petr Novotný' },
                  { id: '5', title: 'Předání díla a garanční list', status: 'Pending', timestamp: 'Za 4 dny', responsibleEmployee: 'Petr Novotný' }
                ]).map((step, idx) => (
                  <div key={step.id || idx} className="flex items-start gap-4 relative">
                    <div 
                      className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 z-10 font-bold text-xs ${
                        step.status === 'Completed' ? 'bg-green-600 text-slate-900 shadow-md' :
                        step.status === 'Current' ? 'text-slate-900 shadow-lg' : 'bg-slate-800 text-slate-500'
                      }`}
                      style={step.status === 'Current' ? { backgroundColor: 'var(--brand-primary)', color: '#ffffff' } : undefined}
                    >
                      {step.status === 'Completed' ? '✓' : idx + 1}
                    </div>
                    <div className="flex-1 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                      <div className="flex justify-between items-start">
                        <h4 className="font-bold text-slate-900 text-sm">{step.title}</h4>
                        <span className="text-[11px] text-slate-500">{step.timestamp}</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">Odpovědná osoba: <span className="font-semibold text-slate-800">{step.responsibleEmployee}</span></p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Photos & Before/After */}
            <div className="bg-white/90 p-6 rounded-[24px] border border-slate-200 shadow-md space-y-4">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Fotodokumentace realizace</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {(lead.photos || [
                  { id: 'p1', name: 'Před zahájením prací', url: lead.thumbnail || 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&q=80&w=800', category: 'Před stavbou' }
                ]).map((photo: any, idx: number) => (
                  <div key={idx} className="group relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 aspect-video">
                    <img src={photo.url} alt={photo.name || 'Foto'} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/90 to-transparent p-3 text-slate-900">
                      <span 
                        className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md"
                        style={{
                          backgroundColor: 'var(--brand-primary)',
                          color: '#ffffff'
                        }}
                      >
                        {photo.category || 'Průběh'}
                      </span>
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
            <div className="bg-white/90 p-6 rounded-[24px] border border-slate-200 shadow-md space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Cenové nabídky & Smlouvy</h3>
                  <p className="text-xs text-slate-500">Schvalte nabídku nebo uhraďte zálohu online.</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setApprovedQuote(true)}
                    style={!approvedQuote ? { backgroundColor: 'var(--brand-primary)', color: '#ffffff', boxShadow: '0 4px 14px 0 rgba(0,0,0,0.1)' } : undefined}
                    className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm ${
                      approvedQuote ? 'bg-green-600 text-slate-900' : ''
                    }`}
                  >
                    {approvedQuote ? '✓ Nabídka schválena' : 'Schválit nabídku'}
                  </button>
                </div>
              </div>

              <div className="border border-slate-200 rounded-2xl p-5 space-y-4 bg-slate-50">
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm">Rozpočet č. Q-2026-8841</h4>
                    <p className="text-xs text-slate-500">Vystaveno společností {activeCompanyName} • Platnost do 30.4.2026</p>
                  </div>
                  <span className="text-base font-black font-mono" style={{ color: 'var(--brand-primary)' }}>
                    {lead.price.toLocaleString()} Kč
                  </span>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <FileText className="w-4 h-4" style={{ color: 'var(--brand-primary)' }} />
                    <span>Kompletní PDF rozpis materiálů a prací</span>
                  </div>
                  <button 
                    onClick={() => {
                      const text = `POLOŽKOVÝ ROZPIS DÍLA\nZakázka: ${lead.title}\nZhotovitel: ${activeCompanyName}\nCena díla: ${lead.price.toLocaleString('cs-CZ')} Kč vč. DPH\n\n1. Dodávka a montáž konstrukce vč. kotvení: 140 000 Kč\n2. Zastřešení a izolační doplňky: 50 000 Kč\n3. Doprava a stavební příprava: 30 000 Kč\n\nCelkem: ${lead.price.toLocaleString('cs-CZ')} Kč`;
                      const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `polozkovy_rozpocet_${lead.title.toLowerCase().replace(/\s+/g, '_')}.txt`;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      URL.revokeObjectURL(url);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 flex items-center gap-1.5 transition-colors shadow-2xs"
                  >
                    <Download className="w-3.5 h-3.5" /> Stáhnout rozpis
                  </button>
                </div>
              </div>

              {/* Deposit Payment Banner */}
              <div className="bg-slate-50 border border-slate-200 p-6 rounded-2xl text-slate-900 space-y-4 shadow-lg">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">Zálohová faktura (50% díla)</h4>
                    <p className="text-xs text-slate-500 mt-0.5">Uhrazením zálohy ve výši {(lead.price * 0.5).toLocaleString()} Kč závazně potvrdíte termín zahájení montáže.</p>
                  </div>
                  <button
                    onClick={() => setPaidDeposit(true)}
                    style={!paidDeposit ? { backgroundColor: 'var(--brand-primary)', color: '#ffffff', boxShadow: '0 4px 14px 0 rgba(0,0,0,0.1)' } : undefined}
                    className={`px-5 py-2.5 rounded-xl text-xs font-bold shadow-md transition-all ${
                      paidDeposit ? 'bg-green-600 text-slate-900' : ''
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
          <div className="bg-white/90 rounded-[24px] border border-slate-200 shadow-md overflow-hidden flex flex-col h-[500px]">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full animate-pulse" style={{ backgroundColor: 'var(--brand-primary)' }} />
                <span className="font-bold text-slate-900 text-xs">AI Asistent & Vedoucí projektu online</span>
              </div>
              <span className="text-[11px] text-slate-500">Odpovídáme obvykle do 5 minut</span>
            </div>

            <div className="flex-1 p-6 overflow-y-auto space-y-4">
              {messages.map((m: any) => (
                <div key={m.id} className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div 
                    className={`max-w-md p-4 rounded-2xl text-xs space-y-1 ${
                      m.sender === 'user' 
                        ? 'font-medium rounded-br-xs shadow-md' 
                        : 'bg-slate-50 text-slate-800 rounded-bl-xs border border-slate-200'
                    }`}
                    style={m.sender === 'user' ? { backgroundColor: 'var(--brand-primary)', color: '#ffffff' } : undefined}
                  >
                    <p>{m.text}</p>
                    <span 
                      className={`block text-[10px] text-right mt-1 opacity-80`}
                    >
                      {m.timestamp}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-200 bg-slate-50 flex gap-3">
              <input
                type="text"
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                placeholder="Napište zprávu mistrovi nebo asistentovi..."
                className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs font-medium text-slate-800 focus:outline-none focus:border-slate-600"
              />
              <button
                type="submit"
                style={{
                  backgroundColor: 'var(--brand-primary)',
                  color: '#ffffff',
                  boxShadow: '0 4px 14px 0 rgba(0,0,0,0.1)'
                }}
                className="px-5 py-3 rounded-xl text-xs font-bold shadow-md flex items-center gap-1.5 active:scale-[0.98] transition-all"
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

