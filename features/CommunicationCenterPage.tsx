import React, { useState } from 'react';
import { 
  MessageSquare, 
  Send, 
  Clock, 
  CheckCircle2, 
  Sparkles, 
  Star, 
  Calendar, 
  AlertTriangle, 
  Phone, 
  User, 
  Check, 
  Copy, 
  Share2,
  History,
  TrendingUp,
  Inbox,
  ArrowRight
} from 'lucide-react';
import { CompanyBranding, Lead } from '../types';

interface CommunicationCenterPageProps {
  branding: CompanyBranding;
  leads: Lead[];
}

export const CommunicationCenterPage: React.FC<CommunicationCenterPageProps> = ({
  branding,
  leads
}) => {
  const activeColor = branding.primaryColor || '#2563eb';

  const [selectedTemplate, setSelectedTemplate] = useState<'appointment' | 'delay' | 'completion' | 'review'>('appointment');
  const [selectedLead, setSelectedLead] = useState<Lead>(leads[0] || {
    id: 'lead-1',
    customerName: 'Jan Svoboda',
    title: 'Pergola 4x6m',
    status: 'New',
    assignedEmployeeName: 'Petr Novotný',
    preferredDate: '2026-09-20'
  } as any);
  const [channel, setChannel] = useState<'whatsapp' | 'sms'>('whatsapp');
  const [customMessage, setCustomMessage] = useState('');
  const [sentSuccess, setSentSuccess] = useState<string | null>(null);

  const [reviewMetrics, setReviewMetrics] = useState({
    pending: 4,
    sent: 12,
    received: 48,
    avgRating: 4.9
  });

  const [conversations, setConversations] = useState<{
    [leadId: string]: Array<{ id: string; sender: 'client' | 'company'; channel: 'whatsapp' | 'sms'; text: string; time: string }>
  }>({
    [selectedLead.id]: [
      { id: 'c1', sender: 'client', channel: 'whatsapp', text: 'Dobrý den, posílal jsem poptávku na pergolu 4x6m.', time: 'Včera 14:10' },
      { id: 'c2', sender: 'company', channel: 'whatsapp', text: 'Dobrý den! Děkujeme, technik Petr Novotný zkontroloval podklady a připravil kalkulaci.', time: 'Včera 14:25' },
      { id: 'c3', sender: 'client', channel: 'whatsapp', text: 'Super, vyhovoval by nám termín montáže příští týden.', time: 'Včera 15:02' }
    ]
  });

  const templates = {
    appointment: {
      title: 'Potvrzení termínu montáže / návštěvy',
      icon: Calendar,
      text: `Dobrý den, pane/paní ${selectedLead.customerName},\n\npotvrzujeme termín realizace Vašeho projektu "${selectedLead.title}" u ${(branding?.name || 'Firma')} na ${selectedLead.preferredDate} v 08:00 ráno.\nNáš mistr ${selectedLead.assignedEmployeeName} Vám bude plně k dispozici.\n\nS pozdravem,\n${(branding?.name || 'Firma')}\nTel: ${branding.phone}`
    },
    delay: {
      title: 'Upozornění na posun termínu (Počasí/Doprava)',
      icon: AlertTriangle,
      text: `Dobrý den, pane/paní ${selectedLead.customerName},\n\nz důvodu nepříznivé předpovědi počasí (déšť) pro venkovní práce přesouváme montáž zítra o 2 hodiny na 10:00.\nVšechny materiály jsou naskladněny.\n\nDěkujeme za pochopení,\n${selectedLead.assignedEmployeeName} (${(branding?.name || 'Firma')})`
    },
    completion: {
      title: 'Předání hotového díla & Protokol',
      icon: CheckCircle2,
      text: `Dobrý den, pane/paní ${selectedLead.customerName},\n\nrealizace Vašeho projektu "${selectedLead.title}" byla úspěšně dokončena! Předávací protokol a garanční list 5 let naleznete ve Vašem zákaznickém portálu.\n\nDěkujeme za důvěru,\nTým ${(branding?.name || 'Firma')}`
    },
    review: {
      title: 'Žádost o Google Review (Hodnocení spokojenosti)',
      icon: Star,
      text: `Vážený zákazníku,\n\nděkujeme za spolupráci na projektu "${selectedLead.title}". Byli jste spokojeni s naší prací? Budeme rádi za krátké hodnocení na Google:\nhttps://g.page/r/${(branding?.name || 'Firma').toLowerCase().replace(/\s+/g, '-')}/review\n\nZabere to jen 1 minutu. Děkujeme!\n${(branding?.name || 'Firma')}`
    }
  };

  const handleApplyTemplate = (type: 'appointment' | 'delay' | 'completion' | 'review') => {
    setSelectedTemplate(type);
    setCustomMessage(templates[type].text);
  };

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const msgText = customMessage || templates[selectedTemplate].text;
    
    const newMsg = {
      id: 'c-' + Date.now(),
      sender: 'company' as const,
      channel,
      text: msgText,
      time: 'Právě teď'
    };

    setConversations(prev => ({
      ...prev,
      [selectedLead.id]: [...(prev[selectedLead.id] || []), newMsg]
    }));

    if (selectedTemplate === 'review') {
      setReviewMetrics(prev => ({ ...prev, sent: prev.sent + 1, pending: Math.max(0, prev.pending - 1) }));
    }

    setSentSuccess(`Zpráva úspěšně odeslána klientovi ${selectedLead.customerName} přes ${channel.toUpperCase()}!`);
    setTimeout(() => setSentSuccess(null), 4000);
  };

  const currentHistory = conversations[selectedLead.id] || [
    { id: 'c-init', sender: 'client', channel: 'whatsapp', text: `Dobrý den, poptávám ${selectedLead.title}.`, time: 'Včera' },
    { id: 'c-reply', sender: 'company', channel: 'whatsapp', text: `Dobrý den, děkujeme. Nabídka byla vygenerována.`, time: 'Dnes' }
  ];

  return (
    <div className="space-y-8 pb-16 text-slate-900 font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div 
              className="w-7 h-7 rounded-lg flex items-center justify-center text-white"
              style={{ backgroundColor: activeColor }}
            >
              <MessageSquare className="w-4 h-4" />
            </div>
            <span className="text-xs font-black uppercase tracking-wider" style={{ color: activeColor }}>
              Automatizace & Centrum komunikace
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1">WhatsApp & SMS Komunikace s klienty</h1>
          <p className="text-xs text-slate-500">Automatické šablony, transakční zprávy, hodnocení spokojenosti a kompletní archiv zpráv.</p>
        </div>
      </div>

      {/* Metrics Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Čeká na odeslání (Pending)</span>
            <p className="text-2xl font-black text-slate-900 mt-1">{reviewMetrics.pending}</p>
            <span className="text-[10px] text-slate-500">Po dokončení montáže</span>
          </div>
          <div 
            className="w-10 h-10 rounded-xl flex items-center justify-center font-bold"
            style={{ backgroundColor: `${activeColor}15`, color: activeColor }}
          >
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Odeslané výzvy (Sent)</span>
            <p className="text-2xl font-black text-slate-900 mt-1">{reviewMetrics.sent}</p>
            <span className="text-[10px] text-slate-500">SMS & WhatsApp odkaz</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center font-bold">
            <Send className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Udělené recenze (Received)</span>
            <p className="text-2xl font-black text-emerald-600 mt-1">{reviewMetrics.received}</p>
            <span className="text-[10px] text-emerald-600 font-semibold">+18% konverze přes SMS</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider block" style={{ color: activeColor }}>
              Hodnocení Google
            </span>
            <p className="text-2xl font-black text-slate-900 mt-1">4.9 ★</p>
            <span className="text-[10px] text-slate-500">Celkem 60 recenzí</span>
          </div>
          <div 
            className="w-10 h-10 rounded-xl flex items-center justify-center font-bold"
            style={{ backgroundColor: `${activeColor}15`, color: activeColor }}
          >
            <Star className="w-5 h-5 fill-current" />
          </div>
        </div>
      </div>

      {sentSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl text-emerald-900 text-xs flex items-center justify-between animate-in fade-in shadow-xs">
          <div className="flex items-center gap-2 font-semibold">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{sentSuccess}</span>
          </div>
          <button onClick={() => setSentSuccess(null)} className="font-bold text-emerald-700 hover:underline">Zavřít</button>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Template Selector & Message Composer */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Vyberte šablonu zprávy</h3>
              
              {/* Channel Selector */}
              <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => setChannel('whatsapp')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    channel === 'whatsapp' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  WhatsApp
                </button>
                <button
                  type="button"
                  onClick={() => setChannel('sms')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    channel === 'sms' ? 'text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                  style={channel === 'sms' ? { backgroundColor: activeColor } : {}}
                >
                  SMS Brána
                </button>
              </div>
            </div>

            {/* Template Buttons */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {(['appointment', 'delay', 'completion', 'review'] as const).map((type) => {
                const t = templates[type];
                const Icon = t.icon;
                const isSelected = selectedTemplate === type;
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => handleApplyTemplate(type)}
                    className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between space-y-2 ${
                      isSelected 
                        ? 'border-blue-500 bg-blue-50/60 shadow-xs ring-2 ring-blue-500/20' 
                        : 'border-slate-200 hover:border-slate-300 bg-slate-50'
                    }`}
                  >
                    <div 
                      className="w-8 h-8 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: `${activeColor}15`, color: activeColor }}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold text-slate-800 line-clamp-2">{t.title}</span>
                  </button>
                );
              })}
            </div>

            {/* Editor Area */}
            <div className="space-y-3">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
                Text zprávy k odeslání
              </label>
              <textarea
                rows={6}
                value={customMessage || templates[selectedTemplate].text}
                onChange={(e) => setCustomMessage(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs font-medium text-slate-900 focus:outline-none focus:bg-white focus:border-blue-500 transition-all leading-relaxed"
              />
              
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => handleSend()}
                  className="px-6 py-3 rounded-xl text-white text-xs font-bold shadow-md flex items-center gap-2 transition-all hover:opacity-95"
                  style={{ backgroundColor: activeColor }}
                >
                  <Send className="w-4 h-4" />
                  <span>Odeslat zprávu přes {channel.toUpperCase()}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Conversation History Preview */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <History className="w-4 h-4 text-slate-500" />
              Historie zpráv s klientem
            </h3>

            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
              {currentHistory.map((item) => (
                <div 
                  key={item.id} 
                  className={`p-3 rounded-2xl text-xs space-y-1 ${
                    item.sender === 'company' 
                      ? 'bg-blue-50 border border-blue-100 text-slate-900 ml-4' 
                      : 'bg-slate-100 border border-slate-200 text-slate-800 mr-4'
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] text-slate-500">
                    <span className="font-bold">{item.sender === 'company' ? (branding?.name || 'Firma') : selectedLead.customerName}</span>
                    <span>{item.time}</span>
                  </div>
                  <p className="leading-relaxed whitespace-pre-wrap">{item.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
