import React from 'react';

export default function Statistics({ storeData, selectedStores, selectedMetric, viewMode }) {
  if (!storeData || storeData.length === 0) return null;

  // Filtrar solo las tiendas seleccionadas
  const selectedStoreData = storeData.filter(store => selectedStores[store.name]);

  if (selectedStoreData.length === 0) return null;

  // Calcular estadísticas para cada tienda seleccionada
  const statistics = selectedStoreData.map(store => {
    const data = store.data;

    // Filtrar datos con valores válidos
    const validData = data.filter(d => d[selectedMetric] > 0);

    if (validData.length === 0) {
      return {
        storeName: store.name,
        promedio: 0,
        maximo: { valor: 0, periodo: '-' },
        minimo: { valor: 0, periodo: '-' },
        tendencia: 'neutral',
        total: 0
      };
    }

    // Calcular promedio
    const total = validData.reduce((sum, d) => sum + d[selectedMetric], 0);
    const promedio = total / validData.length;

    // Encontrar máximo y mínimo
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

    // Calcular tendencia (comparar primera mitad vs segunda mitad)
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

    return {
      storeName: store.name,
      promedio,
      maximo,
      minimo,
      tendencia,
      tendenciaPorcentaje,
      total
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
    return '➡️';
  };

  const getTrendText = (tendencia, porcentaje) => {
    if (tendencia === 'subiendo') return `+${porcentaje.toFixed(1)}%`;
    if (tendencia === 'bajando') return `${porcentaje.toFixed(1)}%`;
    return 'Estable';
  };

  const getTrendColor = (tendencia) => {
    if (tendencia === 'subiendo') return 'text-green-600 bg-green-50';
    if (tendencia === 'bajando') return 'text-red-600 bg-red-50';
    return 'text-gray-600 bg-gray-50';
  };

  const metricNames = {
    flujo: 'Flujo',
    boletas: 'Boletas',
    conversion: 'Conversión'
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-2xl mb-6 border border-gray-200">
      <h2 className="text-2xl font-bold text-indigo-900 mb-4">
        📊 Estadísticas - {metricNames[selectedMetric]}
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {statistics.map((stat, index) => (
          <div key={index} className="bg-gradient-to-br from-indigo-50 to-white p-4 rounded-xl border border-indigo-100 shadow">
            <h3 className="font-semibold text-gray-800 mb-3 text-sm border-b border-gray-200 pb-2">
              {stat.storeName}
            </h3>

            <div className="space-y-2 text-sm">
              {/* Promedio */}
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Promedio:</span>
                <span className="font-bold text-indigo-900">{formatValue(stat.promedio)}</span>
              </div>

              {/* Total (solo para flujo y boletas) */}
              {selectedMetric !== 'conversion' && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Total:</span>
                  <span className="font-bold text-indigo-700">{formatValue(stat.total)}</span>
                </div>
              )}

              {/* Máximo */}
              <div className="flex justify-between items-center bg-green-50 px-2 py-1 rounded">
                <span className="text-gray-600">Mejor:</span>
                <div className="text-right">
                  <div className="font-bold text-green-700">{formatValue(stat.maximo.valor)}</div>
                  <div className="text-xs text-gray-500">{stat.maximo.periodo}</div>
                </div>
              </div>

              {/* Mínimo */}
              <div className="flex justify-between items-center bg-red-50 px-2 py-1 rounded">
                <span className="text-gray-600">Peor:</span>
                <div className="text-right">
                  <div className="font-bold text-red-700">{formatValue(stat.minimo.valor)}</div>
                  <div className="text-xs text-gray-500">{stat.minimo.periodo}</div>
                </div>
              </div>

              {/* Tendencia */}
              <div className={`flex justify-between items-center px-2 py-1 rounded ${getTrendColor(stat.tendencia)}`}>
                <span className="text-gray-700 flex items-center gap-1">
                  Tendencia: {getTrendIcon(stat.tendencia)}
                </span>
                <span className="font-bold">{getTrendText(stat.tendencia, stat.tendenciaPorcentaje)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {statistics.length === 0 && (
        <p className="text-gray-500 text-center py-8">
          Selecciona al menos una tienda para ver estadísticas
        </p>
      )}
    </div>
  );
}
