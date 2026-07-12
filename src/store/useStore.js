import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import localforage from 'localforage';
import { initialTablerosData } from '../data/mockTableros';

// Configurar localforage
localforage.config({
  name: 'app-tableros-electricos',
  storeName: 'inspecciones_store'
});

// Implementar almacenamiento personalizado para localforage
const localForageStorage = {
  getItem: async (name) => {
    const value = await localforage.getItem(name);
    return value; // Retorna el objeto deserializado directamente (incluyendo Blobs)
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
    nombre: 'Clínica Metropolitana de Caracas',
    tableros: [
      { ...initialTablerosData['11'], id: '11', nombre: 'Tablero TD-11 (Sótano)' },
      { ...initialTablerosData['10'], id: '10', nombre: 'Tablero TD-10 (Imágenes)' }
    ],
    subestaciones: []
  },
  {
    id: 'c-2',
    nombre: 'Alimentos Polar Planta Turmero',
    tableros: [],
    subestaciones: []
  }
];

export const useStore = create(
  persist(
    (set, get) => ({
      user: null,
      companies: initialCompanies,
      tablerosLocales: [],
      subestacionesLocales: [],
      syncQueue: [], // Cola universal: { id, tipo: 'TABLERO'|'SUBESTACION', companyId, payload }

      // Autenticación básica
      login: (email, password) => {
        if (email && password) {
          set({ user: { email } });
          return true;
        }
        return false;
      },

      logout: () => {
        set({ user: null });
      },

      // Gestión de Empresas
      addCompany: (nombre) => {
        const newCompany = {
          id: `company-${Date.now()}`,
          nombre,
          tableros: [],
          subestaciones: []
        };
        set((state) => ({
          companies: [...state.companies, newCompany]
        }));
      },

      deleteCompany: (companyId) => {
        set((state) => ({
          companies: state.companies.filter((c) => c.id !== companyId)
        }));
      },

      importCompanies: (companiesList) => {
        // Asegurar que existan subestaciones en cada empresa importada
        const enrichedList = companiesList.map((c) => ({
          ...c,
          subestaciones: c.subestaciones || []
        }));
        set({ companies: enrichedList });
      },

      // 1. Crear Tablero con Cola Universal
      addTablero: (companyId, tableroData) => {
        const { companies } = get();
        const company = companies.find((c) => c.id === companyId);
        if (!company) return { success: false, error: 'Empresa no encontrada.' };

        const uuidId = crypto.randomUUID();

        const nuevoTablero = {
          id: uuidId,
          clientId: tableroData.id || uuidId,
          nombre: tableroData.nombre,
          ubicacion: tableroData.ubicacion || 'Sin ubicación',
          alimentadoPor: tableroData.alimentadoPor || '',
          tipo: tableroData.tipo || 'superficial',
          foto: null,
          fotoBlob: tableroData.fotoBlob || null,
          barrasPrincipales: tableroData.barrasPrincipales || { ia: '0', ib: '0', ic: '0' },
          breakerPrincipal: tableroData.breakerPrincipal || { marca: '', tipo: '', amp: '' },
          voltaje: tableroData.voltaje || { va: '208', vb: '205', vc: '205' },
          acometida: tableroData.acometida || '',
          maxPoles: tableroData.maxPoles || 24,
          circuits: tableroData.circuits || [],
          neutroLlegada: tableroData.neutroLlegada || { calibre: '', observaciones: '' },
          puestaTierra: tableroData.puestaTierra || { calibre: '', observaciones: '' },
          observacionesGenerales: tableroData.observacionesGenerales || '',
          createdAt: new Date().toISOString()
        };

        set((state) => ({
          companies: state.companies.map((c) => {
            if (c.id === companyId) {
              return { 
                ...c, 
                tableros: [...c.tableros, nuevoTablero]
              };
            }
            return c;
          }),
          tablerosLocales: [...state.tablerosLocales, nuevoTablero],
          syncQueue: [...state.syncQueue, { 
            id: uuidId, 
            tipo: 'TABLERO', 
            companyId, 
            payload: nuevoTablero 
          }]
        }));

        return { success: true, tablero: nuevoTablero };
      },

      updateTablero: (companyId, tableroId, updatedData) => {
        set((state) => {
          const updatedCompanies = state.companies.map((c) => {
            if (c.id === companyId) {
              return {
                ...c,
                tableros: c.tableros.map((t) => {
                  if (t.id === tableroId) {
                    return { ...t, ...updatedData };
                  }
                  return t;
                })
              };
            }
            return c;
          });

          const updatedTablerosLocales = state.tablerosLocales.map((t) => {
            if (t.id === tableroId) {
              return { ...t, ...updatedData };
            }
            return t;
          });

          // Sincronizar actualización local dentro de la cola universal
          const updatedSyncQueue = state.syncQueue.map((item) => {
            if (item.id === tableroId && item.tipo === 'TABLERO') {
              return { ...item, payload: { ...item.payload, ...updatedData } };
            }
            return item;
          });

          return {
            companies: updatedCompanies,
            tablerosLocales: updatedTablerosLocales,
            syncQueue: updatedSyncQueue
          };
        });
      },

      deleteTablero: (companyId, tableroId) => {
        set((state) => ({
          companies: state.companies.map((c) => {
            if (c.id === companyId) {
              return {
                ...c,
                tableros: c.tableros.filter((t) => t.id !== tableroId)
              };
            }
            return c;
          }),
          tablerosLocales: state.tablerosLocales.filter((t) => t.id !== tableroId),
          syncQueue: state.syncQueue.filter((item) => item.id !== tableroId)
        }));
      },

      // 2. Crear Inspección de Subestación con Cola Universal
      addInspeccionSubestacion: (companyId, payload) => {
        const { companies } = get();
        const company = companies.find((c) => c.id === companyId);
        if (!company) return { success: false, error: 'Empresa no encontrada.' };

        const uuidId = payload.id || crypto.randomUUID();

        const nuevaSubestacion = {
          ...payload,
          id: uuidId,
          companyId,
          tipoPlantilla: 'INSPECCION_SUBESTACION',
          createdAt: new Date().toISOString()
        };

        set((state) => ({
          companies: state.companies.map((c) => {
            if (c.id === companyId) {
              const subestaciones = c.subestaciones || [];
              return { 
                ...c, 
                subestaciones: [...subestaciones, nuevaSubestacion]
              };
            }
            return c;
          }),
          subestacionesLocales: [...(state.subestacionesLocales || []), nuevaSubestacion],
          syncQueue: [...state.syncQueue, { 
            id: uuidId, 
            tipo: 'SUBESTACION', 
            companyId, 
            payload: nuevaSubestacion 
          }]
        }));

        return { success: true, subestacion: nuevaSubestacion };
      },

      updateSubestacion: (companyId, subestacionId, updatedData) => {
        set((state) => {
          const updatedCompanies = state.companies.map((c) => {
            if (c.id === companyId) {
              const subestaciones = c.subestaciones || [];
              return {
                ...c,
                subestaciones: subestaciones.map((s) => {
                  if (s.id === subestacionId) {
                    return { ...s, ...updatedData };
                  }
                  return s;
                })
              };
            }
            return c;
          });

          const updatedSubestacionesLocales = (state.subestacionesLocales || []).map((s) => {
            if (s.id === subestacionId) {
              return { ...s, ...updatedData };
            }
            return s;
          });

          // Sincronizar actualización local dentro de la cola universal
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

      deleteSubestacion: (companyId, subestacionId) => {
        set((state) => ({
          companies: state.companies.map((c) => {
            if (c.id === companyId) {
              const subestaciones = c.subestaciones || [];
              return {
                ...c,
                subestaciones: subestaciones.filter((s) => s.id !== subestacionId)
              };
            }
            return c;
          }),
          subestacionesLocales: (state.subestacionesLocales || []).filter((s) => s.id !== subestacionId),
          syncQueue: state.syncQueue.filter((item) => item.id !== subestacionId)
        }));
      },

      // Remover elemento de la cola de sincronización tras envío exitoso
      removeFromQueue: (id) => {
        set((state) => ({
          syncQueue: state.syncQueue.filter((item) => item.id !== id),
          tablerosLocales: state.tablerosLocales.filter((t) => t.id !== id),
          subestacionesLocales: (state.subestacionesLocales || []).filter((s) => s.id !== id)
        }));
      }
    }),
    {
      name: 'tableroselectrico_zustand_store',
      storage: localForageStorage, // Usar localforage de forma directa
      partialize: (state) => ({
        user: state.user,
        companies: state.companies,
        tablerosLocales: state.tablerosLocales,
        subestacionesLocales: state.subestacionesLocales,
        syncQueue: state.syncQueue
      })
    }
  )
);

export default useStore;
