import React, { useState } from 'react';
import { Employee } from '../types';
import { Phone, Mail, MapPin, Sparkles, Shield, CheckCircle2, Clock, Award, Check, Trash2, Calendar, MessageSquare, ArrowRight } from 'lucide-react';
import { autoAssignEmployee } from '../lib/autoAssignment';
import { generateRealisticLeads } from '../lib/demoData';
import { canDeleteEmployees } from '../src/app/permissions';
import { useOrganization } from '../context/OrganizationContext';

interface EmployeesPageProps {
  employees: Employee[];
  branding: any;
}

export const EmployeesPage: React.FC<EmployeesPageProps> = ({ employees, branding }) => {
  const { dbUser } = useOrganization();
  const [selectedLeadId, setSelectedLeadId] = useState<string>('lead-1');
  const [assignmentResult, setAssignmentResult] = useState<any | null>(null);

  const sampleLeads = generateRealisticLeads(branding);
  const selectedLead = sampleLeads.find(l => l.id === selectedLeadId) || sampleLeads[0];

  const handleRunAIAssignment = (lead: any) => {
    const result = autoAssignEmployee({ lead, employees });
    setAssignmentResult({ lead, ...result });
  };

  const handleDeleteEmployee = (id: string) => {
    if (!canDeleteEmployees(dbUser?.role)) {
      alert("Nemáte oprávnění odstraňovat zaměstnance z organizace.");
      return;
    }
    alert(`Odstranění zaměstnance s ID: ${id}`);
  };

  return (
    <div className="space-y-8 pb-20 text-slate-900 font-sans max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-[24px] border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Správa týmu & řemeslníků</h2>
          <p className="text-xs text-slate-500 mt-0.5">Správa stavebních part, certifikací, aktuální kapacity a přiřazování na zakázky</p>
        </div>
      </div>

      {/* AI Dispatcher Assistant */}
      <div className="bg-white p-6 rounded-[24px] border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-blue-600">AI Přiřazení na zakázku</span>
            </div>
            <h3 className="text-base font-black text-slate-900">Vyberte poptávku pro optimalizaci trasy a kapacity</h3>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={selectedLeadId}
              onChange={(e) => {
                setSelectedLeadId(e.target.value);
                setAssignmentResult(null);
              }}
              className="bg-slate-50 border border-slate-200 text-slate-800 text-xs font-semibold rounded-xl px-3 py-2.5 focus:outline-none focus:border-blue-600"
            >
              {sampleLeads.map(l => (
                <option key={l.id} value={l.id}>{l.title} ({l.customerName})</option>
              ))}
            </select>
            <button
              onClick={() => handleRunAIAssignment(selectedLead)}
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-md flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>Spočítat optimální partu</span>
            </button>
          </div>
        </div>

        {assignmentResult && (
          <div className="bg-slate-50 p-5 rounded-2xl border border-blue-100 space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <span className="text-xs font-bold text-slate-900">Doporučený vedoucí: <strong className="text-blue-600">{assignmentResult.bestEmployee.name}</strong></span>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-black bg-green-50 text-green-700 border border-green-200">
                {assignmentResult.score}% Shoda profilu
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              <div className="bg-white p-3.5 rounded-xl border border-slate-200">
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Vzdálenost</span>
                <p className="font-bold text-slate-900 mt-1">4.2 km od staveniště</p>
              </div>
              <div className="bg-white p-3.5 rounded-xl border border-slate-200">
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Aktuální vytížení</span>
                <p className="font-bold text-slate-900 mt-1">{assignmentResult.bestEmployee.capacity}% kapacity</p>
              </div>
              <div className="bg-white p-3.5 rounded-xl border border-slate-200">
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Specializace</span>
                <p className="font-bold text-slate-900 mt-1">{assignmentResult.bestEmployee.specialization}</p>
              </div>
              <div className="bg-white p-3.5 rounded-xl border border-slate-200">
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Možný příjezd</span>
                <p className="font-bold text-blue-600 mt-1">Dnes ve 13:30</p>
              </div>
            </div>

            <p className="text-xs text-slate-700 bg-white p-3 rounded-xl border border-slate-200">
              <strong className="text-blue-600">Zdůvodnění:</strong> {assignmentResult.reasoning}
            </p>
          </div>
        )}
      </div>

      {/* Large Employee Cards Grid (Part 2) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {employees.map((emp, i) => {
          const statusBg = 
            emp.status === 'Green' ? 'bg-green-500' :
            emp.status === 'Orange' ? 'bg-amber-500' : 'bg-rose-500';

          const certs = [
            ['Autorizovaný stavbyvedoucí', 'BOZP & Požární ochrana'][i % 2],
            ['Vyhláška 50 elektro', 'Specialista na krovy'][i % 2]
          ];

          return (
            <div key={emp.id} className="bg-white p-6 rounded-[24px] border border-slate-200 shadow-sm hover:shadow-md transition-all space-y-4 relative flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <img src={emp.avatar} alt={emp.name} className="w-14 h-14 rounded-2xl object-cover border border-slate-200" />
                    <div>
                      <h3 className="text-base font-black text-slate-900">{emp.name}</h3>
                      <p className="text-xs text-slate-500">{emp.specialization}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`w-3 h-3 rounded-full ${statusBg}`} title={`Status: ${emp.status}`} />
                    {canDeleteEmployees(dbUser?.role) && (
                      <button
                        onClick={() => handleDeleteEmployee(emp.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 transition-colors"
                        title="Odstranit"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Certifications */}
                <div className="space-y-1.5 pt-2 border-t border-slate-100">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Oprávnění & Zkoušky</span>
                  <div className="flex flex-wrap gap-1">
                    {certs.map((cert, idx) => (
                      <span key={idx} className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-50 text-slate-700 border border-slate-200 flex items-center gap-1">
                        <Award className="w-3 h-3 text-blue-600" /> {cert}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Workload & Capacity */}
                <div className="space-y-1.5 pt-2 border-t border-slate-100 text-xs">
                  <div className="flex items-center justify-between text-slate-600">
                    <span className="font-semibold">Vytížení kapacity:</span>
                    <span className="font-black text-slate-900">{emp.capacity}%</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div className="bg-blue-600 h-full rounded-full" style={{ width: `${emp.capacity}%` }} />
                  </div>
                </div>

                {/* Contact & Location */}
                <div className="space-y-1 pt-2 border-t border-slate-100 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span className="truncate">{emp.currentLocation}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>{emp.phone}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span>{emp.email}</span>
                  </div>
                </div>
              </div>

              {/* Quick Actions (Call, Message, Schedule, Assign) */}
              <div className="space-y-2 pt-3 border-t border-slate-100">
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-[11px] space-y-1">
                  <div className="flex items-center justify-between font-bold text-slate-800">
                    <span>Dnešní zakázky:</span>
                    <span className="text-blue-600 font-extrabold">{i === 0 ? '2 stavby' : '1 stavba'}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-500 text-[10px]">
                    <span>Příští výjezd:</span>
                    <span className="font-semibold text-slate-700">{i === 0 ? '14:00 - Pergola Praha 4' : '09:00 - Zaměření Brno'}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <a
                    href={`tel:${emp.phone}`}
                    className="py-2 px-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-800 text-xs font-bold flex items-center justify-center gap-1.5 border border-slate-200 transition-colors"
                  >
                    <Phone className="w-3.5 h-3.5 text-blue-600" />
                    <span>Zavolat</span>
                  </a>
                  <a
                    href={`mailto:${emp.email}`}
                    className="py-2 px-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-800 text-xs font-bold flex items-center justify-center gap-1.5 border border-slate-200 transition-colors"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
                    <span>Zpráva</span>
                  </a>
                  <button
                    onClick={() => alert(`Plánování kalendáře pro ${emp.name}`)}
                    className="py-2 px-2.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center gap-1.5 border border-blue-200 transition-colors"
                  >
                    <Calendar className="w-3.5 h-3.5 text-blue-600" />
                    <span>Harmonogram</span>
                  </button>
                  <button
                    onClick={() => handleRunAIAssignment(selectedLead)}
                    className="py-2 px-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                  >
                    <ArrowRight className="w-3.5 h-3.5" />
                    <span>Přiřadit</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
