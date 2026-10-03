import React, { useState } from 'react';
import { 
  ArrowLeft, 
  MapPin, 
  Phone, 
  Mail, 
  Calendar, 
  Sparkles, 
  CheckSquare, 
  Square, 
  FileText, 
  Camera, 
  Mic, 
  Plus, 
  CheckCircle2, 
  Clock, 
  User, 
  Send, 
  Bot,
  Download,
  DollarSign,
  TrendingUp,
  Receipt,
  Users,
  ShieldCheck,
  FolderOpen
} from 'lucide-react';
import { Employee, Lead, TimelineStep, AIChatMessage } from '../types';
import { WeatherWidget } from '../components/WeatherWidget';
import { BudgetTab } from './lead-tabs/BudgetTab';
import { CommunicationTab } from './lead-tabs/CommunicationTab';
import { ScheduleTab } from './lead-tabs/ScheduleTab';
import { TeamTab } from './lead-tabs/TeamTab';
import { TimeLogsTab } from './lead-tabs/TimeLogsTab';
import { CostsTab } from './lead-tabs/CostsTab';
import { DocumentsTab } from './lead-tabs/DocumentsTab';
import { InvoicesTab } from './lead-tabs/InvoicesTab';

interface LeadDetailProps {
  lead: Lead;
  employees: Employee[];
  onBack: () => void;
  onOpenPhoto: (url: string, title: string, category: string) => void;
  onOpenVoiceNotes: () => void;
  onUpdateLead: (updated: Lead) => Promise<unknown> | void;
}

type OperationalTab = 
  | 'prehled' 
  | 'komunikace' 
  | 'nabidka' 
  | 'harmonogram' 
  | 'tym' 
  | 'cas' 
  | 'naklady' 
  | 'dokumenty' 
  | 'fotky' 
  | 'faktury' 
  | 'predani';

