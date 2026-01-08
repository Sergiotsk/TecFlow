const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;
let pdfSavePath = null;

// Get or create PDF save directory
function getPdfSaveDirectory() {
    if (pdfSavePath) return pdfSavePath;

    const userDataPath = app.getPath('userData');
    const defaultPdfPath = path.join(userDataPath, 'PDFs');

    // Create directory if it doesn't exist
    if (!fs.existsSync(defaultPdfPath)) {
        fs.mkdirSync(defaultPdfPath, { recursive: true });
    }

    pdfSavePath = defaultPdfPath;
    return pdfSavePath;
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1000,
        minHeight: 700,
        // En desarrollo usamos public/, en producción dist/ (donde Vite copia los assets)
        icon: path.join(__dirname, process.env.NODE_ENV === 'development' ? '../public/icon.png' : '../dist/icon.png'),
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.cjs')
        },
        autoHideMenuBar: true,
        title: 'TecFlow'
    });

    // En producción carga el archivo html, en desarrollo la url local
    const isDev = process.env.NODE_ENV === 'development';

    if (isDev) {
        mainWindow.loadURL('http://localhost:3000');
        mainWindow.webContents.openDevTools();
    } else {
        mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    }

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

// App lifecycle
app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

// IPC Handlers

// Get PDF save directory
ipcMain.handle('get-pdf-directory', async () => {
    return getPdfSaveDirectory();
});

// Choose PDF save directory
ipcMain.handle('choose-pdf-directory', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openDirectory', 'createDirectory'],
        title: 'Seleccionar carpeta para guardar PDFs'
    });

    if (!result.canceled && result.filePaths.length > 0) {
        pdfSavePath = result.filePaths[0];
        return pdfSavePath;
    }

    return null;
});

// Save PDF
ipcMain.handle('save-pdf', async (event, { filename, htmlContent }) => {
    try {
        const saveDir = getPdfSaveDirectory();
        const fullPath = path.join(saveDir, filename);

        // Create a hidden window for PDF generation
        const pdfWindow = new BrowserWindow({
            show: false,
            webPreferences: {
                nodeIntegration: false
            }
        });

        // Load the HTML content
        await pdfWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`);

        // Generate PDF
        const pdfData = await pdfWindow.webContents.printToPDF({
            marginsType: 0,
            printBackground: true,
            printSelectionOnly: false,
            landscape: false,
            pageSize: 'A4'
        });

        // Save to file
        fs.writeFileSync(fullPath, pdfData);

        // Close the hidden window
        pdfWindow.close();

        return { success: true, path: fullPath };
    } catch (error) {
        console.error('Error saving PDF:', error);
        return { success: false, error: error.message };
    }
});

// Export data to file
ipcMain.handle('export-data', async (event, { filename, data }) => {
    try {
        const result = await dialog.showSaveDialog(mainWindow, {
            title: 'Exportar Datos',
            defaultPath: filename,
            filters: [
                { name: 'JSON Files', extensions: ['json'] }
            ]
        });

        if (!result.canceled && result.filePath) {
            fs.writeFileSync(result.filePath, data);
            return { success: true, path: result.filePath };
        }

        return { success: false, canceled: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// Import data from file
ipcMain.handle('import-data', async () => {
    try {
        const result = await dialog.showOpenDialog(mainWindow, {
            title: 'Importar Datos',
            filters: [
                { name: 'JSON Files', extensions: ['json'] }
            ],
            properties: ['openFile']
        });

        if (!result.canceled && result.filePaths.length > 0) {
            const data = fs.readFileSync(result.filePaths[0], 'utf-8');
            return { success: true, data };
        }

        return { success: false, canceled: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// Open PDF directory in file explorer
ipcMain.handle('open-pdf-directory', async () => {
    const dir = getPdfSaveDirectory();
    shell.openPath(dir);
    return dir;
});

// --- GENERIC FILE HANDLER HELPERS ---
const getFilePath = (fileName) => path.join(app.getPath('userData'), fileName);

const readJsonFile = (fileName) => {
    const filePath = getFilePath(fileName);
    if (fs.existsSync(filePath)) {
        try {
            return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        } catch (e) {
            console.error(`Error reading ${fileName}:`, e);
            return [];
        }
    }
    return [];
};

const writeJsonFile = (fileName, data) => {
    try {
        fs.writeFileSync(getFilePath(fileName), JSON.stringify(data, null, 2));
        return true;
    } catch (e) {
        console.error(`Error writing ${fileName}:`, e);
        return false;
    }
};

// --- DATA PERSISTENCE HANDLERS ---

// Settings
ipcMain.handle('save-settings', async (event, settings) => {
    return { success: writeJsonFile('settings.json', settings) };
});

ipcMain.handle('load-settings', async () => {
    const filePath = getFilePath('settings.json');
    if (fs.existsSync(filePath)) {
        return { success: true, settings: readJsonFile('settings.json') };
    }
    return { success: false, error: 'File not found' };
});

// Clients
ipcMain.handle('save-clients', async (event, clients) => {
    // Also backup to a timestamped file occasionally? Maybe overkill for now.
    return { success: writeJsonFile('clients.json', clients) };
});

ipcMain.handle('load-clients', async () => {
    return { success: true, clients: readJsonFile('clients.json') };
});

// Documents (Quotes & Reports)
// We will store all docs in 'documents.json' for simplicity
ipcMain.handle('save-documents', async (event, documents) => {
    return { success: writeJsonFile('documents.json', documents) };
});

ipcMain.handle('load-documents', async () => {
    return { success: true, documents: readJsonFile('documents.json') };
});

// --- AUTO UPDATER ---
const { autoUpdater } = require('electron-updater');

// Configure autoUpdater
autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;

// Event forwarding to renderer
autoUpdater.on('checking-for-update', () => {
    if (mainWindow) mainWindow.webContents.send('update-status', 'checking');
});

autoUpdater.on('update-available', (info) => {
    if (mainWindow) mainWindow.webContents.send('update-available', info);
});

autoUpdater.on('update-not-available', (info) => {
    // Optional: send 'uptodate' status if triggered manually
    if (mainWindow) mainWindow.webContents.send('update-status', 'uptodate');
});

autoUpdater.on('error', (err) => {
    if (mainWindow) mainWindow.webContents.send('update-error', err.toString());
});

autoUpdater.on('download-progress', (progressObj) => {
    if (mainWindow) mainWindow.webContents.send('update-progress', progressObj);
});

autoUpdater.on('update-downloaded', (info) => {
    if (mainWindow) mainWindow.webContents.send('update-downloaded', info);
});

// IPC Handlers for Updater
ipcMain.on('check-updates', () => {
    if (process.env.NODE_ENV === 'development') {
        // Skip in dev or mock it
        console.log('Skipping update check in dev mode');
        return;
    }
    autoUpdater.checkForUpdatesAndNotify();
});

ipcMain.on('restart-app', () => {
    autoUpdater.quitAndInstall();
});

