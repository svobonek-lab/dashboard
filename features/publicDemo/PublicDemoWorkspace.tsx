import { useMemo, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { ArrowRight, ArrowUpRight, Banknote, Bell, BriefcaseBusiness, CalendarCheck2, CalendarDays, ChartNoAxesCombined, Check, CheckCircle2, ChevronRight, CircleDot, CirclePlus, ClipboardList, Clock3, FileText, FolderOpen, HardHat, House, MapPin, Menu, Phone, RotateCcw, Search, Settings, ShieldCheck, Users, X } from 'lucide-react';
import { calculateDemoMargin, createDemoLead, DEMO_COLUMNS, DEMO_JOURNEY_STEPS, DEMO_SEED, DemoJourneyStep, DemoLead, DemoStatus, moveDemoLead, nextDemoJourneyStep, nextDemoStatus, parseDemoLeads } from './demoState';

type Screen = 'overview' | 'leads' | 'quotes' | 'jobs' | 'calendar' | 'clients' | 'team' | 'documents' | 'analytics' | 'settings';
type DemoCompany = { name: string; area: string };
const LEADS_KEY = 'stavbacore_public_demo_v1';
const COMPANY_KEY = 'stavbacore_public_demo_company_v1';
const JOURNEY_KEY = 'stavbacore_public_demo_journey_v1';
const DEMO_CONTRACT_VALUE = 353000;
const DEMO_FIELD_COSTS = 214500;
const DEFAULT_COMPANY: DemoCompany = { name: 'Novákova stavební firma', area: 'Brno a okolí' };
const money = new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: 'CZK', maximumFractionDigits: 0 });
const percent = new Intl.NumberFormat('cs-CZ', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const margin = calculateDemoMargin(DEMO_CONTRACT_VALUE, DEMO_FIELD_COSTS) ?? 0;
const NAV: { id: Screen; label: string; icon: typeof House }[] = [
  { id: 'overview', label: 'Přehled', icon: House },
  { id: 'leads', label: 'Poptávky', icon: ClipboardList },
  { id: 'quotes', label: 'Cenové nabídky', icon: FileText },
  { id: 'jobs', label: 'Zakázky', icon: HardHat },
  { id: 'calendar', label: 'Kalendář', icon: CalendarDays },
  { id: 'clients', label: 'Klienti', icon: Users },
  { id: 'team', label: 'Tým', icon: BriefcaseBusiness },
  { id: 'documents', label: 'Dokumenty', icon: FolderOpen },
  { id: 'analytics', label: 'Přehled výsledků', icon: ChartNoAxesCombined },
  { id: 'settings', label: 'Nastavení firmy', icon: Settings },
];
const TEAM = [
  { name: 'Marek Novák', role: 'Majitel', initials: 'MN', color: 'copper' },
  { name: 'Adam Dvořák', role: 'Vedoucí party', initials: 'AD', color: 'blue' },
  { name: 'Petr Vávra', role: 'Řemeslník', initials: 'PV', color: 'green' },
];

function readLeads() { try { return parseDemoLeads(window.localStorage.getItem(LEADS_KEY)); } catch { return DEMO_SEED.map((lead) => ({ ...lead })); } }
function readCompany(): DemoCompany {
  try { const value = JSON.parse(window.localStorage.getItem(COMPANY_KEY) || 'null'); return value && typeof value.name === 'string' && typeof value.area === 'string' ? value : DEFAULT_COMPANY; }
  catch { return DEFAULT_COMPANY; }
}
function readJourneyStep(): DemoJourneyStep {
  try {
    const value = Number(window.localStorage.getItem(JOURNEY_KEY));
    return Number.isInteger(value) && value >= 0 && value <= 3 ? value as DemoJourneyStep : 0;
  } catch { return 0; }
}

export function PublicDemoWorkspace() {
  const [screen, setScreen] = useState<Screen>('overview');
  const [leads, setLeads] = useState<DemoLead[]>(readLeads);
  const [company, setCompany] = useState<DemoCompany>(readCompany);
  const [journeyStep, setJourneyStep] = useState<DemoJourneyStep>(readJourneyStep);
  const [selected, setSelected] = useState<DemoLead | null>(null);
  const [adding, setAdding] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [query, setQuery] = useState('');
  const [notice, setNotice] = useState('');
  const totals = useMemo(() => ({
    leads: leads.filter((lead) => lead.status === 'new' || lead.status === 'contacted').length,
    visits: leads.filter((lead) => lead.status === 'scheduled').length,
    quotes: leads.filter((lead) => lead.status === 'quote').length,
    jobs: leads.filter((lead) => lead.status === 'job').length,
    pipeline: leads.filter((lead) => lead.status !== 'job').reduce((sum, lead) => sum + lead.value, 0),
  }), [leads]);
  const filteredLeads = leads.filter((lead) => `${lead.customer} ${lead.project} ${lead.city}`.toLocaleLowerCase('cs-CZ').includes(query.toLocaleLowerCase('cs-CZ')));

  const persistLeads = (next: DemoLead[]) => { setLeads(next); try { window.localStorage.setItem(LEADS_KEY, JSON.stringify(next)); } catch { setNotice('Prohlížeč neumožnil uložit ukázkové změny.'); } };
  const navigate = (next: Screen) => { setScreen(next); setSelected(null); setMobileNav(false); window.history.replaceState({}, '', `/demo#${next}`); };
  const advance = (lead: DemoLead) => {
    const status = nextDemoStatus(lead.status);
    if (!status) return;
    const changed = moveDemoLead(lead, status);
    persistLeads(leads.map((item) => item.id === lead.id ? changed : item));
    setSelected(changed);
    setNotice(status === 'job' ? 'Poptávka byla předána do zakázek.' : `Další krok: ${DEMO_COLUMNS.find((column) => column.id === status)?.label.toLocaleLowerCase('cs-CZ')}.`);
  };
  const reset = () => {
    persistLeads(DEMO_SEED.map((lead) => ({ ...lead })));
    setCompany(DEFAULT_COMPANY);
    setSelected(null);
    setJourneyStep(0);
    try { window.localStorage.setItem(COMPANY_KEY, JSON.stringify(DEFAULT_COMPANY)); } catch { /* Keep the demo usable without storage. */ }
    try { window.localStorage.setItem(JOURNEY_KEY, '0'); } catch { /* Keep the demo usable without storage. */ }
    setNotice('Ukázka byla obnovena do původního stavu.');
  };
  const advanceJourney = () => {
    const next = nextDemoJourneyStep(journeyStep);
    const value = next ?? 0;
    setJourneyStep(value);
    try { window.localStorage.setItem(JOURNEY_KEY, String(value)); } catch { setNotice('Prohlížeč neumožnil uložit ukázkový postup.'); }
  };
  const addLead = (input: { customer: string; project: string; city: string }) => {
    const lead = createDemoLead(input);
    persistLeads([lead, ...leads]);
    setAdding(false);
    setSelected(lead);
    setNotice('Poptávka byla přidána do ukázky.');
  };
  const saveCompany = (next: DemoCompany) => {
    setCompany(next);
    try { window.localStorage.setItem(COMPANY_KEY, JSON.stringify(next)); setNotice('Údaje firmy byly uloženy v tomto prohlížeči.'); }
    catch { setNotice('Prohlížeč neumožnil uložit ukázkové změny.'); }
  };

  return <main className="owner-demo min-h-screen">
    <div className="od-banner"><ShieldCheck size={14} /><span>Ukázkový účet · data zůstávají jen v tomto prohlížeči</span><button onClick={reset}><RotateCcw size={13} /> Obnovit ukázku</button></div>
    <div className="od-app">
      <aside className={`od-sidebar ${mobileNav ? 'od-sidebar-open' : ''}`}>
        <div className="od-brand-row"><a className="od-brand" href="/" aria-label="StavbaCore, úvodní stránka"><span className="od-brand-mark"><HardHat size={20} /></span><span><b>StavbaCore</b><small>Dashboard stavební firmy</small></span></a><button className="od-close-mobile" onClick={() => setMobileNav(false)} aria-label="Zavřít menu"><X size={18} /></button></div>
        <div className="od-company-switch"><span className="od-company-initials">{initials(company.name)}</span><span><b>{company.name}</b><small>{company.area}</small></span><ChevronRight size={15} /></div>
        <span className="od-nav-label">PRACOVNÍ PROSTOR</span>
        <nav className="od-nav" aria-label="Navigace dashboardu">{NAV.map(({ id, label, icon: Icon }) => <button key={id} onClick={() => navigate(id)} className={screen === id ? 'od-nav-active' : ''}><Icon size={17} /><span>{label}</span>{id === 'leads' && totals.leads > 0 && <i>{totals.leads}</i>}</button>)}</nav>
        <div className="od-sidebar-bottom"><div className="od-help"><span><CheckCircle2 size={16} /></span><div><b>Vše přehledně na jednom místě</b><small>Ukázkový pracovní prostor</small></div></div><div className="od-user"><span className="od-user-avatar">MN</span><span><b>Marek Novák</b><small>Majitel firmy</small></span><Settings size={15} /></div></div>
      </aside>
      {mobileNav && <button className="od-scrim" aria-label="Zavřít navigaci" onClick={() => setMobileNav(false)} />}
      <section className="od-main">
        <header className="od-topbar"><div className="od-top-left"><button className="od-menu" aria-label="Otevřít menu" onClick={() => setMobileNav(true)}><Menu size={19} /></button><div className="od-breadcrumb"><span>Pracovní prostor</span><ChevronRight size={13} /><b>{screenTitle(screen)}</b></div></div><div className="od-top-actions"><label className="od-search"><Search size={15} /><input aria-label="Hledat v poptávkách" placeholder="Hledat klienta nebo zakázku" value={query} onFocus={() => navigate('leads')} onChange={(event) => setQuery(event.target.value)} /><kbd>⌘K</kbd></label><button className="od-bell" aria-label="Upozornění" onClick={() => navigate('calendar')}><Bell size={17} /><i /></button><span className="od-presence"><span /> Den v práci</span></div></header>
        <div className="od-content">
          {screen === 'overview' && <Overview company={company} leads={leads} totals={totals} journeyStep={journeyStep} onAdvanceJourney={advanceJourney} onNavigate={navigate} onAdd={() => setAdding(true)} onSelect={setSelected} onAdvance={advance} />}
          {screen === 'leads' && <LeadsPage leads={filteredLeads} onAdd={() => setAdding(true)} onSelect={setSelected} onAdvance={advance} />}
          {screen === 'quotes' && <QuotesPage leads={leads.filter((lead) => lead.status === 'quote')} onSelect={setSelected} onAdvance={advance} />}
          {screen === 'jobs' && <JobsPage leads={leads.filter((lead) => lead.status === 'job')} onSelect={setSelected} />}
          {screen === 'calendar' && <CalendarPage leads={leads} onSelect={setSelected} />}
          {screen === 'clients' && <ClientsPage leads={leads} onSelect={setSelected} />}
          {screen === 'team' && <TeamPage />}
          {screen === 'documents' && <DocumentsPage leads={leads} onNavigate={navigate} />}
          {screen === 'analytics' && <AnalyticsPage leads={leads} totals={totals} />}
          {screen === 'settings' && <SettingsPage company={company} onSave={saveCompany} />}
          <footer className="od-footer"><span>STAVBACORE · UKÁZKOVÝ DASHBOARD</span><span>Pro stavební firmy, které chtějí mít práci pod kontrolou.</span></footer>
        </div>
      </section>
    </div>
    {adding && <AddLeadDialog onClose={() => setAdding(false)} onAdd={addLead} />}
    {selected && <LeadDetail lead={selected} onClose={() => setSelected(null)} onAdvance={() => advance(selected)} />}
    {notice && <div role="status" className="od-toast">{notice}<button aria-label="Zavřít oznámení" onClick={() => setNotice('')}><X size={14} /></button></div>}
  </main>;
}

function initials(name: string) { return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toLocaleUpperCase('cs-CZ') ?? '').join(''); }
function screenTitle(screen: Screen) { return NAV.find((item) => item.id === screen)?.label ?? 'Přehled'; }
function PageHeading({ eyebrow, title, text, action }: { eyebrow: string; title: string; text: string; action?: ReactNode }) { return <div className="od-page-heading"><div><span>{eyebrow}</span><h1>{title}</h1><p>{text}</p></div>{action}</div>; }
function PrimaryButton({ children, onClick }: { children: ReactNode; onClick: () => void }) { return <button className="od-primary" onClick={onClick}>{children}</button>; }

