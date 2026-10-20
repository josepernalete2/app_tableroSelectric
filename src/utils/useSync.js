import { useEffect, useState, useRef, useCallback } from 'react';
import useStore from '../store/useStore.js';
import { API_BASE_URL } from './api.js';
import { compressImageToBase64, shouldCompressBase64, estimateBase64SizeBytes } from './imageUtils.js';

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
 * Lee el cuerpo de una respuesta HTTP de manera segura mediante res.clone() y lectura única.
 * Previene de raíz el error 'TypeError: Failed to execute text/json on Response: body stream already read'.
 */
export async function readResponsePayload(response) {
  if (!response) {
    return { ok: false, status: 0, data: null, text: '', error: 'Respuesta nula del servidor' };
  }

  try {
    // Clonamos la respuesta para salvaguardar el stream original intacto
    const cloned = typeof response.clone === 'function' ? response.clone() : response;

    // Leemos el stream COMO TEXTO UNA SOLA VEZ en memoria
    const rawText = await cloned.text();

    if (!rawText || !rawText.trim()) {
      return {
        ok: response.ok,
        status: response.status,
        data: null,
        text: '',
        error: response.ok ? null : `HTTP ${response.status} ${response.statusText}`
      };
    }

    try {
      const json = JSON.parse(rawText);
      const extractedError = json?.error || json?.message || (response.ok ? null : JSON.stringify(json));
      return {
        ok: response.ok,
        status: response.status,
        data: json,
        text: rawText,
        error: extractedError
      };
    } catch {
      // Si el servidor devolvió HTML (ej. 500 error page) o texto plano
      return {
        ok: response.ok,
        status: response.status,
        data: null,
        text: rawText,
        error: response.ok ? null : rawText.substring(0, 300)
      };
    }
  } catch (streamErr) {
    console.warn('[HTTP READ] ⚠️ Error al leer stream de respuesta:', streamErr.message);
    return {
      ok: response.ok,
      status: response.status,
      data: null,
      text: '',
      error: `Error de lectura HTTP ${response.status}: ${streamErr.message}`
    };
  }
}

/**
 * Valida y sanitiza exhaustivamente el campo de fotografía (Base64 DataURL, URLs remotas o locales).
 * Si la foto está truncada (ej. 'data:image/...;base64,/'), corrupta, vacía o supera 14MB,
 * se descarta retornando null para evitar rechazos fatales en PostgreSQL y Prisma ORM.
 */
export function validateAndSanitizeFoto(foto) {
  if (!foto || typeof foto !== 'string') return null;

  const trimmed = foto.trim();
  if (trimmed === '' || trimmed === 'null' || trimmed === 'undefined') return null;

  // 1. URLs remotas o locales estándar válidas
  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('/uploads/') ||
    trimmed.startsWith('blob:')
  ) {
    return trimmed;
  }

  // 2. DataURL Base64
  if (trimmed.startsWith('data:image/')) {
    const commaIndex = trimmed.indexOf(',');
    if (commaIndex === -1) {
      console.warn('[FOTO VALIDATOR] ⚠️ DataURL sin separador de coma. Omitiendo foto corrupta.');
      return null;
    }

    const header = trimmed.substring(0, commaIndex);
    const base64Data = trimmed.substring(commaIndex + 1).trim();

    // Validar cabecera MIME
    if (!/^data:image\/(jpeg|jpg|png|webp|gif|svg\+xml);base64$/i.test(header)) {
      console.warn(`[FOTO VALIDATOR] ⚠️ Cabecera MIME corrupta (${header}). Omitiendo.`);
      return null;
    }

    // Comprobar tamaño mínimo: un 1x1 png válido tiene ~70 chars. Si tiene < 50 chars está truncada
    if (base64Data.length < 50) {
      console.warn(`[FOTO VALIDATOR] ⚠️ Base64 truncado o incompleto (${base64Data.length} chars). Omitiendo.`);
      return null;
    }

    // Comprobar secuencias truncadas evidentes como 'base64,/' o '/'
    if (base64Data === '/' || (base64Data.startsWith('/') && base64Data.length < 100) || base64Data.endsWith(',/')) {
      console.warn('[FOTO VALIDATOR] ⚠️ Base64 corrupto detectado (terminación anómala). Omitiendo.');
      return null;
    }

    // Límite de tamaño máximo seguro para persistencia en base de datos (14MB)
    const MAX_BASE64_LENGTH = 14 * 1024 * 1024;
    if (base64Data.length > MAX_BASE64_LENGTH) {
      console.warn(`[FOTO VALIDATOR] ⚠️ Imagen base64 excede el límite permitido (${(base64Data.length / 1024 / 1024).toFixed(1)}MB). Omitiendo.`);
      return null;
    }

    // Validación de decodificación básica de una muestra (primeros 512 bytes)
    try {
      if (typeof atob === 'function') {
        const sample = base64Data.substring(0, Math.min(512, base64Data.length));
        const paddedSample = sample.padEnd(Math.ceil(sample.length / 4) * 4, '=');
        atob(paddedSample);
      }
    } catch (e) {
      console.warn('[FOTO VALIDATOR] ⚠️ Base64 malformado (atob falló):', e.message);
      return null;
    }

    return trimmed;
  }

  return null;
}

