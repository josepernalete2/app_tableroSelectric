import { API_BASE_URL } from './api.js';
import { compressImageToBase64, estimateBase64SizeBytes } from './imageUtils.js';

export const DEFAULT_REQUEST_TIMEOUT_MS = 25000; // 25 segundos por petición estándar (tolerancia para cold-starts de Vercel/Neon)
export const MULTIPART_REQUEST_TIMEOUT_MS = 30000; // 30 segundos para subida binaria de fotos pesadas
export const SYNC_BATCH_SIZE = 3; // Lotes pequeños de 3 en 3 para evitar saturación y timeouts

// Enum canónico TipoElemento sincronizado con Prisma ORM
export const VALID_TIPOS_ELEMENTO = [
  'TABLERO', 'PUNTO_SUMINISTRO', 'SUBESTACION', 'TRANSFORMADOR',
  'GENERADOR', 'PUESTA_TIERRA', 'TRANSFER', 'PUNTO_MEDICION',
  'CCM', 'BANCO_CONDENSADOR', 'AMBIENTAL_FISICA', 'TERMOGRAFICA',
  'SISTEMA_ATERRAMIENTO', 'TANQUE_COMBUSTIBLE', 'OTRO'
];

/**
 * Limpia y normaliza el tipo de elemento según el enum TipoElemento de Prisma.
 * Previene ReferenceErrors fatales en el cliente PWA y asegura tipos válidos antes de enviar a la API.
 *
 * @param {string} tipo
 * @returns {string} Tipo normalizado en mayúsculas (por defecto 'TABLERO')
 */
export function cleanTipoElemento(tipo) {
  if (!tipo || typeof tipo !== 'string') return 'TABLERO';
  const clean = tipo.trim().toUpperCase();
  return VALID_TIPOS_ELEMENTO.includes(clean) ? clean : 'TABLERO';
}

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
    const cloned = typeof response.clone === 'function' ? response.clone() : response;
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
 * Si la foto está truncada, corrupta, vacía o supera 14MB, retorna null para evitar rechazos en PostgreSQL.
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
export const ENTITY_SYNC_PRIORITY = {
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
 * 1. Si la foto está corrupta o mal formateada, se limpia sin afectar otros datos técnicos.
 * 2. Inyecta valores por defecto seguros en campos numéricos (0) o de texto ("") para evitar rechazos de Prisma.
 * 3. Normaliza el tipoElemento mediante cleanTipoElemento.
 * 4. Garantiza que datosTecnicos sea siempre un objeto JSON válido normalizado con la norma venezolana COVENIN 159:1997 / CEN 200.
 */
export function autoHealMutationData(entityName, rawData = {}, item = {}) {
  const data = { ...rawData };
  delete data.fotoBlob;
  delete data.previewUrl;

  // 1. Auto-Healing de Fotos
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

    // Tipo de elemento normalizado mediante cleanTipoElemento
    data.tipoElemento = cleanTipoElemento(data.tipoElemento);

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

    // Valores por defecto seguros para campos de texto
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
    data.nivelTension = String(data.nivelTension || '13.8 kV');
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
 * Canvas a 1280px / JPEG 75% antes de construir la solicitud HTTP.
 */
export async function autoHealMutationDataAsync(entityName, rawData = {}, item = {}) {
  const data = autoHealMutationData(entityName, rawData, item);

  if (data.foto && typeof data.foto === 'string' && data.foto.startsWith('data:image/')) {
    if (data.foto.length > 300 * 1024) {
      try {
        const originalLen = data.foto.length;
        const compressed = await compressImageToBase64(data.foto, 1280, 1280, 0.75);
        if (compressed && compressed.startsWith('data:image/')) {
          console.log(`[SYNC COMPRESS] 🗜️ Foto optimizada en vuelo: ${(originalLen / 1024).toFixed(0)} KB -> ${(compressed.length / 1024).toFixed(0)} KB`);
          data.foto = compressed;
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

/**
 * Envío directo de elemento unifilar al servidor en tiempo real (ONLINE FIRST).
 * Se ejecuta inmediatamente al crear o editar si hay conexión activa a internet.
 * Garantiza persistencia inmediata en PostgreSQL y evita acumulaciones en la tablet.
 *
 * @param {string} empresaId
 * @param {object} elemento
 * @param {string} token
 * @returns {Promise<{ ok: boolean, status: number|string, data?: object, error?: string }>}
 */
export async function enviarElementoDirectoAlServidor(empresaId, elemento, token) {
  if (!elemento) return { ok: false, error: 'Elemento no proporcionado' };

  try {
    const elementId = elemento.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `elem-${Date.now()}`);
    const healed = await autoHealMutationDataAsync('ElementoUnifilar', elemento, { id: elementId, companyId: empresaId });

    const formData = new FormData();
    formData.append('id', elementId);
    formData.append('nombre', healed.nombre);
    formData.append('tipoElemento', cleanTipoElemento(healed.tipoElemento));
    formData.append('ubicacion', healed.ubicacion);
    formData.append('alimentadoPor', healed.alimentadoPor);
    if (healed.alimentadoPorId) formData.append('alimentadoPorId', healed.alimentadoPorId);
    formData.append('observacionesGenerales', healed.observacionesGenerales);
    formData.append('proyectoId', elemento.proyectoId || '');
    formData.append('circuitoOrigen', healed.circuitoOrigen);
    formData.append('calibreConductor', healed.calibreConductor);
    formData.append('breakerAmperaje', String(healed.breakerAmperaje));
    formData.append('breakerMarca', healed.breakerMarca);
    formData.append('breakerTipo', healed.breakerTipo);
    formData.append('potenciaEstimada', healed.potenciaEstimada);
    formData.append('estadoVinculo', healed.estadoVinculo);

    const compId = empresaId || healed.empresaId || elemento.companyId;
    if (compId) {
      formData.append('empresaId', compId);
    }

    formData.append('datosTecnicos', JSON.stringify(healed.datosTecnicos));

    // Sanitización y auto-curación de fotografía
    const validFoto = healed.foto;
    let fileBlob = null;
    if (elemento.fotoBlob && (typeof Blob !== 'undefined' && elemento.fotoBlob instanceof Blob) && elemento.fotoBlob.size > 50) {
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
      formData.append('eliminarFoto', 'true');
      formData.append('foto', '');
    }

    const authHeaders = (token && token !== 'mock-offline-token') ? { 'Authorization': `Bearer ${token}` } : {};

    let response = await fetchWithTimeout(`${API_BASE_URL}/api/sync/upload`, {
      method: 'POST',
      headers: authHeaders,
      body: formData
    }, MULTIPART_REQUEST_TIMEOUT_MS);

    if (response.status === 404) {
      response = await fetchWithTimeout(`${API_BASE_URL}/api/elementos-unifilares`, {
        method: 'POST',
        headers: authHeaders,
        body: formData
      }, MULTIPART_REQUEST_TIMEOUT_MS);
    }

    const parsed = await readResponsePayload(response);

    if (!response.ok) {
      return { ok: false, status: response.status, error: parsed.error || `HTTP ${response.status}` };
    }

    const resJson = parsed.data || {};
    const record = resJson.data || resJson;

    return { ok: true, status: response.status, data: record };
  } catch (err) {
    return { ok: false, status: 'NETWORK_ERROR', error: err.message || 'Error de conexión' };
  }
}