function Overview({ company, leads, totals, journeyStep, onAdvanceJourney, onNavigate, onAdd, onSelect, onAdvance }: { company: DemoCompany; leads: DemoLead[]; totals: { leads: number; visits: number; quotes: number; jobs: number; pipeline: number }; journeyStep: DemoJourneyStep; onAdvanceJourney: () => void; onNavigate: (screen: Screen) => void; onAdd: () => void; onSelect: (lead: DemoLead) => void; onAdvance: (lead: DemoLead) => void }) {
  const todo = leads.filter((lead) => ['new', 'contacted', 'scheduled', 'quote'].includes(lead.status)).sort((a, b) => DEMO_COLUMNS.findIndex((column) => column.id === a.status) - DEMO_COLUMNS.findIndex((column) => column.id === b.status)).slice(0, 4);
  const jobs = leads.filter((lead) => lead.status === 'job');
  const today = new Intl.DateTimeFormat('cs-CZ', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());
  return <>
    <PageHeading eyebrow={`${today.toLocaleUpperCase('cs-CZ')} · ${company.area.toLocaleUpperCase('cs-CZ')}`} title="Dobrý den, Marku" text="Tady je přehled práce, která dnes posune vaši firmu dál." action={<PrimaryButton onClick={onAdd}><CirclePlus size={17} /> Nová poptávka</PrimaryButton>} />
    <GuidedJobStory step={journeyStep} onAdvance={onAdvanceJourney} />
    <div className="od-metrics"><Metric icon={Phone} label="K vyřízení" value={String(totals.leads)} note="nové a k zavolání" tint="orange" onClick={() => onNavigate('leads')} /><Metric icon={CalendarCheck2} label="Zaměření" value={String(totals.visits)} note="domluvené návštěvy" tint="blue" onClick={() => onNavigate('calendar')} /><Metric icon={FileText} label="Nabídky čekají" value={String(totals.quotes)} note={money.format(leads.filter((lead) => lead.status === 'quote').reduce((sum, lead) => sum + lead.value, 0)) + ' v přípravě'} tint="violet" onClick={() => onNavigate('quotes')} /><Metric icon={HardHat} label="Probíhající zakázky" value={String(totals.jobs)} note="předané týmu" tint="green" onClick={() => onNavigate('jobs')} /></div>
    <div className="od-overview-grid"><section className="od-card od-todo-card"><CardHeading title="Co dnes vyřídit" subtitle="Nejdůležitější další kroky" action={<button className="od-link" onClick={() => onNavigate('leads')}>Všechny poptávky <ArrowRight size={14} /></button>} />{todo.length ? <div className="od-todo-list">{todo.map((lead) => <TodoRow key={lead.id} lead={lead} onSelect={() => onSelect(lead)} onAdvance={() => onAdvance(lead)} />)}</div> : <EmptyState icon={CheckCircle2} title="Všechno vyřízeno" text="Nové úkoly se ukážou tady." />}</section>
      <section className="od-card od-day-card"><CardHeading title="Nejbližší termíny" subtitle="Zaměření a práce vašeho týmu" action={<button className="od-icon-link" aria-label="Otevřít kalendář" onClick={() => onNavigate('calendar')}><ArrowRight size={15} /></button>} /><div className="od-agenda">{leads.filter((lead) => lead.status === 'scheduled').map((lead) => <button className="od-agenda-row" key={lead.id} onClick={() => onSelect(lead)}><time><b>10:30</b><small>ZÍTRA</small></time><span className="od-agenda-line" /><span className="od-agenda-copy"><b>Zaměření · {lead.project}</b><small>{lead.customer} · {lead.city}</small></span><ChevronRight size={15} /></button>)}{jobs.map((lead) => <button className="od-agenda-row" key={lead.id} onClick={() => onSelect(lead)}><time><b>13:00</b><small>DNES</small></time><span className="od-agenda-line od-line-green" /><span className="od-agenda-copy"><b>Kontrola zakázky · {lead.project}</b><small>{lead.customer} · {lead.city}</small></span><ChevronRight size={15} /></button>)}{todo.filter((lead) => lead.status === 'new').map((lead) => <button className="od-agenda-row" key={lead.id} onClick={() => onSelect(lead)}><time><b>15:00</b><small>DNES</small></time><span className="od-agenda-line od-line-orange" /><span className="od-agenda-copy"><b>Ozvat se · {lead.project}</b><small>{lead.customer} · {lead.city}</small></span><ChevronRight size={15} /></button>)}</div><button className="od-calendar-link" onClick={() => onNavigate('calendar')}><CalendarDays size={15} /> Otevřít týdenní kalendář <ArrowRight size={13} /></button></section>
    </div>
    <div className="od-bottom-grid"><section className="od-card"><CardHeading title="Zakázky v běhu" subtitle="Práce předaná realizačnímu týmu" action={<button className="od-link" onClick={() => onNavigate('jobs')}>Všechny zakázky <ArrowRight size={14} /></button>} />{jobs.length ? <div className="od-job-list">{jobs.slice(0, 3).map((lead) => <JobRow key={lead.id} lead={lead} onClick={() => onSelect(lead)} />)}</div> : <EmptyState icon={HardHat} title="Zatím žádné zakázky" text="Potvrzené nabídky se objeví po předání do realizace." />}</section><section className="od-card od-pipeline-card"><CardHeading title="Obchodní přehled" subtitle="Od prvního kontaktu k potvrzené práci" action={<button className="od-icon-link" aria-label="Otevřít poptávky" onClick={() => onNavigate('leads')}><ArrowRight size={15} /></button>} /><div className="od-funnel">{DEMO_COLUMNS.map((column) => { const count = leads.filter((lead) => lead.status === column.id).length; const max = Math.max(...DEMO_COLUMNS.map((item) => leads.filter((lead) => lead.status === item.id).length), 1); return <button key={column.id} className="od-funnel-row" onClick={() => onNavigate(column.id === 'quote' ? 'quotes' : column.id === 'job' ? 'jobs' : 'leads')}><span>{column.label}</span><span className="od-funnel-track"><i style={{ width: `${Math.max(count / max * 100, count ? 16 : 0)}%` }} /></span><b>{count}</b></button>; })}</div><div className="od-pipeline-value"><span>Hodnota rozpracovaných případů</span><b>{money.format(totals.pipeline)}</b></div></section></div>
  </>;
}

