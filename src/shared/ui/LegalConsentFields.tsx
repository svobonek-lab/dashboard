import React from 'react';
import { FileCheck2, ShieldCheck } from 'lucide-react';

export interface LegalConsentFieldsProps {
  termsAccepted: boolean;
  dpaAccepted: boolean;
  onTermsAcceptedChange: (value: boolean) => void;
  onDpaAcceptedChange: (value: boolean) => void;
}

export const LegalConsentFields = React.memo(function LegalConsentFields({ termsAccepted, dpaAccepted, onTermsAcceptedChange, onDpaAcceptedChange }: LegalConsentFieldsProps) {
  return <fieldset className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/80 p-4"><legend className="sr-only">Právní souhlasy</legend><div className="flex items-start gap-2.5 text-xs leading-5 text-slate-700"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand-primary" aria-hidden="true" /><p><strong className="font-bold text-slate-900">Před aktivací workspace potřebujeme potvrdit obě dohody.</strong> Uložíme čas potvrzení pro účely právního auditu.</p></div><label className="flex cursor-pointer items-start gap-3 border-t border-slate-200 py-2.5 text-xs font-semibold leading-5 text-slate-700 transition hover:bg-white"><input type="checkbox" required checked={termsAccepted} onChange={(event) => onTermsAcceptedChange(event.target.checked)} className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-primary focus:ring-brand-primary" /><span>Souhlasím s Obchodními podmínkami (TOS)</span></label><label className="flex cursor-pointer items-start gap-3 border-t border-slate-200 py-2.5 text-xs font-semibold leading-5 text-slate-700 transition hover:bg-white"><input type="checkbox" required checked={dpaAccepted} onChange={(event) => onDpaAcceptedChange(event.target.checked)} className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-primary focus:ring-brand-primary" /><span className="flex gap-2"><FileCheck2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-500" aria-hidden="true" />Uzavírám Zpracovatelskou smlouvu (DPA) jménem své organizace</span></label></fieldset>;
});