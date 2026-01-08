const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
    // PDF operations
    getPdfDirectory: () => ipcRenderer.invoke('get-pdf-directory'),
    choosePdfDirectory: () => ipcRenderer.invoke('choose-pdf-directory'),
    savePdf: (filename, htmlContent) => ipcRenderer.invoke('save-pdf', { filename, htmlContent }),
    openPdfDirectory: () => ipcRenderer.invoke('open-pdf-directory'),

    // Data export/import
    exportData: (filename, data) => ipcRenderer.invoke('export-data', { filename, data }),
    importData: () => ipcRenderer.invoke('import-data'),

    // Persistent Settings
    saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
    loadSettings: () => ipcRenderer.invoke('load-settings'),

    // Clients & Documents Persistence
    saveClients: (clients) => ipcRenderer.invoke('save-clients', clients),
    loadClients: () => ipcRenderer.invoke('load-clients'),
    saveDocuments: (documents) => ipcRenderer.invoke('save-documents', documents),
    loadDocuments: () => ipcRenderer.invoke('load-documents'),

    // Check if running in Electron
    isElectron: true,

    // Auto Updater
    checkUpdates: () => ipcRenderer.send('check-updates'),
    restartAndInstall: () => ipcRenderer.send('restart-app'),
    onUpdateStatus: (callback) => ipcRenderer.on('update-status', (event, status) => callback(status)),
    onUpdateAvailable: (callback) => ipcRenderer.on('update-available', (event, info) => callback(info)),
    onUpdateProgress: (callback) => ipcRenderer.on('update-progress', (event, progress) => callback(progress)),
    onUpdateDownloaded: (callback) => ipcRenderer.on('update-downloaded', (event, info) => callback(info)),
    onUpdateError: (callback) => ipcRenderer.on('update-error', (event, error) => callback(error))
});
