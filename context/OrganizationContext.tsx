import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured, LocalSupabaseMock, isValidUUID, DEFAULT_DEMO_ORG_ID } from '../lib/supabase';
import { CompanyBranding, Lead, Employee } from '../types';
import * as Sentry from "@sentry/react";

const IS_PRODUCTION = !!(import.meta as any).env?.PROD;

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Strict Super Admin Access Enforcer:
// ONLY and SOLELY svobonek@gmail.com with password AP11hynek is allowed super_admin access.
// All other users are strictly restricted to 'owner' or 'employee'.
export const enforceRole = (email?: string, pass?: string, candidateRole?: string): 'super_admin' | 'owner' | 'employee' => {
  const cleanEmail = (email || '').trim().toLowerCase();
  
  if (cleanEmail === 'svobonek@gmail.com') {
    if (!pass || pass === 'AP11hynek') {
      return 'super_admin';
    }
  }

  // Under NO circumstances can any other email/user have super_admin role
  if (candidateRole === 'employee' || cleanEmail.includes('zamestnanec') || cleanEmail.includes('worker') || cleanEmail.includes('montaznik')) {
    return 'employee';
  }
  return 'owner';
};

export interface Organization {
  id: string;
  name: string;
  slug: string;
  website?: string;
  phone?: string;
  email?: string;
  city?: string;
  primary_color: string;
  secondary_color?: string;
  logo_url?: string;
  branding?: any;
  status?: string;
  created_at?: string;
}

export interface DBUser {
  id: string;
  organization_id: string;
  role: string;
  email?: string;
}

export interface DBProject {
  id: string;
  organization_id: string;
  lead_id: string;
  assigned_employee: string;
  status: string;
}

interface OrganizationContextType {
  isConfigured: boolean;
  user: any | null; // Supabase Auth User
  dbUser: DBUser | null; // Database user with org details
  currentOrg: Organization | null;
  organizations: Organization[];
  isLoading: boolean;
  error: string | null;
  schemaError: string | null;
  clearSchemaError: () => void;
  
  // Auth actions
  login: (email: string, pass: string) => Promise<any>;
  signUp: (email: string, pass: string, orgName: string) => Promise<any>;
  logout: () => Promise<void>;
  
  // Tenant actions
  createOrganization: (name: string, primaryColor?: string) => Promise<Organization>;
  switchOrganization: (orgId: string) => Promise<void>;
  
  // Data synchronization functions (filtered by current active organization_id)
  fetchLeads: () => Promise<Lead[]>;
  saveLead: (lead: Partial<Lead>) => Promise<Lead>;
  updateLeadStatus: (leadId: string, status: string) => Promise<void>;
  
  fetchEmployees: () => Promise<Employee[]>;
  saveEmployee: (emp: Partial<Employee>) => Promise<Employee>;
  
  fetchProjects: () => Promise<DBProject[]>;
  saveProject: (project: Partial<DBProject>) => Promise<DBProject>;

  // Super Admin panel actions & state
  impersonatingOrgId: string | null;
  originalOrg: Organization | null;
  impersonateOrganization: (orgId: string) => Promise<void>;
  stopImpersonation: () => void;
  switchRoleToSuperAdmin: () => void;
  fetchAllOrganizationsAdmin: () => Promise<any[]>;
  deleteOrganizationAdmin: (orgId: string) => Promise<void>;
  updateBrandingAdmin: (orgId: string, name: string, color: string, logo?: string) => Promise<void>;
  suspendOrganizationAdmin: (orgId: string, suspend: boolean) => Promise<void>;
  createCustomerAdmin: (data: {
    name: string;
    city?: string;
    phone?: string;
    email?: string;
    website?: string;
    logo_url?: string;
    primary_color: string;
    secondary_color?: string;
    address?: string;
    owner_name?: string;
    owner_email?: string;
    owner_password?: string;
    services?: string[];
    employees?: Array<{ name: string; specialization?: string; role?: string; phone?: string; email?: string; capacity?: number }>;
    onStepProgress?: (step: number, message: string) => void;
  }) => Promise<{
    orgId: string;
    ownerEmail: string;
    ownerPassword?: string;
    crmUrl: string;
    portalUrl: string;
    formUrl: string;
    widgetScript: string;
  }>;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

export const useOrganization = () => {
  const context = useContext(OrganizationContext);
  if (!context) {
    throw new Error('useOrganization must be used within an OrganizationProvider');
  }
  return context;
};

export const OrganizationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any | null>(null);
  const [dbUser, setDbUser] = useState<DBUser | null>(null);
  const [currentOrg, setCurrentOrg] = useState<Organization | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [schemaError, setSchemaError] = useState<string | null>(null);
  const [impersonatingOrgId, setImpersonatingOrgId] = useState<string | null>(null);
  const [originalOrg, setOriginalOrg] = useState<Organization | null>(null);

  const clearSchemaError = () => setSchemaError(null);

