import React, { useState, useEffect } from 'react';
import { useOrganization } from '@/context/OrganizationContext';
import { useRouter } from '../../app/router';
import { 
  Building2, 
  Search, 
  Plus, 
  ExternalLink, 
  Edit2, 
  Trash2, 
  AlertTriangle, 
  Check, 
  X, 
  Wand2, 
  Users, 
  Calendar, 
  Palette, 
  Phone, 
  Mail, 
  MapPin,
  RefreshCw,
  Globe,
  UploadCloud,
  Camera,
  Eye,
  Image as ImageIcon
  , Loader2
  , CheckCircle2
  , Copy
} from 'lucide-react';

export const AdminCompaniesPage: React.FC = () => {
  const { 
    fetchAllOrganizationsAdmin, 
    impersonateOrganization, 
    deleteOrganizationAdmin,
    updateBrandingAdmin,
    suspendOrganizationAdmin,
    createCustomerAdmin
  } = useOrganization();
  const { navigate } = useRouter();

  const [organizations, setOrganizations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', ownerName: '', ownerEmail: '', city: '', phone: '', color: '#2563eb' });
  const [createStep, setCreateStep] = useState(-1);
  const [createMessage, setCreateMessage] = useState('');
  const [createdWorkspace, setCreatedWorkspace] = useState<{ crmUrl: string; portalUrl: string; formUrl: string; ownerEmail: string } | null>(null);
  const [createError, setCreateError] = useState('');

  // Edit Branding Modal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editOrg, setEditOrg] = useState<any | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');
  const [editLogo, setEditLogo] = useState('');

  // Delete Confirmation Modal
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteOrg, setDeleteOrg] = useState<any | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchAllOrganizationsAdmin();
      setOrganizations(data || []);
    } catch (e) {
      console.error('Failed to load orgs', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleImpersonate = async (orgId: string) => {
    await impersonateOrganization(orgId);
    navigate('/dashboard');
  };

  const handleOpenEdit = (org: any) => {
    setEditOrg(org);
    setEditName(org.name);
    setEditColor(org.primary_color || '#2563eb');
    setEditLogo(org.logo_url || '');
    setEditModalOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editOrg) return;
    try {
      await updateBrandingAdmin(editOrg.id, editName, editColor, editLogo);
      setEditModalOpen(false);
      loadData();
    } catch (e) {
      console.error('Failed to update branding', e);
    }
  };

  const handleQuickLogoUpload = async (org: any, file: File) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      if (e.target?.result) {
        const logoDataUrl = e.target.result as string;
        try {
          await updateBrandingAdmin(org.id, org.name, org.primary_color || '#2563eb', logoDataUrl);
          loadData();
        } catch (err) {
          console.error('Quick upload failed', err);
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDelete = async () => {
    if (!deleteOrg) return;
    try {
      await deleteOrganizationAdmin(deleteOrg.id);
      setDeleteModalOpen(false);
      loadData();
    } catch (e) {
      console.error('Failed to delete org', e);
    }
  };

  const handleCreateCompany = async (event: React.FormEvent) => {
    event.preventDefault();
    setCreateError('');
    setCreatedWorkspace(null);
    setCreateStep(0);
    try {
      const result = await createCustomerAdmin({
        name: createForm.name.trim(),
        city: createForm.city.trim(),
        phone: createForm.phone.trim(),
        email: createForm.ownerEmail.trim(),
        owner_name: createForm.ownerName.trim(),
        owner_email: createForm.ownerEmail.trim(),
        primary_color: createForm.color,
        secondary_color: '#0f172a',
        onStepProgress: (step, message) => {
          setCreateStep(step);
          setCreateMessage(message);
        }
      });
      setCreatedWorkspace({ crmUrl: result.crmUrl, portalUrl: result.portalUrl, formUrl: result.formUrl, ownerEmail: result.ownerEmail });
      await loadData();
    } catch (error: any) {
      setCreateError(error?.message || 'Firmu se nepodařilo založit. Zkontrolujte oprávnění a zkuste to znovu.');
      setCreateStep(-1);
    }
  };

  const resetCreateModal = () => {
    setCreateModalOpen(false);
    setCreatedWorkspace(null);
    setCreateError('');
    setCreateStep(-1);
    setCreateMessage('');
    setCreateForm({ name: '', ownerName: '', ownerEmail: '', city: '', phone: '', color: '#2563eb' });
  };

  const filteredOrgs = organizations.filter(org => {
    const matchesSearch = org.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          org.slug?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="space-y-6 font-sans text-slate-100">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <Building2 className="w-6 h-6 text-blue-400" />
            Adresář zákaznických firem
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Přehled všech {organizations.length} registrovaných tenantů na platformě.
          </p>
        </div>

        <button
          onClick={() => setCreateModalOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 text-white text-xs font-black transition-all shadow-md shadow-blue-500/20 flex items-center gap-2 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Nová firma · rychlé nastavení</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#0C111D] p-3 rounded-2xl border border-slate-800/80">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Hledat firmu podle názvu..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-[#090D16] border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <button
            onClick={loadData}
            title="Aktualizovat data"
            className="p-2 rounded-xl bg-[#090D16] border border-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Companies Grid */}
      {loading ? (
        <div className="p-12 text-center space-y-3">
          <div className="w-8 h-8 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mx-auto"></div>
          <p className="text-xs font-mono text-slate-400">Načítání seznamu firem z databáze...</p>
        </div>
      ) : filteredOrgs.length === 0 ? (
        <div className="p-12 bg-[#0C111D] border border-slate-800 rounded-3xl text-center space-y-3">
          <Building2 className="w-10 h-10 text-slate-600 mx-auto" />
          <h3 className="text-sm font-bold text-white">Nenalezena žádná firma</h3>
          <p className="text-xs text-slate-400">Zkuste upravit vyhledávací dotaz nebo vytvořte novou firmu přes Install Studio.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredOrgs.map((org) => {
            const primaryColor = org.primary_color || '#2563eb';
            return (
              <div 
                key={org.id}
                className="bg-[#0C111D] border border-slate-800/80 hover:border-blue-500/40 rounded-3xl p-5 shadow-lg flex flex-col justify-between space-y-5 transition-all group"
              >
                <div className="space-y-4">
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      
                      {/* Logo Avatar with direct Upload Trigger */}
                      <div className="relative group/avatar shrink-0">
                        <div 
                          className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-lg shadow-md overflow-hidden border border-slate-700/60"
                          style={{ backgroundColor: primaryColor }}
                        >
                          {org.logo_url ? (
                            <img src={org.logo_url} alt={org.name} className="w-full h-full object-cover" />
                          ) : (
                            org.name.charAt(0).toUpperCase()
                          )}
                        </div>

                        <label 
                          title="Změnit obrázek / logo z počítače" 
                          className="absolute -bottom-1 -right-1 w-6 h-6 rounded-lg bg-blue-500 hover:bg-blue-400 text-slate-950 flex items-center justify-center shadow-md cursor-pointer transition-transform hover:scale-110"
                        >
                          <Camera className="w-3.5 h-3.5" />
                          <input 
                            type="file" 
                            accept="image/*" 
                            className="hidden" 
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleQuickLogoUpload(org, file);
                            }}
                          />
                        </label>
                      </div>

                      <div>
                        <h3 className="text-sm font-bold text-white group-hover:text-blue-300 transition-colors">
                          {org.name}
                        </h3>
                        <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                          slug: {org.slug || 'default'}
                        </p>
                      </div>
                    </div>

                    <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-green-500/20 text-green-400 border border-green-500/30">
                      Aktivní
                    </span>
                  </div>

                  {/* Details stats */}
                  <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                    <div className="p-2.5 bg-[#090D16] rounded-xl border border-slate-800/80">
                      <span className="text-[10px] text-slate-500 font-mono block">Město / Region</span>
                      <span className="font-bold text-slate-200 truncate block">{org.city || 'Česká republika'}</span>
                    </div>
                    <div className="p-2.5 bg-[#090D16] rounded-xl border border-slate-800/80">
                      <span className="text-[10px] text-slate-500 font-mono block">Kontakt</span>
                      <span className="font-bold text-slate-200 truncate block">{org.phone || org.email || 'Aktivní'}</span>
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-400 space-y-1 font-mono">
                    {org.website && (
                      <p className="flex items-center gap-1.5 truncate">
                        <Globe className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                        <a href={org.website.startsWith('http') ? org.website : `https://${org.website}`} target="_blank" rel="noreferrer" className="text-blue-300 hover:underline truncate">
                          {org.website.replace(/https?:\/\//, '')}
                        </a>
                      </p>
                    )}
                    <p className="flex items-center gap-1.5">
                      <Palette className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span>Barva: <strong className="text-slate-300">{primaryColor}</strong></span>
                    </p>
                    <p className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span>Registrace: {new Date(org.created_at || Date.now()).toLocaleDateString('cs-CZ')}</span>
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                  <button
                    onClick={() => handleImpersonate(org.id)}
                    className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-blue-500/20 to-blue-600/20 hover:from-blue-500/30 hover:to-blue-600/30 text-blue-300 border border-blue-500/30 text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    <span>Otevřít Company Workspace</span>
                    <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
                  </button>

                  <a
                    href={`/inquiry?org=${org.id}`}
                    target="_blank"
                    rel="noreferrer"
                    title="Otevřít veřejný poptávkový formulář firmy (Live Preview)"
                    className="p-2 rounded-xl bg-[#090D16] hover:bg-slate-800 text-slate-400 hover:text-blue-300 border border-slate-800 transition-colors flex items-center justify-center"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </a>

                  <button
                    onClick={() => handleOpenEdit(org)}
                    title="Upravit branding & obrázek"
                    className="p-2 rounded-xl bg-[#090D16] hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition-colors cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => {
                      setDeleteOrg(org);
                      setDeleteModalOpen(true);
                    }}
                    title="Smazat firmu"
                    className="p-2 rounded-xl bg-[#090D16] hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-slate-800 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {createModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0C111D] border border-blue-500/30 rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] uppercase tracking-[0.18em] text-blue-300 font-black">StavbaFlow onboarding</p>
                <h3 className="text-xl font-black text-white mt-1">Nastavit novou firmu</h3>
                <p className="text-xs text-slate-400 mt-1">Založíme čistý workspace, majitele a firemní branding v jednom průchodu.</p>
              </div>
              <button onClick={resetCreateModal} className="text-slate-400 hover:text-white cursor-pointer"><X className="w-5 h-5" /></button>
            </div>

            {createdWorkspace ? (
              <div className="space-y-4">
                <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 flex gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-300 shrink-0" />
                  <div><p className="text-sm font-bold text-white">Workspace je připraven</p><p className="text-xs text-emerald-100/80 mt-1">Majitel: {createdWorkspace.ownerEmail}</p></div>
                </div>
                <div className="space-y-2 text-xs">
                  {[['Přihlášení / CRM', createdWorkspace.crmUrl], ['Veřejný formulář', createdWorkspace.formUrl], ['Klientský portál', createdWorkspace.portalUrl]].map(([label, url]) => (
                    <div key={url} className="flex items-center gap-2 rounded-xl bg-[#090D16] border border-slate-800 p-2.5">
                      <span className="text-slate-400 w-32 shrink-0">{label}</span><span className="font-mono text-blue-300 truncate flex-1">{url}</span>
                      <button type="button" title="Kopírovat odkaz" onClick={() => navigator.clipboard?.writeText(url)} className="text-slate-400 hover:text-white"><Copy className="w-3.5 h-3.5" /></button>
                    </div>
                  ))}
                </div>
                <button type="button" onClick={resetCreateModal} className="w-full py-2.5 rounded-xl bg-blue-500 hover:bg-blue-400 text-slate-950 text-xs font-black">Hotovo</button>
              </div>
            ) : (
              <form onSubmit={handleCreateCompany} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="text-xs text-slate-400 font-bold">Název firmy<input required value={createForm.name} onChange={e => setCreateForm(p => ({ ...p, name: e.target.value }))} placeholder="Novák Stavby s.r.o." className="mt-1 w-full p-2.5 rounded-xl bg-[#090D16] border border-slate-800 text-white" /></label>
                  <label className="text-xs text-slate-400 font-bold">Město<input required value={createForm.city} onChange={e => setCreateForm(p => ({ ...p, city: e.target.value }))} placeholder="Brno" className="mt-1 w-full p-2.5 rounded-xl bg-[#090D16] border border-slate-800 text-white" /></label>
                  <label className="text-xs text-slate-400 font-bold">Majitel<input required value={createForm.ownerName} onChange={e => setCreateForm(p => ({ ...p, ownerName: e.target.value }))} placeholder="Jan Novák" className="mt-1 w-full p-2.5 rounded-xl bg-[#090D16] border border-slate-800 text-white" /></label>
                  <label className="text-xs text-slate-400 font-bold">E-mail majitele<input required type="email" value={createForm.ownerEmail} onChange={e => setCreateForm(p => ({ ...p, ownerEmail: e.target.value }))} placeholder="jan@novakstavby.cz" className="mt-1 w-full p-2.5 rounded-xl bg-[#090D16] border border-slate-800 text-white" /></label>
                  <label className="text-xs text-slate-400 font-bold">Telefon<input value={createForm.phone} onChange={e => setCreateForm(p => ({ ...p, phone: e.target.value }))} placeholder="+420 777 000 000" className="mt-1 w-full p-2.5 rounded-xl bg-[#090D16] border border-slate-800 text-white" /></label>
                  <label className="text-xs text-slate-400 font-bold">Barva firmy<div className="mt-1 flex items-center gap-2"><input type="color" value={createForm.color} onChange={e => setCreateForm(p => ({ ...p, color: e.target.value }))} className="h-10 w-12 rounded-lg bg-transparent border border-slate-800" /><span className="font-mono text-blue-300">{createForm.color}</span></div></label>
                </div>
                {createError && <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-200">{createError}</p>}
                {createStep >= 0 && <p className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-3 text-xs text-blue-100 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />{createMessage || 'Připravuji workspace…'}</p>}
                <button type="submit" disabled={createStep >= 0} className="w-full py-3 rounded-xl bg-blue-500 hover:bg-blue-400 disabled:opacity-60 text-slate-950 text-xs font-black flex items-center justify-center gap-2"><Wand2 className="w-4 h-4" />{createStep >= 0 ? 'Nastavuji firmu…' : 'Založit čistý workspace'}</button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Edit Branding Modal with File Upload */}
      {editModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0C111D] border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Palette className="w-4 h-4 text-blue-400" />
                Upravit branding & logo firmy
              </h3>
              <button onClick={() => setEditModalOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="text-slate-400 font-bold block mb-1">Název firmy</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full p-2.5 bg-[#090D16] border border-slate-800 rounded-xl text-white font-semibold focus:outline-none focus:border-blue-500/50"
                />
              </div>

              <div>
                <label className="text-slate-400 font-bold block mb-1">Hlavní firemní barva</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={editColor}
                    onChange={(e) => setEditColor(e.target.value)}
                    className="w-12 h-10 rounded-xl border border-slate-800 cursor-pointer bg-transparent"
                  />
                  <span className="font-mono text-blue-400 font-bold">{editColor}</span>
                </div>
              </div>

              {/* Logo Upload Section */}
              <div className="space-y-2">
                <label className="text-slate-400 font-bold block">Obrázek / Logo společnosti</label>
                
                {editLogo ? (
                  <div className="flex items-center gap-3 p-3 bg-[#090D16] border border-slate-800 rounded-2xl">
                    <img 
                      src={editLogo} 
                      alt="Logo preview" 
                      className="w-14 h-14 object-contain rounded-xl bg-slate-950 border border-slate-800 p-1 shadow-sm"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-white truncate">Aktuálně nahraný obrázek</p>
                      <button
                        type="button"
                        onClick={() => setEditLogo('')}
                        className="text-[10px] text-rose-400 hover:underline font-bold mt-1 cursor-pointer block"
                      >
                        Odstranit obrázek
                      </button>
                    </div>
                  </div>
                ) : null}

                {/* File Upload Trigger */}
                <label className="cursor-pointer min-h-[48px] py-3 px-4 rounded-xl bg-gradient-to-r from-blue-500/10 to-blue-600/10 hover:from-blue-500/20 hover:to-blue-600/20 border border-blue-500/30 text-blue-300 font-bold text-xs flex items-center justify-center gap-2 transition-all">
                  <UploadCloud className="w-4 h-4 text-blue-400" />
                  <span>Nahrát nové logo / fotku z počítače</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (evt) => {
                          if (evt.target?.result) {
                            setEditLogo(evt.target.result as string);
                          }
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                </label>

                <div className="pt-1">
                  <span className="text-[10px] text-slate-500 block mb-1">Nebo vložte URL adresu:</span>
                  <input
                    type="text"
                    value={editLogo}
                    onChange={(e) => setEditLogo(e.target.value)}
                    className="w-full p-2.5 bg-[#090D16] border border-slate-800 rounded-xl text-white font-mono text-[11px] focus:outline-none focus:border-blue-500/50"
                    placeholder="https://..."
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setEditModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-700 cursor-pointer"
              >
                Zrušit
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-4 py-2 rounded-xl bg-blue-500 hover:bg-blue-400 text-slate-950 text-xs font-black cursor-pointer shadow-md shadow-blue-500/20"
              >
                Uložit změny
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && deleteOrg && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0C111D] border border-rose-500/40 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-black text-white">Opravdu smazat firmu?</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Tato akce trvale odstraní firmu <strong className="text-white">{deleteOrg.name}</strong> včetně všech souvisejících zakázek, zaměstnanců a rozpočtů.
            </p>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setDeleteModalOpen(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-700 cursor-pointer"
              >
                Zrušit
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black shadow-lg shadow-rose-600/20 cursor-pointer"
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
