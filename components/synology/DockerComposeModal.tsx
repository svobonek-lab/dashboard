import React, { useState } from 'react';
import { SynologyConfig } from '@/types/synology';
import { generateSynologyDockerCompose } from '@/lib/synology/synologyConnector';
import { 
  X, 
  Copy, 
  Check, 
  Download, 
  Terminal, 
  Server, 
  Layers, 
  ExternalLink, 
  ShieldCheck, 
  Info,
  CheckCircle2,
  FolderSync,
  Database,
  Key,
  Globe,
  Files
} from 'lucide-react';

interface DockerComposeModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: SynologyConfig;
  organizationId: string;
}

export const DockerComposeModal: React.FC<DockerComposeModalProps> = ({
  isOpen,
  onClose,
  config,
  organizationId
}) => {
  const [copied, setCopied] = useState(false);
  const dockerComposeContent = generateSynologyDockerCompose(config, organizationId);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(dockerComposeContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownload = () => {
    const blob = new Blob([dockerComposeContent], { type: 'text/yaml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'docker-compose.yml';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              <Server className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white tracking-tight">Synology Container Manager (Docker)</h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-green-500/20 text-green-300 border border-green-500/30">
                  Ready to Deploy
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Spusťte zabezpečený konektor přímo na svém Synology NAS bez otevírání portů do internetu.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6 bg-slate-50">
          
          {/* 4 Pillars Architecture Status (SQL, Files, HTTPS, API Token) */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
            <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-xs flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <Database className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] uppercase font-bold text-slate-400">Pillar 1</div>
                <div className="text-xs font-bold text-slate-800 truncate">SQL Databáze</div>
                <div className="text-[10px] text-slate-500 truncate">{config.databaseSync?.driver?.toUpperCase() || 'MariaDB/PG'}</div>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-xs flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <Files className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] uppercase font-bold text-slate-400">Pillar 2</div>
                <div className="text-xs font-bold text-slate-800 truncate">Soubory (Files)</div>
                <div className="text-[10px] text-slate-500 truncate">4 složky / Inotify</div>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-xs flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <Globe className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] uppercase font-bold text-slate-400">Pillar 3</div>
                <div className="text-xs font-bold text-slate-800 truncate">HTTPS / TLS 1.3</div>
                <div className="text-[10px] text-slate-500 truncate">Strict SSL & AES-256</div>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-xs flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                <Key className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] uppercase font-bold text-slate-400">Pillar 4</div>
                <div className="text-xs font-bold text-slate-800 truncate">API Token</div>
                <div className="text-[10px] text-slate-500 truncate font-mono">Bearer auth</div>
              </div>
            </div>
          </div>

          {/* Quick Steps Guide */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-600" />
              Postup instalace na Synology DSM (3 rychlé kroky)
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                <span className="font-bold text-cyan-600 block mb-1">1. Otevřete Container Manager</span>
                V Synology DSM otevřete aplikaci <strong>Container Manager</strong> → sekce <strong>Projekt</strong> → klikněte na <strong>Vytvořit</strong>.
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                <span className="font-bold text-cyan-600 block mb-1">2. Vložte Docker Compose</span>
                Pojmenujte projekt např. <code className="bg-slate-200 px-1 rounded text-slate-800 font-mono">buildflow-connector</code> a vložte kód níže do editoru.
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                <span className="font-bold text-cyan-600 block mb-1">3. Spusťte projekt</span>
                Klikněte na <strong>Další</strong> a <strong>Dokončit</strong>. Kontejner automaticky naváže šifrované spojení a zahájí synchronizaci.
              </div>
            </div>
          </div>

          {/* Code Viewer with Copy Button */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 font-mono flex items-center gap-2">
                <Terminal className="w-4 h-4 text-slate-500" />
                docker-compose.yml
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownload}
                  className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
                >
                  <Download className="w-3.5 h-3.5 text-slate-600" />
                  Stáhnout soubor
                </button>
                <button
                  onClick={handleCopy}
                  className="px-3.5 py-1.5 rounded-xl bg-brand-primary hover:bg-brand-primary/90 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-white" />
                      Zkopírováno!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      Zkopírovat YAML
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="rounded-2xl overflow-hidden border border-slate-800 bg-[#0F172A] shadow-xl">
              <pre className="p-4 text-xs font-mono text-cyan-300 overflow-x-auto leading-relaxed max-h-[340px]">
                {dockerComposeContent}
              </pre>
            </div>
          </div>

          {/* Security Guarantee Box */}
          <div className="p-4 rounded-2xl bg-cyan-50/70 border border-cyan-200 flex items-start gap-3 text-xs text-cyan-950">
            <ShieldCheck className="w-5 h-5 text-cyan-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-cyan-900">Maximální bezpečnost: Žádné heslo neopouští váš NAS</p>
              <p className="text-cyan-800 mt-0.5 leading-relaxed">
                Konektor v Dockeru komunikuje s lokální databází MariaDB/PostgreSQL na interní síti NAS a do cloudu odesílá pouze metadata a vybrané záznamy zakázek přes HTTPS s Bearer tokenem. Vaše hesla do databází zůstávají výhradně v NAS.
              </p>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-white border-t border-slate-200 flex items-center justify-between">
          <div className="text-xs text-slate-500 font-medium flex items-center gap-2">
            <FolderSync className="w-4 h-4 text-slate-400" />
            <span>Mapuje složky: /volume1/Zakazky, /Nabidky, /Realizace, /Fotky</span>
          </div>
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
          >
            Hotovo
          </button>
        </div>

      </div>
    </div>
  );
};
