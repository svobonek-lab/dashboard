import React from 'react';
import { useOrganization } from '@/context/OrganizationContext';
import { useBranding } from '@/hooks/useBranding';
import { User, Phone, Mail, Award, Clock, HardHat, ShieldCheck, MapPin, CheckCircle2 } from 'lucide-react';

export const EmployeeProfilePage: React.FC = () => {
  const { user, dbUser } = useOrganization();
  const { branding } = useBranding();

  return (
    <div className="space-y-6 text-slate-900 font-sans pb-12 max-w-lg mx-auto">
      
      {/* Header Avatar Card */}
      <div className="bg-[#111726] border border-slate-200 rounded-3xl p-6 text-center space-y-4 shadow-xl">
        <div className="w-20 h-20 rounded-3xl bg-green-500/20 border-2 border-green-500/40 text-green-300 flex items-center justify-center font-black text-2xl mx-auto shadow-inner">
          PN
        </div>

        <div>
          <h2 className="text-lg font-black text-slate-900">Petr Novotný</h2>
          <p className="text-xs text-green-400 font-semibold mt-0.5">Vedoucí montážní party • Pergoly & Terasy</p>
          <p className="text-[11px] text-slate-500 font-medium mt-1">{branding?.name}</p>
        </div>

        <div className="pt-2 flex items-center justify-center gap-2">
          <span className="px-3 py-1 rounded-full bg-green-500/10 text-green-400 border border-green-500/30 text-[10px] font-bold uppercase tracking-wider">
            Aktivní v terénu
          </span>
          <span className="px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/30 text-[10px] font-bold">
            Certifikace 2026 OK
          </span>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-[#111726] p-4 rounded-2xl border border-slate-200 text-center">
          <span className="text-[10px] text-slate-500 font-bold uppercase block">Dokončené stavby</span>
          <p className="text-xl font-black text-slate-900 mt-1">42</p>
        </div>
        <div className="bg-[#111726] p-4 rounded-2xl border border-slate-200 text-center">
          <span className="text-[10px] text-slate-500 font-bold uppercase block">Hodnocení klientů</span>
          <p className="text-xl font-black text-amber-400 mt-1">4.9 ★</p>
        </div>
      </div>

      {/* Details Box */}
      <div className="bg-[#111726] border border-slate-200 rounded-3xl p-5 space-y-3.5 text-xs">
        <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider text-slate-500">
          Osobní & Pracovní údaje
        </h3>

        <div className="flex items-center justify-between py-1 border-b border-slate-200/60 text-slate-700">
          <span className="flex items-center gap-2 text-slate-500">
            <Mail className="w-4 h-4 text-slate-500" />
            <span>E-mail:</span>
          </span>
          <span className="font-semibold text-slate-900">{dbUser?.email || 'petr.novotny@firma.cz'}</span>
        </div>

        <div className="flex items-center justify-between py-1 border-b border-slate-200/60 text-slate-700">
          <span className="flex items-center gap-2 text-slate-500">
            <Phone className="w-4 h-4 text-slate-500" />
            <span>Telefon:</span>
          </span>
          <span className="font-semibold text-slate-900">+420 777 123 456</span>
        </div>

        <div className="flex items-center justify-between py-1 border-b border-slate-200/60 text-slate-700">
          <span className="flex items-center gap-2 text-slate-500">
            <MapPin className="w-4 h-4 text-slate-500" />
            <span>Základna:</span>
          </span>
          <span className="font-semibold text-slate-900">{branding?.city || 'Praha'}</span>
        </div>

        <div className="flex items-center justify-between py-1 text-slate-700">
          <span className="flex items-center gap-2 text-slate-500">
            <Award className="w-4 h-4 text-slate-500" />
            <span>Platnost oprávnění:</span>
          </span>
          <span className="font-semibold text-green-400">Do 12/2027</span>
        </div>
      </div>

    </div>
  );
};
