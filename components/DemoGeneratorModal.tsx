import React, { useState, useEffect } from 'react';
import { Sparkles, Globe, Loader2, ArrowRight, Building2, Check, ShieldCheck, Search, Database, Calculator } from 'lucide-react';
import { CompanyBranding, WebsiteAudit } from '../types';
import { analyzeWebsiteWithGemini } from '../lib/gemini';

interface DemoGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDemoGenerated: (branding: CompanyBranding, audit: WebsiteAudit) => void;
}

export const DemoGeneratorModal: React.FC<DemoGeneratorModalProps> = ({
  isOpen,
  onClose,
  onDemoGenerated
}) => {
  const [url, setUrl] = useState('https://novakstavby.cz');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [scanStep, setScanStep] = useState(0);
  const [scanProgress, setScanProgress] = useState(0);

  const scanStepsList = [
    'Scanning website structure & assets',
    'Detecting contact forms & lead captures',
    'Reading Google Reviews & customer sentiment',
    'Detecting missing CRM automation',
    'Calculating revenue opportunity & ROI'
  ];

  useEffect(() => {
    let timer: any;
    let progressTimer: any;
    if (isAnalyzing) {
      setScanProgress(0);
      setScanStep(0);

      progressTimer = setInterval(() => {
        setScanProgress(prev => {
          if (prev >= 100) return 100;
          return prev + 1;
        });
      }, 150); // ~15 seconds total scan time

      timer = setInterval(() => {
        setScanStep(prev => {
          if (prev < scanStepsList.length - 1) return prev + 1;
          return prev;
        });
      }, 3000);
    }
    return () => {
      clearInterval(timer);
      clearInterval(progressTimer);
    };
  }, [isAnalyzing]);

  if (!isOpen) return null;

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;

    setIsAnalyzing(true);

    try {
      const { branding, audit } = await analyzeWebsiteWithGemini(url);
      setTimeout(() => {
        setIsAnalyzing(false);
        onDemoGenerated(branding, audit);
      }, 15000); // sync with 15s scan animation
    } catch (err) {
      console.error(err);
      setIsAnalyzing(false);
    }
  };

  const presetUrls = [
    { label: 'Novák Stavby (Třinec)', url: 'https://novakstavby.cz' },
    { label: 'Alfa Stavitelé (Brno)', url: 'https://alfa-stavitelé.cz' },
    { label: 'Střechy & Pergoly s.r.o.', url: 'https://1strechy.cz' }
  ];

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden text-slate-100">
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">DemoFactory AI Scan</h2>
              <p className="text-xs text-slate-400">Deep AI analysis & personalized construction CRM builder</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center text-sm"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {isAnalyzing ? (
            <div className="py-8 text-center space-y-6">
              <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border-4 border-blue-500/20 animate-ping"></div>
                <div className="absolute inset-0 rounded-full border-4 border-blue-600 border-t-transparent animate-spin"></div>
                <span className="text-sm font-black text-blue-400 font-mono">{scanProgress}%</span>
              </div>
              
              <div className="space-y-1">
                <h3 className="text-base font-bold text-white">Deep AI Business Scan in Progress...</h3>
                <p className="text-xs text-slate-400">Analyzing <span className="text-blue-400 font-mono">{url}</span></p>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-slate-950 rounded-full h-2.5 overflow-hidden border border-slate-800">
                <div 
                  className="bg-blue-600 h-full transition-all duration-300" 
                  style={{ width: `${scanProgress}%` }}
                ></div>
              </div>

              {/* Steps appearing one by one */}
              <div className="max-w-md mx-auto space-y-2 text-left text-xs">
                {scanStepsList.map((stepText, idx) => {
                  const isDone = scanStep > idx;
                  const isCurrent = scanStep === idx;
                  return (
                    <div 
                      key={idx} 
                      className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                        isDone 
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' 
                          : isCurrent 
                          ? 'bg-blue-500/10 border-blue-500/40 text-blue-200 animate-pulse' 
                          : 'bg-slate-950 border-slate-800/80 text-slate-600'
                      }`}
                    >
                      {isDone ? (
                        <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                      ) : isCurrent ? (
                        <Loader2 className="w-4 h-4 text-blue-400 animate-spin flex-shrink-0" />
                      ) : (
                        <div className="w-4 h-4 rounded-full border border-slate-700 flex-shrink-0" />
                      )}
                      <span className="font-medium">{stepText}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <form onSubmit={handleGenerate} className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300">Construction Company Website URL</label>
                <div className="relative">
                  <Globe className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="url"
                    required
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://example.cz"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-xs font-medium text-slate-400">Quick Demo Presets:</span>
                <div className="grid grid-cols-1 gap-2">
                  {presetUrls.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setUrl(preset.url)}
                      className="text-left px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800/80 hover:border-slate-700 hover:bg-slate-800/50 transition-all flex items-center justify-between text-xs"
                    >
                      <span className="font-semibold text-slate-200">{preset.label}</span>
                      <span className="text-slate-500 font-mono">{preset.url}</span>
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-500 shadow-lg transition-all flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                <span>Run AI Deep Business Scan & Generate Demo</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
