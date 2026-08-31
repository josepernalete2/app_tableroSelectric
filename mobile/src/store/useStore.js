import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiService } from '../services/api';

// Datos de demostración completos para funcionamiento offline inmediato
const initialEmpresasMock = [
  {
    id: 'emp-1',
    nombre: 'Clínica Valentina Canabal',
    rif: 'J-30584920-1',
    direccionFiscal: 'Av. Libertador con Calle 33, Barquisimeto',
    proyectos: [
      {
        id: 'proy-1',
        nombre: 'Inspección Subestación y Tableros 2026',
        direccion: 'Edificio Principal - Área Quirófanos y UCI',
        descripcion: 'Estudio de termografía, balance de cargas y diagramas unifilares.',
        subestaciones: [
          {
            id: 'SUB-01',
            nombre: 'Subestación Principal 13.8kV / 480V',
            ubicacion: 'Patio Exterior Sur',
            inspector: 'Ing. Carlos Mendoza',
            nivelTension: '13.8 kV',
            fecha: '2026-02-20',
            hora: '09:30 AM',
            estadoEntorno: { orden: 'BUENO', maleza: false, drenajes: 'OPERATIVOS' },
            puestaTierra: { estado: 'BUENO', continuidad: true, valorMedidoOhms: '2.4' },
            equiposPrincipales: { transformadorPrincipal: 'BUENO', fugasAceite: false, temperatura: '58°C' }
          }
        ],
        tableros: [
          {
            id: 'TAB-001',
            codigo: 'TAB-001',
            nombre: 'Tablero General de Distribución TGD-01',
            ubicacion: 'Sótano Sala de Máquinas',
            maxPolos: 42,
            tension: '480V / 277V',
            fases: 3,
            voltajeNominal: '480V / 277V',
            corrienteNominal: '800A',
            gradoProteccion: 'IP54',
            estadoInspeccion: 'Completado',
            fechaInspeccion: '2026-02-25',
            marcasEquipos: 'Schneider Electric',
            observaciones: 'Ajuste de torque realizado en alimentador principal 3x500 MCM. Termografía en rango normal.',
            breakerPrincipal: {
              marca: 'Schneider Electric',
              modelo: 'Compact NSX800',
              amperaje: 800,
              polos: 3,
              tipo: 'Caja Moldeada (MCCB)',
              capacidadInterruptiva: '65 kA'
            },
            barrasPrincipales: {
              capacidadAmperios: 1000,
              material: 'Cobre Electrolítico',
              tensionPrueba: '600V'
            },
            acometida: {
              calibre: '3x(3x500 MCM) + 1x500 Neutro',
              canalizacion: 'Bandeja Portacables 600mm'
            },
            puestaTierra: {
              calibre: '1x4/0 AWG Desnudo',
              resistenciaOhms: 3.2,
              estado: 'Óptimo'
            },
            circuitos: [
              { id: 'c-1', posicionPolo: 1, numPolos: 3, amperaje: 150, descripcion: 'Alimentador Tablero Climatización Quirófanos', fase: 'A-B-C', estado: 'ACTIVO', tipoBreaker: 'Termomagnético' },
              { id: 'c-2', posicionPolo: 4, numPolos: 3, amperaje: 100, descripcion: 'Bomba de Agua Contra Incendios BCI-01', fase: 'A-B-C', estado: 'ACTIVO', tipoBreaker: 'Guardamotor' },
              { id: 'c-3', posicionPolo: 7, numPolos: 2, amperaje: 60, descripcion: 'Sistema UPS Sala de Servidores', fase: 'A-B', estado: 'ACTIVO', tipoBreaker: 'Termomagnético' },
              { id: 'c-4', posicionPolo: 9, numPolos: 1, amperaje: 20, descripcion: 'Iluminación y Tomacorrientes Pasillo Central', fase: 'C', estado: 'ACTIVO', tipoBreaker: 'Termomagnético' },
              { id: 'c-5', posicionPolo: 10, numPolos: 3, amperaje: 70, descripcion: 'Reserva Futura Sala Rayos X', fase: 'A-B-C', estado: 'RESERVA', tipoBreaker: 'N/A' },
              { id: 'c-6', posicionPolo: 13, numPolos: 1, amperaje: 20, descripcion: 'Tomas Auxiliares Cuarto Eléctrico', fase: 'A', estado: 'ACTIVO', tipoBreaker: 'Termomagnético' },
            ]
          },
          {
            id: 'TAB-002',
            codigo: 'TAB-002',
            nombre: 'Tablero Transferencia Automática TTA-01',
            ubicacion: 'Caseta de Generador de Emergencia',
            maxPolos: 30,
            tension: '480V / 277V',
            fases: 3,
            voltajeNominal: '480V',
            corrienteNominal: '1200A',
            gradoProteccion: 'IP65',
            estadoInspeccion: 'En Proceso',
            fechaInspeccion: '2026-02-27',
            marcasEquipos: 'ABB / ASCO',
            observaciones: 'Revisión periódica de contactores de potencia y módulo de control DSE.',
            breakerPrincipal: {
              marca: 'ABB',
              modelo: 'Emax E2.2',
              amperaje: 1200,
              polos: 3,
              tipo: 'Interruptor de Bastidor Abierto (ACB)',
              capacidadInterruptiva: '85 kA'
            },
            barrasPrincipales: {
              capacidadAmperios: 1600,
              material: 'Cobre Plateado',
              tensionPrueba: '1000V'
            },
            acometida: {
              calibre: '4x(3x500 MCM)',
              canalizacion: 'Ducto Subterráneo PVC 4"'
            },
            puestaTierra: {
              calibre: '2x4/0 AWG',
              resistenciaOhms: 2.1,
              estado: 'Óptimo'
            },
            circuitos: [
              { id: 'c-201', posicionPolo: 1, numPolos: 3, amperaje: 800, descripcion: 'Alimentación Normal desde Transformador', fase: 'A-B-C', estado: 'ACTIVO', tipoBreaker: 'ACB' },
              { id: 'c-202', posicionPolo: 4, numPolos: 3, amperaje: 800, descripcion: 'Alimentación Emergencia desde Generador', fase: 'A-B-C', estado: 'ACTIVO', tipoBreaker: 'ACB' },
              { id: 'c-203', posicionPolo: 7, numPolos: 1, amperaje: 15, descripcion: 'Cargador de Baterías 24VDC', fase: 'A', estado: 'ACTIVO', tipoBreaker: 'Termomagnético' },
            ]
          },
          {
            id: 'TAB-003',
            codigo: 'TAB-003',
            nombre: 'Sub-Tablero Emergencia UCI STE-P2',
            ubicacion: 'Piso 2 - Ala Quirúrgica',
            maxPolos: 24,
            tension: '208V / 120V',
            fases: 3,
            voltajeNominal: '208V / 120V',
            corrienteNominal: '225A',
            gradoProteccion: 'IP40',
            estadoInspeccion: 'Pendiente',
            fechaInspeccion: null,
            marcasEquipos: 'Siemens',
            observaciones: 'Requiere actualización de acrílico unifilar y verificación de bornes neutros.',
            breakerPrincipal: {
              marca: 'Siemens',
              modelo: 'ED4 225A',
              amperaje: 225,
              polos: 3,
              tipo: 'MCCB',
              capacidadInterruptiva: '35 kA'
            },
            barrasPrincipales: {
              capacidadAmperios: 250,
              material: 'Cobre',
              tensionPrueba: '600V'
            },
            acometida: {
              calibre: '4x4/0 AWG THHN',
              canalizacion: 'Tubería EMT 2-1/2"'
            },
            puestaTierra: {
              calibre: '#2 AWG Aislado Verde',
              resistenciaOhms: 1.8,
              estado: 'Óptimo'
            },
            circuitos: [
              { id: 'c-301', posicionPolo: 1, numPolos: 1, amperaje: 20, descripcion: 'Tomas Aisladas Cama UCI 01', fase: 'A', estado: 'ACTIVO', tipoBreaker: 'Grado Hospitalario' },
              { id: 'c-302', posicionPolo: 2, numPolos: 1, amperaje: 20, descripcion: 'Tomas Aisladas Cama UCI 02', fase: 'B', estado: 'ACTIVO', tipoBreaker: 'Grado Hospitalario' },
              { id: 'c-303', posicionPolo: 3, numPolos: 1, amperaje: 20, descripcion: 'Tomas Aisladas Cama UCI 03', fase: 'C', estado: 'ACTIVO', tipoBreaker: 'Grado Hospitalario' },
              { id: 'c-304', posicionPolo: 4, numPolos: 2, amperaje: 30, descripcion: 'Equipo Monitoreo Hemodinámico', fase: 'A-B', estado: 'ACTIVO', tipoBreaker: 'Termomagnético' },
            ]
          }
        ]
      }
    ]
  },
  {
    id: 'emp-2',
    nombre: 'Central Azucarero Río Turbio',
    rif: 'J-00048291-0',
    direccionFiscal: 'Carretera Vieja Yaritagua Km 7',
    proyectos: [
      {
        id: 'proy-2',
        nombre: 'Inspección Eléctrica Zafra 2026',
        direccion: 'Área de Molinos y Calderas',
        descripcion: 'Verificación de Centros de Control de Motores (CCM) y Tableros de Fuerza.',
        subestaciones: [],
        tableros: [
          {
            id: 'TAB-101',
            codigo: 'TAB-101',
            nombre: 'CCM Molino No. 1 Fuerza Principal',
            ubicacion: 'Nave de Molienda',
            maxPolos: 42,
            tension: '480V',
            fases: 3,
            voltajeNominal: '480V',
            corrienteNominal: '1600A',
            gradoProteccion: 'IP55 NEMA 12',
            estadoInspeccion: 'Completado',
            fechaInspeccion: '2026-02-10',
            marcasEquipos: 'Eaton Cutler-Hammer',
            observaciones: 'Gavetas limpias y engrasadas. Termografía óptima en contactores.',
            circuitos: []
          }
        ]
      }
    ]
  }
];

