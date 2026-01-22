export type DocType = 'quote' | 'report' | 'invoice';

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

  // Inventory Settings
  defaultMarkup?: number; // Global percentage profit margin
  supplierMarkups?: Record<string, number>; // Specific margins per supplier
  frozenSuppliers?: string[]; // Suppliers that are hidden/inactive
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

export interface Product {
  id: string;
  type: ItemType;
  category: PresetCategory;
  description: string;
  unitPrice: number;
  code?: string; // SKU or internal code
  stock?: number;
  isFavorite?: boolean;
  supplier?: string;
  costPrice?: number;
  lastUpdated?: string; // ISO timestamp
}

// Alias for backward compatibility, but effectively replaces PresetItem
export type PresetItem = Product;

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
  locked?: boolean;
}

export type InvoiceType = 'A' | 'B' | 'C' | 'M';

export interface InvoiceData extends QuoteData {
  invoiceType: InvoiceType;
  cae?: string;
  caeExpiration?: string;
  saleCondition: 'Contado' | 'Cta Cte' | 'Tarjeta';
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