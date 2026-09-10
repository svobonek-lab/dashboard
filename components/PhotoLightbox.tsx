import React from 'react';
import { X } from 'lucide-react';

interface PhotoLightboxProps {
  isOpen: boolean;
  imageUrl: string;
  title: string;
  category?: string;
  onClose: () => void;
}

export const PhotoLightbox: React.FC<PhotoLightboxProps> = ({
  isOpen,
  imageUrl,
  title,
  category,
  onClose
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <button
        onClick={onClose}
        className="absolute top-6 right-6 w-10 h-10 rounded-full bg-slate-900 border border-slate-800 text-white flex items-center justify-center hover:bg-slate-800 transition-all z-10"
      >
        <X className="w-5 h-5" />
      </button>

      <div className="max-w-4xl w-full flex flex-col items-center">
        <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-slate-800 bg-slate-900 max-h-[80vh]">
          <img src={imageUrl} alt={title} className="max-w-full max-h-[75vh] object-contain" />
          {category && (
            <span className="absolute top-4 left-4 px-3 py-1 rounded-lg text-xs font-bold bg-slate-900/80 backdrop-blur-md text-white border border-slate-700">
              {category}
            </span>
          )}
        </div>
        <p className="text-white text-sm font-semibold mt-4 text-center">{title}</p>
      </div>
    </div>
  );
};
