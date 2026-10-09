import { useMemo, useState } from 'react';
import { BarChart3, Building2, ChevronRight, ClipboardList, Eye, HardHat, House, Menu, Search, ShieldCheck, Users, X } from 'lucide-react';
import { DEMO_COLUMNS, DEMO_SEED, type DemoLead } from './demoState';

type Screen = 'overview' | 'kanban';
const money = new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: 'CZK', maximumFractionDigits: 0 });
const compactNumber = new Intl.NumberFormat('cs-CZ', { notation: 'compact', maximumFractionDigits: 1 });

export function PublicDemoWorkspace() {
  const [screen, setScreen] = useState<Screen>('overview');
  const [selected, setSelected] = useState<DemoLead | null>(null);
  const [query, setQuery] = useState('');
  const [mobileNav, setMobileNav] = useState(false);
  const leads = DEMO_SEED;
  const visible = useMemo(() => leads.filter((lead) => `${lead.customer} ${lead.project} ${lead.city}`.toLocaleLowerCase('cs-CZ').includes(query.toLocaleLowerCase('cs-CZ'))), [query]);
  const pipeline = leads.filter((lead) => lead.status !== 'job').reduce((sum, lead) => sum + lead.value, 0);

  const navigate = (next: Screen) => { setScreen(next); setSelected(null); setMobileNav(false); window.history.replaceState({}, '', `/demo#${next}`); };
  return <main className="owner-demo min-h-screen">
    <div className="od-banner"><ShieldCheck size={14} /><span>Veřejné demo · pouze pro čtení · výhradně syntetická data</span><a href="/login">Přejít k přihlášení</a></div>
    <div className="od-app">
      <aside className={`od-sidebar ${mobileNav ? 'od-sidebar-open' : ''}`}>
        <div className="od-brand-row"><a className="od-brand" href="/" aria-label="StavbaFlow"><span className="od-brand-mark"><HardHat size={20} /></span><span><b>StavbaFlow</b><small>Dashboard stavební firmy</small></span></a><button className="od-close-mobile" onClick={() => setMobileNav(false)} aria-label="Zavřít menu"><X size={18} /></button></div>
        <div className="od-company-switch"><span className="od-company-initials">NS</span><span><b>Novákova stavební firma</b><small>Fiktivní ukázka</small></span><ChevronRight size={15} /></div>
        <span className="od-nav-label">UKÁZKOVÝ PROSTOR</span>
        <nav className="od-nav" aria-label="Navigace dema"><button onClick={() => navigate('overview')} className={screen === 'overview' ? 'od-nav-active' : ''}><House size={17} />Přehled</button><button onClick={() => navigate('kanban')} className={screen === 'kanban' ? 'od-nav-active' : ''}><ClipboardList size={17} />Poptávky a zakázky</button></nav>
        <div className="od-sidebar-bottom"><div className="od-help"><span><Eye size={16} /></span><div><b>Režim náhledu</b><small>Bez ukládání a připojení k databázi</small></div></div><div className="od-user"><span className="od-user-avatar">MN</span><span><b>Marek Novák</b><small>Fiktivní majitel</small></span></div></div>
      </aside>
      {mobileNav && <button className="od-scrim" aria-label="Zavřít navigaci" onClick={() => setMobileNav(false)} />}
      <section className="od-main">
        <header className="od-topbar"><div className="od-top-left"><button className="od-menu" aria-label="Otevřít menu" onClick={() => setMobileNav(true)}><Menu size={19} /></button><div className="od-breadcrumb"><span>Veřejné demo</span><ChevronRight size={13} /><b>{screen === 'overview' ? 'Přehled' : 'Poptávky a zakázky'}</b></div></div><label className="od-search"><Search size={15} /><input aria-label="Hledat v ukázce" placeholder="Hledat fiktivní zakázku" value={query} onFocus={() => navigate('kanban')} onChange={(event) => setQuery(event.target.value)} /></label></header>
        <div className="od-content">
          {screen === 'overview' ? <Overview leads={leads} pipeline={pipeline} onOpen={setSelected} onKanban={() => navigate('kanban')} /> : <Kanban leads={visible} onOpen={setSelected} />}
          <footer className="od-footer"><span>STAVBAFLOW · VEŘEJNÉ DEMO</span><span>Ukázka nikdy nečte data skutečných firem.</span></footer>
        </div>
      </section>
    </div>
    {selected && <Detail lead={selected} onClose={() => setSelected(null)} />}
  </main>;
}