export const useStore = create(
  persist(
    (set, get) => ({
      // --- Autenticación ---
      user: { id: 'u-1', username: 'inspector_selectric', email: 'inspector@selectric.com', role: 'WORKER' },
      token: null,

      login: async (username, password) => {
        set({ isLoading: true });
        try {
          const res = await apiService.login({ username, password });
          if (res.token) {
            await AsyncStorage.setItem('auth_token', res.token);
            set({ user: res.user || { username, role: 'WORKER' }, token: res.token, isOnline: true });
            return { success: true };
          }
          return { success: false, error: 'Credenciales incorrectas' };
        } catch (err) {
          // Bypass offline para trabajo en campo si el servidor no responde
          if (username.toLowerCase().includes('admin') || username.toLowerCase().includes('worker') || username.toLowerCase().includes('inspector') || password.length >= 4) {
            const fallbackUser = {
              id: 'u-offline',
              username: username || 'Inspector de Campo',
              email: `${username}@selectric.com`,
              role: username.toLowerCase().includes('admin') ? 'ADMIN' : 'WORKER'
            };
            set({ user: fallbackUser, isOnline: false });
            return { success: true, offline: true };
          }
          return { success: false, error: err.message };
        } finally {
          set({ isLoading: false });
        }
      },

      logout: async () => {
        await AsyncStorage.removeItem('auth_token');
        set({ user: null, token: null });
      },

      // --- Datos Globales ---
      empresas: initialEmpresasMock,
      activeEmpresaId: 'emp-1',
      activeProyectoId: 'proy-1',
      activeTableroId: 'TAB-001',
      isLoading: false,
      isOnline: true,
      pendingSyncList: [],

      // --- Selección de Entidades ---
      setActiveEmpresa: (empresaId) => {
        const empresa = get().empresas.find(e => e.id === empresaId);
        const firstProy = empresa?.proyectos?.[0]?.id || null;
        const firstTab = empresa?.proyectos?.[0]?.tableros?.[0]?.id || null;
        set({
          activeEmpresaId: empresaId,
          activeProyectoId: firstProy,
          activeTableroId: firstTab,
        });
      },

      setActiveProyecto: (proyectoId) => {
        const empresa = get().empresas.find(e => e.id === get().activeEmpresaId);
        const proyecto = empresa?.proyectos?.find(p => p.id === proyectoId);
        const firstTab = proyecto?.tableros?.[0]?.id || null;
        set({ activeProyectoId: proyectoId, activeTableroId: firstTab });
      },

      setActiveTablero: (tableroId) => {
        set({ activeTableroId: tableroId });
      },

      // --- Carga de Datos desde API ---
      fetchEmpresas: async () => {
        set({ isLoading: true });
        try {
          const data = await apiService.getEmpresas();
          if (Array.isArray(data) && data.length > 0) {
            set({ empresas: data, isOnline: true });
          }
        } catch (error) {
          console.warn('[useStore] Manteniendo cache local de empresas:', error.message);
          set({ isOnline: false });
        } finally {
          set({ isLoading: false });
        }
      },

      // --- Actualización de Ficha Técnica / Inspección de Tablero ---
      updateTableroInspeccion: (tableroId, updateData) => {
        const { empresas, activeEmpresaId, activeProyectoId } = get();

        const updatedEmpresas = empresas.map(emp => {
          if (emp.id !== activeEmpresaId) return emp;
          return {
            ...emp,
            proyectos: (emp.proyectos || []).map(proy => {
              if (proy.id !== activeProyectoId) return proy;
              return {
                ...proy,
                tableros: (proy.tableros || []).map(tab => {
                  if (tab.id !== tableroId) return tab;
                  return {
                    ...tab,
                    ...updateData,
                    fechaInspeccion: new Date().toISOString().split('T')[0]
                  };
                })
              };
            })
          };
        });

        const syncItem = {
          entity: 'Tablero',
          id: tableroId,
          updateData,
          timestamp: new Date().toISOString()
        };

        set(state => ({
          empresas: updatedEmpresas,
          pendingSyncList: [...state.pendingSyncList.filter(i => i.id !== tableroId), syncItem]
        }));
      },

      // --- Manejo de Circuitos en Tablero ---
      updateCircuito: (tableroId, circuitoId, updatedFields) => {
        const { empresas, activeEmpresaId, activeProyectoId } = get();

        const updatedEmpresas = empresas.map(emp => {
          if (emp.id !== activeEmpresaId) return emp;
          return {
            ...emp,
            proyectos: (emp.proyectos || []).map(proy => {
              if (proy.id !== activeProyectoId) return proy;
              return {
                ...proy,
                tableros: (proy.tableros || []).map(tab => {
                  if (tab.id !== tableroId) return tab;
                  const newCircuitos = (tab.circuitos || []).map(c => {
                    if (c.id !== circuitoId) return c;
                    return { ...c, ...updatedFields };
                  });
                  return { ...tab, circuitos: newCircuitos };
                })
              };
            })
          };
        });

        set({ empresas: updatedEmpresas });
      },

      addCircuito: (tableroId, newCircuito) => {
        const { empresas, activeEmpresaId, activeProyectoId } = get();

        const updatedEmpresas = empresas.map(emp => {
          if (emp.id !== activeEmpresaId) return emp;
          return {
            ...emp,
            proyectos: (emp.proyectos || []).map(proy => {
              if (proy.id !== activeProyectoId) return proy;
              return {
                ...proy,
                tableros: (proy.tableros || []).map(tab => {
                  if (tab.id !== tableroId) return tab;
                  const circuitos = tab.circuitos || [];
                  const id = newCircuito.id || `c-${Date.now()}`;
                  return { ...tab, circuitos: [...circuitos, { ...newCircuito, id }] };
                })
              };
            })
          };
        });

        set({ empresas: updatedEmpresas });
      },

      deleteCircuito: (tableroId, circuitoId) => {
        const { empresas, activeEmpresaId, activeProyectoId } = get();

        const updatedEmpresas = empresas.map(emp => {
          if (emp.id !== activeEmpresaId) return emp;
          return {
            ...emp,
            proyectos: (emp.proyectos || []).map(proy => {
              if (proy.id !== activeProyectoId) return proy;
              return {
                ...proy,
                tableros: (proy.tableros || []).map(tab => {
                  if (tab.id !== tableroId) return tab;
                  return {
                    ...tab,
                    circuitos: (tab.circuitos || []).filter(c => c.id !== circuitoId)
                  };
                })
              };
            })
          };
        });

        set({ empresas: updatedEmpresas });
      },

      // --- Sincronización Offline por Lotes ---
      syncOfflineData: async () => {
        const { pendingSyncList } = get();
        if (pendingSyncList.length === 0) return { success: true, count: 0 };

        set({ isLoading: true });
        try {
          const mutationsBatch = pendingSyncList.map(item => ({
            entity: item.entity || 'Tablero',
            id: item.id,
            operation: 'UPDATE',
            data: item.updateData
          }));

          await apiService.syncBatch(mutationsBatch);
          set({ pendingSyncList: [], isOnline: true });
          return { success: true, count: pendingSyncList.length };
        } catch (error) {
          console.error('[useStore] Fallo al sincronizar datos móviles:', error.message);
          set({ isOnline: false });
          return { success: false, error: error.message };
        } finally {
          set({ isLoading: false });
        }
      },
    }),
    {
      name: 'selectric-mobile-app-store',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

export default useStore;
