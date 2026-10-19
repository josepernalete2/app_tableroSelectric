import { useEffect, useState, useRef, useCallback } from 'react';
import useStore from '../store/useStore.js';
import { API_BASE_URL } from './api.js';

export const DEFAULT_REQUEST_TIMEOUT_MS = 10000; // 10 segundos por petición estándar
export const MULTIPART_REQUEST_TIMEOUT_MS = 15000; // 15 segundos para subida binaria de fotos
export const SYNC_BATCH_SIZE = 3; // Lotes pequeños de 3 en 3 para evitar saturación y timeouts

/**
 * Envoltorio robusto para fetch con timeout configurable mediante AbortController.
 * Evita bloqueos indefinidos ("pensando") cuando la red celular o Wi-Fi es inestable.
 */
export async function fetchWithTimeout(url, options = {}, timeoutMs = DEFAULT_REQUEST_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort(new Error(`Timeout de red (${timeoutMs / 1000}s)`));
  }, timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    return response;
  } catch (err) {
    if (err.name === 'AbortError' || controller.signal.aborted) {
      throw new Error(`Tiempo de espera agotado (${timeoutMs / 1000}s). El servidor no respondió a tiempo.`);
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

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

/**
 * Prioridad de sincronización relacional (Parents First -> Children Next)
 */
const ENTITY_SYNC_PRIORITY = {
  'PROYECTO': 1,
  'SUBESTACION': 2,
  'ELEMENTO_UNIFILAR': 3,
  'TABLERO': 3,
  'ELEMENTO': 3,
  'CCM': 4,
  'PUNTO_MEDICION': 5,
  'INSPECCION_TERMOGRAFICA': 6,
  'INSPECCION_ATERRAMIENTO': 7,
  'INSPECCION_TANQUE_COMBUSTIBLE': 8
};

/**
 * Prepara la estructura de mutación para el endpoint /api/sync/batch
 */
export function prepareMutation(item) {
  if (!item) return null;
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
  delete mutationData.fotoBlob;

  if ((item.tipo === 'ELEMENTO_UNIFILAR' || item.tipo === 'TABLERO' || item.tipo === 'ELEMENTO') && !mutationData.foto) {
    mutationData.foto = null;
    mutationData.eliminarFoto = true;
  }

  if (item.companyId && !mutationData.empresaId) {
    mutationData.empresaId = item.companyId;
  }

  const mutationId = item.payload?.id || item.id;
  return {
    entity: entityName,
    id: mutationId,
    queueId: item.id,
    operation: item.operation || item.accion || item.operacion || 'UPSERT',
    baseVersion: item.payload?.version || 1,
    data: mutationData
  };
}

export function useSync() {
  const syncQueue = useStore((state) => state.syncQueue || []);
  const removeFromQueue = useStore((state) => state.removeFromQueue);
  const markQueueItemError = useStore((state) => state.markQueueItemError);
  const clearQueueItemError = useStore((state) => state.clearQueueItemError);
  const isStoreSyncing = useStore((state) => state.isSyncing || false);
  const syncProgress = useStore((state) => state.syncProgress || null);
  const showToast = useStore((state) => state.showToast);

  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [isSyncing, setIsSyncing] = useState(false);

  // Semáforo de bloqueo para impedir concurrencia destructiva
  const isSyncingRef = useRef(false);

  const getFreshToken = useCallback(() => {
    return useStore.getState().token || (typeof localStorage !== 'undefined' ? localStorage.getItem('token') : '') || '';
  }, []);

  const getAuthHeaders = useCallback((extra = {}) => {
    const token = getFreshToken();
    return {
      'Content-Type': 'application/json',
      ...(token && token !== 'mock-offline-token' ? { 'Authorization': `Bearer ${token}` } : {}),
      ...extra
    };
  }, [getFreshToken]);

  // Manejo de eventos de conectividad de red
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      const state = useStore.getState();
      if (state.syncQueue && state.syncQueue.length > 0) {
        procesarColaSincronizacion(false);
      } else if (state.token && state.token !== 'mock-offline-token') {
        state.pullInitialData?.();
      }
    };
    const handleOffline = () => {
      setIsOnline(false);
      useStore.getState().setSyncProgress?.(null);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Control de reintentos con backoff progresivo
  const retryCountRef = useRef(0);
  const lastSyncAttemptRef = useRef(0);
  const syncTimeoutRef = useRef(null);

  // Disparar sincronización automática cuando cambie la red o la cola de elementos (con backoff progresivo)
  useEffect(() => {
    if (isOnline && syncQueue.length > 0 && !isSyncingRef.current) {
      // Si ya fallaron 5 intentos automáticos consecutivos, pausar para no saturar la red
      if (retryCountRef.current >= 5) {
        console.warn('[SYNC CLIENT] ⏸️ Reintentos automáticos en pausa tras 5 intentos. Presione "Sincronizar Ahora" para forzar.');
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
              procesarColaSincronizacion(false);
            }
          }, backoffMs - elapsed);
        }
        return;
      }

      lastSyncAttemptRef.current = now;
      procesarColaSincronizacion(false);
    }
  }, [isOnline, syncQueue.length]);

  /**
   * Envía un micro-lote de mutaciones (máximo 3 elementos) a /api/sync/batch con timeout estricto de 10s.
   */
  const sincronizarLote = async (mutaciones, timeoutMs = DEFAULT_REQUEST_TIMEOUT_MS) => {
    try {
      console.log(`[SYNC CLIENT] 📤 Enviando lote de ${mutaciones.length} mutaciones a ${API_BASE_URL}/api/sync/batch`);
      const response = await fetchWithTimeout(`${API_BASE_URL}/api/sync/batch`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ mutations: mutaciones })
      }, timeoutMs);

      console.log(`[SYNC CLIENT] 📥 Respuesta del backend: HTTP ${response.status} ${response.statusText}`);

      if (response.status === 401 || response.status === 403) {
        console.warn(`[SYNC CLIENT] 🔒 Error de autenticación HTTP ${response.status}.`);
        useStore.getState().handleAuthError?.(response.status);
        return { success: false, status: response.status, error: 'Sesión expirada' };
      }

      if (!response.ok) {
        let errorText = '';
        try {
          const errJson = await response.json();
          errorText = errJson.error || errJson.message || JSON.stringify(errJson);
        } catch {
          errorText = await response.text();
        }
        console.error(`[SYNC CLIENT] ❌ Error HTTP ${response.status}:`, errorText);
        return { success: false, status: response.status, error: errorText || `Error HTTP ${response.status}` };
      }

      const json = await response.json();
      return { success: true, data: json };
    } catch (err) {
      console.error('[SYNC CLIENT] 🔌 Error de red/timeout en sincronizarLote:', err);
      return { success: false, status: 'NETWORK_ERROR', error: err.message || 'Error de conexión' };
    }
  };

  /**
   * Sincronización individual de elemento multipart con fotografía vía FormData y timeout de 15s.
   */
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
        formData.append('datosTecnicos', typeof elemento.datosTecnicos === 'string' ? elemento.datosTecnicos : JSON.stringify(elemento.datosTecnicos));
      }

      // Preparación del binario
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
      let response = await fetchWithTimeout(`${API_BASE_URL}/api/sync/upload`, {
        method: 'POST',
        headers: {
          ...(token && token !== 'mock-offline-token' ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: formData
      }, MULTIPART_REQUEST_TIMEOUT_MS);

      if (response.status === 404) {
        response = await fetchWithTimeout(`${API_BASE_URL}/api/elementos-unifilares`, {
          method: 'POST',
          headers: {
            ...(token && token !== 'mock-offline-token' ? { 'Authorization': `Bearer ${token}` } : {})
          },
          body: formData
        }, MULTIPART_REQUEST_TIMEOUT_MS);
      }

      if (response.status === 401 || response.status === 403) {
        useStore.getState().handleAuthError?.(response.status);
        return { success: false, status: response.status, error: 'Sesión expirada' };
      }

      if (!response.ok) {
        let errText = '';
        try {
          const errJson = await response.json();
          errText = errJson.error || errJson.message || JSON.stringify(errJson);
        } catch {
          errText = await response.text();
        }
        return { success: false, status: response.status, error: errText || `Error HTTP ${response.status}` };
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
      console.error('[SYNC MULTIPART] 🔌 Error en sincronizarElementoUnifilar:', error);
      return { success: false, status: 'NETWORK_ERROR', error: error.message };
    }
  };

  /**
   * Sincronización individual de proyecto con timeout
   */
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
        responsable: { nombre: respNom, telefono: respTel, email: respMail },
        empresaId
      };

      const response = await fetchWithTimeout(`${API_BASE_URL}/api/proyectos`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
      }, DEFAULT_REQUEST_TIMEOUT_MS);

      if (response.status === 401 || response.status === 403) {
        useStore.getState().handleAuthError?.(response.status);
        return { success: false, status: response.status, error: 'Sesión expirada' };
      }

      if (!response.ok) {
        const errText = await response.text();
        return { success: false, status: response.status, error: errText };
      }

      return { success: true };
    } catch (error) {
      return { success: false, status: 'NETWORK_ERROR', error: error.message };
    }
  };

  /**
   * Aplica la actualización de registros en el store local tras confirmación del backend
   */
  const actualizarRegistroEnStore = (appItem) => {
    if (!appItem || !appItem.record) return;
    const rec = appItem.record;
    if (appItem.entity === 'ElementoUnifilar' || appItem.entity === 'Tablero') {
      useStore.getState().updateElementoUnifilar(rec.proyectoId, appItem.id, {
        foto: rec.foto || null,
        fotoBlob: null,
        version: rec.version
      });
    } else if (appItem.entity === 'Subestacion') {
      useStore.getState().updateSubestacion?.(rec.proyectoId, appItem.id, { version: rec.version });
    } else if (appItem.entity === 'PuntoMedicion') {
      useStore.getState().updatePuntoMedicion?.(rec.proyectoId, appItem.id, { version: rec.version });
    } else if (appItem.entity === 'Ccm') {
      useStore.getState().updateCcm?.(rec.proyectoId, appItem.id, { version: rec.version });
    }
  };

  /**
   * PROCESO CENTRAL DE SINCRONIZACIÓN POR MICRO-LOTES Y SECUENCIAL
   * 1. Ordena mutaciones con prioridad padre (Proyectos primero).
   * 2. Recorre en micro-lotes de 3 en 3 (o elemento por elemento para fotos).
   * 3. Remueve inmediatamente de la cola cada elemento que suba exitosamente.
   * 4. Si un ítem falla, captura su error y continúa con los demás sin bloquear.
   * 5. Emite progreso en tiempo real ("Sincronizando X de Y...").
   */
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
      return { success: false, offline: true, error: 'Sin sesión activa con el servidor central' };
    }

    if (!navigator.onLine) {
      return { success: false, offline: true, error: 'Sin conexión a internet' };
    }

    try {
      isSyncingRef.current = true;
      setIsSyncing(true);
      useStore.getState().setIsSyncing?.(true);

      const initialQueue = [...(useStore.getState().syncQueue || [])];
      if (initialQueue.length === 0) {
        useStore.getState().setSyncProgress?.(null);
        return { success: true, count: 0 };
      }

      // Ordenar por prioridad relacional
      const sortedQueue = [...initialQueue].sort((a, b) => {
        const prioA = ENTITY_SYNC_PRIORITY[a.tipo] || 99;
        const prioB = ENTITY_SYNC_PRIORITY[b.tipo] || 99;
        return prioA - prioB;
      });

      const totalItems = sortedQueue.length;
      let processedCount = 0;
      let successCount = 0;
      let errorCount = 0;

      console.group(`🔄 [SYNC PROCESADOR] Iniciando sincronización de ${totalItems} elementos pendientes`);

      useStore.getState().setSyncProgress?.({
        current: 0,
        total: totalItems,
        message: `Iniciando sincronización de ${totalItems} elementos...`,
        currentName: '',
        successCount: 0,
        errorCount: 0
      });

      // Separar elementos que requieren multipart (fotos) de elementos JSON puros
      const multipartItems = [];
      const jsonItems = [];

      for (const item of sortedQueue) {
        if (!item) continue;
        if (tieneImagenAdjunta(item)) {
          multipartItems.push(item);
        } else {
          jsonItems.push(item);
        }
      }

      // PASO 1: PROCESAR ELEMENTOS JSON EN MICRO-LOTES DE 3 EN 3
      for (let i = 0; i < jsonItems.length; i += SYNC_BATCH_SIZE) {
        if (!navigator.onLine) {
          console.warn('[SYNC CLIENT] Conexión perdida durante el procesamiento de la cola.');
          break;
        }

        const chunk = jsonItems.slice(i, i + SYNC_BATCH_SIZE);
        const chunkMutations = chunk.map(prepareMutation).filter(Boolean);

        const currentStep = Math.min(processedCount + chunk.length, totalItems);
        const itemNames = chunk.map((c) => c.payload?.nombre || c.payload?.codigo || c.tipo).join(', ');

        useStore.getState().setSyncProgress?.({
          current: currentStep,
          total: totalItems,
          message: `Sincronizando ${currentStep} de ${totalItems}...`,
          currentName: itemNames,
          successCount,
          errorCount
        });

        console.log(`[SYNC LOTE] Procesando micro-lote (${chunk.length} elementos):`, chunk.map((c) => c.id));
        let batchRes = await sincronizarLote(chunkMutations, DEFAULT_REQUEST_TIMEOUT_MS);

        if (batchRes.status === 401 || batchRes.status === 403) {
          console.warn('[SYNC CLIENT] Sesión expirada durante la sincronización.');
          break;
        }

        // Si el micro-lote se aplicó con éxito (HTTP 200)
        if (batchRes.success && batchRes.data?.applied) {
          const applied = batchRes.data.applied || [];
          const conflicts = batchRes.data.conflicts || [];
          const appliedIdSet = new Set(applied.map((a) => a.id));
          const conflictMap = new Map(conflicts.map((c) => [c.id, c.error || 'Conflicto']));

          // Tratar cada elemento del micro-lote de forma individual e inmediata
          for (const item of chunk) {
            const mutId = item.payload?.id || item.id;
            if (appliedIdSet.has(mutId) || appliedIdSet.has(item.id)) {
              console.log(`[SYNC CLIENT] ✅ Ítem sincronizado exitosamente: ${item.id}. Removiendo de cola local.`);
              removeFromQueue(item.id);
              if (item.payload?.id && item.payload.id !== item.id) {
                removeFromQueue(item.payload.id);
              }
              successCount++;
              processedCount++;

              const appRecord = applied.find((a) => a.id === mutId || a.id === item.id);
              if (appRecord) actualizarRegistroEnStore(appRecord);
            } else if (conflictMap.has(mutId) || conflictMap.has(item.id)) {
              const err = conflictMap.get(mutId) || conflictMap.get(item.id);
              console.warn(`[SYNC CLIENT] ⚠️ Conflicto en ítem ${item.id}:`, err);
              markQueueItemError(item.id, err);
              errorCount++;
              processedCount++;
            } else {
              // Si no vino explícito en applied ni en conflicts pero el batch fue ok
              removeFromQueue(item.id);
              if (item.payload?.id && item.payload.id !== item.id) {
                removeFromQueue(item.payload.id);
              }
              successCount++;
              processedCount++;
            }
          }
        } else {
          // DEGRADACIÓN A ELEMENTO POR ELEMENTO:
          // Si el micro-lote completo falló (ej. error 400 por payload o timeout de red),
          // intentamos cada elemento individualmente para que un ítem atascado no bloquee a los otros 2.
          console.warn(`[SYNC CLIENT] ⚠️ Micro-lote falló (${batchRes.error || batchRes.status}). Degradando a sincronización elemento por elemento...`);

          for (const item of chunk) {
            if (!navigator.onLine) break;

            const singleMutation = prepareMutation(item);
            if (!singleMutation) {
              processedCount++;
              continue;
            }

            const singleName = item.payload?.nombre || item.payload?.codigo || item.tipo;
            useStore.getState().setSyncProgress?.({
              current: processedCount + 1,
              total: totalItems,
              message: `Sincronizando ${processedCount + 1} de ${totalItems}...`,
              currentName: singleName,
              successCount,
              errorCount
            });

            console.log(`[SYNC INDIVIDUAL] Reintentando ítem individualmente: ${item.id} (${singleName})`);
            const singleRes = await sincronizarLote([singleMutation], DEFAULT_REQUEST_TIMEOUT_MS);

            if (singleRes.status === 401 || singleRes.status === 403) {
              break;
            }

            if (singleRes.success && singleRes.data?.applied?.length > 0) {
              console.log(`[SYNC CLIENT] ✅ Ítem individual sincronizado exitosamente: ${item.id}. Removiendo de cola local.`);
              removeFromQueue(item.id);
              if (item.payload?.id && item.payload.id !== item.id) {
                removeFromQueue(item.payload.id);
              }
              clearQueueItemError(item.id);
              successCount++;
              processedCount++;

              const appRecord = singleRes.data.applied[0];
              if (appRecord) actualizarRegistroEnStore(appRecord);
            } else {
              // CAPTURA DE ERROR ESPECÍFICO DEL ÍTEM:
              // Marcamos el error en este ítem puntual y CONTINUAMOS con el siguiente
              const errMsg = singleRes.error || (singleRes.data?.conflicts?.[0]?.error) || `Fallo al sincronizar (HTTP ${singleRes.status || 'ERROR'})`;
              console.warn(`[SYNC CLIENT] ❌ Error puntual en ítem ${item.id}:`, errMsg);
              markQueueItemError(item.id, errMsg);
              errorCount++;
              processedCount++;
            }
          }
        }
      }

      // PASO 2: PROCESAR ELEMENTOS CON ARCHIVOS (FOTOGRAFÍAS MULTIPART) UNO A UNO
      for (const item of multipartItems) {
        if (!navigator.onLine) {
          console.warn('[SYNC MULTIPART] Conexión perdida durante envío de fotos.');
          break;
        }

        const itemName = item.payload?.nombre || item.payload?.codigo || 'Elemento con fotografía';
        useStore.getState().setSyncProgress?.({
          current: processedCount + 1,
          total: totalItems,
          message: `Sincronizando fotografía ${processedCount + 1} de ${totalItems}...`,
          currentName: itemName,
          successCount,
          errorCount
        });

        console.log(`[SYNC MULTIPART] 📸 Subiendo elemento con archivo: ${item.id} (${itemName})`);
        let res = null;

        if (item.tipo === 'PROYECTO') {
          res = await sincronizarProyecto(item.companyId, item.payload);
        } else if (item.tipo === 'ELEMENTO_UNIFILAR' || item.tipo === 'TABLERO' || item.tipo === 'ELEMENTO' || !item.tipo) {
          res = await sincronizarElementoUnifilar(item.companyId, item.payload, item.id);
        } else {
          // Si es otra entidad con foto, enviar por unifilar o proyecto
          res = await sincronizarElementoUnifilar(item.companyId, item.payload, item.id);
        }

        if (res && res.status === 401 || res?.status === 403) {
          break;
        }

        if (res && res.success) {
          console.log(`[SYNC MULTIPART] ✅ Fotografía e información subidas para ${item.id}. Removiendo de cola local.`);
          removeFromQueue(item.id);
          if (item.payload?.id && item.payload.id !== item.id) {
            removeFromQueue(item.payload.id);
          }
          clearQueueItemError(item.id);
          successCount++;
          processedCount++;
        } else {
          // Captura de error puntual para esta imagen sin bloquear a los demás
          const errDetail = res?.error || `Error HTTP ${res?.status || 'desconocido'}`;
          console.warn(`[SYNC MULTIPART] ❌ No se pudo enviar foto de ${item.id}: ${errDetail}. Continuando con la cola.`);
          markQueueItemError(item.id, errDetail);
          errorCount++;
          processedCount++;
        }
      }

      const finalRemainingQueue = useStore.getState().syncQueue || [];

      if (successCount > 0) {
        retryCountRef.current = 0;
      } else if (errorCount > 0) {
        retryCountRef.current += 1;
      }

      // Si toda la cola se vació con éxito
      if (finalRemainingQueue.length === 0) {
        console.log('[SYNC CLIENT] 🎉 Toda la cola se sincronizó exitosamente.');
        if (showToast) {
          showToast('¡Todos los datos y fotografías han sido sincronizados exitosamente!', 'success');
        }
        await useStore.getState().pullInitialData?.();
      } else if (successCount > 0 && errorCount > 0) {
        if (showToast) {
          showToast(`Sincronizados ${successCount} elementos. ${errorCount} elemento(s) no pudieron subirse (ver detalles).`, 'warning');
        }
      } else if (successCount === 0 && errorCount > 0 && isManual) {
        if (showToast) {
          showToast(`No se pudieron sincronizar los elementos pendientes. Revisa los detalles en la cola.`, 'error');
        }
      }

      // Breve retardo para que el usuario aprecie el estado "Completado" en la barra de progreso
      useStore.getState().setSyncProgress?.({
        current: totalItems,
        total: totalItems,
        message: finalRemainingQueue.length === 0 ? '¡Sincronización completada!' : `Completado (${successCount} subidos, ${finalRemainingQueue.length} pendientes)`,
        currentName: '',
        successCount,
        errorCount
      });

      setTimeout(() => {
        useStore.getState().setSyncProgress?.(null);
      }, 2500);

      return {
        success: finalRemainingQueue.length === 0,
        appliedCount: successCount,
        errorCount: errorCount,
        remainingCount: finalRemainingQueue.length
      };
    } catch (criticalErr) {
      console.error('[SYNC CRITICAL] 💥 Excepción no controlada en procesarColaSincronizacion:', criticalErr);
      useStore.getState().setSyncProgress?.(null);
      return { success: false, error: criticalErr.message || 'Error inesperado' };
    } finally {
      setIsSyncing(false);
      isSyncingRef.current = false;
      useStore.getState().setIsSyncing?.(false);
      console.groupEnd();
    }
  };

  /**
   * Sincroniza un elemento específico de forma individual (Depuración Local)
   */
  const syncSingleItem = async (itemId) => {
    if (!itemId) return { success: false, error: 'ID no proporcionado' };
    const currentQueue = useStore.getState().syncQueue || [];
    const item = currentQueue.find((q) => q.id === itemId || q.payload?.id === itemId);
    if (!item) return { success: false, error: 'Elemento no encontrado en la cola' };

    clearQueueItemError(item.id);
    useStore.getState().setIsSyncing?.(true);

    try {
      if (tieneImagenAdjunta(item)) {
        const res = await sincronizarElementoUnifilar(item.companyId, item.payload, item.id);
        if (res.success) {
          removeFromQueue(item.id);
          if (item.payload?.id) removeFromQueue(item.payload.id);
          if (showToast) showToast('Elemento sincronizado exitosamente', 'success');
          return { success: true };
        } else {
          markQueueItemError(item.id, res.error || 'Error al sincronizar');
          if (showToast) showToast(`Error: ${res.error}`, 'error');
          return { success: false, error: res.error };
        }
      } else {
        const mutation = prepareMutation(item);
        const res = await sincronizarLote([mutation], DEFAULT_REQUEST_TIMEOUT_MS);
        if (res.success && res.data?.applied?.length > 0) {
          removeFromQueue(item.id);
          if (item.payload?.id) removeFromQueue(item.payload.id);
          actualizarRegistroEnStore(res.data.applied[0]);
          if (showToast) showToast('Elemento sincronizado exitosamente', 'success');
          return { success: true };
        } else {
          const err = res.error || res.data?.conflicts?.[0]?.error || 'Error al sincronizar';
          markQueueItemError(item.id, err);
          if (showToast) showToast(`Error: ${err}`, 'error');
          return { success: false, error: err };
        }
      }
    } finally {
      useStore.getState().setIsSyncing?.(false);
    }
  };

  /**
   * Elimina un elemento corrupto o atascado de la cola de sincronización
   */
  const removeSingleItem = (itemId) => {
    if (!itemId) return;
    removeFromQueue(itemId);
    if (showToast) {
      showToast('Elemento descartado de la cola local.', 'info');
    }
  };

  /**
   * Limpia toda la cola de sincronización pendiente
   */
  const clearQueue = () => {
    useStore.getState().clearSyncQueue?.();
    if (showToast) {
      showToast('Cola de sincronización vaciada por completo.', 'info');
    }
  };

  return {
    isOnline,
    isSyncing: isSyncing || isStoreSyncing,
    pendingCount: syncQueue.length,
    syncProgress,
    triggerSync: () => procesarColaSincronizacion(true),
    syncSingleItem,
    removeSingleItem,
    clearQueue,
    syncPendingData: () => procesarColaSincronizacion(true),
    pullInitialData: () => useStore.getState().pullInitialData?.()
  };
}

export default useSync;
