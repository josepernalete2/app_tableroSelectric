import app from '../server/index.js';

export default function handler(req, res) {
  // Asegurar que Express reconozca la ruta /api si Vercel la reescribe
  if (req.url && !req.url.startsWith('/api') && !req.url.startsWith('/health')) {
    req.url = '/api' + req.url;
  }
  
  try {
    return app(req, res);
  } catch (error) {
    console.error('❌ Error no controlado en función Serverless:', error);
    if (!res.headersSent) {
      return res.status(500).json({
        ok: false,
        error: error.message || 'Error interno del servidor en función Serverless'
      });
    }
  }
}

