import React from 'react';
import { X } from 'lucide-react';
import { CompanyBranding } from '../types';
import { useBranding } from '@/hooks/useBranding';
import { EnterpriseInquiryForm } from './EnterpriseInquiryForm';

export interface EmbedLeadWidgetProps {
  branding: CompanyBranding;
  isOpen: boolean;
  onClose: () => void;
  onSubmitLead: (leadData: any) => void;
  customColor?: string;
  theme?: 'light' | 'dark' | 'auto';
}

export const EmbedLeadWidget: React.FC<EmbedLeadWidgetProps> = ({
  branding: propBranding,
  isOpen,
  onClose,
  onSubmitLead,
  customColor,
}) => {
  const { branding, palette } = useBranding();
  const activeColor = customColor || branding.primaryColor || propBranding.primaryColor || '#2563eb';
  const activeCompanyName = branding.name || propBranding.name || 'Stavební Firma';

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-50/70 backdrop-blur-md animate-in fade-in duration-200 font-sans text-slate-800">
      <div 
        className="bg-white text-slate-900 rounded-[24px] border border-slate-200 shadow-2xl w-full max-w-[1600px] max-h-[95vh] flex flex-col overflow-hidden relative transform transition-all duration-300"
      >
        {/* Header with Company Branding */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-3">
            {branding.logoUrl ? (
              <img src={branding.logoUrl} alt={activeCompanyName} className="w-9 h-9 rounded-xl object-cover border border-slate-200 bg-white p-0.5" />
            ) : (
              <div 
                className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs text-slate-900 shadow-sm"
                style={{ backgroundColor: activeColor }}
              >
                {activeCompanyName.substring(0, 2).toUpperCase()}
              </div>
            )}
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{activeCompanyName}</span>
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: activeColor }} />
                <span className="text-[10px] font-bold" style={{ color: activeColor }}>Unified Inquiry Widget</span>
              </div>
              <h3 className="text-sm font-black text-slate-900 leading-none mt-0.5">Nezávazná poptávka</h3>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content Area containing EnterpriseInquiryForm */}
        <div className="p-6 overflow-y-auto flex-1">
          <EnterpriseInquiryForm
            branding={branding}
            onSubmit={(leadData) => {
              onSubmitLead(leadData);
            }}
            onCancel={onClose}
            isModal={true}
            customColor={activeColor}
          />
        </div>
      </div>
    </div>
  );
};
