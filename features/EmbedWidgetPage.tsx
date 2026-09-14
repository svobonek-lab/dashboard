import React, { useState } from 'react';
import { 
  Code2, 
  Copy, 
  Check, 
  Sparkles, 
  Eye, 
  Globe, 
  Building2,
  Layers,
  Zap,
  CheckCircle2
} from 'lucide-react';
import { CompanyBranding } from '../types';
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
  const activeBrandColor = branding.primaryColor || currentOrg?.primary_color || '#2563eb';
  const [customPrimaryColor, setCustomPrimaryColor] = useState(activeBrandColor);
  const [widgetPosition, setWidgetPosition] = useState<'bottom-right' | 'bottom-left'>('bottom-right');
  const [buttonText, setButtonText] = useState('Nezávazná poptávka');
  const [isWidgetModalOpen, setIsWidgetModalOpen] = useState(false);

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
    setIsWidgetModalOpen(false);
  };

  return (
    <div className="space-y-8 pb-16 text-slate-900 font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div 
              className="w-7 h-7 rounded-lg flex items-center justify-center text-white"
              style={{ backgroundColor: customPrimaryColor }}
            >
              <Code2 className="w-4 h-4" />
            </div>
            <span className="text-xs font-black uppercase tracking-wider" style={{ color: customPrimaryColor }}>
              Embeddable Widget & Generátor kódů
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
            Poptávkový Widget pro firemní web
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Jednoduché vložení plovoucího poptávkového formuláře na jakýkoliv web (Wordpress, Webflow, HTML, React).
          </p>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Customizer & Code Snippet (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Customizer Box */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-5">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-4 h-4" style={{ color: customPrimaryColor }} />
              Konfigurace vzhledu widgetu
            </h2>

            <div className="space-y-4 text-xs">
              <div>
                <label className="text-slate-600 font-bold block mb-1.5">Barva tlačítka a akcentů</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={customPrimaryColor}
                    onChange={(e) => setCustomPrimaryColor(e.target.value)}
                    className="w-10 h-10 rounded-xl border border-slate-200 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={customPrimaryColor}
                    onChange={(e) => setCustomPrimaryColor(e.target.value)}
                    className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-900 font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-600 font-bold block mb-1.5">Pozice na webu</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setWidgetPosition('bottom-right')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                      widgetPosition === 'bottom-right'
                        ? 'border-brand-primary bg-brand-primary-soft text-brand-primary'
                        : 'border-slate-200 bg-slate-50 text-slate-600'
                    }`}
                  >
                    Vpravo dole ↘
                  </button>
                  <button
                    type="button"
                    onClick={() => setWidgetPosition('bottom-left')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                      widgetPosition === 'bottom-left'
                        ? 'border-brand-primary bg-brand-primary-soft text-brand-primary'
                        : 'border-slate-200 bg-slate-50 text-slate-600'
                    }`}
                  >
                    Vlevo dole ↙
                  </button>
                </div>
              </div>

              <div>
                <label className="text-slate-600 font-bold block mb-1.5">Text na tlačítku</label>
                <input
                  type="text"
                  value={buttonText}
                  onChange={(e) => setButtonText(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900"
                />
              </div>
            </div>
          </div>

          {/* Code Snippet Box */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Code2 className="w-4 h-4" style={{ color: customPrimaryColor }} />
                Embed kód pro váš web
              </h2>
              <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200 font-bold">
                CDN Aktivní
              </span>
            </div>

            {/* Platform Selector Tabs */}
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-[11px] font-semibold">
              {(['html', 'wordpress', 'webflow', 'react'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setSelectedSnippetType(type)}
                  className={`flex-1 py-1.5 rounded-lg transition-all capitalize ${
                    selectedSnippetType === type
                      ? 'bg-white text-slate-900 font-extrabold shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {type === 'html' ? 'HTML/JS' : type === 'react' ? 'React/Next' : type}
                </button>
              ))}
            </div>

            {/* Code Block */}
            <div className="bg-slate-900 p-4 rounded-2xl font-mono text-[11px] text-brand-primary relative overflow-x-auto whitespace-pre-wrap leading-relaxed">
              {snippetCodes[selectedSnippetType]}
            </div>

            <button
              onClick={handleCopyCode}
              className="w-full py-3 rounded-xl text-white text-xs font-bold shadow-md transition-all flex items-center justify-center gap-2 hover:opacity-95"
              style={{ backgroundColor: customPrimaryColor }}
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Kód zkopírován do schránky!' : 'Zkopírovat Embed Script'}</span>
            </button>
          </div>

          {/* Specs */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 text-xs space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Čas načtení v prohlížeči:</span>
              <span className="font-bold text-emerald-600">⚡ 0.8 s (garance do 2.0 s)</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Velikost CDN skriptu:</span>
              <span className="font-bold text-slate-800">14.2 kB (Gzipped)</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Zápis do CRM:</span>
              <span className="font-bold" style={{ color: customPrimaryColor }}>✓ Okamžitý zápis do leads</span>
            </div>
          </div>
        </div>

        {/* Right Column: Live Website Mockup Simulator (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Eye className="w-4 h-4" style={{ color: customPrimaryColor }} />
              Živý náhled na webu stavební firmy
            </h3>
            <span className="text-xs text-slate-500">Interaktivní simulace</span>
          </div>

          {/* Browser Window Mockup */}
          <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xl flex flex-col h-[650px] relative">
            {/* Browser Header */}
            <div className="bg-slate-100 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-rose-400" />
                <div className="w-3 h-3 rounded-full bg-amber-400" />
                <div className="w-3 h-3 rounded-full bg-emerald-400" />
              </div>

              <div className="bg-white px-6 py-1 rounded-xl text-[11px] text-slate-500 font-mono border border-slate-200 flex items-center gap-2">
                <Globe className="w-3 h-3 text-slate-400" />
                <span>https://www.{(branding?.name || 'Firma').toLowerCase().replace(/[^a-z0-9]/g, '')}-stavby.cz</span>
              </div>

              <div className="w-12" />
            </div>

            {/* Simulated Website Canvas Content */}
            <div className="flex-1 bg-slate-50 overflow-y-auto relative text-slate-900">
              {/* Fake Website Navigation */}
              <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-white/95 backdrop-blur-md sticky top-0 z-10">
                <div className="flex items-center gap-2.5">
                  <div 
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-white font-bold text-xs"
                    style={{ backgroundColor: customPrimaryColor }}
                  >
                    {(branding?.name || 'Firma').substring(0, 2).toUpperCase()}
                  </div>
                  <span className="font-extrabold text-xs text-slate-900 tracking-tight">{(branding?.name || 'Firma')}</span>
                </div>

                <div className="hidden sm:flex items-center gap-5 text-[11px] font-semibold text-slate-500">
                  <span>Realizace</span>
                  <span>Pergoly & Střechy</span>
                  <span>O nás</span>
                  <span>Kontakt</span>
                </div>

                <button
                  onClick={() => setIsWidgetModalOpen(true)}
                  className="px-3.5 py-1.5 rounded-lg text-[11px] font-bold text-white shadow-xs transition-all hover:opacity-95"
                  style={{ backgroundColor: customPrimaryColor }}
                >
                  Poptat nabídku
                </button>
              </div>

              {/* Fake Website Hero Section */}
              <div className="p-8 sm:p-12 text-center space-y-4 max-w-xl mx-auto">
                <span 
                  className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border border-slate-200"
                  style={{ backgroundColor: `${customPrimaryColor}15`, color: customPrimaryColor }}
                >
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
                    className="px-6 py-3 rounded-xl text-xs font-extrabold text-white shadow-lg flex items-center gap-2 transition-all hover:opacity-95"
                    style={{ backgroundColor: customPrimaryColor }}
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

              {/* Floating Widget Button */}
              <div 
                className={`absolute bottom-6 z-20 ${widgetPosition === 'bottom-right' ? 'right-6' : 'left-6'}`}
              >
                <button
                  onClick={() => setIsWidgetModalOpen(true)}
                  className="flex items-center gap-2.5 px-5 py-3 rounded-full text-white font-bold text-xs shadow-2xl hover:scale-105 transition-all border border-white/20"
                  style={{ backgroundColor: customPrimaryColor }}
                >
                  <Sparkles className="w-4 h-4 text-white" />
                  <span>{buttonText}</span>
                  <span className="w-2 h-2 rounded-full bg-white animate-ping" />
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
