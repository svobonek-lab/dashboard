import React,{useCallback,useEffect,useState} from 'react';
import type {User} from '@supabase/supabase-js';
import {supabase} from '@/lib/supabase';
import {LegalConsentFields} from '@/components/LegalConsentFields';
import {activationReady,registrationPayload,type RegistrationDraft} from '@/src/app/paidRegistration';

export function PaidRegistrationPage(){
 const [user,setUser]=useState<User|null>(null);
 const [email,setEmail]=useState(''),[password,setPassword]=useState('');
 const [signIn,setSignIn]=useState(false);
 const [companyName,setCompanyName]=useState(''),[slug,setSlug]=useState(''),[ownerName,setOwnerName]=useState('');
 const [terms,setTerms]=useState(false),[dpa,setDpa]=useState(false);
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
 const returning=new URLSearchParams(window.location.search).get('paid')==='return';
 const enabled=import.meta.env.VITE_PAID_REGISTRATION_ENABLED==='true';
 useEffect(()=>{
  if(!supabase||!enabled)return;
  let alive=true;
  void supabase.auth.getSession().then(({data})=>{if(alive)setUser(data.session?.user??null);});
  const {data}=supabase.auth.onAuthStateChange((_event,session)=>setUser(session?.user??null));
  return()=>{alive=false;data.subscription.unsubscribe();};
 },[enabled]);
 useEffect(()=>{
  if(!user)return;
  try {
   const draft=JSON.parse(sessionStorage.getItem('sf_registration:'+user.id)||'null') as RegistrationDraft|null;
   if(draft){setCompanyName(draft.companyName);setSlug(draft.slug);setOwnerName(draft.ownerName);}
  }catch{setError('Rozpracovanou registraci nelze načíst. Kontaktujte podporu.');}
 },[user?.id]);
 const checkActivation=useCallback(async()=>{
  if(!supabase)return;
  setBusy(true);setError('');
  try{
   // Refresh obtains the trusted tenant claim issued by the Auth hook.
   const {data,error:refreshError}=await supabase.auth.refreshSession();
   if(refreshError||!data.user)throw new Error('Přihlaste se znovu ke svému ověřenému účtu.');
   const {data:members,error:memberError}=await supabase.from('app_members')
    .select('company_id,role,active').eq('user_id',data.user.id).eq('active',true);
   if(memberError)throw new Error('Aktivaci zatím nelze ověřit. Zkuste kontrolu za chvíli.');
   if(!members||members.length!==1){setMessage('Čekáme na potvrzení platby a přípravu firmy. Zkontrolujte stav znovu za chvíli.');return;}
   const {data:company,error:companyError}=await supabase.from('app_companies')
    .select('active,subscription_status').eq('id',members[0].company_id).maybeSingle();
   if(companyError||!activationReady(members[0],company)){setMessage('Předplatné zatím není aktivované. Zkontrolujte stav za chvíli.');return;}
   sessionStorage.removeItem('sf_registration:'+data.user.id);
   window.location.assign('/dashboard');
  }catch(e){setError(e instanceof Error?e.message:'Aktivaci se nepodařilo ověřit.');}
  finally{setBusy(false);}
 },[]);
 useEffect(()=>{
  if(!returning||!user||!enabled)return;
  let stopped=false;let timer:ReturnType<typeof setTimeout>;let attempts=0;
  const poll=async()=>{
   if(stopped)return;
   await checkActivation();
   if(!stopped&&++attempts<12)timer=setTimeout(()=>void poll(),5000);
  };
  void poll();
  return()=>{stopped=true;clearTimeout(timer);};
 },[returning,user?.id,enabled,checkActivation]);
 const account=async(event:React.FormEvent)=>{
  event.preventDefault();if(!supabase)return;setBusy(true);setError('');
  try{
   const result=signIn
    ?await supabase.auth.signInWithPassword({email,password})
    :await supabase.auth.signUp({email,password,options:{emailRedirectTo:window.location.origin+'/register-paid'}});
   if(result.error)throw new Error('Účet se nepodařilo ověřit. Zkontrolujte údaje nebo potvrzovací e-mail.');
   setPassword('');
   if(!result.data.session)setMessage('Otevřete potvrzovací e-mail. Poté se sem vraťte a přihlaste.');
   else setUser(result.data.user);
  }catch(e){setError(e instanceof Error?e.message:'Přihlášení se nepodařilo.');}
  finally{setBusy(false);}
 };
 const checkout=async(event:React.FormEvent)=>{
  event.preventDefault();if(!supabase||!user||!terms||!dpa)return;
  setBusy(true);setError('');
  try{
   const {data}=await supabase.auth.getSession();
   if(!data.session?.access_token||!data.session.user.email_confirmed_at)throw new Error('Nejdříve ověřte svůj e-mail.');
   const key='sf_registration:'+user.id;
   let previous:RegistrationDraft|null=null;
   try{previous=JSON.parse(sessionStorage.getItem(key)||'null');}catch{throw new Error('Rozpracovanou registraci nelze načíst. Kontaktujte podporu.');}
   const payload=registrationPayload({companyName:companyName.trim(),slug,ownerName:ownerName.trim()},previous);
   sessionStorage.setItem(key,JSON.stringify(payload));
   const response=await fetch('/api/billing?route=register',{
    method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+data.session.access_token,
     'x-stavbaflow-idempotency-key':payload.requestId},body:JSON.stringify(payload),
   });
   const result=await response.json();
   if(!response.ok||typeof result.url!=='string')throw new Error('Registraci se nepodařilo připravit. Zkuste stejné údaje znovu; případně kontaktujte podporu.');
   const target=new URL(result.url);
   if(target.protocol!=='https:'||target.hostname!=='checkout.stripe.com')throw new Error('Platební odkaz není platný.');
   window.location.assign(target.toString());
  }catch(e){setError(e instanceof Error?e.message:'Platbu se nepodařilo připravit.');}
  finally{setBusy(false);}
 };
 const input='mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500';
 const button='w-full rounded-xl bg-slate-950 px-5 py-3.5 font-semibold text-white disabled:opacity-40';
 return <main className="min-h-screen bg-[#f5f5f7] px-5 py-12 text-slate-950">
  <div className="mx-auto max-w-4xl"><a href="/login" className="text-sm font-semibold">StavbaFlow</a>
   <div className="mt-12 grid gap-10 md:grid-cols-2">
    <section><h1 className="text-4xl font-semibold tracking-tight">Vaše firma.<br/>Jeden přehled.</h1>
     <p className="mt-5 max-w-sm text-base leading-7 text-slate-600">Poptávky, zakázky a tým na jednom místě. Ověřte účet, vyplňte firmu a připravte svůj workspace.</p>
     <p className="mt-6 text-sm text-slate-500">Testovací registrace. Před pokračováním zkontrolujte tarif a cenu přímo na Stripe.</p>
    </section>
    <section className="rounded-2xl border border-slate-200 bg-white p-6 md:p-8">
     {!enabled||!supabase?<p>Samostatná registrace zatím není dostupná. <a href="/login" className="underline">Přejít k přihlášení</a></p>
      :!user?<form onSubmit={account} className="space-y-5">
       <h2 className="text-xl font-semibold">{signIn?'Přihlášení k registraci':'Vytvořte svůj účet'}</h2>
       <label className="block text-sm">Pracovní e-mail<input className={input} type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)}/></label>
       <label className="block text-sm">Heslo<input className={input} type="password" minLength={12} autoComplete={signIn?'current-password':'new-password'} required value={password} onChange={e=>setPassword(e.target.value)}/></label>
       <button className={button} disabled={busy}>{busy?'Chvíli strpení…':signIn?'Přihlásit se':'Ověřit e-mail'}</button>
       <button type="button" className="text-sm underline" onClick={()=>{setSignIn(!signIn);setError('');}}>{signIn?'Vytvořit nový účet':'Už mám ověřený účet'}</button>
      </form>:returning?<div className="space-y-5">
       <h2 className="text-xl font-semibold">Připravujeme váš workspace</h2>
       <p className="text-sm leading-6 text-slate-600">Platbu ověřujeme u Stripe. Přístup zpřístupníme po potvrzení a vytvoření firmy.</p>
       <button className={button} disabled={busy} onClick={()=>void checkActivation()}>{busy?'Ověřuji…':'Zkontrolovat aktivaci'}</button>
      </div>:<form onSubmit={checkout} className="space-y-5">
       <h2 className="text-xl font-semibold">Připravte svou firmu</h2><p className="break-all text-sm text-slate-500">{user.email}</p>
       <label className="block text-sm">Vaše jméno<input className={input} required maxLength={160} value={ownerName} onChange={e=>setOwnerName(e.target.value)}/></label>
       <label className="block text-sm">Název firmy<input className={input} required maxLength={160} value={companyName} onChange={e=>setCompanyName(e.target.value)}/></label>
       <label className="block text-sm">Adresa firmy ve StavbaFlow<input className={input} required pattern="[a-z0-9][a-z0-9-]{2,79}" placeholder="moje-stavebni-firma" value={slug} onChange={e=>setSlug(e.target.value)}/></label>
       <LegalConsentFields termsAccepted={terms} dpaAccepted={dpa} onTermsAcceptedChange={setTerms} onDpaAcceptedChange={setDpa}/>
       <button className={button} disabled={busy||!terms||!dpa||!user.email_confirmed_at}>{busy?'Připravuji…':'Pokračovat na Stripe'}</button>
       <button type="button" className="text-sm underline" disabled={busy} onClick={()=>void checkActivation()}>Už jsem zaplatil — zkontrolovat aktivaci</button>
      </form>}
     {error&&<p role="alert" className="mt-5 text-sm text-red-700">{error}</p>}
     {message&&<p role="status" className="mt-5 text-sm text-slate-600">{message}</p>}
    </section>
   </div>
  </div>
 </main>;
}