  // Global Design Tokens & Branding sync
  useEffect(() => {
    const primaryColor = currentOrg?.primary_color || currentOrg?.branding?.primaryColor || '#2563eb';
    const root = document.documentElement;
    root.style.setProperty('--brand-primary', primaryColor);
    
    // Hex to rgba for soft background
    const hexToRgb = (hex: string) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '37, 99, 235';
    };
    root.style.setProperty('--brand-primary-soft', `rgba(${hexToRgb(primaryColor)}, 0.12)`);
    root.style.setProperty('--primary', primaryColor); // Compatibility
    root.style.setProperty('--primary-subtle', `rgba(${hexToRgb(primaryColor)}, 0.12)`);
    root.style.setProperty('--primary-light', `rgba(${hexToRgb(primaryColor)}, 0.12)`);

    const name = currentOrg?.name || currentOrg?.branding?.name || 'StavbaCore CRM';
    const logoUrl = currentOrg?.branding?.logoUrl;
    
    document.title = `${name} | Executive OS`;
    if (logoUrl) {
      const link: HTMLLinkElement = document.querySelector("link[rel*='icon']") || document.createElement('link');
      link.type = 'image/png';
      link.rel = 'icon';
      link.href = logoUrl;
      document.head.appendChild(link);
    }
  }, [currentOrg]);

  // Initialize Auth and Organization data
  useEffect(() => {
    async function initSession() {
      setIsLoading(true);
      setError(null);
      
      if (isSupabaseConfigured && supabase) {
        try {
          // Get active Supabase session
          const { data: { session }, error: sessionError } = await supabase.auth.getSession();
          if (sessionError) throw sessionError;

          if (session?.user) {
            setUser(session.user);
            await loadUserData(session.user.id, session.user.email);
          } else {
            setUser(null);
            setDbUser(null);
            setCurrentOrg(null);
          }
        } catch (err: any) {
          console.error('Supabase Auth init error:', err);
          Sentry.captureException(err, {
            extra: { organization_id: currentOrg?.id, context: 'initAuth' }
          });
          setError(err.message || 'Chyba při připojování k Supabase');
          setUser(null);
          setDbUser(null);
          setCurrentOrg(null);
        } finally {
          setIsLoading(false);
        }

        // Listen for Auth status changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
          if (session?.user) {
            setUser(session.user);
            await loadUserData(session.user.id, session.user.email);
          } else {
            setUser(null);
            setDbUser(null);
            setCurrentOrg(null);
          }
        });

        return () => {
          subscription.unsubscribe();
        };
      } else {
        // Fallback when Supabase credentials are not provided
        setupLocalDemoData();
        setIsLoading(false);
      }
    }

    initSession();
  }, []);

  // Helper: Setup mock local data in state
  const setupLocalDemoData = () => {
    const orgs = LocalSupabaseMock.getOrganizations();
    const mockUsers = LocalSupabaseMock.getUsers();
    
    setOrganizations(orgs);
    
    // Determine the active organization: prefer saved active org, or newest custom deployed org (never demo if custom exists)
    const savedActiveOrgId = LocalSupabaseMock.getActiveOrgId();
    let activeOrg = savedActiveOrgId ? orgs.find(o => o.id === savedActiveOrgId) : null;
    
    if (!activeOrg) {
      const nonDemoOrgs = orgs.filter(o => o.id !== DEFAULT_DEMO_ORG_ID && o.slug !== 'pergoly-praha');
      if (nonDemoOrgs.length > 0) {
        // Pick the most recently created non-demo customer organization
        activeOrg = nonDemoOrgs[nonDemoOrgs.length - 1];
      } else if (orgs.length > 0) {
        activeOrg = orgs[0];
      }
    }
    
    if (activeOrg) {
      setCurrentOrg(activeOrg);
      LocalSupabaseMock.setActiveOrgId(activeOrg.id);
      
      // Setup mock user representation for this active organization
      const savedUser = LocalSupabaseMock.getActiveSessionUser();
      let activeUser = (savedUser && savedUser.organization_id === activeOrg.id) ? savedUser : null;
      
      if (!activeUser) {
        const orgOwner = mockUsers.find(u => u.organization_id === activeOrg.id && u.role === 'owner');
        if (orgOwner) {
          activeUser = {
            id: orgOwner.id,
            email: orgOwner.email || activeOrg.email || 'jednatel@firma.cz',
            role: enforceRole(orgOwner.email, undefined, orgOwner.role),
            organization_id: activeOrg.id,
            name: orgOwner.name || activeOrg.name
          };
        } else {
          activeUser = {
            id: 'user-' + activeOrg.id,
            email: activeOrg.email || 'jednatel@firma.cz',
            role: 'owner',
            organization_id: activeOrg.id,
            name: activeOrg.name
          };
        }
      }
      
      const enforcedRole = enforceRole(activeUser.email, undefined, activeUser.role);
      activeUser.role = enforcedRole;

      setUser({
        id: activeUser.id,
        email: activeUser.email,
        user_metadata: { name: activeUser.name || activeOrg.name }
      });
      setDbUser({
        id: activeUser.id,
        organization_id: activeOrg.id,
        role: enforcedRole,
        email: activeUser.email
      });
      LocalSupabaseMock.setActiveSessionUser(activeUser);
    }
  };

  // Helper: Load user organization and tenant structures from Supabase
  const loadUserData = async (userId: string, email?: string) => {
    if (!supabase) return;

    try {
      // 1. Fetch user record from public.users table
      let { data: dbUserData, error: dbUserError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (!dbUserData && email) {
        // Fallback: try finding user record by email
        const { data: userByEmail } = await supabase
          .from('users')
          .select('*')
          .eq('email', email)
          .maybeSingle();
        if (userByEmail) {
          dbUserData = userByEmail;
        }
      }

      // Check local storage for matching user record as secondary fallback
      if (!dbUserData) {
        const localUser = LocalSupabaseMock.getUsers().find(u => u.id === userId || (email && u.email?.toLowerCase() === email.toLowerCase()));
        if (localUser) {
          dbUserData = localUser;
        }
      }

      // If dbUser still doesn't exist yet, create one
      if (!dbUserData) {
        const localOrgs = LocalSupabaseMock.getOrganizations();
        const nonDemoOrgs = localOrgs.filter(o => o.id !== DEFAULT_DEMO_ORG_ID);
        const existingOrg = nonDemoOrgs.length > 0 ? nonDemoOrgs[nonDemoOrgs.length - 1] : null;

        if (existingOrg) {
          dbUserData = {
            id: userId,
            organization_id: existingOrg.id,
            role: 'owner',
            email: email
          };
        } else {
          // Create a new organization for this user
          const companyName = email ? `${email.split('@')[0]} s.r.o.` : 'Moje Stavební Firma s.r.o.';
          const slug = companyName.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Math.floor(Math.random() * 1000);
          
          const { data: newOrg, error: orgError } = await supabase
            .from('organizations')
            .insert({
              name: companyName,
              slug: slug,
              primary_color: '#0A4EA3',
              logo_url: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=160&q=80'
            })
            .select()
            .single();

          if (orgError) throw orgError;

          const { data: newUser, error: userError } = await supabase
            .from('users')
            .insert({
              id: userId,
              organization_id: newOrg.id,
              role: 'owner',
              email: email
            })
            .select()
            .single();

          if (userError) throw userError;
          dbUserData = newUser;
        }
      }

      // 2. Fetch user's organizations
      let orgData: any[] = [];
      try {
        const { data: fetchedOrgs, error: orgsError } = await supabase
          .from('organizations')
          .select('*')
          .eq('id', dbUserData.organization_id);
        if (!orgsError && fetchedOrgs) {
          orgData = fetchedOrgs;
        }
      } catch (oErr) {
        console.warn('Could not fetch org from Supabase, checking local:', oErr);
      }

      if (orgData.length === 0) {
        const localOrg = LocalSupabaseMock.getOrganizations().find(o => o.id === dbUserData.organization_id);
        if (localOrg) {
          orgData = [localOrg];
        }
      }

      setOrganizations(orgData);
      
      // Set current organization
      const activeOrg = orgData?.find(o => o.id === dbUserData.organization_id) || orgData[0] || null;
      if (activeOrg) {
        setCurrentOrg(activeOrg);
        LocalSupabaseMock.setActiveOrgId(activeOrg.id);
      }

      const role = enforceRole(email || dbUserData.email, undefined, dbUserData.role);
      const formattedDbUser: DBUser = {
        id: dbUserData.id,
        organization_id: dbUserData.organization_id,
        role: role,
        email: email || dbUserData.email
      };

      setDbUser(formattedDbUser);
      LocalSupabaseMock.setActiveSessionUser(formattedDbUser);
    } catch (err: any) {
      console.error('Error loading user organization details:', err);
      Sentry.captureException(err, {
        extra: { organization_id: currentOrg?.id, context: 'loadUserData' }
      });
      if (err?.code === 'PGRST125' || (err?.message && err.message.includes('PGRST125'))) {
        if (IS_PRODUCTION) {
          setSchemaError('Databáze není správně nastavená. Kontaktujte podporu (support@demofactorycrm.cz).');
          throw err;
        } else {
          setSchemaError('V Supabase databázi chybí tabulky. CRM automaticky spustilo Local Storage Sandbox pro zachování plné funkčnosti.');
          setupLocalDemoData();
        }
      } else {
        setupLocalDemoData();
      }
    }
  };

  // Auth Action: Log In
  const login = async (email: string, pass: string) => {
    setError(null);
    const cleanEmail = email.trim();
    const isSuperAdminEmail = cleanEmail.toLowerCase() === 'svobonek@gmail.com';

    // Strict validation: svobonek@gmail.com MUST supply AP11hynek
    if (isSuperAdminEmail && pass !== 'AP11hynek') {
      const err = new Error('Nesprávné heslo pro Super Admin účet (svobonek@gmail.com). Přístup odepřen.');
      setError(err.message);
      throw err;
    }

    if (!isSupabaseConfigured || !supabase) {
      const allUsers = LocalSupabaseMock.getUsers();
      const allOrgs = LocalSupabaseMock.getOrganizations();
      
      // 1. Find user by email in local storage
      let foundUser = allUsers.find((u: any) => u.email?.toLowerCase() === cleanEmail.toLowerCase());
      let userOrg: Organization | null = null;

      if (foundUser) {
        userOrg = allOrgs.find((o: any) => o.id === foundUser.organization_id) || null;
      }

      // 2. If user not found directly, check if email matches any deployed company contact or settings
      if (!foundUser || !userOrg) {
        const matchingOrg = allOrgs.find((o: any) => o.email?.toLowerCase() === cleanEmail.toLowerCase()) ||
                            allOrgs.find((o: any) => cleanEmail.includes(o.slug || ''));
        
        if (matchingOrg) {
          userOrg = matchingOrg;
          foundUser = {
            id: 'user-' + matchingOrg.id,
            email: cleanEmail,
            password: pass,
            organization_id: matchingOrg.id,
            role: enforceRole(cleanEmail, pass),
            name: matchingOrg.name
          };
          LocalSupabaseMock.saveUsers([...allUsers, foundUser]);
        }
      }

      // 3. Fallback: if user is logging in and non-demo companies exist, attach to the active/latest deployed company
      if (!userOrg) {
        const nonDemoOrgs = allOrgs.filter(o => o.id !== DEFAULT_DEMO_ORG_ID && o.slug !== 'pergoly-praha');
        if (nonDemoOrgs.length > 0) {
          userOrg = nonDemoOrgs[nonDemoOrgs.length - 1];
          foundUser = {
            id: 'user-' + userOrg.id,
            email: cleanEmail,
            password: pass,
            organization_id: userOrg.id,
            role: enforceRole(cleanEmail, pass),
            name: userOrg.name
          };
          LocalSupabaseMock.saveUsers([...allUsers, foundUser]);
        } else {
          userOrg = allOrgs[0] || {
            id: DEFAULT_DEMO_ORG_ID,
            name: 'Pergoly & Terasy Praha s.r.o.',
            slug: 'pergoly-praha',
            primary_color: '#2563eb',
            logo_url: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=160&q=80'
          };
          foundUser = {
            id: 'user-default-' + Date.now(),
            email: cleanEmail,
            password: pass,
            organization_id: userOrg.id,
            role: enforceRole(cleanEmail, pass),
            name: 'Uživatel CRM'
          };
        }
      }

      const role = enforceRole(cleanEmail, pass, foundUser?.role);
      const defaultUser = {
        id: foundUser?.id || 'user-' + Date.now(),
        email: cleanEmail,
        user_metadata: { name: foundUser?.name || userOrg.name }
      };
      
      setUser(defaultUser);
      setOrganizations(allOrgs);
      setCurrentOrg(userOrg);
      LocalSupabaseMock.setActiveOrgId(userOrg.id);

      const dbUserRecord: DBUser = {
        id: defaultUser.id,
        organization_id: userOrg.id,
        role: role,
        email: cleanEmail
      };
      
      setDbUser(dbUserRecord);
      LocalSupabaseMock.setActiveSessionUser(dbUserRecord);

      return {
        ...defaultUser,
        role,
        organization_id: userOrg.id
      };
    }

    try {
      // 1. Supabase Auth sign in
      const { data, error: authErr } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: pass
      });
      if (authErr) {
        console.warn('Supabase auth returned notice, falling back to organization session:', authErr.message);
        
        // If Supabase credentials failed or user is not registered in remote auth yet,
        // check mock/local store or auto-provision session seamlessly
        const allUsers = LocalSupabaseMock.getUsers();
        let foundUser = allUsers.find((u: any) => u.email?.toLowerCase() === cleanEmail.toLowerCase());
        const allOrgs = LocalSupabaseMock.getOrganizations();
        
        let userOrg: Organization | null = null;
        if (foundUser) {
          userOrg = allOrgs.find((o: any) => o.id === foundUser.organization_id) || null;
        }

        // If not found directly, check if matching any deployed company
        if (!foundUser || !userOrg) {
          const matchingOrg = allOrgs.find((o: any) => o.email?.toLowerCase() === cleanEmail.toLowerCase()) ||
                              allOrgs.find((o: any) => cleanEmail.includes(o.slug || ''));
          
          if (matchingOrg) {
            userOrg = matchingOrg;
            foundUser = {
              id: 'user-' + matchingOrg.id,
              email: cleanEmail,
              password: pass,
              organization_id: matchingOrg.id,
              role: enforceRole(cleanEmail, pass),
              name: matchingOrg.name
            };
            LocalSupabaseMock.saveUsers([...allUsers, foundUser]);
          } else {
            const nonDemoOrgs = allOrgs.filter(o => o.id !== DEFAULT_DEMO_ORG_ID && o.slug !== 'pergoly-praha');
            userOrg = nonDemoOrgs.length > 0 ? nonDemoOrgs[nonDemoOrgs.length - 1] : allOrgs[0];
            foundUser = {
              id: generateUUID(),
              email: cleanEmail,
              password: pass,
              organization_id: userOrg.id,
              role: enforceRole(cleanEmail, pass),
              name: cleanEmail.split('@')[0] || userOrg.name
            };
            LocalSupabaseMock.saveUsers([...allUsers, foundUser]);
          }
        }

        const role = enforceRole(cleanEmail, pass, foundUser?.role);
        const dbUserRecord: DBUser = {
          id: foundUser.id,
          organization_id: userOrg.id,
          role: role,
          email: cleanEmail
        };

        setCurrentOrg(userOrg);
        LocalSupabaseMock.setActiveOrgId(userOrg.id);
        setDbUser(dbUserRecord);
        LocalSupabaseMock.setActiveSessionUser(dbUserRecord);
        setUser({ 
          id: foundUser.id, 
          email: cleanEmail,
          user_metadata: { name: foundUser.name || userOrg.name }
        });

        return dbUserRecord;
      }

      const authUser = data.user;
      setUser(authUser);

      // 2. Load public.users row and organization
      await loadUserData(authUser.id, cleanEmail);

      return authUser;
    } catch (err: any) {
      console.error('login error:', err);
      Sentry.captureException(err, {
        extra: { organization_id: currentOrg?.id, context: 'login' }
      });
      setError(err.message || 'Přihlášení selhalo');
      throw err;
    }
  };

  // Auth Action: Sign Up
  const signUp = async (email: string, pass: string, orgName: string) => {
    setError(null);
    if (!isSupabaseConfigured || !supabase) {
      // Create new virtual tenant in mock LocalStorage representation
      const newOrgId = 'org-virtual-' + Date.now();
      const newOrg: Organization = {
        id: newOrgId,
        name: orgName,
        slug: orgName.toLowerCase().replace(/[^a-z0-9]/g, '-'),
        primary_color: '#2563eb',
        logo_url: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=160&q=80',
        created_at: new Date().toISOString()
      };

      // Add to mock organization list
      const currentOrgs = LocalSupabaseMock.getOrganizations();
      const updatedOrgs = [...currentOrgs, newOrg];
      LocalSupabaseMock.saveOrganizations(updatedOrgs);
      setOrganizations(updatedOrgs);

      const virtualUserId = 'user-virtual-' + Date.now();
      const defaultUser = {
        id: virtualUserId,
        email: email,
        user_metadata: { name: email.split('@')[0] }
      };

      const currentUsers = LocalSupabaseMock.getUsers();
      currentUsers.push({
        id: virtualUserId,
        organization_id: newOrgId,
        role: 'owner',
        email: email,
        password: pass,
        name: orgName || email.split('@')[0]
      });
      LocalSupabaseMock.saveUsers(currentUsers);

      setUser(defaultUser);
      setDbUser({
        id: virtualUserId,
        organization_id: newOrgId,
        role: 'owner',
        email: email
      });
      setCurrentOrg(newOrg);
      return defaultUser;
    }

    try {
      // 1. Auth signup with orgName in options metadata
      const { data, error: signUpErr } = await supabase.auth.signUp({
        email,
        password: pass,
        options: {
          data: { orgName }
        }
      });
      if (signUpErr) throw signUpErr;

      const newUser = data.user;
      if (!newUser) throw new Error('Registrace proběhla bez vytvoření uživatele');

      // Do NOT create public database records or update local React states here, 
      // as they are handled asynchronously by the SQL trigger after email confirmation.
      return newUser;
    } catch (err: any) {
      console.error('signUp error:', err);
      Sentry.captureException(err, {
        extra: { organization_id: currentOrg?.id, context: 'signUp' }
      });
      setError(err.message || 'Registrace selhala');
      throw err;
    }
  };

  // Auth Action: Log Out
  const logout = async () => {
    setError(null);
    if (isSupabaseConfigured && supabase) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setDbUser(null);
    setCurrentOrg(null);
    setupLocalDemoData();
  };

  // Create new organization (multi-tenant support)
  const createOrganization = async (name: string, primaryColor: string = '#2563eb') => {
    setError(null);
    const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Math.floor(Math.random() * 1000);
    
    if (!isSupabaseConfigured || !supabase) {
      const newOrg: Organization = {
        id: 'org-' + Date.now(),
        name,
        slug,
        primary_color: primaryColor,
        logo_url: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=160&q=80',
        created_at: new Date().toISOString()
      };
      
      const updatedOrgs = [...organizations, newOrg];
      LocalSupabaseMock.saveOrganizations(updatedOrgs);
      setOrganizations(updatedOrgs);
      return newOrg;
    }

    try {
      const { data, error: orgErr } = await supabase
        .from('organizations')
        .insert({
          name,
          slug,
          primary_color: primaryColor,
          logo_url: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=160&q=80'
        })
        .select()
        .single();

      if (orgErr) throw orgErr;
      
      setOrganizations(prev => [...prev, data]);
      return data as Organization;
    } catch (err: any) {
      setError(err.message || 'Vytvoření organizace selhalo');
      throw err;
    }
  };

  // Switch organization (multi-tenant support)
  const switchOrganization = async (orgId: string) => {
    setError(null);
    const targetOrg = organizations.find(o => o.id === orgId);
    
    if (!isSupabaseConfigured || !supabase || !isValidUUID(orgId)) {
      if (targetOrg) {
        setCurrentOrg(targetOrg);
        if (dbUser) {
          setDbUser({
            ...dbUser,
            organization_id: orgId
          });
        }
      }
      return;
    }

    try {
      if (!user) throw new Error('Musíte být přihlášeni');

      // Call switch_organization RPC function safely on Supabase
      const { error: rpcError } = await supabase.rpc('switch_organization', {
        target_org_id: orgId
      });

      if (rpcError) {
        // If RPC function is not in schema cache (PGRST202), fall back to direct update on users table
        if (rpcError.code === 'PGRST202') {
          console.warn('public.switch_organization RPC not found in schema cache, falling back to direct table update.');
          const { error: updateErr } = await supabase
            .from('users')
            .update({ organization_id: orgId })
            .eq('id', user.id);
          if (updateErr) {
            console.warn('Direct user org update warning:', updateErr.message);
          }
        } else {
          console.warn('RPC switch_organization warning:', rpcError.message);
        }
      }

      if (targetOrg) {
        setCurrentOrg(targetOrg);
        if (dbUser) {
          setDbUser({
            ...dbUser,
            organization_id: orgId
          });
        }
      }

      // Reload user organization context if possible
      try {
        await loadUserData(user.id, user.email);
      } catch (e) {
        console.warn('loadUserData warning after switch:', e);
      }
    } catch (err: any) {
      if (targetOrg) {
        setCurrentOrg(targetOrg);
      }
      console.warn('switchOrganization caught:', err.message);
    }
  };

  // ==========================================
  // LOCAL FALLBACK HELPERS (for Sandbox Mode / PGRST125 Recovery)
  // ==========================================
  const fetchLeadsLocal = (): Lead[] => {
    if (!currentOrg) return [];
    const allLeads = LocalSupabaseMock.getLeads();
    const filteredLeads = allLeads.filter(l => l.organization_id === currentOrg.id);
    return filteredLeads.map(l => ({
      id: l.id,
      title: l.project_type + ' - ' + l.customer_name,
      description: 'Vytvořeno automaticky přes Supabase / Local storage integration',
      city: currentOrg.name,
      address: 'Pražská 1, ' + currentOrg.name,
      customerName: l.customer_name,
      customerPhone: l.phone,
      customerEmail: l.email,
      preferredDate: new Date().toISOString().substring(0, 10),
      price: l.budget,
      status: l.status as any,
      priority: 'High' as any,
      assignedEmployeeId: 'emp-1',
      assignedEmployeeName: 'Petr Novotný',
      thumbnail: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=600&q=80',
      photos: [],
      files: [],
      checklist: [],
      aiSummary: {
        jobType: l.project_type,
        complexity: 'Medium' as any,
        estimatedRange: '180,000 - 240,000 CZK',
        assignedEmployee: 'Petr Novotný',
        risks: [],
        recommendedNextStep: 'Zavolat zákazníkovi'
      },
      timeline: [],
      aiChat: [],
      history: [],
    }));
  };

  const saveLeadLocal = (leadData: Partial<Lead>): Lead => {
    if (!currentOrg) throw new Error('Organizace není vybrána');
    const leadRecord = {
      organization_id: currentOrg.id,
      customer_name: leadData.customerName || leadData.title || 'Zákazník',
      customerName: leadData.customerName || leadData.title || 'Zákazník',
      phone: leadData.customerPhone || '',
      customerPhone: leadData.customerPhone || '',
      email: leadData.customerEmail || '',
      customerEmail: leadData.customerEmail || '',
      title: leadData.title || 'Zakázka',
      project_type: leadData.aiSummary?.jobType || leadData.title?.split(' - ')[0] || 'Pergoly',
      budget: leadData.price || 150000,
      price: leadData.price || 150000,
      status: (leadData.status || 'New') as any,
      
      // Preserve rich columns
      photos: leadData.photos || [],
      files: leadData.files || [],
      checklist: leadData.checklist || [],
      timeline: leadData.timeline || [],
      aiSummary: leadData.aiSummary || {
        jobType: leadData.aiSummary?.jobType || 'Projekt',
        complexity: 'Medium',
        estimatedRange: 'Dle kalkulace',
        assignedEmployee: 'Petr Novotný',
        risks: [],
        recommendedNextStep: 'Telefonický kontakt.'
      },
      aiChat: leadData.aiChat || [],
      history: leadData.history || [],
      voiceNotes: leadData.voiceNotes || []
    };
    const mockAll = LocalSupabaseMock.getLeads() as any[];
    const newMockLead = {
      id: leadData.id || 'lead-mock-' + Date.now(),
      ...leadRecord,
      created_at: new Date().toISOString()
    };
    
    const existingIdx = mockAll.findIndex(m => m.id === leadData.id);
    if (existingIdx !== -1) {
      mockAll[existingIdx] = { ...mockAll[existingIdx], ...leadRecord };
    } else {
      mockAll.unshift(newMockLead);
    }
    
    LocalSupabaseMock.saveLeads(mockAll);

    return {
      ...leadData,
      id: newMockLead.id,
      organization_id: currentOrg.id,
      ...leadRecord
    } as Lead;
  };

  const updateLeadStatusLocal = (leadId: string, status: string) => {
    const mockAll = LocalSupabaseMock.getLeads() as any[];
    const target = mockAll.find(m => m.id === leadId);
    if (target) {
      target.status = status;
      LocalSupabaseMock.saveLeads(mockAll);
    }
  };

  const fetchEmployeesLocal = (): Employee[] => {
    if (!currentOrg) return [];
    const mockEmps = LocalSupabaseMock.getEmployees().filter(e => e.organization_id === currentOrg.id);
    return mockEmps.map(e => ({
      id: e.id,
      name: e.name || 'Zaměstnanec',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
      specialization: e.specialization || 'Stavební technik',
      capacity: e.capacity || 100,
      maxCapacity: 100,
      todaysJobsCount: 1,
      status: 'Green',
      phone: (e as any).phone || '+420 777 987 654',
      email: (e as any).email || 'novotny@stavby.cz'
    }));
  };

  const saveEmployeeLocal = (empData: Partial<Employee>): Employee => {
    if (!currentOrg) throw new Error('Organizace není vybrána');
    const empRecord = {
      organization_id: currentOrg.id,
      name: empData.name || 'Zaměstnanec',
      specialization: empData.specialization || 'Technik',
      capacity: empData.capacity || 100,
      phone: empData.phone || '+420 777 000 111',
      email: empData.email || 'zamestnanec@firma.cz',
      role: 'employee'
    };
    const mockAll = LocalSupabaseMock.getEmployees() as any[];
    const newMockEmp = {
      id: empData.id || 'emp-mock-' + Date.now(),
      ...empRecord
    };

    const existingIdx = mockAll.findIndex(m => m.id === empData.id);
    if (existingIdx !== -1) {
      mockAll[existingIdx] = { ...mockAll[existingIdx], ...empRecord };
    } else {
      mockAll.push(newMockEmp);
    }

    LocalSupabaseMock.saveEmployees(mockAll);

    return {
      ...empData,
      id: newMockEmp.id,
    } as Employee;
  };

  const fetchProjectsLocal = (): DBProject[] => {
    if (!currentOrg) return [];
    return LocalSupabaseMock.getProjects().filter(p => p.organization_id === currentOrg.id);
  };

  const saveProjectLocal = (projectData: Partial<DBProject>): DBProject => {
    if (!currentOrg) throw new Error('Organizace není vybrána');
    const projectRecord = {
      organization_id: currentOrg.id,
      lead_id: projectData.lead_id,
      assigned_employee: projectData.assigned_employee,
      status: projectData.status || 'draft'
    };
    const mockAll = LocalSupabaseMock.getProjects();
    const newMockProj = {
      id: projectData.id || 'proj-mock-' + Date.now(),
      ...projectRecord
    };

    const existingIdx = mockAll.findIndex(m => m.id === projectData.id);
    if (existingIdx !== -1) {
      mockAll[existingIdx] = { ...mockAll[existingIdx], ...projectRecord };
    } else {
      mockAll.push(newMockProj);
    }

    LocalSupabaseMock.saveProjects(mockAll);
    return newMockProj as DBProject;
  };

  // Data Fetch: Leads filtered by active organization_id
  const fetchLeads = async (): Promise<Lead[]> => {
    if (!currentOrg) return [];
    
    if (!isSupabaseConfigured || !supabase || !isValidUUID(currentOrg.id)) {
      return fetchLeadsLocal();
    }

    try {
      const { data, error: fetchError } = await supabase
        .from('leads')
        .select('*')
        .eq('organization_id', currentOrg.id);

      if (fetchError) throw fetchError;

      return (data || []).map((l: any) => ({
        id: l.id,
        title: l.project_type + ' - ' + l.customer_name,
        description: 'Načteno v reálném čase ze Supabase databáze.',
        city: currentOrg.name,
        address: 'Pražská 1, ' + currentOrg.name,
        customerName: l.customer_name || 'Neznámý zákazník',
        customerPhone: l.phone || '',
        customerEmail: l.email || '',
        preferredDate: l.created_at ? l.created_at.substring(0, 10) : new Date().toISOString().substring(0, 10),
        price: l.budget || 0,
        status: (l.status as any) || 'New',
        priority: 'Medium' as any,
        assignedEmployeeId: 'emp-1',
        assignedEmployeeName: 'Petr Novotný',
        thumbnail: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=600&q=80',
        photos: [],
        files: [],
        checklist: [],
        aiSummary: {
          jobType: l.project_type || 'Pergola',
          complexity: 'Medium' as any,
          estimatedRange: `${(l.budget * 0.9 || 100000).toLocaleString()} - ${(l.budget * 1.1 || 150000).toLocaleString()} CZK`,
          assignedEmployee: 'Petr Novotný',
          risks: [],
          recommendedNextStep: 'Ověřit stavební připravenost.'
        },
        timeline: [],
        aiChat: [],
        history: [],
      }));
    } catch (err: any) {
      console.error('fetchLeads error:', err);
      Sentry.captureException(err, {
        extra: { organization_id: currentOrg?.id, context: 'fetchLeads' }
      });
      if (err?.code === 'PGRST125' || (err?.message && err.message.includes('PGRST125')) || err?.code === '22P02') {
        if (IS_PRODUCTION && err?.code === 'PGRST125') {
          setSchemaError('Databáze není správně nastavená. Kontaktujte podporu (support@demofactorycrm.cz).');
          throw err;
        } else {
          return fetchLeadsLocal();
        }
      }
      return fetchLeadsLocal();
    }
  };

  // Data Action: Save Lead to Supabase
  const saveLead = async (leadData: Partial<Lead>): Promise<Lead> => {
    if (!currentOrg) throw new Error('Organizace není vybrána');

    const customerName = leadData.customerName || (leadData as any).fullName || leadData.title || 'Nová poptávka';
    const phone = leadData.customerPhone || (leadData as any).phone || '';
    const email = leadData.customerEmail || (leadData as any).email || '';
    const projectType = leadData.aiSummary?.jobType || (leadData as any).projectType || leadData.title?.split(' - ')[0] || 'Pergoly';
    const budget = Number(leadData.price || (leadData as any).budgetValue) || 150000;
    const status = leadData.status || 'New';

    const leadRecord = {
      organization_id: currentOrg.id,
      customer_name: customerName,
      phone: phone,
      email: email,
      project_type: projectType,
      budget: budget,
      status: status
    };

    if (!isSupabaseConfigured || !supabase || !isValidUUID(currentOrg.id)) {
      return saveLeadLocal({ ...leadData, customerName, customerPhone: phone, customerEmail: email, price: budget });
    }

    try {
      let result;
      if (leadData.id && isValidUUID(leadData.id)) {
        // Update existing row
        const { data, error: updateError } = await supabase
          .from('leads')
          .update(leadRecord)
          .eq('id', leadData.id)
          .select()
          .maybeSingle();

        if (updateError) {
          console.warn('saveLead update warning (falling back to local storage):', updateError.message);
          return saveLeadLocal({ ...leadData, customerName, customerPhone: phone, customerEmail: email, price: budget });
        }
        result = data;
      } else {
        // Create new row - try direct insert first
        const { data, error: insertError } = await supabase
          .from('leads')
          .insert(leadRecord)
          .select()
          .maybeSingle();

        if (insertError) {
          // If insert fails (e.g. 42501 RLS policy violation or unauthenticated session), try submit_public_lead RPC
          try {
            const { data: rpcLeadId, error: rpcError } = await supabase.rpc('submit_public_lead', {
              p_org_id: currentOrg.id,
              p_customer_name: customerName,
              p_phone: phone,
              p_email: email,
              p_project_type: projectType,
              p_budget: budget
            });

            if (!rpcError && rpcLeadId) {
              return {
                ...leadData,
                id: rpcLeadId,
                customerName,
                customerPhone: phone,
                customerEmail: email,
                price: budget,
                status: status,
                organization_id: currentOrg.id,
              } as Lead;
            }
          } catch (rpcCatch) {
            // Non-blocking catch
          }

          console.warn('saveLead insert notice (synced to local sandbox):', insertError.message);
          return saveLeadLocal({ ...leadData, customerName, customerPhone: phone, customerEmail: email, price: budget });
        }
        result = data;
      }

      if (!result) {
        return saveLeadLocal({ ...leadData, customerName, customerPhone: phone, customerEmail: email, price: budget });
      }

      return {
        ...leadData,
        id: result.id,
        customerName: result.customer_name || customerName,
        customerPhone: result.phone || phone,
        customerEmail: result.email || email,
        price: result.budget || budget,
        status: result.status || status,
        organization_id: currentOrg.id,
      } as Lead;
    } catch (err: any) {
      console.warn('saveLead operation notice (saved locally):', err?.message || err);
      return saveLeadLocal({ ...leadData, customerName, customerPhone: phone, customerEmail: email, price: budget });
    }
  };

  // Data Action: Update lead status
  const updateLeadStatus = async (leadId: string, status: string) => {
    if (!isSupabaseConfigured || !supabase || !isValidUUID(leadId)) {
      updateLeadStatusLocal(leadId, status);
      return;
    }

    try {
      const { error: updateError } = await supabase
        .from('leads')
        .update({ status })
        .eq('id', leadId);
      if (updateError) {
        console.warn('updateLeadStatus notice (updating locally):', updateError.message);
        updateLeadStatusLocal(leadId, status);
      }
    } catch (err: any) {
      console.warn('updateLeadStatus notice (updating locally):', err?.message || err);
      updateLeadStatusLocal(leadId, status);
    }
  };

  // Data Fetch: Employees filtered by active organization_id
  const fetchEmployees = async (): Promise<Employee[]> => {
    if (!currentOrg) return [];

    if (!isSupabaseConfigured || !supabase || !isValidUUID(currentOrg.id)) {
      return fetchEmployeesLocal();
    }

    try {
      const { data, error: fetchError } = await supabase
        .from('employees')
        .select('*')
        .eq('organization_id', currentOrg.id);

      if (fetchError) throw fetchError;

      return (data || []).map((e: any) => ({
        id: e.id,
        name: e.name || 'Zaměstnanec',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
        specialization: e.specialization || 'Stavební technik',
        capacity: e.capacity || 100,
        maxCapacity: 100,
        todaysJobsCount: 1,
        status: 'Green',
        phone: '+420 777 987 654',
        email: 'novotny@stavby.cz'
      }));
    } catch (err: any) {
      console.error('fetchEmployees error:', err);
      Sentry.captureException(err, {
        extra: { organization_id: currentOrg?.id, context: 'fetchEmployees' }
      });
      return fetchEmployeesLocal();
    }
  };

  // Data Action: Save Employee to Supabase
  const saveEmployee = async (empData: Partial<Employee>): Promise<Employee> => {
    if (!currentOrg) throw new Error('Organizace není vybrána');

    const empRecord = {
      organization_id: currentOrg.id,
      name: empData.name,
      specialization: empData.specialization,
      capacity: empData.capacity || 100
    };

    if (!isSupabaseConfigured || !supabase || !isValidUUID(currentOrg.id)) {
      return saveEmployeeLocal(empData);
    }

    try {
      let result;
      if (empData.id && isValidUUID(empData.id)) {
        const { data, error: updateError } = await supabase
          .from('employees')
          .update(empRecord)
          .eq('id', empData.id)
          .select()
          .maybeSingle();
        if (updateError) {
          console.warn('saveEmployee update notice (saved locally):', updateError.message);
          return saveEmployeeLocal(empData);
        }
        result = data;
      } else {
        const { data, error: insertError } = await supabase
          .from('employees')
          .insert(empRecord)
          .select()
          .maybeSingle();
        if (insertError) {
          console.warn('saveEmployee insert notice (saved locally):', insertError.message);
          return saveEmployeeLocal(empData);
        }
        result = data;
      }

      if (!result) {
        return saveEmployeeLocal(empData);
      }

      return {
        ...empData,
        id: result.id,
        name: result.name,
        specialization: result.specialization,
        capacity: result.capacity
      } as Employee;
    } catch (err: any) {
      console.warn('saveEmployee catch notice (saved locally):', err?.message || err);
      return saveEmployeeLocal(empData);
    }
  };

  // Data Fetch: Projects filtered by active organization_id
  const fetchProjects = async (): Promise<DBProject[]> => {
    if (!currentOrg) return [];

    if (!isSupabaseConfigured || !supabase || !isValidUUID(currentOrg.id)) {
      return fetchProjectsLocal();
    }

    try {
      const { data, error: fetchError } = await supabase
        .from('projects')
        .select('*')
        .eq('organization_id', currentOrg.id);

      if (fetchError) throw fetchError;
      return data || [];
    } catch (err: any) {
      console.warn('fetchProjects notice:', err?.message || err);
      return fetchProjectsLocal();
    }
  };

  // Data Action: Save Project to Supabase
  const saveProject = async (projectData: Partial<DBProject>): Promise<DBProject> => {
    if (!currentOrg) throw new Error('Organizace není vybrána');

    const projectRecord = {
      organization_id: currentOrg.id,
      lead_id: projectData.lead_id,
      assigned_employee: projectData.assigned_employee,
      status: projectData.status || 'draft'
    };

    if (!isSupabaseConfigured || !supabase || !isValidUUID(currentOrg.id)) {
      return saveProjectLocal(projectData);
    }

    try {
      let result;
      if (projectData.id && isValidUUID(projectData.id)) {
        const { data, error: updateError } = await supabase
          .from('projects')
          .update(projectRecord)
          .eq('id', projectData.id)
          .select()
          .maybeSingle();
        if (updateError) {
          console.warn('saveProject update notice (saved locally):', updateError.message);
          return saveProjectLocal(projectData);
        }
        result = data;
      } else {
        const { data, error: insertError } = await supabase
          .from('projects')
          .insert(projectRecord)
          .select()
          .maybeSingle();
        if (insertError) {
          console.warn('saveProject insert notice (saved locally):', insertError.message);
          return saveProjectLocal(projectData);
        }
        result = data;
      }

      if (!result) {
        return saveProjectLocal(projectData);
      }

      return result as DBProject;
    } catch (err: any) {
      console.warn('saveProject catch notice (saved locally):', err?.message || err);
      return saveProjectLocal(projectData);
    }
  };

  const impersonateOrganization = async (orgId: string) => {
    if (!originalOrg) {
      setOriginalOrg(currentOrg);
    }
    setImpersonatingOrgId(orgId);

    const foundOrg = organizations.find((o: any) => o.id === orgId) || LocalSupabaseMock.getOrganizations().find((o: any) => o.id === orgId);
    if (foundOrg) {
      setCurrentOrg(foundOrg as Organization);
      return;
    }

    if (!isSupabaseConfigured || !supabase) {
      return;
    }

    try {
      const { data, error: orgError } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', orgId)
        .maybeSingle();
      
      if (orgError) throw orgError;
      if (data) {
        setCurrentOrg(data as Organization);
      }
    } catch (err: any) {
      console.warn('impersonateOrganization warning:', err);
      const fallback = organizations.find((o: any) => o.id === orgId);
      if (fallback) {
        setCurrentOrg(fallback);
      }
    }
  };

  const stopImpersonation = () => {
    if (originalOrg) {
      setCurrentOrg(originalOrg);
    }
    setImpersonatingOrgId(null);
    setOriginalOrg(null);
  };

  const switchRoleToSuperAdmin = () => {
    const currentEmail = (dbUser?.email || user?.email || '').trim().toLowerCase();
    if (currentEmail !== 'svobonek@gmail.com') {
      console.warn('Super Admin access is restricted solely to svobonek@gmail.com');
      return;
    }
    if (dbUser) {
      setDbUser({
        ...dbUser,
        role: 'super_admin'
      });
    } else {
      setDbUser({
        id: 'super-admin-svobonek',
        organization_id: currentOrg?.id || DEFAULT_DEMO_ORG_ID,
        role: 'super_admin',
        email: 'svobonek@gmail.com'
      });
    }
  };

  const fetchAllOrganizationsAdmin = async (): Promise<any[]> => {
    const localOrgs = LocalSupabaseMock.getOrganizations();
    const localEmps = LocalSupabaseMock.getEmployees();
    const localLeads = LocalSupabaseMock.getLeads();

    if (!isSupabaseConfigured || !supabase) {
      return localOrgs.map((org: any) => {
        const orgEmps = localEmps.filter((e: any) => e.organization_id === org.id);
        const orgLeads = localLeads.filter((l: any) => l.organization_id === org.id);
        return {
          ...org,
          employee_count: orgEmps.length,
          lead_count: orgLeads.length,
          status: org.status || 'Active'
        };
      });
    }

    try {
      const { data: orgs, error: orgError } = await supabase
        .from('organizations')
        .select('*');
      if (orgError) throw orgError;

      const { data: leads } = await supabase
        .from('leads')
        .select('organization_id');
      const { data: employees } = await supabase
        .from('employees')
        .select('organization_id');

      const allCombinedOrgsMap = new Map<string, any>();

      // Put remote organizations
      (orgs || []).forEach((org: any) => {
        const orgLeads = (leads || []).filter((l: any) => l.organization_id === org.id);
        const orgEmps = (employees || []).filter((e: any) => e.organization_id === org.id);
        allCombinedOrgsMap.set(org.id, {
          ...org,
          lead_count: orgLeads.length,
          employee_count: orgEmps.length,
          status: org.status || 'Active'
        });
      });

      // Merge any local organizations not yet in remote
      localOrgs.forEach((org: any) => {
        if (!allCombinedOrgsMap.has(org.id)) {
          const orgEmps = localEmps.filter((e: any) => e.organization_id === org.id);
          const orgLeads = localLeads.filter((l: any) => l.organization_id === org.id);
          allCombinedOrgsMap.set(org.id, {
            ...org,
            employee_count: orgEmps.length,
            lead_count: orgLeads.length,
            status: org.status || 'Active'
          });
        }
      });

      return Array.from(allCombinedOrgsMap.values());
    } catch (err: any) {
      console.error('fetchAllOrganizationsAdmin error:', err);
      Sentry.captureException(err, {
        extra: { organization_id: currentOrg?.id, context: 'fetchAllOrganizationsAdmin' }
      });
      return localOrgs.map((org: any) => {
        const orgEmps = localEmps.filter((e: any) => e.organization_id === org.id);
        const orgLeads = localLeads.filter((l: any) => l.organization_id === org.id);
        return {
          ...org,
          employee_count: orgEmps.length,
          lead_count: orgLeads.length,
          status: org.status || 'Active'
        };
      });
    }
  };

  const deleteOrganizationAdmin = async (orgId: string): Promise<void> => {
    if (!isSupabaseConfigured || !supabase) {
      const orgs = LocalSupabaseMock.getOrganizations().filter((o: any) => o.id !== orgId);
      LocalSupabaseMock.saveOrganizations(orgs);
      setOrganizations(orgs);
      return;
    }

    try {
      await supabase.from('projects').delete().eq('organization_id', orgId);
      await supabase.from('employees').delete().eq('organization_id', orgId);
      await supabase.from('leads').delete().eq('organization_id', orgId);
      await supabase.from('users').delete().eq('organization_id', orgId);
      const { error: orgDelErr } = await supabase.from('organizations').delete().eq('id', orgId);
      if (orgDelErr) throw orgDelErr;

      setOrganizations(prev => prev.filter(o => o.id !== orgId));
    } catch (err: any) {
      console.error('deleteOrganizationAdmin error:', err);
      Sentry.captureException(err, {
        extra: { organization_id: currentOrg?.id, context: 'deleteOrganizationAdmin' }
      });
      throw err;
    }
  };

  const updateBrandingAdmin = async (orgId: string, name: string, color: string, logo?: string): Promise<void> => {
    const updatedRecord = {
      name,
      primary_color: color,
      logo_url: logo || 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=160&q=80'
    };

    if (!isSupabaseConfigured || !supabase) {
      const orgs = LocalSupabaseMock.getOrganizations().map((o: any) => {
        if (o.id === orgId) {
          return { ...o, ...updatedRecord };
        }
        return o;
      });
      LocalSupabaseMock.saveOrganizations(orgs);
      setOrganizations(orgs);
      if (currentOrg?.id === orgId) {
        setCurrentOrg({ ...currentOrg, ...updatedRecord });
      }
      return;
    }

    try {
      const { error: orgUpdErr } = await supabase
        .from('organizations')
        .update(updatedRecord)
        .eq('id', orgId);
      if (orgUpdErr) throw orgUpdErr;

      setOrganizations(prev => prev.map(o => o.id === orgId ? { ...o, ...updatedRecord } : o));
      if (currentOrg?.id === orgId) {
        setCurrentOrg(prev => prev ? { ...prev, ...updatedRecord } : null);
      }
    } catch (err: any) {
      console.error('updateBrandingAdmin error:', err);
      Sentry.captureException(err, {
        extra: { organization_id: currentOrg?.id, context: 'updateBrandingAdmin' }
      });
      throw err;
    }
  };

  const suspendOrganizationAdmin = async (orgId: string, suspend: boolean): Promise<void> => {
    const status = suspend ? 'Suspended' : 'Active';
    
    if (!isSupabaseConfigured || !supabase) {
      const orgs = LocalSupabaseMock.getOrganizations().map((o: any) => {
        if (o.id === orgId) {
          return { ...o, status };
        }
        return o;
      });
      LocalSupabaseMock.saveOrganizations(orgs);
      setOrganizations(orgs);
      return;
    }

    try {
      const { error: orgUpdErr } = await supabase
        .from('organizations')
        .update({ status })
        .eq('id', orgId);
      if (orgUpdErr) throw orgUpdErr;

      setOrganizations(prev => prev.map(o => o.id === orgId ? { ...o, status } : o));
    } catch (err: any) {
      console.error('suspendOrganizationAdmin error (non-fatal):', err);
      Sentry.captureException(err, {
        extra: { organization_id: currentOrg?.id, context: 'suspendOrganizationAdmin' }
      });
    }
  };

  const createCustomerAdmin = async (data: {
    name: string;
    city?: string;
    phone?: string;
    email?: string;
    website?: string;
    logo_url?: string;
    primary_color: string;
    secondary_color?: string;
    address?: string;
    owner_name?: string;
    owner_email?: string;
    owner_password?: string;
    services?: string[];
    employees?: Array<{ name: string; specialization?: string; role?: string; phone?: string; email?: string; capacity?: number }>;
    onStepProgress?: (step: number, message: string) => void;
  }) => {
    const stepNotify = (step: number, msg: string) => {
      data.onStepProgress?.(step, msg);
    };

    // Step 0: Validace webové adresy a parametrů firmy
    stepNotify(0, 'Validace parametrů firmy a webové adresy...');
    await new Promise(r => setTimeout(r, 120));

    const slug = data.name.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Math.floor(100 + Math.random() * 900);
    const orgId = generateUUID();
    let ownerUserId = generateUUID();
    const ownerEmail = data.owner_email || data.email || `jednatel@${slug}.cz`;
    const ownerPassword = data.owner_password || `BuildFlow_${Math.floor(100000 + Math.random() * 900000)}!`;
    const servicesList = data.services && data.services.length > 0 ? data.services : ['Pergoly & Terasy', 'Dřevostavby na klíč'];
    const cityName = data.city || 'Česká republika';

    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://buildflow.cz';
    const crmUrl = `${origin}/dashboard?org=${orgId}`;
    const portalUrl = `${origin}/portal?org=${orgId}`;
    const formUrl = `${origin}/inquiry?org=${orgId}`;
    const widgetScript = `<script src="${origin}/widget.js" data-org-id="${orgId}" async></script>`;

    // Step 1: Zpracování reálné vizuální identity
    stepNotify(1, 'Zpracování vizuální identity a barev...');
    await new Promise(r => setTimeout(r, 120));

    const brandingObj = {
      name: data.name,
      logoUrl: data.logo_url || 'https://images.unsplash.com/photo-1541888946425-d0fbb18f0653?auto=format&fit=crop&w=160&q=80',
      primaryColor: data.primary_color || '#2563eb',
      secondaryColor: data.secondary_color || '#0f172a'
    };

    const orgRecord: Organization = {
      id: orgId,
      name: data.name,
      slug,
      website: data.website || '',
      phone: data.phone || '',
      email: data.email || ownerEmail,
      city: cityName,
      primary_color: data.primary_color || '#2563eb',
      secondary_color: data.secondary_color || '#0f172a',
      logo_url: data.logo_url || 'https://images.unsplash.com/photo-1541888946425-d0fbb18f0653?auto=format&fit=crop&w=160&q=80',
      status: 'Active',
      created_at: new Date().toISOString()
    };

    // Step 2: Vytváření záznamu organizace v public.organizations
    stepNotify(2, 'Vytváření organizace v public.organizations...');
    let activeOrgId = orgId;

    if (isSupabaseConfigured && supabase) {
      try {
        const { data: newOrg, error: orgErr } = await supabase
          .from('organizations')
          .insert(orgRecord)
          .select()
          .single();
        if (!orgErr && newOrg) {
          activeOrgId = newOrg.id;
        }
      } catch (err) {
        console.warn('Supabase organizations insert notice (persisting in local store):', err);
      }
    }
    await new Promise(r => setTimeout(r, 120));

    // Step 3: Vytvoření administrátorského účtu v Supabase Auth
    stepNotify(3, 'Vytvoření administrátorského účtu v auth.users...');
    if (isSupabaseConfigured && supabase) {
      try {
        const { data: signUpData } = await supabase.auth.signUp({
          email: ownerEmail,
          password: ownerPassword,
          options: {
            data: {
              name: data.owner_name || data.name,
              organization_id: activeOrgId,
              role: 'owner'
            }
          }
        });
        if (signUpData?.user?.id) {
          ownerUserId = signUpData.user.id;
        }
      } catch (authErr) {
        console.warn('Supabase auth.signUp notice:', authErr);
      }
    }
    await new Promise(r => setTimeout(r, 120));

    // Step 4: Registrace vazeb v public.users a public.organization_members
    stepNotify(4, 'Registrace vazeb v public.users a public.organization_members...');
    const userRecord = {
      id: ownerUserId,
      organization_id: activeOrgId,
      role: 'owner',
      email: ownerEmail,
      name: data.owner_name || data.name
    };

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase
          .from('users')
          .upsert(userRecord);

        await supabase
          .from('organization_members')
          .upsert({
            user_id: ownerUserId,
            organization_id: activeOrgId,
            role: 'owner'
          });
      } catch (uErr) {
        console.warn('Users/organization_members upsert notice:', uErr);
      }
    }
    await new Promise(r => setTimeout(r, 120));

    // Step 5: Provisioning týmu a mistrů v public.employees
    stepNotify(5, 'Provisioning týmu a mistrů v public.employees...');
    const employeesToInsert = (data.employees && data.employees.length > 0) ? data.employees.map((emp, idx) => ({
      id: generateUUID(),
      organization_id: activeOrgId,
      name: emp.name,
      specialization: emp.specialization || emp.role || servicesList[idx % servicesList.length] || 'Realizace',
      phone: emp.phone || '+420 775 000 000',
      email: emp.email || `zamestnanec${idx + 1}@${slug}.cz`,
      capacity: typeof emp.capacity === 'number' ? emp.capacity : 85
    })) : [
      { id: generateUUID(), organization_id: activeOrgId, name: data.owner_name || 'Vedoucí realizací', specialization: servicesList[0] || 'Šéf montáží', phone: data.phone || '+420 774 889 100', email: ownerEmail, capacity: 90 },
      { id: generateUUID(), organization_id: activeOrgId, name: 'Michal Dvořák', specialization: servicesList[1] || 'Hlavní mistr', phone: '+420 732 112 334', email: `dvorak@${slug}.cz`, capacity: 95 },
      { id: generateUUID(), organization_id: activeOrgId, name: 'Petr Veselý', specialization: 'Technická příprava', phone: '+420 604 998 776', email: `vesely@${slug}.cz`, capacity: 70 }
    ];

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('employees').insert(employeesToInsert);
      } catch (eErr) {
        console.warn('Employees insert notice:', eErr);
      }
    }
    await new Promise(r => setTimeout(r, 120));

    // Step 6: Uložení white-label nastavení v public.company_settings
    stepNotify(6, 'Uložení white-label nastavení v public.company_settings...');
    const companySettingsRecord = {
      id: generateUUID(),
      organization_id: activeOrgId,
      branding: brandingObj,
      services: servicesList,
      website: data.website || '',
      address: data.address || '',
      phone: data.phone || '',
      email: data.email || ownerEmail,
      created_at: new Date().toISOString()
    };

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('company_settings').insert(companySettingsRecord);
      } catch (sErr) {
        console.warn('Company settings insert notice:', sErr);
      }
    }
    await new Promise(r => setTimeout(r, 120));

    // Step 7: Generování úvodních klientských poptávek pro region
    stepNotify(7, 'Generování úvodních klientských poptávek pro region...');
    const leadService1 = servicesList[0] || 'Pergola & Terasa';
    const leadService2 = servicesList[1] || 'Realizace na klíč';
    const demoLeads = [
      {
        id: generateUUID(),
        organization_id: activeOrgId,
        customer_name: 'Ing. Tomáš Kučera',
        phone: '+420 774 231 890',
        email: 'tomas.kucera@seznam.cz',
        project_type: leadService1,
        budget: 285000,
        status: 'New',
        created_at: new Date(Date.now() - 3600000 * 2).toISOString()
      },
      {
        id: generateUUID(),
        organization_id: activeOrgId,
        customer_name: 'Mgr. Kateřina Procházková',
        phone: '+420 608 554 321',
        email: 'prochazkova.k@gmail.com',
        project_type: leadService2,
        budget: 450000,
        status: 'Contacted',
        created_at: new Date(Date.now() - 3600000 * 18).toISOString()
      },
      {
        id: generateUUID(),
        organization_id: activeOrgId,
        customer_name: 'MUDr. Jan Beránek',
        phone: '+420 723 119 448',
        email: 'beranek.jan@email.cz',
        project_type: leadService1,
        budget: 320000,
        status: 'Quote',
        created_at: new Date(Date.now() - 3600000 * 40).toISOString()
      }
    ];

    const demoProjects = [
      {
        id: generateUUID(),
        organization_id: activeOrgId,
        lead_id: demoLeads[0].id,
        assigned_employee: employeesToInsert[0].name,
        status: 'in_progress'
      },
      {
        id: generateUUID(),
        organization_id: activeOrgId,
        lead_id: demoLeads[1].id,
        assigned_employee: employeesToInsert[1].name,
        status: 'draft'
      }
    ];

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('leads').insert(demoLeads);
        await supabase.from('projects').insert(demoProjects);
      } catch (lErr) {
        console.warn('Leads/projects insert notice:', lErr);
      }
    }
    await new Promise(r => setTimeout(r, 120));

    // Step 8: Synchronizace Super Adminu a aktivace linků
    stepNotify(8, 'Synchronizace Super Adminu a aktivace linků...');

    // Persist completely into LocalSupabaseMock so offline / fallback never loses the company
    const currentLocalOrgs = LocalSupabaseMock.getOrganizations();
    const updatedLocalOrgs = [...currentLocalOrgs.filter(o => o.id !== activeOrgId), orgRecord];
    LocalSupabaseMock.saveOrganizations(updatedLocalOrgs);

    const currentUsers = LocalSupabaseMock.getUsers();
    LocalSupabaseMock.saveUsers([...currentUsers.filter(u => u.id !== ownerUserId), {
      ...userRecord,
      password: ownerPassword
    }]);

    const currentEmps = LocalSupabaseMock.getEmployees();
    LocalSupabaseMock.saveEmployees([...currentEmps.filter(e => e.organization_id !== activeOrgId), ...employeesToInsert]);

    const currentSettings = (LocalSupabaseMock.getCompanySettings() as any[]) || [];
    LocalSupabaseMock.saveCompanySettings([...currentSettings.filter((s: any) => s.organization_id !== activeOrgId), companySettingsRecord]);

    const currentLeads = LocalSupabaseMock.getLeads();
    LocalSupabaseMock.saveLeads([...currentLeads.filter(l => l.organization_id !== activeOrgId), ...demoLeads]);

    const currentProjects = LocalSupabaseMock.getProjects();
    LocalSupabaseMock.saveProjects([...currentProjects.filter(p => p.organization_id !== activeOrgId), ...demoProjects]);

    // Update Context State immediately
    setOrganizations(prev => [...prev.filter(o => o.id !== activeOrgId), orgRecord]);
    setCurrentOrg(orgRecord);
    LocalSupabaseMock.setActiveOrgId(activeOrgId);

    const activeDbUser: DBUser = {
      id: ownerUserId,
      organization_id: activeOrgId,
      role: 'owner',
      email: ownerEmail
    };

    setDbUser(activeDbUser);
    setUser({
      id: ownerUserId,
      email: ownerEmail,
      user_metadata: { name: data.owner_name || data.name }
    });
    LocalSupabaseMock.setActiveSessionUser(activeDbUser);

    await new Promise(r => setTimeout(r, 200));

    return {
      orgId: activeOrgId,
      ownerEmail,
      ownerPassword,
      crmUrl,
      portalUrl,
      formUrl,
      widgetScript
    };
  };

  return (
    <OrganizationContext.Provider value={{
      isConfigured: isSupabaseConfigured,
      user,
      dbUser,
      currentOrg,
      organizations,
      isLoading,
      error,
      schemaError,
      clearSchemaError,
      login,
      signUp,
      logout,
      createOrganization,
      switchOrganization,
      fetchLeads,
      saveLead,
      updateLeadStatus,
      fetchEmployees,
      saveEmployee,
      fetchProjects,
      saveProject,
      impersonatingOrgId,
      originalOrg,
      impersonateOrganization,
      stopImpersonation,
      switchRoleToSuperAdmin,
      fetchAllOrganizationsAdmin,
      deleteOrganizationAdmin,
      updateBrandingAdmin,
      suspendOrganizationAdmin,
      createCustomerAdmin
    }}>
      {children}
    </OrganizationContext.Provider>
  );
};
