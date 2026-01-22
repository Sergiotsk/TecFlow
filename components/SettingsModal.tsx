import React, { useCallback, useState } from 'react';
import { BusinessSettings, PresetItem, ItemType } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { DebouncedInput } from './DebouncedInput';
import { DebouncedTextarea } from './DebouncedTextarea';

interface SettingsModalProps {
  settings: BusinessSettings;
  presets: PresetItem[];
  categories: string[];
  onSave: (settings: BusinessSettings) => void;
  onSavePresets: (presets: PresetItem[]) => void;
  onSaveCategories: (categories: string[]) => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  presets,
  categories,
  onSave,
  onSavePresets,
  onSaveCategories,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<'business' | 'items'>('business');
  const [formData, setFormData] = useState<BusinessSettings>(settings);

  // Categories State
  const [localCategories, setLocalCategories] = useState<string[]>(categories);
  const [newCategoryName, setNewCategoryName] = useState('');

  // Presets State
  const [localPresets, setLocalPresets] = useState<PresetItem[]>(presets);
  const [editingItem, setEditingItem] = useState<PresetItem | null>(null);
  const [newItem, setNewItem] = useState<Partial<PresetItem>>({
    type: 'service',
    category: '', // Empty initially
    description: '',
    unitPrice: 0
  });

  // --- Business Handlers ---
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleLogoUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, logo: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const handleRemoveLogo = () => {
    setFormData(prev => ({ ...prev, logo: null }));
  };

  // --- Category Handlers ---
  const handleAddCategory = () => {
    if (!newCategoryName.trim()) return;
    if (localCategories.includes(newCategoryName.trim())) {
      alert('La categoría ya existe');
      return;
    }
    setLocalCategories(prev => [...prev, newCategoryName.trim()].sort());
    setNewCategoryName('');
  };

  const handleDeleteCategory = (cat: string) => {
    if (confirm(`¿Eliminar la categoría "${cat}"? (Los items existentes no se borrarán)`)) {
      setLocalCategories(prev => prev.filter(c => c !== cat));
    }
  };

  // --- Preset Handlers ---
  const handleAddOrUpdatePreset = () => {
    if (!newItem.description) return alert('La descripción es obligatoria');

    // Default category if empty
    const categoryToUse = newItem.category || 'General';

    if (editingItem) {
      // Update existing
      setLocalPresets(prev => prev.map(p => p.id === editingItem.id ? { ...editingItem, ...newItem, category: categoryToUse } as PresetItem : p));
      setEditingItem(null);
    } else {
      // Add new
      const item: PresetItem = {
        id: uuidv4(),
        type: newItem.type as ItemType || 'service',
        category: categoryToUse,
        description: newItem.description || '',
        unitPrice: Number(newItem.unitPrice) || 0
      };
      setLocalPresets(prev => [...prev, item]);
    }

    // Reset form but keep category if possible for convenience
    setNewItem(prev => ({ type: 'service', category: prev.category, description: '', unitPrice: 0 }));
  };

  const handleEditClick = (item: PresetItem) => {
    setEditingItem(item);
    setNewItem({ ...item });
  };

  const handleDeleteClick = (id: string) => {
    if (confirm('¿Eliminar este item?')) {
      setLocalPresets(prev => prev.filter(p => p.id !== id));
    }
  };

  const handleCancelEdit = () => {
    setEditingItem(null);
    setNewItem({ type: 'service', category: '', description: '', unitPrice: 0 });
  };

