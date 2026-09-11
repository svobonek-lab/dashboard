import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, 
  Globe, 
  ArrowRight, 
  Building2, 
  Check, 
  ShieldCheck, 
  Search, 
  Database, 
  Calculator,
  Scan,
  Palette,
  Layers,
  Star,
  Cpu,
  LayoutDashboard,
  CheckCircle2,
  ExternalLink,
  Zap,
  TrendingUp,
  Flame,
  FileCheck,
  ChevronRight,
  Shield,
  Activity,
  Award,
  Users,
  MapPin,
  RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { CompanyBranding, WebsiteAudit } from '../types';
import { analyzeWebsiteWithGemini } from '../lib/gemini';

interface DemoGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDemoGenerated: (branding: CompanyBranding, audit: WebsiteAudit) => void;
}

interface TimelineStepConfig {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  tag: string;
}

const TIMELINE_STEPS: TimelineStepConfig[] = [
  {
    id: 'scan',
    title: 'Scanning Website',
    subtitle: 'Analyzing DOM structure, meta tags & SSL security protocols',
    icon: Scan,
    tag: 'DOM & Network'
  },
  {
    id: 'logo',
    title: 'Detecting Logo',
    subtitle: 'Extracting vector assets & computing primary brand palettes',
    icon: Palette,
    tag: 'Computer Vision'
  },
  {
    id: 'services',
    title: 'Reading Services',
    subtitle: 'NLP parsing construction catalogs, scopes & specialization tags',
    icon: Layers,
    tag: 'NLP Extraction'
  },
  {
    id: 'reviews',
    title: 'Analyzing Reviews',
    subtitle: 'Scraping Google Maps ratings & customer sentiment scores',
    icon: Star,
    tag: 'Sentiment AI'
  },
  {
    id: 'crm',
    title: 'Building CRM',
    subtitle: 'Configuring dispatch radar, quote formulas & automated workflows',
    icon: Cpu,
    tag: 'Engine Setup'
  },
  {
    id: 'dashboard',
    title: 'Finalizing Dashboard',
    subtitle: 'Generating local leads, assigning team capacity & ROI metrics',
    icon: LayoutDashboard,
    tag: 'Ready for Launch'
  }
];

