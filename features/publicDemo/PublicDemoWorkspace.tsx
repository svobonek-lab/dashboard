import { useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, BriefcaseBusiness, Check, ChevronDown, CirclePlus, HardHat, House, RotateCcw, X } from 'lucide-react';
import { createDemoLead, DEMO_COLUMNS, DEMO_SEED, DemoLead, DemoStatus, moveDemoLead, parseDemoLeads } from './demoState';

const STORAGE_KEY = 'stavbacore_public_demo_v1';
const money = new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: 'CZK', maximumFractionDigits: 0 });

function readLeads(): DemoLead[] {
  try { return parseDemoLeads(window.localStorage.getItem(STORAGE_KEY)); }
  catch { return DEMO_SEED.map((lead) => ({ ...lead })); }
}

export function PublicDemoWorkspace() {
  const [leads, setLeads] = useState<DemoLead[]>(readLeads);
  const [selected, setSelected] = useState<DemoLead | null>(null);
  const [adding, setAdding] = useState(false);
  const [notice, setNotice] = useState('');
  const totals = useMemo(() => ({
    pipeline: leads.filter((lead) => lead.status !== 'job').reduce((sum, lead) => sum + lead.value, 0),
    open: leads.filter((lead) => lead.status !== 'job').length,
    jobs: leads.filter((lead) => lead.status === 'job').length,
  }), [leads]);

  const persist = (next: DemoLead[]) => {
    setLeads(next);
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); }
    catch { setNotice('Prohlížeč neumožnil uložit ukázkové změny.'); }
  };

  const advance = (lead: DemoLead) => {
    const nextStatus: DemoStatus = lead.status === 'new' ? 'contacted' : lead.status === 'contacted' ? 'quote' : 'job';
    const changed = moveDemoLead(lead, nextStatus);
    persist(leads.map((item) => item.id === lead.id ? changed : item));
    setSelected(changed);
    setNotice(nextStatus === 'job' ? 'Poptávka převedena na zakázku.' : 'Stav poptávky byl změněn.');
  };

  const reset = () => {
    const fresh = DEMO_SEED.map((lead) => ({ ...lead }));
    persist(fresh);
    setSelected(null);
    setNotice('Ukázka je znovu v původním stavu.');
  };

  return (
    <main className="demo-shell min-h-screen bg-[#eef2f1] text-[#18343a]">
      <div className="demo-banner flex flex-wrap items-center justify-center gap-x-2 gap-y-1 px-4 py-2 text-center text-xs font-semibold">
        <span className="rounded-full bg-white/20 px-2 py-0.5 uppercase tracking-wider">Ukázkové prostředí</span>
        <span>Smyšlená data. Změny se ukládají jen v tomto prohlížeči.</span>
        <button onClick={reset} className="inline-flex items-center gap-1 underline underline-offset-2" aria-label="Obnovit ukázková data"><RotateCcw size={13} /> Obnovit ukázku</button>
      </div>

      <div className="mx-auto flex min-h-[calc(100vh-36px)] max-w-[1600px]">
        <aside className="demo-rail hidden w-[76px] shrink-0 flex-col items-center gap-7 py-6 md:flex">
          <a href="/" className="demo-mark" aria-label="StavbaCore, zpět na web">SC</a>
          <button className="rail-icon rail-active" aria-label="Přehled"><House size={19} /></button>
          <button className="rail-icon" aria-label="Zakázky"><BriefcaseBusiness size={19} /></button>
          <div className="mt-auto text-[10px] font-bold tracking-widest text-white/55">DEMO</div>
        </aside>

        <section className="min-w-0 flex-1 px-4 py-5 sm:px-7 lg:px-10 lg:py-8">
          <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
            <div>
              <a href="/" className="mb-4 inline-flex items-center gap-1.5 text-xs font-bold text-[#60777a] hover:text-[#17363c]"><ArrowLeft size={14} /> Zpět na StavbaCore</a>
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#17474a] text-white"><HardHat size={23} /></div>
                <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-[#718689]">Pracovní přehled</p><h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Dobré ráno, Marku</h1></div>
              </div>
              <p className="mt-2 text-sm text-[#687d80]">Malířství a rekonstrukce Novák · Brno a okolí</p>
            </div>
            <button onClick={() => setAdding(true)} className="demo-primary inline-flex min-h-11 items-center gap-2 rounded-lg px-4 text-sm font-bold"><CirclePlus size={17} /> Nová poptávka</button>
          </header>

          <div className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Summary label="Rozpracované poptávky" value={String(totals.open)} note="od prvního kontaktu po nabídku" />
            <Summary label="Hodnota v jednání" value={money.format(totals.pipeline)} note="orientační cena zakázek" />
            <Summary label="Aktivní zakázky" value={String(totals.jobs)} note="předané realizačnímu týmu" />
          </div>

          <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
            <div><p className="text-xs font-bold uppercase tracking-[0.14em] text-[#718689]">Obchod</p><h2 className="mt-1 text-xl font-extrabold">Poptávky a zakázky</h2></div>
            <span className="text-xs font-medium text-[#718689]">Tento týden <ChevronDown size={14} className="inline" /></span>
          </div>

          <div className="demo-board grid gap-3 pb-3 md:grid-cols-2 xl:grid-cols-4" aria-label="Přehled obchodních případů">
            {DEMO_COLUMNS.map((column) => {
              const items = leads.filter((lead) => lead.status === column.id);
              return <section key={column.id} className="demo-column min-w-0 rounded-xl p-3" aria-label={column.label}>
                <div className="mb-3 flex items-center justify-between px-1"><h3 className="text-[13px] font-extrabold">{column.label}</h3><span className="demo-count">{items.length}</span></div>
                <div className="space-y-2.5">
                  {items.map((lead) => <article key={lead.id} className="demo-ticket rounded-lg p-3.5">
                    <button onClick={() => setSelected(lead)} className="block w-full text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1f7470]">
                      <div className="mb-2 flex items-start justify-between gap-2"><span className="text-[10px] font-bold uppercase tracking-wider text-[#819194]">{lead.city}</span><span className="text-[10px] text-[#8a999a]">{lead.updated}</span></div>
                      <h4 className="text-sm font-extrabold leading-snug">{lead.project}</h4><p className="mt-1 text-xs text-[#687d80]">{lead.customer}</p>
                      <div className="mt-4 flex items-center justify-between border-t border-[#e7eceb] pt-3"><span className="text-xs font-bold text-[#24494b]">{lead.value ? money.format(lead.value) : 'Cena k doplnění'}</span><span className="text-[10px] font-semibold text-[#849395]">Detail →</span></div>
                    </button>
                    {lead.status !== 'job' && <button onClick={() => advance(lead)} className="demo-next mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-md py-2 text-xs font-bold">{lead.status === 'quote' ? 'Převést na zakázku' : 'Posunout dál'} <ArrowRight size={13} /></button>}
                  </article>)}
                  {items.length === 0 && <p className="rounded-lg border border-dashed border-[#d5dfdd] px-3 py-5 text-center text-xs text-[#819194]">Zatím tu nic není</p>}
                </div>
              </section>;
            })}
          </div>
          <p className="mt-4 text-center text-xs text-[#849395]">Vyzkoušejte celý průchod: přidejte poptávku, otevřete detail a posuňte ji až do zakázek.</p>
          <footer className="mt-10 flex flex-wrap items-center justify-between gap-2 border-t border-[#dce4e2] pt-4 text-xs text-[#819194]"><span>© 2026 StavbaCore · Ukázka produktu</span><a className="font-bold text-[#315d5c] hover:underline" href="/login">Přihlásit se k účtu <ArrowRight size={12} className="inline" /></a></footer>
        </section>
      </div>

      {notice && <div role="status" className="demo-toast fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-lg px-4 py-3 text-sm font-semibold shadow-xl">{notice}<button onClick={() => setNotice('')} className="ml-3 align-middle" aria-label="Zavřít oznámení"><X size={14} /></button></div>}
      {selected && <DetailPanel lead={selected} onClose={() => setSelected(null)} onAdvance={() => advance(selected)} />}
      {adding && <AddLeadDialog onClose={() => setAdding(false)} onAdd={(input) => { const lead = createDemoLead(input); persist([lead, ...leads]); setAdding(false); setSelected(lead); setNotice('Ukázková poptávka byla přidána.'); }} />}
    </main>
  );
}