function GuidedJobStory({ step, onAdvance }: { step: DemoJourneyStep; onAdvance: () => void }) {
  const nextLabel = nextDemoJourneyStep(step) === null ? 'Spustit ukázku znovu' : ['Zaznamenat první reakci', 'Předat přijatou nabídku do realizace', 'Zapsat ukázkové náklady', 'Zobrazit výsledek'][step];
  const titles = ['Nová poptávka je zachycená', 'Nabídka je přijatá', 'Náklady z realizace', 'Majitel vidí výsledek'];
  const descriptions = [
    'Rodina Nových poptává rekonstrukci koupelny. Projděte si modelový postup od prvního kontaktu.',
    'Zákazník přijal nabídku. Případ se předává z obchodu realizačnímu týmu.',
    'Tým zapsal materiál a práci. Náklady jsou v této ukázce pouze fiktivní.',
    'Jedna zakázka, jeden přehled: tržba, náklady a orientační výsledek pro majitele.',
  ];
  const amount = step === 2 ? DEMO_FIELD_COSTS : DEMO_CONTRACT_VALUE;
  return <section className="od-story-card" aria-label="Ukázkový průchod zakázky">
    <div className="od-story-head"><div><span>UKÁZKOVÝ PRŮCHOD · FIKTIVNÍ DATA</span><h2>{titles[step]}</h2><p>{descriptions[step]}</p></div><span className="od-story-value"><small>{step === 2 ? 'VZOROVÉ NÁKLADY' : 'VZOROVÁ NABÍDKA · BEZ DPH'}</small><b>{money.format(amount)}</b></span></div>
    <div className="od-story-steps" aria-label={`Krok ${step + 1} ze 4`}>
      {DEMO_JOURNEY_STEPS.map((label, index) => <div className={index === step ? 'od-story-current' : index < step ? 'od-story-done' : ''} key={label}><span>{index < step ? <Check size={12} /> : index + 1}</span><b>{label}</b></div>)}
    </div>
    <div className="od-story-foot"><span>{step === 3 ? <><b>{money.format(DEMO_CONTRACT_VALUE - DEMO_FIELD_COSTS)}</b> hrubý výsledek · marže <b>{percent.format(margin)} %</b><small>Před režií a daní. Jde o výpočet z fiktivních dat, ne účetní výkaz.</small></> : 'Všechna ukázková data se ukládají jen v tomto prohlížeči.'}</span><button onClick={onAdvance}>{nextLabel}<ArrowRight size={14} /></button></div>
  </section>;
}

