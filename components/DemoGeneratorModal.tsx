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
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-50/85 backdrop-blur-xl overflow-y-auto">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="w-full max-w-2xl bg-white/95 border border-slate-300/80 rounded-3xl shadow-2xl shadow-brand-primary-soft overflow-hidden text-slate-900 flex flex-col relative"
        >
          {/* Ambient Glow accents */}
          <div className="absolute top-0 right-1/4 w-72 h-40 bg-brand-primary-soft rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/4 w-80 h-40 bg-brand-primary/15 rounded-full blur-3xl pointer-events-none" />

          {/* Modal Header */}
          <div className="px-6 py-4 border-b border-slate-200/80 flex items-center justify-between bg-white/80 relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-slate-900 shadow-lg shadow-brand-primary-soft">
                <Sparkles className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold tracking-widest uppercase text-brand-primary">AI Engine</span>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-brand-primary-soft text-brand-primary border border-brand-primary/30">
                    V2.4 Precision
                  </span>
                </div>
                <h2 className="text-base font-bold text-slate-900 leading-tight">
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
                className="w-8 h-8 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-500 hover:text-slate-900 flex items-center justify-center text-xs transition-colors border border-slate-300"
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
                    <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-brand-primary" />
                      Zadejte webovou stránku stavební firmy
                    </label>
                    <span className="text-[11px] text-slate-500 font-medium">CZ / SK / EU weby</span>
                  </div>

                  <div className="relative">
                    <div className="absolute left-3.5 top-3.5 flex items-center gap-1.5 text-slate-500">
                      <Search className="w-4 h-4 text-brand-primary" />
                    </div>
                    <input
                      type="url"
                      required
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="https://vasefirma.cz"
                      className="w-full bg-slate-50/90 border border-slate-300/80 rounded-2xl pl-10 pr-4 py-3.5 text-sm text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-primary-soft focus:border-brand-primary font-medium transition-all shadow-inner"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500">
                    AI proskenuje služby, reference, barvy i kontakty a během několika sekund sestaví kompletní CRM systém na míru.
                  </p>
                </div>

                {/* Quick Demo Presets */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500">Rychlé testovací profily:</span>
                    <span className="text-[10px] text-brand-primary font-bold uppercase tracking-wider">Přednastavené vzory</span>
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    {presetUrls.map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setUrl(preset.url)}
                        className={`text-left px-4 py-3 rounded-2xl border transition-all flex items-center justify-between group ${
                          url === preset.url 
                            ? 'bg-brand-primary/15 border-brand-primary/60 shadow-md shadow-brand-primary-soft' 
                            : 'bg-slate-50/60 border-slate-200/80 hover:border-slate-300 hover:bg-slate-800/40'
                        }`}
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-slate-900 group-hover:text-brand-primary transition-colors">
                              {preset.label}
                            </span>
                            {url === preset.url && (
                              <span className="w-1.5 h-1.5 rounded-full bg-brand-primary animate-ping" />
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500">{preset.desc}</p>
                        </div>
                        <span className="text-[11px] font-mono text-slate-500 group-hover:text-slate-700 transition-colors hidden sm:block">
                          {preset.url}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Submit Action */}
                <button
                  type="submit"
                  className="w-full py-4 rounded-2xl text-sm font-bold text-slate-900 bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-lg shadow-brand-primary-soft transition-all flex items-center justify-center gap-2 group cursor-pointer hover:scale-[1.01] active:scale-[0.99]"
                >
                  <Sparkles className="w-4 h-4 text-brand-primary group-hover:rotate-12 transition-transform" />
                  <span>Spustit AI Analýzu & Vytvořit Personalizované CRM</span>
                  <ChevronRight className="w-4 h-4 text-brand-primary group-hover:translate-x-1 transition-transform" />
                </button>
              </form>
            )}

            {/* STAGE 2: STEP-BY-STEP ANIMATING TIMELINE */}
            {isAnalyzing && !isRevealPhase && (
              <div className="space-y-6">
                {/* Live Scanner Radar Header */}
                <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="relative w-12 h-12 flex items-center justify-center">
                      <div className="absolute inset-0 rounded-2xl bg-brand-primary-soft animate-ping" />
                      <div className="relative w-10 h-10 rounded-xl bg-brand-primary/30 border border-brand-primary/40 flex items-center justify-center text-brand-primary">
                        <Activity className="w-5 h-5 animate-pulse" />
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono uppercase text-green-400 font-bold flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-ping" />
                          Live Stream
                        </span>
                        <span className="text-[10px] text-slate-500">|</span>
                        <span className="text-[11px] font-mono text-slate-700 font-medium">{domainName}</span>
                      </div>
                      <h4 className="text-sm font-black text-slate-900">
                        {TIMELINE_STEPS[Math.min(currentStepIndex, TIMELINE_STEPS.length - 1)]?.title || 'Synthesizing'}...
                      </h4>
                    </div>
                  </div>

                  {/* Circular / Pill % indicator */}
                  <div className="flex flex-col items-end">
                    <span className="text-xl font-black font-mono text-brand-primary">{scanProgress}%</span>
                    <span className="text-[10px] text-slate-500 uppercase font-semibold">
                      Krok {Math.min(currentStepIndex + 1, 6)} z 6
                    </span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-slate-50 rounded-full h-2 overflow-hidden border border-slate-200 p-0.5 shadow-inner">
                  <motion.div 
                    className="bg-gradient-to-r from-blue-600 via-sky-400 to-green-400 h-full rounded-full transition-all duration-300 ease-out" 
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
                            ? 'bg-green-500/10 border-green-500/30 text-slate-800'
                            : isCurrent
                            ? 'bg-brand-primary/15 border-brand-primary/50 shadow-md shadow-brand-primary-soft ring-1 ring-brand-primary-soft'
                            : 'bg-slate-50/40 border-slate-200/50 text-slate-600 opacity-60'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {/* Step Icon / Status indicator */}
                          <div 
                            className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold transition-all ${
                              isDone
                                ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                                : isCurrent
                                ? 'bg-brand-primary text-slate-900 shadow-md shadow-brand-primary-soft animate-pulse'
                                : 'bg-slate-800/80 text-slate-500 border border-slate-300/50'
                            }`}
                          >
                            {isDone ? (
                              <Check className="w-4 h-4 text-green-400" />
                            ) : isCurrent ? (
                              <IconComponent className="w-4 h-4 text-slate-900 animate-spin" />
                            ) : (
                              <IconComponent className="w-4 h-4 text-slate-500" />
                            )}
                          </div>

                          {/* Step Title & Details */}
                          <div>
                            <div className="flex items-center gap-2">
                              <span className={`text-xs font-bold ${
                                isDone ? 'text-slate-900' : isCurrent ? 'text-brand-primary font-extrabold' : 'text-slate-500'
                              }`}>
                                {stepItem.title}
                              </span>
                              {isCurrent && (
                                <span className="px-2 py-0.2 rounded-full text-[9px] font-bold bg-brand-primary text-slate-900 animate-pulse">
                                  Pracuji
                                </span>
                              )}
                              {isDone && (
                                <span className="text-[10px] text-green-400 font-semibold">✓ Hotovo</span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              {stepItem.subtitle}
                            </p>
                          </div>
                        </div>

                        {/* Interactive Step Preview Pill */}
                        <div className="hidden sm:flex items-center gap-2">
                          {/* Live Dynamic step payload badge */}
                          {idx === 0 && isDone && (
                            <span className="text-[10px] font-mono font-bold bg-white border border-slate-300 px-2.5 py-1 rounded-lg text-green-400">
                              HTTP 200 OK
                            </span>
                          )}
                          {idx === 1 && (isDone || isCurrent) && (
                            <div className="flex items-center gap-1.5 bg-white border border-slate-300 px-2 py-1 rounded-lg">
                              <span className="w-2.5 h-2.5 rounded-full bg-brand-primary" />
                              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                              <span className="text-[10px] font-mono text-slate-700">#0A4EA3</span>
                            </div>
                          )}
                          {idx === 2 && (isDone || isCurrent) && (
                            <span className="text-[10px] font-medium bg-white border border-slate-300 px-2.5 py-1 rounded-lg text-sky-300">
                              4 Služby detekovány
                            </span>
                          )}
                          {idx === 3 && (isDone || isCurrent) && (
                            <span className="text-[10px] font-bold bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 rounded-lg text-amber-300 flex items-center gap-1">
                              <Star className="w-3 h-3 fill-amber-400 text-amber-400" /> 4.9 (48 hodnocení)
                            </span>
                          )}
                          {idx === 4 && (isDone || isCurrent) && (
                            <span className="text-[10px] font-bold bg-green-500/10 border border-green-500/30 px-2.5 py-1 rounded-lg text-green-300">
                              Pipeline Ready
                            </span>
                          )}
                          {idx === 5 && (isDone || isCurrent) && (
                            <span className="text-[10px] font-bold bg-brand-primary-soft border border-brand-primary/40 px-2.5 py-1 rounded-lg text-brand-primary">
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
                    className="absolute inset-0 rounded-3xl bg-gradient-to-tr from-blue-600 via-indigo-500 to-green-500 opacity-30 blur-lg"
                  />
                  <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-slate-900 flex items-center justify-center shadow-xl shadow-brand-primary-soft border border-white/20">
                    <Award className="w-8 h-8 text-slate-900" />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-green-500/20 text-green-300 border border-green-500/30">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>AI Generace proběhla úspěšně</span>
                  </div>
                  <h3 className="text-2xl font-black text-slate-900">
                    {generatedData.branding.name}
                  </h3>
                  <p className="text-xs text-slate-700 max-w-md mx-auto">
                    Vaše pracovní prostředí pro lokalitu <span className="text-brand-primary font-bold">{generatedData.branding.city}</span> je nakonfigurováno a připraveno ke spuštění.
                  </p>
                </div>

                {/* Personalized Summary Metrics Card */}
                <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200 text-left space-y-3 max-w-lg mx-auto shadow-inner">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                    <div className="p-2.5 rounded-xl bg-white border border-slate-200">
                      <span className="text-[10px] text-slate-500 uppercase font-semibold block">Lokalita</span>
                      <span className="font-bold text-slate-900 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 text-rose-400" />
                        {generatedData.branding.city}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-white border border-slate-200">
                      <span className="text-[10px] text-slate-500 uppercase font-semibold block">Barva identity</span>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <div 
                          className="w-3.5 h-3.5 rounded-md shadow-xs border border-white/20" 
                          style={{ backgroundColor: generatedData.branding.primaryColor }}
                        />
                        <span className="font-mono font-bold text-slate-900 text-[11px]">
                          {generatedData.branding.primaryColor}
                        </span>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-white border border-slate-200 col-span-2 sm:col-span-1">
                      <span className="text-[10px] text-slate-500 uppercase font-semibold block">Audit Skóre</span>
                      <span className="font-black text-green-400 text-sm mt-0.5 block">
                        {generatedData.audit.score} / 100
                      </span>
                    </div>
                  </div>

                  {/* Extracted Services Preview */}
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">
                      Detekované stavební specializace:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {(generatedData?.branding?.services || []).map((srv, sIdx) => (
                        <span 
                          key={sIdx}
                          className="px-2.5 py-0.5 rounded-lg text-[11px] font-bold bg-brand-primary-soft text-brand-primary border border-brand-primary/30"
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
                    className="w-full py-4 rounded-2xl text-sm font-black text-slate-900 bg-gradient-to-r from-blue-600 via-indigo-600 to-green-600 hover:opacity-95 shadow-xl shadow-brand-primary-soft transition-all flex items-center justify-center gap-2 group cursor-pointer animate-pulse"
                  >
                    <Zap className="w-4 h-4 text-amber-300" />
                    <span>Vstoupit do Personalizovaného CRM ({countdown}s)</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform" />
                  </button>
                  <span className="text-[11px] text-slate-500 block">
                    Systém se automaticky otevře za {countdown} sekundy nebo klikněte výše.
                  </span>
                </div>
              </motion.div>
            )}
          </div>

          {/* Modal Footer Info */}
          <div className="px-6 py-3 border-t border-slate-200/60 bg-slate-50/60 flex items-center justify-between text-[11px] text-slate-500">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-brand-primary" />
              DemoFactory Enterprise Engine
            </span>
            <span>Real-time Gemini & Computer Vision</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
