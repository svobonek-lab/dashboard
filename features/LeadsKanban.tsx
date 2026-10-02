import React, { useState, useEffect } from 'react';
import { Lead, LeadStatus } from '../types';
import { MapPin, DollarSign, User, Plus, Phone, MessageSquare, ShieldCheck, Calendar, Clock, AlertTriangle } from 'lucide-react';
import { canDeleteLead } from '../src/app/permissions';
import { useOrganization } from '../context/OrganizationContext';
import { supabase, isSupabaseConfigured, isValidUUID, LocalSupabaseMock, DEFAULT_DEMO_ORG_ID } from '../lib/supabase';
import { createManualLeadDraft } from '../src/app/manualLeadDraft';

interface LeadsKanbanProps {
  leads: Lead[];
  onSelectLead: (lead: Lead) => void;
  onUpdateLeadStatus: (leadId: string, newStatus: LeadStatus) => void;
  onAddLead?: (lead: Lead) => Promise<Lead> | Lead | void;
}

export const LeadsKanban: React.FC<LeadsKanbanProps> = ({
  leads: initialLeads,
  onSelectLead,
  onUpdateLeadStatus,
  onAddLead
}) => {
  const columns: { status: LeadStatus; label: string; color: string; badgeColor: string }[] = [
    { status: 'New', label: 'Nová poptávka', color: 'border-border bg-surface-secondary text-brand-primary', badgeColor: 'bg-brand-primary-soft text-brand-primary border-brand-primary-soft' },
    { status: 'Contacted', label: 'Kontaktováno', color: 'border-sky-200 bg-sky-50 text-sky-700', badgeColor: 'bg-sky-100 text-sky-700 border-sky-200' },
    { status: 'Quote', label: 'Rozpočet / Nabídka', color: 'border-amber-200 bg-amber-50 text-amber-700', badgeColor: 'bg-amber-100 text-amber-700 border-amber-200' },
    { status: 'In Progress', label: 'Realizace stavby', color: 'border-purple-200 bg-purple-50 text-purple-700', badgeColor: 'bg-purple-100 text-purple-700 border-purple-200' },
    { status: 'Completed', label: 'Dokončeno & Předáno', color: 'border-green-200 bg-green-50 text-green-700', badgeColor: 'bg-green-100 text-green-700 border-green-200' },
    { status: 'Lost', label: 'Stornováno', color: 'border-slate-200 bg-slate-50 text-slate-500', badgeColor: 'bg-slate-100 text-slate-500 border-slate-200' }
  ];

  const { dbUser, currentOrg } = useOrganization();
  const [leads, setLeads] = useState<Lead[]>(initialLeads);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [draggedLead, setDraggedLead] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  // Synchronize internal state with props when parent state changes
  useEffect(() => {
    setLeads(initialLeads);
  }, [initialLeads]);

  // Optimistic update handler delegates to parent via onUpdateLeadStatus
  const handleDragDrop = (id: string, status: LeadStatus) => {
    const targetLead = leads.find(l => l.id === id);
    if (!targetLead || targetLead.status === status) return;
    
    // Okamžitá reakce v UI (interní state komponenty pro drag and drop plynulost)
    const updated = leads.map(l => l.id === id ? { ...l, status } : l);
    setLeads(updated);

    // Centrální App handler zajistí optimistický update, toast, uložení i případný rollback
    if (onUpdateLeadStatus) {
      onUpdateLeadStatus(id, status);
    }
  };

  // New lead form state
  const [formTitle, setFormTitle] = useState('');
  const [formCustomerName, setFormCustomerName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formBudget, setFormBudget] = useState('');
  const [formDate, setFormDate] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formThumbnail, setFormThumbnail] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreateLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');
    setIsSubmitting(true);
    try {
      if (!onAddLead) throw new Error('Ukládání poptávek není dostupné.');
      const newLead = createManualLeadDraft({
        title: formTitle,
        customerName: formCustomerName,
        phone: formPhone,
        email: formEmail,
        address: formAddress,
        budget: formBudget,
        date: formDate,
        description: formDescription,
        thumbnail: formThumbnail,
        author: dbUser?.email || 'owner',
      });
      await onAddLead(newLead);
      setIsModalOpen(false);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Poptávku se nepodařilo uložit.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-20 text-slate-800 font-sans">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-[24px] border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Kanban zakázek & staveb</h2>
          <p className="text-xs text-slate-500 mt-0.5">Široké sloupce s podrobnými kartami, rychlými akcemi a přehledem stavu</p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <button
            onClick={() => setIsModalOpen(true)}
            className="w-full md:w-auto px-5 py-3 min-h-[48px] rounded-2xl font-black text-xs shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
            style={{ backgroundColor: 'var(--brand-primary)', color: '#ffffff' }}
          >
            <Plus className="w-4 h-4" />
            <span>Nová zakázka / Poptávka</span>
          </button>
        </div>
      </div>

      {/* New Lead Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-white/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white border border-slate-200 rounded-3xl sm:rounded-[32px] max-w-xl w-full p-4 sm:p-8 shadow-2xl animate-in fade-in zoom-in-95 max-h-[92vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 shrink-0">
              <h3 className="text-lg sm:text-xl font-black text-slate-900">Vytvořit novou zakázku / poptávku</h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:text-slate-800 flex items-center justify-center text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateLeadSubmit} className="flex-1 overflow-y-auto space-y-4 text-sm pr-1">
              {/* Single column on mobile (grid-cols-1), two-column on desktop (sm:grid-cols-2) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-5 pt-1">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block">Název projektu / zakázky *</label>
                  <input
                    type="text"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    required
                    placeholder="Např. Pergola na míru"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 sm:px-4 sm:py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-primary-soft focus:border-brand-primary transition-all font-semibold text-base sm:text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block">Jméno zákazníka *</label>
                  <input
                    type="text"
                    value={formCustomerName}
                    onChange={(e) => setFormCustomerName(e.target.value)}
                    required
                    placeholder="Ing. Petr Novák"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 sm:px-4 sm:py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-primary-soft focus:border-brand-primary transition-all font-semibold text-base sm:text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block">Telefon *</label>
                  <input
                    type="tel"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    required
                    placeholder="+420 777 123 456"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 sm:px-4 sm:py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-primary-soft focus:border-brand-primary transition-all font-semibold text-base sm:text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block">E-mail *</label>
                  <input
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    required
                    placeholder="klient@email.cz"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 sm:px-4 sm:py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-primary-soft focus:border-brand-primary transition-all font-semibold text-base sm:text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block">Rozpočet (Kč) *</label>
                  <input
                    type="number"
                    value={formBudget}
                    onChange={(e) => setFormBudget(e.target.value)}
                    required
                    placeholder="250000"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 sm:px-4 sm:py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-primary-soft focus:border-brand-primary transition-all font-semibold text-base sm:text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block">Adresa stavby *</label>
                  <input
                    type="text"
                    value={formAddress}
                    onChange={(e) => setFormAddress(e.target.value)}
                    required
                    placeholder="Ulice 12, Město"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 sm:px-4 sm:py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-primary-soft focus:border-brand-primary transition-all font-semibold text-base sm:text-sm"
                  />
                </div>
              </div>

              {submitError && <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-700">{submitError}</p>}
              {/* Sticky Submit Bar at Bottom */}
              <div className="sticky bottom-0 bg-white/95 backdrop-blur-md pt-3.5 pb-1 flex flex-col sm:flex-row justify-end gap-2.5 border-t border-slate-100 mt-4 shrink-0 shadow-[0_-6px_16px_-4px_rgba(0,0,0,0.05)]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="w-full sm:w-auto px-5 py-3 rounded-xl bg-slate-100 text-slate-600 font-bold hover:bg-slate-200 transition-colors text-center order-2 sm:order-1 cursor-pointer"
                >
                  Zrušit
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full sm:w-auto px-6 py-3 rounded-xl font-extrabold shadow-md hover:shadow-lg transition-all text-center order-1 sm:order-2 cursor-pointer"
                  style={{ backgroundColor: 'var(--brand-primary)', color: '#ffffff' }}
                >
                  {isSubmitting ? 'Ukládám…' : 'Vytvořit zakázku'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Mobile Quick Status Filter Pills (Sticky horizontal bar on phone) */}
      <div className="flex md:hidden overflow-x-auto gap-2 pb-2 -mx-3 px-3 scrollbar-none">
        {columns.map(col => {
          const count = leads.filter(l => l.status === col.status).length;
          return (
            <button
              key={col.status}
              onClick={() => {
                const el = document.getElementById(`kanban-col-${col.status}`);
                if (el) el.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
              }}
              className="flex items-center justify-center gap-1.5 px-3 py-2 min-h-[44px] rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 whitespace-nowrap shadow-2xs shrink-0 active:scale-95 transition-transform"
            >
              <span className={`w-2 h-2 rounded-full ${col.badgeColor.split(' ')[0]}`}></span>
              <span>{col.label}</span>
              <span className="text-[10px] bg-slate-100 px-1.5 py-0.2 rounded-full text-slate-500 font-mono">{count}</span>
            </button>
          );
        })}
      </div>

      {/* Wide Kanban Board Container with Mobile Snap Scrolling: scroll-snap-type: x mandatory */}
      <div 
        className="overflow-x-auto pb-6 -mx-3 px-3 sm:-mx-8 sm:px-8 snap-x snap-mandatory scroll-smooth kanban-scroll-container"
        style={{ scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch' }}
      >
        <div className="flex gap-4 sm:gap-6 items-start w-max min-w-full">
          {columns.map(col => {
            const columnLeads = leads.filter(l => l.status === col.status);
            return (
              <div 
                key={col.status} 
                id={`kanban-col-${col.status}`}
                onDragOver={(e) => {
                  e.preventDefault();
                  if (dragOverColumn !== col.status) {
                    setDragOverColumn(col.status);
                  }
                }}
                onDragLeave={() => {
                  setDragOverColumn(null);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOverColumn(null);
                  if (draggedLead) {
                    handleDragDrop(draggedLead, col.status);
                    setDraggedLead(null);
                  }
                }}
                style={{ minWidth: '320px', scrollSnapAlign: 'start' }}
                className={`w-[320px] min-w-[320px] max-w-[320px] sm:w-[360px] sm:min-w-[340px] sm:max-w-[420px] rounded-[24px] border flex flex-col shadow-sm shrink-0 snap-start kanban-column-snap transition-all duration-200 ${
                  dragOverColumn === col.status
                    ? 'bg-blue-50/60 border-brand-primary ring-2 ring-brand-primary-soft shadow-md'
                    : 'bg-slate-50/80 border-slate-200'
                }`}
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
                      draggable
                      onDragStart={() => setDraggedLead(lead.id)}
                      onDragEnd={() => setDraggedLead(null)}
                      onClick={() => onSelectLead(lead)}
                      className={`bg-white p-5 rounded-2xl ${draggedLead === lead.id ? 'opacity-50 scale-95 shadow-none ring-2 ring-brand-primary' : 'opacity-100'} cursor-grab active:cursor-grabbing border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 space-y-4 group min-h-[190px] flex flex-col justify-between relative overflow-hidden`}
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
                        <h4 className="text-[15px] font-black text-slate-900 group-hover:text-brand-primary transition-colors line-clamp-2 leading-tight">
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
                          className="flex-1 py-2.5 min-h-[48px] rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold flex items-center justify-center gap-1.5 border border-slate-200 transition-colors active:scale-[0.98]"
                        >
                          <Phone className="w-3.5 h-3.5 text-brand-primary shrink-0" />
                          <span>Zavolat</span>
                        </a>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectLead(lead);
                          }}
                          className="flex-1 py-2.5 min-h-[48px] rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all border shadow-sm hover:shadow active:scale-[0.98]"
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
