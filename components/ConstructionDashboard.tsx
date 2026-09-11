import React, { useState, useMemo } from 'react';
import {
  Building2,
  HardDrive,
  Database,
  Shield,
  UserCog,
  Hammer,
  CheckCircle2,
  Clock,
  Plus,
  Phone,
  MapPin,
  Camera,
  Mic,
  TrendingUp,
  Percent,
  ChevronRight,
  Search,
  ArrowRight,
  FileText,
  RefreshCw,
  AlertCircle,
  Calendar,
  X,
  Smartphone,
  Check,
  DollarSign,
  Briefcase,
  Coins
} from 'lucide-react';

/* ==========================================================================
   HYBRIDNÍ DATOVÁ ABSTRAKCE (SYNOLOGY NAS ON-PREMISE VS. CLOUD POSTGRESQL)
   --------------------------------------------------------------------------
   Architektura počítá s tím, že primární citlivá stavební data (rozpočty, smlouvy,
   fotodokumentace v plném rozlišení) mohou běžet přímo na lokálním NAS serveru
   ve firemní síti přes REST API / PostgreSQL, zatímco veřejné poptávky
   a mobilní synchronizace mistrů v terénu využívají zabezpečenou replikaci.
   ========================================================================== */

export type UserRole = 'owner' | 'admin' | 'worker';

export type ConstructionStage = 'inquiry' | 'survey' | 'rough' | 'finishing' | 'handed_over';

export interface MilestoneItem {
  id: string;
  title: string;
  completed: boolean;
  timeSlot?: string;
  trade?: string;
}

export interface SitePhoto {
  id: string;
  url: string;
  caption: string;
  timestamp: string;
  author: string;
}

export interface VoiceLog {
  id: string;
  transcript: string;
  duration: string;
  timestamp: string;
  author: string;
}

export interface ConstructionProject {
  id: string;
  code: string;
  name: string;
  clientName: string;
  clientPhone: string;
  clientEmail?: string;
  address: string;
  city: string;
  stage: ConstructionStage;
  budgetTotal: number;       // Celkový rozpočet (Kč)
  costsEstimated: number;    // Plánované přímé náklady (Kč)
  costsActual: number;       // Skutečně prostavěno (Kč)
  marginPercent: number;     // Hrubá marže v %
  startDate: string;
  targetDate: string;
  assignedManager: string;   // Stavbyvedoucí
  assignedWorker: string;    // Mistr / vedoucí party
  workerPhone: string;
  description: string;
  priority: 'low' | 'normal' | 'high' | 'critical';
  milestones: MilestoneItem[];
  photos: SitePhoto[];
  voiceLogs: VoiceLog[];
}

