import React, { useState } from 'react';
import { Search, Bell, Shield, UserCheck, Sparkles } from 'lucide-react';
import { CompanyBranding, CRMNotification } from '../types';
import { NotificationCenter } from './NotificationCenter';

interface HeaderProps {
  branding: CompanyBranding;
  activeRole: 'owner' | 'employee';
  setActiveRole: (role: 'owner' | 'employee') => void;
  onOpenDemoGenerator: () => void;
  notifications: CRMNotification[];
  onMarkAllRead: () => void;
  onOpenCommandPalette: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  branding,
  activeRole,
  setActiveRole,
  onOpenDemoGenerator,
  notifications,
  onMarkAllRead,
  onOpenCommandPalette
}) => {
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <header className="h-20 bg-white border-b border-slate-200 px-8 flex items-center justify-between sticky top-0 z-20 shadow-xs">
      <div className="flex items-center gap-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            {branding.name} CRM
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            Personalized Construction Demo • {branding.city}
          </p>
        </div>

        {/* Role Switcher for Sales Demo */}
        <div className="hidden md:flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold">
          <button
            onClick={() => setActiveRole('owner')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              activeRole === 'owner'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Shield className="w-3.5 h-3.5 text-blue-600" />
            <span>Owner Dashboard</span>
          </button>
          <button
            onClick={() => setActiveRole('employee')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              activeRole === 'employee'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Employee Mobile App</span>
          </button>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Search Bar / Command Palette Trigger */}
        <button
          onClick={onOpenCommandPalette}
          className="hidden lg:flex items-center gap-3 w-64 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-400 hover:border-slate-300 transition-all text-left"
        >
          <Search className="w-4 h-4 text-slate-400" />
          <span className="flex-1 truncate">Search leads, clients...</span>
          <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded-md text-[10px] font-mono text-slate-500 shadow-2xs">Ctrl+K</kbd>
        </button>

        {/* Generate New Demo CTA */}
        <button
          onClick={onOpenDemoGenerator}
          className="hidden sm:flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-white shadow-sm transition-all hover:opacity-95"
          style={{ backgroundColor: branding.primaryColor }}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>New Demo URL</span>
        </button>

        {/* Notifications Dropdown Container */}
        <div className="relative">
          <button
            onClick={() => setIsNotifOpen(!isNotifOpen)}
            className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-all relative"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-white animate-pulse"></span>
            )}
          </button>

          <NotificationCenter
            isOpen={isNotifOpen}
            onClose={() => setIsNotifOpen(false)}
            notifications={notifications}
            onMarkAllRead={onMarkAllRead}
          />
        </div>

        {/* User Profile Avatar */}
        <div className="flex items-center gap-3 pl-2 border-l border-slate-200">
          <img
            src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80"
            alt="Profile"
            className="w-10 h-10 rounded-xl object-cover ring-2 ring-slate-200"
          />
          <div className="hidden xl:block text-left">
            <p className="text-xs font-bold text-slate-900">Jan Ředitel</p>
            <p className="text-[11px] text-slate-500">Sales Director</p>
          </div>
        </div>
      </div>
    </header>
  );
};
