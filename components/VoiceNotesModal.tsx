import React, { useState, useEffect } from 'react';
import { Mic, Square, Sparkles, Check, ArrowRight, User, DollarSign, ListChecks, Phone } from 'lucide-react';
import { useVoiceNotes, ParsedVoiceLead } from '../hooks/useVoiceNotes';

interface VoiceNotesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveNote: (note: { duration: string; transcript: string }) => void;
  onCreateLeadFromVoice?: (parsed: ParsedVoiceLead) => void;
  hasActiveLead?: boolean;
}

export const VoiceNotesModal: React.FC<VoiceNotesModalProps> = ({
  isOpen,
  onClose,
  onSaveNote,
  onCreateLeadFromVoice,
  hasActiveLead = false,
}) => {
  const { isRecording, liveTranscript, hasSpeechRecognition, startRecording, stopRecording, parseVoiceTranscriptToLead } = useVoiceNotes();
  const [seconds, setSeconds] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [parsedLead, setParsedLead] = useState<ParsedVoiceLead | null>(null);

  useEffect(() => {
    let interval: any;
    if (isRecording) {
      interval = setInterval(() => {
        setSeconds((s) => s + 1);
      }, 1000);
    } else {
      setSeconds(0);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  useEffect(() => {
    if (isRecording && liveTranscript) {
      setTranscript(liveTranscript);
    }
  }, [isRecording, liveTranscript]);

  if (!isOpen) return null;

  const handleStart = () => {
    setParsedLead(null);
    setTranscript('');
    startRecording();
  };

  const handleStop = async () => {
    const result = await stopRecording();
    setTranscript(result.transcript);
    const parsed = parseVoiceTranscriptToLead(result.transcript);
    setParsedLead(parsed);
  };

  const handleSaveToActiveLead = () => {
    onSaveNote({
      duration: `0:${seconds < 10 ? '0' + seconds : seconds}`,
      transcript: transcript || 'Hlasový záznam ze stavby.',
    });
    onClose();
  };

  const handleCreateKanbanLead = () => {
    if (parsedLead && onCreateLeadFromVoice) {
      onCreateLeadFromVoice(parsedLead);
    }
    onClose();
  };

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remSecs = secs % 60;
    return `${mins}:${remSecs < 10 ? '0' : ''}${remSecs}`;
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-6 text-slate-100 space-y-5">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
              <Mic className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                Hlasový diktát & AI Kanban Pipeline
                {hasSpeechRecognition && (
                  <span className="text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800 px-1.5 py-0.5 rounded-full">
                    Web Speech Live
                  </span>
                )}
              </h3>
              <p className="text-[11px] text-slate-400">Automatický přepis a strukturování zakázky ze staveniště</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800">
            ✕
          </button>
        </div>

        {/* Recording Animation & Timer */}
        <div className="py-4 text-center space-y-3">
          <div
            className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center transition-all ${
              isRecording
                ? 'bg-rose-500/20 text-rose-500 ring-8 ring-rose-500/10 animate-pulse'
                : 'bg-slate-800 text-slate-300'
            }`}
          >
            <Mic className="w-8 h-8" />
          </div>

          <div>
            <p className="text-xl font-mono font-bold text-white">{formatTime(seconds)}</p>
            <p className="text-xs text-slate-400 mt-1">
              {isRecording
                ? 'Aktivní nahrávání hlasu... Mluvte přirozeně v češtině.'
                : transcript
                ? 'Přepis dokončen a analyzován'
                : 'Stiskněte tlačítko pro zahájení diktátu'}
            </p>
          </div>

          {/* Transcript preview */}
          {(isRecording || transcript) && (
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs text-slate-300 text-left space-y-1">
              <span className="text-blue-400 font-semibold flex items-center gap-1 text-[11px]">
                <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                {isRecording ? 'Živý přepis mluveného slova:' : 'Výsledný text:'}
              </span>
              <p className="italic text-slate-200 leading-relaxed">
                "{transcript || liveTranscript || 'Poslouchám...'}"
              </p>
            </div>
          )}

          {/* Structured AI Lead Extraction */}
          {parsedLead && (
            <div className="p-3.5 bg-slate-950/80 rounded-2xl border border-blue-900/40 text-left space-y-2.5 animate-in fade-in">
              <div className="flex items-center justify-between text-xs border-b border-slate-800 pb-2">
                <span className="font-bold text-blue-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-blue-400" /> AI strukturovaná zakázka
                </span>
                <span className="text-[10px] bg-blue-950 text-blue-300 px-2 py-0.5 rounded-md border border-blue-800 font-mono">
                  {parsedLead.projectType}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="flex items-center gap-1.5 text-slate-300">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span className="font-medium text-white">{parsedLead.customerName}</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-300">
                  <DollarSign className="w-3.5 h-3.5 text-slate-400" />
                  <span className="font-medium text-white">{parsedLead.budget.toLocaleString()} CZK</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-300 col-span-2">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span className="font-mono text-slate-300">{parsedLead.phone}</span>
                </div>
              </div>

              {parsedLead.checklist.length > 0 && (
                <div className="text-[11px] text-slate-300 space-y-1 pt-1 border-t border-slate-900">
                  <div className="font-semibold text-slate-400 flex items-center gap-1 text-[10px] uppercase">
                    <ListChecks className="w-3 h-3 text-slate-400" /> Doporučený checklist úkolů:
                  </div>
                  <ul className="list-disc list-inside space-y-0.5 text-slate-300 text-[10px]">
                    {parsedLead.checklist.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center justify-center gap-2 pt-2 border-t border-slate-800">
          {!isRecording && !transcript && (
            <button
              onClick={handleStart}
              className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs flex items-center gap-2 shadow-lg transition-colors"
            >
              <Mic className="w-4 h-4" /> Spustit nahrávání hlasu
            </button>
          )}

          {isRecording && (
            <button
              onClick={handleStop}
              className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs flex items-center gap-2 transition-colors"
            >
              <Square className="w-4 h-4 text-rose-400" /> Ukončit nahrávání & analyzovat
            </button>
          )}

          {transcript && !isRecording && (
            <>
              <button
                onClick={handleStart}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
              >
                Nahrát znovu
              </button>

              {hasActiveLead && (
                <button
                  onClick={handleSaveToActiveLead}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <Check className="w-3.5 h-3.5 text-emerald-400" /> Uložit poznámku k zakázce
                </button>
              )}

              {onCreateLeadFromVoice && (
                <button
                  onClick={handleCreateKanbanLead}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-2 shadow-md transition-colors"
                >
                  <ArrowRight className="w-4 h-4" /> Vytvořit novou zakázku na Kanban
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