function Metric({ icon: Icon, label, value, note, tint, onClick }: { icon: typeof House; label: string; value: string; note: string; tint: string; onClick: () => void }) { return <button className="od-metric" onClick={onClick}><span className={`od-metric-icon od-tint-${tint}`}><Icon size={18} /></span><span className="od-metric-label">{label}</span><b className="od-metric-value">{value}</b><small>{note}</small><ArrowUpRight className="od-metric-arrow" size={14} /></button>; }
function CardHeading({ title, subtitle, action }: { title: string; subtitle: string; action?: React.ReactNode }) { return <header className="od-card-heading"><div><h2>{title}</h2><p>{subtitle}</p></div>{action}</header>; }
function TodoRow({ lead, onSelect, onAdvance }: { lead: DemoLead; onSelect: () => void; onAdvance: () => void }) { return <article className="od-todo-row"><button className="od-todo-main" onClick={onSelect}><span className={`od-priority od-priority-${lead.status}`}><CircleDot size={15} /></span><span className="od-todo-copy"><b>{nextTask(lead.status)} · {lead.project}</b><small>{lead.customer} · {lead.city}</small></span><span className="od-todo-value">{lead.value ? money.format(lead.value) : 'Doplnit cenu'}</span></button><button className="od-row-action" onClick={onAdvance}>{lead.status === 'quote' ? 'Předat do zakázky' : 'Další krok'} <ArrowRight size={13} /></button></article>; }
function JobRow({ lead, onClick }: { lead: DemoLead; onClick: () => void }) { return <button className="od-job-row" onClick={onClick}><span className="od-job-icon"><HardHat size={17} /></span><span className="od-job-copy"><b>{lead.project}</b><small>{lead.customer} · {lead.city}</small></span><span className="od-job-progress"><i /><i /><i className="od-step-current" /><i /></span><span className="od-job-status">Probíhá</span><ChevronRight size={15} /></button>; }
function EmptyState({ icon: Icon, title, text }: { icon: typeof House; title: string; text: string }) { return <div className="od-empty"><Icon size={21} /><b>{title}</b><span>{text}</span></div>; }
function nextTask(status: DemoStatus) { return ({ new: 'Ozvat se zákazníkovi', contacted: 'Domluvit zaměření', scheduled: 'Připravit cenovou nabídku', quote: 'Odeslat nabídku', job: 'Zakázka' })[status]; }

