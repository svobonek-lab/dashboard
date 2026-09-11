import { GoogleGenAI } from '@google/genai';

export default async function handler(req: any, res: any) {
  // We only support POST requests for website analysis
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  const { url } = req.body || {};

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'Missing url' });
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY environment variable is not configured' });
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
        "score": 55, -- Overall digital score (0-100)
        "websiteUxScore": 65, -- UX score (0-100)
        "leadCaptureScore": 40, -- Lead Capture score (0-100)
        "responseAutomationScore": 15, -- Response Automation score (0-100)
        "customerExperienceScore": 60, -- Customer Experience score (0-100)
        "googleReviewsRating": 4.7, -- Simulated/Extracted Google rating
        "googleReviewsCount": 84, -- Simulated/Extracted reviews count
        "googleReviewsSummary": "Short Czech text summarizing Google Review sentiments, pros, and cons (e.g., 'Kvalitní práce, ale zákazníci si stěžují na pomalejší komunikaci.')",
        "issues": [
          {
            "id": "iss-1",
            "title": "Short Czech issue title",
            "description": "Short Czech description of the issue",
            "severity": "error", -- 'error' or 'warning'
            "category": "lead", -- 'ux' | 'lead' | 'automation' | 'cx'
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
            "impact": "High", -- 'High' | 'Medium' | 'Low'
            "effort": "Easy", -- 'Easy' | 'Medium' | 'Hard'
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
    const parsedData = JSON.parse(cleanJson);

    // Reconstruct matching the original branding/audit structure returned by analyzeWebsiteWithGemini
    const branding = {
      name: parsedData.name || 'Nová Stavební Firma',
      logoUrl: '',
      primaryColor: parsedData.primaryColor || '#0A4EA3',
      phone: parsedData.phone || '+420 777 123 456',
      email: parsedData.email || 'info@stavba.cz',
      city: parsedData.city || 'Praha',
      address: `Stavební 1, ${parsedData.city || 'Praha'}`,
      services: parsedData.services || ['Střechy', 'Pergoly', 'Rekonstrukce']
    };

    const audit = {
      url,
      companyName: branding.name,
      score: parsedData.score || 52,
      websiteUxScore: parsedData.websiteUxScore || 65,
      leadCaptureScore: parsedData.leadCaptureScore || 45,
      responseAutomationScore: parsedData.responseAutomationScore || 20,
      customerExperienceScore: parsedData.customerExperienceScore || 70,
      googleReviewsRating: parsedData.googleReviewsRating || 4.7,
      googleReviewsCount: parsedData.googleReviewsCount || 85,
      googleReviewsSummary: parsedData.googleReviewsSummary || 'Kvalitně odvedená tesařská a stavební práce, ale pomalejší reakční doba na e-maily a poptávky.',
      issues: parsedData.issues || [
        { id: 'iss-1', title: 'Chybějící lead formulář', description: 'Zákazníci nemají kde pohodlně zadat poptávku.', severity: 'error', category: 'lead', whyItHurts: 'Zákazníci odcházejí ke konkurenci.', howWeFixIt: 'Zavedeme interaktivní popup lead widget.', timeSaved: '4 hodiny / týdně' },
        { id: 'iss-2', title: 'Pomalý reakční čas', description: 'Chybí okamžité notifikace pro dispečink.', severity: 'warning', category: 'automation', whyItHurts: 'Nízký poměr uzavřených obchodů.', howWeFixIt: 'SMS autoresponder odešle zprávu do 10s.', timeSaved: '6 hodin / týdně' }
      ],
      recommendations: parsedData.recommendations || [
        { id: 'rec-1', title: 'Instalovat interaktivní AI Lead Widget', description: 'Okamžitý sběr poptávek přímo z hlavní strany webu s automatickým ukládáním do CRM.', impact: 'High', effort: 'Easy', category: 'lead' },
        { id: 'rec-2', title: 'Zprovoznit dispečerské auto-notifikace', description: 'Zkrácení reakční doby na minimum díky okamžitým dispečerním notifikacím do telefonu.', impact: 'High', effort: 'Easy', category: 'automation' }
      ],
      upgradedBenefits: parsedData.upgradedBenefits || [
        'Okamžitý nárůst poptávek díky widgetu',
        'Automatická dispečerská mapa a přiřazování techniků'
      ]
    };

    return res.status(200).json({ branding, audit });
  } catch (error: any) {
    console.error('Gemini API request failed in serverless handler:', error);
    return res.status(500).json({ error: error.message || 'Chyba při komunikaci s Gemini API' });
  }
}
