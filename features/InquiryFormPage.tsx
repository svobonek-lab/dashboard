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
    <div className="fixed inset-0 z-[9999] bg-slate-50 w-screen h-screen flex flex-col overflow-hidden font-sans text-slate-800">
      
      {/* Fixed top navigation bar */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-xs shrink-0">
        <div className="flex items-center gap-3">
          <div 
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-sm shrink-0"
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
            <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight leading-none mt-0.5">
              Poptávkový formulář & Výpočet kalkulace
            </h1>
          </div>
        </div>

        <button
          onClick={onBackToDashboard}
          className="px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 flex items-center gap-2 transition-all cursor-pointer border border-slate-200 shadow-xs"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Zavřít</span>
        </button>
      </div>

      {/* Stable central workspace with internal overflow scrolling */}
      <div className="flex-1 w-full overflow-y-auto px-6 py-8 md:px-12 bg-slate-50/50 flex justify-center">
        <div className="w-full max-w-[1600px] flex flex-col justify-between min-h-full">
          <div className="flex-1 pb-10">
            <EnterpriseInquiryForm
              branding={branding}
              onSubmit={onSubmitInquiry}
              onCancel={onBackToDashboard}
            />
          </div>

          {/* Minimal Footer */}
          <footer className="text-center py-6 text-xs text-slate-400 border-t border-slate-200/50 mt-auto shrink-0">
            <p>© 2026 {branding.name || 'Stavební Firma'}. Všechna práva vyhrazena. Zabezpečeno SSL šifrováním.</p>
          </footer>
        </div>
      </div>
    </div>
  );
};
