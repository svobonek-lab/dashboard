import React, { useState } from 'react';
import { Camera, UploadCloud, CheckCircle2, Trash2, Filter, Building } from 'lucide-react';
import { Lead, LeadFile } from '@/types';

interface EmployeePhotosPageProps {
  leads: Lead[];
  onUpdateLead: (lead: Lead) => void;
}

export const EmployeePhotosPage: React.FC<EmployeePhotosPageProps> = ({
  leads = [],
  onUpdateLead
}) => {
  const [category, setCategory] = useState<'All' | 'Before' | 'During' | 'After'>('All');
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [activeLeadId, setActiveLeadId] = useState<string>(leads[0]?.id || '');

  const activeLead = leads.find(l => l.id === activeLeadId) || leads[0];

  // Fallback demo photos if active lead has no uploaded photos yet
  const defaultPhotos: LeadFile[] = [
    { id: 'def-1', name: 'Původní stav terasy před montáží', type: 'photo', url: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=600&q=80', uploadedAt: '08:45', category: 'Before' },
    { id: 'def-2', name: 'Kotvení nosných sloupů do betonu', type: 'photo', url: 'https://images.unsplash.com/photo-1541888946425-d0fbb180c5f5?auto=format&fit=crop&w=600&q=80', uploadedAt: '11:20', category: 'During' },
    { id: 'def-3', name: 'Usazení otočných lamel střechy', type: 'photo', url: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=600&q=80', uploadedAt: '14:10', category: 'During' },
  ];

  const photosToDisplay = activeLead
    ? (activeLead.photos && activeLead.photos.length > 0 ? activeLead.photos : defaultPhotos)
    : [];

  const filteredPhotos = photosToDisplay.filter(p => {
    if (category === 'All') return true;
    return p.category === category;
  });

  const handleUploadPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0 && activeLead) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (evt) => {
        if (evt.target?.result && onUpdateLead) {
          const base64Url = evt.target.result as string;
          const newPhoto: LeadFile = {
            id: 'photo-' + Date.now(),
            name: file.name.split('.')[0] || 'Fotka ze stavby',
            type: 'photo',
            url: base64Url,
            uploadedAt: new Date().toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' }),
            category: category === 'All' ? 'During' : category
          };
          
          const currentPhotos = activeLead.photos && activeLead.photos.length > 0 ? activeLead.photos : defaultPhotos;
          const updatedLead = {
            ...activeLead,
            photos: [newPhoto, ...currentPhotos]
          };
          onUpdateLead(updatedLead);
          setUploadSuccess(true);
          setTimeout(() => setUploadSuccess(false), 3000);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDeletePhoto = (photoId: string) => {
    if (activeLead && onUpdateLead) {
      const currentPhotos = activeLead.photos && activeLead.photos.length > 0 ? activeLead.photos : defaultPhotos;
      const updatedLead = {
        ...activeLead,
        photos: currentPhotos.filter(p => p.id !== photoId)
      };
      onUpdateLead(updatedLead);
    }
  };

  return (
    <div className="space-y-6 text-slate-900 font-sans pb-12">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Camera className="w-5 h-5 text-blue-600" />
            Fotodokumentace ze stavby
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Okamžitá synchronizace fotografií na dispečink pro investora a předávací protokol.
          </p>
        </div>

        {/* Lead Selector for Technicians */}
        {leads.length > 0 && (
          <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
            <Building className="w-4 h-4 text-slate-500 ml-1.5" />
            <select
              value={activeLeadId}
              onChange={(e) => setActiveLeadId(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-700 outline-none pr-2 cursor-pointer"
            >
              {leads.map(l => (
                <option key={l.id} value={l.id}>
                  {l.customerName || l.title} ({l.city})
                </option>
              ))}
            </select>
          </div>
        )}

        <label className="cursor-pointer min-h-[44px] px-4 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-all shadow-xs flex items-center justify-center gap-2">
          <UploadCloud className="w-4 h-4" />
          <span>Vyfotit / Nahrát fotku</span>
          <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleUploadPhoto} />
        </label>
      </div>

      {/* Success Banner */}
      {uploadSuccess && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Fotografie byla úspěšně nahrána a uložena v systému!</span>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200/60 overflow-x-auto">
        {(['All', 'Before', 'During', 'After'] as const).map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              category === cat ? 'bg-white text-blue-700 shadow-xs border border-slate-200/80' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {cat === 'All' ? 'Všechny fotky' : cat === 'Before' ? 'Před zahájením' : cat === 'During' ? 'Průběh montáže' : 'Hotové dílo'}
          </button>
        ))}
      </div>

      {/* Photo Gallery Grid */}
      {filteredPhotos.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filteredPhotos.map((photo) => (
            <div
              key={photo.id}
              className="bg-white border border-slate-200/80 rounded-3xl overflow-hidden shadow-xs group space-y-3 p-3 relative"
            >
              <div className="relative h-48 rounded-2xl overflow-hidden bg-slate-100">
                <img src={photo.url} alt={photo.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                <span className={`absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border shadow-xs ${
                  photo.category === 'Before' ? 'bg-blue-50 border-blue-200 text-blue-700' :
                  photo.category === 'During' ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                }`}>
                  {photo.category === 'Before' ? 'Před montáží' : photo.category === 'During' ? 'V průběhu' : 'Hotové dílo'}
                </span>
                
                {/* Delete Button */}
                <button
                  onClick={() => handleDeletePhoto(photo.id)}
                  title="Odstranit fotku"
                  className="absolute top-2.5 right-2.5 p-1.5 rounded-xl bg-white/95 text-rose-600 hover:bg-rose-50 hover:text-rose-700 border border-slate-200/50 shadow-md cursor-pointer transition-transform hover:scale-110"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="px-2 flex justify-between items-start gap-2">
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-bold text-slate-900 truncate">{photo.name}</h4>
                  <p className="text-[10px] text-slate-500 mt-0.5">Nahráno: {photo.uploadedAt}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-12 text-center bg-slate-50 border border-dashed border-slate-200 rounded-3xl">
          <Camera className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-xs font-bold text-slate-400">Žádné fotky v této kategorii</p>
        </div>
      )}

    </div>
  );
};
