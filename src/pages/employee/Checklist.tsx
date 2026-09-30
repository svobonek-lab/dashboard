import React, { useState, useEffect } from 'react';
import { CheckSquare, CheckCircle2, Square, PenTool, Send, Check, Building } from 'lucide-react';
import { Lead } from '@/types';

interface EmployeeChecklistPageProps {
  leads: Lead[];
  onUpdateLead: (lead: Lead) => void;
}

export const EmployeeChecklistPage: React.FC<EmployeeChecklistPageProps> = ({
  leads = [],
  onUpdateLead
}) => {
  const [activeLeadId, setActiveLeadId] = useState<string>(leads[0]?.id || '');
  const [signatureDone, setSignatureDone] = useState(false);
  const [protocolSubmitted, setProtocolSubmitted] = useState(false);

  const activeLead = leads.find(l => l.id === activeLeadId) || leads[0];

  const currentChecklist = activeLead?.checklist || [];

  const completedCount = currentChecklist.filter(i => i.completed).length;

  const handleToggleItem = (itemId: string) => {
    if (activeLead && onUpdateLead) {
      const updatedChecklist = currentChecklist.map(it => {
        if (it.id === itemId) {
          const nextCompleted = !it.completed;
          // If 6th item (signature) is toggled, sync signatureDone
          if (itemId === '6') {
            setSignatureDone(nextCompleted);
          }
          return { ...it, completed: nextCompleted };
        }
        return it;
      });

      const updatedLead = {
        ...activeLead,
        checklist: updatedChecklist
      };
      onUpdateLead(updatedLead);
    }
  };

  const handleSimulateSignature = () => {
    setSignatureDone(true);
    if (activeLead && onUpdateLead) {
      const updatedChecklist = currentChecklist.map(it => 
        it.id === '6' ? { ...it, completed: true } : it
      );
      const updatedLead = {
        ...activeLead,
        checklist: updatedChecklist
      };
      onUpdateLead(updatedLead);
    }
  };

  const handleClearSignature = () => {
    setSignatureDone(false);
    if (activeLead && onUpdateLead) {
      const updatedChecklist = currentChecklist.map(it => 
        it.id === '6' ? { ...it, completed: false } : it
      );
      const updatedLead = {
        ...activeLead,
        checklist: updatedChecklist
      };
      onUpdateLead(updatedLead);
    }
  };

  const handleSubmitProtocol = () => {
    setProtocolSubmitted(true);
    setTimeout(() => setProtocolSubmitted(false), 4000);
  };

  // Sync signature status if the selected lead changes
  useEffect(() => {
    if (activeLead) {
      const isSigned = currentChecklist.find(c => c.id === '6')?.completed || false;
      setSignatureDone(isSigned);
    }
  }, [activeLeadId, activeLead]);

  return (
    <div className="space-y-6 text-slate-900 font-sans pb-12">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-brand-primary" />
            Stavební checklist & Předávací protokol
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Zkontrolujte všechny body a získejte podpis klienta pro automatické uzavření a fakturaci zakázky.
          </p>
        </div>

        {/* Lead Selector */}
        {leads.length > 0 && (
          <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
            <Building className="w-4 h-4 text-slate-500 ml-1.5" />
            <select
              value={activeLeadId}
              onChange={(e) => setActiveLeadId(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-700 outline-none pr-2 cursor-pointer"
            >
              {leads.map(l => (
                <option key={l.id} value={l.id}>
                  {l.customerName || l.title} ({l.city})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Progress Bar */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/80 space-y-3 shadow-xs">
        <div className="flex items-center justify-between text-xs font-bold">
          <span className="text-slate-700">Splněno kontrolních bodů:</span>
          <span className="text-brand-primary font-mono">{completedCount} z {currentChecklist.length}</span>
        </div>
        <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200/60">
          <div 
            className="h-full bg-brand-primary rounded-full transition-all duration-300"
            style={{ width: `${(completedCount / currentChecklist.length) * 100}%` }}
          ></div>
        </div>
      </div>

      {/* Checklist items list */}
      <div className="space-y-2.5">
        {currentChecklist.map((item) => (
          <button
            key={item.id}
            onClick={() => handleToggleItem(item.id)}
            className={`w-full min-h-[52px] p-4 rounded-2xl border text-left flex items-center gap-3 transition-all cursor-pointer ${
              item.completed 
                ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900' 
                : 'bg-white border-slate-200/80 text-slate-800 hover:border-brand-primary-soft'
            }`}
          >
            {item.completed ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <Square className="w-5 h-5 text-slate-400 shrink-0" />
            )}
            <span className={`text-xs font-semibold ${item.completed ? 'line-through text-slate-500' : 'text-slate-900'}`}>
              {item.text}
            </span>
          </button>
        ))}
      </div>

      {/* Touch Signature Pad Box */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-5 space-y-4 shadow-xs">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-900 flex items-center gap-2">
            <PenTool className="w-4 h-4 text-brand-primary" />
            Podpis investora při předání
          </h3>
          {signatureDone && (
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              Podepsáno
            </span>
          )}
        </div>

        <div className="h-32 bg-slate-50 rounded-2xl border border-dashed border-slate-300 flex flex-col items-center justify-center text-center p-4 relative overflow-hidden">
          {signatureDone ? (
            <div className="text-text space-y-1">
              <span className="font-serif italic text-2xl font-bold">{activeLead?.customerName || 'Vážený zákazník'}</span>
              <p className="text-[10px] text-emerald-700 font-mono font-bold">Časové razítko: {new Date().toLocaleTimeString('cs-CZ')}</p>
            </div>
          ) : (
            <div className="space-y-1">
              <PenTool className="w-6 h-6 text-slate-400 mx-auto" />
              <p className="text-[11px] text-slate-600 font-medium">Klikněte pro simulaci podpisu investora prstem na obrazovce</p>
            </div>
          )}

          {!signatureDone && (
            <button
              onClick={handleSimulateSignature}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            >
              Podepsat
            </button>
          )}
        </div>

        {signatureDone && (
          <button
            onClick={handleClearSignature}
            className="text-[10px] text-slate-500 hover:text-slate-900 underline font-semibold cursor-pointer"
          >
            Vymazat a podepsat znovu
          </button>
        )}
      </div>

      {/* Final Submit Protocol Action */}
      {protocolSubmitted ? (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-600" />
          <span>Předávací protokol byl odeslán na dispečink i na e-mail investora!</span>
        </div>
      ) : (
        <button
          onClick={handleSubmitProtocol}
          disabled={!signatureDone}
          className="w-full min-h-[48px] py-3.5 px-4 rounded-2xl bg-brand-primary hover:bg-brand-primary text-white font-bold text-xs transition-all shadow-xs flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          <Send className="w-4 h-4" />
          <span>Odeslat podepsaný protokol do CRM</span>
        </button>
      )}

    </div>
  );
};