  // --- Main Save ---
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onSavePresets(localPresets);
    onSaveCategories(localCategories);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4 print:hidden">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b shrink-0 bg-white z-10">
          <h2 className="text-2xl font-bold text-gray-800">Configuración</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <i className="fas fa-times text-xl"></i>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b shrink-0">
          <button
            className={`flex-1 py-3 text-sm font-medium border-b-2 ${activeTab === 'business' ? 'border-brand-600 text-brand-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            onClick={() => setActiveTab('business')}
          >
            <i className="fas fa-building mr-2"></i> Datos del Negocio
          </button>
          <button
            className={`flex-1 py-3 text-sm font-medium border-b-2 ${activeTab === 'items' ? 'border-brand-600 text-brand-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            onClick={() => setActiveTab('items')}
          >
            <i className="fas fa-cube mr-2"></i> Items y Repuestos
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto p-6 flex-grow">
          <form id="settingsForm" onSubmit={handleSubmit} className="space-y-6">

            {/* BUSINESS TAB */}
            {activeTab === 'business' && (
              <div className="space-y-6">
                {/* Logo Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">Logo del Negocio</label>
                    <div className="flex items-center space-x-4">
                      {formData.logo ? (
                        <div className="relative w-24 h-24 border rounded-lg overflow-hidden flex items-center justify-center bg-gray-50">
                          <img src={formData.logo} alt="Logo Preview" className="max-w-full max-h-full object-contain" />
                          <button
                            type="button"
                            onClick={handleRemoveLogo}
                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                          >
                            <i className="fas fa-trash"></i>
                          </button>
                        </div>
                      ) : (
                        <div className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center text-gray-400">
                          <i className="fas fa-image text-3xl mb-2"></i>
                          <span className="text-xs">Sin Logo</span>
                        </div>
                      )}
                      <div className="flex-1">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleLogoUpload}
                          className="block w-full text-xs text-gray-500 file:mr-2 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">Color de Marca</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        name="brandColor"
                        value={formData.brandColor}
                        onChange={handleChange}
                        className="h-10 w-20 p-1 rounded border border-gray-300 cursor-pointer"
                      />
                      <span className="text-sm text-gray-500 uppercase">{formData.brandColor}</span>
                    </div>
                    <p className="text-xs text-gray-500">Color principal de su identidad.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Nombre del Negocio</label>
                    <input type="text" name="name" value={formData.name} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Teléfono</label>
                    <input type="text" name="phone" value={formData.phone} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Email</label>
                    <input type="email" name="email" value={formData.email} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Web / Redes</label>
                    <input type="text" name="website" value={formData.website} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700">Dirección</label>
                    <input type="text" name="address" value={formData.address} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700">Pie de Página Predeterminado</label>
                    <textarea name="defaultFooter" value={formData.defaultFooter} onChange={handleChange} rows={2} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700">Mensaje Final</label>
                    <input type="text" name="finalMessage" value={formData.finalMessage} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2" />
                  </div>
                </div>
              </div>
            )}

            {/* ITEMS & CATEGORIES TAB */}
            {activeTab === 'items' && (
              <div className="space-y-6">

                {/* CATEGORY MANAGEMENT */}
                <div className="bg-brand-50 p-4 rounded-lg border border-brand-100">
                  <h3 className="text-sm font-bold text-brand-800 mb-2">Gestionar Categorías</h3>
                  <div className="flex gap-2 mb-3">
                    <input
                      type="text"
                      placeholder="Nueva categoría..."
                      className="flex-1 text-sm rounded border-gray-300 border p-2"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCategory())}
                    />
                    <button
                      type="button"
                      onClick={handleAddCategory}
                      className="px-4 py-2 bg-brand-600 text-white rounded hover:bg-brand-700 text-sm"
                    >
                      <i className="fas fa-plus"></i>
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {localCategories.map(cat => (
                      <span key={cat} className="inline-flex items-center px-2 py-1 rounded bg-white border border-brand-200 text-xs text-brand-700 font-medium">
                        {cat}
                        <button
                          type="button"
                          onClick={() => handleDeleteCategory(cat)}
                          className="ml-2 text-brand-400 hover:text-red-500"
                        >
                          &times;
                        </button>
                      </span>
                    ))}
                    {localCategories.length === 0 && <span className="text-xs text-gray-500 italic">No hay categorías definidas.</span>}
                  </div>
                </div>

                {/* ITEM MANAGEMENT */}
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <h3 className="text-sm font-bold text-gray-700 mb-3">{editingItem ? 'Editar Item' : 'Agregar Nuevo Item'}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div>
                      <select
                        className="w-full text-sm border-gray-300 rounded-md p-2 border"
                        value={newItem.type}
                        onChange={(e) => setNewItem({ ...newItem, type: e.target.value as ItemType })}
                      >
                        <option value="service" >Mano de Obra / Servicio</option>
                        <option value="material">Repuesto / Material</option>
                      </select>
                    </div>
                    <div>
                      {/* Using Datalist for categories */}
                      <input
                        type="text"
                        placeholder="Categoría"
                        list="modal-categories"
                        className="w-full text-sm border-gray-300 rounded-md p-2 border"
                        value={newItem.category}
                        onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                      />
                      <datalist id="modal-categories">
                        {localCategories.map(c => <option key={c} value={c} />)}
                      </datalist>
                    </div>
                    <div className="md:col-span-2">
                      <input
                        type="text"
                        placeholder="Descripción"
                        className="w-full text-sm border-gray-300 rounded-md p-2 border"
                        value={newItem.description}
                        onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                      />
                    </div>
                    <div>
                      <input
                        type="number"
                        placeholder="Precio Unit."
                        className="w-full text-sm border-gray-300 rounded-md p-2 border"
                        value={newItem.unitPrice}
                        onChange={(e) => setNewItem({ ...newItem, unitPrice: Number(e.target.value) })}
                      />
                    </div>
                    <div className="md:col-span-3 flex justify-end gap-2">
                      {editingItem && (
                        <button
                          type="button"
                          onClick={handleCancelEdit}
                          className="px-3 py-2 bg-gray-300 text-gray-700 text-sm rounded hover:bg-gray-400"
                        >
                          Cancelar Edición
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={handleAddOrUpdatePreset}
                        className="px-3 py-2 bg-brand-600 text-white text-sm rounded hover:bg-brand-700"
                      >
                        {editingItem ? 'Actualizar Item' : 'Agregar Item'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Lista */}
                <div className="border rounded-lg overflow-hidden max-h-96 overflow-y-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Categoría</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Descripción</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Precio</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {localPresets.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-4 py-4 text-center text-sm text-gray-500">No hay items configurados.</td>
                        </tr>
                      ) : (
                        localPresets.map((item) => (
                          <tr key={item.id} className="hover:bg-gray-50">
                            <td className="px-4 py-2 text-sm text-gray-600">
                              {item.type === 'service' ?
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">Servicio</span> :
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">Material</span>}
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-500">{item.category}</td>
                            <td className="px-4 py-2 text-sm text-gray-900">{item.description}</td>
                            <td className="px-4 py-2 text-sm text-gray-900 text-right">${item.unitPrice}</td>
                            <td className="px-4 py-2 text-sm text-right space-x-2">
                              <button type="button" onClick={() => handleEditClick(item)} className="text-brand-600 hover:text-brand-900">
                                <i className="fas fa-edit"></i>
                              </button>
                              <button type="button" onClick={() => handleDeleteClick(item.id)} className="text-red-600 hover:text-red-900">
                                <i className="fas fa-trash"></i>
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

          </form>
        </div>

        {/* Footer Actions */}
        <div className="flex justify-end p-4 border-t bg-gray-50 shrink-0">
          <button type="button" onClick={onClose} className="mr-3 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">
            Cancelar
          </button>
          <button
            type="submit"
            form="settingsForm"
            className="px-4 py-2 text-sm font-medium text-white bg-brand-600 rounded-md hover:bg-brand-700 shadow-sm"
          >
            Guardar Todo
          </button>
        </div>
      </div>
    </div>
  );
};