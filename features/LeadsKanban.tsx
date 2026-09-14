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
    { status: 'New', label: 'Nová poptávka', color: 'border-border bg-surface-secondary text-brand-primary', badgeColor: 'bg-brand-primary-soft text-brand-primary border-brand-primary-soft' },
    { status: 'Contacted', label: 'Kontaktováno', color: 'border-indigo-200 bg-indigo-50 text-indigo-700', badgeColor: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
    { status: 'Quote', label: 'Rozpočet / Nabídka', color: 'border-amber-200 bg-amber-50 text-amber-700', badgeColor: 'bg-amber-100 text-amber-700 border-amber-200' },
    { status: 'In Progress', label: 'Realizace stavby', color: 'border-purple-200 bg-purple-50 text-purple-700', badgeColor: 'bg-purple-100 text-purple-700 border-purple-200' },
    { status: 'Completed', label: 'Dokončeno & Předáno', color: 'border-green-200 bg-green-50 text-green-700', badgeColor: 'bg-green-100 text-green-700 border-green-200' },
    { status: 'Lost', label: 'Stornováno', color: 'border-slate-200 bg-slate-50 text-slate-500', badgeColor: 'bg-slate-100 text-slate-500 border-slate-200' }
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
    <div className="space-y-6 pb-20 text-slate-800 font-sans">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-[24px] border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Kanban zakázek & staveb</h2>
          <p className="text-xs text-slate-500 mt-0.5">Široké sloupce s podrobnými kartami, rychlými akcemi a přehledem stavu</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-5 py-3 rounded-2xl font-black text-xs shadow-md hover:shadow-lg transition-all flex items-center gap-2"
            style={{ backgroundColor: 'var(--brand-primary)', color: '#ffffff' }}
          >
            <Plus className="w-4 h-4" />
            <span>Nová zakázka / Poptávka</span>
          </button>
        </div>
      </div>

      {/* New Lead Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-white/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-[32px] max-w-xl w-full p-8 space-y-6 shadow-2xl animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-xl font-black text-slate-900">Vytvořit novou zakázku / poptávku</h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:text-slate-800 flex items-center justify-center text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateLeadSubmit} className="space-y-5 text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block">Název projektu / zakázky</label>
                  <input
                    type="text"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-600 transition-all font-semibold"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block">Jméno zákazníka</label>
                  <input
                    type="text"
                    value={formCustomerName}
                    onChange={(e) => setFormCustomerName(e.target.value)}
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-600 transition-all font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block">Telefon</label>
                  <input
                    type="text"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-600 transition-all font-semibold"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block">E-mail</label>
                  <input
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-600 transition-all font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block">Rozpočet (Kč)</label>
                  <input
                    type="number"
                    value={formBudget}
                    onChange={(e) => setFormBudget(e.target.value)}
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-600 transition-all font-semibold"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block">Adresa</label>
                  <input
                    type="text"
                    value={formAddress}
                    onChange={(e) => setFormAddress(e.target.value)}
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-600 transition-all font-semibold"
                  />
                </div>
              </div>

              <div className="pt-6 flex justify-end gap-3 border-t border-slate-100 mt-6">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-3 rounded-xl bg-slate-100 text-slate-600 font-bold hover:bg-slate-200 transition-colors"
                >
                  Zrušit
                </button>
                <button
                  type="submit"
                  className="px-6 py-3 rounded-xl font-extrabold shadow-md hover:shadow-lg transition-all"
                  style={{ backgroundColor: 'var(--brand-primary)', color: '#ffffff' }}
                >
                  Vytvořit zakázku
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Wide Kanban Board Container (min-width columns 320px-420px, 24px spacing) */}
      <div className="overflow-x-auto pb-6 -mx-4 px-4 sm:-mx-8 sm:px-8">
        <div className="flex gap-6 items-start min-w-[2100px]">
          {columns.map(col => {
            const columnLeads = leads.filter(l => l.status === col.status);
            return (
              <div 
                key={col.status} 
                className="w-[360px] min-w-[340px] max-w-[420px] bg-slate-50/80 rounded-[24px] border border-slate-200 flex flex-col shadow-sm shrink-0"
              >
                {/* Sticky Column Header */}
                <div className="p-5 border-b border-slate-200 sticky top-0 bg-slate-50/95 backdrop-blur-md rounded-t-[24px] z-10 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`w-3 h-3 rounded-full ${col.badgeColor.split(' ')[0]}`}></span>
                    <h3 className="font-black text-sm text-slate-900 tracking-tight">{col.label}</h3>
                  </div>
                  <span className="text-xs font-black px-2.5 py-1 rounded-full bg-white text-slate-600 border border-slate-200 shadow-xs">
                    {columnLeads.length}
                  </span>
                </div>

                {/* Cards Container (Min-height 170-220px per card feel) */}
                <div className="p-4 space-y-4 min-h-[600px] flex-1">
                  {columnLeads.map(lead => (
                    <div
                      key={lead.id}
                      onClick={() => onSelectLead(lead)}
                      className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer space-y-4 group min-h-[190px] flex flex-col justify-between relative overflow-hidden"
                    >
                      {/* Subtle hover accent line */}
                      <div className="absolute left-0 top-0 bottom-0 w-1.5 opacity-0 group-hover:opacity-100 transition-opacity" style={{ backgroundColor: 'var(--brand-primary)' }}></div>

                      {/* Top: Priority & Budget */}
                      <div className="flex items-center justify-between">
                        <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg border uppercase tracking-wider ${
                          lead.priority === 'High' ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-slate-50 border-slate-200 text-slate-600'
                        }`}>
                          {lead.priority === 'High' ? '🔥 Vysoká priorita' : 'Normální'}
                        </span>
                        <span className="text-sm font-black font-mono text-slate-900 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">
                          {lead.price ? `${lead.price.toLocaleString()} Kč` : 'Dohodou'}
                        </span>
                      </div>

                      {/* Title & Customer */}
                      <div className="space-y-1.5 pl-1">
                        <h4 className="text-[15px] font-black text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-2 leading-tight">
                          {lead.title}
                        </h4>
                        <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span className="font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-lg">{lead.customerName}</span>
                        </div>
                      </div>

                      {/* Address & Last Activity */}
                      <div className="space-y-2 text-xs text-slate-500 pt-3 border-t border-slate-100 pl-1">
                        <div className="flex items-center gap-1.5 truncate">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{lead.address}</span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-slate-500">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-400" />
                            Dnes
                          </span>
                          <span className="font-bold text-slate-700 flex items-center gap-1.5">
                            <img src={`https://api.dicebear.com/7.x/notionists/svg?seed=${lead.assignedEmployeeName}&backgroundColor=f8fafc`} alt="avatar" className="w-4 h-4 rounded-full border border-slate-200" />
                            {lead.assignedEmployeeName.split(' ')[0]}
                          </span>
                        </div>
                      </div>

                      {/* Quick Actions (Call, Detail) */}
                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                        <a
                          href={`tel:${lead.customerPhone}`}
                          onClick={(e) => e.stopPropagation()}
                          className="flex-1 py-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold flex items-center justify-center gap-1.5 border border-slate-200 transition-colors active:scale-[0.98]"
                        >
                          <Phone className="w-3.5 h-3.5 text-blue-600" />
                          <span>Zavolat</span>
                        </a>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectLead(lead);
                          }}
                          className="flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all border shadow-sm hover:shadow active:scale-[0.98]"
                          style={{ backgroundColor: 'var(--brand-primary-soft)', color: 'var(--brand-primary)', borderColor: 'var(--border)' }}
                        >
                          <span>Otevřít</span>
                        </button>
                      </div>
                    </div>
                  ))}

                  {columnLeads.length === 0 && (
                    <div className="h-40 flex items-center justify-center text-xs text-slate-500 border border-dashed border-slate-300 rounded-2xl bg-white/50">
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