function LeadsPage({ leads, onAdd, onSelect, onAdvance }: { leads: DemoLead[]; onAdd: () => void; onSelect: (lead: DemoLead) => void; onAdvance: (lead: DemoLead) => void }) { return <><PageHeading eyebrow="OBCHOD" title="Poptávky" text="Každá poptávka má jasný další krok. Nenechte zákazníka čekat na odpověď." action={<PrimaryButton onClick={onAdd}><CirclePlus size={17} /> Nová poptávka</PrimaryButton>} /><div className="od-board">{DEMO_COLUMNS.map((column) => { const items = leads.filter((lead) => lead.status === column.id); return <section className="od-board-column" key={column.id}><header><h2>{column.label}</h2><span>{items.length}</span></header>{items.map((lead) => <LeadCard key={lead.id} lead={lead} onSelect={() => onSelect(lead)} onAdvance={() => onAdvance(lead)} />)}{!items.length && <p className="od-column-empty">Zatím prázdno</p>}</section>; })}</div><p className="od-helper">Vyzkoušejte průchod od prvního kontaktu přes zaměření a nabídku až k zakázce.</p></>; }
function LeadCard({ lead, onSelect, onAdvance }: { lead: DemoLead; onSelect: () => void; onAdvance: () => void }) { const next = nextDemoStatus(lead.status); return <article className="od-lead-card"><button className="od-lead-content" onClick={onSelect}><span className="od-lead-city"><MapPin size={12} /> {lead.city}</span><b>{lead.project}</b><small>{lead.customer}</small><strong>{lead.value ? money.format(lead.value) : 'Cena k doplnění'}</strong></button>{next && <button className="od-next-button" onClick={onAdvance}>{next === 'job' ? 'Předat do zakázek' : `Další krok · ${DEMO_COLUMNS.find((column) => column.id === next)?.label}`} <ArrowRight size={13} /></button>}</article>; }

