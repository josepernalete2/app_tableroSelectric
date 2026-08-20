import axios from 'axios';
import { Platform } from 'react-native';

/**
 * Base URL adaptable para entorno React Native / Expo:
 * - En Android Emulator: usa 'http://10.0.2.2:5000/api'
 * - En iOS Simulator / Web: usa 'http://localhost:5000/api'
 * - En Dispositivo Físico Expo Go: Reemplazar por IP Local de la red (ej: http://192.168.1.50:5000/api)
 */
const DEFAULT_HOST = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
const BASE_URL = process.env.EXPO_PUBLIC_API_URL || `http://${DEFAULT_HOST}:5000/api`;

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
