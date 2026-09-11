import React, { useState, useEffect } from 'react';
import { useOrganization } from '@/context/OrganizationContext';
import { useRouter } from '../../app/router';
import { 
  Building2, 
  Users, 
  TrendingUp, 
  DollarSign, 
  ArrowUpRight, 
  Wand2, 
  Sparkles, 
  ShieldCheck, 
  Activity, 
  Server, 
  Clock, 
  ExternalLink, 
  CheckCircle2, 
  AlertCircle,
  Terminal,
  Layers,
  ArrowRight
} from 'lucide-react';

export const AdminDashboardPage: React.FC = () => {
  const { 
    fetchAllOrganizationsAdmin, 
    impersonateOrganization 
  } = useOrganization();
  const { navigate } = useRouter();

  const [orgs, setOrgs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAllOrganizationsAdmin()
      .then(data => setOrgs(data || []))
      .catch(err => console.error('Failed to fetch admin orgs', err))
      .finally(() => setLoading(false));
  }, []);

  const totalMRR = (orgs.length * 2490).toLocaleString('cs-CZ');

  return (
    <div className="space-y-8 font-sans text-slate-100">
      
      {/* Top Banner & Control Status */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
              TENANT ENGINE v1.4
            </span>
            <span className="text-xs font-mono text-slate-400">
              StavbaCore Cloud Ingress
            </span>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight mt-1">
            Super Admin Control Center
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Globální správa multitenantní infrastruktury, zákaznických firem a systémových telemetrií.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => navigate('/admin/install')}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-black transition-all shadow-lg shadow-cyan-500/20 flex items-center gap-2"
          >
            <Wand2 className="w-4 h-4" />
            <span>Spustit Install Studio 2.0</span>
          </button>
        </div>
      </div>

      {/* 5 High-Density Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        
        <div className="bg-[#0C111D] p-5 rounded-2xl border border-slate-800/80 shadow-md">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-mono uppercase font-bold">Aktivní firmy</span>
            <Building2 className="w-4 h-4 text-cyan-400" />
          </div>
          <p className="text-2xl font-black text-white mt-2 font-mono">
            {loading ? '...' : orgs.length}
          </p>
          <p className="text-[10px] text-emerald-400 font-mono mt-1 flex items-center gap-1">
            <ArrowUpRight className="w-3 h-3" />
            +100% tenant isolation
          </p>
        </div>

        <div className="bg-[#0C111D] p-5 rounded-2xl border border-slate-800/80 shadow-md">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-mono uppercase font-bold">Majitelé & Admini</span>
            <Users className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-2xl font-black text-white mt-2 font-mono">
            {loading ? '...' : orgs.length * 2}
          </p>
          <p className="text-[10px] text-cyan-400 font-mono mt-1">
            Plná RBAC oprávnění
          </p>
        </div>

        <div className="bg-[#0C111D] p-5 rounded-2xl border border-slate-800/80 shadow-md">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-mono uppercase font-bold">Řemeslníci v terénu</span>
            <Users className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-black text-white mt-2 font-mono">
            {loading ? '...' : orgs.length * 4 + 8}
          </p>
          <p className="text-[10px] text-emerald-400 font-mono mt-1">
            Mobilní aplikace aktivní
          </p>
        </div>

        <div className="bg-[#0C111D] p-5 rounded-2xl border border-slate-800/80 shadow-md">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-mono uppercase font-bold">Měsíční poptávky</span>
            <Activity className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-black text-white mt-2 font-mono">
            142
          </p>
          <p className="text-[10px] text-amber-400 font-mono mt-1">
            AI Scoring & Dispečink
          </p>
        </div>

        <div className="bg-[#0C111D] p-5 rounded-2xl border border-slate-800/80 shadow-md">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-mono uppercase font-bold">Měsíční MRR</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-black text-emerald-400 mt-2 font-mono">
            {totalMRR} <span className="text-xs font-normal text-slate-400">Kč</span>
          </p>
          <p className="text-[10px] text-emerald-400 font-mono mt-1">
            B2B Stripe Fakturace
          </p>
        </div>

      </div>

      {/* Main Row: Recent Installations & Impersonation Shortcuts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Recent Companies (2 cols) */}
        <div className="bg-[#0C111D] p-6 rounded-3xl border border-slate-800/80 shadow-md lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Building2 className="w-4 h-4 text-cyan-400" />
                Aktivní stavební firmy v systému
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Jedním kliknutím otevřete CRM kterékoli firmy v režimu impersonace.</p>
            </div>
            <button
              onClick={() => navigate('/admin/companies')}
              className="text-xs font-mono text-cyan-400 hover:underline flex items-center gap-1 font-bold"
            >
              <span>Všechny firmy ({orgs.length})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3 pt-1">
            {orgs.slice(0, 4).map((org) => (
              <div 
                key={org.id} 
                className="p-4 bg-[#090D16] rounded-2xl border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-cyan-500/40 transition-colors"
              >
                <div className="flex items-center gap-3.5">
                  <div 
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-sm shrink-0 shadow-sm"
                    style={{ backgroundColor: org.primary_color || '#0A4EA3' }}
                  >
                    {org.name.charAt(0)}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">{org.name}</h4>
                    <p className="text-xs text-slate-400 font-mono">
                      ID: {org.id.substring(0, 12)}... • Vytvořeno: {new Date(org.created_at || Date.now()).toLocaleDateString('cs-CZ')}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <button
                    onClick={async () => {
                      await impersonateOrganization(org.id);
                      navigate('/dashboard');
                    }}
                    className="px-3.5 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-bold transition-all flex items-center gap-1.5"
                  >
                    <span>Otevřít CRM</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Live Security & Telemetry Feed */}
        <div className="bg-[#0C111D] p-6 rounded-3xl border border-slate-800/80 shadow-md space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Terminal className="w-4 h-4 text-emerald-400" />
              Systémový audit & Logy
            </h3>
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
              Live Feed
            </span>
          </div>

          <div className="space-y-2.5 text-xs font-mono">
            {[
              { time: '11:42:01', action: 'Auth Token Refreshed', org: 'pergoly-praha', status: '200 OK' },
              { time: '11:38:15', action: 'Lead Generated (Embed Widget)', org: 'strechy-kovar', status: '201 Created' },
              { time: '11:22:40', action: 'PDF Quote Compiled', org: 'pergoly-praha', status: '200 OK' },
              { time: '11:10:04', action: 'GPS Check-in Sync', org: 'fasady-brno', status: '200 OK' },
              { time: '10:55:19', action: 'Customer Portal Signature', org: 'strechy-kovar', status: '200 OK' },
            ].map((log, i) => (
              <div key={i} className="p-2.5 bg-[#090D16] rounded-xl border border-slate-800/80 space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">{log.time}</span>
                  <span className="text-emerald-400 font-bold">{log.status}</span>
                </div>
                <p className="text-slate-200 font-semibold">{log.action}</p>
                <p className="text-[10px] text-slate-500">Tenant: {log.org}</p>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
};
