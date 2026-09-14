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
  UserCheck
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
  const { dbUser, fetchEmployees, currentOrg } = useOrganization();
  const [selectedLeadId, setSelectedLeadId] = useState<string>('lead-1');
  const [assignmentResult, setAssignmentResult] = useState<any | null>(null);
  const [isAssignSuccessModalOpen, setIsAssignSuccessModalOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isInviting, setIsInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [createdCredentials, setCreatedCredentials] = useState<{ email: string; password: string; name: string } | null>(null);
  const [inviteForm, setInviteForm] = useState({ 
    name: '', 
    email: '', 
    password: `Stavba${Math.floor(1000 + Math.random() * 9000)}`, 
    specialization: 'Stavební technik' 
  });
  const { inviteEmployee } = useOrganization();

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsInviting(true);
    setInviteError(null);
    try {
      const result: any = await inviteEmployee(
        { 
          name: inviteForm.name, 
          specialization: inviteForm.specialization, 
          capacity: 100, 
          email: inviteForm.email 
        } as any,
        inviteForm.password
      );
      setIsInviteModalOpen(false);
      setCreatedCredentials({
        name: inviteForm.name,
        email: inviteForm.email,
        password: inviteForm.password
      });
      setInviteForm({ 
        name: '', 
        email: '', 
        password: `Stavba${Math.floor(1000 + Math.random() * 9000)}`, 
        specialization: 'Stavební technik' 
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

  const handleDeleteEmployee = (id: string) => {
    if (!canDeleteEmployees(dbUser?.role)) {
      alert("Nemáte oprávnění odstraňovat zaměstnance z organizace.");
      return;
    }
    alert(`Odstranění zaměstnance s ID: ${id}`);
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
            </AppCard>
          );
        })}
      </div>

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
        title="Pozvat zaměstnance"
      >
        <form onSubmit={handleInviteSubmit} className="space-y-4 py-2">
          {inviteError && <div className="text-red-500 text-xs font-bold">{inviteError}</div>}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Jméno a příjmení</label>
            <AppInput required value={inviteForm.name} onChange={e => setInviteForm(prev => ({...prev, name: e.target.value}))} placeholder="Jan Novák" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">E-mail pro přihlášení</label>
            <AppInput type="email" required value={inviteForm.email} onChange={e => setInviteForm(prev => ({...prev, email: e.target.value}))} placeholder="jan.novak@firma.cz" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Dočasné heslo</label>
            <AppInput required value={inviteForm.password} onChange={e => setInviteForm(prev => ({...prev, password: e.target.value}))} placeholder="Heslo pro první přihlášení" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Specializace / Role</label>
            <AppInput required value={inviteForm.specialization} onChange={e => setInviteForm(prev => ({...prev, specialization: e.target.value}))} placeholder="Např. Mistr tesař" />
          </div>
          <div className="pt-4 flex gap-3">
            <AppButton type="button" variant="outline" className="flex-1" onClick={() => setIsInviteModalOpen(false)}>Zrušit</AppButton>
            <AppButton type="submit" variant="primary" className="flex-1" disabled={isInviting}>
              {isInviting ? 'Odesílám...' : 'Odeslat pozvánku'}
            </AppButton>
          </div>
        </form>
      </AppModal>

      {/* Created Credentials Modal */}
      <AppModal
        isOpen={!!createdCredentials}
        onClose={() => setCreatedCredentials(null)}
        title="Účet zaměstnance vytvořen"
      >
        <div className="space-y-4 py-2 text-left font-sans">
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs space-y-3">
            <p className="font-bold flex items-center gap-2 text-emerald-800 text-sm">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>Zaměstnanecký účet byl úspěšně aktivován</span>
            </p>
            <p className="text-slate-600 leading-relaxed">
              Zaměstnanec se může ihned přihlásit na stránce <strong>/login</strong>. Po přihlášení má okamžitý přístup výhradně do svého terénního rozhraní (Moje zakázky, Kalendář, Hlasové poznámky, Kontrolní seznamy).
            </p>
            <div className="bg-white p-3.5 rounded-lg border border-emerald-200 font-mono text-xs space-y-1.5 shadow-xs">
              <div className="flex justify-between">
                <span className="text-slate-500 font-sans">Jméno:</span> 
                <strong className="text-slate-900">{createdCredentials?.name}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-sans">Přihlašovací e-mail:</span> 
                <strong className="text-brand-primary">{createdCredentials?.email}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-sans">Heslo pro přihlášení:</span> 
                <strong className="text-emerald-700">{createdCredentials?.password}</strong>
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
