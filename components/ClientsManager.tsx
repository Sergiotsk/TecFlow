import React, { useState, useEffect } from 'react';
import { Client, QuoteData, ReportData } from '../types';
import { v4 as uuidv4 } from 'uuid';

// Helper for unique ID if uuid import fails or is overkill for simple usage
const generateId = () => Math.random().toString(36).substr(2, 9).toUpperCase();

interface ClientsManagerProps {
    onClose: () => void;
    onSelectClient: (client: Client) => void;
    onClientsUpdated?: (clients: Client[]) => void;
    onLoadDocument?: (doc: QuoteData | ReportData) => void;
}

export const ClientsManager: React.FC<ClientsManagerProps> = ({ onClose, onSelectClient, onClientsUpdated, onLoadDocument }) => {
    const [clients, setClients] = useState<Client[]>([]);
    const [documents, setDocuments] = useState<(QuoteData | ReportData)[]>([]);
    const [selectedClient, setSelectedClient] = useState<Client | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // Form State
    const [formData, setFormData] = useState<Client>({
        id: '',
        name: '',
        address: '',
        phone: '',
        email: '',
        taxId: '',
        notes: ''
    });

    const [lastImportDate, setLastImportDate] = useState<string | null>(localStorage.getItem('lastClientsImportDate'));

    // Load Data
    useEffect(() => {
        const loadData = async () => {
            // Load Clients
            if (window.electronAPI?.loadClients) {
                const result = await window.electronAPI.loadClients();
                if (result.success && result.clients) {
                    setClients(result.clients);
                }
            } else {
                // Fallback to LocalStorage for web dev
                const saved = localStorage.getItem('clients');
                if (saved) setClients(JSON.parse(saved));
            }

            // Load Documents for History
            let loadedDocs: (QuoteData | ReportData)[] = [];
            if (window.electronAPI?.loadDocuments) {
                const result = await window.electronAPI.loadDocuments();
                if (result.success && result.documents) {
                    loadedDocs = result.documents;
                }
            }

            // Fallback / Merge with LocalStorage if Electron empty or missing
            const localQuotes = JSON.parse(localStorage.getItem('saved_quotes') || '[]');
            const localReports = JSON.parse(localStorage.getItem('saved_reports') || '[]');
            const localDocs = [...localQuotes, ...localReports];

            // If electron returned nothing or is missing, use local docs
            if (loadedDocs.length === 0 && localDocs.length > 0) {
                loadedDocs = localDocs;
            }

            setDocuments(loadedDocs);
        };
        loadData();
    }, []);

    // Save Clients
    const saveClientsToStorage = async (newClients: Client[]) => {
        setClients(newClients);
        // Sync with parent immediately
        if (onClientsUpdated) {
            onClientsUpdated(newClients);
        }

        if (window.electronAPI?.saveClients) {
            await window.electronAPI.saveClients(newClients);
        } else {
            localStorage.setItem('clients', JSON.stringify(newClients));
        }
    };

    const handleSave = async () => {
        if (!formData.name.trim()) return alert('El nombre es obligatorio');

        let updatedClients = [...clients];
        if (formData.id) {
            // Edit
            updatedClients = updatedClients.map(c => c.id === formData.id ? formData : c);
        } else {
            // New
            const newClient = { ...formData, id: generateId() };
            updatedClients.push(newClient);
            setSelectedClient(newClient); // Select immediately
        }

        await saveClientsToStorage(updatedClients);
        setIsEditing(false);

        // update current selection if we just edited it
        if (formData.id) setSelectedClient(formData);
    };

    const handleDelete = async (id: string) => {
        if (window.confirm('¿Eliminar cliente?')) {
            const updated = clients.filter(c => c.id !== id);
            await saveClientsToStorage(updated);
            if (selectedClient?.id === id) {
                setSelectedClient(null);
                setIsEditing(false);
            }
        }
    };

    const startNew = () => {
        setFormData({
            id: '',
            name: '',
            address: '',
            phone: '',
            email: '',
            taxId: '',
            notes: ''
        });
        setSelectedClient(null);
        setIsEditing(true);
    };

    const startEdit = (client: Client) => {
        setFormData(client);
        setSelectedClient(client);
        setIsEditing(true);
    };

    const selectClient = (client: Client) => {
        setSelectedClient(client);
        setIsEditing(false);
    };

    // Debounced Search Term to prevent lagging on typing
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchTerm(searchTerm);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    // Filter Clients (Uses Debounced Term)
    const filteredClients = React.useMemo(() => {
        if (!debouncedSearchTerm) return clients;
        const lowerTerm = debouncedSearchTerm.toLowerCase();
        return clients.filter(c =>
            c.name.toLowerCase().includes(lowerTerm) ||
            c.taxId.includes(lowerTerm)
        );
    }, [clients, debouncedSearchTerm]);

    // Optimize Client History Calculation
    const clientDocuments = React.useMemo(() => {
        if (!selectedClient) return [];

        return documents.filter(doc => {
            const docName = ('clientName' in doc ? doc.clientName : '') || '';
            const docId = ('clientId' in doc ? doc.clientId : '') || '';

            // Normalize: remove special chars, extra spaces, lowercase
            const normalize = (s: string) => s.toLowerCase().replace(/[.,-]/g, ' ').replace(/\s+/g, ' ').trim();

            const normDocName = normalize(docName);
            const normClientName = normalize(selectedClient.name);

            // Name Match Logic:
            let nameMatch = false;

            if (normDocName && normClientName) {
                // Exact
                if (normDocName === normClientName) nameMatch = true;
                // Inclusion (if string is substantial, e.g. > 3 chars)
                else if (normDocName.length > 3 && normClientName.length > 3) {
                    if (normDocName.includes(normClientName) || normClientName.includes(normDocName)) {
                        nameMatch = true;
                    }
                }

                // Token Intersection (handles swapped names)
                // e.g. "Juan Perez" vs "Perez Juan"
                if (!nameMatch) {
                    const docTokens = new Set(normDocName.split(' '));
                    const clientTokens = normClientName.split(' ');

                    // Count how many client tokens appear in doc name
                    const matchCount = clientTokens.filter(t => docTokens.has(t)).length;
                    // If all client tokens are present (or at least 2 for complex names)
                    if (matchCount === clientTokens.length && matchCount > 0) nameMatch = true;

                    // Reverse check
                    const docTokensArray = Array.from(docTokens);
                    const clientTokensSet = new Set(clientTokens);
                    const docMatchCount = docTokensArray.filter(t => clientTokensSet.has(t)).length;
                    if (docMatchCount === docTokensArray.length && docMatchCount > 0) nameMatch = true;
                }
            }

            // ID match (only if both have IDs)
            const idMatch = !!selectedClient.taxId && !!docId &&
                (docId.trim() === selectedClient.taxId.trim());

            return nameMatch || idMatch;
        });
    }, [selectedClient, documents]);

    // Google Import Handler
    const handleImportGoogleContacts = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            const text = e.target?.result as string;
            if (!text) return;

            // Robust CSV Line Parser (Handles commas inside quotes)
            const parseCSVLine = (line: string): string[] => {
                const result = [];
                let current = '';
                let inQuotes = false;

                for (let i = 0; i < line.length; i++) {
                    const char = line[i];
                    if (char === '"') {
                        inQuotes = !inQuotes;
                    } else if (char === ',' && !inQuotes) {
                        result.push(current.trim().replace(/^"|"$/g, '').replace(/""/g, '"'));
                        current = '';
                    } else {
                        current += char;
                    }
                }
                result.push(current.trim().replace(/^"|"$/g, '').replace(/""/g, '"'));
                return result;
            };

            // Split lines but handle newlines inside quotes (Basic handling)
            // ideally we'd use a full parser, but for Google CSV a line-by-line usually works 
            // if we assume no newlines in fields. Google usually puts everything on one line.
            const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
            if (lines.length < 2) {
                alert('El archivo CSV parece estar vacío o dañado.');
                return;
            }

            const headers = parseCSVLine(lines[0]).map(h => h.trim());

            // Priority Header Detection (Checks keywords in order)
            const findColumn = (keywords: string[]) => {
                for (const k of keywords) {
                    // Try exact match first
                    let idx = headers.findIndex(h => h.toLowerCase() === k.toLowerCase());
                    if (idx > -1) return idx;

                    // Try contains match
                    idx = headers.findIndex(h => h.toLowerCase().includes(k.toLowerCase()));
                    if (idx > -1) return idx;
                }
                return -1;
            };

            const nameIndex = findColumn(['Name', 'Nombre', 'Display Name', 'First Name', 'Given Name']);
            const firstNameIndex = findColumn(['Given Name', 'First Name', 'Nombre']);
            const lastNameIndex = findColumn(['Family Name', 'Last Name', 'Apellidos']);

            // Google Contacts uses "Phone 1 - Value" vs "Phone 1 - Type". 
            // We must look for "Value" first to avoid matching "Type" with the generic "Phone" keyword.
            const phoneIndex = findColumn(['Phone 1 - Value', 'Teléfono 1 - Value', 'Phone 1 Value', 'Mobile Phone', 'Phone', 'Teléfono']);
            const emailIndex = findColumn(['E-mail 1 - Value', 'E-mail 1 Value', 'Correo electrónico', 'Email Address', 'Email']);
            const orgIndex = findColumn(['Organization 1 - Name', 'Organization 1 Name', 'Organization', 'Organización', 'Company', 'Empresa']);
            const addressIndex = findColumn(['Address 1 - Formatted', 'Address 1 Formatted', 'Dirección 1', 'Business Address', 'Dirección', 'Address']);

            // DEBUG ASSISTANCE:
            // Alert the user about what columns were actually mapped (using the first row as sample if possible)
            // This is crucial for diagnostics without console access
            const debugMapping = `
                Mapeo de Columnas Detectado:
                - Name col: ${nameIndex > -1 ? headers[nameIndex] : 'NO'}
                - Phone col: ${phoneIndex > -1 ? headers[phoneIndex] : 'NO'}
                - Email col: ${emailIndex > -1 ? headers[emailIndex] : 'NO'}
                
                (Si ves 'Phone 1 - Type' en lugar de 'Value', ese es el error).
            `;
            // Un-comment the line below if you want to show this every time for debugging
            // alert(debugMapping);

            if (nameIndex === -1 && firstNameIndex === -1) {
                // Try to fallback to common Google header "Name" even if fuzzy match failed
                alert(`No se pudieron detectar las columnas correctas.\nColumnas encontradas: ${headers.slice(0, 5).join(', ')}...`);
                return;
            }

            const newClients: Client[] = [];
            let updatedClientsList = [...clients]; // Working copy
            let createdCount = 0;
            let updatedCount = 0;

            // Enhanced Update Logic
            for (let i = 1; i < lines.length; i++) {
                const row = parseCSVLine(lines[i]);
                if (row.length < 2) continue;

                let name = '';
                if (nameIndex > -1) name = row[nameIndex];
                if (!name && firstNameIndex > -1) {
                    const first = row[firstNameIndex] || '';
                    const last = (lastNameIndex > -1 ? row[lastNameIndex] : '') || '';
                    name = `${first} ${last}`.trim();
                }

                if (!name) continue;

                // Handle Google CSV quirk: phones might have ' ::: ' separator or standard format
                let csvPhone = phoneIndex > -1 ? (row[phoneIndex] || '') : '';
                // Clean phone number (remove ::: and extra spaces)
                csvPhone = csvPhone.split(':::')[0].trim();

                const csvEmail = emailIndex > -1 ? (row[emailIndex] || '') : '';
                const csvOrg = orgIndex > -1 ? (row[orgIndex] || '') : '';
                const csvAddress = addressIndex > -1 ? (row[addressIndex] || '') : '';

                const existingIndex = updatedClientsList.findIndex(c => c.name.toLowerCase().trim() === name.toLowerCase().trim());

                if (existingIndex > -1) {
                    // Start fresh with existing data
                    const existing = { ...updatedClientsList[existingIndex] };
                    let changed = false;

                    // Update logic: if CSV has data, overwrite. If force import, overwrite even if empty? 
                    // Let's stick to: "If CSV has a value, update it. If local is empty and CSV has value, update it."

                    // Specific fix for user request: "detect lack of phone numbers"
                    // If local phone is missing/empty but CSV has one -> UPDATE
                    // If local phone is different from CSV phone -> UPDATE
                    if (csvPhone && existing.phone !== csvPhone) {
                        existing.phone = csvPhone;
                        changed = true;
                    }

                    if (csvEmail && existing.email !== csvEmail) { existing.email = csvEmail; changed = true; }
                    if (csvAddress && existing.address !== csvAddress) { existing.address = csvAddress.replaceAll('::', ','); changed = true; }

                    if (changed) {
                        updatedClientsList[existingIndex] = existing;
                        updatedCount++;
                    }
                } else {
                    if (newClients.some(c => c.name.toLowerCase().trim() === name.toLowerCase().trim())) continue;

                    newClients.push({
                        id: generateId(),
                        name: name,
                        address: csvAddress.replaceAll('::', ','),
                        phone: csvPhone,
                        email: csvEmail,
                        taxId: '',
                        notes: csvOrg ? `Empresa: ${csvOrg}` : 'Importado de Google'
                    });
                    createdCount++;
                }
            }

            // Update date
            const now = new Date();
            const dateStr = `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
            setLastImportDate(dateStr);
            localStorage.setItem('lastClientsImportDate', dateStr);

            if (createdCount > 0 || updatedCount > 0) {
                // Sort
                const finalClients = [...updatedClientsList, ...newClients];
                finalClients.sort((a, b) => a.name.localeCompare(b.name));

                // Confirm changes to user
                if (window.confirm(`Se encontraron:\n- ${createdCount} nuevos clientes\n- ${updatedCount} actualizaciones de datos (teléfonos/emails)\n\n¿Desea aplicar estos cambios?`)) {
                    await saveClientsToStorage(finalClients);
                    alert('✅ Importación aplicada con éxito.');
                }
            } else {
                // FORCE IMPORT OPTION
                if (window.confirm('No se detectaron cambios nuevos.\n\n¿Desea FORZAR una re-importación completa? (Esto sobrescribirá los datos locales con los del CSV si coinciden los nombres)')) {
                    // Force logic: iterate CSV again and overwrite everything found matches
                    let forcedUpdates = 0;
                    for (let i = 1; i < lines.length; i++) {
                        const row = parseCSVLine(lines[i]);
                        if (row.length < 2) continue;

                        // ... (same parsing logic) ...
                        let name = '';
                        if (nameIndex > -1) name = row[nameIndex];
                        if (!name && firstNameIndex > -1) {
                            const first = row[firstNameIndex] || '';
                            const last = (lastNameIndex > -1 ? row[lastNameIndex] : '') || '';
                            name = `${first} ${last}`.trim();
                        }
                        if (!name) continue;

                        let csvPhone = phoneIndex > -1 ? (row[phoneIndex] || '') : '';
                        csvPhone = csvPhone.split(':::')[0].trim();
                        const csvEmail = emailIndex > -1 ? (row[emailIndex] || '') : '';
                        const csvAddress = addressIndex > -1 ? (row[addressIndex] || '') : '';
                        const csvOrg = orgIndex > -1 ? (row[orgIndex] || '') : '';

                        const existingIndex = updatedClientsList.findIndex(c => c.name.toLowerCase().trim() === name.toLowerCase().trim());
                        if (existingIndex > -1) {
                            const existing = updatedClientsList[existingIndex];
                            // Force Overwrite if CSV data exists
                            if (csvPhone) existing.phone = csvPhone;
                            if (csvEmail) existing.email = csvEmail;
                            if (csvAddress) existing.address = csvAddress.replaceAll('::', ',');
                            if (csvOrg && !existing.notes.includes(csvOrg)) existing.notes = (existing.notes + ` Empresa: ${csvOrg}`).trim();

                            updatedClientsList[existingIndex] = existing;
                            forcedUpdates++;
                        }
                    }

                    // Save forced updates
                    const finalClients = [...updatedClientsList, ...newClients]; // newClients should be empty/0 here logic wise but keep safe
                    finalClients.sort((a, b) => a.name.localeCompare(b.name));
                    await saveClientsToStorage(finalClients);
                    alert(`✅ Importación forzada completada. ${forcedUpdates} clientes actualizados.`);
                }
            }
        };
        reader.readAsText(file);
        event.target.value = '';
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white w-full max-w-6xl h-[85vh] rounded-xl shadow-2xl flex overflow-hidden animate-fade-in">

                {/* SIDEBAR: LIST */}
                <div className="w-1/3 border-r border-gray-200 bg-gray-50 flex flex-col">
                    <div className="p-4 border-b border-gray-200 bg-white">
                        <h2 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                            <i className="fas fa-users text-brand-600"></i> Clientes
                        </h2>
                        <div className="relative">
                            <i className="fas fa-search absolute left-3 top-2.5 text-gray-400 text-sm"></i>
                            <input
                                type="text"
                                placeholder="Buscar por nombre o CUIT..."
                                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>

                        <div className="flex gap-2 mt-3">
                            <button
                                onClick={startNew}
                                className="flex-1 bg-brand-600 text-white py-2 rounded-lg text-xs font-medium hover:bg-brand-700 transition flex items-center justify-center"
                            >
                                <i className="fas fa-plus mr-1"></i> Nuevo
                            </button>

                            <label className="flex-1 bg-green-600 text-white py-2 rounded-lg text-xs font-medium hover:bg-green-700 transition flex items-center justify-center cursor-pointer">
                                <i className="fab fa-google mr-1"></i> Importar CSV
                                <input
                                    type="file"
                                    accept=".csv"
                                    className="hidden"
                                    onChange={handleImportGoogleContacts}
                                />
                            </label>
                        </div>

                        {lastImportDate && (
                            <div className="text-[10px] text-gray-400 text-center mt-2">
                                Última actualización: {lastImportDate}
                            </div>
                        )}
                    </div>

                    <div className="flex-1 overflow-y-auto p-2 space-y-2">
                        {filteredClients.length === 0 ? (
                            <div className="text-center text-gray-400 py-8 text-sm">
                                No se encontraron clientes.
                            </div>
                        ) : (
                            filteredClients.map(client => (
                                <div
                                    key={client.id}
                                    onClick={() => selectClient(client)}
                                    className={`p-3 rounded-lg cursor-pointer border transition-all ${selectedClient?.id === client.id
                                        ? 'bg-white border-brand-500 shadow-md transform scale-[1.02]'
                                        : 'bg-white border-gray-100 hover:border-brand-200 hover:bg-gray-50'
                                        }`}
                                >
                                    <div className="font-bold text-gray-800 text-sm">{client.name}</div>
                                    {client.phone && (
                                        <div className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                                            <i className="fas fa-phone opacity-70"></i> {client.phone}
                                        </div>
                                    )}
                                    {client.address && (
                                        <div className="text-xs text-gray-400 truncate mt-0.5">
                                            {client.address}
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* MAIN AREA */}
                <div className="flex-1 flex flex-col bg-white">
                    <div className="p-4 border-b border-gray-100 flex justify-between items-center h-16">
                        <h3 className="font-bold text-gray-700 text-lg">
                            {isEditing
                                ? (formData.id ? 'Editar Cliente' : 'Crear Nuevo Cliente')
                                : (selectedClient ? selectedClient.name : 'Detalle del Cliente')}
                        </h3>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                            <i className="fas fa-times text-xl"></i>
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6">
                        {!selectedClient && !isEditing ? (
                            <div className="h-full flex flex-col items-center justify-center text-gray-300">
                                <i className="fas fa-user-circle text-6xl mb-4 opacity-50"></i>
                                <p>Selecciona un cliente para ver detalles o historial.</p>
                            </div>
                        ) : isEditing ? (
                            // EDIT FORM
                            <div className="max-w-xl mx-auto space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="col-span-2">
                                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Nombre / Razón Social <span className="text-red-500">*</span></label>
                                        <input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full p-2 border rounded text-sm focus:border-brand-500 outline-none" placeholder="Ej: Juan Perez" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1">CUIT / DNI</label>
                                        <input type="text" value={formData.taxId} onChange={e => setFormData({ ...formData, taxId: e.target.value })} className="w-full p-2 border rounded text-sm focus:border-brand-500 outline-none" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Teléfono</label>
                                        <input type="text" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} className="w-full p-2 border rounded text-sm focus:border-brand-500 outline-none" />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Dirección</label>
                                        <input type="text" value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} className="w-full p-2 border rounded text-sm focus:border-brand-500 outline-none" />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Email</label>
                                        <input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="w-full p-2 border rounded text-sm focus:border-brand-500 outline-none" />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Notas Internas</label>
                                        <textarea rows={3} value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} className="w-full p-2 border rounded text-sm focus:border-brand-500 outline-none" placeholder="Datos adicionales..." />
                                    </div>
                                </div>
                                <div className="flex gap-3 pt-4">
                                    <button onClick={handleSave} className="flex-1 bg-brand-600 text-white py-2 rounded font-medium hover:bg-brand-700">Guardar</button>
                                    <button onClick={() => { setIsEditing(false); if (!selectedClient) setSelectedClient(null); }} className="px-4 border border-gray-300 text-gray-600 rounded hover:bg-gray-50">Cancelar</button>
                                </div>
                            </div>
                        ) : selectedClient && (
                            // VIEW MODE
                            <div className="space-y-6">

                                {/* INFO CARD */}
                                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <h2 className="text-xl font-bold text-gray-800">{selectedClient.name}</h2>
                                            <div className="text-sm text-gray-500">{selectedClient.taxId}</div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => startEdit(selectedClient)} className="text-sm bg-white border border-gray-300 px-3 py-1 rounded text-gray-700 hover:bg-gray-50 shadow-sm">
                                                <i className="fas fa-edit mr-1"></i> Editar
                                            </button>
                                            <button onClick={() => handleDelete(selectedClient.id)} className="text-sm bg-white border border-red-200 text-red-600 px-3 py-1 rounded hover:bg-red-50 shadow-sm">
                                                <i className="fas fa-trash-alt"></i>
                                            </button>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-y-4 gap-x-8 text-sm">
                                        <div>
                                            <span className="block text-xs text-gray-400 uppercase font-semibold">Teléfono</span>
                                            <span className="text-gray-700">{selectedClient.phone || '-'}</span>
                                        </div>
                                        <div>
                                            <span className="block text-xs text-gray-400 uppercase font-semibold">Email</span>
                                            <span className="text-gray-700">{selectedClient.email || '-'}</span>
                                        </div>
                                        <div className="col-span-2">
                                            <span className="block text-xs text-gray-400 uppercase font-semibold">Dirección</span>
                                            <span className="text-gray-700">{selectedClient.address || '-'}</span>
                                        </div>
                                        {selectedClient.notes && (
                                            <div className="col-span-2 bg-yellow-50 p-2 rounded border border-yellow-100 text-yellow-800 italic">
                                                <i className="fas fa-sticky-note mr-2 opacity-50"></i> {selectedClient.notes}
                                            </div>
                                        )}
                                    </div>

                                    <button
                                        onClick={() => onSelectClient(selectedClient)}
                                        className="mt-4 w-full bg-brand-100 text-brand-700 py-2 rounded hover:bg-brand-200 font-medium transition"
                                    >
                                        Usar este cliente en el documento actual <i className="fas fa-arrow-right ml-2"></i>
                                    </button>
                                </div>

                                {/* HISTORY SECTION */}
                                <div className="border-t border-gray-100 pt-6">
                                    <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2">
                                        <i className="fas fa-history text-brand-500"></i> Historial de Documentos
                                    </h3>

                                    {clientDocuments.length === 0 ? (
                                        <div className="text-center py-6 bg-gray-50 rounded-lg text-gray-400 text-sm">
                                            No hay historial de presupuestos o informes para este cliente.
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {clientDocuments.map((doc: any, idx) => (
                                                <div
                                                    key={doc.id || idx}
                                                    onClick={() => onLoadDocument && onLoadDocument(doc)}
                                                    className="group flex items-center justify-between p-3 bg-white border border-gray-100 rounded-lg shadow-sm hover:shadow-md hover:border-brand-300 transition cursor-pointer relative overflow-hidden"
                                                    title="Clic para abrir este documento"
                                                >
                                                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-brand-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>

                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white ${'items' in doc ? 'bg-blue-500' : 'bg-purple-500'}`}>
                                                            <i className={`fas ${'items' in doc ? 'fa-file-invoice-dollar' : 'fa-clipboard-check'}`}></i>
                                                        </div>
                                                        <div>
                                                            <div className="font-bold text-gray-800 text-sm group-hover:text-brand-600 transition-colors">
                                                                {'items' in doc ? 'Presupuesto' : 'Informe Técnico'} #{doc.id}
                                                            </div>
                                                            <div className="text-xs text-gray-500">
                                                                {doc.date}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="text-right flex items-center gap-3">
                                                        {'items' in doc ? (
                                                            <div className="font-bold text-gray-800">
                                                                ${doc.items.reduce((acc: number, item: any) => acc + (item.quantity * item.unitPrice), 0).toLocaleString()}
                                                            </div>
                                                        ) : (
                                                            <div className={`text-xs px-2 py-0.5 rounded-full ${doc.status === 'Reparado' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                                                                }`}>
                                                                {doc.status}
                                                            </div>
                                                        )}
                                                        <i className="fas fa-chevron-right text-gray-300 group-hover:text-brand-500 transition-colors text-xs"></i>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
