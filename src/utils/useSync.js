import { useEffect, useState, useRef } from 'react';
import useStore from '../store/useStore';
import { API_BASE_URL } from './api';

/**
 * Convierte un DataURL (Base64) a un objeto binario Blob nativo del navegador.
 */
export function dataURLtoBlob(dataUrl) {
  if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:')) {
    return null;
  }
  try {
    const arr = dataUrl.split(',');
    const mimeMatch = arr[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  } catch (e) {
    console.warn('[SYNC CLIENT] ⚠️ Error al convertir DataURL a Blob:', e);
    return null;
  }
}

/**
 * Determina de forma exhaustiva si un elemento de la cola posee una imagen adjunta
 * (ya sea como Blob en memoria o como DataURL Base64 persistido).
 */
export function tieneImagenAdjunta(item) {
  if (!item || !item.payload) return false;
  const p = item.payload;
  if (p.fotoBlob && (typeof Blob !== 'undefined' && p.fotoBlob instanceof Blob)) {
    return true;
  }
  if (typeof p.foto === 'string' && p.foto.startsWith('data:image')) {
    return true;
  }
  if (typeof p.fotoUrl === 'string' && p.fotoUrl.startsWith('data:image')) {
    return true;
  }
  return false;
}

export function useSync() {
  const syncQueue = useStore((state) => state.syncQueue || []);
  const removeFromQueue = useStore((state) => state.removeFromQueue);
  const isStoreSyncing = useStore((state) => state.isSyncing || false);
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

  // Control de reintentos con backoff progresivo para evitar bucles infinitos
  const retryCountRef = useRef(0);
  const lastSyncAttemptRef = useRef(0);
  const syncTimeoutRef = useRef(null);

  // Disparar sincronización automática cuando cambie la red o la cola de elementos (con backoff progresivo)
  useEffect(() => {
    if (isOnline && syncQueue.length > 0 && !isSyncingRef.current) {
      // Si ya fallaron 5 intentos automáticos consecutivos, pausar para no saturar la red ni bloquear el hilo
      if (retryCountRef.current >= 5) {
        console.warn('[SYNC CLIENT] ⏸️ Reintentos automáticos en pausa tras 5 intentos sin éxito. Presione "Sincronizar Ahora" para forzar reintento.');
        return;
      }

      const backoffMs = Math.min(2000 * Math.pow(1.5, retryCountRef.current), 25000);
      const now = Date.now();
      const elapsed = now - lastSyncAttemptRef.current;

      if (elapsed < backoffMs) {
        if (!syncTimeoutRef.current) {
          syncTimeoutRef.current = setTimeout(() => {
            syncTimeoutRef.current = null;
            if (!isSyncingRef.current && useStore.getState().syncQueue.length > 0) {
              lastSyncAttemptRef.current = Date.now();
              procesarColaSincronizacion();
            }
          }, backoffMs - elapsed);
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

  const procesarColaSincronizacion = async (isManual = false) => {
    if (isSyncingRef.current) return { success: false, busy: true };

    if (isManual) {
      retryCountRef.current = 0;
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
        syncTimeoutRef.current = null;
      }
    }

    const token = getFreshToken();
    if (!token || token === 'mock-offline-token') {
      // Modo offline local sin backend configurado
      return { success: false, offline: true, error: 'Sin sesión activa con el servidor central' };
    }

    try {
      isSyncingRef.current = true;
      setIsSyncing(true);
      useStore.getState().setIsSyncing?.(true);

      const currentQueue = [...useStore.getState().syncQueue];
      if (currentQueue.length === 0) {
        return { success: true, count: 0 };
      }

      console.group(`🔄 [SYNC DEPURACIÓN] Procesando cola de sincronización (${currentQueue.length} elementos pendientes)`);
      console.table(currentQueue.map((item, idx) => ({
        Indice: idx,
        ID_Cola: item.id,
        ID_Payload: item.payload?.id,
        Tipo: item.tipo,
        Operacion: item.operation || item.accion || item.operacion || 'UPSERT',
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

        // Aislamiento de Archivos en la Cola:
        // Si el elemento contiene una imagen (fotoBlob real o DataURL Base64),
        // se aísla de inmediato para procesarse individualmente vía FormData multipart.
        if (tieneImagenAdjunta(item)) {
          console.log(`[SYNC CLIENT] 📎 Elemento aislado para envío multipart individual: ${item.id} (${item.payload?.nombre || item.tipo})`);
          continue;
        }

        let entityName = 'ElementoUnifilar';
        if (item.tipo === 'PROYECTO') entityName = 'Proyecto';
        else if (item.tipo === 'ELEMENTO_UNIFILAR' || item.tipo === 'TABLERO' || item.tipo === 'ELEMENTO') entityName = 'ElementoUnifilar';
        else if (item.tipo === 'SUBESTACION') entityName = 'Subestacion';
        else if (item.tipo === 'PUNTO_MEDICION') entityName = 'PuntoMedicion';
        else if (item.tipo === 'CCM') entityName = 'Ccm';
        else if (item.tipo === 'INSPECCION_TERMOGRAFICA') entityName = 'InspeccionTermografica';
        else if (item.tipo === 'INSPECCION_ATERRAMIENTO') entityName = 'InspeccionAterramiento';
        else if (item.tipo === 'INSPECCION_TANQUE_COMBUSTIBLE') entityName = 'InspeccionTanqueCombustible';

        const mutationData = { ...(item.payload || {}) };
        // Solo aplicar lógica de eliminación de foto en entidades que soportan imágenes
        if ((item.tipo === 'ELEMENTO_UNIFILAR' || item.tipo === 'TABLERO' || item.tipo === 'ELEMENTO') && !mutationData.foto && !mutationData.fotoBlob) {
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
          operation: item.operation || item.accion || item.operacion || 'UPSERT',
          baseVersion: item.payload?.version || 1,
          data: mutationData
        });
        queueItemsMap.set(mutationId, item.id);
      }

      let batchAppliedCount = 0;
      let batchConflictCount = 0;

      if (jsonMutations.length > 0) {
        console.log(`[SYNC CLIENT] 📦 Enviando ${jsonMutations.length} mutaciones estructuradas en lote al servidor...`);
        let batchRes = await sincronizarLote(jsonMutations);

        // FALLBACK ROBUSTO: Si el envío en lote falla por error HTTP o excepción del servidor
        // (por ejemplo por un registro atípico o timeout), iterar individualmente para que no se pierdan
        // las demás mutaciones de campo.
        if (!batchRes.success && batchRes.status !== 401 && batchRes.status !== 403) {
          console.warn(`[SYNC CLIENT] ⚠️ El lote completo no pudo procesarse (${batchRes.status || 'ERROR'}). Iniciando fallback iterativo individual...`);
          const fallbackApplied = [];
          const fallbackConflicts = [];

          for (const singleMutation of jsonMutations) {
            if (!navigator.onLine) break;
            try {
              console.log(`[SYNC CLIENT] 🔄 Reintentando mutación individual: ${singleMutation.entity} (${singleMutation.id})...`);
              const singleRes = await sincronizarLote([singleMutation]);
              if (singleRes.success && singleRes.data?.applied?.length > 0) {
                fallbackApplied.push(...singleRes.data.applied);
              } else {
                fallbackConflicts.push({ id: singleMutation.id, error: singleRes.error || 'Fallo individual' });
              }
            } catch (singleErr) {
              fallbackConflicts.push({ id: singleMutation.id, error: singleErr.message });
            }
          }

          if (fallbackApplied.length > 0) {
            batchRes = {
              success: true,
              data: {
                applied: fallbackApplied,
                conflicts: fallbackConflicts,
                appliedIds: fallbackApplied.map((a) => a.id),
                conflictIds: fallbackConflicts.map((c) => c.id)
              }
            };
          }
        }

        if (batchRes.success) {
          const appliedItems = batchRes.data?.applied || [];
          const conflicts = batchRes.data?.conflicts || [];

          batchAppliedCount = appliedItems.length;
          batchConflictCount = conflicts.length;
          console.log(`[SYNC CLIENT] 🎯 Elementos de lote aplicados por el backend: ${appliedItems.length}`);

          // Remover los elementos del lote que se aplicaron exitosamente
          const appliedIdSet = new Set([
            ...appliedItems.map((a) => a.id),
            ...(batchRes.data?.appliedIds || []),
            ...(conflicts.length === 0 ? jsonMutations.map((m) => m.id) : [])
          ]);
          const idsToRemove = [];
          currentQueue.forEach((item) => {
            const itemId = item.id;
            const payloadId = item.payload?.id;
            if (appliedIdSet.has(itemId) || (payloadId && appliedIdSet.has(payloadId))) {
              if (itemId) idsToRemove.push(itemId);
              if (payloadId) idsToRemove.push(payloadId);
            }
          });
          appliedItems.forEach((appItem) => {
            const queueId = queueItemsMap.get(appItem.id) || appItem.id;
            if (queueId) idsToRemove.push(queueId);
            if (appItem.id) idsToRemove.push(appItem.id);
          });
          if (idsToRemove.length > 0) {
            useStore.getState().removeBatchFromQueue?.(idsToRemove);
          }

          // Actualizar versiones y registros en store
          appliedItems.forEach((appItem) => {
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
          return { success: false, status: batchRes.status, error: 'Sesión expirada' };
        } else {
          // Error de red o del servidor: NO DESCARTAR LOS DATOS LOCALES.
          console.warn(`[SYNC RETRY] Falló sincronización de lote (${batchRes.status || 'ERROR'}). Manteniendo datos locales intactos.`);
          retryCountRef.current += 1;
          return { success: false, status: batchRes.status, error: batchRes.error || 'Error de respuesta del servidor' };
        }
      }

      // Procesar elementos aislados con archivos (FormData individual / multipart/form-data)
      const currentQueueAfterBatch = useStore.getState().syncQueue || [];
      const multipartItems = currentQueueAfterBatch.filter((item) => tieneImagenAdjunta(item));
      let multipartSuccessCount = 0;

      for (const item of multipartItems) {
        if (!navigator.onLine) {
          setIsOnline(false);
          break;
        }

        console.log(`[SYNC MULTIPART] 📸 Sincronizando elemento individual con imagen: ${item.id}...`);
        let res = null;
        if (item.tipo === 'PROYECTO') {
          res = await sincronizarProyecto(item.companyId, item.payload);
        } else if (item.tipo === 'ELEMENTO_UNIFILAR' || item.tipo === 'TABLERO' || item.tipo === 'ELEMENTO' || !item.tipo) {
          res = await sincronizarElementoUnifilar(item.companyId, item.payload, item.id);
        } else if (item.tipo === 'SUBESTACION') {
          res = await sincronizarSubestacion(item.companyId, item.payload);
        } else if (item.tipo === 'PUNTO_MEDICION') {
          res = await sincronizarPuntoMedicion(item.companyId, item.payload);
        } else if (item.tipo === 'CCM') {
          res = await sincronizarCcm(item.companyId, item.payload);
        }

        if (res && res.success) {
          multipartSuccessCount++;
          console.log(`[SYNC MULTIPART] ✅ Archivo e información sincronizados con éxito para ${item.id}`);
          removeFromQueue(item.id);
          if (item.payload?.id && item.payload.id !== item.id) {
            removeFromQueue(item.payload.id);
          }
        } else if (res && (res.status === 401 || res.status === 403)) {
          useStore.getState().handleAuthError?.(res.status);
          break;
        } else {
          // IMPORTANTE: NO USAR break para no congelar la cola. Continuar con los demás elementos.
          console.warn(`[SYNC MULTIPART] ⚠️ No se pudo enviar elemento con archivo ${item.id} (${res?.error || res?.status || 'Error'}). Continuando con la cola.`);
          continue;
        }
      }

      const finalQueueLength = useStore.getState().syncQueue.length;

      if (batchAppliedCount > 0 || multipartSuccessCount > 0) {
        retryCountRef.current = 0;
      }

      // Si la cola se vació por completo de manera exitosa, actualizar datos consolidados desde el servidor
      if (finalQueueLength === 0) {
        console.log('[SYNC CLIENT] 🎉 Toda la cola se sincronizó exitosamente. Banner en verde esmeralda.');
        useStore.getState().showToast?.('¡Todos los datos y fotografías han sido sincronizados exitosamente!', 'success');
        await useStore.getState().pullInitialData?.();
      }

      return {
        success: finalQueueLength === 0 || (batchAppliedCount > 0 || multipartSuccessCount > 0),
        appliedCount: batchAppliedCount + multipartSuccessCount,
        conflictCount: batchConflictCount,
        remainingCount: finalQueueLength
      };
    } catch (criticalErr) {
      console.error('[SYNC CRITICAL] 💥 Excepción no controlada en procesarColaSincronizacion:', criticalErr);
      return { success: false, error: criticalErr.message || 'Error inesperado' };
    } finally {
      setIsSyncing(false);
      isSyncingRef.current = false;
      useStore.getState().setIsSyncing?.(false);
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

  const sincronizarElementoUnifilar = async (empresaId, elemento, queueItemId) => {
    try {
      const elementId = elemento.id || queueItemId;
      const formData = new FormData();
      formData.append('id', elementId);
      formData.append('nombre', elemento.nombre || elemento.codigo || 'Elemento Unifilar');
      formData.append('tipoElemento', elemento.tipoElemento || 'TABLERO');
      formData.append('ubicacion', elemento.ubicacion || '');
      formData.append('alimentadoPor', elemento.alimentadoPor || '');
      formData.append('observacionesGenerales', elemento.observacionesGenerales || '');
      formData.append('proyectoId', elemento.proyectoId || '');

      const compId = empresaId || elemento.empresaId || elemento.companyId;
      if (compId) {
        formData.append('empresaId', compId);
      }

      if (elemento.datosTecnicos) {
        formData.append('datosTecnicos', JSON.stringify(elemento.datosTecnicos));
      }

      // Preparación y mapeo robusto del binario hacia FormData
      let fileBlob = null;
      if (elemento.fotoBlob && (typeof Blob !== 'undefined' && elemento.fotoBlob instanceof Blob)) {
        fileBlob = elemento.fotoBlob;
      } else if (typeof elemento.foto === 'string' && elemento.foto.startsWith('data:image')) {
        fileBlob = dataURLtoBlob(elemento.foto);
      } else if (typeof elemento.fotoUrl === 'string' && elemento.fotoUrl.startsWith('data:image')) {
        fileBlob = dataURLtoBlob(elemento.fotoUrl);
      }

      if (fileBlob) {
        const fileExt = fileBlob.type ? (fileBlob.type.split('/')[1] || 'jpg') : 'jpg';
        formData.append('foto', fileBlob, `foto_${elementId}.${fileExt}`);
      } else if (elemento.foto && typeof elemento.foto === 'string') {
        formData.append('fotoUrl', elemento.foto);
      } else if (elemento.eliminarFoto) {
        formData.append('eliminarFoto', 'true');
        formData.append('foto', '');
      }

      const token = getFreshToken();
      // Enviar primeramente al endpoint de sincronización multipart dedicado (/api/sync/upload)
      let response = await fetch(`${API_BASE_URL}/api/sync/upload`, {
        method: 'POST',
        headers: {
          ...(token && token !== 'mock-offline-token' ? { 'Authorization': `Bearer ${token}` } : {})
          // No incluir Content-Type para permitir boundary automático multipart
        },
        body: formData
      });

      if (response.status === 404) {
        response = await fetch(`${API_BASE_URL}/api/elementos-unifilares`, {
          method: 'POST',
          headers: {
            ...(token && token !== 'mock-offline-token' ? { 'Authorization': `Bearer ${token}` } : {})
          },
          body: formData
        });
      }

      if (response.status === 401 || response.status === 403) {
        useStore.getState().handleAuthError?.(response.status);
        return { success: false, status: response.status };
      }

      if (!response.ok) {
        const errText = await response.text();
        console.error(`[SYNC MULTIPART] ❌ Error HTTP ${response.status}:`, errText);
        return { success: false, status: response.status, error: errText };
      }

      const resJson = await response.json();
      const record = resJson.data || resJson;
      if (record) {
        const returnedFoto = record.foto || resJson.foto;
        const normalizedFoto = returnedFoto
          ? ((returnedFoto.startsWith('data:') || returnedFoto.startsWith('http://') || returnedFoto.startsWith('https://') || returnedFoto.startsWith('blob:'))
              ? returnedFoto
              : `${API_BASE_URL}${returnedFoto}`)
          : null;

        useStore.getState().updateElementoUnifilar(elemento.proyectoId, elementId, {
          foto: normalizedFoto,
          fotoBlob: null,
          version: record.version || 1
        });
      }

      return { success: true, data: record };
    } catch (error) {
      console.error('[SYNC MULTIPART] 🔌 Error de red en sincronizarElementoUnifilar:', error);
      return { success: false, status: 'NETWORK_ERROR', error: error.message };
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
    isSyncing: isSyncing || isStoreSyncing,
    pendingCount: syncQueue.length,
    triggerSync: () => procesarColaSincronizacion(true),
    syncPendingData: () => procesarColaSincronizacion(true),
    pullInitialData: () => useStore.getState().pullInitialData?.()
  };
}

export default useSync;

