import React, { useEffect } from 'react';
import { useOrganization } from '@/context/OrganizationContext';
import { useRouter } from './router';
import { RoleGuard } from './RoleGuard';
import { UserRole, getDefaultRouteForRole } from './permissions';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRole?: UserRole | UserRole[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRole }) => {
  const { user, dbUser, isLoading, isConfigured } = useOrganization();
  const { pathname, navigate } = useRouter();

  useEffect(() => {
    if (isLoading) return;

    // If not authenticated and Supabase is configured, redirect to /login
    if (!user && isConfigured) {
      if (pathname !== '/login' && pathname !== '/widget-iframe' && pathname !== '/widget-iframe.html') {
        navigate('/login', { replace: true });
      }
    }
  }, [user, isLoading, isConfigured, pathname, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4 text-slate-100">
        <div className="relative">
          <div className="w-12 h-12 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
          </div>
        </div>
        <div className="text-center space-y-1">
          <p className="text-xs font-bold text-slate-200 tracking-wide">StavbaCore Enterprise OS</p>
          <p className="text-[11px] font-medium text-slate-500 animate-pulse">Načítání oprávnění a datové vrstvy...</p>
        </div>
      </div>
    );
  }

  if (!user && isConfigured) {
    return null; // Will redirect via useEffect
  }

  if (allowedRole) {
    return <RoleGuard role={allowedRole}>{children}</RoleGuard>;
  }

  return <>{children}</>;
};
