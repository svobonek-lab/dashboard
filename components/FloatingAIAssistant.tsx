import React, { useState } from 'react';
import { Sparkles, MessageSquare, X, Send, Bot, User, ArrowRight, AlertCircle, CheckCircle } from 'lucide-react';
import { CompanyBranding, Lead } from '../types';

interface FloatingAIAssistantProps {
  branding: CompanyBranding;
  leads: Lead[];
}

export const FloatingAIAssistant: React.FC<FloatingAIAssistantProps> = ({ branding, leads }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Array<{ id: string; sender: 'ai' | 'user'; text: string; time: string }>>([
    {
      id: '1',
      sender: 'ai',
      text: `Hello Jan! I am your ${branding.name} Executive AI Copilot. What would you like to analyze or execute today?`,
      time: '09:00'
    }
  ]);
  const [inputVal, setInputVal] = useState('');

  const quickPrompts = [
    "What should I do next?",
    "Show me urgent overdue leads",
    "Who is overloaded today?",
    "Summarize weekly revenue"
  ];

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
      let aiReply = "I have analyzed your request based on current pipeline data.";
      const lower = text.toLowerCase();
      if (lower.includes('next') || lower.includes('urgent')) {
        aiReply = "You have 2 quotes waiting over 48 hours (Ing. Jan Svoboda & Marta Dvořáková). I recommend calling them today to secure the 700k CZK pipeline.";
      } else if (lower.includes('overload')) {
        aiReply = "Jan Richter is currently at 100% capacity with 4 active jobs. Recommend reassigning new incoming masonry inquiries to Petr Novotný (85% capacity).";
      } else if (lower.includes('revenue') || lower.includes('summary')) {
        aiReply = "Total active revenue is 1,560,000 CZK across 6 projects. Projected monthly growth is +24.5%.";
      }

      setMessages(prev => [...prev, {
        id: 'msg-' + (Date.now() + 1),
        sender: 'ai',
        text: aiReply,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    }, 800);
  };

  return (
    <>
      {/* Floating Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-2xl bg-slate-900 text-white shadow-2xl flex items-center justify-center hover:scale-105 transition-all ring-4 ring-blue-500/20 group"
      >
        <Sparkles className="w-6 h-6 text-blue-400 group-hover:rotate-12 transition-transform" />
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 w-96 bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[520px] text-slate-100 animate-in fade-in slide-in-from-bottom-5">
          {/* Header */}
          <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/80 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Executive AI Copilot</h3>
                <p className="text-[10px] text-emerald-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Active • {branding.name}
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="w-8 h-8 rounded-lg bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center text-xs"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-950/50">
            {messages.map((m) => (
              <div key={m.id} className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] p-3.5 rounded-2xl text-xs space-y-1 ${
                  m.sender === 'user'
                    ? 'bg-blue-600 text-white rounded-br-xs'
                    : 'bg-slate-800 text-slate-200 rounded-bl-xs border border-slate-700/60'
                }`}>
                  <p className="leading-relaxed">{m.text}</p>
                  <p className={`text-[9px] text-right ${m.sender === 'user' ? 'text-blue-200' : 'text-slate-400'}`}>{m.time}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Quick Prompts */}
          <div className="p-3 bg-slate-900 border-t border-slate-800 flex gap-2 overflow-x-auto no-scrollbar">
            {quickPrompts.map((prompt, i) => (
              <button
                key={i}
                onClick={() => handleSend(prompt)}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-300 whitespace-nowrap border border-slate-700 transition-all"
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Input Box */}
          <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center gap-2">
            <input
              type="text"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Ask AI Copilot anything..."
              className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            />
            <button
              onClick={() => handleSend()}
              className="w-10 h-10 rounded-xl bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center transition-all"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
};
