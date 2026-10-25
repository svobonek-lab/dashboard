import React, { useMemo, useState } from 'react';
import { Check, Code2, Copy, ExternalLink, Globe2, ShieldCheck } from 'lucide-react';
import type { CompanyBranding } from '@/entities/company';
import { useOrganization } from '@/entities/session';

interface EmbedWidgetPageProps {
  branding: CompanyBranding;
  onCreateLeadFromWidget: (leadData: any) => void;
  onNavigateTab: (tab: string) => void;
}

export const EmbedWidgetPage: React.FC<EmbedWidgetPageProps> = ({ branding }) => {
  const { currentOrg } = useOrganization();
  const [copied, setCopied] = useState<'link' | 'code' | null>(null);
  const tenantKey = currentOrg?.slug || (!(import.meta as any).env?.PROD ? currentOrg?.id : '');
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const publicFormUrl = tenantKey && origin ? `${origin}/inquiry/${encodeURIComponent(tenantKey)}` : '';
  const embedCode = useMemo(() => publicFormUrl
    ? `<iframe src="${publicFormUrl}" title="Poptávkový formulář ${branding.name || currentOrg?.name || 'firmy'}" width="100%" height="760" style="border:0;border-radius:20px" loading="lazy"></iframe>`
    : '', [branding.name, currentOrg?.name, publicFormUrl]);

  const copy = async (value: string, kind: 'link' | 'code') => {
    if (!value) return;
    await navigator.clipboard.writeText(value);
    setCopied(kind);
    window.setTimeout(() => setCopied(null), 1800);
  };

  return (
    <div className="workspace-page">
      <header className="workspace-header">
        <div>
          <p className="workspace-kicker"><Globe2 className="h-4 w-4" /> Příjem poptávek</p>
          <h1 className="workspace-title">Formulář pro váš web</h1>
          <p className="workspace-subtitle">Sdílejte odkaz nebo vložte formulář na firemní web. Nová poptávka se zobrazí v pracovním prostoru až po potvrzeném zápisu.</p>
        </div>
        {publicFormUrl && <a href={publicFormUrl} target="_blank" rel="noreferrer" className="workspace-primary-action inline-flex min-h-11 items-center justify-center gap-2 px-4 text-sm font-semibold">Otevřít formulář <ExternalLink className="h-4 w-4" /></a>}
      </header>

      {!tenantKey ? (
        <section className="rounded-3xl border border-amber-200 bg-amber-50 p-6">
          <h2 className="font-semibold text-amber-950">Nejdříve dokončete profil firmy</h2>
          <p className="mt-2 text-sm text-amber-800">Veřejný formulář potřebuje ověřený identifikátor firmy. Dokončete onboarding a potom se sem vraťte.</p>
        </section>
      ) : (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,0.85fr)_minmax(420px,1.15fr)]">
          <div className="space-y-5">
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-emerald-600" /><h2 className="font-semibold text-slate-950">Veřejný odkaz firmy</h2></div>
              <p className="mt-2 text-sm leading-6 text-slate-500">Odkaz neobsahuje interní ID ani tajný klíč. Poptávky přijímá oddělený veřejný endpoint.</p>
              <div className="mt-4 flex gap-2"><input readOnly value={publicFormUrl} className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700" /><button type="button" onClick={() => copy(publicFormUrl, 'link')} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">{copied === 'link' ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />} Kopírovat</button></div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2"><Code2 className="h-5 w-5 text-blue-600" /><h2 className="font-semibold text-slate-950">Kód pro vložení</h2></div>
              <p className="mt-2 text-sm leading-6 text-slate-500">Vložte tento kód do HTML bloku ve WordPressu, Webflow nebo jiném editoru webu.</p>
              <pre className="mt-4 overflow-x-auto whitespace-pre-wrap rounded-2xl bg-slate-950 p-4 text-xs leading-6 text-slate-200"><code>{embedCode}</code></pre>
              <button type="button" onClick={() => copy(embedCode, 'code')} className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">{copied === 'code' ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />} Kopírovat kód</button>
            </section>
          </div>

          <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-4"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Skutečný náhled</p><h2 className="mt-1 font-semibold text-slate-950">Formulář, který uvidí zákazník</h2></div>
            <iframe src={publicFormUrl} title="Náhled veřejného poptávkového formuláře" className="h-[760px] w-full bg-slate-50" />
          </section>
        </div>
      )}
    </div>
  );
};
