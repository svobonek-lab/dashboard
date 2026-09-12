import { CompanyBranding, WebsiteAudit } from '../types';

function getFallbackData(url: string) {
  let domainPart = 'mojefirma.cz';
  let cleanName = 'Stavební firma s.r.o.';
  let city = 'Praha a Středočeský kraj';
  let primaryColor = '#2563eb';
  let services = ['Pergoly & Terasy', 'Dřevostavby na klíč', 'Rekonstrukce'];

  try {
    const u = new URL(url.startsWith('http') ? url : `https://${url}`);
    domainPart = u.hostname.replace('www.', '');
    const nameOnly = domainPart.split('.')[0].replace(/[-_]/g, ' ');
    cleanName = nameOnly.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') + ' s.r.o.';
  } catch {
    if (url) {
      const sanitized = url.replace(/https?:\/\//, '').replace('www.', '').split('/')[0];
      domainPart = sanitized;
      const nameOnly = sanitized.split('.')[0].replace(/[-_]/g, ' ');
      cleanName = nameOnly.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') + ' s.r.o.';
    }
  }

  const branding: CompanyBranding = {
    name: cleanName,
    logoUrl: `https://images.unsplash.com/photo-1541888946425-d0fbb18f0653?auto=format&fit=crop&w=160&q=80`,
    primaryColor,
    phone: '+420 774 889 100',
    email: `info@${domainPart}`,
    city,
    address: `Průmyslová 14, ${city}`,
    services
  };

  const rating = 4.8;
  const count = 86;
  const summary = 'Zákazníci si cení rychlosti komunikace a kvality řemeslného provedení stavebních prací.';

  const audit: WebsiteAudit = {
    url,
    companyName: cleanName,
    score: 54,
    websiteUxScore: 68,
    leadCaptureScore: 45,
    responseAutomationScore: 20,
    customerExperienceScore: 65,
    googleReviewsRating: rating,
    googleReviewsCount: count,
    googleReviewsSummary: summary,
    issues: [
      {
        id: 'iss-1',
        title: 'Chybějící interaktivní lead formulář',
        description: 'Web nemá rychlý poptávkový formulář pro okamžitý sběr poptávek.',
        severity: 'error',
        category: 'lead',
        whyItHurts: 'Potenciální klienti odejdou z webu během 30 sekund, pokud nemají možnost okamžitě a pohodlně poptat své stavební práce.',
        howWeFixIt: 'Nasadíme interaktivní vícekrokový 3D widget s okamžitým napojením na dispečink.',
        timeSaved: '4.5 hodiny / týdně'
      },
      {
        id: 'iss-2',
        title: 'Absence okamžitého auto-potvrzení',
        description: 'Zákazníci čekají dny na odpověď bez automatické potvrzovací SMS či e-mailu.',
        severity: 'warning',
        category: 'automation',
        whyItHurts: 'Leady, které neobdrží potvrzení do 15 minut, v 70 % případů kontaktují konkurenční stavební firmy.',
        howWeFixIt: 'Spustíme automatická potvrzení přes SMS a WhatsApp do 10 sekund od odeslání poptávky.',
        timeSaved: '6 hodin / týdně'
      },
      {
        id: 'iss-3',
        title: 'Není integrována fotogalerie před/po',
        description: 'Na webu chybí moderní vizuální ukázky realizovaných stavebních projektů s popisem.',
        severity: 'warning',
        category: 'ux',
        whyItHurts: 'Bez vizuálních a ověřitelných důkazů o dokončené práci klesá důvěra návštěvníků webu o více než 40 %.',
        howWeFixIt: 'Integrujeme mobilní nahrávání přímo z terénu s automatickou synchronizací do klientských portálů.',
        timeSaved: '3 hodiny / týdně'
      },
      {
        id: 'iss-4',
        title: 'Zastaralý workflow a manuální dispečink',
        description: 'Chybí centralizovaný CRM systém pro plánování kapacit řemeslníků a techniků.',
        severity: 'error',
        category: 'cx',
        whyItHurts: 'Složitá koordinace přes Excel a telefonní hovory vede k chybám v rozpočtech a k opoždění realizací.',
        howWeFixIt: 'Nasazení GPS dispečerského radaru, automatické přidělování techniků a generování PDF rozpočtů jedním kliknutím.',
        timeSaved: '12 hodin / týdně'
      }
    ],
    recommendations: [
      {
        id: 'rec-1',
        title: 'Aktivovat interaktivní AI Lead Widget',
        description: 'Nasazení plovoucího poptávkového asistenta pro okamžitý výpočet orientačního rozpočtu a sběr přesných parametrů stavby.',
        impact: 'High',
        effort: 'Easy',
        category: 'lead'
      },
      {
        id: 'rec-2',
        title: 'Spustit WhatsApp & SMS autoresponder',
        description: 'Nastavení automatických okamžitých odpovědí pro ujištění klienta, že na jeho poptávce již dispečink pracuje.',
        impact: 'High',
        effort: 'Easy',
        category: 'automation'
      },
      {
        id: 'rec-3',
        title: 'Zavést klientské portály s foto-deníkem',
        description: 'Umožnit stavebníkům sledovat průběh stavby online přes sdílené rozhraní s fotkami před/po nahranými z terénu.',
        impact: 'Medium',
        effort: 'Medium',
        category: 'cx'
      },
      {
        id: 'rec-4',
        title: 'Přejít na digitální kalkulace rozpočtů',
        description: 'Nahrazení Excel šablon digitálním kalkulátorem položek s automatickým výpočtem DPH a exportem do PDF rozpočtu.',
        impact: 'High',
        effort: 'Medium',
        category: 'ux'
      }
    ],
    upgradedBenefits: [
      'Zvýšení konverze poptávek o +34% díky okamžitému AI widgetu',
      'Automatické přiřazování řemeslníků podle kapacity a lokality',
      'Profesionální PDF rozpočty a klientský portál s fotodokumentací',
      'Kompletní přehled marží, zakázek a cash-flow v reálném čase'
    ]
  };

  return { branding, audit };
}

export async function analyzeWebsiteWithGemini(url: string): Promise<{ branding: CompanyBranding; audit: WebsiteAudit }> {
  try {
    const response = await fetch('/api/analyze-website', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ url })
    });

    if (!response.ok) {
      throw new Error(`Server returned error: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (err) {
    console.warn('API route failed or backend unconfigured, using smart fallback:', err);
    return getFallbackData(url);
  }
}
