import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  MessageSquare, 
  X, 
  Send, 
  Bot, 
  User, 
  Mic, 
  MicOff, 
  Mail, 
  Phone, 
  Calendar, 
  ShoppingCart, 
  FileText, 
  CreditCard, 
  Check, 
  ChevronRight,
  Volume2
} from 'lucide-react';
import { CompanyBranding, Lead } from '../types';

interface FloatingAIAssistantProps {
  branding: CompanyBranding;
  leads: Lead[];
}

export const FloatingAIAssistant: React.FC<FloatingAIAssistantProps> = ({ branding, leads }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead>(leads[0]);
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [voiceTranscribing, setVoiceTranscribing] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const [messages, setMessages] = useState<Array<{ id: string; sender: 'ai' | 'user'; text: string; time: string }>>([
    {
      id: '1',
      sender: 'ai',
      text: `Dobrý den! Jsem AI Project Copilot pro ${branding.name}. Mám přehled o všech zakázkách, technických parametrech, skladových materiálech i konverzacích. Jak vám mohu pomoci?`,
      time: '09:00'
    }
  ]);
  const [inputVal, setInputVal] = useState('');

  // Quick Action Buttons specified in Feature 6
  const copilotActions = [
    { label: 'Připravit Email', icon: Mail, action: 'email' },
    { label: 'Vytvořit SMS', icon: MessageSquare, action: 'sms' },
    { label: 'Nákupní seznam', icon: ShoppingCart, action: 'shopping' },
    { label: 'Vytvořit fakturu', icon: CreditCard, action: 'invoice' },
    { label: 'Naplánovat návštěvu', icon: Calendar, action: 'schedule' },
    { label: 'Zavolat zákazníkovi', icon: Phone, action: 'call' }
  ];

  const handleExecuteAction = (actionType: string) => {
    if (actionType === 'email') {
      const text = `Připravil jsem koncept emailu pro ${selectedLead.customerName} ohledně projektu "${selectedLead.title}" s technickou kalkulací na ${selectedLead.price.toLocaleString()} CZK.`;
      sendAiResponse(text);
      setActionNotice('Koncept emailu připraven k odeslání');
    } else if (actionType === 'sms') {
      const text = `SMS pro ${selectedLead.customerPhone}: "Dobrý den, náš mistr ${selectedLead.assignedEmployeeName} dorazí zítra v 8:00 na montáž. Všechny díly jsou připraveny."`;
      sendAiResponse(text);
      setActionNotice('SMS byla připravena');
    } else if (actionType === 'shopping') {
      const text = `📦 Generuji nákupní seznam pro ${selectedLead.title}:\n• 8x Masivní dubový trám 140x140x4000mm\n• 4x Polykarbonátový panel s UV komorou\n• 48x Nerezové vruty Rothoblaas 8x160mm\n• 2x LED stmívatelný profil 24V IP67`;
      sendAiResponse(text);
      setActionNotice('Nákupní seznam byl vygenerován');
    } else if (actionType === 'invoice') {
      const text = `Zálohová faktura na 50% (${(selectedLead.price * 0.5).toLocaleString()} CZK) pro ${selectedLead.customerName} s variabilním symbolem ${selectedLead.id.replace(/\D/g, '') || '202604'} byla vygenerována s QR kódem.`;
      sendAiResponse(text);
      setActionNotice('Faktura vygenerována');
    } else if (actionType === 'schedule') {
      const text = `Termín zaměření pro ${selectedLead.customerName} byl předběžně zarezervován na zítra v 13:30. Technik ${selectedLead.assignedEmployeeName} byl notifikován.`;
      sendAiResponse(text);
      setActionNotice('Termín naplánován v kalendáři');
    } else if (actionType === 'call') {
      window.location.href = `tel:${selectedLead.customerPhone}`;
      setActionNotice(`Vytáčím ${selectedLead.customerPhone}...`);
    }

    setTimeout(() => setActionNotice(null), 4000);
  };

  const sendAiResponse = (reply: string) => {
    setMessages(prev => [...prev, {
      id: 'msg-' + Date.now(),
      sender: 'ai',
      text: reply,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }]);
  };

  const handleSend = (textToSend?: string) => {
    const text = textToSend || inputVal;
    if (!text.trim()) return;

    const userMsg = {
      id: 'msg-' + Date.now(),
      sender: 'user' as const,
      text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    if (!textToSend) setInputVal('');

    setTimeout(() => {
      let aiReply = `Analyzoval jsem projekt "${selectedLead.title}" pro ${selectedLead.customerName}. `;
      const lower = text.toLowerCase();
      if (lower.includes('email') || lower.includes('napsat')) {
        aiReply += `Koncept byl připraven k odeslání na ${selectedLead.customerEmail}.`;
      } else if (lower.includes('materiál') || lower.includes('nákup') || lower.includes('shopping')) {
        aiReply += `Materiál pro tento typ konstrukce je skladem na centrále v ${branding.city}. Doporučuji vyzvednout zítra ráno.`;
      } else if (lower.includes('termín') || lower.includes('kdy') || lower.includes('datum')) {
        aiReply += `Preferovaný termín klienta je ${selectedLead.preferredDate}. Technik ${selectedLead.assignedEmployeeName} má v tento den 80% volné kapacity.`;
      } else {
        aiReply += `Všechny podklady jsou kompletní. Doporučuji schválit cenovou nabídku a odeslat odkaz do zákaznického portálu.`;
      }

      sendAiResponse(aiReply);
    }, 700);
  };

  const handleToggleVoice = () => {
    if (!isVoiceMode) {
      setIsVoiceMode(true);
      setVoiceTranscribing(true);
      setTimeout(() => {
        setVoiceTranscribing(false);
        const voiceQuery = `Priprav nákupní seznam materiálu pro zakázku ${selectedLead.customerName}`;
        setInputVal(voiceQuery);
        handleSend(voiceQuery);
        setIsVoiceMode(false);
      }, 3200);
    } else {
      setIsVoiceMode(false);
      setVoiceTranscribing(false);
    }
  };

  return (
    <>
      {/* Floating Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-2xl bg-white text-slate-900 shadow-2xl flex items-center justify-center hover:scale-105 transition-all ring-4 ring-blue-500/20 group"
        title="AI Project Copilot"
      >
        <Sparkles className="w-6 h-6 text-blue-400 group-hover:rotate-12 transition-transform" />
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 w-[420px] max-w-[calc(100vw-2rem)] bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[620px] text-slate-900 animate-in fade-in slide-in-from-bottom-5">
          {/* Header */}
          <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/90 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <span>AI Project Copilot</span>
                  <span className="text-[9px] bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded border border-blue-500/30 font-semibold">Gemini 2.5</span>
                </h3>
                <p className="text-[10px] text-green-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
                  Online • Kontext zakázek aktivní
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={handleToggleVoice}
                title="Hlasový režim (Voice Mode)"
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                  isVoiceMode ? 'bg-rose-600 text-slate-900 animate-pulse' : 'bg-slate-800 text-slate-500 hover:text-slate-900'
                }`}
              >
                <Mic className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-lg bg-slate-800 text-slate-500 hover:text-slate-900 flex items-center justify-center text-xs"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Active Context Selector (Customer, Tech, Deadline) */}
          <div className="px-4 py-2.5 bg-slate-50/60 border-b border-slate-200/80 flex items-center justify-between text-[11px]">
            <span className="text-slate-500 font-medium">Aktivní kontext:</span>
            <select
              value={selectedLead.id}
              onChange={(e) => {
                const lead = leads.find(l => l.id === e.target.value) || leads[0];
                setSelectedLead(lead);
              }}
              className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-slate-800 font-semibold focus:outline-none max-w-[240px] truncate"
            >
              {leads.map(lead => (
                <option key={lead.id} value={lead.id}>
                  {lead.customerName} — {lead.title}
                </option>
              ))}
            </select>
          </div>

          {/* Action Notice toast */}
          {actionNotice && (
            <div className="bg-green-950 border-b border-green-800/80 px-4 py-2 text-[11px] text-green-300 font-semibold flex items-center justify-between animate-in fade-in">
              <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-green-400" /> {actionNotice}</span>
            </div>
          )}

          {/* Voice Mode Wave Animation Overlay */}
          {isVoiceMode && (
            <div className="bg-gradient-to-b from-blue-950/90 to-slate-900/95 p-6 border-b border-blue-500/30 flex flex-col items-center justify-center space-y-4 text-center animate-in fade-in">
              <div className="w-14 h-14 rounded-full bg-rose-600/20 border border-rose-500/40 flex items-center justify-center text-rose-400 animate-pulse">
                <Mic className="w-7 h-7" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900">Hlasový AI asistent poslouchá...</p>
                <p className="text-[10px] text-slate-500">Mluvte přirozeně (např. "Připrav nákupní seznam materiálu")</p>
              </div>
              {/* Animated Voice Soundwave */}
              <div className="flex items-center justify-center gap-1.5 h-8">
                <span className="w-1 bg-blue-400 rounded-full animate-[bounce_1s_infinite_100ms] h-4"></span>
                <span className="w-1 bg-blue-400 rounded-full animate-[bounce_1s_infinite_200ms] h-8"></span>
                <span className="w-1 bg-blue-400 rounded-full animate-[bounce_1s_infinite_300ms] h-6"></span>
                <span className="w-1 bg-rose-400 rounded-full animate-[bounce_1s_infinite_150ms] h-7"></span>
                <span className="w-1 bg-rose-400 rounded-full animate-[bounce_1s_infinite_250ms] h-9"></span>
                <span className="w-1 bg-blue-400 rounded-full animate-[bounce_1s_infinite_350ms] h-5"></span>
                <span className="w-1 bg-blue-400 rounded-full animate-[bounce_1s_infinite_100ms] h-3"></span>
              </div>
              <button
                onClick={handleToggleVoice}
                className="px-3 py-1 rounded-full bg-slate-800 text-[10px] text-slate-700 hover:text-slate-900"
              >
                Zrušit hlasový vstup
              </button>
            </div>
          )}

          {/* Messages Area */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50/40">
            {messages.map((m) => (
              <div key={m.id} className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] p-3.5 rounded-2xl text-xs space-y-1 ${
                  m.sender === 'user'
                    ? 'bg-blue-600 text-slate-900 rounded-br-xs'
                    : 'bg-slate-800/90 text-slate-800 rounded-bl-xs border border-slate-300/60 shadow-xs'
                }`}>
                  <p className="leading-relaxed whitespace-pre-line">{m.text}</p>
                  <p className={`text-[9px] text-right ${m.sender === 'user' ? 'text-blue-200' : 'text-slate-500'}`}>{m.time}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Quick Action Suggestion Buttons (Feature 6: Prepare Email, SMS, Shopping List, Invoice, Schedule, Call) */}
          <div className="p-2.5 bg-white border-t border-slate-200">
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block px-1 mb-1.5">
              Doporučené akce pro "{selectedLead.customerName}":
            </span>
            <div className="grid grid-cols-3 gap-1.5">
              {copilotActions.map((act) => {
                const Icon = act.icon;
                return (
                  <button
                    key={act.action}
                    onClick={() => handleExecuteAction(act.action)}
                    className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-left border border-slate-300/50 transition-all flex items-center gap-1.5 text-[10px] font-semibold text-slate-800 hover:text-slate-900"
                  >
                    <Icon className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                    <span className="truncate">{act.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Input Box */}
          <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center gap-2">
            <button
              onClick={handleToggleVoice}
              title="Aktivovat hlasový režim"
              className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-700 flex items-center justify-center transition-all flex-shrink-0"
            >
              <Mic className="w-4 h-4 text-rose-400" />
            </button>
            <input
              type="text"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Napište pokyn pro AI Copilota..."
              className="flex-1 bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            />
            <button
              onClick={() => handleSend()}
              className="w-9 h-9 rounded-xl bg-blue-600 hover:bg-blue-500 text-slate-900 flex items-center justify-center transition-all flex-shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
};

