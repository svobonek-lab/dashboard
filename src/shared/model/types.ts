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

export interface CRMNotification {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  type: 'lead' | 'quote' | 'employee' | 'system';
}

