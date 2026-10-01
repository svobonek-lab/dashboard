import type { Lead } from '../../types';

interface ManualLeadInput {
  title: string;
  customerName: string;
  phone: string;
  email: string;
  address: string;
  budget: string;
  date?: string;
  description?: string;
  thumbnail?: string;
  author: string;
}

export function createManualLeadDraft(input: ManualLeadInput): Lead {
  const price = Number(input.budget);
  return {
    id: '',
    title: input.title.trim(),
    description: input.description?.trim() || '',
    city: '',
    address: input.address.trim(),
    customerName: input.customerName.trim(),
    customerPhone: input.phone.trim(),
    customerEmail: input.email.trim(),
    preferredDate: input.date || '',
    price: Number.isFinite(price) ? price : 0,
    status: 'New',
    priority: 'Medium',
    assignedEmployeeId: '',
    assignedEmployeeName: '',
    thumbnail: input.thumbnail || '',
    photos: [],
    files: [],
    checklist: [],
    aiSummary: {
      jobType: input.title.trim(),
      complexity: 'Medium',
      estimatedRange: '',
      assignedEmployee: '',
      risks: [],
      recommendedNextStep: 'Kontaktovat zákazníka',
    },
    timeline: [],
    aiChat: [],
    history: [{
      id: `pending-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString('cs-CZ'),
      action: 'Poptávka vytvořena manuálně',
      author: input.author,
    }],
  };
}
