import React from 'react';
import { ShieldCheck } from 'lucide-react';

export const PilotUnavailablePage: React.FC = () => (
  <div className="mx-auto max-w-2xl rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
      <ShieldCheck className="h-6 w-6" />
    </div>
    <p className="mt-5 text-[11px] font-black uppercase tracking-[0.16em] text-blue-600">Rozsah pilotu</p>
    <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-950">Tato funkce zatím není aktivní</h1>
    <p className="mt-3 text-sm leading-6 text-slate-600">
      V prvním pilotu jsou aktivní přihlášení, poptávkový formulář, Kanban, přiřazení zaměstnance,
      změny stavu, historie a kontrolovaný CSV import. Další moduly zpřístupníme až po ověření jejich ukládání a oprávnění.
    </p>
  </div>
);
