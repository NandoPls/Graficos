import React, { useState, useRef } from 'react';
import html2canvas from "html2canvas";
import './setupGlobals';
import { generatePPT } from './generatePPT';
import { initialStoreData } from './storeData';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LabelList,
  BarChart,
  Bar,
  AreaChart,
  Area,
} from 'recharts';
// Etiquetas personalizadas para las líneas, barras y áreas: adaptativo según tipo de gráfico y métrica
const CustomizedLabel = (props) => {
  const { x, y, value, index, stroke, chartType, selectedMetric, width, height } = props;
  if (value === null || value === undefined || value === '') return null;

  // Formatear valor con separador de miles o porcentaje si corresponde
  let displayValue;
  if (selectedMetric === 'conversion') {
    // Mostrar con símbolo %
    if (typeof value === 'number') {
      displayValue = value.toLocaleString('de-DE', { maximumFractionDigits: 1 }) + '%';
    } else if (typeof value === 'string' && !value.endsWith('%')) {
      displayValue = value + '%';
    } else {
      displayValue = value;
    }
  } else {
    displayValue = typeof value === 'number' ? value.toLocaleString('de-DE') : value;
  }

  if (chartType === 'bar') {
    // Centrar arriba de la barra
    // x: centro de la barra, y: un poco arriba del rectángulo
    // width y height sólo están disponibles si se usan como función, pero si no, fallback a x, y
    const barX = typeof x === 'number' && typeof width === 'number' ? x + width / 2 : x;
    const barY = typeof y === 'number' ? y - 20 : y;
    return (
      <text
        x={barX}
        y={barY}
        fill={stroke}
        fontSize={11}
        fontWeight="bold"
        textAnchor="middle"
        dominantBaseline="bottom"
        style={{ textShadow: '0 0 3px white', pointerEvents: 'none' }}
      >
        {displayValue}
      </text>
    );
  } else {
    // Alternar posición vertical para evitar solapamiento: arriba si índice par, abajo si impar
    // Además, alternar posición horizontal ligeramente para mejorar legibilidad
    const yPos = index % 2 === 0 ? y - 14 : y + 14;
    const xOffset = (index % 2 === 0) ? -6 : 6;
    return (
      <text
        x={x + xOffset}
        y={yPos}
        fill={stroke}
        fontSize={11}
        fontWeight="bold"
        textAnchor="middle"
        dominantBaseline="middle"
        style={{ textShadow: '0 0 3px white', pointerEvents: 'none' }}
      >
        {displayValue}
      </text>
    );
  }
};

const STORE_COLORS = [
  "#1f77b4", "#ff7f0e", "#2ca02c", "#d62728", "#9467bd",
  "#8c564b", "#e377c2", "#7f7f7f", "#bcbd22", "#17becf",
  "#aec7e8"
];

const MONTHS_ORDER = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];


