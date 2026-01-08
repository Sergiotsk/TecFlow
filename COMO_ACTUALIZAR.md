# Guía de Publicación Manual de Actualizaciones

Si prefieres generar el instalador en tu PC y subirlo manualmente a GitHub para añadir notas de versión detalladas, sigue estos pasos rigorosamente.

## Requisitos Previos
Asegúrate de haber configurado tu `package.json` con tu usuario y repo:
```json
"publish": [
  {
    "provider": "github",
    "owner": "TuUsuario", 
    "repo": "TuRepo"
  }
]
```

## Paso 1: Preparar la Nueva Versión
1. Abre `package.json`.
2. Incrementa el número de versión (ej: de `1.0.0` a `1.0.1`).
   * **Importante:** El número debe ser mayor al anterior.

## Paso 2: Generar el Instalador
En tu terminal, ejecuta:
```powershell
npm run electron:build:win
```
*No uses el flag `-p always` ni tokens, ya que solo queremos generar los archivos localmente.*

## Paso 3: Identificar los Archivos
Ve a la carpeta `release` (o `dist`) que se creó en tu proyecto. Necesitarás subir OBLIGATORIAMENTE estos 3 archivos:

1. **`TecFlow Setup 1.0.1.exe`** (El instalador)
2. **`TecFlow Setup 1.0.1.exe.blockmap`** (Optimización para descargas rápidas)
3. **`latest.yml`** (¡CRÍTICO! Este archivo le dice al programa que hay una nueva versión)

## Paso 4: Crear el Release en GitHub
1. Ve a tu repositorio en GitHub.
2. Clic en **Releases** (a la derecha) -> **Draft a new release**.
3. **Choose a tag**: Escribe la versión EXACTA empezando con v (ej: `v1.0.1`).
    * *Consejo: Crea el tag ahí mismo si no existe.*
4. **Release title**: Pon un título atractivo (ej: "Actualización v1.0.1: Mejoras en Impresión").
5. **Describe this release**: Escribe aquí todas tus notas, cambios y mejoras.
6. **Attach binaries**: Arrastra y suelta los 3 archivos del Paso 3.
7. Asegúrate de que **latest.yml** se haya subido correctamente.
8. Clic en **Publish release**.

## ¡Listo!
En cuanto pulses "Publish", los usuarios que abran tu programa detectarán la actualización gracias al archivo `latest.yml` y el proceso automático comenzará.
