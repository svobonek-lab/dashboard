import React, { useState } from 'react';
import { X, Download, FileArchive, Check, Sparkles, Building2, Code2 } from 'lucide-react';
import { CompanyBranding } from '../types';
import JSZip from 'jszip';

interface ExportZipModalProps {
  isOpen: boolean;
  onClose: () => void;
  branding: CompanyBranding;
}

export const ExportZipModal: React.FC<ExportZipModalProps> = ({
  isOpen,
  onClose,
  branding
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  if (!isOpen) return null;

  const handleDownloadZip = async () => {
    setIsGenerating(true);
    try {
      const zip = new JSZip();

      // 1. Branding config
      zip.file('company.json', JSON.stringify(branding, null, 2));

      // 2. Embed snippet HTML
      const embedHtml = `<!DOCTYPE html>
<html lang="cs">
<head>
  <meta charset="UTF-8">
  <title>${branding.name} - Poptávka & CRM Widget</title>
  <style>
    body { font-family: system-ui, sans-serif; background: #0f172a; color: #fff; padding: 40px; }
    .card { max-width: 600px; margin: 0 auto; background: #1e293b; padding: 24px; border-radius: 16px; border: 1px solid #334155; }
    .btn { background: ${branding.primaryColor}; color: #fff; border: none; padding: 12px 24px; border-radius: 8px; font-weight: bold; cursor: pointer; }
  </style>
</head>
<body>
  <div class="card">
    <h2>${branding.name}</h2>
    <p>${branding.city} • ${branding.phone}</p>
    <button class="btn" onclick="alert('Demo White-label Widget')">Odeslat poptávku</button>
  </div>
</body>
</html>`;
      zip.file('embed-demo.html', embedHtml);

      // 3. Readme
      zip.file('README.md', `# ${branding.name} - White Label CRM Package

Tento balíček obsahuje kompletní produkční konfiguraci pro firmu ${branding.name}.

- **Město**: ${branding.city}
- **Primární barva**: ${branding.primaryColor}
- **Služby**: ${branding.services.join(', ')}

Integrujte widget do svého webu vložením embed-demo.html nebo použitím REST API.
`);

      const blob = await zip.generateAsync({ type: 'blob' });
      const filename = `${branding.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-crm-whitelabel.zip`;
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setDownloadSuccess(true);
      setTimeout(() => {
        setDownloadSuccess(false);
        onClose();
      }, 2000);
    } catch (e) {
      console.error('Failed to generate ZIP:', e);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="bg-[#111726] border border-slate-200 rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl relative">
        
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-500 hover:text-slate-900 p-1 rounded-xl hover:bg-slate-800"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <FileArchive className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-900">Export White Label Balíčku</h3>
            <p className="text-xs text-slate-500">Kompletní samostatný balíček pro {branding.name}</p>
          </div>
        </div>

        <div className="bg-[#0B0F19] p-4 rounded-2xl border border-slate-200 space-y-2 text-xs text-slate-700">
          <p className="font-bold text-slate-900">Balíček obsahuje:</p>
          <ul className="space-y-1.5 list-disc list-inside text-slate-500 text-[11px]">
            <li>Firemní konfiguraci <code className="text-amber-400 font-mono">company.json</code></li>
            <li>Samostatný iframe widget s firemními barvami <code className="text-green-400 font-mono">embed-demo.html</code></li>
            <li>Dokumentaci pro IT techniky a webmastera</li>
          </ul>
        </div>

        {downloadSuccess ? (
          <div className="p-3.5 rounded-2xl bg-green-500/20 border border-green-500/40 text-green-300 text-xs font-bold flex items-center justify-center gap-2">
            <Check className="w-4 h-4" />
            <span>ZIP balíček byl úspěšně stažen!</span>
          </div>
        ) : (
          <button
            onClick={handleDownloadZip}
            disabled={isGenerating}
            className="w-full py-3.5 px-4 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isGenerating ? <Sparkles className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            <span>{isGenerating ? 'Generuji ZIP...' : 'Stáhnout kompletní ZIP archiv'}</span>
          </button>
        )}

      </div>
    </div>
  );
};
