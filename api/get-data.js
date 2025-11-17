import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  // Solo permitir GET
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Obtener datos desde Vercel KV
    const data = await kv.get('daily-data');

    if (!data) {
      // Si no hay datos en KV, devolver estructura vacía
      return res.status(200).json({
        data: {},
        metadata: {
          lastUpdated: null,
          recordsProcessed: 0,
          updateDate: null
        }
      });
    }

    // Configurar headers para caching (opcional)
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate');

    return res.status(200).json(data);

  } catch (error) {
    console.error('Error fetching data from KV:', error);
    return res.status(500).json({
      error: 'Error al obtener los datos',
      details: error.message
    });
  }
}
