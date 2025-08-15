import rawData from './weeklyData.json';

const NAME_MAP = {
  manquehue: 'Manquehue',
  mallSportSalomon: 'Mall Sport - Salomon',
  mallSportWilson: 'Mall Sport - Wilson',
  beCyclingPadreHurtado: 'BeCycling Padre Hurtado',
  vinaDelMar: 'Vi\u00f1a del Mar',
  mallPlazaTrebolSalomon: 'Mall Plaza Trebol - Salomon',
  easton: 'Easton',
  costaneraCenterSalomon: 'Costanera Center - Salomon',
  puertoMontt: 'Puerto Montt',
  parqueArauco: 'Parque Arauco',
  tiendaArenaMS: 'Tienda Arena MS'
};

function convert(data) {
  const storeNames = Object.keys(NAME_MAP);
  const stores = storeNames.map(key => ({
    name: NAME_MAP[key],
    data: data.map(w => ({
      week: `Semana ${w.semana}`,
      flujo: w[key].entradas,
      boletas: w[key].boletas,
      conversion: w[key].conversion
    }))
  }));

  const numWeeks = data.length;
  const summaryData = Array.from({ length: numWeeks }, (_, i) => {
    const weekLabel = `Semana ${i + 1}`;
    let flujoTotal = 0;
    let boletasTotal = 0;
    stores.forEach(store => {
      flujoTotal += store.data[i].flujo;
      boletasTotal += store.data[i].boletas;
    });
    const conversion = flujoTotal ? parseFloat(((boletasTotal / flujoTotal) * 100).toFixed(1)) : 0;
    return { week: weekLabel, flujo: flujoTotal, boletas: boletasTotal, conversion };
  });
  stores.push({ name: 'Resumen', data: summaryData });
  return stores;
}

export const weeklyStoreData = convert(rawData);
