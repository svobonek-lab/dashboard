import React from 'react';
import { useOrganization } from '@/context/OrganizationContext';
import { User, Phone, Mail, Award, Clock, HardHat, ShieldCheck, MapPin, CheckCircle2 } from 'lucide-react';

export const EmployeeProfilePage: React.FC = () => {
  const { user, dbUser } = useOrganization();
  const { currentOrg } = useOrganization();
  const branding = currentOrg?.branding || {};

  return (
    <div className="space-y-6 text-slate-900 font-sans pb-12 max-w-lg mx-auto">
      
      {/* Header Avatar Card */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-6 text-center space-y-4 shadow-xs">
        <div className="w-20 h-20 rounded-3xl bg-brand-primary-soft border-2 border-brand-primary-soft text-brand-primary flex items-center justify-center font-extrabold text-2xl mx-auto shadow-xs">
          PN
        </div>

        <div>
          <h2 className="text-lg font-bold text-slate-900">Petr Novotný</h2>
          <p className="text-xs text-brand-primary font-bold mt-0.5">Vedoucí montážní party • Pergoly & Terasy</p>
          <p className="text-[11px] text-slate-500 font-medium mt-1">{branding?.name}</p>
        </div>

        <div className="pt-2 flex items-center justify-center gap-2">
          <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold uppercase tracking-wider">
            Aktivní v terénu
          </span>
          <span className="px-3 py-1 rounded-full bg-brand-primary-soft text-brand-primary border border-brand-primary-soft text-[10px] font-bold">
            Certifikace 2026 OK
          </span>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 text-center shadow-xs">
          <span className="text-[10px] text-slate-400 font-bold uppercase block">Dokončené stavby</span>
          <p className="text-xl font-extrabold text-slate-900 mt-1">42</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 text-center shadow-xs">
          <span className="text-[10px] text-slate-400 font-bold uppercase block">Hodnocení klientů</span>
          <p className="text-xl font-extrabold text-amber-500 mt-1">4.9 ★</p>
        </div>
      </div>

      {/* Details Box */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-5 space-y-3 text-xs shadow-xs">
        <h3 className="font-bold text-slate-400 text-[10px] uppercase tracking-wider">
          Osobní & Pracovní údaje
        </h3>

        <div className="flex items-center justify-between py-2 border-b border-slate-100 text-slate-700">
          <span className="flex items-center gap-2 text-slate-500">
            <Mail className="w-4 h-4 text-slate-400" />
            <span>E-mail:</span>
          </span>
          <span className="font-semibold text-slate-900">{dbUser?.email || 'petr.novotny@firma.cz'}</span>
        </div>

        <div className="flex items-center justify-between py-2 border-b border-slate-100 text-slate-700">
          <span className="flex items-center gap-2 text-slate-500">
            <Phone className="w-4 h-4 text-slate-400" />
            <span>Telefon:</span>
          </span>
          <span className="font-semibold text-slate-900">+420 777 123 456</span>
        </div>

        <div className="flex items-center justify-between py-2 border-b border-slate-100 text-slate-700">
          <span className="flex items-center gap-2 text-slate-500">
            <MapPin className="w-4 h-4 text-slate-400" />
            <span>Základna:</span>
          </span>
          <span className="font-semibold text-slate-900">{branding?.city || 'Praha'}</span>
        </div>

        <div className="flex items-center justify-between py-2 text-slate-700">
          <span className="flex items-center gap-2 text-slate-500">
            <Award className="w-4 h-4 text-slate-400" />
            <span>Platnost oprávnění:</span>
          </span>
          <span className="font-semibold text-emerald-700">Do 12/2027</span>
        </div>
      </div>

    </div>
  );
};
