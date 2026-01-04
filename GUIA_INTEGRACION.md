# 📘 Guía Paso a Paso: Integrar Electron en TecFlow

## 🎯 Objetivo
Modificar el código de React para que use las funcionalidades de Electron cuando esté disponible, y siga funcionando en el navegador web cuando no lo esté.

---

## 📋 Paso 1: Actualizar la Función de Imprimir/Guardar PDF

### Ubicación: `App.tsx` - Línea ~139

**Busca esta función:**
```typescript
const handlePrint = () => {
  // Small delay to ensure DOM is ready
  setTimeout(() => {
    window.print();
  }, 100);
};
```

**Reemplázala por:**
```typescript
const handlePrint = async () => {
  // Verificar si estamos en Electron
  if (window.electronAPI) {
    try {
      // Obtener el contenido HTML del documento
      const printContent = document.getElementById('printable-content');
      if (!printContent) {
        alert('❌ Error: No se pudo obtener el contenido del documento');
        return;
      }
      
      // Obtener el HTML completo con estilos
      const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <style>
              ${Array.from(document.styleSheets)
                .map(sheet => {
                  try {
                    return Array.from(sheet.cssRules).map(rule => rule.cssText).join('\n');
                  } catch (e) {
                    return '';
                  }
                })
                .join('\n')}
            </style>
          </head>
          <body>
            ${printContent.innerHTML}
          </body>
        </html>
      `;
      
      // Generar nombre de archivo
      const docId = mode === 'quote' ? quote.id : report.id;
      const clientName = mode === 'quote' ? quote.clientName : report.clientName;
      const date = new Date().toISOString().split('T')[0];
      const filename = `${docId}_${clientName.replace(/\s+/g, '_')}_${date}.pdf`;
      
      // Guardar PDF usando Electron
      const result = await window.electronAPI.savePdf(filename, htmlContent);
      
      if (result.success) {
        alert(`✅ PDF guardado exitosamente en:\n${result.path}`);
      } else {
        alert(`❌ Error al guardar PDF: ${result.error}`);
      }
    } catch (error) {
      console.error('Error al guardar PDF:', error);
      alert('❌ Error al guardar PDF. Intenta nuevamente.');
    }
  } else {
    // Fallback para navegador web (comportamiento original)
    setTimeout(() => {
      window.print();
    }, 100);
  }
};
```

**¿Por qué este cambio?**
- Detecta si está en Electron con `window.electronAPI`
- Si está en Electron: guarda el PDF automáticamente en la carpeta configurada
- Si está en navegador: usa el método tradicional `window.print()`

---

## 📋 Paso 2: Actualizar la Función de Exportar Datos

### Ubicación: `App.tsx` - Busca `handleExportData`

**Busca esta función:**
```typescript
const handleExportData = () => {
  exportAllData();
  alert('✅ Datos exportados exitosamente. Guarda el archivo en un lugar seguro.');
};
```

**Reemplázala por:**
```typescript
const handleExportData = async () => {
  // Preparar datos para exportar
  const data = {
    quotes: getSavedQuotes(),
    reports: getSavedReports(),
    businessSettings: JSON.parse(localStorage.getItem('businessSettings') || '{}'),
    presets: JSON.parse(localStorage.getItem('presets') || '[]'),
    exportDate: new Date().toISOString(),
    version: '1.0'
  };
  
  const jsonData = JSON.stringify(data, null, 2);
  const filename = `tecflow-backup-${new Date().toISOString().split('T')[0]}.json`;
  
  if (window.electronAPI) {
    // Usar diálogo nativo de Electron
    const result = await window.electronAPI.exportData(filename, jsonData);
    
    if (result.success && !result.canceled) {
      alert(`✅ Datos exportados exitosamente a:\n${result.path}`);
    } else if (result.canceled) {
      // Usuario canceló, no hacer nada
    } else {
      alert(`❌ Error al exportar: ${result.error}`);
    }
  } else {
    // Fallback para navegador web (comportamiento original)
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    alert('✅ Datos exportados exitosamente. Guarda el archivo en un lugar seguro.');
  }
};
```

**¿Por qué este cambio?**
- En Electron: usa el diálogo nativo de Windows para elegir dónde guardar
- En navegador: descarga automáticamente como antes

---

## 📋 Paso 3: Actualizar la Función de Importar Datos

### Ubicación: `App.tsx` - Busca `handleImportData`

**Busca esta función:**
```typescript
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
```

**Reemplázala por:**
```typescript
const handleImportData = async (event?: React.ChangeEvent<HTMLInputElement>) => {
  if (window.electronAPI) {
    // Usar diálogo nativo de Electron
    try {
      const result = await window.electronAPI.importData();
      
      if (result.success && !result.canceled && result.data) {
        const data = JSON.parse(result.data);
        
        // Importar datos
        if (data.quotes) localStorage.setItem('saved_quotes', JSON.stringify(data.quotes));
        if (data.reports) localStorage.setItem('saved_reports', JSON.stringify(data.reports));
        if (data.businessSettings) localStorage.setItem('businessSettings', JSON.stringify(data.businessSettings));
        if (data.presets) localStorage.setItem('presets', JSON.stringify(data.presets));
        
        alert('✅ Datos importados exitosamente. La aplicación se recargará.');
        window.location.reload();
      } else if (result.canceled) {
        // Usuario canceló, no hacer nada
      } else {
        alert(`❌ Error al importar: ${result.error}`);
      }
    } catch (error) {
      alert('❌ Error al importar datos: ' + (error as Error).message);
    }
  } else {
    // Fallback para navegador web (comportamiento original)
    const file = event?.target.files?.[0];
    if (!file) return;

    try {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target?.result as string);
          
          if (data.quotes) localStorage.setItem('saved_quotes', JSON.stringify(data.quotes));
          if (data.reports) localStorage.setItem('saved_reports', JSON.stringify(data.reports));
          if (data.businessSettings) localStorage.setItem('businessSettings', JSON.stringify(data.businessSettings));
          if (data.presets) localStorage.setItem('presets', JSON.stringify(data.presets));
          
          alert('✅ Datos importados exitosamente. La página se recargará.');
          window.location.reload();
        } catch (error) {
          alert('❌ Error al importar datos: ' + (error as Error).message);
        }
      };
      reader.readAsText(file);
      
      // Reset input
      if (event) event.target.value = '';
    } catch (error) {
      alert('❌ Error al importar datos: ' + (error as Error).message);
    }
  }
};
```

---

## 📋 Paso 4: Agregar Función para Abrir Carpeta de PDFs

### Ubicación: `App.tsx` - Después de `handleImportData`

**Agrega esta nueva función:**
```typescript
// Abrir carpeta de PDFs (solo Electron)
const handleOpenPdfFolder = async () => {
  if (window.electronAPI) {
    const dir = await window.electronAPI.openPdfDirectory();
    // Opcional: mostrar notificación
    console.log('Carpeta de PDFs:', dir);
  } else {
    alert('Esta función solo está disponible en la aplicación de escritorio.');
  }
};

