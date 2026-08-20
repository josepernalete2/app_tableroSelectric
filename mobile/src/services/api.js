import axios from 'axios';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

/**
 * Obtener la IP de la máquina local automáticamente desde Expo Go:
 */
const getLocalHost = () => {
  const hostUri = Constants.expoConfig?.hostUri || Constants.manifest?.debuggerHost;
  if (hostUri) {
    const ip = hostUri.split(':')[0];
    if (ip) return ip;
  }
  return Platform.OS === 'android' ? '10.0.2.2' : '192.168.0.128';
};

const HOST_IP = getLocalHost();
const BASE_URL = process.env.EXPO_PUBLIC_API_URL || `http://${HOST_IP}:5000/api`;

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Interceptor de Solicitudes (Request)
api.interceptors.request.use(
  (config) => {
    // Aquí se pueden agregar tokens de autenticación JWT si están almacenados
    return config;
  },
  (error) => {
    console.error('[API Request Error]:', error);
    return Promise.reject(error);
  }
);

// Interceptor de Respuestas (Response)
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const errorMsg = error.response?.data?.message || error.message || 'Error de conexión con el servidor';
    console.warn('[API Response Error]:', errorMsg);
    return Promise.reject(new Error(errorMsg));
  }
);

// Servicios API Específicos
export const apiService = {
  // Empresas & Proyectos
  getEmpresas: () => api.get('/empresas'),
  getProyectoDetail: (id) => api.get(`/proyectos/${id}`),
  
  // Tableros & Inspecciones
  getTablerosByEmpresa: (empresaId) => api.get(`/empresas/${empresaId}/tableros`),
  getTableroDetail: (id) => api.get(`/tableros/${id}`),
  createTablero: (data) => api.post('/tableros', data),
  updateTablero: (id, data) => api.put(`/tableros/${id}`, data),
  
  // Sincronización Offline
  syncInspecciones: (inspeccionesBatch) => api.post('/inspecciones/batch-sync', inspeccionesBatch),
  
  // Health Check
  checkServerHealth: () => api.get('/health').catch(() => ({ status: 'offline' })),
};

export default api;
