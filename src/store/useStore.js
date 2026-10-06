import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import localforage from 'localforage';
import { API_BASE_URL } from '../utils/api';
import { initialTablerosData } from '../data/mockTableros';

// Configurar localforage
localforage.config({
  name: 'app-tableros-electricos',
  storeName: 'inspecciones_store'
});

export const PREFIX_MAP = {
  GENERADOR: 'gen',
  TABLERO: 'tab',
  SUBESTACION: 'sub',
  PUNTO_SUMINISTRO: 'med',
  PUNTO_MEDICION: 'med',
  TRANSFER: 'trs',
  BANCO_CONDENSADOR: 'bco',
  TRANSFORMADOR: 'tra',
  PUESTA_TIERRA: 'pat',
  SISTEMA_ATERRAMIENTO: 'pat',
  CCM: 'ccm',
  TANQUE_COMBUSTIBLE: 'tk',
  TERMOGRAFICA: 'ter',
  AMBIENTAL_FISICA: 'amb',
  OTRO: 'otr'
};

export const LEGACY_PREFIX_MAP = {
  GEN: 'gen',
  TAB: 'tab',
  SUB: 'sub',
  SUM: 'med',
  PM: 'med',
  ATS: 'trs',
  BC: 'bco',
  BCO: 'bco',
  TRAFO: 'tra',
  TRA: 'tra',
  PAT: 'pat',
  CCM: 'ccm',
  TK: 'tk',
  TER: 'ter',
  AMB: 'amb',
  OTR: 'otr'
};

export const getElementCode = (item, defaultType = 'TABLERO') => {
  if (!item) return '';
  if (typeof item === 'string') {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(item);
    if (!isUuid && /^[a-z0-9_]+-\d+$/i.test(item)) {
      const match = item.match(/^([a-zA-Z0-9_]+)-(\d+)$/);
      if (match) {
        const rawPfx = match[1].toUpperCase();
        const num = match[2];
        const canon = PREFIX_MAP[item] || LEGACY_PREFIX_MAP[rawPfx] || rawPfx.toLowerCase();
        return `${canon}-${num}`;
      }
      return item.toLowerCase();
    }
    if (isUuid) {
      const prefix = PREFIX_MAP[defaultType] || 'tab';
      return `${prefix}-1`;
    }
    return item;
  }

  if (item.codigo && typeof item.codigo === 'string' && item.codigo.trim()) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(item.codigo);
    if (!isUuid) return item.codigo.toLowerCase().trim();
  }
  if (item.datosTecnicos?.codigo && typeof item.datosTecnicos.codigo === 'string' && item.datosTecnicos.codigo.trim()) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(item.datosTecnicos.codigo);
    if (!isUuid) return item.datosTecnicos.codigo.toLowerCase().trim();
  }

  // Si item.id tiene formato de código corto (no UUID)
  if (item.id && typeof item.id === 'string') {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(item.id);
    if (!isUuid) {
      const match = item.id.match(/^([a-zA-Z0-9_]+)-(\d+)$/);
      if (match) {
        const rawPfx = match[1].toUpperCase();
        const num = match[2];
        const canonicalPrefix = PREFIX_MAP[item.tipoElemento] || LEGACY_PREFIX_MAP[rawPfx] || rawPfx.toLowerCase();
        return `${canonicalPrefix}-${num}`;
      }
      return item.id.toLowerCase();
    }
  }

  const tipo = item.tipoElemento || defaultType;
  const prefix = PREFIX_MAP[tipo] || 'tab';
  return `${prefix}-1`;
};

