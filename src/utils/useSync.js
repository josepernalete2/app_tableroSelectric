import { useEffect, useState, useRef } from 'react';
import useStore from '../store/useStore';
import { API_BASE_URL } from './api';

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

  const sincronizarLote = async (mutaciones) => {
    try {
      const token = useStore.getState().token;
      const response = await fetch(`${API_BASE_URL}/api/sync/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ mutations: mutaciones })
      });

      if (response.status === 401 || response.status === 403) {
        useStore.getState().handleAuthError?.(response.status);
        return { success: false, status: response.status };
      }

      if (!response.ok) {
        return { success: false, status: response.status };
      }

      const json = await response.json();
      return { success: true, data: json };
    } catch (err) {
      console.error('Error en sincronizarLote:', err);
      return { success: false, status: 'NETWORK_ERROR' };
    }
  };

  const procesarColaSincronizacion = async () => {
    if (isSyncingRef.current) return;

    isSyncingRef.current = true;
    setIsSyncing(true);

    const currentQueue = [...useStore.getState().syncQueue];
    if (currentQueue.length === 0) {
      setIsSyncing(false);
      isSyncingRef.current = false;
      return;
    }

    // Separar elementos sin archivos para sincronización en lote (batch) y elementos con archivos
    const jsonMutations = [];
    const queueItemsMap = new Map();

    for (const item of currentQueue) {
      if (!item) continue;
      
      // Si el elemento tiene un archivo de imagen fotoBlob, debe enviarse via FormData
      if (item.payload && item.payload.fotoBlob) {
        continue;
      }

      let entityName = 'Tablero';
      if (item.tipo === 'PROYECTO') entityName = 'Proyecto';
      else if (item.tipo === 'ELEMENTO_UNIFILAR' || item.tipo === 'TABLERO') entityName = 'ElementoUnifilar';
      else if (item.tipo === 'SUBESTACION') entityName = 'Subestacion';
      else if (item.tipo === 'PUNTO_MEDICION') entityName = 'PuntoMedicion';
      else if (item.tipo === 'CCM') entityName = 'Ccm';

      jsonMutations.push({
        entity: entityName,
        id: item.payload?.id || item.id,
        operation: item.operation || 'UPSERT',
        baseVersion: item.payload?.version || 1,
        data: item.payload
      });
      queueItemsMap.set(item.payload?.id || item.id, item.id);
    }

    if (jsonMutations.length > 0) {
      const batchRes = await sincronizarLote(jsonMutations);

      if (batchRes.success) {
        // Remover del queue local los elementos procesados exitosamente
        (batchRes.data.applied || []).forEach(appItem => {
          const queueId = queueItemsMap.get(appItem.id);
          if (queueId) removeFromQueue(queueId);
        });

        // Notificar en consola si hubo conflictos OCC
        if (batchRes.data.conflicts && batchRes.data.conflicts.length > 0) {
          console.warn('⚠️ Se detectaron conflictos OCC al sincronizar:', batchRes.data.conflicts);
        }
      } else if (batchRes.status === 401 || batchRes.status === 403) {
        console.warn(`[SYNC AUTH] Error HTTP ${batchRes.status}: Sesión expirada. Pausando sincronización.`);
        setIsSyncing(false);
        isSyncingRef.current = false;
        return;
      }
    }

    // Procesar secuencialmente elementos restantes (ej. aquellos con fotos)
    while (useStore.getState().syncQueue.length > 0) {
      if (!navigator.onLine) {
        setIsOnline(false);
        break;
      }

      const queueNow = useStore.getState().syncQueue;
      const item = queueNow[0];
      if (!item) break;

      let res = null;
      if (item.tipo === 'PROYECTO') {
        res = await sincronizarProyecto(item.companyId, item.payload);
      } else if (item.tipo === 'ELEMENTO_UNIFILAR' || item.tipo === 'TABLERO') {
        res = await sincronizarElementoUnifilar(item.companyId, item.payload);
      } else if (item.tipo === 'SUBESTACION') {
        res = await sincronizarSubestacion(item.companyId, item.payload);
      } else if (item.tipo === 'PUNTO_MEDICION') {
        res = await sincronizarPuntoMedicion(item.companyId, item.payload);
      } else if (item.tipo === 'CCM') {
        res = await sincronizarCcm(item.companyId, item.payload);
      }

      if (res) {
        if (res.success) {
          removeFromQueue(item.id);
        } else {
          if (res.status === 'NETWORK_ERROR') break;
          if (res.status === 401 || res.status === 403) break;
          removeFromQueue(item.id);
        }
      } else {
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

      const token = useStore.getState().token;
      const response = await fetch(`${API_BASE_URL}/api/proyectos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
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

      const token = useStore.getState().token;
      const response = await fetch(`${API_BASE_URL}/api/elementos-unifilares`, {
        method: 'POST',
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: formData
      });

      if (!response.ok) {
        return { success: false, status: response.status };
      }

      const resJson = await response.json();
      if (resJson.data && resJson.data.foto) {
        useStore.getState().updateElementoUnifilar(elemento.proyectoId, elemento.id, {
          foto: `${API_BASE_URL}${resJson.data.foto}`,
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

      const token = useStore.getState().token;
      const response = await fetch(`${API_BASE_URL}/api/subestaciones`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
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

  const sincronizarPuntoMedicion = async (empresaId, punto) => {
    try {
      const payload = {
        ...punto,
        empresaId
      };

      const token = useStore.getState().token;
      const response = await fetch(`${API_BASE_URL}/api/puntos-medicion`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        return { success: false, status: response.status };
      }

      return { success: true };
    } catch (error) {
      console.error('Error de red en sincronizarPuntoMedicion:', error);
      return { success: false, status: 'NETWORK_ERROR' };
    }
  };

  const sincronizarCcm = async (empresaId, ccmItem) => {
    try {
      const payload = {
        ...ccmItem,
        empresaId
      };

      const token = useStore.getState().token;
      const response = await fetch(`${API_BASE_URL}/api/ccm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        return { success: false, status: response.status };
      }

      return { success: true };
    } catch (error) {
      console.error('Error de red en sincronizarCcm:', error);
      return { success: false, status: 'NETWORK_ERROR' };
    }
  };

  return { isOnline, isSyncing, pendingCount: syncQueue.length, triggerSync: procesarColaSincronizacion };
}

export default useSync;
