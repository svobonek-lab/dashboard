import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured, LocalSupabaseMock, isValidUUID } from '../lib/supabase';
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

export interface Organization {
  id: string;
  name: string;
  slug: string;
  primary_color: string;
  logo_url?: string;
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
  fetchAllOrganizationsAdmin: () => Promise<any[]>;
  deleteOrganizationAdmin: (orgId: string) => Promise<void>;
  updateBrandingAdmin: (orgId: string, name: string, color: string, logo?: string) => Promise<void>;
  suspendOrganizationAdmin: (orgId: string, suspend: boolean) => Promise<void>;
  createCustomerAdmin: (data: {
    name: string;
    city: string;
    phone: string;
    email: string;
    website: string;
    logo_url: string;
    primary_color: string;
    services: string[];
    employees: Array<{ name: string; specialization: string; phone: string; capacity: number }>;
  }) => Promise<{ orgId: string; ownerEmail: string }>;
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
    
    // Default to the first demo org
    if (orgs.length > 0) {
      setCurrentOrg(orgs[0]);
      
      // Setup default mock user representation
      const defaultUser = {
        id: 'user-default-uid-123456789',
        email: 'svobonek@gmail.com',
        user_metadata: { name: 'Jan Svoboda' }
      };
      
      setUser(defaultUser);
      setDbUser({
        id: defaultUser.id,
        organization_id: orgs[0].id,
        role: 'owner',
        email: defaultUser.email
      });
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
        .single();

      if (dbUserError && dbUserError.code !== 'PGRST116') {
        // PCRST116 means zero rows found
        throw dbUserError;
      }

      // If dbUser doesn't exist yet, we automatically create one with a default or new organization
      if (!dbUserData) {
        // Create an organization for this new user
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

        // Associate user with this new organization
        const { data: newUser, error: userError } = await supabase
          .from('users')
          .insert({
            id: userId,
            organization_id: newOrg.id,
            role: 'owner'
          })
          .select()
          .single();

        if (userError) throw userError;
        dbUserData = newUser;
      }

      // 2. Fetch user's organizations
      const { data: orgData, error: orgsError } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', dbUserData.organization_id);

      if (orgsError) throw orgsError;

      setOrganizations(orgData || []);
      
      // Set current organization
      const activeOrg = orgData?.find(o => o.id === dbUserData.organization_id) || null;
      setCurrentOrg(activeOrg);

      setDbUser({
        id: dbUserData.id,
        organization_id: dbUserData.organization_id,
        role: dbUserData.role || 'owner',
        email: email
      });
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
          setSchemaError('V Supabase databázi chybí tabulky (např. users, organizations, leads, employees). CRM automaticky spustilo Local Storage Sandbox pro zachování plné funkčnosti.');
          setupLocalDemoData();
        }
      } else {
        setError(err.message || 'Nepodařilo se načíst detaily organizace');
      }
    }
  };

  // Auth Action: Log In
  const login = async (email: string, pass: string) => {
    setError(null);
    if (!isSupabaseConfigured || !supabase) {
      // In-memory Auth logic for easy local/preview testing
      const defaultUser = {
        id: 'user-demo-' + Date.now(),
        email: email,
        user_metadata: { name: 'Demo Uživatel' }
      };
      
      setUser(defaultUser);
      const demoOrgs = LocalSupabaseMock.getOrganizations();
      setOrganizations(demoOrgs);
      
      const activeOrg = demoOrgs[0] || {
        id: 'org-demo-default',
        name: 'Pergoly & Terasy Praha s.r.o.',
        slug: 'pergoly-praha',
        primary_color: '#2563eb',
        logo_url: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=160&q=80'
      };
      
      setCurrentOrg(activeOrg);
      setDbUser({
        id: defaultUser.id,
        organization_id: activeOrg.id,
        role: 'owner',
        email: email
      });
      return defaultUser;
    }

    try {
      const { data, error: authErr } = await supabase.auth.signInWithPassword({
        email,
        password: pass
      });
      if (authErr) throw authErr;
      return data.user;
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
        role: 'owner'
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
      customer_name: leadData.customerName || leadData.title,
      phone: leadData.customerPhone || '',
      email: leadData.customerEmail || '',
      project_type: leadData.aiSummary?.jobType || leadData.title?.split(' - ')[0] || 'Pergoly',
      budget: leadData.price || 150000,
      status: leadData.status || 'New'
    };
    const mockAll = LocalSupabaseMock.getLeads();
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
    } as Lead;
  };

  const updateLeadStatusLocal = (leadId: string, status: string) => {
    const mockAll = LocalSupabaseMock.getLeads();
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
      phone: '+420 777 987 654',
      email: 'novotny@stavby.cz'
    }));
  };

  const saveEmployeeLocal = (empData: Partial<Employee>): Employee => {
    if (!currentOrg) throw new Error('Organizace není vybrána');
    const empRecord = {
      organization_id: currentOrg.id,
      name: empData.name,
      specialization: empData.specialization,
      capacity: empData.capacity || 100
    };
    const mockAll = LocalSupabaseMock.getEmployees();
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

    if (!isSupabaseConfigured || !supabase) {
      const mockOrgs = LocalSupabaseMock.getOrganizations();
      const targetOrg = mockOrgs.find((o: any) => o.id === orgId);
      if (targetOrg) {
        setCurrentOrg(targetOrg);
      }
      return;
    }

    try {
      const { data, error: orgError } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', orgId)
        .single();
      
      if (orgError) throw orgError;
      if (data) {
        setCurrentOrg(data as Organization);
      }
    } catch (err: any) {
      console.error('impersonateOrganization error:', err);
      throw err;
    }
  };

  const stopImpersonation = () => {
    if (originalOrg) {
      setCurrentOrg(originalOrg);
    }
    setImpersonatingOrgId(null);
    setOriginalOrg(null);
  };

  const fetchAllOrganizationsAdmin = async (): Promise<any[]> => {
    if (!isSupabaseConfigured || !supabase) {
      const orgs = LocalSupabaseMock.getOrganizations();
      const emps = LocalSupabaseMock.getEmployees();
      const leads = LocalSupabaseMock.getLeads();
      return orgs.map((org: any) => {
        const orgEmps = emps.filter((e: any) => e.organization_id === org.id);
        const orgLeads = leads.filter((l: any) => l.organization_id === org.id);
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

      const { data: leads, error: leadsError } = await supabase
        .from('leads')
        .select('organization_id');
      const { data: employees, error: empsError } = await supabase
        .from('employees')
        .select('organization_id');

      return (orgs || []).map((org: any) => {
        const orgLeads = (leads || []).filter((l: any) => l.organization_id === org.id);
        const orgEmps = (employees || []).filter((e: any) => e.organization_id === org.id);
        return {
          ...org,
          lead_count: orgLeads.length,
          employee_count: orgEmps.length,
          status: org.status || 'Active'
        };
      });
    } catch (err: any) {
      console.error('fetchAllOrganizationsAdmin error:', err);
      Sentry.captureException(err, {
        extra: { organization_id: currentOrg?.id, context: 'fetchAllOrganizationsAdmin' }
      });
      const orgs = LocalSupabaseMock.getOrganizations();
      const emps = LocalSupabaseMock.getEmployees();
      const leads = LocalSupabaseMock.getLeads();
      return orgs.map((org: any) => {
        const orgEmps = emps.filter((e: any) => e.organization_id === org.id);
        const orgLeads = leads.filter((l: any) => l.organization_id === org.id);
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
    city: string;
    phone: string;
    email: string;
    website: string;
    logo_url: string;
    primary_color: string;
    services: string[];
    employees: Array<{ name: string; specialization: string; phone: string; capacity: number }>;
  }) => {
    const slug = data.name.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Math.floor(Math.random() * 1000);
    const orgId = generateUUID();
    const ownerUserId = generateUUID();
    const ownerEmail = data.email || `owner@${slug}.com`;

    const demoLeads = [
      {
        id: generateUUID(),
        organization_id: orgId,
        customer_name: 'Ing. Jan Svoboda',
        phone: '+420 603 456 789',
        email: 'svoboda.jan@seznam.cz',
        project_type: 'Pergola',
        budget: 220000,
        status: 'New',
        created_at: new Date().toISOString()
      },
      {
        id: generateUUID(),
        organization_id: orgId,
        customer_name: 'Marta Dvořáková',
        phone: '+420 732 998 877',
        email: 'm.dvorakova@gmail.com',
        project_type: 'Střechy',
        budget: 480000,
        status: 'Contacted',
        created_at: new Date().toISOString()
      },
      {
        id: generateUUID(),
        organization_id: orgId,
        customer_name: 'Pavel Říha',
        phone: '+420 721 112 233',
        email: 'riha.p@volny.cz',
        project_type: 'Rekonstrukce',
        budget: 310000,
        status: 'Quote',
        created_at: new Date().toISOString()
      }
    ];

    const employeesToInsert = data.employees.length > 0 ? data.employees.map((emp) => ({
      id: generateUUID(),
      organization_id: orgId,
      name: emp.name,
      specialization: emp.specialization,
      capacity: emp.capacity
    })) : [
      { id: generateUUID(), organization_id: orgId, name: 'Petr Novotný', specialization: 'Pergoly & Terasy', capacity: 85 },
      { id: generateUUID(), organization_id: orgId, name: 'Martin Kovář', specialization: 'Stavební tesař', capacity: 95 },
      { id: generateUUID(), organization_id: orgId, name: 'Tomáš Veselý', specialization: 'Pokrývačské práce', capacity: 60 },
      { id: generateUUID(), organization_id: orgId, name: 'Jan Richter', specialization: 'Zedník & Rekonstrukce', capacity: 100 }
    ];

    const demoProjects = [
      {
        id: generateUUID(),
        organization_id: orgId,
        lead_id: demoLeads[0].id,
        assigned_employee: employeesToInsert[0].name,
        status: 'in_progress'
      },
      {
        id: generateUUID(),
        organization_id: orgId,
        lead_id: demoLeads[1].id,
        assigned_employee: employeesToInsert[1].name,
        status: 'draft'
      }
    ];

    if (!isSupabaseConfigured || !supabase) {
      const orgRecord = {
        id: orgId,
        name: data.name,
        slug,
        primary_color: data.primary_color,
        logo_url: data.logo_url || 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=160&q=80',
        created_at: new Date().toISOString(),
        status: 'Active'
      };

      const allOrgs = [...LocalSupabaseMock.getOrganizations(), orgRecord];
      LocalSupabaseMock.saveOrganizations(allOrgs);
      setOrganizations(allOrgs);

      const userRecord = {
        id: ownerUserId,
        organization_id: orgId,
        role: 'owner'
      };
      LocalSupabaseMock.saveUsers([...LocalSupabaseMock.getUsers(), userRecord]);
      LocalSupabaseMock.saveEmployees([...LocalSupabaseMock.getEmployees(), ...employeesToInsert]);
      LocalSupabaseMock.saveLeads([...LocalSupabaseMock.getLeads(), ...demoLeads]);
      LocalSupabaseMock.saveProjects([...LocalSupabaseMock.getProjects(), ...demoProjects]);

      return { orgId, ownerEmail };
    }

    try {
      const { data: newOrg, error: orgErr } = await supabase
        .from('organizations')
        .insert({
          id: orgId,
          name: data.name,
          slug,
          primary_color: data.primary_color,
          logo_url: data.logo_url || 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=160&q=80',
          created_at: new Date().toISOString()
        })
        .select()
        .single();
      if (orgErr) throw orgErr;

      const activeOrgId = newOrg.id;

      try {
        await supabase
          .from('users')
          .insert({
            id: ownerUserId,
            organization_id: activeOrgId,
            role: 'owner'
          });

        // Register membership in organization_members
        await supabase
          .from('organization_members')
          .insert({
            user_id: ownerUserId,
            organization_id: activeOrgId,
            role: 'owner'
          });
      } catch (uErr) {
        console.error('Users or organization_members insert failed during admin create:', uErr);
      }

      try {
        const payloadEmps = employeesToInsert.map(emp => ({
          id: emp.id,
          organization_id: activeOrgId,
          name: emp.name,
          specialization: emp.specialization,
          capacity: emp.capacity
        }));
        await supabase.from('employees').insert(payloadEmps);
      } catch (eErr) {
        console.error('Employees insert failed during admin create:', eErr);
      }

      try {
        const payloadLeads = demoLeads.map(l => ({
          id: l.id,
          organization_id: activeOrgId,
          customer_name: l.customer_name,
          phone: l.phone,
          email: l.email,
          project_type: l.project_type,
          budget: l.budget,
          status: l.status,
          created_at: l.created_at
        }));
        await supabase.from('leads').insert(payloadLeads);
      } catch (lErr) {
        console.error('Leads insert failed during admin create:', lErr);
      }

      try {
        const payloadProjs = demoProjects.map(p => ({
          id: p.id,
          organization_id: activeOrgId,
          lead_id: p.lead_id,
          assigned_employee: p.assigned_employee,
          status: p.status
        }));
        await supabase.from('projects').insert(payloadProjs);
      } catch (pErr) {
        console.error('Projects insert failed during admin create:', pErr);
      }

      setOrganizations(prev => [...prev, newOrg]);
      return { orgId: activeOrgId, ownerEmail };
    } catch (err: any) {
      console.error('createCustomerAdmin error:', err);
      Sentry.captureException(err, {
        extra: { organization_id: currentOrg?.id, context: 'createCustomerAdmin' }
      });
      throw err;
    }
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
