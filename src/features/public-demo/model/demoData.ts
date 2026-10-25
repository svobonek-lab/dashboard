import type { Lead, TimelineStep, AIChatMessage, WeatherInfo } from '../../../entities/lead';
import type { Employee } from '../../../entities/employee';
import type { CompanyBranding } from '../../../entities/company';

export const PUBLIC_DEMO_LEADS = Object.freeze([
  { id: 'demo-101', customer: 'Rodinný dům Novotných', project: 'Rekonstrukce koupelny', city: 'Brno-Žabovřesky', value: 185000, status: 'new', updated: 'Dnes, 9:20' },
  { id: 'demo-102', customer: 'Bytový dům Javor', project: 'Oprava společné střechy', city: 'Brno-střed', value: 640000, status: 'contacted', updated: 'Dnes, 8:45' },
  { id: 'demo-105', customer: 'Rodina Malých', project: 'Rekonstrukce kuchyně', city: 'Modřice', value: 315000, status: 'scheduled', updated: 'Zaměření · zítra 10:30' },
  { id: 'demo-103', customer: 'Ateliér Na Výsluní', project: 'Nová terasa a pergola', city: 'Kuřim', value: 278000, status: 'quote', updated: 'Včera' },
  { id: 'demo-104', customer: 'Chalupa U Potoka', project: 'Zateplení fasády', city: 'Tišnov', value: 420000, status: 'job', updated: 'Včera' },
] as const);

