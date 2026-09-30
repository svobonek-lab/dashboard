import React, { useState } from 'react';
import { Globe2, ShieldCheck, CheckCircle2, Clock, Plus, ExternalLink, RefreshCw, AlertCircle } from 'lucide-react';

export const AdminDomainsPage: React.FC = () => {
  const [domains, setDomains] = useState([
    { id: '1', domain: 'portal.pergoly-praha.cz', tenant: 'Pergoly Praha s.r.o.', ssl: 'Active (Let\'s Encrypt)', dnsStatus: 'Verified', cname: 'cname.stavbacore.cz', lastChecked: 'Před 5 min' },
    { id: '2', domain: 'app.strechy-kovar.cz', tenant: 'Střechy Kovář & Syn', ssl: 'Active (Let\'s Encrypt)', dnsStatus: 'Verified', cname: 'cname.stavbacore.cz', lastChecked: 'Před 12 min' },
    { id: '3', domain: 'system.drevostavby-morava.cz', tenant: 'Dřevostavby Morava', ssl: 'Active (Let\'s Encrypt)', dnsStatus: 'Verified', cname: 'cname.stavbacore.cz', lastChecked: 'Před 1 hod' },
    { id: '4', domain: 'poptavky.fasady-liberec.cz', tenant: 'Fasády Liberec s.r.o.', ssl: 'Pending Verification', dnsStatus: 'DNS Propagating', cname: 'cname.stavbacore.cz', lastChecked: 'Právě teď' },
  ]);

  return (
    <div className="space-y-8 font-sans text-slate-100">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <Globe2 className="w-6 h-6 text-blue-400" />
            Vlastní zákaznické domény (White Label CNAME)
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Automatické SSL certifikáty, DNS CNAME směrování a routing pro jednotlivé stavební firmy.
          </p>
        </div>

        <button className="px-4 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-400 text-slate-950 font-black text-xs transition-all shadow-md flex items-center gap-2">
          <Plus className="w-4 h-4" />
          <span>Přidat novou doménu</span>
        </button>
      </div>

      {/* Cloudflare Edge Routing Info */}
      <div className="bg-[#0C111D] p-6 rounded-3xl border border-slate-800/80 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-blue-400" />
            Cloud Edge Ingress Nastavení
          </h2>
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-green-500/20 text-green-400 border border-green-500/30">
            Ingress OK (99.99%)
          </span>
        </div>

        <p className="text-xs text-slate-400 leading-relaxed">
          Každý klient může směrovat svoji subdoménu (např. <code className="text-blue-400 font-mono">portal.mojefirma.cz</code>) na náš CNAME target. Náš systém automaticky vygeneruje wildcard TLS/SSL certifikát a napojí odpovídající branding.
        </p>

        <div className="p-4 bg-[#090D16] rounded-2xl border border-slate-800 font-mono text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="space-y-1">
            <span className="text-slate-500 text-[11px] block">Globální CNAME Target:</span>
            <span className="text-blue-300 font-bold">cname.stavbacore.cz</span>
          </div>
          <span className="text-green-400 text-xs font-bold">Automatic SSL Handshake</span>
        </div>
      </div>

      {/* Active Domains Table */}
      <div className="bg-[#0C111D] p-6 rounded-3xl border border-slate-800/80 shadow-lg space-y-4">
        <h2 className="text-base font-bold text-white">Připojené zákaznické domény</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-sans">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-mono">
                <th className="pb-3">Vlastní doména</th>
                <th className="pb-3">Klient / Firma</th>
                <th className="pb-3">SSL Stav</th>
                <th className="pb-3">DNS Směrování</th>
                <th className="pb-3">Poslední kontrola</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {domains.map((d) => (
                <tr key={d.id} className="text-slate-200">
                  <td className="py-4 font-bold text-blue-400 flex items-center gap-1.5">
                    <Globe2 className="w-3.5 h-3.5 text-slate-500" />
                    <span>{d.domain}</span>
                  </td>
                  <td className="py-4 font-sans font-bold text-white">{d.tenant}</td>
                  <td className="py-4">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${d.ssl.includes('Active') ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'}`}>
                      {d.ssl}
                    </span>
                  </td>
                  <td className="py-4 text-slate-300 font-semibold">{d.dnsStatus}</td>
                  <td className="py-4 text-slate-500 text-[11px]">{d.lastChecked}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
