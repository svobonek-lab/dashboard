import { GoogleGenAI } from '@google/genai';
import { CompanyBranding, WebsiteAudit } from '../types';

function getFallbackData(url: string) {
  let domainName = 'Stavby Pro';
  let city = 'Praha';
  let primaryColor = '#0A4EA3';
  let services = ['Pergoly', 'Střechy', 'Rekonstrukce', 'Fasády'];

  if (url.includes('novak')) {
    domainName = 'Novák Stavby';
    city = 'Třinec';
    primaryColor = '#0A4EA3';
    services = ['Pergoly', 'Střechy', 'Rekonstrukce', 'Zateplení'];
  } else if (url.includes('alfa') || url.includes('stav')) {
    domainName = 'Alfa Stavitelé s.r.o.';
    city = 'Brno';
    primaryColor = '#D97706';
    services = ['Hrubé stavby', 'Základové desky', 'Betonové ploty'];
  } else if (url.includes('1strechy') || url.includes('strechy')) {
    domainName = 'Střechy & Pergoly s.r.o.';
    city = 'Ostrava';
    primaryColor = '#10B981';
    services = ['Tesařské práce', 'Střešní krytiny', 'Pergoly'];
  } else if (url) {
    try {
      const u = new URL(url.startsWith('http') ? url : `https://${url}`);
      domainName = u.hostname.replace('www.', '').split('.')[0];
      domainName = domainName.charAt(0).toUpperCase() + domainName.slice(1) + ' Construction';
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
    score: 48,
    leadCaptureScore: 45,
    responseAutomationScore: 20,
    customerExperienceScore: 70,
    issues: [
      {
        id: 'iss-1',
        title: 'Chybějící interaktivní lead formulář',
        description: 'Web nemá rychlý poptávkový formulář pro okamžitý sběr poptávek.',
        severity: 'error'
      },
      {
        id: 'iss-2',
        title: 'Žádné automatické potvrzení klientům',
        description: 'Zákazníci čekají dny na odpověď bez automatické potvrzovací SMS či e-mailu.',
        severity: 'warning'
      },
      {
        id: 'iss-3',
        title: 'Chybí klientská fotogalerie před/po',
        description: 'Na webu chybí moderní vizuální ukázky realizovaných projektů.',
        severity: 'warning'
      },
      {
        id: 'iss-4',
        title: 'Zastaralý workflow a pomalá reakce',
        description: 'Chybí centralizovaný CRM systém a automatické přiřazování techniků.',
        severity: 'error'
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
    await new Promise(r => setTimeout(r, 1500));
    return getFallbackData(url);
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Analyze the construction company website URL: ${url}. Extract company details and audit its digital presence. Return strictly JSON with keys: name, phone, email, city, services (array of strings), primaryColor (hex), auditScore (number 0-100), issues (array of objects with title, description, severity), and upgradedBenefits (array of strings).`
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
      score: data.auditScore || 52,
      leadCaptureScore: 45,
      responseAutomationScore: 20,
      customerExperienceScore: 70,
      issues: data.issues || [
        { id: '1', title: 'Chybějící lead formulář', description: 'Zákazníci nemají kde pohodlně zadat poptávku.', severity: 'error' },
        { id: '2', title: 'Pomalý reakční čas', description: 'Chybí okamžité notifikace pro dispečink.', severity: 'warning' }
      ],
      upgradedBenefits: data.upgradedBenefits || [
        'Okamžitý nárůst poptávek',
        'Automatická dispečerská mapa a přiřazování'
      ]
    };

    return { branding, audit };
  } catch (err) {
    console.error('Gemini API analysis failed or quota exceeded, using smart fallback:', err);
    return getFallbackData(url);
  }
}

