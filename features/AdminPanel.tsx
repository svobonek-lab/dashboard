import React, { useState, useEffect } from 'react';
import { useOrganization } from '@/context/OrganizationContext';
import { 
  Building, 
  Users, 
  Kanban, 
  UserCheck, 
  Plus, 
  Search, 
  ExternalLink, 
  Edit2, 
  Trash2, 
  AlertTriangle, 
  Check, 
  Loader2, 
  X, 
  ArrowRight, 
  ArrowLeft, 
  Palette, 
  Layout, 
  ShieldAlert, 
  QrCode, 
  Briefcase, 
  Globe, 
  Phone, 
  Mail, 
  MapPin, 
  Eye, 
  CheckCircle2,
  RefreshCw,
  UploadCloud,
  Camera,
  Image as ImageIcon
} from 'lucide-react';

export const AdminPanel: React.FC = () => {
  const { 
    dbUser, 
    impersonatingOrgId, 
    impersonateOrganization, 
    stopImpersonation, 
    fetchAllOrganizationsAdmin, 
    deleteOrganizationAdmin, 
    updateBrandingAdmin, 
    suspendOrganizationAdmin, 
    createCustomerAdmin 
  } = useOrganization();

  const [organizations, setOrganizations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Wizard state
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  
  // Form inputs
  const [companyName, setCompanyName] = useState('');
  const [city, setCity] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#2563eb');
  
  // Services (Step 2)
  const [selectedServices, setSelectedServices] = useState<string[]>(['Pergoly', 'Střechy']);
  const servicesList = ['Pergoly', 'Střechy', 'Fasády', 'Rekonstrukce', 'Dřevostavby', 'Ostatní'];

  // Employees (Step 3) - PATCH P4: Prázdný seznam zaměstnanců
  const [employees, setEmployees] = useState<Array<{ name: string; specialization: string; phone: string; capacity: number }>>([]);
  const [newEmpName, setNewEmpName] = useState('');
  const [newEmpSpec, setNewEmpSpec] = useState('');
  const [newEmpPhone, setNewEmpPhone] = useState('');
  const [newEmpCap, setNewEmpCap] = useState(100);

  // Install results
  const [installing, setInstalling] = useState(false);
  const [createdResult, setCreatedResult] = useState<{ orgId: string; ownerEmail: string; crmUrl: string; portalUrl: string; formUrl: string } | null>(null);

  // Edit branding modal state
  const [isEditBrandingOpen, setIsEditBrandingOpen] = useState(false);
  const [editOrgId, setEditOrgId] = useState('');
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');
  const [editLogo, setEditLogo] = useState('');

  // Delete modal state
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteOrgId, setDeleteOrgId] = useState('');
  const [deleteOrgName, setDeleteOrgName] = useState('');

  // Toast / notification state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const loadOrgs = async () => {
    setLoading(true);
    try {
      const data = await fetchAllOrganizationsAdmin();
      setOrganizations(data);
    } catch (e) {
      showToast('Nepodařilo se načíst organizace', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrgs();
  }, []);

  const handleQuickLogoUploadAdmin = async (org: any, file: File) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      if (e.target?.result) {
        const logoDataUrl = e.target.result as string;
        try {
          await updateBrandingAdmin(org.id, org.name, org.primary_color || '#2563eb', logoDataUrl);
          showToast(`Obrázek pro firmu ${org.name} byl změněn`, 'success');
          loadOrgs();
        } catch (err) {
          showToast('Nepodařilo se nahrávání obrázku', 'error');
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const handleImpersonate = async (orgId: string, orgName: string) => {
    try {
      await impersonateOrganization(orgId);
      showToast(`Byl jste přihlášen do CRM společnosti: ${orgName}`, 'success');
    } catch (e) {
      showToast('Chyba při vstupu do CRM', 'error');
    }
  };

  const handleAddEmployee = () => {
    if (!newEmpName) {
      showToast('Zadejte jméno zaměstnance', 'error');
      return;
    }
    setEmployees([...employees, {
      name: newEmpName,
      specialization: newEmpSpec || 'Ostatní práce',
      phone: newEmpPhone || '+420 777 000 000',
      capacity: newEmpCap
    }]);
    setNewEmpName('');
    setNewEmpSpec('');
    setNewEmpPhone('');
    setNewEmpCap(100);
  };

  const handleRemoveEmployee = (index: number) => {
    setEmployees(employees.filter((_, i) => i !== index));
  };

  const handleToggleService = (service: string) => {
    if (selectedServices.includes(service)) {
      setSelectedServices(selectedServices.filter(s => s !== service));
    } else {
      setSelectedServices([...selectedServices, service]);
    }
  };

  // Step 5: Install & Create Everything
  const handleInstallCustomer = async () => {
    setInstalling(true);
    try {
      const res = await createCustomerAdmin({
        name: companyName,
        city,
        phone,
        email,
        website,
        logo_url: logoUrl,
        primary_color: primaryColor,
        services: selectedServices,
        employees: [] // PATCH P4: nevytvářej demo zaměstnance
      });

      // Construct URLs
      const baseUrl = window.location.origin;
      const slug = companyName.toLowerCase().replace(/[^a-z0-9]/g, '-');
      const crmUrl = `${baseUrl}/?org=${res.orgId}`;
      const portalUrl = `${baseUrl}/portal?org=${res.orgId}`;
      const formUrl = `${baseUrl}/inquiry?org=${res.orgId}`;

      setCreatedResult({
        orgId: res.orgId,
        ownerEmail: res.ownerEmail,
        crmUrl,
        portalUrl,
        formUrl
      });
      showToast('Organizace byla úspěšně vytvořena s prázdným pracovištěm.', 'success');
      setWizardStep(5);
      loadOrgs();
    } catch (err) {
      showToast('Nepodařilo se nainstalovat zákazníka.', 'error');
    } finally {
      setInstalling(false);
    }
  };

  const handleOpenEditBranding = (org: any) => {
    setEditOrgId(org.id);
    setEditName(org.name);
    setEditColor(org.primary_color || '#2563eb');
    setEditLogo(org.logo_url || '');
    setIsEditBrandingOpen(true);
  };

  const handleSaveBranding = async () => {
    try {
      await updateBrandingAdmin(editOrgId, editName, editColor, editLogo);
      showToast('Branding byl úspěšně upraven', 'success');
      setIsEditBrandingOpen(false);
      loadOrgs();
    } catch (e) {
      showToast('Nepodařilo se upravit branding', 'error');
    }
  };

  const handleToggleSuspend = async (org: any) => {
    const nextSuspended = org.status !== 'Suspended';
    try {
      await suspendOrganizationAdmin(org.id, nextSuspended);
      showToast(nextSuspended ? 'Účet byl pozastaven' : 'Účet byl aktivován', 'success');
      loadOrgs();
    } catch (e) {
      showToast('Nepodařilo se změnit stav účtu', 'error');
    }
  };

  const handleOpenDelete = (org: any) => {
    setDeleteOrgId(org.id);
    setDeleteOrgName(org.name);
    setIsDeleteOpen(true);
  };

  const handleDeleteConfirm = async () => {
    try {
      await deleteOrganizationAdmin(deleteOrgId);
      showToast('Společnost byla úspěšně smazána', 'success');
      setIsDeleteOpen(false);
      loadOrgs();
    } catch (e) {
      showToast('Nepodařilo se smazat společnost', 'error');
    }
  };

  const handleCloseWizard = () => {
    setIsWizardOpen(false);
    setWizardStep(1);
    setCompanyName('');
    setCity('');
    setPhone('');
    setEmail('');
    setWebsite('');
    setLogoUrl('https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=160&q=80');
    setPrimaryColor('#2563eb');
    setSelectedServices(['Pergoly', 'Střechy']);
    setEmployees([
      { name: 'Petr Novotný', specialization: 'Pergoly & Terasy', phone: '+420 777 123 456', capacity: 85 },
      { name: 'Martin Kovář', specialization: 'Střechy & Krovy', phone: '+420 777 654 321', capacity: 95 }
    ]);
    setCreatedResult(null);
  };

  // Filtering
  const filteredOrgs = organizations.filter(org => 
    org.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    org.slug?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Compute stats for metrics card
  const totalOrgs = organizations.length;
  const totalLeads = organizations.reduce((acc, curr) => acc + (curr.lead_count || 0), 0);
  const totalEmployees = organizations.reduce((acc, curr) => acc + (curr.employee_count || 0), 0);
  const totalUsers = organizations.length; // 1 owner user per org created automatically

  return (
    <div id="super-admin-panel" className="space-y-8 pb-12 relative text-slate-900">
      {/* Toast alert */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl border text-sm font-semibold transition-all transform animate-bounce duration-300 ${
          toast.type === 'success' 
            ? 'bg-green-950 border-green-800 text-green-300' 
            : 'bg-rose-950 border-rose-800 text-rose-300'
        }`}>
          <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
            toast.type === 'success' ? 'bg-green-500 text-slate-950' : 'bg-rose-500 text-slate-900'
          }`}>
            <Check className="w-3.5 h-3.5" />
          </div>
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/20 border border-amber-500/30 text-amber-400 rounded-full text-xs font-bold mb-2">
            <UserCheck className="w-3.5 h-3.5" />
            <span>Super Admin Režim</span>
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Správa zákazníků CRM</h1>
          <p className="text-sm text-slate-500 font-medium">Správa, instalace a monitoring klientských CRM systémů pro stavebnictví.</p>
        </div>

        <button
          onClick={() => setIsWizardOpen(true)}
          className="inline-flex items-center gap-2 px-5 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-sm font-bold shadow-sm transition-all"
        >
          <Plus className="w-5 h-5" />
          <span>Vytvořit zákazníka</span>
        </button>
      </div>

      {/* Top Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-2 relative overflow-hidden">
          <div className="absolute right-4 top-4 text-amber-500/10">
            <Building className="w-12 h-12" />
          </div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Celkem firem</p>
          <p className="text-3xl font-black text-slate-900">{loading ? '...' : totalOrgs}</p>
          <p className="text-[11px] text-green-400 font-bold flex items-center gap-1">Aktivní multitenant</p>
        </div>

        <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-2 relative overflow-hidden">
          <div className="absolute right-4 top-4 text-green-500/10">
            <Users className="w-12 h-12" />
          </div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Uživatelé celkem</p>
          <p className="text-3xl font-black text-slate-900">{loading ? '...' : totalUsers}</p>
          <p className="text-[11px] text-slate-500 font-medium">Správci a majitelé</p>
        </div>

        <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-2 relative overflow-hidden">
          <div className="absolute right-4 top-4 text-amber-500/10">
            <Kanban className="w-12 h-12" />
          </div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Zakázek (Leads)</p>
          <p className="text-3xl font-black text-slate-900">{loading ? '...' : totalLeads}</p>
          <p className="text-[11px] text-slate-500 font-medium">Napříč všemi nájemci</p>
        </div>

        <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-2 relative overflow-hidden">
          <div className="absolute right-4 top-4 text-amber-500/10">
            <UserCheck className="w-12 h-12" />
          </div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Zaměstnanců</p>
          <p className="text-3xl font-black text-slate-900">{loading ? '...' : totalEmployees}</p>
          <p className="text-[11px] text-slate-500 font-medium">Plánované kapacity</p>
        </div>
      </div>

      {/* Customer List Card */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        {/* Search Header */}
        <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/60">
          <div className="space-y-1">
            <h3 className="font-bold text-slate-900 text-base">Seznam licencovaných firem</h3>
            <p className="text-xs text-slate-500">Přehled a správa všech izolovaných instancí a tenantů.</p>
          </div>

          <div className="relative max-w-xs w-full">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
              <Search className="w-4 h-4" />
            </span>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Vyhledat společnost..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 placeholder-slate-500 focus:border-amber-500 outline-none"
            />
          </div>
        </div>

        {loading ? (
          <div className="p-12 space-y-4">
            <div className="h-10 bg-slate-800 animate-pulse rounded-lg"></div>
            <div className="h-10 bg-slate-800 animate-pulse rounded-lg"></div>
            <div className="h-10 bg-slate-800 animate-pulse rounded-lg"></div>
          </div>
        ) : filteredOrgs.length === 0 ? (
          <div className="p-12 text-center text-slate-500 font-medium">
            <Building className="w-12 h-12 mx-auto text-slate-700 mb-3" />
            <p className="text-sm">Nenalezena žádná registrovaná firma.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[11px] font-bold uppercase tracking-wider">
                  <th className="py-4 px-6">Logo</th>
                  <th className="py-4 px-6">Název firmy</th>
                  <th className="py-4 px-6">Hlavní barva</th>
                  <th className="py-4 px-6 text-center">Poptávky</th>
                  <th className="py-4 px-6 text-center">Tým</th>
                  <th className="py-4 px-6">Stav</th>
                  <th className="py-4 px-6">Datum vytvoření</th>
                  <th className="py-4 px-6 text-right">Akce</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-xs font-semibold text-slate-700">
                {filteredOrgs.map((org) => {
                  const isSuspended = org.status === 'Suspended';
                  return (
                    <tr key={org.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-4 px-6">
                        <div className="relative group/avatar inline-block">
                          <div className="w-10 h-10 rounded-xl bg-slate-50 overflow-hidden border border-slate-200 flex items-center justify-center">
                            {org.logo_url ? (
                              <img src={org.logo_url} alt={org.name} className="w-full h-full object-cover" />
                            ) : (
                              <Building className="w-5 h-5 text-slate-600" />
                            )}
                          </div>
                          <label 
                            title="Nahrát nový obrázek z počítače" 
                            className="absolute -bottom-1 -right-1 w-5 h-5 rounded-md bg-brand-primary hover:bg-brand-primary text-white flex items-center justify-center shadow-md cursor-pointer transition-transform hover:scale-110"
                          >
                            <Camera className="w-3 h-3" />
                            <input 
                              type="file" 
                              accept="image/*" 
                              className="hidden" 
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleQuickLogoUploadAdmin(org, file);
                              }}
                            />
                          </label>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="space-y-0.5">
                          <span className="font-bold text-slate-900 text-sm block">{org.name}</span>
                          <span className="font-mono text-[10px] text-slate-500 font-bold">slug: {org.slug}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-4 h-4 rounded-md border border-slate-300 shrink-0" 
                            style={{ backgroundColor: org.primary_color || '#f59e0b' }}
                          />
                          <span className="font-mono text-[10px] font-bold text-slate-500">{org.primary_color || '#f59e0b'}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-center text-sm font-bold text-slate-700">{org.lead_count || 0}</td>
                      <td className="py-4 px-6 text-center text-sm font-bold text-slate-700">{org.employee_count || 0}</td>
                      <td className="py-4 px-6">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          isSuspended 
                            ? 'bg-rose-950 text-rose-400 border border-rose-800' 
                            : 'bg-green-950 text-green-400 border border-green-800'
                        }`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${isSuspended ? 'bg-rose-500' : 'bg-green-500'}`} />
                          {isSuspended ? 'Pozastaveno' : 'Aktivní'}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-slate-500">
                        {org.created_at ? new Date(org.created_at).toLocaleDateString('cs-CZ') : 'Neznámé'}
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Impersonate */}
                          <button
                            onClick={() => handleImpersonate(org.id, org.name)}
                            className="p-2 text-slate-500 hover:text-amber-400 hover:bg-slate-800 rounded-xl transition-all"
                            title="Vstoupit do CRM"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Edit branding */}
                          <button
                            onClick={() => handleOpenEditBranding(org)}
                            className="p-2 text-slate-500 hover:text-amber-400 hover:bg-slate-800 rounded-xl transition-all"
                            title="Upravit branding"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          {/* Suspend / Resume */}
                          <button
                            onClick={() => handleToggleSuspend(org)}
                            className={`p-2 rounded-xl transition-all ${
                              isSuspended 
                                ? 'text-green-400 hover:bg-slate-800' 
                                : 'text-slate-500 hover:text-rose-400 hover:bg-slate-800'
                            }`}
                            title={isSuspended ? 'Aktivovat účet' : 'Pozastavit účet'}
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => handleOpenDelete(org)}
                            className="p-2 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded-xl transition-all"
                            title="Smazat společnost"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ==========================================
          5-STEP CREATE CUSTOMER WIZARD MODAL
          ========================================== */}
      {isWizardOpen && (
        <div className="fixed inset-0 bg-slate-50/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-[24px] shadow-2xl max-w-4xl w-full overflow-hidden my-8 text-slate-900">
            
            {/* Header */}
            <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black">
                  +
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-lg">Průvodce instalací zákazníka</h3>
                  <p className="text-xs text-slate-500">Rychlá instalace izolované firemní jednotky s daty.</p>
                </div>
              </div>
              <button 
                onClick={handleCloseWizard}
                className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-500 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Step Indicators */}
            <div className="px-8 py-4 bg-slate-50/50 border-b border-slate-200 grid grid-cols-5 gap-2 text-center">
              {[
                { step: 1, label: 'Firma' },
                { step: 2, label: 'Služby' },
                { step: 3, label: 'Zaměstnanci' },
                { step: 4, label: 'Náhled' },
                { step: 5, label: 'Instalace' }
              ].map((s) => (
                <div key={s.step} className="space-y-1">
                  <div className={`h-1.5 rounded-full transition-all duration-300 ${
                    wizardStep >= s.step ? 'bg-amber-500' : 'bg-slate-800'
                  }`} />
                  <span className={`text-[10px] font-bold uppercase tracking-wider block ${
                    wizardStep >= s.step ? 'text-amber-400' : 'text-slate-500'
                  }`}>
                    {s.step}. {s.label}
                  </span>
                </div>
              ))}
            </div>

            {/* Content Body */}
            <div className="p-8 max-h-[500px] overflow-y-auto">
              
              {/* STEP 1: Company details */}
              {wizardStep === 1 && (
                <div className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">Název společnosti</label>
                      <input
                        type="text"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        placeholder="Např. Střechy a Pergoly Liberec s.r.o."
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:border-amber-500 outline-none"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">Lokalita (Město)</label>
                      <input
                        type="text"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="Např. Liberec"
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:border-amber-500 outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">Telefon</label>
                      <input
                        type="text"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+420 777 888 999"
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:border-amber-500 outline-none"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">E-mail administrátora</label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="admin@firma.cz"
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:border-amber-500 outline-none"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">Webová prezentace</label>
                      <input
                        type="text"
                        value={website}
                        onChange={(e) => setWebsite(e.target.value)}
                        placeholder="www.firma.cz"
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:border-amber-500 outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-3 border-t border-slate-200">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block">Obrázek / Logo společnosti</label>
                      
                      {logoUrl ? (
                        <div className="flex items-center gap-3 p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                          <img src={logoUrl} alt="Logo preview" className="w-10 h-10 object-contain rounded-lg bg-white border border-slate-200 p-0.5" />
                          <div className="flex-1 min-w-0">
                            <span className="text-xs font-bold text-slate-800 block truncate">Obrázek nahrán</span>
                            <button
                              type="button"
                              onClick={() => setLogoUrl('')}
                              className="text-[10px] text-rose-600 font-bold hover:underline"
                            >
                              Odstranit
                            </button>
                          </div>
                        </div>
                      ) : null}

                      <label className="cursor-pointer min-h-[42px] py-2.5 px-3 rounded-xl bg-brand-primary-soft hover:bg-brand-primary-soft border border-brand-primary-soft text-brand-primary text-xs font-bold flex items-center justify-center gap-2 transition-all">
                        <UploadCloud className="w-4 h-4 text-brand-primary" />
                        <span>Nahrát fotku / logo z PC</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onload = (evt) => {
                                if (evt.target?.result) setLogoUrl(evt.target.result as string);
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </label>

                      <input
                        type="text"
                        value={logoUrl}
                        onChange={(e) => setLogoUrl(e.target.value)}
                        placeholder="Nebo vložte URL adresu: https://..."
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:border-amber-500 outline-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block">Hlavní firemní barva</label>
                      <div className="flex items-center gap-4">
                        <input
                          type="color"
                          value={primaryColor}
                          onChange={(e) => setPrimaryColor(e.target.value)}
                          className="w-14 h-11 p-0 border border-slate-300 bg-transparent rounded-xl cursor-pointer"
                        />
                        <span className="font-mono text-xs text-amber-500 font-bold">{primaryColor}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2: Services */}
              {wizardStep === 2 && (
                <div className="space-y-5">
                  <div className="space-y-1.5">
                    <h4 className="font-bold text-slate-900 text-sm">Zvolte nabízené služby společnosti</h4>
                    <p className="text-xs text-slate-500">Tyto kategorie budou uplatněny při zakládání realistických poptávek.</p>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {servicesList.map((service) => {
                      const isSelected = selectedServices.includes(service);
                      return (
                        <button
                          key={service}
                          type="button"
                          onClick={() => handleToggleService(service)}
                          className={`p-4 rounded-xl border text-left font-bold transition-all relative ${
                            isSelected 
                              ? 'bg-amber-500/20 border-amber-500 text-amber-300' 
                              : 'bg-slate-50 border-slate-200 hover:border-slate-300 text-slate-700'
                          }`}
                        >
                          {isSelected && (
                            <span className="absolute right-3 top-3 w-5 h-5 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center text-[10px] font-bold">
                              ✓
                            </span>
                          )}
                          <span>{service}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* STEP 3: Employees */}
              {wizardStep === 3 && (
                <div className="space-y-6">
                  <div className="space-y-1.5">
                    <h4 className="font-bold text-slate-900 text-sm">Definujte realizační tým (Zaměstnanci)</h4>
                    <p className="text-xs text-slate-500">Přidejte specialisty, kteří budou plánováni do kalendáře a zakázek.</p>
                  </div>

                  {/* Add Employee Sub-Form */}
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Celé jméno</label>
                      <input
                        type="text"
                        value={newEmpName}
                        onChange={(e) => setNewEmpName(e.target.value)}
                        placeholder="Petr Černý"
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 outline-none focus:border-amber-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Specializace</label>
                      <input
                        type="text"
                        value={newEmpSpec}
                        onChange={(e) => setNewEmpSpec(e.target.value)}
                        placeholder="Montér tesař"
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 outline-none focus:border-amber-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Kapacita (%)</label>
                      <input
                        type="number"
                        value={newEmpCap}
                        onChange={(e) => setNewEmpCap(parseInt(e.target.value) || 100)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 outline-none focus:border-amber-500"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleAddEmployee}
                      className="py-2.5 px-4 bg-amber-500 text-slate-950 font-bold rounded-lg text-xs hover:bg-amber-400 transition-all text-center"
                    >
                      Přidat člena
                    </button>
                  </div>

                  {/* Employee List */}
                  <div className="space-y-2">
                    {employees.map((emp, i) => (
                      <div key={i} className="px-4 py-3 border border-slate-200 rounded-xl flex items-center justify-between text-xs bg-slate-50">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-amber-400 font-bold font-mono">
                            {emp.name.substring(0, 1)}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900">{emp.name}</p>
                            <p className="text-[10px] text-slate-500 font-medium">{emp.specialization}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <span className="font-bold text-slate-500">Kapacita: {emp.capacity}%</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveEmployee(i)}
                            className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-all"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* STEP 4: Brand Preview */}
              {wizardStep === 4 && (
                <div className="space-y-6">
                  <div className="space-y-1.5">
                    <h4 className="font-bold text-slate-900 text-sm">Náhled firemní identity (Branding)</h4>
                    <p className="text-xs text-slate-500">Zkontrolujte vizuální prezentaci značky pro CRM a klientský portál.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Sidebar mockup */}
                    <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                      <div className="bg-slate-50 px-4 py-3.5 border-b border-slate-200 text-slate-900 font-bold text-xs flex items-center gap-2">
                        <Layout className="w-4 h-4 text-slate-500" />
                        <span>Náhled postranního panelu</span>
                      </div>
                      <div className="p-4 bg-slate-50 text-slate-700 min-h-[140px] space-y-4">
                        <div className="flex items-center gap-2.5">
                          <div 
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-950 font-black text-xs shrink-0 bg-amber-500"
                          >
                            {companyName ? companyName.substring(0, 2).toUpperCase() : 'NS'}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 text-xs">{companyName || 'Název Společnosti'}</p>
                            <p className="text-[10px] text-slate-500">{city || 'Město'}</p>
                          </div>
                        </div>
                        
                        <div className="space-y-1 pt-2">
                          <div className="h-7 rounded bg-white px-2.5 flex items-center text-[10px] text-amber-400 border-l-2 border-amber-500">
                            ✓ Přehled
                          </div>
                          <div className="h-7 rounded hover:bg-white/50 px-2.5 flex items-center text-[10px] text-slate-500">
                            Poptávky (Kanban)
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Logo & Colors preview */}
                    <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm flex flex-col justify-between bg-slate-50">
                      <div className="bg-white px-4 py-3.5 border-b border-slate-200 text-slate-700 font-bold text-xs flex items-center gap-2">
                        <Palette className="w-4 h-4 text-amber-400" />
                        <span>Konfigurace identity</span>
                      </div>
                      <div className="p-6 space-y-4 flex-1 flex flex-col justify-center">
                        <div className="flex items-center gap-4">
                          <div className="w-14 h-14 bg-white border border-slate-200 rounded-2xl overflow-hidden flex items-center justify-center shadow-sm">
                            {logoUrl ? (
                              <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
                            ) : (
                              <Building className="w-6 h-6 text-slate-500" />
                            )}
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs font-bold text-slate-800">Firemní logo</p>
                            <p className="text-[10px] text-slate-500">Načteno přes zabezpečenou URL adresu.</p>
                          </div>
                        </div>

                        <div className="space-y-2 pt-2 border-t border-slate-200">
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Barevná paleta</p>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-7 rounded-lg border border-slate-300 shadow-sm" style={{ backgroundColor: primaryColor }} />
                            <span className="font-mono text-xs font-bold text-slate-700">{primaryColor}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 5: Installation details */}
              {wizardStep === 5 && createdResult && (
                <div className="space-y-6">
                  <div className="p-5 bg-green-950 border border-green-800/80 rounded-2xl flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-green-500 text-slate-950 flex items-center justify-center font-bold shrink-0">
                      ✓
                    </div>
                    <div>
                      <h4 className="font-bold text-green-300 text-base">Zákazník připraven (Customer ready)</h4>
                      <p className="text-xs text-green-400">Systém úspěšně inicializoval organizaci a vygeneroval stavební data.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pt-2">
                    {/* Left details */}
                    <div className="md:col-span-7 space-y-4">
                      <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Přístupové údaje majitele</p>
                        <div className="grid grid-cols-2 gap-4 text-xs">
                          <div>
                            <span className="text-slate-500 block font-medium">E-mail:</span>
                            <span className="font-bold text-slate-800">{createdResult.ownerEmail}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block font-medium">Výchozí heslo:</span>
                            <span className="font-bold text-slate-800">Password123!</span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2.5">
                        <p className="text-xs font-bold text-slate-500">Přístupové body systému:</p>
                        
                        <div className="flex items-center justify-between p-3 border border-slate-200 rounded-xl text-xs bg-slate-50 hover:bg-slate-800/50 transition-colors">
                          <div className="space-y-0.5">
                            <span className="font-bold text-slate-800 block">CRM portál (Administrace)</span>
                            <span className="font-mono text-[10px] text-slate-500 truncate block max-w-sm">{createdResult.crmUrl}</span>
                          </div>
                          <a 
                            href={createdResult.crmUrl} 
                            target="_blank" 
                            rel="noreferrer" 
                            className="p-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 rounded-lg transition-all"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>

                        <div className="flex items-center justify-between p-3 border border-slate-200 rounded-xl text-xs bg-slate-50 hover:bg-slate-800/50 transition-colors">
                          <div className="space-y-0.5">
                            <span className="font-bold text-slate-800 block">Klientská sekce (Customer Portal)</span>
                            <span className="font-mono text-[10px] text-slate-500 truncate block max-w-sm">{createdResult.portalUrl}</span>
                          </div>
                          <a 
                            href={createdResult.portalUrl} 
                            target="_blank" 
                            rel="noreferrer" 
                            className="p-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 rounded-lg transition-all"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>

                        <div className="flex items-center justify-between p-3 border border-slate-200 rounded-xl text-xs bg-slate-50 hover:bg-slate-800/50 transition-colors">
                          <div className="space-y-0.5">
                            <span className="font-bold text-slate-800 block">Poptávkový formulář</span>
                            <span className="font-mono text-[10px] text-slate-500 truncate block max-w-sm">{createdResult.formUrl}</span>
                          </div>
                          <a 
                            href={createdResult.formUrl} 
                            target="_blank" 
                            rel="noreferrer" 
                            className="p-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 rounded-lg transition-all"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </div>
                    </div>

                    {/* QR Code and marketing mockup */}
                    <div className="md:col-span-5 border border-slate-200 rounded-2xl p-6 bg-slate-50 flex flex-col items-center justify-center text-center space-y-4">
                      <div className="w-36 h-36 bg-white border border-slate-200 rounded-2xl p-3 flex items-center justify-center shadow-sm relative overflow-hidden">
                        {/* Mock QR Code SVG */}
                        <svg viewBox="0 0 100 100" className="w-full h-full text-slate-900">
                          <rect width="100" height="100" fill="white" />
                          <path d="M5 5h30v30H5zm5 5h20v20H10zm0 40h20v20H10zm35-40h20v20h-20zm5 45h15v15H50zm15-20H55v10H45v5H40v5H35v10h10v-5h10v-5h15v-5H65zm10-25H60v10h10V40zm10 5H75v20h10V45zm5-40h30v30H80zm5 5h20v20H85z" fill="currentColor" />
                          {/* Outer QR details */}
                          <rect x="75" y="75" width="20" height="20" fill="currentColor" />
                          <rect x="80" y="80" width="10" height="10" fill="white" />
                        </svg>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-slate-800">QR Kód pro formulář</p>
                        <p className="text-[10px] text-slate-500">Zákazníci mohou okamžitě načíst formulář mobilem.</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Navigation Buttons */}
            <div className="p-6 border-t border-slate-200 flex items-center justify-between bg-slate-50">
              {wizardStep < 5 ? (
                <>
                  <button
                    onClick={() => setWizardStep(prev => Math.max(1, prev - 1))}
                    disabled={wizardStep === 1}
                    className="inline-flex items-center gap-1 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-800 text-slate-700 rounded-xl text-xs font-bold disabled:opacity-50 transition-all"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Zpět</span>
                  </button>

                  {wizardStep === 4 ? (
                    <button
                      onClick={handleInstallCustomer}
                      disabled={installing || !companyName}
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-bold shadow-sm transition-all disabled:opacity-50"
                    >
                      {installing ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Instalace a generování...</span>
                        </>
                      ) : (
                        <>
                          <span>Instalovat studio</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  ) : (
                    <button
                      onClick={() => setWizardStep(prev => Math.min(4, prev + 1))}
                      disabled={wizardStep === 1 && !companyName}
                      className="inline-flex items-center gap-1 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                    >
                      <span>Pokračovat</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </>
              ) : (
                <div className="w-full flex justify-end">
                  <button
                    onClick={handleCloseWizard}
                    className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs transition-all"
                  >
                    Dokončit průvodce
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          EDIT BRANDING MODAL
          ========================================== */}
      {isEditBrandingOpen && (
        <div className="fixed inset-0 bg-slate-50/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-[20px] shadow-2xl max-w-md w-full overflow-hidden text-slate-900">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-900 text-sm">Upravit branding společnosti</h3>
              <button onClick={() => setIsEditBrandingOpen(false)} className="text-slate-500 hover:text-slate-800">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase">Název firmy</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 outline-none focus:border-amber-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase">Primární barva</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={editColor}
                    onChange={(e) => setEditColor(e.target.value)}
                    className="w-12 h-10 p-0 border border-slate-300 bg-transparent rounded-xl cursor-pointer"
                  />
                  <span className="font-mono text-xs font-bold text-amber-400">{editColor}</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 uppercase block">Obrázek / Logo společnosti</label>
                
                {editLogo ? (
                  <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-2xl">
                    <img src={editLogo} alt="Logo preview" className="w-12 h-12 object-contain rounded-xl bg-white border border-slate-200 p-1 shadow-xs" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-800 truncate">Aktuálně nahraný obrázek</p>
                      <button
                        type="button"
                        onClick={() => setEditLogo('')}
                        className="text-[10px] text-rose-600 hover:underline font-bold mt-0.5 cursor-pointer block"
                      >
                        Odstranit obrázek
                      </button>
                    </div>
                  </div>
                ) : null}

                <label className="cursor-pointer min-h-[44px] py-2.5 px-4 rounded-xl bg-brand-primary-soft hover:bg-brand-primary-soft border border-brand-primary-soft text-brand-primary font-bold text-xs flex items-center justify-center gap-2 transition-all">
                  <UploadCloud className="w-4 h-4 text-brand-primary" />
                  <span>Nahrát nový obrázek z počítače</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (evt) => {
                          if (evt.target?.result) setEditLogo(evt.target.result as string);
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                </label>

                <div className="pt-1">
                  <span className="text-[10px] text-slate-400 font-bold block mb-1">Nebo vložte URL adresu:</span>
                  <input
                    type="text"
                    value={editLogo}
                    onChange={(e) => setEditLogo(e.target.value)}
                    placeholder="https://..."
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 outline-none focus:border-amber-500"
                  />
                </div>
              </div>
            </div>
            <div className="p-5 border-t border-slate-200 flex justify-end gap-2 bg-slate-50">
              <button
                onClick={() => setIsEditBrandingOpen(false)}
                className="px-4 py-2 bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-lg hover:bg-slate-800 transition-all"
              >
                Storno
              </button>
              <button
                onClick={handleSaveBranding}
                className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-lg transition-all"
              >
                Uložit branding
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          DELETE CONFIRMATION MODAL
          ========================================== */}
      {isDeleteOpen && (
        <div className="fixed inset-0 bg-slate-50/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-[20px] shadow-2xl max-w-sm w-full overflow-hidden text-slate-900">
            <div className="p-6 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-rose-950 border border-rose-800 text-rose-400 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-slate-900 text-base">Smazat společnost?</h3>
                <p className="text-xs text-slate-500">
                  Tato akce trvale odstraní společnost <strong className="text-amber-400">{deleteOrgName}</strong>, všechny její uživatele, zakázky, zaměstnance a projekty ze systému. Tato akce je nevratná.
                </p>
              </div>
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
              <button
                onClick={() => setIsDeleteOpen(false)}
                className="px-4 py-2 bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-lg hover:bg-slate-800 transition-all"
              >
                Zrušit
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-slate-900 text-xs font-bold rounded-lg transition-all"
              >
                Trvale smazat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
