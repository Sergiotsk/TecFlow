import { QuoteData, ReportData, SavedQuote, SavedReport } from '../types';

// Date Utilities
export const formatDateToInput = (isoDate: string): string => {
    // Convert from dd/mm/yyyy to yyyy-mm-dd for input[type="date"]
    if (!isoDate) return '';
    const parts = isoDate.split('/');
    if (parts.length === 3) {
        return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return isoDate;
};

export const formatDateToDisplay = (isoDate: string): string => {
    // Convert from yyyy-mm-dd to dd/mm/yyyy for display
    if (!isoDate) return '';
    const parts = isoDate.split('-');
    if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return isoDate;
};

export const getCurrentDateForInput = (): string => {
    // Returns yyyy-mm-dd format for input[type="date"]
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

export const addDaysToDate = (dateStr: string, days: number): string => {
    // Expects yyyy-mm-dd format
    const date = new Date(dateStr);
    date.setDate(date.getDate() + days);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

// Storage Utilities
const QUOTES_KEY = 'saved_quotes';
const REPORTS_KEY = 'saved_reports';

export const saveQuote = (quote: QuoteData): void => {
    const quotes = getSavedQuotes();
    const now = new Date().toISOString();

    const existingIndex = quotes.findIndex(q => q.id === quote.id);

    if (existingIndex >= 0) {
        // Update existing
        quotes[existingIndex] = {
            ...quote,
            savedAt: quotes[existingIndex].savedAt,
            lastModified: now
        };
    } else {
        // Add new
        quotes.push({
            ...quote,
            savedAt: now,
            lastModified: now
        });
    }

    localStorage.setItem(QUOTES_KEY, JSON.stringify(quotes));
};

export const getSavedQuotes = (): SavedQuote[] => {
    const data = localStorage.getItem(QUOTES_KEY);
    return data ? JSON.parse(data) : [];
};

export const deleteQuote = (id: string): void => {
    const quotes = getSavedQuotes().filter(q => q.id !== id);
    localStorage.setItem(QUOTES_KEY, JSON.stringify(quotes));
};

export const saveReport = (report: ReportData): void => {
    const reports = getSavedReports();
    const now = new Date().toISOString();

    const existingIndex = reports.findIndex(r => r.id === report.id);

    if (existingIndex >= 0) {
        // Update existing
        reports[existingIndex] = {
            ...report,
            savedAt: reports[existingIndex].savedAt,
            lastModified: now
        };
    } else {
        // Add new
        reports.push({
            ...report,
            savedAt: now,
            lastModified: now
        });
    }

    localStorage.setItem(REPORTS_KEY, JSON.stringify(reports));
};

export const getSavedReports = (): SavedReport[] => {
    const data = localStorage.getItem(REPORTS_KEY);
    return data ? JSON.parse(data) : [];
};

export const deleteReport = (id: string): void => {
    const reports = getSavedReports().filter(r => r.id !== id);
    localStorage.setItem(REPORTS_KEY, JSON.stringify(reports));
};

// Export/Import Utilities
export interface ExportData {
    quotes: SavedQuote[];
    reports: SavedReport[];
    businessSettings: any;
    presets: any[];
    clients?: any[];
    exportDate: string;
    version: string;
}

export const exportAllData = (): void => {
    const data: ExportData = {
        quotes: getSavedQuotes(),
        reports: getSavedReports(),
        businessSettings: JSON.parse(localStorage.getItem('businessSettings') || '{}'),
        presets: JSON.parse(localStorage.getItem('presets') || '[]'),
        clients: JSON.parse(localStorage.getItem('clients') || '[]'),
        exportDate: new Date().toISOString(),
        version: '1.0'
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tecflow-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

export const importAllData = (file: File): Promise<void> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const data: ExportData = JSON.parse(e.target?.result as string);

                // Validate data structure
                if (!data.quotes || !data.reports) {
                    throw new Error('Formato de archivo inválido');
                }

                // Import data
                localStorage.setItem(QUOTES_KEY, JSON.stringify(data.quotes));
                localStorage.setItem(REPORTS_KEY, JSON.stringify(data.reports));

                if (data.businessSettings) {
                    localStorage.setItem('businessSettings', JSON.stringify(data.businessSettings));
                }

                if (data.presets) {
                    localStorage.setItem('presets', JSON.stringify(data.presets));
                }

                if (data.clients) {
                    localStorage.setItem('clients', JSON.stringify(data.clients));
                }

                resolve();
            } catch (error) {
                reject(error);
            }
        };

        reader.onerror = () => reject(new Error('Error al leer el archivo'));
        reader.readAsText(file);
    });
};
