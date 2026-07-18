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
    return value; // Retorna el objeto deserializado directamente
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
    proyectos: [
      {
        id: 'p-1',
        nombre: 'Proyecto Sótano / Imágenes',
        descripcion: 'Inspecciones iniciales del sótano e imágenes de la clínica.',
        tableros: [
          { ...initialTablerosData['11'], id: '11', nombre: 'Tablero TD-11 (Sótano)', proyectoId: 'p-1' },
          { ...initialTablerosData['10'], id: '10', nombre: 'Tablero TD-10 (Imágenes)', proyectoId: 'p-1' }
        ],
        subestaciones: [],
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

export const useStore = create(
  persist(
    (set, get) => ({
      user: null,
      companies: initialCompanies,
      proyectosLocales: [],
      tablerosLocales: [],
      subestacionesLocales: [],
      syncQueue: [], // Cola universal: { id, tipo: 'PROYECTO'|'TABLERO'|'SUBESTACION', companyId, payload }

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
          proyectos: []
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
        const enrichedList = companiesList.map((c) => ({
          ...c,
          proyectos: (c.proyectos || []).map((p) => ({
            ...p,
            tableros: p.tableros || [],
            subestaciones: p.subestaciones || []
          }))
        }));
        set({ companies: enrichedList });
      },

      // 1. Crear Proyecto Offline
      addProyecto: (nombre, descripcion, companyId) => {
        const { companies } = get();
        const company = companies.find((c) => c.id === companyId);
        if (!company) return { success: false, error: 'Empresa no encontrada.' };

        const uuidId = crypto.randomUUID();

        const nuevoProyecto = {
          id: uuidId,
          nombre,
          descripcion: descripcion || '',
          empresaId: companyId,
          tableros: [],
          subestaciones: [],
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

        return { success: true, proyecto: nuevoProyecto };
      },

      // 2. Crear Tablero con Cola Universal
      addTablero: (proyectoId, tableroData) => {
        const { companies } = get();
        
        // Encontrar empresa y proyecto padre
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
          proyectoId,
          companyId: parentCompanyId,
          createdAt: new Date().toISOString()
        };

        set((state) => ({
          companies: state.companies.map((c) => {
            if (c.id === parentCompanyId) {
              return {
                ...c,
                proyectos: c.proyectos.map((p) => {
                  if (p.id === proyectoId) {
                    return {
                      ...p,
                      tableros: [...p.tableros, nuevoTablero]
                    };
                  }
                  return p;
                })
              };
            }
            return c;
          }),
          tablerosLocales: [...state.tablerosLocales, nuevoTablero],
          syncQueue: [...state.syncQueue, { 
            id: uuidId, 
            tipo: 'TABLERO', 
            companyId: parentCompanyId, 
            payload: nuevoTablero 
          }]
        }));

        return { success: true, tablero: nuevoTablero };
      },

      updateTablero: (proyectoId, tableroId, updatedData) => {
        set((state) => {
          const updatedCompanies = state.companies.map((c) => ({
            ...c,
            proyectos: (c.proyectos || []).map((p) => {
              if (p.id === proyectoId) {
                return {
                  ...p,
                  tableros: p.tableros.map((t) => {
                    if (t.id === tableroId) {
                      return { ...t, ...updatedData };
                    }
                    return t;
                  })
                };
              }
              return p;
            })
          }));

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

      deleteTablero: (proyectoId, tableroId) => {
        set((state) => ({
          companies: state.companies.map((c) => ({
            ...c,
            proyectos: (c.proyectos || []).map((p) => {
              if (p.id === proyectoId) {
                return {
                  ...p,
                  tableros: p.tableros.filter((t) => t.id !== tableroId)
                };
              }
              return p;
            })
          })),
          tablerosLocales: state.tablerosLocales.filter((t) => t.id !== tableroId),
          syncQueue: state.syncQueue.filter((item) => item.id !== tableroId)
        }));
      },

      // 3. Crear Inspección de Subestación con Cola Universal
      addInspeccionSubestacion: (proyectoId, payload) => {
        const { companies } = get();
        
        // Encontrar empresa y proyecto padre
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

        const uuidId = payload.id || crypto.randomUUID();

        const nuevaSubestacion = {
          ...payload,
          id: uuidId,
          proyectoId,
          companyId: parentCompanyId,
          tipoPlantilla: 'INSPECCION_SUBESTACION',
          createdAt: new Date().toISOString()
        };

        set((state) => ({
          companies: state.companies.map((c) => {
            if (c.id === parentCompanyId) {
              return {
                ...c,
                proyectos: c.proyectos.map((p) => {
                  if (p.id === proyectoId) {
                    const subestaciones = p.subestaciones || [];
                    return {
                      ...p,
                      subestaciones: [...subestaciones, nuevaSubestacion]
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
                const subestaciones = p.subestaciones || [];
                return {
                  ...p,
                  subestaciones: subestaciones.map((s) => {
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

      deleteSubestacion: (proyectoId, subestacionId) => {
        set((state) => ({
          companies: state.companies.map((c) => ({
            ...c,
            proyectos: (c.proyectos || []).map((p) => {
              if (p.id === proyectoId) {
                const subestaciones = p.subestaciones || [];
                return {
                  ...p,
                  subestaciones: subestaciones.filter((s) => s.id !== subestacionId)
                };
              }
              return p;
            })
          })),
          subestacionesLocales: (state.subestacionesLocales || []).filter((s) => s.id !== subestacionId),
          syncQueue: state.syncQueue.filter((item) => item.id !== subestacionId)
        }));
      },

      // Remover elemento de la cola de sincronización tras envío exitoso
      removeFromQueue: (id) => {
        set((state) => ({
          syncQueue: state.syncQueue.filter((item) => item.id !== id),
          proyectosLocales: (state.proyectosLocales || []).filter((p) => p.id !== id),
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
        proyectosLocales: state.proyectosLocales || [],
        tablerosLocales: state.tablerosLocales,
        subestacionesLocales: state.subestacionesLocales,
        syncQueue: state.syncQueue
      })
    }
  )
);

export default useStore;
