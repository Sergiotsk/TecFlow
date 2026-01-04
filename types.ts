export type DocType = 'quote' | 'report';

export interface BusinessSettings {
  name: string;
  email: string;
  phone: string;
  address: string;
  website: string;
  logo: string | null; // Base64 string
  brandColor: string; // Hex code
  defaultFooter: string;
  finalMessage: string; // Message at the end of the document
}

export interface Client {
  id: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  taxId: string; // CUIT/DNI
  notes: string;
}

export type ItemType = 'service' | 'material';

export interface LineItem {
  id: string;
  type: ItemType;
  description: string;
  quantity: number;
  unitPrice: number;
}

export type PresetCategory = string;

export interface PresetItem {
  id: string;
  type: ItemType;
  category: PresetCategory;
  description: string;
  unitPrice: number;
}

export interface QuoteData {
  id: string;
  date: string;
  validUntil: string;
  clientName: string;
  clientAddress: string;
  clientId: string; // DNI/CUIT
  items: LineItem[];
  notes: string;
  taxRate: number; // Percentage
  currency: string;
  materialsSectionTitle?: string; // Customizable title for materials section

  // Status Logic
  locked?: boolean;
}

export interface ReportData {
  id: string;
  date: string;
  clientName: string;
  deviceType: string;
  serialNumber: string;
  reportedIssue: string;
  diagnosis: string;
  workPerformed: string;
  recommendations: string;
  status: 'Reparado' | 'En Proceso' | 'Sin Solución' | 'Pendiente de Repuesto';
  locked?: boolean;
}

export interface SavedQuote extends QuoteData {
  savedAt: string; // ISO timestamp
  lastModified: string; // ISO timestamp
}

export interface SavedReport extends ReportData {
  savedAt: string; // ISO timestamp
  lastModified: string; // ISO timestamp
}

export interface AppState {
  mode: DocType;
  showSettings: boolean;
  business: BusinessSettings;
  quote: QuoteData;
  report: ReportData;
}