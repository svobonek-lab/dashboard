import type { Employee } from '../model';

export function EmployeeIdentity({ employee }: { employee: Employee }) {
  return (
    <span className="flex min-w-0 items-center gap-3">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-700">
        {employee.name?.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase() || 'ČT'}
      </span>
      <span className="min-w-0">
        <strong className="block truncate text-sm font-semibold text-slate-950">{employee.name || 'Člen týmu'}</strong>
        <small className="mt-1 block truncate text-xs text-slate-500">{employee.email} · {employee.specialization || employee.role || 'zaměstnanec'}</small>
      </span>
    </span>
  );
}
