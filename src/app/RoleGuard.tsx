import React from 'react';
import { useOrganization } from '@/entities/session';
import { ShieldAlert, Lock, Home } from 'lucide-react';
import { getDefaultRouteForRole, type UserRole } from '../shared/model/permissions';
import { useRouter } from '../shared/lib/router';

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
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4 text-slate-100">
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
    <div className="min-h-screen bg-slate-50 text-slate-800 flex items-center justify-center p-6 font-sans relative overflow-hidden">
      {/* Subtle Background Glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-rose-500/5 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none"></div>

      <div className="relative z-10 max-w-lg w-full bg-white border border-slate-200 rounded-3xl p-8 shadow-2xl space-y-6 text-center">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center shadow-inner">
          <Lock className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>403 — Přístup odepřen</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Nemáte oprávnění k této sekci
          </h1>
          <p className="text-xs text-slate-500 leading-relaxed max-w-md mx-auto">
            Tento modul vyžaduje roli <span className="font-bold text-slate-800">{allowedRoles.join(' nebo ')}</span>.
            Váš aktuální účet je přihlášen jako <span className="font-bold text-slate-800">{userRole}</span>.
          </p>
        </div>

        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 text-left space-y-2 text-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span>Uživatel:</span>
            <span className="text-slate-800 font-semibold">{dbUser?.email || 'Neznámý'}</span>
          </div>
          <div className="flex items-center justify-between text-slate-500">
            <span>Aktuální role:</span>
            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-bold text-[10px]">
              {userRole}
            </span>
          </div>
          <div className="flex items-center justify-between text-slate-500">
            <span>Vyžadované role:</span>
            <span className="text-rose-600 font-medium">
              {allowedRoles.join(', ')}
            </span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
          <button
            onClick={() => navigate(defaultTarget)}
            className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-500/10 cursor-pointer"
          >
            <Home className="w-4 h-4" />
            <span>Přejít na můj dashboard</span>
          </button>

          <button
            onClick={() => window.history.back()}
            className="w-full sm:w-auto py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all flex items-center justify-center gap-1.5 border border-slate-200 cursor-pointer"
          >
            <span>Zpět</span>
          </button>
        </div>
      </div>
    </div>
  );
};
