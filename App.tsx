import React, { useState, useEffect } from 'react';
import { SettingsModal } from './components/SettingsModal';
import { SavedDocumentsModal } from './components/SavedDocumentsModal';
import { PrintableDocument } from './components/PrintableDocument';
import { polishText } from './services/geminiService';
import { BusinessSettings, QuoteData, ReportData, DocType, LineItem, PresetItem, ItemType, PresetCategory, Client } from './types';
import { saveQuote, saveReport, getCurrentDateForInput, addDaysToDate, exportAllData, importAllData } from './utils/storage';
import { v4 as uuidv4 } from 'uuid';
// @ts-ignore
import html2pdf from 'html2pdf.js';
import { ClientsManager } from './components/ClientsManager';
import { ProductsManager } from './components/ProductsManager';
import UpdateNotification from './components/UpdateNotification';
import { Product } from './types';

// Helper for ID
const generateId = () => Math.random().toString(36).substr(2, 9).toUpperCase();

// Color Utility Functions
const hexToRgb = (hex: string) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 14, g: 165, b: 233 }; // Default blue fallback
};

const mix = (color1: { r: number, g: number, b: number }, color2: { r: number, g: number, b: number }, weight: number) => {
  const w1 = weight;
  const w2 = 1 - w1;
  return {
    r: Math.round(color1.r * w1 + color2.r * w2),
    g: Math.round(color1.g * w1 + color2.g * w2),
    b: Math.round(color1.b * w1 + color2.b * w2)
  };
};

const updateTheme = (baseColorHex: string) => {
  const base = hexToRgb(baseColorHex);
  const white = { r: 255, g: 255, b: 255 };
  const black = { r: 0, g: 0, b: 0 };

  // Generate Palette
  const p50 = mix(white, base, 0.95);
  const p100 = mix(white, base, 0.85); // Slightly stronger tint
  const p500 = base;
  const p600 = mix(black, base, 0.1);
  const p700 = mix(black, base, 0.25);
  const p900 = mix(black, base, 0.45);

  const root = document.documentElement;
  root.style.setProperty('--brand-50', `${p50.r} ${p50.g} ${p50.b}`);
  root.style.setProperty('--brand-100', `${p100.r} ${p100.g} ${p100.b}`);
  root.style.setProperty('--brand-500', `${p500.r} ${p500.g} ${p500.b}`);
  root.style.setProperty('--brand-600', `${p600.r} ${p600.g} ${p600.b}`);
  root.style.setProperty('--brand-700', `${p700.r} ${p700.g} ${p700.b}`);
  root.style.setProperty('--brand-900', `${p900.r} ${p900.g} ${p900.b}`);
};

// Default Data
const defaultBusiness: BusinessSettings = {
  name: 'Sefatek',
  email: 'contacto@miempresa.com',
  phone: '+54 11 1234 5678',
  address: 'Av. Siempre Viva 123, Ciudad',
  website: 'www.miempresa.com',
  logo: null,
  brandColor: '#0ea5e9', // Default Sky-500
  defaultFooter: 'Los presupuestos tienen una validez de 15 días. Garantía de mano de obra 30 días.',
  finalMessage: 'Gracias por confiar en nuestros servicios.'
};

const defaultQuote: QuoteData = {
  id: `P-${new Date().getFullYear()}-001`,
  date: getCurrentDateForInput(),
  validUntil: addDaysToDate(getCurrentDateForInput(), 15),
  clientName: '',
  clientAddress: '',
  clientId: '',
  items: [
    { id: generateId(), type: 'service', description: 'Servicio Técnico PC (Diagnóstico)', quantity: 1, unitPrice: 0 }
  ],
  notes: '',
  taxRate: 0,
  currency: 'ARS',
  materialsSectionTitle: 'Materiales / Repuestos'
};

const defaultReport: ReportData = {
  id: `IT-${new Date().getFullYear()}-001`,
  date: getCurrentDateForInput(),
  clientName: '',
  deviceType: 'Notebook',
  serialNumber: '',
  reportedIssue: '',
  diagnosis: '',
  workPerformed: '',
  recommendations: ''
};

const defaultPresets: PresetItem[] = [
  { id: '1', type: 'service', category: 'computacion', description: 'Diagnóstico Técnico PC', unitPrice: 15000 },
  { id: '2', type: 'service', category: 'computacion', description: 'Formateo e Instalación de SO', unitPrice: 35000 },
  { id: '3', type: 'service', category: 'computacion', description: 'Mantenimiento Preventivo', unitPrice: 25000 },
  { id: '4', type: 'material', category: 'computacion', description: 'Disco SSD 480GB', unitPrice: 50000 },
  { id: '5', type: 'service', category: 'electricidad', description: 'Boca de electricidad (Mano de obra)', unitPrice: 12000 },
  { id: '6', type: 'material', category: 'electricidad', description: 'Cable 2.5mm (Rollo)', unitPrice: 45000 },
];

const getNextId = async (type: 'quote' | 'report') => {
  let docs: any[] = [];

  // Try Electron first
  if (window.electronAPI?.loadDocuments) {
    try {
      const result = await window.electronAPI.loadDocuments();
      if (result.success && result.documents) {
        docs = result.documents;
      }
    } catch (error) {
      console.error("Error loading documents for ID generation:", error);
    }
  }

  // Fallback to LocalStorage if Electron returned nothing or failed
  if (docs.length === 0) {
    const key = type === 'quote' ? 'saved_quotes' : 'saved_reports';
    const saved = localStorage.getItem(key);
    if (saved) {
      docs = JSON.parse(saved);
    }
  } else {
    // Filter Electron docs by type
    docs = docs.filter((d: any) => type === 'quote' ? ('items' in d) : !('items' in d));
  }

  const currentYear = new Date().getFullYear();
  const prefix = type === 'quote' ? 'P' : 'IT';
  const yearPrefix = `${prefix}-${currentYear}-`;

  let maxNum = 0;
  docs.forEach((doc: any) => {
    if (doc.id && doc.id.startsWith(yearPrefix)) {
      const parts = doc.id.split('-'); // e.g., P-2024-001
      if (parts.length === 3) {
        const num = parseInt(parts[2], 10);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      }
    }
  });

  return `${yearPrefix}${(maxNum + 1).toString().padStart(3, '0')}`;
};

