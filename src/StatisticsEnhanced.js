import React from 'react';

export default function StatisticsEnhanced({ storeData, selectedStores, selectedMetric, viewMode, dailyDataFromAPI, selectedYear }) {
  if (!storeData || storeData.length === 0) return null;

  // Filtrar solo las tiendas seleccionadas
  const selectedStoreData = storeData.filter(store => selectedStores[store.name] && store.name !== 'Resumen');

  if (selectedStoreData.length === 0) {
    return (
      <div className="bg-white p-8 rounded-2xl shadow-2xl border border-gray-200">
        <p className="text-gray-500 text-center py-8">
          Selecciona al menos una tienda para ver estadísticas detalladas
        </p>
      </div>
    );
  }

  // Detectar tiendas inactivas (sin datos en los últimos 30 días)
  const detectInactiveStores = () => {
    const inactive = [];
    selectedStoreData.forEach(store => {
      const recentData = store.data.slice(-5); // Últimos 5 periodos
      const hasRecentActivity = recentData.some(d => d[selectedMetric] > 0);
      if (!hasRecentActivity) {
        inactive.push(store.name);
      }
    });
    return inactive;
  };

  const inactiveStores = detectInactiveStores();

  // Calcular estadísticas para cada tienda seleccionada
  const statistics = selectedStoreData.map(store => {
    const data = store.data;

    // Filtrar datos con valores válidos (excluyendo ceros para promedios más precisos)
    const validData = data.filter(d => d[selectedMetric] > 0);
    const allData = data.map(d => d[selectedMetric] || 0);

    if (validData.length === 0) {
      return {
        storeName: store.name,
        promedio: 0,
        mediana: 0,
        maximo: { valor: 0, periodo: '-' },
        minimo: { valor: 0, periodo: '-' },
        tendencia: 'inactiva',
        tendenciaPorcentaje: 0,
        total: 0,
        desviacionEstandar: 0,
        coeficienteVariacion: 0,
        diasActivos: 0,
        diasTotales: data.length,
        mejorRacha: 0,
        peorRacha: 0
      };
    }

    // Promedio (solo de datos válidos)
    const total = validData.reduce((sum, d) => sum + d[selectedMetric], 0);
    const promedio = total / validData.length;

    // Mediana
    const sortedValidData = [...validData].map(d => d[selectedMetric]).sort((a, b) => a - b);
    const mediana = sortedValidData.length % 2 === 0
      ? (sortedValidData[sortedValidData.length / 2 - 1] + sortedValidData[sortedValidData.length / 2]) / 2
      : sortedValidData[Math.floor(sortedValidData.length / 2)];

    // Máximo y mínimo
    const maximo = validData.reduce((max, d) =>
      d[selectedMetric] > max.valor
        ? { valor: d[selectedMetric], periodo: d.month || d.week }
        : max
    , { valor: 0, periodo: '-' });

    const minimo = validData.reduce((min, d) =>
      d[selectedMetric] < min.valor || min.valor === Infinity
        ? { valor: d[selectedMetric], periodo: d.month || d.week }
        : min
    , { valor: Infinity, periodo: '-' });

    // Desviación estándar
    const variance = validData.reduce((sum, d) => sum + Math.pow(d[selectedMetric] - promedio, 2), 0) / validData.length;
    const desviacionEstandar = Math.sqrt(variance);

    // Coeficiente de variación (%)
    const coeficienteVariacion = promedio > 0 ? (desviacionEstandar / promedio) * 100 : 0;

    // Tendencia (comparar primera mitad vs segunda mitad)
    const midPoint = Math.floor(validData.length / 2);
    const firstHalf = validData.slice(0, midPoint);
    const secondHalf = validData.slice(midPoint);

    const firstHalfAvg = firstHalf.reduce((sum, d) => sum + d[selectedMetric], 0) / firstHalf.length;
    const secondHalfAvg = secondHalf.reduce((sum, d) => sum + d[selectedMetric], 0) / secondHalf.length;

    let tendencia = 'neutral';
    let tendenciaPorcentaje = 0;

    if (firstHalfAvg > 0) {
      tendenciaPorcentaje = ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100;
      if (tendenciaPorcentaje > 5) tendencia = 'subiendo';
      else if (tendenciaPorcentaje < -5) tendencia = 'bajando';
    }

    // Mejor y peor racha (días consecutivos por encima/debajo del promedio)
    let currentRacha = 0;
    let mejorRacha = 0;
    let peorRacha = 0;
    let currentBadRacha = 0;

    allData.forEach(value => {
      if (value > promedio) {
        currentRacha++;
        currentBadRacha = 0;
        mejorRacha = Math.max(mejorRacha, currentRacha);
      } else if (value > 0 && value < promedio) {
        currentBadRacha++;
        currentRacha = 0;
        peorRacha = Math.max(peorRacha, currentBadRacha);
      } else {
        currentRacha = 0;
        currentBadRacha = 0;
      }
    });

    return {
      storeName: store.name,
      promedio,
      mediana,
      maximo,
      minimo,
      tendencia,
      tendenciaPorcentaje,
      total,
      desviacionEstandar,
      coeficienteVariacion,
      diasActivos: validData.length,
      diasTotales: data.length,
      mejorRacha,
      peorRacha,
      isInactive: inactiveStores.includes(store.name)
    };
  });

  // Formatear números según la métrica
  const formatValue = (value) => {
    if (selectedMetric === 'conversion') {
      return `${value.toFixed(1)}%`;
    }
    return value.toLocaleString('de-DE', { maximumFractionDigits: 0 });
  };

  // Íconos de tendencia
  const getTrendIcon = (tendencia) => {
    if (tendencia === 'subiendo') return '📈';
    if (tendencia === 'bajando') return '📉';
    if (tendencia === 'inactiva') return '⚠️';
    return '➡️';
  };

  const getTrendText = (tendencia, porcentaje) => {
    if (tendencia === 'inactiva') return 'Inactiva';
    if (tendencia === 'subiendo') return `+${porcentaje.toFixed(1)}%`;
    if (tendencia === 'bajando') return `${porcentaje.toFixed(1)}%`;
    return 'Estable';
  };

  const getTrendColor = (tendencia) => {
    if (tendencia === 'subiendo') return 'text-green-600 bg-green-50 border-green-200';
    if (tendencia === 'bajando') return 'text-red-600 bg-red-50 border-red-200';
    if (tendencia === 'inactiva') return 'text-orange-600 bg-orange-50 border-orange-200';
    return 'text-gray-600 bg-gray-50 border-gray-200';
  };

  const metricNames = {
    flujo: 'Flujo',
    boletas: 'Boletas',
    conversion: 'Conversión'
  };

  // Análisis de rendimiento de cada tienda consigo misma
  const performanceAnalysis = statistics.map(stat => {
    // Comparar promedio actual vs promedio histórico (primera mitad vs segunda mitad)
    const data = storeData.find(s => s.name === stat.storeName)?.data || [];
    const validData = data.filter(d => d[selectedMetric] > 0);

    if (validData.length < 4) {
      return { ...stat, rendimiento: 'insuficiente', comparacionMejor: 0, comparacionPeor: 0 };
    }

    const midPoint = Math.floor(validData.length / 2);
    const firstHalf = validData.slice(0, midPoint);
    const secondHalf = validData.slice(midPoint);

    const firstHalfAvg = firstHalf.reduce((sum, d) => sum + d[selectedMetric], 0) / firstHalf.length;
    const secondHalfAvg = secondHalf.reduce((sum, d) => sum + d[selectedMetric], 0) / secondHalf.length;

    // Comparación con su mejor y peor momento
    const comparacionMejor = ((stat.promedio / stat.maximo.valor) * 100).toFixed(1);
    const comparacionPeor = stat.minimo.valor > 0 ? ((stat.promedio / stat.minimo.valor) * 100).toFixed(1) : 0;

    // Determinar rendimiento
    let rendimiento = 'neutral';
    if (secondHalfAvg > firstHalfAvg * 1.1) rendimiento = 'excelente';
    else if (secondHalfAvg > firstHalfAvg * 1.05) rendimiento = 'bueno';
    else if (secondHalfAvg < firstHalfAvg * 0.9) rendimiento = 'preocupante';
    else if (secondHalfAvg < firstHalfAvg * 0.95) rendimiento = 'bajo';

    return { ...stat, rendimiento, comparacionMejor, comparacionPeor };
  });

  return (
    <div className="space-y-6">
      {/* Alertas de tiendas inactivas */}
      {inactiveStores.length > 0 && (
        <div className="bg-orange-50 border-2 border-orange-200 p-4 rounded-xl">
          <div className="flex items-start gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <h3 className="font-bold text-orange-900 mb-1">Tiendas sin actividad reciente</h3>
              <p className="text-sm text-orange-700">
                Las siguientes tiendas no han registrado actividad en los últimos periodos: <strong>{inactiveStores.join(', ')}</strong>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Resumen de rendimiento individual */}
      <div className="bg-white p-6 rounded-2xl shadow-2xl border border-gray-200">
        <h2 className="text-2xl font-bold text-indigo-900 mb-4 flex items-center gap-2">
          📈 Rendimiento Individual - {metricNames[selectedMetric]}
        </h2>
        <p className="text-sm text-gray-600 mb-4">
          Cada tienda se compara consigo misma: ¿está mejorando o empeorando respecto a su propio historial?
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {performanceAnalysis.filter(p => !p.isInactive).map((perf, index) => {
            const getRendimientoColor = () => {
              if (perf.rendimiento === 'excelente') return 'bg-green-100 border-green-400 text-green-800';
              if (perf.rendimiento === 'bueno') return 'bg-lime-100 border-lime-400 text-lime-800';
              if (perf.rendimiento === 'neutral') return 'bg-blue-100 border-blue-400 text-blue-800';
              if (perf.rendimiento === 'bajo') return 'bg-orange-100 border-orange-400 text-orange-800';
              if (perf.rendimiento === 'preocupante') return 'bg-red-100 border-red-400 text-red-800';
              return 'bg-gray-100 border-gray-400 text-gray-800';
            };

            const getRendimientoIcon = () => {
              if (perf.rendimiento === 'excelente') return '🚀';
              if (perf.rendimiento === 'bueno') return '📈';
              if (perf.rendimiento === 'neutral') return '➡️';
              if (perf.rendimiento === 'bajo') return '📉';
              if (perf.rendimiento === 'preocupante') return '⚠️';
              return '❓';
            };

            const getRendimientoText = () => {
              if (perf.rendimiento === 'excelente') return 'Excelente';
              if (perf.rendimiento === 'bueno') return 'Mejorando';
              if (perf.rendimiento === 'neutral') return 'Estable';
              if (perf.rendimiento === 'bajo') return 'Bajo';
              if (perf.rendimiento === 'preocupante') return 'Preocupante';
              return 'N/A';
            };

            return (
              <div key={index} className={`p-3 rounded-lg border-2 ${getRendimientoColor()}`}>
                <div className="text-2xl text-center mb-1">{getRendimientoIcon()}</div>
                <h3 className="font-bold text-center text-xs mb-1">{perf.storeName}</h3>
                <p className="text-center text-xs font-semibold">{getRendimientoText()}</p>
                <p className="text-center text-xs mt-1 opacity-75">{perf.tendenciaPorcentaje > 0 ? '+' : ''}{perf.tendenciaPorcentaje.toFixed(1)}%</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Estadísticas detalladas por tienda */}
      <div className="bg-white p-6 rounded-2xl shadow-2xl border border-gray-200">
        <h2 className="text-2xl font-bold text-indigo-900 mb-4">
          📊 Análisis Detallado - {metricNames[selectedMetric]}
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {statistics.map((stat, index) => {
            const perf = performanceAnalysis.find(p => p.storeName === stat.storeName);

            return (
              <div key={index} className={`bg-gradient-to-br from-indigo-50 to-white p-5 rounded-xl border-2 shadow-lg ${
                stat.isInactive ? 'border-orange-300 opacity-75' : 'border-indigo-100'
              }`}>
                <div className="flex justify-between items-start mb-3">
                  <h3 className="font-bold text-gray-900 text-lg">{stat.storeName}</h3>
                  {stat.isInactive ? (
                    <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full font-semibold">
                      Inactiva
                    </span>
                  ) : (
                    <span className={`text-xs px-2 py-1 rounded-full font-semibold ${
                      perf?.rendimiento === 'excelente' ? 'bg-green-100 text-green-700' :
                      perf?.rendimiento === 'bueno' ? 'bg-lime-100 text-lime-700' :
                      perf?.rendimiento === 'neutral' ? 'bg-blue-100 text-blue-700' :
                      perf?.rendimiento === 'bajo' ? 'bg-orange-100 text-orange-700' :
                      perf?.rendimiento === 'preocupante' ? 'bg-red-100 text-red-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {perf?.rendimiento === 'excelente' ? '🚀 Excelente' :
                       perf?.rendimiento === 'bueno' ? '📈 Mejorando' :
                       perf?.rendimiento === 'neutral' ? '➡️ Estable' :
                       perf?.rendimiento === 'bajo' ? '📉 Bajo' :
                       perf?.rendimiento === 'preocupante' ? '⚠️ Preocupante' : ''}
                    </span>
                  )}
                </div>

                {/* Comparación con su propio historial */}
                {!stat.isInactive && perf && (
                  <div className="mb-3 p-2 bg-purple-50 rounded-lg border border-purple-200">
                    <p className="text-xs text-purple-800 font-semibold mb-1">📊 Vs. su propio historial:</p>
                    <div className="flex justify-between text-xs text-purple-700">
                      <span>Está al {perf.comparacionMejor}% de su mejor momento</span>
                      <span>|</span>
                      <span>{perf.comparacionPeor}% mejor que su peor</span>
                    </div>
                  </div>
                )}

              <div className="grid grid-cols-2 gap-3 text-sm">
                {/* Métricas principales */}
                <div className="col-span-2 bg-indigo-100 p-3 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold text-gray-700">Promedio:</span>
                    <span className="text-xl font-bold text-indigo-900">{formatValue(stat.promedio)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-gray-700">Mediana:</span>
                    <span className="text-lg font-bold text-indigo-700">{formatValue(stat.mediana)}</span>
                  </div>
                </div>

                {/* Total (solo para flujo y boletas) */}
                {selectedMetric !== 'conversion' && (
                  <div className="col-span-2 bg-blue-50 p-3 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-gray-700">Total Acumulado:</span>
                      <span className="text-xl font-bold text-blue-900">{formatValue(stat.total)}</span>
                    </div>
                  </div>
                )}

                {/* Máximo y Mínimo */}
                <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                  <div className="text-xs text-gray-600 mb-1">🔝 Mejor</div>
                  <div className="font-bold text-green-700 text-lg">{formatValue(stat.maximo.valor)}</div>
                  <div className="text-xs text-gray-500 mt-1">{stat.maximo.periodo}</div>
                </div>

                <div className="bg-red-50 p-3 rounded-lg border border-red-200">
                  <div className="text-xs text-gray-600 mb-1">📉 Peor</div>
                  <div className="font-bold text-red-700 text-lg">{formatValue(stat.minimo.valor)}</div>
                  <div className="text-xs text-gray-500 mt-1">{stat.minimo.periodo}</div>
                </div>

                {/* Tendencia */}
                <div className={`col-span-2 p-3 rounded-lg border ${getTrendColor(stat.tendencia)}`}>
                  <div className="flex justify-between items-center">
                    <span className="font-semibold flex items-center gap-2">
                      Tendencia: {getTrendIcon(stat.tendencia)}
                    </span>
                    <span className="text-lg font-bold">{getTrendText(stat.tendencia, stat.tendenciaPorcentaje)}</span>
                  </div>
                </div>

                {/* Métricas avanzadas */}
                <div className="bg-purple-50 p-3 rounded-lg border border-purple-200">
                  <div className="text-xs text-gray-600 mb-1">📊 Desv. Estándar</div>
                  <div className="font-bold text-purple-700">{formatValue(stat.desviacionEstandar)}</div>
                  <div className="text-xs text-gray-500 mt-1">CV: {stat.coeficienteVariacion.toFixed(1)}%</div>
                </div>

                <div className="bg-teal-50 p-3 rounded-lg border border-teal-200">
                  <div className="text-xs text-gray-600 mb-1">📅 Actividad</div>
                  <div className="font-bold text-teal-700">{stat.diasActivos}/{stat.diasTotales}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {((stat.diasActivos / stat.diasTotales) * 100).toFixed(0)}% activo
                  </div>
                </div>

                {/* Rachas */}
                {stat.mejorRacha > 0 && (
                  <div className="bg-lime-50 p-3 rounded-lg border border-lime-200">
                    <div className="text-xs text-gray-600 mb-1">🔥 Mejor racha</div>
                    <div className="font-bold text-lime-700">{stat.mejorRacha} periodos</div>
                    <div className="text-xs text-gray-500 mt-1">sobre promedio</div>
                  </div>
                )}

                {stat.peorRacha > 0 && (
                  <div className="bg-rose-50 p-3 rounded-lg border border-rose-200">
                    <div className="text-xs text-gray-600 mb-1">❄️ Peor racha</div>
                    <div className="font-bold text-rose-700">{stat.peorRacha} periodos</div>
                    <div className="text-xs text-gray-500 mt-1">bajo promedio</div>
                  </div>
                )}
              </div>
            </div>
            );
          })}
        </div>
      </div>

      {/* Leyenda */}
      <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
        <h3 className="font-semibold text-gray-800 mb-2 text-sm">📖 Glosario</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-gray-600">
          <div><strong>Promedio:</strong> Media de todos los valores válidos (sin ceros)</div>
          <div><strong>Mediana:</strong> Valor central, menos sensible a valores extremos</div>
          <div><strong>Desv. Estándar:</strong> Mide la variabilidad de los datos</div>
          <div><strong>CV (Coef. Variación):</strong> Variabilidad relativa al promedio</div>
          <div><strong>Mejor Racha:</strong> Periodos consecutivos sobre el promedio</div>
          <div><strong>Peor Racha:</strong> Periodos consecutivos bajo el promedio</div>
        </div>
      </div>
    </div>
  );
}
