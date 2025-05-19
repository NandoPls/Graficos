import PptxGenJS from "pptxgenjs";

const STORE_COLORS = [
  "#1f77b4", "#ff7f0e", "#2ca02c", "#d62728", "#9467bd",
  "#8c564b", "#e377c2", "#7f7f7f", "#bcbd22", "#17becf",
  "#aec7e8"
];

export function generatePPT(storeData, selectedStores, monthsVisible, selectedMetric, chartImage) {
  const pptx = new PptxGenJS();
  const slide = pptx.addSlide();

  const categories = monthsVisible;

  const series = storeData
    .filter(store => selectedStores[store.name])
    .map((store, idx) => {
      const values = categories.map(month => {
        const entry = store.data.find(d => d.month === month);
        return entry ? entry[selectedMetric] : 0;  // SOLO NÚMEROS
      });
      const dataLabels = categories.map(month => {
        const entry = store.data.find(d => d.month === month);
        if (!entry) return '';
        if (selectedMetric === 'conversion') {
          return `${entry[selectedMetric]}%`;
        }
        return `${entry[selectedMetric]}`;
      });
      return {
        name: store.name,
        labels: categories,
        values: values,
        dataLabels: dataLabels,
        color: STORE_COLORS[idx % STORE_COLORS.length],
      };
    });

  slide.addText('Evolución de Tiendas - 2025', { x: 0.5, y: 0.25, fontSize: 18, bold: true });
  let metricLabel = selectedMetric;
  if (selectedMetric === 'flujo') metricLabel = 'Flujo';
  else if (selectedMetric === 'boletas') metricLabel = 'Boletas';
  else if (selectedMetric === 'conversion') metricLabel = 'Conversión (%)';
  slide.addText(`Métrica: ${metricLabel}`, { x: 0.5, y: 0.5, fontSize: 14 });

  if (chartImage) {
    slide.addImage({ data: chartImage, x: 0.5, y: 1, w: 9, h: 4.5 });
  } else {
    slide.addChart(pptx.ChartType.line, series, {
      x: 0.5,
      y: 1,
      w: 9,
      h: 4.5,
      showLegend: true,
      legendPos: 'r',
      chartColors: STORE_COLORS,
      catAxisLabelFontSize: 12,
      valAxisLabelFontSize: 12,
      valAxisMinVal: 0,
      valAxisMaxVal: selectedMetric === 'conversion' ? 100 : undefined, // Opcional para % 
      dataLabelColor: '000000',
      dataLabelFontSize: 10,
      showDataLabels: true,
      showValAxis: true,
      showCatAxis: true,
      valAxisFormatCode: selectedMetric === 'conversion' ? '0%' : undefined,  // si soporta formato porcentaje
    });
  }

  pptx.writeFile('Evolucion_Tiendas_2025.pptx');
}