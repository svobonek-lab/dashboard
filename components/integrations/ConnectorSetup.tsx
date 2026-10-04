import React, { useState } from 'react';
import { Cable, Copy, Loader2, ShieldCheck } from 'lucide-react';
import { connectorClient } from '@/src/app/connectorClient';
import type { EnrollmentResponse } from '@/src/app/connectorContract';

export function ConnectorSetup({companyId,onCreated}:{companyId:string;onCreated:()=>void}){
 const [enrollment,setEnrollment]=useState<EnrollmentResponse|null>(null); const [busy,setBusy]=useState(false); const [error,setError]=useState('');
 const create=async()=>{setBusy(true);setError('');try{setEnrollment(await connectorClient.createEnrollment(companyId));onCreated();}catch(e){setError(e instanceof Error?e.message:'Připojení nelze připravit.');}finally{setBusy(false);}};
 return <article className="workspace-panel p-6 sm:p-7" aria-live="polite">
  <div className="flex items-start gap-4"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600"><Cable className="h-5 w-5"/></span><div><h2 className="text-lg font-semibold text-slate-950">Databáze na Synology</h2><p className="mt-1 text-sm leading-6 text-slate-500">Konektor pouze čte vybraná data a odesílá je šifrovaným spojením ven. Heslo databáze zůstává na vašem NAS.</p></div></div>
  <div className="mt-5 flex items-center gap-2 text-sm text-emerald-700"><ShieldCheck className="h-4 w-4"/>Bez příchozího portu a bez zápisu do zdroje</div>
  {!enrollment&&<button type="button" disabled={busy} onClick={create} className="workspace-primary-action mt-6 inline-flex min-h-11 items-center gap-2 px-4 text-sm font-semibold">{busy&&<Loader2 className="h-4 w-4 animate-spin"/>}Vytvořit připojovací kód</button>}
  {enrollment&&<div className="mt-6 rounded-2xl border border-blue-100 bg-blue-50/60 p-4"><p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Jednorázový kód · platí 15 minut</p><div className="mt-2 flex items-center gap-2"><code className="min-w-0 flex-1 break-all rounded-xl bg-white px-3 py-2 text-sm text-slate-900">{enrollment.enrollmentCode}</code><button type="button" aria-label="Kopírovat kód" onClick={()=>navigator.clipboard.writeText(enrollment.enrollmentCode)} className="rounded-xl border border-blue-200 bg-white p-2 text-blue-700"><Copy className="h-4 w-4"/></button></div><p className="mt-2 text-xs text-slate-500">Po použití kód zmizí a nelze ho použít znovu.</p></div>}
  {error&&<p role="alert" className="mt-4 text-sm text-rose-700">{error}</p>}
 </article>;
}
