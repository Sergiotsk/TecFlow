// Type definitions for Electron API exposed through preload
export interface ElectronAPI {
    // PDF operations
    getPdfDirectory: () => Promise<string>;
    choosePdfDirectory: () => Promise<string | null>;
    savePdf: (filename: string, footerHtml: string) => Promise<{ success: boolean; path?: string; error?: string }>;
    openPdfDirectory: () => Promise<string>;

    // Data export/import
    exportData: (filename: string, data: string) => Promise<{ success: boolean; path?: string; error?: string; canceled?: boolean }>;
    importData: () => Promise<{ success: boolean; data?: string; error?: string; canceled?: boolean }>;

    // Persistent Settings
    saveSettings: (settings: any) => Promise<{ success: boolean; error?: string }>;
    loadSettings: () => Promise<{ success: boolean; settings?: any; error?: string }>;

    // Clients & Documents Persistence
    saveClients: (clients: any[]) => Promise<{ success: boolean; error?: string }>;
    loadClients: () => Promise<{ success: boolean; clients?: any[]; error?: string }>;
    saveDocuments: (documents: any[]) => Promise<{ success: boolean; error?: string }>;
    loadDocuments: () => Promise<{ success: boolean; documents?: any[]; error?: string }>;

    // Check if running in Electron
    isElectron: boolean;

    // Auto Updater
    checkUpdates: () => void;
    restartAndInstall: () => void;
    onUpdateStatus: (callback: (status: string) => void) => void;
    onUpdateAvailable: (callback: (info: any) => void) => void;
    onUpdateProgress: (callback: (progress: any) => void) => void;
    onUpdateDownloaded: (callback: (info: any) => void) => void;
    onUpdateError: (callback: (error: string) => void) => void;
}

declare global {
    interface Window {
        electronAPI?: ElectronAPI;
    }
}

export { };
