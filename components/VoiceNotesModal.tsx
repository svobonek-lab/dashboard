import React, { useState, useEffect } from 'react';
import { Mic, Square, Sparkles, Check } from 'lucide-react';
import { useVoiceNotes } from '../hooks/useVoiceNotes';

interface VoiceNotesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveNote: (note: { duration: string; transcript: string }) => void;
}

export const VoiceNotesModal: React.FC<VoiceNotesModalProps> = ({
  isOpen,
  onClose,
  onSaveNote
}) => {
  const { isRecording, startRecording, stopRecording } = useVoiceNotes();
  const [seconds, setSeconds] = useState(0);
  const [transcript, setTranscript] = useState('');

  useEffect(() => {
    let interval: any;
    if (isRecording) {
      interval = setInterval(() => {
        setSeconds(s => s + 1);
      }, 1000);
    } else {
      setSeconds(0);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  if (!isOpen) return null;

  const handleStart = () => {
    startRecording();
    setTranscript('');
  };

  const handleStop = async () => {
    const result = await stopRecording();
    setTranscript(result.transcript);
  };

  const handleFinish = () => {
    onSaveNote({
      duration: `0:${seconds < 10 ? '0' + seconds : seconds}`,
      transcript: transcript || 'Hlasová poznámka pořízena na staveništi.'
    });
    onClose();
  };

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remSecs = secs % 60;
    return `${mins}:${remSecs < 10 ? '0' : ''}${remSecs}`;
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-6 text-slate-100 text-center space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Mic className="w-4 h-4 text-rose-500 animate-pulse" />
            Voice Note & AI Transcription
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white">✕</button>
        </div>

        <div className="py-8 space-y-4">
          <div className={`w-24 h-24 mx-auto rounded-full flex items-center justify-center transition-all ${
            isRecording ? 'bg-rose-500/20 text-rose-500 ring-8 ring-rose-500/10 animate-pulse' : 'bg-slate-800 text-slate-300'
          }`}>
            <Mic className="w-10 h-10" />
          </div>

          <div>
            <p className="text-2xl font-mono font-bold text-white">{formatTime(seconds)}</p>
            <p className="text-xs text-slate-400 mt-1">
              {isRecording ? 'Recording active voice note...' : transcript ? 'Transcription ready' : 'Tap microphone to start recording'}
            </p>
          </div>

          {transcript && (
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs text-slate-300 text-left">
              <span className="text-blue-400 font-semibold block mb-1">AI Transcript:</span>
              "{transcript}"
            </div>
          )}
        </div>

        <div className="flex items-center justify-center gap-3">
          {!isRecording && !transcript && (
            <button
              onClick={handleStart}
              className="px-6 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs flex items-center gap-2 shadow-lg"
            >
              <Mic className="w-4 h-4" /> Start Recording
            </button>
          )}

          {isRecording && (
            <button
              onClick={handleStop}
              className="px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs flex items-center gap-2"
            >
              <Square className="w-4 h-4 text-rose-400" /> Stop Recording
            </button>
          )}

          {transcript && (
            <button
              onClick={handleFinish}
              className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-2"
            >
              <Check className="w-4 h-4" /> Save to Lead
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
