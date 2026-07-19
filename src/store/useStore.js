import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import localforage from 'localforage';
import { initialTablerosData } from '../data/mockTableros';

// Configurar localforage
localforage.config({
  name: 'app-tableros-electricos',
  storeName: 'inspecciones_store'
});

// Implementar almacenamiento personalizado para localforage (admite objetos Blob binarios)
const localForageStorage = {
  getItem: async (name) => {
    const value = await localforage.getItem(name);
    return value; // Retorna el objeto deserializado directamente (soporta Blobs)
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
        elementosUnifilares: [
          {
            id: '11',
            nombre: 'Tablero TD-11 (Sótano)',
            tipoElemento: 'TABLERO',
            ubicacion: 'Sótano 1',
            alimentadoPor: 'Subestación Principal',
            foto: null,
            fotoBlob: null,
            observacionesGenerales: 'Operativo',
            datosTecnicos: {
              maxPoles: 24,
              barrasPrincipales: { ia: '120', ib: '115', ic: '118' },
              breakerPrincipal: { marca: 'EATON', tipo: 'M35', amp: '225' },
              voltaje: { va: '208', vb: '205', vc: '205' },
              acometida: '3x1/0 AWG',
              circuits: [],
              neutroLlegada: { calibre: '1/0', observaciones: 'Buen estado' },
              puestaTierra: { calibre: '4 AWG', observaciones: 'Conectado a malla' }
            },
            proyectoId: 'p-1',
            companyId: 'c-1',
            createdAt: new Date().toISOString()
          },
          {
            id: 'gen-1',
            nombre: 'Generador Principal Emergencia',
            tipoElemento: 'GENERADOR',
            ubicacion: 'Patio Técnico',
            alimentadoPor: 'Tanque Principal 1000L',
            foto: null,
            fotoBlob: null,
            observacionesGenerales: 'Generador Diésel CATERPILLAR',
            datosTecnicos: {
              kva: '500 kVA',
              combustible: 'Diésel',
              voltajeGeneracion: '480/277 V',
              potenciaKw: '400 kW',
              modoOperacion: 'Automático'
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

export const useStore = create(
  persist(
    (set, get) => ({
      user: null,
      companies: initialCompanies,
      proyectosLocales: [],
      elementosLocales: [],
      subestacionesLocales: [],
      syncQueue: [], // Cola universal: { id, tipo: 'PROYECTO'|'ELEMENTO_UNIFILAR'|'SUBESTACION', companyId, payload }

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
            elementosUnifilares: p.elementosUnifilares || p.tableros || [],
            inspeccionesSubestacion: p.inspeccionesSubestacion || p.subestaciones || []
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
          elementosUnifilares: [],
          inspeccionesSubestacion: [],
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

      // 2. Gestionar ElementoUnifilar (Tablero, Transfer, Generador, Otro)
      addElementoUnifilar: (proyectoId, elementoData) => {
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

        const uuidId = elementoData.id || crypto.randomUUID();

        const nuevoElemento = {
          id: uuidId,
          nombre: elementoData.nombre,
          tipoElemento: elementoData.tipoElemento || 'TABLERO',
          ubicacion: elementoData.ubicacion || 'Sin ubicación',
          alimentadoPor: elementoData.alimentadoPor || '',
          foto: elementoData.foto || null,
          fotoBlob: elementoData.fotoBlob || null, // Soporta Blob binario offline
          observacionesGenerales: elementoData.observacionesGenerales || '',
          datosTecnicos: elementoData.datosTecnicos || {},
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
                    const elementos = p.elementosUnifilares || p.tableros || [];
                    return {
                      ...p,
                      elementosUnifilares: [...elementos, nuevoElemento]
                    };
                  }
                  return p;
                })
              };
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
          const updatedCompanies = state.companies.map((c) => ({
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
          }));

          const updatedElementosLocales = (state.elementosLocales || []).map((e) => {
            if (e.id === elementoId) {
              return { ...e, ...updatedData };
            }
            return e;
          });

          const updatedSyncQueue = state.syncQueue.map((item) => {
            if (item.id === elementoId && item.tipo === 'ELEMENTO_UNIFILAR') {
              return { ...item, payload: { ...item.payload, ...updatedData } };
            }
            return item;
          });

          return {
            companies: updatedCompanies,
            elementosLocales: updatedElementosLocales,
            syncQueue: updatedSyncQueue
          };
        });
      },

      deleteElementoUnifilar: (proyectoId, elementoId) => {
        set((state) => ({
          companies: state.companies.map((c) => ({
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
          })),
          elementosLocales: (state.elementosLocales || []).filter((e) => e.id !== elementoId),
          syncQueue: state.syncQueue.filter((item) => item.id !== elementoId)
        }));
      },

      // Métodos de compatibilidad para Tableros (delegan a ElementoUnifilar con tipo TABLERO)
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

      // 3. Crear Inspección de Subestación
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

        const uuidId = payload.id || crypto.randomUUID();

        const nuevaSubestacion = {
          ...payload,
          id: uuidId,
          proyectoId,
          empresaId: parentCompanyId,
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

      deleteSubestacion: (proyectoId, subestacionId) => {
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
      },

      removeFromQueue: (id) => {
        set((state) => ({
          syncQueue: state.syncQueue.filter((item) => item.id !== id),
          proyectosLocales: (state.proyectosLocales || []).filter((p) => p.id !== id),
          elementosLocales: (state.elementosLocales || []).filter((e) => e.id !== id),
          subestacionesLocales: (state.subestacionesLocales || []).filter((s) => s.id !== id)
        }));
      }
    }),
    {
      name: 'tableroselectrico_zustand_store',
      storage: localForageStorage,
      partialize: (state) => ({
        user: state.user,
        companies: state.companies,
        proyectosLocales: state.proyectosLocales || [],
        elementosLocales: state.elementosLocales || [],
        subestacionesLocales: state.subestacionesLocales || [],
        syncQueue: state.syncQueue
      })
    }
  )
);

export default useStore;