export function generateRealisticLeads(company: CompanyBranding): Lead[] {
  const safeCompany = {
    name: company?.name || 'Novák Stavby',
    logoUrl: company?.logoUrl || '',
    primaryColor: company?.primaryColor || '#0A4EA3',
    phone: company?.phone || '+420 777 123 456',
    email: company?.email || 'info@novakstavby.cz',
    city: company?.city || 'Třinec',
    address: company?.address || 'Průmyslová 452, 739 61 Třinec',
    services: Array.isArray(company?.services) ? company.services : ['Pergoly', 'Střechy', 'Rekonstrukce']
  };
  company = safeCompany;
  const services = company.services.length > 0 ? company.services : ['Pergoly', 'Střechy', 'Rekonstrukce'];

  const defaultTimeline: TimelineStep[] = [
    { id: 't-1', title: 'Inquiry Received', status: 'Completed', timestamp: '2026-09-08 14:15', notes: 'Automated web widget capture' },
    { id: 't-2', title: 'Contacted Client', status: 'Completed', timestamp: '2026-09-08 16:30', responsibleEmployee: 'Petr Novotný', notes: 'Phone consultation & requirements confirmed' },
    { id: 't-3', title: 'Quote Generated', status: 'Completed', timestamp: '2026-09-09 10:00', responsibleEmployee: 'Petr Novotný', notes: 'Itemized PDF quote created' },
    { id: 't-4', title: 'Quote Accepted', status: 'Current', notes: 'Waiting for client approval signature' },
    { id: 't-5', title: 'Scheduled & Dispatched', status: 'Pending', notes: 'Pending confirmation' },
    { id: 't-6', title: 'Completed & Handed Over', status: 'Pending', notes: 'Final photo upload & protocol sign-off' },
  ];

  const defaultAiChat: AIChatMessage[] = [
    { id: 'msg-1', sender: 'ai', text: 'Hello Jan, I am your Gemini AI assistant for this project. How can I help you today?', timestamp: '10:30' }
  ];

  const sampleWeather: WeatherInfo = {
    date: '25.9.2026',
    temp: 21,
    condition: 'Sunny',
    windSpeed: 12,
    rainProbability: 5,
    recommendation: 'Ideální podmínky pro venkovní montáže.'
  };

  return [
    {
      id: 'lead-1',
      title: `Moderní dřevěná pergola s pojezdem - ${company.city}`,
      description: 'Zákazník požaduje návrh a montáž bioklimatické pergoly na zahradě rodinného domu včetně LED osvětlení a bočních stínících prvků.',
      city: company.city,
      address: 'Zahradní 12, ' + company.city,
      customerName: 'Ing. Jan Svoboda',
      customerPhone: '+420 603 456 789',
      customerEmail: 'svoboda.jan@seznam.cz',
      preferredDate: '2026-09-25',
      price: 220000,
      status: 'New',
      priority: 'High',
      assignedEmployeeId: 'emp-1',
      assignedEmployeeName: 'Petr Novotný',
      thumbnail: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=600&q=80',
      photos: [
        {
          id: 'p-1',
          name: 'Zahrada_puvodni_stav.jpg',
          type: 'photo',
          category: 'Before',
          url: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=800&q=80',
          uploadedAt: '2026-09-08 14:20'
        }
      ],
      files: [
        {
          id: 'f-1',
          name: 'Puvodni_zamery_zahrada.pdf',
          type: 'pdf',
          url: '#',
          uploadedAt: '2026-09-08 14:22'
        }
      ],
      checklist: [
        { id: 'c-1', text: 'Měření na pozemku', completed: true },
        { id: 'c-2', text: 'Návrh 3D vizualizace', completed: true },
        { id: 'c-3', text: 'Schválení cenové nabídky', completed: false },
        { id: 'c-4', text: 'Příprava materiálu', completed: false }
      ],
      aiSummary: {
        jobType: services[0] || 'Pergoly',
        complexity: 'Medium',
        estimatedRange: '200,000 - 240,000 CZK',
        assignedEmployee: 'Petr Novotný',
        risks: ['Nerovný terén v místě montáže', 'Nutnost přívodu elektro pro pojezd'],
        recommendedNextStep: 'Odeslat finální vizualizaci a domluvit termín zahájení prací.'
      },
      timeline: defaultTimeline,
      aiChat: defaultAiChat,
      weather: sampleWeather,
      history: [
        { id: 'h-1', timestamp: '2026-09-08 14:15', action: 'Lead vytvořen přes webový formulář', author: 'Systém' },
        { id: 'h-2', timestamp: '2026-09-08 16:30', action: 'AI automaticky přiřadila technika', author: 'Auto-Assignment Engine' }
      ],
      voiceNotes: [
        {
          id: 'vn-1',
          duration: '0:42',
          timestamp: '2026-09-08 15:10',
          transcript: 'Zákazník spěchá na dokončení před podzimními dešti. Preferuje antracitovou barvu konstrukce.'
        }
      ]
    },
    {
      id: 'lead-2',
      title: `Kompletní výměna střešní krytiny - ${company.city}`,
      description: 'Demontáž staré eternitové střechy, montáž nové pálené tašky Tondach včetně zateplení krovu a nové okapové soustavy.',
      city: company.city,
      address: 'Louky 88, ' + company.city,
      customerName: 'Marta Dvořáková',
      customerPhone: '+420 732 998 877',
      customerEmail: 'm.dvorakova@gmail.com',
      preferredDate: '2026-10-02',
      price: 480000,
      status: 'Contacted',
      priority: 'Urgent',
      assignedEmployeeId: 'emp-2',
      assignedEmployeeName: 'Martin Kovář',
      thumbnail: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=600&q=80',
      photos: [
        {
          id: 'p-2',
          name: 'Stare_stresni_okno.jpg',
          type: 'photo',
          category: 'Before',
          url: 'https://images.unsplash.com/photo-1590381105924-c72589b9ef3f?auto=format&fit=crop&w=800&q=80',
          uploadedAt: '2026-09-07 10:00'
        }
      ],
      files: [],
      checklist: [
        { id: 'c-1', text: 'Statické posouzení krovu', completed: true },
        { id: 'c-2', text: 'Kalkulace materiálu', completed: true },
        { id: 'c-3', text: 'Podpis smlouvy o dílo', completed: false }
      ],
      aiSummary: {
        jobType: services[1] || 'Střechy',
        complexity: 'High',
        estimatedRange: '450,000 - 520,000 CZK',
        assignedEmployee: 'Martin Kovář',
        risks: ['Likvidace azbestové krytiny', 'Omezené parkovací možnosti pro jeřáb'],
        recommendedNextStep: 'Zajistit povolení na zábor veřejného prostranství.'
      },
      timeline: defaultTimeline,
      aiChat: defaultAiChat,
      weather: { date: '2.10.2026', temp: 16, condition: 'Rain', windSpeed: 24, rainProbability: 80, warning: 'Hrozí dešťové srážky. Nutno plachtovat krov.' },
      history: [
        { id: 'h-1', timestamp: '2026-09-07 09:30', action: 'Nová poptávka z poptávkového portálu', author: 'Systém' }
      ]
    },
    {
      id: 'lead-3',
      title: 'Zateplení fasády rodinného domu',
      description: 'Kontaktní zateplení fasády polystyrenem EPS 150mm vč. silikonové omítky v jemném šedém odstínu.',
      city: company.city,
      address: 'Nádražní 45, ' + company.city,
      customerName: 'Pavel Říha',
      customerPhone: '+420 721 112 233',
      customerEmail: 'riha.p@volny.cz',
      preferredDate: '2026-10-15',
      price: 310000,
      status: 'Quote',
      priority: 'Medium',
      assignedEmployeeId: 'emp-3',
      assignedEmployeeName: 'Tomáš Veselý',
      thumbnail: 'https://images.unsplash.com/photo-1541888946425-d0fbb18f86e3?auto=format&fit=crop&w=600&q=80',
      photos: [],
      files: [],
      checklist: [
        { id: 'c-1', text: 'Zaměření plochy', completed: true },
        { id: 'c-2', text: 'Vytvoření cenové nabídky', completed: true }
      ],
      aiSummary: {
        jobType: services[2] || 'Rekonstrukce',
        complexity: 'Medium',
        estimatedRange: '290,000 - 330,000 CZK',
        assignedEmployee: 'Tomáš Veselý',
        risks: ['Závislost na venkovních teplotách'],
        recommendedNextStep: 'Schválení rozpočtu zákazníkem.'
      },
      timeline: defaultTimeline,
      aiChat: defaultAiChat,
      weather: sampleWeather,
      history: [
        { id: 'h-1', timestamp: '2026-09-05 11:20', action: 'Vytvořena cenová nabídka č. Q-2026-041', author: 'Tomáš Veselý' }
      ]
    },
    {
      id: 'lead-4',
      title: 'Generální rekonstrukce bytového jádra',
      description: 'Zděné jádro, nové rozvody vody, elektřiny a odpadů, obklady a sanita.',
      city: company.city,
      address: 'Slezská 10, ' + company.city,
      customerName: 'Lucie Benešová',
      customerPhone: '+420 608 776 554',
      customerEmail: 'benesova.l@email.cz',
      preferredDate: '2026-09-20',
      price: 180000,
      status: 'In Progress',
      priority: 'High',
      assignedEmployeeId: 'emp-1',
      assignedEmployeeName: 'Petr Novotný',
      thumbnail: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80',
      photos: [
        {
          id: 'p-3',
          name: 'Jadro_pocas_instalace.jpg',
          type: 'photo',
          category: 'During',
          url: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=800&q=80',
          uploadedAt: '2026-09-06 12:00'
        }
      ],
      files: [],
      checklist: [
        { id: 'c-1', text: 'Bourací práce', completed: true },
        { id: 'c-2', text: 'Instalace rozvodů', completed: true },
        { id: 'c-3', text: 'Obklady a dlažba', completed: false }
      ],
      aiSummary: {
        jobType: 'Rekonstrukce',
        complexity: 'High',
        estimatedRange: '170,000 - 190,000 CZK',
        assignedEmployee: 'Petr Novotný',
        risks: ['Staré rozvody v domě'],
        recommendedNextStep: 'Kontrola hydroizolace před obklady.'
      },
      timeline: defaultTimeline,
      aiChat: defaultAiChat,
      history: [
        { id: 'h-1', timestamp: '2026-09-06 08:00', action: 'Zahájení stavebních prací', author: 'Petr Novotný' }
      ]
    },
    {
      id: 'lead-5',
      title: 'Montáž hliníkového přístřešku na auto',
      description: 'Moderní carport pro 2 vozidla s pultovou střechou a integrovaným dešťovým svodem.',
      city: company.city,
      address: 'K lesu 3, ' + company.city,
      customerName: 'Jaroslav Černý',
      customerPhone: '+420 776 554 332',
      customerEmail: 'cerny.j@post.cz',
      preferredDate: '2026-09-12',
      price: 145000,
      status: 'Completed',
      priority: 'Low',
      assignedEmployeeId: 'emp-2',
      assignedEmployeeName: 'Martin Kovář',
      thumbnail: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=600&q=80',
      photos: [
        {
          id: 'p-4',
          name: 'Dokonceny_carport.jpg',
          type: 'photo',
          category: 'After',
          url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80',
          uploadedAt: '2026-09-09 16:00'
        }
      ],
      files: [],
      checklist: [
        { id: 'c-1', text: 'Předání díla', completed: true },
        { id: 'c-2', text: 'Podpis předávacího protokolu', completed: true }
      ],
      aiSummary: {
        jobType: 'Pergoly',
        complexity: 'Low',
        estimatedRange: '140,000 - 150,000 CZK',
        assignedEmployee: 'Martin Kovář',
        risks: [],
        recommendedNextStep: 'Uzavřít zakázku a vyžádat si recenzi.'
      },
      timeline: defaultTimeline,
      aiChat: defaultAiChat,
      history: [
        { id: 'h-1', timestamp: '2026-09-09 16:30', action: 'Zakázka úspěšně dokončena', author: 'Martin Kovář' }
      ]
    },
    {
      id: 'lead-6',
      title: 'Výměna oken a vchodových dveří',
      description: 'Plastová okna trojsklo v dekoru zlatý dub pro rodinný dům.',
      city: company.city,
      address: 'Hlavní 99, ' + company.city,
      customerName: 'Eva Horáková',
      customerPhone: '+420 604 111 222',
      customerEmail: 'horakova.e@email.cz',
      preferredDate: '2026-09-30',
      price: 260000,
      status: 'Lost',
      priority: 'Low',
      assignedEmployeeId: 'emp-3',
      assignedEmployeeName: 'Tomáš Veselý',
      thumbnail: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=600&q=80',
      photos: [],
      files: [],
      checklist: [],
      aiSummary: {
        jobType: 'Rekonstrukce',
        complexity: 'Low',
        estimatedRange: '250,000 - 270,000 CZK',
        assignedEmployee: 'Tomáš Veselý',
        risks: [],
        recommendedNextStep: 'Zákazník zvolil levnější konkurenční nabídku.'
      },
      timeline: defaultTimeline,
      aiChat: defaultAiChat,
      history: [
        { id: 'h-1', timestamp: '2026-09-04 10:00', action: 'Označeno jako ztraceno (cena)', author: 'Tomáš Veselý' }
      ]
    }
  ];
}

