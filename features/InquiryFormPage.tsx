import React from 'react';
import { Sparkles, ArrowLeft } from 'lucide-react';
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
  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-8 pb-24 text-slate-900 font-sans">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-6 bg-white p-6 rounded-3xl shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-600 border border-blue-500/20 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600">Unified Enterprise Inquiry Form</span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight mt-1">{branding.name} — Poptávkový formulář</h2>
          <p className="text-xs text-slate-500 mt-0.5">Jednotný vertikální poptávkový formulář pro okamžitý odhad a zařazení do CRM.</p>
        </div>
        <button
          onClick={onBackToDashboard}
          className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200 flex items-center gap-1.5 transition-all"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Zpět do CRM</span>
        </button>
      </div>

      {/* Enterprise Inquiry Form Component */}
      <EnterpriseInquiryForm
        branding={branding}
        onSubmit={onSubmitInquiry}
        onCancel={onBackToDashboard}
      />
    </div>
  );
};
