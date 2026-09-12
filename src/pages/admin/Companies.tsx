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
  Globe
} from 'lucide-react';

export const AdminCompaniesPage: React.FC = () => {
  const { 
    fetchAllOrganizationsAdmin, 
    impersonateOrganization, 
    deleteOrganizationAdmin,
    updateBrandingAdmin,
    suspendOrganizationAdmin 
  } = useOrganization();
  const { navigate } = useRouter();

  const [organizations, setOrganizations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'suspended'>('all');

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
            <Building2 className="w-6 h-6 text-cyan-400" />
            Adresář zákaznických firem
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Přehled všech {organizations.length} registrovaných tenantů na platformě StavbaCore.
          </p>
        </div>

        <button
          onClick={() => navigate('/admin/install')}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-black transition-all shadow-md shadow-cyan-500/20 flex items-center gap-2 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Vytvořit firmu (Install Studio)</span>
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
            className="w-full pl-9 pr-4 py-2 bg-[#090D16] border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <button
            onClick={loadData}
            title="Aktualizovat data"
            className="p-2 rounded-xl bg-[#090D16] border border-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Companies Grid */}
      {loading ? (
        <div className="p-12 text-center space-y-3">
          <div className="w-8 h-8 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin mx-auto"></div>
          <p className="text-xs font-mono text-slate-400">Načítání seznamu firem z databáze...</p>
        </div>
      ) : filteredOrgs.length === 0 ? (
        <div className="p-12 text-center bg-[#0C111D] rounded-3xl border border-slate-800 space-y-3">
          <Building2 className="w-10 h-10 text-slate-600 mx-auto" />
          <h3 className="text-sm font-bold text-white">Nenalezena žádná firma</h3>
          <p className="text-xs text-slate-400">Zkuste upravit vyhledávací dotaz nebo vytvořte novou firmu přes Install Studio.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredOrgs.map((org) => {
            const primaryColor = org.primary_color || '#2563eb';
            return (
              <div 
                key={org.id}
                className="bg-[#0C111D] border border-slate-800/80 hover:border-cyan-500/40 rounded-3xl p-5 shadow-lg flex flex-col justify-between space-y-5 transition-all group"
              >
                <div className="space-y-4">
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-lg shadow-md shrink-0 overflow-hidden"
                        style={{ backgroundColor: primaryColor }}
                      >
                        {org.logo_url ? (
                          <img src={org.logo_url} alt={org.name} className="w-full h-full object-cover" />
                        ) : (
                          org.name.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors">
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
                        <Globe className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                        <a href={org.website.startsWith('http') ? org.website : `https://${org.website}`} target="_blank" rel="noreferrer" className="text-cyan-300 hover:underline truncate">
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
                    className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-cyan-500/20 to-blue-600/20 hover:from-cyan-500/30 hover:to-blue-600/30 text-cyan-300 border border-cyan-500/30 text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <span>Otevřít Company Workspace</span>
                    <ExternalLink className="w-3.5 h-3.5 text-cyan-400" />
                  </button>

                  <button
                    onClick={() => handleOpenEdit(org)}
                    title="Upravit branding"
                    className="p-2 rounded-xl bg-[#090D16] hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => {
                      setDeleteOrg(org);
                      setDeleteModalOpen(true);
                    }}
                    title="Smazat firmu"
                    className="p-2 rounded-xl bg-[#090D16] hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-slate-800 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Branding Modal */}
      {editModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0C111D] border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">Upravit branding firmy</h3>
              <button onClick={() => setEditModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 font-bold block mb-1">Název firmy</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full p-2.5 bg-[#090D16] border border-slate-800 rounded-xl text-white font-semibold focus:outline-none focus:border-cyan-500/50"
                />
              </div>

              <div>
                <label className="text-slate-400 font-bold block mb-1">Hlavní barva</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={editColor}
                    onChange={(e) => setEditColor(e.target.value)}
                    className="w-12 h-10 rounded-xl border border-slate-800 cursor-pointer bg-transparent"
                  />
                  <span className="font-mono text-cyan-400 font-bold">{editColor}</span>
                </div>
              </div>

              <div>
                <label className="text-slate-400 font-bold block mb-1">URL loga</label>
                <input
                  type="text"
                  value={editLogo}
                  onChange={(e) => setEditLogo(e.target.value)}
                  className="w-full p-2.5 bg-[#090D16] border border-slate-800 rounded-xl text-white font-semibold focus:outline-none focus:border-cyan-500/50"
                  placeholder="https://..."
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setEditModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-700"
              >
                Zrušit
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-black"
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
                className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-700"
              >
                Zrušit
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black shadow-lg shadow-rose-600/20"
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
