import React, { useState } from 'react';
import { Camera, UploadCloud, CheckCircle2, Image as ImageIcon, Plus, Trash2, Filter } from 'lucide-react';

export const EmployeePhotosPage: React.FC = () => {
  const [category, setCategory] = useState<'All' | 'Before' | 'During' | 'After'>('All');
  const [uploadedPhotos, setUploadedPhotos] = useState([
    { id: '1', title: 'Původní stav terasy před montáží', category: 'Before', url: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=600&q=80', date: 'Dnes 08:45' },
    { id: '2', title: 'Kotvení nosných sloupů do betonu', category: 'During', url: 'https://images.unsplash.com/photo-1541888946425-d0fbb180c5f5?auto=format&fit=crop&w=600&q=80', date: 'Dnes 11:20' },
    { id: '3', title: 'Usazení otočných lamel střechy', category: 'During', url: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=600&q=80', date: 'Dnes 14:10' },
  ]);

  const [uploadSuccess, setUploadSuccess] = useState(false);

  const handleSimulateUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const newPhoto = {
        id: Date.now().toString(),
        title: file.name || 'Fotografie ze stavby',
        category: category === 'All' ? 'During' : category,
        url: URL.createObjectURL(file),
        date: 'Právě teď'
      };
      setUploadedPhotos([newPhoto, ...uploadedPhotos]);
      setUploadSuccess(true);
      setTimeout(() => setUploadSuccess(false), 3000);
    }
  };

  const filteredPhotos = uploadedPhotos.filter(p => {
    if (category === 'All') return true;
    return p.category === category;
  });

  return (
    <div className="space-y-6 text-slate-100 font-sans pb-12">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
            <Camera className="w-5 h-5 text-emerald-400" />
            Fotodokumentace ze stavby
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Okamžitá synchronizace fotografií na dispečink pro investora a předávací protokol.
          </p>
        </div>

        <label className="cursor-pointer min-h-[44px] px-4 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition-all shadow-md shadow-emerald-500/20 flex items-center gap-2">
          <UploadCloud className="w-4 h-4" />
          <span>Vyfotit / Nahrát</span>
          <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleSimulateUpload} />
        </label>
      </div>

      {/* Success Banner */}
      {uploadSuccess && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>Fotografie byla úspěšně nahrána a synchronizována na cloud!</span>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 bg-[#111726] p-1.5 rounded-2xl border border-slate-800">
        {(['All', 'Before', 'During', 'After'] as const).map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
              category === cat ? 'bg-emerald-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            {cat === 'All' ? 'Všechny fotky' : cat === 'Before' ? 'Před zahájením' : cat === 'During' ? 'Průběh montáže' : 'Hotové dílo'}
          </button>
        ))}
      </div>

      {/* Photo Gallery Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {filteredPhotos.map((photo) => (
          <div
            key={photo.id}
            className="bg-[#111726] border border-slate-800 rounded-3xl overflow-hidden shadow-lg group space-y-3 p-3"
          >
            <div className="relative h-48 rounded-2xl overflow-hidden bg-slate-900">
              <img src={photo.url} alt={photo.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
              <span className="absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-950/80 backdrop-blur-md text-emerald-400 border border-slate-800">
                {photo.category}
              </span>
            </div>

            <div className="px-2">
              <h4 className="text-xs font-bold text-white truncate">{photo.title}</h4>
              <p className="text-[10px] text-slate-400 mt-0.5">{photo.date}</p>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
};