export default function RetailDashboard() {
  const [storeData, setStoreData] = useState(initialStoreData);
  const [monthsVisible, setMonthsVisible] = useState([
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo'
  ]);
  const [selectedMetric, setSelectedMetric] = useState('flujo');
  // Estado inicial: todas las tiendas seleccionadas + "Resumen" seleccionada por defecto
  const [selectedStores, setSelectedStores] = useState(() => {
    const acc = initialStoreData.reduce((acc, store) => {
      acc[store.name] = true;
      return acc;
    }, {});
    acc["Resumen"] = true; // Asegura que Resumen esté seleccionada por defecto
    return acc;
  });
  // Nuevo estado para tipo de gráfico
  const [chartType, setChartType] = useState('line');

  const chartData = monthsVisible.map(month => {
    const obj = { month };
    storeData.forEach(store => {
      if (selectedStores[store.name]) {
        const entry = store.data.find(d => d.month === month);
        obj[store.name] = entry ? entry[selectedMetric] : null;
      }
    });
    return obj;
  });

  const handleDataChange = (storeName, month, field, value) => {
    setStoreData(prevData => {
      return prevData.map(store => {
        if (store.name !== storeName) return store;
        let found = false;
        const newData = store.data.map(d => {
          if (d.month === month) {
            found = true;
            return { ...d, [field]: value };
          }
          return d;
        });
        if (!found) {
          newData.push({
            month,
            flujo: field === 'flujo' ? value : '',
            boletas: field === 'boletas' ? value : '',
            conversion: field === 'conversion' ? value : ''
          });
        }
        newData.sort((a, b) => MONTHS_ORDER.indexOf(a.month) - MONTHS_ORDER.indexOf(b.month));
        return { ...store, data: newData };
      });
    });
  };

  const handleAddMonth = () => {
    const currentLength = monthsVisible.length;
    if (currentLength >= MONTHS_ORDER.length) return;
    const nextMonth = MONTHS_ORDER[currentLength];
    setMonthsVisible(prev => [...prev, nextMonth]);
    setStoreData(prevData =>
      prevData.map(store => {
        if (store.data.some(d => d.month === nextMonth)) return store;
        const newData = [...store.data, {
          month: nextMonth,
          flujo: '',
          boletas: '',
          conversion: ''
        }];
        newData.sort((a, b) => MONTHS_ORDER.indexOf(a.month) - MONTHS_ORDER.indexOf(b.month));
        return { ...store, data: newData };
      })
    );
  };

  const handleMetricChange = e => {
    if (e.target.value === "Conversión (%)" || e.target.value === "conversion") {
      setSelectedMetric("conversion");
    } else {
      setSelectedMetric(e.target.value);
    }
  };
  const handleStoreToggle = storeName => {
    setSelectedStores(prev => ({ ...prev, [storeName]: !prev[storeName] }));
  };
  const handleSelectAllStores = () => {
    const allSelected = Object.values(selectedStores).every(v => v);
    const newSelectedStores = {};
    storeData.forEach(store => {
      newSelectedStores[store.name] = !allSelected;
    });
    setSelectedStores(newSelectedStores);
  };

  const canAddMonth = monthsVisible.length < MONTHS_ORDER.length;

  const formatNumberWithThousands = (value) => {
    if (value === null || value === undefined || value === '') return '';
    if (typeof value === "string" && value.endsWith("%")) return value;
    return Number(value).toLocaleString('de-DE');
  };

  // Ref para el contenedor del gráfico
  const chartContainerRef = useRef(null);

  // Función para cambiar el tipo de gráfico cíclicamente
  const handleCycleChartType = () => {
    setChartType((prev) => {
      if (prev === 'line') return 'bar';
      if (prev === 'bar') return 'area';
      return 'line';
    });
  };

  return (
    <div className="flex flex-col min-h-screen p-4 bg-gray-50">
      <h1 className="text-2xl font-bold mb-4 text-gray-800">Dashboard de Evolución de Tiendas - 2025</h1>
      <div className="mb-6 bg-white p-4 rounded-lg shadow">
        <div className="flex flex-col md:flex-row md:items-end md:gap-6">
          <div className="mb-4 md:mb-0">
            <label className="block text-sm font-medium text-gray-700 mb-2">Seleccionar Métrica:</label>
            <select
              value={selectedMetric}
              onChange={handleMetricChange}
              className="block w-full max-w-xs p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="flujo">Flujo</option>
              <option value="boletas">Boletas</option>
              <option value="conversion">Conversión (%)</option>
            </select>
          </div>
          <div className="mb-4 md:mb-0 flex-1">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">Seleccionar Tiendas:</label>
              <button
                onClick={handleSelectAllStores}
                className="text-sm text-indigo-600 hover:text-indigo-800"
              >
                {Object.values(selectedStores).every(v => v) ? 'Deseleccionar Todas' : 'Seleccionar Todas'}
              </button>
            </div>
            {/* Botones de grupos de tiendas */}
            <div className="mb-3 flex flex-wrap gap-2">
              {(() => {
                // Definición de los grupos, excluyendo "Resumen"
                const grupo1 = [
                  "Costanera Center - Salomon",
                  "Mall Sport - Salomon",
                  "Mall Plaza Trebol - Salomon",
                  "Parque Arauco",
                  "Puerto montt"
                ];
                const grupo2 = ["Manquehue", "Viña del Mar", "BeCycling Padre Hurtado"];
                const grupo3 = ["Mall Sport - Wilson", "Tienda Arena MS", "Easton"];

                // Handler para seleccionar sólo las tiendas del grupo (no incluye "Resumen")
                const handleSelectGroup = (groupNames) => {
                  const newSelected = {};
                  storeData.forEach(store => {
                    // No incluir "Resumen" en los grupos
                    if (store.name === "Resumen") {
                      newSelected[store.name] = false;
                    } else {
                      newSelected[store.name] = groupNames.includes(store.name);
                    }
                  });
                  // Si "Resumen" no está en storeData pero sí en selectedStores, asegúrate de mantenerlo en false
                  if (!storeData.some(s => s.name === "Resumen")) {
                    newSelected["Resumen"] = false;
                  }
                  setSelectedStores(newSelected);
                };
                return (
                  <>
                    <button
                      type="button"
                      className="bg-indigo-600 text-white rounded px-3 py-1 mr-2 hover:bg-indigo-700 cursor-pointer"
                      onClick={() => handleSelectGroup(grupo1)}
                    >
                      Tienda Salomon
                    </button>
                    <button
                      type="button"
                      className="bg-indigo-600 text-white rounded px-3 py-1 mr-2 hover:bg-indigo-700 cursor-pointer"
                      onClick={() => handleSelectGroup(grupo2)}
                    >
                      Tiendas Calles
                    </button>
                    <button
                      type="button"
                      className="bg-indigo-600 text-white rounded px-3 py-1 mr-2 hover:bg-indigo-700 cursor-pointer"
                      onClick={() => handleSelectGroup(grupo3)}
                    >
                      Arena, Wilson MS y Easton 
                    </button>
                  </>
                );
              })()}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {storeData.map((store, index) => (
                <div key={store.name} className="flex items-center">
                  <input
                    type="checkbox"
                    id={`store-${index}`}
                    checked={selectedStores[store.name]}
                    onChange={() => handleStoreToggle(store.name)}
                    className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                  />
                  <label htmlFor={`store-${index}`} className="ml-2 text-sm text-gray-700 flex items-center">
                    <span className="w-3 h-3 inline-block mr-1" style={{ backgroundColor: STORE_COLORS[index % STORE_COLORS.length] }}></span>
                    {store.name}
                  </label>
                </div>
              ))}
              {/* Checkbox para "Resumen" si no está en storeData */}
              {!storeData.some(s => s.name === "Resumen") && (
                <div key="Resumen" className="flex items-center">
                  <input
                    type="checkbox"
                    id={`store-resumen`}
                    checked={selectedStores["Resumen"] || false}
                    onChange={() => handleStoreToggle("Resumen")}
                    className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                  />
                  <label htmlFor={`store-resumen`} className="ml-2 text-sm text-gray-700 flex items-center">
                    <span className="w-3 h-3 inline-block mr-1" style={{ backgroundColor: "#aec7e8" }}></span>
                    Resumen
                  </label>
                </div>
              )}
            </div>
          </div>
          <div className="mb-4 md:mb-0 flex-shrink-0">
            <button
              onClick={handleCycleChartType}
              className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition w-full"
              type="button"
            >
              Cambiar tipo de gráfico
            </button>
          </div>
        </div>
      </div>
      <div className="bg-white p-4 rounded-lg shadow" style={{ height: 450 }} ref={chartContainerRef}>
        <ResponsiveContainer width="100%" height="100%">
          {chartType === 'line' && (
            <LineChart data={chartData} margin={{ top: 25, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis
                label={{
                  value:
                    selectedMetric === "flujo"
                      ? "Flujo"
                      : selectedMetric === "boletas"
                      ? "Boletas"
                      : "Conversión (%)",
                  angle: -90,
                  position: 'insideLeft'
                }}
                tickFormatter={value =>
                  selectedMetric === 'conversion'
                    ? (value === null || value === undefined || value === '' ? '' : `${value}%`)
                    : formatNumberWithThousands(value)
                }
              />
              <Tooltip
                formatter={value =>
                  selectedMetric === 'conversion'
                    ? (value === null || value === undefined || value === '' ? '' : `${value}%`)
                    : formatNumberWithThousands(value)
                }
              />
              <Legend />
              {storeData.map((store, index) => (
                selectedStores[store.name] && (
                  <Line
                    key={store.name}
                    type="monotone"
                    dataKey={store.name}
                    stroke={STORE_COLORS[index % STORE_COLORS.length]}
                    activeDot={{ r: 8 }}
                    strokeWidth={2}
                    label={
                      <CustomizedLabel
                        stroke={STORE_COLORS[index % STORE_COLORS.length]}
                        chartType="line"
                        selectedMetric={selectedMetric}
                      />
                    }
                  />
                )
              ))}
            </LineChart>
          )}
          {chartType === 'bar' && (
            <BarChart data={chartData} margin={{ top: 30, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis
                label={{
                  value:
                    selectedMetric === "flujo"
                      ? "Flujo"
                      : selectedMetric === "boletas"
                      ? "Boletas"
                      : "Conversión (%)",
                  angle: -90,
                  position: 'insideLeft'
                }}
                tickFormatter={value =>
                  selectedMetric === 'conversion'
                    ? (value === null || value === undefined || value === '' ? '' : `${value}%`)
                    : formatNumberWithThousands(value)
                }
              />
              <Tooltip
                formatter={value =>
                  selectedMetric === 'conversion'
                    ? (value === null || value === undefined || value === '' ? '' : `${value}%`)
                    : formatNumberWithThousands(value)
                }
              />
              <Legend />
              {storeData.map((store, index) => (
                selectedStores[store.name] && (
                  <Bar
                    key={store.name}
                    dataKey={store.name}
                    fill={STORE_COLORS[index % STORE_COLORS.length]}
                    radius={[4, 4, 0, 0]}
                    label={
                      // Se debe pasar chartType y selectedMetric como props
                      (props) => (
                        <CustomizedLabel
                          {...props}
                          stroke={STORE_COLORS[index % STORE_COLORS.length]}
                          chartType="bar"
                          selectedMetric={selectedMetric}
                        />
                      )
                    }
                  />
                )
              ))}
            </BarChart>
          )}
          {chartType === 'area' && (
            <AreaChart data={chartData} margin={{ top: 30, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis
                label={{
                  value:
                    selectedMetric === "flujo"
                      ? "Flujo"
                      : selectedMetric === "boletas"
                      ? "Boletas"
                      : "Conversión (%)",
                  angle: -90,
                  position: 'insideLeft'
                }}
                tickFormatter={value =>
                  selectedMetric === 'conversion'
                    ? (value === null || value === undefined || value === '' ? '' : `${value}%`)
                    : formatNumberWithThousands(value)
                }
              />
              <Tooltip
                formatter={value =>
                  selectedMetric === 'conversion'
                    ? (value === null || value === undefined || value === '' ? '' : `${value}%`)
                    : formatNumberWithThousands(value)
                }
              />
              <Legend />
              {storeData.map((store, index) => (
                selectedStores[store.name] && (
                  <Area
                    key={store.name}
                    type="monotone"
                    dataKey={store.name}
                    stroke={STORE_COLORS[index % STORE_COLORS.length]}
                    fill={STORE_COLORS[index % STORE_COLORS.length]}
                    fillOpacity={0.18}
                    strokeWidth={2}
                    label={
                      <CustomizedLabel
                        stroke={STORE_COLORS[index % STORE_COLORS.length]}
                        chartType="area"
                        selectedMetric={selectedMetric}
                      />
                    }
                  />
                )
              ))}
            </AreaChart>
          )}
        </ResponsiveContainer>
      </div>
      <div className="mt-6 bg-white p-4 rounded-lg shadow max-w-full overflow-auto">
        <h2 className="text-lg font-semibold mb-4">Editar Datos (todos los meses por tienda)</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] table-auto border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 px-2 py-1 text-left align-bottom" rowSpan="2" style={{ minWidth: 120 }}>Tienda</th>
                {monthsVisible.map((month) => (
                  <th
                    key={month}
                    className="border border-gray-300 px-1 py-1 text-center"
                    colSpan={3}
                    style={{ minWidth: 90 }}
                  >
                    {month}
                  </th>
                ))}
                <th
                  className="border border-gray-300 px-1 py-1 text-center align-bottom"
                  rowSpan="2"
                  style={{ minWidth: 60, background: 'white' }}
                >
                  {canAddMonth && (
                    <button
                      onClick={handleAddMonth}
                      aria-label="Agregar mes"
                      className="text-4xl font-bold text-green-600 hover:text-green-800 focus:outline-none transition"
                      style={{ lineHeight: '1', padding: '0 12px', background: 'white', border: 'none', cursor: 'pointer' }}
                      disabled={!canAddMonth}
                    >
                      +
                    </button>
                  )}
                </th>
              </tr>
              <tr className="bg-gray-100">
                {monthsVisible.map((month) => (
                  <React.Fragment key={month + "-header"}>
                    <th key={month + "-flujo"} className="border border-gray-300 px-1 py-1 text-right" style={{ minWidth: 60, fontWeight: 500 }}>Flujo</th>
                    <th key={month + "-boletas"} className="border border-gray-300 px-1 py-1 text-right" style={{ minWidth: 60, fontWeight: 500 }}>Boletas</th>
                    <th key={month + "-conversion"} className="border border-gray-300 px-1 py-1 text-right" style={{ minWidth: 62, fontWeight: 500 }}>Conv. (%)</th>
                  </React.Fragment>
                ))}
                <th className="border-none bg-white"></th>
              </tr>
            </thead>
            <tbody>
              {storeData
                .filter(store => selectedStores[store.name])
                .slice(0, 11)
                .map((store, idx) => {
                  const formatNumber = (num) => {
                    if (num === '' || num === null || num === undefined) return '';
                    const n = Number(num);
                    if (isNaN(n)) return '';
                    return n.toLocaleString('de-DE');
                  };
                  const parseNumber = (str) => {
                    if (!str) return '';
                    const cleaned = str.replace(/\./g, '').replace(/,/g, '.').trim();
                    const n = Number(cleaned);
                    return isNaN(n) ? '' : n;
                  };
                  const formatPercentage = (num) => {
                    if (num === '' || num === null || num === undefined) return '';
                    const n = Number(num);
                    if (isNaN(n)) return '';
                    return n.toFixed(1).replace('.', ',') + '%';
                  };
                  const parsePercentage = (str) => {
                    if (!str) return '';
                    const cleaned = str.replace('%', '').replace(/\./g, '').replace(/,/g, '.').trim();
                    const n = Number(cleaned);
                    return isNaN(n) ? '' : n;
                  };
                  const dataByMonth = {};
                  store.data.forEach(d => { dataByMonth[d.month] = d; });
                  return (
                    <tr key={store.name} className="odd:bg-white even:bg-gray-50">
                      <td className="border border-gray-300 px-2 py-1 font-medium sticky left-0 bg-inherit z-10" style={{ minWidth: 120 }}>
                        {store.name}
                      </td>
                      {monthsVisible.map(month => {
                        const entry = dataByMonth[month] || { flujo: '', boletas: '', conversion: '' };
                        return (
                          <React.Fragment key={month + store.name + "-inputs"}>
                            <td key={month + store.name + "-flujo"} className="border border-gray-300 px-1 py-1 text-right">
                              <input
                                type="text"
                                value={formatNumber(entry.flujo)}
                                onChange={e => {
                                  const val = parseNumber(e.target.value);
                                  if (val === '' || !isNaN(val)) {
                                    handleDataChange(store.name, month, 'flujo', val === '' ? '' : val);
                                  }
                                }}
                                className="w-16 p-0.5 border rounded text-right text-xs"
                                spellCheck="false"
                                style={{ minWidth: 45, maxWidth: 60 }}
                              />
                            </td>
                            <td key={month + store.name + "-boletas"} className="border border-gray-300 px-1 py-1 text-right">
                              <input
                                type="text"
                                value={formatNumber(entry.boletas)}
                                onChange={e => {
                                  const val = parseNumber(e.target.value);
                                  if (val === '' || !isNaN(val)) {
                                    handleDataChange(store.name, month, 'boletas', val === '' ? '' : val);
                                  }
                                }}
                                className="w-14 p-0.5 border rounded text-right text-xs"
                                spellCheck="false"
                                style={{ minWidth: 38, maxWidth: 55 }}
                              />
                            </td>
                            <td key={month + store.name + "-conversion"} className="border border-gray-300 px-1 py-1 text-right">
                              <input
                                type="text"
                                value={formatPercentage(entry.conversion)}
                                onChange={e => {
                                  const val = parsePercentage(e.target.value);
                                  if (val === '' || !isNaN(val)) {
                                    handleDataChange(store.name, month, 'conversion', val === '' ? '' : val);
                                  }
                                }}
                                className="w-14 p-0.5 border rounded text-right text-xs"
                                spellCheck="false"
                                style={{ minWidth: 38, maxWidth: 55 }}
                              />
                            </td>
                          </React.Fragment>
                        );
                      })}
                      <td className="border-none bg-white"></td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>
      <div className="mt-6 flex justify-end gap-2">
        <button
          onClick={async () => {
            if (chartContainerRef.current) {
              try {
                const canvas = await html2canvas(chartContainerRef.current, { backgroundColor: "#fff" });
                const imgData = canvas.toDataURL("image/png");
                generatePPT(storeData, selectedStores, monthsVisible, selectedMetric, imgData);
              } catch (err) {
                // Si falla, fallback a sin imagen
                generatePPT(storeData, selectedStores, monthsVisible, selectedMetric);
              }
            } else {
              generatePPT(storeData, selectedStores, monthsVisible, selectedMetric);
            }
          }}
        >
          Descargar PPT
        </button>
      </div>
    </div>
  );
}