import React from 'react';
import { CreditCard, TrendingUp, CheckCircle2, ArrowUpRight, DollarSign, Download, ShieldCheck, Zap } from 'lucide-react';

export const AdminBillingPage: React.FC = () => {
  const plans = [
    { name: 'Starter', price: '1 490 Kč / měsíc', tenants: 12, features: ['Do 5 zaměstnanců', 'Základní kalkulace', 'Embed Widget', 'Základní podpora'] },
    { name: 'Professional', price: '2 990 Kč / měsíc', tenants: 28, featured: true, features: ['Neomezeně řemeslníků', 'AI Odhady & Scoring', 'Klientský portál', 'Vlastní doména', 'Prioritní SLA'] },
    { name: 'Enterprise OS', price: '6 990 Kč / měsíc', tenants: 7, features: ['Multi-Branch pobočky', 'Dedikovaná databáze', 'Vlastní mobilní PWA', 'Vlastní AI model', 'SLA 99.99%'] },
  ];

  const recentTransactions = [
    { id: 'INV-2026-081', tenant: 'Pergoly Praha s.r.o.', plan: 'Professional', amount: '2 990 Kč', status: 'Zaplaceno', date: '01.03.2026' },
    { id: 'INV-2026-080', tenant: 'Střechy Kovář & Syn', plan: 'Professional', amount: '2 990 Kč', status: 'Zaplaceno', date: '28.02.2026' },
    { id: 'INV-2026-079', tenant: 'Dřevostavby Morava', plan: 'Enterprise OS', amount: '6 990 Kč', status: 'Zaplaceno', date: '25.02.2026' },
    { id: 'INV-2026-078', tenant: 'Fasády Liberec s.r.o.', plan: 'Starter', amount: '1 490 Kč', status: 'Zaplaceno', date: '22.02.2026' },
  ];

  return (
    <div className="space-y-8 font-sans text-slate-100">
      
      <div>
        <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
          <CreditCard className="w-6 h-6 text-blue-400" />
          Fakturace & SaaS MRR Plány
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Správa předplatného tenantů, Stripe webhooks, automatická fakturace a růst tržeb.
        </p>
      </div>

      {/* High-Level Revenue Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
        <div className="bg-[#0C111D] p-6 rounded-3xl border border-slate-800/80 shadow-lg">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-mono uppercase font-bold">Celkové měsíční MRR</span>
            <DollarSign className="w-5 h-5 text-green-400" />
          </div>
          <p className="text-3xl font-black text-green-400 mt-2 font-mono">112 400 Kč</p>
          <p className="text-xs text-green-400 mt-1 flex items-center gap-1">
            <ArrowUpRight className="w-3.5 h-3.5" />
            +18.4% oproti minulému měsíci
          </p>
        </div>

        <div className="bg-[#0C111D] p-6 rounded-3xl border border-slate-800/80 shadow-lg">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-mono uppercase font-bold">Aktivních předplatitelů</span>
            <Zap className="w-5 h-5 text-amber-400" />
          </div>
          <p className="text-3xl font-black text-white mt-2 font-mono">47 firem</p>
          <p className="text-xs text-slate-400 mt-1">Churn rate: 0.8% (Velmi nízký)</p>
        </div>

        <div className="bg-[#0C111D] p-6 rounded-3xl border border-slate-800/80 shadow-lg">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-mono uppercase font-bold">Úspěšnost plateb</span>
            <ShieldCheck className="w-5 h-5 text-blue-400" />
          </div>
          <p className="text-3xl font-black text-blue-400 mt-2 font-mono">99.4%</p>
          <p className="text-xs text-slate-400 mt-1">Automatické SEPA / Stripe karty</p>
        </div>
      </div>

      {/* SaaS Plans Tier Matrix */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-white">Dostupné B2B Tarify pro stavební firmy</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
          {plans.map((p, i) => (
            <div 
              key={i} 
              className={`p-6 rounded-3xl border ${p.featured ? 'bg-[#0C111D] border-blue-500/50 shadow-xl shadow-blue-500/10' : 'bg-[#0C111D] border-slate-800/80'} space-y-5`}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-white">{p.name}</h3>
                {p.featured && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-500/20 text-blue-300 border border-blue-500/40">
                    Nejpopulárnější
                  </span>
                )}
              </div>
              <p className="text-2xl font-black text-white font-mono">{p.price}</p>
              <p className="text-xs font-mono text-blue-400">Aktuálně aktivní u: {p.tenants} firem</p>

              <div className="space-y-2 pt-2 border-t border-slate-800 text-xs text-slate-300">
                {p.features.map((f, j) => (
                  <div key={j} className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />
                    <span>{f}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Invoices Table */}
      <div className="bg-[#0C111D] p-6 rounded-3xl border border-slate-800/80 shadow-lg space-y-4">
        <h2 className="text-base font-bold text-white">Poslední vygenerované faktury</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-sans">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-mono">
                <th className="pb-3">Číslo dokladu</th>
                <th className="pb-3">Zákaznická firma</th>
                <th className="pb-3">Tarif</th>
                <th className="pb-3">Částka</th>
                <th className="pb-3">Datum</th>
                <th className="pb-3">Stav</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {recentTransactions.map((tx) => (
                <tr key={tx.id} className="text-slate-200">
                  <td className="py-3.5 text-blue-400 font-bold">{tx.id}</td>
                  <td className="py-3.5 font-sans font-bold text-white">{tx.tenant}</td>
                  <td className="py-3.5 text-slate-400">{tx.plan}</td>
                  <td className="py-3.5 font-bold text-green-400">{tx.amount}</td>
                  <td className="py-3.5 text-slate-400">{tx.date}</td>
                  <td className="py-3.5">
                    <span className="px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 border border-green-500/30 text-[10px] font-bold">
                      {tx.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