function QuotesPage({ leads, onSelect, onAdvance }: { leads: DemoLead[]; onSelect: (lead: DemoLead) => void; onAdvance: (lead: DemoLead) => void }) { return <><PageHeading eyebrow="OBCHOD" title="Cenové nabídky" text="Nabídky, které připravujete nebo čekají na rozhodnutí zákazníka." action={<span className="od-count-pill">{leads.length} čekající</span>} />{leads.length ? <section className="od-card od-table-card"><div className="od-table-head"><span>ZÁKAZNÍK A ROZSAH</span><span>LOKALITA</span><span>HODNOTA</span><span>DALŠÍ KROK</span></div>{leads.map((lead) => <div className="od-table-row" key={lead.id}><button className="od-table-project" onClick={() => onSelect(lead)}><b>{lead.project}</b><small>{lead.customer}</small></button><span>{lead.city}</span><b>{money.format(lead.value)}</b><button className="od-inline-action" onClick={() => onAdvance(lead)}>Předat do zakázek <ArrowRight size={13} /></button></div>)}</section> : <section className="od-card"><EmptyState icon={FileText} title="Všechny nabídky jsou vyřízené" text="Nabídku připravíte z detailu poptávky po zaměření." /></section>}</>; }

function JobsPage({ leads, onSelect }: { leads: DemoLead[]; onSelect: (lead: DemoLead) => void }) { return <><PageHeading eyebrow="REALIZACE" title="Zakázky" text="Přehled práce předané vašemu týmu a nejbližších milníků." action={<span className="od-count-pill">{leads.length} v realizaci</span>} />{leads.length ? <div className="od-job-grid">{leads.map((lead) => <article className="od-card od-job-detail" key={lead.id}><div className="od-job-detail-head"><span className="od-job-icon"><HardHat size={18} /></span><span className="od-status-chip">Probíhá</span></div><button className="od-job-title" onClick={() => onSelect(lead)}><h2>{lead.project}</h2><span>{lead.customer}</span></button><p><MapPin size={14} /> {lead.city}</p><div className="od-job-detail-progress"><span><b>Postup realizace</b><small>Další kontrola dnes ve 13:00</small></span><strong>60 %</strong><div><i /></div></div><button className="od-inline-action" onClick={() => onSelect(lead)}>Otevřít zakázku <ArrowRight size={13} /></button></article>)}</div> : <section className="od-card"><EmptyState icon={HardHat} title="Zatím žádná zakázka v realizaci" text="Přijaté nabídky předáte sem jedním krokem." /></section>}</>; }

function CalendarPage({ leads, onSelect }: { leads: DemoLead[]; onSelect: (lead: DemoLead) => void }) { const scheduled = leads.filter((lead) => lead.status === 'scheduled' || lead.status === 'job' || lead.status === 'new'); const today = new Date(); const monday = new Date(today); monday.setDate(today.getDate() - (today.getDay() + 6) % 7); const week = Array.from({ length: 7 }, (_, index) => { const day = new Date(monday); day.setDate(monday.getDate() + index); return { label: new Intl.DateTimeFormat('cs-CZ', { weekday: 'short' }).format(day).replace('.', '').toLocaleUpperCase('cs-CZ'), date: day.getDate(), isToday: day.toDateString() === today.toDateString() }; }); return <><PageHeading eyebrow="PLÁNOVÁNÍ" title="Kalendář" text="Zaměření, telefonáty a práce realizačního týmu na jednom místě." action={<span className="od-count-pill">Tento týden</span>} /><section className="od-card od-calendar-card"><div className="od-week-strip">{week.map((day) => <div className={day.isToday ? 'od-today' : ''} key={`${day.label}-${day.date}`}><small>{day.label}</small><b>{day.date}</b></div>)}</div><div className="od-calendar-items">{scheduled.map((lead, index) => <button className="od-calendar-event" key={lead.id} onClick={() => onSelect(lead)}><time>{lead.status === 'scheduled' ? 'Zítra · 10:30' : lead.status === 'job' ? 'Dnes · 13:00' : 'Dnes · 15:00'}</time><span className={`od-event-mark od-event-${index % 3}`} /><span><b>{lead.status === 'scheduled' ? 'Zaměření' : lead.status === 'job' ? 'Kontrola zakázky' : 'Zavolat zákazníkovi'} · {lead.project}</b><small>{lead.customer} · {lead.city}</small></span><ChevronRight size={15} /></button>)}</div></section><p className="od-helper">Termíny v kalendáři jsou ukázkové. Ve skutečném účtu je vidí jen členové příslušné firmy.</p></>; }

