const getApiBaseUrl = () => {
  // Allow overriding via localStorage at runtime (very useful for Capacitor/mobile apps or specific dev configs)
  const storedUrl = typeof window !== 'undefined' && window.localStorage ? window.localStorage.getItem('CUSTOM_API_BASE_URL') : null;
  if (storedUrl) {
    return storedUrl;
  }

  // Allow configuring via Vite env variables at build time
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  
  const { protocol, hostname, origin } = window.location;
  
  // Capacitor / Native App check
  if (window.Capacitor || protocol === 'capacitor:') {
    return 'http://10.0.2.2:3001'; // Default Android emulator host address
  }
  
  // If running Vite development server, point to backend on port 3001 of the same host
  if (import.meta.env.DEV) {
    return `${protocol}//${hostname}:3001`;
  }
  
  // Production / Single server deployment (Express serving frontend assets on the same port)
  return origin;
};

export const API_BASE_URL = getApiBaseUrl();

export default API_BASE_URL;