const App: React.FC = () => {
  // --- STATE ---
  const [mode, setMode] = useState<DocType>('quote');
  const [showSettings, setShowSettings] = useState(false);
  const [showSavedDocs, setShowSavedDocs] = useState(false);
  const [showClients, setShowClients] = useState(false);
  const [showProductsManager, setShowProductsManager] = useState(false);

  // Initialize IDs on Load
  useEffect(() => {
    const initIds = async () => {
      const nextQuoteId = await getNextId('quote');
      setQuote(prev => prev.id === defaultQuote.id ? { ...prev, id: nextQuoteId } : prev);

      const nextReportId = await getNextId('report');
      setReport(prev => prev.id === defaultReport.id ? { ...prev, id: nextReportId } : prev);
    };
    initIds();
  }, []);

  const [business, setBusiness] = useState<BusinessSettings>(() => {
    const saved = localStorage.getItem('businessSettings');
    const parsed = saved ? JSON.parse(saved) : defaultBusiness;
    return { ...defaultBusiness, ...parsed };
  });

  const [quote, setQuote] = useState<QuoteData>(defaultQuote);
  const [report, setReport] = useState<ReportData>(defaultReport);

  // Presets State
  const [presets, setPresets] = useState<PresetItem[]>(() => {
    const saved = localStorage.getItem('presets');
    const parsed = saved ? JSON.parse(saved) : defaultPresets;
    // Migration for existing data without type or category
    return parsed.map((p: any) => ({
      ...p,
      type: p.type || 'service',
      category: p.category || 'general'
    }));
  });

  // Custom Categories State
  const [categories, setCategories] = useState<string[]>(() => {
    const saved = localStorage.getItem('categories');
    return saved ? JSON.parse(saved) : ['General', 'Computación', 'Electricidad'];
  });

  const [activeSupplier, setActiveSupplier] = useState<string>('');

  const [marginSettings, setMarginSettings] = useState<{ default: number, suppliers: Record<string, number>, frozenSuppliers: string[] }>(() => {
    const saved = localStorage.getItem('marginSettings');
    const parsed = saved ? JSON.parse(saved) : {};
    return {
      default: parsed.default || 30,
      suppliers: parsed.suppliers || {},
      frozenSuppliers: parsed.frozenSuppliers || []
    };
  });

  useEffect(() => {
    localStorage.setItem('categories', JSON.stringify(categories));
    localStorage.setItem('marginSettings', JSON.stringify(marginSettings));
  }, [categories, marginSettings]);
  const [showPresetForm, setShowPresetForm] = useState(false);
  const [newPreset, setNewPreset] = useState<Omit<PresetItem, 'id'>>({ type: 'service', category: 'computacion', description: '', unitPrice: 0 });
  const [selectedCategory, setSelectedCategory] = useState<PresetCategory | 'all'>('all');

  // AI Loading States
  const [isImprovingDiagnosis, setIsImprovingDiagnosis] = useState(false);
  const [isImprovingReportIssue, setIsImprovingReportIssue] = useState(false);
  const [isImprovingWorkPerformed, setIsImprovingWorkPerformed] = useState(false);

  // Derived State for Categories
  const availableCategories = React.useMemo(() => {
    const catsFromPresets = new Set(presets.map(p => p.category || 'general'));
    const allCats = new Set([...categories, ...Array.from(catsFromPresets)]);
    return Array.from(allCats).sort();
  }, [presets, categories]);


  const filterCategories = ['all', ...availableCategories];

  // Auto-reset filter if category disappears
  useEffect(() => {
    if (selectedCategory !== 'all' && !availableCategories.includes(selectedCategory)) {
      setSelectedCategory('all');
    }
  }, [availableCategories, selectedCategory]);

  const [isImprovingNotes, setIsImprovingNotes] = useState(false);

  // Client Search State
  const [allClients, setAllClients] = useState<Client[]>([]);
  const [clientSuggestions, setClientSuggestions] = useState<Client[]>([]);
  const [showClientSuggestions, setShowClientSuggestions] = useState(false);

  // --- EFFECTS ---
  useEffect(() => {
    localStorage.setItem('businessSettings', JSON.stringify(business));
    updateTheme(business.brandColor || '#0ea5e9');

    // Save to Electron file system if available
    if (window.electronAPI?.saveSettings) {
      window.electronAPI.saveSettings(business);
    }
  }, [business]);

  useEffect(() => {
    localStorage.setItem('presets', JSON.stringify(presets));
  }, [presets]);

  // Load from Electron on mount
  useEffect(() => {
    const loadFromElectron = async () => {
      // Load Settings
      if (window.electronAPI?.loadSettings) {
        try {
          const result = await window.electronAPI.loadSettings();
          if (result.success && result.settings) {
            setBusiness(prev => ({ ...prev, ...result.settings }));
          }
        } catch (error) {
          console.error("Failed to load settings from disk", error);
        }
      }

      // Load Clients for Search
      if (window.electronAPI?.loadClients) {
        try {
          const result = await window.electronAPI.loadClients();
          if (result.success && result.clients) {
            setAllClients(result.clients);
          }
        } catch (error) {
          console.error("Failed to load clients", error);
        }
      } else {
        // Fallback for web
        const saved = localStorage.getItem('clients');
        if (saved) setAllClients(JSON.parse(saved));
      }

      // Initial Sync Documents (Migration/Healing)
      if (window.electronAPI?.loadDocuments && window.electronAPI?.saveDocuments) {
        try {
          const result = await window.electronAPI.loadDocuments();
          // If Electron has no docs but LocalStorage does, sync upstream
          const localQuotes = JSON.parse(localStorage.getItem('saved_quotes') || '[]');
          const localReports = JSON.parse(localStorage.getItem('saved_reports') || '[]');

          const electronDocs = (result.success && Array.isArray(result.documents)) ? result.documents : [];

          if (electronDocs.length === 0 && (localQuotes.length > 0 || localReports.length > 0)) {
            console.log("Syncing local documents to Electron storage...");
            await window.electronAPI.saveDocuments([...localQuotes, ...localReports]);
          }
        } catch (error) {
          console.error("Failed to sync initial documents", error);
        }
      }
    };
    loadFromElectron();
  }, []);

  // --- HANDLERS ---
  // --- HANDLERS ---
  const handlePrint = async () => {
    // Lock document before printing
    if (mode === 'quote') {
      const lockedQuote = { ...quote, locked: true };
      setQuote(lockedQuote);
      await saveQuote(lockedQuote); // Save locally
      // We really should trigger the full saveDocument flow to sync to electron, but this is simpler for now
      // Let's create a helper or just call the sync logic manually if needed.
      // Actually, handleSaveDocument uses state 'quote', which might not be updated yet due to closure.
      // Best to use the local variable.
    } else {
      const lockedReport = { ...report, locked: true };
      setReport(lockedReport);
      await saveReport(lockedReport);
    }

    // Sync to electron (Copy-paste logic from handleSaveDocument for now to ensure consistency)
    if (window.electronAPI?.saveDocuments) {
      try {
        const allQuotes = JSON.parse(localStorage.getItem('saved_quotes') || '[]');
        const allReports = JSON.parse(localStorage.getItem('saved_reports') || '[]');
        const allDocs = [...allQuotes, ...allReports];
        await window.electronAPI.saveDocuments(allDocs);
      } catch (error) { console.error(error); }
    }

    // Small delay to ensure DOM is ready and state updated
    setTimeout(() => {
      window.print();
    }, 100);
  };

  const handleDownloadPDF = () => {
    // Target the specific document container
    const element = document.getElementById('actual-receipt');
    if (!element) return;

    // 1. Save original classes state
    const originalShadow = element.classList.contains('shadow-lg');
    const originalMinHeight = element.classList.contains('min-h-[297mm]');
    const originalAspect = element.classList.contains('aspect-[1/1.4142]');
    const originalHeightStyle = element.style.height;

    // 2. Remove classes that cause overflow or extra space
    // Removing min-height is crucial so it only takes up the necessary height
    element.classList.remove('shadow-lg');
    element.classList.remove('min-h-[297mm]');
    element.classList.remove('aspect-[1/1.4142]');
    // Use 290mm (safer margin for A4) to force full page height but avoid overflow
    element.style.minHeight = '290mm';
    element.style.height = 'auto';
    element.style.width = '210mm';
    element.style.maxWidth = '210mm';
    element.style.overflow = 'hidden'; // Hide potential overflows

    const opt = {
      margin: 0,
      filename: `${mode === 'quote' ? 'Presupuesto' : 'Informe'}_${mode === 'quote' ? quote.id : report.id}.pdf`,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, scrollY: 0 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const }
    };

    // 3. Generate and Restore
    html2pdf().set(opt).from(element).save().then(() => {
      // Restore classes
      if (originalShadow) element.classList.add('shadow-lg');
      if (originalMinHeight) element.classList.add('min-h-[297mm]');
      if (originalAspect) element.classList.add('aspect-[1/1.4142]');

      // Cleanup styles
      element.style.minHeight = '';
      element.style.height = originalHeightStyle;
      element.style.width = '';
      element.style.maxWidth = '';
      element.style.overflow = '';

      // Lock & Save Document after successful download
      if (mode === 'quote') {
        const lockedQuote = { ...quote, locked: true };
        setQuote(lockedQuote);
        saveQuote(lockedQuote);
      } else {
        const lockedReport = { ...report, locked: true };
        setReport(lockedReport);
        saveReport(lockedReport);
      }

      // Sync (fire and forget)
      if (window.electronAPI?.saveDocuments) {
        // Read fresh from storage since saveQuote updated it
        const allQuotes = JSON.parse(localStorage.getItem('saved_quotes') || '[]');
        const allReports = JSON.parse(localStorage.getItem('saved_reports') || '[]');
        const allDocs = [...allQuotes, ...allReports];
        window.electronAPI.saveDocuments(allDocs);
      }
    });
  };





  // Item Handlers
  const handleAddItem = (type: ItemType) => {
    setQuote(prev => ({
      ...prev,
      items: [...prev.items, { id: generateId(), type, description: '', quantity: 1, unitPrice: 0 }]
    }));
  };

  const handleRemoveItem = (id: string) => {
    setQuote(prev => ({
      ...prev,
      items: prev.items.filter(item => item.id !== id)
    }));
  };

  const handleItemChange = (id: string, field: keyof LineItem, value: any) => {
    setQuote(prev => ({
      ...prev,
      items: prev.items.map(item => item.id === id ? { ...item, [field]: value } : item)
    }));
  };

  // Preset Handlers
  const handleAddFromPreset = (preset: PresetItem) => {
    setQuote(prev => ({
      ...prev,
      items: [...prev.items, {
        id: generateId(),
        type: preset.type,
        description: preset.description,
        quantity: 1,
        unitPrice: preset.unitPrice
      }]
    }));
  };

  const handleCreatePreset = () => {
    if (newPreset.description.trim()) {
      const item: PresetItem = {
        id: generateId(),
        type: newPreset.type,
        category: newPreset.category,
        description: newPreset.description,
        unitPrice: newPreset.unitPrice
      };
      setPresets([...presets, item]);
      setNewPreset({ type: 'service', category: 'computacion', description: '', unitPrice: 0 });
      setShowPresetForm(false);
    }
  };

  const handleDeletePreset = (id: string) => {
    if (window.confirm('¿Eliminar este item frecuente?')) {
      setPresets(presets.filter(p => p.id !== id));
    }
  };

  // Document Management
  const handleSaveDocument = async () => {
    if (mode === 'quote') {
      if (quote.locked) {
        alert('🔒 Error: No se puede guardar cambios en un presupuesto finalizado.');
        return;
      }
      saveQuote(quote);
      alert('✅ Presupuesto guardado exitosamente');
    } else {
      if (report.locked) {
        alert('🔒 Error: No se puede guardar cambios en un informe finalizado.');
        return;
      }
      saveReport(report);
      alert('✅ Informe guardado exitosamente');
    }

    // Sync to Electron File System (for ClientsManager history)
    if (window.electronAPI?.saveDocuments) {
      try {
        // We read raw from localStorage to get the full list including the one just saved
        const allQuotes = JSON.parse(localStorage.getItem('saved_quotes') || '[]');
        const allReports = JSON.parse(localStorage.getItem('saved_reports') || '[]');
        const allDocs = [...allQuotes, ...allReports];
        await window.electronAPI.saveDocuments(allDocs);
      } catch (error) {
        console.error("Error syncing documents to Electron:", error);
      }
    }
  };

  const handleLoadDocument = async (doc: QuoteData | ReportData) => {
    // Determine type based on properties (duck typing)
    const isQuote = 'items' in doc;
    const type = isQuote ? 'quote' : 'report';

    // SECURITY CHECK: Re-fetch the document from storage to check its REAL locked status.
    // The 'doc' passed from UI might be stale because ClientsManager list isn't auto-refreshed instantly after print.
    let isLocked = doc.locked;

    // Check local storage for the authoritative status
    const key = isQuote ? 'saved_quotes' : 'saved_reports';
    const savedDocs = JSON.parse(localStorage.getItem(key) || '[]');
    const freshDoc = savedDocs.find((d: any) => d.id === doc.id);

    if (freshDoc && freshDoc.locked) {
      isLocked = true;
    }

    // If locked, we clone it as a NEW document
    // (User requirement: finalized docs cannot be modified, must create new)
    if (isLocked) {
      // User Choice: View as Read-Only OR Create New Copy (Template)
      const userChoice = window.confirm(
        `Este documento está FINALIZADO (Bloqueado).\n\n` +
        `• ACEPTAR: Crear una COPIA NUEVA para editar (usar como plantilla).\n` +
        `• CANCELAR: Ver el original (Solo lectura).\n`
      );

      if (userChoice) {
        // CREATE COPY (Template Mode)
        const nextId = await getNextId(type);

        if (isQuote) {
          setMode('quote');
          const sourceDoc = (freshDoc || doc) as QuoteData;
          setQuote({
            ...sourceDoc,
            id: nextId,
            date: getCurrentDateForInput(),
            locked: false // New copy is unlocked
          });
        } else {
          setMode('report');
          const sourceDoc = (freshDoc || doc) as ReportData;
          setReport({
            ...sourceDoc,
            id: nextId,
            date: getCurrentDateForInput(),
            locked: false // New copy is unlocked
          });
        }
      } else {
        // READ ONLY MODE
        if (isQuote) {
          setMode('quote');
          setQuote((freshDoc || doc) as QuoteData);
        } else {
          setMode('report');
          setReport((freshDoc || doc) as ReportData);
        }
      }
    } else {
      // Normal Draft Load - Editable in place
      // (Even here, we should prefer the fresh doc if found to ensure we have latest edits)
      if (isQuote) {
        setMode('quote');
        setQuote((freshDoc || doc) as QuoteData);
      } else {
        setMode('report');
        setReport((freshDoc || doc) as ReportData);
      }
    }

    // UI Cleanup
    setShowSavedDocs(false);
    setShowClients(false);
  };

  const handleNewDocument = async () => {
    const nextId = await getNextId(mode);

    if (mode === 'quote') {
      setQuote({
        ...defaultQuote,
        id: nextId,
        date: getCurrentDateForInput(),
        validUntil: addDaysToDate(getCurrentDateForInput(), 15),
        items: [{ id: generateId(), type: 'service', description: 'Servicio Técnico PC (Diagnóstico)', quantity: 1, unitPrice: 0 }]
      });
    } else {
      setReport({
        ...defaultReport,
        id: nextId,
        date: getCurrentDateForInput()
      });
    }
  };

  // Export/Import handlers
  const handleExportData = () => {
    exportAllData();
    alert('✅ Datos exportados exitosamente. Guarda el archivo en un lugar seguro.');
  };

  const handleImportData = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      await importAllData(file);
      alert('✅ Datos importados exitosamente. La página se recargará.');
      window.location.reload();
    } catch (error) {
      alert('❌ Error al importar datos: ' + (error as Error).message);
    }

    // Reset input
    event.target.value = '';
  };

  const improveText = async (
    text: string,
    context: 'technical_diagnosis' | 'professional_note' | 'technical_issue' | 'work_report',
    setter: (val: string) => void,
    loadingSetter: (val: boolean) => void
  ) => {
    if (!text.trim()) return;
    loadingSetter(true);
    try {
      const polished = await polishText(text, context);
      setter(polished);
    } catch (error: any) {
      if (error.message === 'QUOTA_EXCEEDED') {
        alert("⚠️ Límite de uso gratuito excedido (IA).\n\nHas alcanzado el límite de solicitudes por minuto del plan actual. Por favor espera un momento.");
      } else if (error.message === 'API_KEY_MISSING') {
        alert("⚠️ Función de IA no disponible.\n\nLa API Key del sistema no está configurada. Contacte al soporte.");
        console.error("AI Error:", error);
        alert(`⚠️ No se pudo mejorar el texto.\nError: ${error.message}\n\nVerifica tu conexión a internet o tu API Key.`);
      }
    } finally {
      loadingSetter(false);
    }
  };

  // --- RENDER HELPERS ---
  const renderItemSection = (type: ItemType, iconClass: string) => {
    const isService = type === 'service';
    return (
      <div className="mb-6">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2">
            <i className={`${iconClass}`}></i>
            {isService ? (
              <span>Servicios / Mano de Obra</span>
            ) : (
              <select
                value={quote.materialsSectionTitle || 'Materiales / Repuestos'}
                onChange={(e) => setQuote({ ...quote, materialsSectionTitle: e.target.value })}
                className="bg-transparent border-none p-0 pr-6 font-bold uppercase text-gray-500 focus:ring-0 cursor-pointer hover:text-gray-700 text-xs"
              >
                <option value="Materiales / Repuestos">Materiales / Repuestos</option>
                <option value="Materiales">Materiales</option>
                <option value="Repuestos">Repuestos</option>
                <option value="Componentes">Componentes</option>
              </select>
            )}
          </h3>
          <button onClick={() => handleAddItem(type)} className="text-xs bg-green-500 text-white px-2 py-1 rounded hover:bg-green-600">
            <i className="fas fa-plus mr-1"></i> Agregar Item
          </button>
        </div>

        <div className="space-y-3">
          {quote.items.filter(i => i.type === type).map((item) => (
            <div key={item.id} className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="mb-2">
                <label className="text-[10px] text-gray-500 font-bold uppercase block mb-1">Descripción (Max 500 caract.)</label>
                <input
                  type="text"
                  maxLength={500}
                  placeholder={`Descripción del ${isService ? 'servicio' : 'material'}`}
                  value={item.description}
                  onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
                  className="w-full rounded-md border-gray-300 text-sm p-2 border focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none bg-white placeholder-gray-400"
                />
              </div>

              <div className="grid grid-cols-12 gap-2 items-end">
                <div className="col-span-3">
                  <label className="text-[10px] text-gray-500 font-bold uppercase block mb-1">Cant.</label>
                  <input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => handleItemChange(item.id, 'quantity', parseInt(e.target.value) || 0)}
                    className="w-full rounded-md border-gray-300 text-sm p-1.5 border text-center bg-white"
                  />
                </div>
                <div className="col-span-4">
                  <label className="text-[10px] text-gray-500 font-bold uppercase block mb-1">Unitario</label>
                  <div className="relative">
                    <span className="absolute left-2 top-1.5 text-gray-400 text-xs">$</span>
                    <input
                      type="number"
                      value={item.unitPrice}
                      onChange={(e) => handleItemChange(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                      className="w-full rounded-md border-gray-300 text-sm p-1.5 pl-5 border bg-white"
                    />
                  </div>
                </div>
                <div className="col-span-4">
                  <label className="text-[10px] text-gray-500 font-bold uppercase block mb-1 text-right">Total</label>
                  <div className="w-full bg-gray-50 text-gray-700 text-sm p-1.5 border border-gray-100 rounded text-right font-medium">
                    ${(item.quantity * item.unitPrice).toLocaleString('es-AR')}
                  </div>
                </div>
                <div className="col-span-1 flex justify-end">
                  <button onClick={() => handleRemoveItem(item.id)} className="text-red-400 hover:text-red-600 bg-red-50 p-1.5 rounded hover:bg-red-100 transition-colors h-8 w-8 flex items-center justify-center">
                    <i className="fas fa-trash-alt"></i>
                  </button>
                </div>
              </div>
            </div>
          ))}
          {quote.items.filter(i => i.type === type).length === 0 && (
            <div className="text-center py-4 text-gray-400 border-2 border-dashed border-gray-200 rounded-lg bg-gray-50">
              <p className="text-xs">No hay items de {isService ? 'servicio' : 'material'}.</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  const handleSelectClient = (client: Client) => {
    if (mode === 'quote') {
      setQuote({
        ...quote,
        clientId: client.taxId || '', // Only show TaxID if exists, don't show internal ID
        clientName: client.name,
        clientAddress: client.address || '',
        clientPhone: client.phone || '',
        clientEmail: client.email || ''
      });
    } else {
      setReport({
        ...report,
        clientId: client.taxId || '', // Only show TaxID if exists, don't show internal ID
        clientName: client.name,
        clientAddress: client.address || '',
        clientPhone: client.phone || '',
        clientEmail: client.email || ''
      });
    }
    setShowClientSuggestions(false); // Fix: hide suggestions list
    setShowClients(false); // Hide full client list modal if open
  };

  const handleClientInputChange = (value: string) => {
    // Only update the input state immediately, defer filtering
    if (mode === 'quote') {
      setQuote({ ...quote, clientName: value });
    } else {
      setReport({ ...report, clientName: value });
    }
  };

  // Debounced Search Effect
  useEffect(() => {
    const currentName = mode === 'quote' ? quote.clientName : report.clientName;

    // Don't search if empty or very short to avoid massive initial list
    if (!currentName || currentName.trim().length === 0) {
      setShowClientSuggestions(false);
      return;
    }

    const timer = setTimeout(() => {
      // Limit results to 20 to prevent rendering lag
      const filtered = allClients
        .filter(c => c.name.toLowerCase().includes(currentName.toLowerCase()))
        .slice(0, 20);

      setClientSuggestions(filtered);
      if (filtered.length > 0) {
        setShowClientSuggestions(true);
      } else {
        setShowClientSuggestions(false);
      }
    }, 300); // 300ms delay

    return () => clearTimeout(timer);
  }, [mode === 'quote' ? quote.clientName : report.clientName, allClients, mode]);

  // --- OPTIMIZATION FOR TYPING PERFORMANCE ---
  // We use a debounced version of quote/report data for the PrintableDocument preview.
  // This prevents the heavy PDF preview component from re-rendering on every single keystroke,
  // which was causing the UI to freeze/lag when typing notes or searching clients.

  const [previewQuote, setPreviewQuote] = useState<QuoteData>(quote);
  const [previewReport, setPreviewReport] = useState<ReportData>(report);

  // Sync Preview with real state after 500ms of inactivity
  useEffect(() => {
    const timer = setTimeout(() => {
      setPreviewQuote(quote);
    }, 500);
    return () => clearTimeout(timer);
  }, [quote]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setPreviewReport(report);
    }, 500);
    return () => clearTimeout(timer);
  }, [report]);


  // Determine which data to pass to preview based on mode
  // Note: We use the DEBOUNCED versions (previewQuote/previewReport) here!
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col font-sans">
      {/* Settings Modal */}
      {showSettings && (
        <SettingsModal
          settings={business}
          presets={presets}
          categories={categories}
          onSave={(newSettings) => {
            setBusiness(newSettings);
            setShowSettings(false);
          }}
          onSavePresets={(newPresets) => {
            setPresets(newPresets);
            // No need to set showSettings false here to allow continuing editing
          }}
          onSaveCategories={(newCategories) => {
            setCategories(newCategories);
          }}
          onClose={() => setShowSettings(false)}
        />
      )}

      {/* Saved Documents Modal */}
      {showSavedDocs && (
        <SavedDocumentsModal
          mode={mode}
          onLoad={handleLoadDocument}
          onClose={() => setShowSavedDocs(false)}
        />
      )}

      {/* Clients Manager Modal */}
      {showClients && (
        <ClientsManager
          onClose={() => setShowClients(false)}
          onSelectClient={handleSelectClient}
          onClientsUpdated={(updatedClients) => setAllClients(updatedClients)}
          onLoadDocument={(doc) => {
            // Switch mode if necessary
            if ('items' in doc) {
              setMode('quote');
              setQuote(doc as QuoteData);
              // Update preview immediately on load (no delay needed)
              setPreviewQuote(doc as QuoteData);
            } else {
              setMode('report');
              setReport(doc as ReportData);
              setPreviewReport(doc as ReportData);
            }
            setShowClients(false);
          }}
        />
      )}

      {/* Products Manager Modal */}
      {showProductsManager && (
        <ProductsManager
          onClose={() => {
            setShowProductsManager(false);
            setActiveSupplier(''); // Reset active supplier on close
          }}
          products={presets}
          onUpdateProducts={(updated) => setPresets(updated)}
          initialSupplier={activeSupplier}
          marginSettings={marginSettings}
          onUpdateMarginSettings={setMarginSettings}
          onSelectProduct={(product) => {
            // If we are in quote mode, add the product to the quote
            if (mode === 'quote') {
              handleAddFromPreset(product);
              alert(`Agregado: ${product.description}`);
            } else {
              alert("Selecciona un producto para añadirlo al presupuesto. (Modo actual: Informe)");
            }
          }}
        />
      )}

      {/* TOP NAVBAR (Hidden on print) */}
      <nav className="bg-gray-900 text-white shadow-md print:hidden sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center">
              {/* Use negative margin to pull text closer if image has whitespace */}
              <img src="icon.png" alt="TecFlow Logo" className="h-16 w-auto object-contain -mr-2" />
              <div className="flex flex-col">
                <span className="font-bold text-2xl tracking-tight uppercase italic font-russo leading-none">TecFlow</span>
                <span className="text-[10px] text-gray-400 font-mono self-end -mt-1 mr-1">v{import.meta.env.APP_VERSION}</span>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setMode('quote')}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${mode === 'quote' ? 'bg-brand-600 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'}`}
              >
                <i className="fas fa-file-invoice-dollar mr-2"></i>Presupuestos
              </button>
              <button
                onClick={() => setMode('report')}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${mode === 'report' ? 'bg-brand-600 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'}`}
              >
                <i className="fas fa-clipboard-check mr-2"></i>Informes
              </button>
              <div className="h-6 w-px bg-gray-700 mx-2"></div>

              {/* Document Management Buttons */}
              <button
                onClick={handleNewDocument}
                className="text-gray-300 hover:text-white hover:bg-gray-700 px-3 py-2 rounded-md transition-colors"
                title="Nuevo documento"
              >
                <i className="fas fa-file-plus mr-1"></i>
                <span className="text-sm">Nuevo</span>
              </button>
              <button
                onClick={handleSaveDocument}
                className="text-gray-300 hover:text-white hover:bg-gray-700 px-3 py-2 rounded-md transition-colors"
                title="Guardar documento"
              >
                <i className="fas fa-save mr-1"></i>
                <span className="text-sm">Guardar</span>
              </button>

              <button onClick={() => setShowSavedDocs(true)} className="text-gray-300 hover:text-white hover:bg-gray-700 px-3 py-2 rounded-md transition-colors" title="Historial">
                <i className="fas fa-history mr-1"></i>
                <span className="text-sm">Historial</span>
              </button>
              <button onClick={() => setShowClients(true)} className="text-gray-300 hover:text-white hover:bg-gray-700 px-3 py-2 rounded-md transition-colors" title="Clientes">
                <i className="fas fa-users mr-1"></i>
                <span className="text-sm">Clientes</span>
              </button>
              <button onClick={() => setShowProductsManager(true)} className="text-gray-300 hover:text-white hover:bg-gray-700 px-3 py-2 rounded-md transition-colors" title="Inventario">
                <i className="fas fa-boxes mr-1"></i>
                <span className="text-sm">Inventario</span>
              </button>

              <button onClick={() => setShowSettings(true)} className="text-gray-300 hover:text-white">
                <i className="fas fa-cog text-lg"></i>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* MAIN CONTENT */}
      <main className="flex-grow flex flex-col lg:flex-row max-w-7xl mx-auto w-full p-4 gap-6">

        {/* EDITOR COLUMN (Hidden on print) */}
        <section className="w-full lg:w-5/12 print:hidden flex flex-col gap-6 h-[calc(100vh-100px)] overflow-y-auto pb-20 scrollbar-hide">
          <div className="bg-white rounded-lg shadow p-6 border-t-4 border-brand-500">
            <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
              <i className="fas fa-edit mr-2 text-brand-500"></i>
              Editar {mode === 'quote' ? 'Presupuesto' : 'Informe'}
            </h2>

            {mode === 'quote' ? (
              // QUOTE FORM
              <div className="space-y-4">
                {/* Locked Banner */}
                {quote.locked && (
                  <div className="bg-amber-100 border-l-4 border-amber-500 text-amber-700 p-3 rounded shadow-sm flex items-center gap-3 animate-pulse">
                    <i className="fas fa-lock text-xl"></i>
                    <div>
                      <p className="font-bold text-sm">Bloqueado para Edición</p>
                      <p className="text-[10px]">Este presupuesto ya fue finalizado/emitido.</p>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700">Nº Presupuesto</label>
                    <input type="text" value={quote.id} onChange={(e) => setQuote({ ...quote, id: e.target.value })} className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2 text-sm ${quote.locked ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white'}`} disabled={quote.locked} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700">Fecha</label>
                    <input type="date" value={quote.date} onChange={(e) => setQuote({ ...quote, date: e.target.value })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2 text-sm bg-white" />
                  </div>
                </div>

                <div className="bg-gray-50 p-3 rounded-md border border-gray-200">
                  <h3 className="text-xs font-bold text-gray-500 uppercase mb-2">Datos del Cliente</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="md:col-span-1">
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Nombre Completo"
                          value={quote.clientName}
                          onChange={(e) => handleClientInputChange(e.target.value)}
                          className="block w-full rounded-md border-gray-300 shadow-sm border p-2 text-sm bg-white"
                          onBlur={() => setTimeout(() => setShowClientSuggestions(false), 200)}
                          onFocus={() => quote.clientName && handleClientInputChange(quote.clientName)}
                          autoComplete="off"
                        />
                        {showClientSuggestions && mode === 'quote' && clientSuggestions.length > 0 && (
                          <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto mt-1">
                            {clientSuggestions.map(client => (
                              <div
                                key={client.id}
                                className="p-2 hover:bg-gray-100 cursor-pointer text-sm border-b last:border-0"
                                onMouseDown={() => handleSelectClient(client)}
                              >
                                <div className="font-bold text-gray-800">{client.name}</div>
                                {client.taxId && <div className="text-xs text-gray-500">{client.taxId}</div>}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div>
                      <input type="text" placeholder="Dirección" value={quote.clientAddress} onChange={(e) => setQuote({ ...quote, clientAddress: e.target.value })} className="block w-full rounded-md border-gray-300 shadow-sm border p-2 text-sm bg-white" />
                    </div>
                    <div>
                      <input type="text" placeholder="DNI / CUIT" value={quote.clientId} onChange={(e) => setQuote({ ...quote, clientId: e.target.value })} className="block w-full rounded-md border-gray-300 shadow-sm border p-2 text-sm bg-white" />
                    </div>
                  </div>
                </div>

                {/* ITEMS SECTION */}
                <div className="border-t border-gray-100 pt-4">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-xs font-bold text-gray-500 uppercase">Items y Repuestos</h3>
                    <button onClick={() => setShowPresetForm(!showPresetForm)} className="text-xs bg-brand-100 text-brand-700 px-2 py-1 rounded hover:bg-brand-200">
                      {showPresetForm ? 'Cancelar' : 'Gestionar Frecuentes'}
                    </button>
                  </div>

                  {/* PRESETS Quick Add */}
                  <div className="mb-4">
                    {/* Filter Tabs */}
                    {/* Filter Tabs */}
                    {!showPresetForm && (
                      <div className="mb-3">
                        {/* Suppliers List (Buttons) */}
                        {(() => {
                          const suppliers = Array.from(new Set(presets.map(p => p.supplier).filter(Boolean))) as string[];
                          const visibleSuppliers = suppliers.filter(s => !marginSettings.frozenSuppliers?.includes(s));

                          if (visibleSuppliers.length > 0) {
                            return (
                              <div className="mb-2">
                                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                                  {visibleSuppliers.map(sup => {
                                    // Calculate last update
                                    const lastUpdate = presets
                                      .filter(p => p.supplier === sup && p.lastUpdated)
                                      .reduce((max, p) => p.lastUpdated! > max ? p.lastUpdated! : max, '');

                                    return (
                                      <button
                                        key={sup}
                                        onClick={() => {
                                          setActiveSupplier(sup);
                                          setShowProductsManager(true);
                                        }}
                                        className="px-3 py-1 rounded-full text-xs whitespace-nowrap border bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100 transition-colors flex flex-col items-start leading-none gap-0.5 h-auto min-h-[32px] justify-center"
                                      >
                                        <span className="flex items-center gap-1 font-bold">
                                          <i className="fas fa-truck text-[10px]"></i> {sup}
                                        </span>
                                        {lastUpdate && <span className="text-[9px] opacity-70 ml-4 font-mono">{new Date(lastUpdate).toLocaleDateString()}</span>}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          }
                          return null;
                        })()}

                        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                          {filterCategories.map(cat => (
                            <button
                              key={cat}
                              onClick={() => setSelectedCategory(cat)}
                              className={`px-3 py-1 rounded-full text-xs whitespace-nowrap border transition-colors ${selectedCategory === cat
                                ? 'bg-gray-800 text-white border-gray-800'
                                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                                }`}
                            >
                              {cat === 'all' ? 'Todos' : cat.charAt(0).toUpperCase() + cat.slice(1)}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {showPresetForm && (
                      <div className="bg-blue-50 p-3 rounded-md mb-3 border border-blue-100 flex flex-col gap-2 animate-fade-in">
                        <h4 className="text-xs font-bold text-blue-800">Crear Nuevo Item Frecuente</h4>
                        <div className="grid grid-cols-2 gap-2 mb-1">
                          {/* Type Select */}
                          <div className="flex gap-2">
                            <label className="flex items-center gap-1 text-xs cursor-pointer">
                              <input type="radio" checked={newPreset.type === 'service'} onChange={() => setNewPreset({ ...newPreset, type: 'service' })} /> Servicio
                            </label>
                            <label className="flex items-center gap-1 text-xs cursor-pointer">
                              <input type="radio" checked={newPreset.type === 'material'} onChange={() => setNewPreset({ ...newPreset, type: 'material' })} /> Material
                            </label>
                          </div>
                          {/* Category Select */}
                          {/* Category Input with Datalist */}
                          <input
                            type="text"
                            list="category-options"
                            placeholder="Categoría"
                            value={newPreset.category}
                            onChange={e => setNewPreset({ ...newPreset, category: e.target.value })}
                            className="text-xs rounded border-gray-300 border p-1 bg-white flex-1"
                          />
                          <datalist id="category-options">
                            {availableCategories.map(cat => (
                              <option key={cat} value={cat} />
                            ))}
                          </datalist>
                        </div>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="Descripción"
                            className="flex-1 text-sm rounded border-gray-300 border p-1 bg-white"
                            value={newPreset.description}
                            onChange={e => setNewPreset({ ...newPreset, description: e.target.value })}
                          />
                          <input
                            type="number"
                            placeholder="$"
                            className="w-24 text-sm rounded border-gray-300 border p-1 bg-white"
                            value={newPreset.unitPrice || ''}
                            onChange={e => setNewPreset({ ...newPreset, unitPrice: parseFloat(e.target.value) || 0 })}
                          />
                        </div>
                        <button onClick={handleCreatePreset} className="bg-brand-600 text-white text-xs py-1 rounded hover:bg-brand-700">
                          Crear y Usar
                        </button>
                      </div>
                    )}

                    {/* Presets List (Tags) */}
                    {!showPresetForm && (
                      <div className="flex flex-wrap gap-2">
                        {presets
                          .filter(p => {
                            // 2. Category Logic
                            if (selectedCategory === 'all') return p.isFavorite; // Only favorites in "All" view
                            return p.category === selectedCategory; // Show all in specific category
                          })
                          .map(p => (
                            <div
                              key={p.id}
                              className="bg-white border text-gray-600 text-xs px-2 py-1 rounded cursor-pointer hover:bg-brand-50 hover:border-brand-200 hover:text-brand-700 transition-colors flex items-center shadow-sm"
                              onClick={() => handleAddFromPreset(p)}
                            >
                              <i className={`fas fa-${p.type === 'service' ? 'wrench' : 'box'} mr-1.5 text-[10px]`}></i>
                              <div className="flex flex-col">
                                <span className="font-medium truncate max-w-[150px]">{p.description}</span>
                                {p.supplier && <span className="text-[9px] text-gray-400 uppercase">{p.supplier}</span>}
                              </div>
                              <span className="ml-2 font-bold text-gray-400 text-[10px]">${p.unitPrice}</span>
                              <button
                                className="ml-2 text-gray-300 hover:text-red-500"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeletePreset(p.id);
                                }}
                              >
                                &times;
                              </button>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>

                  {/* SECTIONS */}
                  {renderItemSection('service', 'fas fa-wrench')}
                  {renderItemSection('material', 'fas fa-box')}

                </div>

                <div className="grid grid-cols-2 gap-4 border-t border-gray-100 pt-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700">Moneda</label>
                    <select value={quote.currency} onChange={(e) => setQuote({ ...quote, currency: e.target.value })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2 text-sm bg-white">
                      <option value="ARS">ARS ($)</option>
                      <option value="USD">USD (US$)</option>
                      <option value="EUR">EUR (€)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700">Impuesto (IVA %)</label>
                    <input type="number" value={quote.taxRate} onChange={(e) => setQuote({ ...quote, taxRate: parseFloat(e.target.value) || 0 })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2 text-sm bg-white" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 flex justify-between">
                    <span>Notas / Condiciones</span>
                    <button
                      onClick={() => improveText(quote.notes, 'professional_note', (val) => setQuote({ ...quote, notes: val }), setIsImprovingNotes)}
                      className="text-brand-600 hover:text-brand-800 text-xs flex items-center"
                      disabled={isImprovingNotes}
                    >
                      <i className={`fas fa-magic mr-1 ${isImprovingNotes ? 'animate-spin' : ''}`}></i>
                      {isImprovingNotes ? 'Mejorando...' : 'Mejorar con AI'}
                    </button>
                  </label>
                  <textarea rows={3} value={quote.notes} onChange={(e) => setQuote({ ...quote, notes: e.target.value })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2 text-sm bg-white"></textarea>
                </div>

              </div>
            ) : (
              // REPORT FORM
              <div className="space-y-4">
                {/* Locked Banner */}
                {report.locked && (
                  <div className="bg-amber-100 border-l-4 border-amber-500 text-amber-700 p-3 rounded shadow-sm flex items-center gap-3 animate-pulse">
                    <i className="fas fa-lock text-xl"></i>
                    <div>
                      <p className="font-bold text-sm">Bloqueado para Edición</p>
                      <p className="text-[10px]">Este informe ya fue finalizado/emitido.</p>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700">Nº Informe</label>
                    <input type="text" value={report.id} onChange={(e) => setReport({ ...report, id: e.target.value })} className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2 text-sm ${report.locked ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white'}`} disabled={report.locked} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700">Fecha</label>
                    <input type="date" value={report.date} onChange={(e) => setReport({ ...report, date: e.target.value })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2 text-sm bg-white" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700">Cliente</label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Nombre del Cliente"
                      value={report.clientName}
                      onChange={(e) => handleClientInputChange(e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2 text-sm bg-white"
                      onBlur={() => setTimeout(() => setShowClientSuggestions(false), 200)}
                      onFocus={() => report.clientName && handleClientInputChange(report.clientName)}
                      autoComplete="off"
                    />
                    {showClientSuggestions && mode === 'report' && clientSuggestions.length > 0 && (
                      <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto mt-1">
                        {clientSuggestions.map(client => (
                          <div
                            key={client.id}
                            className="p-2 hover:bg-gray-100 cursor-pointer text-sm border-b last:border-0"
                            onMouseDown={() => handleSelectClient(client)}
                          >
                            <div className="font-bold text-gray-800">{client.name}</div>
                            {client.taxId && <div className="text-xs text-gray-500">{client.taxId}</div>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700">Equipo</label>
                    <input type="text" placeholder="Ej: Notebook Dell" value={report.deviceType} onChange={(e) => setReport({ ...report, deviceType: e.target.value })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2 text-sm bg-white" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700">Nº Serie (S/N)</label>
                    <input type="text" value={report.serialNumber || ''} onChange={(e) => setReport({ ...report, serialNumber: e.target.value })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2 text-sm bg-white" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 flex justify-between">
                    <span>Problema Reportado (Falla)</span>
                    <button
                      onClick={() => improveText(report.reportedIssue, 'technical_issue', (val) => setReport({ ...report, reportedIssue: val }), setIsImprovingReportIssue)}
                      className="text-brand-600 hover:text-brand-800 text-xs flex items-center"
                      disabled={isImprovingReportIssue}
                    >
                      <i className={`fas fa-magic mr-1 ${isImprovingReportIssue ? 'animate-spin' : ''}`}></i>
                      Mejorar
                    </button>
                  </label>
                  <textarea rows={3} value={report.reportedIssue} onChange={(e) => setReport({ ...report, reportedIssue: e.target.value })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2 text-sm bg-white"></textarea>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 flex justify-between">
                    <span>Diagnóstico Técnico</span>
                    <button
                      onClick={() => improveText(report.diagnosis, 'technical_diagnosis', (val) => setReport({ ...report, diagnosis: val }), setIsImprovingDiagnosis)}
                      className="text-brand-600 hover:text-brand-800 text-xs flex items-center"
                      disabled={isImprovingDiagnosis}
                    >
                      <i className={`fas fa-magic mr-1 ${isImprovingDiagnosis ? 'animate-spin' : ''}`}></i>
                      Mejorar
                    </button>
                  </label>
                  <textarea rows={4} value={report.diagnosis} onChange={(e) => setReport({ ...report, diagnosis: e.target.value })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2 text-sm bg-white"></textarea>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 flex justify-between">
                    <span>Trabajo Realizado / Materiales</span>
                    <button
                      onClick={() => improveText(report.workPerformed, 'work_report', (val) => setReport({ ...report, workPerformed: val }), setIsImprovingWorkPerformed)}
                      className="text-brand-600 hover:text-brand-800 text-xs flex items-center"
                      disabled={isImprovingWorkPerformed}
                    >
                      <i className={`fas fa-magic mr-1 ${isImprovingWorkPerformed ? 'animate-spin' : ''}`}></i>
                      Mejorar
                    </button>
                  </label>
                  <textarea rows={4} value={report.workPerformed} onChange={(e) => setReport({ ...report, workPerformed: e.target.value })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2 text-sm bg-white"></textarea>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700">Estado Final</label>
                  <select
                    value={report.status}
                    onChange={(e) => setReport({ ...report, status: e.target.value as any })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2 text-sm bg-white font-medium"
                  >
                    <option value="En Revisión">En Revisión</option>
                    <option value="Pendiente de Repuesto">Pendiente de Repuesto</option>
                    <option value="Reparado">Reparado</option>
                    <option value="Sin Solución">Sin Solución</option>
                    <option value="Entregado">Entregado</option>
                  </select>
                </div>

              </div>
            )}
          </div>
        </section>

        {/* PREVIEW COLUMN */}
        <section className="w-full lg:w-7/12 flex flex-col items-center">
          <div className="w-full flex justify-between items-center mb-4 print:hidden">
            <h2 className="text-gray-500 font-medium">Vista Previa</h2>
            <div className="flex gap-2">
              <button
                onClick={handleDownloadPDF}
                className="bg-brand-600 text-white px-4 py-2 rounded shadow hover:bg-brand-700 transition flex items-center"
              >
                <i className="fas fa-file-download mr-2"></i> Descargar PDF
              </button>
              <button
                onClick={handlePrint}
                className="bg-gray-800 text-white px-4 py-2 rounded shadow hover:bg-black transition flex items-center"
              >
                <i className="fas fa-print mr-2"></i> Imprimir
              </button>
            </div>
          </div>

          <div id="printable-content" className="w-full overflow-auto bg-gray-200 p-4 rounded-lg print:p-0 print:bg-white print:overflow-visible">
            <PrintableDocument
              mode={mode}
              business={business}
              quoteData={previewQuote}
              reportData={previewReport}
            />
          </div>
        </section>

      </main>

      {/* Auto Update Notification */}
      <UpdateNotification />
    </div >
  );
};

export default App;