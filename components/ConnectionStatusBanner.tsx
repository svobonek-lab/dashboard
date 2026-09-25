import React, { useState, useEffect } from 'react';
import { Database, HardDrive, Wifi, RefreshCw, CheckCircle2, AlertCircle, Settings2, X } from 'lucide-react';
import { repositoryManager, crmRepo } from '../lib/data/repositoryFactory';
import { RepositoryHealthStatus, StorageMode } from '../lib/data/types';
import { getConfiguredSynologyToken } from '../lib/data/synologyToken';

export const ConnectionStatusBanner: React.FC = () => {
  const [health, setHealth] = useState<RepositoryHealthStatus | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [currentMode, setCurrentMode] = useState<StorageMode>(repositoryManager.getMode());

  const [synologyUrl, setSynologyUrl] = useState(() => {
    return localStorage.getItem('crm_synology_endpoint') || 'http://synology.local:8080/api';
  });
  const [synologyToken, setSynologyToken] = useState(() => {
    return getConfiguredSynologyToken(localStorage.getItem('crm_synology_token')) || '';
  });

  const checkHealth = async () => {
    setIsChecking(true);
    try {
      const status = await crmRepo.getHealthStatus();
      setHealth(status);
    } catch {
      setHealth({
        ok: false,
        latencyMs: 0,
        mode: currentMode,
        message: 'Nepodařilo se ověřit stav úložiště',
        lastChecked: new Date().toLocaleTimeString('cs-CZ'),
      });
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    checkHealth();
    const unsubscribe = repositoryManager.subscribe((newMode) => {
      setCurrentMode(newMode);
      checkHealth();
    });
    const interval = setInterval(checkHealth, 30000); // Poll every 30s
    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [currentMode]);

  const handleApplyConfig = (newMode: StorageMode) => {
    repositoryManager.setMode(newMode, {
      endpoint: synologyUrl,
      token: synologyToken,
    });
    setCurrentMode(newMode);
    setIsConfigOpen(false);
    checkHealth();
  };

  const getModeLabel = () => {
    if (currentMode === 'synology') return 'Synology NAS (On-Premise)';
    if (currentMode === 'local') return 'Lokální zabezpečené úložiště';
    return 'Supabase Cloud (PostgreSQL)';
  };

  return (
    <>
      <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg border border-slate-200 bg-white/90 text-xs text-slate-600 shadow-xs">
        <div className="flex items-center gap-1.5 font-medium">
          {currentMode === 'synology' ? (
            <HardDrive className="w-3.5 h-3.5 text-brand-primary" />
          ) : (
            <Database className="w-3.5 h-3.5 text-brand-primary" />
          )}
          <span className="hidden sm:inline font-semibold text-slate-800">
            {currentMode === 'synology' ? 'Synology NAS' : 'Cloud DB'}
          </span>
        </div>

        <div className="flex items-center gap-1 pl-1 border-l border-slate-200">
          <span
            className={`w-2 h-2 rounded-full ${
              health?.ok ? 'bg-green-500 ring-2 ring-green-100' : 'bg-amber-500 ring-2 ring-amber-100'
            }`}
          />
          <span className="text-[11px] text-slate-500 font-mono">
            {health?.latencyMs ? `${health.latencyMs}ms` : 'ok'}
          </span>
        </div>

        <button
          onClick={() => setIsConfigOpen(true)}
          className="p-1 hover:bg-slate-100 rounded-md text-slate-500 hover:text-slate-700 transition-colors"
          title="Konfigurace datové vrstvy (Cloud vs Synology)"
          aria-label="Nastavení úložiště"
        >
          <Settings2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {isConfigOpen && (
        <div className="fixed inset-0 z-50 bg-slate-50/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-5 text-slate-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-brand-primary-soft border border-brand-primary-soft flex items-center justify-center text-brand-primary">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Architektura datového úložiště</h3>
                  <p className="text-xs text-slate-500">Volba mezi Cloudem a privátním Synology NAS</p>
                </div>
              </div>
              <button
                onClick={() => setIsConfigOpen(false)}
                className="p-1 text-slate-500 hover:text-slate-700 rounded-lg hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Health Status Card */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                {health?.ok ? (
                  <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                )}
                <div>
                  <div className="font-semibold text-slate-800">{getModeLabel()}</div>
                  <div className="text-[11px] text-slate-500">{health?.message || 'Kontrola spojení...'}</div>
                </div>
              </div>
              <button
                onClick={checkHealth}
                disabled={isChecking}
                className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-600 disabled:opacity-50 transition-colors"
                title="Zkontrolovat odezvu"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {/* Storage Mode Selector */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Aktivní režim</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setCurrentMode('cloud')}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    currentMode === 'cloud'
                      ? 'border-brand-primary bg-brand-primary-soft/50 text-text font-semibold ring-2 ring-brand-primary-soft'
                      : 'border-slate-200 hover:border-slate-300 text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-xs font-bold mb-1">
                    <Database className="w-3.5 h-3.5 text-brand-primary" /> Cloud (Supabase)
                  </div>
                  <p className="text-[10px] text-slate-500 font-normal">
                    Centrální synchronizovaná PostgreSQL databáze.
                  </p>
                </button>

                <button
                  onClick={() => setCurrentMode('synology')}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    currentMode === 'synology'
                      ? 'border-brand-primary bg-brand-primary-soft/50 text-indigo-900 font-semibold ring-2 ring-indigo-500/20'
                      : 'border-slate-200 hover:border-slate-300 text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-xs font-bold mb-1">
                    <HardDrive className="w-3.5 h-3.5 text-brand-primary" /> Synology NAS
                  </div>
                  <p className="text-[10px] text-slate-500 font-normal">
                    On-premise privátní síťové úložiště firmy.
                  </p>
                </button>
              </div>
            </div>

            {/* Synology NAS Configuration Form (Shown when Synology is selected) */}
            {currentMode === 'synology' && (
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3 animate-in fade-in">
                <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Wifi className="w-3.5 h-3.5 text-brand-primary" /> Nastavení Synology NAS REST API
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-600">IP adresa / URL endpoint:</label>
                  <input
                    type="text"
                    value={synologyUrl}
                    onChange={(e) => setSynologyUrl(e.target.value)}
                    placeholder="http://192.168.1.100:8080/api nebo http://synology.local:8080/api"
                    className="w-full text-xs font-mono px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-600">Autorizační token (Bearer API Key):</label>
                  <input
                    type="password"
                    value={synologyToken}
                    onChange={(e) => setSynologyToken(e.target.value)}
                    placeholder="synology-app-bearer-key"
                    className="w-full text-xs font-mono px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setIsConfigOpen(false)}
                className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Zrušit
              </button>
              <button
                onClick={() => handleApplyConfig(currentMode)}
                className="px-4 py-2 text-xs font-semibold text-slate-900 bg-white hover:bg-slate-800 rounded-xl shadow-xs transition-colors"
              >
                Uložit a aktivovat
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
