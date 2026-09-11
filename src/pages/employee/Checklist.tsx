import React, { useState } from 'react';
import { CheckSquare, CheckCircle2, Square, PenTool, Sparkles, Send, ShieldCheck, Check } from 'lucide-react';

export const EmployeeChecklistPage: React.FC = () => {
  const [items, setItems] = useState([
    { id: '1', text: 'Bezpečnostní kontrola pracoviště (BOZP) & OOPP', completed: true },
    { id: '2', text: 'Laserové zaměření rovin a kontrola stavební připravenosti', completed: true },
    { id: '3', text: 'Kotvení profilů k fasádě a nosné zdi domu', completed: true },
    { id: '4', text: 'Montáž motorického pohonu lamel a odzkoušení chodu', completed: false },
    { id: '5', text: 'Začištění pracoviště, úklid odřezků a odvoz odpadu', completed: false },
    { id: '6', text: 'Podpis předávacího protokolu investorem na tabletu', completed: false },
  ]);

  const [signatureDone, setSignatureDone] = useState(false);
  const [protocolSubmitted, setProtocolSubmitted] = useState(false);

  const handleToggleItem = (id: string) => {
    setItems(items.map(it => it.id === id ? { ...it, completed: !it.completed } : it));
  };

  const completedCount = items.filter(i => i.completed).length;
  const allCompleted = completedCount === items.length;

  return (
    <div className="space-y-6 text-slate-100 font-sans pb-12">
      
      {/* Header */}
      <div>
        <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
          <CheckSquare className="w-5 h-5 text-emerald-400" />
          Stavební checklist & Předávací protokol
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Zakázka: <strong className="text-white">Pergola 6x4m - Ing. Jan Svoboda</strong>
        </p>
      </div>

      {/* Progress Bar */}
      <div className="bg-[#111726] p-4 rounded-3xl border border-slate-800 space-y-2">
        <div className="flex items-center justify-between text-xs font-bold">
          <span className="text-slate-300">Splněno kontrolních bodů:</span>
          <span className="text-emerald-400 font-mono">{completedCount} z {items.length}</span>
        </div>
        <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden">
          <div 
            className="h-full bg-emerald-500 rounded-full transition-all duration-300"
            style={{ width: `${(completedCount / items.length) * 100}%` }}
          ></div>
        </div>
      </div>

      {/* Checklist items list */}
      <div className="space-y-2.5">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => handleToggleItem(item.id)}
            className={`w-full min-h-[52px] p-4 rounded-2xl border text-left flex items-center gap-3 transition-all ${
              item.completed 
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200' 
                : 'bg-[#111726] border-slate-800 text-slate-200 hover:border-slate-700'
            }`}
          >
            {item.completed ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : (
              <Square className="w-5 h-5 text-slate-500 shrink-0" />
            )}
            <span className={`text-xs font-semibold ${item.completed ? 'line-through opacity-80' : ''}`}>
              {item.text}
            </span>
          </button>
        ))}
      </div>

      {/* Touch Signature Pad Box */}
      <div className="bg-[#111726] border border-slate-800 rounded-3xl p-5 space-y-4 shadow-lg">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-white flex items-center gap-2">
            <PenTool className="w-4 h-4 text-emerald-400" />
            Podpis investora při předání
          </h3>
          {signatureDone && (
            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
              Podepsáno
            </span>
          )}
        </div>

        <div className="h-32 bg-[#0B0F19] rounded-2xl border border-dashed border-slate-700 flex flex-col items-center justify-center text-center p-4 relative overflow-hidden">
          {signatureDone ? (
            <div className="text-emerald-400 space-y-1">
              <span className="font-serif italic text-2xl">Jan Svoboda</span>
              <p className="text-[10px] text-slate-500 font-mono">Časové razítko: {new Date().toLocaleTimeString('cs-CZ')}</p>
            </div>
          ) : (
            <div className="space-y-1">
              <PenTool className="w-6 h-6 text-slate-500 mx-auto" />
              <p className="text-[11px] text-slate-400 font-medium">Klikněte pro simulaci podpisu investora prstem na obrazovce</p>
            </div>
          )}

          {!signatureDone && (
            <button
              onClick={() => setSignatureDone(true)}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            >
              Podepsat
            </button>
          )}
        </div>

        {signatureDone && (
          <button
            onClick={() => setSignatureDone(false)}
            className="text-[10px] text-slate-400 hover:text-white underline font-semibold"
          >
            Vymazat a podepsat znovu
          </button>
        )}
      </div>

      {/* Final Submit Protocol Action */}
      {protocolSubmitted ? (
        <div className="p-4 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-2">
          <Check className="w-4 h-4" />
          <span>Předávací protokol byl odeslán na dispečink i na e-mail investora!</span>
        </div>
      ) : (
        <button
          onClick={() => setProtocolSubmitted(true)}
          disabled={!signatureDone}
          className="w-full min-h-[48px] py-3.5 px-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Send className="w-4 h-4" />
          <span>Odeslat podepsaný protokol do CRM</span>
        </button>
      )}

    </div>
  );
};