export const DemoGeneratorModal: React.FC<DemoGeneratorModalProps> = ({
  isOpen,
  onClose,
  onDemoGenerated
}) => {
  const [url, setUrl] = useState('https://novakstavby.cz');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [scanProgress, setScanProgress] = useState(0);
  const [isRevealPhase, setIsRevealPhase] = useState(false);
  const [countdown, setCountdown] = useState(3);
  
  // Stored analysis results
  const [generatedData, setGeneratedData] = useState<{ branding: CompanyBranding; audit: WebsiteAudit } | null>(null);

  const presetUrls = [
    { label: 'Novák Stavby (Třinec)', url: 'https://novakstavby.cz', desc: 'Pergoly, střechy & dřevostavby' },
    { label: 'Alfa Stavitelé (Brno)', url: 'https://alfa-stavitele.cz', desc: 'Hrubé stavby & základové desky' },
    { label: 'Střechy & Pergoly s.r.o. (Ostrava)', url: 'https://1strechy.cz', desc: 'Tesařské konstrukce & krytiny' }
  ];

  // Helper to extract clean domain name for live UI preview
  const getDomainClean = (rawUrl: string) => {
    try {
      const u = new URL(rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`);
      return u.hostname.replace(/^www\./, '');
    } catch {
      return rawUrl.replace(/^https?:\/\//, '').split('/')[0] || 'novakstavby.cz';
    }
  };

  const domainName = getDomainClean(url);

  // Trigger confetti burst on reveal
  const triggerConfetti = () => {
    try {
      const count = 200;
      const defaults = {
        origin: { y: 0.7 },
        zIndex: 9999
      };

      function fire(particleRatio: number, opts: confetti.Options) {
        confetti({
          ...defaults,
          ...opts,
          particleCount: Math.floor(count * particleRatio)
        });
      }

      fire(0.25, {
        spread: 26,
        startVelocity: 55,
        colors: ['#2563eb', '#38bdf8', '#fbbf24', '#ffffff']
      });
      fire(0.2, {
        spread: 60,
        colors: ['#059669', '#10b981', '#3b82f6', '#f59e0b']
      });
      fire(0.35, {
        spread: 100,
        decay: 0.91,
        scalar: 0.8,
        colors: ['#6366f1', '#a855f7', '#ec4899', '#38bdf8']
      });
      fire(0.1, {
        spread: 120,
        startVelocity: 25,
        decay: 0.92,
        scalar: 1.2,
        colors: ['#f59e0b', '#fbbf24', '#f43f5e']
      });
    } catch (e) {
      console.warn('Confetti animation error:', e);
    }
  };

  // Main generation handler
  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;

    setIsAnalyzing(true);
    setCurrentStepIndex(0);
    setScanProgress(0);
    setIsRevealPhase(false);
    setCountdown(3);

    // Start background Gemini API call early
    const analysisPromise = analyzeWebsiteWithGemini(url);

    // Start step progression animation
    const stepDuration = 1800; // 1.8s per step
    const totalSteps = TIMELINE_STEPS.length;

    // Progress bar ticker (0% -> 100% over ~11 seconds)
    const progressInterval = setInterval(() => {
      setScanProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return prev + 1;
      });
    }, 110);

    // Step by step progression
    for (let i = 0; i < totalSteps; i++) {
      await new Promise(r => setTimeout(r, stepDuration));
      setCurrentStepIndex(i + 1);
    }

    // Wait for data analysis to be ready
    const result = await analysisPromise;
    setGeneratedData(result);
    setScanProgress(100);

    // Transition to Reveal Phase
    setIsRevealPhase(true);
    triggerConfetti();
  };

  // Automatic countdown in Reveal phase
  useEffect(() => {
    let timer: any;
    if (isRevealPhase && countdown > 0) {
      timer = setTimeout(() => {
        setCountdown(prev => prev - 1);
      }, 1000);
    } else if (isRevealPhase && countdown === 0 && generatedData) {
      // Auto-launch CRM
      launchPersonalizedCRM();
    }
    return () => clearTimeout(timer);
  }, [isRevealPhase, countdown, generatedData]);

  const launchPersonalizedCRM = () => {
    if (!generatedData) return;
    setIsAnalyzing(false);
    setIsRevealPhase(false);
    onDemoGenerated(generatedData.branding, generatedData.audit);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-xl overflow-y-auto">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="w-full max-w-2xl bg-slate-900/95 border border-slate-700/80 rounded-3xl shadow-2xl shadow-blue-950/50 overflow-hidden text-slate-100 flex flex-col relative"
        >
          {/* Ambient Glow accents */}
          <div className="absolute top-0 right-1/4 w-72 h-40 bg-blue-500/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/4 w-80 h-40 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />

          {/* Modal Header */}
          <div className="px-6 py-4 border-b border-slate-800/80 flex items-center justify-between bg-slate-900/80 relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
                <Sparkles className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold tracking-widest uppercase text-blue-400">AI Engine</span>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                    V2.4 Precision
                  </span>
                </div>
                <h2 className="text-base font-bold text-white leading-tight">
                  {isRevealPhase 
                    ? 'CRM Ready for Launch' 
                    : isAnalyzing 
                    ? 'Synthesizing Custom Construction CRM...' 
                    : 'DemoFactory AI Generator'}
                </h2>
              </div>
            </div>

            {!isAnalyzing && (
              <button 
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center text-xs transition-colors border border-slate-700"
              >
                ✕
              </button>
            )}
          </div>

          {/* Modal Content */}
          <div className="p-6 relative z-10 flex-1">
            {/* STAGE 1: FORM INPUT */}
            {!isAnalyzing && !isRevealPhase && (
              <form onSubmit={handleGenerate} className="space-y-6">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-blue-400" />
                      Zadejte webovou stránku stavební firmy
                    </label>
                    <span className="text-[11px] text-slate-400 font-medium">CZ / SK / EU weby</span>
                  </div>

                  <div className="relative">
                    <div className="absolute left-3.5 top-3.5 flex items-center gap-1.5 text-slate-500">
                      <Search className="w-4 h-4 text-blue-400" />
                    </div>
                    <input
                      type="url"
                      required
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="https://vasefirma.cz"
                      className="w-full bg-slate-950/90 border border-slate-700/80 rounded-2xl pl-10 pr-4 py-3.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 font-medium transition-all shadow-inner"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400">
                    AI proskenuje služby, reference, barvy i kontakty a během několika sekund sestaví kompletní CRM systém na míru.
                  </p>
                </div>

                {/* Quick Demo Presets */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-400">Rychlé testovací profily:</span>
                    <span className="text-[10px] text-blue-400 font-bold uppercase tracking-wider">Přednastavené vzory</span>
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    {presetUrls.map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setUrl(preset.url)}
                        className={`text-left px-4 py-3 rounded-2xl border transition-all flex items-center justify-between group ${
                          url === preset.url 
                            ? 'bg-blue-600/15 border-blue-500/60 shadow-md shadow-blue-950/50' 
                            : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700 hover:bg-slate-800/40'
                        }`}
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-white group-hover:text-blue-300 transition-colors">
                              {preset.label}
                            </span>
                            {url === preset.url && (
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping" />
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400">{preset.desc}</p>
                        </div>
                        <span className="text-[11px] font-mono text-slate-500 group-hover:text-slate-300 transition-colors hidden sm:block">
                          {preset.url}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Submit Action */}
                <button
                  type="submit"
                  className="w-full py-4 rounded-2xl text-sm font-bold text-white bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2 group cursor-pointer hover:scale-[1.01] active:scale-[0.99]"
                >
                  <Sparkles className="w-4 h-4 text-blue-200 group-hover:rotate-12 transition-transform" />
                  <span>Spustit AI Analýzu & Vytvořit Personalizované CRM</span>
                  <ChevronRight className="w-4 h-4 text-blue-200 group-hover:translate-x-1 transition-transform" />
                </button>
              </form>
            )}

            {/* STAGE 2: STEP-BY-STEP ANIMATING TIMELINE */}
            {isAnalyzing && !isRevealPhase && (
              <div className="space-y-6">
                {/* Live Scanner Radar Header */}
                <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800/80 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="relative w-12 h-12 flex items-center justify-center">
                      <div className="absolute inset-0 rounded-2xl bg-blue-500/20 animate-ping" />
                      <div className="relative w-10 h-10 rounded-xl bg-blue-600/30 border border-blue-500/40 flex items-center justify-center text-blue-400">
                        <Activity className="w-5 h-5 animate-pulse" />
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono uppercase text-emerald-400 font-bold flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                          Live Stream
                        </span>
                        <span className="text-[10px] text-slate-500">|</span>
                        <span className="text-[11px] font-mono text-slate-300 font-medium">{domainName}</span>
                      </div>
                      <h4 className="text-sm font-black text-white">
                        {TIMELINE_STEPS[Math.min(currentStepIndex, TIMELINE_STEPS.length - 1)]?.title || 'Synthesizing'}...
                      </h4>
                    </div>
                  </div>

                  {/* Circular / Pill % indicator */}
                  <div className="flex flex-col items-end">
                    <span className="text-xl font-black font-mono text-blue-400">{scanProgress}%</span>
                    <span className="text-[10px] text-slate-500 uppercase font-semibold">
                      Krok {Math.min(currentStepIndex + 1, 6)} z 6
                    </span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800 p-0.5 shadow-inner">
                  <motion.div 
                    className="bg-gradient-to-r from-blue-600 via-sky-400 to-emerald-400 h-full rounded-full transition-all duration-300 ease-out" 
                    style={{ width: `${scanProgress}%` }}
                  />
                </div>

                {/* Dynamic 6-Step Animated Timeline */}
                <div className="space-y-2.5">
                  {TIMELINE_STEPS.map((stepItem, idx) => {
                    const isDone = currentStepIndex > idx;
                    const isCurrent = currentStepIndex === idx;
                    const isPending = currentStepIndex < idx;
                    const IconComponent = stepItem.icon;

                    return (
                      <motion.div
                        key={stepItem.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: idx * 0.05 }}
                        className={`p-3.5 rounded-2xl border transition-all duration-300 flex items-center justify-between gap-3 ${
                          isDone
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-slate-200'
                            : isCurrent
                            ? 'bg-blue-600/15 border-blue-500/50 shadow-md shadow-blue-950/60 ring-1 ring-blue-500/30'
                            : 'bg-slate-950/40 border-slate-800/50 text-slate-600 opacity-60'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {/* Step Icon / Status indicator */}
                          <div 
                            className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold transition-all ${
                              isDone
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : isCurrent
                                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/40 animate-pulse'
                                : 'bg-slate-800/80 text-slate-500 border border-slate-700/50'
                            }`}
                          >
                            {isDone ? (
                              <Check className="w-4 h-4 text-emerald-400" />
                            ) : isCurrent ? (
                              <IconComponent className="w-4 h-4 text-white animate-spin" />
                            ) : (
                              <IconComponent className="w-4 h-4 text-slate-500" />
                            )}
                          </div>

                          {/* Step Title & Details */}
                          <div>
                            <div className="flex items-center gap-2">
                              <span className={`text-xs font-bold ${
                                isDone ? 'text-white' : isCurrent ? 'text-blue-300 font-extrabold' : 'text-slate-400'
                              }`}>
                                {stepItem.title}
                              </span>
                              {isCurrent && (
                                <span className="px-2 py-0.2 rounded-full text-[9px] font-bold bg-blue-500 text-white animate-pulse">
                                  Pracuji
                                </span>
                              )}
                              {isDone && (
                                <span className="text-[10px] text-emerald-400 font-semibold">✓ Hotovo</span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                              {stepItem.subtitle}
                            </p>
                          </div>
                        </div>

                        {/* Interactive Step Preview Pill */}
                        <div className="hidden sm:flex items-center gap-2">
                          {/* Live Dynamic step payload badge */}
                          {idx === 0 && isDone && (
                            <span className="text-[10px] font-mono font-bold bg-slate-900 border border-slate-700 px-2.5 py-1 rounded-lg text-emerald-400">
                              HTTP 200 OK
                            </span>
                          )}
                          {idx === 1 && (isDone || isCurrent) && (
                            <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-700 px-2 py-1 rounded-lg">
                              <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                              <span className="text-[10px] font-mono text-slate-300">#0A4EA3</span>
                            </div>
                          )}
                          {idx === 2 && (isDone || isCurrent) && (
                            <span className="text-[10px] font-medium bg-slate-900 border border-slate-700 px-2.5 py-1 rounded-lg text-sky-300">
                              4 Služby detekovány
                            </span>
                          )}
                          {idx === 3 && (isDone || isCurrent) && (
                            <span className="text-[10px] font-bold bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 rounded-lg text-amber-300 flex items-center gap-1">
                              <Star className="w-3 h-3 fill-amber-400 text-amber-400" /> 4.9 (48 hodnocení)
                            </span>
                          )}
                          {idx === 4 && (isDone || isCurrent) && (
                            <span className="text-[10px] font-bold bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 rounded-lg text-emerald-300">
                              Pipeline Ready
                            </span>
                          )}
                          {idx === 5 && (isDone || isCurrent) && (
                            <span className="text-[10px] font-bold bg-blue-500/20 border border-blue-500/40 px-2.5 py-1 rounded-lg text-blue-300">
                              +3.8M CZK
                            </span>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* STAGE 3: PREMIUM CRM REVEAL WITH SMOOTH TRANSITION */}
            {isRevealPhase && generatedData && (
              <motion.div
                initial={{ opacity: 0, scale: 0.92, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
                className="space-y-6 text-center py-2"
              >
                {/* Celebratory Badge */}
                <div className="relative mx-auto w-20 h-20 flex items-center justify-center">
                  <motion.div 
                    animate={{ scale: [1, 1.15, 1], rotate: [0, 5, -5, 0] }}
                    transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
                    className="absolute inset-0 rounded-3xl bg-gradient-to-tr from-blue-600 via-indigo-500 to-emerald-500 opacity-30 blur-lg"
                  />
                  <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-xl shadow-blue-500/40 border border-white/20">
                    <Award className="w-8 h-8 text-white" />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>AI Generace proběhla úspěšně</span>
                  </div>
                  <h3 className="text-2xl font-black text-white">
                    {generatedData.branding.name}
                  </h3>
                  <p className="text-xs text-slate-300 max-w-md mx-auto">
                    Vaše pracovní prostředí pro lokalitu <span className="text-blue-400 font-bold">{generatedData.branding.city}</span> je nakonfigurováno a připraveno ke spuštění.
                  </p>
                </div>

                {/* Personalized Summary Metrics Card */}
                <div className="p-4 bg-slate-950/80 rounded-2xl border border-slate-800 text-left space-y-3 max-w-lg mx-auto shadow-inner">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                    <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block">Lokalita</span>
                      <span className="font-bold text-white flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 text-rose-400" />
                        {generatedData.branding.city}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block">Barva identity</span>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <div 
                          className="w-3.5 h-3.5 rounded-md shadow-xs border border-white/20" 
                          style={{ backgroundColor: generatedData.branding.primaryColor }}
                        />
                        <span className="font-mono font-bold text-white text-[11px]">
                          {generatedData.branding.primaryColor}
                        </span>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 col-span-2 sm:col-span-1">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block">Audit Skóre</span>
                      <span className="font-black text-emerald-400 text-sm mt-0.5 block">
                        {generatedData.audit.score} / 100
                      </span>
                    </div>
                  </div>

                  {/* Extracted Services Preview */}
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                      Detekované stavební specializace:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {(generatedData?.branding?.services || []).map((srv, sIdx) => (
                        <span 
                          key={sIdx}
                          className="px-2.5 py-0.5 rounded-lg text-[11px] font-bold bg-blue-500/15 text-blue-300 border border-blue-500/30"
                        >
                          {srv}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Launch CTA & Auto-countdown */}
                <div className="pt-2 space-y-2 max-w-lg mx-auto">
                  <button
                    type="button"
                    onClick={launchPersonalizedCRM}
                    className="w-full py-4 rounded-2xl text-sm font-black text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-600 hover:opacity-95 shadow-xl shadow-blue-600/40 transition-all flex items-center justify-center gap-2 group cursor-pointer animate-pulse"
                  >
                    <Zap className="w-4 h-4 text-amber-300" />
                    <span>Vstoupit do Personalizovaného CRM ({countdown}s)</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform" />
                  </button>
                  <span className="text-[11px] text-slate-400 block">
                    Systém se automaticky otevře za {countdown} sekundy nebo klikněte výše.
                  </span>
                </div>
              </motion.div>
            )}
          </div>

          {/* Modal Footer Info */}
          <div className="px-6 py-3 border-t border-slate-800/60 bg-slate-950/60 flex items-center justify-between text-[11px] text-slate-500">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
              DemoFactory Enterprise Engine
            </span>
            <span>Real-time Gemini & Computer Vision</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