function Summary({ label, value, note }: { label: string; value: string; note: string }) {
  return <div className="demo-summary rounded-xl px-4 py-4"><p className="text-xs font-semibold text-[#718689]">{label}</p><p className="mt-2 text-2xl font-extrabold tracking-tight">{value}</p><p className="mt-1 text-[11px] text-[#849395]">{note}</p></div>;
}

function DetailPanel({ lead, onClose, onAdvance }: { lead: DemoLead; onClose: () => void; onAdvance: () => void }) {
  const status = DEMO_COLUMNS.find((column) => column.id === lead.status)?.label;
  return <div className="demo-overlay fixed inset-0 z-40 flex justify-end" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <aside role="dialog" aria-modal="true" aria-labelledby="demo-detail-title" className="demo-panel h-full w-full max-w-md overflow-y-auto p-6 sm:p-8">
      <button onClick={onClose} className="mb-8 inline-flex items-center gap-1 text-sm font-bold text-[#60777a]"><X size={16} /> Zavřít detail</button>
      <p className="text-xs font-bold uppercase tracking-widest text-[#768b8c]">{status}</p><h2 id="demo-detail-title" className="mt-2 text-2xl font-extrabold">{lead.project}</h2><p className="mt-2 text-sm text-[#60777a]">{lead.customer} · {lead.city}</p>
      <div className="my-7 border-y border-[#e2e9e7] py-5"><p className="text-xs text-[#819194]">Předběžná hodnota</p><p className="mt-1 text-xl font-extrabold">{lead.value ? money.format(lead.value) : 'Doplnit po zaměření'}</p></div>
      <h3 className="text-sm font-extrabold">Další krok</h3><p className="mt-2 text-sm leading-6 text-[#60777a]">{lead.status === 'new' ? 'Ozvat se zákazníkovi a domluvit prohlídku.' : lead.status === 'contacted' ? 'Připravit rozsah prací a cenovou nabídku.' : lead.status === 'quote' ? 'Po přijetí nabídky předat případ do realizace.' : 'Zakázka je připravená pro plánování práce týmu.'}</p>
      {lead.status !== 'job' && <button onClick={onAdvance} className="demo-primary mt-8 flex min-h-11 w-full items-center justify-center gap-2 rounded-lg text-sm font-bold">{lead.status === 'quote' ? <><Check size={17} /> Nabídka přijata · vytvořit zakázku</> : <>Označit další krok <ArrowRight size={16} /></>}</button>}
      <p className="mt-5 text-xs leading-5 text-[#8a999a]">Jde o smyšlený záznam pro předvedení pracovního postupu.</p>
    </aside>
  </div>;
}