/**
 * Convierte un DataURL (Base64) a un objeto binario Blob nativo del navegador.
 */
export function dataURLtoBlob(dataUrl) {
  const sanitized = validateAndSanitizeFoto(dataUrl);
  if (!sanitized || !sanitized.startsWith('data:')) {
    return null;
  }
  try {
    const arr = sanitized.split(',');
    const mimeMatch = arr[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    if (n === 0) return null;
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
 * Determina de forma exhaustiva y segura si un elemento de la cola posee una imagen adjunta válida.
 */
export function tieneImagenAdjunta(item) {
  if (!item || !item.payload) return false;
  const p = item.payload;
  if (p.fotoBlob && (typeof Blob !== 'undefined' && p.fotoBlob instanceof Blob) && p.fotoBlob.size > 50) {
    return true;
  }
  const sanitizedFoto = validateAndSanitizeFoto(p.foto);
  if (sanitizedFoto && sanitizedFoto.startsWith('data:image')) {
    return true;
  }
  const sanitizedFotoUrl = validateAndSanitizeFoto(p.fotoUrl);
  if (sanitizedFotoUrl && sanitizedFotoUrl.startsWith('data:image')) {
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
 * Auto-Healing: Valida y repara la integridad del objeto de mutación en el cliente antes de sincronizar.
 * 1. Si la foto está corrupta, incompleta o mal formateada (ej. 'base64,/'), se reemplaza de forma segura
 *    por null sin perder el nombre, ID, metrología y datos técnicos intactos.
 * 2. Inyecta valores por defecto seguros en campos numéricos (0) o de texto ("") para evitar rechazos de Prisma.
 * 3. Garantiza que datosTecnicos sea siempre un objeto JSON válido normalizado con la norma venezolana COVENIN 159:1997 / CEN 200.
 */
export function autoHealMutationData(entityName, rawData = {}, item = {}) {
  const data = { ...rawData };
  delete data.fotoBlob;
  delete data.previewUrl;

  // 1. Auto-Healing de Fotos: Si está corrupta o truncada, se limpia sin afectar otros datos técnicos
  const rawFoto = data.foto || data.fotoUrl;
  const validFoto = validateAndSanitizeFoto(rawFoto);
  if (validFoto) {
    data.foto = validFoto;
    delete data.fotoUrl;
  } else {
    data.foto = null;
    data.eliminarFoto = true;
    delete data.fotoUrl;
  }

  // 2. Auto-Healing Específico por Entidad
  if (entityName === 'ElementoUnifilar' || entityName === 'Tablero' || entityName === 'Elemento') {
    // Nombre e Identidad seguros
    data.nombre = String(data.nombre || data.codigo || data.tag || 'Elemento Unifilar').trim();
    if (!data.nombre) data.nombre = 'Elemento Unifilar';

    // Tipo de elemento normalizado según enum TipoElemento de Prisma
    const validTipos = [
      'TABLERO', 'PUNTO_SUMINISTRO', 'SUBESTACION', 'TRANSFORMADOR',
      'GENERADOR', 'PUESTA_TIERRA', 'TRANSFER', 'PUNTO_MEDICION',
      'CCM', 'BANCO_CONDENSADOR', 'AMBIENTAL_FISICA', 'TERMOGRAFICA',
      'SISTEMA_ATERRAMIENTO', 'TANQUE_COMBUSTIBLE', 'OTRO'
    ];
    if (!data.tipoElemento || !validTipos.includes(data.tipoElemento)) {
      data.tipoElemento = 'TABLERO';
    }

    // Auto-Healing de datosTecnicos (Prisma exige tipo Json NOT NULL)
    let dt = {};
    if (typeof data.datosTecnicos === 'string') {
      try {
        dt = JSON.parse(data.datosTecnicos);
      } catch {
        dt = {};
      }
    } else if (typeof data.datosTecnicos === 'object' && data.datosTecnicos !== null) {
      dt = { ...data.datosTecnicos };
    }

    // Rescatar campos legados u obsoletos hacia datosTecnicos
    if (data.codigo && !dt.codigo) dt.codigo = data.codigo;
    if (data.tag && !dt.tag) dt.tag = data.tag;
    if (data.orden !== undefined && dt.orden === undefined) dt.orden = data.orden;
    if (data.tension && !dt.tension) dt.tension = data.tension;
    if (data.voltaje && !dt.tension) dt.tension = data.voltaje;
    if (data.voltajeAcometida && !dt.tension) dt.tension = data.voltajeAcometida;

    // Inyectar estándares COVENIN 159:1997 / CEN 200 en datos técnicos si faltan
    if (!dt.tension) dt.tension = '208Y/120 V'; // Tensión trifásica estrella BT estándar COVENIN
    if (!dt.frecuencia) dt.frecuencia = '60 Hz'; // Frecuencia estándar Venezuela
    if (dt.fases === undefined) dt.fases = data.fases !== undefined ? Number(data.fases) : 3;
    if (dt.maxPoles === undefined) dt.maxPoles = data.maxPolos !== undefined ? Number(data.maxPolos) : 42;
    if (!dt.norma) dt.norma = 'COVENIN 159:1997 / CEN 200';
    if (!Array.isArray(dt.circuits)) {
      dt.circuits = Array.isArray(dt.circuitos) ? dt.circuitos : (Array.isArray(data.circuitos) ? data.circuitos : (Array.isArray(data.circuits) ? data.circuits : []));
    }
    data.datosTecnicos = dt;

    // Valores por defecto seguros para campos de texto (evitar nulos no controlados)
    data.ubicacion = typeof data.ubicacion === 'string' ? data.ubicacion : '';
    data.alimentadoPor = typeof data.alimentadoPor === 'string' ? data.alimentadoPor : '';
    data.observacionesGenerales = typeof data.observacionesGenerales === 'string' ? data.observacionesGenerales : '';
    data.circuitoOrigen = typeof data.circuitoOrigen === 'string' ? data.circuitoOrigen : '';
    data.calibreConductor = typeof data.calibreConductor === 'string' ? data.calibreConductor : '';
    data.breakerMarca = typeof data.breakerMarca === 'string' ? data.breakerMarca : '';
    data.breakerTipo = typeof data.breakerTipo === 'string' ? data.breakerTipo : '';

    // Valores por defecto seguros para campos numéricos y float
    if (data.breakerAmperaje !== undefined && data.breakerAmperaje !== null && data.breakerAmperaje !== '') {
      const parsedAmp = parseFloat(data.breakerAmperaje);
      data.breakerAmperaje = !isNaN(parsedAmp) ? parsedAmp : 0;
    } else {
      data.breakerAmperaje = 0;
    }

    if (data.potenciaEstimada !== undefined && data.potenciaEstimada !== null && data.potenciaEstimada !== '') {
      data.potenciaEstimada = String(data.potenciaEstimada);
    } else {
      data.potenciaEstimada = '';
    }

    // Enum EstadoVinculo
    const validEstados = ['ACTIVO', 'RESERVA', 'PENDIENTE_CREAR'];
    data.estadoVinculo = validEstados.includes(data.estadoVinculo) ? data.estadoVinculo : 'ACTIVO';

    // Formato JSON
    if (data.detallesFormato && typeof data.detallesFormato !== 'object') {
      try {
        data.detallesFormato = JSON.parse(data.detallesFormato);
      } catch {
        delete data.detallesFormato;
      }
    }
  } else if (entityName === 'Subestacion') {
    data.nombre = String(data.nombre || 'Subestación Principal').trim();
    data.ubicacion = String(data.ubicacion || 'Sede Principal').trim();
    data.fecha = String(data.fecha || new Date().toISOString().split('T')[0]);
    data.hora = String(data.hora || '08:00');
    data.inspector = String(data.inspector || 'Inspector Certificado');
    data.nivelTension = String(data.nivelTension || '13.8 kV'); // COVENIN 159 MT
    data.estadoEntorno = typeof data.estadoEntorno === 'object' && data.estadoEntorno !== null ? data.estadoEntorno : {};
    data.obrasCiviles = typeof data.obrasCiviles === 'object' && data.obrasCiviles !== null ? data.obrasCiviles : {};
    data.equiposPrincipales = typeof data.equiposPrincipales === 'object' && data.equiposPrincipales !== null ? data.equiposPrincipales : {};
    data.puestaTierra = typeof data.puestaTierra === 'object' && data.puestaTierra !== null ? data.puestaTierra : {};
    data.edificioControl = typeof data.edificioControl === 'object' && data.edificioControl !== null ? data.edificioControl : {};
  } else if (entityName === 'Proyecto') {
    data.nombre = String(data.nombre || 'Proyecto Principal').trim();
    data.direccion = String(data.direccion || data.ubicacion || 'Sede de Operaciones').trim();
    data.descripcion = typeof data.descripcion === 'string' ? data.descripcion : '';
    if (data.responsable && typeof data.responsable === 'object') {
      data.responsableNombre = data.responsableNombre || data.responsable.nombre || '';
      data.responsableTelefono = data.responsableTelefono || data.responsable.telefono || '';
      data.responsableEmail = data.responsableEmail || data.responsable.email || '';
    }
  } else if (entityName === 'PuntoMedicion') {
    data.nombre = String(data.nombre || 'Punto de Medición').trim();
    data.inspector = String(data.inspector || 'Inspector Certificado').trim();
    data.tensionNominal = String(data.tensionNominal || '208Y/120 V');
    data.fecha = String(data.fecha || new Date().toISOString().split('T')[0]);
    data.hora = String(data.hora || '08:00');
  } else if (entityName === 'Ccm') {
    data.nombre = String(data.nombre || 'CCM Principal').trim();
    data.parametrosElectricos = typeof data.parametrosElectricos === 'object' && data.parametrosElectricos !== null ? data.parametrosElectricos : { tension: '480▲ (3Φ - 3 hilos Delta)', frecuencia: '60 Hz' };
    data.gavetasBucketLog = Array.isArray(data.gavetasBucketLog) ? data.gavetasBucketLog : [];
  }

  if (item.companyId && !data.empresaId) {
    data.empresaId = item.companyId;
  }

  return data;
}

/**
 * Auto-Healing Asíncrono con Compresión Dinámica en Vuelo:
 * Si detecta una foto en Base64 demasiado pesada (> 300 KB), la comprime automáticamente mediante
 * Canvas a 1280px / JPEG 75% antes de construir la solicitud HTTP hacia /api/sync/batch.
 * Elimina por completo el error Request Entity Too Large / FUNCTION_PAYLOAD_TOO_LARGE en Vercel (límite 4.5 MB).
 */
export async function autoHealMutationDataAsync(entityName, rawData = {}, item = {}) {
  const data = autoHealMutationData(entityName, rawData, item);

  // Optimización dinámica en vuelo de fotos Base64 pesadas
  if (data.foto && typeof data.foto === 'string' && data.foto.startsWith('data:image/')) {
    // Si la foto supera el umbral de 300 KB o para auto-sanar elementos atascados con fotos gigantes
    if (data.foto.length > 300 * 1024) {
      try {
        const originalLen = data.foto.length;
        const compressed = await compressImageToBase64(data.foto, 1280, 1280, 0.75);
        if (compressed && compressed.startsWith('data:image/')) {
          console.log(`[SYNC COMPRESS] 🗜️ Foto optimizada en vuelo: ${(originalLen / 1024).toFixed(0)} KB -> ${(compressed.length / 1024).toFixed(0)} KB (Evitando límite 4.5MB Vercel)`);
          data.foto = compressed;

          // Auto-sanar también el registro en el store local para no re-comprimir en futuros intentos
          const projId = item.payload?.proyectoId || data.proyectoId;
          const elemId = item.payload?.id || item.id;
          if (projId && elemId) {
            try {
              const store = useStore.getState();
              store.updateElementoUnifilar?.(projId, elemId, { foto: compressed });
            } catch (errStore) {
              // No bloqueante
            }
          }
        }
      } catch (compressErr) {
        console.warn('[SYNC COMPRESS] ⚠️ Fallo al comprimir foto en vuelo, continuando con original:', compressErr.message);
      }
    }
  }

  return data;
}

/**
 * Prepara la estructura de mutación para el endpoint /api/sync/batch
 * Sanitiza, repara exhaustivamente y comprime fotos pesadas para respetar el límite de 4.5 MB de Vercel.
 */
export async function prepareMutation(item) {
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

  const mutationData = await autoHealMutationDataAsync(entityName, item.payload || {}, item);
  const mutationId = item.payload?.id || item.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `item-${Date.now()}`);

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
  const syncQueue = useStore((state) => state.syncQueue);
  const safeSyncQueue = Array.isArray(syncQueue) ? syncQueue : [];
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
      const currentQueue = Array.isArray(state.syncQueue) ? state.syncQueue : [];
      if (currentQueue.length > 0) {
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
    if (isOnline && safeSyncQueue.length > 0 && !isSyncingRef.current) {
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
            const q = Array.isArray(useStore.getState().syncQueue) ? useStore.getState().syncQueue : [];
            if (!isSyncingRef.current && q.length > 0) {
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
  }, [isOnline, safeSyncQueue.length]);

  /**
   * Envía un micro-lote de mutaciones (máximo 3 elementos) a /api/sync/batch con timeout estricto de 10s.
   * Utiliza readResponsePayload para evitar errores de stream duplicado.
   */
  const sincronizarLote = async (mutaciones, timeoutMs = DEFAULT_REQUEST_TIMEOUT_MS) => {
    try {
      const safeMutations = Array.isArray(mutaciones) ? mutaciones : [];
      const payloadString = JSON.stringify({ mutations: safeMutations });
      const payloadBytes = payloadString.length;
      console.log(`[SYNC CLIENT] 📤 Enviando lote de ${safeMutations.length} mutaciones (${(payloadBytes / 1024).toFixed(0)} KB) a ${API_BASE_URL}/api/sync/batch`);

      const response = await fetchWithTimeout(`${API_BASE_URL}/api/sync/batch`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: payloadString
      }, timeoutMs);

      console.log(`[SYNC CLIENT] 📥 Respuesta del backend: HTTP ${response.status} ${response.statusText}`);

      if (response.status === 401 || response.status === 403) {
        console.warn(`[SYNC CLIENT] 🔒 Error de autenticación HTTP ${response.status}.`);
        useStore.getState().handleAuthError?.(response.status);
        return { success: false, status: response.status, error: 'Sesión expirada' };
      }

      // Lectura segura garantizada sin doble lectura de stream
      const parsed = await readResponsePayload(response);

      if (response.status === 413 || parsed.error?.includes('FUNCTION_PAYLOAD_TOO_LARGE') || parsed.error?.includes('Payload Too Large')) {
        console.warn(`[SYNC CLIENT] ⚠️ Error 413 Payload Too Large (${(payloadBytes / 1024).toFixed(0)} KB). Se requiere degradación a elemento por elemento.`);
        return { success: false, status: 413, error: 'Payload excede límite de 4.5MB en Vercel (Payload Too Large)' };
      }

      if (!response.ok) {
        console.error(`[SYNC CLIENT] ❌ Error HTTP ${response.status}:`, parsed.error);
        return { success: false, status: response.status, error: parsed.error || `Error HTTP ${response.status}` };
      }

      return { success: true, data: parsed.data || {} };
    } catch (err) {
      console.error('[SYNC CLIENT] 🔌 Error de red/timeout en sincronizarLote:', err);
      return { success: false, status: 'NETWORK_ERROR', error: err.message || 'Error de conexión' };
    }
  };

  /**
   * Sincronización individual de elemento multipart con fotografía vía FormData y timeout de 15s.
   * Sanitiza la foto antes de enviarla para evitar errores fatales en Prisma.
   */
  const sincronizarElementoUnifilar = async (empresaId, elemento, queueItemId) => {
    try {
      const elementId = elemento?.id || queueItemId;
      const healed = await autoHealMutationDataAsync('ElementoUnifilar', elemento || {}, { id: elementId, companyId: empresaId });

      const formData = new FormData();
      formData.append('id', elementId);
      formData.append('nombre', healed.nombre);
      formData.append('tipoElemento', healed.tipoElemento);
      formData.append('ubicacion', healed.ubicacion);
      formData.append('alimentadoPor', healed.alimentadoPor);
      formData.append('observacionesGenerales', healed.observacionesGenerales);
      formData.append('proyectoId', elemento?.proyectoId || '');
      formData.append('circuitoOrigen', healed.circuitoOrigen);
      formData.append('calibreConductor', healed.calibreConductor);
      formData.append('breakerAmperaje', String(healed.breakerAmperaje));
      formData.append('breakerMarca', healed.breakerMarca);
      formData.append('breakerTipo', healed.breakerTipo);
      formData.append('potenciaEstimada', healed.potenciaEstimada);
      formData.append('estadoVinculo', healed.estadoVinculo);

      const compId = empresaId || healed.empresaId || elemento?.companyId;
      if (compId) {
        formData.append('empresaId', compId);
      }

      formData.append('datosTecnicos', JSON.stringify(healed.datosTecnicos));

      // Sanitización y auto-curación de fotografía
      const validFoto = healed.foto;
      let fileBlob = null;
      if (elemento?.fotoBlob && (typeof Blob !== 'undefined' && elemento.fotoBlob instanceof Blob) && elemento.fotoBlob.size > 50) {
        if (elemento.fotoBlob.size > 300 * 1024) {
          try {
            const compressedBlobBase64 = await compressImageToBase64(elemento.fotoBlob, 1280, 1280, 0.75);
            fileBlob = dataURLtoBlob(compressedBlobBase64) || elemento.fotoBlob;
          } catch {
            fileBlob = elemento.fotoBlob;
          }
        } else {
          fileBlob = elemento.fotoBlob;
        }
      } else if (validFoto && validFoto.startsWith('data:image')) {
        fileBlob = dataURLtoBlob(validFoto);
      }

      if (fileBlob) {
        const fileExt = fileBlob.type ? (fileBlob.type.split('/')[1] || 'jpg') : 'jpg';
        formData.append('foto', fileBlob, `foto_${elementId}.${fileExt}`);
      } else if (validFoto && !validFoto.startsWith('data:image')) {
        formData.append('fotoUrl', validFoto);
      } else {
        // Foto corrupta o ausente: rescatamos el elemento con foto null sin romper Prisma
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

      const parsed = await readResponsePayload(response);

      if (!response.ok) {
        return { success: false, status: response.status, error: parsed.error || `Error HTTP ${response.status}` };
      }

      const resJson = parsed.data || {};
      const record = resJson.data || resJson;
      if (record) {
        const returnedFoto = record.foto || resJson.foto;
        const normalizedFoto = returnedFoto
          ? ((returnedFoto.startsWith('data:') || returnedFoto.startsWith('http://') || returnedFoto.startsWith('https://') || returnedFoto.startsWith('blob:'))
              ? returnedFoto
              : `${API_BASE_URL}${returnedFoto}`)
          : null;

        useStore.getState().updateElementoUnifilar(elemento?.proyectoId, elementId, {
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
   * Sincronización individual de proyecto con timeout y lectura segura de respuesta
   */
  const sincronizarProyecto = async (empresaId, proyecto) => {
    try {
      const respNom = proyecto?.responsableNombre !== undefined ? proyecto.responsableNombre : (typeof proyecto?.responsable === 'object' ? proyecto.responsable?.nombre : proyecto?.responsable) || '';
      const respTel = proyecto?.responsableTelefono !== undefined ? proyecto.responsableTelefono : (typeof proyecto?.responsable === 'object' ? proyecto.responsable?.telefono : '') || '';
      const respMail = proyecto?.responsableEmail !== undefined ? proyecto.responsableEmail : (typeof proyecto?.responsable === 'object' ? proyecto.responsable?.email : '') || '';
      const dir = proyecto?.direccion || proyecto?.ubicacion || '';

      const payload = {
        id: proyecto?.id,
        nombre: proyecto?.nombre,
        descripcion: proyecto?.descripcion || '',
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

      const parsed = await readResponsePayload(response);

      if (!response.ok) {
        return { success: false, status: response.status, error: parsed.error };
      }

      return { success: true, data: parsed.data };
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

      const initialQueue = Array.isArray(useStore.getState().syncQueue) ? [...useStore.getState().syncQueue] : [];
      if (initialQueue.length === 0) {
        useStore.getState().setSyncProgress?.(null);
        return { success: true, count: 0 };
      }

      // Ordenar por prioridad relacional con respaldos de array
      const sortedQueue = initialQueue.sort((a, b) => {
        const prioA = ENTITY_SYNC_PRIORITY[a?.tipo] || 99;
        const prioB = ENTITY_SYNC_PRIORITY[b?.tipo] || 99;
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
        const safeChunk = Array.isArray(chunk) ? chunk : [];
        const chunkMutations = (await Promise.all(safeChunk.map(prepareMutation))).filter(Boolean);

        const currentStep = Math.min(processedCount + safeChunk.length, totalItems);
        const itemNames = safeChunk.map((c) => c?.payload?.nombre || c?.payload?.codigo || c?.tipo || 'Ítem').join(', ');

        useStore.getState().setSyncProgress?.({
          current: currentStep,
          total: totalItems,
          message: `Sincronizando ${currentStep} de ${totalItems}...`,
          currentName: itemNames,
          successCount,
          errorCount
        });

        console.log(`[SYNC LOTE] Procesando micro-lote (${safeChunk.length} elementos):`, safeChunk.map((c) => c?.id));
        let batchRes = await sincronizarLote(chunkMutations, DEFAULT_REQUEST_TIMEOUT_MS);

        if (batchRes.status === 401 || batchRes.status === 403) {
          console.warn('[SYNC CLIENT] Sesión expirada durante la sincronización.');
          break;
        }

        // Si el micro-lote se aplicó con éxito (HTTP 200)
        if (batchRes.success && batchRes.data?.applied) {
          const applied = Array.isArray(batchRes.data.applied) ? batchRes.data.applied : [];
          const conflicts = Array.isArray(batchRes.data.conflicts) ? batchRes.data.conflicts : [];
          const appliedIdSet = new Set(applied.map((a) => a?.id).filter(Boolean));
          const conflictMap = new Map(conflicts.map((c) => [c?.id, c?.error || 'Conflicto']));

          // Tratar cada elemento del micro-lote de forma individual e inmediata
          for (const item of safeChunk) {
            const mutId = item?.payload?.id || item?.id;
            if (appliedIdSet.has(mutId) || appliedIdSet.has(item?.id)) {
              console.log(`[SYNC CLIENT] ✅ Ítem sincronizado exitosamente: ${item?.id}. Removiendo de cola local.`);
              removeFromQueue(item?.id);
              if (item?.payload?.id && item?.payload.id !== item?.id) {
                removeFromQueue(item.payload.id);
              }
              successCount++;
              processedCount++;

              const appRecord = applied.find((a) => a?.id === mutId || a?.id === item?.id);
              if (appRecord) actualizarRegistroEnStore(appRecord);
            } else if (conflictMap.has(mutId) || conflictMap.has(item?.id)) {
              const err = conflictMap.get(mutId) || conflictMap.get(item?.id);
              console.warn(`[SYNC CLIENT] ⚠️ Conflicto en ítem ${item?.id}:`, err);
              markQueueItemError(item?.id, err);
              errorCount++;
              processedCount++;
            } else {
              // Si no vino explícito en applied ni en conflicts pero el batch fue ok
              removeFromQueue(item?.id);
              if (item?.payload?.id && item?.payload.id !== item?.id) {
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

          for (const item of safeChunk) {
            if (!navigator.onLine) break;

            const singleMutation = await prepareMutation(item);
            if (!singleMutation) {
              processedCount++;
              continue;
            }

            const singleName = item?.payload?.nombre || item?.payload?.codigo || item?.tipo || 'Elemento';
            useStore.getState().setSyncProgress?.({
              current: processedCount + 1,
              total: totalItems,
              message: `Sincronizando ${processedCount + 1} de ${totalItems}...`,
              currentName: singleName,
              successCount,
              errorCount
            });

            console.log(`[SYNC INDIVIDUAL] Reintentando ítem individualmente: ${item?.id} (${singleName})`);
            const singleRes = await sincronizarLote([singleMutation], DEFAULT_REQUEST_TIMEOUT_MS);

            if (singleRes.status === 401 || singleRes.status === 403) {
              break;
            }

            const singleApplied = Array.isArray(singleRes.data?.applied) ? singleRes.data.applied : [];
            if (singleRes.success && singleApplied.length > 0) {
              console.log(`[SYNC CLIENT] ✅ Ítem individual sincronizado exitosamente: ${item?.id}. Removiendo de cola local.`);
              removeFromQueue(item?.id);
              if (item?.payload?.id && item?.payload.id !== item?.id) {
                removeFromQueue(item.payload.id);
              }
              clearQueueItemError(item?.id);
              successCount++;
              processedCount++;

              const appRecord = singleApplied[0];
              if (appRecord) actualizarRegistroEnStore(appRecord);
            } else {
              // CAPTURA DE ERROR ESPECÍFICO DEL ÍTEM:
              // Marcamos el error en este ítem puntual y CONTINUAMOS con el siguiente
              const errMsg = singleRes.error || (singleRes.data?.conflicts?.[0]?.error) || `Fallo al sincronizar (HTTP ${singleRes.status || 'ERROR'})`;
              console.warn(`[SYNC CLIENT] ❌ Error puntual en ítem ${item?.id}:`, errMsg);
              markQueueItemError(item?.id, errMsg);
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

        const itemName = item?.payload?.nombre || item?.payload?.codigo || 'Elemento con fotografía';
        useStore.getState().setSyncProgress?.({
          current: processedCount + 1,
          total: totalItems,
          message: `Sincronizando fotografía ${processedCount + 1} de ${totalItems}...`,
          currentName: itemName,
          successCount,
          errorCount
        });

        console.log(`[SYNC MULTIPART] 📸 Subiendo elemento con archivo: ${item?.id} (${itemName})`);
        let res = null;

        if (item?.tipo === 'PROYECTO') {
          res = await sincronizarProyecto(item?.companyId, item?.payload);
        } else {
          res = await sincronizarElementoUnifilar(item?.companyId, item?.payload, item?.id);
        }

        if (res && (res.status === 401 || res?.status === 403)) {
          break;
        }

        if (res && res.success) {
          console.log(`[SYNC MULTIPART] ✅ Fotografía e información subidas para ${item?.id}. Removiendo de cola local.`);
          removeFromQueue(item?.id);
          if (item?.payload?.id && item?.payload.id !== item?.id) {
            removeFromQueue(item.payload.id);
          }
          clearQueueItemError(item?.id);
          successCount++;
          processedCount++;
        } else {
          // Captura de error puntual para esta imagen sin bloquear a los demás
          const errDetail = res?.error || `Error HTTP ${res?.status || 'desconocido'}`;
          console.warn(`[SYNC MULTIPART] ❌ No se pudo enviar foto de ${item?.id}: ${errDetail}. Continuando con la cola.`);
          markQueueItemError(item?.id, errDetail);
          errorCount++;
          processedCount++;
        }
      }

      const finalRemainingQueue = Array.isArray(useStore.getState().syncQueue) ? useStore.getState().syncQueue : [];

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
    const currentQueue = Array.isArray(useStore.getState().syncQueue) ? useStore.getState().syncQueue : [];
    const item = currentQueue.find((q) => q?.id === itemId || q?.payload?.id === itemId);
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
        const mutation = await prepareMutation(item);
        const res = await sincronizarLote([mutation], DEFAULT_REQUEST_TIMEOUT_MS);
        const resApplied = Array.isArray(res.data?.applied) ? res.data.applied : [];
        if (res.success && resApplied.length > 0) {
          removeFromQueue(item.id);
          if (item.payload?.id) removeFromQueue(item.payload.id);
          actualizarRegistroEnStore(resApplied[0]);
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
    pendingCount: safeSyncQueue.length,
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
