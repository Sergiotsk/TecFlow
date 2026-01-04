# TecFlow - Aplicación de Escritorio

Aplicación de escritorio para generar presupuestos e informes técnicos con guardado automático de PDFs.

## 🚀 Ejecutar en Modo Desarrollo

```bash
npm run electron:dev
```

Este comando:
1. Inicia el servidor de desarrollo de Vite
2. Espera a que el servidor esté listo
3. Abre la aplicación Electron

## 📦 Compilar Aplicación

### Windows
```bash
npm run electron:build:win
```

Genera un instalador `.exe` en la carpeta `release/`

### Mac
```bash
npm run electron:build:mac
```

Genera un archivo `.dmg` en la carpeta `release/`

### Linux
```bash
npm run electron:build:linux
```

Genera un archivo `.AppImage` en la carpeta `release/`

## 📁 Ubicación de Archivos

### PDFs Generados
Los PDFs se guardan automáticamente en:
- **Windows**: `C:\Users\<usuario>\AppData\Roaming\tecflow\PDFs\`
- **Mac**: `~/Library/Application Support/tecflow/PDFs/`
- **Linux**: `~/.config/tecflow/PDFs/`

Puedes cambiar esta ubicación desde la aplicación usando el botón "Configurar Carpeta PDFs"

### Datos de la Aplicación
Los datos (presupuestos, informes, configuración) se guardan en:
- **Windows**: `C:\Users\<usuario>\AppData\Roaming\tecflow\`
- **Mac**: `~/Library/Application Support/tecflow/`
- **Linux**: `~/.config/tecflow/`

## 🎯 Funcionalidades Electron

1. **Guardar PDFs Automáticamente**: Al hacer clic en "Imprimir/Guardar PDF", el archivo se guarda automáticamente en la carpeta configurada
2. **Exportar/Importar Datos**: Usa los botones en la navbar para hacer backup de todos tus datos
3. **Abrir Carpeta de PDFs**: Acceso rápido a la carpeta donde se guardan los PDFs
4. **Funciona Offline**: No necesitas conexión a internet (excepto para la función de AI)

## 🛠️ Desarrollo

### Estructura de Archivos
- `electron.js` - Proceso principal de Electron
- `preload.js` - Script preload para comunicación segura
- `electron.d.ts` - Definiciones de tipos TypeScript
- `src/` - Código fuente de React
- `dist/` - Build de producción
- `release/` - Instaladores compilados

### Scripts Disponibles
- `npm run dev` - Solo servidor de desarrollo Vite
- `npm run electron` - Solo Electron (requiere servidor corriendo)
- `npm run electron:dev` - Desarrollo completo (Vite + Electron)
- `npm run build` - Build de producción de Vite
- `npm run electron:build` - Build completo de la aplicación

## 📝 Notas

- La primera vez que ejecutes la app, se creará automáticamente la carpeta de PDFs
- Los datos se guardan localmente en tu computadora
- Puedes usar la función de exportar para hacer backups periódicos
- La aplicación funciona completamente offline (excepto la función de AI para mejorar textos)
