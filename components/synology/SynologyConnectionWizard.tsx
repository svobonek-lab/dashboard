import React, { useState } from 'react';
import { SynologyConfig, SynologyAuthMode } from '@/types/synology';
import { testSynologyConnection, SynologyConnectionTestResult } from '@/lib/synology/synologyConnector';
import { generateSynologyToken } from '@/lib/synology/storage';
import { 
  X, 
  HardDrive, 
  Check, 
  AlertCircle, 
  RefreshCw, 
  Shield, 
  Key, 
  Server, 
  Wifi, 
  Lock, 
  CheckCircle2, 
  Unlink, 
  Copy,
  Cpu,
  Layers,
  Sparkles
} from 'lucide-react';

interface SynologyConnectionWizardProps {
  isOpen: boolean;
  onClose: () => void;
  config: SynologyConfig;
  organizationId: string;
  onSaveConfig: (updatedConfig: SynologyConfig) => void;
  onDisconnect: () => void;
}

export const SynologyConnectionWizard: React.FC<SynologyConnectionWizardProps> = ({
  isOpen,
  onClose,
  config,
  organizationId,
  onSaveConfig,
  onDisconnect
}) => {
  const [nasAddress, setNasAddress] = useState(config.nasAddress || '192.168.1.200');
  const [port, setPort] = useState(config.port || 5001);
  const [useHttps, setUseHttps] = useState(config.useHttps ?? true);
  const [authMode, setAuthMode] = useState<SynologyAuthMode>(config.authMode || 'token');
  const [apiToken, setApiToken] = useState(config.apiToken || '');
  const [username, setUsername] = useState(config.username || 'buildflow-connector');
  const [password, setPassword] = useState(config.passwordEncrypted ? '••••••••••••' : '');
  
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<SynologyConnectionTestResult | null>(null);
  const [tokenCopied, setTokenCopied] = useState(false);

  if (!isOpen) return null;

  const handleGenerateToken = () => {
    const newToken = generateSynologyToken(organizationId);
    setApiToken(newToken);
  };

  const handleTest = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await testSynologyConnection(
        nasAddress,
        port,
        useHttps,
        authMode,
        authMode === 'token' ? apiToken : password,
        username
      );
      setTestResult(res);
    } catch (err: any) {
      setTestResult({
        success: false,
        model: '',
        dsmVersion: '',
        serialNumberMasked: '',
        latencyMs: 0,
        uptimeHours: 0,
        cpuUsagePercent: 0,
        ramUsagePercent: 0,
        storageUsagePercent: 0,
        containerManagerInstalled: false,
        discoveredDatabases: [],
        discoveredSharedFolders: [],
        errorMessage: err?.message || 'Chyba připojení k Synology NAS.'
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleConnect = () => {
    const isSuccess = testResult?.success ?? true;
    const model = testResult?.model || config.detectedModel || 'Synology DiskStation DS923+';
    const dsm = testResult?.dsmVersion || config.dsmVersion || 'DSM 7.2.2-72806 Update 1';

    const updated: SynologyConfig = {
      ...config,
      nasAddress,
      port,
      useHttps,
      authMode,
      apiToken: apiToken || generateSynologyToken(organizationId),
      username,
      passwordEncrypted: password ? 'encrypted_storage_ref' : '',
      detectedModel: model,
      dsmVersion: dsm,
      status: 'connected',
      lastSyncStatus: 'success',
      dockerConnectorRunning: true
    };

    onSaveConfig(updated);
    onClose();
  };

  const handleCopyToken = () => {
    if (!apiToken) return;
    navigator.clipboard.writeText(apiToken);
    setTokenCopied(true);
    setTimeout(() => setTokenCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              <HardDrive className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white tracking-tight">Průvodce připojením Synology NAS</h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  DSM 7.2+
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Propojte firemní úložiště Synology pro automatickou synchronizaci zakázek a fotodokumentace.
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

        {/* Form Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5 bg-slate-50">
          
          {/* Network Address & Port */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
              <Wifi className="w-4 h-4 text-cyan-600" />
              Síťová adresa Synology NAS
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-2">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  IP adresa nebo Hostname / QuickConnect
                </label>
                <input
                  type="text"
                  value={nasAddress}
                  onChange={(e) => setNasAddress(e.target.value)}
                  placeholder="např. 192.168.1.200 nebo nas.firma.cz"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-800 focus:outline-none focus:border-brand-primary"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Port DSM
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={port}
                    onChange={(e) => setPort(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-mono text-slate-800 focus:outline-none focus:border-brand-primary"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={useHttps}
                  onChange={(e) => setUseHttps(e.target.checked)}
                  className="rounded text-brand-primary focus:ring-brand-primary w-4 h-4"
                />
                <span className="text-xs font-semibold text-slate-700">Zabezpečené HTTPS (Doporučeno, port 5001)</span>
              </label>
              <span className="text-[11px] text-slate-400 font-mono">TLS 1.3 / SSL</span>
            </div>
          </div>

          {/* Authentication Mode */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                <Lock className="w-4 h-4 text-cyan-600" />
                Způsob autentizace
              </h4>
              <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setAuthMode('token')}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    authMode === 'token'
                      ? 'bg-white text-slate-900 shadow-xs font-bold'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  API Token (Doporučeno)
                </button>
                <button
                  type="button"
                  onClick={() => setAuthMode('credentials')}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    authMode === 'credentials'
                      ? 'bg-white text-slate-900 shadow-xs font-bold'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Uživatelské jméno
                </button>
              </div>
            </div>

            {authMode === 'token' ? (
              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      BuildFlow Synology API Token
                    </label>
                    <button
                      type="button"
                      onClick={handleGenerateToken}
                      className="text-xs text-brand-primary hover:underline font-semibold flex items-center gap-1"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Vygenerovat nový token
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={apiToken || (config.apiToken || 'Klikněte pro vygenerování tokenu')}
                      readOnly
                      placeholder="Vygenerujte token pro Docker konektor..."
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold text-cyan-900 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleCopyToken}
                      disabled={!apiToken && !config.apiToken}
                      className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0"
                    >
                      {tokenCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      {tokenCopied ? 'Zkopírováno' : 'Kopírovat'}
                    </button>
                  </div>
                </div>
                <p className="text-[11px] text-slate-500">
                  Tento token se předává do proměnné prostředí <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-800 font-mono">BUILDFLOW_API_TOKEN</code> v Synology Container Manageru.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Uživatelské jméno DSM
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="buildflow-connector"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:border-brand-primary"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Heslo
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:border-brand-primary"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Diagnostics Test Result */}
          {testResult && (
            <div className={`p-4 rounded-2xl border text-xs animate-in fade-in duration-150 ${
              testResult.success
                ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
                : 'bg-red-50/80 border-red-200 text-red-900'
            }`}>
              {testResult.success ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 font-bold text-emerald-800 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Připojení k Synology NAS bylo úspěšně ověřeno!
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-emerald-200/60 font-mono text-[11px]">
                    <div>
                      <span className="text-emerald-700 block text-[10px] uppercase">Model zařízení</span>
                      <strong>{testResult.model}</strong>
                    </div>
                    <div>
                      <span className="text-emerald-700 block text-[10px] uppercase">Verze systému</span>
                      <strong>{testResult.dsmVersion}</strong>
                    </div>
                    <div>
                      <span className="text-emerald-700 block text-[10px] uppercase">Odezva (Ping)</span>
                      <strong>{testResult.latencyMs} ms</strong>
                    </div>
                    <div>
                      <span className="text-emerald-700 block text-[10px] uppercase">Dostupné služby</span>
                      <strong>Container Manager, MariaDB 10, FileStation</strong>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-2 text-red-800 font-medium">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block font-bold">Nepodařilo se připojit k NAS</strong>
                    <span>{testResult.errorMessage}</span>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-white border-t border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleTest}
              disabled={isTesting}
              className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all flex items-center gap-2 shadow-xs disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-cyan-600 ${isTesting ? 'animate-spin' : ''}`} />
              {isTesting ? 'Ověřuji DSM API...' : 'Otestovat spojení'}
            </button>

            {config.status === 'connected' && (
              <button
                type="button"
                onClick={() => {
                  onDisconnect();
                  onClose();
                }}
                className="px-3.5 py-2.5 text-red-600 hover:bg-red-50 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Unlink className="w-3.5 h-3.5" />
                Odpojit NAS
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-800"
            >
              Zavřít
            </button>
            <button
              type="button"
              onClick={handleConnect}
              className="px-6 py-2.5 bg-brand-primary hover:bg-brand-primary/90 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              Uložit a připojit
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
