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
            id: '20',
            nombre: 'Tablero Principal (No. 20)',
            tipoElemento: 'TABLERO',
            ubicacion: 'SOTANO SALA DE TABLEROS',
            alimentadoPor: 'ATS SOTANO (TRANSFERENCIA AUTOMATICA) transferecia 580',
            foto: null,
            fotoBlob: null,
            observacionesGenerales: 'SALEN ACOMETIDAS 1 X 500 Y 1X250 MCM DE LA BARRA PARTE INFERIOR. LA ACOMETIDA 250 MCM VA A CAJA CON UN BREAKER AL LADO DEL TABLERO PRINCIPAL. INTERRUPTOR EATON, Ki400, 350 A. SALEN UNA ACOMETIDA 4/0 QUE ALIMENTA TRANSFERENCIA 160. LA ACOMETIDA 500 MCM VA A UNA CAJA AL LADO DEL TABLERO PRINCIPAL. INTERRUPTOR ABB, TIPO 6520, 400 A, SALEN 2X500 Y ALIMENTAN TABLERO EN PRIMER PISO.',
            datosTecnicos: {
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
            id: 'transf-est-580',
            nombre: 'Transferencia 580 - Estacionamiento',
            tipoElemento: 'TRANSFER',
            ubicacion: 'ESTACIONAMIENTO',
            alimentadoPor: 'GENERADOR 580 1 + GENERADOR 580 2',
            foto: null,
            fotoBlob: null,
            observacionesGenerales: 'TRANSFERENCIA ALIMENTADA POR LOS DOS GENERADORES',
            datosTecnicos: {
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
            id: 'transf-sotano-580',
            nombre: 'Transferencia 580 - Sótano Sala Técnica',
            tipoElemento: 'TRANSFER',
            ubicacion: 'SOTANO SALA TECNICA',
            alimentadoPor: 'TRANSFERENCIA DOMOSA + CORPOELEC',
            foto: null,
            fotoBlob: null,
            observacionesGenerales: 'PASA DIRECTAMENTE AL TABLERO .',
            datosTecnicos: {
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
            id: 'gen-1',
            nombre: 'Generador No. 1 DOMOSA 580 KVA',
            tipoElemento: 'GENERADOR',
            ubicacion: 'ESTACIONAMIENTO',
            alimentadoPor: 'TRANSFERENCIA DOMOSA EN ESTACIONAMIENTO',
            foto: null,
            fotoBlob: null,
            observacionesGenerales: 'Generador No. 1 DOMOSA 580 KVA ubicado en el estacionamiento.',
            datosTecnicos: {
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
            id: 'gen-2',
            nombre: 'Generador No. 2 DOMOSA 580 KVA',
            tipoElemento: 'GENERADOR',
            ubicacion: 'ESTACIONAMIENTO',
            alimentadoPor: 'TRANSFERENCIA DOMOSA EN ESTACIONAMIENTO',
            foto: null,
            fotoBlob: null,
            observacionesGenerales: 'Generador No. 2 DOMOSA 580 KVA ubicado en el estacionamiento.',
            datosTecnicos: {
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
