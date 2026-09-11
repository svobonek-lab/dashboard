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
  Brain,
  Volume2,
  Check,
  Download
} from 'lucide-react';
import { Lead, TimelineStep, AIChatMessage } from '../types';
import { WeatherWidget } from '../components/WeatherWidget';

interface LeadDetailProps {
  lead: Lead;
  onBack: () => void;
  onOpenPhoto: (url: string, title: string, category: string) => void;
  onOpenVoiceNotes: () => void;
  onUpdateLead: (updated: Lead) => void;
}

export const LeadDetail: React.FC<LeadDetailProps> = ({
  lead,
  onBack,
  onOpenPhoto,
  onOpenVoiceNotes,
  onUpdateLead
}) => {
  const [newChecklistText, setNewChecklistText] = useState('');
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [quickOutputNotice, setQuickOutputNotice] = useState<string | null>(null);
  
  // Initialize default timeline if not present
  const defaultTimeline: TimelineStep[] = lead.timeline || [
    { id: 't-1', title: 'Inquiry Received', status: 'Completed', timestamp: '2026-09-08 14:15', notes: 'Automated web widget capture' },
    { id: 't-2', title: 'Contacted Client', status: 'Completed', timestamp: '2026-09-08 16:30', responsibleEmployee: lead.assignedEmployeeName, notes: 'Phone consultation & requirements confirmed' },
    { id: 't-3', title: 'Quote Generated', status: lead.status === 'Quote' || lead.status === 'In Progress' || lead.status === 'Completed' ? 'Completed' : 'Current', timestamp: '2026-09-09 10:00', responsibleEmployee: lead.assignedEmployeeName, notes: 'Itemized PDF quote created' },
    { id: 't-4', title: 'Quote Accepted', status: lead.status === 'In Progress' || lead.status === 'Completed' ? 'Completed' : lead.status === 'Quote' ? 'Current' : 'Pending', notes: 'Waiting for client approval signature' },
    { id: 't-5', title: 'Scheduled & Dispatched', status: lead.status === 'In Progress' || lead.status === 'Completed' ? 'Completed' : 'Pending', notes: `Assigned to ${lead.assignedEmployeeName}` },
    { id: 't-6', title: 'Completed & Handed Over', status: lead.status === 'Completed' ? 'Completed' : 'Pending', notes: 'Final photo upload & protocol sign-off' },
  ];

  // Initialize AI Chat
  const [chatMessages, setChatMessages] = useState<AIChatMessage[]>(lead.aiChat || [
    { id: 'msg-1', sender: 'ai', text: `Hello Jan, I am your Gemini AI assistant for "${lead.title}". I remember all project memory (Customer: ${lead.customerName}, Materials: stocked, Photos: ${lead.photos.length + 1} uploaded, Deadline: ${lead.preferredDate}). How can I help you today?`, timestamp: '10:30' }
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

    const query = text.toLowerCase();
    let aiReplyText = `Analyzed project "${lead.title}". All systems are normal and tracking toward target completion on ${lead.preferredDate}.`;

    if (query.includes('follow-up') || query.includes('email')) {
      aiReplyText = `📧 Prepared Follow-up Email to ${lead.customerName}:\n\nDobrý den, vážený pane ${lead.customerName},\n\nnavazujeme na naši poptávku "${lead.title}". Všechny materiály máme připravené a termín ${lead.preferredDate} platí. Těšíme se na realizaci.\n\nS pozdravem,\n${lead.assignedEmployeeName}`;
    } else if (query.includes('call') || query.includes('zavolat')) {
      aiReplyText = `📞 Call Script for ${lead.customerName} (${lead.customerPhone}):\n"Dobrý den, pane ${lead.customerName}, voláme ohledně vaší realizace ${lead.title}. Můžeme potvrdit nástup technika v úterý?"`;
    } else if (query.includes('shopping') || query.includes('nákupní')) {
      aiReplyText = `🛒 Shopping List Generated:\n1. 12x Specialized Galvanized Anchors\n2. 4x Timber Beams (Oak)\n3. Fastening kit & weather sealant\nStatus: Stocked in warehouse, ready for morning loading.`;
    } else if (query.includes('invoice') || query.includes('faktur')) {
      aiReplyText = `📄 Invoice Draft Created:\nProject: ${lead.title}\nClient: ${lead.customerName}\nAmount: ${(lead.price).toLocaleString()} CZK (incl. 21% VAT)\nStatus: Ready for 50% deposit release.`;
    } else if (query.includes('visit') || query.includes('návštěv')) {
      aiReplyText = `📅 Next Visit Scheduled:\nDate: ${lead.preferredDate}\nTechnician: ${lead.assignedEmployeeName}\nDuration: Estimated 6 hours on site.`;
    } else if (query.includes('yesterday') || query.includes('včera')) {
      aiReplyText = `Yesterday, ${lead.assignedEmployeeName} verified site measurements and uploaded 2 photos with ${lead.customerName}.`;
    }

    const aiMsg: AIChatMessage = {
      id: 'msg-' + (Date.now() + 1),
      sender: 'ai',
      text: aiReplyText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const updatedChat = [...chatMessages, userMsg, aiMsg];
    setChatMessages(updatedChat);
    if (!textToSend) setChatInput('');
    onUpdateLead({ ...lead, aiChat: updatedChat, timeline: defaultTimeline });
  };

  const triggerQuickOutput = (type: string) => {
    setQuickOutputNotice(`Successfully generated ${type}! Added to project documents.`);
    setTimeout(() => setQuickOutputNotice(null), 4000);
  };

  const toggleChecklist = (checkId: string) => {
    const updatedChecklist = lead.checklist.map(c => 
      c.id === checkId ? { ...c, completed: !c.completed } : c
    );
    onUpdateLead({ ...lead, checklist: updatedChecklist, timeline: defaultTimeline });
  };

  const addChecklist = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChecklistText.trim()) return;
    const newItem = { id: 'c-' + Date.now(), text: newChecklistText, completed: false };
    onUpdateLead({ ...lead, checklist: [...lead.checklist, newItem], timeline: defaultTimeline });
    setNewChecklistText('');
  };

  return (
    <div className="space-y-8 pb-16 text-slate-100">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-200 hover:bg-slate-800 transition-all shadow-sm"
        >
          <ArrowLeft className="w-4 h-4 text-amber-400" />
          <span>Zpět na přehled zakázek</span>
        </button>

        <div className="flex items-center gap-3">
          <span className={`px-3.5 py-1.5 rounded-full text-xs font-bold border ${
            lead.status === 'New' ? 'bg-blue-950/80 border-blue-800 text-blue-400' :
            lead.status === 'In Progress' ? 'bg-amber-950/80 border-amber-800 text-amber-400' : 'bg-emerald-950/80 border-emerald-800 text-emerald-400'
          }`}>
            Stav: {lead.status}
          </span>
          <span className="px-4 py-1.5 rounded-full text-xs font-extrabold bg-amber-500 text-slate-950 shadow-sm font-mono">
            {(lead.price).toLocaleString()} Kč
          </span>
        </div>
      </div>

      {/* Customer Timeline (Requirement 4) */}
      <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-md space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-400" />
            Průběh a milníky zakázky
          </h3>
          <span className="text-xs text-slate-400">Živý sledovač realizace</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-6 gap-3 pt-2">
          {defaultTimeline.map((step, index) => {
            const isCompleted = step.status === 'Completed';
            const isCurrent = step.status === 'Current';
            return (
              <div 
                key={step.id} 
                className={`p-3.5 rounded-2xl border transition-all relative ${
                  isCompleted ? 'bg-emerald-950/40 border-emerald-800/80 text-emerald-300' :
                  isCurrent ? 'bg-amber-950/40 border-amber-500/80 ring-2 ring-amber-500/20 text-amber-300' :
                  'bg-slate-950 border-slate-800 text-slate-500'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold">Krok {index + 1}</span>
                  {isCompleted ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <div className={`w-2 h-2 rounded-full ${isCurrent ? 'bg-amber-400 animate-pulse' : 'bg-slate-700'}`} />}
                </div>
                <p className="text-xs font-bold mt-2 truncate text-slate-200">{step.title}</p>
                <p className="text-[10px] mt-1 text-slate-400 truncate">{step.timestamp || 'Čeká se'}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column (Photos, Description, Address, Weather) */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-md space-y-6">
            <div>
              <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">{lead.priority} Priorita</span>
              <h2 className="text-xl font-extrabold text-slate-100 mt-1">{lead.title}</h2>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">{lead.description}</p>
            </div>

            <div className="space-y-3 pt-4 border-t border-slate-800 text-xs text-slate-300">
              <div className="flex items-center gap-3">
                <MapPin className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <span>{lead.address}</span>
              </div>
              <div className="flex items-center gap-3">
                <User className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <span className="font-semibold text-slate-100">{lead.customerName}</span>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <a href={`tel:${lead.customerPhone}`} className="text-amber-400 font-semibold hover:underline">{lead.customerPhone}</a>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <span>{lead.customerEmail}</span>
              </div>
              <div className="flex items-center gap-3">
                <Calendar className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <span>Termín realizace: {lead.preferredDate}</span>
              </div>
            </div>

            {/* Weather Integration */}
            <WeatherWidget weather={lead.weather} />

            {/* Photos Gallery */}
            <div className="space-y-3 pt-4 border-t border-slate-800">
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center justify-between">
                <span>Fotodokumentace ze stavby</span>
                <button onClick={onOpenVoiceNotes} className="text-amber-400 font-semibold hover:underline flex items-center gap-1">
                  <Camera className="w-3.5 h-3.5" /> Nahrát
                </button>
              </h3>
              
              <div className="grid grid-cols-2 gap-2">
                <div 
                  onClick={() => onOpenPhoto(lead.thumbnail, lead.title, 'Hlavní náhled')}
                  className="rounded-xl overflow-hidden h-24 border border-slate-800 cursor-pointer relative group bg-slate-950"
                >
                  <img src={lead.thumbnail} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-all" />
                  <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded text-[9px] bg-slate-950/80 text-amber-400 font-bold border border-slate-800">Hlavní</span>
                </div>
                {lead.photos.map(p => (
                  <div 
                    key={p.id}
                    onClick={() => onOpenPhoto(p.url, p.name, p.category || 'Fotka')}
                    className="rounded-xl overflow-hidden h-24 border border-slate-800 cursor-pointer relative group bg-slate-950"
                  >
                    <img src={p.url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-all" />
                    <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded text-[9px] bg-slate-950/80 text-slate-300 font-medium border border-slate-800">{p.category}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (AI Project Assistant & Checklist) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Upgraded Gemini Project Assistant */}
          <div className="bg-slate-900 text-white p-6 rounded-3xl shadow-xl space-y-4 border border-slate-800 relative overflow-hidden">
            <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold tracking-tight text-white flex items-center gap-2">
                    AI Stavbyvedoucí Asistent
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      Paměť aktivní
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400">Udržuje kontext: Klient • Materiály • Fotky ze stavby • Termíny</p>
                </div>
              </div>

              {/* Quick Output Notification */}
              {quickOutputNotice && (
                <div className="px-3 py-1 rounded-xl bg-emerald-600 text-white text-[11px] font-bold animate-in fade-in flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5" /> {quickOutputNotice}
                </div>
              )}
            </div>

            {/* Chat History */}
            <div className="max-h-64 overflow-y-auto space-y-3 pr-2">
              {chatMessages.map((msg) => (
                <div key={msg.id} className={`flex gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.sender === 'ai' && (
                    <div className="w-7 h-7 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center flex-shrink-0 text-xs font-bold mt-1">
                      AI
                    </div>
                  )}
                  <div className={`p-3.5 rounded-2xl text-xs leading-relaxed max-w-lg ${
                    msg.sender === 'user' ? 'bg-amber-500 text-slate-950 font-medium rounded-tr-xs' : 'bg-slate-950 text-slate-200 rounded-tl-xs border border-slate-800 whitespace-pre-line'
                  }`}>
                    {msg.text}
                    <p className={`text-[9px] mt-1 text-right ${msg.sender === 'user' ? 'text-amber-950' : 'text-slate-500'}`}>{msg.timestamp}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Contextual Action Buttons */}
            <div className="space-y-1.5 pt-2">
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Doporučené rychlé akce:</p>
              <div className="flex flex-wrap gap-2">
                {[
                  'Připravit navazující e-mail',
                  'Zavolat klientovi',
                  'Vytvořit nákupní seznam DEK',
                  'Vygenerovat fakturu',
                  'Naplánovat další kontrolu'
                ].map((action, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendChat(action)}
                    className="px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-[11px] text-amber-300 font-semibold transition-all flex items-center gap-1"
                  >
                    <Sparkles className="w-3 h-3 text-amber-400" />
                    {action}
                  </button>
                ))}
              </div>
            </div>

            {/* One-Click Outputs Toolbar */}
            <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Výstupy na 1 klik:</span>
              <div className="flex items-center gap-2">
                <button onClick={() => triggerQuickOutput('E-mail')} className="px-2.5 py-1 rounded-lg bg-slate-950 hover:bg-slate-800 text-[10px] font-semibold text-slate-300 border border-slate-800">
                  ✉️ E-mail
                </button>
                <button onClick={() => triggerQuickOutput('SMS')} className="px-2.5 py-1 rounded-lg bg-slate-950 hover:bg-slate-800 text-[10px] font-semibold text-slate-300 border border-slate-800">
                  💬 SMS
                </button>
                <button onClick={() => triggerQuickOutput('PDF Rozpočet')} className="px-2.5 py-1 rounded-lg bg-slate-950 hover:bg-slate-800 text-[10px] font-semibold text-slate-300 border border-slate-800">
                  📄 PDF
                </button>
                <button onClick={() => triggerQuickOutput('Interní poznámka')} className="px-2.5 py-1 rounded-lg bg-slate-950 hover:bg-slate-800 text-[10px] font-semibold text-slate-300 border border-slate-800">
                  📝 Poznámka
                </button>
              </div>
            </div>

            {/* Voice Mode Waveform UI */}
            {isVoiceActive && (
              <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-500/40 flex items-center justify-between animate-in fade-in">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-red-600 animate-pulse flex items-center justify-center text-white">
                    <Mic className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">Poslouchám hlasový pokyn...</p>
                    <p className="text-[10px] text-amber-300">Mluvte přirozeně v češtině</p>
                  </div>
                </div>
                {/* Simulated Audio Waveform */}
                <div className="flex items-center gap-1">
                  {[40, 70, 95, 60, 30, 80, 100, 50, 75, 40].map((h, i) => (
                    <div key={i} className="w-1 bg-amber-400 rounded-full animate-pulse" style={{ height: `${h}px`, animationDelay: `${i * 100}ms` }} />
                  ))}
                </div>
                <button onClick={() => setIsVoiceActive(false)} className="px-3 py-1 bg-slate-800 text-xs rounded-xl font-bold hover:bg-slate-700 text-slate-200">
                  Hotovo
                </button>
              </div>
            )}

            {/* Chat Input Form with Mic Button */}
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsVoiceActive(!isVoiceActive)}
                className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
                  isVoiceActive ? 'bg-red-600 text-white shadow-lg' : 'bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800'
                }`}
                title="Hlasový režim"
              >
                <Mic className="w-5 h-5" />
              </button>
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
                placeholder="Zeptejte se asistenta nebo vyberte rychlou akci..."
                className="flex-1 bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
              <button
                onClick={() => handleSendChat()}
                className="px-5 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-lg transition-all flex items-center gap-2"
              >
                <span>Odeslat</span>
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Checklist & Tasks */}
          <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-md space-y-4">
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">Kontrolní seznam & Úkoly realizace</h3>
            
            <div className="space-y-2">
              {lead.checklist.map((item) => (
                <div
                  key={item.id}
                  onClick={() => toggleChecklist(item.id)}
                  className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between cursor-pointer ${
                    item.completed ? 'bg-emerald-950/20 border-emerald-800/40 text-slate-400 line-through' : 'bg-slate-950 border-slate-800 text-slate-200 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {item.completed ? <CheckSquare className="w-5 h-5 text-emerald-400" /> : <Square className="w-5 h-5 text-slate-500" />}
                    <span className="text-xs font-semibold">{item.text}</span>
                  </div>
                  <span className="text-[10px] font-medium text-slate-500">{item.completed ? 'Splněno' : 'Čeká'}</span>
                </div>
              ))}
            </div>

            <form onSubmit={addChecklist} className="flex gap-2 pt-2">
              <input
                type="text"
                value={newChecklistText}
                onChange={(e) => setNewChecklistText(e.target.value)}
                placeholder="Přidat nový úkol nebo milník stavby..."
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
              />
              <button
                type="submit"
                className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-all flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> Přidat
              </button>
            </form>
          </div>

          {/* Material Intelligence Panel (Feature 5) */}
          <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-md space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">Materiálová bilance & Sklad</h3>
                <p className="text-xs text-slate-400">Přehled kusovníku, stav skladu a vliv na termíny montáže</p>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-950 border border-emerald-800 text-emerald-400">
                85% naskladněno
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800">
                <span className="text-[10px] font-bold uppercase text-slate-400">Potřeba</span>
                <p className="text-lg font-black text-slate-100 mt-0.5">8 položek</p>
                <p className="text-[10px] text-slate-500">Kompletní specifikace</p>
              </div>
              <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800">
                <span className="text-[10px] font-bold uppercase text-amber-400">Objednáno</span>
                <p className="text-lg font-black text-amber-400 mt-0.5">6 položek</p>
                <p className="text-[10px] text-slate-400">Dodavatel DEK a.s.</p>
              </div>
              <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800">
                <span className="text-[10px] font-bold uppercase text-emerald-400">Dodáno</span>
                <p className="text-lg font-black text-emerald-400 mt-0.5">5 položek</p>
                <p className="text-[10px] text-slate-400">Naskladněno v dílně</p>
              </div>
              <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800">
                <span className="text-[10px] font-bold uppercase text-rose-400">Chybí</span>
                <p className="text-lg font-black text-rose-400 mt-0.5">1 položka</p>
                <p className="text-[10px] text-slate-400">Kotvicí šrouby M16</p>
              </div>
            </div>

            {/* Schedule Warning Banner */}
            <div className="bg-amber-950/30 border border-amber-500/40 rounded-2xl p-4 flex items-start gap-3">
              <div className="w-5 h-5 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center flex-shrink-0 font-bold text-xs mt-0.5">
                !
              </div>
              <div className="text-xs">
                <p className="font-bold text-amber-400">Upozornění k harmonogramu:</p>
                <p className="text-slate-300 mt-0.5">
                  Kotvicí šrouby M16 mají plánované doručení zítra v 07:30. Montáž může začít v 08:00 bez zpoždění.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
