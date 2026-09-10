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
    <div className="space-y-8 pb-16">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-all shadow-xs"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Kanban</span>
        </button>

        <div className="flex items-center gap-3">
          <span className={`px-3.5 py-1.5 rounded-full text-xs font-bold ${
            lead.status === 'New' ? 'bg-blue-100 text-blue-700' :
            lead.status === 'In Progress' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
          }`}>
            Status: {lead.status}
          </span>
          <span className="px-4 py-1.5 rounded-full text-xs font-extrabold bg-slate-900 text-white shadow-sm">
            {(lead.price).toLocaleString()} CZK
          </span>
        </div>
      </div>

      {/* Customer Timeline (Requirement 4) */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-600" />
            Customer Journey & Project Timeline
          </h3>
          <span className="text-xs text-slate-500">Live Status Tracker</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-6 gap-3 pt-2">
          {defaultTimeline.map((step, index) => {
            const isCompleted = step.status === 'Completed';
            const isCurrent = step.status === 'Current';
            return (
              <div 
                key={step.id} 
                className={`p-3.5 rounded-2xl border transition-all relative ${
                  isCompleted ? 'bg-emerald-50/60 border-emerald-200 text-emerald-900' :
                  isCurrent ? 'bg-blue-50/80 border-blue-300 ring-2 ring-blue-500/20 text-blue-900' :
                  'bg-slate-50 border-slate-200 text-slate-400'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold">Step {index + 1}</span>
                  {isCompleted ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <div className={`w-2 h-2 rounded-full ${isCurrent ? 'bg-blue-600 animate-pulse' : 'bg-slate-300'}`} />}
                </div>
                <p className="text-xs font-bold mt-2 truncate text-slate-900">{step.title}</p>
                <p className="text-[10px] mt-1 text-slate-500 truncate">{step.timestamp || 'Pending'}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column (Photos, Description, Address, Weather) */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-6">
            <div>
              <span className="text-xs font-semibold text-rose-500 uppercase tracking-wider">{lead.priority} Priority</span>
              <h2 className="text-xl font-extrabold text-slate-900 mt-1">{lead.title}</h2>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">{lead.description}</p>
            </div>

            <div className="space-y-3 pt-4 border-t border-slate-100 text-xs text-slate-700">
              <div className="flex items-center gap-3">
                <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <span>{lead.address}</span>
              </div>
              <div className="flex items-center gap-3">
                <User className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <span className="font-semibold">{lead.customerName}</span>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <a href={`tel:${lead.customerPhone}`} className="text-blue-600 font-semibold hover:underline">{lead.customerPhone}</a>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <span>{lead.customerEmail}</span>
              </div>
              <div className="flex items-center gap-3">
                <Calendar className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <span>Preferred Date: {lead.preferredDate}</span>
              </div>
            </div>

            {/* Weather Integration (Requirement 8) */}
            <WeatherWidget weather={lead.weather} />

            {/* Photos Gallery */}
            <div className="space-y-3 pt-4 border-t border-slate-100">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center justify-between">
                <span>Site Photos & Gallery</span>
                <button onClick={onOpenVoiceNotes} className="text-blue-600 font-semibold hover:underline flex items-center gap-1">
                  <Camera className="w-3.5 h-3.5" /> Upload
                </button>
              </h3>
              
              <div className="grid grid-cols-2 gap-2">
                <div 
                  onClick={() => onOpenPhoto(lead.thumbnail, lead.title, 'Project View')}
                  className="rounded-xl overflow-hidden h-24 border border-slate-200 cursor-pointer relative group"
                >
                  <img src={lead.thumbnail} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-all" />
                  <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded text-[9px] bg-slate-900/80 text-white font-medium">Main</span>
                </div>
                {lead.photos.map(p => (
                  <div 
                    key={p.id}
                    onClick={() => onOpenPhoto(p.url, p.name, p.category || 'Photo')}
                    className="rounded-xl overflow-hidden h-24 border border-slate-200 cursor-pointer relative group"
                  >
                    <img src={p.url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-all" />
                    <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded text-[9px] bg-slate-900/80 text-white font-medium">{p.category}</span>
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
            <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-600/30 border border-blue-500/40 flex items-center justify-center text-blue-400">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold tracking-tight text-white flex items-center gap-2">
                    Gemini Project Assistant
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      Memory Active
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400">Remembering Customer • Materials • Photos • Deadlines</p>
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
                    <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white flex-shrink-0 text-xs font-bold mt-1">
                      AI
                    </div>
                  )}
                  <div className={`p-3.5 rounded-2xl text-xs leading-relaxed max-w-lg ${
                    msg.sender === 'user' ? 'bg-blue-600 text-white rounded-tr-xs' : 'bg-slate-800 text-slate-200 rounded-tl-xs border border-slate-700/60 whitespace-pre-line'
                  }`}>
                    {msg.text}
                    <p className="text-[9px] text-slate-400 mt-1 text-right">{msg.timestamp}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Contextual Action Buttons */}
            <div className="space-y-1.5 pt-2">
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Suggested Contextual Actions:</p>
              <div className="flex flex-wrap gap-2">
                {[
                  'Prepare follow-up email',
                  'Call customer',
                  'Create shopping list',
                  'Generate invoice',
                  'Schedule next visit'
                ].map((action, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendChat(action)}
                    className="px-3 py-1.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/40 border border-blue-500/40 text-[11px] text-blue-300 font-semibold transition-all flex items-center gap-1"
                  >
                    <Sparkles className="w-3 h-3 text-blue-400" />
                    {action}
                  </button>
                ))}
              </div>
            </div>

            {/* One-Click Outputs Toolbar */}
            <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">One-Click Instant Outputs:</span>
              <div className="flex items-center gap-2">
                <button onClick={() => triggerQuickOutput('Email')} className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[10px] font-semibold text-slate-300 border border-slate-700">
                  ✉️ Email
                </button>
                <button onClick={() => triggerQuickOutput('SMS')} className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[10px] font-semibold text-slate-300 border border-slate-700">
                  💬 SMS
                </button>
                <button onClick={() => triggerQuickOutput('PDF Summary')} className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[10px] font-semibold text-slate-300 border border-slate-700">
                  📄 PDF
                </button>
                <button onClick={() => triggerQuickOutput('Internal Note')} className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[10px] font-semibold text-slate-300 border border-slate-700">
                  📝 Note
                </button>
              </div>
            </div>

            {/* Voice Mode Waveform UI */}
            {isVoiceActive && (
              <div className="p-4 rounded-2xl bg-blue-950/80 border border-blue-500/40 flex items-center justify-between animate-in fade-in">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-red-600 animate-pulse flex items-center justify-center text-white">
                    <Mic className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">Listening to voice command...</p>
                    <p className="text-[10px] text-blue-300">Speak naturally in Czech or English</p>
                  </div>
                </div>
                {/* Simulated Audio Waveform */}
                <div className="flex items-center gap-1">
                  {[40, 70, 95, 60, 30, 80, 100, 50, 75, 40].map((h, i) => (
                    <div key={i} className="w-1 bg-blue-400 rounded-full animate-pulse" style={{ height: `${h}px`, animationDelay: `${i * 100}ms` }} />
                  ))}
                </div>
                <button onClick={() => setIsVoiceActive(false)} className="px-3 py-1 bg-slate-800 text-xs rounded-xl font-bold hover:bg-slate-700">
                  Done
                </button>
              </div>
            )}

            {/* Chat Input Form with Mic Button */}
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsVoiceActive(!isVoiceActive)}
                className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
                  isVoiceActive ? 'bg-red-600 text-white shadow-lg' : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                }`}
                title="Voice Mode"
              >
                <Mic className="w-5 h-5" />
              </button>
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
                placeholder="Ask Gemini assistant or select action above..."
                className="flex-1 bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              />
              <button
                onClick={() => handleSendChat()}
                className="px-5 py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg transition-all flex items-center gap-2"
              >
                <span>Send</span>
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Checklist & Tasks */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Project Checklist & Tasks</h3>
            
            <div className="space-y-2">
              {lead.checklist.map((item) => (
                <div
                  key={item.id}
                  onClick={() => toggleChecklist(item.id)}
                  className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between cursor-pointer ${
                    item.completed ? 'bg-emerald-50/50 border-emerald-200 text-slate-700 line-through' : 'bg-slate-50 border-slate-200 text-slate-900 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {item.completed ? <CheckSquare className="w-5 h-5 text-emerald-600" /> : <Square className="w-5 h-5 text-slate-400" />}
                    <span className="text-xs font-semibold">{item.text}</span>
                  </div>
                  <span className="text-[10px] font-medium text-slate-400">{item.completed ? 'Done' : 'Pending'}</span>
                </div>
              ))}
            </div>

            <form onSubmit={addChecklist} className="flex gap-2 pt-2">
              <input
                type="text"
                value={newChecklistText}
                onChange={(e) => setNewChecklistText(e.target.value)}
                placeholder="Add new task or milestone..."
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
              <button
                type="submit"
                className="px-4 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-all flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> Add
              </button>
            </form>
          </div>

          {/* Material Intelligence Panel (Feature 5) */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Material Intelligence & Inventory</h3>
                <p className="text-xs text-slate-500">Live BOM status, warehouse stock, and schedule impact warnings</p>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                85% Stocked
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
                <span className="text-[10px] font-bold uppercase text-slate-400">Required</span>
                <p className="text-lg font-black text-slate-900 mt-0.5">8 položek</p>
                <p className="text-[10px] text-slate-500">Kompletní specifikace</p>
              </div>
              <div className="p-3 bg-blue-50/60 rounded-2xl border border-blue-200">
                <span className="text-[10px] font-bold uppercase text-blue-500">Ordered</span>
                <p className="text-lg font-black text-blue-900 mt-0.5">6 položek</p>
                <p className="text-[10px] text-blue-600">Dodavatel DEK a.s.</p>
              </div>
              <div className="p-3 bg-emerald-50/60 rounded-2xl border border-emerald-200">
                <span className="text-[10px] font-bold uppercase text-emerald-600">Delivered</span>
                <p className="text-lg font-black text-emerald-900 mt-0.5">5 položek</p>
                <p className="text-[10px] text-emerald-600">Naskladněno v dílně</p>
              </div>
              <div className="p-3 bg-amber-50/60 rounded-2xl border border-amber-200">
                <span className="text-[10px] font-bold uppercase text-amber-600">Missing</span>
                <p className="text-lg font-black text-amber-900 mt-0.5">1 položka</p>
                <p className="text-[10px] text-amber-700">Kotvicí šrouby M16</p>
              </div>
            </div>

            {/* Schedule Warning Banner */}
            <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-4 flex items-start gap-3">
              <div className="w-5 h-5 rounded-lg bg-amber-500 text-white flex items-center justify-center flex-shrink-0 font-bold text-xs mt-0.5">
                !
              </div>
              <div className="text-xs">
                <p className="font-bold text-amber-900">Upozornění k harmonogramu:</p>
                <p className="text-amber-800 mt-0.5">
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
