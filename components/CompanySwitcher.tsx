import React, { useState, useEffect, useRef } from 'react';
import { useOrganization } from '@/context/OrganizationContextBase';
import { useRouter } from '../src/app/router';
import { 
  Building2, 
  ChevronDown, 
  Check, 
  Plus, 
  ExternalLink, 
  Search, 
  Sparkles,
  ShieldCheck,
  Zap
} from 'lucide-react';

interface CompanySwitcherProps {
  variant?: 'dark' | 'light' | 'workspace';
}

export const CompanySwitcher: React.FC<CompanySwitcherProps> = ({ variant = 'dark' }) => {
  const { 
    currentOrg, 
    organizations, 
    switchOrganization, 
    impersonateOrganization,
    impersonatingOrgId,
    fetchAllOrganizationsAdmin,
    dbUser
  } = useOrganization();
  const { navigate } = useRouter();

  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [allOrgs, setAllOrgs] = useState<any[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load organizations
  useEffect(() => {
    const isSuperAdmin = dbUser?.role === 'platform_admin';
    if (isSuperAdmin) {
      if (organizations && organizations.length > 0) {
        setAllOrgs(organizations);
      }

      if (fetchAllOrganizationsAdmin) {
        fetchAllOrganizationsAdmin().then(data => {
          if (data && data.length > 0) setAllOrgs(data);
        }).catch(() => {});
      }
    } else {
      setAllOrgs(organizations && organizations.length > 0 ? organizations : (currentOrg ? [currentOrg] : []));
    }
  }, [organizations, dbUser, currentOrg, fetchAllOrganizationsAdmin]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectCompany = async (orgId: string) => {
    setIsOpen(false);
    await impersonateOrganization(orgId);
    navigate('/dashboard');
  };

  const filteredOrgs = allOrgs.filter(org => 
    org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (org.city && org.city.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const activeOrgName = currentOrg?.name || 'Firma není vybraná';
  const activeOrgLogo = currentOrg?.logo_url;
  const activeOrgColor = currentOrg?.primary_color || '#2563eb';

  const isDark = variant === 'dark' || variant === 'workspace';

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border shadow-sm ${
          isDark
            ? 'bg-[#090D16] hover:bg-slate-800/80 text-slate-900 border-slate-300/80 hover:border-cyan-500/40'
            : 'bg-white hover:bg-slate-50 text-slate-900 border-slate-200 hover:border-slate-300'
        }`}
      >
        <div 
          className="w-5 h-5 rounded-lg flex items-center justify-center text-[10px] font-black shrink-0 overflow-hidden text-slate-900"
          style={{ backgroundColor: activeOrgColor }}
        >
          {activeOrgLogo ? (
            <img src={activeOrgLogo} alt="" className="w-full h-full object-cover" />
          ) : (
            activeOrgName.charAt(0).toUpperCase()
          )}
        </div>
        
        <span className="truncate max-w-[140px] sm:max-w-[180px] font-bold">
          {activeOrgName}
        </span>
        
        <span className={`px-1.5 py-0.2 rounded text-[9px] font-mono uppercase font-bold tracking-wider ${
          isDark ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'bg-slate-100 text-slate-700'
        }`}>
          {(currentOrg as any)?.plan || 'Bez plánu'}
        </span>

        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180 text-cyan-400' : 'text-slate-500'}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className={`absolute left-0 mt-2 w-80 rounded-2xl shadow-2xl border z-50 overflow-hidden backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150 ${
          isDark 
            ? 'bg-[#0C111D]/95 border-slate-200 text-slate-800 shadow-cyan-950/20' 
            : 'bg-white border-slate-200 text-slate-800 shadow-slate-900/10'
        }`}>
          {/* Search Header */}
          <div className="p-3 border-b border-slate-200/80">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border ${
              isDark ? 'bg-[#090D16] border-slate-200 text-slate-700' : 'bg-slate-50 border-slate-200 text-slate-700'
            }`}>
              <Search className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Hledat firmu / workspace..."
                className="w-full bg-transparent text-xs focus:outline-none placeholder:text-slate-500 font-medium"
                autoFocus
              />
            </div>
          </div>

          {/* Section Header */}
          <div className="px-3.5 py-2 text-[10px] font-mono uppercase tracking-wider text-slate-500 font-bold flex items-center justify-between">
            <span>Izolované pracovní prostory</span>
            <span className="text-cyan-400">{filteredOrgs.length} firem</span>
          </div>

          {/* Companies List */}
          <div className="max-h-64 overflow-y-auto p-1.5 space-y-1">
            {filteredOrgs.map((org) => {
              const isSelected = org.id === currentOrg?.id;
              const primaryColor = org.primary_color || '#2563eb';

              return (
                <button
                  key={org.id}
                  onClick={() => handleSelectCompany(org.id)}
                  className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left text-xs transition-all group ${
                    isSelected
                      ? isDark 
                        ? 'bg-cyan-500/15 text-slate-900 border border-cyan-500/30' 
                        : 'bg-brand-primary-soft text-text border border-brand-primary-soft'
                      : isDark
                        ? 'hover:bg-slate-800/70 text-slate-700 hover:text-slate-900'
                        : 'hover:bg-slate-100 text-slate-700 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    <div 
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black shrink-0 overflow-hidden text-slate-900 shadow-sm"
                      style={{ backgroundColor: primaryColor }}
                    >
                      {org.logo_url ? (
                        <img src={org.logo_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        org.name.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className="overflow-hidden">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold truncate text-xs">{org.name}</span>
                        {isSelected && (
                          <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                        )}
                      </div>
                      <p className="text-[10px] text-slate-500 truncate">
                        {org.city || 'Česká republika'} • {org.theme_style?.replace('_', ' ') || 'CRM'}
                      </p>
                    </div>
                  </div>

                  <span 
                    className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                    style={{ backgroundColor: primaryColor }}
                    title={primaryColor}
                  />
                </button>
              );
            })}

            {filteredOrgs.length === 0 && (
              <div className="p-4 text-center text-xs text-slate-500">
                Žádná firma neodpovídá hledání.
              </div>
            )}
          </div>

          {/* Action Footer: Create Company */}
          {dbUser?.role === 'platform_admin' && (
            <div className="p-2 border-t border-slate-200/80 bg-[#090D16]/80">
              <button
                onClick={() => {
                  setIsOpen(false);
                  navigate('/admin/companies');
                }}
                className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-cyan-500/20 to-blue-600/20 hover:from-cyan-500/30 hover:to-blue-600/30 border border-cyan-500/30 text-cyan-300 text-xs font-bold transition-all flex items-center justify-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Založit novou firmu</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
