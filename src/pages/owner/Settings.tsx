import React, { useState } from 'react';
import { useOrganization } from '@/context/OrganizationContext';
import { canManageCompany } from '@/src/app/permissions';
import { 
  Settings, 
  Palette, 
  Building2, 
  Phone, 
  Mail, 
  MapPin, 
  Globe, 
  Check, 
  Plus, 
  X, 
  Download, 
  FileArchive, 
  Key, 
  Sparkles, 
  Save, 
  RefreshCw,
  Copy
} from 'lucide-react';
import { CompanyBranding } from '@/types';
import { ExportZipModal } from '@/components/ExportZipModal';

export const OwnerSettingsPage: React.FC = () => {
  
  const { dbUser, currentOrg, updateBrandingAdmin } = useOrganization();
  const branding = currentOrg?.branding || {};

  const [formData, setFormData] = useState<CompanyBranding>({ ...branding });
  const [newService, setNewService] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageCompany(dbUser?.role)) {
      alert("Nemáte oprávnění spravovat firmu.");
      return;
    }
    updateBrandingAdmin(currentOrg?.id || '', formData.name, formData.primaryColor, formData.logoUrl);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleAddService = () => {
    if (!newService.trim()) return;
    if ((formData.services || []).includes(newService.trim())) return;
    setFormData({
      ...formData,
      services: [...(formData.services || []), newService.trim()]
    });
    setNewService('');
  };

  const handleRemoveService = (service: string) => {
    setFormData({
      ...formData,
      services: (formData.services || []).filter(s => s !== service)
    });
  };

  const handleCopyApiKey = () => {
    navigator.clipboard.writeText('sk_live_stavbacore_984f839a2b9104');
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const activeColor = formData.primaryColor || branding.primaryColor || '#2563eb';

  return (
    <div className="space-y-8 text-slate-900 font-sans max-w-4xl pb-16">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <Settings className="w-6 h-6" style={{ color: activeColor }} />
            Firemní identita & Nastavení systému
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Přizpůsobení loga, barev, služeb a integračních API klíčů pro vaši stavební firmu.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsExportModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-800 hover:bg-slate-50 transition-all flex items-center gap-2 shadow-xs"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            <span>Exportovat White Label ZIP</span>
          </button>
        </div>
      </div>

      {/* Success Alert */}
      {savedSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 animate-fade-in">
          <Check className="w-4 h-4 text-emerald-600" />
          <span>Firemní identita byla úspěšně uložena a synchronizována napříč celým systémem!</span>
        </div>
      )}

      {/* Form Card */}
      <form onSubmit={handleSave} className="space-y-6">
        
        {/* Visual Identity Section */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-5 shadow-sm">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Palette className="w-4 h-4" style={{ color: activeColor }} />
            Vizuální styl & Branding
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
            <div>
              <label className="text-slate-600 font-bold block mb-1.5">Název firmy</label>
              <div className="relative">
                <Building2 className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:outline-none focus:bg-white focus:ring-2 transition-all"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-slate-600 font-bold block mb-1.5">Hlavní barva značky</label>
              <div className="flex items-center gap-3">
                <div className="relative w-14 h-11 border border-slate-200 rounded-xl overflow-hidden shrink-0">
                  <input
                    type="color"
                    value={formData.primaryColor}
                    onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                    className="absolute inset-0 w-full h-full p-0 border-0 cursor-pointer scale-150 bg-transparent"
                  />
                </div>
                <input
                  type="text"
                  value={formData.primaryColor}
                  onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-900 font-bold focus:outline-none focus:bg-white focus:ring-2 transition-all"
                  style={{ color: activeColor }}
                />
              </div>

              {/* 1-Click Color Presets */}
              <div className="mt-3 space-y-1.5">
                <span className="text-[10px] uppercase font-bold text-slate-400">Rychlá předvolba na 1-klik:</span>
                <div className="flex flex-wrap items-center gap-2">
                  {[
                    { name: 'Modrá (Pergoly & Terasy Praha)', hex: '#2563eb' },
                    { name: 'Tmavě modrá', hex: '#1d4ed8' },
                    { name: 'Smaragdová', hex: '#059669' },
                    { name: 'Tyrkysová', hex: '#0891b2' },
                    { name: 'Královská fialová', hex: '#7c3aed' },
                    { name: 'Grafitově černá', hex: '#0f172a' }
                  ].map((preset) => (
                    <button
                      key={preset.hex}
                      type="button"
                      onClick={() => setFormData({ ...formData, primaryColor: preset.hex })}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all flex items-center gap-1.5 ${
                        formData.primaryColor === preset.hex
                          ? 'border-slate-900 bg-slate-900 text-white shadow-xs'
                          : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: preset.hex }} />
                      <span>{preset.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="text-slate-600 font-bold block mb-1.5">URL loga firmy (transparentní PNG / SVG)</label>
              <input
                type="text"
                value={formData.logoUrl || ''}
                onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                placeholder="https://images.unsplash.com/..."
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium focus:outline-none focus:bg-white focus:ring-2 transition-all"
              />
            </div>
          </div>
        </div>

        {/* Contact Info Section */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-5 shadow-lg">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-amber-400" />
            Kontaktní & Fakturační údaje
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
            <div>
              <label className="text-slate-500 font-bold block mb-1.5">Město působení</label>
              <div className="relative">
                <MapPin className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="text-slate-500 font-bold block mb-1.5">Přesná adresa / Sídlo</label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="text-slate-500 font-bold block mb-1.5">Oficiální telefon</label>
              <div className="relative">
                <Phone className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="text-slate-500 font-bold block mb-1.5">Kontaktní e-mail</label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="text-slate-500 font-bold block mb-1.5">Webové stránky firmy</label>
              <div className="relative">
                <Globe className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  value={formData.website || ''}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  placeholder="https://mojefirma.cz"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Services Editor Section */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-5 shadow-lg">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            Poskytované stavební služby & specializace
          </h2>

          <div className="flex flex-wrap gap-2">
            {(formData.services || []).map((srv) => (
              <span
                key={srv}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-amber-400 shadow-inner"
              >
                <span>{srv}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveService(srv)}
                  className="text-slate-500 hover:text-rose-400 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            ))}
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={newService}
              onChange={(e) => setNewService(e.target.value)}
              placeholder="Přidat novou službu (např. Fotovoltaika, Fasády)..."
              className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-500 focus:outline-none focus:border-amber-500"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddService();
                }
              }}
            />
            <button
              type="button"
              onClick={handleAddService}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-800 text-xs font-bold transition-all flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Přidat</span>
            </button>
          </div>
        </div>

        {/* API Keys and Webhook Endpoint */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-4 shadow-lg">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Key className="w-4 h-4 text-amber-400" />
            API Klíč & Webhook pro Poptávkový formulář
          </h2>

          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-mono text-xs">
            <div className="space-y-1">
              <span className="text-slate-500 text-[11px] block">Produkční API Token:</span>
              <span className="text-amber-400 font-bold">sk_live_stavbacore_984f839a2b9104</span>
            </div>
            <button
              type="button"
              onClick={handleCopyApiKey}
              className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-700 text-xs font-bold flex items-center gap-1.5 self-start sm:self-auto"
            >
              {copiedKey ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedKey ? 'Zkopírováno' : 'Kopírovat'}</span>
            </button>
          </div>
        </div>

        {/* Submit Buttons */}
        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={() => updateBrandingAdmin(currentOrg?.id || '', '', '#2563eb', '')}
            className="px-4 py-3 rounded-2xl bg-white hover:bg-slate-800 border border-slate-200 text-xs font-bold text-slate-500 hover:text-slate-900 transition-all flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Obnovit výchozí nastavení</span>
          </button>

          <button
            type="submit"
            className="px-6 py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black transition-all shadow-lg shadow-amber-500/20 flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            <span>Uložit změny v brandingu</span>
          </button>
        </div>

      </form>

      {/* Export Modal */}
      <ExportZipModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        branding={branding}
      />

    </div>
  );
};
