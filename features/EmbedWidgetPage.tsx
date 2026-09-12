import React, { useState } from 'react';
import { 
  Code2, 
  Copy, 
  Check, 
  Sparkles, 
  Smartphone, 
  Monitor, 
  Zap, 
  Eye, 
  Sliders, 
  ExternalLink, 
  Layers, 
  ShieldCheck, 
  FileCode, 
  Globe, 
  Play,
  ArrowRight,
  Send,
  Building2,
  CheckCircle2
} from 'lucide-react';
import { CompanyBranding, Lead } from '../types';
import { EmbedLeadWidget } from '../components/EmbedLeadWidget';
import { useOrganization } from '../context/OrganizationContext';

interface EmbedWidgetPageProps {
  branding: CompanyBranding;
  onCreateLeadFromWidget: (leadData: any) => void;
  onNavigateTab: (tab: string) => void;
}

export const EmbedWidgetPage: React.FC<EmbedWidgetPageProps> = ({
  branding,
  onCreateLeadFromWidget,
  onNavigateTab
}) => {
  const { currentOrg } = useOrganization();
  const [selectedSnippetType, setSelectedSnippetType] = useState<'html' | 'wordpress' | 'webflow' | 'react'>('html');
  const [copied, setCopied] = useState(false);
  const [customPrimaryColor, setCustomPrimaryColor] = useState(branding.primaryColor || '#2563eb');
  const [widgetPosition, setWidgetPosition] = useState<'bottom-right' | 'bottom-left'>('bottom-right');
  const [buttonText, setButtonText] = useState('Nezávazná poptávka');
  const [isWidgetModalOpen, setIsWidgetModalOpen] = useState(false);
  const [testLeadNotification, setTestLeadNotification] = useState<string | null>(null);

  const orgId = currentOrg?.id || 'org-1111-2222-3333-444444444444';
  const appOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://YOUR_DOMAIN';

  const snippetCodes = {
    html: `<!-- CRM Multi-Tenant Embeddable Poptávkový Widget -->
<script 
  src="${appOrigin}/widget.js" 
  data-org="${orgId}"
  data-color="${customPrimaryColor}"
  data-position="${widgetPosition}"
  data-btn-text="${buttonText}"
  async>
</script>`,
    wordpress: `// Vložte do functions.php nebo Header/Footer Scripts pluginu
function add_crm_lead_widget() {
    echo '<script src="${appOrigin}/widget.js" data-org="${orgId}" data-color="${customPrimaryColor}" data-position="${widgetPosition}" data-btn-text="${buttonText}" async></script>';
}
add_action('wp_footer', 'add_crm_lead_widget');`,
    webflow: `<!-- Vložte do Custom Code v nastavení projektu (Before </body> tag) -->
<script 
  src="${appOrigin}/widget.js" 
  data-org="${orgId}"
  data-color="${customPrimaryColor}"
  data-position="${widgetPosition}"
  data-btn-text="${buttonText}"
  async>
</script>`,
    react: `// React / Next.js Component Embed
import Script from 'next/script';

export default function RootLayout({ children }) {
  return (
    <>
      {children}
      <Script 
        src="${appOrigin}/widget.js" 
        strategy="lazyOnload"
        data-org="${orgId}"
        data-color="${customPrimaryColor}"
        data-position="${widgetPosition}"
        data-btn-text="${buttonText}"
      />
    </>
  );
}`
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(snippetCodes[selectedSnippetType]);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleWidgetSubmit = (leadData: any) => {
    onCreateLeadFromWidget(leadData);
    setTestLeadNotification(`Poptávka od ${leadData.fullName} byla úspěšně zpracována a zařazena do CRM!`);
    setTimeout(() => setTestLeadNotification(null), 5000);
  };

  return (
    <div className="space-y-8 pb-20 text-slate-900">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 uppercase tracking-wider flex items-center gap-1">
              <Code2 className="w-3 h-3" /> Jednořádkový Embed modul
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-950 text-green-400 border border-green-800">
              ⚡ Načtení: 0.8s
            </span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight mt-1">Webový poptávkový widget</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Jakákoliv stavební firma může vložit jeden řádek JavaScriptu do svého webu. Widget automaticky přebírá barvy značky a otevírá inteligentní poptávkový formulář.
          </p>
        </div>

        <button
          onClick={() => setIsWidgetModalOpen(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 shadow-lg transition-all"
        >
          <Play className="w-4 h-4 fill-slate-950" />
          <span>Otestovat widget živě</span>
        </button>
      </div>

      {/* Test Lead Notification Toast */}
      {testLeadNotification && (
        <div className="bg-green-950 text-green-200 border border-green-800/80 p-4 rounded-2xl shadow-xl flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-green-400" />
            <span className="text-xs font-bold">{testLeadNotification}</span>
          </div>
          <button 
            onClick={() => onNavigateTab('leads')}
            className="px-3 py-1 bg-white border border-green-700 text-green-300 text-xs font-bold rounded-lg hover:bg-slate-800 transition-colors"
          >
            Zobrazit v Kanbanu
          </button>
        </div>
      )}

      {/* Main Grid: Code Generator on Left, Live Simulator on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Embed Script Generator & Customizer (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Customizer Settings Card */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-md space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Sliders className="w-4 h-4 text-amber-400" />
                Nastavení a branding
              </h3>
              <span className="text-[11px] text-slate-500">Auto-dědění</span>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="text-slate-700 font-bold block">Primární barva tlačítka a akcentů</label>
                <div className="flex items-center gap-3 mt-1.5">
                  <input
                    type="color"
                    value={customPrimaryColor}
                    onChange={(e) => setCustomPrimaryColor(e.target.value)}
                    className="w-9 h-9 rounded-xl border border-slate-300 cursor-pointer p-0.5 bg-slate-50"
                  />
                  <input
                    type="text"
                    value={customPrimaryColor}
                    onChange={(e) => setCustomPrimaryColor(e.target.value)}
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-amber-400 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-700 font-bold block">Pozice plovoucího tlačítka</label>
                <div className="grid grid-cols-2 gap-2 mt-1.5">
                  <button
                    type="button"
                    onClick={() => setWidgetPosition('bottom-right')}
                    className={`p-2.5 rounded-xl border font-bold text-xs transition-all ${
                      widgetPosition === 'bottom-right' 
                        ? 'bg-amber-500/20 border-amber-500 text-amber-400' 
                        : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-800'
                    }`}
                  >
                    ↘ Vpravo dole
                  </button>
                  <button
                    type="button"
                    onClick={() => setWidgetPosition('bottom-left')}
                    className={`p-2.5 rounded-xl border font-bold text-xs transition-all ${
                      widgetPosition === 'bottom-left' 
                        ? 'bg-amber-500/20 border-amber-500 text-amber-400' 
                        : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-800'
                    }`}
                  >
                    ↙ Vlevo dole
                  </button>
                </div>
              </div>

              <div>
                <label className="text-slate-700 font-bold block">Text plovoucího spouštěče</label>
                <input
                  type="text"
                  value={buttonText}
                  onChange={(e) => setButtonText(e.target.value)}
                  className="w-full mt-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
          </div>

          {/* One-Line Embed Code Card */}
          <div className="bg-white text-slate-900 p-6 rounded-3xl border border-slate-200 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Code2 className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Embed Kód (1 řádek)</h3>
              </div>
              <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/30">
                CDN aktivní
              </span>
            </div>

            {/* Platform Selector Tabs */}
            <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-xl border border-slate-200 text-[11px] font-semibold">
              <button
                onClick={() => setSelectedSnippetType('html')}
                className={`flex-1 py-1.5 rounded-lg transition-colors ${selectedSnippetType === 'html' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-500 hover:text-slate-900'}`}
              >
                HTML / JS
              </button>
              <button
                onClick={() => setSelectedSnippetType('wordpress')}
                className={`flex-1 py-1.5 rounded-lg transition-colors ${selectedSnippetType === 'wordpress' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-500 hover:text-slate-900'}`}
              >
                WordPress
              </button>
              <button
                onClick={() => setSelectedSnippetType('webflow')}
                className={`flex-1 py-1.5 rounded-lg transition-colors ${selectedSnippetType === 'webflow' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-500 hover:text-slate-900'}`}
              >
                Webflow
              </button>
              <button
                onClick={() => setSelectedSnippetType('react')}
                className={`flex-1 py-1.5 rounded-lg transition-colors ${selectedSnippetType === 'react' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-500 hover:text-slate-900'}`}
              >
                React/Next
              </button>
            </div>

            {/* Code Block */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 font-mono text-[11px] text-amber-300 relative overflow-x-auto whitespace-pre-wrap leading-relaxed">
              {snippetCodes[selectedSnippetType]}
            </div>

            <button
              onClick={handleCopyCode}
              className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-lg transition-all flex items-center justify-center gap-2"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Kód zkopírován do schránky!' : 'Zkopírovat Embed Script'}</span>
            </button>
          </div>

          {/* Performance & Spec Badges */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 text-xs space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Čas načtení v prohlížeči:</span>
              <span className="font-bold text-green-400">⚡ 0.8 s (garance do 2.0 s)</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Velikost CDN skriptu:</span>
              <span className="font-bold text-slate-800">14.2 kB (Gzipped)</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Automatické vytvoření zakázky:</span>
              <span className="font-bold text-amber-400">✓ Okamžitý zápis do CRM</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">SMS a e-mail potvrzení:</span>
              <span className="font-bold text-green-400">✓ Automaticky odesíláno</span>
            </div>
          </div>
        </div>

        {/* Right Column: Live Website Mockup Simulator (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Eye className="w-4 h-4 text-amber-400" />
              Živý náhled na webu stavební firmy
            </h3>
            <span className="text-xs text-slate-500">Interaktivní simulace</span>
          </div>

          {/* Browser Window Mockup */}
          <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-2xl flex flex-col h-[650px] relative">
            {/* Browser Window Header */}
            <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-rose-500/80" />
                <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                <div className="w-3 h-3 rounded-full bg-green-500/80" />
              </div>

              <div className="bg-white px-6 py-1 rounded-xl text-[11px] text-slate-500 font-mono border border-slate-200 flex items-center gap-2">
                <Globe className="w-3 h-3 text-slate-500" />
                <span>https://www.{branding.name.toLowerCase().replace(/[^a-z0-9]/g, '')}-stavby.cz</span>
              </div>

              <div className="w-12" />
            </div>

            {/* Simulated Website Canvas Content */}
            <div className="flex-1 bg-slate-50 overflow-y-auto relative text-slate-900">
              {/* Fake Website Navigation */}
              <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/95 backdrop-blur-md sticky top-0 z-10">
                <div className="flex items-center gap-2.5">
                  <div 
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-950 font-bold text-xs bg-amber-500"
                  >
                    {branding.name.substring(0, 2).toUpperCase()}
                  </div>
                  <span className="font-extrabold text-xs text-slate-900 tracking-tight">{branding.name}</span>
                </div>

                <div className="hidden sm:flex items-center gap-5 text-[11px] font-semibold text-slate-500">
                  <span>Realizace</span>
                  <span>Pergoly & Střechy</span>
                  <span>O nás</span>
                  <span>Kontakt</span>
                </div>

                <button
                  onClick={() => setIsWidgetModalOpen(true)}
                  className="px-3.5 py-1.5 rounded-lg text-[11px] font-bold text-slate-950 bg-amber-500 shadow-xs hover:bg-amber-400 transition-all"
                >
                  Poptat nabídku
                </button>
              </div>

              {/* Fake Website Hero Section */}
              <div className="p-8 sm:p-12 text-center space-y-4 max-w-xl mx-auto">
                <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-white border border-slate-200 text-amber-400 uppercase tracking-wider">
                  Profesionální dřevostavby & pergoly {branding.city}
                </span>
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-tight">
                  Stavíme prémiové pergoly a dřevostavby na míru
                </h1>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Získejte okamžitý odhad rozpočtu díky naší kalkulačce. Nahrajte fotografii místa realizace a my se vám ozveme s návrhem.
                </p>

                <div className="pt-2 flex justify-center gap-3">
                  <button
                    onClick={() => setIsWidgetModalOpen(true)}
                    className="px-6 py-3 rounded-xl text-xs font-extrabold text-slate-950 bg-amber-500 hover:bg-amber-400 shadow-lg flex items-center gap-2 transition-all"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Spočítat nezávaznou poptávku</span>
                  </button>
                </div>
              </div>

              {/* Simulated Feature Cards */}
              <div className="px-8 grid grid-cols-3 gap-3 max-w-lg mx-auto pb-16 text-center text-xs">
                <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-1">
                  <span className="text-xl block">🪵</span>
                  <p className="font-bold text-slate-800 text-[11px]">Pergoly & Terasy</p>
                  <p className="text-[10px] text-slate-500">Záruka 5 let</p>
                </div>
                <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-1">
                  <span className="text-xl block">🏠</span>
                  <p className="font-bold text-slate-800 text-[11px]">Střechy & Krovy</p>
                  <p className="text-[10px] text-slate-500">Tesařští mistři</p>
                </div>
                <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-1">
                  <span className="text-xl block">⚡</span>
                  <p className="font-bold text-slate-800 text-[11px]">Rychlost</p>
                  <p className="text-[10px] text-slate-500">Rozpočet do 24h</p>
                </div>
              </div>

              {/* Simulated Floating Widget Trigger Button (Simulating real embed behavior) */}
              <div 
                className={`absolute bottom-6 z-20 ${widgetPosition === 'bottom-right' ? 'right-6' : 'left-6'}`}
              >
                <button
                  onClick={() => setIsWidgetModalOpen(true)}
                  className="flex items-center gap-2.5 px-5 py-3 rounded-full text-slate-950 font-bold text-xs shadow-2xl hover:scale-105 transition-all bg-amber-500 hover:bg-amber-400 border border-amber-300/40 animate-bounce-subtle"
                >
                  <Sparkles className="w-4 h-4 text-slate-950" />
                  <span>{buttonText}</span>
                  <span className="w-2 h-2 rounded-full bg-green-950 border border-green-400 animate-ping" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Embed Lead Widget Modal Instance */}
      <EmbedLeadWidget
        branding={{
          ...branding,
          primaryColor: customPrimaryColor
        }}
        isOpen={isWidgetModalOpen}
        onClose={() => setIsWidgetModalOpen(false)}
        onSubmitLead={handleWidgetSubmit}
        customColor={customPrimaryColor}
      />
    </div>
  );
};
