import React from 'react';
import { Sparkles, ArrowLeft, Building2 } from 'lucide-react';
import { CompanyBranding } from '../types';
import { EnterpriseInquiryForm } from '../components/EnterpriseInquiryForm';

interface InquiryFormPageProps {
  branding: CompanyBranding;
  onSubmitInquiry: (leadData: any) => void;
  onBackToDashboard: () => void;
}

export const InquiryFormPage: React.FC<InquiryFormPageProps> = ({
  branding,
  onSubmitInquiry,
  onBackToDashboard
}) => {
  const activeColor = branding.primaryColor || '#2563eb';

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-50 w-screen h-screen min-h-screen flex flex-col overflow-y-auto overflow-x-hidden font-sans">
      
      {/* Full-width sticky top navigation bar */}
      <div className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <div 
            className="w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-sm shrink-0"
            style={{ backgroundColor: activeColor }}
          >
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                {branding.name}
              </span>
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: activeColor }} />
              <span className="text-[10px] font-bold" style={{ color: activeColor }}>
                CRM Poptávkový Portál
              </span>
            </div>
            <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight leading-tight">
              Poptávkový formulář & Výpočet kalkulace
            </h1>
          </div>
        </div>

        <button
          onClick={onBackToDashboard}
          className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 flex items-center gap-2 transition-all cursor-pointer border border-slate-200 shadow-xs"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Zavřít</span>
        </button>
      </div>

      {/* Main Full Screen Container for Inquiry Form */}
      <div className="flex-1 w-full bg-slate-50 py-6 sm:py-10 px-3 sm:px-6 lg:px-8">
        <EnterpriseInquiryForm
          branding={branding}
          onSubmit={onSubmitInquiry}
          onCancel={onBackToDashboard}
        />
      </div>
    </div>
  );
};
