/**
 * Configuración dinámica y desacoplada de la URL Base de la API
 * Compatible con Vercel Serverless (HTTPS puerto 443 sin puerto :3001),
 * Railway Containers y desarrollo local.
 */
const getBaseApiUrl = () => {
  // 1. Sobreescritura manual en tiempo de ejecución (útil para pruebas y Capacitor)
  const storedUrl = typeof window !== 'undefined' && window.localStorage ? window.localStorage.getItem('CUSTOM_API_BASE_URL') : null;
  if (storedUrl && storedUrl.trim() !== '') {
    return storedUrl.trim().replace(/\/$/, '').replace(/\/api$/, '');
  }

  // 2. Si viene definida expresamente por variable de entorno Vite y no está vacía:
  if (import.meta.env.VITE_API_URL && import.meta.env.VITE_API_URL.trim() !== '') {
    return import.meta.env.VITE_API_URL.trim().replace(/\/$/, '').replace(/\/api$/, '');
  }
  if (import.meta.env.VITE_API_BASE_URL && import.meta.env.VITE_API_BASE_URL.trim() !== '') {
    return import.meta.env.VITE_API_BASE_URL.trim().replace(/\/$/, '').replace(/\/api$/, '');
  }

  // 3. Verificación de Capacitor / App nativa móvil
  if (typeof window !== 'undefined' && (window.Capacitor || window.location?.protocol === 'capacitor:')) {
    return 'http://10.0.2.2:3001';
  }

  // 4. En producción (Vercel u otro hosting web):
  if (import.meta.env.PROD) {
    return ''; // Ruta relativa directa: `${API_BASE_URL}/api/...` se resuelve como `/api/...`
  }

  // 5. En desarrollo local (Vite dev server con backend en puerto 3001):
  return 'http://localhost:3001';
};

export const API_BASE_URL = getBaseApiUrl();

export default API_BASE_URL;
