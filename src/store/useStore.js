import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import localforage from 'localforage';
import { initialTablerosData } from '../data/mockTableros';

// Configurar localforage
localforage.config({
  name: 'app-tableros-electricos',
  storeName: 'inspecciones_store'
});

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
            id: '11',
            nombre: 'Tablero Principal (TAB 20)',
            tipoElemento: 'TABLERO',
            ubicacion: 'Sótano - Sala Técnica',
            alimentadoPor: 'Transferencia 580',
            foto: null,
            fotoBlob: null,
            observacionesGenerales: 'Alimentado directamente por transferencia 580 sin protección principal.',
            datosTecnicos: {
              maxPoles: 30,
              voltajeAcometida: '208/120 V',
              barrasPrincipales: { ia: '211.5', ib: '207.4', ic: '208.6' },
              breakerPrincipal: { marca: 'N/A (Sin Breaker)', tipo: 'Directo', amp: '0' },
              voltaje: { va: '211.5', vb: '207.4', vc: '208.6' },
              acometida: '3X500 MCM',
              circuits: [],
              neutroLlegada: { calibre: '1X500', observaciones: 'Llega en barra' },
              puestaTierra: { calibre: 'Sólido #4', observaciones: 'Malla de tierra' }
            },
            proyectoId: 'p-1',
            companyId: 'c-1',
            createdAt: new Date().toISOString()
          },
          {
            id: 'trafo-1',
            nombre: 'Transformador Pedestal 500 KVA',
            tipoElemento: 'TRANSFORMADOR',
            ubicacion: 'Exterior / Banco de Transformadores',
            alimentadoPor: 'CORPOELEC LARA 13.8 kV',
            foto: null,
            fotoBlob: null,
            observacionesGenerales: 'Transformador tipo pedestal Marca GE de 500 KVA conexión estrella-estrella.',
            datosTecnicos: {
              kva: '500 KVA',
              marca: 'General Electric (GE)',
              tipoTransformador: 'Pedestal',
              conexion: 'Estrella - Estrella (Aterrizado)',
              voltajePrimario: '13.8 kV',
              voltajeSecundario: '208 / 120 V'
            },
            proyectoId: 'p-1',
            companyId: 'c-1',
            createdAt: new Date().toISOString()
          },
          {
            id: 'gen-1',
            nombre: 'Generador DOMOSA 1 - 580 KVA',
            tipoElemento: 'GENERADOR',
            ubicacion: 'Estacionamiento Exterior',
            alimentadoPor: 'Tanque Gasoil Principal',
            foto: null,
            fotoBlob: null,
            observacionesGenerales: 'Generador principal de la clínica, interruptor CHINT 1600 A.',
            datosTecnicos: {
              kva: '580 kVA',
              marca: 'DOMOSA',
              combustible: 'Diésel / Gasoil',
              voltajeGeneracion: '208 / 120 V',
              potenciaKw: '464 kW',
              modoOperacion: 'Automático ATS 580',
              amperaje: '1600 A'
            },
            proyectoId: 'p-1',
            companyId: 'c-1',
            createdAt: new Date().toISOString()
          },
          {
            id: 'spt-1',
            nombre: 'Malla de Puesta a Tierra N° 1 (Principal)',
            tipoElemento: 'PUESTA_TIERRA',
            ubicacion: 'Estructura de Concreto / Tanquilla',
            alimentadoPor: 'Conexión a TAB 20',
            foto: null,
            fotoBlob: null,
            observacionesGenerales: 'Presenta corriente de fuga de 6.4A. Requiere independizar tierra de equipos sensibles.',
            datosTecnicos: {
              resistenciaOhmios: 'Medición pendiente',
              corrienteFugaAmperios: '6.4 A',
              tipoMalla: 'Malla Antigua Concreto',
              cableAcometida: 'N° 6 TW / Sólido #4',
              estadoEmpalmes: 'Requiere revisión y normalización'
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
      syncQueue: [],

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

      // LÓGICA DE CREACIÓN ADAPTATIVA DENTRO Y FUERA DE PROYECTO
      addElementoUnifilar: (arg1, arg2) => {
        const proyectoId = typeof arg1 === 'string' ? arg1 : (arg1?.proyectoId || arg2?.proyectoId);
        const elementoData = typeof arg1 === 'string' ? arg2 : arg1;

        if (!proyectoId) {
          return { success: false, error: 'Debe seleccionar un proyecto para asociar el elemento.' };
        }

        const { companies } = get();

        let parentCompanyId = elementoData?.companyId || elementoData?.empresaId || null;
        let targetProyecto = null;

        for (const company of companies) {
          const proj = (company.proyectos || []).find((p) => p.id === proyectoId);
          if (proj) {
            parentCompanyId = company.id;
            targetProyecto = proj;
            break;
          }
        }

        if (!targetProyecto) return { success: false, error: 'Proyecto no encontrado en la base de datos.' };

        const uuidId = elementoData.id || crypto.randomUUID();

        const nuevoElemento = {
          id: uuidId,
          nombre: elementoData.nombre,
          tipoElemento: elementoData.tipoElemento || 'TABLERO',
          ubicacion: elementoData.ubicacion || 'Sin ubicación',
          alimentadoPor: elementoData.alimentadoPor || '',
          foto: elementoData.foto || null,
          fotoBlob: elementoData.fotoBlob || null,
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
