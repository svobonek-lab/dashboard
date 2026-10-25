import type { MappedLeadStatus, MappedPriority } from '../../../shared/model/integrationMapping';

export type LeadStatus = MappedLeadStatus;
export type Priority = MappedPriority;
export type LeadSource = 'manual' | 'csv' | 'public_form' | 'ai_inbox' | 'widget' | 'connector' | string;

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
  source?: LeadSource;
  id: string;
  sourceVersion?: string;
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
  location?: string;
  calculatedMargin?: number;
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
