import { useEffect, useState, useRef } from 'react';
import useStore from '../store/useStore';

export function useSync() {
  const { syncQueue, removeFromQueue } = useStore();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  
  // Semáforo de bloqueo para impedir la ejecución concurrente de la cola de sincronización
  const isSyncingRef = useRef(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Disparar sincronización automática cuando cambie la red o la cola de elementos
  useEffect(() => {
    if (isOnline && syncQueue.length > 0 && !isSyncingRef.current) {
      procesarColaSincronizacion();
    }
  }, [isOnline, syncQueue]);

  const procesarColaSincronizacion = async () => {
    if (isSyncingRef.current) return;

    isSyncingRef.current = true;
    setIsSyncing(true);

    // Iteración secuencial respetando el orden FIFO y la jerarquía relacional
    while (useStore.getState().syncQueue.length > 0) {
      if (!navigator.onLine) {
        setIsOnline(false);
        break; // Detener si la conexión se interrumpe físicamente durante la iteración
      }

      const currentQueue = useStore.getState().syncQueue;
      const item = currentQueue[0];

      if (!item) break;

      let res = null;

      if (item.tipo === 'PROYECTO') {
        res = await sincronizarProyecto(item.companyId, item.payload);
      } else if (item.tipo === 'ELEMENTO_UNIFILAR' || item.tipo === 'TABLERO') {
        res = await sincronizarElementoUnifilar(item.companyId, item.payload);
      } else if (item.tipo === 'SUBESTACION') {
        res = await sincronizarSubestacion(item.companyId, item.payload);
      }

      if (res) {
        if (res.success) {
          // Éxito: borrar inmediatamente de la cola en Zustand + IndexedDB
          removeFromQueue(item.id);
        } else {
          if (res.status === 'NETWORK_ERROR') {
            // Error de red física: pausar la cola para reintentar cuando regrese la conexión
            break;
          } else if (res.status === 422) {
            // BLOQUEO POR DEPENDENCIA: El proyecto padre no existe en PostgreSQL aún
            const parentId = item.payload?.proyectoId;
            let parentCompanyId = item.companyId;
            let parentTaskPayload = null;

            // 1. Buscar si la tarea PROYECTO está en la cola local
            const parentTaskInQueue = currentQueue.find(
              (q) => q.tipo === 'PROYECTO' && q.id === parentId
            );

            if (parentTaskInQueue) {
              parentCompanyId = parentTaskInQueue.companyId;
              parentTaskPayload = parentTaskInQueue.payload;
            } else {
              // 2. Buscar si el proyecto existe en las empresas locales del store
              const companies = useStore.getState().companies || [];
              for (const comp of companies) {
                const proj = (comp.proyectos || []).find((p) => p.id === parentId);
                if (proj) {
                  parentCompanyId = comp.id;
                  parentTaskPayload = proj;
                  break;
                }
              }
            }

            if (parentId && parentTaskPayload) {
              console.warn(`[AUTO RESOLVER 422] Sincronizando proyecto padre ${parentId} de inmediato para desatascar hijo ${item.id}...`);
              
              const parentRes = await sincronizarProyecto(parentCompanyId, parentTaskPayload);

              if (parentRes.success) {
                if (parentTaskInQueue) {
                  removeFromQueue(parentTaskInQueue.id);
                }
                // Reintentar inmediatamente la sincronización del hijo ahora que el padre fue creado en PostgreSQL
                const retryRes = item.tipo === 'SUBESTACION' 
                  ? await sincronizarSubestacion(item.companyId, item.payload)
                  : await sincronizarElementoUnifilar(item.companyId, item.payload);

                if (retryRes.success) {
                  removeFromQueue(item.id);
                } else {
                  console.error(`Fallo reintento de elemento tras crear proyecto padre (HTTP ${retryRes.status})`);
                  removeFromQueue(item.id);
                }
              } else {
                console.error(`Fallo la creación del proyecto padre ${parentId}`);
                removeFromQueue(item.id);
              }
            } else {
              // El proyecto no existe localmente ni en cola
              console.error(`Error 422: El proyecto asociado con ID ${parentId} no existe.`);
              alert(`Error de validación: El proyecto de destino no existe en la base de datos del servidor.\n\nDetalle: Se removió el elemento para evitar atascos.`);
              removeFromQueue(item.id);
            }
          } else {
            // Errores definitivos (400, 500, etc.): retirar y notificar
            console.error(`Error definitivo (HTTP ${res.status}) al sincronizar elemento con ID: ${item.id}`);
            alert(`Error de validación al sincronizar con el servidor.\n\nCódigo de error: ${res.status}\n\nDetalle: Se removió de la cola para evitar atascos.`);
            removeFromQueue(item.id);
          }
        }
      } else {
        // Tipo no reconocido: limpiar de la cola
        removeFromQueue(item.id);
      }
    }

    setIsSyncing(false);
    isSyncingRef.current = false;
  };

  const sincronizarProyecto = async (empresaId, proyecto) => {
    try {
      const payload = {
        id: proyecto.id,
        nombre: proyecto.nombre,
        descripcion: proyecto.descripcion || '',
        empresaId
      };

      const response = await fetch('http://localhost:3001/api/proyectos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        return { success: false, status: response.status };
      }

      return { success: true };
    } catch (error) {
      console.error('Error de red en sincronizarProyecto:', error);
      return { success: false, status: 'NETWORK_ERROR' };
    }
  };

  const sincronizarElementoUnifilar = async (empresaId, elemento) => {
    try {
      const formData = new FormData();
      formData.append('id', elemento.id);
      formData.append('nombre', elemento.nombre);
      formData.append('tipoElemento', elemento.tipoElemento || 'TABLERO');
      formData.append('ubicacion', elemento.ubicacion || '');
      formData.append('alimentadoPor', elemento.alimentadoPor || '');
      formData.append('observacionesGenerales', elemento.observacionesGenerales || '');
      formData.append('proyectoId', elemento.proyectoId);
      if (empresaId) {
        formData.append('empresaId', empresaId);
      }

      formData.append('datosTecnicos', JSON.stringify(elemento.datosTecnicos || {}));

      if (elemento.fotoBlob) {
        const fileExt = elemento.fotoBlob.type ? elemento.fotoBlob.type.split('/')[1] : 'jpg';
        formData.append('foto', elemento.fotoBlob, `foto_${elemento.id}.${fileExt}`);
      } else if (elemento.foto) {
        formData.append('fotoUrl', elemento.foto);
      }

      const response = await fetch('http://localhost:3001/api/elementos-unifilares', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        return { success: false, status: response.status };
      }

      const resJson = await response.json();
      if (resJson.data && resJson.data.foto) {
        useStore.getState().updateElementoUnifilar(elemento.proyectoId, elemento.id, {
          foto: `http://localhost:3001${resJson.data.foto}`,
          fotoBlob: null
        });
      }

      return { success: true };
    } catch (error) {
      console.error('Error de red en sincronizarElementoUnifilar:', error);
      return { success: false, status: 'NETWORK_ERROR' };
    }
  };

  const sincronizarSubestacion = async (empresaId, subestacion) => {
    try {
      const payload = {
        id: subestacion.id,
        nombre: subestacion.nombre,
        ubicacion: subestacion.ubicacion,
        fecha: subestacion.fecha,
        hora: subestacion.hora,
        inspector: subestacion.inspector,
        nivelTension: subestacion.nivelTension,
        estadoEntorno: subestacion.estadoEntorno,
        obrasCiviles: subestacion.obrasCiviles,
        equiposPrincipales: subestacion.equiposPrincipales,
        puestaTierra: subestacion.puestaTierra,
        edificioControl: subestacion.edificioControl,
        firmaInspector: subestacion.firmaInspector || null,
        firmaSupervisor: subestacion.firmaSupervisor || null,
        proyectoId: subestacion.proyectoId,
        empresaId
      };

      const response = await fetch('http://localhost:3001/api/subestaciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        return { success: false, status: response.status };
      }

      return { success: true };
    } catch (error) {
      console.error('Error de red en sincronizarSubestacion:', error);
      return { success: false, status: 'NETWORK_ERROR' };
    }
  };

  return { isOnline, isSyncing, pendingCount: syncQueue.length, triggerSync: procesarColaSincronizacion };
}

export default useSync;