// Počáteční realistická stavební data pro český trh (rekonstrukce a rodinné domy)
const INITIAL_PROJECTS: ConstructionProject[] = [
  {
    id: 'stavba-01',
    code: 'STV-2026-004',
    name: 'Kompletní rekonstrukce vily s přístavbou',
    clientName: 'Ing. arch. Tomáš Kopecký',
    clientPhone: '+420 603 456 789',
    clientEmail: 'kopecky.arch@gmail.com',
    address: 'U Dubu 142/8',
    city: 'Říčany u Prahy',
    stage: 'rough',
    budgetTotal: 4850000,
    costsEstimated: 3650000,
    costsActual: 1980000,
    marginPercent: 24.7,
    startDate: '2026-02-15',
    targetDate: '2026-09-30',
    assignedManager: 'Ing. Martin Dvořák',
    assignedWorker: 'Petr Novotný (Mistr tesař & zedník)',
    workerPhone: '+420 777 890 123',
    description: 'Generální rekonstrukce dvoupatrového domu z 30. let: nová střecha, izolace základů, vyzdění nových příček a rozvody instalací.',
    priority: 'high',
    milestones: [
      { id: 'm-1', title: 'Betonáž základových pasů pro přístavbu garáže', completed: true, timeSlot: '07:30 - 11:00', trade: 'Betonáři' },
      { id: 'm-2', title: 'Hydroizolace spodní stavby (Bitagit 2x pás)', completed: true, timeSlot: '11:30 - 14:00', trade: 'Izolatéři' },
      { id: 'm-3', title: 'Vyzdění nosné příčky Porotherm 30 Profi', completed: false, timeSlot: '14:00 - 17:30', trade: 'Zedníci' },
      { id: 'm-4', title: 'Příprava ocelových překladů pro francouzské okno', completed: false, timeSlot: 'Zítra', trade: 'Zámečníci' },
    ],
    photos: [
      {
        id: 'p-1',
        url: 'https://images.unsplash.com/photo-1541888946425-d0fbb186156f?auto=format&fit=crop&w=800&q=80',
        caption: 'Dokončené bednění věnce a armovací koše',
        timestamp: 'Dnes 09:15',
        author: 'Petr Novotný'
      },
      {
        id: 'p-2',
        url: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=800&q=80',
        caption: 'Příprava otvoru pro komínové těleso Schiedel',
        timestamp: 'Včera 15:40',
        author: 'Petr Novotný'
      }
    ],
    voiceLogs: [
      {
        id: 'v-1',
        transcript: 'Betonárka Holcim dorazila s 15minutovým zpožděním, ale kubatura 14 m3 sedí. Vzorky betonu C25/30 odebrány do kostek podle ČSN.',
        duration: '0:34',
        timestamp: 'Dnes 11:20',
        author: 'Petr Novotný'
      }
    ]
  },
  {
    id: 'stavba-02',
    code: 'STV-2026-007',
    name: 'Rekonstrukce bytu 3+kk na klíč',
    clientName: 'Mgr. Lucie Bartošová',
    clientPhone: '+420 724 112 334',
    clientEmail: 'lucie.bartosova@seznam.cz',
    address: 'Korunní 88/12',
    city: 'Praha 2 - Vinohrady',
    stage: 'finishing',
    budgetTotal: 1850000,
    costsEstimated: 1380000,
    costsActual: 1320000,
    marginPercent: 25.4,
    startDate: '2026-04-01',
    targetDate: '2026-06-15',
    assignedManager: 'Ing. Martin Dvořák',
    assignedWorker: 'Karel Černý (Obkladač & sádrokartonář)',
    workerPhone: '+420 732 555 888',
    description: 'Kompletní výměna rozvodů elektro, vody a plynu, vyrovnání podlah anhydritem, velkoformátové obklady v koupelně a vestavný nábytek.',
    priority: 'normal',
    milestones: [
      { id: 'm-201', title: 'Spárování velkoformátu 60x120 Mapei Ultracolor', completed: true, timeSlot: 'Dopoledne' },
      { id: 'm-202', title: 'Broušení sádrokartonových podhledů Q3', completed: false, timeSlot: 'Odpoledne' },
      { id: 'm-203', title: 'Instalace podomítkových těles Hansgrohe', completed: false, timeSlot: 'Zítra' }
    ],
    photos: [],
    voiceLogs: []
  },
  {
    id: 'stavba-03',
    code: 'STV-2026-009',
    name: 'Půdní vestavba a nová střešní krytina',
    clientName: 'MUDr. Jan Holub',
    clientPhone: '+420 602 998 877',
    clientEmail: 'jan.holub@fnkv.cz',
    address: 'Sokolovská 412/35',
    city: 'Praha 8 - Karlín',
    stage: 'survey',
    budgetTotal: 3450000,
    costsEstimated: 2600000,
    costsActual: 450000,
    marginPercent: 24.6,
    startDate: '2026-05-10',
    targetDate: '2026-11-20',
    assignedManager: 'Ing. Martin Dvořák',
    assignedWorker: 'Petr Novotný (Mistr tesař & zedník)',
    workerPhone: '+420 777 890 123',
    description: 'Posouzení krovu statikem, laserové 3D zaměření trámů a příprava položkového rozpočtu podle OTSKP.',
    priority: 'high',
    milestones: [
      { id: 'm-301', title: 'Laserové zaměření výšek hřebene a pozednic', completed: true },
      { id: 'm-302', title: 'Odběr vzorku trámů na napadení tesaříkem', completed: true },
      { id: 'm-303', title: 'Statický posudek přitížení stropní konstrukce', completed: false }
    ],
    photos: [],
    voiceLogs: []
  },
  {
    id: 'stavba-04',
    code: 'STV-2026-012',
    name: 'Zateplení fasády a sanace soklu RD',
    clientName: 'Pavel Řehoř',
    clientPhone: '+420 739 881 200',
    address: 'Na Viničkách 23',
    city: 'Černošice',
    stage: 'inquiry',
    budgetTotal: 890000,
    costsEstimated: 680000,
    costsActual: 0,
    marginPercent: 23.6,
    startDate: '2026-06-01',
    targetDate: '2026-07-31',
    assignedManager: 'Ing. Martin Dvořák',
    assignedWorker: 'Zatím nepřiřazeno',
    workerPhone: '',
    description: 'Poptávka na kontaktní zateplovací systém ETICS (minerální vata 160 mm) se silikonovou omítkou a sanační omítkou soklu.',
    priority: 'normal',
    milestones: [
      { id: 'm-401', title: 'Osobní prohlídka a zaměření výměr fasády', completed: false }
    ],
    photos: [],
    voiceLogs: []
  },
  {
    id: 'stavba-05',
    code: 'STV-2025-088',
    name: 'Přístavba zimní zahrady a terasa',
    clientName: 'RNDr. Eva Marešová',
    clientPhone: '+420 605 123 987',
    address: 'K Březině 19',
    city: 'Průhonice',
    stage: 'handed_over',
    budgetTotal: 1250000,
    costsEstimated: 920000,
    costsActual: 915000,
    marginPercent: 26.8,
    startDate: '2025-10-01',
    targetDate: '2025-12-18',
    assignedManager: 'Ing. Martin Dvořák',
    assignedWorker: 'Petr Novotný',
    workerPhone: '+420 777 890 123',
    description: 'Hotová hliníková konstrukce s trojsklem a podlahou ze sibiřského modřínu. Podepsán předávací protokol bez vad a nedodělků.',
    priority: 'low',
    milestones: [
      { id: 'm-501', title: 'Podpis předávacího protokolu a kolaudace', completed: true },
      { id: 'm-502', title: 'Uvolnění zádržného 5 % z bankovní garance', completed: true }
    ],
    photos: [],
    voiceLogs: []
  }
];

const STAGE_CONFIG: Record<ConstructionStage, { label: string; order: number; badgeColor: string }> = {
  inquiry: { label: 'Poptávka', order: 1, badgeColor: 'border-slate-700 bg-slate-800/80 text-slate-300' },
  survey: { label: 'Zaměřování', order: 2, badgeColor: 'border-amber-600/40 bg-amber-500/10 text-amber-400' },
  rough: { label: 'Hrubá stavba', order: 3, badgeColor: 'border-orange-600/40 bg-orange-500/10 text-orange-400' },
  finishing: { label: 'Dokončování', order: 4, badgeColor: 'border-sky-600/40 bg-sky-500/10 text-sky-400' },
  handed_over: { label: 'Předáno', order: 5, badgeColor: 'border-emerald-600/40 bg-emerald-500/10 text-emerald-400' }
};

interface ConstructionDashboardProps {
  onBackToMain?: () => void;
}

