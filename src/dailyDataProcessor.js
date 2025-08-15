import dailyDataFile from './dailyData.json';

// Extraer los datos y metadata
const dailyData = dailyDataFile.data || dailyDataFile;
export const dataMetadata = dailyDataFile.metadata;

const MONTHS_SPANISH = {
  '01': 'Enero', '02': 'Febrero', '03': 'Marzo', '04': 'Abril',
  '05': 'Mayo', '06': 'Junio', '07': 'Julio', '08': 'Agosto',
  '09': 'Septiembre', '10': 'Octubre', '11': 'Noviembre', '12': 'Diciembre'
};

// Función para generar datos semanales desde datos diarios
export function generateWeeklyDataFromDaily() {
  const storeNames = Object.keys(dailyData);
  const stores = [];

  storeNames.forEach(storeName => {
    const storeWeeks = [];
    
    // Generar 35 semanas aproximadamente (8 meses)
    for (let week = 1; week <= 35; week++) {
      let weekFlujo = 0;
      let weekBoletas = 0;
      let daysCount = 0;

      // Para cada mes, encontrar qué días pertenecen a esta semana
      for (let month = 1; month <= 8; month++) {
        if (dailyData[storeName][month]) {
          Object.keys(dailyData[storeName][month]).forEach(day => {
            const dayNumber = parseInt(day);
            const weekOfDay = getWeekOfYear(2025, month, dayNumber);
            
            if (weekOfDay === week) {
              weekFlujo += dailyData[storeName][month][day].flujo;
              weekBoletas += dailyData[storeName][month][day].boletas;
              daysCount++;
            }
          });
        }
      }
      
      const conversion = weekFlujo > 0 ? parseFloat(((weekBoletas / weekFlujo) * 100).toFixed(1)) : 0;
      
      storeWeeks.push({
        week: `Semana ${week}`,
        flujo: weekFlujo,
        boletas: weekBoletas,
        conversion: conversion
      });
    }
    
    stores.push({
      name: storeName,
      data: storeWeeks
    });
  });

  // Agregar resumen
  const summaryData = [];
  for (let week = 1; week <= 35; week++) {
    let totalFlujo = 0;
    let totalBoletas = 0;
    
    stores.forEach(store => {
      totalFlujo += store.data[week - 1].flujo;
      totalBoletas += store.data[week - 1].boletas;
    });
    
    const conversion = totalFlujo > 0 ? parseFloat(((totalBoletas / totalFlujo) * 100).toFixed(1)) : 0;
    
    summaryData.push({
      week: `Semana ${week}`,
      flujo: totalFlujo,
      boletas: totalBoletas,
      conversion: conversion
    });
  }
  
  stores.push({ name: 'Resumen', data: summaryData });
  return stores;
}

// Función para generar datos mensuales desde datos diarios
export function generateMonthlyDataFromDaily() {
  const storeNames = Object.keys(dailyData);
  const stores = [];
  const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto'];

  storeNames.forEach(storeName => {
    const storeMonths = [];
    
    monthNames.forEach((monthName, monthIndex) => {
      const monthNumber = monthIndex + 1;
      let monthFlujo = 0;
      let monthBoletas = 0;
      
      if (dailyData[storeName][monthNumber]) {
        Object.values(dailyData[storeName][monthNumber]).forEach(dayData => {
          monthFlujo += dayData.flujo;
          monthBoletas += dayData.boletas;
        });
      }
      
      const conversion = monthFlujo > 0 ? parseFloat(((monthBoletas / monthFlujo) * 100).toFixed(1)) : 0;
      
      storeMonths.push({
        month: monthName,
        flujo: monthFlujo,
        boletas: monthBoletas,
        conversion: conversion
      });
    });
    
    stores.push({
      name: storeName,
      data: storeMonths
    });
  });

  return stores;
}

// Función auxiliar para calcular la semana basada en datos reales
function getWeekOfYear(year, month, day) {
  // Mapeo manual basado en los datos que realmente tienes
  // Enero: semanas 1-5, Febrero: 6-9, etc.
  const monthToWeekStart = {
    1: 1,   // Enero: semanas 1-5
    2: 6,   // Febrero: semanas 6-9  
    3: 10,  // Marzo: semanas 10-14
    4: 15,  // Abril: semanas 15-18
    5: 19,  // Mayo: semanas 19-22
    6: 23,  // Junio: semanas 23-27
    7: 28,  // Julio: semanas 28-31
    8: 32   // Agosto: semanas 32-35
  };
  
  const weekStart = monthToWeekStart[month] || 1;
  const weekInMonth = Math.ceil(day / 7);
  return weekStart + weekInMonth - 1;
}

// Función para obtener fechas disponibles para un mes específico
export function getAvailableDatesForMonth(month) {
  // Fechas basadas en el análisis del CSV
  const datesPerMonth = {
    'Enero': Array.from({length: 31}, (_, i) => i + 1),
    'Febrero': Array.from({length: 28}, (_, i) => i + 1),
    'Marzo': Array.from({length: 31}, (_, i) => i + 1),
    'Abril': Array.from({length: 30}, (_, i) => i + 1),
    'Mayo': Array.from({length: 31}, (_, i) => i + 1),
    'Junio': Array.from({length: 30}, (_, i) => i + 1),
    'Julio': Array.from({length: 31}, (_, i) => i + 1),
    'Agosto': Array.from({length: 25}, (_, i) => i + 1) // Hasta el 25 según tus datos
  };
  
  return datesPerMonth[month] || [];
}

// Función para generar comparación basada en fecha límite usando datos exactos del CSV
export function generateDateBasedComparisonFromWeekly(weeklyData, cutoffDay, cutoffMonth, selectedStores, selectedMetric) {
  // Usar los datos importados del JSON
  const csvData = dailyData;
  
  const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto'];
  const monthlyTotals = {};
  
  // Para cada mes disponible
  monthNames.forEach((monthName, monthIndex) => {
    const monthNumber = monthIndex + 1;
    monthlyTotals[monthName] = {};
    
    // Para cada tienda seleccionada
    Object.keys(selectedStores).forEach(storeName => {
      if (selectedStores[storeName] && csvData[storeName] && csvData[storeName][monthNumber]) {
        let totalFlujo = 0;
        let totalBoletas = 0;
        
        // Sumar todos los días del 1 hasta cutoffDay para este mes
        for (let day = 1; day <= cutoffDay; day++) {
          const dayData = csvData[storeName][monthNumber][day];
          if (dayData) {
            totalFlujo += dayData.flujo;
            totalBoletas += dayData.boletas;
          }
        }
        
        const conversion = totalFlujo > 0 ? parseFloat(((totalBoletas / totalFlujo) * 100).toFixed(1)) : 0;
        
        monthlyTotals[monthName][storeName] = {
          flujo: totalFlujo,
          boletas: totalBoletas,
          conversion: conversion
        };
      }
    });
  });
  
  // Convertir a formato para el gráfico
  return Object.keys(monthlyTotals)
    .filter(month => Object.keys(monthlyTotals[month]).length > 0)
    .map(month => {
      const obj = { month };
      Object.keys(monthlyTotals[month]).forEach(storeName => {
        obj[storeName] = monthlyTotals[month][storeName][selectedMetric];
      });
      return obj;
    });
}

function getMonthName(monthNumber) {
  const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto'];
  return months[monthNumber - 1];
}