import React, { useState } from 'react';
import { Lead, LeadStatus } from '../types';
import { MapPin, DollarSign, User, ChevronRight, Plus, Phone, MessageSquare, Mail, FileText, Calendar, ShieldCheck, AlertTriangle, Camera, Clock, Sparkles } from 'lucide-react';

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
    { status: 'New', label: 'New', color: 'border-blue-500 bg-blue-50/40 text-blue-700' },
    { status: 'Contacted', label: 'Contacted', color: 'border-indigo-500 bg-indigo-50/40 text-indigo-700' },
    { status: 'Quote', label: 'Quote', color: 'border-amber-500 bg-amber-50/40 text-amber-700' },
    { status: 'In Progress', label: 'In Progress', color: 'border-purple-500 bg-purple-50/40 text-purple-700' },
    { status: 'Completed', label: 'Completed', color: 'border-emerald-500 bg-emerald-50/40 text-emerald-700' },
    { status: 'Lost', label: 'Lost', color: 'border-slate-400 bg-slate-100 text-slate-600' }
  ];

  return (
    <div className="space-y-6 pb-16">
      {/* Top Header & AI Pipeline Score Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Leads Kanban Pipeline</h2>
          <p className="text-xs text-slate-500">Intelligent sales pipeline with AI urgency intelligence & quick actions</p>
        </div>

        {/* AI Pipeline Health Score Banner */}
        <div className="bg-white px-5 py-3.5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-900">Pipeline Health</span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">82%</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">Lowered by: 2 overdue quotes, 1 inactive lead, response time above target</p>
          </div>
        </div>
      </div>

      {/* Kanban Board Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 overflow-x-auto pb-6">
        {columns.map((col) => {
          const colLeads = leads.filter(l => l.status === col.status);
          return (
            <div key={col.status} className="bg-slate-100/80 rounded-2xl p-4 flex flex-col min-h-[650px] border border-slate-200/80">
              {/* Column Header */}
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200">
                <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${col.color}`}>
                  {col.label}
                </span>
                <span className="w-6 h-6 rounded-full bg-white text-slate-700 font-bold text-xs flex items-center justify-center shadow-xs">
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
                      className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-all cursor-pointer space-y-3 group relative overflow-hidden"
                    >
                      {/* Overdue Badge & Days in Stage */}
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-semibold text-slate-500 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" /> {daysInStage} days in stage
                        </span>
                        {isOverdue && (
                          <span className="px-2 py-0.5 rounded-md text-[9px] font-bold bg-rose-100 text-rose-700 flex items-center gap-0.5">
                            <AlertTriangle className="w-2.5 h-2.5" /> Overdue
                          </span>
                        )}
                      </div>

                      {lead.thumbnail && (
                        <div className="w-full h-24 rounded-xl overflow-hidden relative">
                          <img src={lead.thumbnail} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-all duration-300" />
                          <span className="absolute top-2 right-2 px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-900/80 backdrop-blur-md text-white">
                            {lead.priority}
                          </span>
                          {lead.photos?.length > 0 && (
                            <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-900/70 text-slate-200 flex items-center gap-1">
                              <Camera className="w-3 h-3" /> {lead.photos.length}
                            </span>
                          )}
                        </div>
                      )}

                      <div>
                        <h4 className="text-xs font-bold text-slate-900 line-clamp-2">{lead.title}</h4>
                        <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                          <User className="w-3 h-3 text-slate-400" /> {lead.customerName}
                        </p>
                      </div>

                      {/* Last contact & AI Next Recommended Action */}
                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-[10px] space-y-1">
                        <p className="text-slate-500">Last contact: <span className="font-semibold text-slate-700">2 days ago</span></p>
                        <p className="text-blue-600 font-semibold flex items-center gap-1">
                          <Sparkles className="w-3 h-3 flex-shrink-0" /> AI recommends calling customer today.
                        </p>
                      </div>

                      {/* Price & Quick Actions on Hover */}
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-xs font-black text-slate-900">{(lead.price / 1000).toFixed(0)}k CZK</span>
                        
                        {/* Hover Quick Actions */}
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <a 
                            href={`tel:${lead.customerPhone}`} 
                            title="Call" 
                            onClick={(e) => e.stopPropagation()} 
                            className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center hover:bg-emerald-100"
                          >
                            <Phone className="w-3 h-3" />
                          </a>
                          <a 
                            href={`https://wa.me/${lead.customerPhone.replace(/[^0-9]/g, '')}`} 
                            title="WhatsApp" 
                            target="_blank" 
                            rel="noreferrer" 
                            onClick={(e) => e.stopPropagation()} 
                            className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center hover:bg-emerald-100"
                          >
                            <MessageSquare className="w-3 h-3" />
                          </a>
                          <a 
                            href={`mailto:${lead.customerEmail}`} 
                            title="Email" 
                            onClick={(e) => e.stopPropagation()} 
                            className="w-6 h-6 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center hover:bg-blue-100"
                          >
                            <Mail className="w-3 h-3" />
                          </a>
                          <button
                            title="Schedule"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectLead(lead);
                            }}
                            className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center hover:bg-indigo-100"
                          >
                            <Calendar className="w-3 h-3" />
                          </button>
                          <button
                            title="Quote PDF"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectLead(lead);
                            }}
                            className="w-6 h-6 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center hover:bg-amber-100"
                          >
                            <FileText className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {colLeads.length === 0 && (
                  <div className="h-32 flex items-center justify-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
                    No leads
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
