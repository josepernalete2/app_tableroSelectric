import axios from 'axios';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';

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
const BASE_URL = process.env.EXPO_PUBLIC_API_URL || `http://${HOST_IP}:3001/api`;

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Interceptor de Solicitudes (Request): Inyectar Token de Autenticación de SecureStore
api.interceptors.request.use(
  async (config) => {
    try {
      let token = null;
      if (Platform.OS !== 'web') {
        token = await SecureStore.getItemAsync('auth_token');
      }
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (err) {
      console.warn('[SecureStore Error]:', err);
    }
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
    const status = error.response?.status;
    const errorMsg = error.response?.data?.error || error.response?.data?.message || error.message || 'Error de conexión con el servidor';

    if (status === 401 || status === 403) {
      console.warn(`[MOBILE AUTH ERROR ${status}]: Sesión caducada o sin permisos.`);
    }

    return Promise.reject(new Error(errorMsg));
  }
);

// Servicios API Específicos
export const apiService = {
  // Autenticación
  login: (credentials) => api.post('/login', credentials),

  // Empresas & Proyectos
  getEmpresas: () => api.get('/empresas'),
  getProyectoDetail: (id) => api.get(`/proyectos/${id}`),

  // Tableros & Inspecciones
  getTablerosByEmpresa: (empresaId) => api.get(`/empresas/${empresaId}/tableros`),
  getTableroDetail: (id) => api.get(`/tableros/${id}`),
  createTablero: (data) => api.post('/tableros', data),
  updateTablero: (id, data) => api.put(`/tableros/${id}`, data),

  // Sincronización Offline por Lotes (Batch)
  syncBatch: (mutationsBatch) => api.post('/sync/batch', { mutations: mutationsBatch }),

  // Health Check
  checkServerHealth: () => api.get('/health').catch(() => ({ status: 'offline' })),
};

export default api;
