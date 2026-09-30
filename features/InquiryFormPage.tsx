import React, { useState, useEffect } from 'react';
import { Sparkles, ArrowLeft, Building2 } from 'lucide-react';
import { CompanyBranding } from '../types';
import { EnterpriseInquiryForm } from '../components/EnterpriseInquiryForm';
import { useOrganization } from '../context/OrganizationContext';
import { supabase, isSupabaseConfigured, LocalSupabaseMock, isValidUUID } from '../lib/supabase';

interface InquiryFormPageProps {
  branding: CompanyBranding;
  onSubmitInquiry: (leadData: any) => void;
  onBackToDashboard: () => void;
}

export const InquiryFormPage: React.FC<InquiryFormPageProps> = ({
  branding,
  onSubmitInquiry,
  onBackToDashboard
}) => {
  const { currentOrg } = useOrganization();
  const [tenantOrg, setTenantOrg] = useState<{ name?: string; logo_url?: string; primary_color?: string } | null>(null);

  useEffect(() => {
    async function resolveTenant() {
      if (typeof window === 'undefined') return;
      const params = new URLSearchParams(window.location.search);
      let orgParam = params.get('org') || params.get('slug');
      
      // Check path like /form/:org
      const pathParts = window.location.pathname.split('/');
      if (pathParts.length >= 3 && (pathParts[1] === 'form' || pathParts[1] === 'inquiry')) {
        orgParam = pathParts[2];
      }

      if (!orgParam) return;

      try {
        if (isSupabaseConfigured && supabase) {
          const query = supabase
            .from('app_companies')
            .select('id,name,slug,color,logo_url,active')
            .eq('active', true);
          const { data } = isValidUUID(orgParam)
            ? await query.eq('id', orgParam).maybeSingle()
            : await query.eq('slug', orgParam).maybeSingle();
          if (data) {
            setTenantOrg({
              name: data.name,
              logo_url: data.logo_url,
              primary_color: data.color,
            });
          }
        } else if (!(import.meta as any).env?.PROD) {
          const mockOrgs = LocalSupabaseMock.getOrganizations();
          const found = mockOrgs.find((o: any) => o.id === orgParam || o.slug === orgParam);
          if (found) setTenantOrg(found as any);
        } else {
          setTenantOrg(null);
        }
      } catch (e) {
        console.warn('Could not resolve tenant org from param:', e);
      }
    }
    resolveTenant();
  }, []);

  const activeBranding: CompanyBranding = {
    ...branding,
    name: tenantOrg?.name || currentOrg?.name || branding.name || 'Stavební Firma',
    logoUrl: tenantOrg?.logo_url !== undefined ? tenantOrg.logo_url : (currentOrg?.logo_url !== undefined ? currentOrg.logo_url : (branding.logoUrl || '')),
    primaryColor: tenantOrg?.primary_color || currentOrg?.primary_color || branding.primaryColor || '#2563eb',
    city: currentOrg?.city || branding.city || 'Praha'
  };

  const effectiveLogo = activeBranding.logoUrl;
  const effectiveName = activeBranding.name;
  const activeColor = activeBranding.primaryColor || '#2563eb';

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-50 w-screen h-screen flex flex-col overflow-hidden font-sans text-slate-800">
      
      {/* Fixed top navigation bar */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-xs shrink-0">
        <div className="flex items-center gap-3">
          <div 
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-sm shrink-0 overflow-hidden"
            style={{ backgroundColor: activeColor }}
          >
            {effectiveLogo ? (
              <img src={effectiveLogo} alt={effectiveName} className="w-full h-full object-cover" />
            ) : (
              <Sparkles className="w-5 h-5" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                {effectiveName}
              </span>
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: activeColor }} />
              <span className="text-[10px] font-bold" style={{ color: activeColor }}>
                CRM Poptávkový Portál
              </span>
            </div>
            <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight leading-none mt-0.5">
              Poptávkový formulář & Výpočet kalkulace
            </h1>
          </div>
        </div>

        <button
          onClick={onBackToDashboard}
          className="px-4 py-2.5 min-h-[48px] min-w-[48px] rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 flex items-center justify-center gap-2 transition-all cursor-pointer border border-slate-200 shadow-xs"
        >
          <ArrowLeft className="w-4 h-4 shrink-0" />
          <span className="hidden sm:inline">Zavřít</span>
        </button>
      </div>

      {/* Stable central workspace with internal overflow scrolling */}
      <div className="flex-1 w-full overflow-y-auto px-6 py-4 md:px-10 bg-slate-50/50 flex justify-center">
        <div className="w-full max-w-[1600px] flex flex-col justify-between min-h-full">
          <div className="flex-1 pb-10">
            <EnterpriseInquiryForm
              branding={activeBranding}
              onSubmit={onSubmitInquiry}
              onCancel={onBackToDashboard}
            />
          </div>

          {/* Minimal Footer */}
          <footer className="text-center py-6 text-xs text-slate-400 border-t border-slate-200/50 mt-auto shrink-0">
            <p>© 2026 {activeBranding.name || 'Stavební Firma'}. Všechna práva vyhrazena. Zabezpečeno SSL šifrováním.</p>
          </footer>
        </div>
      </div>
    </div>
  );
};
