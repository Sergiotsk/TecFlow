import React, { useState, useRef } from 'react';
import { Product, ItemType } from '../types';
import * as XLSX from 'xlsx';

interface ProductsManagerProps {
    onClose: () => void;
    products: Product[];
    onUpdateProducts: (products: Product[]) => void;
    onSelectProduct?: (product: Product) => void; // Optional: if used as a picker
}

export const ProductsManager: React.FC<ProductsManagerProps> = ({ onClose, products, onUpdateProducts, onSelectProduct }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);

    // Form State
    const [formData, setFormData] = useState<Partial<Product>>({
        type: 'material',
        category: 'general',
        description: '',
        unitPrice: 0,
        code: '',
        stock: 0
    });

    const fileInputRef = useRef<HTMLInputElement>(null);

    const filteredProducts = products.filter(p =>
        p.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.code && p.code.toLowerCase().includes(searchTerm.toLowerCase()))
    );

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
                unitPrice: formData.unitPrice,
                code: formData.code,
                stock: formData.stock || 0
            };
            onUpdateProducts([...products, newProduct]);
        }

        // Reset Form
        setFormData({
            type: 'material',
            category: 'general',
            description: '',
            unitPrice: 0,
            code: '',
            stock: 0
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

        const reader = new FileReader();
        reader.onload = (evt) => {
            const bstr = evt.target?.result;
            const wb = XLSX.read(bstr, { type: 'binary' });
            const wsname = wb.SheetNames[0];
            const ws = wb.Sheets[wsname];
            const data = XLSX.utils.sheet_to_json(ws, { header: 1 }); // Array of arrays

            // Simple Heuristic mapping
            // Assuming headers in row 0
            // Look for keywords: "Descripcion", "Precio", "Codigo", "Stock"
            if (data.length < 2) {
                alert('Archivo vacío o sin datos');
                return;
            }

            const headers = (data[0] as any[]).map(h => String(h || '').toLowerCase());

            const descIdx = headers.findIndex(h => (h || '').includes('descrip') || (h || '').includes('producto') || (h || '').includes('nombre'));
            const priceIdx = headers.findIndex(h => (h || '').includes('precio') || (h || '').includes('valor') || (h || '').includes('costo'));
            const codeIdx = headers.findIndex(h => (h || '').includes('cod') || (h || '').includes('sku'));
            const stockIdx = headers.findIndex(h => (h || '').includes('stock') || (h || '').includes('cant'));

            if (descIdx === -1 || priceIdx === -1) {
                alert('No se pudieron identificar las columnas de "Descripción" y "Precio". Asegúrese que la primera fila contenga los títulos.');
                return;
            }

            let newProducts: Product[] = [];
            let skipped = 0;

            // Iterate contents
            for (let i = 1; i < data.length; i++) {
                const row = data[i] as any[];
                if (!row || row.length === 0) continue;

                const rawDesc = row[descIdx];
                const rawPrice = row[priceIdx];
                const rawCode = codeIdx !== -1 ? row[codeIdx] : '';
                const rawStock = stockIdx !== -1 ? row[stockIdx] : 0;

                // Helper to clean price
                const parsePrice = (val: any): number => {
                    if (typeof val === 'number') return val;
                    if (!val) return 0;
                    let str = String(val).trim();
                    // Remove currency symbols and spaces
                    str = str.replace(/[$\s]/g, '');
                    // Handle "1.000,00" format (Spanish/European) -> "1000.00"
                    // If it has comma as last separator, replace with dot
                    if (str.includes(',') && !str.includes('.')) {
                        str = str.replace(',', '.');
                    } else if (str.includes(',') && str.includes('.')) {
                        // Assuming last one is decimal
                        if (str.lastIndexOf(',') > str.lastIndexOf('.')) {
                            str = str.replace(/\./g, '').replace(',', '.');
                        }
                    }
                    return parseFloat(str);
                };

                const desc = rawDesc ? String(rawDesc).trim() : '';
                const price = parsePrice(rawPrice);

                console.log(`Row ${i}: Desc="${desc}", PriceRaw="${rawPrice}", PriceParsed=${price}`);

                if (desc && !isNaN(price)) {
                    newProducts.push({
                        id: Math.random().toString(36).substr(2, 9),
                        type: 'material', // Default to material import
                        category: 'Importado',
                        description: desc,
                        unitPrice: price,
                        code: rawCode ? String(rawCode).trim() : '',
                        stock: rawStock ? (parseInt(String(rawStock)) || 0) : 0
                    });
                } else {
                    skipped++;
                }
            }

            if (newProducts.length > 0) {
                if (window.confirm(`Se encontraron ${newProducts.length} productos válidos. ¿Desea importarlos? (Se añadirán a la lista existente)`)) {
                    onUpdateProducts([...products, ...newProducts]);
                    alert('Importación exitosa.');
                }
            } else {
                alert('No se encontraron productos válidos para importar.');
            }
        };
        reader.readAsBinaryString(file);
        e.target.value = ''; // Reset input
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center backdrop-blur-sm p-4 print:hidden">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl h-[90vh] flex flex-col">
                {/* Header */}
                <div className="flex justify-between items-center p-4 border-b">
                    <div>
                        <h2 className="text-xl font-bold text-gray-800"><i className="fas fa-boxes mr-2 text-brand-600"></i>Gestión de Inventario y Productos</h2>
                        <p className="text-xs text-gray-500">Administra tus servicios, repuestos y materiales.</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <i className="fas fa-times text-2xl"></i>
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 flex overflow-hidden">
                    {/* Sidebar / Form */}
                    <div className="w-1/3 border-r bg-gray-50 p-4 overflow-y-auto">
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
                                    <label className="block text-xs font-bold text-gray-500 mb-1">Precio ($)</label>
                                    <input
                                        type="number"
                                        value={formData.unitPrice || ''}
                                        onChange={e => setFormData({ ...formData, unitPrice: parseFloat(e.target.value) || 0 })}
                                        className="w-full border rounded p-2 text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">Stock</label>
                                    <input
                                        type="number"
                                        value={formData.stock || ''}
                                        onChange={e => setFormData({ ...formData, stock: parseInt(e.target.value) || 0 })}
                                        className="w-full border rounded p-2 text-sm"
                                    />
                                </div>
                            </div>

                            <div className="pt-2 flex gap-2">
                                {editingId && (
                                    <button
                                        onClick={() => { setEditingId(null); setFormData({ type: 'material', category: 'general', description: '', unitPrice: 0, code: '', stock: 0 }); }}
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

                            <hr className="my-4" />

                            <div>
                                <h4 className="font-bold text-gray-700 mb-2 text-xs uppercase">Importar Masivo</h4>
                                <input
                                    type="file"
                                    accept=".xlsx, .xls, .csv"
                                    ref={fileInputRef}
                                    className="hidden"
                                    onChange={handleImport}
                                />
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="w-full bg-green-600 text-white py-2 rounded text-sm hover:bg-green-700 flex items-center justify-center gap-2"
                                >
                                    <i className="fas fa-file-excel"></i> Importar desde Excel
                                </button>
                                <p className="text-[10px] text-gray-500 mt-1 leading-tight">
                                    El archivo debe tener cabeceras en la primera fila. Se buscarán automáticamente columnas como "Descripción", "Precio", "Código", "Stock".
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Main List */}
                    <div className="w-2/3 p-4 bg-gray-100 flex flex-col">
                        <div className="mb-4 flex gap-2">
                            <div className="relative flex-1">
                                <i className="fas fa-search absolute left-3 top-2.5 text-gray-400"></i>
                                <input
                                    type="text"
                                    placeholder="Buscar por nombre o código..."
                                    className="w-full pl-9 pr-4 py-2 rounded border focus:outline-none focus:ring-2 focus:ring-brand-500"
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
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
                                        <th className="p-3 font-semibold text-gray-600 text-right">Precio</th>
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
                                                    {product.description}
                                                </div>
                                            </td>
                                            <td className="p-3 text-gray-500">
                                                <span className="bg-gray-100 px-2 py-1 rounded-full text-xs border">
                                                    {product.category}
                                                </span>
                                            </td>
                                            <td className="p-3 text-right font-bold text-brand-600">${product.unitPrice.toLocaleString('es-AR')}</td>
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
                                            <td colSpan={6} className="p-8 text-center text-gray-400">
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
        </div>
    );
};
