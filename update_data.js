const fs = require('fs');

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

console.log('🔄 Actualizando datos desde conversion.csv...');

const csvContent = fs.readFileSync('conversion.csv', 'utf-8');
const lines = csvContent.split('\n');

const monthlyData = {};

Object.values(storeCodeMap).forEach(storeName => {
  monthlyData[storeName] = {};
  for (let month = 1; month <= 12; month++) { // Extendido a 12 meses
    monthlyData[storeName][month] = {};
  }
});

let processedRecords = 0;

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
      
      if (year >= 2025 && month >= 1 && month <= 12) {
        const storeName = storeCodeMap[storeCode];
        
        // Solo procesar si hay datos válidos (no vacíos)
        if (flujo !== '' && flujo !== undefined) {
          const flujoNum = parseInt(flujo) || 0;
          const boletasNum = parseInt(boletas) || 0;
          
          monthlyData[storeName][month][day] = { flujo: flujoNum, boletas: boletasNum };
          processedRecords++;
        }
      }
    }
  }
});

// Agregar metadata con timestamp
const finalData = {
  data: monthlyData,
  metadata: {
    lastUpdated: new Date().toISOString(),
    recordsProcessed: processedRecords,
    updateDate: new Date().toLocaleDateString('es-CL')
  }
};

fs.writeFileSync('./src/dailyData.json', JSON.stringify(finalData, null, 2));
console.log(`✅ Datos actualizados: ${processedRecords} registros procesados`);
console.log('📁 Archivo actualizado: src/dailyData.json');
console.log(`🕒 Última actualización: ${finalData.metadata.updateDate}`);