function AddLeadDialog({ onClose, onAdd }: { onClose: () => void; onAdd: (input: { customer: string; project: string; city: string }) => void }) {
  const [customer, setCustomer] = useState('');
  const [project, setProject] = useState('');
  const [city, setCity] = useState('');
  const valid = customer.trim() && project.trim() && city.trim();
  return <div className="demo-overlay fixed inset-0 z-40 flex items-center justify-center p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <form role="dialog" aria-modal="true" aria-labelledby="demo-add-title" onSubmit={(event) => { event.preventDefault(); if (valid) onAdd({ customer, project, city }); }} className="demo-panel w-full max-w-lg rounded-2xl p-6 sm:p-8">
      <div className="mb-6 flex items-start justify-between"><div><p className="text-xs font-bold uppercase tracking-widest text-[#768b8c]">Ukázkový záznam</p><h2 id="demo-add-title" className="mt-1 text-2xl font-extrabold">Nová poptávka</h2></div><button type="button" onClick={onClose} aria-label="Zavřít formulář"><X size={19} /></button></div>
      <div className="space-y-4">
        <label className="block text-xs font-bold">Zákazník nebo firma<input autoFocus required maxLength={80} value={customer} onChange={(event) => setCustomer(event.target.value)} className="demo-input mt-1.5" placeholder="např. Rodina Novákových" /></label>
        <label className="block text-xs font-bold">Co se má postavit nebo opravit<input required maxLength={100} value={project} onChange={(event) => setProject(event.target.value)} className="demo-input mt-1.5" placeholder="např. Rekonstrukce koupelny" /></label>
        <label className="block text-xs font-bold">Město nebo oblast<input required maxLength={60} value={city} onChange={(event) => setCity(event.target.value)} className="demo-input mt-1.5" placeholder="např. Brno-venkov" /></label>
      </div>
      <div className="mt-7 flex justify-end gap-2"><button type="button" onClick={onClose} className="rounded-lg px-4 py-2.5 text-sm font-bold text-[#61777a]">Zrušit</button><button disabled={!valid} className="demo-primary inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-bold"><CirclePlus size={16} /> Přidat do ukázky</button></div>
    </form>
  </div>;
}
