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

export type LeadStatus = 'New' | 'Contacted' | 'Quote' | 'In Progress' | 'Completed' | 'Lost';
export type Priority = 'Low' | 'Medium' | 'High' | 'Urgent';

export interface LeadChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

export interface LeadFile {
  id: string;
  name: string;
  type: 'photo' | 'contract' | 'pdf' | 'invoice' | 'note';
  url: string;
  uploadedAt: string;
  category?: 'Before' | 'During' | 'After' | 'General';
}

export interface AISummary {
  jobType: string;
  complexity: 'Low' | 'Medium' | 'High' | 'Expert';
  estimatedRange: string;
  assignedEmployee: string;
  risks: string[];
  recommendedNextStep: string;
  sentiment?: string;
  riskScore?: number;
  suggestedPrice?: number;
  materials?: string[];
  estimatedDays?: number;
}

export interface TimelineStep {
  id: string;
  title: string;
  status?: 'Completed' | 'Current' | 'Pending';
  timestamp?: string;
  responsibleEmployee?: string;
  notes?: string;
  date?: string;
  time?: string;
  completed?: boolean;
  description?: string;
}

export interface AIChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
}

export interface WeatherInfo {
  date: string;
  temp: number;
  condition: 'Sunny' | 'Rain' | 'Cloudy' | 'Snow' | 'Windy';
  windSpeed: number; // km/h
  rainProbability: number; // %
  warning?: string;
  recommendation?: string;
}

export interface Lead {
  organization_id?: string;
  id: string;
  title: string;
  description: string;
  city: string;
  address: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  preferredDate: string;
  price: number;
  status: LeadStatus;
  priority: Priority;
  assignedEmployeeId: string;
  assignedEmployeeName: string;
  thumbnail: string;
  photos: LeadFile[];
  files: LeadFile[];
  checklist: LeadChecklistItem[];
  aiSummary: AISummary;
  timeline: TimelineStep[];
  aiChat: AIChatMessage[];
  weather?: WeatherInfo;
  latLng?: { lat: number; lng: number };
  createdDate?: string;
  urgency?: string;
  projectType?: string;
  phone?: string;
  email?: string;
  history: {
    id: string;
    timestamp: string;
    action: string;
    author: string;
  }[];
  voiceNotes?: {
    id: string;
    duration: string;
    timestamp: string;
    audioUrl?: string;
    transcript: string;
  }[];
}

export type EmployeeStatus = 'Green' | 'Orange' | 'Red';
export type EmployeeAccountStatus = 'Pending' | 'Active' | 'Disabled';

export interface Employee {
  id: string;
  name: string;
  avatar: string;
  specialization: string;
  role?: string;
  capacity: number; // percentage
  maxCapacity: number;
  todaysJobsCount: number;
  status: EmployeeStatus;
  invitationStatus?: EmployeeAccountStatus;
  active?: boolean;
  phone: string;
  email: string;
  currentLocation?: string;
  distanceKm?: number;
  inviteToken?: string;
  invitedAt?: string;
  organization_id?: string;
  auth_user_id?: string;
}

export interface QuoteItem {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  total: number;
}

export interface Quote {
  id: string;
  leadId: string;
  companyName: string;
  customerName: string;
  customerAddress: string;
  date: string;
  validUntil: string;
  items: QuoteItem[];
  subtotal: number;
  tax: number;
  total: number;
  terms: string;
  status: 'Draft' | 'Sent' | 'Approved' | 'Rejected';
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

export interface CRMNotification {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  type: 'lead' | 'quote' | 'employee' | 'system';
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

