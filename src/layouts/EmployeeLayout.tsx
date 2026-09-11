import React, { useState } from 'react';
import { useOrganization } from '@/context/OrganizationContext';
import { useBranding } from '@/hooks/useBranding';
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
  const { branding } = useBranding();
  const { user, dbUser, logout } = useOrganization();
  const { pathname, navigate, isActive } = useRouter();
  
  const [isVoiceOpen, setIsVoiceOpen] = useState(false);
  const [checkedIn, setCheckedIn] = useState(true);

  const employeeNavItems = [
    { label: 'Moje zakázky', path: '/employee', icon: Briefcase, exact: true },
    { label: 'Harmonogram', path: '/employee/schedule', icon: Calendar },
    { label: 'Navigace & Mapa', path: '/employee/map', icon: MapPin },
    { label: 'Foto ze stavby', path: '/employee/photos', icon: Camera },
    { label: 'Stavební checklist', path: '/employee/checklist', icon: CheckSquare },
    { label: 'Zprávy z dispečinku', path: '/employee/messages', icon: MessageSquare },
    { label: 'Můj profil', path: '/employee/profile', icon: User },
  ];

  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-100 flex flex-col font-sans selection:bg-emerald-500/30 pb-20 md:pb-0">
      
      {/* Top Mobile/Desktop Field Header */}
      <header className="bg-[#111726] border-b border-slate-800/80 px-4 sm:px-6 py-3 sticky top-0 z-30 flex items-center justify-between shadow-md">
        
        {/* Left: Worker Status & Identity */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center font-black shrink-0">
            <HardHat className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-white tracking-tight">
                {branding?.name || 'StavbaCore'}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 uppercase">
                Terénní režim
              </span>
            </div>
            <p className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
              <span className={`w-2 h-2 rounded-full ${checkedIn ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`}></span>
              <span>{checkedIn ? 'GPS Aktivní (Na stavbě)' : 'Mimo stavbu'}</span>
            </p>
          </div>
        </div>

        {/* Center: Weather & Next Appointment (Desktop/Tablet) */}
        <div className="hidden lg:flex items-center gap-4 px-4 py-1.5 rounded-2xl bg-[#0B0F19] border border-slate-800 text-xs">
          <div className="flex items-center gap-2 text-slate-300">
            <CloudSun className="w-4 h-4 text-amber-400" />
            <span className="font-semibold">{branding?.city || 'Praha'}: 21°C • Polojasno</span>
          </div>
          <div className="h-3 w-px bg-slate-800"></div>
          <div className="flex items-center gap-1.5 text-slate-300">
            <Clock className="w-3.5 h-3.5 text-emerald-400" />
            <span>Další výjezd: <strong className="text-white">13:30 (Ing. Svoboda)</strong></span>
          </div>
        </div>

        {/* Right: Quick Dictation / Sign Out */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsVoiceOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition-all shadow-md shadow-emerald-500/20 active:scale-95"
          >
            <Mic className="w-4 h-4" />
            <span className="hidden sm:inline">Hlasový záznam</span>
          </button>

          <button
            onClick={() => logout().then(() => navigate('/login'))}
            title="Odhlásit se"
            className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>

      </header>

      <div className="flex-1 flex">
        
        {/* Desktop Sidebar (hidden on mobile) */}
        <aside className="hidden md:flex w-64 bg-[#111726] border-r border-slate-800/80 flex-col justify-between shrink-0 p-4 sticky top-16 h-[calc(100vh-64px)]">
          
          <div className="space-y-1">
            <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Moje pracovní nástroje
            </div>

            {employeeNavItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path, item.exact);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  exact={item.exact}
                  className={`flex items-center gap-3 px-3.5 py-3 rounded-2xl text-xs font-bold transition-all ${
                    active
                      ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${active ? 'text-slate-950' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>

          {/* Employee Safety & Emergency Box */}
          <div className="p-3 bg-[#0B0F19] border border-slate-800 rounded-2xl space-y-2 text-xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Kontakt na dispečink
            </span>
            <a 
              href="tel:+420777123456" 
              className="flex items-center gap-2 text-emerald-400 font-bold hover:underline"
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

      {/* Mobile Sticky Bottom Navigation Bar (Touch targets > 48px) */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-[#111726]/95 backdrop-blur-lg border-t border-slate-800 px-2 py-1.5 z-40 flex items-center justify-around">
        {[
          { label: 'Zakázky', path: '/employee', icon: Briefcase, exact: true },
          { label: 'Plán', path: '/employee/schedule', icon: Calendar },
          { label: 'Mapa', path: '/employee/map', icon: MapPin },
          { label: 'Foto', path: '/employee/photos', icon: Camera },
          { label: 'Checklist', path: '/employee/checklist', icon: CheckSquare },
          { label: 'Profil', path: '/employee/profile', icon: User },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = isActive(tab.path, tab.exact);
          return (
            <Link
              key={tab.path}
              to={tab.path}
              exact={tab.exact}
              className={`flex flex-col items-center justify-center min-w-[50px] min-h-[48px] py-1 px-2 rounded-xl text-[10px] font-bold transition-all ${
                active ? 'text-emerald-400 bg-emerald-500/10' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className="w-5 h-5 mb-0.5" />
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Voice Notes Modal for field speech dictation */}
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
