import React from 'react';
import { useOrganization } from '@/context/OrganizationContext';
import { ShieldAlert, ArrowLeft, Lock, ArrowRight, Home } from 'lucide-react';
import { UserRole, getDefaultRouteForRole } from './permissions';
import { useRouter } from './router';

interface RoleGuardProps {
  role?: UserRole | UserRole[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const RoleGuard: React.FC<RoleGuardProps> = ({ role, children, fallback }) => {
  const { dbUser, isLoading } = useOrganization();
  const { navigate } = useRouter();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4 text-slate-100">
        <div className="w-10 h-10 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin"></div>
        <p className="text-xs font-semibold text-slate-400 animate-pulse">Ověřování přístupových práv...</p>
      </div>
    );
  }

  const userRole = (dbUser?.role as UserRole) || 'owner';

  const allowedRoles = Array.isArray(role) ? role : role ? [role] : [];
  const isAuthorized = allowedRoles.length === 0 || allowedRoles.includes(userRole);

  if (isAuthorized) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  // Premium 403 Forbidden Page
  const defaultTarget = getDefaultRouteForRole(userRole);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6 font-sans relative overflow-hidden">
      {/* Subtle Background Glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-rose-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>
      
      <div className="relative z-10 max-w-lg w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-6 text-center">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center shadow-inner">
          <Lock className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-bold uppercase tracking-wider">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>403 — Přístup odepřen</span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            Nemáte oprávnění k této sekci
          </h1>
          <p className="text-xs text-slate-400 leading-relaxed max-w-md mx-auto">
            Tento modul vyžaduje roli <span className="font-bold text-amber-400">{allowedRoles.join(' nebo ')}</span>. 
            Váš aktuální účet je přihlášen jako <span className="font-bold text-slate-200">{userRole}</span>.
          </p>
        </div>

        <div className="bg-slate-950/80 rounded-2xl p-4 border border-slate-800 text-left space-y-2 text-xs">
          <div className="flex items-center justify-between text-slate-400">
            <span>Uživatel:</span>
            <span className="font-mono text-slate-200 font-semibold">{dbUser?.email || 'Neznámý'}</span>
          </div>
          <div className="flex items-center justify-between text-slate-400">
            <span>Aktuální role:</span>
            <span className="px-2 py-0.5 rounded bg-slate-800 text-amber-400 font-bold font-mono uppercase text-[10px]">
              {userRole}
            </span>
          </div>
          <div className="flex items-center justify-between text-slate-400">
            <span>Vyžadované role:</span>
            <span className="font-mono text-rose-300 font-medium">
              {allowedRoles.join(', ')}
            </span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
          <button
            onClick={() => navigate(defaultTarget)}
            className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-500/10"
          >
            <Home className="w-4 h-4" />
            <span>Přejít na můj dashboard</span>
          </button>
          
          <button
            onClick={() => window.history.back()}
            className="w-full sm:w-auto py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all flex items-center justify-center gap-1.5 border border-slate-700"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Zpět</span>
          </button>
        </div>
      </div>
    </div>
  );
};