export const cleanElementName = (nombre, id, codigo) => {
  if (!nombre) return codigo || (typeof id === 'string' ? getElementCode(id) : '') || '';
  let cleanName = nombre.trim();
  
  // Limpiar cualquier UUID embebido en el nombre
  cleanName = cleanName.replace(/\s*\((?:ID:\s*)?[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\)/gi, '').trim();
  cleanName = cleanName.replace(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\s*[-:]\s*/gi, '').trim();

  const toClean = [id, codigo].filter(Boolean);
  toClean.forEach(cleanId => {
    if (typeof cleanId === 'string' && cleanId.trim()) {
      const trimmed = cleanId.trim();
      if (cleanName.toLowerCase().startsWith(`${trimmed.toLowerCase()} - `)) {
        cleanName = cleanName.substring(trimmed.length + 3);
      } else if (cleanName.toLowerCase().startsWith(`${trimmed.toLowerCase()}: `)) {
        cleanName = cleanName.substring(trimmed.length + 2);
      }
      const idPattern = new RegExp(`\\s*\\(ID:\\s*${trimmed.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}\\)`, 'gi');
      cleanName = cleanName.replace(idPattern, '').trim();
    }
  });

  return cleanName || codigo || (typeof id === 'string' ? getElementCode(id) : '');
};

export const formatElementTitleWithId = (nombre, id, codigo) => {
  return cleanElementName(nombre, id, codigo);
};

export const sortElementsByOrder = (list = []) => {
  if (!Array.isArray(list)) return [];
  return [...list].sort((a, b) => {
    const rawOrderA = a.orden !== undefined && a.orden !== null ? a.orden : a.datosTecnicos?.orden;
    const rawOrderB = b.orden !== undefined && b.orden !== null ? b.orden : b.datosTecnicos?.orden;
    const orderA = rawOrderA !== undefined && rawOrderA !== null && !isNaN(Number(rawOrderA)) ? Number(rawOrderA) : null;
    const orderB = rawOrderB !== undefined && rawOrderB !== null && !isNaN(Number(rawOrderB)) ? Number(rawOrderB) : null;
    if (orderA !== null && orderB !== null && orderA !== orderB) {
      return orderA - orderB;
    }
    if (orderA !== null && orderB === null) return -1;
    if (orderA === null && orderB !== null) return 1;
    // Orden cronológico estricto por defecto (createdAt ascendente)
    const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return timeA - timeB;
  });
};

export const getNextElementId = (tipoElemento, proyectoIdOrScope, stateParam) => {
  const tipo = tipoElemento || 'TABLERO';
  const prefix = PREFIX_MAP[tipo] || 'elm';

  let state = {};
  let targetProyectoId = null;
  let targetCompanyId = null;

  if (typeof proyectoIdOrScope === 'string') {
    targetProyectoId = proyectoIdOrScope;
    state = stateParam || useStore.getState?.() || {};
  } else if (proyectoIdOrScope && typeof proyectoIdOrScope === 'object') {
    if (proyectoIdOrScope.companies || proyectoIdOrScope.elementosLocales) {
      state = proyectoIdOrScope;
    } else {
      targetProyectoId = proyectoIdOrScope.proyectoId;
      targetCompanyId = proyectoIdOrScope.companyId;
      state = stateParam || useStore.getState?.() || {};
    }
  } else {
    state = stateParam || useStore.getState?.() || {};
  }

  let maxNum = 0;
  let countInScope = 0;

  const validPrefixes = new Set([
    prefix.toLowerCase(),
    ...(Object.entries(LEGACY_PREFIX_MAP).filter(([_, v]) => v === prefix).map(([k]) => k.toLowerCase()))
  ]);

  const checkItem = (item) => {
    if (!item) return;
    const itemTipo = item.tipoElemento || (item.tipoPlantilla === 'INSPECCION_SUBESTACION' ? 'SUBESTACION' : (item.tipoPlantilla === 'PUNTO_MEDICION' ? 'PUNTO_MEDICION' : (item.tipoPlantilla === 'CCM' ? 'CCM' : null)));
    
    const isSameType = itemTipo && (itemTipo === tipo || PREFIX_MAP[itemTipo] === prefix);
    const candidates = [item.codigo, item.id, item.datosTecnicos?.codigo].filter(Boolean);
    let matchedPrefix = false;

    for (const code of candidates) {
      if (typeof code === 'string') {
        const parts = code.toLowerCase().split('-');
        if (parts.length >= 2) {
          const num = parseInt(parts[parts.length - 1], 10);
          const pfx = parts.slice(0, -1).join('-');
          if (validPrefixes.has(pfx) && !isNaN(num)) {
            matchedPrefix = true;
            if (num > maxNum) maxNum = num;
          }
        }
      }
    }

    if (isSameType || matchedPrefix) {
      countInScope++;
    }
  };

  if (targetProyectoId && state.companies) {
    for (const company of state.companies) {
      const proj = (company.proyectos || []).find((p) => p.id === targetProyectoId);
      if (proj) {
        (proj.elementosUnifilares || proj.tableros || []).forEach(checkItem);
        (proj.inspeccionesSubestacion || proj.subestaciones || []).forEach(checkItem);
        (proj.puntosMedicion || []).forEach(checkItem);
        (proj.ccmList || []).forEach(checkItem);
        break;
      }
    }
  } else if (targetCompanyId && state.companies) {
    const comp = state.companies.find((c) => c.id === targetCompanyId);
    if (comp) {
      (comp.elementosUnifilares || []).forEach(checkItem);
      (comp.proyectos || []).forEach(p => {
        (p.elementosUnifilares || p.tableros || []).forEach(checkItem);
        (p.inspeccionesSubestacion || p.subestaciones || []).forEach(checkItem);
        (p.puntosMedicion || []).forEach(checkItem);
        (p.ccmList || []).forEach(checkItem);
      });
    }
  } else {
    (state.companies || []).forEach(c => {
      (c.elementosUnifilares || []).forEach(checkItem);
      (c.proyectos || []).forEach(p => {
        (p.elementosUnifilares || p.tableros || []).forEach(checkItem);
        (p.inspeccionesSubestacion || p.subestaciones || []).forEach(checkItem);
        (p.puntosMedicion || []).forEach(checkItem);
        (p.ccmList || []).forEach(checkItem);
      });
    });

    (state.elementosLocales || []).forEach(checkItem);
    (state.subestacionesLocales || []).forEach(checkItem);
    (state.puntosMedicionLocales || []).forEach(checkItem);
    (state.ccmLocales || []).forEach(checkItem);
  }

  const nextNum = Math.max(maxNum, countInScope) + 1;
  return `${prefix}-${nextNum}`;
};

// Almacenamiento personalizado para localforage (soporta objetos Blob binarios)
const localForageStorage = {
  getItem: async (name) => {
    const value = await localforage.getItem(name);
    return value;
  },
  setItem: async (name, value) => {
    await localforage.setItem(name, value);
  },
  removeItem: async (name) => {
    await localforage.removeItem(name);
  }
};

const initialCompanies = [
  {
    id: 'c-1',
    nombre: 'Clínica Valentina Canabal',
    proyectos: [
      {
        id: 'p-1',
        nombre: 'Proyecto Diagrama Unifilar y Tableros 2025',
        descripcion: 'Estudio de transformadores, generadores, tableros y malla de puesta a tierra.',
        elementosUnifilares: [
          {
            id: 'TAB-1',
            codigo: 'tab-1',
            nombre: 'Tablero Principal (No. 20)',
            tipoElemento: 'TABLERO',
            ubicacion: 'SOTANO SALA DE TABLEROS',
            alimentadoPor: 'ATS SOTANO (TRANSFERENCIA AUTOMATICA) transferecia 580',
            foto: null,
            fotoBlob: null,
            observacionesGenerales: 'SALEN ACOMETIDAS 1 X 500 Y 1X250 MCM DE LA BARRA PARTE INFERIOR. LA ACOMETIDA 250 MCM VA A CAJA CON UN BREAKER AL LADO DEL TABLERO PRINCIPAL. INTERRUPTOR EATON, Ki400, 350 A. SALEN UNA ACOMETIDA 4/0 QUE ALIMENTA TRANSFERENCIA 160. LA ACOMETIDA 500 MCM VA A UNA CAJA AL LADO DEL TABLERO PRINCIPAL. INTERRUPTOR ABB, TIPO 6520, 400 A, SALEN 2X500 Y ALIMENTAN TABLERO EN PRIMER PISO.',
            datosTecnicos: {
              codigo: 'tab-1',
              maxPoles: 30,
              tipoTablero: 'SUPERFICIAL',
              voltajeAcometida: '211.5 / 207.4 / 208.6 V',
              barrasPrincipales: { ia: '', ib: '', ic: '' },
              breakerPrincipal: { marca: 'SIN BREAKER', tipo: '', amp: '' },
              voltaje: { va: '211,5', vb: '207,4', vc: '208,6' },
              acometida: '3X500 MCM',
              neutroLlegada: { calibre: '1X500', observaciones: '' },
              puestaTierra: { calibre: 'SOLIDO #4', observaciones: 'LLEGA SOLIDO #4. BUSCAR TANQUILLA DE MALLA A TIERRA' }
            },
            proyectoId: 'p-1',
            companyId: 'c-1',
            createdAt: new Date().toISOString()
          },
          {
            id: 'ATS-1',
            codigo: 'trs-1',
            nombre: 'Transferencia 580 Estacionamiento',
            tipoElemento: 'TRANSFER',
            ubicacion: 'ESTACIONAMIENTO',
            alimentadoPor: 'GENERADOR 580 1 + GENERADOR 580 2',
            foto: null,
            fotoBlob: null,
            observacionesGenerales: 'TRANSFERENCIA ALIMENTADA POR LOS DOS GENERADORES',
            datosTecnicos: {
              codigo: 'trs-1',
              modelo: 'DOMOSA',
              tipoTransferencia: 'YUYE-YES1 3200/4P',
              amperaje: '3200',
              voltaje: { vab: '', vac: '', vbc: '' },
              alimentacionGenerador1: '2(3X500)',
              alimentacionGenerador2: '2(3X500)',
              carga: '2(3X500)',
              neutro: '500',
              tierra: 'NO'
            },
            proyectoId: 'p-1',
            companyId: 'c-1',
            createdAt: new Date().toISOString()
          },
          {
            id: 'ATS-2',
            codigo: 'trs-2',
            nombre: 'Transferencia 580 Sótano Sala Técnica',
            tipoElemento: 'TRANSFER',
            ubicacion: 'SOTANO SALA TECNICA',
            alimentadoPor: 'TRANSFERENCIA DOMOSA + CORPOELEC',
            foto: null,
            fotoBlob: null,
            observacionesGenerales: 'PASA DIRECTAMENTE AL TABLERO .',
            datosTecnicos: {
              codigo: 'trs-2',
              modelo: 'NO TIENE',
              tipoTransferencia: 'NO TIENE',
              amperaje: '',
              voltaje: { vab: '211', vac: '208', vbc: '209' },
              alimentacionCorpoelec: '3X500',
              alimentacionTransfDomosa: '2X500',
              carga: '3X500',
              neutro: '500',
              tierra: 'NO'
            },
            proyectoId: 'p-1',
            companyId: 'c-1',
            createdAt: new Date().toISOString()
          },
          {
            id: 'GEN-1',
            codigo: 'gen-1',
            nombre: 'Generador No. 1 DOMOSA 580 KVA',
            tipoElemento: 'GENERADOR',
            ubicacion: 'ESTACIONAMIENTO',
            alimentadoPor: 'TRANSFERENCIA DOMOSA EN ESTACIONAMIENTO',
            foto: null,
            fotoBlob: null,
            observacionesGenerales: 'Generador No. 1 DOMOSA 580 KVA ubicado en el estacionamiento.',
            datosTecnicos: {
              codigo: 'gen-1',
              kva: '580 KVA',
              marca: 'DOMOSA',
              fases: '3',
              voltaje: '208 VOL',
              amperaje: '',
              fp: '',
              combustible: 'GALONES',
              interruptor: { marca: 'CHINT', tipo: '', amp: '1600', condFase: '2(3X500)', condNeutro: '500' }
            },
            proyectoId: 'p-1',
            companyId: 'c-1',
            createdAt: new Date().toISOString()
          },
          {
            id: 'GEN-2',
            codigo: 'gen-2',
            nombre: 'Generador No. 2 DOMOSA 580 KVA',
            tipoElemento: 'GENERADOR',
            ubicacion: 'ESTACIONAMIENTO',
            alimentadoPor: 'TRANSFERENCIA DOMOSA EN ESTACIONAMIENTO',
            foto: null,
            fotoBlob: null,
            observacionesGenerales: 'Generador No. 2 DOMOSA 580 KVA ubicado en el estacionamiento.',
            datosTecnicos: {
              codigo: 'gen-2',
              kva: '580 KVA',
              marca: 'DOMOSA',
              fases: '3',
              voltaje: '208 VOL',
              amperaje: '800 AMP',
              fp: '',
              combustible: 'GALONES',
              interruptor: { marca: 'CHINT', tipo: '', amp: '1600', condFase: '2(3X500)', condNeutro: '500' }
            },
            proyectoId: 'p-1',
            companyId: 'c-1',
            createdAt: new Date().toISOString()
          }
        ],
        inspeccionesSubestacion: [],
        createdAt: new Date().toISOString()
      }
    ]
  },
  {
    id: 'c-2',
    nombre: 'Alimentos Polar Planta Turmero',
    proyectos: []
  }
];

const getInitialUser = () => {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem('user') : null;
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
};

const getInitialToken = () => {
  try {
    return typeof localStorage !== 'undefined' ? (localStorage.getItem('token') || null) : null;
  } catch (e) {
    return null;
  }
};

export const useStore = create(
  persist(
    (set, get) => ({
      user: getInitialUser(),
      token: getInitialToken(),
      usersList: [
        { id: 'u-1', username: 'admin1', role: 'ADMIN' },
        { id: 'u-2', username: 'admin2', role: 'ADMIN' }
      ],
      companies: initialCompanies,
      proyectosLocales: [],
      elementosLocales: [],
      subestacionesLocales: [],
      syncQueue: [],
      socket: null,
      toast: { show: false, message: '', type: 'success', action: null },
      conflictosCircuitos: [],
      isPanelConflictosOpen: false,

      showToast: (message, type = 'success', action = null) => set({ toast: { show: true, message, type, action } }),
      hideToast: () => set((state) => ({ toast: { ...state.toast, show: false } })),
      setSocket: (socket) => set({ socket }),
      setPanelConflictosOpen: (isOpen) => set({ isPanelConflictosOpen: isOpen }),

      registrarConflictoCircuito: (conflicto) => set((state) => {
        const nuevoConflicto = {
          id: conflicto.id || `conf_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          timestamp: new Date().toISOString(),
          resuelto: false,
          ...conflicto
        };
        // Evitar duplicados idénticos en cola
        const filtered = (state.conflictosCircuitos || []).filter(c => 
          !(c.tableroId === nuevoConflicto.tableroId && JSON.stringify(c.polos) === JSON.stringify(nuevoConflicto.polos))
        );
        return {
          conflictosCircuitos: [nuevoConflicto, ...filtered]
        };
      }),

      resolverConflictoCircuito: (id) => set((state) => ({
        conflictosCircuitos: (state.conflictosCircuitos || []).filter(c => c.id !== id)
      })),

      limpiarConflictosCircuitos: () => set({ conflictosCircuitos: [] }),

      handleAuthError: (status, errorMsg = '') => {
        if (
          status === 401 || 
          status === 403 || 
          errorMsg?.toLowerCase().includes('expirado') || 
          errorMsg?.toLowerCase().includes('inválido') || 
          errorMsg?.toLowerCase().includes('token')
        ) {
          try {
            if (typeof window !== 'undefined') {
              localStorage.removeItem('token');
              localStorage.removeItem('user');
              localStorage.removeItem('usuario');
              sessionStorage.clear();
            }
          } catch (e) {}

          set({ user: null, token: null });

          if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
            window.location.replace('/login');
          }
        }
      },

      fetchUsersList: async () => {
        try {
          const { token } = get();
          if (!token || token === 'mock-offline-token') return;
          const res = await fetch(`${API_BASE_URL}/api/users`, {
            headers: {
              ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            }
          });
          if (res.status === 401 || res.status === 403) {
            get().handleAuthError(res.status);
            return;
          }
          const data = await res.json();
          if (data.ok) {
            set({ usersList: data.data });
          }
        } catch (e) {
          console.error('Error al cargar lista de usuarios:', e);
        }
      },

      fetchMessagesList: async (userId) => {
        try {
          const { token } = get();
          if (!token || token === 'mock-offline-token') return;
          const res = await fetch(`${API_BASE_URL}/api/messages/${userId}`, {
            headers: {
              ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            }
          });
          if (res.status === 401 || res.status === 403) {
            get().handleAuthError(res.status);
            return;
          }
          const data = await res.json();
          if (data.ok) {
            set({ messages: data.data });
          }
        } catch (e) {
          console.error('Error al cargar lista de mensajes:', e);
        }
      },

      cargarDatosServidor: async () => {
        return get().pullInitialData();
      },

      pullInitialData: async () => {
        const { token, user } = get();
        if (!token || !navigator.onLine || token === 'mock-offline-token') return;

        try {
          // 1. Intentar descargar datos vía /api/sync/pull
          const res = await fetch(`${API_BASE_URL}/api/sync/pull`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });

          if (res.status === 401 || res.status === 403) {
            get().handleAuthError(res.status);
            return { success: false, error: 'Token expirado' };
          }

          if (res.ok) {
            const data = await res.json();
            if (data.ok && Array.isArray(data.data) && data.data.length > 0) {
              get().importCompanies(data.data);
              return { success: true, count: data.data.length };
            }
          }

          // 2. Fallback: Si es ADMIN y pull no devolvió empresas, intentar export de base de datos
          if (user && user.role === 'ADMIN') {
            const resBackup = await fetch(`${API_BASE_URL}/api/backup/export`, {
              headers: {
                'Authorization': `Bearer ${token}`
              }
            });
            if (resBackup.status === 401 || resBackup.status === 403) {
              get().handleAuthError(resBackup.status);
              return { success: false, error: 'Token expirado' };
            }
            if (resBackup.ok) {
              const dataBackup = await resBackup.json();
              if (dataBackup.ok && Array.isArray(dataBackup.data) && dataBackup.data.length > 0) {
                get().importCompanies(dataBackup.data);
                return { success: true, count: dataBackup.data.length };
              }
            }
          }
        } catch (e) {
          console.error('Error al sincronizar datos iniciales desde el servidor:', e);
        }
      },

      login: async (username, password) => {
        const cleanUsername = (username || '').trim();
        let networkFailed = false;

        if (typeof navigator === 'undefined' || navigator.onLine) {
          try {
            const res = await fetch(`${API_BASE_URL}/api/login`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ username: cleanUsername, password })
            });

            const data = await res.json().catch(() => ({}));

            if (res.ok && data.ok) {
              // Cachear usuario para soporte offline posterior
              const currentUsers = get().usersList || [];
              const userIndex = currentUsers.findIndex(
                u => (u.username || '').toLowerCase() === data.user.username.toLowerCase()
              );
              let updatedUsers = [...currentUsers];
              const userEntry = {
                id: data.user.id,
                username: data.user.username,
                role: data.user.role,
                companyId: data.user.companyId,
                cachedAt: new Date().toISOString()
              };

              if (userIndex >= 0) {
                updatedUsers[userIndex] = { ...updatedUsers[userIndex], ...userEntry };
              } else {
                updatedUsers.push(userEntry);
              }

              try {
                if (typeof localStorage !== 'undefined') {
                  localStorage.setItem('user', JSON.stringify(data.user));
                  localStorage.setItem('token', data.token);
                }
              } catch (e) {}

              set({ 
                user: data.user, 
                token: data.token,
                usersList: updatedUsers
              });

              get().fetchMessagesList(data.user.id);
              get().fetchUsersList();
              get().pullInitialData();
              return { success: true, user: data.user };
            }

            // Si el servidor respondió con error de credenciales explícito (401, 400, 403)
            if (res.status === 401 || res.status === 400 || res.status === 403) {
              return { 
                success: false, 
                error: data.error || 'Usuario o contraseña incorrectos.' 
              };
            }

            if (res.status >= 500) {
              return {
                success: false,
                error: data.error || `Error en el servidor (${res.status}). Intente nuevamente.`
              };
            }
          } catch (e) {
            console.warn('⚠️ Error de conexión con el servidor central al iniciar sesión:', e);
            networkFailed = true;
          }
        } else {
          networkFailed = true;
        }

        // Fallback offline: solo si la red falló o el dispositivo está desconectado
        if (networkFailed) {
          const list = get().usersList || [];
          const inputKey = cleanUsername.toLowerCase();
          const found = list.find((u) => {
            const userKey = (u.username || u.email || '').toLowerCase().trim();
            return userKey === inputKey ||
                   (userKey === 'admin1' && inputKey === 'admin1@selectric.com') ||
                   (userKey === 'admin1@selectric.com' && inputKey === 'admin1');
          });

          if (found) {
            set({ 
              user: { id: found.id, username: found.username, role: found.role, companyId: found.companyId }, 
              token: 'mock-offline-token' 
            });
            get().pullInitialData();
            return { success: true, user: found, isOffline: true };
          }

          return { 
            success: false, 
            error: 'Sin conexión al servidor central. Inicie sesión con internet por primera vez para habilitar el modo offline para este usuario.',
            isNetworkError: true 
          };
        }

        return { success: false, error: 'Usuario o contraseña incorrectos.' };
      },

      logout: () => {
        try {
          if (typeof window !== 'undefined') {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            localStorage.removeItem('usuario');
            sessionStorage.clear();
          }
        } catch (e) {}
        set({ user: null, token: null });
        if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
          window.location.replace('/login');
        }
      },

      addUser: async (userObj) => {
        const currentUser = get().user;
        if (!currentUser || currentUser.role !== 'ADMIN') {
          return { success: false, error: 'Acción permitida únicamente para administradores.' };
        }

        const usernameLower = userObj.username.toLowerCase().trim();
        const exists = (get().usersList || []).some(
          (u) => (u.username || u.email || '').toLowerCase().trim() === usernameLower
        );
        if (exists) {
          return { success: false, error: 'Ya existe un usuario con este nombre de usuario.' };
        }

        const newUser = {
          id: `user-${Date.now()}`,
          username: userObj.username.trim(),
          password: userObj.password,
          role: userObj.role || 'WORKER',
          companyId: userObj.role === 'CLIENT' ? userObj.companyId : null
        };

        set((state) => ({
          usersList: [...(state.usersList || []), newUser]
        }));

        try {
          const { token } = get();
          const res = await fetch(`${API_BASE_URL}/api/users`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            },
            body: JSON.stringify(newUser)
          });
          const data = await res.json();
          if (data.ok) {
            get().fetchUsersList();
          }
        } catch (e) {
          console.error('Error sincronizando nuevo usuario:', e);
        }

        return { success: true, user: newUser };
      },

      updateUser: async (userId, updatedData) => {
        const currentUser = get().user;
        if (!currentUser || currentUser.role !== 'ADMIN') {
          return { success: false, error: 'Acción permitida únicamente para administradores.' };
        }

        const usernameLower = updatedData.username?.toLowerCase().trim();
        const existsOther = (get().usersList || []).some(
          (u) => u.id !== userId && (u.username || u.email || '').toLowerCase().trim() === usernameLower
        );
        if (existsOther) {
          return { success: false, error: 'Ya existe otro usuario con este nombre de usuario.' };
        }

        const mergedData = {
          ...updatedData,
          companyId: updatedData.role === 'CLIENT' ? updatedData.companyId : null
        };

        set((state) => {
          const updatedList = (state.usersList || []).map((u) => {
            if (u.id === userId) {
              return { ...u, ...mergedData };
            }
            return u;
          });

          const currentLoggedUser = updatedList.find((u) => u.id === state.user?.id);

          return {
            usersList: updatedList,
            user: currentLoggedUser || state.user
          };
        });

        try {
          const { token } = get();
          const res = await fetch(`${API_BASE_URL}/api/users/${userId}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            },
            body: JSON.stringify(mergedData)
          });
          const data = await res.json();
          if (data.ok) {
            get().fetchUsersList();
          }
        } catch (e) {
          console.error('Error actualizando usuario en base de datos:', e);
        }

        return { success: true };
      },

      deleteUser: async (userId) => {
        const currentUser = get().user;
        if (!currentUser || currentUser.role !== 'ADMIN') {
          return { success: false, error: 'Acción permitida únicamente para administradores.' };
        }

        const userToDelete = (get().usersList || []).find((u) => u.id === userId);
        if (userToDelete && (userToDelete.username || '').toLowerCase() === 'admin1') {
          return { success: false, error: 'El usuario administrador principal (admin1) está protegido y no se puede eliminar.' };
        }

        if (currentUser.id === userId) {
          return { success: false, error: 'No puedes eliminar tu propia cuenta de usuario activo.' };
        }

        set((state) => ({
          usersList: (state.usersList || []).filter((u) => u.id !== userId)
        }));

        try {
          const { token } = get();
          const res = await fetch(`${API_BASE_URL}/api/users/${userId}`, {
            method: 'DELETE',
            headers: {
              ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            }
          });
          const data = await res.json();
          if (data.ok) {
            get().fetchUsersList();
          }
        } catch (e) {
          console.error('Error eliminando usuario en base de datos:', e);
        }

        return { success: true };
      },

      updateEmpresa: async (companyId, updatedData) => {
        set((state) => ({
          companies: state.companies.map((c) => {
            if (c.id === companyId) {
              return { ...c, ...updatedData };
            }
            return c;
          })
        }));

        if (navigator.onLine) {
          try {
            const { token } = get();
            await fetch(`${API_BASE_URL}/api/empresas/${companyId}`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {})
              },
              body: JSON.stringify(updatedData)
            });
          } catch (e) {
            console.error('Error al actualizar empresa en el servidor:', e);
          }
        }
      },

      fetchAlimentadores: async (proyectoId) => {
        if (navigator.onLine) {
          try {
            const { token } = get();
            const res = await fetch(`${API_BASE_URL}/api/alimentadores?proyectoId=${proyectoId}`, {
              headers: {
                ...(token ? { 'Authorization': `Bearer ${token}` } : {})
              }
            });
            const data = await res.json();
            if (data.ok) {
              set((state) => ({
                companies: state.companies.map((c) => ({
                  ...c,
                  proyectos: (c.proyectos || []).map((p) => {
                    if (p.id === proyectoId) {
                      return { ...p, alimentadores: data.data };
                    }
                    return p;
                  })
                }))
              }));
            }
          } catch (e) {
            console.error('Error al obtener alimentadores:', e);
          }
        }
      },

      addAlimentador: async (alimentadorData) => {
        const { proyectoId } = alimentadorData;
        const newAlimentador = {
          id: alimentadorData.id || crypto.randomUUID(),
          ...alimentadorData
        };

        set((state) => ({
          companies: state.companies.map((c) => ({
            ...c,
            proyectos: (c.proyectos || []).map((p) => {
              if (p.id === proyectoId) {
                const currentAlims = p.alimentadores || [];
                return { ...p, alimentadores: [...currentAlims, newAlimentador] };
              }
              return p;
            })
          }))
        }));

        if (navigator.onLine) {
          try {
            const { token } = get();
            await fetch(`${API_BASE_URL}/api/alimentadores`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {})
              },
              body: JSON.stringify(newAlimentador)
            });
          } catch (e) {
            console.error('Error al guardar alimentador:', e);
          }
        }
      },

      deleteAlimentador: async (proyectoId, alimentadorId) => {
        set((state) => ({
          companies: state.companies.map((c) => ({
            ...c,
            proyectos: (c.proyectos || []).map((p) => {
              if (p.id === proyectoId) {
                const currentAlims = p.alimentadores || [];
                return { ...p, alimentadores: currentAlims.filter(a => a.id !== alimentadorId) };
              }
              return p;
            })
          }))
        }));

        if (navigator.onLine) {
          try {
            const { token } = get();
            await fetch(`${API_BASE_URL}/api/alimentadores/${alimentadorId}`, {
              method: 'DELETE',
              headers: {
                ...(token ? { 'Authorization': `Bearer ${token}` } : {})
              }
            });
          } catch (e) {
            console.error('Error al eliminar alimentador:', e);
          }
        }
      },

      updateTableroAlimentador: (proyectoId, tableroId, alimentadorId) => {
        set((state) => {
          const updateElement = (e) => {
            if (e.id === tableroId) {
              return {
                ...e,
                datosTecnicos: {
                  ...e.datosTecnicos,
                  alimentadorId
                }
              };
            }
            return e;
          };

          const updatedCompanies = state.companies.map((c) => {
            if (!proyectoId) {
              const list = c.elementosUnifilares || [];
              return { ...c, elementosUnifilares: list.map(updateElement) };
            }
            return {
              ...c,
              proyectos: (c.proyectos || []).map((p) => {
                if (p.id === proyectoId) {
                  const list = p.elementosUnifilares || p.tableros || [];
                  return { ...p, elementosUnifilares: list.map(updateElement) };
                }
                return p;
              })
            };
          });

          // Obtener el elemento locales para encolar
          const allElements = state.elementosLocales || [];
          const updatedElement = allElements.find(e => e.id === tableroId);
          let payload = null;
          if (updatedElement) {
            payload = {
              ...updatedElement,
              datosTecnicos: {
                ...updatedElement.datosTecnicos,
                alimentadorId
              }
            };
          }

          return {
            companies: updatedCompanies,
            elementosLocales: (state.elementosLocales || []).map(updateElement),
            syncQueue: payload ? [...state.syncQueue, {
              id: tableroId,
              tipo: 'ELEMENTO_UNIFILAR',
              companyId: updatedElement ? (updatedElement.companyId || updatedElement.empresaId) : null,
              payload
            }] : state.syncQueue
          };
        });
      },

      addCompany: async (companyData) => {
        const newCompany = {
          id: companyData.id || `company-${Date.now()}`,
          nombre: companyData.nombre,
          rif: companyData.rif,
          direccionFiscal: companyData.direccionFiscal,
          direccion: companyData.direccion || companyData.direccionFiscal || '',
          gerente1Nombre: companyData.gerente1Nombre || null,
          gerente1Telefono: companyData.gerente1Telefono || null,
          gerente1Email: companyData.gerente1Email || null,
          gerente2Nombre: companyData.gerente2Nombre || null,
          gerente2Telefono: companyData.gerente2Telefono || null,
          gerente2Email: companyData.gerente2Email || null,
          proyectos: []
        };

        set((state) => ({
          companies: [...state.companies, newCompany]
        }));

        if (navigator.onLine) {
          try {
            const { token } = get();
            await fetch(`${API_BASE_URL}/api/empresas`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {})
              },
              body: JSON.stringify(newCompany)
            });
          } catch (e) {
            console.error('Error al registrar empresa en el servidor:', e);
          }
        }
      },

      deleteCompany: async (companyId) => {
        set((state) => ({
          companies: state.companies.filter((c) => c.id !== companyId),
          elementosLocales: (state.elementosLocales || []).filter((e) => e.companyId !== companyId && e.empresaId !== companyId),
          subestacionesLocales: (state.subestacionesLocales || []).filter((s) => s.empresaId !== companyId),
          puntosMedicionLocales: (state.puntosMedicionLocales || []).filter((p) => p.empresaId !== companyId),
          ccmLocales: (state.ccmLocales || []).filter((c) => c.empresaId !== companyId)
        }));

        if (navigator.onLine) {
          try {
            const { token } = get();
            await fetch(`${API_BASE_URL}/api/empresas/${companyId}`, {
              method: 'DELETE',
              headers: {
                ...(token ? { 'Authorization': `Bearer ${token}` } : {})
              }
            });
          } catch (e) {
            console.error('Error al eliminar empresa en el servidor:', e);
          }
        }
      },

      updateProyecto: async (companyId, proyectoId, updatedData) => {
        const { companies } = get();
        const company = companies.find((c) => c.id === companyId);
        const dir = updatedData.direccion !== undefined ? updatedData.direccion : (updatedData.ubicacion !== undefined ? updatedData.ubicacion : '');
        const respNom = updatedData.responsableNombre !== undefined ? updatedData.responsableNombre : (typeof updatedData.responsable === 'object' ? updatedData.responsable?.nombre : updatedData.responsable) || '';
        const respTel = updatedData.responsableTelefono !== undefined ? updatedData.responsableTelefono : (typeof updatedData.responsable === 'object' ? updatedData.responsable?.telefono : '') || '';
        const respMail = updatedData.responsableEmail !== undefined ? updatedData.responsableEmail : (typeof updatedData.responsable === 'object' ? updatedData.responsable?.email : '') || '';

        const normalizedData = {
          ...updatedData,
          direccion: dir || (company?.direccion || company?.ubicacion || ''),
          ubicacion: dir || (company?.direccion || company?.ubicacion || ''),
          responsableNombre: respNom,
          responsableTelefono: respTel,
          responsableEmail: respMail,
          responsable: {
            nombre: respNom,
            telefono: respTel,
            email: respMail
          }
        };

        set((state) => ({
          companies: state.companies.map((c) => {
            if (c.id === companyId) {
              return {
                ...c,
                proyectos: (c.proyectos || []).map((p) => {
                  if (p.id === proyectoId) {
                    return { ...p, ...normalizedData };
                  }
                  return p;
                })
              };
            }
            return c;
          }),
          proyectosLocales: (state.proyectosLocales || []).map((p) => {
            if (p.id === proyectoId) {
              return { ...p, ...normalizedData };
            }
            return p;
          }),
          syncQueue: [...state.syncQueue, {
            id: proyectoId,
            tipo: 'PROYECTO',
            companyId,
            payload: { id: proyectoId, ...normalizedData, empresaId: companyId }
          }]
        }));

        if (navigator.onLine) {
          try {
            const { token } = get();
            await fetch(`${API_BASE_URL}/api/proyectos/${proyectoId}`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                ...(token && token !== 'mock-offline-token' ? { 'Authorization': `Bearer ${token}` } : {})
              },
              body: JSON.stringify(normalizedData)
            });
          } catch (e) {
            console.error('Error al actualizar proyecto en el servidor:', e);
          }
        }
      },

      deleteProyecto: async (companyId, proyectoId) => {
        set((state) => ({
          companies: state.companies.map((c) => {
            if (c.id === companyId) {
              return {
                ...c,
                proyectos: (c.proyectos || []).filter((p) => p.id !== proyectoId)
              };
            }
            return c;
          }),
          proyectosLocales: (state.proyectosLocales || []).filter((p) => p.id !== proyectoId),
          syncQueue: state.syncQueue.filter((item) => item.id !== proyectoId)
        }));

        if (navigator.onLine) {
          try {
            const { token } = get();
            await fetch(`${API_BASE_URL}/api/proyectos/${proyectoId}`, {
              method: 'DELETE',
              headers: {
                ...(token ? { 'Authorization': `Bearer ${token}` } : {})
              }
            });
          } catch (e) {
            console.error('Error al eliminar proyecto del servidor:', e);
          }
        }
      },

      importCompanies: (companiesList) => {
        const enrichedList = companiesList.map((c) => ({
          ...c,
          proyectos: (c.proyectos || []).map((p) => {
            const respNom = p.responsableNombre !== undefined ? p.responsableNombre : (typeof p.responsable === 'object' ? p.responsable?.nombre : p.responsable) || '';
            const respTel = p.responsableTelefono !== undefined ? p.responsableTelefono : (typeof p.responsable === 'object' ? p.responsable?.telefono : '') || '';
            const respMail = p.responsableEmail !== undefined ? p.responsableEmail : (typeof p.responsable === 'object' ? p.responsable?.email : '') || '';
            const dir = p.direccion || p.ubicacion || '';
            return {
              ...p,
              direccion: dir,
              ubicacion: dir,
              responsableNombre: respNom,
              responsableTelefono: respTel,
              responsableEmail: respMail,
              responsable: {
                nombre: respNom,
                telefono: respTel,
                email: respMail
              },
              elementosUnifilares: p.elementosUnifilares || p.tableros || [],
              inspeccionesSubestacion: p.inspeccionesSubestacion || p.subestaciones || [],
              puntosMedicion: p.puntosMedicion || [],
              ccmList: p.ccmList || []
            };
          })
        }));
        set({ companies: enrichedList });
      },

      addProyecto: async (nombre, descripcion, companyId, extraData = {}) => {
        const { companies } = get();
        const company = companies.find((c) => c.id === companyId);
        if (!company) return { success: false, error: 'Empresa no encontrada.' };

        const uuidId = crypto.randomUUID();
        const dir = extraData.direccion || extraData.ubicacion || company.direccion || company.ubicacion || '';
        const respNom = extraData.responsableNombre || (typeof extraData.responsable === 'object' ? extraData.responsable?.nombre : extraData.responsable) || company.contactoPrincipal || company.responsable || '';
        const respTel = extraData.responsableTelefono || (typeof extraData.responsable === 'object' ? extraData.responsable?.telefono : '') || company.telefono || '';
        const respMail = extraData.responsableEmail || (typeof extraData.responsable === 'object' ? extraData.responsable?.email : '') || company.email || '';

        const nuevoProyecto = {
          id: uuidId,
          nombre,
          descripcion: descripcion || '',
          direccion: dir,
          ubicacion: dir,
          responsableNombre: respNom,
          responsableTelefono: respTel,
          responsableEmail: respMail,
          responsable: {
            nombre: respNom,
            telefono: respTel,
            email: respMail
          },
          empresaId: companyId,
          elementosUnifilares: [],
          inspeccionesSubestacion: [],
          puntosMedicion: [],
          ccmList: [],
          createdAt: new Date().toISOString()
        };

        set((state) => ({
          companies: state.companies.map((c) => {
            if (c.id === companyId) {
              return {
                ...c,
                proyectos: [nuevoProyecto, ...(c.proyectos || [])]
              };
            }
            return c;
          }),
          proyectosLocales: [...(state.proyectosLocales || []), nuevoProyecto],
          syncQueue: [...state.syncQueue, {
            id: uuidId,
            tipo: 'PROYECTO',
            companyId,
            payload: nuevoProyecto
          }]
        }));

        if (navigator.onLine) {
          try {
            const { token } = get();
            await fetch(`${API_BASE_URL}/api/proyectos`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...(token && token !== 'mock-offline-token' ? { 'Authorization': `Bearer ${token}` } : {})
              },
              body: JSON.stringify(nuevoProyecto)
            });
          } catch (e) {
            console.error('Error al registrar proyecto en el servidor:', e);
          }
        }

        return { success: true, proyecto: nuevoProyecto };
      },

      // LÓGICA DE CREACIÓN ADAPTATIVA DENTRO Y FUERA DE PROYECTO
      addElementoUnifilar: (arg1, arg2) => {
        let proyectoId = typeof arg1 === 'string' ? arg1 : (arg1?.proyectoId || arg2?.proyectoId);
        const elementoData = typeof arg1 === 'string' ? arg2 : arg1;
        const companyId = elementoData?.companyId || elementoData?.empresaId || (typeof arg1 === 'string' ? null : arg1?.companyId);

        const { companies } = get();
        let parentCompanyId = companyId;
        let targetProyecto = null;

        if (proyectoId) {
          for (const company of companies) {
            const proj = (company.proyectos || []).find((p) => p.id === proyectoId);
            if (proj) {
              parentCompanyId = company.id;
              targetProyecto = proj;
              break;
            }
          }
        } else {
          // If no proyectoId is given, default to the companyId provided
          if (!parentCompanyId && companies.length > 0) {
            parentCompanyId = companies[0].id;
          }
        }

        if (proyectoId && !targetProyecto) return { success: false, error: 'Proyecto no encontrado en la base de datos.' };

        let uuidId = elementoData.id;
        if (!uuidId || !uuidId.includes('-') || uuidId.length < 10) {
          uuidId = crypto.randomUUID();
        }

        const tipoElemento = elementoData.tipoElemento || 'TABLERO';
        const codigo = elementoData.codigo || getNextElementId(tipoElemento, proyectoId, get());

        const existingElements = proyectoId 
          ? (targetProyecto?.elementosUnifilares || targetProyecto?.tableros || []) 
          : (companies.find(c => c.id === parentCompanyId)?.elementosUnifilares || []);
        const nextOrden = elementoData.orden !== undefined 
          ? Number(elementoData.orden) 
          : (existingElements.length > 0 ? Math.max(0, ...existingElements.map(e => Number(e.orden) || 0)) + 1 : 1);

        const nombreFinal = (elementoData.nombre && elementoData.nombre.trim())
          ? elementoData.nombre.trim()
          : `${codigo.toUpperCase()} - ${tipoElemento}`;

        const nuevoElemento = {
          id: uuidId,
          codigo: codigo,
          nombre: nombreFinal,
          tipoElemento,
          orden: nextOrden,
          ubicacion: elementoData.ubicacion || 'Sin ubicación',
          alimentadoPor: elementoData.alimentadoPor || '',
          alimentadoPorId: elementoData.alimentadoPorId || null,
          foto: elementoData.foto || null,
          fotoBlob: elementoData.fotoBlob || null,
          observacionesGenerales: elementoData.observacionesGenerales || '',
          datosTecnicos: {
            ...(elementoData.datosTecnicos || {}),
            codigo: codigo
          },
          proyectoId: proyectoId || null,
          empresaId: parentCompanyId,
          createdAt: new Date().toISOString()
        };

        set((state) => ({
          companies: state.companies.map((c) => {
            if (c.id === parentCompanyId) {
              if (proyectoId) {
                return {
                  ...c,
                  proyectos: c.proyectos.map((p) => {
                    if (p.id === proyectoId) {
                      const elementos = p.elementosUnifilares || p.tableros || [];
                      return {
                        ...p,
                        elementosUnifilares: [...elementos, nuevoElemento]
                      };
                    }
                    return p;
                  })
                };
              } else {
                const elementosComp = c.elementosUnifilares || [];
                return {
                  ...c,
                  elementosUnifilares: [...elementosComp, nuevoElemento]
                };
              }
            }
            return c;
          }),
          elementosLocales: [...(state.elementosLocales || []), nuevoElemento],
          syncQueue: [...state.syncQueue, {
            id: uuidId,
            tipo: 'ELEMENTO_UNIFILAR',
            companyId: parentCompanyId,
            payload: nuevoElemento
          }]
        }));

        return { success: true, elemento: nuevoElemento };
      },

      updateElementoUnifilar: (proyectoId, elementoId, updatedData) => {
        set((state) => {
          const updatedCompanies = state.companies.map((c) => {
            if (!proyectoId) {
              const list = c.elementosUnifilares || [];
              return {
                ...c,
                elementosUnifilares: list.map((e) => {
                  if (e.id === elementoId) {
                    return { ...e, ...updatedData };
                  }
                  return e;
                })
              };
            }
            return {
              ...c,
              proyectos: (c.proyectos || []).map((p) => {
                if (p.id === proyectoId) {
                  const list = p.elementosUnifilares || p.tableros || [];
                  return {
                    ...p,
                    elementosUnifilares: list.map((e) => {
                      if (e.id === elementoId) {
                        return { ...e, ...updatedData };
                      }
                      return e;
                    })
                  };
                }
                return p;
              })
            };
          });

          const updatedElementosLocales = (state.elementosLocales || []).map((e) => {
            if (e.id === elementoId) {
              return { ...e, ...updatedData };
            }
            return e;
          });

          let inQueue = false;
          const updatedSyncQueue = state.syncQueue.map((item) => {
            if (item.id === elementoId && (item.tipo === 'ELEMENTO_UNIFILAR' || item.tipo === 'TABLERO')) {
              inQueue = true;
              return { ...item, payload: { ...item.payload, ...updatedData } };
            }
            return item;
          });

          if (!inQueue) {
            let updatedElement = updatedElementosLocales.find(e => e.id === elementoId);
            if (!updatedElement) {
              for (const c of updatedCompanies) {
                const list = proyectoId 
                  ? (c.proyectos?.find(p => p.id === proyectoId)?.elementosUnifilares || []) 
                  : (c.elementosUnifilares || []);
                const found = list.find(e => e.id === elementoId);
                if (found) {
                  updatedElement = found;
                  break;
                }
              }
            }
            if (updatedElement) {
              updatedSyncQueue.push({
                id: elementoId,
                tipo: 'ELEMENTO_UNIFILAR',
                companyId: updatedElement.empresaId || updatedElement.companyId || (state.companies[0]?.id || null),
                payload: updatedElement
              });
            }
          }

          return {
            companies: updatedCompanies,
            elementosLocales: updatedElementosLocales,
            syncQueue: updatedSyncQueue
          };
        });
      },

      deleteElementoUnifilar: async (proyectoId, elementoId) => {
        set((state) => ({
          companies: state.companies.map((c) => {
            if (!proyectoId) {
              const list = c.elementosUnifilares || [];
              return {
                ...c,
                elementosUnifilares: list.filter((e) => e.id !== elementoId)
              };
            }
            return {
              ...c,
              proyectos: (c.proyectos || []).map((p) => {
                if (p.id === proyectoId) {
                  const list = p.elementosUnifilares || p.tableros || [];
                  return {
                    ...p,
                    elementosUnifilares: list.filter((e) => e.id !== elementoId)
                  };
                }
                return p;
              })
            };
          }),
          elementosLocales: (state.elementosLocales || []).filter((e) => e.id !== elementoId),
          syncQueue: state.syncQueue.filter((item) => item.id !== elementoId)
        }));

        if (navigator.onLine) {
          try {
            const { token } = get();
            await fetch(`${API_BASE_URL}/api/elementos-unifilares/${elementoId}`, {
              method: 'DELETE',
              headers: {
                ...(token ? { 'Authorization': `Bearer ${token}` } : {})
              }
            });
          } catch (e) {
            console.error('Error al eliminar elemento unifilar del servidor:', e);
          }
        }
      },

      addTablero: (proyectoId, tableroData) => {
        return get().addElementoUnifilar(proyectoId, {
          ...tableroData,
          tipoElemento: 'TABLERO',
          datosTecnicos: {
            maxPoles: tableroData.maxPoles || 24,
            barrasPrincipales: tableroData.barrasPrincipales || { ia: '0', ib: '0', ic: '0' },
            breakerPrincipal: tableroData.breakerPrincipal || { marca: '', tipo: '', amp: '' },
            voltaje: tableroData.voltaje || { va: '208', vb: '205', vc: '205' },
            acometida: tableroData.acometida || '',
            circuits: tableroData.circuits || [],
            neutroLlegada: tableroData.neutroLlegada || { calibre: '', observaciones: '' },
            puestaTierra: tableroData.puestaTierra || { calibre: '', observaciones: '' }
          }
        });
      },

      updateTablero: (proyectoId, tableroId, updatedData) => {
        get().updateElementoUnifilar(proyectoId, tableroId, updatedData);
      },

      deleteTablero: (proyectoId, tableroId) => {
        get().deleteElementoUnifilar(proyectoId, tableroId);
      },

      addInspeccionSubestacion: (proyectoId, payload) => {
        const { companies } = get();

        let parentCompanyId = null;
        let targetProyecto = null;

        for (const company of companies) {
          const proj = (company.proyectos || []).find((p) => p.id === proyectoId);
          if (proj) {
            parentCompanyId = company.id;
            targetProyecto = proj;
            break;
          }
        }

        if (!targetProyecto) return { success: false, error: 'Proyecto no encontrado.' };

        let uuidId = payload.id;
        if (!uuidId || !uuidId.includes('-') || uuidId.length < 10) {
          uuidId = crypto.randomUUID();
        }

        const tipoElemento = payload.tipoElemento || payload.tipoPlantilla || 'SUBESTACION';
        const codigo = payload.codigo || getNextElementId(tipoElemento, proyectoId, get());

        const existingSub = targetProyecto ? (targetProyecto.inspeccionesSubestacion || targetProyecto.subestaciones || []) : [];
        const nextOrden = payload.orden !== undefined 
          ? Number(payload.orden) 
          : (existingSub.length > 0 ? Math.max(0, ...existingSub.map(s => Number(s.orden) || 0)) + 1 : 1);

        const nombreFinal = (payload.nombre && payload.nombre.trim()) 
          ? payload.nombre.trim() 
          : `${codigo.toUpperCase()} - Subestación`;

        const nuevaSubestacion = {
          ...payload,
          id: uuidId,
          codigo: codigo,
          nombre: nombreFinal,
          tipoElemento,
          orden: nextOrden,
          tipoPlantilla: payload.tipoPlantilla || 'INSPECCION_SUBESTACION',
          proyectoId,
          empresaId: parentCompanyId,
          createdAt: new Date().toISOString()
        };

        set((state) => ({
          companies: state.companies.map((c) => {
            if (c.id === parentCompanyId) {
              return {
                ...c,
                proyectos: c.proyectos.map((p) => {
                  if (p.id === proyectoId) {
                    const subestaciones = p.inspeccionesSubestacion || p.subestaciones || [];
                    return {
                      ...p,
                      inspeccionesSubestacion: [...subestaciones, nuevaSubestacion]
                    };
                  }
                  return p;
                })
              };
            }
            return c;
          }),
          subestacionesLocales: [...(state.subestacionesLocales || []), nuevaSubestacion],
          syncQueue: [...state.syncQueue, {
            id: uuidId,
            tipo: 'SUBESTACION',
            companyId: parentCompanyId,
            payload: nuevaSubestacion
          }]
        }));

        return { success: true, subestacion: nuevaSubestacion };
      },

      updateSubestacion: (proyectoId, subestacionId, updatedData) => {
        set((state) => {
          const updatedCompanies = state.companies.map((c) => ({
            ...c,
            proyectos: (c.proyectos || []).map((p) => {
              if (p.id === proyectoId) {
                const subestaciones = p.inspeccionesSubestacion || p.subestaciones || [];
                return {
                  ...p,
                  inspeccionesSubestacion: subestaciones.map((s) => {
                    if (s.id === subestacionId) {
                      return { ...s, ...updatedData };
                    }
                    return s;
                  })
                };
              }
              return p;
            })
          }));

          const updatedSubestacionesLocales = (state.subestacionesLocales || []).map((s) => {
            if (s.id === subestacionId) {
              return { ...s, ...updatedData };
            }
            return s;
          });

          const updatedSyncQueue = state.syncQueue.map((item) => {
            if (item.id === subestacionId && item.tipo === 'SUBESTACION') {
              return { ...item, payload: { ...item.payload, ...updatedData } };
            }
            return item;
          });

          return {
            companies: updatedCompanies,
            subestacionesLocales: updatedSubestacionesLocales,
            syncQueue: updatedSyncQueue
          };
        });
      },

      deleteSubestacion: async (proyectoId, subestacionId) => {
        set((state) => ({
          companies: state.companies.map((c) => ({
            ...c,
            proyectos: (c.proyectos || []).map((p) => {
              if (p.id === proyectoId) {
                const subestaciones = p.inspeccionesSubestacion || p.subestaciones || [];
                return {
                  ...p,
                  inspeccionesSubestacion: subestaciones.filter((s) => s.id !== subestacionId)
                };
              }
              return p;
            })
          })),
          subestacionesLocales: (state.subestacionesLocales || []).filter((s) => s.id !== subestacionId),
          syncQueue: state.syncQueue.filter((item) => item.id !== subestacionId)
        }));

        if (navigator.onLine) {
          try {
            const { token } = get();
            await fetch(`${API_BASE_URL}/api/subestaciones/${subestacionId}`, {
              method: 'DELETE',
              headers: {
                ...(token ? { 'Authorization': `Bearer ${token}` } : {})
              }
            });
          } catch (e) {
            console.error('Error al eliminar inspección de subestación del servidor:', e);
          }
        }
      },

      addPuntoMedicion: (proyectoId, payload) => {
        const { companies } = get();

        let parentCompanyId = null;
        let targetProyecto = null;

        for (const company of companies) {
          const proj = (company.proyectos || []).find((p) => p.id === proyectoId);
          if (proj) {
            parentCompanyId = company.id;
            targetProyecto = proj;
            break;
          }
        }

        let uuidId = payload.id;
        if (!uuidId || !uuidId.includes('-') || uuidId.length < 10) {
          uuidId = crypto.randomUUID();
        }

        const codigo = payload.codigo || getNextElementId('PUNTO_MEDICION', proyectoId, get());

        const existingPm = targetProyecto ? (targetProyecto.puntosMedicion || []) : [];
        const nextOrden = payload.orden !== undefined 
          ? Number(payload.orden) 
          : (existingPm.length > 0 ? Math.max(0, ...existingPm.map(p => Number(p.orden) || 0)) + 1 : 1);

        const nombreFinal = (payload.nombre && payload.nombre.trim()) 
          ? payload.nombre.trim() 
          : `${codigo.toUpperCase()} - Punto de Medición`;

        const nuevoPunto = {
          ...payload,
          id: uuidId,
          codigo: codigo,
          nombre: nombreFinal,
          orden: nextOrden,
          proyectoId,
          empresaId: parentCompanyId,
          tipoPlantilla: 'PUNTO_MEDICION',
          createdAt: new Date().toISOString()
        };

        set((state) => ({
          companies: state.companies.map((c) => {
            if (c.id === parentCompanyId) {
              return {
                ...c,
                proyectos: c.proyectos.map((p) => {
                  if (p.id === proyectoId) {
                    const puntos = p.puntosMedicion || [];
                    return {
                      ...p,
                      puntosMedicion: [...puntos, nuevoPunto]
                    };
                  }
                  return p;
                })
              };
            }
            return c;
          }),
          puntosMedicionLocales: [...(state.puntosMedicionLocales || []), nuevoPunto],
          syncQueue: [...state.syncQueue, {
            id: uuidId,
            tipo: 'PUNTO_MEDICION',
            companyId: parentCompanyId,
            payload: nuevoPunto
          }]
        }));

        return { success: true, puntoMedicion: nuevoPunto };
      },

      updatePuntoMedicion: (proyectoId, puntoId, updatedData) => {
        set((state) => {
          const updatedCompanies = state.companies.map((c) => ({
            ...c,
            elementosUnifilares: (c.elementosUnifilares || []).map((item) => {
              if (item.id === puntoId) {
                return { ...item, ...updatedData };
              }
              return item;
            }),
            proyectos: (c.proyectos || []).map((p) => {
              const matchesProj = !proyectoId || p.id === proyectoId;
              const puntos = p.puntosMedicion || [];
              const elementos = p.elementosUnifilares || [];
              return {
                ...p,
                puntosMedicion: puntos.map((item) => {
                  if (item.id === puntoId) {
                    return { ...item, ...updatedData };
                  }
                  return item;
                }),
                elementosUnifilares: matchesProj ? elementos.map((item) => {
                  if (item.id === puntoId) {
                    return { ...item, ...updatedData };
                  }
                  return item;
                }) : elementos
              };
            })
          }));

          const updatedPuntosLocales = (state.puntosMedicionLocales || []).map((item) => {
            if (item.id === puntoId) {
              return { ...item, ...updatedData };
            }
            return item;
          });

          const updatedSyncQueue = state.syncQueue.map((item) => {
            if (item.id === puntoId && (item.tipo === 'PUNTO_MEDICION' || item.tipo === 'ELEMENTO_UNIFILAR')) {
              return { ...item, payload: { ...item.payload, ...updatedData } };
            }
            return item;
          });

          return {
            companies: updatedCompanies,
            puntosMedicionLocales: updatedPuntosLocales,
            syncQueue: updatedSyncQueue
          };
        });
      },

      deletePuntoMedicion: async (proyectoId, puntoId) => {
        set((state) => ({
          companies: state.companies.map((c) => ({
            ...c,
            proyectos: (c.proyectos || []).map((p) => {
              if (p.id === proyectoId) {
                const puntos = p.puntosMedicion || [];
                return {
                  ...p,
                  puntosMedicion: puntos.filter((item) => item.id !== puntoId)
                };
              }
              return p;
            })
          })),
          puntosMedicionLocales: (state.puntosMedicionLocales || []).filter((item) => item.id !== puntoId),
          syncQueue: state.syncQueue.filter((item) => item.id !== puntoId)
        }));

        if (navigator.onLine) {
          try {
            const { token } = get();
            await fetch(`${API_BASE_URL}/api/puntos-medicion/${puntoId}`, {
              method: 'DELETE',
              headers: {
                ...(token ? { 'Authorization': `Bearer ${token}` } : {})
              }
            });
          } catch (e) {
            console.error('Error al eliminar punto de medición del servidor:', e);
          }
        }
      },

      addCcm: (proyectoId, payload) => {
        const { companies } = get();

        let parentCompanyId = null;
        let targetProyecto = null;

        for (const company of companies) {
          const proj = (company.proyectos || []).find((p) => p.id === proyectoId);
          if (proj) {
            parentCompanyId = company.id;
            targetProyecto = proj;
            break;
          }
        }

        let uuidId = payload.id;
        if (!uuidId || !uuidId.includes('-') || uuidId.length < 10) {
          uuidId = crypto.randomUUID();
        }

        const codigo = payload.codigo || getNextElementId('CCM', proyectoId, get());

        const existingCcm = targetProyecto ? (targetProyecto.ccmList || []) : [];
        const nextOrden = payload.orden !== undefined 
          ? Number(payload.orden) 
          : (existingCcm.length > 0 ? Math.max(0, ...existingCcm.map(c => Number(c.orden) || 0)) + 1 : 1);

        const nombreFinal = (payload.nombre && payload.nombre.trim()) 
          ? payload.nombre.trim() 
          : `${codigo.toUpperCase()} - CCM`;

        const nuevoCcm = {
          ...payload,
          id: uuidId,
          codigo: codigo,
          nombre: nombreFinal,
          orden: nextOrden,
          proyectoId,
          empresaId: parentCompanyId,
          tipoPlantilla: 'CCM',
          createdAt: new Date().toISOString()
        };

        set((state) => ({
          companies: state.companies.map((c) => {
            if (c.id === parentCompanyId) {
              return {
                ...c,
                proyectos: c.proyectos.map((p) => {
                  if (p.id === proyectoId) {
                    const ccmItems = p.ccmList || [];
                    return {
                      ...p,
                      ccmList: [...ccmItems, nuevoCcm]
                    };
                  }
                  return p;
                })
              };
            }
            return c;
          }),
          ccmLocales: [...(state.ccmLocales || []), nuevoCcm],
          syncQueue: [...state.syncQueue, {
            id: uuidId,
            tipo: 'CCM',
            companyId: parentCompanyId,
            payload: nuevoCcm
          }]
        }));

        return { success: true, ccm: nuevoCcm };
      },

      updateCcm: (proyectoId, ccmId, updatedData) => {
        set((state) => {
          const updatedCompanies = state.companies.map((c) => ({
            ...c,
            proyectos: (c.proyectos || []).map((p) => {
              if (p.id === proyectoId) {
                const ccmItems = p.ccmList || [];
                return {
                  ...p,
                  ccmList: ccmItems.map((item) => {
                    if (item.id === ccmId) {
                      return { ...item, ...updatedData };
                    }
                    return item;
                  })
                };
              }
              return p;
            })
          }));

          const updatedCcmLocales = (state.ccmLocales || []).map((item) => {
            if (item.id === ccmId) {
              return { ...item, ...updatedData };
            }
            return item;
          });

          const updatedSyncQueue = state.syncQueue.map((item) => {
            if (item.id === ccmId && item.tipo === 'CCM') {
              return { ...item, payload: { ...item.payload, ...updatedData } };
            }
            return item;
          });

          return {
            companies: updatedCompanies,
            ccmLocales: updatedCcmLocales,
            syncQueue: updatedSyncQueue
          };
        });
      },

      deleteCcm: async (proyectoId, ccmId) => {
        set((state) => ({
          companies: state.companies.map((c) => ({
            ...c,
            proyectos: (c.proyectos || []).map((p) => {
              if (p.id === proyectoId) {
                const ccmItems = p.ccmList || [];
                return {
                  ...p,
                  ccmList: ccmItems.filter((item) => item.id !== ccmId)
                };
              }
              return p;
            })
          })),
          ccmLocales: (state.ccmLocales || []).filter((item) => item.id !== ccmId),
          syncQueue: state.syncQueue.filter((item) => item.id !== ccmId)
        }));

        if (navigator.onLine) {
          try {
            const { token } = get();
            await fetch(`${API_BASE_URL}/api/ccm/${ccmId}`, {
              method: 'DELETE',
              headers: {
                ...(token ? { 'Authorization': `Bearer ${token}` } : {})
              }
            });
          } catch (e) {
            console.error('Error al eliminar CCM del servidor:', e);
          }
        }
      },

      updateElementoCodigo: async (elementoId, nuevoCodigo, tipoElemento = null, proyectoId = null) => {
        const cleanCode = String(nuevoCodigo || '').trim().toLowerCase();
        if (!cleanCode) return { success: false, error: 'El código o ID visual no puede estar vacío.' };

        set((state) => {
          let updatedItemPayload = null;
          let itemType = 'ELEMENTO_UNIFILAR';
          let itemCompanyId = state.companies[0]?.id || null;

          const updatedCompanies = state.companies.map((c) => {
            const compElementos = (c.elementosUnifilares || []).map((el) => {
              if (el.id === elementoId) {
                const dt = { ...(el.datosTecnicos || {}), codigo: cleanCode };
                const updated = { ...el, codigo: cleanCode, datosTecnicos: dt };
                updatedItemPayload = updated;
                itemType = 'ELEMENTO_UNIFILAR';
                itemCompanyId = c.id;
                return updated;
              }
              return el;
            });

            const compProyectos = (c.proyectos || []).map((p) => {
              const pElementos = (p.elementosUnifilares || p.tableros || []).map((el) => {
                if (el.id === elementoId) {
                  const dt = { ...(el.datosTecnicos || {}), codigo: cleanCode };
                  const updated = { ...el, codigo: cleanCode, datosTecnicos: dt };
                  updatedItemPayload = updated;
                  itemType = 'ELEMENTO_UNIFILAR';
                  itemCompanyId = c.id;
                  return updated;
                }
                return el;
              });

              const pSubestaciones = (p.inspeccionesSubestacion || p.subestaciones || []).map((sub) => {
                if (sub.id === elementoId) {
                  const dt = { ...(sub.datosTecnicos || {}), codigo: cleanCode };
                  const updated = { ...sub, codigo: cleanCode, datosTecnicos: dt };
                  updatedItemPayload = updated;
                  itemType = 'SUBESTACION';
                  itemCompanyId = c.id;
                  return updated;
                }
                return sub;
              });

              const pPuntos = (p.puntosMedicion || []).map((pm) => {
                if (pm.id === elementoId) {
                  const dt = { ...(pm.datosTecnicos || {}), codigo: cleanCode };
                  const updated = { ...pm, codigo: cleanCode, datosTecnicos: dt };
                  updatedItemPayload = updated;
                  itemType = 'PUNTO_MEDICION';
                  itemCompanyId = c.id;
                  return updated;
                }
                return pm;
              });

              const pCcm = (p.ccmList || []).map((ccm) => {
                if (ccm.id === elementoId) {
                  const dt = { ...(ccm.datosTecnicos || {}), codigo: cleanCode };
                  const updated = { ...ccm, codigo: cleanCode, datosTecnicos: dt };
                  updatedItemPayload = updated;
                  itemType = 'CCM';
                  itemCompanyId = c.id;
                  return updated;
                }
                return ccm;
              });

              return {
                ...p,
                elementosUnifilares: pElementos,
                tableros: pElementos,
                inspeccionesSubestacion: pSubestaciones,
                subestaciones: pSubestaciones,
                puntosMedicion: pPuntos,
                ccmList: pCcm
              };
            });

            return {
              ...c,
              elementosUnifilares: compElementos,
              proyectos: compProyectos
            };
          });

          const updatedElementosLocales = (state.elementosLocales || []).map((el) => {
            if (el.id === elementoId) {
              const dt = { ...(el.datosTecnicos || {}), codigo: cleanCode };
              return { ...el, codigo: cleanCode, datosTecnicos: dt };
            }
            return el;
          });

          const updatedSubestacionesLocales = (state.subestacionesLocales || []).map((s) => {
            if (s.id === elementoId) {
              const dt = { ...(s.datosTecnicos || {}), codigo: cleanCode };
              return { ...s, codigo: cleanCode, datosTecnicos: dt };
            }
            return s;
          });

          const updatedPuntosLocales = (state.puntosMedicionLocales || []).map((pm) => {
            if (pm.id === elementoId) {
              const dt = { ...(pm.datosTecnicos || {}), codigo: cleanCode };
              return { ...pm, codigo: cleanCode, datosTecnicos: dt };
            }
            return pm;
          });

          const updatedCcmLocales = (state.ccmLocales || []).map((ccm) => {
            if (ccm.id === elementoId) {
              const dt = { ...(ccm.datosTecnicos || {}), codigo: cleanCode };
              return { ...ccm, codigo: cleanCode, datosTecnicos: dt };
            }
            return ccm;
          });

          let inQueue = false;
          const updatedSyncQueue = state.syncQueue.map((item) => {
            if (item.id === elementoId) {
              inQueue = true;
              const p = item.payload || {};
              const dt = { ...(p.datosTecnicos || {}), codigo: cleanCode };
              return {
                ...item,
                payload: { ...p, codigo: cleanCode, datosTecnicos: dt }
              };
            }
            return item;
          });

          if (!inQueue && updatedItemPayload) {
            updatedSyncQueue.push({
              id: elementoId,
              tipo: itemType,
              companyId: itemCompanyId,
              payload: updatedItemPayload
            });
          }

          return {
            companies: updatedCompanies,
            elementosLocales: updatedElementosLocales,
            subestacionesLocales: updatedSubestacionesLocales,
            puntosMedicionLocales: updatedPuntosLocales,
            ccmLocales: updatedCcmLocales,
            syncQueue: updatedSyncQueue
          };
        });

        // Sincronización remota si está en línea
        if (navigator.onLine) {
          try {
            const { token } = get();
            const normalizedType = String(tipoElemento || '').toUpperCase();
            let endpoint = `/api/elementos-unifilares/${elementoId}`;
            if (normalizedType.includes('SUBESTACION')) {
              endpoint = `/api/subestaciones/${elementoId}`;
            } else if (normalizedType.includes('PUNTO_MEDICION') || normalizedType.includes('MEDICION')) {
              endpoint = `/api/puntos-medicion/${elementoId}`;
            } else if (normalizedType.includes('CCM')) {
              endpoint = `/api/ccm/${elementoId}`;
            }

            await fetch(`${API_BASE_URL}${endpoint}`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                ...(token && token !== 'mock-offline-token' ? { 'Authorization': `Bearer ${token}` } : {})
              },
              body: JSON.stringify({ codigo: cleanCode })
            });
          } catch (e) {
            console.error('Error al sincronizar actualización de código ID:', e);
          }
        }

        return { success: true, codigo: cleanCode };
      },

      moverElemento: (companyId, proyectoId, elementoId, direccion = 'UP', tipoColeccion = 'UNIFILAR') => {
        let changedItems = [];

        set((state) => {
          const updatedCompanies = state.companies.map((c) => {
            if (companyId && c.id !== companyId) return c;

            if (proyectoId) {
              return {
                ...c,
                proyectos: (c.proyectos || []).map((p) => {
                  if (p.id !== proyectoId) return p;

                  if (tipoColeccion === 'UNIFILAR') {
                    const list = [...(p.elementosUnifilares || p.tableros || [])];
                    const sorted = sortElementsByOrder(list);
                    const currentIndex = sorted.findIndex((item) => item.id === elementoId);
                    if (currentIndex === -1) return p;

                    const targetIndex = direccion === 'UP' ? currentIndex - 1 : currentIndex + 1;
                    if (targetIndex < 0 || targetIndex >= sorted.length) return p;

                    const [moved] = sorted.splice(currentIndex, 1);
                    sorted.splice(targetIndex, 0, moved);

                    const reindexed = sorted.map((item, idx) => ({
                      ...item,
                      orden: idx + 1,
                      datosTecnicos: {
                        ...(item.datosTecnicos || {}),
                        orden: idx + 1
                      }
                    }));
                    changedItems = reindexed;

                    return {
                      ...p,
                      elementosUnifilares: reindexed,
                      tableros: reindexed
                    };
                  } else {
                    const list = [...(p.inspeccionesSubestacion || p.subestaciones || [])];
                    const sorted = sortElementsByOrder(list);
                    const currentIndex = sorted.findIndex((item) => item.id === elementoId);
                    if (currentIndex === -1) return p;

                    const targetIndex = direccion === 'UP' ? currentIndex - 1 : currentIndex + 1;
                    if (targetIndex < 0 || targetIndex >= sorted.length) return p;

                    const [moved] = sorted.splice(currentIndex, 1);
                    sorted.splice(targetIndex, 0, moved);

                    const reindexed = sorted.map((item, idx) => ({
                      ...item,
                      orden: idx + 1,
                      datosTecnicos: {
                        ...(item.datosTecnicos || {}),
                        orden: idx + 1
                      }
                    }));
                    changedItems = reindexed;

                    return {
                      ...p,
                      inspeccionesSubestacion: reindexed,
                      subestaciones: reindexed
                    };
                  }
                })
              };
            } else {
              // Nivel de Empresa
              const list = [...(c.elementosUnifilares || [])];
              const sorted = sortElementsByOrder(list);
              const currentIndex = sorted.findIndex((item) => item.id === elementoId);
              if (currentIndex === -1) return c;

              const targetIndex = direccion === 'UP' ? currentIndex - 1 : currentIndex + 1;
              if (targetIndex < 0 || targetIndex >= sorted.length) return c;

              const [moved] = sorted.splice(currentIndex, 1);
              sorted.splice(targetIndex, 0, moved);

              const reindexed = sorted.map((item, idx) => ({
                ...item,
                orden: idx + 1,
                datosTecnicos: {
                  ...(item.datosTecnicos || {}),
                  orden: idx + 1
                }
              }));
              changedItems = reindexed;

              return {
                ...c,
                elementosUnifilares: reindexed
              };
            }
          });

          // Actualizar persistencia de elementos locales
          const updatedElementosLocales = (state.elementosLocales || []).map((loc) => {
            const match = changedItems.find((ci) => ci.id === loc.id);
            return match ? { ...loc, orden: match.orden, datosTecnicos: { ...(loc.datosTecnicos || {}), orden: match.orden } } : loc;
          });

          return {
            companies: updatedCompanies,
            elementosLocales: updatedElementosLocales
          };
        });
      },

      reordenarColeccion: (companyId, proyectoId, orderedIds = [], tipoColeccion = 'UNIFILAR') => {
        if (!Array.isArray(orderedIds) || orderedIds.length === 0) return;
        let changedItems = [];

        set((state) => {
          const updatedCompanies = state.companies.map((c) => {
            if (companyId && c.id !== companyId) return c;

            if (proyectoId) {
              return {
                ...c,
                proyectos: (c.proyectos || []).map((p) => {
                  if (p.id !== proyectoId) return p;

                  if (tipoColeccion === 'UNIFILAR') {
                    const list = [...(p.elementosUnifilares || p.tableros || [])];
                    const reindexed = list.map((item) => {
                      const idx = orderedIds.indexOf(item.id);
                      const newOrd = idx !== -1 ? idx + 1 : (item.orden || 9999);
                      return {
                        ...item,
                        orden: newOrd,
                        datosTecnicos: {
                          ...(item.datosTecnicos || {}),
                          orden: newOrd
                        }
                      };
                    });
                    const sorted = sortElementsByOrder(reindexed);
                    changedItems = sorted;
                    return {
                      ...p,
                      elementosUnifilares: sorted,
                      tableros: sorted
                    };
                  } else {
                    const list = [...(p.inspeccionesSubestacion || p.subestaciones || [])];
                    const reindexed = list.map((item) => {
                      const idx = orderedIds.indexOf(item.id);
                      const newOrd = idx !== -1 ? idx + 1 : (item.orden || 9999);
                      return {
                        ...item,
                        orden: newOrd,
                        datosTecnicos: {
                          ...(item.datosTecnicos || {}),
                          orden: newOrd
                        }
                      };
                    });
                    const sorted = sortElementsByOrder(reindexed);
                    changedItems = sorted;
                    return {
                      ...p,
                      inspeccionesSubestacion: sorted,
                      subestaciones: sorted
                    };
                  }
                })
              };
            } else {
              const list = [...(c.elementosUnifilares || [])];
              const reindexed = list.map((item) => {
                const idx = orderedIds.indexOf(item.id);
                const newOrd = idx !== -1 ? idx + 1 : (item.orden || 9999);
                return {
                  ...item,
                  orden: newOrd,
                  datosTecnicos: {
                    ...(item.datosTecnicos || {}),
                    orden: newOrd
                  }
                };
              });
              const sorted = sortElementsByOrder(reindexed);
              changedItems = sorted;
              return {
                ...c,
                elementosUnifilares: sorted
              };
            }
          });

          // Actualizar persistencia de elementos locales
          const updatedElementosLocales = (state.elementosLocales || []).map((loc) => {
            const match = changedItems.find((ci) => ci.id === loc.id);
            return match ? { ...loc, orden: match.orden, datosTecnicos: { ...(loc.datosTecnicos || {}), orden: match.orden } } : loc;
          });

          return {
            companies: updatedCompanies,
            elementosLocales: updatedElementosLocales
          };
        });
      },

      removeFromQueue: (id) => {
        set((state) => ({
          syncQueue: state.syncQueue.filter((item) => item.id !== id),
          proyectosLocales: (state.proyectosLocales || []).filter((p) => p.id !== id),
          elementosLocales: (state.elementosLocales || []).filter((e) => e.id !== id),
          subestacionesLocales: (state.subestacionesLocales || []).filter((s) => s.id !== id)
        }));
      },

      processSyncQueue: async () => {
        const { syncQueue, token } = get();
        if (!token || syncQueue.length === 0) return { success: true };

        try {
          const res = await fetch(`${API_BASE_URL}/api/sync/push`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token && token !== 'mock-offline-token' ? { 'Authorization': `Bearer ${token}` } : {})
            },
            body: JSON.stringify({ mutations: syncQueue.map(item => ({
              entity: item.tipo,
              id: item.id,
              operation: 'CREATE',
              data: item.payload
            })) })
          });

          if (res.status === 401 || res.status === 403) {
            get().handleAuthError(res.status);
            return { success: false, error: 'Token expirado' };
          }

          const data = await res.json();
          if (res.ok && data.ok) {
            // Limpiar la cola localmente tras confirmación exitosa
            set({ syncQueue: [] });
            get().pullInitialData();
            get().showToast('Sincronización completada exitosamente', 'success');
            return { success: true };
          } else {
            get().showToast('Error en sincronización: ' + (data.error || 'unknown'), 'error');
            return { success: false, error: data.error };
          }
        } catch (e) {
          console.error('Error al procesar cola de sincronización:', e);
          get().showToast('Error de red al sincronizar', 'error');
          return { success: false, error: e.message };
        }
      },

      syncPendingData: async () => {
        return get().processSyncQueue();
      },

      backupDatos: async (tipo = 'completo') => {
        const { user } = get();
        if (!user) return { success: false, error: 'No ha iniciado sesión' };
        
        try {
          get().showToast('Generando backup ' + tipo + '...', 'info');
          
          const res = await fetch(`${API_BASE_URL}/api/backup/local`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${user.token}` },
            body: JSON.stringify({ tipo })
          });
          
          const data = await res.json();
          if (data.success && data.archivo) {
            // Guardar archivo en localforage
            const nombreArchivo = `backup-${tipo}-${Date.now()}.json`;
            await localforage.setItem(nombreArchivo, data.archivo);
            get().showToast('Backup guardado localmente como: ' + nombreArchivo, 'success');
            return { success: true, filename: nombreArchivo };
          } else {
            get().showToast('Error generando backup: ' + (data.error || 'unknown'), 'error');
            return { success: false, error: data.error };
          }
        } catch (e) {
          console.error('Error al generar backup:', e);
          get().showToast('Error de red al generar backup', 'error');
          return { success: false, error: e.message };
        }
      },

      respaldarEnLocalStorage: async (nombre, contenidoJson) => {
        // Guardar backup codificado en localforage
        const contenidoBlob = typeof contenidoJson === 'string' 
          ? contenidoJson 
          : JSON.stringify(contenidoJson, null, 2);
        
        await localforage.setItem(nombre, contenidoBlob);
        get().showToast('Backup guardado en almacenamiento local', 'success');
      },

      obtenerRespaldoLocal: async (nombre) => {
        return await localforage.getItem(nombre);
      },

      listarBackupsLocales: async () => {
        const keys = await localforage.keys();
        const backups = [];
        
        for (const key of keys) {
          if (key.startsWith('backup-')) {
            const data = await localforage.getItem(key);
            backups.push({
              nombre: key,
              fecha: key.replace('backup-', '').replace('.json', '') || 'desconocida',
              size: typeof data === 'string' ? data.length : 0
            });
          }
        }
        
        return backups;
      },

      eliminarBackupLocal: async (nombre) => {
        await localforage.removeItem(nombre);
      },
      
      messages: [],
      sendMessage: async (receiverId, text) => {
        const { user } = get();
        if (!user) return { success: false, error: 'No ha iniciado sesión.' };
        
        const newMessage = {
          id: `msg-${Date.now()}`,
          senderId: user.id,
          senderUsername: user.username || user.email || 'Anónimo',
          receiverId,
          text,
          createdAt: new Date().toISOString()
        };
        
        set((state) => ({
          messages: [...(state.messages || []), newMessage]
        }));
        
        try {
          const res = await fetch(`${API_BASE_URL}/api/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newMessage)
          });
          const data = await res.json();
          if (data.ok) {
            set((state) => ({
              messages: (state.messages || []).map((m) => m.id === newMessage.id ? data.data : m)
            }));
          }
        } catch (e) {
          console.error('Error al enviar mensaje:', e);
        }

        return { success: true, message: newMessage };
      },

      addIncomingMessage: (msg) => {
        const exists = (get().messages || []).some((m) => m.id === msg.id);
        if (exists) return;

        set((state) => ({
          messages: [...(state.messages || []), msg]
        }));
      },

      markMessagesAsRead: async (senderId) => {
        const { user } = get();
        if (!user) return;

        set((state) => ({
          messages: (state.messages || []).map((m) => {
            if (m.senderId === senderId && m.receiverId === user.id && !m.read) {
              return { ...m, read: true };
            }
            return m;
          })
        }));

        try {
          await fetch(`${API_BASE_URL}/api/messages/read`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ senderId, receiverId: user.id })
          });
        } catch (e) {
          console.error('Error marcando mensajes como leídos:', e);
        }
      },

      vincularJerarquia: (proyectoId, padreId, hijoId, datosEnlace = {}) => {
        set((state) => {
          let nombrePadre = '';
          const newCompanies = (state.companies || []).map((c) => ({
            ...c,
            proyectos: (c.proyectos || []).map((p) => {
              if (p.id !== proyectoId) return p;

              // Buscar nombre del padre si existe
              const list = p.elementosUnifilares || [];
              const padre = list.find((e) => e.id === padreId);
              if (padre) nombrePadre = padre.nombre;

              return {
                ...p,
                elementosUnifilares: (p.elementosUnifilares || []).map((e) => {
                  if (e.id === hijoId) {
                    return {
                      ...e,
                      alimentadoPorId: padreId,
                      alimentadoPor: nombrePadre ? `${nombrePadre} (${datosEnlace.circuitoOrigen || 'Salida'})` : e.alimentadoPor,
                      circuitoOrigen: datosEnlace.circuitoOrigen || e.circuitoOrigen,
                      calibreConductor: datosEnlace.calibreConductor || e.calibreConductor,
                      breakerAmperaje: datosEnlace.breakerAmperaje || e.breakerAmperaje,
                      breakerMarca: datosEnlace.breakerMarca || e.breakerMarca,
                      breakerTipo: datosEnlace.breakerTipo || e.breakerTipo,
                      estadoVinculo: 'ACTIVO'
                    };
                  }
                  return e;
                })
              };
            })
          }));
          return { companies: newCompanies };
        });
      },

      desvincularJerarquia: (proyectoId, hijoId) => {
        set((state) => {
          const newCompanies = (state.companies || []).map((c) => ({
            ...c,
            proyectos: (c.proyectos || []).map((p) => {
              if (p.id !== proyectoId) return p;
              return {
                ...p,
                elementosUnifilares: (p.elementosUnifilares || []).map((e) => {
                  if (e.id === hijoId) {
                    return {
                      ...e,
                      alimentadoPorId: null,
                      alimentadoPor: null,
                      circuitoOrigen: null,
                      estadoVinculo: 'ACTIVO'
                    };
                  }
                  return e;
                })
              };
            })
          }));
          return { companies: newCompanies };
        });
      },

      crearElementoProvisional: (proyectoId, datosProvisional = {}) => {
        const state = get();
        const tipo = datosProvisional.tipoElemento || 'TABLERO';
        const codigo = datosProvisional.codigo || getNextElementId(tipo, proyectoId, state);
        const uuidId = datosProvisional.id && datosProvisional.id.length > 10 ? datosProvisional.id : crypto.randomUUID();

        const provisionalObj = {
          id: uuidId,
          codigo: codigo,
          nombre: datosProvisional.nombre || `RESERVA (${codigo})`,
          tipoElemento: tipo,
          ubicacion: 'RESERVA (Pendiente por Crear)',
          alimentadoPor: datosProvisional.circuitoOrigen ? `Circuito ${datosProvisional.circuitoOrigen}` : null,
          circuitoOrigen: datosProvisional.circuitoOrigen || null,
          estadoVinculo: 'PENDIENTE_CREAR',
          observacionesGenerales: 'Nodo registrado en estado provisional como Reserva activa.',
          datosTecnicos: {
            ...(datosProvisional.datosTecnicos || {}),
            codigo: codigo
          },
          proyectoId
        };

        get().addElementoUnifilar(proyectoId, provisionalObj);
        return provisionalObj;
      }
    }),
    {
      name: 'tableroselectrico_zustand_store',
      storage: localForageStorage,
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        usersList: state.usersList || [],
        messages: state.messages || [],
        companies: state.companies,
        proyectosLocales: state.proyectosLocales || [],
        elementosLocales: state.elementosLocales || [],
        subestacionesLocales: state.subestacionesLocales || [],
        conflictosCircuitos: state.conflictosCircuitos || [],
        syncQueue: state.syncQueue
      }),
      onRehydrateStorage: () => (state) => {
        if (state && state.token && state.token !== 'mock-offline-token' && typeof navigator !== 'undefined' && navigator.onLine) {
          // Descarga automática transparente desde PostgreSQL tras restaurar sesión persistida
          state.pullInitialData?.();
          state.fetchUsersList?.();
        }
      }
    }
  )
);

export default useStore;
