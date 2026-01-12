import React, { useState, useRef, useEffect } from 'react';
import html2canvas from "html2canvas";
import './setupGlobals';
import { generatePPT } from './generatePPT';
import DataUploader from './DataUploader';
import StatisticsEnhanced from './StatisticsEnhanced';
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
  "#aec7e8", "#ffbb78", "#98df8a", "#ff9896", "#c5b0d5",
  "#c49c94", "#f7b6d2", "#c7c7c7", "#dbdb8d", "#9edae5"
];

const MONTHS_ORDER = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const WEEKS_ORDER = [];

export default function RetailDashboard() {
  // Estados para datos cargados desde API
  const [dailyDataFromAPI, setDailyDataFromAPI] = useState(null);
  const [dataMetadata, setDataMetadata] = useState(null);
  const [loading, setLoading] = useState(true);
  const [weeklyStoreData, setWeeklyStoreData] = useState([]);
  const [initialStoreData, setInitialStoreData] = useState([]);
  const [viewMode, setViewMode] = useState('months');
  const [showStatistics, setShowStatistics] = useState(false);
  const [storeData, setStoreData] = useState([]);
  const [selectedYear, setSelectedYear] = useState(null);
  const [availableYears, setAvailableYears] = useState([]);
  // Estados para comparación año vs año
  const [comparisonYear1, setComparisonYear1] = useState(null);
  const [comparisonYear2, setComparisonYear2] = useState(null);
  const [yoyMonthsVisible, setYoyMonthsVisible] = useState(MONTHS_ORDER); // Todos los meses por defecto
  const [monthsVisible, setMonthsVisible] = useState([
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo'
  ]);
  const [weeksVisible, setWeeksVisible] = useState(WEEKS_ORDER.slice(0, 5));
  const [selectedMetric, setSelectedMetric] = useState('flujo');
  // Estado para comparación mensual por fechas exactas
  const [cutoffDay, setCutoffDay] = useState(25); // Día 25
  const [cutoffMonth, setCutoffMonth] = useState(8); // Agosto
  const [selectedMonthsComparison, setSelectedMonthsComparison] = useState([
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre'
  ]);
  // Estado para comparación año vs año por día
  const [yearComparisonDay, setYearComparisonDay] = useState(12); // Día inicial
  const [yearComparisonMonth, setYearComparisonMonth] = useState(1); // Enero
  const [dayComparisonYear1, setDayComparisonYear1] = useState(null); // Año 1 para comparación por día
  const [dayComparisonYear2, setDayComparisonYear2] = useState(null); // Año 2 para comparación por día
  // Estado inicial: todas las tiendas seleccionadas + "Resumen" seleccionada por defecto
  const [selectedStores, setSelectedStores] = useState({});
  // Nuevo estado para tipo de gráfico
  const [chartType, setChartType] = useState('line');

  // Función para cargar datos desde la API o fallback local
  const loadDataFromAPI = async () => {
    try {
      setLoading(true);

      let result;

      // Intentar cargar desde API primero
      try {
        const response = await fetch('/api/get-data');
        result = await response.json();
      } catch (apiError) {
        // Si falla (local), cargar desde archivo JSON
        console.log('📁 Cargando desde archivo local...');
        const localData = await import('./dailyData.json');
        result = localData.default || localData;
      }

      if (result && result.data) {
        setDailyDataFromAPI(result.data);
        setDataMetadata(result.metadata);

        // Detectar años disponibles
        const years = result.metadata?.years || [];
        setAvailableYears(years);

        // Importar funciones de procesamiento
        const { generateWeeklyDataFromDaily, generateMonthlyDataFromDaily, findYearWithMostData } = await import('./dataProcessor');

        // Determinar año a usar (selectedYear o el que tiene más datos)
        const yearToUse = selectedYear || findYearWithMostData(result.data);

        // Si no hay año seleccionado, establecerlo
        if (!selectedYear && yearToUse) {
          setSelectedYear(yearToUse);
        }

        // Inicializar años de comparación si no están establecidos
        if (!comparisonYear1 && years.length > 0) {
          const sortedYears = [...years].sort((a, b) => b - a);
          setComparisonYear1(sortedYears[0] || yearToUse);
          setComparisonYear2(sortedYears[1] || (sortedYears[0] - 1));
        }

        // Inicializar años de comparación por día si no están establecidos
        if (!dayComparisonYear1 && years.length > 0) {
          const sortedYears = [...years].sort((a, b) => b - a);
          setDayComparisonYear1(sortedYears[0] || yearToUse);
          setDayComparisonYear2(sortedYears[1] || (sortedYears[0] - 1));
        }

        // Generar datos procesados para el año seleccionado
        const weekly = generateWeeklyDataFromDaily(result.data, yearToUse);
        const monthly = generateMonthlyDataFromDaily(result.data, yearToUse);

        setWeeklyStoreData(weekly);
        setInitialStoreData(monthly);
        setStoreData(monthly);

        console.log('📊 Datos cargados:', {
          weekly: weekly.length,
          monthly: monthly.length,
          weeklyStores: weekly.map(s => s.name),
          monthlyStores: monthly.map(s => s.name),
          sampleMonthlyData: monthly[0]?.data?.slice(0, 3),
          rawDataStructure: Object.keys(result.data),
          availableYears: years,
          selectedYear: yearToUse
        });

        // Inicializar weeksVisible si hay datos
        if (weekly.length > 0 && weekly[0].data.length > 0) {
          const weeksOrder = weekly[0].data.map(d => d.week);
          setWeeksVisible(weeksOrder.slice(0, 5));
        }

        // Inicializar selectedStores - solo "Resumen" seleccionado por defecto
        const initialSelectedStores = {};
        monthly.forEach(store => {
          initialSelectedStores[store.name] = false; // Todas las tiendas desmarcadas
        });
        initialSelectedStores["Resumen"] = true; // Solo Resumen marcado
        setSelectedStores(initialSelectedStores);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Cargar datos al montar el componente
  useEffect(() => {
    loadDataFromAPI();
  }, []);

  // Lógica de datos para el gráfico según el modo
  let chartData;
  let visibleCategories;

  if (viewMode === 'yearOverYear') {
    // Modo de comparación año vs año anterior
    const { generateYearOverYearComparison } = require('./dataProcessor');
    const allYoyData = generateYearOverYearComparison(
      dailyDataFromAPI,
      comparisonYear1,
      comparisonYear2,
      'monthly',
      selectedStores,
      selectedMetric
    );
    // Filtrar solo los meses seleccionados
    chartData = allYoyData.filter(data => yoyMonthsVisible.includes(data.month));
    visibleCategories = chartData.map(d => d.month);
  } else if (viewMode === 'yearComparisonByDay') {
    // Modo de comparación año vs año hasta un día específico
    const { generateYearToYearDayComparison } = require('./dataProcessor');
    chartData = generateYearToYearDayComparison(
      dailyDataFromAPI,
      dayComparisonYear1,
      dayComparisonYear2,
      yearComparisonMonth,
      yearComparisonDay,
      selectedStores,
      selectedMetric
    );
    visibleCategories = chartData.map(d => d.month);
  } else if (viewMode === 'monthlyComparison') {
    // Modo de comparación mensual hasta fecha límite exacta
    const { generateDateBasedComparisonFromWeekly: generateComparison } = require('./dataProcessor');
    const allComparisonData = generateComparison(
      dailyDataFromAPI, weeklyStoreData, cutoffDay, cutoffMonth, selectedStores, selectedMetric
    );
    // Filtrar solo los meses seleccionados
    chartData = allComparisonData.filter(data => selectedMonthsComparison.includes(data.month));
    visibleCategories = chartData.map(d => d.month);
  } else {
    // Modos existentes (months y weeks)
    visibleCategories = viewMode === 'months' ? monthsVisible : weeksVisible;
    chartData = visibleCategories.map(cat => {
      const key = viewMode === 'months' ? 'month' : 'week';
      const obj = { [key]: cat };
      storeData.forEach(store => {
        if (selectedStores[store.name]) {
          const entry = store.data.find(d => d[key] === cat);
          obj[store.name] = entry ? entry[selectedMetric] : null;
        }
      });
      return obj;
    });
  }

  // Definir handleMonthChange aquí para cambiar la selección de meses
  const handleMonthChange = (month) => {
    setMonthsVisible(prevMonths => {
      if (prevMonths.includes(month)) {
        return prevMonths.filter(m => m !== month); // Deselecciona el mes
      } else {
        return [...prevMonths, month]; // Selecciona el mes
      }
    });
  };

  const handleWeekChange = (week) => {
    setWeeksVisible(prevWeeks => {
      if (prevWeeks.includes(week)) {
        return prevWeeks.filter(w => w !== week);
      } else {
        return [...prevWeeks, week];
      }
    });
  };

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

  const handleModeChange = (mode) => {
    setViewMode(mode);
    if (mode === 'monthlyComparison') {
      setStoreData(weeklyStoreData);
    } else {
      setStoreData(mode === 'months' ? initialStoreData : weeklyStoreData);
    }
  };

  const handleMonthComparisonToggle = (month) => {
    setSelectedMonthsComparison(prev => {
      if (prev.includes(month)) {
        return prev.filter(m => m !== month);
      } else {
        return [...prev, month];
      }
    });
  };

  const handleYoyMonthToggle = (month) => {
    setYoyMonthsVisible(prev => {
      if (prev.includes(month)) {
        return prev.filter(m => m !== month);
      } else {
        return [...prev, month];
      }
    });
  };

  const getCurrentMonthName = () => {
    const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    return months[cutoffMonth - 1];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-2xl font-bold text-indigo-900 mb-4">Cargando datos...</div>
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-600 mx-auto"></div>
        </div>
      </div>
    );
  }

  // Función para cambiar de año
  const handleYearChange = async (year) => {
    setSelectedYear(year);
    setLoading(true);

    try {
      const { generateWeeklyDataFromDaily, generateMonthlyDataFromDaily } = await import('./dataProcessor');

      const weekly = generateWeeklyDataFromDaily(dailyDataFromAPI, year);
      const monthly = generateMonthlyDataFromDaily(dailyDataFromAPI, year);

      setWeeklyStoreData(weekly);
      setInitialStoreData(monthly);
      setStoreData(viewMode === 'months' ? monthly : weekly);
    } catch (error) {
      console.error('Error cambiando año:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen p-8 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 font-sans">
      <div className="text-center mb-8">
        <h1 className="text-5xl font-extrabold bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 bg-clip-text text-transparent tracking-tight drop-shadow-lg">
          Dashboard de Evolución de Tiendas - {selectedYear || new Date().getFullYear()}
        </h1>
        {dataMetadata && (
          <p className="text-sm text-gray-600 mt-2">
            📊 Última actualización: {dataMetadata.updateDate} | {dataMetadata.recordsProcessed} registros
            {dataMetadata.years && dataMetadata.years.length > 1 && (
              <span className="ml-2">| Años disponibles: {dataMetadata.years.join(', ')}</span>
            )}
          </p>
        )}

        {/* Selector de año */}
        {availableYears.length > 1 && (
          <div className="mt-4 flex justify-center items-center gap-3">
            <span className="text-sm font-semibold text-gray-700">📅 Ver datos del año:</span>
            <div className="flex gap-2">
              {availableYears.map(year => (
                <button
                  key={year}
                  onClick={() => handleYearChange(year)}
                  className={`px-4 py-2 rounded-lg font-semibold transition duration-150 ${
                    selectedYear === year
                      ? 'bg-indigo-600 text-white shadow-lg'
                      : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                  }`}
                >
                  {year}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <DataUploader onDataUpdated={loadDataFromAPI} />

      <div className="bg-white p-8 rounded-2xl shadow-2xl mb-10 border border-gray-200">
        <div className="mb-6 flex gap-4 flex-wrap">
          <button
            type="button"
            onClick={() => { handleModeChange('months'); setShowStatistics(false); }}
            className={
              `px-4 py-2 rounded-lg font-semibold transition-all duration-200 ` +
              (viewMode === 'months' && !showStatistics
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg scale-105'
                : 'bg-gray-200 text-gray-800 hover:bg-gray-300 hover:scale-105')
            }
          >
            Meses
          </button>
          <button
            type="button"
            onClick={() => { handleModeChange('weeks'); setShowStatistics(false); }}
            className={
              `px-4 py-2 rounded-lg font-semibold transition-all duration-200 ` +
              (viewMode === 'weeks' && !showStatistics
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg scale-105'
                : 'bg-gray-200 text-gray-800 hover:bg-gray-300 hover:scale-105')
            }
          >
            Semanas
          </button>
          <button
            type="button"
            onClick={() => { handleModeChange('monthlyComparison'); setShowStatistics(false); }}
            className={
              `px-4 py-2 rounded-lg font-semibold transition-all duration-200 ` +
              (viewMode === 'monthlyComparison' && !showStatistics
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg scale-105'
                : 'bg-gray-200 text-gray-800 hover:bg-gray-300 hover:scale-105')
            }
          >
            Comparación Mensual
          </button>
          <button
            type="button"
            onClick={() => { handleModeChange('yearOverYear'); setShowStatistics(false); }}
            className={
              `px-4 py-2 rounded-lg font-semibold transition-all duration-200 ` +
              (viewMode === 'yearOverYear' && !showStatistics
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg scale-105'
                : 'bg-gray-200 text-gray-800 hover:bg-gray-300 hover:scale-105')
            }
          >
            📅 Año vs Año
          </button>
          <button
            type="button"
            onClick={() => { handleModeChange('yearComparisonByDay'); setShowStatistics(false); }}
            className={
              `px-4 py-2 rounded-lg font-semibold transition-all duration-200 ` +
              (viewMode === 'yearComparisonByDay' && !showStatistics
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg scale-105'
                : 'bg-gray-200 text-gray-800 hover:bg-gray-300 hover:scale-105')
            }
          >
            🔄 Comparación por Día
          </button>
          <button
            type="button"
            onClick={() => setShowStatistics(true)}
            className={
              `px-4 py-2 rounded-lg font-semibold transition-all duration-200 ` +
              (showStatistics
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg scale-105'
                : 'bg-gray-200 text-gray-800 hover:bg-gray-300 hover:scale-105')
            }
          >
            📊 Estadísticas
          </button>
        </div>
        <div className="flex flex-col md:flex-row md:items-end md:gap-8 mb-8">
          <div className="mb-6 md:mb-0 w-full md:w-1/4">
            <label className="block text-base font-semibold text-gray-800 mb-3">Seleccionar Métrica:</label>
            <select
              value={selectedMetric}
              onChange={handleMetricChange}
              className="block w-full max-w-xs p-3 border border-gray-300 rounded-xl shadow focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition hover:border-indigo-400 hover:bg-indigo-50 text-gray-900 text-base font-medium"
            >
              <option value="flujo">Flujo</option>
              <option value="boletas">Boletas</option>
              <option value="conversion">Conversión (%)</option>
            </select>
          </div>
          <div className="mb-6 md:mb-0 flex-1">
            <div className="flex items-center justify-between mb-3">
              <label className="block text-base font-semibold text-gray-800">Seleccionar Tiendas:</label>
              <button
                onClick={handleSelectAllStores}
                className="text-sm font-semibold text-indigo-600 hover:text-white hover:bg-indigo-600 px-3 py-1 rounded-lg transition duration-150 border border-indigo-200 shadow-sm"
              >
                {Object.values(selectedStores).every(v => v) ? 'Deseleccionar Todas' : 'Seleccionar Todas'}
              </button>
            </div>
            {/* Botones de grupos de tiendas */}
            <div className="mb-4 flex flex-wrap gap-3">
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
                      className="bg-indigo-600 text-white rounded-xl px-4 py-2 mr-2 hover:bg-indigo-700 shadow-md transition duration-150 cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-400"
                      onClick={() => handleSelectGroup(grupo1)}
                    >
                      Tienda Salomon
                    </button>
                    <button
                      type="button"
                      className="bg-indigo-600 text-white rounded-xl px-4 py-2 mr-2 hover:bg-indigo-700 shadow-md transition duration-150 cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-400"
                      onClick={() => handleSelectGroup(grupo2)}
                    >
                      Tiendas Calles
                    </button>
                    <button
                      type="button"
                      className="bg-indigo-600 text-white rounded-xl px-4 py-2 mr-2 hover:bg-indigo-700 shadow-md transition duration-150 cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-400"
                      onClick={() => handleSelectGroup(grupo3)}
                    >
                      Arena, Wilson MS y Easton 
                    </button>
                  </>
                );
              })()}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {storeData.map((store, index) => (
                <div key={store.name} className="flex items-center">
                  <input
                    type="checkbox"
                    id={`store-${index}`}
                    checked={selectedStores[store.name]}
                    onChange={() => handleStoreToggle(store.name)}
                    className="h-4 w-4 text-indigo-600 border-gray-400 rounded-lg focus:ring-indigo-500 transition duration-150 hover:scale-110"
                  />
                  <label htmlFor={`store-${index}`} className="ml-2 text-sm text-gray-800 flex items-center cursor-pointer select-none hover:text-indigo-700">
                    <span className="w-3 h-3 inline-block mr-1 rounded" style={{ backgroundColor: STORE_COLORS[index % STORE_COLORS.length] }}></span>
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
                    className="h-4 w-4 text-indigo-600 border-gray-400 rounded-lg focus:ring-indigo-500 transition duration-150 hover:scale-110"
                  />
                  <label htmlFor={`store-resumen`} className="ml-2 text-sm text-gray-800 flex items-center cursor-pointer select-none hover:text-indigo-700">
                    <span className="w-3 h-3 inline-block mr-1 rounded" style={{ backgroundColor: "#aec7e8" }}></span>
                    Resumen
                  </label>
                </div>
              )}
            </div>
          </div>
          <div className="mb-6 md:mb-0 flex-shrink-0">
            <button
              onClick={handleCycleChartType}
              className="px-5 py-3 bg-indigo-700 text-white rounded-xl hover:bg-indigo-800 transition duration-150 w-full shadow-xl font-semibold text-base focus:outline-none focus:ring-2 focus:ring-indigo-400"
              type="button"
            >
              Cambiar tipo de gráfico
            </button>
          </div>
        </div>
        
        {/* Selector de fecha límite para comparación mensual */}
        {viewMode === 'monthlyComparison' && (
          <div className="mb-6">
            <label className="block text-base font-semibold text-gray-800 mb-3">
              Comparar hasta el día: {cutoffDay} de {getCurrentMonthName()}
            </label>
            <div className="flex gap-4 items-center">
              <div className="flex-1">
                <label className="block text-sm text-gray-600 mb-1">Día:</label>
                <input
                  type="range"
                  min="1"
                  max="31"
                  value={cutoffDay}
                  onChange={(e) => setCutoffDay(parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>1</span>
                  <span>31</span>
                </div>
              </div>
              <div className="w-32">
                <label className="block text-sm text-gray-600 mb-1">Mes:</label>
                <select
                  value={cutoffMonth}
                  onChange={(e) => setCutoffMonth(parseInt(e.target.value))}
                  className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value={1}>Enero</option>
                  <option value={2}>Febrero</option>
                  <option value={3}>Marzo</option>
                  <option value={4}>Abril</option>
                  <option value={5}>Mayo</option>
                  <option value={6}>Junio</option>
                  <option value={7}>Julio</option>
                  <option value={8}>Agosto</option>
                  <option value={9}>Septiembre</option>
                  <option value={10}>Octubre</option>
                  <option value={11}>Noviembre</option>
                  <option value={12}>Diciembre</option>
                </select>
              </div>
            </div>
            <p className="text-sm text-blue-600 mt-2">
              🗓️ Comparando cada mes hasta el {cutoffDay} de {getCurrentMonthName().toLowerCase()}
            </p>
          </div>
        )}

        {/* Selector de día para comparación año vs año */}
        {viewMode === 'yearComparisonByDay' && (
          <div className="mb-6">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-500 p-5 rounded-lg shadow-sm mb-4">
              <p className="text-sm text-blue-800 mb-3">
                🔄 <strong>Comparación Año vs Año por Día:</strong>
              </p>
              <div className="flex gap-6 items-center mb-3">
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-gray-700 mb-2">
                    Primer Año:
                  </label>
                  <select
                    value={dayComparisonYear1 || ''}
                    onChange={(e) => setDayComparisonYear1(Number(e.target.value))}
                    className="w-full p-2 border-2 border-indigo-300 rounded-lg text-sm font-semibold bg-white hover:border-indigo-500 focus:ring-2 focus:ring-indigo-500 transition"
                  >
                    {availableYears.map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>
                <div className="text-xl font-bold text-indigo-600 pt-6">
                  vs
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-gray-700 mb-2">
                    Segundo Año:
                  </label>
                  <select
                    value={dayComparisonYear2 || ''}
                    onChange={(e) => setDayComparisonYear2(Number(e.target.value))}
                    className="w-full p-2 border-2 border-purple-300 rounded-lg text-sm font-semibold bg-white hover:border-purple-500 focus:ring-2 focus:ring-purple-500 transition"
                  >
                    {availableYears.map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>
              </div>
              <p className="text-xs text-blue-700">
                ✅ En cada mes, desde enero hasta {['', 'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'][yearComparisonMonth]}, solo se considerarán los datos desde el día 1 hasta el día {yearComparisonDay}.
              </p>
              <p className="text-xs text-blue-600 mt-1 font-semibold">
                Ejemplo: Si seleccionas día 12, verás Enero 1-12, Febrero 1-12, Marzo 1-12, etc.
              </p>
            </div>
            <label className="block text-base font-semibold text-gray-800 mb-3">
              Comparar hasta el día: {yearComparisonDay} de {['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'][yearComparisonMonth]}
            </label>
            <div className="flex gap-4 items-center">
              <div className="flex-1">
                <label className="block text-sm text-gray-600 mb-1">Día:</label>
                <input
                  type="range"
                  min="1"
                  max="31"
                  value={yearComparisonDay}
                  onChange={(e) => setYearComparisonDay(parseInt(e.target.value))}
                  className="w-full h-2 bg-gradient-to-r from-indigo-400 to-purple-400 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>1</span>
                  <span className="font-bold text-indigo-600">{yearComparisonDay}</span>
                  <span>31</span>
                </div>
              </div>
              <div className="w-32">
                <label className="block text-sm text-gray-600 mb-1">Mes límite:</label>
                <select
                  value={yearComparisonMonth}
                  onChange={(e) => setYearComparisonMonth(parseInt(e.target.value))}
                  className="w-full p-2 border-2 border-indigo-300 rounded-lg text-sm font-semibold bg-white hover:border-indigo-500 focus:ring-2 focus:ring-indigo-500 transition"
                >
                  <option value={1}>Enero</option>
                  <option value={2}>Febrero</option>
                  <option value={3}>Marzo</option>
                  <option value={4}>Abril</option>
                  <option value={5}>Mayo</option>
                  <option value={6}>Junio</option>
                  <option value={7}>Julio</option>
                  <option value={8}>Agosto</option>
                  <option value={9}>Septiembre</option>
                  <option value={10}>Octubre</option>
                  <option value={11}>Noviembre</option>
                  <option value={12}>Diciembre</option>
                </select>
              </div>
            </div>
            <p className="text-sm text-purple-600 mt-3 font-semibold">
              📊 Comparando {dayComparisonYear1} vs {dayComparisonYear2}: desde enero hasta {['', 'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'][yearComparisonMonth]} (días 1 al {yearComparisonDay} en cada mes)
            </p>
          </div>
        )}
        
        {/* Solo mostrar selector de meses/semanas si NO está en modo yearOverYear ni yearComparisonByDay */}
        {viewMode !== 'yearOverYear' && viewMode !== 'yearComparisonByDay' && (
          <div className="mb-6">
            <label className="block text-base font-semibold text-gray-800 mb-3">
              {viewMode === 'months'
                ? 'Seleccionar Meses:'
                : viewMode === 'weeks'
                  ? 'Seleccionar Semanas:'
                  : 'Meses a comparar:'}
            </label>
            <div className="flex flex-wrap gap-4">
              {viewMode === 'months'
                ? MONTHS_ORDER.map((month, index) => (
                    <label key={index} className="flex items-center cursor-pointer hover:text-indigo-700">
                      <input
                        type="checkbox"
                        name="month"
                        value={month}
                        checked={monthsVisible.includes(month)}
                        onChange={() => handleMonthChange(month)}
                        className="h-4 w-4 text-indigo-600 border-gray-400 rounded-lg focus:ring-indigo-500 transition duration-150 hover:scale-110"
                      />
                      <span className="ml-2 text-sm text-gray-800">{month}</span>
                    </label>
                  ))
                : viewMode === 'weeks'
                  ? WEEKS_ORDER.map((week, index) => (
                      <label key={index} className="flex items-center cursor-pointer hover:text-indigo-700">
                        <input
                          type="checkbox"
                          name="week"
                          value={week}
                          checked={weeksVisible.includes(week)}
                          onChange={() => handleWeekChange(week)}
                          className="h-4 w-4 text-indigo-600 border-gray-400 rounded-lg focus:ring-indigo-500 transition duration-150 hover:scale-110"
                        />
                        <span className="ml-2 text-sm text-gray-800">{week}</span>
                      </label>
                    ))
                  : // Modo de comparación mensual - checkboxes para seleccionar meses
                    MONTHS_ORDER.map((month, index) => (
                      <label key={index} className="flex items-center cursor-pointer hover:text-indigo-700">
                        <input
                          type="checkbox"
                          checked={selectedMonthsComparison.includes(month)}
                          onChange={() => handleMonthComparisonToggle(month)}
                          className="h-4 w-4 text-indigo-600 border-gray-400 rounded-lg focus:ring-indigo-500 transition duration-150 hover:scale-110"
                        />
                        <span className="ml-2 text-sm text-gray-800">{month}</span>
                      </label>
                    ))
              }
            </div>
          </div>
        )}

        {/* Información y selectores para modo Año vs Año */}
        {viewMode === 'yearOverYear' && (
          <div className="mb-6">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-500 p-5 rounded-lg shadow-sm mb-4">
              <p className="text-sm text-blue-800 mb-3">
                📊 <strong>Modo Comparación Año vs Año:</strong> Selecciona los años que deseas comparar. Cada tienda aparece con dos líneas/barras: una para cada año.
              </p>
              <div className="flex gap-6 items-center">
                <div className="flex-1">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Primer Año:
                  </label>
                  <select
                    value={comparisonYear1 || ''}
                    onChange={(e) => setComparisonYear1(Number(e.target.value))}
                    className="w-full p-2 border-2 border-indigo-300 rounded-lg text-sm font-semibold bg-white hover:border-indigo-500 focus:ring-2 focus:ring-indigo-500 transition"
                  >
                    {availableYears.map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>
                <div className="text-2xl font-bold text-indigo-600 pt-6">
                  vs
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Segundo Año:
                  </label>
                  <select
                    value={comparisonYear2 || ''}
                    onChange={(e) => setComparisonYear2(Number(e.target.value))}
                    className="w-full p-2 border-2 border-purple-300 rounded-lg text-sm font-semibold bg-white hover:border-purple-500 focus:ring-2 focus:ring-purple-500 transition"
                  >
                    {availableYears.map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Selector de meses para año vs año */}
            <div className="mb-4">
              <label className="block text-base font-semibold text-gray-800 mb-3">
                Seleccionar Meses a Comparar:
              </label>
              <div className="flex flex-wrap gap-4">
                {MONTHS_ORDER.map((month, index) => (
                  <label key={index} className="flex items-center cursor-pointer hover:text-indigo-700">
                    <input
                      type="checkbox"
                      checked={yoyMonthsVisible.includes(month)}
                      onChange={() => handleYoyMonthToggle(month)}
                      className="h-4 w-4 text-indigo-600 border-gray-400 rounded-lg focus:ring-indigo-500 transition duration-150 hover:scale-110"
                    />
                    <span className="ml-2 text-sm text-gray-800">{month}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Mostrar estadísticas o gráfico según la pestaña seleccionada */}
      {showStatistics ? (
        <StatisticsEnhanced
          storeData={storeData}
          selectedStores={selectedStores}
          selectedMetric={selectedMetric}
          viewMode={viewMode}
          dailyDataFromAPI={dailyDataFromAPI}
          selectedYear={selectedYear}
        />
      ) : (() => {
        // En modo yearOverYear y yearComparisonByDay, obtener dinámicamente las claves de datos
        let dataKeys = [];
        if ((viewMode === 'yearOverYear' || viewMode === 'yearComparisonByDay') && chartData.length > 0) {
          const firstDataPoint = chartData[0];
          dataKeys = Object.keys(firstDataPoint).filter(key => key !== 'month' && key !== 'week');
        } else {
          dataKeys = storeData.filter(store => selectedStores[store.name]).map(store => store.name);
        }

        return (
          <div className="bg-white p-8 rounded-2xl shadow-2xl border border-gray-200" style={{ height: 450 }} ref={chartContainerRef}>
            <ResponsiveContainer width="100%" height="100%">
            {chartType === 'line' && (
              <LineChart data={chartData} margin={{ top: 25, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey={viewMode === 'months' || viewMode === 'monthlyComparison' || viewMode === 'yearOverYear' || viewMode === 'yearComparisonByDay' ? 'month' : 'week'} />
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
                {dataKeys.map((key, index) => (
                  <Line
                    key={key}
                    type="monotone"
                    dataKey={key}
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
                ))}
            </LineChart>
          )}
          {chartType === 'bar' && (
            <BarChart data={chartData} margin={{ top: 30, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={viewMode === 'months' || viewMode === 'monthlyComparison' || viewMode === 'yearOverYear' || viewMode === 'yearComparisonByDay' ? 'month' : 'week'} />
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
              {dataKeys.map((key, index) => (
                <Bar
                  key={key}
                  dataKey={key}
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
              ))}
            </BarChart>
          )}
          {chartType === 'area' && (
            <AreaChart data={chartData} margin={{ top: 30, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={viewMode === 'months' || viewMode === 'monthlyComparison' || viewMode === 'yearOverYear' || viewMode === 'yearComparisonByDay' ? 'month' : 'week'} />
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
              {dataKeys.map((key, index) => (
                <Area
                  key={key}
                  type="monotone"
                  dataKey={key}
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
              ))}
            </AreaChart>
          )}
        </ResponsiveContainer>
      </div>
        );
      })()}
    </div>
  );
}