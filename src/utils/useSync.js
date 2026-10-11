import { useEffect, useState, useRef } from 'react';
import useStore from '../store/useStore';
import { API_BASE_URL } from './api';

export function useSync() {
  const { syncQueue, removeFromQueue } = useStore();
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [isSyncing, setIsSyncing] = useState(false);
  
  // Semáforo de bloqueo para impedir la ejecución concurrente de la cola de sincronización
  const isSyncingRef = useRef(false);

  const getFreshToken = () => {
    return useStore.getState().token || (typeof localStorage !== 'undefined' ? localStorage.getItem('token') : '') || '';
  };

  const getAuthHeaders = (extra = {}) => {
    const token = getFreshToken();
    return {
      'Content-Type': 'application/json',
      ...(token && token !== 'mock-offline-token' ? { 'Authorization': `Bearer ${token}` } : {}),
      ...extra
    };
  };

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Al recuperar conexión: Prioridad Local (Local-First).
      // Si existen cambios locales pendientes en la cola, DEBEN procesarse primero
      // antes de cualquier pull para que el servidor no sobrescriba el estado local.
      const state = useStore.getState();
      if (state.syncQueue && state.syncQueue.length > 0) {
        procesarColaSincronizacion();
      } else if (state.token && state.token !== 'mock-offline-token') {
        state.pullInitialData?.();
      }
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Control de reintentos y tiempo de espera para evitar bucles infinitos
  const lastSyncAttemptRef = useRef(0);
  const syncTimeoutRef = useRef(null);

  // Disparar sincronización automática cuando cambie la red o la cola de elementos (con throttle)
  useEffect(() => {
    if (isOnline && syncQueue.length > 0 && !isSyncingRef.current) {
      const now = Date.now();
      const elapsed = now - lastSyncAttemptRef.current;
      if (elapsed < 3000) {
        if (!syncTimeoutRef.current) {
          syncTimeoutRef.current = setTimeout(() => {
            syncTimeoutRef.current = null;
            if (!isSyncingRef.current && useStore.getState().syncQueue.length > 0) {
              procesarColaSincronizacion();
            }
          }, 3000 - elapsed);
        }
        return;
      }
      lastSyncAttemptRef.current = now;
      procesarColaSincronizacion();
    }
  }, [isOnline, syncQueue.length]);

  const sincronizarLote = async (mutaciones) => {
    try {
      console.log(`[SYNC CLIENT] 📤 Enviando lote de ${mutaciones.length} mutaciones a ${API_BASE_URL}/api/sync/batch`);
      const response = await fetch(`${API_BASE_URL}/api/sync/batch`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ mutations: mutaciones })
      });

      console.log(`[SYNC CLIENT] 📥 Respuesta del backend: HTTP ${response.status} ${response.statusText}`);

      if (response.status === 401 || response.status === 403) {
        console.warn(`[SYNC CLIENT] 🔒 Error de autenticación HTTP ${response.status}. Pausando sincronización.`);
        useStore.getState().handleAuthError?.(response.status);
        return { success: false, status: response.status };
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[SYNC CLIENT] ❌ Error HTTP ${response.status} devuelto por el servidor:`, errorText);
        return { success: false, status: response.status, error: errorText };
      }

      const json = await response.json();
      console.log(`[SYNC CLIENT] ✅ Lote respondido con éxito:`, json);
      return { success: true, data: json };
    } catch (err) {
      console.error('[SYNC CLIENT] 🔌 Error de red en sincronizarLote:', err);
      return { success: false, status: 'NETWORK_ERROR', error: err.message };
    }
  };

  const procesarColaSincronizacion = async () => {
    if (isSyncingRef.current) return;

    const token = getFreshToken();
    if (!token || token === 'mock-offline-token') {
      // Modo offline local sin backend configurado
      return;
    }

    try {
      isSyncingRef.current = true;
      setIsSyncing(true);

      const currentQueue = [...useStore.getState().syncQueue];
      if (currentQueue.length === 0) {
        return;
      }

      console.group(`🔄 [SYNC DEPURACIÓN] Procesando cola de sincronización (${currentQueue.length} elementos pendientes)`);
      console.table(currentQueue.map((item, idx) => ({
        Indice: idx,
        ID_Cola: item.id,
        ID_Payload: item.payload?.id,
        Tipo: item.tipo,
        Operacion: item.operation || 'UPSERT',
        Nombre: item.payload?.nombre || item.payload?.codigo || 'Sin nombre',
        TieneFotoBlob: Boolean(item.payload?.fotoBlob)
      })));

      // Separar elementos sin archivos para sincronización en lote (batch) y elementos con archivos
      const jsonMutations = [];
      const queueItemsMap = new Map();

      for (const item of currentQueue) {
        if (!item) continue;
        
        // Registrar IDs en el mapa para resolución inversa segura
        if (item.id) queueItemsMap.set(item.id, item.id);
        if (item.payload?.id) queueItemsMap.set(item.payload.id, item.id);

        // Si el elemento tiene un archivo de imagen fotoBlob, debe enviarse via FormData
        if (item.payload && item.payload.fotoBlob) {
          continue;
        }

        let entityName = 'ElementoUnifilar';
        if (item.tipo === 'PROYECTO') entityName = 'Proyecto';
        else if (item.tipo === 'ELEMENTO_UNIFILAR' || item.tipo === 'TABLERO') entityName = 'ElementoUnifilar';
        else if (item.tipo === 'SUBESTACION') entityName = 'Subestacion';
        else if (item.tipo === 'PUNTO_MEDICION') entityName = 'PuntoMedicion';
        else if (item.tipo === 'CCM') entityName = 'Ccm';
        else if (item.tipo === 'INSPECCION_TERMOGRAFICA') entityName = 'InspeccionTermografica';
        else if (item.tipo === 'INSPECCION_ATERRAMIENTO') entityName = 'InspeccionAterramiento';
        else if (item.tipo === 'INSPECCION_TANQUE_COMBUSTIBLE') entityName = 'InspeccionTanqueCombustible';

        const mutationData = { ...(item.payload || {}) };
        // Solo aplicar lógica de eliminación de foto en entidades que soportan imágenes
        if ((item.tipo === 'ELEMENTO_UNIFILAR' || item.tipo === 'TABLERO') && !mutationData.foto && !mutationData.fotoBlob) {
          mutationData.foto = null;
          mutationData.eliminarFoto = true;
        }

        if (item.companyId && !mutationData.empresaId) {
          mutationData.empresaId = item.companyId;
        }

        const mutationId = item.payload?.id || item.id;
        jsonMutations.push({
          entity: entityName,
          id: mutationId,
          operation: item.operation || 'UPSERT',
          baseVersion: item.payload?.version || 1,
          data: mutationData
        });
        queueItemsMap.set(mutationId, item.id);
      }

      if (jsonMutations.length > 0) {
        console.log(`[SYNC CLIENT] 📦 Enviando ${jsonMutations.length} mutaciones estructuradas en lote al servidor...`);
        const batchRes = await sincronizarLote(jsonMutations);

        if (batchRes.success) {
          const appliedItems = batchRes.data?.applied || [];
          const conflicts = batchRes.data?.conflicts || [];
          const appliedIdSet = new Set([
            ...appliedItems.map((a) => a.id),
            ...(batchRes.data?.appliedIds || [])
          ]);

          console.log(`[SYNC CLIENT] 🎯 Elementos aplicados por el backend: ${appliedItems.length}`);

          // Remover del queue local TODOS los elementos procesados exitosamente
          currentQueue.forEach((item) => {
            const itemId = item.id;
            const payloadId = item.payload?.id;
            if (appliedIdSet.has(itemId) || (payloadId && appliedIdSet.has(payloadId))) {
              console.log(`[SYNC CLIENT] 🗑️ Removiendo de la cola item confirmado: ${itemId}${payloadId ? ' / ' + payloadId : ''}`);
              removeFromQueue(itemId);
              if (payloadId) removeFromQueue(payloadId);
            }
          });

          // Actualizar versiones y registros en store
          appliedItems.forEach((appItem) => {
            const queueId = queueItemsMap.get(appItem.id) || appItem.id;
            if (queueId) removeFromQueue(queueId);

            if (appItem.record) {
              const rec = appItem.record;
              if (appItem.entity === 'ElementoUnifilar' || appItem.entity === 'Tablero') {
                useStore.getState().updateElementoUnifilar(rec.proyectoId, appItem.id, {
                  foto: rec.foto || null,
                  fotoBlob: null,
                  version: rec.version
                });
              } else if (appItem.entity === 'Subestacion') {
                useStore.getState().updateSubestacion(rec.proyectoId, appItem.id, {
                  version: rec.version
                });
              } else if (appItem.entity === 'PuntoMedicion') {
                useStore.getState().updatePuntoMedicion(rec.proyectoId, appItem.id, {
                  version: rec.version
                });
              } else if (appItem.entity === 'Ccm') {
                useStore.getState().updateCcm(rec.proyectoId, appItem.id, {
                  version: rec.version
                });
              }
            }
          });

          // Notificar detalladamente en consola si hubo conflictos
          if (conflicts.length > 0) {
            console.warn(`[SYNC CLIENT] ⚠️ Conflictos reportados por el servidor (${conflicts.length}):`);
            console.table(conflicts);
          }
        } else if (batchRes.status === 401 || batchRes.status === 403) {
          console.warn(`[SYNC AUTH] Error HTTP ${batchRes.status}: Sesión expirada. Pausando sincronización.`);
          return;
        } else {
          // Error de red o del servidor: NO DESCARTAR LOS DATOS LOCALES.
          console.warn(`[SYNC RETRY] Falló sincronización de lote (${batchRes.status || 'ERROR'}). Manteniendo datos locales intactos.`);
          return;
        }
      }

      // Procesar elementos restantes con archivos (FormData individual)
      const remainingQueue = [...useStore.getState().syncQueue];
      for (const item of remainingQueue) {
        if (!navigator.onLine) {
          setIsOnline(false);
          break;
        }

        // Solo procesar aquellos que tienen fotoBlob binario pendiente
        if (!item.payload?.fotoBlob) continue;

        console.log(`[SYNC BLOB] 📸 Enviando archivo para elemento ${item.id}...`);
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

        if (res && res.success) {
          console.log(`[SYNC BLOB] ✅ Archivo sincronizado con éxito para ${item.id}`);
          removeFromQueue(item.id);
        } else if (res && (res.status === 401 || res.status === 403)) {
          useStore.getState().handleAuthError?.(res.status);
          break;
        } else {
          console.warn(`[SYNC BLOB] ⚠️ No se pudo enviar elemento con archivo ${item.id}. Manteniendo en cola.`);
          break;
        }
      }

      // Si la cola se vació por completo de manera exitosa, actualizar datos consolidados desde el servidor
      if (useStore.getState().syncQueue.length === 0) {
        console.log('[SYNC CLIENT] 🎉 Toda la cola se sincronizó exitosamente. Actualizando estado consolidado.');
        await useStore.getState().pullInitialData?.();
      }
    } catch (criticalErr) {
      console.error('[SYNC CRITICAL] 💥 Excepción no controlada en procesarColaSincronizacion:', criticalErr);
    } finally {
      setIsSyncing(false);
      isSyncingRef.current = false;
      console.groupEnd();
    }
  };

  const sincronizarProyecto = async (empresaId, proyecto) => {
    try {
      const respNom = proyecto.responsableNombre || (typeof proyecto.responsable === 'object' ? proyecto.responsable?.nombre : proyecto.responsable) || '';
      const respTel = proyecto.responsableTelefono || (typeof proyecto.responsable === 'object' ? proyecto.responsable?.telefono : '') || '';
      const respMail = proyecto.responsableEmail || (typeof proyecto.responsable === 'object' ? proyecto.responsable?.email : '') || '';
      const dir = proyecto.direccion || proyecto.ubicacion || '';

      const payload = {
        id: proyecto.id,
        nombre: proyecto.nombre,
        descripcion: proyecto.descripcion || '',
        direccion: dir,
        ubicacion: dir,
        responsableNombre: respNom,
        responsableTelefono: respTel,
        responsableEmail: respMail,
        responsable: {
          nombre: respNom,
          telefono: respTel,
          email: respMail
        },
        empresaId
      };

      const response = await fetch(`${API_BASE_URL}/api/proyectos`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
      });

      if (response.status === 401 || response.status === 403) {
        useStore.getState().handleAuthError?.(response.status);
        return { success: false, status: response.status };
      }

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
      } else {
        formData.append('eliminarFoto', 'true');
        formData.append('foto', '');
      }

      const token = getFreshToken();
      const response = await fetch(`${API_BASE_URL}/api/elementos-unifilares`, {
        method: 'POST',
        headers: {
          ...(token && token !== 'mock-offline-token' ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: formData
      });

      if (response.status === 401 || response.status === 403) {
        useStore.getState().handleAuthError?.(response.status);
        return { success: false, status: response.status };
      }

      if (!response.ok) {
        return { success: false, status: response.status };
      }

      const resJson = await response.json();
      if (resJson.data) {
        const returnedFoto = resJson.data.foto;
        const normalizedFoto = returnedFoto
          ? ((returnedFoto.startsWith('data:') || returnedFoto.startsWith('http://') || returnedFoto.startsWith('https://') || returnedFoto.startsWith('blob:'))
              ? returnedFoto
              : `${API_BASE_URL}${returnedFoto}`)
          : null;

        useStore.getState().updateElementoUnifilar(elemento.proyectoId, elemento.id, {
          foto: normalizedFoto,
          fotoBlob: null,
          version: resJson.data.version
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

      const response = await fetch(`${API_BASE_URL}/api/subestaciones`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
      });

      if (response.status === 401 || response.status === 403) {
        useStore.getState().handleAuthError?.(response.status);
        return { success: false, status: response.status };
      }

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

      const response = await fetch(`${API_BASE_URL}/api/puntos-medicion`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
      });

      if (response.status === 401 || response.status === 403) {
        useStore.getState().handleAuthError?.(response.status);
        return { success: false, status: response.status };
      }

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

      const response = await fetch(`${API_BASE_URL}/api/ccm`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
      });

      if (response.status === 401 || response.status === 403) {
        useStore.getState().handleAuthError?.(response.status);
        return { success: false, status: response.status };
      }

      if (!response.ok) {
        return { success: false, status: response.status };
      }

      return { success: true };
    } catch (error) {
      console.error('Error de red en sincronizarCcm:', error);
      return { success: false, status: 'NETWORK_ERROR' };
    }
  };

  return {
    isOnline,
    isSyncing,
    pendingCount: syncQueue.length,
    triggerSync: procesarColaSincronizacion,
    syncPendingData: procesarColaSincronizacion,
    pullInitialData: () => useStore.getState().pullInitialData?.()
  };
}

export default useSync;

