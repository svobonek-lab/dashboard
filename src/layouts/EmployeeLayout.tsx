import React, { useState } from 'react';
import { useOrganization } from '@/context/OrganizationContext';
import { useRouter, Link } from '../app/router';
import { 
  Briefcase, 
  Calendar, 
  MapPin, 
  Camera, 
  CheckSquare, 
  MessageSquare, 
  User, 
  LogOut, 
  CloudSun, 
  Navigation, 
  Clock, 
  Phone, 
  Mic, 
  CheckCircle2,
  HardHat,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { Lead } from '@/types';
import { VoiceNotesModal } from '@/components/VoiceNotesModal';

interface EmployeeLayoutProps {
  children: React.ReactNode;
  leads?: Lead[];
}

export const EmployeeLayout: React.FC<EmployeeLayoutProps> = ({ children, leads = [] }) => {
  const { currentOrg } = useOrganization();
  const branding = currentOrg?.branding || {};
  const { user, dbUser, logout } = useOrganization();
  const { pathname, navigate, isActive } = useRouter();
  
  const [isVoiceOpen, setIsVoiceOpen] = useState(false);
  const [checkedIn, setCheckedIn] = useState(true);

  const employeeNavItems = [
    { label: 'Moje zakázky', path: '/employee', icon: Briefcase, exact: true },
    { label: 'Můj kalendář', path: '/employee/schedule', icon: Calendar },
    { label: 'Stavební checklist', path: '/employee/checklist', icon: CheckSquare },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-brand-primary-soft pb-20 md:pb-0">
      
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200/80 px-4 sm:px-6 py-3 sticky top-0 z-30 flex items-center justify-between shadow-xs">
        
        {/* Left: Worker Status & Identity */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-brand-primary-soft border border-brand-primary-soft text-brand-primary flex items-center justify-center font-bold shrink-0 overflow-hidden">
            {currentOrg?.logo_url ? (
              <img src={currentOrg.logo_url} alt={currentOrg?.name || 'Firma'} className="w-full h-full object-cover" />
            ) : (
              <HardHat className="w-5 h-5" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-900 tracking-tight">
                {currentOrg?.name || 'StavbaCore'}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase">
                Terénní režim
              </span>
            </div>
            <p className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
              <span className={`w-2 h-2 rounded-full ${checkedIn ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'}`}></span>
              <span>{checkedIn ? 'GPS Aktivní (Na stavbě)' : 'Mimo stavbu'}</span>
            </p>
          </div>
        </div>

        {/* Center: Weather & Next Appointment (Desktop/Tablet) */}
        <div className="hidden lg:flex items-center gap-4 px-4 py-1.5 rounded-2xl bg-slate-100/80 border border-slate-200/80 text-xs">
          <div className="flex items-center gap-2 text-slate-700">
            <CloudSun className="w-4 h-4 text-amber-500" />
            <span className="font-semibold">{currentOrg?.city || 'Praha'}: 21°C • Polojasno</span>
          </div>
          <div className="h-3 w-px bg-slate-300"></div>
          <div className="flex items-center gap-1.5 text-slate-700">
            <Clock className="w-3.5 h-3.5 text-brand-primary" />
            <span>Další výjezd: <strong className="text-slate-900">13:30 (Ing. Svoboda)</strong></span>
          </div>
        </div>

        {/* Right: Quick Dictation / Sign Out */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsVoiceOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 min-h-[48px] rounded-xl bg-brand-primary hover:bg-brand-primary text-white font-bold text-xs transition-all shadow-xs active:scale-95 cursor-pointer"
          >
            <Mic className="w-4 h-4" />
            <span className="hidden sm:inline">Hlasový záznam</span>
          </button>

          <button
            onClick={() => logout().then(() => navigate('/login'))}
            title="Odhlásit se"
            className="p-2 min-h-[48px] min-w-[48px] flex items-center justify-center rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>

      </header>

      <div className="flex-1 flex">
        
        {/* Desktop Sidebar (hidden on mobile) */}
        <aside className="hidden md:flex w-64 bg-white border-r border-slate-200/80 flex-col justify-between shrink-0 p-4 sticky top-16 h-[calc(100vh-64px)]">
          
          <div className="space-y-1">
            <div className="px-3.5 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Pracovní nástroje
            </div>

            {employeeNavItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path, item.exact);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  exact={item.exact}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all ${
                    active
                      ? 'bg-brand-primary-soft text-brand-primary border border-brand-primary-soft/80 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${active ? 'text-brand-primary' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>

          {/* Employee Safety & Emergency Box */}
          <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-1.5 text-xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Kontakt na dispečink
            </span>
            <a 
              href="tel:+420777123456" 
              className="flex items-center gap-2 text-brand-primary font-bold hover:underline"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>+420 777 123 456</span>
            </a>
          </div>

        </aside>

        {/* Main Employee App Canvas */}
        <main className="flex-1 p-4 sm:p-6 md:p-8 max-w-4xl w-full mx-auto">
          {children}
        </main>

      </div>

      {/* Mobile Sticky Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-md border-t border-slate-200/80 pb-safe z-40 shadow-lg">
        <div className="flex items-center justify-around px-2 py-2">
          {[
            { label: 'Zakázky', path: '/employee', icon: Briefcase, exact: true },
            { label: 'Kalendář', path: '/employee/schedule', icon: Calendar },
            { label: 'Checklist', path: '/employee/checklist', icon: CheckSquare },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = isActive(tab.path, tab.exact);
            return (
              <Link
                key={tab.path}
                to={tab.path}
                exact={tab.exact}
                className={`flex flex-col items-center justify-center min-w-[72px] h-[52px] rounded-2xl transition-all active:scale-95 ${
                  active ? 'text-brand-primary bg-brand-primary-soft font-bold' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Icon className={`w-5 h-5 mb-0.5 ${active ? 'text-brand-primary' : 'text-slate-400'}`} />
                <span className="text-[10px] tracking-wide">{tab.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Voice Notes Modal */}
      <VoiceNotesModal
        isOpen={isVoiceOpen}
        onClose={() => setIsVoiceOpen(false)}
        onSaveNote={(note) => {
          setIsVoiceOpen(false);
        }}
        onCreateLeadFromVoice={(parsed) => {
          setIsVoiceOpen(false);
          navigate('/employee');
        }}
        hasActiveLead={false}
      />

    </div>
  );
};