function ClientsPage({ leads, onSelect }: { leads: DemoLead[]; onSelect: (lead: DemoLead) => void }) { return <><PageHeading eyebrow="KLIENTI" title="Klienti a zakázky" text="Mějte přehled, kdo čeká na odpověď a jaká práce se pro něj připravuje." /><section className="od-card od-client-list">{leads.map((lead) => <button className="od-client-row" key={lead.id} onClick={() => onSelect(lead)}><span className="od-client-avatar">{initials(lead.customer)}</span><span className="od-client-info"><b>{lead.customer}</b><small>{lead.city} · {lead.project}</small></span><span className={`od-client-stage od-stage-${lead.status}`}>{DEMO_COLUMNS.find((column) => column.id === lead.status)?.label}</span><b className="od-client-value">{lead.value ? money.format(lead.value) : 'Doplnit cenu'}</b><ChevronRight size={15} /></button>)}</section></>; }

function TeamPage() { return <><PageHeading eyebrow="MOJE FIRMA" title="Tým" text="Lidé a role v ukázkové stavební firmě." /><div className="od-team-grid">{TEAM.map((member) => <article className="od-card od-team-card" key={member.initials}><span className={`od-team-avatar od-avatar-${member.color}`}>{member.initials}</span><h2>{member.name}</h2><p>{member.role}</p><span className="od-status-chip">Aktivní v ukázce</span></article>)}</div><p className="od-helper">Ukázkové role: majitel spravuje firmu, zaměstnanec vidí přidělenou práci.</p></>; }

function DocumentsPage({ leads, onNavigate }: { leads: DemoLead[]; onNavigate: (screen: Screen) => void }) { return <><PageHeading eyebrow="FIREMNÍ DOKUMENTY" title="Dokumenty" text="Nabídky a podklady navázané na práci vaší firmy." /><section className="od-card od-table-card"><div className="od-table-head od-document-head"><span>DOKUMENT</span><span>KLIENT</span><span>STAV</span><span></span></div>{leads.filter((lead) => lead.status === 'quote' || lead.status === 'job').map((lead) => <div className="od-table-row od-document-row" key={lead.id}><span className="od-document-name"><span><FileText size={16} /></span><b>{lead.status === 'job' ? 'Předávací protokol' : 'Cenová nabídka'}<small>{lead.project} · ukázkový dokument</small></b></span><span>{lead.customer}</span><span className="od-status-chip">Náhled</span><button className="od-inline-action" onClick={() => onNavigate(lead.status === 'job' ? 'jobs' : 'quotes')}>Otevřít <ArrowRight size={13} /></button></div>)}</section><p className="od-helper">Dokumenty v této ukázce jsou pouze názorné. Neobsahují podpisy ani data skutečných klientů.</p></>; }

function AnalyticsPage({ leads, totals }: { leads: DemoLead[]; totals: { leads: number; visits: number; quotes: number; jobs: number; pipeline: number } }) { return <><PageHeading eyebrow="FIRMA V ČÍSLECH" title="Přehled výsledků" text="Orientační pohled na poptávky, nabídky a hodnotu rozpracované práce." /><div className="od-metrics od-analytics-metrics"><StaticMetric icon={ClipboardList} label="Poptávky" value={String(leads.length)} note="ve fiktivním přehledu" /><StaticMetric icon={Banknote} label="Rozpracovaná hodnota" value={money.format(totals.pipeline)} note="orientační hodnota zakázek" /><StaticMetric icon={CalendarCheck2} label="Čeká na zaměření" value={String(totals.visits)} note="domluvené schůzky" /><StaticMetric icon={HardHat} label="Předáno do realizace" value={String(totals.jobs)} note="ukázkové zakázky" /></div><section className="od-card od-analytics-card"><CardHeading title="Poptávky podle dalšího kroku" subtitle="Kde se právě nachází rozpracovaná práce" /><div className="od-analytics-bars">{DEMO_COLUMNS.map((column) => { const count = leads.filter((lead) => lead.status === column.id).length; const width = Math.max(5, Math.round(count / Math.max(leads.length, 1) * 100)); return <div key={column.id}><span>{column.label}</span><div><i style={{ width: `${width}%` }} /></div><b>{count}</b></div>; })}</div><p className="od-helper">Čísla vycházejí pouze z fiktivních dat v tomto prohlížeči, nikoli z produkční firmy.</p></section></>; }
function StaticMetric({ icon: Icon, label, value, note }: { icon: typeof House; label: string; value: string; note: string }) { return <div className="od-metric od-static-metric"><span className="od-metric-icon od-tint-orange"><Icon size={18} /></span><span className="od-metric-label">{label}</span><b className="od-metric-value">{value}</b><small>{note}</small></div>; }

