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
  const [selectedTemplate, setSelectedTemplate] = useState<'appointment' | 'delay' | 'completion' | 'review'>('appointment');
  const [selectedLead, setSelectedLead] = useState<Lead>(leads[0]);
  const [channel, setChannel] = useState<'whatsapp' | 'sms'>('whatsapp');
  const [customMessage, setCustomMessage] = useState('');
  const [sentSuccess, setSentSuccess] = useState<string | null>(null);

  // Review tracking telemetry (Feature 10: pending, sent, received)
  const [reviewMetrics, setReviewMetrics] = useState({
    pending: 4,
    sent: 12,
    received: 48,
    avgRating: 4.9
  });

  // Conversation history per project (Feature 8)
  const [conversations, setConversations] = useState<{
    [leadId: string]: Array<{ id: string; sender: 'client' | 'company'; channel: 'whatsapp' | 'sms'; text: string; time: string }>
  }>({
    [leads[0]?.id || 'lead-1']: [
      { id: 'c1', sender: 'client', channel: 'whatsapp', text: 'Dobrý den, posílal jsem poptávku na pergolu 4x6m.', time: 'Včera 14:10' },
      { id: 'c2', sender: 'company', channel: 'whatsapp', text: 'Dobrý den! Děkujeme, technik Petr Novotný zkontroloval podklady a připravil kalkulaci.', time: 'Včera 14:25' },
      { id: 'c3', sender: 'client', channel: 'whatsapp', text: 'Super, vyhovoval by nám termín montáže příští týden.', time: 'Včera 15:02' }
    ]
  });

  const [reviewsTelemetry, setReviewsTelemetry] = useState([
    { id: '1', customer: 'Ing. Jan Svoboda', project: 'Dřevěná Pergola', status: 'Received', rating: 5, time: 'Včera 16:40', text: 'Vynikající práce a rychlá realizace!' },
    { id: '2', customer: 'Marta Dvořáková', project: 'Oprava střechy', status: 'Sent', rating: null, time: 'Dnes 08:15', text: 'Odesláno přes SMS po dokončení díla' },
    { id: '3', customer: 'Pavel Černý', project: 'Zateplení fasády', status: 'Pending', rating: null, time: 'Čeká na předání díla', text: 'Bude odesláno automaticky zítra' },
    { id: '4', customer: 'David Kučera', project: 'Hliníkový přístřešek', status: 'Received', rating: 5, time: 'Před 2 dny', text: 'Skvělá komunikace a dodržení termínu.' }
  ]);

  const templates = {
    appointment: {
      title: 'Potvrzení termínu montáže / návštěvy',
      icon: Calendar,
      text: `Dobrý den, pane/paní ${selectedLead.customerName},\n\npotvrzujeme termín realizace Vašeho projektu "${selectedLead.title}" u ${branding.name} na ${selectedLead.preferredDate} v 08:00 ráno.\nNáš mistr ${selectedLead.assignedEmployeeName} Vám bude plně k dispozici.\n\nS pozdravem,\n${branding.name}\nTel: ${branding.phone}`
    },
    delay: {
      title: 'Upozornění na posun termínu (Počasí/Doprava)',
      icon: AlertTriangle,
      text: `Dobrý den, pane/paní ${selectedLead.customerName},\n\nz důvodu nepříznivé předpovědi počasí (déšť) pro venkovní práce přesouváme montáž zítra o 2 hodiny na 10:00.\nVšechny materiály jsou naskladněny.\n\nDěkujeme za pochopení,\n${selectedLead.assignedEmployeeName} (${branding.name})`
    },
    completion: {
      title: 'Předání hotového díla & Protokol',
      icon: CheckCircle2,
      text: `Dobrý den, pane/paní ${selectedLead.customerName},\n\nrealizace Vašeho projektu "${selectedLead.title}" byla úspěšně dokončena! Předávací protokol a garanční list 5 let naleznete ve Vašem zákaznickém portálu.\n\nDěkujeme za důvěru,\nTým ${branding.name}`
    },
    review: {
      title: 'Žádost o Google Review (Hodnocení spokojenosti)',
      icon: Star,
      text: `Vážený zákazníku,\n\nděkujeme za spolupráci na projektu "${selectedLead.title}". Byli jste spokojeni s naší prací? Budeme rádi za krátké hodnocení na Google:\nhttps://g.page/r/${branding.name.toLowerCase().replace(/\s+/g, '-')}/review\n\nZabere to jen 1 minutu. Děkujeme!\n${branding.name}`
    }
  };

  const handleApplyTemplate = (type: 'appointment' | 'delay' | 'completion' | 'review') => {
    setSelectedTemplate(type);
    setCustomMessage(templates[type].text);
  };

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const msgText = customMessage || templates[selectedTemplate].text;
    
    // Add to project conversation history
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
    <div className="space-y-8 pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <MessageSquare className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">Communication Center & Automation</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight mt-1">WhatsApp & SMS Automatizace</h2>
          <p className="text-xs text-slate-500">Automatické šablony, transakční SMS, Google Reviews management & historie komunikace.</p>
        </div>
      </div>

      {/* Feature 10: Google Reviews Dashboard Tracker (Pending, Sent, Received) */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Čeká na odeslání (Pending)</span>
            <p className="text-2xl font-black text-amber-600 mt-1">{reviewMetrics.pending}</p>
            <span className="text-[10px] text-slate-400">Po dokončení montáže</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Odeslané výzvy (Sent)</span>
            <p className="text-2xl font-black text-blue-600 mt-1">{reviewMetrics.sent}</p>
            <span className="text-[10px] text-slate-400">SMS & WhatsApp link</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <Send className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Udělené recenze (Received)</span>
            <p className="text-2xl font-black text-emerald-600 mt-1">{reviewMetrics.received}</p>
            <span className="text-[10px] text-emerald-600 font-semibold">+18% konverze přes SMS</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider block">Google Skóre</span>
            <p className="text-2xl font-black text-white mt-1">4.9 ★</p>
            <span className="text-[10px] text-slate-400">Celkem 60 hodnocení</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold border border-amber-500/30">
            <Star className="w-5 h-5 fill-amber-400" />
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
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Vyberte šablonu zprávy</h3>
              
              {/* Channel Selector */}
              <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setChannel('whatsapp')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    channel === 'whatsapp' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  WhatsApp
                </button>
                <button
                  type="button"
                  onClick={() => setChannel('sms')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    channel === 'sms' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  SMS Brána
                </button>
              </div>
            </div>

            {/* Template Buttons with One-Click Send */}
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
                        ? 'border-emerald-600 bg-emerald-50/50 shadow-xs ring-2 ring-emerald-500/20' 
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold text-slate-900 line-clamp-2">{t.title}</span>
                  </button>
                );
              })}
            </div>

            {/* Target Client Selector */}
            <div>
              <label className="text-xs font-semibold text-slate-700">Příjemce (Zakázka z CRM)</label>
              <select
                value={selectedLead.id}
                onChange={(e) => {
                  const lead = leads.find(l => l.id === e.target.value) || leads[0];
                  setSelectedLead(lead);
                }}
                className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-semibold text-slate-800 focus:outline-none"
              >
                {leads.map(lead => (
                  <option key={lead.id} value={lead.id}>
                    {lead.customerName} ({lead.customerPhone}) — {lead.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Textarea Composer */}
            <form onSubmit={handleSend} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700">Obsah zprávy</label>
                <textarea
                  rows={5}
                  value={customMessage || templates[selectedTemplate].text}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-[11px] text-slate-400">
                  Odesíláno z ověřeného čísla {branding.phone}
                </span>

                <button
                  type="submit"
                  className="px-6 py-3 rounded-xl text-xs font-bold text-white shadow-md flex items-center gap-2 hover:opacity-95 transition-all"
                  style={{ backgroundColor: channel === 'whatsapp' ? '#10b981' : branding.primaryColor }}
                >
                  <Send className="w-4 h-4" />
                  <span>Odeslat 1-klikem přes {channel === 'whatsapp' ? 'WhatsApp' : 'SMS'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Conversation History for selected project (Feature 8) */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <History className="w-4 h-4 text-slate-400" />
                <span>Historie konverzace k projektu: {selectedLead.title}</span>
              </h3>
              <span className="text-xs text-slate-400 font-semibold">{selectedLead.customerName}</span>
            </div>

            <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
              {currentHistory.map((item) => (
                <div 
                  key={item.id}
                  className={`flex ${item.sender === 'company' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[80%] p-3.5 rounded-2xl text-xs space-y-1 ${
                    item.sender === 'company'
                      ? 'bg-emerald-600 text-white rounded-br-xs'
                      : 'bg-slate-100 text-slate-800 rounded-bl-xs'
                  }`}>
                    <p className="leading-relaxed whitespace-pre-line">{item.text}</p>
                    <div className="flex items-center justify-between text-[9px] pt-1 opacity-70">
                      <span>{item.channel.toUpperCase()}</span>
                      <span>{item.time}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Google Reviews Automation & Telemetry List */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-500 fill-amber-400" />
                <span>Google Reviews Žádosti</span>
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                Automatický režim
              </span>
            </div>

            <p className="text-xs text-slate-500">
              Systém po předání díla automaticky připraví a odešle žádost o recenzi s personalizovaným odkazem.
            </p>

            {/* Telemetry Tracking */}
            <div className="space-y-3 pt-2">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Stav jednotlivých zakázek:</span>
              
              {reviewsTelemetry.map((item) => (
                <div key={item.id} className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">{item.customer}</span>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                      item.status === 'Received' ? 'bg-emerald-100 text-emerald-700' :
                      item.status === 'Sent' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {item.status === 'Received' ? '5★ Uděleno' : item.status === 'Sent' ? 'Odesláno' : 'Čeká (Pending)'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">{item.project} • {item.time}</p>
                  <p className="text-[11px] text-slate-700 font-medium italic">"{item.text}"</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

