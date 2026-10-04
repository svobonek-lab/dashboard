import React, { useState } from 'react';
import { CheckCircle2, KeyRound, Mail, Phone, Send, ShieldCheck, UserPlus, UsersRound } from 'lucide-react';
import type { Employee, Lead } from '../types';
import { useOrganization } from '../context/OrganizationContext';
import { AppButton, AppInput, AppModal } from '../src/components/ui/common';

interface EmployeesPageProps {
  employees: Employee[];
  leads: Lead[];
  branding: unknown;
  onEmployeeAdded?: (newEmployee?: unknown) => void;
}

export const EmployeesPage: React.FC<EmployeesPageProps> = ({ employees, leads, onEmployeeAdded }) => {
  const { fetchEmployees, inviteEmployee, resendEmployeeInvite, resetEmployeePassword } = useOrganization();
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isInviting, setIsInviting] = useState(false);
  const [inviteForm, setInviteForm] = useState({ name: '', email: '', role: 'Montážník' });
  const [notice, setNotice] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);
  const [busyEmployee, setBusyEmployee] = useState<string | null>(null);

  const invite = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsInviting(true);
    setNotice(null);
    try {
      const employee = await inviteEmployee({ name: inviteForm.name.trim(), email: inviteForm.email.trim(), role: inviteForm.role, specialization: inviteForm.role, capacity: 100 } as Partial<Employee>);
      await fetchEmployees();
      onEmployeeAdded?.(employee);
      setInviteForm({ name: '', email: '', role: 'Montážník' });
      setIsInviteOpen(false);
      setNotice({ kind: 'success', text: `Pozvánka pro ${employee.email || employee.name} byla vytvořena a zařazena k odeslání.` });
    } catch (error) {
      setNotice({ kind: 'error', text: error instanceof Error ? error.message : 'Pozvánku se nepodařilo vytvořit.' });
    } finally { setIsInviting(false); }
  };

  const accountAction = async (employee: Employee, action: 'resend' | 'recovery') => {
    setBusyEmployee(employee.id);
    setNotice(null);
    try {
      const result = action === 'resend' ? await resendEmployeeInvite(employee.id) : await resetEmployeePassword(employee.id);
      if (action === 'resend') await fetchEmployees();
      setNotice({ kind: 'success', text: result.message });
    } catch (error) {
      setNotice({ kind: 'error', text: error instanceof Error ? error.message : 'Akci se nepodařilo dokončit.' });
    } finally { setBusyEmployee(null); }
  };

  const assignedCounts = new Map<string, number>();
  leads.forEach((lead) => { if (lead.assignedEmployeeId) assignedCounts.set(lead.assignedEmployeeId, (assignedCounts.get(lead.assignedEmployeeId) || 0) + 1); });

  return (
    <div className="workspace-page mx-auto max-w-5xl">
      <header className="workspace-page-header">
        <div><p className="workspace-kicker">Přístupy a role</p><h1 className="workspace-title">Tým firmy</h1><p className="workspace-subtitle">Pozvěte zaměstnance. Po přihlášení uvidí pouze zakázky, které jim majitel přiřadil.</p></div>
        <button type="button" onClick={() => setIsInviteOpen(true)} className="workspace-primary-action inline-flex min-h-11 items-center justify-center gap-2 px-4 text-sm font-semibold"><UserPlus className="h-4 w-4" /> Pozvat zaměstnance</button>
      </header>

      {notice && <div role={notice.kind === 'error' ? 'alert' : 'status'} className={`rounded-xl border px-4 py-3 text-sm font-medium ${notice.kind === 'error' ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}>{notice.text}</div>}

      <section className="workspace-panel overflow-hidden">
        <div className="workspace-toolbar"><div><h2 className="text-base font-semibold text-slate-950">Členové týmu</h2><p className="mt-1 text-sm text-slate-500">{employees.length} {employees.length === 1 ? 'uživatel' : 'uživatelů'} ve firemním prostoru</p></div><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><UsersRound className="h-5 w-5" /></span></div>
        <div className="divide-y divide-slate-100">
          {employees.map((employee) => {
            const invitationStatus = employee.invitationStatus || (employee.active === false ? 'Disabled' : 'Active');
            return <article key={employee.id} className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-3"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-700">{employee.name?.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase() || 'ČT'}</span><span className="min-w-0"><strong className="block truncate text-sm font-semibold text-slate-950">{employee.name || 'Člen týmu'}</strong><small className="mt-1 block truncate text-xs text-slate-500">{employee.email} · {employee.specialization || employee.role || 'zaměstnanec'}</small></span></div>
              <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${invitationStatus === 'Pending' ? 'bg-amber-50 text-amber-700' : invitationStatus === 'Disabled' ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'}`}>{invitationStatus === 'Pending' ? 'Čeká na aktivaci' : invitationStatus === 'Disabled' ? 'Deaktivován' : 'Aktivní'}</span>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">{assignedCounts.get(employee.id) || 0} zakázek</span>
                {employee.phone && <a href={`tel:${employee.phone}`} aria-label={`Zavolat ${employee.name}`} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-blue-600"><Phone className="h-4 w-4" /></a>}
                {employee.email && <a href={`mailto:${employee.email}`} aria-label={`Napsat ${employee.name}`} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-blue-600"><Mail className="h-4 w-4" /></a>}
                {invitationStatus === 'Pending' ? <button type="button" disabled={busyEmployee === employee.id} onClick={() => accountAction(employee, 'resend')} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"><Send className="h-3.5 w-3.5" />Obnovit pozvánku</button> : invitationStatus === 'Active' ? <button type="button" disabled={busyEmployee === employee.id} onClick={() => accountAction(employee, 'recovery')} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"><KeyRound className="h-3.5 w-3.5" />Obnova hesla</button> : null}
              </div>
            </article>;
          })}
          {!employees.length && <div className="workspace-empty-state m-5 px-6 py-12 text-center"><ShieldCheck className="mx-auto h-8 w-8 text-blue-600" /><h2 className="mt-3 text-base font-semibold text-slate-950">Pozvěte prvního zaměstnance</h2><p className="mx-auto mt-1 max-w-md text-sm text-slate-500">Pozvánka má omezenou platnost a po použití se zaměstnanec připojí pouze k této firmě.</p><button type="button" onClick={() => setIsInviteOpen(true)} className="mt-5 inline-flex min-h-10 items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white"><UserPlus className="h-4 w-4" />Vytvořit pozvánku</button></div>}
        </div>
      </section>

      <AppModal isOpen={isInviteOpen} onClose={() => setIsInviteOpen(false)} title="Pozvat zaměstnance">
        <form onSubmit={invite} className="space-y-4 py-2 text-left">
          <label className="block text-xs font-semibold text-slate-700">Jméno a příjmení<AppInput required value={inviteForm.name} onChange={(event) => setInviteForm({ ...inviteForm, name: event.target.value })} placeholder="Jan Novák" /></label>
          <label className="block text-xs font-semibold text-slate-700">Pracovní e-mail<AppInput type="email" required value={inviteForm.email} onChange={(event) => setInviteForm({ ...inviteForm, email: event.target.value })} placeholder="jan@firma.cz" /></label>
          <label className="block text-xs font-semibold text-slate-700">Role v týmu<select value={inviteForm.role} onChange={(event) => setInviteForm({ ...inviteForm, role: event.target.value })} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm"><option>Montážník</option><option>Stavbyvedoucí</option><option>Rozpočtář</option><option>Administrativa</option></select></label>
          <p className="flex gap-2 rounded-xl bg-blue-50 p-3 text-xs leading-5 text-blue-800"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />Zaměstnanec si nastaví vlastní heslo přes jednorázovou pozvánku. Heslo se v dashboardu nikdy nezobrazuje.</p>
          <div className="flex justify-end gap-2 pt-2"><AppButton type="button" variant="outline" onClick={() => setIsInviteOpen(false)}>Zrušit</AppButton><AppButton type="submit" variant="primary" disabled={isInviting}>{isInviting ? 'Vytvářím…' : 'Odeslat pozvánku'}</AppButton></div>
        </form>
      </AppModal>
    </div>
  );
};
