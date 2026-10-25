import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
export { isPublicDemoPath } from './demoUrl';

interface RouterContextType {
  pathname: string;
  search: string;
  params: Record<string, string>;
  navigate: (to: string, options?: { replace?: boolean }) => void;
  isActive: (path: string, exact?: boolean) => boolean;
}

const RouterContext = createContext<RouterContextType | undefined>(undefined);

export const useRouter = () => {
  const context = useContext(RouterContext);
  if (!context) {
    throw new Error('useRouter must be used within a RouterProvider');
  }
  return context;
};

export const RouterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [pathname, setPathname] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return window.location.pathname || '/';
    }
    return '/';
  });

  const [search, setSearch] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return window.location.search || '';
    }
    return '';
  });

  useEffect(() => {
    const handlePopState = () => {
      setPathname(window.location.pathname || '/');
      setSearch(window.location.search || '');
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = useCallback((to: string, options?: { replace?: boolean }) => {
    if (typeof window === 'undefined') return;

    const [targetPath, targetSearch] = to.split('?');
    const newSearch = targetSearch ? `?${targetSearch}` : '';

    if (options?.replace) {
      window.history.replaceState(null, '', to);
    } else {
      window.history.pushState(null, '', to);
    }

    setPathname(targetPath || '/');
    setSearch(newSearch);
    window.scrollTo(0, 0);
  }, []);

  const isActive = useCallback((path: string, exact: boolean = false) => {
    if (exact || path === '/') {
      return pathname === path;
    }
    return pathname.startsWith(path);
  }, [pathname]);

  const value = useMemo(() => ({
    pathname,
    search,
    params: {},
    navigate,
    isActive
  }), [pathname, search, navigate, isActive]);

  return (
    <RouterContext.Provider value={value}>
      {children}
    </RouterContext.Provider>
  );
};

export interface LinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  to: string;
  replace?: boolean;
  activeClassName?: string;
  exact?: boolean;
}

export const Link: React.FC<LinkProps> = ({ 
  to, 
  replace = false, 
  activeClassName = '', 
  className = '', 
  exact = false,
  children, 
  onClick, 
  ...props 
}) => {
  const { navigate, isActive } = useRouter();
  const active = isActive(to, exact);

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (onClick) onClick(e);
    if (!e.defaultPrevented && !e.metaKey && !e.ctrlKey && !e.shiftKey) {
      e.preventDefault();
      navigate(to, { replace });
    }
  };

  return (
    <a
      href={to}
      onClick={handleClick}
      className={`${className} ${active ? activeClassName : ''}`}
      {...props}
    >
      {children}
    </a>
  );
};
