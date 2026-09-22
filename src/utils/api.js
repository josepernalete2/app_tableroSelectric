const getApiBaseUrl = () => {
  // Permitir sobreescritura dinámica en tiempo de ejecución (útil para Capacitor/móvil)
  const storedUrl = typeof window !== 'undefined' && window.localStorage ? window.localStorage.getItem('CUSTOM_API_BASE_URL') : null;
  if (storedUrl) {
    return storedUrl;
  }

  // Permitir configuración mediante variables de entorno de Vite
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  
  if (typeof window === 'undefined') {
    return 'http://localhost:3001';
  }

  const { protocol, hostname, origin } = window.location;
  
  // Verificación de Capacitor / App nativa
  if (window.Capacitor || protocol === 'capacitor:') {
    return 'http://10.0.2.2:3001';
  }
  
  // En servidor de desarrollo Vite, apuntar al puerto configurado (3001 o VITE_API_PORT)
  if (import.meta.env.DEV) {
    const apiPort = import.meta.env.VITE_API_PORT || '3001';
    return `${protocol}//${hostname}:${apiPort}`;
  }
  
  // En despliegue local / producción, consumir desde el mismo origen
  return origin;
};

export const API_BASE_URL = getApiBaseUrl();

export default API_BASE_URL;