function Overview({ leads, pipeline, onOpen, onKanban }: { leads: DemoLead[]; pipeline: number; onOpen: (lead: DemoLead) => void; onKanban: () => void }) {
  const jobs = leads.filter((lead) => lead.status === 'job');
  return <><div className="od-page-heading"><div><span>FIKTIVNÍ FIRMA · BRNO</span><h1>Dobrý den, Marku</h1><p>Rychlý přehled poptávek, nabídek a práce předané týmu.</p></div><button className="od-primary" onClick={onKanban}>Otevřít Kanban</button></div><div className="od-metrics"><Metric icon={ClipboardList} label="Poptávky" value={String(leads.length)} note="ve statické ukázce" /><Metric icon={Building2} label="Rozpracováno" value={compactNumber.format(pipeline)} note="Kč · orientačně" /><Metric icon={HardHat} label="Zakázky v běhu" value={String(jobs.length)} note="předané týmu" /><Metric icon={Users} label="Členové týmu" value="3" note="fiktivní role" /></div><div className="od-overview-grid"><section className="od-card"><div className="od-card-heading"><div><h2>Co dnes vyřídit</h2><p>Nejdůležitější další kroky</p></div></div><div className="od-todo-list">{leads.slice(0, 4).map((lead) => <button className="od-todo-row" key={lead.id} onClick={() => onOpen(lead)}><span className="od-todo-icon"><ClipboardList size={16} /></span><span><b>{lead.project}</b><small>{lead.customer} · {lead.city}</small></span><ChevronRight size={15} /></button>)}</div></section><section className="od-card"><div className="od-card-heading"><div><h2>Tok práce</h2><p>Od nové poptávky po realizaci</p></div></div><div className="od-funnel">{DEMO_COLUMNS.map((column) => { const count = leads.filter((lead) => lead.status === column.id).length; return <button key={column.id} className="od-funnel-row" onClick={onKanban}><span>{column.label}</span><span className="od-funnel-track"><i style={{ width: `${Math.max(count * 36, 8)}%` }} /></span><b>{count}</b></button>; })}</div></section></div></>;
}

function Metric({ icon: Icon, label, value, note }: { icon: typeof House; label: string; value: string; note: string }) { return <div className="od-metric od-static-metric"><span className="od-metric-icon od-tint-orange"><Icon size={18} /></span><span className="od-metric-label">{label}</span><b className="od-metric-value">{value}</b><small>{note}</small></div>; }

function Kanban({ leads, onOpen }: { leads: DemoLead[]; onOpen: (lead: DemoLead) => void }) { return <><div className="od-page-heading"><div><span>READ-ONLY KANBAN</span><h1>Poptávky a zakázky</h1><p>Karty lze otevřít. Jejich stav ani obsah v tomto veřejném demu nelze změnit.</p></div><span className="od-count-pill"><Eye size={14} /> Pouze náhled</span></div><div className="od-board">{DEMO_COLUMNS.map((column) => <section className="od-board-column" key={column.id}><header><h2>{column.label}</h2><b>{leads.filter((lead) => lead.status === column.id).length}</b></header><div>{leads.filter((lead) => lead.status === column.id).map((lead) => <button className="od-lead-card" key={lead.id} onClick={() => onOpen(lead)}><span className="od-lead-updated">{lead.updated}</span><h3>{lead.project}</h3><p>{lead.customer}</p><small>{lead.city}</small><b>{lead.value ? money.format(lead.value) : 'Cena zatím neurčena'}</b></button>)}</div></section>)}</div></>; }

function Detail({ lead, onClose }: { lead: DemoLead; onClose: () => void }) { return <div className="od-modal-backdrop od-drawer-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><aside role="dialog" aria-modal="true" aria-labelledby="demo-detail-title" className="od-drawer"><button className="od-drawer-close" onClick={onClose}><X size={16} /> Zavřít detail</button><span className="od-detail-status">{DEMO_COLUMNS.find((column) => column.id === lead.status)?.label}</span><h2 id="demo-detail-title">{lead.project}</h2><p className="od-detail-customer">{lead.customer} · {lead.city}</p><div className="od-detail-value"><small>Orientační hodnota</small><b>{money.format(lead.value)}</b></div><section className="od-role-note"><ShieldCheck size={18} /><span><b>Pouze pro čtení</b><small>Jde o syntetický záznam. Demo nemá spojení s produkčními účty ani zákaznickou databází.</small></span></section></aside></div>; }
