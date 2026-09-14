import React, { useState, useEffect } from 'react';
import { Search, LayoutDashboard, Kanban, Calendar, Users, FileText, FolderOpen, BarChart3, Plus, Sparkles, X, ArrowRight } from 'lucide-react';
import { CompanyBranding, Lead } from '../types';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab: (tab: string) => void;
  onSelectLead: (lead: Lead) => void;
  leads: Lead[];
  branding: CompanyBranding;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onNavigateTab,
  onSelectLead,
  leads,
  branding
}) => {
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filteredLeads = leads.filter(l => 
    l.title.toLowerCase().includes(query.toLowerCase()) ||
    l.customerName.toLowerCase().includes(query.toLowerCase()) ||
    l.city.toLowerCase().includes(query.toLowerCase())
  );

  const navigationActions = [
    { id: 'dashboard', label: 'Go to Dashboard', icon: LayoutDashboard },
    { id: 'leads', label: 'View Leads Kanban', icon: Kanban },
    { id: 'calendar', label: 'Open Calendar & Weather', icon: Calendar },
    { id: 'employees', label: 'Employee Workload & Capacity', icon: Users },
    { id: 'quotes', label: 'Quick Quote Builder & PDF', icon: FileText },
    { id: 'documents', label: 'Documents & Contracts', icon: FolderOpen },
    { id: 'analytics', label: 'Analytics & Revenue', icon: BarChart3 },
  ].filter(item => item.label.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="fixed inset-0 z-50 bg-slate-50/60 backdrop-blur-xs flex items-start justify-center pt-20 px-4">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Search Input Bar */}
        <div className="p-4 border-b border-slate-100 flex items-center gap-3">
          <Search className="w-5 h-5 text-slate-500" />
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command or search leads, clients, reports..."
            className="w-full text-slate-800 placeholder-slate-400 text-base focus:outline-none bg-transparent font-medium"
          />
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Results Container */}
        <div className="max-h-96 overflow-y-auto p-4 space-y-4">
          {navigationActions.length > 0 && (
            <div>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider px-3 pb-2">Navigation & Actions</p>
              <div className="space-y-1">
                {navigationActions.map(action => {
                  const Icon = action.icon;
                  return (
                    <button
                      key={action.id}
                      onClick={() => {
                        onNavigateTab(action.id);
                        onClose();
                      }}
                      className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 text-slate-700 hover:text-slate-900 transition-all text-sm font-medium group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center group-hover:bg-brand-primary-soft group-hover:text-brand-primary transition-all">
                          <Icon className="w-4 h-4" />
                        </div>
                        <span>{action.label}</span>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-500 opacity-0 group-hover:opacity-100 transition-all" />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {filteredLeads.length > 0 && (
            <div>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider px-3 pb-2">Matching Leads & Projects</p>
              <div className="space-y-1">
                {filteredLeads.map(lead => (
                  <button
                    key={lead.id}
                    onClick={() => {
                      onSelectLead(lead);
                      onClose();
                    }}
                    className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 text-slate-700 hover:text-slate-900 transition-all text-sm group"
                  >
                    <div className="flex items-center gap-3 overflow-hidden text-left">
                      <img src={lead.thumbnail} alt="" className="w-9 h-9 rounded-xl object-cover flex-shrink-0" />
                      <div className="overflow-hidden">
                        <p className="text-xs font-bold text-slate-900 truncate">{lead.title}</p>
                        <p className="text-[11px] text-slate-500 truncate">{lead.customerName} • {(lead.price/1000).toFixed(0)}k CZK</p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-brand-primary-soft text-brand-primary">
                      {lead.status}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-3">
            <span>Press <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded-md shadow-2xs font-mono">ESC</kbd> to close</span>
            <span>Use <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded-md shadow-2xs font-mono">Ctrl + K</kbd> anytime</span>
          </div>
          <span className="font-semibold text-slate-600">{branding.name} CRM</span>
        </div>
      </div>
    </div>
  );
};
