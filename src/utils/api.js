/**
 * Configuración dinámica y desacoplada de la URL Base de la API
 * Totalmente agnóstica de hosting (Vercel, Railway, Docker, LAN y Vite Dev Proxy).
 * Utiliza rutas relativas para resolver siempre contra el host actual sin CORS.
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

  // 3. Verificación de Capacitor / Emulador Android nativo
  if (typeof window !== 'undefined' && (window.Capacitor || window.location?.protocol === 'capacitor:')) {
    return 'http://10.0.2.2:3001';
  }

  // 4. Por defecto en todos los entornos web (Vercel, Railway, LAN, Tablets, Dev Server con Proxy):
  // Usar ruta relativa para que las peticiones vayan al mismo origen sin errores de CORS
  return '';
};

export const API_BASE_URL = getBaseApiUrl();
export const API_URL = API_BASE_URL ? `${API_BASE_URL}/api` : '/api';

export default API_BASE_URL;

