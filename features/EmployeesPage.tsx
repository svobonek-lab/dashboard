import React, { useState } from 'react';
import { Employee } from '../types';
import { Phone, Mail, MapPin, Sparkles, Shield, CheckCircle2, Clock, Award, Check } from 'lucide-react';
import { autoAssignEmployee } from '../lib/autoAssignment';
import { generateRealisticLeads } from '../lib/demoData';

interface EmployeesPageProps {
  employees: Employee[];
  branding: any;
}

export const EmployeesPage: React.FC<EmployeesPageProps> = ({ employees, branding }) => {
  const [selectedLeadId, setSelectedLeadId] = useState<string>('lead-1');
  const [assignmentResult, setAssignmentResult] = useState<any | null>(null);

  const sampleLeads = generateRealisticLeads(branding);
  const selectedLead = sampleLeads.find(l => l.id === selectedLeadId) || sampleLeads[0];

  const handleRunAIAssignment = (lead: any) => {
    const result = autoAssignEmployee({ lead, employees });
    setAssignmentResult({ lead, ...result });
  };

  return (
    <div className="space-y-8 pb-16">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Construction Crew & Technicians</h2>
          <p className="text-xs text-slate-500">Skills matrix, certifications, availability timeline & AI Assignment Preview</p>
        </div>
      </div>

      {/* AI Assignment Preview Section */}
      <div className="bg-slate-900 text-white p-6 rounded-3xl border border-slate-800 shadow-xl relative overflow-hidden space-y-4">
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
                <Sparkles className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-blue-300">AI Assignment Preview Engine</span>
            </div>
            <h3 className="text-lg font-bold text-white">Select a lead to calculate optimal technician dispatch</h3>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={selectedLeadId}
              onChange={(e) => {
                setSelectedLeadId(e.target.value);
                setAssignmentResult(null);
              }}
              className="bg-slate-950 border border-slate-800 text-white text-xs rounded-xl px-3 py-2.5 focus:outline-none"
            >
              {sampleLeads.map(l => (
                <option key={l.id} value={l.id}>{l.title} ({l.customerName})</option>
              ))}
            </select>
            <button
              onClick={() => handleRunAIAssignment(selectedLead)}
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-md flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>Run AI Match</span>
            </button>
          </div>
        </div>

        {assignmentResult && (
          <div className="bg-slate-950/80 p-5 rounded-2xl border border-blue-500/40 space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <span className="text-xs font-bold text-white">Recommended Technician: <strong className="text-blue-400">{assignmentResult.bestEmployee.name}</strong></span>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                {assignmentResult.score}% Match Score
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              <div className="bg-slate-900 p-3.5 rounded-xl border border-slate-800">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Distance</span>
                <p className="font-bold text-white mt-1">4.2 km from site</p>
              </div>
              <div className="bg-slate-900 p-3.5 rounded-xl border border-slate-800">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Current Workload</span>
                <p className="font-bold text-white mt-1">{assignmentResult.bestEmployee.capacity}% capacity</p>
              </div>
              <div className="bg-slate-900 p-3.5 rounded-xl border border-slate-800">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Specialization</span>
                <p className="font-bold text-white mt-1">{assignmentResult.bestEmployee.specialization}</p>
              </div>
              <div className="bg-slate-900 p-3.5 rounded-xl border border-slate-800">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Est. Arrival</span>
                <p className="font-bold text-emerald-400 mt-1">Today at 13:30</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 bg-blue-950/40 p-3 rounded-xl border border-blue-900">
              <strong>AI Reasoning:</strong> {assignmentResult.reasoning}
            </p>
          </div>
        )}
      </div>

      {/* Employee Cards Grid with Skills Matrix & Availability Timeline */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {employees.map((emp, i) => {
          const statusBg = 
            emp.status === 'Green' ? 'bg-emerald-500' :
            emp.status === 'Orange' ? 'bg-amber-500' : 'bg-rose-500';

          const certs = [
            ['Certified Master Builder', 'Safety OSHA Pro'][i % 2],
            ['Electrical Level 2', 'Timber Frame Expert'][i % 2]
          ];

          return (
            <div key={emp.id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4 relative overflow-hidden group">
              <div className="flex items-start justify-between">
                <img src={emp.avatar} alt={emp.name} className="w-16 h-16 rounded-2xl object-cover ring-2 ring-slate-100" />
                <span className={`w-3.5 h-3.5 rounded-full ${statusBg} ring-4 ring-white shadow-xs`} title={`Status: ${emp.status}`} />
              </div>

              <div>
                <h3 className="text-base font-bold text-slate-900">{emp.name}</h3>
                <p className="text-xs text-slate-500 mt-0.5">{emp.specialization}</p>
              </div>

              {/* Certifications & Skills Matrix */}
              <div className="space-y-1.5 pt-2 border-t border-slate-100">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Certifications & Skills</span>
                <div className="flex flex-wrap gap-1.5">
                  {certs.map((cert, idx) => (
                    <span key={idx} className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-100 flex items-center gap-1">
                      <Award className="w-3 h-3 text-blue-500" /> {cert}
                    </span>
                  ))}
                </div>
              </div>

              {/* Availability Timeline */}
              <div className="space-y-1.5 pt-2 border-t border-slate-100 text-xs">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Availability Timeline</span>
                <div className="grid grid-cols-3 gap-1 text-center">
                  <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 font-semibold text-[10px] border border-emerald-100">
                    Today<span className="block font-normal text-[9px]">Available</span>
                  </div>
                  <div className="p-1.5 rounded-lg bg-slate-50 text-slate-700 font-semibold text-[10px] border border-slate-200">
                    Tomorrow<span className="block font-normal text-[9px]">Booked</span>
                  </div>
                  <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 font-semibold text-[10px] border border-emerald-100">
                    This Week<span className="block font-normal text-[9px]">80% Free</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-100 text-xs text-slate-600">
                <div className="flex items-center justify-between">
                  <span>Workload Capacity</span>
                  <span className="font-bold text-slate-900">{emp.capacity}%</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-blue-600 h-full rounded-full" style={{ width: `${emp.capacity}%` }} />
                </div>
              </div>

              <div className="space-y-1.5 pt-2 border-t border-slate-100 text-xs text-slate-500">
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span className="truncate">{emp.currentLocation}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span>{emp.phone}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

