import React, { useState } from 'react';
import { 
  Phone, 
  Mail, 
  MessageSquare, 
  Send, 
  Clock, 
  User, 
  CheckCheck, 
  Calendar, 
  Sparkles,
  PhoneCall,
  PhoneIncoming,
  PhoneOutgoing
} from 'lucide-react';
import { Lead } from '../../types';

interface CommunicationTabProps {
  lead: Lead;
  onNotice: (msg: string) => void;
}

interface CommLog {
  id: string;
  type: 'call' | 'sms' | 'email';
  direction: 'in' | 'out';
  timestamp: string;
  senderOrRecipient: string;
  subjectOrDuration: string;
  content: string;
  status?: 'Doručeno' | 'Přečteno' | 'Zodpovězeno' | 'Zmeškáno';
}

export const CommunicationTab: React.FC<CommunicationTabProps> = ({ lead, onNotice }) => {
  const [logs, setLogs] = useState<CommLog[]>([]);

  const [channel, setChannel] = useState<'sms' | 'email'>('sms');
  const [recipient, setRecipient] = useState(lead.customerPhone || '');
  const [messageText, setMessageText] = useState('');

  const applyTemplate = (tmpl: string) => {
    setMessageText(tmpl);
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim()) return;

    const newLog: CommLog = {
      id: 'c-' + Date.now(),
      type: channel,
      direction: 'out',
      timestamp: 'Právě teď',
      senderOrRecipient: recipient || (channel === 'sms' ? lead.customerPhone : lead.customerEmail),
      subjectOrDuration: channel === 'sms' ? 'SMS zpráva' : `Zpráva k zakázce ${lead.title}`,
      content: messageText,
      status: 'Doručeno'
    };

    setLogs(prev => [newLog, ...prev]);
    setMessageText('');
    onNotice(`${channel.toUpperCase()} zpráva byla úspěšně odeslána na ${recipient || 'kontakt klienta'}.`);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-sans">
      {/* Left Column: Timeline of Communications */}
      <div className="lg:col-span-2 space-y-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
            <div>
              <h2 className="text-sm font-black text-slate-900">Historie kontaktů a komunikace</h2>
              <p className="text-xs text-slate-500 mt-0.5">Všechny telefonáty, SMS i e-maily vedené s klientem</p>
            </div>
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-[#0A84FF] border border-blue-200">
              {logs.length} záznamů
            </span>
          </div>

          <div className="space-y-3">
            {logs.map(log => (
              <div key={log.id} className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 transition-all space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className={`p-1.5 rounded-lg ${
                      log.type === 'call' ? 'bg-emerald-100 text-emerald-700' :
                      log.type === 'sms' ? 'bg-sky-100 text-sky-700' :
                      'bg-purple-100 text-purple-700'
                    }`}>
                      {log.type === 'call' ? <Phone className="w-3.5 h-3.5" /> :
                       log.type === 'sms' ? <MessageSquare className="w-3.5 h-3.5" /> :
                       <Mail className="w-3.5 h-3.5" />}
                    </span>
                    <strong className="text-slate-900 font-bold">
                      {log.type === 'call' ? 'Telefonát' : log.type === 'sms' ? 'SMS zpráva' : 'E-mail'}
                    </strong>
                    <span className="text-slate-400">·</span>
                    <span className="text-slate-600 font-medium">{log.subjectOrDuration}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 text-[11px]">{log.timestamp}</span>
                    {log.status && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white border border-slate-200 text-slate-700 flex items-center gap-1">
                        <CheckCheck className="w-3 h-3 text-[#0A84FF]" />
                        {log.status}
                      </span>
                    )}
                  </div>
                </div>

                <p className="text-xs text-slate-700 leading-relaxed pl-8">
                  {log.content}
                </p>

                <div className="pl-8 text-[11px] text-slate-500 font-medium">
                  {log.direction === 'out' ? 'Odesílatel / Cíl: ' : 'Volající: '}
                  <span className="text-slate-800">{log.senderOrRecipient}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Column: Send New Message Composer */}
      <div className="space-y-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
              Odeslat zprávu klientovi
            </h3>
            <div className="flex bg-slate-100 p-0.5 rounded-lg text-[11px] font-bold">
              <button
                type="button"
                onClick={() => { setChannel('sms'); setRecipient(lead.customerPhone || ''); }}
                className={`px-2.5 py-1 rounded-md transition-all ${channel === 'sms' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'}`}
              >
                SMS
              </button>
              <button
                type="button"
                onClick={() => { setChannel('email'); setRecipient(lead.customerEmail || ''); }}
                className={`px-2.5 py-1 rounded-md transition-all ${channel === 'email' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'}`}
              >
                E-mail
              </button>
            </div>
          </div>

          {/* Quick templates */}
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
              Rychlé stavební šablony
            </span>
            <div className="space-y-1.5 text-xs">
              <button
                type="button"
                onClick={() => applyTemplate(`Dobrý den, potvrzujeme zítřejší příjezd realizační party na adresu ${lead.address} v 08:30 hod.`)}
                className="w-full text-left p-2 rounded-xl border border-slate-200 hover:border-[#0A84FF] hover:bg-blue-50/40 transition-colors text-[11px] text-slate-700"
              >
                📅 Potvrzení příjezdu party
              </button>
              <button
                type="button"
                onClick={() => applyTemplate(`Dobrý den, položkový rozpočet pro zakázku ${lead.title} je připraven k náhledu ve vašem klientském portálu.`)}
                className="w-full text-left p-2 rounded-xl border border-slate-200 hover:border-[#0A84FF] hover:bg-blue-50/40 transition-colors text-[11px] text-slate-700"
              >
                📋 Odeslání rozpočtu k náhledu
              </button>
              <button
                type="button"
                onClick={() => applyTemplate(`Dobrý den, montáž byla úspěšně dokončena. Přikládáme předávací protokol k podpisu a děkujeme za spolupráci.`)}
                className="w-full text-left p-2 rounded-xl border border-slate-200 hover:border-[#0A84FF] hover:bg-blue-50/40 transition-colors text-[11px] text-slate-700"
              >
                ✅ Dokončení díla a protokol
              </button>
            </div>
          </div>

          <form onSubmit={handleSendMessage} className="space-y-3 pt-2">
            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1">Příjemce</label>
              <input
                type="text"
                value={recipient}
                onChange={e => setRecipient(e.target.value)}
                placeholder={channel === 'sms' ? '+420 777 ...' : 'klient@email.cz'}
                className="w-full p-2 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:outline-none focus:border-[#0A84FF]"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1">Text zprávy</label>
              <textarea
                rows={4}
                value={messageText}
                onChange={e => setMessageText(e.target.value)}
                placeholder="Zadejte text zprávy..."
                className="w-full p-2.5 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:outline-none focus:border-[#0A84FF]"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-[#0A84FF] hover:bg-blue-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-2xs"
            >
              <Send className="w-3.5 h-3.5" />
              Odeslat {channel.toUpperCase()}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
