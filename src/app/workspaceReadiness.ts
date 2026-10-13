import { Employee, Lead } from '@/types';

export type ReadinessRole = 'owner' | 'employee' | 'super_admin';

export interface WorkspaceReadinessStep {
  id: string;
  label: string;
  description: string;
  href: string;
  complete: boolean;
  requiredFor: ReadinessRole[];
}

export interface WorkspaceReadiness {
  role: ReadinessRole;
  steps: WorkspaceReadinessStep[];
  completed: number;
  total: number;
  percent: number;
  headline: string;
  nextStep: WorkspaceReadinessStep | null;
}

interface ReadinessInput {
  organization?: { name?: string; city?: string; email?: string; logo_url?: string } | null;
  leads: Lead[];
  employees: Employee[];
  role?: ReadinessRole | string | null;
  assignedLeads?: Lead[];
}

export function buildWorkspaceReadiness(input: ReadinessInput): WorkspaceReadiness {
  const role: ReadinessRole = input.role === 'employee' || input.role === 'super_admin' ? input.role : 'owner';
  const organization = input.organization || {};
  const hasIdentity = Boolean(organization.name?.trim() && (organization.city?.trim() || organization.email?.trim()));
  const hasFirstInquiry = input.leads.length > 0;
  const activeEmployees = input.employees.filter((employee) => employee.active !== false);
  const assignedLeads = input.assignedLeads || input.leads.filter((lead) => Boolean(lead.assignedEmployeeId));
  const hasAssignment = assignedLeads.length > 0;
  const hasActiveJob = input.leads.some((lead) => lead.status === 'In Progress' || lead.status === 'Completed');
  const employeeHasWork = input.assignedLeads ? input.assignedLeads.length > 0 : input.leads.length > 0;

  const ownerSteps: WorkspaceReadinessStep[] = [
    {
      id: 'identity',
      label: 'Profil firmy',
      description: 'Název, město a kontaktní údaje pro nabídky a komunikaci.',
      href: '/settings',
      complete: hasIdentity,
      requiredFor: ['owner', 'super_admin'],
    },
    {
      id: 'inquiry',
      label: 'První poptávka',
      description: 'Přijměte nebo založte první poptávku do firemního pipeline.',
      href: '/leads',
      complete: hasFirstInquiry,
      requiredFor: ['owner', 'super_admin'],
    },
    {
      id: 'team',
      label: 'Tým a role',
      description: 'Pozvěte tým a přiřaďte každou zakázku konkrétnímu člověku.',
      href: '/employees',
      complete: activeEmployees.length > 0 && hasAssignment,
      requiredFor: ['owner', 'super_admin'],
    },
    {
      id: 'delivery',
      label: 'První realizace',
      description: 'Posuňte poptávku přes kontakt a nabídku až do realizace.',
      href: '/projects',
      complete: hasActiveJob,
      requiredFor: ['owner', 'super_admin'],
    },
  ];

  const employeeSteps: WorkspaceReadinessStep[] = [
    {
      id: 'assigned-work',
      label: 'Moje zakázky',
      description: 'Máte přidělenou práci od majitele firmy.',
      href: '/employee',
      complete: employeeHasWork,
      requiredFor: ['employee'],
    },
    {
      id: 'schedule',
      label: 'Dnešní výjezd',
      description: 'Otevřete harmonogram a potvrďte další návštěvu stavby.',
      href: '/employee/schedule',
      complete: employeeHasWork,
      requiredFor: ['employee'],
    },
  ];

  const steps = role === 'employee' ? employeeSteps : ownerSteps;
  const completed = steps.filter((step) => step.complete).length;
  const total = steps.length;
  const percent = total === 0 ? 100 : Math.round((completed / total) * 100);
  const nextStep = steps.find((step) => !step.complete) || null;

  return {
    role,
    steps,
    completed,
    total,
    percent,
    headline: role === 'employee'
      ? (nextStep ? 'Máte připravený další krok na stavbě.' : 'Všechny vaše pracovní kroky jsou připravené.')
      : (nextStep ? 'Dokončete nastavení firmy a získejte první zakázku.' : 'Firma je připravená na každodenní provoz.'),
    nextStep,
  };
}
