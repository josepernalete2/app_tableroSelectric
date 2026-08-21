import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiService } from '../services/api';

// Datos iniciales de demostración para funcionamiento offline inmediato
const initialEmpresasMock = [
  {
    id: 'emp-1',
    nombre: 'Clínica Valentina Canabal',
    nit: '900.123.456-7',
    proyectos: [
      {
        id: 'proy-1',
        nombre: 'Inspección Subestación Principal 2025',
        descripcion: 'Estudio de termografía y revisión de tableros de transferencia y distribución.',
        tableros: [
          {
            id: 'TAB-001',
            nombre: 'Tablero General de Distribución TGD-01',
            ubicacion: 'Cuarto Eléctrico Piso 1',
            voltajeNominal: '440V / 220V',
            corrienteNominal: '800A',
            gradoProteccion: 'IP54',
            estadoInspeccion: 'Completado',
            fechaInspeccion: '2026-02-15',
            marcasEquipos: 'Schneider Electric',
            observaciones: 'Ajuste de torque realizado en alimentador principal. Termografía normal.',
            itemsChecklist: {
              limpiezaGeneral: true,
              rotulacionSeñalizacion: true,
              aprieteConexiones: true,
              medicionAislamiento: true,
              sistemaPuestaTierra: true,
            }
          },
          {
            id: 'TAB-002',
            nombre: 'Tablero de Transferencia Automática TTA-01',
            ubicacion: 'Caseta de Generador',
            voltajeNominal: '440V',
            corrienteNominal: '1200A',
            gradoProteccion: 'IP65',
            estadoInspeccion: 'Pendiente',
            fechaInspeccion: null,
            marcasEquipos: 'ABB / ASCO',
            observaciones: 'Pendiente prueba de arranque con carga.',
            itemsChecklist: {
              limpiezaGeneral: false,
              rotulacionSeñalizacion: true,
              aprieteConexiones: false,
              medicionAislamiento: false,
              sistemaPuestaTierra: true,
            }
          },
          {
            id: 'TAB-003',
            nombre: 'Sub-Tablero Emergencia STE-P2',
            ubicacion: 'Piso 2 - UCI',
            voltajeNominal: '208V / 120V',
            corrienteNominal: '225A',
            gradoProteccion: 'IP40',
            estadoInspeccion: 'En Proceso',
            fechaInspeccion: '2026-02-18',
            marcasEquipos: 'Siemens',
            observaciones: 'Falta actualizar diagrama unifilar en acrílico de puerta.',
            itemsChecklist: {
              limpiezaGeneral: true,
              rotulacionSeñalizacion: false,
              aprieteConexiones: true,
              medicionAislamiento: true,
              sistemaPuestaTierra: true,
            }
          }
        ]
      }
    ]
  }
];

export const useStore = create(
  persist(
    (set, get) => ({
      // --- Estado Global ---
      empresas: initialEmpresasMock,
      activeEmpresaId: 'emp-1',
      activeProyectoId: 'proy-1',
      activeTableroId: 'TAB-001',
      isLoading: false,
      isOnline: true,
      pendingSyncList: [],

      // --- Acciones de Selección ---
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

      // --- Carga de Datos desde API con fallback a Cache Local ---
      fetchEmpresas: async () => {
        set({ isLoading: true });
        try {
          const data = await apiService.getEmpresas();
          if (Array.isArray(data) && data.length > 0) {
            set({ empresas: data, isOnline: true });
          }
        } catch (error) {
          console.warn('[useStore] Error fetching empresas, manteniendo cache local:', error.message);
          set({ isOnline: false });
        } finally {
          set({ isLoading: false });
        }
      },

      // --- Actualización de Inspección de Tablero ---
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

        // Registrar en cola de sincronización offline
        const syncItem = {
          tableroId,
          updateData,
          timestamp: new Date().toISOString()
        };

        set(state => ({
          empresas: updatedEmpresas,
          pendingSyncList: [...state.pendingSyncList.filter(i => i.tableroId !== tableroId), syncItem]
        }));
      },

      // --- Sincronización de Datos en Cola Offline con el Backend ---
      syncOfflineData: async () => {
        const { pendingSyncList } = get();
        if (pendingSyncList.length === 0) return { success: true, count: 0 };

        set({ isLoading: true });
        try {
          const mutationsBatch = pendingSyncList.map(item => ({
            entity: 'Tablero',
            id: item.tableroId,
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
      name: 'selectric-mobile-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

export default useStore;
