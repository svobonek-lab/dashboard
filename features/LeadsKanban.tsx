import React, { useState } from 'react';
import { Lead, LeadStatus } from '../types';
import { MapPin, DollarSign, User, Plus, Phone, MessageSquare, ShieldCheck, Calendar, Clock, AlertTriangle } from 'lucide-react';
import { canDeleteLead } from '../src/app/permissions';
import { useOrganization } from '../context/OrganizationContext';

interface LeadsKanbanProps {
  leads: Lead[];
  onSelectLead: (lead: Lead) => void;
  onUpdateLeadStatus: (leadId: string, newStatus: LeadStatus) => void;
  onAddLead?: (lead: Lead) => void;
}

export const LeadsKanban: React.FC<LeadsKanbanProps> = ({
  leads,
  onSelectLead,
  onUpdateLeadStatus,
  onAddLead
}) => {
  const columns: { status: LeadStatus; label: string; color: string; badgeColor: string }[] = [
    { status: 'New', label: 'Nová poptávka', color: 'border-blue-500/30 bg-blue-950/20 text-blue-400', badgeColor: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
    { status: 'Contacted', label: 'Kontaktováno', color: 'border-indigo-500/30 bg-indigo-950/20 text-indigo-400', badgeColor: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' },
    { status: 'Quote', label: 'Rozpočet / Nabídka', color: 'border-amber-500/30 bg-amber-950/20 text-amber-400', badgeColor: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
    { status: 'In Progress', label: 'Realizace stavby', color: 'border-purple-500/30 bg-purple-950/20 text-purple-400', badgeColor: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
    { status: 'Completed', label: 'Dokončeno & Předáno', color: 'border-emerald-500/30 bg-emerald-950/20 text-emerald-400', badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
    { status: 'Lost', label: 'Stornováno', color: 'border-slate-800 bg-slate-900/40 text-slate-400', badgeColor: 'bg-slate-800 text-slate-400 border-slate-700' }
  ];

  const { dbUser } = useOrganization();
  const [isModalOpen, setIsModalOpen] = useState(false);

  // New lead form state
  const [formTitle, setFormTitle] = useState('Nová montáž pergoly');
  const [formCustomerName, setFormCustomerName] = useState('Ing. Jan Novák');
  const [formPhone, setFormPhone] = useState('+420 603 112 233');
  const [formEmail, setFormEmail] = useState('jan.novak@seznam.cz');
  const [formAddress, setFormAddress] = useState('Pražská 45, Praha 6');
  const [formBudget, setFormBudget] = useState('250000');
  const [formDate, setFormDate] = useState('2026-09-20');
  const [formDescription, setFormDescription] = useState('Zájem o bioklimatickou pergolu s bočním stíněním a LED osvětlením.');
  const [formThumbnail, setFormThumbnail] = useState('https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=600&q=80');

  const handleCreateLeadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newLead: Lead = {
      id: `lead-${Date.now()}`,
      title: formTitle,
      description: formDescription,
      city: 'Praha',
      address: formAddress,
      customerName: formCustomerName,
      customerPhone: formPhone,
      customerEmail: formEmail,
      preferredDate: formDate,
      price: Number(formBudget) || 200000,
      status: 'New',
      priority: 'High',
      assignedEmployeeId: 'emp-1',
      assignedEmployeeName: 'Petr Mistr',
      thumbnail: formThumbnail,
      photos: [],
      files: [],
      checklist: [
        { id: 'c1', text: 'Úvodní zaměření a konzultace', completed: true },
        { id: 'c2', text: 'Schválení cenové nabídky', completed: false }
      ],
      aiSummary: {
        jobType: formTitle,
        complexity: 'Medium',
        estimatedRange: `${(Number(formBudget) * 0.9).toFixed(0)} - ${(Number(formBudget) * 1.1).toFixed(0)} Kč`,
        assignedEmployee: 'Petr Mistr',
        risks: ['Nutno ověřit podloží'],
        recommendedNextStep: 'Sjednat termín osobní obhlídky'
      },
      timeline: [
        { id: 't1', title: 'Nová poptávka přijata', status: 'Completed', timestamp: 'Dnes' }
      ],
      aiChat: [],
      history: [
        { id: 'h1', timestamp: new Date().toLocaleTimeString(), action: 'Poptávka vytvořena manuálně', author: dbUser?.email || 'owner' }
      ]
    };

    if (onAddLead) {
      onAddLead(newLead);
    }
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6 pb-20 text-slate-100 font-sans">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-100 tracking-tight">Kanban zakázek & staveb</h2>
          <p className="text-xs text-slate-400">Široké sloupce s podrobnými kartami, rychlými akcemi a přehledem stavu</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-5 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-xl transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Nová zakázka / Poptávka</span>
          </button>
        </div>
      </div>

      {/* New Lead Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full p-6 space-y-6 shadow-2xl animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <h3 className="text-lg font-black text-white">Vytvořit novou zakázku / poptávku</h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateLeadSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-300">Název projektu / zakázky</label>
                  <input
                    type="text"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-300">Jméno zákazníka</label>
                  <input
                    type="text"
                    value={formCustomerName}
                    onChange={(e) => setFormCustomerName(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-300">Telefon</label>
                  <input
                    type="text"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-300">E-mail</label>
                  <input
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-300">Rozpočet (Kč)</label>
                  <input
                    type="number"
                    value={formBudget}
                    onChange={(e) => setFormBudget(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-300">Adresa</label>
                  <input
                    type="text"
                    value={formAddress}
                    onChange={(e) => setFormAddress(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100"
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold hover:bg-slate-700"
                >
                  Zrušit
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 text-slate-950 font-extrabold hover:bg-amber-400 shadow-lg"
                >
                  Vytvořit zakázku
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Wide Kanban Board Container (min-width columns 320px-420px, 24px spacing) */}
      <div className="overflow-x-auto pb-6">
        <div className="flex gap-6 items-start min-w-[2100px]">
          {columns.map(col => {
            const columnLeads = leads.filter(l => l.status === col.status);
            return (
              <div 
                key={col.status} 
                className="w-[360px] min-w-[340px] max-w-[420px] bg-slate-900/90 rounded-[24px] border border-slate-800 flex flex-col shadow-2xl shrink-0"
              >
                {/* Sticky Column Header */}
                <div className="p-4 border-b border-slate-800 sticky top-0 bg-slate-900/95 backdrop-blur-md rounded-t-[24px] z-10 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`w-3 h-3 rounded-full ${col.badgeColor.split(' ')[0]}`}></span>
                    <h3 className="font-extrabold text-sm text-white tracking-tight">{col.label}</h3>
                  </div>
                  <span className="text-xs font-black px-2.5 py-1 rounded-xl bg-slate-800 text-slate-300 border border-slate-700">
                    {columnLeads.length}
                  </span>
                </div>

                {/* Cards Container (Min-height 170-220px per card feel) */}
                <div className="p-4 space-y-4 min-h-[600px] flex-1">
                  {columnLeads.map(lead => (
                    <div
                      key={lead.id}
                      onClick={() => onSelectLead(lead)}
                      className="bg-slate-950 p-5 rounded-2xl border border-slate-800/80 shadow-md hover:border-amber-500/60 hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer space-y-4 group min-h-[190px] flex flex-col justify-between"
                    >
                      {/* Top: Priority & Budget */}
                      <div className="flex items-center justify-between">
                        <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg border ${
                          lead.priority === 'High' ? 'bg-rose-950/80 border-rose-800 text-rose-400' : 'bg-slate-900 border-slate-800 text-slate-400'
                        }`}>
                          {lead.priority === 'High' ? '🔥 Vysoká priorita' : 'Normální'}
                        </span>
                        <span className="text-sm font-black font-mono text-amber-400">
                          {lead.price ? `${lead.price.toLocaleString()} Kč` : 'Dohodou'}
                        </span>
                      </div>

                      {/* Title & Customer */}
                      <div className="space-y-1">
                        <h4 className="text-sm font-black text-white group-hover:text-amber-400 transition-colors line-clamp-1">
                          {lead.title}
                        </h4>
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                          <User className="w-3.5 h-3.5 text-slate-500" />
                          <span className="font-semibold text-slate-300">{lead.customerName}</span>
                        </div>
                      </div>

                      {/* Address & Last Activity */}
                      <div className="space-y-1.5 text-xs text-slate-400 pt-2 border-t border-slate-900">
                        <div className="flex items-center gap-1.5 truncate">
                          <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          <span className="truncate">{lead.address}</span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-slate-500">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Aktualizováno dnes
                          </span>
                          <span className="font-bold text-slate-300">
                            {lead.assignedEmployeeName}
                          </span>
                        </div>
                      </div>

                      {/* Quick Actions (Call, Message, Open) */}
                      <div className="pt-2 border-t border-slate-900 flex items-center justify-between gap-2">
                        <a
                          href={`tel:${lead.customerPhone}`}
                          onClick={(e) => e.stopPropagation()}
                          className="flex-1 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-bold flex items-center justify-center gap-1.5 border border-slate-800 transition-colors"
                        >
                          <Phone className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Zavolat</span>
                        </a>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectLead(lead);
                          }}
                          className="flex-1 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-xs font-bold flex items-center justify-center gap-1.5 border border-amber-500/25 transition-colors"
                        >
                          <span>Detail</span>
                        </button>
                      </div>
                    </div>
                  ))}

                  {columnLeads.length === 0 && (
                    <div className="h-40 flex items-center justify-center text-xs text-slate-600 border border-dashed border-slate-800/80 rounded-2xl">
                      Žádné zakázky
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
