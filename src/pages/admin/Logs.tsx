import React, { useState } from 'react';
import { Terminal, Shield, RefreshCw, Filter, Search, CheckCircle2, AlertTriangle, Info } from 'lucide-react';

export const AdminLogsPage: React.FC = () => {
  const [filterSeverity, setFilterSeverity] = useState<'all' | 'info' | 'warn' | 'sec'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const logs = [
    { id: '1', time: '11:45:02', tenant: 'Pergoly Praha s.r.o.', severity: 'INFO', action: 'LeadStatusChanged', details: 'Lead #L-891 status updated: "New" -> "Quote"', user: 'petr@pergoly.cz' },
    { id: '2', time: '11:42:15', tenant: 'Střechy Kovář & Syn', severity: 'INFO', action: 'QuoteGeneratedPDF', details: 'Quote #Q-2026-042 generated & downloaded (280 000 Kč)', user: 'kovar@strechy.cz' },
    { id: '3', time: '11:38:00', tenant: 'Dřevostavby Morava', severity: 'SEC', action: 'AuthTokenIssued', details: 'Owner logged in from IP 89.24.112.45', user: 'admin@drevostavby.cz' },
    { id: '4', time: '11:25:31', tenant: 'Fasády Liberec s.r.o.', severity: 'WARN', action: 'WebhookRetry', details: 'Stripe webhook retry attempt 2: Connection reset', user: 'system' },
    { id: '5', time: '11:15:10', tenant: 'Pergoly Praha s.r.o.', severity: 'INFO', action: 'PhotoUploaded', details: '3 field photos uploaded to project POL-2026-0492', user: 'novotny@pergoly.cz' },
    { id: '6', time: '10:59:44', tenant: 'Střechy Kovář & Syn', severity: 'INFO', action: 'CustomerPortalAccess', details: 'Customer viewed quote link via SMS token', user: 'customer' },
  ];

  const filteredLogs = logs.filter(l => {
    if (filterSeverity === 'info' && l.severity !== 'INFO') return false;
    if (filterSeverity === 'warn' && l.severity !== 'WARN') return false;
    if (filterSeverity === 'sec' && l.severity !== 'SEC') return false;
    if (searchTerm && !l.tenant.toLowerCase().includes(searchTerm.toLowerCase()) && !l.details.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-6 font-sans text-slate-100">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <Terminal className="w-6 h-6 text-cyan-400" />
            Audit & Systémové telemetrické logy
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Reálný časový záznam všech operací napříč všemi tenanty s přesností na milisekundy.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button className="px-3.5 py-2 rounded-xl bg-[#0C111D] border border-slate-800 text-xs font-mono text-slate-300 hover:text-white flex items-center gap-2">
            <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
            <span>Aktualizovat</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#0C111D] p-3 rounded-2xl border border-slate-800/80">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Filtrovat logy podle tenantu nebo akce..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-[#090D16] border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setFilterSeverity('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all ${filterSeverity === 'all' ? 'bg-cyan-500 text-slate-950' : 'bg-[#090D16] border border-slate-800 text-slate-400 hover:text-white'}`}
          >
            Vše (ALL)
          </button>
          <button
            onClick={() => setFilterSeverity('info')}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all ${filterSeverity === 'info' ? 'bg-brand-primary text-slate-950 font-black' : 'bg-[#090D16] border border-slate-800 text-slate-400 hover:text-white'}`}
          >
            INFO
          </button>
          <button
            onClick={() => setFilterSeverity('warn')}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all ${filterSeverity === 'warn' ? 'bg-amber-500 text-slate-950 font-black' : 'bg-[#090D16] border border-slate-800 text-slate-400 hover:text-white'}`}
          >
            WARN
          </button>
          <button
            onClick={() => setFilterSeverity('sec')}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all ${filterSeverity === 'sec' ? 'bg-rose-500 text-white font-black' : 'bg-[#090D16] border border-slate-800 text-slate-400 hover:text-white'}`}
          >
            SEC_AUTH
          </button>
        </div>
      </div>

      {/* Log Feed Table */}
      <div className="bg-[#0C111D] p-6 rounded-3xl border border-slate-800/80 shadow-lg space-y-4">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="pb-3">Čas (UTC+1)</th>
                <th className="pb-3">Level</th>
                <th className="pb-3">Tenant</th>
                <th className="pb-3">Akce</th>
                <th className="pb-3">Detaily události</th>
                <th className="pb-3">Iniciátor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="text-slate-200 hover:bg-slate-800/40">
                  <td className="py-3.5 text-slate-400">{log.time}</td>
                  <td className="py-3.5">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      log.severity === 'INFO' ? 'bg-brand-primary-soft text-brand-primary border border-brand-primary/30' :
                      log.severity === 'WARN' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                      'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    }`}>
                      {log.severity}
                    </span>
                  </td>
                  <td className="py-3.5 font-sans font-bold text-white">{log.tenant}</td>
                  <td className="py-3.5 text-cyan-300 font-semibold">{log.action}</td>
                  <td className="py-3.5 text-slate-300 max-w-md truncate">{log.details}</td>
                  <td className="py-3.5 text-slate-400">{log.user}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
