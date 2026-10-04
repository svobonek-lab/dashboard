import { CompanyBranding, WebsiteAudit, WebsiteAnalysisResult } from '../types';
import { supabase } from './supabase';

function getFallbackData(url: string): WebsiteAnalysisResult & { branding: CompanyBranding; audit: WebsiteAudit } {
  const confidence = {
    companyName: 0,
    logo: 0,
    colors: 0,
    contacts: 0,
    services: 0
  };

  const branding: CompanyBranding = {
    name: '',
    website: url || '',
    logoUrl: '',
    primaryColor: '',
    phone: '',
    email: '',
    city: '',
    address: '',
    services: []
  };

  const audit: WebsiteAudit = {
    url: url || '',
    companyName: '',
    score: 0,
    websiteUxScore: 0,
    leadCaptureScore: 0,
    responseAutomationScore: 0,
    customerExperienceScore: 0,
    googleReviewsRating: null,
    googleReviewsCount: 0,
    googleReviewsSummary: '',
    issues: [],
    recommendations: [],
    upgradedBenefits: [],
    analysisFailed: true
  };

  return {
    companyName: '',
    website: url || '',
    logoUrl: '',
    faviconUrl: '',
    primaryColor: '',
    secondaryColor: '',
    phone: '',
    email: '',
    address: '',
    services: [],
    heroImageUrl: '',
    socialLinks: [],
    confidence,
    branding,
    audit
  };
}

export async function analyzeWebsiteWithGemini(url: string): Promise<WebsiteAnalysisResult & { branding: CompanyBranding; audit: WebsiteAudit }> {
  try {
    const { data: sessionData } = supabase ? await supabase.auth.getSession() : { data: { session: null } };
    const token = sessionData.session?.access_token;
    if (!token) throw new Error('Website analysis requires an authenticated account');
    const response = await fetch('/api/analyze-website', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ url })
    });

    if (!response.ok) {
      throw new Error(`Server returned error: ${response.statusText}`);
    }

    const data = await response.json();

    // Ensure branding and audit exist even if raw API output is returned
    const branding: CompanyBranding = data.branding || {
      name: data.companyName || '',
      website: data.website || url,
      logoUrl: data.logoUrl || '',
      primaryColor: data.primaryColor || '',
      phone: data.phone || '',
      email: data.email || '',
      city: '',
      address: data.address || '',
      services: data.services || []
    };

    const audit: WebsiteAudit = data.audit || {
      url: data.website || url,
      companyName: data.companyName || branding.name || '',
      score: 0,
      websiteUxScore: 0,
      leadCaptureScore: 0,
      responseAutomationScore: 0,
      customerExperienceScore: 0,
      googleReviewsRating: null,
      googleReviewsCount: 0,
      googleReviewsSummary: '',
      issues: [],
      recommendations: [],
      upgradedBenefits: [],
      analysisFailed: !data.companyName
    };

    return {
      ...data,
      branding,
      audit
    };
  } catch (err) {
    console.warn('API route failed or backend unconfigured, using clean fallback:', err);
    return getFallbackData(url);
  }
}
