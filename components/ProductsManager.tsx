import React, { useState, useRef } from 'react';
import { DebouncedInput } from './DebouncedInput';
import { Product, ItemType } from '../types';
import * as XLSX from 'xlsx';
import { parseProductList } from '../services/geminiService';

interface ProductsManagerProps {
    onClose: () => void;
    products: Product[];
    onUpdateProducts: (products: Product[]) => void;
    onSelectProduct?: (product: Product) => void;
    initialSupplier?: string;
    marginSettings?: { default: number, suppliers: Record<string, number>, frozenSuppliers: string[] };
    onUpdateMarginSettings?: (settings: { default: number, suppliers: Record<string, number>, frozenSuppliers: string[] }) => void;
}

export const ProductsManager: React.FC<ProductsManagerProps> = ({ onClose, products, onUpdateProducts, onSelectProduct, initialSupplier, marginSettings, onUpdateMarginSettings }) => {
    const [searchTerm, setSearchTerm] = useState('');
    // If initialSupplier is provided, we can maybe put it in searchTerm? 
    // No, better to have a dedicated filter or just default search term but it might conflict with user clearing it.
    // Let's force filter via logic if initialSupplier is present, or just set searchTerm to initialSupplier?
    // User wants "open dialog to search article", so maybe just filter by supplier and let user search description.

    // We'll manage a supplierFilter state.
    const [supplierFilter, setSupplierFilter] = useState(initialSupplier || '');
    const [editingId, setEditingId] = useState<string | null>(null);

    // Form State
    const [formData, setFormData] = useState<Partial<Product>>({
        type: 'material',
        category: 'general',
        description: '',
        costPrice: 0,
        unitPrice: 0,
        code: '',
        stock: 0,
        supplier: '',
        isFavorite: false
    });

    const [importSupplier, setImportSupplier] = useState('');
    const [importCategory, setImportCategory] = useState('');
    const [isImporting, setIsImporting] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    // Margin Helper
    const getMarkupForSupplier = (supplierName: string): number => {
        if (!marginSettings) return 0;
        // Case insensitive check and TRIMMED
        const supKey = Object.keys(marginSettings.suppliers).find(k => k.trim().toLowerCase() === supplierName.trim().toLowerCase());
        return supKey ? marginSettings.suppliers[supKey] : (marginSettings.default || 0);
    };

    const filteredProducts = products.filter(p => {
        const matchesSearch = p.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (p.code && p.code.toLowerCase().includes(searchTerm.toLowerCase()));

        const matchesSupplier = supplierFilter ? p.supplier === supplierFilter : true;

        return matchesSearch && matchesSupplier;
    });

    const handleSave = () => {
        if (!formData.description || formData.unitPrice === undefined) return;

        if (editingId) {
            // Edit
            const updated = products.map(p => p.id === editingId ? { ...p, ...formData } as Product : p);
            onUpdateProducts(updated);
            setEditingId(null);
        } else {
            // Create
            const newProduct: Product = {
                id: Math.random().toString(36).substr(2, 9),
                type: formData.type as ItemType || 'material',
                category: formData.category || 'general',
                description: formData.description,
                costPrice: formData.costPrice || 0,
                unitPrice: formData.unitPrice,
                code: formData.code,
                stock: formData.stock || 0,
                supplier: formData.supplier || '',
                isFavorite: formData.isFavorite || false
            };
            onUpdateProducts([...products, newProduct]);
        }

        // Reset Form
        setFormData({
            type: 'material',
            category: 'general',
            description: '',
            costPrice: 0,
            unitPrice: 0,
            code: '',
            stock: 0,
            supplier: '',
            isFavorite: false
        });
    };

    const handleEdit = (product: Product) => {
        setEditingId(product.id);
        setFormData({ ...product });
    };

    const handleDelete = (id: string) => {
        if (window.confirm('¿Eliminar este producto?')) {
            onUpdateProducts(products.filter(p => p.id !== id));
        }
    };

    const handleToggleFavorite = (id: string) => {
        const updated = products.map(p => p.id === id ? { ...p, isFavorite: !p.isFavorite } : p);
        onUpdateProducts(updated);
    };

    const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!importSupplier) {
            alert("Por favor ingresa primero el nombre del proveedor para este lote.");
            e.target.value = '';
            return;
        }

        if (!importCategory) {
            alert("Por favor selecciona o ingresa una categoría para este lote.");
            e.target.value = '';
            return;
        }

        setIsImporting(true);

        try {
            const fileType = file.name.split('.').pop()?.toLowerCase();
            let newProducts: Product[] = [];

            if (['jpg', 'jpeg', 'png', 'pdf'].includes(fileType || '')) {
                // ... (Existing Image/PDF logic - can remain similar but strictly set cost)
                const reader = new FileReader();
                reader.onload = async (evt) => {
                    // ... (keep existing image logic for now, or apply similar fix if needed)
                    // For brevity, let's focus on the Excel/CSV part which is the main bulk import vector
                    // But we MUST apply the margin check here too.

                    const margin = getMarkupForSupplier(importSupplier.trim());
                    if (!window.confirm(`Procesando imágenes para "${importSupplier}".\nMargen detectado: ${margin}%\n\n¿Continuar?`)) {
                        setIsImporting(false);
                        return;
                    }

                    const base64 = (evt.target?.result as string).split(',')[1];
                    const mimeType = fileType === 'pdf' ? 'application/pdf' : 'image/jpeg';

                    try {
                        const extracted = await parseProductList(base64, mimeType);
                        newProducts = extracted.map(item => {
                            const cost = Number(item.unitPrice) || 0; // AI typically returns the listed price as "unitPrice"
                            return {
                                id: Math.random().toString(36).substr(2, 9),
                                type: 'material',
                                category: importCategory,
                                description: item.description || 'Sin descripción',
                                costPrice: cost,
                                unitPrice: cost * (1 + margin / 100),
                                code: item.code || '',
                                stock: Number(item.stock) || 0,
                                supplier: importSupplier
                            };
                        });
                        finishImport(newProducts);
                    } catch (err: any) {
                        alert("Error procesando con IA: " + err.message);
                        setIsImporting(false);
                    }
                };
                reader.readAsDataURL(file);

            } else {
                // Excel Processing
                const margin = getMarkupForSupplier(importSupplier.trim());
                if (!window.confirm(`Importando Excel/CSV para "${importSupplier}".\nMargen detectado: ${margin}%\n\nSe calculará: Precio Venta = Costo + ${margin}%\n\n¿Los precios en el archivo son COSTOS? (Si son precios finales, ajusta el margen a 0 antes de importar).`)) {
                    setIsImporting(false);
                    return;
                }

                const reader = new FileReader();
                reader.onload = (evt) => {
                    try {
                        const bstr = evt.target?.result;
                        const wb = XLSX.read(bstr, { type: 'binary' });
                        const wsname = wb.SheetNames[0];
                        const ws = wb.Sheets[wsname];
                        const data = XLSX.utils.sheet_to_json(ws, { header: 1 }); // Array of arrays

                        if (data.length < 2) {
                            alert('Archivo vacío o sin datos');
                            setIsImporting(false);
                            return;
                        }

                        // Sanitize headers: Ensure dense array and strings
                        const rawHeaders = (data[0] as any[]) || [];
                        const headers = Array.from(rawHeaders).map(h => String(h || '').toLowerCase());

                        // Improved matching for headers
                        const descIdx = headers.findIndex(h => h && (h.includes('descrip') || h.includes('producto') || h.includes('nombre') || h.includes('articulo')));
                        const priceIdx = headers.findIndex(h => h && (h.includes('precio') || h.includes('valor') || h.includes('costo') || h.includes('importe')));
                        const codeIdx = headers.findIndex(h => h && (h.includes('cod') || h.includes('sku') || h.includes('id')));
                        const stockIdx = headers.findIndex(h => h && (h.includes('stock') || h.includes('cant') || h.includes('existencia')));

                        if (descIdx === -1 || priceIdx === -1) {
                            alert(`No se encontraron columnas requeridas.\nSe buscó: Descripción, Precio/Costo.\nEncabezados encontrados: ${headers.join(', ')}`);
                            setIsImporting(false);
                            return;
                        }

                        // Robust Price Parser
                        const parsePrice = (val: any): number => {
                            if (typeof val === 'number') return val;
                            if (!val) return 0;
                            let str = String(val).trim();

                            // Remove common currency symbols
                            str = str.replace(/[$\sA-Za-z]/g, '');

                            // Handle "1.200,50" (European/Latam) vs "1,200.50" (US)
                            // Heuristic: Last separator determines decimal if multiple types exist
                            const lastComma = str.lastIndexOf(',');
                            const lastDot = str.lastIndexOf('.');

                            if (lastComma > -1 && lastDot > -1) {
                                if (lastComma > lastDot) {
                                    // 1.200,50 -> Remove dots, replace comma with dot
                                    str = str.replace(/\./g, '').replace(',', '.');
                                } else {
                                    // 1,200.50 -> Remove commas
                                    str = str.replace(/,/g, '');
                                }
                            } else if (lastComma > -1) {
                                // Only commas. Could be decimal (12,50) or thousands (1,200)
                                // Often in CSVs, thousands separator is avoided, so assume decimal if it looks like XX,XX
                                // But "1,200" is ambiguous.
                                // Let's assume Latam context: comma is decimal.
                                str = str.replace(',', '.');
                            }
                            return parseFloat(str);
                        };

                        for (let i = 1; i < data.length; i++) {
                            const row = data[i] as any[];
                            if (!row || row.length === 0) continue;

                            const desc = row[descIdx] ? String(row[descIdx]).trim() : '';
                            const rawPrice = row[priceIdx];
                            const price = parsePrice(rawPrice);

                            if (desc && !isNaN(price)) {
                                newProducts.push({
                                    id: Math.random().toString(36).substr(2, 9),
                                    type: 'material',
                                    category: importCategory,
                                    description: desc,
                                    costPrice: price, // THE KEY FIX: The file value is the COST
                                    unitPrice: price * (1 + margin / 100), // Calculated selling price
                                    code: codeIdx !== -1 ? String(row[codeIdx] || '') : '',
                                    stock: stockIdx !== -1 ? (parseInt(String(row[stockIdx]).replace(/\D/g, '')) || 0) : 0,
                                    supplier: importSupplier
                                });
                            }
                        }

                        if (newProducts.length === 0) {
                            alert('No se pudieron extraer productos válidos. Verifique el formato del archivo.');
                            setIsImporting(false);
                            return;
                        }

                        finishImport(newProducts);

                    } catch (error: any) {
                        console.error("Import Error:", error);
                        alert('Error crítico al procesar el archivo: ' + error.message);
                        setIsImporting(false);
                    }
                };
                reader.onerror = () => {
                    alert('Error al leer el archivo físico.');
                    setIsImporting(false);
                };
                reader.readAsBinaryString(file);
            }

        } catch (error: any) {
            console.error("Critical Import Error:", error);
            alert("Error crítico de importación: " + error.message);
            setIsImporting(false);
        }

        // Reset input
        e.target.value = '';
    };

    const finishImport = (newItems: Product[]) => {
        if (newItems.length > 0) {
            let updatedList = [...products];
            let addedCount = 0;
            let updatedCount = 0;
            let unchangedCount = 0;
            const now = new Date().toISOString();

            newItems.forEach(newItem => {
                const existingIndex = newItem.code
                    ? updatedList.findIndex(p => p.code === newItem.code && p.supplier === newItem.supplier)
                    : -1;

                if (existingIndex !== -1) {
                    // Check if price or stock actually changed to count as update
                    const existingItem = updatedList[existingIndex];
                    // Verify if cost changed specifically, or if strict match fails
                    // Note: if user manually updated unitPrice, re-importing might overwrite properly if we respect margin logic

                    // Simple logic: If incoming cost is different, or description/stock changed
                    const priceChanged = Math.abs((existingItem.costPrice || 0) - (newItem.costPrice || 0)) > 0.01;

                    if (priceChanged || existingItem.stock !== newItem.stock || existingItem.description !== newItem.description) {
                        updatedList[existingIndex] = {
                            ...existingItem,
                            costPrice: newItem.costPrice,
                            unitPrice: newItem.unitPrice, // Recalculated with margin
                            description: newItem.description,
                            stock: newItem.stock,
                            lastUpdated: now
                        };
                        updatedCount++;
                    } else {
                        // Even if not changed, we might want to update the timestamp to certify it was checked? 
                        // User requirement: "si hay productos nuevos o solo actualizacion de precios".
                        // Let's assume verifying valid price counts as an update or at least a check.
                        // But usually "Updated" implies value change. Let's stick to value change for the counter, 
                        // but maybe update timestamp anyway to show "Updated Today"? 
                        // Let's update timestamp ONLY if values change, so "Last Update" reflects price change.
                        unchangedCount++;
                    }
                } else {
                    updatedList.push({ ...newItem, lastUpdated: now });
                    addedCount++;
                }
            });

            onUpdateProducts(updatedList);
            alert(`Resumen de Importación:\n\n🆕 Nuevos productos: ${addedCount}\n🔄 Precios/Stock actualizados: ${updatedCount}\n⏹️ Sin cambios: ${unchangedCount}`);
        } else {
            alert('No se encontraron productos válidos para importar.');
        }
        setIsImporting(false);
    };

    const [showSettings, setShowSettings] = useState(false);
    const [localSettings, setLocalSettings] = useState(marginSettings);

    // Sync local settings when opening the panel
    React.useEffect(() => {
        if (showSettings && marginSettings) {
            setLocalSettings(marginSettings);
        }
    }, [showSettings, marginSettings]);

    // settings handlers
    const handleUpdateMargin = (key: string, val: number) => {
        if (!localSettings) return;
        if (key === 'default') {
            setLocalSettings({ ...localSettings, default: val });
        } else {
            const newSuppliers = { ...localSettings.suppliers, [key]: val };
            setLocalSettings({ ...localSettings, suppliers: newSuppliers });
        }
    };

    const handleSaveSettings = () => {
        if (localSettings && onUpdateMarginSettings) {
            onUpdateMarginSettings(localSettings);
            alert('Configuración guardada correctamente.');
            setShowSettings(false);
        }
    };

    const handleToggleFreeze = (supplier: string) => {
        if (!localSettings) return;
        const currentFrozen = localSettings.frozenSuppliers || [];
        const isFrozen = currentFrozen.includes(supplier);

        let newFrozen;
        if (isFrozen) {
            newFrozen = currentFrozen.filter(s => s !== supplier);
        } else {
            newFrozen = [...currentFrozen, supplier];
        }

        setLocalSettings({ ...localSettings, frozenSuppliers: newFrozen });
    };

    const handleDeleteSupplier = (supplier: string) => {
        if (window.confirm(`¿Estás seguro de ELIMINAR al proveedor "${supplier}"?\n\n⚠️ ESTO BORRARÁ TODOS LOS PRODUCTOS DE ESTE PROVEEDOR.\n\nEsta acción no se puede deshacer.`)) {
            // Delete products
            const newProducts = products.filter(p => p.supplier !== supplier);
            onUpdateProducts(newProducts);

            // Cleanup settings if we want? Maybe keep margin setting just in case?
            // Let's keep margin setting but it won't show up in list as products are gone.
            // But if user re-adds supplier, margin is remembered. That's a feature.
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center backdrop-blur-sm p-4 print:hidden">
            <div className={`bg-white rounded-lg shadow-xl w-full max-w-[95vw] ${showSettings ? 'h-auto max-h-[90vh]' : 'h-[90vh]'} flex flex-col transition-all`}>
                {/* Header */}
                <div className="flex justify-between items-center p-4 border-b">
                    <div>
                        <h2 className="text-xl font-bold text-gray-800"><i className="fas fa-boxes mr-2 text-brand-600"></i>Gestión de Inventario y Productos</h2>
                        <div className="flex items-center gap-2">
                            <p className="text-xs text-gray-500">Administra tus servicios, repuestos y materiales.</p>
                            <button onClick={() => setShowSettings(!showSettings)} className="text-xs text-brand-600 hover:text-brand-800 underline ml-2">
                                <i className="fas fa-cog"></i> Config. Precios
                            </button>
                        </div>
                        {supplierFilter && (
                            <div className="flex flex-col mt-1">
                                <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full w-fit border border-blue-200">
                                    <i className="fas fa-filter text-[10px]"></i> Prov: <strong>{supplierFilter}</strong>
                                    <button onClick={() => setSupplierFilter('')} className="ml-1 hover:text-red-500"><i className="fas fa-times"></i></button>
                                </span>
                                {(() => {
                                    // Calculate last update for this supplier
                                    const supplierItems = products.filter(p => p.supplier === supplierFilter && p.lastUpdated);
                                    if (supplierItems.length > 0) {
                                        // Find max date
                                        const lastDate = supplierItems.reduce((max, p) => p.lastUpdated! > max ? p.lastUpdated! : max, '');
                                        if (lastDate) {
                                            return <span className="text-[10px] text-gray-400 mt-1 ml-1"><i className="far fa-clock"></i> Actualizado: {new Date(lastDate).toLocaleDateString()} {new Date(lastDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        }
                                    }
                                    return null;
                                })()}
                            </div>
                        )}
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <i className="fas fa-times text-2xl"></i>
                    </button>
                </div>

                {/* Settings Overlay */}
                {showSettings && localSettings && (
                    <div className="bg-gray-50 border-b p-4 animate-fade-in relative shadow-inner">
                        <button onClick={() => setShowSettings(false)} className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"><i className="fas fa-times"></i></button>
                        <h3 className="font-bold text-gray-700 mb-3"><i className="fas fa-percentage text-brand-500 mr-2"></i>Configuración de Márgenes de Ganancia</h3>
                        <div className="flex gap-8">
                            {/* Global */}
                            <div className="bg-white p-3 rounded border shadow-sm">
                                <label className="block text-xs font-bold text-gray-500 mb-1">Margen General (Defecto)</label>
                                <div className="flex items-center gap-2">
                                    <DebouncedInput
                                        type="number"
                                        value={localSettings.default}
                                        onDebouncedChange={val => handleUpdateMargin('default', parseFloat(val) || 0)}
                                        className="w-20 border rounded p-1 text-right font-bold text-brand-600"
                                    />
                                    <span className="text-gray-500 font-bold">%</span>
                                </div>
                                <p className="text-[10px] text-gray-400 mt-1 max-w-[150px]">Se aplica si el proveedor no tiene una configuración específica.</p>
                            </div>

                            {/* Suppliers */}
                            <div className="flex-1 bg-white p-3 rounded border shadow-sm overflow-y-auto max-h-[150px]">
                                <label className="block text-xs font-bold text-gray-500 mb-1">Márgenes por Proveedor</label>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                    {/* List existing suppliers from products to allow config, plus an empty adder? 
                                        For now, list known suppliers from the product list and allow setting their margin. 
                                    */}
                                    {Array.from(new Set(products.map(p => p.supplier ? p.supplier.trim() : '').filter(Boolean)))
                                        .map(s => s as string)
                                        .map(sup => {
                                            const isFrozen = localSettings.frozenSuppliers?.includes(sup);
                                            return (
                                                <div key={sup} className={`flex items-center justify-between bg-gray-50 p-1.5 rounded border ${isFrozen ? 'opacity-60 bg-gray-100' : ''}`}>
                                                    <div className="flex items-center overflow-hidden mr-2">
                                                        {isFrozen && <i className="fas fa-snowflake text-xs text-blue-400 mr-1" title="Congelado"></i>}
                                                        <span className={`text-xs truncate font-medium text-gray-600 ${isFrozen ? 'line-through' : ''}`} title={sup}>{sup}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <DebouncedInput
                                                            type="number"
                                                            placeholder="Def"
                                                            value={localSettings.suppliers[sup] ?? ''}
                                                            onDebouncedChange={val => handleUpdateMargin(sup, parseFloat(val))}
                                                            className="w-16 border rounded p-1 text-right text-xs"
                                                            disabled={!!isFrozen}
                                                        />
                                                        <span className="text-[10px] text-gray-400 mr-1">%</span>

                                                        <button
                                                            onClick={() => handleToggleFreeze(sup)}
                                                            className={`text-xs w-5 h-5 flex items-center justify-center rounded hover:bg-gray-200 transition-colors ${isFrozen ? 'text-blue-500' : 'text-gray-400'}`}
                                                            title={isFrozen ? "Descongelar" : "Congelar (Ocultar)"}
                                                        >
                                                            <i className="fas fa-snowflake"></i>
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteSupplier(sup)}
                                                            className="text-xs w-5 h-5 flex items-center justify-center rounded hover:bg-red-100 text-gray-400 hover:text-red-500 transition-colors"
                                                            title="Eliminar Proveedor y sus Productos"
                                                        >
                                                            <i className="fas fa-trash"></i>
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    {products.every(p => !p.supplier) && <p className="text-xs text-gray-400 italic">No tienes proveedores registrados en tus productos aún.</p>}
                                </div>
                            </div>

                            <div className="flex flex-col justify-end">
                                <button
                                    onClick={handleSaveSettings}
                                    className="bg-brand-600 text-white px-4 py-2 rounded shadow hover:bg-brand-700 transition font-bold text-sm"
                                >
                                    <i className="fas fa-save mr-2"></i>Guardar Configuración
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Content */}
                <div className="flex-1 flex overflow-hidden">
                    {/* Sidebar / Form */}
                    <div className="w-1/4 border-r bg-gray-50 p-4 overflow-y-auto">
                        <h3 className="font-bold text-gray-700 mb-4">{editingId ? 'Editar Producto' : 'Nuevo Producto'}</h3>

                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">Tipo</label>
                                <select
                                    value={formData.type}
                                    onChange={e => setFormData({ ...formData, type: e.target.value as ItemType })}
                                    className="w-full border rounded p-2 text-sm"
                                >
                                    <option value="material">Material / Repuesto</option>
                                    <option value="service">Servicio</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">Categoría</label>
                                <input
                                    type="text"
                                    list="categoriesList"
                                    value={formData.category}
                                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                                    className="w-full border rounded p-2 text-sm"
                                />
                                <datalist id="categoriesList">
                                    <option value="Computación" />
                                    <option value="Electricidad" />
                                    <option value="General" />
                                </datalist>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">Código / SKU</label>
                                <input
                                    type="text"
                                    value={formData.code}
                                    onChange={e => setFormData({ ...formData, code: e.target.value })}
                                    className="w-full border rounded p-2 text-sm"
                                    placeholder="Ej: DIS-SSD-240"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">Descripción</label>
                                <textarea
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full border rounded p-2 text-sm"
                                    rows={3}
                                    placeholder="Descripción detallada del item"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">Costo ($)</label>
                                    <DebouncedInput
                                        type="number"
                                        value={formData.costPrice || ''}
                                        onDebouncedChange={val => {
                                            const cost = parseFloat(val) || 0;
                                            const margin = getMarkupForSupplier(formData.supplier || '') || 0;
                                            const price = cost * (1 + margin / 100);
                                            setFormData({ ...formData, costPrice: cost, unitPrice: price });
                                        }}
                                        className="w-full border rounded p-2 text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">Precio Venta ($)</label>
                                    <DebouncedInput
                                        type="number"
                                        value={formData.unitPrice || ''}
                                        onDebouncedChange={val => setFormData({ ...formData, unitPrice: parseFloat(val) || 0 })}
                                        className="w-full border rounded p-2 text-sm"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">Stock</label>
                                <DebouncedInput
                                    type="number"
                                    value={formData.stock || ''}
                                    onDebouncedChange={val => setFormData({ ...formData, stock: parseInt(val) || 0 })}
                                    className="w-full border rounded p-2 text-sm"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">Proveedor</label>
                                <input
                                    type="text"
                                    value={formData.supplier || ''}
                                    onChange={e => setFormData({ ...formData, supplier: e.target.value })}
                                    className="w-full border rounded p-2 text-sm"
                                    placeholder="Nombre del proveedor"
                                />
                            </div>

                            <div className="flex items-center gap-2 pt-2">
                                <label className="flex items-center gap-2 text-xs font-bold text-gray-700 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={!!formData.isFavorite}
                                        onChange={e => setFormData({ ...formData, isFavorite: e.target.checked })}
                                        className="rounded text-brand-600 focus:ring-brand-500"
                                    />
                                    <i className={`fas fa-star ${formData.isFavorite ? 'text-yellow-400' : 'text-gray-300'}`}></i>
                                    Marcar como Frecuente
                                </label>
                            </div>

                            <div className="pt-2 flex gap-2">
                                {editingId && (
                                    <button
                                        onClick={() => { setEditingId(null); setFormData({ type: 'material', category: 'general', description: '', costPrice: 0, unitPrice: 0, code: '', stock: 0, supplier: '', isFavorite: false }); }}
                                        className="flex-1 bg-gray-300 text-gray-700 py-2 rounded text-sm hover:bg-gray-400"
                                    >
                                        Cancelar
                                    </button>
                                )}
                                <button
                                    onClick={handleSave}
                                    className="flex-1 bg-brand-600 text-white py-2 rounded text-sm hover:bg-brand-700 font-bold"
                                >
                                    {editingId ? 'Guardar Cambios' : 'Crear Producto'}
                                </button>
                            </div>

                            <hr className="my-4" />

                            <div>
                                <h4 className="font-bold text-gray-700 mb-2 text-xs uppercase">Importar Masivo</h4>

                                <div className="mb-2">
                                    <label className="block text-xs font-bold text-gray-500 mb-1">Nombre Proveedor (Requerido)</label>
                                    <input
                                        type="text"
                                        value={importSupplier}
                                        onChange={e => setImportSupplier(e.target.value)}
                                        className="w-full border rounded p-2 text-sm"
                                        placeholder="Ej: Distribuidora X"
                                    />
                                </div>

                                <div className="mb-2">
                                    <label className="block text-xs font-bold text-gray-500 mb-1">Categoría (Requerido)</label>
                                    <input
                                        type="text"
                                        list="categoriesList"
                                        value={importCategory}
                                        onChange={e => setImportCategory(e.target.value)}
                                        className="w-full border rounded p-2 text-sm"
                                        placeholder="Ej: Computación"
                                    />
                                </div>

                                <input
                                    type="file"
                                    accept=".xlsx, .xls, .csv, .pdf, .jpg, .jpeg, .png"
                                    ref={fileInputRef}
                                    className="hidden"
                                    onChange={handleImport}
                                />
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={isImporting}
                                    className={`w-full text-white py-2 rounded text-sm flex items-center justify-center gap-2 ${isImporting ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700'}`}
                                >
                                    {isImporting ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-file-import"></i>}
                                    {isImporting ? 'Analizando...' : 'Importar (Excel/PDF/Img)'}
                                </button>
                                <p className="text-[10px] text-gray-500 mt-1 leading-tight">
                                    Formatos: Excel, CSV, PDF, JPG, PNG. La IA procesará automáticamente las imágenes.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Main List */}
                    <div className="w-3/4 p-4 bg-gray-100 flex flex-col">
                        <div className="mb-4 flex gap-2">
                            <div className="relative flex-1">
                                <i className="fas fa-search absolute left-3 top-2.5 text-gray-400"></i>
                                <DebouncedInput
                                    type="text"
                                    placeholder="Buscar por nombre o código..."
                                    className="w-full pl-9 pr-4 py-2 rounded border focus:outline-none focus:ring-2 focus:ring-brand-500"
                                    value={searchTerm}
                                    onValueChange={setSearchTerm}
                                />
                            </div>
                            <div className="bg-white px-3 py-2 rounded border text-sm text-gray-600">
                                Total: <strong>{products.length}</strong> items
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto bg-white rounded shadow border">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-50 sticky top-0 z-10 border-b shadow-sm">
                                    <tr>
                                        <th className="p-3 font-semibold text-gray-600 w-10"></th>
                                        <th className="p-3 font-semibold text-gray-600">Código</th>
                                        <th className="p-3 font-semibold text-gray-600">Descripción</th>
                                        <th className="p-3 font-semibold text-gray-600">Categoría</th>
                                        <th className="p-3 font-semibold text-gray-600 text-right text-xs">Costo</th>
                                        <th className="p-3 font-semibold text-gray-600 text-right text-xs">Markup</th>
                                        <th className="p-3 font-semibold text-gray-600 text-right">Precio Venta</th>
                                        <th className="p-3 font-semibold text-gray-600 text-right">Stock</th>
                                        <th className="p-3 font-semibold text-gray-600 text-center">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {filteredProducts.map(product => (
                                        <tr key={product.id} className="hover:bg-blue-50 transition-colors cursor-pointer" onClick={() => onSelectProduct && onSelectProduct(product)}>
                                            <td className="p-3 text-center">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleToggleFavorite(product.id); }}
                                                    className="focus:outline-none"
                                                >
                                                    <i className={`fas fa-star ${product.isFavorite ? 'text-yellow-400' : 'text-gray-200 hover:text-yellow-200'}`}></i>
                                                </button>
                                            </td>
                                            <td className="p-3 text-gray-500 font-mono text-xs">{product.code || '-'}</td>
                                            <td className="p-3 font-medium text-gray-800">
                                                <div className="flex items-center gap-2">
                                                    <i className={`fas fa-${product.type === 'service' ? 'wrench' : 'box'} text-xs text-gray-400`}></i>
                                                    <div>
                                                        <div>{product.description}</div>
                                                        {product.supplier && <div className="text-[10px] text-gray-400">Prov: {product.supplier}</div>}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-3 text-gray-500">
                                                <span className="bg-gray-100 px-2 py-1 rounded-full text-xs border">
                                                    {product.category}
                                                </span>
                                            </td>
                                            <td className="p-3 text-right text-xs text-gray-500">
                                                {product.costPrice ? `$${product.costPrice.toLocaleString('es-AR')}` : '-'}
                                            </td>
                                            <td className="p-3 text-right text-xs text-brand-500 font-bold">
                                                {(() => {
                                                    if (product.costPrice && product.unitPrice) {
                                                        const configured = getMarkupForSupplier(product.supplier || '');
                                                        const calculated = Math.round(((product.unitPrice - product.costPrice) / product.costPrice) * 100);
                                                        if (Math.abs(calculated - configured) < 1) return `${configured}%`;
                                                        return `${calculated}%`;
                                                    }
                                                    return getMarkupForSupplier(product.supplier || '') + '%';
                                                })()}
                                            </td>
                                            <td className="p-3 text-right font-bold text-gray-800">${product.unitPrice.toLocaleString('es-AR')}</td>
                                            <td className="p-3 text-right">
                                                {product.type === 'material' ? (
                                                    <span className={`${product.stock && product.stock < 5 ? 'text-red-500 font-bold' : 'text-gray-600'}`}>
                                                        {product.stock || 0}
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-300">-</span>
                                                )}
                                            </td>
                                            <td className="p-3 text-center">
                                                <div className="flex justify-center gap-2">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleEdit(product); }}
                                                        className="text-blue-500 hover:text-blue-700 bg-blue-50 p-1.5 rounded hover:bg-blue-100"
                                                    >
                                                        <i className="fas fa-edit"></i>
                                                    </button>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleDelete(product.id); }}
                                                        className="text-red-500 hover:text-red-700 bg-red-50 p-1.5 rounded hover:bg-red-100"
                                                    >
                                                        <i className="fas fa-trash-alt"></i>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredProducts.length === 0 && (
                                        <tr>
                                            <td colSpan={7} className="p-8 text-center text-gray-400">
                                                No se encontraron productos.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div >
    );
};
