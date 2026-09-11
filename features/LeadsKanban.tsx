import React, { useState } from 'react';
import { Lead, LeadStatus } from '../types';
import { MapPin, DollarSign, User, ChevronRight, Plus, Phone, MessageSquare, Mail, FileText, Calendar, ShieldCheck, AlertTriangle, Camera, Clock, Sparkles, Trash2 } from 'lucide-react';
import { canDeleteLead } from '../src/app/permissions';
import { useOrganization } from '../context/OrganizationContext';

interface LeadsKanbanProps {
  leads: Lead[];
  onSelectLead: (lead: Lead) => void;
  onUpdateLeadStatus: (leadId: string, newStatus: LeadStatus) => void;
}

export const LeadsKanban: React.FC<LeadsKanbanProps> = ({
  leads,
  onSelectLead,
  onUpdateLeadStatus
}) => {
  const columns: { status: LeadStatus; label: string; color: string }[] = [
    { status: 'New', label: 'Nová poptávka', color: 'border-blue-500 bg-blue-950/40 text-blue-400' },
    { status: 'Contacted', label: 'Kontaktováno', color: 'border-indigo-500 bg-indigo-950/40 text-indigo-400' },
    { status: 'Quote', label: 'Rozpočet / Nabídka', color: 'border-amber-500 bg-amber-950/40 text-amber-400' },
    { status: 'In Progress', label: 'Realizace stavby', color: 'border-purple-500 bg-purple-950/40 text-purple-400' },
    { status: 'Completed', label: 'Dokončeno & Předáno', color: 'border-emerald-500 bg-emerald-950/40 text-emerald-400' },
    { status: 'Lost', label: 'Stornováno', color: 'border-slate-700 bg-slate-900 text-slate-400' }
  ];

  const { dbUser } = useOrganization();

  const handleDeleteClick = (e: React.MouseEvent, leadId: string) => {
    e.stopPropagation();
    if (!canDeleteLead(dbUser?.role)) {
      alert("Nemáte oprávnění mazat zakázky.");
      return;
    }
    // Delete action placeholder
    alert(`Delete lead ID: ${leadId}`);
  };

  return (
    <div className="space-y-6 pb-16 text-slate-100">
      {/* Top Header & AI Pipeline Score Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-100 tracking-tight">Kanban zakázek & staveb</h2>
          <p className="text-xs text-slate-400">Přehled fází realizace od poptávky až po kolaudaci a předávací protokol</p>
        </div>

        {/* AI Pipeline Health Score Banner */}
        <div className="bg-slate-900 px-5 py-3.5 rounded-2xl border border-slate-800 shadow-md flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 text-emerald-400 flex items-center justify-center font-bold">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-200">Průchodnost zakázek</span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950/80 border border-emerald-800 text-emerald-400">82%</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">Sníženo o: 2 rozpočty čekající na schválení investora</p>
          </div>
        </div>
      </div>

      {/* Kanban Board Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 overflow-x-auto pb-6">
        {columns.map((col) => {
          const colLeads = leads.filter(l => l.status === col.status);
          return (
            <div key={col.status} className="bg-slate-900/90 rounded-2xl p-4 flex flex-col min-h-[650px] border border-slate-800">
              {/* Column Header */}
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
                <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${col.color}`}>
                  {col.label}
                </span>
                <span className="w-6 h-6 rounded-full bg-slate-800 text-slate-300 font-bold text-xs flex items-center justify-center shadow-xs border border-slate-700">
                  {colLeads.length}
                </span>
              </div>

              {/* Cards Container */}
              <div className="space-y-3.5 flex-1">
                {colLeads.map((lead, idx) => {
                  const daysInStage = (idx * 2 + 3);
                  const isOverdue = daysInStage > 7;

                  return (
                    <div
                      key={lead.id}
                      onClick={() => onSelectLead(lead)}
                      className="bg-slate-950 p-4 rounded-2xl border border-slate-800 hover:border-slate-700 shadow-md transition-all cursor-pointer space-y-3 group relative overflow-hidden"
                    >
                      {/* Overdue Badge & Days in Stage */}
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-semibold text-slate-400 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-500" /> {daysInStage} dní v této fázi
                        </span>
                        {isOverdue && (
                          <span className="px-2 py-0.5 rounded-md text-[9px] font-bold bg-rose-950/80 border border-rose-800 text-rose-400 flex items-center gap-0.5">
                            <AlertTriangle className="w-2.5 h-2.5" /> Vyžaduje reakci
                          </span>
                        )}
                      </div>

                      {lead.thumbnail && (
                        <div className="w-full h-24 rounded-xl overflow-hidden relative">
                          <img src={lead.thumbnail} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-all duration-300" />
                          <span className="absolute top-2 right-2 px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-950/80 backdrop-blur-md text-amber-400 border border-slate-700">
                            {lead.priority}
                          </span>
                          {lead.photos?.length > 0 && (
                            <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-950/70 text-slate-300 flex items-center gap-1">
                              <Camera className="w-3 h-3" /> {lead.photos.length}
                            </span>
                          )}
                        </div>
                      )}

                      <div>
                        <h4 className="text-xs font-bold text-slate-100 line-clamp-2">{lead.title}</h4>
                        <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                          <User className="w-3 h-3 text-slate-500" /> {lead.customerName}
                        </p>
                      </div>

                      {/* Last contact & AI Next Recommended Action */}
                      <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800 text-[10px] space-y-1">
                        <p className="text-slate-400">Poslední kontakt: <span className="font-semibold text-slate-200">před 2 dny</span></p>
                        <p className="text-amber-400 font-semibold flex items-center gap-1">
                          <Sparkles className="w-3 h-3 flex-shrink-0" /> Doporučeno: potvrdit termín závozu materiálu
                        </p>
                      </div>

                      {/* Price & Quick Actions on Hover */}
                      <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                        <span className="text-xs font-black text-amber-400 font-mono">{(lead.price / 1000).toFixed(0)} tis. Kč</span>
                        
                        {/* Hover Quick Actions */}
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <a 
                            href={`tel:${lead.customerPhone}`} 
                            title="Zavolat" 
                            onClick={(e) => e.stopPropagation()} 
                            className="w-6 h-6 rounded-lg bg-slate-800 border border-slate-700 text-emerald-400 flex items-center justify-center hover:bg-slate-700"
                          >
                            <Phone className="w-3 h-3" />
                          </a>
                          <a 
                            href={`https://wa.me/${lead.customerPhone.replace(/[^0-9]/g, '')}`} 
                            title="WhatsApp" 
                            target="_blank" 
                            rel="noreferrer" 
                            onClick={(e) => e.stopPropagation()} 
                            className="w-6 h-6 rounded-lg bg-slate-800 border border-slate-700 text-emerald-400 flex items-center justify-center hover:bg-slate-700"
                          >
                            <MessageSquare className="w-3 h-3" />
                          </a>
                          <a 
                            href={`mailto:${lead.customerEmail}`} 
                            title="E-mail" 
                            onClick={(e) => e.stopPropagation()} 
                            className="w-6 h-6 rounded-lg bg-slate-800 border border-slate-700 text-blue-400 flex items-center justify-center hover:bg-slate-700"
                          >
                            <Mail className="w-3 h-3" />
                          </a>
                          <button
                            title="Harmonogram"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectLead(lead);
                            }}
                            className="w-6 h-6 rounded-lg bg-slate-800 border border-slate-700 text-amber-400 flex items-center justify-center hover:bg-slate-700"
                          >
                            <Calendar className="w-3 h-3" />
                          </button>
                          <button
                            title="Rozpočet PDF"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectLead(lead);
                            }}
                            className="w-6 h-6 rounded-lg bg-slate-800 border border-slate-700 text-amber-400 flex items-center justify-center hover:bg-slate-700"
                          >
                            <FileText className="w-3 h-3" />
                          </button>
                          {canDeleteLead(dbUser?.role) && (
                            <button
                              title="Smazat zakázku"
                              onClick={(e) => handleDeleteClick(e, lead.id)}
                              className="w-6 h-6 rounded-lg bg-rose-950/40 border border-rose-900/50 text-rose-400 flex items-center justify-center hover:bg-rose-900/60 ml-auto"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {colLeads.length === 0 && (
                  <div className="h-32 flex items-center justify-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl">
                    Žádné stavby v této fázi
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