export const ConstructionDashboard: React.FC<ConstructionDashboardProps> = () => {
  // 1. Aktivní role uživatele: 'owner' | 'admin' | 'worker'
  const [role, setRole] = useState<UserRole>('owner');

  // 2. Stav stavebních zakázek (hybridní state napojený na lokální NAS storage)
  const [projects, setProjects] = useState<ConstructionProject[]>(INITIAL_PROJECTS);
  
  // 3. Stav modálního okna pro novou poptávku (pro Správce / Admina)
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [newProjectForm, setNewProjectForm] = useState({
    name: '',
    clientName: '',
    clientPhone: '',
    city: 'Praha',
    address: '',
    budgetTotal: 1200000,
    costsEstimated: 900000,
    stage: 'inquiry' as ConstructionStage,
    assignedWorker: 'Petr Novotný (Mistr tesař & zedník)',
    description: ''
  });

  // 4. Stav terénního záznamu (pro Zaměstnance / Mistra)
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [voiceSeconds, setVoiceSeconds] = useState(0);
  const [workerPhotoInput, setWorkerPhotoInput] = useState('');
  const [workerPhotoCaption, setWorkerPhotoCaption] = useState('');
  const [isAddingPhoto, setIsAddingPhoto] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');

  // Vybraná stavba mistra (worker vidí jen svou aktuální stavbu)
  const workerAssignedProject = useMemo(() => {
    return projects.find(p => p.id === 'stavba-01') || projects[0];
  }, [projects]);

  // Statistiky pro Majitele (Owner KPI)
  const ownerMetrics = useMemo(() => {
    const totalVolume = projects.reduce((sum, p) => sum + p.budgetTotal, 0);
    const totalActualCosts = projects.reduce((sum, p) => sum + p.costsActual, 0);
    const activeProjects = projects.filter(p => p.stage !== 'handed_over').length;
    
    // Vážená průměrná marže
    const totalEstimatedCosts = projects.reduce((sum, p) => sum + p.costsEstimated, 0);
    const avgMargin = totalVolume > 0 
      ? Number((((totalVolume - totalEstimatedCosts) / totalVolume) * 100).toFixed(1))
      : 24.5;
    
    const projectedProfit = totalVolume - totalEstimatedCosts;

    return {
      totalVolume,
      totalActualCosts,
      activeProjects,
      avgMargin,
      projectedProfit
    };
  }, [projects]);

  // Handler pro posun zakázky v Kanbanu (pro Správce)
  const handleMoveStage = (projectId: string, nextStage: ConstructionStage) => {
    setProjects(prev => prev.map(p => {
      if (p.id === projectId) {
        return { ...p, stage: nextStage };
      }
      return p;
    }));
  };

  // Handler pro přidání nové poptávky (Admin rychlý formulář)
  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectForm.name || !newProjectForm.clientName) return;

    const marginPct = Number((((newProjectForm.budgetTotal - newProjectForm.costsEstimated) / newProjectForm.budgetTotal) * 100).toFixed(1));
    const created: ConstructionProject = {
      id: 'stavba-' + Date.now(),
      code: `STV-2026-0${projects.length + 1}`,
      name: newProjectForm.name,
      clientName: newProjectForm.clientName,
      clientPhone: newProjectForm.clientPhone || '+420 777 000 111',
      address: newProjectForm.address || 'K Zahrádkám 12',
      city: newProjectForm.city,
      stage: newProjectForm.stage,
      budgetTotal: Number(newProjectForm.budgetTotal),
      costsEstimated: Number(newProjectForm.costsEstimated),
      costsActual: 0,
      marginPercent: marginPct > 0 ? marginPct : 22.0,
      startDate: new Date().toISOString().split('T')[0],
      targetDate: new Date(Date.now() + 60 * 86400000).toISOString().split('T')[0],
      assignedManager: 'Ing. Martin Dvořák',
      assignedWorker: newProjectForm.assignedWorker,
      workerPhone: '+420 777 890 123',
      description: newProjectForm.description || 'Poptávka přijata do stavebního systému.',
      priority: 'normal',
      milestones: [
        { id: `m-${Date.now()}-1`, title: 'Provedení úvodní prohlídky staveniště', completed: false },
        { id: `m-${Date.now()}-2`, title: 'Vypracování položkového rozpočtu', completed: false }
      ],
      photos: [],
      voiceLogs: []
    };

    setProjects(prev => [created, ...prev]);
    setIsNewModalOpen(false);
    setNewProjectForm({
      name: '',
      clientName: '',
      clientPhone: '',
      city: 'Praha',
      address: '',
      budgetTotal: 1200000,
      costsEstimated: 900000,
      stage: 'inquiry',
      assignedWorker: 'Petr Novotný (Mistr tesař & zedník)',
      description: ''
    });
  };

  // Handler pro odškrtnutí milníku na stavbě (Worker)
  const handleToggleMilestone = (milestoneId: string) => {
    setProjects(prev => prev.map(proj => {
      if (proj.id === workerAssignedProject.id) {
        return {
          ...proj,
          milestones: proj.milestones.map(m => m.id === milestoneId ? { ...m, completed: !m.completed } : m)
        };
      }
      return proj;
    }));
  };

  // Hlasový záznam pro mistra na stavbě
  const handleToggleVoiceRecord = () => {
    if (isRecordingVoice) {
      setIsRecordingVoice(false);
      const newLog: VoiceLog = {
        id: 'v-' + Date.now(),
        transcript: 'Záznam mistra ze stavby: Betonáž základů dokončena bez komplikací. Zítra od 7:00 nastupují tesaři na bednění stropních desek.',
        duration: `0:${voiceSeconds < 10 ? '0' + voiceSeconds : voiceSeconds}`,
        timestamp: 'Právě teď',
        author: 'Petr Novotný (Mistr)'
      };
      setProjects(prev => prev.map(p => {
        if (p.id === workerAssignedProject.id) {
          return { ...p, voiceLogs: [newLog, ...p.voiceLogs] };
        }
        return p;
      }));
      setVoiceSeconds(0);
    } else {
      setIsRecordingVoice(true);
      setVoiceSeconds(1);
    }
  };

  // Pořízení fotky z terénu
  const handleAddWorkerPhoto = () => {
    if (!workerPhotoCaption.trim()) return;
    const newPhoto: SitePhoto = {
      id: 'p-' + Date.now(),
      url: workerPhotoInput || 'https://images.unsplash.com/photo-1541888946425-d0fbb186156f?auto=format&fit=crop&w=800&q=80',
      caption: workerPhotoCaption,
      timestamp: 'Právě teď',
      author: 'Petr Novotný'
    };

    setProjects(prev => prev.map(p => {
      if (p.id === workerAssignedProject.id) {
        return { ...p, photos: [newPhoto, ...p.photos] };
      }
      return p;
    }));
    setWorkerPhotoCaption('');
    setWorkerPhotoInput('');
    setIsAddingPhoto(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950">
      
      {/* =========================================================================
          HORNÍ LIŠTA: HYBRIDNÍ ÚLOŽIŠTĚ + PŘEPÍNAČ 3 ROLÍ
          ========================================================================= */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 sm:px-6 py-3">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          
          {/* Identita stavebního systému */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-black text-white tracking-wide uppercase">StavbaCore ERP</span>
                <span className="text-[10px] bg-amber-500/20 text-amber-300 font-bold px-1.5 py-0.5 rounded border border-amber-500/30">
                  v3.4 Hybrid
                </span>
              </div>
              <p className="text-[11px] text-slate-400">Řízení staveb & rekonstrukcí na míru</p>
            </div>
          </div>

          {/* Telemetrie hybridního úložiště (Synology NAS / Lokální PostgreSQL) */}
          <div className="hidden lg:flex items-center gap-3 px-3 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs">
            <div className="flex items-center gap-1.5 text-slate-300 font-mono">
              <HardDrive className="w-3.5 h-3.5 text-amber-400" />
              <span>Synology DS923+ (LAN)</span>
            </div>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[11px] text-emerald-400 font-mono">1.2ms • Bezpečně On-Premise</span>
          </div>

          {/* PŘEPÍNAČ 3 UŽIVATELSKÝCH ROLÍ (SIMULÁTOR) */}
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 shadow-inner">
            <button
              onClick={() => setRole('owner')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                role === 'owner'
                  ? 'bg-amber-500 text-slate-950 shadow-md font-extrabold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>1. Majitel (Jednatel)</span>
            </button>

            <button
              onClick={() => setRole('admin')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                role === 'admin'
                  ? 'bg-amber-500 text-slate-950 shadow-md font-extrabold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <UserCog className="w-3.5 h-3.5" />
              <span>2. Správce / Stavbyvedoucí</span>
            </button>

            <button
              onClick={() => setRole('worker')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                role === 'worker'
                  ? 'bg-amber-500 text-slate-950 shadow-md font-extrabold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>3. Mistr na stavbě (Mobil)</span>
            </button>
          </div>

        </div>
      </header>

      {/* =========================================================================
          HLAVNÍ PRACOVNÍ PLOCHA (PŘEPÍNÁ SE DLE VYBRANÉ ROLE)
          ========================================================================= */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">

        {/* =======================================================================
            POHLED 1: MAJITEL FIRMY (FINANCE, OBRAT, MARŽE, CELKOVÝ PŘEHLED)
            ======================================================================= */}
        {role === 'owner' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            
            {/* Úvodní manažerská hlavička */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
                  <span>Finanční & Manažerský přehled firmy</span>
                </h1>
                <p className="text-xs text-slate-400 mt-1">
                  Stav likvidity, rozpočtů a ziskovosti všech aktivních realizací rekonstrukcí a domů.
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-400 font-mono bg-slate-900 px-3 py-2 rounded-xl border border-slate-800">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>Aktualizováno: Dnes v 16:45 z lokálního NAS serveru</span>
              </div>
            </div>

            {/* 4 KLÍČOVÉ FINANČNÍ METRIKY PRO MAJITELE */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              
              {/* Metrika: Celkový objem zakázek */}
              <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 border-l-4 border-l-amber-500 space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-400 font-semibold uppercase tracking-wider">
                  <span>Celkový obrat zakázek</span>
                  <Coins className="w-4 h-4 text-amber-400" />
                </div>
                <div className="text-2xl font-black text-white font-mono">
                  {ownerMetrics.totalVolume.toLocaleString('cs-CZ')} Kč
                </div>
                <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                  <span className="text-emerald-400 font-bold flex items-center">
                    <TrendingUp className="w-3 h-3 mr-0.5" /> +14 %
                  </span>
                  <span>oproti minulému kvartálu</span>
                </div>
              </div>

              {/* Metrika: Průměrná marže firmy */}
              <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 border-l-4 border-l-emerald-400 space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-400 font-semibold uppercase tracking-wider">
                  <span>Průměrná hrubá marže</span>
                  <Percent className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-2xl font-black text-emerald-400 font-mono">
                  {ownerMetrics.avgMargin} %
                </div>
                <div className="text-[11px] text-slate-400">
                  Cílová firemní hladina: <strong>22.0 %</strong>
                </div>
              </div>

              {/* Metrika: Počet aktivních staveb */}
              <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 border-l-4 border-l-blue-500 space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-400 font-semibold uppercase tracking-wider">
                  <span>Aktivní stavby v běhu</span>
                  <Hammer className="w-4 h-4 text-blue-400" />
                </div>
                <div className="text-2xl font-black text-white font-mono">
                  {ownerMetrics.activeProjects} stavby
                </div>
                <div className="text-[11px] text-slate-400">
                  1x hrubá stavba • 1x dokončování • 1x zaměřování
                </div>
              </div>

              {/* Metrika: Plánovaný čistý zisk */}
              <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 border-l-4 border-l-amber-400 space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-400 font-semibold uppercase tracking-wider">
                  <span>Plánovaný hrubý zisk</span>
                  <TrendingUp className="w-4 h-4 text-amber-400" />
                </div>
                <div className="text-2xl font-black text-white font-mono">
                  {ownerMetrics.projectedProfit.toLocaleString('cs-CZ')} Kč
                </div>
                <div className="text-[11px] text-slate-400">
                  Skutečné čerpání: {ownerMetrics.totalActualCosts.toLocaleString('cs-CZ')} Kč
                </div>
              </div>

            </div>

            {/* PŘEHLEDNÁ MANAŽERSKÁ TABULKA VŠECH REALIZACÍ */}
            <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
              <div className="p-4 sm:p-5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-amber-400" />
                    Přehled realizací s rozpočty a ziskovostí
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Přímá finanční kontrola nákladů, marží a stavbyvedoucích.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Filtrovat stavby..."
                      value={searchFilter}
                      onChange={(e) => setSearchFilter(e.target.value)}
                      className="text-xs bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 w-48"
                    />
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950/60 text-slate-400 text-[11px] uppercase font-bold border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Kód & Název stavby</th>
                      <th className="py-3 px-4">Lokalita</th>
                      <th className="py-3 px-4">Fáze stavby</th>
                      <th className="py-3 px-4 text-right">Smluvní rozpočet</th>
                      <th className="py-3 px-4 text-right">Plánované náklady</th>
                      <th className="py-3 px-4 text-right">Skutečně prostavěno</th>
                      <th className="py-3 px-4 text-right">Marže %</th>
                      <th className="py-3 px-4">Stavbyvedoucí</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {projects
                      .filter(p => p.name.toLowerCase().includes(searchFilter.toLowerCase()) || p.clientName.toLowerCase().includes(searchFilter.toLowerCase()))
                      .map((p) => {
                        const stageInfo = STAGE_CONFIG[p.stage];
                        const profit = p.budgetTotal - p.costsEstimated;
                        return (
                          <tr key={p.id} className="hover:bg-slate-800/40 transition-colors">
                            
                            {/* Kód a název */}
                            <td className="py-3.5 px-4">
                              <div className="font-bold text-white text-sm">{p.name}</div>
                              <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5 font-mono">
                                <span className="text-amber-400">{p.code}</span>
                                <span>•</span>
                                <span>Klient: {p.clientName}</span>
                              </div>
                            </td>

                            {/* Lokalita */}
                            <td className="py-3.5 px-4 font-mono text-slate-300">
                              <div className="flex items-center gap-1.5">
                                <MapPin className="w-3.5 h-3.5 text-slate-500" />
                                <span>{p.city}</span>
                              </div>
                            </td>

                            {/* Fáze */}
                            <td className="py-3.5 px-4">
                              <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold border ${stageInfo.badgeColor}`}>
                                {stageInfo.label}
                              </span>
                            </td>

                            {/* Rozpočet */}
                            <td className="py-3.5 px-4 text-right font-mono font-bold text-white">
                              {p.budgetTotal.toLocaleString('cs-CZ')} Kč
                            </td>

                            {/* Plánované náklady */}
                            <td className="py-3.5 px-4 text-right font-mono text-slate-400">
                              {p.costsEstimated.toLocaleString('cs-CZ')} Kč
                            </td>

                            {/* Skutečně vyčerpáno */}
                            <td className="py-3.5 px-4 text-right font-mono text-slate-300">
                              {p.costsActual.toLocaleString('cs-CZ')} Kč
                            </td>

                            {/* Marže */}
                            <td className="py-3.5 px-4 text-right">
                              <span className={`font-mono font-bold text-xs ${
                                p.marginPercent >= 24 ? 'text-emerald-400' : 'text-amber-400'
                              }`}>
                                {p.marginPercent.toFixed(1)} %
                              </span>
                              <div className="text-[10px] text-slate-500 font-mono">
                                +{(profit / 1000).toFixed(0)}k Kč
                              </div>
                            </td>

                            {/* Stavbyvedoucí */}
                            <td className="py-3.5 px-4 text-slate-300">
                              <div className="font-medium text-xs">{p.assignedManager}</div>
                              <div className="text-[10px] text-slate-500">{p.assignedWorker.split(' ')[0]} (Mistr)</div>
                            </td>

                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>

              {/* Spodní shrnutí */}
              <div className="p-4 bg-slate-950/60 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
                <span>Zobrazeno {projects.length} aktivních stavebních zakázek</span>
                <div className="flex items-center gap-4 font-mono">
                  <span>Celkem obrat: <strong className="text-white">{ownerMetrics.totalVolume.toLocaleString('cs-CZ')} Kč</strong></span>
                  <span>Celkem zisk: <strong className="text-emerald-400">{ownerMetrics.projectedProfit.toLocaleString('cs-CZ')} Kč</strong></span>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* =======================================================================
            POHLED 2: SPRÁVCE / STAVBYVEDOUCÍ (KANBAN VŠECH FÁZÍ + NOVÁ POPTÁVKA)
            ======================================================================= */}
        {role === 'admin' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            
            {/* Lišta stavbyvedoucího s tlačítkem pro novou stavbu */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
                  <UserCog className="w-6 h-6 text-amber-400" />
                  <span>Správa stavebního procesu & Dispečink</span>
                </h1>
                <p className="text-xs text-slate-400 mt-1">
                  Kanban fází: Poptávka → Zaměřování → Hrubá stavba → Dokončování → Předání díla.
                </p>
              </div>

              <button
                onClick={() => setIsNewModalOpen(true)}
                className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Přidat novou poptávku / zakázku</span>
              </button>
            </div>

            {/* KANBAN NÁSTĚNKA S 5 STAVEBNÍMI FÁZEMI */}
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 items-start">
              {(Object.keys(STAGE_CONFIG) as ConstructionStage[]).map((stageKey) => {
                const stage = STAGE_CONFIG[stageKey];
                const stageProjects = projects.filter(p => p.stage === stageKey);
                
                return (
                  <div key={stageKey} className="bg-slate-900/80 rounded-2xl border border-slate-800 flex flex-col min-h-[520px]">
                    
                    {/* Záhlaví sloupce */}
                    <div className="p-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-900 rounded-t-2xl">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white uppercase tracking-wider">{stage.label}</span>
                        <span className="w-5 h-5 rounded-full bg-slate-800 text-amber-400 text-[10px] font-mono font-bold flex items-center justify-center">
                          {stageProjects.length}
                        </span>
                      </div>
                    </div>

                    {/* Karty v daném sloupci */}
                    <div className="p-3 space-y-3 flex-1 overflow-y-auto">
                      {stageProjects.length === 0 ? (
                        <div className="text-center py-12 text-slate-600 text-xs italic">
                          Žádná stavba v této fázi
                        </div>
                      ) : (
                        stageProjects.map((proj) => (
                          <div
                            key={proj.id}
                            className={`bg-slate-950 p-4 rounded-xl border border-slate-800 hover:border-slate-700 transition-all space-y-3 shadow-md border-l-4 ${
                              proj.priority === 'critical' ? 'border-l-rose-500' :
                              proj.priority === 'high' ? 'border-l-amber-500' :
                              'border-l-blue-500'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <span className="text-[10px] font-mono text-amber-400 font-bold">{proj.code}</span>
                                <h3 className="text-xs font-bold text-white mt-0.5 leading-snug">{proj.name}</h3>
                              </div>
                            </div>

                            <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                              {proj.description}
                            </p>

                            <div className="space-y-1 text-[11px] text-slate-300 font-mono pt-1 border-t border-slate-900">
                              <div className="flex items-center gap-1.5 text-slate-400">
                                <MapPin className="w-3 h-3 text-slate-500" />
                                <span className="truncate">{proj.address}, {proj.city}</span>
                              </div>
                              <div className="flex items-center justify-between text-white pt-1">
                                <span className="text-slate-400">Rozpočet:</span>
                                <span className="font-bold text-amber-400 font-mono">
                                  {(proj.budgetTotal / 1000).toFixed(0)}k Kč
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-[10px] text-slate-400">
                                <span>Mistr:</span>
                                <span className="text-slate-200 truncate">{proj.assignedWorker.split(' ')[0]}</span>
                              </div>
                            </div>

                            {/* Tlačítka pro rychlý posun do další/předchozí fáze */}
                            <div className="flex items-center justify-between pt-2 border-t border-slate-900 text-[10px]">
                              {stageKey !== 'inquiry' ? (
                                <button
                                  onClick={() => {
                                    const keys = Object.keys(STAGE_CONFIG) as ConstructionStage[];
                                    const prevIdx = keys.indexOf(stageKey) - 1;
                                    if (prevIdx >= 0) handleMoveStage(proj.id, keys[prevIdx]);
                                  }}
                                  className="text-slate-400 hover:text-white px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 transition"
                                >
                                  ← Zpět
                                </button>
                              ) : <span />}

                              {stageKey !== 'handed_over' && (
                                <button
                                  onClick={() => {
                                    const keys = Object.keys(STAGE_CONFIG) as ConstructionStage[];
                                    const nextIdx = keys.indexOf(stageKey) + 1;
                                    if (nextIdx < keys.length) handleMoveStage(proj.id, keys[nextIdx]);
                                  }}
                                  className="text-amber-400 hover:text-amber-300 font-bold px-2 py-1 rounded bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 transition flex items-center gap-1"
                                >
                                  <span>Posunout</span>
                                  <ArrowRight className="w-3 h-3" />
                                </button>
                              )}
                            </div>

                          </div>
                        ))
                      )}
                    </div>

                  </div>
                );
              })}
            </div>

          </div>
        )}

        {/* =======================================================================
            POHLED 3: ZAMĚSTNANEC / MISTR NA STAVBĚ (MOBILE-FIRST TERÉNNÍ ROZHRANÍ)
            ======================================================================= */}
        {role === 'worker' && (
          <div className="max-w-md mx-auto space-y-5 animate-in fade-in duration-200">
            
            {/* Informační lišta stavu na mobilu */}
            <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Hammer className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white">Mistr: Petr Novotný</div>
                  <div className="text-[11px] text-emerald-400 font-mono flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    <span>Aktivní směna na stavbě</span>
                  </div>
                </div>
              </div>

              <span className="text-[10px] font-mono bg-slate-950 px-2 py-1 rounded border border-slate-800 text-slate-400">
                Offline Cache OK
              </span>
            </div>

            {/* KARTA AKTUÁLNĚ PŘIŘAZENÉ STAVBY */}
            <div className="bg-slate-900 rounded-3xl border border-slate-800 border-l-4 border-l-amber-500 p-5 space-y-4 shadow-xl">
              
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-amber-400 font-bold tracking-wider uppercase">
                  Moje dnešní stavba
                </span>
                <span className="text-[11px] bg-amber-500/20 text-amber-300 font-bold px-2 py-0.5 rounded-md border border-amber-500/30">
                  {STAGE_CONFIG[workerAssignedProject.stage].label}
                </span>
              </div>

              <div>
                <h2 className="text-base font-black text-white leading-tight">
                  {workerAssignedProject.name}
                </h2>
                <div className="flex items-center gap-1.5 text-xs text-slate-300 font-mono mt-1">
                  <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>{workerAssignedProject.address}, {workerAssignedProject.city}</span>
                </div>
              </div>

              {/* Rychlý kontakt na investora / stavbyvedoucího jedním klikem */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/80">
                <a
                  href={`tel:${workerAssignedProject.clientPhone}`}
                  className="py-2 px-3 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs font-bold text-white flex items-center justify-center gap-2 transition"
                >
                  <Phone className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Volat investora</span>
                </a>

                <a
                  href={`https://maps.google.com/?q=${encodeURIComponent(workerAssignedProject.address + ' ' + workerAssignedProject.city)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="py-2 px-3 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs font-bold text-white flex items-center justify-center gap-2 transition"
                >
                  <MapPin className="w-3.5 h-3.5 text-blue-400" />
                  <span>Navigace na stavbu</span>
                </a>
              </div>

            </div>

            {/* DVĚ HLAVNÍ TERÉNNÍ AKCE: VELKÁ TLAČÍTKA PRO FOTO & HLASOVOU POZNÁMKU */}
            <div className="grid grid-cols-2 gap-3">
              
              {/* Tlačítko pro rychlou fotku */}
              <button
                onClick={() => setIsAddingPhoto(!isAddingPhoto)}
                className="p-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-amber-500/50 flex flex-col items-center justify-center gap-2 text-center transition group cursor-pointer active:scale-95"
              >
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 group-hover:bg-amber-500 group-hover:text-slate-950 transition">
                  <Camera className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white">Pořídit fotku stavu</div>
                  <div className="text-[10px] text-slate-400">Do stavebního deníku</div>
                </div>
              </button>

              {/* Tlačítko pro hlasovou poznámku */}
              <button
                onClick={handleToggleVoiceRecord}
                className={`p-4 rounded-2xl border flex flex-col items-center justify-center gap-2 text-center transition cursor-pointer active:scale-95 ${
                  isRecordingVoice
                    ? 'bg-rose-950/50 border-rose-500 ring-2 ring-rose-500/30 animate-pulse'
                    : 'bg-slate-900 border-slate-800 hover:border-amber-500/50'
                }`}
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition ${
                  isRecordingVoice
                    ? 'bg-rose-500 text-white'
                    : 'bg-amber-500/10 border border-amber-500/30 text-amber-400'
                }`}>
                  <Mic className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white">
                    {isRecordingVoice ? `Nahrávám (0:${voiceSeconds < 10 ? '0' + voiceSeconds : voiceSeconds})` : 'Hlasová poznámka'}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {isRecordingVoice ? 'Klikněte pro uložení' : 'Nadiktovat hlášení'}
                  </div>
                </div>
              </button>

            </div>

            {/* Formulář pro přidání fotky, pokud je aktivní */}
            {isAddingPhoto && (
              <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 space-y-3 animate-in fade-in">
                <div className="text-xs font-bold text-white flex items-center justify-between">
                  <span>Přidat fotografii ze staveniště</span>
                  <button onClick={() => setIsAddingPhoto(false)} className="text-slate-400 hover:text-white">✕</button>
                </div>
                <input
                  type="text"
                  placeholder="URL fotky (nebo simulace z mobilní kamery)"
                  value={workerPhotoInput}
                  onChange={(e) => setWorkerPhotoInput(e.target.value)}
                  className="w-full text-xs bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
                <input
                  type="text"
                  placeholder="Popis (např. 'Zabetonované armatury v patře')"
                  value={workerPhotoCaption}
                  onChange={(e) => setWorkerPhotoCaption(e.target.value)}
                  className="w-full text-xs bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
                <button
                  onClick={handleAddWorkerPhoto}
                  className="w-full py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl transition"
                >
                  Uložit do deníku stavby
                </button>
              </div>
            )}

            {/* INTERAKTIVNÍ KONTROLNÍ SEZNAM (CHECKLIST) DNEŠNÍCH MILNÍKŮ */}
            <div className="bg-slate-900 rounded-3xl border border-slate-800 p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    Dnešní stavební úkoly & milníky
                  </h3>
                  <p className="text-[11px] text-slate-400">Označte hotové práce pro stavbyvedoucího</p>
                </div>

                <div className="text-xs font-mono font-bold text-amber-400">
                  {workerAssignedProject.milestones.filter(m => m.completed).length} / {workerAssignedProject.milestones.length}
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                <div
                  className="bg-amber-500 h-full transition-all duration-300"
                  style={{
                    width: `${
                      workerAssignedProject.milestones.length > 0
                        ? (workerAssignedProject.milestones.filter(m => m.completed).length / workerAssignedProject.milestones.length) * 100
                        : 0
                    }%`
                  }}
                />
              </div>

              {/* Seznam milníků s velkými dotykovými checkboxy */}
              <div className="space-y-2 pt-1">
                {workerAssignedProject.milestones.map((m) => (
                  <div
                    key={m.id}
                    onClick={() => handleToggleMilestone(m.id)}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 select-none ${
                      m.completed
                        ? 'bg-slate-950/60 border-slate-800 opacity-70'
                        : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className={`w-6 h-6 rounded-lg border flex items-center justify-center shrink-0 mt-0.5 transition ${
                      m.completed
                        ? 'bg-emerald-500 border-emerald-400 text-slate-950'
                        : 'border-slate-700 bg-slate-900'
                    }`}>
                      {m.completed && <Check className="w-4 h-4 stroke-[3]" />}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className={`text-xs font-medium leading-snug ${
                        m.completed ? 'line-through text-slate-500' : 'text-slate-200'
                      }`}>
                        {m.title}
                      </div>
                      {m.timeSlot && (
                        <div className="text-[10px] text-amber-400 font-mono mt-0.5">
                          Časový slot: {m.timeSlot}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

            </div>

            {/* POSLEDNÍ ZÁZNAMY ZE STAVBY (FOTKY & ZVUK) */}
            {(workerAssignedProject.photos.length > 0 || workerAssignedProject.voiceLogs.length > 0) && (
              <div className="bg-slate-900 rounded-3xl border border-slate-800 p-5 space-y-3">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Deník dnešních hlášení
                </h3>

                {/* Hlasové záznamy */}
                {workerAssignedProject.voiceLogs.map((vl) => (
                  <div key={vl.id} className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs text-slate-300 space-y-1">
                    <div className="flex items-center justify-between text-[10px] text-amber-400 font-mono">
                      <span className="flex items-center gap-1">
                        <Mic className="w-3 h-3" /> Hlasový záznam ({vl.duration})
                      </span>
                      <span>{vl.timestamp}</span>
                    </div>
                    <p className="italic text-slate-300 text-[11px]">"{vl.transcript}"</p>
                  </div>
                ))}

                {/* Fotky */}
                {workerAssignedProject.photos.length > 0 && (
                  <div className="grid grid-cols-2 gap-2">
                    {workerAssignedProject.photos.map((ph) => (
                      <div key={ph.id} className="relative rounded-xl overflow-hidden border border-slate-800 group">
                        <img src={ph.url} alt={ph.caption} className="w-full h-24 object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent p-2 flex flex-col justify-end">
                          <span className="text-[10px] text-white font-medium truncate">{ph.caption}</span>
                          <span className="text-[9px] text-amber-400 font-mono">{ph.timestamp}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

          </div>
        )}

      </main>

      {/* =========================================================================
          MODÁLNÍ OKNO PRO NOVOU POPTÁVKU / ZAKÁZKU (PRO SPRÁVCE / ADMINA)
          ========================================================================= */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl text-slate-200">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Nová stavební poptávka / zakázka</h3>
                  <p className="text-[11px] text-slate-400">Založení rekonstrukce nebo novostavby do systému</p>
                </div>
              </div>
              <button
                onClick={() => setIsNewModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateProject} className="space-y-3.5 text-xs">
              
              <div className="space-y-1">
                <label className="font-semibold text-slate-300">Název projektu / stavebního díla *</label>
                <input
                  type="text"
                  required
                  placeholder="např. Rekonstrukce koupelny a kuchyně RD"
                  value={newProjectForm.name}
                  onChange={(e) => setNewProjectForm({ ...newProjectForm, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white placeholder-slate-600 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">Jméno investora / klienta *</label>
                  <input
                    type="text"
                    required
                    placeholder="např. Ing. Petr Svoboda"
                    value={newProjectForm.clientName}
                    onChange={(e) => setNewProjectForm({ ...newProjectForm, clientName: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white placeholder-slate-600 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">Telefon na klienta</label>
                  <input
                    type="text"
                    placeholder="+420 777 123 456"
                    value={newProjectForm.clientPhone}
                    onChange={(e) => setNewProjectForm({ ...newProjectForm, clientPhone: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white placeholder-slate-600 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">Město</label>
                  <input
                    type="text"
                    value={newProjectForm.city}
                    onChange={(e) => setNewProjectForm({ ...newProjectForm, city: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white placeholder-slate-600 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">Ulice a číslo popisné</label>
                  <input
                    type="text"
                    placeholder="K Březině 14"
                    value={newProjectForm.address}
                    onChange={(e) => setNewProjectForm({ ...newProjectForm, address: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white placeholder-slate-600 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">Smluvní rozpočet (Kč bez DPH)</label>
                  <input
                    type="number"
                    value={newProjectForm.budgetTotal}
                    onChange={(e) => setNewProjectForm({ ...newProjectForm, budgetTotal: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 font-mono text-amber-400 font-bold focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">Plánované náklady (Kč)</label>
                  <input
                    type="number"
                    value={newProjectForm.costsEstimated}
                    onChange={(e) => setNewProjectForm({ ...newProjectForm, costsEstimated: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 font-mono text-slate-300 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-300">Počáteční fáze zakázky</label>
                <select
                  value={newProjectForm.stage}
                  onChange={(e) => setNewProjectForm({ ...newProjectForm, stage: e.target.value as ConstructionStage })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="inquiry">Poptávka (nově doručeno)</option>
                  <option value="survey">Zaměřování na staveništi</option>
                  <option value="rough">Hrubá stavba</option>
                  <option value="finishing">Dokončovací práce</option>
                  <option value="handed_over">Předáno investorovi</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-300">Popis a stavební rozsah</label>
                <textarea
                  rows={2}
                  placeholder="Stručný popis stavu staveniště, požadavků a termínů..."
                  value={newProjectForm.description}
                  onChange={(e) => setNewProjectForm({ ...newProjectForm, description: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white placeholder-slate-600 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
                >
                  Zrušit
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black transition shadow-md"
                >
                  Vytvořit zakázku na Kanban
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* =========================================================================
          PATIČKA: ARCHITEKTURA HYBRIDNÍHO SYSTÉMU (SYNOLOGY NAS REST API)
          ========================================================================= */}
      <footer className="border-t border-slate-900 bg-slate-950 py-4 px-4 sm:px-6 text-[11px] text-slate-500 text-center">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <span>StavbaCore B2B ERP • Architektura lokální suverenity dat (Synology NAS On-Premise + Cloud Sync)</span>
          <span className="font-mono text-slate-400">PostgreSQL Schema v2.8 • Offline-First Service Worker</span>
        </div>
      </footer>

    </div>
  );
};
