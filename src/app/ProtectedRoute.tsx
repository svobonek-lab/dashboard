import React, { useEffect } from 'react';
import { useOrganization } from '@/context/OrganizationContext';
import { useRouter } from './router';
import { UserRole } from './permissions';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRole?: UserRole | UserRole[];
}

const Navigate: React.FC<{ to: string; replace?: boolean }> = ({ to, replace }) => {
  const { navigate } = useRouter();
  useEffect(() => {
    navigate(to, { replace });
  }, [navigate, to, replace]);
  return null;
};

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRole }) => {
  const { user, dbUser, isLoading, isConfigured } = useOrganization();
  const { pathname } = useRouter();

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
          <p className="text-xs font-bold text-slate-200 tracking-wide">StavbaFlow Enterprise OS</p>
          <p className="text-[11px] font-medium text-slate-500 animate-pulse">Načítání oprávnění a datové vrstvy...</p>
        </div>
      </div>
    );
  }

  // Bypassing logic for public pages wrapped in ProtectedRoute
  const isPublicRoute = pathname === '/login' || pathname.startsWith('/widget-iframe') || pathname === '/portal' || pathname === '/inquiry';
  if (isPublicRoute) {
    return <>{children}</>;
  }

  // Exact Requested Logic
  if (isConfigured && (!user || !dbUser)) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRole && dbUser) {
    const requiredRoles = Array.isArray(allowedRole) ? allowedRole : [allowedRole];
    if (!requiredRoles.includes(dbUser.role as UserRole)) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  return <>{children}</>;
};
