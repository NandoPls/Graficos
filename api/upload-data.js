import { kv } from '@vercel/kv';

const storeCodeMap = {
  '1002': 'Manquehue',
  '1003': 'Mall Sport - Salomon',
  '1005': 'Mall Sport - Wilson',
  '1006': 'BeCycling Padre Hurtado',
  '1008': 'Viña del Mar',
  '1012': 'Mall Plaza Trebol - Salomon',
  '1014': 'Easton',
  '1017': 'Costanera Center - Salomon',
  '1024': 'Puerto Montt',
  '1029': 'Parque Arauco',
  '1030': 'Tienda Arena MS'
};

export default async function handler(req, res) {
  // Solo permitir POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { csvContent } = req.body;

    if (!csvContent) {
      return res.status(400).json({ error: 'No CSV content provided' });
    }

    console.log('📝 Processing CSV data...');

    const lines = csvContent.split('\n');
    const yearlyData = {}; // Cambio: ahora soporta múltiples años
    const yearsFound = new Set();

    let processedRecords = 0;

    // Procesar cada línea del CSV
    lines.forEach(line => {
      if (!line.trim() || line.includes('Bodega;Fecha') || line.includes('Wilson MQ')) {
        return;
      }

      const parts = line.split(';');

      for (let i = 0; i < parts.length - 3; i += 5) {
        const storeCode = parts[i];
        const dateStr = parts[i + 1];
        const flujo = parts[i + 2];
        const boletas = parts[i + 3];

        if (storeCode && dateStr && storeCodeMap[storeCode] && dateStr.match(/\d{2}-\d{2}-\d{4}/)) {
          const [day, month, year] = dateStr.split('-').map(Number);

          // Validación básica: año entre 2020-2100, mes 1-12
          if (year >= 2020 && year <= 2100 && month >= 1 && month <= 12) {
            const storeName = storeCodeMap[storeCode];

            // Inicializar estructura si no existe
            if (!yearlyData[year]) {
              yearlyData[year] = {};
            }
            if (!yearlyData[year][storeName]) {
              yearlyData[year][storeName] = {};
            }
            if (!yearlyData[year][storeName][month]) {
              yearlyData[year][storeName][month] = {};
            }

            if (flujo !== '' && flujo !== undefined) {
              const flujoNum = parseInt(flujo) || 0;
              const boletasNum = parseInt(boletas) || 0;

              yearlyData[year][storeName][month][day] = { flujo: flujoNum, boletas: boletasNum };
              yearsFound.add(year);
              processedRecords++;
            }
          }
        }
      }
    });

    // Preparar datos finales con metadata
    const finalData = {
      data: yearlyData,
      metadata: {
        lastUpdated: new Date().toISOString(),
        recordsProcessed: processedRecords,
        updateDate: new Date().toLocaleDateString('es-CL'),
        years: Array.from(yearsFound).sort()
      }
    };

    // Guardar en Vercel KV
    await kv.set('daily-data', finalData);

    console.log(`✅ Data uploaded: ${processedRecords} records processed`);

    return res.status(200).json({
      success: true,
      message: 'Datos actualizados correctamente',
      recordsProcessed: processedRecords,
      updateDate: finalData.metadata.updateDate
    });

  } catch (error) {
    console.error('Error processing CSV:', error);
    return res.status(500).json({
      error: 'Error al procesar el archivo CSV',
      details: error.message
    });
  }
}
