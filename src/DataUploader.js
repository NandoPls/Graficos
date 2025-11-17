import React, { useState } from 'react';

export default function DataUploader({ onDataUpdated }) {
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];

    if (!file) {
      return;
    }

    if (!file.name.endsWith('.csv')) {
      setError('Por favor sube un archivo CSV válido');
      return;
    }

    setUploading(true);
    setError(null);
    setMessage(null);

    try {
      // Leer el archivo CSV
      const csvContent = await file.text();

      // Enviar a la API
      const response = await fetch('/api/upload-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ csvContent }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Error al subir datos');
      }

      setMessage(
        `✅ ${result.message} - ${result.recordsProcessed} registros procesados. Actualizado: ${result.updateDate}`
      );

      // Notificar al componente padre para recargar datos
      if (onDataUpdated) {
        onDataUpdated();
      }

    } catch (err) {
      setError(`Error: ${err.message}`);
    } finally {
      setUploading(false);
      // Limpiar el input para permitir subir el mismo archivo nuevamente
      event.target.value = '';
    }
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-xl mb-6 border border-indigo-200">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">
            Actualizar Datos
          </h3>
          <p className="text-sm text-gray-600">
            Sube el archivo conversion.csv para actualizar los datos
          </p>
        </div>
        <div>
          <label
            htmlFor="csv-upload"
            className={`px-6 py-3 rounded-xl font-semibold cursor-pointer transition duration-150 inline-block shadow-lg ${
              uploading
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white'
            }`}
          >
            {uploading ? 'Subiendo...' : 'Subir CSV'}
          </label>
          <input
            id="csv-upload"
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            disabled={uploading}
            className="hidden"
          />
        </div>
      </div>

      {message && (
        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm">
          {message}
        </div>
      )}

      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
          {error}
        </div>
      )}
    </div>
  );
}
