import React, { useState } from 'react';
import { Employee } from '../types';
import { 
  Phone, 
  Mail, 
  MapPin, 
  Sparkles, 
  CheckCircle2, 
  Award, 
  Trash2, 
  Calendar, 
  MessageSquare, 
  ArrowRight,
  UserCheck,
  KeyRound,
  Send,
  Power,
  PowerOff,
  Copy,
  Check,
  ShieldCheck
} from 'lucide-react';
import { autoAssignEmployee } from '../lib/autoAssignment';
import { generateRealisticLeads } from '../lib/demoData';
import { canDeleteEmployees } from '../src/app/permissions';
import { useOrganization } from '../context/OrganizationContext';
import { 
  AppButton, 
  AppCard, 
  AppBadge, 
  AppSelect, AppModal, AppInput 
} from '../src/components/ui/common';

interface EmployeesPageProps {
  employees: Employee[];
  branding: any;
  onEmployeeAdded?: (newEmp?: any) => void;
}

export const EmployeesPage: React.FC<EmployeesPageProps> = ({ employees, branding, onEmployeeAdded }) => {
  const { 
    dbUser, 
    fetchEmployees, 
    currentOrg, 
    inviteEmployee,
    resendEmployeeInvite,
    resetEmployeePassword,
    deactivateEmployee,
    deleteEmployee 
  } = useOrganization();
  const [selectedLeadId, setSelectedLeadId] = useState<string>('lead-1');
  const [assignmentResult, setAssignmentResult] = useState<any | null>(null);
  const [isAssignSuccessModalOpen, setIsAssignSuccessModalOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isInviting, setIsInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [createdCredentials, setCreatedCredentials] = useState<{ email: string; password: string; name: string; inviteLink?: string; invitationStatus?: string } | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [copiedPassword, setCopiedPassword] = useState(false);
  const [copiedInviteLink, setCopiedInviteLink] = useState(false);
  
  const [resetModalState, setResetModalState] = useState<{ isOpen: boolean; employee: Employee | null; newPassword?: string; isSubmitting?: boolean }>({
    isOpen: false,
    employee: null
  });

  const [inviteForm, setInviteForm] = useState({ 
    name: '', 
    email: '', 
    password: `Stavba${Math.floor(1000 + Math.random() * 9000)}`, 
    role: 'Montážník'
  });

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsInviting(true);
    setInviteError(null);
    try {
      const result: any = await inviteEmployee(
        { 
          name: inviteForm.name, 
          specialization: inviteForm.role, 
          role: inviteForm.role,
          capacity: 100, 
          email: inviteForm.email 
        } as any,
        inviteForm.password
      );
      setIsInviteModalOpen(false);
      const inviteLink = result?.inviteLink || `${window.location.origin}/login?inviteToken=${result?.inviteToken || 'inv-1'}&email=${encodeURIComponent(inviteForm.email)}`;
      setCreatedCredentials({
        name: inviteForm.name,
        email: inviteForm.email,
        password: inviteForm.password,
        inviteLink,
        invitationStatus: 'Pending'
      });
      setInviteForm({ 
        name: '', 
        email: '', 
        password: `Stavba${Math.floor(1000 + Math.random() * 9000)}`, 
        role: 'Montážník'
      });
      if (onEmployeeAdded) {
        onEmployeeAdded(result);
      }
      try {
        await fetchEmployees();
      } catch (fErr) {
        console.warn('Refresh notice:', fErr);
      }
    } catch (err: any) {
      setInviteError(err.message || 'Chyba při pozvání zaměstnance');
    } finally {
      setIsInviting(false);
    }
  };
  const [assignedEmployeeName, setAssignedEmployeeName] = useState('');

  const sampleLeads = generateRealisticLeads(branding);
  const selectedLead = sampleLeads.find(l => l.id === selectedLeadId) || sampleLeads[0];

  const handleRunAIAssignment = (lead: any) => {
    const result = autoAssignEmployee({ lead, employees });
    setAssignmentResult({ lead, ...result });
  };

  const handleQuickAssign = (empName: string) => {
    setAssignedEmployeeName(empName);
    setIsAssignSuccessModalOpen(true);
  };

  const handleResendInvite = async (emp: Employee) => {
    try {
      const res = await resendEmployeeInvite(emp.id);
      setCreatedCredentials({
        name: emp.name,
        email: emp.email,
        password: 'Zanecháno stávající heslo',
        inviteLink: res.inviteLink,
        invitationStatus: 'Pending'
      });
      await fetchEmployees();
      setActionNotice(`Pozvánka pro ${emp.name} byla obnovena.`);
      setTimeout(() => setActionNotice(null), 5000);
    } catch (err: any) {
      alert(err?.message || 'Chyba při odesílání pozvánky');
    }
  };

  const handleOpenResetPassword = (emp: Employee) => {
    const generated = `Stavba${Math.floor(1000 + Math.random() * 9000)}!`;
    setResetModalState({
      isOpen: true,
      employee: emp,
      newPassword: generated
    });
    setCopiedPassword(false);
  };

  const handleConfirmResetPassword = async () => {
    if (!resetModalState.employee || !resetModalState.newPassword) return;
    setResetModalState(prev => ({ ...prev, isSubmitting: true }));
    try {
      await resetEmployeePassword(resetModalState.employee.id, resetModalState.newPassword);
      setActionNotice(`Heslo pro ${resetModalState.employee.name} (${resetModalState.employee.email}) bylo úspěšně nastaveno na: ${resetModalState.newPassword}`);
      setTimeout(() => setActionNotice(null), 8000);
    } catch (err: any) {
      alert(err?.message || 'Chyba při resetování hesla');
    } finally {
      setResetModalState(prev => ({ ...prev, isSubmitting: false }));
    }
  };

  const handleToggleDeactivate = async (emp: Employee) => {
    const isCurrentlyActive = (emp as any).active !== false && (emp.status as string) !== 'Inactive';
    const confirmMsg = isCurrentlyActive 
      ? `Opravdu chcete deaktivovat zaměstnance ${emp.name}? Účet bude dočasně zablokován.`
      : `Chcete znovu aktivovat zaměstnance ${emp.name}?`;
    if (!window.confirm(confirmMsg)) return;

    try {
      await deactivateEmployee(emp.id, isCurrentlyActive);
      await fetchEmployees();
      setActionNotice(`Účet zaměstnance ${emp.name} byl ${isCurrentlyActive ? 'deaktivován' : 'aktivován'}.`);
      setTimeout(() => setActionNotice(null), 4000);
    } catch (err: any) {
      alert(err?.message || 'Chyba při změně stavu');
    }
  };

  const handleDeleteEmployee = async (id: string) => {
    if (!canDeleteEmployees(dbUser?.role)) {
      alert("Nemáte oprávnění odstraňovat zaměstnance z organizace.");
      return;
    }
    if (!window.confirm("Opravdu chcete smazat tohoto zaměstnance z organizace?")) return;
    try {
      await deleteEmployee(id);
      await fetchEmployees();
      setActionNotice("Zaměstnanec byl úspěšně odstraněn.");
      setTimeout(() => setActionNotice(null), 4000);
    } catch (err: any) {
      alert(err?.message || 'Chyba při mazání');
    }
  };

  return (
    <div className="space-y-8 pb-20 text-text font-sans max-w-6xl mx-auto">
      {/* Header */}
      <AppCard className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-text tracking-tight">Správa týmu & řemeslníků</h2>
          <p className="text-xs text-muted mt-0.5">Správa stavebních part, certifikací, aktuální kapacity a přiřazování na zakázky</p>
        </div>
        <AppButton 
          variant="primary" 
          onClick={() => setIsInviteModalOpen(true)}
          className="flex items-center gap-2 shrink-0 self-start sm:self-auto"
        >
          <UserCheck className="w-4 h-4" />
          <span>Pozvat zaměstnance</span>
        </AppButton>
      </AppCard>

      {/* Empty State when no employees */}
      {employees.length === 0 && (
        <AppCard className="text-center py-16 px-6 space-y-4 border-dashed border-2 border-slate-200">
          <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
            <UserCheck className="w-8 h-8 text-brand-primary" />
          </div>
          <div className="space-y-1 max-w-md mx-auto">
            <h3 className="text-lg font-black text-text">Zatím žádní zaměstnanci v týmu</h3>
            <p className="text-xs text-muted leading-relaxed">
              Tato organizace začíná s čistým štítem. Pozvěte prvního technika, mistra nebo montážníka – systém mu automaticky zřídí samostatný účet s přístupem do terénního rozhraní.
            </p>
          </div>
          <div className="pt-2">
            <AppButton 
              variant="primary" 
              onClick={() => setIsInviteModalOpen(true)}
              className="inline-flex items-center gap-2"
            >
              <UserCheck className="w-4 h-4" />
              <span>Pozvat prvního zaměstnance</span>
            </AppButton>
          </div>
        </AppCard>
      )}

      {/* AI Dispatcher Assistant */}
      <AppCard className="space-y-4 border border-brand-primary/20">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-brand-primary-soft text-brand-primary border border-brand-primary-soft/30 flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-brand-primary">AI Přiřazení na zakázku</span>
            </div>
            <h3 className="text-base font-black text-text">Vyberte poptávku pro optimalizaci trasy a kapacity</h3>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-64">
              <AppSelect
                value={selectedLeadId}
                onChange={(e) => {
                  setSelectedLeadId(e.target.value);
                  setAssignmentResult(null);
                }}
                options={sampleLeads.map(l => ({
                  value: l.id,
                  label: `${l.title} (${l.customerName})`
                }))}
              />
            </div>
            <AppButton
              onClick={() => handleRunAIAssignment(selectedLead)}
              variant="primary"
            >
              <Sparkles className="w-4 h-4" />
              <span>Spočítat optimální partu</span>
            </AppButton>
          </div>
        </div>

        {assignmentResult && (
          <div className="bg-surface-secondary p-5 rounded-app border border-border space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span className="text-xs font-bold text-text">Doporučený vedoucí: <strong className="text-brand-primary">{assignmentResult.bestEmployee.name}</strong></span>
              </div>
              <AppBadge variant="success">
                {assignmentResult.score}% Shoda profilu
              </AppBadge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              <div className="bg-surface p-3.5 rounded-app border border-border">
                <span className="text-muted block text-[10px] uppercase font-bold">Vzdálenost</span>
                <p className="font-bold text-text mt-1">4.2 km od staveniště</p>
              </div>
              <div className="bg-surface p-3.5 rounded-app border border-border">
                <span className="text-muted block text-[10px] uppercase font-bold">Aktuální vytížení</span>
                <p className="font-bold text-text mt-1">{assignmentResult.bestEmployee.capacity}% kapacity</p>
              </div>
              <div className="bg-surface p-3.5 rounded-app border border-border">
                <span className="text-muted block text-[10px] uppercase font-bold">Specializace</span>
                <p className="font-bold text-text mt-1">{assignmentResult.bestEmployee.specialization}</p>
              </div>
              <div className="bg-surface p-3.5 rounded-app border border-border">
                <span className="text-muted block text-[10px] uppercase font-bold">Možný příjezd</span>
                <p className="font-bold text-brand-primary mt-1">Dnes ve 13:30</p>
              </div>
            </div>

            <p className="text-xs text-text bg-surface p-3 rounded-app border border-border">
              <strong className="text-brand-primary">Zdůvodnění:</strong> {assignmentResult.reasoning}
            </p>
          </div>
        )}
      </AppCard>

      {/* Large Employee Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {employees.map((emp, i) => {
          const statusVariant = 
            emp.status === 'Green' ? 'success' :
            emp.status === 'Orange' ? 'warning' : 'danger';

          const certs = [
            ['Autorizovaný stavbyvedoucí', 'BOZP & Požární ochrana'][i % 2],
            ['Vyhláška 50 elektro', 'Specialista na krovy'][i % 2]
          ];

          const todayWorkload = emp.todaysJobsCount === 0 
            ? 'Bez výjezdů' 
            : emp.todaysJobsCount === 1 
              ? '1 aktivní výjezd' 
              : `${emp.todaysJobsCount} aktivní výjezdy`;

          const nextAssignment = i === 0 
            ? '14:00 - Pergola Praha 4' 
            : i === 1 
              ? '09:00 - Zaměření Brno' 
              : '11:30 - Oprava střechy';

          return (
            <AppCard key={emp.id} hoverEffect className="flex flex-col justify-between space-y-4">
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <img src={emp.avatar} alt={emp.name} className="w-14 h-14 rounded-app object-cover border border-border" />
                    <div>
                      <h3 className="text-base font-black text-text">{emp.name}</h3>
                      <p className="text-xs text-muted font-medium">{emp.specialization}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <AppBadge variant={statusVariant}>
                      {emp.status === 'Green' ? 'Volný' : emp.status === 'Orange' ? 'Na cestě' : 'Plný'}
                    </AppBadge>
                    {canDeleteEmployees(dbUser?.role) && (
                      <button
                        onClick={() => handleDeleteEmployee(emp.id)}
                        className="p-1.5 rounded-app text-muted hover:text-red-600 hover:bg-red-50 transition-all cursor-pointer"
                        title="Odstranit"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Certifications */}
                <div className="space-y-1.5 pt-3 border-t border-border">
                  <span className="text-[10px] uppercase font-bold text-muted tracking-wider">Oprávnění & Zkoušky</span>
                  <div className="flex flex-wrap gap-1">
                    {certs.map((cert, idx) => (
                      <span key={idx} className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-surface-secondary text-text border border-border flex items-center gap-1">
                        <Award className="w-3 h-3 text-brand-primary" /> {cert}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Today's Workload & Next Assignment */}
                <div className="space-y-2 pt-3 border-t border-border text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-muted">Dnešní vytížení:</span>
                    <span className="font-bold text-text">{todayWorkload}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-muted">Příští úkol:</span>
                    <span className="font-semibold text-brand-primary">{nextAssignment}</span>
                  </div>
                </div>

                {/* Workload & Capacity Progress Bar */}
                <div className="space-y-1.5 pt-3 border-t border-border text-xs">
                  <div className="flex items-center justify-between text-muted">
                    <span className="font-semibold">Využití kapacity:</span>
                    <span className="font-black text-text">{emp.capacity}%</span>
                  </div>
                  <div className="w-full bg-surface-secondary h-2 rounded-full overflow-hidden">
                    <div className="bg-brand-primary h-full rounded-full transition-all duration-300" style={{ width: `${emp.capacity}%` }} />
                  </div>
                </div>

                {/* Contact & Location */}
                <div className="space-y-1.5 pt-3 border-t border-border text-xs text-muted font-medium">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-muted shrink-0" />
                    <span className="truncate text-text">{emp.currentLocation || 'Praha'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-muted shrink-0" />
                    <span className="text-text">{emp.phone}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-muted shrink-0" />
                    <span className="text-text">{emp.email}</span>
                  </div>
                </div>
              </div>

              {/* Quick Actions (Call, Message, Schedule, Assign) */}
              <div className="grid grid-cols-2 gap-2 pt-3 border-t border-border">
                <a
                  href={`tel:${emp.phone}`}
                  className="py-2 px-2.5 rounded-app bg-surface-secondary hover:bg-surface-tertiary text-text text-xs font-bold flex items-center justify-center gap-1.5 border border-border transition-colors text-center"
                >
                  <Phone className="w-3.5 h-3.5 text-brand-primary" />
                  <span>Zavolat</span>
                </a>
                <a
                  href={`mailto:${emp.email}`}
                  className="py-2 px-2.5 rounded-app bg-surface-secondary hover:bg-surface-tertiary text-text text-xs font-bold flex items-center justify-center gap-1.5 border border-border transition-colors text-center"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-brand-primary" />
                  <span>Zpráva</span>
                </a>
                <AppButton
                  onClick={() => alert(`Plánování kalendáře pro ${emp.name}`)}
                  variant="outline"
                  size="sm"
                  className="w-full"
                >
                  <Calendar className="w-3.5 h-3.5 text-brand-primary" />
                  <span>Harmonogram</span>
                </AppButton>
                <AppButton
                  onClick={() => handleQuickAssign(emp.name)}
                  variant="primary"
                  size="sm"
                  className="w-full"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                  <span>Přiřadit</span>
                </AppButton>
              </div>

              {/* Owner/Admin Account Actions & Invitation Status */}
              <div className="pt-3 border-t border-border space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold text-muted">
                  <span className="flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-brand-primary" />
                    Stav pozvánky & Účtu
                  </span>
                  {(() => {
                    const invStatus = emp.invitationStatus || ((emp as any).active === false || emp.status === ('Inactive' as any) ? 'Disabled' : 'Active');
                    if (invStatus === 'Pending') {
                      return (
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                          Pending (Čeká)
                        </span>
                      );
                    }
                    if (invStatus === 'Disabled') {
                      return (
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-red-50 text-red-700 border border-red-200 flex items-center gap-1">
                          <PowerOff className="w-2.5 h-2.5" />
                          Disabled (Deaktivován)
                        </span>
                      );
                    }
                    return (
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                        <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                        Active (Aktivní)
                      </span>
                    );
                  })()}
                </div>
                
                {/* Quick actions: resend, deactivate, remove */}
                <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                  <button
                    type="button"
                    onClick={() => handleResendInvite(emp)}
                    className="py-1.5 px-2 rounded-lg bg-surface-secondary hover:bg-surface-tertiary text-text font-semibold flex items-center justify-center gap-1 border border-border transition-colors cursor-pointer"
                    title="Obnovit a znovu zkopírovat pozvánkový odkaz"
                  >
                    <Send className="w-3 h-3 text-brand-primary" />
                    <span>Znovu pozvat</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenResetPassword(emp)}
                    className="py-1.5 px-2 rounded-lg bg-surface-secondary hover:bg-surface-tertiary text-text font-semibold flex items-center justify-center gap-1 border border-border transition-colors cursor-pointer"
                  >
                    <KeyRound className="w-3 h-3 text-brand-primary" />
                    <span>Reset hesla</span>
                  </button>
                </div>
                <div className="flex items-center gap-1.5 pt-0.5">
                  <button
                    type="button"
                    onClick={() => handleToggleDeactivate(emp)}
                    className="flex-1 py-1.5 px-2 rounded-lg text-[10px] font-bold text-slate-700 hover:text-slate-900 bg-surface-secondary hover:bg-surface-tertiary border border-border transition-colors flex items-center justify-center gap-1 cursor-pointer"
                  >
                    {(emp as any).active !== false && emp.invitationStatus !== 'Disabled' ? (
                      <>
                        <PowerOff className="w-3 h-3 text-amber-600" />
                        <span>Deaktivovat</span>
                      </>
                    ) : (
                      <>
                        <Power className="w-3 h-3 text-emerald-600" />
                        <span>Aktivovat účet</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteEmployee(emp.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 bg-surface-secondary hover:bg-red-50 border border-border transition-colors cursor-pointer"
                    title="Odstranit zaměstnance z organizace"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </AppCard>
          );
        })}
      </div>

      {/* Action Notice Toast */}
      {actionNotice && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-xl border border-slate-700 text-xs font-semibold flex items-center gap-2.5 animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* Password Reset Modal */}
      <AppModal
        isOpen={resetModalState.isOpen}
        onClose={() => setResetModalState({ isOpen: false, employee: null })}
        title="Reset hesla zaměstnance"
      >
        <div className="space-y-4 py-2 text-left font-sans text-xs">
          <p className="text-slate-600">
            Zadejte nebo vygenerujte nové heslo pro zaměstnance <strong>{resetModalState.employee?.name}</strong> ({resetModalState.employee?.email}).
          </p>
          <div className="space-y-1.5">
            <label className="font-bold text-slate-700">Nové heslo</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={resetModalState.newPassword || ''}
                onChange={(e) => setResetModalState(prev => ({ ...prev, newPassword: e.target.value }))}
                className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-primary"
              />
              <button
                type="button"
                onClick={() => {
                  if (resetModalState.newPassword) {
                    navigator.clipboard.writeText(resetModalState.newPassword);
                    setCopiedPassword(true);
                    setTimeout(() => setCopiedPassword(false), 2000);
                  }
                }}
                className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center gap-1 border border-slate-200 cursor-pointer"
                title="Kopírovat heslo"
              >
                {copiedPassword ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                <span>{copiedPassword ? 'Zkopírováno' : 'Kopírovat'}</span>
              </button>
            </div>
          </div>
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900 leading-relaxed">
            Zaměstnanec bude moci toto heslo použít okamžitě pro přihlášení do rozhraní "Moje práce".
          </div>
          <div className="pt-3 flex gap-2">
            <AppButton
              variant="outline"
              className="flex-1"
              onClick={() => setResetModalState({ isOpen: false, employee: null })}
            >
              Zrušit
            </AppButton>
            <AppButton
              variant="primary"
              className="flex-1"
              disabled={resetModalState.isSubmitting || !resetModalState.newPassword}
              onClick={handleConfirmResetPassword}
            >
              {resetModalState.isSubmitting ? 'Ukládám...' : 'Nastavit heslo'}
            </AppButton>
          </div>
        </div>
      </AppModal>

      {/* Assign Success Modal */}
      <AppModal
        isOpen={isAssignSuccessModalOpen}
        onClose={() => setIsAssignSuccessModalOpen(false)}
        title="Přiřazení dokončeno"
      >
        <div className="text-center space-y-4 py-4">
          <div className="mx-auto w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center">
            <UserCheck className="w-6 h-6" />
          </div>
          <div className="space-y-1.5">
            <h4 className="text-base font-bold text-text">Zaměstnanec úspěšně přiřazen</h4>
            <p className="text-xs text-muted max-w-sm mx-auto">
              Technik <strong>{assignedEmployeeName}</strong> byl úspěšně přiřazen k zakázce <strong>{selectedLead.title}</strong> a byl mu odeslán SMS harmonogram.
            </p>
          </div>
          <div className="pt-2">
            <AppButton
              onClick={() => setIsAssignSuccessModalOpen(false)}
              variant="primary"
              className="w-full"
            >
              Rozumím
            </AppButton>
          </div>
        </div>
      </AppModal>
    
      {/* Invite Employee Modal */}
      <AppModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        title="Pozvat zaměstnance (Odeslat pozvánku)"
      >
        <form onSubmit={handleInviteSubmit} className="space-y-4 py-2 text-left font-sans">
          {inviteError && <div className="text-red-500 text-xs font-bold p-2 bg-red-50 border border-red-200 rounded-lg">{inviteError}</div>}
          
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">1. Jméno a příjmení</label>
            <AppInput required value={inviteForm.name} onChange={e => setInviteForm(prev => ({...prev, name: e.target.value}))} placeholder="Jan Novák" />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">2. E-mail zaměstnance</label>
            <AppInput type="email" required value={inviteForm.email} onChange={e => setInviteForm(prev => ({...prev, email: e.target.value}))} placeholder="jan.novak@firma.cz" />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">3. Role v týmu</label>
            <select
              value={inviteForm.role}
              onChange={e => setInviteForm(prev => ({...prev, role: e.target.value}))}
              className="w-full px-3 py-2.5 bg-surface border border-border rounded-app text-xs font-bold text-text focus:outline-none focus:ring-2 focus:ring-brand-primary"
            >
              <option value="Montážník">Montážník (Montážní práce)</option>
              <option value="Mistr">Mistr (Šéf šichty / stavby)</option>
              <option value="Stavební technik">Stavební technik (Zaměřování & technická kontrola)</option>
              <option value="Technik">Technik elektro / somfy</option>
              <option value="Stavební dělník">Stavební dělník</option>
              <option value="Stavbyvedoucí">Stavbyvedoucí</option>
              <option value="Dispečer">Dispečer / Obchodní zástupce</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">4. První heslo pro přihlášení</label>
            <AppInput required value={inviteForm.password} onChange={e => setInviteForm(prev => ({...prev, password: e.target.value}))} placeholder="Heslo pro první přihlášení" />
          </div>

          <div className="pt-4 flex gap-3">
            <AppButton type="button" variant="outline" className="flex-1" onClick={() => setIsInviteModalOpen(false)}>Zrušit</AppButton>
            <AppButton type="submit" variant="primary" className="flex-1 flex items-center justify-center gap-2" disabled={isInviting}>
              <Send className="w-4 h-4" />
              <span>{isInviting ? 'Odesílám...' : 'Odeslat pozvánku'}</span>
            </AppButton>
          </div>
        </form>
      </AppModal>

      {/* Created Credentials & Invitation Link Modal */}
      <AppModal
        isOpen={!!createdCredentials}
        onClose={() => setCreatedCredentials(null)}
        title="Pozvánka vytvořena – Čeká na aktivaci"
      >
        <div className="space-y-4 py-2 text-left font-sans">
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-3">
            <div className="flex items-center justify-between">
              <p className="font-bold flex items-center gap-2 text-amber-900 text-sm">
                <CheckCircle2 className="w-5 h-5 text-amber-600 shrink-0" />
                <span>Pozvánka pro {createdCredentials?.name} byla vytvořena</span>
              </p>
              <span className="px-2 py-0.5 rounded font-mono font-bold text-[10px] bg-amber-200 text-amber-900 border border-amber-300">
                Stav: Pending
              </span>
            </div>
            
            <p className="text-slate-700 leading-relaxed">
              Předat zaměstnanci odkaz k prvnímu přihlášení a aktivaci účtu. Po přihlášení se jeho stav automaticky změní na <strong>Active (Aktivní)</strong>.
            </p>

            {/* Invitation Link Box */}
            <div className="space-y-1.5 pt-1">
              <label className="font-bold text-amber-900 text-[11px] block uppercase tracking-wider">Unikátní odkaz pozvánky</label>
              <div className="flex gap-2">
                <input
                  readOnly
                  type="text"
                  value={createdCredentials?.inviteLink || ''}
                  className="flex-1 px-3 py-2 bg-white border border-amber-300 rounded-xl font-mono text-[11px] font-bold text-slate-800 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (createdCredentials?.inviteLink) {
                      navigator.clipboard.writeText(createdCredentials.inviteLink);
                      setCopiedInviteLink(true);
                      setTimeout(() => setCopiedInviteLink(false), 2000);
                    }
                  }}
                  className="px-3 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold flex items-center gap-1.5 text-xs transition-colors cursor-pointer shrink-0"
                >
                  {copiedInviteLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedInviteLink ? 'Zkopírováno' : 'Kopírovat odkaz'}</span>
                </button>
              </div>
            </div>

            {/* Account Credentials Summary */}
            <div className="bg-white p-3.5 rounded-xl border border-amber-200 font-mono text-xs space-y-2 shadow-xs mt-2">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-sans">Přihlašovací e-mail:</span> 
                <strong className="text-brand-primary">{createdCredentials?.email}</strong>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-sans">První heslo:</span> 
                <div className="flex items-center gap-2">
                  <strong className="text-emerald-700">{createdCredentials?.password}</strong>
                  <button
                    type="button"
                    onClick={() => {
                      if (createdCredentials?.password) {
                        navigator.clipboard.writeText(createdCredentials.password);
                        setCopiedPassword(true);
                        setTimeout(() => setCopiedPassword(false), 2000);
                      }
                    }}
                    className="p-1 hover:bg-slate-100 rounded text-slate-500 cursor-pointer"
                    title="Kopírovat heslo"
                  >
                    {copiedPassword ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>
          </div>
          
          <AppButton variant="primary" className="w-full" onClick={() => setCreatedCredentials(null)}>
            Zavřít a pokračovat
          </AppButton>
        </div>
      </AppModal>

    </div>
  );
};