// Configurar carpeta de PDFs (solo Electron)
const handleConfigurePdfFolder = async () => {
  if (window.electronAPI) {
    const newDir = await window.electronAPI.choosePdfDirectory();
    if (newDir) {
      alert(`✅ Carpeta de PDFs actualizada a:\n${newDir}`);
    }
  } else {
    alert('Esta función solo está disponible en la aplicación de escritorio.');
  }
};
```

---

## 📋 Paso 5: Actualizar el Botón de Importar en la Navbar

### Ubicación: `App.tsx` - Busca el botón de "Importar" en la navbar

**Busca este código:**
```typescript
<label 
  className="text-gray-300 hover:text-white hover:bg-gray-700 px-3 py-2 rounded-md transition-colors cursor-pointer inline-flex items-center"
  title="Importar datos desde archivo"
>
  <i className="fas fa-upload mr-1"></i>
  <span className="text-sm">Importar</span>
  <input 
    type="file" 
    accept=".json" 
    onChange={handleImportData}
    className="hidden"
  />
</label>
```

**Reemplázalo por:**
```typescript
{window.electronAPI ? (
  // Botón para Electron (usa diálogo nativo)
  <button 
    onClick={() => handleImportData()}
    className="text-gray-300 hover:text-white hover:bg-gray-700 px-3 py-2 rounded-md transition-colors"
    title="Importar datos desde archivo"
  >
    <i className="fas fa-upload mr-1"></i>
    <span className="text-sm">Importar</span>
  </button>
) : (
  // Label con input file para navegador web
  <label 
    className="text-gray-300 hover:text-white hover:bg-gray-700 px-3 py-2 rounded-md transition-colors cursor-pointer inline-flex items-center"
    title="Importar datos desde archivo"
  >
    <i className="fas fa-upload mr-1"></i>
    <span className="text-sm">Importar</span>
    <input 
      type="file" 
      accept=".json" 
      onChange={handleImportData}
      className="hidden"
    />
  </label>
)}
```

---

## 📋 Paso 6: Agregar Botones de Gestión de PDFs (Solo Electron)

### Ubicación: `App.tsx` - En la navbar, después del botón de "Importar"

**Agrega estos botones:**
```typescript
{/* Botones solo para Electron */}
{window.electronAPI && (
  <>
    <div className="h-6 w-px bg-gray-700 mx-2"></div>
    
    <button 
      onClick={handleOpenPdfFolder}
      className="text-gray-300 hover:text-white hover:bg-gray-700 px-3 py-2 rounded-md transition-colors"
      title="Abrir carpeta de PDFs"
    >
      <i className="fas fa-folder-open mr-1"></i>
      <span className="text-sm">Carpeta PDFs</span>
    </button>
    
    <button 
      onClick={handleConfigurePdfFolder}
      className="text-gray-300 hover:text-white hover:bg-gray-700 px-3 py-2 rounded-md transition-colors"
      title="Configurar carpeta de PDFs"
    >
      <i className="fas fa-cog mr-1"></i>
      <span className="text-sm">Config. PDFs</span>
    </button>
  </>
)}
```

---

## 📋 Paso 7: Actualizar el Texto del Botón de Imprimir

### Ubicación: `App.tsx` - Busca el botón "Imprimir / Guardar PDF"

**Busca:**
```typescript
<i className="fas fa-file-pdf mr-2"></i> Imprimir / Guardar PDF
```

**Reemplázalo por:**
```typescript
<i className="fas fa-file-pdf mr-2"></i> 
{window.electronAPI ? 'Guardar PDF' : 'Imprimir / Guardar PDF'}
```

**¿Por qué?**
- En Electron: el botón dice "Guardar PDF" (más claro)
- En navegador: mantiene el texto original

---

## 🚀 Paso 8: Probar la Aplicación

### 1. Detener el servidor actual
Presiona `Ctrl+C` en la terminal donde está corriendo `npm run dev`

### 2. Ejecutar en modo Electron
```bash
npm run electron:dev
```

Este comando:
1. Inicia Vite en el puerto 3000
2. Espera a que esté listo
3. Abre la aplicación Electron

### 3. Probar las funcionalidades:
- ✅ Crear un presupuesto
- ✅ Hacer clic en "Guardar PDF" → Debe guardarse automáticamente
- ✅ Hacer clic en "Carpeta PDFs" → Debe abrir la carpeta
- ✅ Hacer clic en "Exportar" → Debe abrir diálogo para guardar
- ✅ Hacer clic en "Importar" → Debe abrir diálogo para seleccionar archivo

---

## 🎯 Resumen de Cambios

| Función | Antes | Después (Electron) |
|---------|-------|-------------------|
| Imprimir | `window.print()` | Guarda PDF automáticamente |
| Exportar | Descarga automática | Diálogo nativo de Windows |
| Importar | Input file | Diálogo nativo de Windows |
| **NUEVO** | - | Abrir carpeta de PDFs |
| **NUEVO** | - | Configurar carpeta de PDFs |

---

## 📝 Notas Importantes

1. **Compatibilidad**: El código sigue funcionando en navegador web
2. **Detección automática**: Usa `window.electronAPI` para detectar Electron
3. **Mejora progresiva**: Funcionalidades extra solo en Electron
4. **Sin romper nada**: Si algo falla, vuelve al comportamiento original

---

## ❓ ¿Necesitas Ayuda?

Si tienes alguna duda o error al hacer estos cambios, avísame y te ayudo a resolverlo.

**¿Listo para empezar?** 🚀
