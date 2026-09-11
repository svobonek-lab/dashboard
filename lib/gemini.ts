import { GoogleGenAI, Type } from '@google/genai';
import { CompanyBranding, WebsiteAudit } from '../types';

function getFallbackData(url: string) {
  let domainName = 'Stavby Pro';
  let city = 'Praha';
  let primaryColor = '#0A4EA3';
  let services = ['Pergoly', 'Střechy', 'Rekonstrukce', 'Fasády'];
  let rating = 4.8;
  let count = 94;
  let summary = 'Vysoká kvalita stavebních prací a profesionální přístup na stavbě. Několik zákazníků však zmiňuje delší čekání na úvodní cenovou nabídku a reakci na e-mailové poptávky.';

  if (url.includes('novak')) {
    domainName = 'Novák Stavby';
    city = 'Třinec';
    primaryColor = '#0A4EA3';
    services = ['Pergoly', 'Střechy', 'Dřevostavby', 'Zateplení'];
    rating = 4.9;
    count = 142;
    summary = 'Zákazníci si velmi cení rychlosti realizace pergol a tesařských konstrukcí. Slabým místem je absence okamžitého potvrzení přijetí poptávky a delší doba zpracování výkazu výměr.';
  } else if (url.includes('alfa') || url.includes('stav')) {
    domainName = 'Alfa Stavitelé s.r.o.';
    city = 'Brno';
    primaryColor = '#D97706';
    services = ['Hrubé stavby', 'Základové desky', 'Zděné domy', 'Betonové ploty'];
    rating = 4.7;
    count = 68;
    summary = 'Skvělá hodnocení za přesnost lití základových desek a dodržování stavebních harmonogramů. Recenze však poukazují na obtížnější telefonickou zastupitelnost během stavební sezóny.';
  } else if (url.includes('1strechy') || url.includes('strechy')) {
    domainName = 'Střechy & Pergoly s.r.o.';
    city = 'Ostrava';
    primaryColor = '#10B981';
    services = ['Tesařské práce', 'Střešní krytiny', 'Pergoly', 'Klempířství'];
    rating = 4.6;
    count = 52;
    summary = 'Zákazníci chválí řemeslnou zručnost klempířů a tesařů. Kritika se zaměřuje na nedostatečné průběžné informování o změnách v harmonogramu a chybějící online fotodokumentaci prací.';
  } else if (url) {
    try {
      const u = new URL(url.startsWith('http') ? url : `https://${url}`);
      const rawName = u.hostname.replace('www.', '').split('.')[0];
      domainName = rawName.charAt(0).toUpperCase() + rawName.slice(1) + ' Stavby';
    } catch (e) {
      // fallback
    }
  }

  const branding: CompanyBranding = {
    name: domainName,
    logoUrl: '',
    primaryColor,
    phone: '+420 777 888 999',
    email: `info@${domainName.toLowerCase().replace(/[^a-z0-9]/g, '')}.cz`,
    city,
    address: `Hlavní 123, ${city}`,
    services
  };

  const audit: WebsiteAudit = {
    url,
    companyName: domainName,
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
  const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;

  if (!apiKey) {
    await new Promise(r => setTimeout(r, 2000));
    return getFallbackData(url);
  }

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: `Analyze the construction company website URL: ${url}. Perform a digital presence audit and branding extraction.
      
      Return strictly a JSON object with the following keys and structure:
      {
        "name": "Extracted name of the company",
        "phone": "Extracted phone number",
        "email": "Extracted email address",
        "city": "Operational headquarters city in Czech Republic / Slovakia",
        "services": ["array of 3-5 extracted construction/renovation services"],
        "primaryColor": "detected primary HEX color matching the website style (e.g., #2563eb)",
        "score": 55, // Overall digital score (0-100)
        "websiteUxScore": 65, // UX score (0-100)
        "leadCaptureScore": 40, // Lead Capture score (0-100)
        "responseAutomationScore": 15, // Response Automation score (0-100)
        "customerExperienceScore": 60, // Customer Experience score (0-100)
        "googleReviewsRating": 4.7, // Simulated/Extracted Google rating
        "googleReviewsCount": 84, // Simulated/Extracted reviews count
        "googleReviewsSummary": "Short Czech text summarizing Google Review sentiments, pros, and cons (e.g., 'Kvalitní práce, ale zákazníci si stěžují na pomalejší komunikaci.')",
        "issues": [
          {
            "id": "iss-1",
            "title": "Short Czech issue title",
            "description": "Short Czech description of the issue",
            "severity": "error", // 'error' or 'warning'
            "category": "lead", // 'ux' | 'lead' | 'automation' | 'cx'
            "whyItHurts": "Czech description of how this hurts their revenue/retention",
            "howWeFixIt": "Czech explanation of how DemoFactory CRM automates and solves it",
            "timeSaved": "Estimated hours saved per week (e.g. '5 hodin / týdně')"
          }
        ],
        "recommendations": [
          {
            "id": "rec-1",
            "title": "Short Czech title of action",
            "description": "Czech description of recommended strategy",
            "impact": "High", // 'High' | 'Medium' | 'Low'
            "effort": "Easy", // 'Easy' | 'Medium' | 'Hard'
            "category": "lead"
          }
        ],
        "upgradedBenefits": ["3-4 Czech benefits of migrating to the CRM"]
      }

      Analyze carefully and tailor all descriptions, issues, and services specifically to construction, roofing, masonry, or pergolas depending on the extracted context. Ensure all texts are in Czech.`,
      config: {
        responseMimeType: 'application/json'
      }
    });

    const text = response.text || '{}';
    const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const data = JSON.parse(cleanJson);

    const branding: CompanyBranding = {
      name: data.name || 'Nová Stavební Firma',
      logoUrl: '',
      primaryColor: data.primaryColor || '#0A4EA3',
      phone: data.phone || '+420 777 123 456',
      email: data.email || 'info@stavba.cz',
      city: data.city || 'Praha',
      address: `Stavební 1, ${data.city || 'Praha'}`,
      services: data.services || ['Střechy', 'Pergoly', 'Rekonstrukce']
    };

    const audit: WebsiteAudit = {
      url,
      companyName: branding.name,
      score: data.score || 52,
      websiteUxScore: data.websiteUxScore || 65,
      leadCaptureScore: data.leadCaptureScore || 45,
      responseAutomationScore: data.responseAutomationScore || 20,
      customerExperienceScore: data.customerExperienceScore || 70,
      googleReviewsRating: data.googleReviewsRating || 4.7,
      googleReviewsCount: data.googleReviewsCount || 85,
      googleReviewsSummary: data.googleReviewsSummary || 'Kvalitně odvedená tesařská a stavební práce, ale pomalejší reakční doba na e-maily a poptávky.',
      issues: data.issues || [
        { id: 'iss-1', title: 'Chybějící lead formulář', description: 'Zákazníci nemají kde pohodlně zadat poptávku.', severity: 'error', category: 'lead', whyItHurts: 'Zákazníci odcházejí ke konkurenci.', howWeFixIt: 'Zavedeme interaktivní popup lead widget.', timeSaved: '4 hodiny / týdně' },
        { id: 'iss-2', title: 'Pomalý reakční čas', description: 'Chybí okamžité notifikace pro dispečink.', severity: 'warning', category: 'automation', whyItHurts: 'Nízký poměr uzavřených obchodů.', howWeFixIt: 'SMS autoresponder odešle zprávu do 10s.', timeSaved: '6 hodin / týdně' }
      ],
      recommendations: data.recommendations || [
        { id: 'rec-1', title: 'Instalovat interaktivní AI Lead Widget', description: 'Okamžitý sběr poptávek přímo z hlavní strany webu s automatickým ukládáním do CRM.', impact: 'High', effort: 'Easy', category: 'lead' },
        { id: 'rec-2', title: 'Zprovoznit dispečerské auto-notifikace', description: 'Zkrácení reakční doby na minimum díky okamžitým dispečerským notifikacím do telefonu.', impact: 'High', effort: 'Easy', category: 'automation' }
      ],
      upgradedBenefits: data.upgradedBenefits || [
        'Okamžitý nárůst poptávek díky widgetu',
        'Automatická dispečerská mapa a přiřazování techniků'
      ]
    };

    return { branding, audit };
  } catch (err) {
    console.error('Gemini API analysis failed or quota exceeded, using smart fallback:', err);
    return getFallbackData(url);
  }
}
