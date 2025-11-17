# Configuración de Upstash Redis para Actualización de Datos

Este proyecto ahora permite subir archivos CSV directamente desde la interfaz web para actualizar los datos sin necesidad de hacer commits en Git.

## Pasos para configurar Upstash Redis (Vercel KV)

### 1. Conectar Upstash Redis desde el Marketplace de Vercel

**IMPORTANTE: Debes seleccionar "Upstash for Redis" (NO Vector, QStash o Search)**

Pasos detallados:

1. Ve a tu dashboard de Vercel: https://vercel.com/dashboard
2. Selecciona tu proyecto
3. Ve a la pestaña **Storage**
4. En la sección **Marketplace Database Providers**, verás varias opciones de Upstash:
   - ✅ **Upstash for Redis** ← SELECCIONA ESTA
   - ❌ Upstash Vector (para embeddings/AI)
   - ❌ Upstash QStash/Workflow (para colas de mensajes)
   - ❌ Upstash Search (para búsqueda full-text)

5. Haz clic en **"Upstash for Redis"**
6. Haz clic en **"Add Integration"** o **"Connect"**
7. Si es tu primera vez con Upstash:
   - Te pedirá autenticarte con Upstash
   - Puedes usar tu cuenta de GitHub, Google o crear una cuenta nueva
   - Es gratis, solo sigue el flujo

8. Una vez autenticado, te pedirá crear una database:
   - **Database Name**: `graficos-data` (o el nombre que prefieras)
   - **Primary Region**: Selecciona la más cercana a tus usuarios (ej: `us-east-1` para USA)
   - **Type**: Deja en "Regional" (gratis)
   - **Eviction**: Deja en "No eviction" (no borrar datos automáticamente)

9. Haz clic en **"Create"**

10. Te preguntará a qué proyecto de Vercel conectar la database:
    - Selecciona tu proyecto (graficos)
    - Haz clic en **"Connect"**

11. ¡Listo! Vercel automáticamente agregará las variables de entorno a tu proyecto

### 2. Verificar variables de entorno

Vercel automáticamente agregará las variables de entorno necesarias a tu proyecto:
- `KV_REST_API_URL`
- `KV_REST_API_TOKEN`
- `KV_REST_API_READ_ONLY_TOKEN`
- `KV_URL`

Puedes verificar esto en: **Project Settings** > **Environment Variables**

### 3. Migrar datos existentes (opcional)

Si quieres migrar tus datos actuales del archivo `dailyData.json` a Vercel KV, puedes:

1. Subir el archivo `conversion.csv` usando el botón "Actualizar Datos" en la interfaz web después del deployment
2. O ejecutar este script una vez localmente (necesitas las variables de entorno):

```bash
# Instalar la CLI de Vercel si no la tienes
npm i -g vercel

# Conectar con tu proyecto
vercel link

# Descargar las variables de entorno
vercel env pull .env.local

# Ejecutar el script de migración (crea este script si lo necesitas)
node migrate-to-kv.js
```

### 4. Hacer deploy

Una vez configurado Vercel KV:

```bash
git add .
git commit -m "Agregar soporte para Vercel KV"
git push
```

Vercel automáticamente hará el deploy y las APIs estarán disponibles.

### 5. Usar la interfaz de carga

1. Ve a tu sitio web desplegado
2. Encontrarás un botón **"Subir CSV"** en la parte superior
3. Selecciona tu archivo `conversion.csv`
4. Los datos se actualizarán automáticamente y se verán reflejados en la interfaz

## Estructura de archivos

```
/api
  ├── upload-data.js    # API para procesar y guardar CSV
  └── get-data.js       # API para obtener datos desde KV

/src
  ├── DataUploader.js   # Componente de carga de CSV
  ├── dataProcessor.js  # Funciones de procesamiento de datos
  └── App.js            # Componente principal actualizado
```

## Costos

Upstash Redis incluye en el plan gratuito:
- 10,000 requests/día (~300,000/mes)
- 256 MB de almacenamiento
- Más que suficiente para este proyecto personal

**Nota**: Es más generoso que el antiguo Vercel KV!

## Troubleshooting

### Error: "KV_REST_API_URL not found"
Asegúrate de haber conectado la base de datos KV a tu proyecto en el dashboard de Vercel.

### Los datos no se actualizan
1. Verifica que el archivo CSV tenga el formato correcto
2. Revisa los logs en Vercel Dashboard > Deployments > [tu deployment] > Functions

### Quiero volver al sistema anterior
Si prefieres seguir usando Git, simplemente no uses el botón de carga y continúa actualizando `conversion.csv` y haciendo commits como antes. La app seguirá funcionando.