function SettingsPage({ company, onSave }: { company: DemoCompany; onSave: (company: DemoCompany) => void }) { const [name, setName] = useState(company.name); const [area, setArea] = useState(company.area); return <><PageHeading eyebrow="MOJE FIRMA" title="Nastavení firmy" text="Upravte údaje, které se zobrazují v pracovním prostoru." /><form className="od-card od-settings-form" onSubmit={(event: FormEvent) => { event.preventDefault(); if (name.trim() && area.trim()) onSave({ name: name.trim(), area: area.trim() }); }}><div><h2>Základní údaje</h2><p>Tato úprava platí pouze pro ukázku v tomto prohlížeči.</p></div><label>Název firmy<input required maxLength={80} value={name} onChange={(event) => setName(event.target.value)} /></label><label>Oblast působení<input required maxLength={80} value={area} onChange={(event) => setArea(event.target.value)} /></label><button className="od-primary"><Check size={15} /> Uložit údaje firmy</button></form><section className="od-card od-role-note"><ShieldCheck size={18} /><span><b>Vlastní pracovní prostor</b><small>Ukázka představuje dashboard jedné stavební firmy. Produkční data firem se v ní nezobrazují.</small></span></section></>; }

function AddLeadDialog({ onClose, onAdd }: { onClose: () => void; onAdd: (input: { customer: string; project: string; city: string }) => void }) { const [customer, setCustomer] = useState(''); const [project, setProject] = useState(''); const [city, setCity] = useState(''); const valid = customer.trim() && project.trim() && city.trim(); return <div className="od-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><form className="od-modal" onSubmit={(event) => { event.preventDefault(); if (valid) onAdd({ customer, project, city }); }}><header><div><span>NOVÝ OBCHODNÍ PŘÍPAD</span><h2>Přidat poptávku</h2></div><button type="button" onClick={onClose} aria-label="Zavřít formulář"><X size={18} /></button></header><p>Vyplňte základní údaje. Jde o smyšlený záznam, který se uloží jen v tomto prohlížeči.</p><label>Zákazník nebo firma<input autoFocus required maxLength={80} value={customer} onChange={(event) => setCustomer(event.target.value)} placeholder="např. Rodina Novákových" /></label><label>Co se má postavit nebo opravit<input required maxLength={100} value={project} onChange={(event) => setProject(event.target.value)} placeholder="např. Rekonstrukce koupelny" /></label><label>Město nebo oblast<input required maxLength={60} value={city} onChange={(event) => setCity(event.target.value)} placeholder="např. Brno-venkov" /></label><div className="od-modal-actions"><button type="button" className="od-secondary" onClick={onClose}>Zrušit</button><button disabled={!valid} className="od-primary"><CirclePlus size={15} /> Přidat poptávku</button></div></form></div>; }

function LeadDetail({ lead, onClose, onAdvance }: { lead: DemoLead; onClose: () => void; onAdvance: () => void }) { const status = DEMO_COLUMNS.find((column) => column.id === lead.status)?.label; const next = nextDemoStatus(lead.status); return <div className="od-modal-backdrop od-drawer-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><aside role="dialog" aria-modal="true" aria-labelledby="od-detail-title" className="od-drawer"><button className="od-drawer-close" onClick={onClose}><X size={16} /> Zavřít detail</button><span className="od-detail-status">{status}</span><h2 id="od-detail-title">{lead.project}</h2><p className="od-detail-customer">{lead.customer} · {lead.city}</p><div className="od-detail-value"><small>Orientační hodnota</small><b>{lead.value ? money.format(lead.value) : 'Doplnit po zaměření'}</b></div><div className="od-next-step"><span className="od-next-icon"><Clock3 size={16} /></span><div><b>Další krok</b><p>{lead.status === 'new' ? 'Ozvat se zákazníkovi a domluvit prohlídku.' : lead.status === 'contacted' ? 'Domluvit termín zaměření.' : lead.status === 'scheduled' ? 'Po zaměření připravit cenovou nabídku.' : lead.status === 'quote' ? 'Po přijetí nabídky předat práci do realizace.' : 'Práce je předaná realizačnímu týmu.'}</p></div></div><h3>Průběh poptávky</h3><div className="od-timeline">{DEMO_COLUMNS.map((column, index) => { const current = DEMO_COLUMNS.findIndex((item) => item.id === lead.status); return <div className={index <= current ? 'od-timeline-done' : ''} key={column.id}><span>{index < current ? <Check size={11} /> : index + 1}</span><b>{column.label}</b></div>; })}</div>{next && <button className="od-primary od-detail-action" onClick={onAdvance}>{next === 'job' ? 'Předat do zakázek' : `Posunout dál · ${DEMO_COLUMNS.find((column) => column.id === next)?.label}`} <ArrowRight size={15} /></button>}<p className="od-detail-footnote">Tento záznam je fiktivní a neobsahuje telefon, e-mail ani údaje skutečných klientů.</p></aside></div>; }