export function generateRealisticEmployees(city: string = 'Třinec'): Employee[] {
  return [
    {
      id: 'emp-1',
      name: 'Petr Novotný',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
      specialization: 'Střechy & Tesařské práce',
      capacity: 85,
      maxCapacity: 100,
      todaysJobsCount: 2,
      status: 'Green',
      phone: '+420 777 987 654',
      email: 'novotny@stavby.cz',
      currentLocation: `${city}, Zahradní 12`,
      distanceKm: 4.5
    },
    {
      id: 'emp-2',
      name: 'Martin Kovář',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
      specialization: 'Pergoly & Hliníkové konstrukce',
      capacity: 95,
      maxCapacity: 100,
      todaysJobsCount: 3,
      status: 'Orange',
      phone: '+420 602 333 444',
      email: 'kovar@stavby.cz',
      currentLocation: `${city}, K lesu 3`,
      distanceKm: 8.2
    },
    {
      id: 'emp-3',
      name: 'Tomáš Veselý',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80',
      specialization: 'Fasády & Zateplování',
      capacity: 60,
      maxCapacity: 100,
      todaysJobsCount: 1,
      status: 'Green',
      phone: '+420 725 888 999',
      email: 'vesely@stavby.cz',
      currentLocation: `${city}, Nádražní 45`,
      distanceKm: 12.0
    },
    {
      id: 'emp-4',
      name: 'Jan Richter',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=200&q=80',
      specialization: 'Rekonstrukce interiérů',
      capacity: 100,
      maxCapacity: 100,
      todaysJobsCount: 4,
      status: 'Red',
      phone: '+420 731 222 333',
      email: 'richter@stavby.cz',
      currentLocation: `${city}, Slezská 10`,
      distanceKm: 15.5
    }
  ];
}
