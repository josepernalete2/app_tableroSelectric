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
      token: null,
      usersList: [
        { id: 'u-1', username: 'admin1', password: 'admin1', role: 'ADMIN' },
        { id: 'u-2', username: 'admin2', password: 'admin2', role: 'ADMIN' }
      ],
      companies: initialCompanies,
      proyectosLocales: [],
      elementosLocales: [],
      subestacionesLocales: [],
      syncQueue: [],
      socket: null,
      toast: { show: false, message: '', type: 'success' },

      showToast: (message, type = 'success') => set({ toast: { show: true, message, type } }),
      hideToast: () => set((state) => ({ toast: { ...state.toast, show: false } })),
      setSocket: (socket) => set({ socket }),

      fetchUsersList: async () => {
        try {
          const { token } = get();
          const res = await fetch(`${API_BASE_URL}/api/users`, {
            headers: {
              ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            }
          });
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
          const res = await fetch(`${API_BASE_URL}/api/messages/${userId}`, {
            headers: {
              ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            }
          });
          const data = await res.json();
          if (data.ok) {
            set({ messages: data.data });
          }
        } catch (e) {
          console.error('Error al cargar lista de mensajes:', e);
        }
      },

      login: async (username, password) => {
        if (navigator.onLine) {
          try {
            const res = await fetch(`${API_BASE_URL}/api/login`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ username, password })
            });
            const data = await res.json();
            if (data.ok) {
              set({ user: data.user, token: data.token });
              get().fetchMessagesList(data.user.id);
              get().fetchUsersList();
              return { success: true, user: data.user };
            } else {
              return { success: false, error: data.error || 'Usuario o contraseña incorrectos.' };
            }
          } catch (e) {
            console.error('Error de red al iniciar sesión:', e);
          }
        }

        // Fallback offline
        let list = get().usersList || [];
        const hasAdmin1 = list.some((u) => {
          const name = (u.username || u.email || '').toLowerCase().trim();
          return name === 'admin1' || name === 'admin1@selectric.com';
        });
        
        if (!hasAdmin1) {
          const defaultAdmins = [
            { id: 'u-1', username: 'admin1', password: 'admin1', role: 'ADMIN' },
            { id: 'u-2', username: 'admin2', password: 'admin2', role: 'ADMIN' }
          ];
          list = [...defaultAdmins, ...list.filter(u => u.id !== 'u-1' && u.id !== 'u-2')];
          set({ usersList: list });
        }

        const found = list.find((u) => {
          const userKey = (u.username || u.email || '').toLowerCase().trim();
          const inputKey = username.toLowerCase().trim();
          const isUserMatch = userKey === inputKey ||
                              (userKey === 'admin1' && inputKey === 'admin1@selectric.com') ||
                              (userKey === 'admin1@selectric.com' && inputKey === 'admin1') ||
                              (userKey === 'admin2' && inputKey === 'admin2@selectric.com') ||
                              (userKey === 'admin2@selectric.com' && inputKey === 'admin2');
                              
          return isUserMatch && u.password === password;
        });

        if (found) {
          set({ user: found, token: 'mock-offline-token' });
          return { success: true, user: found };
        }
        return { success: false, error: 'Usuario o contraseña incorrectos.' };
      },

      logout: () => {
        set({ user: null, token: null });
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

      updateProyecto: async (companyId, proyectoId, updatedData) => {
        set((state) => ({
          companies: state.companies.map((c) => {
            if (c.id === companyId) {
              return {
                ...c,
                proyectos: (c.proyectos || []).map((p) => {
                  if (p.id === proyectoId) {
                    return { ...p, ...updatedData };
                  }
                  return p;
                })
              };
            }
            return c;
          })
        }));

        if (navigator.onLine) {
          try {
            const { token } = get();
            await fetch(`${API_BASE_URL}/api/proyectos/${proyectoId}`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {})
              },
              body: JSON.stringify(updatedData)
            });
          } catch (e) {
            console.error('Error al actualizar proyecto en el servidor:', e);
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
        if (!uuidId) {
          const allElements = [];
          get().companies.forEach(c => {
            if (c.elementosUnifilares) {
              allElements.push(...c.elementosUnifilares);
            }
            if (c.proyectos) {
              c.proyectos.forEach(p => {
                const list = p.elementosUnifilares || p.tableros || [];
                allElements.push(...list);
              });
            }
          });

          const prefixMap = {
            TABLERO: 'TAB',
            TRANSFORMADOR: 'TRAFO',
            GENERADOR: 'GEN',
            TRANSFER: 'ATS',
            PUESTA_TIERRA: 'PAT',
            BANCO_CONDENSADOR: 'BC',
            OTRO: 'OTR',
            SUBESTACION: 'SUB'
          };
          const prefix = prefixMap[elementoData.tipoElemento || 'TABLERO'] || 'ELM';
          const matchingElements = allElements.filter(e => e.id && e.id.startsWith(`${prefix}-`));
          let nextNum = 1;
          if (matchingElements.length > 0) {
            const nums = matchingElements.map(e => {
              const parts = e.id.split('-');
              const num = parseInt(parts[parts.length - 1], 10);
              return isNaN(num) ? 0 : num;
            });
            nextNum = Math.max(...nums) + 1;
          }
          uuidId = `${prefix}-${nextNum}`;
        }

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

      removeFromQueue: (id) => {
        set((state) => ({
          syncQueue: state.syncQueue.filter((item) => item.id !== id),
          proyectosLocales: (state.proyectosLocales || []).filter((p) => p.id !== id),
          elementosLocales: (state.elementosLocales || []).filter((e) => e.id !== id),
          subestacionesLocales: (state.subestacionesLocales || []).filter((s) => s.id !== id)
        }));
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
        syncQueue: state.syncQueue
      })
    }
  )
);

export default useStore;
