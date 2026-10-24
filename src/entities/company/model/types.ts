export interface CompanyBranding {
  name: string;
  logoUrl?: string;
  primaryColor: string;
  phone: string;
  email: string;
  city: string;
  address: string;
  services: string[];
  website?: string;
}
export interface WebsiteAuditItem {
  id: string;
  title: string;
  description: string;
  severity: 'warning' | 'error' | 'info';
  category?: 'ux' | 'lead' | 'automation' | 'cx' | string;
  whyItHurts?: string;
  howWeFixIt?: string;
  timeSaved?: string;
}

export interface WebsiteAuditRecommendation {
  id: string;
  title: string;
  description: string;
  impact: 'High' | 'Medium' | 'Low' | string;
  effort: 'Easy' | 'Medium' | 'Hard' | string;
  category: string;
}

export interface WebsiteAudit {
  url: string;
  companyName: string;
  score: number;
  websiteUxScore: number;
  leadCaptureScore: number;
  responseAutomationScore: number;
  customerExperienceScore: number;
  googleReviewsRating?: number | null;
  googleReviewsCount: number;
  googleReviewsSummary: string;
  issues: WebsiteAuditItem[];
  recommendations: WebsiteAuditRecommendation[];
  upgradedBenefits: string[];
  analysisFailed?: boolean;
}

export interface WebsiteAnalysisConfidence {
  companyName: number;
  logo: number;
  colors: number;
  contacts: number;
  services: number;
}

export interface WebsiteAnalysisResult {
  companyName: string;
  website: string;
  logoUrl: string;
  faviconUrl: string;
  primaryColor: string;
  secondaryColor: string;
  phone: string;
  email: string;
  address: string;
  services: string[];
  heroImageUrl: string;
  socialLinks: string[];
  confidence: WebsiteAnalysisConfidence;
  branding?: CompanyBranding;
  audit?: WebsiteAudit;
}

