import React from 'react';
import { Check, Circle, ShieldCheck, Sparkles, Users, BriefcaseBusiness, Building2 } from 'lucide-react';
import type { Employee } from '@/entities/employee';
import type { Lead } from '@/entities/lead';
import { useRouter } from '@/shared/lib/router';
import { buildWorkspaceReadiness, type ReadinessRole } from '../model/workspaceReadiness';

interface WorkspaceReadinessPanelProps {
  organization?: { name?: string; city?: string; email?: string; logo_url?: string } | null;
  leads: Lead[];
  employees: Employee[];
  role: ReadinessRole | string | null | undefined;
  assignedLeads?: Lead[];
  compact?: boolean;
}

export const WorkspaceReadinessPanel: React.FC<WorkspaceReadinessPanelProps> = ({
  organization,
  leads,
  employees,
  role,
  assignedLeads,
  compact = false,
}) => {
  const { navigate } = useRouter();
  const readiness = buildWorkspaceReadiness({ organization, leads, employees, role, assignedLeads });
  const isEmployee = readiness.role === 'employee';
  const next = readiness.nextStep;

  if (compact && next) {
    return (
      <section className="workspace-panel flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            {isEmployee ? <BriefcaseBusiness className="h-5 w-5" /> : <Building2 className="h-5 w-5" />}
          </span>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-blue-600">Další krok: {readiness.completed}/{readiness.total}</p>
            <h2 className="mt-0.5 truncate text-sm font-semibold text-slate-950">{next.label}</h2>
            <p className="mt-0.5 truncate text-xs text-slate-500">{next.description}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-blue-600" style={{ width: `${readiness.percent}%` }} /></div>
          <button type="button" onClick={() => navigate(next.href)} className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50">Pokračovat </button>
        </div>
      </section>
    );
  }

  return (
    <section className={`relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm ${compact ? 'p-4' : 'p-5 sm:p-6'}`}>
      <div className="pointer-events-none absolute -right-12 -top-16 h-40 w-40 rounded-full bg-blue-50 blur-2xl" />
      <div className="relative">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-sm">
              {isEmployee ? <BriefcaseBusiness className="h-5 w-5" /> : <Building2 className="h-5 w-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2 text-[10px] font-black text-slate-400">
                <Sparkles className="h-3.5 w-3.5 text-blue-500" />
                {isEmployee ? 'Pracovní centrum' : 'Stav připravenosti firmy'}
              </div>
              <h2 className="mt-1 text-base font-black tracking-tight text-slate-900">{readiness.headline}</h2>
              <p className="mt-1 text-xs font-medium text-slate-500">
                {isEmployee ? 'Vidíte pouze kroky a zakázky přiřazené vašemu účtu.' : 'Jedno místo pro onboarding, role týmu a průchod první zakázkou.'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 sm:flex-col sm:items-end sm:gap-1">
            <strong className="text-2xl font-black tracking-tight text-slate-900">{readiness.percent}%</strong>
            <span className="text-[10px] font-bold text-slate-400">{readiness.completed}/{readiness.total} kroků</span>
          </div>
        </div>

        <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-[#0A84FF] transition-all duration-500" style={{ width: `${readiness.percent}%` }} />
        </div>

        <div className={`mt-5 grid gap-2 ${compact ? 'sm:grid-cols-3' : 'sm:grid-cols-2 lg:grid-cols-4'}`}>
          {readiness.steps.map((step) => (
            <button
              key={step.id}
              type="button"
              onClick={() => navigate(step.href)}
              className={`group rounded-2xl border p-3 text-left transition-all hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-sm ${step.complete ? 'border-emerald-100 bg-emerald-50/50' : 'border-slate-200 bg-slate-50/60'}`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className={`flex h-6 w-6 items-center justify-center rounded-lg ${step.complete ? 'bg-emerald-100 text-emerald-700' : 'bg-white text-slate-400'}`}>
                  {step.complete ? <Check className="h-3.5 w-3.5" /> : <Circle className="h-3.5 w-3.5" />}
                </span>

              </div>
              <strong className={`mt-2 block text-xs ${step.complete ? 'text-emerald-800' : 'text-slate-800'}`}>{step.label}</strong>
              {!compact && <span className="mt-1 block text-[10px] leading-relaxed text-slate-500">{step.description}</span>}
            </button>
          ))}
        </div>

        {next && (
          <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-blue-100 bg-blue-50/70 p-3.5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-2.5">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
              <div>
                <p className="text-xs font-black text-blue-950">Doporučený další krok: {next.label}</p>
                <p className="mt-0.5 text-[11px] font-medium text-blue-800">{next.description}</p>
              </div>
            </div>
            <button type="button" onClick={() => navigate(next.href)} className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-[#0A84FF] px-3.5 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-blue-600">
              Otevřít krok
            </button>
          </div>
        )}
        {!next && (
          <div className="mt-5 flex items-center gap-2 rounded-2xl border border-emerald-100 bg-emerald-50/70 p-3.5 text-xs font-bold text-emerald-800">
            <Users className="h-4 w-4" /> Provozní základ je připravený. Stavbu můžete řídit z jednoho místa.
          </div>
        )}
      </div>
    </section>
  );
};
