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
    ]
  },
  {
    id: 'c-2',
    nombre: 'Alimentos Polar Planta Turmero',
    tableros: []
  }
];

export const useStore = create(
  persist(
    (set, get) => ({
      user: null,
      companies: initialCompanies,
      tablerosLocales: [],
      syncQueue: [],

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
          tableros: []
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
        set({ companies: companiesList });
      },

      // Crear Tablero Offline con UUID v4 y soporte de Blobs para fotos
      addTablero: (companyId, tableroData) => {
        const { companies } = get();
        const company = companies.find((c) => c.id === companyId);
        if (!company) return { success: false, error: 'Empresa no encontrada.' };

        // El ID único del tablero en el frontend se autogenera con UUID v4
        const uuidId = crypto.randomUUID();

        const nuevoTablero = {
          id: uuidId,
          clientId: tableroData.id || uuidId, // Código/ID ingresado por el inspector (ej: TD-11)
          nombre: tableroData.nombre,
          ubicacion: tableroData.ubicacion || 'Sin ubicación',
          alimentadoPor: tableroData.alimentadoPor || '',
          tipo: tableroData.tipo || 'superficial',
          foto: null, // URL del servidor (cuando se sincronice)
          fotoBlob: tableroData.fotoBlob || null, // Guardado directo en IndexedDB como objeto Blob
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
              return { ...c, tableros: [...c.tableros, nuevoTablero] };
            }
            return c;
          }),
          tablerosLocales: [...state.tablerosLocales, nuevoTablero],
          syncQueue: [...state.syncQueue, { action: 'CREATE_TABLERO', companyId, tableroId: uuidId }]
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

          // Actualizar en tableros locales si está pendiente de sincronización
          const updatedTablerosLocales = state.tablerosLocales.map((t) => {
            if (t.id === tableroId) {
              return { ...t, ...updatedData };
            }
            return t;
          });

          return {
            companies: updatedCompanies,
            tablerosLocales: updatedTablerosLocales
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
          syncQueue: state.syncQueue.filter((item) => item.tableroId !== tableroId)
        }));
      },

      // Remover elemento de la cola de sincronización tras envío exitoso
      removeFromQueue: (tableroId) => {
        set((state) => ({
          syncQueue: state.syncQueue.filter((item) => item.tableroId !== tableroId),
          tablerosLocales: state.tablerosLocales.filter((t) => t.id !== tableroId)
        }));
      }
    }),
    {
      name: 'tableroselectrico_zustand_store',
      storage: localForageStorage // Usar localforage de forma directa
    }
  )
);

export default useStore;
