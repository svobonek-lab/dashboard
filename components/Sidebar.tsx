import React from 'react';
import { 
  LayoutDashboard, 
  Kanban, 
  Calendar as CalendarIcon, 
  Users, 
  FileText, 
  FolderOpen, 
  BarChart3, 
  Settings, 
  Sparkles,
  Building2,
  Phone,
  Mail,
  MapPin,
  ShieldCheck,
  Code2,
  Wand2,
  Rocket,
  Download
} from 'lucide-react';
import { CompanyBranding } from '../types';

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  branding: CompanyBranding;
  onOpenDemoGenerator: () => void;
  onOpenOnboarding?: () => void;
  onExportZip?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  currentTab, 
  setCurrentTab, 
  branding,
  onOpenDemoGenerator,
  onOpenOnboarding,
  onExportZip
}) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'inquiry', label: 'AI Inquiry Form', icon: Sparkles },
    { id: 'widget', label: 'Embed Lead Widget', icon: Code2 },
    { id: 'install', label: 'Install Studio (/admin)', icon: Rocket },
    { id: 'portal', label: 'Client Portal View', icon: ShieldCheck },
    { id: 'communication', label: 'WhatsApp & SMS Hub', icon: Phone },
    { id: 'leads', label: 'Leads (Kanban)', icon: Kanban },
    { id: 'map', label: 'Jobs Map & Routes', icon: MapPin },
    { id: 'calendar', label: 'Calendar', icon: CalendarIcon },
    { id: 'employees', label: 'Employees', icon: Users },
    { id: 'quotes', label: 'Quotes & PDF', icon: FileText },
    { id: 'documents', label: 'Documents', icon: FolderOpen },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="w-72 bg-slate-900 text-slate-300 flex flex-col h-screen fixed left-0 top-0 z-30 border-r border-slate-800 shadow-xl">
      {/* Top Brand Area */}
      <div className="p-6 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div 
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-md"
            style={{ backgroundColor: branding.primaryColor }}
          >
            {branding.name ? branding.name.substring(0, 2).toUpperCase() : 'NS'}
          </div>
          <div className="overflow-hidden">
            <h1 className="font-semibold text-white text-base truncate">{branding.name}</h1>
            <p className="text-xs text-slate-400 truncate flex items-center gap-1 mt-0.5">
              <MapPin className="w-3 h-3 text-slate-500 flex-shrink-0" /> {branding.city}
            </p>
          </div>
        </div>

        {/* Demo Factory Trigger Button */}
        <button
          onClick={onOpenDemoGenerator}
          className="mt-5 w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-medium text-white shadow-lg transition-all duration-200 hover:opacity-95 active:scale-[0.98]"
          style={{ backgroundColor: branding.primaryColor }}
        >
          <Sparkles className="w-4 h-4" />
          <span>DemoFactory (New Demo)</span>
        </button>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
        <div className="px-3 pb-2 text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
          CRM Workspace
        </div>
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentTab(item.id)}
              className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-medium transition-all duration-150 relative ${
                isActive 
                  ? 'text-white bg-slate-800/80 shadow-sm' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              {isActive && (
                <div 
                  className="absolute left-0 top-2 bottom-2 w-1.5 rounded-r-full"
                  style={{ backgroundColor: branding.primaryColor }}
                />
              )}
              <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
              <span>{item.label}</span>
            </button>
          );
        })}

        {onOpenOnboarding && (
          <div className="pt-2 space-y-1.5">
            <button
              onClick={onOpenOnboarding}
              className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-bold text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 transition-all text-left"
            >
              <Wand2 className="w-4 h-4 text-amber-400" />
              <span>Průvodce nastavením</span>
            </button>
            {onExportZip && (
              <button
                onClick={onExportZip}
                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-bold text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 transition-all text-left"
              >
                <Download className="w-4 h-4 text-blue-400" />
                <span>Stáhnout projekt (ZIP)</span>
              </button>
            )}
          </div>
        )}
      </nav>

      {/* Footer Company Contact */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/40 text-xs text-slate-400 space-y-1.5">
        <div className="flex items-center gap-2 truncate">
          <Phone className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
          <span className="truncate">{branding.phone}</span>
        </div>
        <div className="flex items-center gap-2 truncate">
          <Mail className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
          <span className="truncate">{branding.email}</span>
        </div>
      </div>
    </aside>
  );
};