export const LeadDetail: React.FC<LeadDetailProps> = ({
  lead,
  employees,
  onBack,
  onOpenPhoto,
  onOpenVoiceNotes,
  onUpdateLead
}) => {
  const [activeTab, setActiveTab] = useState<OperationalTab>('prehled');
  const [newChecklistText, setNewChecklistText] = useState('');
  const [quickOutputNotice, setQuickOutputNotice] = useState<string | null>(null);
  const priceLabel = typeof lead.price === 'number' && lead.price > 0
    ? `${lead.price.toLocaleString('cs-CZ')} Kč`
    : 'Cena není zadána';

  const handleNotice = (msg: string) => {
    setQuickOutputNotice(msg);
    setTimeout(() => {
      setQuickOutputNotice(null);
    }, 4500);
  };

  // Show only persisted events. The previous implementation invented a
  // complete sales history for every lead, which was unsafe in production.
  const auditTimeline = (lead.timeline || []).map((item) => ({
    time: item.time || item.date || item.timestamp || '—',
    title: item.title,
    note: item.description || item.notes || 'Bez doplňující poznámky',
    author: item.responsibleEmployee || 'Systém'
  }));

  // AI Chat
  const [chatMessages, setChatMessages] = useState<AIChatMessage[]>(lead.aiChat || [
    { id: 'msg-1', sender: 'ai', text: `Dobrý den, jsem stavební asistent pro zakázku "${lead.title}". Paměť projektu: Klient: ${lead.customerName}, Rozpočet: ${priceLabel}, Termín: ${lead.preferredDate || 'termín není zadán'}. Jak vám mohu pomoci?`, timestamp: '09:00' }
  ]);
  const [chatInput, setChatInput] = useState('');

  const handleSendChat = (textToSend?: string) => {
    const text = textToSend || chatInput;
    if (!text.trim()) return;

    const userMsg: AIChatMessage = {
      id: 'msg-' + Date.now(),
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    let reply = `Analyzuji zakázku "${lead.title}". Pro přesný přehled doplňte skutečné náklady a cenu nabídky.`;
    if (text.toLowerCase().includes('follow-up')) {
      reply = `📧 Připraven e-mail pro ${lead.customerName}:\nDobrý den, navazujeme na nabídku na zakázku ${lead.title}. Rádi bychom ověřili termín nástupu.`;
    } else if (text.toLowerCase().includes('materiál') || text.toLowerCase().includes('naklady')) {
      reply = '📦 Nákladová data zatím nejsou připojena. Doplňte skutečný doklad nebo aktivujte účetní integraci.';
    }

    const aiMsg: AIChatMessage = {
      id: 'msg-' + (Date.now() + 1),
      sender: 'ai',
      text: reply,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const updated = [...chatMessages, userMsg, aiMsg];
    setChatMessages(updated);
    if (!textToSend) setChatInput('');
    onUpdateLead({ ...lead, aiChat: updated });
  };

  const toggleChecklist = (checkId: string) => {
    const updatedChecklist = lead.checklist.map(c => 
      c.id === checkId ? { ...c, completed: !c.completed } : c
    );
    onUpdateLead({ ...lead, checklist: updatedChecklist });
  };

  const addChecklist = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChecklistText.trim()) return;
    const newItem = { id: 'c-' + Date.now(), text: newChecklistText, completed: false };
    onUpdateLead({ ...lead, checklist: [...lead.checklist, newItem] });
    setNewChecklistText('');
  };

  const tabs: { id: OperationalTab; label: string; count?: string }[] = [
    { id: 'prehled', label: 'Přehled' },
    { id: 'tym', label: 'Tým' },
  ];

  return (
    <div className="space-y-6 pb-20 font-sans text-slate-900">
      
      {/* 1. Permanent Sticky Operational Bar (Page 10) */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 sticky top-4 z-20 backdrop-blur-md bg-white/95">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
            title="Zpět na přehled zakázek"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                {lead.customerName?.toUpperCase() || 'PETRA DVOŘÁKOVÁ'}
              </h1>
              <span className="text-slate-400">·</span>
              <span className="text-xs sm:text-sm font-bold text-slate-700">{lead.title}</span>
              <span className="text-slate-400">·</span>
              <span className="text-xs sm:text-sm font-black text-[#0A84FF] font-mono">{priceLabel}</span>
              <span className="text-slate-400">·</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                {lead.status === 'In Progress' ? 'Realizace' : lead.status}
              </span>
              <span className="text-slate-400">·</span>
              <span className="text-xs font-bold text-emerald-600">
                {typeof lead.calculatedMargin === 'number' ? `marže ${lead.calculatedMargin.toFixed(1)} %` : 'marže neuvedena'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {lead.address || 'Adresa není zadána'} · Odpovědný: {lead.assignedEmployeeName || 'Nepřiřazeno'} · Termín: {lead.preferredDate || 'Termín není zadán'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <a
            href={`tel:${lead.customerPhone}`}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
          >
            <Phone className="w-3.5 h-3.5 text-[#0A84FF]" />
            <span>Zavolat</span>
          </a>
          <span className="px-3.5 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold">
            Ověřený pilotní detail
          </span>
        </div>
      </div>

      {/* 2. 11 Operational Tabs Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-1 shadow-xs overflow-x-auto">
        <div className="flex items-center gap-1 min-w-max p-1">
          {tabs.map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-[#0A84FF] text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <span>{tab.label}</span>
                {tab.count && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-md ${
                    isActive ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Operational Tab Contents */}
      {activeTab === 'prehled' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column: Chronological Audit Trail (Page 10) */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-xs">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
                <div>
                  <h2 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[#0A84FF]" />
                    Živá časová osa realizace (Audit Trail)
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">Každý krok od přijetí poptávky po předání zakázky</p>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-50 text-[#0A84FF] border border-blue-200">
                  Lead-to-Handover
                </span>
              </div>

              <div className="space-y-4">
                {auditTimeline.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-xs text-slate-500">
                    Zatím nejsou uložené žádné události. Časová osa se naplní skutečnými změnami zakázky.
                  </div>
                ) : auditTimeline.map((item, idx) => (
                  <div key={idx} className="flex items-start gap-4 text-xs group">
                    <div className="w-24 text-[11px] font-mono font-bold text-slate-500 shrink-0 pt-0.5">
                      {item.time}
                    </div>
                    <div className="w-2.5 h-2.5 rounded-full bg-[#0A84FF] mt-1 shrink-0 ring-4 ring-blue-50"></div>
                    <div className="space-y-0.5 flex-1 bg-slate-50/80 p-3 rounded-xl border border-slate-200/60">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900">{item.title}</span>
                        <span className="text-[10px] text-slate-400 font-medium">{item.author}</span>
                      </div>
                      <p className="text-slate-600 text-[11px]">{item.note}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Checklist items */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
                  Kontrolní checklist realizace
                </h3>
                <span className="text-xs text-slate-500 font-medium">
                  {lead.checklist.filter(c => c.completed).length} z {lead.checklist.length} hotovo
                </span>
              </div>

              <div className="space-y-2">
                {lead.checklist.map(c => (
                  <div 
                    key={c.id}
                    className="p-3 rounded-xl border border-slate-200/80 bg-slate-50 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      {c.completed ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <div className="w-4 h-4 rounded border border-slate-300"></div>
                      )}
                      <span className={c.completed ? 'line-through text-slate-400' : 'text-slate-800 font-medium'}>
                        {c.text}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <p className="mt-4 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-medium text-blue-800">
                Úpravy checklistu budou aktivní až po dokončení jeho databázového kontraktu.
              </p>
            </div>
          </div>

          {/* Right Column: Key Details & Financial Box */}
          <div className="space-y-6">
            
            {/* Financial Overview Card */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-xs space-y-4">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
                Ekonomika zakázky
              </h3>

              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200/60">
                  <span className="text-slate-500 font-medium">Smluvní cena (vč. DPH)</span>
                  <strong className="text-slate-900 font-black">{priceLabel}</strong>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200/60">
                  <span className="text-slate-500 font-medium">Skutečné náklady materiálu</span>
                  <strong className="text-slate-500 font-bold">—</strong>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200/60">
                  <span className="text-slate-500 font-medium">Vykázané hodiny týmu</span>
                  <strong className="text-slate-500 font-bold">—</strong>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-50 border border-emerald-200">
                  <span className="text-emerald-800 font-bold">Průběžná marže</span>
                  <strong className="text-emerald-700 font-black">Dopočítá se ze skutečných nákladů</strong>
                </div>
              </div>
            </div>

            {/* Customer & Location */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-xs space-y-4 text-xs">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
                Kontaktní údaje
              </h3>

              <div className="space-y-2.5 text-slate-600">
                <div className="flex items-center gap-2.5">
                  <User className="w-4 h-4 text-[#0A84FF] shrink-0" />
                  <span className="font-bold text-slate-900">{lead.customerName}</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Phone className="w-4 h-4 text-[#0A84FF] shrink-0" />
                  <a href={`tel:${lead.customerPhone}`} className="text-[#0A84FF] font-medium hover:underline">
                    {lead.customerPhone}
                  </a>
                </div>
                <div className="flex items-center gap-2.5">
                  <Mail className="w-4 h-4 text-[#0A84FF] shrink-0" />
                  <span>{lead.customerEmail}</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <MapPin className="w-4 h-4 text-[#0A84FF] shrink-0" />
                  <span>{lead.address}</span>
                </div>
              </div>

              {lead.weather && <div className="pt-3 border-t border-slate-100">
                <WeatherWidget weather={lead.weather} />
              </div>}
            </div>

            {/* AI Assistant */}
            <div className="hidden">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#7C3AED]" />
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
                  Asistent zakázky
                </h3>
              </div>
              <div className="h-44 overflow-y-auto space-y-2 text-xs pr-1">
                {chatMessages.map(m => (
                  <div key={m.id} className={`p-2.5 rounded-xl ${
                    m.sender === 'user' ? 'bg-blue-50 text-blue-900 ml-4' : 'bg-slate-50 text-slate-800 mr-4'
                  }`}>
                    <p className="text-[11px] leading-relaxed whitespace-pre-wrap">{m.text}</p>
                  </div>
                ))}
              </div>
              <div className="flex gap-1.5 pt-2 border-t border-slate-100">
                <input
                  type="text"
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSendChat()}
                  placeholder="Zadejte dotaz (např. 'follow-up')..."
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-[#0A84FF]"
                />
                <button
                  onClick={() => handleSendChat()}
                  className="p-2 bg-[#0A84FF] text-white rounded-xl text-xs hover:bg-blue-600"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* 4. Other Operational Tabs */}
      {activeTab === 'fotky' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black text-slate-900">Fotodokumentace ze stavby</h2>
            <button 
              onClick={onOpenVoiceNotes}
              className="px-3.5 py-1.5 bg-[#0A84FF] text-white rounded-xl text-xs font-bold hover:bg-blue-600 flex items-center gap-1.5"
            >
              <Camera className="w-3.5 h-3.5" /> Nahrát novou fotku
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div 
              onClick={() => onOpenPhoto(lead.thumbnail, lead.title, 'Hlavní náhled stavby')}
              className="rounded-2xl overflow-hidden h-40 border border-slate-200 cursor-pointer relative group bg-slate-50"
            >
              <img src={lead.thumbnail} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-all" />
              <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md text-[10px] bg-black/70 text-white font-bold">
                Zaměření
              </span>
            </div>
            {lead.photos.map(p => (
              <div 
                key={p.id}
                onClick={() => onOpenPhoto(p.url, p.name, p.category || 'Realizace')}
                className="rounded-2xl overflow-hidden h-40 border border-slate-200 cursor-pointer relative group bg-slate-50"
              >
                <img src={p.url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-all" />
                <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md text-[10px] bg-black/70 text-white font-bold">
                  {p.category || 'Stavba'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'komunikace' && (
        <CommunicationTab lead={lead} onNotice={handleNotice} />
      )}

      {activeTab === 'nabidka' && (
        <BudgetTab lead={lead} onNotice={handleNotice} onUpdateLead={onUpdateLead} />
      )}

      {activeTab === 'harmonogram' && (
        <ScheduleTab lead={lead} onNotice={handleNotice} />
      )}

      {activeTab === 'tym' && (
        <TeamTab lead={lead} employees={employees} onNotice={handleNotice} onUpdateLead={onUpdateLead} />
      )}

      {activeTab === 'cas' && (
        <TimeLogsTab lead={lead} onNotice={handleNotice} />
      )}

      {activeTab === 'naklady' && (
        <CostsTab lead={lead} onNotice={handleNotice} />
      )}

      {activeTab === 'dokumenty' && (
        <DocumentsTab lead={lead} onNotice={handleNotice} />
      )}

      {activeTab === 'faktury' && (
        <InvoicesTab lead={lead} onNotice={handleNotice} />
      )}

      {activeTab === 'predani' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-xs space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-black text-slate-900">Předávací protokol stavby</h2>
              <p className="text-xs text-slate-500 mt-0.5">Generování bezvadného předání zakázky a podpis investora</p>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
              Připraveno k podpisu
            </span>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
            <p><strong>Dílo:</strong> {lead.title}</p>
            <p><strong>Objednatel:</strong> {lead.customerName} ({lead.address})</p>
            <p><strong>Zhotovitel:</strong> StavbaFlow realizační tým</p>
            <p><strong>Předávací cena:</strong> {priceLabel}</p>
            <p><strong>Závady a nedodělky:</strong> Dílo předáno bez vad a nedodělků bránících užívání.</p>
          </div>

          <div className="flex gap-3">
            <button 
              onClick={() => handleNotice('Předávací protokol byl vygenerován ve formátu PDF a uložen do dokumentů.')}
              className="px-4 py-2 bg-[#0A84FF] text-white rounded-xl text-xs font-bold hover:bg-blue-600 flex items-center gap-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5" /> Stáhnout protokol (PDF)
            </button>
            <button 
              onClick={() => handleNotice('Odkaz na předávací protokol odeslán na ' + lead.customerEmail)}
              className="px-4 py-2 bg-slate-100 text-slate-800 rounded-xl text-xs font-bold hover:bg-slate-200 transition-colors"
            >
              Odeslat investorovi k podpisu
            </button>
          </div>
        </div>
      )}

      {/* Floating Notification Toast */}
      {quickOutputNotice && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-xl border border-slate-700 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="text-xs font-bold">{quickOutputNotice}</span>
          <button 
            onClick={() => setQuickOutputNotice(null)}
            className="text-slate-400 hover:text-white text-xs ml-2"
          >
            ✕
          </button>
        </div>
      )}

    </div>
  );
};
