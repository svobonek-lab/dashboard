import React, { useState } from 'react';
import { 
  AlertTriangle, 
  CheckCircle2, 
  ArrowRight, 
  ShieldAlert, 
  Sparkles, 
  Building2, 
  Zap, 
  MessageSquare, 
  Star, 
  TrendingUp, 
  DollarSign, 
  Sliders, 
  Clock, 
  Users, 
  FileText, 
  ChevronDown, 
  ChevronUp,
  Share2,
  Download,
  Check,
  ExternalLink,
  Copy
} from 'lucide-react';
import { WebsiteAudit, CompanyBranding } from '../types';

interface AuditCardProps {
  audit: WebsiteAudit;
  branding: CompanyBranding;
  onProceedToCRM: () => void;
  onNewURL: () => void;
}

export const AuditCard: React.FC<AuditCardProps> = ({
  audit,
  branding,
  onProceedToCRM,
  onNewURL
}) => {
  // ROI Calculator Sliders state
  const [sliderLeads, setSliderLeads] = useState<number>(10);
  const [sliderProjectValue, setSliderProjectValue] = useState<number>(240000);
  const [sliderEmployees, setSliderEmployees] = useState<number>(4);

  // Expanded bottleneck card state
  const [expandedIssueId, setExpandedIssueId] = useState<string | null>('iss-1');
  const [copiedLink, setCopiedLink] = useState(false);
  const [pdfDownloaded, setPdfDownloaded] = useState(false);

  // Calculations
  const missedLeadsPerMonth = Math.round(sliderLeads * 0.8);
  const monthlyRevenueLost = missedLeadsPerMonth * sliderProjectValue;
  const annualRecoverableRevenue = monthlyRevenueLost * 12;

  const handleCopyDemoLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 3000);
  };

  const handleDownloadPdf = () => {
    setPdfDownloaded(true);
    setTimeout(() => setPdfDownloaded(false), 4000);
  };

  const bottleneckDetails: Record<string, { why: string; fix: string; timeSaved: string }> = {
    'iss-1': {
      why: 'Prospective clients leave within 30 seconds if they cannot instantly submit an inquiry or book a consultation.',
      fix: 'DemoFactory installs an instant AI lead widget connected directly to your dispatch pipeline.',
      timeSaved: '4.5 hours / week'
    },
    'iss-2': {
      why: 'Leads who do not receive a reply within 15 minutes call your competitors instead (loss of 70% potential clients).',
      fix: 'Automated instant WhatsApp & SMS confirmation triggers within 10 seconds of submission.',
      timeSaved: '6 hours / week'
    },
    'iss-3': {
      why: 'Without verified visual proof of prior work (Before/After), trust drops significantly.',
      fix: 'Integrated mobile photo gallery with automated customer portals and photo verification.',
      timeSaved: '3 hours / week'
    },
    'iss-4': {
      why: 'Manual dispatch and spreadsheet scheduling cause double bookings and delayed quotes.',
      fix: 'AI Auto-Assignment Engine matching technicians by GPS location, specialization, and real-time workload.',
      timeSaved: '12 hours / week'
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 relative overflow-hidden font-sans">
      {/* Background ambient glow */}
      <div 
        className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full opacity-15 blur-[140px] pointer-events-none"
        style={{ backgroundColor: branding.primaryColor }}
      />

      <div className="w-full max-w-5xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden relative z-10 text-slate-100 mb-12">
        {/* Header & Share / PDF Actions */}
        <div className="p-8 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-6 bg-slate-900/80 backdrop-blur-md">
          <div className="flex items-center gap-4">
            <div 
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-bold text-2xl shadow-lg"
              style={{ backgroundColor: branding.primaryColor }}
            >
              <Building2 className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  ✨ AI Website Clone Success (DemoFactory)
                </span>
                <span className="text-xs text-slate-400 font-mono">{audit.url}</span>
              </div>
              <h1 className="text-2xl font-bold text-white mt-1 tracking-tight">
                Personalized CRM for {branding.name}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleCopyDemoLink}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white flex items-center gap-2 transition-all border border-slate-700"
            >
              {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4 text-blue-400" />}
              <span>{copiedLink ? 'Demo Link Copied!' : 'Shareable Demo Link'}</span>
            </button>
            <button
              onClick={handleDownloadPdf}
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white flex items-center gap-2 transition-all shadow-md"
            >
              {pdfDownloaded ? <Check className="w-4 h-4" /> : <Download className="w-4 h-4" />}
              <span>{pdfDownloaded ? 'PDF Audit Downloaded!' : 'Download PDF Audit'}</span>
            </button>
          </div>
        </div>

        {/* AI Extracted Assets Summary Grid (Killer Feature requirement) */}
        <div className="px-8 pt-8">
          <div className="bg-slate-950 p-6 rounded-3xl border border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-blue-400 flex items-center gap-2">
                <Sparkles className="w-4 h-4" /> AI Extracted Assets from {audit.url}
              </h3>
              <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-950 px-2.5 py-1 rounded-md border border-emerald-800">
                100% Extracted in 14s
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              <div className="bg-slate-900 p-3.5 rounded-2xl border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Company Name</span>
                <p className="font-extrabold text-white">{branding.name}</p>
              </div>

              <div className="bg-slate-900 p-3.5 rounded-2xl border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Brand Colors</span>
                <div className="flex items-center gap-2 mt-1">
                  <div className="w-5 h-5 rounded-md shadow-sm" style={{ backgroundColor: branding.primaryColor }}></div>
                  <span className="font-mono text-slate-300">{branding.primaryColor}</span>
                </div>
              </div>

              <div className="bg-slate-900 p-3.5 rounded-2xl border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Google Reviews</span>
                <p className="font-bold text-amber-400">4.9 ★ (142 reviews)</p>
              </div>

              <div className="bg-slate-900 p-3.5 rounded-2xl border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Detected Services</span>
                <p className="font-semibold text-slate-200 truncate">{branding.services.slice(0, 3).join(', ')}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Revenue Opportunity Card */}
        <div className="px-8 pt-6">
          <div className="bg-gradient-to-r from-blue-950/60 via-slate-900 to-slate-950 p-6 rounded-3xl border border-blue-500/30 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-500/20 text-blue-300 uppercase tracking-wide">
                  AI Revenue Estimate (ROI Report)
                </span>
                <span className="text-xs text-slate-400">• Based on {sliderLeads} monthly web leads</span>
              </div>
              <h3 className="text-xl font-black text-white">
                Potential Recoverable Revenue: <span className="text-emerald-400">{(annualRecoverableRevenue).toLocaleString()} CZK / year</span>
              </h3>
              <p className="text-xs text-slate-400">
                You are currently losing approx. <strong className="text-rose-400">{missedLeadsPerMonth} leads/month</strong> due to a 24+ hour response delay.
              </p>
            </div>
            <div className="bg-slate-950/80 px-6 py-4 rounded-2xl border border-slate-800 text-right flex-shrink-0">
              <p className="text-[10px] text-slate-400 uppercase tracking-wider">Avg Project Value</p>
              <p className="text-lg font-extrabold text-blue-400">{sliderProjectValue.toLocaleString()} CZK</p>
            </div>
          </div>
        </div>

        {/* 3 Metric Sub-Scores */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 px-8 pt-6">
          <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center font-bold">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-400">Lead Capture</p>
              <p className="text-lg font-extrabold text-white">45 <span className="text-xs font-normal text-slate-500">/ 100</span></p>
            </div>
          </div>

          <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-400">Response Automation</p>
              <p className="text-lg font-extrabold text-white">20 <span className="text-xs font-normal text-slate-500">/ 100</span></p>
            </div>
          </div>

          <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold">
              <Star className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-400">Customer Experience</p>
              <p className="text-lg font-extrabold text-white">70 <span className="text-xs font-normal text-slate-500">/ 100</span></p>
            </div>
          </div>
        </div>

        {/* Interactive Bottlenecks (Click to expand) */}
        <div className="p-8 space-y-4">
          <h3 className="text-xs font-bold tracking-wider text-rose-400 uppercase flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Critical Bottlenecks Found on Website (Click to Inspect)
          </h3>
          <div className="space-y-3">
            {audit.issues.map((issue) => {
              const isExpanded = expandedIssueId === issue.id;
              const details = bottleneckDetails[issue.id] || {
                why: 'Causes delays and lost customer trust.',
                fix: 'Automated by DemoFactory workflow engine.',
                timeSaved: '5 hours / week'
              };

              return (
                <div 
                  key={issue.id} 
                  className={`rounded-2xl bg-slate-950/60 border transition-all overflow-hidden ${
                    isExpanded ? 'border-blue-500/50 shadow-lg' : 'border-slate-800/80 hover:border-slate-700'
                  }`}
                >
                  <div 
                    onClick={() => setExpandedIssueId(isExpanded ? null : issue.id)}
                    className="p-4 flex items-center justify-between cursor-pointer"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center flex-shrink-0 mt-0.5 font-bold text-xs">
                        !
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-slate-200">{issue.title}</h4>
                        <p className="text-xs text-slate-400 mt-0.5">{issue.description}</p>
                      </div>
                    </div>
                    <div className="text-slate-400">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="px-4 pb-4 pt-2 border-t border-slate-800/60 bg-slate-900/50 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                      <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20">
                        <span className="font-bold text-rose-400 block mb-1">Why this hurts revenue:</span>
                        <p className="text-slate-300 leading-relaxed">{details.why}</p>
                      </div>
                      <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                        <span className="font-bold text-emerald-400 block mb-1">How DemoFactory fixes it:</span>
                        <p className="text-slate-300 leading-relaxed">{details.fix}</p>
                      </div>
                      <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
                        <span className="font-bold text-blue-400 block mb-1">Expected time saved:</span>
                        <p className="text-slate-200 font-bold mt-1 text-sm">{details.timeSaved}</p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Before vs After Comparison */}
        <div className="px-8 pb-8 space-y-4">
          <h3 className="text-xs font-bold tracking-wider text-blue-400 uppercase flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            Before vs. After DemoFactory Transformation
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left: Current Website */}
            <div className="bg-rose-950/20 border border-rose-500/20 p-6 rounded-3xl space-y-4">
              <div className="flex items-center justify-between border-b border-rose-500/20 pb-3">
                <h4 className="text-sm font-bold text-rose-400">Current Website ({branding.name})</h4>
                <span className="text-[10px] font-bold bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded-full">Legacy Manual</span>
              </div>
              <ul className="space-y-3 text-xs text-slate-300">
                <li className="flex items-center justify-between">
                  <span className="text-slate-400">Response time:</span>
                  <span className="font-semibold text-rose-300">24 – 48 hours</span>
                </li>
                <li className="flex items-center justify-between">
                  <span className="text-slate-400">Lead capture:</span>
                  <span className="font-semibold text-rose-300">Static email / phone tag</span>
                </li>
                <li className="flex items-center justify-between">
                  <span className="text-slate-400">Employee assignment:</span>
                  <span className="font-semibold text-rose-300">Manual phone calls & Excel</span>
                </li>
                <li className="flex items-center justify-between">
                  <span className="text-slate-400">Quote generation:</span>
                  <span className="font-semibold text-rose-300">Word/Excel manual calculations</span>
                </li>
                <li className="flex items-center justify-between">
                  <span className="text-slate-400">Customer updates:</span>
                  <span className="font-semibold text-rose-300">None / reactive</span>
                </li>
              </ul>
            </div>

            {/* Right: After DemoFactory */}
            <div className="bg-emerald-950/20 border border-emerald-500/20 p-6 rounded-3xl space-y-4">
              <div className="flex items-center justify-between border-b border-emerald-500/20 pb-3">
                <h4 className="text-sm font-bold text-emerald-400">After DemoFactory CRM</h4>
                <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full">Automated AI</span>
              </div>
              <ul className="space-y-3 text-xs text-slate-300">
                <li className="flex items-center justify-between">
                  <span className="text-slate-400">Response time:</span>
                  <span className="font-bold text-emerald-400">Instant (&lt; 5 mins)</span>
                </li>
                <li className="flex items-center justify-between">
                  <span className="text-slate-400">Lead capture:</span>
                  <span className="font-bold text-emerald-400">AI Smart Widget & WhatsApp</span>
                </li>
                <li className="flex items-center justify-between">
                  <span className="text-slate-400">Employee assignment:</span>
                  <span className="font-bold text-emerald-400">AI GPS & Capacity Matcher</span>
                </li>
                <li className="flex items-center justify-between">
                  <span className="text-slate-400">Quote generation:</span>
                  <span className="font-bold text-emerald-400">1-Click Itemized PDF & VAT</span>
                </li>
                <li className="flex items-center justify-between">
                  <span className="text-slate-400">Customer updates:</span>
                  <span className="font-bold text-emerald-400">Real-time Portal & Photo Log</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* ROI Calculator Sliders */}
        <div className="px-8 pb-8">
          <div className="bg-slate-950/80 p-6 rounded-3xl border border-slate-800 space-y-6">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <Sliders className="w-4 h-4 text-blue-400" />
                Interactive ROI Calculator
              </h4>
              <span className="text-xs text-blue-400 font-mono font-bold">Live Estimation</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Slider 1: Leads */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Leads / Month:</span>
                  <span className="font-bold text-white">{sliderLeads}</span>
                </div>
                <input
                  type="range"
                  min="2"
                  max="40"
                  value={sliderLeads}
                  onChange={(e) => setSliderLeads(Number(e.target.value))}
                  className="w-full accent-blue-500 cursor-pointer"
                />
              </div>

              {/* Slider 2: Project Value */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Avg. Project Value:</span>
                  <span className="font-bold text-white">{sliderProjectValue.toLocaleString()} CZK</span>
                </div>
                <input
                  type="range"
                  min="50000"
                  max="800000"
                  step="10000"
                  value={sliderProjectValue}
                  onChange={(e) => setSliderProjectValue(Number(e.target.value))}
                  className="w-full accent-blue-500 cursor-pointer"
                />
              </div>

              {/* Slider 3: Employees */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Number of Employees:</span>
                  <span className="font-bold text-white">{sliderEmployees}</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="25"
                  value={sliderEmployees}
                  onChange={(e) => setSliderEmployees(Number(e.target.value))}
                  className="w-full accent-blue-500 cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Strong CTA with Glow Animation */}
        <div className="p-6 bg-slate-950 border-t border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
          <button
            onClick={onNewURL}
            className="px-5 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition-all"
          >
            ← Enter Different URL
          </button>

          <button
            onClick={onProceedToCRM}
            className="relative group px-8 py-4 rounded-2xl text-sm font-black text-white shadow-2xl transition-all hover:scale-[1.02] active:scale-[0.98] overflow-hidden"
            style={{ backgroundColor: branding.primaryColor }}
          >
            {/* Subtle glow background */}
            <div className="absolute inset-0 bg-white/20 blur-md opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <span className="relative z-10 flex items-center gap-3">
              <span>See Your Personalized CRM Worth 80,000 CZK</span>
              <ArrowRight className="w-5 h-5" />
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

