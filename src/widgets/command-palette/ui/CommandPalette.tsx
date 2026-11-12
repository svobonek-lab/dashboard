import React, { useState, useEffect } from 'react';
import { Search, LayoutDashboard, Kanban, HardHat, Users, Code2, Settings, X, Upload } from 'lucide-react';
import type { CompanyBranding } from '@/entities/company';
import type { Lead } from '@/entities/lead';

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

  const normalizedQuery = query.trim().toLocaleLowerCase('cs');
  const filteredLeads = leads.filter(l =>
    [l.title, l.customerName, l.city]
      .filter(Boolean)
      .some((value) => String(value).toLocaleLowerCase('cs').includes(normalizedQuery))
  );

  const navigationActions = [
    { id: 'dashboard', label: 'Přehled firmy', icon: LayoutDashboard },
    { id: 'leads', label: 'Poptávky', icon: Kanban },
    { id: 'projects', label: 'Zakázky v realizaci', icon: HardHat },
    { id: 'employees', label: 'Tým', icon: Users },
    { id: 'widget', label: 'Poptávkový formulář', icon: Code2 },
    { id: 'integrations', label: 'CSV import', icon: Upload },
    { id: 'settings', label: 'Nastavení firmy', icon: Settings },
  ].filter(item => item.label.toLocaleLowerCase('cs').includes(normalizedQuery));

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
            placeholder="Hledat poptávku nebo otevřít část systému…"
            className="w-full text-slate-800 placeholder-slate-400 text-base focus:outline-none bg-transparent font-medium"
          />
          <button aria-label="Zavřít hledání" onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Results Container */}
        <div className="max-h-96 overflow-y-auto p-4 space-y-4">
          {navigationActions.length > 0 && (
            <div>
              <p className="text-[11px] font-bold text-slate-500 px-3 pb-2">Navigace</p>
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

                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {filteredLeads.length > 0 && (
            <div>
              <p className="text-[11px] font-bold text-slate-500 px-3 pb-2">Poptávky a zakázky</p>
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
                      <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-blue-50 text-xs font-black text-blue-700">
                        {(lead.customerName || lead.title || 'Z').slice(0, 1).toUpperCase()}
                      </span>
                      <div className="overflow-hidden">
                        <p className="text-xs font-bold text-slate-900 truncate">{lead.title}</p>
                        <p className="text-[11px] text-slate-500 truncate">{[lead.customerName, lead.city].filter(Boolean).join(', ')}</p>
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
            <span><kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded-md shadow-2xs">ESC</kbd> zavře nabídku</span>
            <span><kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded-md shadow-2xs">Ctrl + K</kbd> otevře hledání</span>
          </div>
          <span className="font-semibold text-slate-600">{branding.name} CRM</span>
        </div>
      </div>
    </div>
  );
};
