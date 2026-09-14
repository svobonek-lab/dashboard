import React from 'react';
import { SynologyDiscoveredFile } from '@/types/synology';
import { 
  X, 
  FileText, 
  Image as ImageIcon, 
  FileSpreadsheet, 
  Download, 
  ExternalLink, 
  HardDrive, 
  CheckCircle2, 
  FolderCheck,
  Calendar,
  Layers,
  ZoomIn
} from 'lucide-react';

interface FilePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  file: SynologyDiscoveredFile | null;
}

export const FilePreviewModal: React.FC<FilePreviewModalProps> = ({
  isOpen,
  onClose,
  file
}) => {
  if (!isOpen || !file) return null;

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              {file.fileType === 'photo' ? (
                <ImageIcon className="w-5 h-5" />
              ) : file.fileType === 'excel' ? (
                <FileSpreadsheet className="w-5 h-5" />
              ) : (
                <FileText className="w-5 h-5" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-tight">{file.name}</h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  {file.folderCategory}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono flex items-center gap-2 mt-0.5">
                <HardDrive className="w-3.5 h-3.5 text-slate-500" />
                {file.path}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (file.previewUrl) window.open(file.previewUrl, '_blank');
              }}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors text-xs font-semibold flex items-center gap-1.5"
              title="Otevřít v novém okně"
            >
              <ExternalLink className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 bg-slate-50">
          {file.fileType === 'photo' ? (
            <div className="space-y-4">
              <div className="rounded-2xl overflow-hidden border border-slate-200 bg-slate-900 relative shadow-inner max-h-[480px] flex items-center justify-center">
                <img 
                  src={file.previewUrl} 
                  alt={file.name}
                  className="max-h-[480px] w-auto object-contain rounded-xl"
                />
                <div className="absolute bottom-3 right-3 bg-slate-950/80 backdrop-blur-md px-3 py-1.5 rounded-xl text-white text-xs font-medium flex items-center gap-2 border border-slate-800">
                  <ZoomIn className="w-3.5 h-3.5 text-cyan-400" />
                  Fotodokumentace Synology NAS
                </div>
              </div>
            </div>
          ) : file.fileType === 'pdf' ? (
            <div className="space-y-4">
              <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
                <div className="flex items-center justify-between pb-6 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center font-bold">
                      PDF
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900">{file.name}</h4>
                      <p className="text-xs text-slate-500">Formát PDF | Velikost {formatFileSize(file.sizeBytes)}</p>
                    </div>
                  </div>
                  <a
                    href={file.previewUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-4 py-2 bg-brand-primary text-white rounded-xl text-xs font-bold hover:bg-brand-primary/90 transition-all flex items-center gap-2 shadow-sm"
                  >
                    <Download className="w-4 h-4" />
                    Stáhnout dokument
                  </a>
                </div>

                {/* Simulated Document Preview */}
                <div className="mt-6 p-6 bg-slate-50 rounded-2xl border border-slate-200 text-sm text-slate-700 space-y-3 font-sans">
                  <div className="flex justify-between items-center text-xs font-mono text-slate-400 uppercase tracking-wider pb-2 border-b border-slate-200">
                    <span>Projektový protokol</span>
                    <span>Synology NAS Safe Storage</span>
                  </div>
                  <p className="font-semibold text-slate-900">
                    Přiřazeno k projektu: <span className="text-brand-primary">{file.matchedProjectTitle || 'Automaticky spárováno'}</span>
                  </p>
                  <p className="text-slate-600 text-xs leading-relaxed">
                    Tento soubor byl automaticky zdetekován v chráněné složce <code className="bg-slate-200 px-1.5 py-0.5 rounded text-slate-800 font-mono">{file.path}</code> a je synchronizován se systémem BuildFlow.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                <FileSpreadsheet className="w-8 h-8" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-base">{file.name}</h4>
                <p className="text-xs text-slate-500 mt-1">Excel tabulka položkového rozpočtu</p>
              </div>
              <p className="text-xs text-slate-600 max-w-md mx-auto">
                Tabulkový soubor z firemního NAS. Data jsou automaticky mapována do kalkulací a cenových nabídek zakázky.
              </p>
            </div>
          )}

          {/* Metadata Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Velikost souboru</span>
              <span className="text-xs font-semibold text-slate-800">{formatFileSize(file.sizeBytes)}</span>
            </div>
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Kategorie NAS</span>
              <span className="text-xs font-semibold text-slate-800">{file.folderCategory}</span>
            </div>
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Datum změny</span>
              <span className="text-xs font-semibold text-slate-800">
                {new Date(file.modifiedAt).toLocaleDateString('cs-CZ', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Párování s CRM</span>
              <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {file.matchedCustomerName || 'Spárováno'}
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-white border-t border-slate-200 flex items-center justify-between">
          <div className="text-xs text-slate-500 flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-cyan-600" />
            <span>Synology DSM File Station Service</span>
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
          >
            Zavřít náhled
          </button>
        </div>

      </div>
    </div>
  );
};
