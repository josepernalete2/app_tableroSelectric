import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import localforage from 'localforage';
import { API_BASE_URL } from '../utils/api.js';
import { cleanTipoElemento, enviarElementoDirectoAlServidor, fetchWithTimeout, DEFAULT_REQUEST_TIMEOUT_MS, readResponsePayload, registrarEmpresaApi, stripAllImagePayloads } from '../utils/syncService.js';

// Configurar localforage
localforage.config({
  name: 'app-tableros-electricos',
  storeName: 'inspecciones_store'
});

export const PREFIX_MAP = {
  GENERADOR: 'gen',
  TABLERO: 'tab',
  SUBESTACION: 'sub',
  PUNTO_SUMINISTRO: 'med',
  PUNTO_MEDICION: 'med',
  TRANSFER: 'trs',
  BANCO_CONDENSADOR: 'bco',
  TRANSFORMADOR: 'tra',
  PUESTA_TIERRA: 'pat',
  SISTEMA_ATERRAMIENTO: 'pat',
  CCM: 'ccm',
  TANQUE_COMBUSTIBLE: 'tk',
  TERMOGRAFICA: 'ter',
  AMBIENTAL_FISICA: 'amb',
  ALIMENTADOR: 'ali',
  OTRO: 'otr'
};

export const LEGACY_PREFIX_MAP = {
  GEN: 'gen',
  TAB: 'tab',
  SUB: 'sub',
  SUM: 'med',
  PM: 'med',
  MED: 'med',
  ATS: 'trs',
  TRS: 'trs',
  ALI: 'ali',
  BC: 'bco',
  BCO: 'bco',
  TRAFO: 'tra',
  TRA: 'tra',
  PAT: 'pat',
  CCM: 'ccm',
  TK: 'tk',
  TER: 'ter',
  AMB: 'amb',
  OTR: 'otr'
};

export const getElementCode = (item, defaultType = 'TABLERO') => {
  if (!item) return '';

  const getPfx = (t) => {
    const raw = (t || defaultType || 'TABLERO').toUpperCase();
    return (PREFIX_MAP[raw] || LEGACY_PREFIX_MAP[raw] || 'TAB').toUpperCase();
  };

  const isComplexHash = (str) => {
    if (!str || typeof str !== 'string') return true;
    const s = str.trim();
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)) return true;
    if (/^[0-9a-f]{20,}$/i.test(s)) return true;
    if (/^(circ|auto|temp|tablero|elem|nodo|subestacion|punto)_[a-z0-9_]+$/i.test(s)) return true;
    if (s.length > 12 && !/^[a-zA-Z]{2,6}-\d{1,4}$/.test(s)) return true;
    return false;
  };

  if (typeof item === 'string') {
    const trimmed = item.trim();
    if (!isComplexHash(trimmed)) {
      const match = trimmed.match(/^([a-zA-Z0-9_]{1,6})[-_](\d+)$/);
      if (match) {
        const rawPfx = match[1].toUpperCase();
        const num = match[2];
        const canon = (PREFIX_MAP[rawPfx] || LEGACY_PREFIX_MAP[rawPfx] || rawPfx).toUpperCase();
        return `${canon}-${num}`;
      }
      if (trimmed.length <= 8 && /^[a-zA-Z0-9_-]+$/.test(trimmed)) {
        return trimmed.toUpperCase();
      }
    }
    const matchEndNum = trimmed.match(/(\d+)(?!.*\d)/);
    const num = matchEndNum ? Math.min(parseInt(matchEndNum[1], 10), 99) : 1;
    return `${getPfx(defaultType)}-${num}`;
  }

  // 1. Verificar si tiene código explícito corto
  if (item.codigo && typeof item.codigo === 'string' && item.codigo.trim()) {
    const trimmed = item.codigo.trim();
    if (!isComplexHash(trimmed)) {
      const match = trimmed.match(/^([a-zA-Z0-9_]{1,6})[-_](\d+)$/);
      if (match) {
        const rawPfx = match[1].toUpperCase();
        const num = match[2];
        const canon = (PREFIX_MAP[rawPfx] || LEGACY_PREFIX_MAP[rawPfx] || rawPfx).toUpperCase();
        return `${canon}-${num}`;
      }
      return trimmed.toUpperCase();
    }
  }

  // 2. Verificar datosTecnicos.codigo
  if (item.datosTecnicos?.codigo && typeof item.datosTecnicos.codigo === 'string' && item.datosTecnicos.codigo.trim()) {
    const trimmed = item.datosTecnicos.codigo.trim();
    if (!isComplexHash(trimmed)) {
      const match = trimmed.match(/^([a-zA-Z0-9_]{1,6})[-_](\d+)$/);
      if (match) {
        const rawPfx = match[1].toUpperCase();
        const num = match[2];
        const canon = (PREFIX_MAP[rawPfx] || LEGACY_PREFIX_MAP[rawPfx] || rawPfx).toUpperCase();
        return `${canon}-${num}`;
      }
      return trimmed.toUpperCase();
    }
  }

  // 3. Si item.id tiene formato de código corto (ej. tab-1 o TAB-01)
  if (item.id && typeof item.id === 'string') {
    const trimmed = item.id.trim();
    if (!isComplexHash(trimmed)) {
      const match = trimmed.match(/^([a-zA-Z0-9_]{1,6})[-_](\d+)$/);
      if (match) {
        const rawPfx = match[1].toUpperCase();
        const num = match[2];
        const canonicalPrefix = (PREFIX_MAP[item.tipoElemento] || LEGACY_PREFIX_MAP[rawPfx] || rawPfx).toUpperCase();
        return `${canonicalPrefix}-${num}`;
      }
      if (trimmed.length <= 8 && /^[a-zA-Z0-9_-]+$/.test(trimmed)) {
        return trimmed.toUpperCase();
      }
    }
  }

  // 4. Intentar extraer número consecutivo desde el nombre (ej. "Tablero 2" -> TAB-2)
  const pfx = getPfx(item.tipoElemento || defaultType);
  if (item.nombre && typeof item.nombre === 'string') {
    const nameMatch = item.nombre.trim().match(/(\d+)\s*$/);
    if (nameMatch) {
      return `${pfx}-${nameMatch[1]}`;
    }
  }

  if (item.consecutivo || item.orden) {
    return `${pfx}-${item.consecutivo || item.orden}`;
  }

  // Fallback seguro a formato corto en mayúsculas (ej. TAB-1)
  return `${pfx}-1`;
};

export const cleanElementName = (nombre, id, codigo) => {
  if (!nombre) return codigo || (typeof id === 'string' ? getElementCode(id) : '') || '';
  let cleanName = nombre.trim();
  
  // Limpiar cualquier UUID o hash largo embebido en el nombre
  cleanName = cleanName.replace(/\s*\((?:ID:\s*)?[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\)/gi, '').trim();
  cleanName = cleanName.replace(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\s*[-:]\s*/gi, '').trim();
  cleanName = cleanName.replace(/\s*\((?:ID:\s*)?[a-z0-9_-]{14,}\)/gi, '').trim();
  cleanName = cleanName.replace(/\s*\((?:ID:\s*)?(?:circ|auto|temp|tablero|nodo)_[a-z0-9_]+\)/gi, '').trim();
  cleanName = cleanName.replace(/^(?:circ|auto|temp|tablero|nodo)_[a-z0-9_]+\s*[-:]\s*/gi, '').trim();

  const toClean = [id, codigo].filter(Boolean);
  toClean.forEach(cleanId => {
    if (typeof cleanId === 'string' && cleanId.trim()) {
      const trimmed = cleanId.trim();
      if (cleanName.toLowerCase().startsWith(`${trimmed.toLowerCase()} - `)) {
        cleanName = cleanName.substring(trimmed.length + 3);
      } else if (cleanName.toLowerCase().startsWith(`${trimmed.toLowerCase()}: `)) {
        cleanName = cleanName.substring(trimmed.length + 2);
      }
      const idPattern = new RegExp(`\\s*\\(ID:\\s*${trimmed.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}\\)`, 'gi');
      cleanName = cleanName.replace(idPattern, '').trim();
    }
  });

  return cleanName || codigo || (typeof id === 'string' ? getElementCode(id) : '');
};

export const formatElementTitleWithId = (nombre, id, codigo) => {
  return cleanElementName(nombre, id, codigo);
};

export const sortElementsByOrder = (list = []) => {
  if (!Array.isArray(list)) return [];
  return [...list].sort((a, b) => {
    const rawOrderA = a.orden !== undefined && a.orden !== null ? a.orden : a.datosTecnicos?.orden;
    const rawOrderB = b.orden !== undefined && b.orden !== null ? b.orden : b.datosTecnicos?.orden;
    const orderA = rawOrderA !== undefined && rawOrderA !== null && !isNaN(Number(rawOrderA)) ? Number(rawOrderA) : null;
    const orderB = rawOrderB !== undefined && rawOrderB !== null && !isNaN(Number(rawOrderB)) ? Number(rawOrderB) : null;
    if (orderA !== null && orderB !== null && orderA !== orderB) {
      return orderA - orderB;
    }
    if (orderA !== null && orderB === null) return -1;
    if (orderA === null && orderB !== null) return 1;
    // Orden cronológico estricto por defecto (createdAt ascendente)
    const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return timeA - timeB;
  });
};

const resolveSimpleTypePrefix = (tipoOrItem, defaultType = 'TABLERO') => {
  const rawType = typeof tipoOrItem === 'string'
    ? tipoOrItem
    : (tipoOrItem?.tipoElemento || tipoOrItem?.tipo || defaultType || 'TABLERO');
  const upper = String(rawType || 'TABLERO').trim().toUpperCase();
  if (upper === 'SUB_TABLERO' || upper === 'SUB-TABLERO' || upper === 'PANEL' || upper === 'SUB_TABLERO_PENDIENTE') return 'tab';
  if (upper === 'TRAFO') return 'tra';
  if (upper === 'ATS' || upper === 'MTS' || upper === 'TRANSFERENCIA') return 'trs';
  if (upper === 'MEDIDOR' || upper === 'PUNTO_SUMINISTRO' || upper === 'PUNTO_MEDICION') return 'med';
  if (upper === 'PLANTA' || upper === 'GEN') return 'gen';
  if (upper === 'SE') return 'sub';
  if (upper === 'MOTOR') return 'ccm';
  return (PREFIX_MAP[upper] || LEGACY_PREFIX_MAP[upper] || 'elm').toLowerCase();
};

const parseStrictSimpleCode = (raw) => {
  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const match = trimmed.match(/^([a-zA-Z]{2,6})[-_](\d{1,4})$/);
  if (!match) return null;
  const rawPfx = match[1].toUpperCase();
  const blocked = new Set(['CIRC', 'AUTO', 'TEMP', 'NODO', 'ELEM']);
  if (blocked.has(rawPfx)) return null;
  const num = parseInt(match[2], 10);
  if (!Number.isInteger(num) || num <= 0 || num > 9999) return null;
  const canon = (LEGACY_PREFIX_MAP[rawPfx] || PREFIX_MAP[rawPfx] || rawPfx.toLowerCase()).toLowerCase();
  return {
    prefix: canon,
    num,
    code: `${canon}-${num}`
  };
};

export const getSimpleElementCode = (item, defaultType = 'TABLERO') => {
  if (!item) return '';
  const fallbackPfx = resolveSimpleTypePrefix(
    typeof item === 'string' ? defaultType : item,
    defaultType
  );

  if (typeof item === 'string') {
    const parsed = parseStrictSimpleCode(item);
    return parsed ? parsed.code : `${fallbackPfx}-1`;
  }

  const candidates = [
    item.simpleCode,
    item.codigo,
    item.datosTecnicos?.codigo,
    item.id
  ];
  for (const cand of candidates) {
    const parsed = parseStrictSimpleCode(cand);
    if (parsed) return parsed.code;
  }

  const consecutivo = item.consecutivo ?? item.orden ?? item.datosTecnicos?.orden;
  if (consecutivo !== undefined && consecutivo !== null && consecutivo !== '') {
    const n = parseInt(consecutivo, 10);
    if (Number.isInteger(n) && n > 0 && n <= 9999) {
      return `${fallbackPfx}-${n}`;
    }
  }

  return `${fallbackPfx}-1`;
};

export const assignSimpleHierarchyCodes = (elements = []) => {
  if (!Array.isArray(elements) || elements.length === 0) return [];

  const indexed = elements.map((el, idx) => ({
    el,
    idx,
    orden: el?.orden ?? el?.datosTecnicos?.orden ?? null,
    createdAt: el?.createdAt || null
  }));

  const sorted = sortElementsByOrder(indexed);
  const usedByPrefix = new Map();
  const assignedByIdx = new Map();

  const reserveSlot = (pfx, num) => {
    if (!usedByPrefix.has(pfx)) usedByPrefix.set(pfx, new Set());
    usedByPrefix.get(pfx).add(num);
  };

  const isSlotUsed = (pfx, num) => Boolean(usedByPrefix.get(pfx)?.has(num));

  // Pass 1: preserve valid existing unique short codes in chronological/ordered sequence
  sorted.forEach((entry) => {
    const el = entry.el;
    if (!el) return;
    const candidates = [
      el.simpleCode,
      el.codigo,
      el.datosTecnicos?.codigo,
      el.id
    ];
    for (const cand of candidates) {
      const parsed = parseStrictSimpleCode(cand);
      if (parsed && !isSlotUsed(parsed.prefix, parsed.num)) {
        reserveSlot(parsed.prefix, parsed.num);
        assignedByIdx.set(entry.idx, parsed.code);
        break;
      }
    }
  });

  // Pass 2: assign lowest unused correlative integer per canonical prefix
  sorted.forEach((entry) => {
    if (assignedByIdx.has(entry.idx)) return;
    const el = entry.el;
    if (!el) return;
    const pfx = resolveSimpleTypePrefix(el);
    let n = 1;
    while (isSlotUsed(pfx, n)) {
      n += 1;
    }
    reserveSlot(pfx, n);
    assignedByIdx.set(entry.idx, `${pfx}-${n}`);
  });

  return elements.map((el, idx) => {
    if (!el) return el;
    const code = assignedByIdx.get(idx) || getSimpleElementCode(el);
    return {
      ...el,
      codigo: code,
      simpleCode: code
    };
  });
};

const HIERARCHY_PLACEHOLDERS = new Set([
  '',
  'NO DEFINIDO',
  'NO DEFINIDA',
  'SIN ALIMENTACIÓN',
  'SIN ALIMENTACION',
  'SIN UBICACIÓN',
  'SIN UBICACION',
  'UBICACIÓN NO ESPECIFICADA',
  'UBICACION NO ESPECIFICADA',
  'N/A',
  'N/D',
  '-',
  '—'
]);

export const isPlaceholderHierarchyValue = (val) => {
  if (val === undefined || val === null) return true;
  const trimmed = String(val).trim().toUpperCase();
  return HIERARCHY_PLACEHOLDERS.has(trimmed);
};

const sanitizeParentId = (rawId, selfId = null) => {
  if (!rawId || typeof rawId !== 'string') return null;
  const trimmed = rawId.trim();
  if (!trimmed || (selfId && trimmed === String(selfId))) return null;
  if (trimmed.toUpperCase() === 'CORPOELEC' || trimmed.startsWith('manual_')) return null;
  return trimmed;
};

const parseDatosTecnicosSafe = (raw) => {
  if (!raw) return {};
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }
  return typeof raw === 'object' ? raw : {};
};

const TRANSFER_TYPES = new Set(['TRANSFER', 'TRANSFERENCIA', 'ATS', 'MTS']);
const GENERATOR_TYPES = new Set(['GENERADOR', 'PLANTA', 'PLANTA_ELECTRICA', 'GEN']);

const getElementTipoUpper = (el) => {
  if (!el || typeof el !== 'object') return '';
  const raw = el.tipoElemento || el.tipo || el.tipoPlantilla || '';
  if (raw) return String(raw).trim().toUpperCase();
  if (el.maxPoles !== undefined || Array.isArray(el.circuits)) return 'TABLERO';
  return '';
};

const isTransferElement = (el) => TRANSFER_TYPES.has(getElementTipoUpper(el));
const isGeneratorElement = (el) => GENERATOR_TYPES.has(getElementTipoUpper(el));
const isTableroElement = (el) => getElementTipoUpper(el) === 'TABLERO';

const getCleanElementLabel = (el) => {
  if (!el || typeof el !== 'object') return '';
  return cleanElementName(el.nombre, el.id, el.codigo || el.simpleCode).toUpperCase().trim();
};

const findElementMatchInList = (textOrCode, allElements = [], excludeId = null) => {
  if (!textOrCode) return null;
  const raw = String(textOrCode).trim();
  if (!raw || isPlaceholderHierarchyValue(raw) || raw.toUpperCase() === 'CORPOELEC') return null;

  const extractedMatch = raw.match(/\((?:ID:\s*)?([A-Z0-9_-]+)\)/i);
  const extractedCode = extractedMatch ? extractedMatch[1].trim().toLowerCase() : null;
  const rawLower = raw.toLowerCase();
  const cleanRawLabel = cleanElementName(raw).toUpperCase().trim();

  for (const cand of (allElements || [])) {
    if (!cand || !cand.id || (excludeId && String(cand.id) === String(excludeId))) continue;
    const candIdLower = String(cand.id).trim().toLowerCase();
    const candCodeLower = cand.codigo ? String(cand.codigo).trim().toLowerCase() : '';
    const candSimpleLower = cand.simpleCode ? String(cand.simpleCode).trim().toLowerCase() : '';
    const candLabel = getCleanElementLabel(cand);

    if (
      candIdLower === rawLower ||
      (extractedCode && (candIdLower === extractedCode || candCodeLower === extractedCode || candSimpleLower === extractedCode)) ||
      (candCodeLower && candCodeLower === rawLower) ||
      (candSimpleLower && candSimpleLower === rawLower) ||
      (candLabel && cleanRawLabel && candLabel === cleanRawLabel)
    ) {
      return cand;
    }
  }
  return null;
};

const getTransferSourceSlots = (el) => {
  const dt = parseDatosTecnicosSafe(el?.datosTecnicos);
  const normId = sanitizeParentId(dt.fuenteNormalId, el?.id);
  const rawNorm = dt.fuenteNormalNombre || dt.alimentacionGenerador1 || dt.alimentacionCorpoelec || '';
  const normName = !isPlaceholderHierarchyValue(rawNorm) ? cleanElementName(String(rawNorm)).toUpperCase().trim() : '';

  const emergId = sanitizeParentId(dt.fuenteEmergenciaId, el?.id);
  const rawEmerg = dt.fuenteEmergenciaNombre || dt.alimentacionGenerador2 || dt.alimentacionTransfDomosa || '';
  const emergName = !isPlaceholderHierarchyValue(rawEmerg) ? cleanElementName(String(rawEmerg)).toUpperCase().trim() : '';

  return { dt, normId, normName, emergId, emergName };
};

const extractCircuitDestIds = (el) => {
  if (!el || typeof el !== 'object') return [];
  const dt = parseDatosTecnicosSafe(el.datosTecnicos);
  const circuits = Array.isArray(el.circuits) ? el.circuits : (Array.isArray(dt.circuits) ? dt.circuits : []);
  const ids = new Set();
  circuits.forEach((c) => {
    const rawDest = c?.elementoDestinoId || c?.vinculadoId || '';
    if (!rawDest) return;
    String(rawDest)
      .split(',')
      .map((s) => sanitizeParentId(s, el.id))
      .filter(Boolean)
      .forEach((cid) => ids.add(cid));
  });
  return Array.from(ids);
};

const extractElementParentIds = (el, allElements = []) => {
  if (!el || typeof el !== 'object' || isGeneratorElement(el)) return [];
  const dt = parseDatosTecnicosSafe(el.datosTecnicos);
  const ids = new Set();
  const pushValid = (rawId) => {
    const clean = sanitizeParentId(rawId, el.id);
    if (clean) ids.add(clean);
  };

  if (isTransferElement(el)) {
    pushValid(dt.fuenteNormalId);
    pushValid(dt.fuenteEmergenciaId);
    if (!sanitizeParentId(dt.fuenteNormalId, el.id) && !isPlaceholderHierarchyValue(dt.fuenteNormalNombre)) {
      const m = findElementMatchInList(dt.fuenteNormalNombre, allElements, el.id);
      if (m) ids.add(String(m.id));
    }
    if (!sanitizeParentId(dt.fuenteEmergenciaId, el.id) && !isPlaceholderHierarchyValue(dt.fuenteEmergenciaNombre)) {
      const m = findElementMatchInList(dt.fuenteEmergenciaNombre, allElements, el.id);
      if (m) ids.add(String(m.id));
    }
    if (Array.isArray(dt.alimentadoPorIds)) {
      dt.alimentadoPorIds.forEach(pushValid);
    }
    if (ids.size === 0) {
      pushValid(el.alimentadoPorId);
      pushValid(dt.alimentadoPorId);
      pushValid(dt.alimentadorId);
      pushValid(el.origenId);
    }
  } else {
    pushValid(el.alimentadoPorId);
    pushValid(dt.alimentadoPorId);
    pushValid(dt.alimentadorId);
    pushValid(el.origenId);
    if (ids.size === 0 && !isPlaceholderHierarchyValue(el.alimentadoPor)) {
      const m = findElementMatchInList(el.alimentadoPor, allElements, el.id);
      if (m) ids.add(String(m.id));
    }
  }

  return Array.from(ids);
};

const extractElementDownstreamIds = (el, allElements = []) => {
  if (!el || typeof el !== 'object') return [];
  const dt = parseDatosTecnicosSafe(el.datosTecnicos);
  const ids = new Set();
  const pushValid = (rawId) => {
    const clean = sanitizeParentId(rawId, el.id);
    if (clean) ids.add(clean);
  };

  (Array.isArray(el.alimentaAIds) ? el.alimentaAIds : []).forEach(pushValid);
  (Array.isArray(dt.alimentaAIds) ? dt.alimentaAIds : []).forEach(pushValid);

  if (isTransferElement(el)) {
    pushValid(dt.salidaCargaId);
    if (ids.size === 0 && !isPlaceholderHierarchyValue(dt.salidaCargaNombre)) {
      String(dt.salidaCargaNombre)
        .split(/[,;\n]/)
        .map((t) => t.trim())
        .filter(Boolean)
        .forEach((tok) => {
          const m = findElementMatchInList(tok, allElements, el.id);
          if (m) ids.add(String(m.id));
        });
    }
  }

  extractCircuitDestIds(el).forEach((cid) => ids.add(cid));
  return Array.from(ids);
};

const applyUpstreamLinkToElement = (targetEl, parentId, parentLabel, parentTipo) => {
  if (!targetEl || !targetEl.id || !parentId || String(targetEl.id) === String(parentId)) {
    return { nextEl: targetEl, changed: false };
  }
  if (isGeneratorElement(targetEl)) {
    return { nextEl: targetEl, changed: false };
  }

  const cleanParentId = String(parentId).trim();
  const cleanLabel = String(parentLabel || '').trim().toUpperCase();
  const dt = parseDatosTecnicosSafe(targetEl.datosTecnicos);

  if (isTransferElement(targetEl)) {
    let { normId, normName, emergId, emergName } = getTransferSourceSlots(targetEl);
    const parentIsGen = GENERATOR_TYPES.has(String(parentTipo || '').trim().toUpperCase());

    if (parentIsGen) {
      if (normId === cleanParentId) {
        normId = null;
        normName = '';
      }
      emergId = cleanParentId;
      if (cleanLabel) emergName = cleanLabel;
    } else if (normId === cleanParentId) {
      if (cleanLabel) normName = cleanLabel;
    } else if (emergId === cleanParentId) {
      if (cleanLabel) emergName = cleanLabel;
    } else if (!normId) {
      normId = cleanParentId;
      if (cleanLabel) normName = cleanLabel;
    } else if (!emergId && isPlaceholderHierarchyValue(emergName)) {
      emergId = cleanParentId;
      if (cleanLabel) emergName = cleanLabel;
    } else {
      normId = cleanParentId;
      if (cleanLabel) normName = cleanLabel;
    }

    const nextAlimentadoPorIds = Array.from(new Set([normId, emergId].filter(Boolean)));
    const nextAlimentadoPor = [normName, emergName].filter(Boolean).join(' / ');
    const nextPrimaryParentId = normId || emergId || null;

    const prevIds = Array.isArray(dt.alimentadoPorIds) ? dt.alimentadoPorIds : [];
    const sameState =
      (dt.fuenteNormalId || null) === (normId || null) &&
      (dt.fuenteNormalNombre || '') === normName &&
      (dt.fuenteEmergenciaId || null) === (emergId || null) &&
      (dt.fuenteEmergenciaNombre || '') === emergName &&
      (targetEl.alimentadoPorId || null) === nextPrimaryParentId &&
      (dt.alimentadoPorId || null) === nextPrimaryParentId &&
      (targetEl.alimentadoPor || '') === nextAlimentadoPor &&
      prevIds.length === nextAlimentadoPorIds.length &&
      nextAlimentadoPorIds.every((idVal, idx) => prevIds[idx] === idVal);

    if (sameState) {
      return { nextEl: targetEl, changed: false };
    }

    return {
      changed: true,
      nextEl: {
        ...targetEl,
        alimentadoPorId: nextPrimaryParentId,
        alimentadoPor: nextAlimentadoPor,
        datosTecnicos: {
          ...dt,
          fuenteNormalId: normId || null,
          fuenteNormalNombre: normName,
          fuenteEmergenciaId: emergId || null,
          fuenteEmergenciaNombre: emergName,
          alimentadoPorId: nextPrimaryParentId,
          alimentadoPorIds: nextAlimentadoPorIds
        }
      }
    };
  }

  const nextLabel = cleanLabel || (isPlaceholderHierarchyValue(targetEl.alimentadoPor) ? '' : String(targetEl.alimentadoPor).trim().toUpperCase());
  const sameState =
    targetEl.alimentadoPorId === cleanParentId &&
    dt.alimentadoPorId === cleanParentId &&
    (targetEl.alimentadoPor || '') === nextLabel;

  if (sameState) {
    return { nextEl: targetEl, changed: false };
  }

  return {
    changed: true,
    nextEl: {
      ...targetEl,
      alimentadoPorId: cleanParentId,
      alimentadoPor: nextLabel,
      datosTecnicos: {
        ...dt,
        alimentadoPorId: cleanParentId
      }
    }
  };
};

const removeUpstreamLinkFromElement = (targetEl, removedParentId, removedParentLabel = '') => {
  if (!targetEl || !removedParentId) {
    return { nextEl: targetEl, changed: false };
  }
  const rmId = String(removedParentId).trim();
  const rmLabel = String(removedParentLabel || '').trim().toUpperCase();
  const dt = parseDatosTecnicosSafe(targetEl.datosTecnicos);

  if (isTransferElement(targetEl)) {
    let { normId, normName, emergId, emergName } = getTransferSourceSlots(targetEl);
    let touched = false;

    if (normId === rmId || (!normId && rmLabel && normName === rmLabel)) {
      normId = null;
      normName = '';
      touched = true;
    }
    if (emergId === rmId || (!emergId && rmLabel && emergName === rmLabel)) {
      emergId = null;
      emergName = '';
      touched = true;
    }
    if (!touched) {
      const hadInIds = Array.isArray(dt.alimentadoPorIds) && dt.alimentadoPorIds.includes(rmId);
      if (targetEl.alimentadoPorId !== rmId && dt.alimentadoPorId !== rmId && !hadInIds) {
        return { nextEl: targetEl, changed: false };
      }
      touched = true;
    }

    const nextAlimentadoPorIds = Array.from(new Set([normId, emergId].filter(Boolean)));
    const nextAlimentadoPor = [normName, emergName].filter(Boolean).join(' / ');
    const nextPrimaryParentId = normId || emergId || null;

    return {
      changed: true,
      nextEl: {
        ...targetEl,
        alimentadoPorId: nextPrimaryParentId,
        alimentadoPor: nextAlimentadoPor,
        datosTecnicos: {
          ...dt,
          fuenteNormalId: normId || null,
          fuenteNormalNombre: normName,
          fuenteEmergenciaId: emergId || null,
          fuenteEmergenciaNombre: emergName,
          alimentadoPorId: nextPrimaryParentId,
          alimentadoPorIds: nextAlimentadoPorIds
        }
      }
    };
  }

  const isLinked =
    targetEl.alimentadoPorId === rmId ||
    dt.alimentadoPorId === rmId ||
    dt.alimentadorId === rmId ||
    (!targetEl.alimentadoPorId && rmLabel && String(targetEl.alimentadoPor || '').trim().toUpperCase() === rmLabel);

  if (!isLinked) {
    return { nextEl: targetEl, changed: false };
  }

  return {
    changed: true,
    nextEl: {
      ...targetEl,
      alimentadoPorId: null,
      alimentadoPor: '',
      datosTecnicos: {
        ...dt,
        alimentadoPorId: null,
        ...(dt.alimentadorId === rmId ? { alimentadorId: null } : {})
      }
    }
  };
};

const rebuildParentDownstreamFields = (parentEl, nextIds, childLabelOverrideMap, allElementsMap, removedLabels = []) => {
  const dt = parseDatosTecnicosSafe(parentEl.datosTecnicos);
  const transferFlag = isTransferElement(parentEl);

  const knownLinkedSet = new Set();
  const excludedSet = new Set(removedLabels.map((s) => String(s || '').trim().toUpperCase()).filter(Boolean));
  const linkedLabels = [];

  nextIds.forEach((cid) => {
    const childObj = allElementsMap?.get(String(cid));
    const lbl = childLabelOverrideMap?.get(String(cid)) || (childObj ? getCleanElementLabel(childObj) : '');
    if (lbl) {
      knownLinkedSet.add(lbl);
      if (!linkedLabels.includes(lbl)) linkedLabels.push(lbl);
    }
    if (childObj) {
      const origLbl = getCleanElementLabel(childObj);
      if (origLbl) knownLinkedSet.add(origLbl);
      if (childObj.codigo) knownLinkedSet.add(String(childObj.codigo).trim().toUpperCase());
      if (childObj.simpleCode) knownLinkedSet.add(String(childObj.simpleCode).trim().toUpperCase());
    }
  });

  const rawPrevText = !isPlaceholderHierarchyValue(parentEl.alimentaA)
    ? String(parentEl.alimentaA)
    : (!isPlaceholderHierarchyValue(dt.alimentaA)
        ? String(dt.alimentaA)
        : (transferFlag && !isPlaceholderHierarchyValue(dt.salidaCargaNombre) ? String(dt.salidaCargaNombre) : ''));

  const allKnownLabelsSet = new Set();
  if (allElementsMap) {
    allElementsMap.forEach((el) => {
      const lbl = getCleanElementLabel(el);
      if (lbl) allKnownLabelsSet.add(lbl);
    });
  }

  const manualTokens = [];
  if (rawPrevText) {
    rawPrevText
      .split(/[,;\n]/)
      .map((t) => cleanElementName(t).toUpperCase().trim())
      .filter((t) => !isPlaceholderHierarchyValue(t))
      .forEach((tok) => {
        const isKnownRemoved = excludedSet.has(tok) || knownLinkedSet.has(tok) || allKnownLabelsSet.has(tok);
        if (!isKnownRemoved && !linkedLabels.includes(tok) && !manualTokens.includes(tok)) {
          manualTokens.push(tok);
        }
      });
  }

  const nextAlimentaA = [...linkedLabels, ...manualTokens].join(', ');
  const nextSalidaId = nextIds[0] || null;

  const prevIds = Array.isArray(parentEl.alimentaAIds)
    ? parentEl.alimentaAIds
    : (Array.isArray(dt.alimentaAIds) ? dt.alimentaAIds : []);
  const prevAlimentaA = String(parentEl.alimentaA || '');
  const prevDtAlimentaA = String(dt.alimentaA || '');
  const prevDtIds = Array.isArray(dt.alimentaAIds) ? dt.alimentaAIds : [];

  const sameIds =
    prevIds.length === nextIds.length &&
    nextIds.every((idVal, idx) => String(prevIds[idx]) === String(idVal)) &&
    prevDtIds.length === nextIds.length &&
    nextIds.every((idVal, idx) => String(prevDtIds[idx]) === String(idVal));

  const sameTransferSalida = !transferFlag || (
    (dt.salidaCargaId || null) === nextSalidaId &&
    String(dt.salidaCargaNombre || '') === nextAlimentaA
  );

  if (sameIds && prevAlimentaA === nextAlimentaA && prevDtAlimentaA === nextAlimentaA && sameTransferSalida) {
    return { nextEl: parentEl, changed: false };
  }

  return {
    changed: true,
    nextEl: {
      ...parentEl,
      alimentaA: nextAlimentaA,
      alimentaAIds: nextIds,
      datosTecnicos: {
        ...dt,
        alimentaA: nextAlimentaA,
        alimentaAIds: nextIds,
        ...(transferFlag ? { salidaCargaId: nextSalidaId, salidaCargaNombre: nextAlimentaA } : {})
      }
    }
  };
};

const applyDownstreamLinkToParent = (parentEl, childId, childLabel, allElementsMap, prevChildLabel = '') => {
  if (!parentEl || !parentEl.id || !childId || String(parentEl.id) === String(childId)) {
    return { nextEl: parentEl, changed: false };
  }
  if (isTableroElement(parentEl)) {
    return { nextEl: parentEl, changed: false };
  }

  const dt = parseDatosTecnicosSafe(parentEl.datosTecnicos);
  const transferFlag = isTransferElement(parentEl);
  const cleanChildId = String(childId).trim();

  const existingIds = Array.from(new Set([
    ...(Array.isArray(parentEl.alimentaAIds) ? parentEl.alimentaAIds : []),
    ...(Array.isArray(dt.alimentaAIds) ? dt.alimentaAIds : []),
    ...(transferFlag && dt.salidaCargaId ? [dt.salidaCargaId] : [])
  ]
    .map((idVal) => sanitizeParentId(idVal, parentEl.id))
    .filter(Boolean)));

  const nextIds = existingIds.includes(cleanChildId) ? existingIds : [...existingIds, cleanChildId];
  const overrideMap = new Map();
  if (childLabel) overrideMap.set(cleanChildId, String(childLabel).trim().toUpperCase());

  return rebuildParentDownstreamFields(parentEl, nextIds, overrideMap, allElementsMap, prevChildLabel ? [prevChildLabel] : []);
};

const removeDownstreamLinkFromParent = (parentEl, removedChildId, removedChildLabel = '', allElementsMap) => {
  if (!parentEl || !parentEl.id || !removedChildId || isTableroElement(parentEl)) {
    return { nextEl: parentEl, changed: false };
  }

  const dt = parseDatosTecnicosSafe(parentEl.datosTecnicos);
  const transferFlag = isTransferElement(parentEl);
  const rmId = String(removedChildId).trim();
  const rmLabel = String(removedChildLabel || '').trim().toUpperCase();

  const existingIds = Array.from(new Set([
    ...(Array.isArray(parentEl.alimentaAIds) ? parentEl.alimentaAIds : []),
    ...(Array.isArray(dt.alimentaAIds) ? dt.alimentaAIds : []),
    ...(transferFlag && dt.salidaCargaId ? [dt.salidaCargaId] : [])
  ]
    .map((idVal) => sanitizeParentId(idVal, parentEl.id))
    .filter(Boolean)));

  const rawText = String(parentEl.alimentaA || dt.alimentaA || (transferFlag ? dt.salidaCargaNombre : '') || '').toUpperCase();
  const hasId = existingIds.includes(rmId);
  const hasLabel = rmLabel && rawText.split(/[,;\n]/).map((s) => cleanElementName(s).toUpperCase().trim()).includes(rmLabel);

  if (!hasId && !hasLabel) {
    return { nextEl: parentEl, changed: false };
  }

  const nextIds = existingIds.filter((cid) => cid !== rmId);
  const childObj = allElementsMap?.get(rmId);
  const knownRmLabel = childObj ? getCleanElementLabel(childObj) : '';

  return rebuildParentDownstreamFields(parentEl, nextIds, new Map(), allElementsMap, [rmLabel, knownRmLabel]);
};

const syncRenamedTargetInTableroCircuits = (tableroEl, renamedId, newLabel, allElementsMap) => {
  if (!tableroEl || !renamedId || !newLabel) return { nextEl: tableroEl, changed: false };
  const targetIdStr = String(renamedId);
  const targetObj = allElementsMap?.get(targetIdStr);
  const dt = parseDatosTecnicosSafe(tableroEl.datosTecnicos);

  const mapCircuitList = (list) => {
    if (!Array.isArray(list)) return { nextList: list, changed: false };
    let listChanged = false;
    const nextList = list.map((c) => {
      if (!c) return c;
      const rawDest = c.elementoDestinoId || c.vinculadoId || '';
      if (!rawDest) return c;
      const destIds = String(rawDest).split(',').map((s) => s.trim()).filter(Boolean);
      if (!destIds.includes(targetIdStr)) return c;

      const updatedNames = destIds.map((did) => {
        if (did === targetIdStr) {
          const code = targetObj ? getSimpleElementCode(targetObj, targetObj.tipoElemento || c.tipoElementoDestino || 'TABLERO') : getSimpleElementCode(did, c.tipoElementoDestino || 'TABLERO');
          return `${newLabel} (${code})`;
        }
        const other = allElementsMap?.get(did);
        if (other) {
          const code = getSimpleElementCode(other, other.tipoElemento || 'TABLERO');
          return `${getCleanElementLabel(other)} (${code})`;
        }
        return '';
      }).filter(Boolean);

      const nextEquipo = updatedNames.join(', ');
      if (!nextEquipo || c.equipo === nextEquipo) return c;
      listChanged = true;
      return {
        ...c,
        equipo: nextEquipo,
        ...(c.nombreProvisional ? { nombreProvisional: newLabel } : {})
      };
    });
    return { nextList, changed: listChanged };
  };

  const topCircRes = mapCircuitList(tableroEl.circuits);
  const dtCircRes = mapCircuitList(dt.circuits);

  const mapPendingList = (list) => {
    if (!Array.isArray(list)) return { nextList: list, changed: false };
    let pChanged = false;
    const nextList = list.map((p) => {
      if (p && String(p.id) === targetIdStr && p.nombre !== newLabel) {
        pChanged = true;
        return { ...p, nombre: newLabel };
      }
      return p;
    });
    return { nextList, changed: pChanged };
  };

  const topPendRes = mapPendingList(tableroEl.elementosPorCrear);
  const dtPendRes = mapPendingList(dt.elementosPorCrear);

  if (!topCircRes.changed && !dtCircRes.changed && !topPendRes.changed && !dtPendRes.changed) {
    return { nextEl: tableroEl, changed: false };
  }

  return {
    changed: true,
    nextEl: {
      ...tableroEl,
      ...(topCircRes.changed ? { circuits: topCircRes.nextList } : {}),
      ...(topPendRes.changed ? { elementosPorCrear: topPendRes.nextList } : {}),
      datosTecnicos: {
        ...dt,
        ...(dtCircRes.changed ? { circuits: dtCircRes.nextList } : {}),
        ...(dtPendRes.changed ? { elementosPorCrear: dtPendRes.nextList } : {})
      }
    }
  };
};

const applyRenamePropagationToPeer = (peerEl, targetId, prevLabel, nextLabel, targetTipo, allElementsMap, allProjectElements) => {
  if (!peerEl || !targetId || !nextLabel) return { nextEl: peerEl, changed: false };
  let currentEl = peerEl;
  let anyChanged = false;
  const targetIdStr = String(targetId);

  const parentIds = extractElementParentIds(currentEl, allProjectElements);
  const isTextOnlyChild =
    !currentEl.alimentadoPorId &&
    !isPlaceholderHierarchyValue(currentEl.alimentadoPor) &&
    prevLabel &&
    cleanElementName(String(currentEl.alimentadoPor)).toUpperCase().trim() === prevLabel;

  if (parentIds.includes(targetIdStr) || isTextOnlyChild) {
    const res = applyUpstreamLinkToElement(currentEl, targetIdStr, nextLabel, targetTipo);
    if (res.changed) {
      currentEl = res.nextEl;
      anyChanged = true;
    }
  }

  const circRes = syncRenamedTargetInTableroCircuits(currentEl, targetIdStr, nextLabel, allElementsMap);
  if (circRes.changed) {
    currentEl = circRes.nextEl;
    anyChanged = true;
  }

  if (!isTableroElement(currentEl) && prevLabel) {
    const dt = parseDatosTecnicosSafe(currentEl.datosTecnicos);
    const hasIds = (Array.isArray(currentEl.alimentaAIds) && currentEl.alimentaAIds.length > 0) ||
                   (Array.isArray(dt.alimentaAIds) && dt.alimentaAIds.length > 0);
    if (!hasIds && !isPlaceholderHierarchyValue(currentEl.alimentaA)) {
      const tokens = String(currentEl.alimentaA).split(/[,;\n]/).map((s) => cleanElementName(s).toUpperCase().trim());
      if (tokens.includes(prevLabel)) {
        const res = applyDownstreamLinkToParent(currentEl, targetIdStr, nextLabel, allElementsMap, prevLabel);
        if (res.changed) {
          currentEl = res.nextEl;
          anyChanged = true;
        }
      }
    }
  }

  return { nextEl: currentEl, changed: anyChanged };
};

export const resolveElementUbicacionDisplay = (item) => {
  if (!item || typeof item !== 'object') return '';
  const dt = parseDatosTecnicosSafe(item.datosTecnicos);
  const plantaArea = [
    item.plantaInstalacion || dt.plantaInstalacion || '',
    item.areaProceso || dt.areaProceso || ''
  ]
    .map((s) => String(s || '').trim())
    .filter((s) => !isPlaceholderHierarchyValue(s))
    .join(' - ');

  const candidates = [
    item.ubicacion,
    dt.ubicacion,
    plantaArea,
    item.puntoConexionPCC || dt.puntoConexionPCC,
    item.ubicacionMedidor || dt.ubicacionMedidor,
    item.ubicacionTransformador || dt.ubicacionTransformador,
    dt.tipoMalla,
    item.direccion || dt.direccion
  ];

  for (const cand of candidates) {
    if (!isPlaceholderHierarchyValue(cand)) {
      return String(cand).trim().toUpperCase();
    }
  }
  return '';
};

export const resolveElementParentDisplay = (item, allProjectElements = []) => {
  if (!item || typeof item !== 'object') return '';
  if (isGeneratorElement(item)) return 'FUENTE PRIMARIA INDEPENDIENTE';

  const dt = parseDatosTecnicosSafe(item.datosTecnicos);
  const elements = Array.isArray(allProjectElements) ? allProjectElements : [];
  const byId = new Map();
  const byCode = new Map();
  elements.forEach((el) => {
    if (!el || !el.id) return;
    byId.set(String(el.id), el);
    const code = el.codigo || el.simpleCode;
    if (code) byCode.set(String(code).trim().toLowerCase(), el);
  });

  const formatParentLabel = (parentEl) => getCleanElementLabel(parentEl);

  const resolveSlotTextOrId = (slotId, slotName) => {
    const cleanId = sanitizeParentId(slotId, item.id);
    if (cleanId) {
      const parentEl = byId.get(String(cleanId)) || byCode.get(String(cleanId).toLowerCase());
      if (parentEl && parentEl.id !== item.id) return formatParentLabel(parentEl);
    }
    if (!isPlaceholderHierarchyValue(slotName)) {
      const str = String(slotName).trim();
      if (str.toUpperCase() === 'CORPOELEC') return 'CORPOELEC';
      const matched = findElementMatchInList(str, elements, item.id);
      if (matched) return formatParentLabel(matched);
      return cleanElementName(str).toUpperCase().trim();
    }
    return '';
  };

  // Búsqueda inversa en el árbol (alimentaAIds o circuitos de tableros padres)
  const reverseParents = [];
  const itemIdStr = String(item.id || '');
  elements.forEach((parentEl) => {
    if (!parentEl || !parentEl.id || String(parentEl.id) === itemIdStr) return;
    const downIds = extractElementDownstreamIds(parentEl, elements);
    if (downIds.includes(itemIdStr)) {
      reverseParents.push(parentEl);
    }
  });

  // Caso Transferencia: combinar Fuente Normal + Fuente Emergencia + enlaces inversos
  if (isTransferElement(item)) {
    const { normId, normName, emergId, emergName } = getTransferSourceSlots(item);
    const labels = [];
    const normLbl = resolveSlotTextOrId(normId, normName);
    const emergLbl = resolveSlotTextOrId(emergId, emergName);
    if (normLbl) labels.push(normLbl);
    if (emergLbl && !labels.includes(emergLbl)) labels.push(emergLbl);

    if (Array.isArray(dt.alimentadoPorIds)) {
      dt.alimentadoPorIds.forEach((pid) => {
        const lbl = resolveSlotTextOrId(pid, '');
        if (lbl && !labels.includes(lbl)) labels.push(lbl);
      });
    }

    reverseParents.forEach((pEl) => {
      const lbl = formatParentLabel(pEl);
      if (lbl && !labels.includes(lbl)) labels.push(lbl);
    });

    if (labels.length > 0) {
      return labels.join(' / ');
    }
  }

  const rawTextTop = !isPlaceholderHierarchyValue(item.alimentadoPor)
    ? String(item.alimentadoPor).trim()
    : (!isPlaceholderHierarchyValue(dt.alimentadoPor) ? String(dt.alimentadoPor).trim() : '');

  if (rawTextTop.toUpperCase() === 'CORPOELEC' && !sanitizeParentId(item.alimentadoPorId, item.id)) {
    return 'CORPOELEC';
  }

  // 1. Vínculo directo por ID de padre (top-level o en datosTecnicos)
  const directParentIds = [
    item.alimentadoPorId,
    dt.alimentadoPorId,
    dt.alimentadorId,
    item.origenId
  ]
    .map((idVal) => sanitizeParentId(idVal, item.id))
    .filter(Boolean);

  for (const pid of directParentIds) {
    const parentEl = byId.get(String(pid)) || byCode.get(String(pid).toLowerCase());
    if (parentEl && parentEl.id !== item.id) {
      return formatParentLabel(parentEl);
    }
  }

  // 2. Campo de texto explícito no placeholder (resolviendo si trae UUID crudo o nombre de elemento)
  if (rawTextTop) {
    const byIdMatch = byId.get(rawTextTop) || findElementMatchInList(rawTextTop, elements, item.id);
    if (byIdMatch && byIdMatch.id !== item.id) {
      return formatParentLabel(byIdMatch);
    }
    return cleanElementName(rawTextTop).toUpperCase().trim();
  }

  // 3. Resultado de búsqueda inversa en el árbol
  if (reverseParents.length > 0) {
    const revNames = Array.from(new Set(reverseParents.map(formatParentLabel).filter(Boolean)));
    if (revNames.length > 0) return revNames.join(', ');
  }

  // 4. Fallback para Punto de Suministro vinculado a red eléctrica
  const tipo = getElementTipoUpper(item);
  if (tipo === 'PUNTO_SUMINISTRO' || tipo === 'PUNTO_MEDICION') {
    if (!isPlaceholderHierarchyValue(dt.empresaDistribuidora)) {
      return String(dt.empresaDistribuidora).trim().toUpperCase();
    }
    if (dt.enlaceCorpoelec) {
      return 'CORPOELEC';
    }
  }

  return '';
};

export const resolveElementAlimentaADisplay = (item, allProjectElements = []) => {
  if (!item || typeof item !== 'object' || !item.id) {
    return { ids: [], items: [], names: [], text: '' };
  }

  const dt = parseDatosTecnicosSafe(item.datosTecnicos);
  const elements = Array.isArray(allProjectElements) ? allProjectElements : [];
  const itemIdStr = String(item.id);
  const byId = new Map();
  elements.forEach((el) => {
    if (el && el.id) byId.set(String(el.id), el);
  });

  const collectedIds = new Set();
  const pushValid = (rawId) => {
    const clean = sanitizeParentId(rawId, itemIdStr);
    if (clean) collectedIds.add(clean);
  };

  // 1. Declaraciones explícitas en el propio elemento y sus circuitos
  (Array.isArray(item.alimentaAIds) ? item.alimentaAIds : []).forEach(pushValid);
  (Array.isArray(dt.alimentaAIds) ? dt.alimentaAIds : []).forEach(pushValid);
  if (isTransferElement(item)) {
    pushValid(dt.salidaCargaId);
  }
  extractCircuitDestIds(item).forEach((cid) => collectedIds.add(cid));

  // 2. Búsqueda inversa: cualquier elemento que tenga a este elemento en su "ALIMENTADO POR" / fuentes
  const selfLabel = getCleanElementLabel(item);
  elements.forEach((cand) => {
    if (!cand || !cand.id || String(cand.id) === itemIdStr) return;
    const candParents = extractElementParentIds(cand, elements);
    if (candParents.includes(itemIdStr)) {
      collectedIds.add(String(cand.id));
      return;
    }
    if (selfLabel && !cand.alimentadoPorId && !isPlaceholderHierarchyValue(cand.alimentadoPor)) {
      const tokens = String(cand.alimentadoPor).split(/[,;\n/]/).map((s) => cleanElementName(s).toUpperCase().trim());
      if (tokens.includes(selfLabel)) {
        collectedIds.add(String(cand.id));
      }
    }
  });

  // 3. Texto explícito/manual (cuando no tenga IDs o represente carga directa)
  const rawAlimentaText = !isPlaceholderHierarchyValue(item.alimentaA)
    ? String(item.alimentaA)
    : (!isPlaceholderHierarchyValue(dt.alimentaA)
        ? String(dt.alimentaA)
        : (isTransferElement(item) && !isPlaceholderHierarchyValue(dt.salidaCargaNombre) ? String(dt.salidaCargaNombre) : ''));

  const manualNames = [];
  if (rawAlimentaText) {
    rawAlimentaText
      .split(/[,;\n]/)
      .map((s) => cleanElementName(s).toUpperCase().trim())
      .filter((s) => !isPlaceholderHierarchyValue(s))
      .forEach((tok) => {
        const matched = findElementMatchInList(tok, elements, itemIdStr);
        if (matched) {
          if (collectedIds.size === 0 || collectedIds.has(String(matched.id))) {
            collectedIds.add(String(matched.id));
          }
        } else if (!manualNames.includes(tok)) {
          manualNames.push(tok);
        }
      });
  }

  const ids = Array.from(collectedIds);
  const resolvedItems = [];
  const names = [];

  ids.forEach((cid) => {
    const childEl = byId.get(String(cid));
    if (childEl) {
      resolvedItems.push(childEl);
      const lbl = getCleanElementLabel(childEl);
      if (lbl && !names.includes(lbl)) names.push(lbl);
    }
  });

  manualNames.forEach((m) => {
    if (!names.includes(m)) names.push(m);
  });

  return {
    ids,
    items: resolvedItems,
    names,
    text: names.join(', ')
  };
};

export const hydrateProjectHierarchyLinks = (elements = []) => {
  if (!Array.isArray(elements) || elements.length === 0) return [];

  const byId = new Map();
  elements.forEach((el) => {
    if (el && el.id) byId.set(String(el.id), el);
  });

  // Pasada 1: Mapear relaciones bidireccionales existentes en ambas direcciones
  const reverseParentMap = new Map(); // childId -> [parentEl]
  const reverseChildMap = new Map();  // parentId -> [childEl]

  elements.forEach((el) => {
    if (!el || !el.id) return;
    const elIdStr = String(el.id);

    extractElementDownstreamIds(el, elements).forEach((cid) => {
      if (cid === elIdStr || !byId.has(cid)) return;
      if (!reverseParentMap.has(cid)) reverseParentMap.set(cid, []);
      if (!reverseParentMap.get(cid).some((p) => String(p.id) === elIdStr)) {
        reverseParentMap.get(cid).push(el);
      }
    });

    extractElementParentIds(el, elements).forEach((pid) => {
      if (pid === elIdStr || !byId.has(pid)) return;
      if (!reverseChildMap.has(pid)) reverseChildMap.set(pid, []);
      if (!reverseChildMap.get(pid).some((c) => String(c.id) === elIdStr)) {
        reverseChildMap.get(pid).push(el);
      }
    });
  });

  // Pasada 2: Reconciliar atributos locales y campos específicos de TRANSFER
  return elements.map((el) => {
    if (!el || !el.id) return el;
    const elIdStr = String(el.id);
    const dt = parseDatosTecnicosSafe(el.datosTecnicos);
    const revParents = reverseParentMap.get(elIdStr) || [];
    const revChildren = reverseChildMap.get(elIdStr) || [];
    const resolvedUbic = resolveElementUbicacionDisplay(el);
    const nextUbicacion = !isPlaceholderHierarchyValue(el.ubicacion)
      ? el.ubicacion
      : (resolvedUbic || '');

    if (isTransferElement(el)) {
      let { normId, normName, emergId, emergName } = getTransferSourceSlots(el);

      if (!normId && normName && normName !== 'CORPOELEC') {
        const m = findElementMatchInList(normName, elements, elIdStr);
        if (m) {
          normId = String(m.id);
          normName = getCleanElementLabel(m);
        }
      } else if (normId && byId.has(normId)) {
        normName = getCleanElementLabel(byId.get(normId)) || normName;
      }

      if (!emergId && emergName) {
        const m = findElementMatchInList(emergName, elements, elIdStr);
        if (m) {
          emergId = String(m.id);
          emergName = getCleanElementLabel(m);
        }
      } else if (emergId && byId.has(emergId)) {
        emergName = getCleanElementLabel(byId.get(emergId)) || emergName;
      }

      // Hydratar desde padres que declararon esta Transferencia en su ALIMENTA A / circuitos
      revParents.forEach((pEl) => {
        const pId = String(pEl.id);
        const pLabel = getCleanElementLabel(pEl);
        if (isGeneratorElement(pEl)) {
          if (!emergId) {
            emergId = pId;
            emergName = pLabel;
          }
        } else if (!normId && isPlaceholderHierarchyValue(normName)) {
          normId = pId;
          normName = pLabel;
        } else if (normId !== pId && emergId !== pId && !emergId && isPlaceholderHierarchyValue(emergName)) {
          emergId = pId;
          emergName = pLabel;
        }
      });

      const nextAlimentadoPorIds = Array.from(new Set([normId, emergId].filter(Boolean)));
      const nextPrimaryParentId = normId || emergId || sanitizeParentId(el.alimentadoPorId || dt.alimentadoPorId, elIdStr);
      const computedParentText = [normName, emergName].filter(Boolean).join(' / ');
      const nextAlimentadoPor = computedParentText || (!isPlaceholderHierarchyValue(el.alimentadoPor) ? el.alimentadoPor : resolveElementParentDisplay({ ...el, datosTecnicos: dt }, elements));

      const downResolved = resolveElementAlimentaADisplay(el, elements);
      const mergedDownIds = Array.from(new Set([
        ...downResolved.ids,
        ...revChildren.map((c) => String(c.id))
      ].filter((cid) => cid && cid !== elIdStr)));

      const nextDownRes = rebuildParentDownstreamFields(
        { ...el, datosTecnicos: { ...dt, salidaCargaId: dt.salidaCargaId || mergedDownIds[0] || null } },
        mergedDownIds,
        new Map(),
        byId
      );

      const nextTransferDt = {
        ...(nextDownRes.nextEl.datosTecnicos || dt),
        fuenteNormalId: normId || null,
        fuenteNormalNombre: normName,
        fuenteEmergenciaId: emergId || null,
        fuenteEmergenciaNombre: emergName,
        alimentadoPorId: nextPrimaryParentId || null,
        alimentadoPorIds: nextAlimentadoPorIds
      };

      const changedDt = JSON.stringify(dt) !== JSON.stringify(nextTransferDt);
      if (
        !changedDt &&
        nextPrimaryParentId === (el.alimentadoPorId || null) &&
        nextAlimentadoPor === (el.alimentadoPor || '') &&
        nextUbicacion === (el.ubicacion || '') &&
        nextDownRes.nextEl.alimentaA === (el.alimentaA || '') &&
        JSON.stringify(nextDownRes.nextEl.alimentaAIds || []) === JSON.stringify(el.alimentaAIds || [])
      ) {
        return el;
      }

      return {
        ...el,
        alimentadoPorId: nextPrimaryParentId || null,
        alimentadoPor: nextAlimentadoPor,
        alimentaA: nextDownRes.nextEl.alimentaA,
        alimentaAIds: nextDownRes.nextEl.alimentaAIds,
        ubicacion: nextUbicacion,
        datosTecnicos: nextTransferDt
      };
    }

    // Elementos regulares (no Transfer)
    let nextParentId = sanitizeParentId(
      el.alimentadoPorId || dt.alimentadoPorId || dt.alimentadorId || el.origenId,
      elIdStr
    );
    if (!nextParentId && !isPlaceholderHierarchyValue(el.alimentadoPor) && String(el.alimentadoPor).trim().toUpperCase() !== 'CORPOELEC') {
      const m = findElementMatchInList(el.alimentadoPor, elements, elIdStr);
      if (m) nextParentId = String(m.id);
    }
    if (!nextParentId && isPlaceholderHierarchyValue(el.alimentadoPor) && revParents.length === 1) {
      nextParentId = String(revParents[0].id);
    }

    const candidateEl = nextParentId !== el.alimentadoPorId
      ? { ...el, alimentadoPorId: nextParentId }
      : el;
    const resolvedParent = isGeneratorElement(el)
      ? 'FUENTE PRIMARIA INDEPENDIENTE'
      : resolveElementParentDisplay(candidateEl, elements);

    const nextAlimentadoPor = isGeneratorElement(el)
      ? (el.alimentadoPor || 'FUENTE PRIMARIA INDEPENDIENTE')
      : (!isPlaceholderHierarchyValue(el.alimentadoPor) && (!nextParentId || String(el.alimentadoPor).trim().toUpperCase() === 'CORPOELEC')
          ? el.alimentadoPor
          : (resolvedParent || el.alimentadoPor || ''));

    let nextAlimentaA = el.alimentaA || '';
    let nextAlimentaAIds = Array.isArray(el.alimentaAIds) ? el.alimentaAIds : (Array.isArray(dt.alimentaAIds) ? dt.alimentaAIds : []);
    let nextRegularDt = nextParentId !== (dt.alimentadoPorId || null) ? { ...dt, alimentadoPorId: nextParentId } : dt;
    let downstreamChanged = false;

    if (!isTableroElement(el) && revChildren.length > 0) {
      const mergedChildIds = Array.from(new Set([
        ...nextAlimentaAIds.map(String),
        ...revChildren.map((c) => String(c.id))
      ].filter((cid) => cid && cid !== elIdStr)));
      const rebuilt = rebuildParentDownstreamFields(
        { ...el, datosTecnicos: nextRegularDt },
        mergedChildIds,
        new Map(),
        byId
      );
      if (rebuilt.changed) {
        nextAlimentaA = rebuilt.nextEl.alimentaA;
        nextAlimentaAIds = rebuilt.nextEl.alimentaAIds;
        nextRegularDt = rebuilt.nextEl.datosTecnicos;
        downstreamChanged = true;
      }
    }

    if (
      !downstreamChanged &&
      nextParentId === (el.alimentadoPorId || null) &&
      nextAlimentadoPor === (el.alimentadoPor || '') &&
      nextUbicacion === (el.ubicacion || '') &&
      nextRegularDt === dt
    ) {
      return el;
    }

    return {
      ...el,
      alimentadoPorId: nextParentId,
      alimentadoPor: nextAlimentadoPor,
      alimentaA: nextAlimentaA,
      alimentaAIds: nextAlimentaAIds,
      ubicacion: nextUbicacion,
      datosTecnicos: nextRegularDt
    };
  });
};

export const getNextElementId = (tipoElemento, proyectoIdOrScope, stateParam) => {
  const tipo = tipoElemento || 'TABLERO';
  const prefix = PREFIX_MAP[tipo] || 'elm';

  let state = {};
  let targetProyectoId = null;
  let targetCompanyId = null;

  if (typeof proyectoIdOrScope === 'string') {
    targetProyectoId = proyectoIdOrScope;
    state = stateParam || useStore.getState?.() || {};
  } else if (proyectoIdOrScope && typeof proyectoIdOrScope === 'object') {
    if (proyectoIdOrScope.companies || proyectoIdOrScope.elementosLocales) {
      state = proyectoIdOrScope;
    } else {
      targetProyectoId = proyectoIdOrScope.proyectoId;
      targetCompanyId = proyectoIdOrScope.companyId;
      state = stateParam || useStore.getState?.() || {};
    }
  } else {
    state = stateParam || useStore.getState?.() || {};
  }

  let maxNum = 0;
  let countInScope = 0;

  const validPrefixes = new Set([
    prefix.toLowerCase(),
    ...(Object.entries(LEGACY_PREFIX_MAP).filter(([_, v]) => v === prefix).map(([k]) => k.toLowerCase()))
  ]);

  const checkItem = (item) => {
    if (!item) return;
    const itemTipo = item.tipoElemento || (item.tipoPlantilla === 'INSPECCION_SUBESTACION' ? 'SUBESTACION' : (item.tipoPlantilla === 'PUNTO_MEDICION' ? 'PUNTO_MEDICION' : (item.tipoPlantilla === 'CCM' ? 'CCM' : null)));
    
    const isSameType = itemTipo && (itemTipo === tipo || PREFIX_MAP[itemTipo] === prefix);
    const candidates = [item.codigo, item.id, item.datosTecnicos?.codigo].filter(Boolean);
    let matchedPrefix = false;

    for (const code of candidates) {
      if (typeof code === 'string') {
        const parts = code.toLowerCase().split('-');
        if (parts.length >= 2) {
          const num = parseInt(parts[parts.length - 1], 10);
          const pfx = parts.slice(0, -1).join('-');
          if (validPrefixes.has(pfx) && !isNaN(num)) {
            matchedPrefix = true;
            if (num > maxNum) maxNum = num;
          }
        }
      }
    }

    if (isSameType || matchedPrefix) {
      countInScope++;
    }
  };

  if (targetProyectoId && state.companies) {
    for (const company of state.companies) {
      const proj = (company.proyectos || []).find((p) => p.id === targetProyectoId);
      if (proj) {
        (proj.elementosUnifilares || proj.tableros || []).forEach(checkItem);
        (proj.inspeccionesSubestacion || proj.subestaciones || []).forEach(checkItem);
        (proj.puntosMedicion || []).forEach(checkItem);
        (proj.ccmList || []).forEach(checkItem);
        break;
      }
    }
  } else if (targetCompanyId && state.companies) {
    const comp = state.companies.find((c) => c.id === targetCompanyId);
    if (comp) {
      (comp.elementosUnifilares || []).forEach(checkItem);
      (comp.proyectos || []).forEach(p => {
        (p.elementosUnifilares || p.tableros || []).forEach(checkItem);
        (p.inspeccionesSubestacion || p.subestaciones || []).forEach(checkItem);
        (p.puntosMedicion || []).forEach(checkItem);
        (p.ccmList || []).forEach(checkItem);
      });
    }
  } else {
    (state.companies || []).forEach(c => {
      (c.elementosUnifilares || []).forEach(checkItem);
      (c.proyectos || []).forEach(p => {
        (p.elementosUnifilares || p.tableros || []).forEach(checkItem);
        (p.inspeccionesSubestacion || p.subestaciones || []).forEach(checkItem);
        (p.puntosMedicion || []).forEach(checkItem);
        (p.ccmList || []).forEach(checkItem);
      });
    });

    (state.elementosLocales || []).forEach(checkItem);
    (state.subestacionesLocales || []).forEach(checkItem);
    (state.puntosMedicionLocales || []).forEach(checkItem);
    (state.ccmLocales || []).forEach(checkItem);
  }

  const nextNum = Math.max(maxNum, countInScope) + 1;
  return `${(prefix || 'TAB').toUpperCase()}-${nextNum}`;
};

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

const initialCompanies = [];

const getInitialUser = () => {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem('user') : null;
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
};

const getInitialToken = () => {
  try {
    return typeof localStorage !== 'undefined' ? (localStorage.getItem('token') || null) : null;
  } catch (e) {
    return null;
  }
};

const elementoDebounceTimers = new Map();

const findElementoInStore = (state, elementoId, proyectoId = null) => {
  if (!state || !elementoId) return null;
  for (const c of (state.companies || [])) {
    if (proyectoId) {
      const proj = (c.proyectos || []).find((p) => p.id === proyectoId);
      if (proj) {
        const found = (proj.elementosUnifilares || proj.tableros || []).find((e) => e.id === elementoId);
        if (found) {
          return {
            ...found,
            empresaId: found.empresaId || found.companyId || c.id,
            proyectoId: found.proyectoId || proj.id
          };
        }
      }
    }
    for (const p of (c.proyectos || [])) {
      const found = (p.elementosUnifilares || p.tableros || []).find((e) => e.id === elementoId);
      if (found) {
        return {
          ...found,
          empresaId: found.empresaId || found.companyId || c.id,
          proyectoId: found.proyectoId || p.id
        };
      }
    }
    const compEl = (c.elementosUnifilares || []).find((e) => e.id === elementoId);
    if (compEl) {
      return {
        ...compEl,
        empresaId: compEl.empresaId || compEl.companyId || c.id
      };
    }
  }
  const localEl = (state.elementosLocales || []).find((e) => e.id === elementoId);
  return localEl || null;
};

const mergePayloadDeep = (existingPayload = {}, incomingPayload = {}) => {
  const merged = { ...(existingPayload || {}), ...(incomingPayload || {}) };
  if (existingPayload?.datosTecnicos || incomingPayload?.datosTecnicos) {
    merged.datosTecnicos = {
      ...(existingPayload?.datosTecnicos || {}),
      ...(incomingPayload?.datosTecnicos || {})
    };
  }
  return merged;
};

const collectProjectElementsInStore = (state, proyectoId = null, companyId = null) => {
  const byId = new Map();
  const kindById = new Map();
  const list = [];

  const pushItem = (item, queueTipo, fallbackTipo, compId, projId) => {
    if (!item || !item.id) return;
    const idStr = String(item.id);
    if (byId.has(idStr)) return;
    const enriched = {
      ...item,
      tipoElemento: item.tipoElemento || item.tipo || fallbackTipo,
      empresaId: item.empresaId || item.companyId || compId || null,
      proyectoId: item.proyectoId || projId || null
    };
    byId.set(idStr, enriched);
    kindById.set(idStr, queueTipo);
    list.push(enriched);
  };

  for (const c of (state?.companies || [])) {
    if (proyectoId) {
      const p = (c.proyectos || []).find((pr) => pr.id === proyectoId);
      if (p) {
        (p.elementosUnifilares || p.tableros || []).forEach((el) => pushItem(el, 'ELEMENTO_UNIFILAR', el?.tipoElemento || 'TABLERO', c.id, p.id));
        (p.tableros || []).forEach((t) => pushItem(t, 'ELEMENTO_UNIFILAR', 'TABLERO', c.id, p.id));
        (p.puntosMedicion || []).forEach((pm) => pushItem(pm, 'PUNTO_MEDICION', 'PUNTO_MEDICION', c.id, p.id));
        (p.ccmList || p.ccms || []).forEach((ccm) => pushItem(ccm, 'CCM', 'CCM', c.id, p.id));
        (p.inspeccionesSubestacion || p.subestaciones || []).forEach((s) => pushItem(s, 'SUBESTACION', s?.tipoElemento || 'SUBESTACION', c.id, p.id));
        break;
      }
    } else if (!companyId || c.id === companyId) {
      (c.elementosUnifilares || []).forEach((el) => pushItem(el, 'ELEMENTO_UNIFILAR', el?.tipoElemento || 'TABLERO', c.id, el?.proyectoId || null));
    }
  }

  const matchesScope = (item) => {
    if (!item) return false;
    if (proyectoId) return String(item.proyectoId || '') === String(proyectoId);
    if (companyId) return String(item.empresaId || item.companyId || '') === String(companyId);
    return true;
  };

  (state?.elementosLocales || []).filter(matchesScope).forEach((el) => pushItem(el, 'ELEMENTO_UNIFILAR', el?.tipoElemento || 'TABLERO', el?.empresaId || el?.companyId, el?.proyectoId));
  (state?.puntosMedicionLocales || []).filter(matchesScope).forEach((pm) => pushItem(pm, 'PUNTO_MEDICION', 'PUNTO_MEDICION', pm?.empresaId || pm?.companyId, pm?.proyectoId));
  (state?.ccmLocales || []).filter(matchesScope).forEach((ccm) => pushItem(ccm, 'CCM', 'CCM', ccm?.empresaId || ccm?.companyId, ccm?.proyectoId));
  (state?.subestacionesLocales || []).filter(matchesScope).forEach((s) => pushItem(s, 'SUBESTACION', s?.tipoElemento || 'SUBESTACION', s?.empresaId || s?.companyId, s?.proyectoId));

  return { list, byId, kindById };
};

const upsertSyncQueueEntries = (currentQueue = [], entries = []) => {
  const nextQueue = [...(Array.isArray(currentQueue) ? currentQueue : [])];
  entries.forEach((entry) => {
    if (!entry || !entry.id || !entry.payload) return;
    const idx = nextQueue.findIndex(
      (q) => (q?.id === entry.id || q?.payload?.id === entry.id) &&
             (q?.tipo === entry.tipo || (entry.tipo === 'ELEMENTO_UNIFILAR' && q?.tipo === 'TABLERO'))
    );
    if (idx >= 0) {
      nextQueue[idx] = {
        ...nextQueue[idx],
        ...entry,
        payload: mergePayloadDeep(nextQueue[idx]?.payload, entry.payload)
      };
    } else {
      nextQueue.push(entry);
    }
  });
  return nextQueue;
};

const applyHierarchyMapperAcrossState = (state, proyectoId, parentCompanyId, mapFn) => {
  const matchesProject = (p) => (proyectoId ? p.id === proyectoId : true);

  const updatedCompanies = (state.companies || []).map((c) => {
    if (parentCompanyId && proyectoId && c.id !== parentCompanyId) return c;
    return {
      ...c,
      ...(!proyectoId && Array.isArray(c.elementosUnifilares)
        ? { elementosUnifilares: c.elementosUnifilares.map((item) => mapFn(item, 'ELEMENTO_UNIFILAR', c.id, item?.proyectoId || null)) }
        : {}),
      proyectos: (c.proyectos || []).map((p) => {
        if (!matchesProject(p)) return p;
        const baseElements = p.elementosUnifilares || p.tableros || [];
        return {
          ...p,
          elementosUnifilares: baseElements.map((item) => mapFn(item, 'ELEMENTO_UNIFILAR', c.id, p.id)),
          ...(p.tableros ? { tableros: p.tableros.map((item) => mapFn(item, 'ELEMENTO_UNIFILAR', c.id, p.id)) } : {}),
          ...(p.puntosMedicion ? { puntosMedicion: p.puntosMedicion.map((item) => mapFn(item, 'PUNTO_MEDICION', c.id, p.id)) } : {}),
          ...(p.ccmList ? { ccmList: p.ccmList.map((item) => mapFn(item, 'CCM', c.id, p.id)) } : {}),
          ...(p.inspeccionesSubestacion ? { inspeccionesSubestacion: p.inspeccionesSubestacion.map((item) => mapFn(item, 'SUBESTACION', c.id, p.id)) } : {}),
          ...(p.subestaciones ? { subestaciones: p.subestaciones.map((item) => mapFn(item, 'SUBESTACION', c.id, p.id)) } : {})
        };
      })
    };
  });

  const mapLocalIfScope = (arr, qTipo) =>
    (arr || []).map((item) => {
      if (proyectoId && item?.proyectoId && String(item.proyectoId) !== String(proyectoId)) return item;
      return mapFn(item, qTipo, item?.empresaId || item?.companyId || parentCompanyId, item?.proyectoId || proyectoId);
    });

  return {
    updatedCompanies,
    updatedElementosLocales: mapLocalIfScope(state.elementosLocales, 'ELEMENTO_UNIFILAR'),
    updatedPuntosLocales: mapLocalIfScope(state.puntosMedicionLocales, 'PUNTO_MEDICION'),
    updatedCcmLocales: mapLocalIfScope(state.ccmLocales, 'CCM'),
    updatedSubestacionesLocales: mapLocalIfScope(state.subestacionesLocales, 'SUBESTACION')
  };
};

const normalizeTransferUpdatePayload = (existingEl, cleanUpdatedData, allElements, elementoId) => {
  const prevDt = parseDatosTecnicosSafe(existingEl?.datosTecnicos);
  const hasIncomingDt = cleanUpdatedData.datosTecnicos !== undefined && cleanUpdatedData.datosTecnicos !== null;
  const incomingDt = hasIncomingDt ? parseDatosTecnicosSafe(cleanUpdatedData.datosTecnicos) : {};
  const mergedDt = { ...prevDt, ...incomingDt };

  const prevNormId = sanitizeParentId(prevDt.fuenteNormalId, elementoId);
  const prevEmergId = sanitizeParentId(prevDt.fuenteEmergenciaId, elementoId);
  const prevNormName = !isPlaceholderHierarchyValue(prevDt.fuenteNormalNombre) ? String(prevDt.fuenteNormalNombre).trim().toUpperCase() : '';
  const prevEmergName = !isPlaceholderHierarchyValue(prevDt.fuenteEmergenciaNombre) ? String(prevDt.fuenteEmergenciaNombre).trim().toUpperCase() : '';
  const prevJoined = [prevNormName, prevEmergName].filter(Boolean).join(' / ');

  const slotsExplicitlyEdited = hasIncomingDt && (
    (incomingDt.fuenteNormalId ?? null) !== (prevDt.fuenteNormalId ?? null) ||
    String(incomingDt.fuenteNormalNombre || '').trim().toUpperCase() !== prevNormName ||
    (incomingDt.fuenteEmergenciaId ?? null) !== (prevDt.fuenteEmergenciaId ?? null) ||
    String(incomingDt.fuenteEmergenciaNombre || '').trim().toUpperCase() !== prevEmergName
  );

  let normId = sanitizeParentId(mergedDt.fuenteNormalId, elementoId);
  let normName = !isPlaceholderHierarchyValue(mergedDt.fuenteNormalNombre)
    ? cleanElementName(String(mergedDt.fuenteNormalNombre)).toUpperCase().trim()
    : '';
  let emergId = sanitizeParentId(mergedDt.fuenteEmergenciaId, elementoId);
  let emergName = !isPlaceholderHierarchyValue(mergedDt.fuenteEmergenciaNombre)
    ? cleanElementName(String(mergedDt.fuenteEmergenciaNombre)).toUpperCase().trim()
    : '';

  if (normName === 'CORPOELEC') {
    normId = null;
  } else if (!normId && normName) {
    const m = findElementMatchInList(normName, allElements, elementoId);
    if (m) {
      normId = String(m.id);
      normName = getCleanElementLabel(m);
    }
  } else if (normId) {
    const m = allElements.find((x) => String(x.id) === String(normId));
    if (m) normName = getCleanElementLabel(m);
  }

  if (!emergId && emergName) {
    const m = findElementMatchInList(emergName, allElements, elementoId);
    if (m) {
      emergId = String(m.id);
      emergName = getCleanElementLabel(m);
    }
  } else if (emergId) {
    const m = allElements.find((x) => String(x.id) === String(emergId));
    if (m) emergName = getCleanElementLabel(m);
  }

  const topParentChanged =
    ('alimentadoPor' in cleanUpdatedData || 'alimentadoPorId' in cleanUpdatedData) && !slotsExplicitlyEdited;

  if (topParentChanged) {
    const topText = 'alimentadoPor' in cleanUpdatedData
      ? cleanUpdatedData.alimentadoPor
      : (existingEl?.alimentadoPor || '');
    const topId = 'alimentadoPorId' in cleanUpdatedData
      ? cleanUpdatedData.alimentadoPorId
      : (existingEl?.alimentadoPorId || null);

    const clearedExplicitly =
      'alimentadoPor' in cleanUpdatedData &&
      isPlaceholderHierarchyValue(topText) &&
      !topId &&
      (!isPlaceholderHierarchyValue(existingEl?.alimentadoPor) || prevNormId || prevEmergId || prevNormName || prevEmergName);

    if (clearedExplicitly) {
      normId = null;
      normName = '';
      emergId = null;
      emergName = '';
    } else if (topId && topId !== (existingEl?.alimentadoPorId || null)) {
      const parentObj = allElements.find((x) => String(x.id) === String(topId));
      const applied = applyUpstreamLinkToElement(
        { ...existingEl, id: elementoId, tipoElemento: 'TRANSFER', datosTecnicos: mergedDt },
        topId,
        parentObj ? getCleanElementLabel(parentObj) : topText,
        parentObj ? getElementTipoUpper(parentObj) : ''
      );
      const aDt = applied.nextEl.datosTecnicos || {};
      normId = aDt.fuenteNormalId || null;
      normName = aDt.fuenteNormalNombre || '';
      emergId = aDt.fuenteEmergenciaId || null;
      emergName = aDt.fuenteEmergenciaNombre || '';
    } else if (!topId && topText && topText !== (existingEl?.alimentadoPor || '') && topText !== prevJoined) {
      if (topText === 'CORPOELEC' || !normId) {
        normId = null;
        normName = topText;
      }
    }
  }

  const nextAlimentadoPorIds = Array.from(new Set([normId, emergId].filter(Boolean)));
  const computedParentJoined = [normName, emergName].filter(Boolean).join(' / ');
  const nextPrimaryParentId = normId || emergId || sanitizeParentId(cleanUpdatedData.alimentadoPorId, elementoId) || null;
  const nextAlimentadoPor = slotsExplicitlyEdited
    ? computedParentJoined
    : (computedParentJoined || (cleanUpdatedData.alimentadoPor !== undefined ? cleanUpdatedData.alimentadoPor : (existingEl?.alimentadoPor || '')));

  mergedDt.fuenteNormalId = normId || null;
  mergedDt.fuenteNormalNombre = normName;
  mergedDt.fuenteEmergenciaId = emergId || null;
  mergedDt.fuenteEmergenciaNombre = emergName;
  mergedDt.alimentadoPorId = nextPrimaryParentId;
  mergedDt.alimentadoPorIds = nextAlimentadoPorIds;
  if (nextPrimaryParentId === null) {
    mergedDt.alimentadorId = null;
  }

  cleanUpdatedData.alimentadoPor = nextAlimentadoPor;
  cleanUpdatedData.alimentadoPorId = nextPrimaryParentId;

  const prevSalidaName = !isPlaceholderHierarchyValue(prevDt.salidaCargaNombre) ? String(prevDt.salidaCargaNombre).trim().toUpperCase() : '';
  const prevSalidaId = sanitizeParentId(prevDt.salidaCargaId, elementoId);
  const incomingSalidaName = hasIncomingDt && incomingDt.salidaCargaNombre !== undefined
    ? String(incomingDt.salidaCargaNombre || '').trim().toUpperCase()
    : prevSalidaName;
  const incomingSalidaId = hasIncomingDt && incomingDt.salidaCargaId !== undefined
    ? sanitizeParentId(incomingDt.salidaCargaId, elementoId)
    : prevSalidaId;

  const salidaChanged = hasIncomingDt && (
    incomingSalidaName !== prevSalidaName ||
    incomingSalidaId !== prevSalidaId
  );

  const incomingAlimentaIds = cleanUpdatedData.alimentaAIds !== undefined
    ? cleanUpdatedData.alimentaAIds
    : (hasIncomingDt && incomingDt.alimentaAIds !== undefined ? incomingDt.alimentaAIds : undefined);

  if (salidaChanged && cleanUpdatedData.alimentaAIds === undefined) {
    const resolvedSalidaIds = incomingSalidaId ? [incomingSalidaId] : (() => {
      const m = findElementMatchInList(incomingSalidaName, allElements, elementoId);
      return m ? [String(m.id)] : [];
    })();
    cleanUpdatedData.alimentaA = incomingSalidaName;
    cleanUpdatedData.alimentaAIds = resolvedSalidaIds;
    mergedDt.alimentaA = incomingSalidaName;
    mergedDt.alimentaAIds = resolvedSalidaIds;
    mergedDt.salidaCargaNombre = incomingSalidaName;
    mergedDt.salidaCargaId = resolvedSalidaIds[0] || null;
  } else if (incomingAlimentaIds !== undefined || cleanUpdatedData.alimentaA !== undefined) {
    const safeOutIds = Array.isArray(incomingAlimentaIds)
      ? Array.from(new Set(incomingAlimentaIds.map((x) => sanitizeParentId(x, elementoId)).filter(Boolean)))
      : (Array.isArray(prevDt.alimentaAIds) ? prevDt.alimentaAIds : []);
    const outText = cleanUpdatedData.alimentaA !== undefined
      ? cleanUpdatedData.alimentaA
      : (hasIncomingDt && incomingDt.alimentaA !== undefined ? String(incomingDt.alimentaA).trim().toUpperCase() : (existingEl?.alimentaA || ''));
    cleanUpdatedData.alimentaA = outText;
    cleanUpdatedData.alimentaAIds = safeOutIds;
    mergedDt.alimentaA = outText;
    mergedDt.alimentaAIds = safeOutIds;
    mergedDt.salidaCargaNombre = outText;
    mergedDt.salidaCargaId = safeOutIds[0] || null;
  }

  cleanUpdatedData.datosTecnicos = mergedDt;
};

const syncRelatedHierarchyFromExternalElement = (set, get, { proyectoId, targetId, prevEl, updatedEl, updatedData, queueTipo, skipNetworkSync }) => {
  if (!updatedEl || !targetId) return;
  const touchedHierarchy =
    'alimentadoPor' in updatedData ||
    'alimentadoPorId' in updatedData ||
    'alimentaA' in updatedData ||
    'alimentaAIds' in updatedData ||
    'nombre' in updatedData;

  if (!touchedHierarchy) return;

  const { list: allProjectElements, byId: allElementsMap } = collectProjectElementsInStore(get(), proyectoId);
  allElementsMap.set(String(targetId), updatedEl);

  const prevParentIds = new Set(prevEl ? extractElementParentIds(prevEl, allProjectElements) : []);
  const nextParentIds = new Set(extractElementParentIds(updatedEl, allProjectElements));
  const prevDownIds = new Set(prevEl ? extractElementDownstreamIds(prevEl, allProjectElements) : []);
  const nextDownIds = new Set(extractElementDownstreamIds(updatedEl, allProjectElements));

  const prevLabel = prevEl ? getCleanElementLabel(prevEl) : '';
  const nextLabel = getCleanElementLabel(updatedEl);
  const targetTipo = getElementTipoUpper(updatedEl) || queueTipo;
  const parentTouched = 'alimentadoPor' in updatedData || 'alimentadoPorId' in updatedData;
  const downTouched = 'alimentaA' in updatedData || 'alimentaAIds' in updatedData;
  const nameChanged = Boolean(nextLabel && prevLabel && nextLabel !== prevLabel);

  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  const { token } = get();
  const hasActiveSession = Boolean(token && token !== 'mock-offline-token');
  const modifiedMap = new Map();

  set((state) => {
    const mapFn = (item, qTipo, compId, projId) => {
      if (!item || !item.id || String(item.id) === String(targetId)) return item;
      const itemIdStr = String(item.id);
      let currentItem = item;
      let changed = false;

      if (downTouched && nextDownIds.has(itemIdStr)) {
        const res = applyUpstreamLinkToElement(currentItem, targetId, nextLabel, targetTipo);
        if (res.changed) {
          currentItem = res.nextEl;
          changed = true;
        }
      } else if (downTouched && (prevDownIds.has(itemIdStr) || (!nextDownIds.has(itemIdStr) && extractElementParentIds(currentItem, allProjectElements).includes(String(targetId))))) {
        const res = removeUpstreamLinkFromElement(currentItem, targetId, prevLabel);
        if (res.changed) {
          currentItem = res.nextEl;
          changed = true;
        }
      }

      if ((parentTouched || nameChanged) && nextParentIds.has(itemIdStr) && !nextDownIds.has(itemIdStr)) {
        const res = applyDownstreamLinkToParent(currentItem, targetId, nextLabel, allElementsMap, nameChanged ? prevLabel : '');
        if (res.changed) {
          currentItem = res.nextEl;
          changed = true;
        }
      } else if (parentTouched && prevParentIds.has(itemIdStr) && !nextParentIds.has(itemIdStr)) {
        const res = removeDownstreamLinkFromParent(currentItem, targetId, prevLabel, allElementsMap);
        if (res.changed) {
          currentItem = res.nextEl;
          changed = true;
        }
      }

      if (nameChanged) {
        const renRes = applyRenamePropagationToPeer(currentItem, targetId, prevLabel, nextLabel, targetTipo, allElementsMap, allProjectElements);
        if (renRes.changed) {
          currentItem = renRes.nextEl;
          changed = true;
        }
      }

      if (changed) {
        const enrichedModified = {
          ...currentItem,
          empresaId: currentItem.empresaId || currentItem.companyId || compId || null,
          proyectoId: currentItem.proyectoId || projId || proyectoId || null
        };
        modifiedMap.set(itemIdStr, { item: enrichedModified, tipo: qTipo });
        return currentItem;
      }
      return item;
    };

    const mapped = applyHierarchyMapperAcrossState(state, proyectoId, null, mapFn);
    if (modifiedMap.size === 0) return {};

    let nextQueue = Array.isArray(state.syncQueue) ? state.syncQueue : [];
    if (!skipNetworkSync && (!isOnline || !hasActiveSession)) {
      nextQueue = upsertSyncQueueEntries(
        nextQueue,
        Array.from(modifiedMap.entries()).map(([mid, entry]) => ({
          id: mid,
          tipo: entry.tipo,
          companyId: entry.item.empresaId || entry.item.companyId || (state.companies[0]?.id || null),
          payload: entry.item
        }))
      );
    }

    return {
      companies: mapped.updatedCompanies,
      elementosLocales: mapped.updatedElementosLocales,
      puntosMedicionLocales: mapped.updatedPuntosLocales,
      ccmLocales: mapped.updatedCcmLocales,
      subestacionesLocales: mapped.updatedSubestacionesLocales,
      syncQueue: nextQueue
    };
  });

  if (!skipNetworkSync && isOnline && hasActiveSession && modifiedMap.size > 0) {
    modifiedMap.forEach((entry, mid) => {
      if (entry.tipo === 'ELEMENTO_UNIFILAR') {
        scheduleDebouncedElementoSync(get, mid, proyectoId, entry.item);
      }
    });
  }
};

const scheduleDebouncedElementoSync = (get, elementoId, proyectoId, fallbackEl) => {
  const existing = elementoDebounceTimers.get(elementoId);
  if (existing && existing.timerId) {
    clearTimeout(existing.timerId);
  }

  return new Promise((resolve) => {
    const prevResolvers = existing?.resolvers || [];
    const resolvers = [...prevResolvers, resolve];

    const timerId = setTimeout(async () => {
      elementoDebounceTimers.delete(elementoId);
      const latestEl = findElementoInStore(get(), elementoId, proyectoId) || fallbackEl;
      if (!latestEl) {
        resolvers.forEach((r) => r({ ok: false, error: 'Elemento no encontrado' }));
        return;
      }
      try {
        const res = await get().enviarElementoDirectoServidor?.(
          latestEl.empresaId || latestEl.companyId,
          latestEl
        );
        resolvers.forEach((r) => r(res || { ok: true }));
      } catch (err) {
        resolvers.forEach((r) => r({ ok: false, error: err?.message || 'Error en sincronización debounced' }));
      }
    }, 500);

    elementoDebounceTimers.set(elementoId, { timerId, resolvers });
  });
};

export const useStore = create(
  persist(
    (set, get) => ({
      user: getInitialUser(),
      token: getInitialToken(),
      usersList: [
        { id: 'u-1', username: 'admin1', role: 'ADMIN' },
        { id: 'u-2', username: 'admin2', role: 'ADMIN' }
      ],
      companies: initialCompanies,
      proyectosLocales: [],
      elementosLocales: [],
      subestacionesLocales: [],
      puntosMedicionLocales: [],
      ccmLocales: [],
      syncQueue: [],
      deletedCompanyIds: [],
      isSyncing: false,
      syncProgress: null,
      socket: null,
      toast: { show: false, message: '', type: 'success', action: null },
      conflictosCircuitos: [],
      isPanelConflictosOpen: false,

      setIsSyncing: (isSyncing) => set({ isSyncing }),
      setSyncProgress: (syncProgress) => set({ syncProgress }),
      setSyncQueue: (syncQueue) => set({ syncQueue: Array.isArray(syncQueue) ? syncQueue : [] }),
      showToast: (message, type = 'success', action = null) => set({ toast: { show: true, message, type, action } }),
      hideToast: () => set((state) => ({ toast: { ...state.toast, show: false } })),
      setSocket: (socket) => set({ socket }),
      setPanelConflictosOpen: (isOpen) => set({ isPanelConflictosOpen: isOpen }),

      registrarConflictoCircuito: (conflicto) => set((state) => {
        const nuevoConflicto = {
          id: conflicto.id || `conf_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          timestamp: new Date().toISOString(),
          resuelto: false,
          ...conflicto
        };
        // Evitar duplicados idénticos en cola
        const filtered = (state.conflictosCircuitos || []).filter(c => 
          !(c.tableroId === nuevoConflicto.tableroId && JSON.stringify(c.polos) === JSON.stringify(nuevoConflicto.polos))
        );
        return {
          conflictosCircuitos: [nuevoConflicto, ...filtered]
        };
      }),

      resolverConflictoCircuito: (id) => set((state) => ({
        conflictosCircuitos: (state.conflictosCircuitos || []).filter(c => c.id !== id)
      })),

      limpiarConflictosCircuitos: () => set({ conflictosCircuitos: [] }),

      handleAuthError: (status, errorMsg = '') => {
        const lowerMsg = typeof errorMsg === 'string' ? errorMsg.toLowerCase() : '';
        const isTokenError =
          lowerMsg.includes('expirado') ||
          lowerMsg.includes('inválido') ||
          lowerMsg.includes('token') ||
          lowerMsg.includes('no autenticado');

        if (status === 401 || isTokenError) {
          try {
            if (typeof window !== 'undefined') {
              localStorage.removeItem('token');
              localStorage.removeItem('user');
              localStorage.removeItem('usuario');
              sessionStorage.clear();
            }
          } catch (e) {}

          set({ user: null, token: null });

          if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
            window.location.replace('/login');
          }
        }
      },

      fetchUsersList: async () => {
        const { user } = get();
        if (!user || user.role !== 'ADMIN') return;
        try {
          const activeToken = get().token || (typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null);
          if (!activeToken || activeToken === 'mock-offline-token') return;
          const res = await fetch(`${API_BASE_URL}/api/users`, {
            headers: {
              'Authorization': `Bearer ${activeToken}`
            }
          });
          if (res.status === 403 || !res.ok) return;
          const data = await res.json().catch(() => ({}));
          if (data?.ok && Array.isArray(data.data)) {
            set({ usersList: data.data });
          }
        } catch (err) {
          if (err?.response?.status !== 403 && err?.status !== 403) {
            console.warn('No se pudo cargar la lista de usuarios:', err.message);
          }
        }
      },

      fetchMessagesList: async (userId) => {
        try {
          const activeToken = get().token || (typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null);
          if (!activeToken || activeToken === 'mock-offline-token') return;
          const res = await fetch(`${API_BASE_URL}/api/messages/${userId}`, {
            headers: {
              'Authorization': `Bearer ${activeToken}`
            }
          });
          const data = await res.json().catch(() => ({}));
          if (res.status === 401 || res.status === 403) {
            get().handleAuthError(res.status, data?.error);
            return;
          }
          if (data.ok) {
            set({ messages: data.data });
          }
        } catch (e) {
          console.error('Error al cargar lista de mensajes:', e);
        }
      },

      cargarDatosServidor: async () => {
        return get().pullInitialData();
      },

      syncPull: async () => {
        return get().pullInitialData();
      },

      pullInitialData: async () => {
        const { token, user, syncQueue } = get();
        if (!token || !navigator.onLine || token === 'mock-offline-token') {
          return { success: true, cached: true, count: (get().companies || []).length };
        }

        // PRIORIDAD LOCAL-FIRST:
        // Si existen mutaciones locales pendientes en la cola, NO descargar del servidor
        // para evitar sobrescribir información recién creada o modificada en campo.
        if (syncQueue && syncQueue.length > 0) {
          console.log('[LOCAL-FIRST] pullInitialData omitido: existen', syncQueue.length, 'cambios locales pendientes en cola.');
          return { success: true, deferred: true };
        }

        try {
          // 1. Intentar descargar datos vía /api/sync/pull
          const res = await fetch(`${API_BASE_URL}/api/sync/pull`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });

          if (res.status === 401) {
            const errData = await res.json().catch(() => ({}));
            get().handleAuthError(res.status, errData?.error || 'Token inválido o expirado');
            return { success: false, error: 'Token expirado' };
          }

          if (res.status === 403) {
            const errData = await res.json().catch(() => ({}));
            const lowerMsg = String(errData?.error || '').toLowerCase();
            if (lowerMsg.includes('token') || lowerMsg.includes('expirado') || lowerMsg.includes('inválido')) {
              get().handleAuthError(res.status, errData?.error);
              return { success: false, error: 'Token expirado' };
            }
            // Si es un 403 de permisos en un backend antiguo, mantener la caché local sin romper el flujo
            return { success: true, cached: true, count: (get().companies || []).length };
          }

          if (res.ok) {
            const data = await res.json().catch(() => ({}));
            if (data?.ok && Array.isArray(data.data)) {
              // El servidor es la fuente de verdad: purgar empresas locales que ya no existen en PostgreSQL,
              // NUNCA purgando empresas con ID temporal (company-...) o con operaciones pendientes en syncQueue
              const serverIds = new Set(data.data.map((c) => c.id));
              const queueNow = Array.isArray(get().syncQueue) ? get().syncQueue : [];
              const pendingCompanyIds = new Set(
                queueNow
                  .map((q) => q?.companyId || q?.payload?.empresaId || q?.payload?.companyId || (q?.tipo === 'EMPRESA' || q?.tipo === 'COMPANY' ? q?.id : null))
                  .filter(Boolean)
              );
              if (queueNow.length === 0) {
                const stale = (get().companies || []).filter((c) => {
                  if (!c || !c.id) return false;
                  if (serverIds.has(c.id)) return false;
                  if (pendingCompanyIds.has(c.id)) return false;
                  if (String(c.id).startsWith('company-') || String(c.id).startsWith('empresa-') || String(c.id).startsWith('temp_')) return false;
                  return true;
                });
                stale.forEach((c) => get().purgeCompanyLocal(c.id));
              }
              if (data.data.length === 0) {
                if (queueNow.length === 0) {
                  set({
                    companies: [],
                    proyectosLocales: [],
                    elementosLocales: [],
                    tablerosLocales: [],
                    subestacionesLocales: [],
                    puntosMedicionLocales: [],
                    ccmLocales: []
                  });
                }
                return { success: true, count: 0 };
              }
              if (data.data.length > 0) {
                get().importCompanies(data.data);
                return { success: true, count: data.data.length };
              }
            }
          }

          // 2. Fallback: Si es ADMIN y pull no devolvió empresas, intentar export de base de datos
          if (user && user.role === 'ADMIN') {
            try {
              const resBackup = await fetch(`${API_BASE_URL}/api/backup/export`, {
                headers: {
                  'Authorization': `Bearer ${token}`
                }
              });
              if (resBackup.status === 401) {
                const errBackup = await resBackup.json().catch(() => ({}));
                get().handleAuthError(resBackup.status, errBackup?.error || 'Token expirado');
                return { success: false, error: 'Token expirado' };
              }
              if (resBackup.ok) {
                const dataBackup = await resBackup.json().catch(() => ({}));
                if (dataBackup?.ok && Array.isArray(dataBackup.data) && dataBackup.data.length > 0) {
                  get().importCompanies(dataBackup.data);
                  return { success: true, count: dataBackup.data.length };
                }
              }
            } catch {
              // Ignorar fallo en fallback y mantener datos locales
            }
          }
          return { success: true, count: (get().companies || []).length };
        } catch {
          // Usar datos locales en caché silenciosamente sin interrumpir el renderizado
          return { success: true, cached: true, count: (get().companies || []).length };
        }
      },

      login: async (username, password) => {
        const cleanUsername = typeof username === 'string' ? username.trim() : '';
        let networkFailed = false;

        if (typeof navigator === 'undefined' || navigator.onLine) {
          try {
            const res = await fetch(`${API_BASE_URL}/api/login`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ username: cleanUsername, password })
            });

            const data = await res.json().catch(() => ({}));

            if (res.ok && data.ok) {
              // Cachear usuario para soporte offline posterior
              const currentUsers = get().usersList || [];
              const userIndex = currentUsers.findIndex(
                u => (u.username || '').toLowerCase() === data.user.username.toLowerCase()
              );
              let updatedUsers = [...currentUsers];
              const userEntry = {
                id: data.user.id,
                username: data.user.username,
                role: data.user.role,
                companyId: data.user.companyId,
                cachedAt: new Date().toISOString()
              };

              if (userIndex >= 0) {
                updatedUsers[userIndex] = { ...updatedUsers[userIndex], ...userEntry };
              } else {
                updatedUsers.push(userEntry);
              }

              try {
                if (typeof localStorage !== 'undefined') {
                  localStorage.setItem('user', JSON.stringify(data.user));
                  localStorage.setItem('token', data.token);
                }
              } catch (e) {}

              set({ 
                user: data.user, 
                token: data.token,
                usersList: updatedUsers
              });

              get().fetchMessagesList(data.user.id);
              if (data.user?.role === 'ADMIN') {
                get().fetchUsersList();
              }
              get().pullInitialData();
              return { success: true, user: data.user };
            }

            // Si el servidor respondió con error de credenciales explícito (401, 400, 403)
            if (res.status === 401 || res.status === 400 || res.status === 403) {
              return { 
                success: false, 
                error: data.error || 'Usuario o contraseña incorrectos.' 
              };
            }

            if (res.status >= 500) {
              return {
                success: false,
                error: data.error || `Error en el servidor (${res.status}). Intente nuevamente.`
              };
            }
          } catch (e) {
            console.warn('⚠️ Error de conexión con el servidor central al iniciar sesión:', e);
            networkFailed = true;
          }
        } else {
          networkFailed = true;
        }

        // Fallback offline: solo si la red falló o el dispositivo está desconectado
        if (networkFailed) {
          const list = get().usersList || [];
          const inputKey = cleanUsername.toLowerCase();
          const found = list.find((u) => {
            const rawUserKey = u.username || u.email || '';
            const userKey = (typeof rawUserKey === 'string' ? rawUserKey.trim() : '').toLowerCase();
            return userKey === inputKey ||
                   (userKey === 'admin1' && inputKey === 'admin1@selectric.com') ||
                   (userKey === 'admin1@selectric.com' && inputKey === 'admin1');
          });

          if (found) {
            set({ 
              user: { id: found.id, username: found.username, role: found.role, companyId: found.companyId }, 
              token: 'mock-offline-token' 
            });
            get().pullInitialData();
            return { success: true, user: found, isOffline: true };
          }

          return { 
            success: false, 
            error: 'Sin conexión al servidor central. Inicie sesión con internet por primera vez para habilitar el modo offline para este usuario.',
            isNetworkError: true 
          };
        }

        return { success: false, error: 'Usuario o contraseña incorrectos.' };
      },

      logout: () => {
        try {
          if (typeof window !== 'undefined') {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            localStorage.removeItem('usuario');
            sessionStorage.clear();
          }
        } catch (e) {}
        set({ user: null, token: null });
        if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
          window.location.replace('/login');
        }
      },

      addUser: async (userObj) => {
        const currentUser = get().user;
        if (!currentUser || currentUser.role !== 'ADMIN') {
          return { success: false, error: 'Acción permitida únicamente para administradores.' };
        }

        const cleanUsername = typeof userObj?.username === 'string' ? userObj.username.trim() : '';
        const rawPassword = typeof userObj?.password === 'string' ? userObj.password : '';
        const trimmedPassword = typeof userObj?.password === 'string' ? userObj.password.trim() : '';

        if (!cleanUsername || !trimmedPassword) {
          return { success: false, error: 'Usuario y contraseña son requeridos.' };
        }

        if (rawPassword.length < 4) {
          return { success: false, error: 'La contraseña debe tener al menos 4 caracteres.' };
        }

        const usernameLower = cleanUsername.toLowerCase();
        const exists = (get().usersList || []).some((u) => {
          const rawKey = u.username || u.email || '';
          const uKey = typeof rawKey === 'string' ? rawKey.trim().toLowerCase() : '';
          return uKey === usernameLower;
        });
        if (exists) {
          return { success: false, error: 'Ya existe un usuario con este nombre de usuario.' };
        }

        const newUser = {
          id: `user-${Date.now()}`,
          username: cleanUsername,
          password: rawPassword,
          role: userObj.role || 'WORKER',
          companyId: userObj.role === 'CLIENT' ? userObj.companyId : null
        };

        const activeToken = get().token || (typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null);
        if (activeToken && activeToken !== 'mock-offline-token' && (typeof navigator === 'undefined' || navigator.onLine)) {
          try {
            const res = await fetch(`${API_BASE_URL}/api/users`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${activeToken}`
              },
              body: JSON.stringify(newUser)
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok || !data.ok) {
              return { success: false, error: data.error || 'Error al registrar usuario.' };
            }
            const createdUser = data.data || newUser;
            set((state) => {
              const list = state.usersList || [];
              const existsInList = list.some((u) => u.id === createdUser.id);
              return {
                usersList: existsInList
                  ? list.map((u) => (u.id === createdUser.id ? createdUser : u))
                  : [...list, createdUser]
              };
            });
            await get().fetchUsersList();
            return { success: true, user: createdUser };
          } catch (e) {
            console.error('Error sincronizando nuevo usuario:', e);
          }
        }

        set((state) => ({
          usersList: [...(state.usersList || []), newUser]
        }));

        return { success: true, user: newUser };
      },

      updateUser: async (userId, updatedData) => {
        const currentUser = get().user;
        if (!currentUser || currentUser.role !== 'ADMIN') {
          return { success: false, error: 'Acción permitida únicamente para administradores.' };
        }

        const cleanUsername = typeof updatedData?.username === 'string' ? updatedData.username.trim() : '';
        if (!cleanUsername) {
          return { success: false, error: 'El nombre de usuario es requerido.' };
        }

        const usernameLower = cleanUsername.toLowerCase();
        const existsOther = (get().usersList || []).some((u) => {
          const rawKey = u.username || u.email || '';
          const uKey = typeof rawKey === 'string' ? rawKey.trim().toLowerCase() : '';
          return u.id !== userId && uKey === usernameLower;
        });
        if (existsOther) {
          return { success: false, error: 'Ya existe otro usuario con este nombre de usuario.' };
        }

        const rawPassword = typeof updatedData?.password === 'string' ? updatedData.password : '';
        const trimmedPassword = typeof updatedData?.password === 'string' ? updatedData.password.trim() : '';

        if (trimmedPassword.length > 0 && rawPassword.length < 4) {
          return { success: false, error: 'La nueva contraseña debe tener al menos 4 caracteres.' };
        }

        const mergedData = {
          username: cleanUsername,
          role: updatedData.role,
          companyId: updatedData.role === 'CLIENT' ? updatedData.companyId : null,
          ...(trimmedPassword.length > 0 ? { password: rawPassword } : {})
        };

        const activeToken = get().token || (typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null);
        if (activeToken && activeToken !== 'mock-offline-token' && (typeof navigator === 'undefined' || navigator.onLine)) {
          try {
            const res = await fetch(`${API_BASE_URL}/api/users/${userId}`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${activeToken}`
              },
              body: JSON.stringify(mergedData)
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok || !data.ok) {
              return { success: false, error: data.error || 'Error al actualizar usuario.' };
            }
            const serverUpdatedUser = data.data || { id: userId, ...mergedData };
            set((state) => {
              const updatedList = (state.usersList || []).map((u) => {
                if (u.id === userId) {
                  return { ...u, ...serverUpdatedUser };
                }
                return u;
              });

              const currentLoggedUser = updatedList.find((u) => u.id === state.user?.id);
              if (currentLoggedUser && typeof localStorage !== 'undefined') {
                try {
                  localStorage.setItem('user', JSON.stringify(currentLoggedUser));
                } catch (e) {}
              }

              return {
                usersList: updatedList,
                user: currentLoggedUser || state.user
              };
            });
            await get().fetchUsersList();
            return { success: true, user: serverUpdatedUser };
          } catch (e) {
            console.error('Error actualizando usuario en base de datos:', e);
          }
        }

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

        return { success: true };
      },

      deleteUser: async (userId) => {
        const currentUser = get().user;
        if (!currentUser || currentUser.role !== 'ADMIN') {
          return { success: false, error: 'Acción permitida únicamente para administradores.' };
        }

        const userToDelete = (get().usersList || []).find((u) => u.id === userId);
        const targetUsername = typeof userToDelete?.username === 'string' ? userToDelete.username.trim().toLowerCase() : '';
        if (userToDelete && targetUsername === 'admin1') {
          return { success: false, error: 'El usuario administrador principal (admin1) está protegido y no se puede eliminar.' };
        }

        if (currentUser.id === userId) {
          return { success: false, error: 'No puedes eliminar tu propia cuenta de usuario activo.' };
        }

        const { token } = get();
        if (token && token !== 'mock-offline-token' && (typeof navigator === 'undefined' || navigator.onLine)) {
          try {
            const res = await fetch(`${API_BASE_URL}/api/users/${userId}`, {
              method: 'DELETE',
              headers: {
                'Authorization': `Bearer ${token}`
              }
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok || !data.ok) {
              return { success: false, error: data.error || 'Error al eliminar usuario.' };
            }
            set((state) => ({
              usersList: (state.usersList || []).filter((u) => u.id !== userId)
            }));
            await get().fetchUsersList();
            return { success: true };
          } catch (e) {
            console.error('Error eliminando usuario en base de datos:', e);
          }
        }

        set((state) => ({
          usersList: (state.usersList || []).filter((u) => u.id !== userId)
        }));

        return { success: true };
      },

      updateEmpresa: async (companyId, updatedData) => {
        let updatedCompanyObj = null;
        set((state) => ({
          companies: state.companies.map((c) => {
            if (c.id === companyId) {
              updatedCompanyObj = { ...c, ...updatedData };
              return updatedCompanyObj;
            }
            return c;
          })
        }));

        const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
        if (isOnline) {
          try {
            const { token } = get();
            const res = await fetch(`${API_BASE_URL}/api/empresas/${companyId}`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                ...(token && token !== 'mock-offline-token' ? { 'Authorization': `Bearer ${token}` } : {})
              },
              body: JSON.stringify(updatedData)
            });
            if (!res.ok && res.status >= 500 && updatedCompanyObj) {
              get().enqueueOfflineItem?.('EMPRESA', companyId, updatedCompanyObj, `HTTP ${res.status}`);
            }
          } catch (e) {
            console.error('Error al actualizar empresa en el servidor, encolando en syncQueue:', e);
            if (updatedCompanyObj) {
              get().enqueueOfflineItem?.('EMPRESA', companyId, updatedCompanyObj, e.message);
            }
          }
        } else if (updatedCompanyObj) {
          get().enqueueOfflineItem?.('EMPRESA', companyId, updatedCompanyObj);
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
        const cleanParentId = sanitizeParentId(alimentadorId, tableroId);
        const existing = findElementoInStore(get(), tableroId, proyectoId);
        let nextAlimentadoPor = existing?.alimentadoPor;
        if (cleanParentId && isPlaceholderHierarchyValue(nextAlimentadoPor)) {
          const { byId } = collectProjectElementsInStore(get(), proyectoId);
          const parentObj = byId.get(String(cleanParentId));
          if (parentObj) nextAlimentadoPor = getCleanElementLabel(parentObj);
        }
        return get().updateElementoUnifilar(proyectoId, tableroId, {
          alimentadoPorId: cleanParentId,
          ...(nextAlimentadoPor !== undefined ? { alimentadoPor: nextAlimentadoPor } : {}),
          datosTecnicos: {
            ...(existing?.datosTecnicos || {}),
            alimentadorId: cleanParentId,
            alimentadoPorId: cleanParentId
          }
        });
      },

      addCompany: async (companyData) => {
        const { token } = get();
        const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

        const buildOfflineCompany = (customId = null) => ({
          id: customId || companyData.id || `company-${Date.now()}`,
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
        });

        if (isOnline) {
          const result = await registrarEmpresaApi(companyData, token);
          if (!result.ok) {
            const isNetworkOrServerFailure =
              result.status === 'NETWORK_ERROR' ||
              result.status === 'TIMEOUT' ||
              (typeof result.status === 'number' && result.status >= 500);
            if (isNetworkOrServerFailure) {
              const fallbackCompany = buildOfflineCompany();
              set((state) => ({
                companies: [...(state.companies || []).filter((c) => c.id !== fallbackCompany.id), fallbackCompany]
              }));
              get().enqueueOfflineItem?.('EMPRESA', fallbackCompany.id, fallbackCompany, result.error);
              return { ok: true, data: fallbackCompany, queuedOffline: true };
            }
            return result;
          }

          const confirmed = {
            id: result.data?.id || companyData.id || `company-${Date.now()}`,
            nombre: result.data?.nombre || companyData.nombre,
            rif: result.data?.rif || companyData.rif,
            direccionFiscal: result.data?.direccionFiscal || companyData.direccionFiscal,
            direccion: result.data?.direccion || companyData.direccion || companyData.direccionFiscal || '',
            gerente1Nombre: result.data?.gerente1Nombre ?? (companyData.gerente1Nombre || null),
            gerente1Telefono: result.data?.gerente1Telefono ?? (companyData.gerente1Telefono || null),
            gerente1Email: result.data?.gerente1Email ?? (companyData.gerente1Email || null),
            gerente2Nombre: result.data?.gerente2Nombre ?? (companyData.gerente2Nombre || null),
            gerente2Telefono: result.data?.gerente2Telefono ?? (companyData.gerente2Telefono || null),
            gerente2Email: result.data?.gerente2Email ?? (companyData.gerente2Email || null),
            proyectos: result.data?.proyectos || []
          };

          set((state) => {
            const filtered = (state.companies || []).filter((c) => c.id !== confirmed.id);
            return {
              companies: [...filtered, confirmed]
            };
          });

          return { ok: true, data: confirmed };
        } else {
          const newCompany = buildOfflineCompany();

          set((state) => ({
            companies: [...(state.companies || []).filter((c) => c.id !== newCompany.id), newCompany],
            syncQueue: [
              ...(Array.isArray(state.syncQueue) ? state.syncQueue.filter((q) => q?.id !== newCompany.id) : []),
              {
                id: newCompany.id,
                tipo: 'EMPRESA',
                companyId: newCompany.id,
                payload: newCompany
              }
            ]
          }));

          return { ok: true, data: newCompany };
        }
      },

      deleteCompany: async (companyId, adminPassword) => {
        const currentUser = get().user;
        if (!currentUser || currentUser.role !== 'ADMIN') {
          return { ok: false, error: 'Acción permitida únicamente para administradores.' };
        }
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
          return { ok: false, error: 'Se requiere conexión al servidor para eliminar una empresa de forma permanente.' };
        }
        const activeToken = get().token || (typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null);
        if (!activeToken || activeToken === 'mock-offline-token') {
          return { ok: false, error: 'Se requiere una sesión activa con el servidor para eliminar una empresa.' };
        }

        let data = {};
        try {
          const res = await fetch(`${API_BASE_URL}/api/empresas/${companyId}`, {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${activeToken}`
            },
            body: JSON.stringify({ adminPassword })
          });
          data = await res.json().catch(() => ({}));
          // 404 = ya no existe en el servidor: purgar igualmente la copia local
          if (!(res.ok && data.ok) && res.status !== 404) {
            return { ok: false, error: data.error || `Error al eliminar la empresa (${res.status}).` };
          }
        } catch (e) {
          console.error('Error al eliminar empresa en el servidor:', e);
          return { ok: false, error: 'No se pudo contactar con el servidor para eliminar la empresa.' };
        }

        get().purgeCompanyLocal(companyId);
        return { ok: true };
      },

      purgeCompanyLocal: (companyId) => {
        set((state) => {
          const belongsToCompany = (item) =>
            item && (
              item.id === companyId ||
              item.companyId === companyId ||
              item.empresaId === companyId ||
              item.payload?.empresaId === companyId ||
              item.payload?.companyId === companyId ||
              item.payload?.id === companyId
            );
          const removedProjectIds = new Set(
            ((state.companies || []).find((c) => c.id === companyId)?.proyectos || []).map((p) => p.id)
          );
          const belongsToProject = (item) =>
            item && (removedProjectIds.has(item.proyectoId) || removedProjectIds.has(item.payload?.proyectoId) || removedProjectIds.has(item.id));
          const tombstones = Array.isArray(state.deletedCompanyIds) ? state.deletedCompanyIds : [];
          return {
            companies: (state.companies || []).filter((c) => c.id !== companyId),
            proyectosLocales: (state.proyectosLocales || []).filter((p) => !belongsToCompany(p)),
            elementosLocales: (state.elementosLocales || []).filter((e) => !belongsToCompany(e) && !belongsToProject(e)),
            subestacionesLocales: (state.subestacionesLocales || []).filter((s) => !belongsToCompany(s) && !belongsToProject(s)),
            puntosMedicionLocales: (state.puntosMedicionLocales || []).filter((p) => !belongsToCompany(p) && !belongsToProject(p)),
            ccmLocales: (state.ccmLocales || []).filter((c) => !belongsToCompany(c) && !belongsToProject(c)),
            syncQueue: (Array.isArray(state.syncQueue) ? state.syncQueue : []).filter(
              (item) => !belongsToCompany(item) && !belongsToProject(item)
            ),
            deletedCompanyIds: tombstones.includes(companyId) ? tombstones : [...tombstones, companyId]
          };
        });
      },

      updateProyecto: async (companyId, proyectoId, updatedData) => {
        const { companies } = get();
        const company = companies.find((c) => c.id === companyId);
        const dir = updatedData.direccion !== undefined ? updatedData.direccion : (updatedData.ubicacion !== undefined ? updatedData.ubicacion : '');
        const respNom = updatedData.responsableNombre !== undefined ? updatedData.responsableNombre : (typeof updatedData.responsable === 'object' ? updatedData.responsable?.nombre : updatedData.responsable) || '';
        const respTel = updatedData.responsableTelefono !== undefined ? updatedData.responsableTelefono : (typeof updatedData.responsable === 'object' ? updatedData.responsable?.telefono : '') || '';
        const respMail = updatedData.responsableEmail !== undefined ? updatedData.responsableEmail : (typeof updatedData.responsable === 'object' ? updatedData.responsable?.email : '') || '';

        const normalizedData = {
          ...updatedData,
          direccion: dir || (company?.direccion || company?.ubicacion || ''),
          ubicacion: dir || (company?.direccion || company?.ubicacion || ''),
          responsableNombre: respNom,
          responsableTelefono: respTel,
          responsableEmail: respMail,
          responsable: {
            nombre: respNom,
            telefono: respTel,
            email: respMail
          }
        };

        set((state) => {
          const currentQueue = Array.isArray(state.syncQueue) ? state.syncQueue : [];
          const existingInQueue = currentQueue.some(
            (item) => item?.id === proyectoId && item?.tipo === 'PROYECTO'
          );
          const updatedSyncQueue = existingInQueue
            ? currentQueue.map((item) => {
                if (item?.id === proyectoId && item?.tipo === 'PROYECTO') {
                  return {
                    ...item,
                    companyId: companyId || item.companyId,
                    payload: { ...(item.payload || {}), ...normalizedData, empresaId: companyId }
                  };
                }
                return item;
              })
            : [
                ...currentQueue,
                {
                  id: proyectoId,
                  tipo: 'PROYECTO',
                  companyId,
                  payload: { id: proyectoId, ...normalizedData, empresaId: companyId }
                }
              ];

          return {
            companies: state.companies.map((c) => {
              if (c.id === companyId) {
                return {
                  ...c,
                  proyectos: (c.proyectos || []).map((p) => {
                    if (p.id === proyectoId) {
                      return { ...p, ...normalizedData };
                    }
                    return p;
                  })
                };
              }
              return c;
            }),
            proyectosLocales: (state.proyectosLocales || []).map((p) => {
              if (p.id === proyectoId) {
                return { ...p, ...normalizedData };
              }
              return p;
            }),
            syncQueue: updatedSyncQueue
          };
        });

        if (navigator.onLine) {
          try {
            const { token } = get();
            await fetch(`${API_BASE_URL}/api/proyectos/${proyectoId}`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                ...(token && token !== 'mock-offline-token' ? { 'Authorization': `Bearer ${token}` } : {})
              },
              body: JSON.stringify(normalizedData)
            });
          } catch (e) {
            console.error('Error al actualizar proyecto en el servidor:', e);
          }
        }
      },

      deleteProyecto: async (companyId, proyectoId, adminPassword) => {
        const currentUser = get().user;
        if (!currentUser || currentUser.role !== 'ADMIN') {
          return { ok: false, error: 'Acción permitida únicamente para administradores.' };
        }
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
          return { ok: false, error: 'Se requiere conexión al servidor para eliminar un proyecto de forma permanente.' };
        }
        const activeToken = get().token || (typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null);
        if (!activeToken || activeToken === 'mock-offline-token') {
          return { ok: false, error: 'Se requiere una sesión activa con el servidor para eliminar un proyecto.' };
        }

        try {
          const res = await fetch(`${API_BASE_URL}/api/proyectos/${proyectoId}`, {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${activeToken}`
            },
            body: JSON.stringify({ adminPassword })
          });
          const data = await res.json().catch(() => ({}));
          if (!(res.ok && data.ok) && res.status !== 404) {
            return { ok: false, error: data.error || `Error al eliminar el proyecto (${res.status}).` };
          }
        } catch (e) {
          console.error('Error al eliminar proyecto del servidor:', e);
          return { ok: false, error: 'No se pudo contactar con el servidor para eliminar el proyecto.' };
        }

        get().purgeProyectoLocal(companyId, proyectoId);
        return { ok: true };
      },

      purgeProyectoLocal: (companyId, proyectoId) => {
        set((state) => {
          const belongsToProject = (item) =>
            item && (
              item.id === proyectoId ||
              item.proyectoId === proyectoId ||
              item.payload?.proyectoId === proyectoId ||
              item.payload?.id === proyectoId
            );
          return {
            companies: (state.companies || []).map((c) => {
              if (!companyId || c.id === companyId) {
                return {
                  ...c,
                  proyectos: (c.proyectos || []).filter((p) => p.id !== proyectoId)
                };
              }
              return c;
            }),
            proyectosLocales: (state.proyectosLocales || []).filter((p) => !belongsToProject(p)),
            elementosLocales: (state.elementosLocales || []).filter((e) => !belongsToProject(e)),
            subestacionesLocales: (state.subestacionesLocales || []).filter((s) => !belongsToProject(s)),
            puntosMedicionLocales: (state.puntosMedicionLocales || []).filter((p) => !belongsToProject(p)),
            ccmLocales: (state.ccmLocales || []).filter((c) => !belongsToProject(c)),
            syncQueue: (Array.isArray(state.syncQueue) ? state.syncQueue : []).filter((item) => !belongsToProject(item))
          };
        });
      },

      importCompanies: (companiesList) => {
        if (!Array.isArray(companiesList) || companiesList.length === 0) return;

        const deletedIds = new Set(Array.isArray(get().deletedCompanyIds) ? get().deletedCompanyIds : []);
        companiesList = companiesList.filter((c) => c && !deletedIds.has(c.id));
        if (companiesList.length === 0) return;

        const state = get();
        const currentCompanies = state.companies || [];
        const syncQueue = Array.isArray(state.syncQueue) ? state.syncQueue : [];
        const pendingQueueIds = new Set(syncQueue.map((item) => item?.id || item?.payload?.id).filter(Boolean));

        const enrichedIncoming = companiesList.map((c) => ({
          ...c,
          proyectos: (c.proyectos || []).map((p) => {
            const respNom = p.responsableNombre !== undefined ? p.responsableNombre : (typeof p.responsable === 'object' ? p.responsable?.nombre : p.responsable) || '';
            const respTel = p.responsableTelefono !== undefined ? p.responsableTelefono : (typeof p.responsable === 'object' ? p.responsable?.telefono : '') || '';
            const respMail = p.responsableEmail !== undefined ? p.responsableEmail : (typeof p.responsable === 'object' ? p.responsable?.email : '') || '';
            const dir = p.direccion || p.ubicacion || '';
            return {
              ...p,
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
              elementosUnifilares: hydrateProjectHierarchyLinks(p.elementosUnifilares || p.tableros || []),
              inspeccionesSubestacion: p.inspeccionesSubestacion || p.subestaciones || [],
              puntosMedicion: p.puntosMedicion || [],
              ccmList: p.ccmList || []
            };
          })
        }));

        // Fusión profunda Local-First:
        // Las entidades locales que tengan mutaciones pendientes en la cola o que fueron creadas localmente
        // tienen PRECEDENCIA sobre el estado recibido del servidor.
        const incomingCompanyMap = new Map(enrichedIncoming.map((c) => [c.id, c]));
        const mergedCompanies = [...currentCompanies];

        incomingCompanyMap.forEach((incomingComp, compId) => {
          const localCompIndex = mergedCompanies.findIndex((c) => c.id === compId);

          if (localCompIndex === -1) {
            mergedCompanies.push(incomingComp);
          } else {
            const localComp = mergedCompanies[localCompIndex];
            const localProjects = localComp.proyectos || [];
            const incomingProjects = incomingComp.proyectos || [];
            const incomingProjMap = new Map(incomingProjects.map((p) => [p.id, p]));

            const mergedProjects = [...localProjects];

            incomingProjMap.forEach((incomingProj, projId) => {
              const localProjIndex = mergedProjects.findIndex((p) => p.id === projId);

              if (localProjIndex === -1) {
                mergedProjects.push(incomingProj);
              } else {
                const localProj = mergedProjects[localProjIndex];

                // Fusión de elementos unifilares y tableros
                const localElements = localProj.elementosUnifilares || [];
                const incomingElements = incomingProj.elementosUnifilares || [];
                const incomingElemMap = new Map(incomingElements.map((e) => [e.id, e]));
                const mergedElements = [...localElements];

                incomingElemMap.forEach((incElem, elemId) => {
                  const localElemIndex = mergedElements.findIndex((e) => e.id === elemId);
                  if (localElemIndex === -1) {
                    mergedElements.push(incElem);
                  } else {
                    // Si el elemento local está pendiente de sincronizar, mantener el estado local
                    if (!pendingQueueIds.has(elemId)) {
                      mergedElements[localElemIndex] = {
                        ...incElem,
                        fotoBlob: mergedElements[localElemIndex].fotoBlob || null
                      };
                    }
                  }
                });

                // Fusión de subestaciones
                const localSubs = localProj.inspeccionesSubestacion || localProj.subestaciones || [];
                const incomingSubs = incomingProj.inspeccionesSubestacion || incomingProj.subestaciones || [];
                const incomingSubMap = new Map(incomingSubs.map((s) => [s.id, s]));
                const mergedSubs = [...localSubs];

                incomingSubMap.forEach((incSub, subId) => {
                  const localSubIndex = mergedSubs.findIndex((s) => s.id === subId);
                  if (localSubIndex === -1) {
                    mergedSubs.push(incSub);
                  } else {
                    if (!pendingQueueIds.has(subId)) {
                      mergedSubs[localSubIndex] = incSub;
                    }
                  }
                });

                // Fusión de puntos de medición
                const localPms = localProj.puntosMedicion || [];
                const incomingPms = incomingProj.puntosMedicion || [];
                const incomingPmMap = new Map(incomingPms.map((pm) => [pm.id, pm]));
                const mergedPms = [...localPms];

                incomingPmMap.forEach((incPm, pmId) => {
                  const localPmIndex = mergedPms.findIndex((pm) => pm.id === pmId);
                  if (localPmIndex === -1) {
                    mergedPms.push(incPm);
                  } else {
                    if (!pendingQueueIds.has(pmId)) {
                      mergedPms[localPmIndex] = incPm;
                    }
                  }
                });

                // Fusión de CCM
                const localCcms = localProj.ccmList || [];
                const incomingCcms = incomingProj.ccmList || [];
                const incomingCcmMap = new Map(incomingCcms.map((ccm) => [ccm.id, ccm]));
                const mergedCcms = [...localCcms];

                incomingCcmMap.forEach((incCcm, ccmId) => {
                  const localCcmIndex = mergedCcms.findIndex((ccm) => ccm.id === ccmId);
                  if (localCcmIndex === -1) {
                    mergedCcms.push(incCcm);
                  } else {
                    if (!pendingQueueIds.has(ccmId)) {
                      mergedCcms[localCcmIndex] = incCcm;
                    }
                  }
                });

                const projBase = pendingQueueIds.has(projId) ? localProj : incomingProj;

                mergedProjects[localProjIndex] = {
                  ...projBase,
                  elementosUnifilares: hydrateProjectHierarchyLinks(mergedElements),
                  inspeccionesSubestacion: mergedSubs,
                  subestaciones: mergedSubs,
                  puntosMedicion: mergedPms,
                  ccmList: mergedCcms
                };
              }
            });

            mergedCompanies[localCompIndex] = {
              ...incomingComp,
              proyectos: mergedProjects
            };
          }
        });

        set({ companies: mergedCompanies });
      },

      addProyecto: async (nombre, descripcion, companyId, extraData = {}) => {
        const { companies, token } = get();
        const company = companies.find((c) => c.id === companyId);
        if (!company) return { success: false, error: 'Empresa no encontrada.' };

        const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
        const hasActiveSession = Boolean(token && token !== 'mock-offline-token');

        const uuidId = crypto.randomUUID();
        const dir = (extraData.direccion || extraData.ubicacion || company.direccion || company.ubicacion || '').trim().toUpperCase();
        const respNom = (extraData.responsableNombre || (typeof extraData.responsable === 'object' ? extraData.responsable?.nombre : extraData.responsable) || company.contactoPrincipal || company.responsable || '').trim().toUpperCase();
        const respTel = (extraData.responsableTelefono || (typeof extraData.responsable === 'object' ? extraData.responsable?.telefono : '') || company.telefono || '').trim();
        const respMail = (extraData.responsableEmail || (typeof extraData.responsable === 'object' ? extraData.responsable?.email : '') || company.email || '').trim();
        const finalNombre = (nombre || '').trim().toUpperCase();
        const finalDescripcion = (descripcion || '').trim().toUpperCase();

        const nuevoProyecto = {
          id: uuidId,
          nombre: finalNombre,
          name: finalNombre,
          descripcion: finalDescripcion,
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
          empresaId: companyId,
          companyId: companyId,
          elementosUnifilares: [],
          inspeccionesSubestacion: [],
          subestaciones: [],
          puntosMedicion: [],
          ccmList: [],
          createdAt: new Date().toISOString()
        };

        let shouldEnqueue = !isOnline || !hasActiveSession;
        let syncErrorMsg = null;

        if (isOnline && hasActiveSession) {
          try {
            const resp = await fetchWithTimeout(`${API_BASE_URL}/api/proyectos`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify(nuevoProyecto)
            }, DEFAULT_REQUEST_TIMEOUT_MS);
            if (!resp.ok) {
              const errPayload = await readResponsePayload(resp);
              const errMsg = errPayload.error || `HTTP ${resp.status}`;
              console.warn('[ONLINE REALTIME] ⚠️ Servidor devolvió error al registrar proyecto:', errMsg);
              if (resp.status >= 500) {
                shouldEnqueue = true;
                syncErrorMsg = errMsg;
                get().showToast?.(`Servidor temporalmente ocupado (${errMsg}). Proyecto respaldado en cola local para sincronizar automáticamente.`, 'warning');
              } else {
                get().showToast?.(`Error en el servidor al registrar proyecto: ${errMsg}. Por favor reintenta.`, 'error');
                return { success: false, error: errMsg };
              }
            } else {
              get().removeFromQueue?.(uuidId);
              console.log('[ONLINE REALTIME] ✅ Proyecto registrado exitosamente en el servidor.');
            }
          } catch (e) {
            console.error('[ONLINE REALTIME] ⚠️ Error de red o timeout al registrar proyecto, encolando en syncQueue:', e);
            shouldEnqueue = true;
            syncErrorMsg = e.message;
            get().showToast?.(`Conexión inestable (${e.message}). Proyecto respaldado en cola local para sincronizar automáticamente.`, 'warning');
          }
        }

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
          syncQueue: shouldEnqueue
            ? [...(Array.isArray(state.syncQueue) ? state.syncQueue.filter((q) => q?.id !== uuidId) : []), {
                id: uuidId,
                tipo: 'PROYECTO',
                companyId,
                payload: nuevoProyecto,
                ...(syncErrorMsg ? { syncError: syncErrorMsg, syncFailedAt: Date.now() } : {})
              }]
            : (Array.isArray(state.syncQueue) ? state.syncQueue : [])
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
        if (!uuidId || !uuidId.includes('-') || uuidId.length < 10) {
          uuidId = crypto.randomUUID();
        }

        const tipoElemento = cleanTipoElemento(elementoData.tipoElemento || 'TABLERO');
        const codigo = elementoData.codigo || getNextElementId(tipoElemento, proyectoId, get());

        const existingElements = proyectoId 
          ? (targetProyecto?.elementosUnifilares || targetProyecto?.tableros || []) 
          : (companies.find(c => c.id === parentCompanyId)?.elementosUnifilares || []);
        const nextOrden = elementoData.orden !== undefined 
          ? Number(elementoData.orden) 
          : (existingElements.length > 0 ? Math.max(0, ...existingElements.map(e => Number(e.orden) || 0)) + 1 : 1);

        const nombreFinal = (elementoData.nombre && elementoData.nombre.trim())
          ? String(elementoData.nombre).trim().toUpperCase()
          : `${codigo.toUpperCase()} - ${tipoElemento.toUpperCase()}`;

        const { list: allProjectElements, byId: allElementsMap } = collectProjectElementsInStore(get(), proyectoId, parentCompanyId);

        const rawParentId = elementoData.alimentadoPorId || elementoData.datosTecnicos?.alimentadoPorId || elementoData.datosTecnicos?.alimentadorId || null;
        const cleanParentId = sanitizeParentId(rawParentId, uuidId);
        let cleanAlimentadoPorText = !isPlaceholderHierarchyValue(elementoData.alimentadoPor)
          ? String(elementoData.alimentadoPor).trim().toUpperCase()
          : '';

        if (!cleanAlimentadoPorText && cleanParentId) {
          const parentFound = allElementsMap.get(String(cleanParentId)) || existingElements.find((e) => e.id === cleanParentId) || findElementoInStore(get(), cleanParentId, proyectoId);
          if (parentFound) {
            cleanAlimentadoPorText = getCleanElementLabel(parentFound);
          }
        }

        const cleanUbicacionText = resolveElementUbicacionDisplay(elementoData);
        const rawAlimentaIds = Array.isArray(elementoData.alimentaAIds)
          ? elementoData.alimentaAIds
          : (Array.isArray(elementoData.datosTecnicos?.alimentaAIds) ? elementoData.datosTecnicos.alimentaAIds : []);
        const cleanAlimentaA = elementoData.alimentaA ? String(elementoData.alimentaA).trim().toUpperCase() : '';

        let nuevoElemento = {
          id: uuidId,
          codigo: codigo.toUpperCase(),
          nombre: nombreFinal,
          tipoElemento,
          orden: nextOrden,
          ubicacion: cleanUbicacionText,
          alimentadoPor: cleanAlimentadoPorText,
          alimentadoPorId: cleanParentId,
          alimentaA: cleanAlimentaA,
          alimentaAIds: rawAlimentaIds.map((x) => sanitizeParentId(x, uuidId)).filter(Boolean),
          foto: elementoData.foto || null,
          fotoBlob: elementoData.fotoBlob || null,
          observacionesGenerales: elementoData.observacionesGenerales ? String(elementoData.observacionesGenerales).trim().toUpperCase() : '',
          datosTecnicos: {
            ...(elementoData.datosTecnicos || {}),
            ...(cleanParentId ? { alimentadoPorId: cleanParentId } : {}),
            codigo: codigo.toUpperCase()
          },
          proyectoId: proyectoId || null,
          empresaId: parentCompanyId,
          createdAt: new Date().toISOString()
        };

        if (isTransferElement(nuevoElemento)) {
          const dtCopy = { ...(nuevoElemento.datosTecnicos || {}) };
          if (cleanParentId && !dtCopy.fuenteNormalId && !dtCopy.fuenteEmergenciaId && !dtCopy.fuenteNormalNombre && !dtCopy.fuenteEmergenciaNombre) {
            const pObj = allElementsMap.get(String(cleanParentId));
            const applied = applyUpstreamLinkToElement(
              { ...nuevoElemento, datosTecnicos: dtCopy },
              cleanParentId,
              pObj ? getCleanElementLabel(pObj) : cleanAlimentadoPorText,
              pObj ? getElementTipoUpper(pObj) : ''
            );
            nuevoElemento = applied.nextEl;
          } else {
            const transferPatch = { ...nuevoElemento };
            normalizeTransferUpdatePayload(null, transferPatch, allProjectElements, uuidId);
            nuevoElemento = { ...nuevoElemento, ...transferPatch };
          }
          if (nuevoElemento.alimentaA || (nuevoElemento.alimentaAIds && nuevoElemento.alimentaAIds.length > 0)) {
            nuevoElemento.datosTecnicos = {
              ...(nuevoElemento.datosTecnicos || {}),
              alimentaA: nuevoElemento.alimentaA,
              alimentaAIds: nuevoElemento.alimentaAIds,
              salidaCargaNombre: nuevoElemento.datosTecnicos?.salidaCargaNombre || nuevoElemento.alimentaA,
              salidaCargaId: nuevoElemento.datosTecnicos?.salidaCargaId || nuevoElemento.alimentaAIds?.[0] || null
            };
          }
        }

        const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
        const { token } = get();
        const hasActiveSession = Boolean(token && token !== 'mock-offline-token');
        const safeNewAlimentaAIds = extractElementDownstreamIds(nuevoElemento, allProjectElements).filter((cid) => cid && cid !== uuidId);
        const newParentIds = extractElementParentIds(nuevoElemento, allProjectElements).filter((pid) => pid && pid !== uuidId && !safeNewAlimentaAIds.includes(pid));
        const modifiedRelatedMap = new Map();

        allElementsMap.set(uuidId, nuevoElemento);

        set((state) => {
          const mapRelated = (e, qTipo, compId, projId) => {
            if (!e || !e.id) return e;
            const eIdStr = String(e.id);
            let nextEl = e;
            let changed = false;

            if (safeNewAlimentaAIds.includes(eIdStr)) {
              const res = applyUpstreamLinkToElement(nextEl, uuidId, nombreFinal, tipoElemento);
              if (res.changed) {
                nextEl = res.nextEl;
                changed = true;
              }
            } else if (newParentIds.includes(eIdStr)) {
              const res = applyDownstreamLinkToParent(nextEl, uuidId, nombreFinal, allElementsMap);
              if (res.changed) {
                nextEl = res.nextEl;
                changed = true;
              }
            }

            if (changed) {
              modifiedRelatedMap.set(eIdStr, {
                tipo: qTipo,
                item: {
                  ...nextEl,
                  empresaId: nextEl.empresaId || nextEl.companyId || compId || parentCompanyId,
                  proyectoId: nextEl.proyectoId || projId || proyectoId || null
                }
              });
              return nextEl;
            }
            return e;
          };

          const mapped = applyHierarchyMapperAcrossState(state, proyectoId, parentCompanyId, mapRelated);

          const updatedCompanies = mapped.updatedCompanies.map((c) => {
            if (c.id !== parentCompanyId) return c;
            if (proyectoId) {
              return {
                ...c,
                proyectos: (c.proyectos || []).map((p) => {
                  if (p.id !== proyectoId) return p;
                  const currList = p.elementosUnifilares || p.tableros || [];
                  return {
                    ...p,
                    elementosUnifilares: [...currList, nuevoElemento]
                  };
                })
              };
            }
            return {
              ...c,
              elementosUnifilares: [...(c.elementosUnifilares || []), nuevoElemento]
            };
          });

          const updatedElementosLocales = [...mapped.updatedElementosLocales, nuevoElemento];

          let nextSyncQueue = Array.isArray(state.syncQueue) ? state.syncQueue : [];
          if (!isOnline || !hasActiveSession) {
            nextSyncQueue = upsertSyncQueueEntries(nextSyncQueue, [
              {
                id: uuidId,
                tipo: 'ELEMENTO_UNIFILAR',
                companyId: parentCompanyId,
                payload: nuevoElemento
              },
              ...Array.from(modifiedRelatedMap.entries()).map(([rid, entry]) => ({
                id: rid,
                tipo: entry.tipo,
                companyId: entry.item.empresaId || entry.item.companyId || parentCompanyId,
                payload: entry.item
              }))
            ]);
          }

          return {
            companies: updatedCompanies,
            elementosLocales: updatedElementosLocales,
            puntosMedicionLocales: mapped.updatedPuntosLocales,
            ccmLocales: mapped.updatedCcmLocales,
            subestacionesLocales: mapped.updatedSubestacionesLocales,
            syncQueue: nextSyncQueue
          };
        });

        let directPromise = null;
        // Si hay internet y sesión activa, enviar DIRECTAMENTE al servidor en tiempo real (con fallback automático a syncQueue si falla)
        if (isOnline && hasActiveSession) {
          directPromise = get().enviarElementoDirectoServidor?.(parentCompanyId, nuevoElemento);
          modifiedRelatedMap.forEach((entry, relId) => {
            if (entry.tipo === 'ELEMENTO_UNIFILAR') {
              scheduleDebouncedElementoSync(get, relId, proyectoId, entry.item);
            }
          });
        }

        const resultObj = {
          success: true,
          elemento: nuevoElemento,
          then: (resolve, reject) => {
            if (directPromise) {
              return directPromise.then((res) => {
                resolve({ success: res?.ok ?? true, elemento: nuevoElemento, ...res });
              }, reject);
            }
            return Promise.resolve({ success: true, elemento: nuevoElemento }).then(resolve, reject);
          },
          catch: (reject) => {
            if (directPromise) return directPromise.catch(reject);
            return Promise.resolve({ success: true, elemento: nuevoElemento }).catch(reject);
          },
          finally: (cb) => {
            if (directPromise) return directPromise.finally(cb);
            return Promise.resolve({ success: true, elemento: nuevoElemento }).finally(cb);
          }
        };

        return resultObj;
      },

      updateElementoUnifilar: (proyectoId, elementoId, updatedData, options = {}) => {
        const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
        const { token } = get();
        const hasActiveSession = Boolean(token && token !== 'mock-offline-token');
        const skipNetworkSync = Boolean(options?.skipNetworkSync);

        const { list: allProjectElements, byId: allElementsMap } = collectProjectElementsInStore(get(), proyectoId);
        const existingEl = allElementsMap.get(String(elementoId)) || findElementoInStore(get(), elementoId, proyectoId);
        const cleanUpdatedData = { ...updatedData };
        if (cleanUpdatedData.nombre) cleanUpdatedData.nombre = String(cleanUpdatedData.nombre).trim().toUpperCase();
        if ('ubicacion' in cleanUpdatedData) {
          cleanUpdatedData.ubicacion = isPlaceholderHierarchyValue(cleanUpdatedData.ubicacion)
            ? ''
            : String(cleanUpdatedData.ubicacion).trim().toUpperCase();
        }
        if ('alimentadoPor' in cleanUpdatedData) {
          cleanUpdatedData.alimentadoPor = isPlaceholderHierarchyValue(cleanUpdatedData.alimentadoPor)
            ? ''
            : String(cleanUpdatedData.alimentadoPor).trim().toUpperCase();
        }
        if ('alimentadoPorId' in cleanUpdatedData) {
          const sanitizedPid = sanitizeParentId(cleanUpdatedData.alimentadoPorId, elementoId);
          cleanUpdatedData.alimentadoPorId = sanitizedPid;
          if (sanitizedPid && isPlaceholderHierarchyValue(cleanUpdatedData.alimentadoPor)) {
            const parentFound = allElementsMap.get(String(sanitizedPid)) || findElementoInStore(get(), sanitizedPid, proyectoId);
            if (parentFound) {
              cleanUpdatedData.alimentadoPor = getCleanElementLabel(parentFound);
            }
          }
          if (cleanUpdatedData.datosTecnicos && typeof cleanUpdatedData.datosTecnicos === 'object') {
            cleanUpdatedData.datosTecnicos = {
              ...cleanUpdatedData.datosTecnicos,
              alimentadoPorId: sanitizedPid,
              ...(sanitizedPid === null ? { alimentadorId: null } : {})
            };
          } else if (existingEl?.datosTecnicos) {
            cleanUpdatedData.datosTecnicos = {
              ...existingEl.datosTecnicos,
              alimentadoPorId: sanitizedPid,
              ...(sanitizedPid === null ? { alimentadorId: null } : {})
            };
          }
        }
        if (cleanUpdatedData.breakerMarca) cleanUpdatedData.breakerMarca = String(cleanUpdatedData.breakerMarca).trim().toUpperCase();
        if (cleanUpdatedData.breakerTipo) cleanUpdatedData.breakerTipo = String(cleanUpdatedData.breakerTipo).trim().toUpperCase();
        if (cleanUpdatedData.calibreConductor) cleanUpdatedData.calibreConductor = String(cleanUpdatedData.calibreConductor).trim().toUpperCase();
        if (cleanUpdatedData.circuitoOrigen) cleanUpdatedData.circuitoOrigen = String(cleanUpdatedData.circuitoOrigen).trim().toUpperCase();
        if (cleanUpdatedData.observacionesGenerales) cleanUpdatedData.observacionesGenerales = String(cleanUpdatedData.observacionesGenerales).trim().toUpperCase();
        if (cleanUpdatedData.codigo) cleanUpdatedData.codigo = String(cleanUpdatedData.codigo).trim().toUpperCase();
        if (cleanUpdatedData.alimentaA !== undefined) {
          cleanUpdatedData.alimentaA = isPlaceholderHierarchyValue(cleanUpdatedData.alimentaA)
            ? ''
            : String(cleanUpdatedData.alimentaA).trim().toUpperCase();
        }

        const mergedTipo = cleanUpdatedData.tipoElemento || existingEl?.tipoElemento || 'TABLERO';
        const isSelfTransfer = isTransferElement({ ...existingEl, ...cleanUpdatedData, tipoElemento: mergedTipo });

        if (isSelfTransfer) {
          normalizeTransferUpdatePayload(existingEl, cleanUpdatedData, allProjectElements, elementoId);
        }

        const prevCircuits = Array.isArray(existingEl?.circuits)
          ? existingEl.circuits
          : (Array.isArray(existingEl?.datosTecnicos?.circuits) ? existingEl.datosTecnicos.circuits : []);
        const prevCircuitChildIds = new Set(extractCircuitDestIds(existingEl));
        const nextCircuitsResolved = cleanUpdatedData.circuits !== undefined
          ? cleanUpdatedData.circuits
          : (cleanUpdatedData.datosTecnicos?.circuits !== undefined ? cleanUpdatedData.datosTecnicos.circuits : prevCircuits);
        const mergedDatosTecnicosPreview = cleanUpdatedData.datosTecnicos !== undefined
          ? { ...(existingEl?.datosTecnicos || {}), ...cleanUpdatedData.datosTecnicos, ...(nextCircuitsResolved !== undefined ? { circuits: nextCircuitsResolved } : {}) }
          : (existingEl?.datosTecnicos || {});
        const updatedPreviewEl = {
          ...(existingEl || {}),
          ...cleanUpdatedData,
          id: elementoId,
          tipoElemento: mergedTipo,
          ...(nextCircuitsResolved !== undefined ? { circuits: nextCircuitsResolved } : {}),
          datosTecnicos: mergedDatosTecnicosPreview
        };
        allElementsMap.set(String(elementoId), updatedPreviewEl);

        const isSelfTablero = isTableroElement(updatedPreviewEl);
        const explicitAlimentaAIds = cleanUpdatedData.alimentaAIds !== undefined
          ? cleanUpdatedData.alimentaAIds
          : cleanUpdatedData.datosTecnicos?.alimentaAIds;
        const hasExplicitAlimentaA = Array.isArray(explicitAlimentaAIds) && (!isSelfTablero || explicitAlimentaAIds.length > 0);
        const safeAlimentaAIds = hasExplicitAlimentaA
          ? Array.from(new Set(explicitAlimentaAIds.map((cid) => sanitizeParentId(cid, elementoId)).filter(Boolean)))
          : [];

        const prevExplicitAlimentaIds = new Set(
          existingEl
            ? [
                ...(Array.isArray(existingEl.alimentaAIds) ? existingEl.alimentaAIds : []),
                ...(Array.isArray(existingEl.datosTecnicos?.alimentaAIds) ? existingEl.datosTecnicos.alimentaAIds : []),
                ...(isTransferElement(existingEl) && existingEl.datosTecnicos?.salidaCargaId ? [existingEl.datosTecnicos.salidaCargaId] : [])
              ]
                .map((cid) => sanitizeParentId(cid, elementoId))
                .filter(Boolean)
            : []
        );

        const circuitsTouched = Array.isArray(cleanUpdatedData.circuits) || Array.isArray(cleanUpdatedData.datosTecnicos?.circuits);
        const nextCircuitChildIds = new Set(
          circuitsTouched ? extractCircuitDestIds(updatedPreviewEl) : Array.from(prevCircuitChildIds)
        );
        const nextDownstreamSet = new Set([
          ...(hasExplicitAlimentaA ? safeAlimentaAIds : Array.from(prevExplicitAlimentaIds)),
          ...nextCircuitChildIds
        ]);

        const prevParentIds = new Set(existingEl ? extractElementParentIds(existingEl, allProjectElements) : []);
        const nextParentIds = new Set(extractElementParentIds(updatedPreviewEl, allProjectElements));
        const parentFieldsTouched =
          ('alimentadoPor' in cleanUpdatedData) ||
          ('alimentadoPorId' in cleanUpdatedData) ||
          Boolean(
            cleanUpdatedData.datosTecnicos && (
              'alimentadoPorId' in cleanUpdatedData.datosTecnicos ||
              'alimentadorId' in cleanUpdatedData.datosTecnicos ||
              'fuenteNormalId' in cleanUpdatedData.datosTecnicos ||
              'fuenteNormalNombre' in cleanUpdatedData.datosTecnicos ||
              'fuenteEmergenciaId' in cleanUpdatedData.datosTecnicos ||
              'fuenteEmergenciaNombre' in cleanUpdatedData.datosTecnicos ||
              'alimentadoPorIds' in cleanUpdatedData.datosTecnicos
            )
          );

        const prevEffectiveName = existingEl ? getCleanElementLabel(existingEl) : '';
        const effectiveName = getCleanElementLabel(updatedPreviewEl) || cleanUpdatedData.nombre || existingEl?.nombre || '';
        const nameChanged = Boolean(effectiveName && prevEffectiveName && effectiveName !== prevEffectiveName);

        const modifiedRelatedMap = new Map();

        const syncElementBidirectional = (e, qTipo, compId, projId) => {
          if (!e || !e.id) return e;
          const eIdStr = String(e.id);
          if (eIdStr === String(elementoId)) {
            const nextCircuits = cleanUpdatedData.circuits !== undefined
              ? cleanUpdatedData.circuits
              : (cleanUpdatedData.datosTecnicos?.circuits !== undefined
                  ? cleanUpdatedData.datosTecnicos.circuits
                  : e.circuits);
            const mergedDatosTecnicos = cleanUpdatedData.datosTecnicos !== undefined
              ? { ...(e.datosTecnicos || {}), ...cleanUpdatedData.datosTecnicos, ...(nextCircuits !== undefined ? { circuits: nextCircuits } : {}) }
              : (e.datosTecnicos || {});
            return {
              ...e,
              ...cleanUpdatedData,
              ...(nextCircuits !== undefined ? { circuits: nextCircuits } : {}),
              datosTecnicos: mergedDatosTecnicos
            };
          }

          let currentEl = e;
          let changed = false;

          // 1. Padre -> Hijos (desde alimentaA / salidaCarga y/o circuitos de tablero)
          const isExplicitChildNow = hasExplicitAlimentaA && safeAlimentaAIds.includes(eIdStr);
          const isCircuitChildNow = circuitsTouched && nextCircuitChildIds.has(eIdStr);

          if (isExplicitChildNow || isCircuitChildNow) {
            const res = applyUpstreamLinkToElement(currentEl, elementoId, effectiveName, mergedTipo);
            if (res.changed) {
              currentEl = res.nextEl;
              changed = true;
            }
          } else {
            const wasExplicitRemoved =
              hasExplicitAlimentaA &&
              !nextCircuitChildIds.has(eIdStr) &&
              (prevExplicitAlimentaIds.has(eIdStr) || extractElementParentIds(currentEl, allProjectElements).includes(String(elementoId)));
            const wasCircuitRemoved =
              circuitsTouched &&
              prevCircuitChildIds.has(eIdStr) &&
              !nextCircuitChildIds.has(eIdStr) &&
              (!hasExplicitAlimentaA || !safeAlimentaAIds.includes(eIdStr));

            if (wasExplicitRemoved || wasCircuitRemoved) {
              const res = removeUpstreamLinkFromElement(currentEl, elementoId, prevEffectiveName);
              if (res.changed) {
                currentEl = res.nextEl;
                changed = true;
              }
            }
          }

          // 2. Hijo -> Padres (actualiza automáticamente alimentaA y Transfer.salidaCarga del padre)
          if ((parentFieldsTouched || nameChanged) && nextParentIds.has(eIdStr) && !nextDownstreamSet.has(eIdStr)) {
            const res = applyDownstreamLinkToParent(currentEl, elementoId, effectiveName, allElementsMap, nameChanged ? prevEffectiveName : '');
            if (res.changed) {
              currentEl = res.nextEl;
              changed = true;
            }
          } else if (parentFieldsTouched && prevParentIds.has(eIdStr) && !nextParentIds.has(eIdStr)) {
            const res = removeDownstreamLinkFromParent(currentEl, elementoId, prevEffectiveName, allElementsMap);
            if (res.changed) {
              currentEl = res.nextEl;
              changed = true;
            }
          }

          // 3. Propagación total de cambio de nombre (hijos, circuitos de tableros y referencias heredadas)
          if (nameChanged) {
            const renRes = applyRenamePropagationToPeer(currentEl, elementoId, prevEffectiveName, effectiveName, mergedTipo, allElementsMap, allProjectElements);
            if (renRes.changed) {
              currentEl = renRes.nextEl;
              changed = true;
            }
          }

          if (changed) {
            modifiedRelatedMap.set(eIdStr, {
              tipo: qTipo,
              item: {
                ...currentEl,
                empresaId: currentEl.empresaId || currentEl.companyId || compId || null,
                proyectoId: currentEl.proyectoId || projId || proyectoId || null
              }
            });
            return currentEl;
          }

          return e;
        };

        set((state) => {
          const mapped = applyHierarchyMapperAcrossState(state, proyectoId, null, syncElementBidirectional);

          const currentQueue = Array.isArray(state.syncQueue) ? state.syncQueue : [];
          let updatedSyncQueue = [...currentQueue];

          if (!skipNetworkSync && (!isOnline || !hasActiveSession)) {
            const updatedPrimary = findElementoInStore(
              { companies: mapped.updatedCompanies, elementosLocales: mapped.updatedElementosLocales },
              elementoId,
              proyectoId
            );
            const entriesToQueue = [];
            if (updatedPrimary) {
              entriesToQueue.push({
                id: elementoId,
                tipo: 'ELEMENTO_UNIFILAR',
                companyId: updatedPrimary.empresaId || updatedPrimary.companyId || (state.companies[0]?.id || null),
                payload: updatedPrimary
              });
            }
            modifiedRelatedMap.forEach((entry, rid) => {
              entriesToQueue.push({
                id: rid,
                tipo: entry.tipo,
                companyId: entry.item.empresaId || entry.item.companyId || (state.companies[0]?.id || null),
                payload: entry.item
              });
            });
            updatedSyncQueue = upsertSyncQueueEntries(updatedSyncQueue, entriesToQueue);
          }

          return {
            companies: mapped.updatedCompanies,
            elementosLocales: mapped.updatedElementosLocales,
            puntosMedicionLocales: mapped.updatedPuntosLocales,
            ccmLocales: mapped.updatedCcmLocales,
            subestacionesLocales: mapped.updatedSubestacionesLocales,
            syncQueue: updatedSyncQueue
          };
        });

        // Si está ONLINE: Buscar el elemento actualizado y todos los padres/hijos relacionados modificados y sincronizar
        let directPromise = null;
        if (!skipNetworkSync && isOnline && hasActiveSession) {
          const el = findElementoInStore(get(), elementoId, proyectoId);
          if (el) {
            directPromise = scheduleDebouncedElementoSync(get, elementoId, proyectoId, el);
          }
          modifiedRelatedMap.forEach((entry, relId) => {
            if (entry.tipo === 'ELEMENTO_UNIFILAR') {
              const latestRel = findElementoInStore(get(), relId, proyectoId) || entry.item;
              if (latestRel) {
                scheduleDebouncedElementoSync(get, relId, proyectoId, latestRel);
              }
            }
          });
        }

        return {
          success: true,
          elementoId,
          then: (resolve, reject) => {
            if (directPromise) {
              return directPromise.then((res) => resolve({ success: res?.ok ?? true, elementoId, ...res }), reject);
            }
            return Promise.resolve({ success: true, elementoId }).then(resolve, reject);
          },
          catch: (reject) => {
            if (directPromise) return directPromise.catch(reject);
            return Promise.resolve({ success: true, elementoId }).catch(reject);
          },
          finally: (cb) => {
            if (directPromise) return directPromise.finally(cb);
            return Promise.resolve({ success: true, elementoId }).finally(cb);
          }
        };
      },

      deleteElementoUnifilar: async (proyectoId, elementoId, adminPassword) => {
        const currentUser = get().user;
        if (!currentUser || currentUser.role !== 'ADMIN') {
          return { ok: false, error: 'Acción permitida únicamente para administradores.' };
        }
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
          return { ok: false, error: 'Se requiere conexión al servidor para eliminar un elemento de forma permanente.' };
        }
        const activeToken = get().token || (typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null);
        if (!activeToken || activeToken === 'mock-offline-token') {
          return { ok: false, error: 'Se requiere una sesión activa con el servidor para eliminar un elemento.' };
        }

        try {
          const res = await fetch(`${API_BASE_URL}/api/elementos-unifilares/${elementoId}`, {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${activeToken}`
            },
            body: JSON.stringify({ adminPassword })
          });
          const data = await res.json().catch(() => ({}));
          if (!(res.ok && data.ok) && res.status !== 404) {
            return { ok: false, error: data.error || `Error al eliminar el elemento (${res.status}).` };
          }
        } catch (e) {
          console.error('Error al eliminar elemento unifilar del servidor:', e);
          return { ok: false, error: 'No se pudo contactar con el servidor para eliminar el elemento.' };
        }

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
                    elementosUnifilares: list.filter((e) => e.id !== elementoId),
                    ...(p.tableros ? { tableros: (p.tableros || []).filter((t) => t.id !== elementoId) } : {})
                  };
                }
                return p;
              })
            };
          }),
          elementosLocales: (state.elementosLocales || []).filter((e) => e.id !== elementoId),
          syncQueue: (Array.isArray(state.syncQueue) ? state.syncQueue : []).filter((item) => item?.id !== elementoId)
        }));

        return { ok: true };
      },

      addTablero: (proyectoId, tableroData) => {
        return get().addElementoUnifilar(proyectoId, {
          ...tableroData,
          tipoElemento: 'TABLERO',
          datosTecnicos: {
            maxPoles: tableroData.maxPoles || 24,
            barrasPrincipales: tableroData.barrasPrincipales || { ia: '0', ib: '0', ic: '0' },
            breakerPrincipal: tableroData.breakerPrincipal || { marca: '', tipo: '', amp: '' },
            voltaje: tableroData.voltaje || { va: '', vb: '', vc: '', vab: '', vbc: '', vca: '' },
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

      deleteTablero: (proyectoId, tableroId, adminPassword) => {
        return get().deleteElementoUnifilar(proyectoId, tableroId, adminPassword);
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

        let uuidId = payload.id;
        if (!uuidId || !uuidId.includes('-') || uuidId.length < 10) {
          uuidId = crypto.randomUUID();
        }

        const tipoElemento = payload.tipoElemento || payload.tipoPlantilla || 'SUBESTACION';
        const codigo = payload.codigo || getNextElementId(tipoElemento, proyectoId, get());

        const existingSub = targetProyecto ? (targetProyecto.inspeccionesSubestacion || targetProyecto.subestaciones || []) : [];
        const nextOrden = payload.orden !== undefined 
          ? Number(payload.orden) 
          : (existingSub.length > 0 ? Math.max(0, ...existingSub.map(s => Number(s.orden) || 0)) + 1 : 1);

        const nombreFinal = (payload.nombre && payload.nombre.trim()) 
          ? payload.nombre.trim() 
          : `${codigo.toUpperCase()} - Subestación`;

        const nuevaSubestacion = {
          ...payload,
          id: uuidId,
          codigo: codigo,
          nombre: nombreFinal,
          tipoElemento,
          orden: nextOrden,
          tipoPlantilla: payload.tipoPlantilla || 'INSPECCION_SUBESTACION',
          proyectoId,
          empresaId: parentCompanyId,
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
          syncQueue: [...(Array.isArray(state.syncQueue) ? state.syncQueue : []), {
            id: uuidId,
            tipo: 'SUBESTACION',
            companyId: parentCompanyId,
            payload: nuevaSubestacion
          }]
        }));

        return { success: true, subestacion: nuevaSubestacion };
      },

      updateSubestacion: (proyectoId, subestacionId, updatedData, options = {}) => {
        const skipNetworkSync = Boolean(options?.skipNetworkSync);
        const { byId: prevById } = collectProjectElementsInStore(get(), proyectoId);
        const prevSub = prevById.get(String(subestacionId)) || null;
        let updatedSub = null;
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
                      updatedSub = { ...s, ...updatedData, tipoElemento: s.tipoElemento || 'SUBESTACION', empresaId: s.empresaId || c.id, proyectoId: s.proyectoId || p.id };
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
              if (!updatedSub) updatedSub = { ...s, ...updatedData, tipoElemento: s.tipoElemento || 'SUBESTACION' };
              return { ...s, ...updatedData };
            }
            return s;
          });

          const currentQueue = Array.isArray(state.syncQueue) ? state.syncQueue : [];
          if (skipNetworkSync) {
            return {
              companies: updatedCompanies,
              subestacionesLocales: updatedSubestacionesLocales,
              syncQueue: currentQueue
            };
          }

          let inQueue = false;
          const updatedSyncQueue = currentQueue.map((item) => {
            if (item?.id === subestacionId && item?.tipo === 'SUBESTACION') {
              inQueue = true;
              return { ...item, payload: mergePayloadDeep(item.payload, updatedData) };
            }
            return item;
          });

          if (!inQueue && updatedSub) {
            updatedSyncQueue.push({
              id: subestacionId,
              tipo: 'SUBESTACION',
              companyId: updatedSub.empresaId || (state.companies[0]?.id || null),
              payload: updatedSub
            });
          }

          return {
            companies: updatedCompanies,
            subestacionesLocales: updatedSubestacionesLocales,
            syncQueue: updatedSyncQueue
          };
        });

        if (updatedSub) {
          syncRelatedHierarchyFromExternalElement(set, get, {
            proyectoId,
            targetId: subestacionId,
            prevEl: prevSub,
            updatedEl: updatedSub,
            updatedData,
            queueTipo: 'SUBESTACION',
            skipNetworkSync
          });
        }
      },

      deleteSubestacion: async (proyectoId, subestacionId, adminPassword) => {
        const currentUser = get().user;
        if (!currentUser || currentUser.role !== 'ADMIN') {
          return { ok: false, error: 'Acción permitida únicamente para administradores.' };
        }
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
          return { ok: false, error: 'Se requiere conexión al servidor para eliminar una inspección de forma permanente.' };
        }
        const activeToken = get().token || (typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null);
        if (!activeToken || activeToken === 'mock-offline-token') {
          return { ok: false, error: 'Se requiere una sesión activa con el servidor para eliminar una inspección.' };
        }

        try {
          const res = await fetch(`${API_BASE_URL}/api/subestaciones/${subestacionId}`, {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${activeToken}`
            },
            body: JSON.stringify({ adminPassword })
          });
          const data = await res.json().catch(() => ({}));
          if (!(res.ok && data.ok) && res.status !== 404) {
            return { ok: false, error: data.error || `Error al eliminar la inspección (${res.status}).` };
          }
        } catch (e) {
          console.error('Error al eliminar inspección de subestación del servidor:', e);
          return { ok: false, error: 'No se pudo contactar con el servidor para eliminar la inspección.' };
        }

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
          syncQueue: (Array.isArray(state.syncQueue) ? state.syncQueue : []).filter((item) => item?.id !== subestacionId)
        }));

        return { ok: true };
      },

      addPuntoMedicion: (proyectoId, payload) => {
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

        let uuidId = payload.id;
        if (!uuidId || !uuidId.includes('-') || uuidId.length < 10) {
          uuidId = crypto.randomUUID();
        }

        const codigo = payload.codigo || getNextElementId('PUNTO_MEDICION', proyectoId, get());

        const existingPm = targetProyecto ? (targetProyecto.puntosMedicion || []) : [];
        const nextOrden = payload.orden !== undefined 
          ? Number(payload.orden) 
          : (existingPm.length > 0 ? Math.max(0, ...existingPm.map(p => Number(p.orden) || 0)) + 1 : 1);

        const nombreFinal = (payload.nombre && payload.nombre.trim()) 
          ? payload.nombre.trim() 
          : `${codigo.toUpperCase()} - Punto de Medición`;

        const nuevoPunto = {
          ...payload,
          id: uuidId,
          codigo: codigo,
          nombre: nombreFinal,
          orden: nextOrden,
          proyectoId,
          empresaId: parentCompanyId,
          tipoPlantilla: 'PUNTO_MEDICION',
          createdAt: new Date().toISOString()
        };

        set((state) => ({
          companies: state.companies.map((c) => {
            if (c.id === parentCompanyId) {
              return {
                ...c,
                proyectos: c.proyectos.map((p) => {
                  if (p.id === proyectoId) {
                    const puntos = p.puntosMedicion || [];
                    return {
                      ...p,
                      puntosMedicion: [...puntos, nuevoPunto]
                    };
                  }
                  return p;
                })
              };
            }
            return c;
          }),
          puntosMedicionLocales: [...(state.puntosMedicionLocales || []), nuevoPunto],
          syncQueue: [...(Array.isArray(state.syncQueue) ? state.syncQueue : []), {
            id: uuidId,
            tipo: 'PUNTO_MEDICION',
            companyId: parentCompanyId,
            payload: nuevoPunto
          }]
        }));

        return { success: true, puntoMedicion: nuevoPunto };
      },

      updatePuntoMedicion: (proyectoId, puntoId, updatedData, options = {}) => {
        const skipNetworkSync = Boolean(options?.skipNetworkSync);
        const { byId: prevById } = collectProjectElementsInStore(get(), proyectoId);
        const prevPunto = prevById.get(String(puntoId)) || null;
        let updatedPunto = null;
        set((state) => {
          const updatedCompanies = state.companies.map((c) => ({
            ...c,
            elementosUnifilares: (c.elementosUnifilares || []).map((item) => {
              if (item.id === puntoId) {
                const next = { ...item, ...updatedData };
                if (!updatedPunto) updatedPunto = { ...next, tipoElemento: next.tipoElemento || 'PUNTO_MEDICION', empresaId: next.empresaId || c.id };
                return next;
              }
              return item;
            }),
            proyectos: (c.proyectos || []).map((p) => {
              const matchesProj = !proyectoId || p.id === proyectoId;
              const puntos = p.puntosMedicion || [];
              const elementos = p.elementosUnifilares || [];
              return {
                ...p,
                puntosMedicion: puntos.map((item) => {
                  if (item.id === puntoId) {
                    const next = { ...item, ...updatedData };
                    updatedPunto = { ...next, tipoElemento: next.tipoElemento || 'PUNTO_MEDICION', empresaId: next.empresaId || c.id, proyectoId: next.proyectoId || p.id };
                    return next;
                  }
                  return item;
                }),
                elementosUnifilares: matchesProj ? elementos.map((item) => {
                  if (item.id === puntoId) {
                    const next = { ...item, ...updatedData };
                    if (!updatedPunto) updatedPunto = { ...next, tipoElemento: next.tipoElemento || 'PUNTO_MEDICION', empresaId: next.empresaId || c.id, proyectoId: next.proyectoId || p.id };
                    return next;
                  }
                  return item;
                }) : elementos
              };
            })
          }));

          const updatedPuntosLocales = (state.puntosMedicionLocales || []).map((item) => {
            if (item.id === puntoId) {
              const next = { ...item, ...updatedData };
              if (!updatedPunto) updatedPunto = { ...next, tipoElemento: next.tipoElemento || 'PUNTO_MEDICION' };
              return next;
            }
            return item;
          });

          const currentQueue = Array.isArray(state.syncQueue) ? state.syncQueue : [];
          if (skipNetworkSync) {
            return {
              companies: updatedCompanies,
              puntosMedicionLocales: updatedPuntosLocales,
              syncQueue: currentQueue
            };
          }

          let inQueue = false;
          const updatedSyncQueue = currentQueue.map((item) => {
            if (item?.id === puntoId && (item?.tipo === 'PUNTO_MEDICION' || item?.tipo === 'ELEMENTO_UNIFILAR')) {
              inQueue = true;
              return { ...item, payload: mergePayloadDeep(item?.payload, updatedData) };
            }
            return item;
          });

          if (!inQueue && updatedPunto) {
            updatedSyncQueue.push({
              id: puntoId,
              tipo: 'PUNTO_MEDICION',
              companyId: updatedPunto.empresaId || (state.companies[0]?.id || null),
              payload: updatedPunto
            });
          }

          return {
            companies: updatedCompanies,
            puntosMedicionLocales: updatedPuntosLocales,
            syncQueue: updatedSyncQueue
          };
        });

        if (updatedPunto) {
          syncRelatedHierarchyFromExternalElement(set, get, {
            proyectoId,
            targetId: puntoId,
            prevEl: prevPunto,
            updatedEl: updatedPunto,
            updatedData,
            queueTipo: 'PUNTO_MEDICION',
            skipNetworkSync
          });
        }
      },

      deletePuntoMedicion: async (proyectoId, puntoId, adminPassword) => {
        const currentUser = get().user;
        if (!currentUser || currentUser.role !== 'ADMIN') {
          return { ok: false, error: 'Acción permitida únicamente para administradores.' };
        }
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
          return { ok: false, error: 'Se requiere conexión al servidor para eliminar el punto de medición.' };
        }
        const activeToken = get().token || (typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null);
        if (!activeToken || activeToken === 'mock-offline-token') {
          return { ok: false, error: 'Se requiere una sesión activa con el servidor.' };
        }

        try {
          const res = await fetch(`${API_BASE_URL}/api/puntos-medicion/${puntoId}`, {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${activeToken}`
            },
            body: JSON.stringify({ adminPassword })
          });
          const data = await res.json().catch(() => ({}));
          if (!(res.ok && data.ok) && res.status !== 404) {
            return { ok: false, error: data.error || `Error al eliminar el punto de medición (${res.status}).` };
          }
        } catch (e) {
          console.error('Error al eliminar punto de medición del servidor:', e);
          return { ok: false, error: 'No se pudo contactar con el servidor.' };
        }

        set((state) => ({
          companies: state.companies.map((c) => ({
            ...c,
            proyectos: (c.proyectos || []).map((p) => {
              if (p.id === proyectoId) {
                const puntos = p.puntosMedicion || [];
                return {
                  ...p,
                  puntosMedicion: puntos.filter((item) => item.id !== puntoId)
                };
              }
              return p;
            })
          })),
          puntosMedicionLocales: (state.puntosMedicionLocales || []).filter((item) => item?.id !== puntoId),
          syncQueue: (Array.isArray(state.syncQueue) ? state.syncQueue : []).filter((item) => item?.id !== puntoId)
        }));

        return { ok: true };
      },

      addCcm: (proyectoId, payload) => {
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

        let uuidId = payload.id;
        if (!uuidId || !uuidId.includes('-') || uuidId.length < 10) {
          uuidId = crypto.randomUUID();
        }

        const codigo = payload.codigo || getNextElementId('CCM', proyectoId, get());

        const existingCcm = targetProyecto ? (targetProyecto.ccmList || []) : [];
        const nextOrden = payload.orden !== undefined 
          ? Number(payload.orden) 
          : (existingCcm.length > 0 ? Math.max(0, ...existingCcm.map(c => Number(c.orden) || 0)) + 1 : 1);

        const nombreFinal = (payload.nombre && payload.nombre.trim()) 
          ? payload.nombre.trim() 
          : `${codigo.toUpperCase()} - CCM`;

        const nuevoCcm = {
          ...payload,
          id: uuidId,
          codigo: codigo,
          nombre: nombreFinal,
          orden: nextOrden,
          proyectoId,
          empresaId: parentCompanyId,
          tipoPlantilla: 'CCM',
          createdAt: new Date().toISOString()
        };

        set((state) => ({
          companies: state.companies.map((c) => {
            if (c.id === parentCompanyId) {
              return {
                ...c,
                proyectos: c.proyectos.map((p) => {
                  if (p.id === proyectoId) {
                    const ccmItems = p.ccmList || [];
                    return {
                      ...p,
                      ccmList: [...ccmItems, nuevoCcm]
                    };
                  }
                  return p;
                })
              };
            }
            return c;
          }),
          ccmLocales: [...(state.ccmLocales || []), nuevoCcm],
          syncQueue: [...(Array.isArray(state.syncQueue) ? state.syncQueue : []), {
            id: uuidId,
            tipo: 'CCM',
            companyId: parentCompanyId,
            payload: nuevoCcm
          }]
        }));

        return { success: true, ccm: nuevoCcm };
      },

      updateCcm: (proyectoId, ccmId, updatedData, options = {}) => {
        const skipNetworkSync = Boolean(options?.skipNetworkSync);
        const { byId: prevById } = collectProjectElementsInStore(get(), proyectoId);
        const prevCcm = prevById.get(String(ccmId)) || null;
        let updatedCcmItem = null;
        set((state) => {
          const updatedCompanies = state.companies.map((c) => ({
            ...c,
            proyectos: (c.proyectos || []).map((p) => {
              if (p.id === proyectoId) {
                const ccmItems = p.ccmList || [];
                return {
                  ...p,
                  ccmList: ccmItems.map((item) => {
                    if (item.id === ccmId) {
                      const next = { ...item, ...updatedData };
                      updatedCcmItem = { ...next, tipoElemento: next.tipoElemento || 'CCM', empresaId: next.empresaId || c.id, proyectoId: next.proyectoId || p.id };
                      return next;
                    }
                    return item;
                  })
                };
              }
              return p;
            })
          }));

          const updatedCcmLocales = (state.ccmLocales || []).map((item) => {
            if (item.id === ccmId) {
              const next = { ...item, ...updatedData };
              if (!updatedCcmItem) updatedCcmItem = { ...next, tipoElemento: next.tipoElemento || 'CCM' };
              return next;
            }
            return item;
          });

          const currentQueue = Array.isArray(state.syncQueue) ? state.syncQueue : [];
          if (skipNetworkSync) {
            return {
              companies: updatedCompanies,
              ccmLocales: updatedCcmLocales,
              syncQueue: currentQueue
            };
          }

          let inQueue = false;
          const updatedSyncQueue = currentQueue.map((item) => {
            if (item?.id === ccmId && item?.tipo === 'CCM') {
              inQueue = true;
              return { ...item, payload: mergePayloadDeep(item.payload, updatedData) };
            }
            return item;
          });

          if (!inQueue && updatedCcmItem) {
            updatedSyncQueue.push({
              id: ccmId,
              tipo: 'CCM',
              companyId: updatedCcmItem.empresaId || (state.companies[0]?.id || null),
              payload: updatedCcmItem
            });
          }

          return {
            companies: updatedCompanies,
            ccmLocales: updatedCcmLocales,
            syncQueue: updatedSyncQueue
          };
        });

        if (updatedCcmItem) {
          syncRelatedHierarchyFromExternalElement(set, get, {
            proyectoId,
            targetId: ccmId,
            prevEl: prevCcm,
            updatedEl: updatedCcmItem,
            updatedData,
            queueTipo: 'CCM',
            skipNetworkSync
          });
        }
      },

      deleteCcm: async (proyectoId, ccmId, adminPassword) => {
        const currentUser = get().user;
        if (!currentUser || currentUser.role !== 'ADMIN') {
          return { ok: false, error: 'Acción permitida únicamente para administradores.' };
        }
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
          return { ok: false, error: 'Se requiere conexión al servidor para eliminar el CCM.' };
        }
        const activeToken = get().token || (typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null);
        if (!activeToken || activeToken === 'mock-offline-token') {
          return { ok: false, error: 'Se requiere una sesión activa con el servidor.' };
        }

        try {
          const res = await fetch(`${API_BASE_URL}/api/ccm/${ccmId}`, {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${activeToken}`
            },
            body: JSON.stringify({ adminPassword })
          });
          const data = await res.json().catch(() => ({}));
          if (!(res.ok && data.ok) && res.status !== 404) {
            return { ok: false, error: data.error || `Error al eliminar el CCM (${res.status}).` };
          }
        } catch (e) {
          console.error('Error al eliminar CCM del servidor:', e);
          return { ok: false, error: 'No se pudo contactar con el servidor.' };
        }

        set((state) => ({
          companies: state.companies.map((c) => ({
            ...c,
            proyectos: (c.proyectos || []).map((p) => {
              if (p.id === proyectoId) {
                const ccmItems = p.ccmList || [];
                return {
                  ...p,
                  ccmList: ccmItems.filter((item) => item.id !== ccmId)
                };
              }
              return p;
            })
          })),
          ccmLocales: (state.ccmLocales || []).filter((item) => item?.id !== ccmId),
          syncQueue: (Array.isArray(state.syncQueue) ? state.syncQueue : []).filter((item) => item?.id !== ccmId)
        }));

        return { ok: true };
      },

      updateElementoCodigo: async (elementoId, nuevoCodigo, tipoElemento = null, proyectoId = null) => {
        const cleanCode = String(nuevoCodigo || '').trim().toUpperCase();
        if (!cleanCode) return { success: false, error: 'El código o ID visual no puede estar vacío.' };

        let resolvedPayload = null;
        let resolvedType = 'ELEMENTO_UNIFILAR';
        let resolvedCompanyId = null;

        set((state) => {
          let updatedItemPayload = null;
          let itemType = 'ELEMENTO_UNIFILAR';
          let itemCompanyId = state.companies[0]?.id || null;

          const updatedCompanies = state.companies.map((c) => {
            const compElementos = (c.elementosUnifilares || []).map((el) => {
              if (el.id === elementoId) {
                const dt = { ...(el.datosTecnicos || {}), codigo: cleanCode };
                const updated = { ...el, codigo: cleanCode, datosTecnicos: dt };
                updatedItemPayload = updated;
                itemType = 'ELEMENTO_UNIFILAR';
                itemCompanyId = c.id;
                return updated;
              }
              return el;
            });

            const compProyectos = (c.proyectos || []).map((p) => {
              const pElementos = (p.elementosUnifilares || p.tableros || []).map((el) => {
                if (el.id === elementoId) {
                  const dt = { ...(el.datosTecnicos || {}), codigo: cleanCode };
                  const updated = { ...el, codigo: cleanCode, datosTecnicos: dt };
                  updatedItemPayload = updated;
                  itemType = 'ELEMENTO_UNIFILAR';
                  itemCompanyId = c.id;
                  return updated;
                }
                return el;
              });

              const pSubestaciones = (p.inspeccionesSubestacion || p.subestaciones || []).map((sub) => {
                if (sub.id === elementoId) {
                  const dt = { ...(sub.datosTecnicos || {}), codigo: cleanCode };
                  const updated = { ...sub, codigo: cleanCode, datosTecnicos: dt };
                  updatedItemPayload = updated;
                  itemType = 'SUBESTACION';
                  itemCompanyId = c.id;
                  return updated;
                }
                return sub;
              });

              const pPuntos = (p.puntosMedicion || []).map((pm) => {
                if (pm.id === elementoId) {
                  const dt = { ...(pm.datosTecnicos || {}), codigo: cleanCode };
                  const updated = { ...pm, codigo: cleanCode, datosTecnicos: dt };
                  updatedItemPayload = updated;
                  itemType = 'PUNTO_MEDICION';
                  itemCompanyId = c.id;
                  return updated;
                }
                return pm;
              });

              const pCcm = (p.ccmList || []).map((ccm) => {
                if (ccm.id === elementoId) {
                  const dt = { ...(ccm.datosTecnicos || {}), codigo: cleanCode };
                  const updated = { ...ccm, codigo: cleanCode, datosTecnicos: dt };
                  updatedItemPayload = updated;
                  itemType = 'CCM';
                  itemCompanyId = c.id;
                  return updated;
                }
                return ccm;
              });

              return {
                ...p,
                elementosUnifilares: pElementos,
                tableros: pElementos,
                inspeccionesSubestacion: pSubestaciones,
                subestaciones: pSubestaciones,
                puntosMedicion: pPuntos,
                ccmList: pCcm
              };
            });

            return {
              ...c,
              elementosUnifilares: compElementos,
              proyectos: compProyectos
            };
          });

          const updatedElementosLocales = (state.elementosLocales || []).map((el) => {
            if (el.id === elementoId) {
              const dt = { ...(el.datosTecnicos || {}), codigo: cleanCode };
              return { ...el, codigo: cleanCode, datosTecnicos: dt };
            }
            return el;
          });

          const updatedSubestacionesLocales = (state.subestacionesLocales || []).map((s) => {
            if (s.id === elementoId) {
              const dt = { ...(s.datosTecnicos || {}), codigo: cleanCode };
              return { ...s, codigo: cleanCode, datosTecnicos: dt };
            }
            return s;
          });

          const updatedPuntosLocales = (state.puntosMedicionLocales || []).map((pm) => {
            if (pm.id === elementoId) {
              const dt = { ...(pm.datosTecnicos || {}), codigo: cleanCode };
              return { ...pm, codigo: cleanCode, datosTecnicos: dt };
            }
            return pm;
          });

          const updatedCcmLocales = (state.ccmLocales || []).map((ccm) => {
            if (ccm.id === elementoId) {
              const dt = { ...(ccm.datosTecnicos || {}), codigo: cleanCode };
              return { ...ccm, codigo: cleanCode, datosTecnicos: dt };
            }
            return ccm;
          });

          const currentQueue = Array.isArray(state.syncQueue) ? state.syncQueue : [];
          let inQueue = false;
          const updatedSyncQueue = currentQueue.map((item) => {
            if (item?.id === elementoId) {
              inQueue = true;
              const p = item.payload || {};
              const dt = { ...(p.datosTecnicos || {}), codigo: cleanCode };
              return {
                ...item,
                payload: { ...p, codigo: cleanCode, datosTecnicos: dt }
              };
            }
            return item;
          });

          if (!inQueue && updatedItemPayload) {
            updatedSyncQueue.push({
              id: elementoId,
              tipo: itemType,
              companyId: itemCompanyId,
              payload: updatedItemPayload
            });
          }

          resolvedPayload = updatedItemPayload;
          resolvedType = itemType;
          resolvedCompanyId = itemCompanyId;

          return {
            companies: updatedCompanies,
            elementosLocales: updatedElementosLocales,
            subestacionesLocales: updatedSubestacionesLocales,
            puntosMedicionLocales: updatedPuntosLocales,
            ccmLocales: updatedCcmLocales,
            syncQueue: updatedSyncQueue
          };
        });

        // Sincronización remota si está en línea vía POST /api/sync/batch (o debounce unifilar)
        const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
        const { token } = get();
        if (isOnline && token && token !== 'mock-offline-token' && resolvedPayload) {
          try {
            const entityMap = {
              ELEMENTO_UNIFILAR: 'ElementoUnifilar',
              SUBESTACION: 'Subestacion',
              PUNTO_MEDICION: 'PuntoMedicion',
              CCM: 'Ccm'
            };
            const entityName = entityMap[resolvedType] || 'ElementoUnifilar';
            const res = await fetch(`${API_BASE_URL}/api/sync/batch`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({
                mutations: [
                  {
                    entity: entityName,
                    id: elementoId,
                    operation: 'UPSERT',
                    data: resolvedPayload
                  }
                ]
              })
            });
            const data = await res.json().catch(() => ({}));
            if (res.ok && data?.ok && Array.isArray(data.applied) && data.applied.length > 0) {
              get().removeFromQueue(elementoId);
            } else if (resolvedType === 'ELEMENTO_UNIFILAR') {
              scheduleDebouncedElementoSync(get, elementoId, proyectoId || resolvedPayload.proyectoId, resolvedPayload);
            }
          } catch (e) {
            console.error('Error al sincronizar actualización de código ID:', e);
            get().enqueueOfflineItem?.(resolvedType, resolvedCompanyId, resolvedPayload, e.message);
          }
        }

        return { success: true, codigo: cleanCode };
      },

      moverElemento: (companyId, proyectoId, elementoId, direccion = 'UP', tipoColeccion = 'UNIFILAR') => {
        let changedItems = [];

        set((state) => {
          const updatedCompanies = state.companies.map((c) => {
            if (companyId && c.id !== companyId) return c;

            if (proyectoId) {
              return {
                ...c,
                proyectos: (c.proyectos || []).map((p) => {
                  if (p.id !== proyectoId) return p;

                  if (tipoColeccion === 'UNIFILAR') {
                    const list = [...(p.elementosUnifilares || p.tableros || [])];
                    const sorted = sortElementsByOrder(list);
                    const currentIndex = sorted.findIndex((item) => item.id === elementoId);
                    if (currentIndex === -1) return p;

                    const targetIndex = direccion === 'UP' ? currentIndex - 1 : currentIndex + 1;
                    if (targetIndex < 0 || targetIndex >= sorted.length) return p;

                    const [moved] = sorted.splice(currentIndex, 1);
                    sorted.splice(targetIndex, 0, moved);

                    const reindexed = sorted.map((item, idx) => ({
                      ...item,
                      orden: idx + 1,
                      datosTecnicos: {
                        ...(item.datosTecnicos || {}),
                        orden: idx + 1
                      }
                    }));
                    changedItems = reindexed;

                    return {
                      ...p,
                      elementosUnifilares: reindexed,
                      tableros: reindexed
                    };
                  } else {
                    const list = [...(p.inspeccionesSubestacion || p.subestaciones || [])];
                    const sorted = sortElementsByOrder(list);
                    const currentIndex = sorted.findIndex((item) => item.id === elementoId);
                    if (currentIndex === -1) return p;

                    const targetIndex = direccion === 'UP' ? currentIndex - 1 : currentIndex + 1;
                    if (targetIndex < 0 || targetIndex >= sorted.length) return p;

                    const [moved] = sorted.splice(currentIndex, 1);
                    sorted.splice(targetIndex, 0, moved);

                    const reindexed = sorted.map((item, idx) => ({
                      ...item,
                      orden: idx + 1,
                      datosTecnicos: {
                        ...(item.datosTecnicos || {}),
                        orden: idx + 1
                      }
                    }));
                    changedItems = reindexed;

                    return {
                      ...p,
                      inspeccionesSubestacion: reindexed,
                      subestaciones: reindexed
                    };
                  }
                })
              };
            } else {
              // Nivel de Empresa
              const list = [...(c.elementosUnifilares || [])];
              const sorted = sortElementsByOrder(list);
              const currentIndex = sorted.findIndex((item) => item.id === elementoId);
              if (currentIndex === -1) return c;

              const targetIndex = direccion === 'UP' ? currentIndex - 1 : currentIndex + 1;
              if (targetIndex < 0 || targetIndex >= sorted.length) return c;

              const [moved] = sorted.splice(currentIndex, 1);
              sorted.splice(targetIndex, 0, moved);

              const reindexed = sorted.map((item, idx) => ({
                ...item,
                orden: idx + 1,
                datosTecnicos: {
                  ...(item.datosTecnicos || {}),
                  orden: idx + 1
                }
              }));
              changedItems = reindexed;

              return {
                ...c,
                elementosUnifilares: reindexed
              };
            }
          });

          // Actualizar persistencia de elementos locales
          const updatedElementosLocales = (state.elementosLocales || []).map((loc) => {
            const match = changedItems.find((ci) => ci.id === loc.id);
            return match ? { ...loc, orden: match.orden, datosTecnicos: { ...(loc.datosTecnicos || {}), orden: match.orden } } : loc;
          });

          return {
            companies: updatedCompanies,
            elementosLocales: updatedElementosLocales
          };
        });

        // Persistir cambio de orden hacia el backend o syncQueue
        if (changedItems.length > 0) {
          const movedItem = changedItems.find((ci) => ci.id === elementoId);
          const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
          const { token } = get();
          const hasActiveSession = Boolean(token && token !== 'mock-offline-token');

          for (const item of changedItems) {
            const qTipo = tipoColeccion === 'UNIFILAR' ? 'ELEMENTO_UNIFILAR' : 'SUBESTACION';
            const compId = companyId || item.empresaId || item.companyId || null;
            if (!isOnline || !hasActiveSession || tipoColeccion !== 'UNIFILAR') {
              get().enqueueOfflineItem?.(qTipo, compId, item);
            }
          }

          if (isOnline && hasActiveSession && tipoColeccion === 'UNIFILAR' && movedItem) {
            scheduleDebouncedElementoSync(get, movedItem.id, proyectoId, movedItem);
          }
        }
      },

      reordenarColeccion: (companyId, proyectoId, orderedIds = [], tipoColeccion = 'UNIFILAR') => {
        if (!Array.isArray(orderedIds) || orderedIds.length === 0) return;
        let changedItems = [];

        set((state) => {
          const updatedCompanies = state.companies.map((c) => {
            if (companyId && c.id !== companyId) return c;

            if (proyectoId) {
              return {
                ...c,
                proyectos: (c.proyectos || []).map((p) => {
                  if (p.id !== proyectoId) return p;

                  if (tipoColeccion === 'UNIFILAR') {
                    const list = [...(p.elementosUnifilares || p.tableros || [])];
                    const reindexed = list.map((item) => {
                      const idx = orderedIds.indexOf(item.id);
                      const newOrd = idx !== -1 ? idx + 1 : (item.orden || 9999);
                      return {
                        ...item,
                        orden: newOrd,
                        datosTecnicos: {
                          ...(item.datosTecnicos || {}),
                          orden: newOrd
                        }
                      };
                    });
                    const sorted = sortElementsByOrder(reindexed);
                    changedItems = sorted;
                    return {
                      ...p,
                      elementosUnifilares: sorted,
                      tableros: sorted
                    };
                  } else {
                    const list = [...(p.inspeccionesSubestacion || p.subestaciones || [])];
                    const reindexed = list.map((item) => {
                      const idx = orderedIds.indexOf(item.id);
                      const newOrd = idx !== -1 ? idx + 1 : (item.orden || 9999);
                      return {
                        ...item,
                        orden: newOrd,
                        datosTecnicos: {
                          ...(item.datosTecnicos || {}),
                          orden: newOrd
                        }
                      };
                    });
                    const sorted = sortElementsByOrder(reindexed);
                    changedItems = sorted;
                    return {
                      ...p,
                      inspeccionesSubestacion: sorted,
                      subestaciones: sorted
                    };
                  }
                })
              };
            } else {
              const list = [...(c.elementosUnifilares || [])];
              const reindexed = list.map((item) => {
                const idx = orderedIds.indexOf(item.id);
                const newOrd = idx !== -1 ? idx + 1 : (item.orden || 9999);
                return {
                  ...item,
                  orden: newOrd,
                  datosTecnicos: {
                    ...(item.datosTecnicos || {}),
                    orden: newOrd
                  }
                };
              });
              const sorted = sortElementsByOrder(reindexed);
              changedItems = sorted;
              return {
                ...c,
                elementosUnifilares: sorted
              };
            }
          });

          // Actualizar persistencia de elementos locales
          const updatedElementosLocales = (state.elementosLocales || []).map((loc) => {
            const match = changedItems.find((ci) => ci.id === loc.id);
            return match ? { ...loc, orden: match.orden, datosTecnicos: { ...(loc.datosTecnicos || {}), orden: match.orden } } : loc;
          });

          return {
            companies: updatedCompanies,
            elementosLocales: updatedElementosLocales
          };
        });

        // Persistir cambio de orden hacia el backend o syncQueue
        if (changedItems.length > 0) {
          const movedItem = changedItems.find((ci) => ci.id === elementoId);
          const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
          const { token } = get();
          const hasActiveSession = Boolean(token && token !== 'mock-offline-token');

          for (const item of changedItems) {
            const qTipo = tipoColeccion === 'UNIFILAR' ? 'ELEMENTO_UNIFILAR' : 'SUBESTACION';
            const compId = companyId || item.empresaId || item.companyId || null;
            if (!isOnline || !hasActiveSession || tipoColeccion !== 'UNIFILAR') {
              get().enqueueOfflineItem?.(qTipo, compId, item);
            }
          }

          if (isOnline && hasActiveSession && tipoColeccion === 'UNIFILAR' && movedItem) {
            scheduleDebouncedElementoSync(get, movedItem.id, proyectoId, movedItem);
          }
        }
      },

      removeFromQueue: (id) => {
        if (!id) return;
        set((state) => ({
          syncQueue: (state.syncQueue || []).filter((item) => item.id !== id && item.payload?.id !== id),
          proyectosLocales: (state.proyectosLocales || []).filter((p) => p.id !== id),
          elementosLocales: (state.elementosLocales || []).filter((e) => e.id !== id),
          subestacionesLocales: (state.subestacionesLocales || []).filter((s) => s.id !== id),
          puntosMedicionLocales: (state.puntosMedicionLocales || []).filter((p) => p.id !== id),
          ccmLocales: (state.ccmLocales || []).filter((c) => c.id !== id)
        }));
      },

      removeBatchFromQueue: (ids = []) => {
        if (!Array.isArray(ids) || ids.length === 0) return;
        const idSet = new Set(ids.filter(Boolean));
        if (idSet.size === 0) return;
        set((state) => ({
          syncQueue: (state.syncQueue || []).filter((item) => !idSet.has(item.id) && (!item.payload?.id || !idSet.has(item.payload.id))),
          proyectosLocales: (state.proyectosLocales || []).filter((p) => !idSet.has(p.id)),
          elementosLocales: (state.elementosLocales || []).filter((e) => !idSet.has(e.id)),
          subestacionesLocales: (state.subestacionesLocales || []).filter((s) => !idSet.has(s.id)),
          puntosMedicionLocales: (state.puntosMedicionLocales || []).filter((p) => !idSet.has(p.id)),
          ccmLocales: (state.ccmLocales || []).filter((c) => !idSet.has(c.id))
        }));
      },

      markQueueItemError: (id, errorMessage) => {
        if (!id) return;
        set((state) => ({
          syncQueue: (state.syncQueue || []).map((item) => {
            if (item.id === id || item.payload?.id === id) {
              return {
                ...item,
                syncError: errorMessage || 'Error al sincronizar con el servidor',
                syncFailedAt: Date.now(),
                retryCount: (item.retryCount || 0) + 1
              };
            }
            return item;
          })
        }));
      },

      clearQueueItemError: (id) => {
        if (!id) return;
        set((state) => ({
          syncQueue: (state.syncQueue || []).map((item) => {
            if (item.id === id || item.payload?.id === id) {
              const copy = { ...item };
              delete copy.syncError;
              delete copy.syncFailedAt;
              return copy;
            }
            return item;
          })
        }));
      },

      clearAllQueueErrors: () => {
        set((state) => ({
          syncQueue: (state.syncQueue || []).map((item) => {
            const copy = { ...item };
            delete copy.syncError;
            delete copy.syncFailedAt;
            return copy;
          })
        }));
      },

      enqueueOfflineItem: (tipo, companyId, payload, syncError = null) => {
        if (!payload || !payload.id) return;
        const cleanPayload = stripAllImagePayloads(payload);
        set((state) => {
          const currentQueue = Array.isArray(state.syncQueue) ? [...state.syncQueue] : [];
          const idx = currentQueue.findIndex((item) => item.id === cleanPayload.id || item.payload?.id === cleanPayload.id);
          const mergedPayload = idx >= 0
            ? stripAllImagePayloads(mergePayloadDeep(currentQueue[idx]?.payload, cleanPayload))
            : cleanPayload;
          const queueItem = {
            id: cleanPayload.id,
            tipo: tipo || 'ELEMENTO_UNIFILAR',
            companyId: companyId || mergedPayload.empresaId || mergedPayload.companyId || null,
            payload: mergedPayload,
            ...(syncError ? { syncError, syncFailedAt: Date.now() } : {})
          };

          if (idx >= 0) {
            currentQueue[idx] = { ...currentQueue[idx], ...queueItem };
          } else {
            currentQueue.push(queueItem);
          }

          return { syncQueue: currentQueue };
        });
      },

      enviarElementoDirectoServidor: async (empresaId, rawElemento) => {
        if (!rawElemento) return { ok: false, error: 'Elemento no proporcionado' };
        const elemento = stripAllImagePayloads(rawElemento);
        const { token, showToast } = get();

        // Si NO hay conexión a internet (navigator.onLine === false) o no hay sesión activa, retener en cola local
        if ((typeof navigator !== 'undefined' && !navigator.onLine) || !token || token === 'mock-offline-token') {
          get().enqueueOfflineItem('ELEMENTO_UNIFILAR', empresaId, elemento);
          showToast?.('Sin conexión a internet: Elemento retenido localmente en la tablet para sincronizar al volver en línea.', 'info');
          return { ok: false, offline: true, error: 'Dispositivo sin conexión a internet' };
        }

        try {
          // Activar retroalimentación de guardado en tiempo real
          set({
            isSyncing: true,
            syncProgress: {
              current: 1,
              total: 1,
              message: `Guardando "${elemento.nombre || elemento.codigo}" en el servidor...`,
              currentName: elemento.nombre || elemento.codigo,
              successCount: 0,
              errorCount: 0
            }
          });

          const res = await enviarElementoDirectoAlServidor(empresaId, elemento, token);
          if (res.ok) {
            // Confirmación exitosa en base de datos PostgreSQL: asegurar que NO quede en cola local
            get().removeFromQueue(elemento.id);
            const record = res.data;
            if (record) {
              const returnedFoto = record.foto || res.foto;
              const normalizedFoto = returnedFoto
                ? ((returnedFoto.startsWith('data:') || returnedFoto.startsWith('http://') || returnedFoto.startsWith('https://') || returnedFoto.startsWith('blob:'))
                    ? returnedFoto
                    : `${API_BASE_URL}${returnedFoto}`)
                : null;

              set((state) => ({
                companies: state.companies.map((c) => ({
                  ...c,
                  proyectos: (c.proyectos || []).map((p) => {
                    if (p.id === elemento.proyectoId) {
                      return {
                        ...p,
                        elementosUnifilares: (p.elementosUnifilares || p.tableros || []).map((el) => {
                          if (el.id === elemento.id) {
                            return { ...el, foto: normalizedFoto || el.foto, fotoBlob: null, version: record.version || 1 };
                          }
                          return el;
                        })
                      };
                    }
                    return p;
                  }),
                  elementosUnifilares: (c.elementosUnifilares || []).map((el) => {
                    if (el.id === elemento.id) {
                      return { ...el, foto: normalizedFoto || el.foto, fotoBlob: null, version: record.version || 1 };
                    }
                    return el;
                  })
                })),
                elementosLocales: (state.elementosLocales || []).map((el) => {
                  if (el.id === elemento.id) {
                    return { ...el, foto: normalizedFoto || el.foto, fotoBlob: null, version: record.version || 1 };
                  }
                  return el;
                })
              }));
            }
            console.log(`[ONLINE REALTIME] ✅ Elemento ${elemento.id} persistido exitosamente en PostgreSQL en tiempo real.`);
            return { ok: true, data: record };
          } else {
            // FALLBACK OBLIGATORIO A SYNCQUEUE: Encolar la mutación con merge profundo para evitar pérdida de datos al hacer F5
            const errorMsg = res.error || `HTTP ${res.status || 'ERROR'}`;
            const latestEl = findElementoInStore(get(), elemento.id, elemento.proyectoId) || elemento;
            get().enqueueOfflineItem('ELEMENTO_UNIFILAR', empresaId, latestEl, errorMsg);
            console.warn(`[ONLINE REALTIME] ⚠️ Servidor devolvió error (${errorMsg}) para elemento ${elemento.id}. Respaldado en syncQueue.`);
            showToast?.(`Error en el servidor al guardar "${elemento.nombre || elemento.codigo}": ${errorMsg}. Respaldado en cola local.`, 'warning');
            return { ok: false, queuedOffline: true, error: errorMsg };
          }
        } catch (err) {
          // FALLBACK OBLIGATORIO A SYNCQUEUE EN TIMEOUT O ERROR DE RED: Evita pérdida de datos al hacer F5
          const errorMsg = err.message || 'Error de comunicación con el servidor';
          const latestEl = findElementoInStore(get(), elemento.id, elemento.proyectoId) || elemento;
          get().enqueueOfflineItem('ELEMENTO_UNIFILAR', empresaId, latestEl, errorMsg);
          console.warn(`[ONLINE REALTIME] ⚠️ Error de red o timeout (${errorMsg}) para elemento ${elemento.id}. Respaldado en syncQueue.`);
          showToast?.(`Conexión inestable al guardar "${elemento.nombre || elemento.codigo}": ${errorMsg}. Respaldado en cola local.`, 'warning');
          return { ok: false, queuedOffline: true, error: errorMsg };
        } finally {
          // RESET INMEDIATO: Limpiar flags de sincronización al concluir el envío directo
          set({
            isSyncing: false,
            syncProgress: null
          });
        }
      },

      clearSyncQueue: () => {
        set({
          syncQueue: [],
          proyectosLocales: [],
          elementosLocales: [],
          subestacionesLocales: [],
          puntosMedicionLocales: [],
          ccmLocales: [],
          syncProgress: null,
          isSyncing: false
        });
      },

      processSyncQueue: async () => {
        const { syncQueue, token } = get();
        if (!token || syncQueue.length === 0) return { success: true };

        try {
          const res = await fetch(`${API_BASE_URL}/api/sync/push`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token && token !== 'mock-offline-token' ? { 'Authorization': `Bearer ${token}` } : {})
            },
            body: JSON.stringify({ mutations: (Array.isArray(syncQueue) ? syncQueue : []).map(item => ({
              entity: item?.tipo,
              id: item?.id,
              operation: item?.operation || 'UPSERT',
              data: item?.payload
            })) })
          });

          if (res.status === 401 || res.status === 403) {
            get().handleAuthError(res.status);
            return { success: false, error: 'Token expirado' };
          }

          const data = await res.json();
          if (res.ok && data.ok) {
            // Conservar en cola los ítems que hayan reportado conflicto
            const conflictIds = new Set(
              (Array.isArray(data.conflicts) ? data.conflicts : []).map((c) => c?.id).filter(Boolean)
            );
            set((state) => ({
              syncQueue: conflictIds.size > 0
                ? (state.syncQueue || []).filter((q) => conflictIds.has(q?.id) || conflictIds.has(q?.payload?.id))
                : []
            }));
            if (conflictIds.size === 0) {
              get().pullInitialData();
            }
            get().showToast('Sincronización completada exitosamente', 'success');
            return { success: true };
          } else {
            get().showToast('Error en sincronización: ' + (data.error || 'unknown'), 'error');
            return { success: false, error: data.error };
          }
        } catch (e) {
          console.error('Error al procesar cola de sincronización:', e);
          get().showToast('Error de red al sincronizar', 'error');
          return { success: false, error: e.message };
        }
      },

      syncPendingData: async () => {
        return get().processSyncQueue();
      },

      backupDatos: async (tipo = 'completo') => {
        const { user, token } = get();
        if (!user) return { success: false, error: 'No ha iniciado sesión' };
        
        try {
          get().showToast('Generando backup ' + tipo + '...', 'info');
          
          const res = await fetch(`${API_BASE_URL}/api/sync/backup/local`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token && token !== 'mock-offline-token' ? { 'Authorization': `Bearer ${token}` } : {})
            },
            body: JSON.stringify({ tipo })
          });
          
          const data = await res.json();
          if ((data.ok || data.success) && data.archivo) {
            // Guardar archivo en localforage
            const nombreArchivo = `backup-${tipo}-${Date.now()}.json`;
            await localforage.setItem(nombreArchivo, data.archivo);
            get().showToast('Backup guardado localmente como: ' + nombreArchivo, 'success');
            return { success: true, filename: nombreArchivo };
          } else {
            get().showToast('Error generando backup: ' + (data.error || 'unknown'), 'error');
            return { success: false, error: data.error };
          }
        } catch (e) {
          console.error('Error al generar backup:', e);
          get().showToast('Error de red al generar backup', 'error');
          return { success: false, error: e.message };
        }
      },

      respaldarEnLocalStorage: async (nombre, contenidoJson) => {
        // Guardar backup codificado en localforage
        const contenidoBlob = typeof contenidoJson === 'string' 
          ? contenidoJson 
          : JSON.stringify(contenidoJson, null, 2);
        
        await localforage.setItem(nombre, contenidoBlob);
        get().showToast('Backup guardado en almacenamiento local', 'success');
      },

      obtenerRespaldoLocal: async (nombre) => {
        return await localforage.getItem(nombre);
      },

      listarBackupsLocales: async () => {
        const keys = await localforage.keys();
        const backups = [];
        
        for (const key of keys) {
          if (key.startsWith('backup-')) {
            const data = await localforage.getItem(key);
            backups.push({
              nombre: key,
              fecha: key.replace('backup-', '').replace('.json', '') || 'desconocida',
              size: typeof data === 'string' ? data.length : 0
            });
          }
        }
        
        return backups;
      },

      eliminarBackupLocal: async (nombre) => {
        await localforage.removeItem(nombre);
      },
      
      messages: [],
      sendMessage: async (receiverId, text) => {
        const { user, token } = get();
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
            headers: {
              'Content-Type': 'application/json',
              ...(token && token !== 'mock-offline-token' ? { 'Authorization': `Bearer ${token}` } : {})
            },
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
        const { user, token, messages } = get();
        if (!user) return;
        const hasUnread = (messages || []).some(
          (m) => m.senderId === senderId && m.receiverId === user.id && !m.read
        );
        if (!hasUnread) return;

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
            headers: {
              'Content-Type': 'application/json',
              ...(token && token !== 'mock-offline-token' ? { 'Authorization': `Bearer ${token}` } : {})
            },
            body: JSON.stringify({ senderId, receiverId: user.id })
          });
        } catch (e) {
          console.error('Error marcando mensajes como leídos:', e);
        }
      },

      vincularJerarquia: (proyectoId, padreId, hijoId, datosEnlace = {}) => {
        const cleanParentId = sanitizeParentId(padreId, hijoId);
        if (!cleanParentId || !hijoId) return;

        const { byId: allElementsMap } = collectProjectElementsInStore(get(), proyectoId);
        const padreEl = allElementsMap.get(String(cleanParentId)) || null;
        const hijoEl = allElementsMap.get(String(hijoId)) || null;
        const nombrePadre = padreEl ? getCleanElementLabel(padreEl) : '';
        const tipoPadre = padreEl ? getElementTipoUpper(padreEl) : '';
        const nombreHijo = hijoEl ? getCleanElementLabel(hijoEl) : '';

        const cOrigen = datosEnlace.circuitoOrigen ? String(datosEnlace.circuitoOrigen).trim().toUpperCase() : 'SALIDA';
        const cCalibre = datosEnlace.calibreConductor ? String(datosEnlace.calibreConductor).trim().toUpperCase() : '';
        const cMarca = datosEnlace.breakerMarca ? String(datosEnlace.breakerMarca).trim().toUpperCase() : '';
        const cTipo = datosEnlace.breakerTipo ? String(datosEnlace.breakerTipo).trim().toUpperCase() : '';

        const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
        const { token } = get();
        const hasActiveSession = Boolean(token && token !== 'mock-offline-token');
        const modifiedMap = new Map();

        set((state) => {
          const mapFn = (e, qTipo, compId, projId) => {
            if (!e || !e.id) return e;
            const eIdStr = String(e.id);
            if (eIdStr === String(hijoId)) {
              let nextEl;
              if (isTransferElement(e)) {
                const res = applyUpstreamLinkToElement(e, cleanParentId, nombrePadre, tipoPadre);
                nextEl = {
                  ...res.nextEl,
                  circuitoOrigen: cOrigen || e.circuitoOrigen,
                  calibreConductor: cCalibre || e.calibreConductor,
                  breakerAmperaje: datosEnlace.breakerAmperaje || e.breakerAmperaje,
                  breakerMarca: cMarca || e.breakerMarca,
                  breakerTipo: cTipo || e.breakerTipo,
                  estadoVinculo: 'ACTIVO'
                };
              } else {
                const dt = parseDatosTecnicosSafe(e.datosTecnicos);
                nextEl = {
                  ...e,
                  alimentadoPorId: cleanParentId,
                  alimentadoPor: nombrePadre ? (datosEnlace.circuitoOrigen ? `${nombrePadre} (${cOrigen})` : nombrePadre) : e.alimentadoPor,
                  circuitoOrigen: cOrigen || e.circuitoOrigen,
                  calibreConductor: cCalibre || e.calibreConductor,
                  breakerAmperaje: datosEnlace.breakerAmperaje || e.breakerAmperaje,
                  breakerMarca: cMarca || e.breakerMarca,
                  breakerTipo: cTipo || e.breakerTipo,
                  estadoVinculo: 'ACTIVO',
                  datosTecnicos: {
                    ...dt,
                    alimentadoPorId: cleanParentId
                  }
                };
              }
              modifiedMap.set(eIdStr, {
                tipo: qTipo,
                item: { ...nextEl, empresaId: nextEl.empresaId || nextEl.companyId || compId || null, proyectoId: nextEl.proyectoId || projId || proyectoId }
              });
              return nextEl;
            }
            if (eIdStr === String(cleanParentId)) {
              const res = applyDownstreamLinkToParent(e, hijoId, nombreHijo, allElementsMap);
              if (res.changed) {
                modifiedMap.set(eIdStr, {
                  tipo: qTipo,
                  item: { ...res.nextEl, empresaId: res.nextEl.empresaId || res.nextEl.companyId || compId || null, proyectoId: res.nextEl.proyectoId || projId || proyectoId }
                });
                return res.nextEl;
              }
            }
            return e;
          };

          const mapped = applyHierarchyMapperAcrossState(state, proyectoId, null, mapFn);
          let nextQueue = Array.isArray(state.syncQueue) ? state.syncQueue : [];
          if (!isOnline || !hasActiveSession) {
            nextQueue = upsertSyncQueueEntries(
              nextQueue,
              Array.from(modifiedMap.entries()).map(([mid, entry]) => ({
                id: mid,
                tipo: entry.tipo,
                companyId: entry.item.empresaId || entry.item.companyId || (state.companies[0]?.id || null),
                payload: entry.item
              }))
            );
          }

          return {
            companies: mapped.updatedCompanies,
            elementosLocales: mapped.updatedElementosLocales,
            puntosMedicionLocales: mapped.updatedPuntosLocales,
            ccmLocales: mapped.updatedCcmLocales,
            subestacionesLocales: mapped.updatedSubestacionesLocales,
            syncQueue: nextQueue
          };
        });

        if (isOnline && hasActiveSession) {
          modifiedMap.forEach((entry, mid) => {
            if (entry.tipo === 'ELEMENTO_UNIFILAR') {
              scheduleDebouncedElementoSync(get, mid, proyectoId, entry.item);
            }
          });
        }
      },

      desvincularJerarquia: (proyectoId, hijoId) => {
        if (!hijoId) return;
        const { list: allProjectElements, byId: allElementsMap } = collectProjectElementsInStore(get(), proyectoId);
        const hijoEl = allElementsMap.get(String(hijoId)) || findElementoInStore(get(), hijoId, proyectoId);
        const prevParentIds = new Set(hijoEl ? extractElementParentIds(hijoEl, allProjectElements) : []);
        const nombreHijo = hijoEl ? getCleanElementLabel(hijoEl) : '';

        const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
        const { token } = get();
        const hasActiveSession = Boolean(token && token !== 'mock-offline-token');
        const modifiedMap = new Map();

        set((state) => {
          const mapFn = (e, qTipo, compId, projId) => {
            if (!e || !e.id) return e;
            const eIdStr = String(e.id);
            if (eIdStr === String(hijoId)) {
              const dt = { ...(parseDatosTecnicosSafe(e.datosTecnicos)) };
              delete dt.alimentadoPorId;
              delete dt.alimentadorId;
              if (isTransferElement(e)) {
                dt.fuenteNormalId = null;
                dt.fuenteNormalNombre = '';
                dt.fuenteEmergenciaId = null;
                dt.fuenteEmergenciaNombre = '';
                dt.alimentadoPorIds = [];
              }
              const nextEl = {
                ...e,
                alimentadoPorId: null,
                alimentadoPor: null,
                circuitoOrigen: null,
                estadoVinculo: 'ACTIVO',
                datosTecnicos: dt
              };
              modifiedMap.set(eIdStr, {
                tipo: qTipo,
                item: { ...nextEl, empresaId: nextEl.empresaId || nextEl.companyId || compId || null, proyectoId: nextEl.proyectoId || projId || proyectoId }
              });
              return nextEl;
            }
            if (prevParentIds.has(eIdStr)) {
              const res = removeDownstreamLinkFromParent(e, hijoId, nombreHijo, allElementsMap);
              if (res.changed) {
                modifiedMap.set(eIdStr, {
                  tipo: qTipo,
                  item: { ...res.nextEl, empresaId: res.nextEl.empresaId || res.nextEl.companyId || compId || null, proyectoId: res.nextEl.proyectoId || projId || proyectoId }
                });
                return res.nextEl;
              }
            }
            return e;
          };

          const mapped = applyHierarchyMapperAcrossState(state, proyectoId, null, mapFn);
          let nextQueue = Array.isArray(state.syncQueue) ? state.syncQueue : [];
          if (!isOnline || !hasActiveSession) {
            nextQueue = upsertSyncQueueEntries(
              nextQueue,
              Array.from(modifiedMap.entries()).map(([mid, entry]) => ({
                id: mid,
                tipo: entry.tipo,
                companyId: entry.item.empresaId || entry.item.companyId || (state.companies[0]?.id || null),
                payload: entry.item
              }))
            );
          }

          return {
            companies: mapped.updatedCompanies,
            elementosLocales: mapped.updatedElementosLocales,
            puntosMedicionLocales: mapped.updatedPuntosLocales,
            ccmLocales: mapped.updatedCcmLocales,
            subestacionesLocales: mapped.updatedSubestacionesLocales,
            syncQueue: nextQueue
          };
        });

        if (isOnline && hasActiveSession) {
          modifiedMap.forEach((entry, mid) => {
            if (entry.tipo === 'ELEMENTO_UNIFILAR') {
              scheduleDebouncedElementoSync(get, mid, proyectoId, entry.item);
            }
          });
        }
      },

      crearElementoProvisional: (proyectoId, datosProvisional = {}) => {
        const state = get();
        const tipo = datosProvisional.tipoElemento || 'TABLERO';
        const codigo = datosProvisional.codigo || getNextElementId(tipo, proyectoId, state);
        const uuidId = datosProvisional.id && datosProvisional.id.length > 10 ? datosProvisional.id : crypto.randomUUID();

        const provisionalObj = {
          id: uuidId,
          codigo: codigo,
          nombre: datosProvisional.nombre || `RESERVA (${codigo})`,
          tipoElemento: tipo,
          ubicacion: 'RESERVA (Pendiente por Crear)',
          alimentadoPor: datosProvisional.circuitoOrigen ? `Circuito ${datosProvisional.circuitoOrigen}` : null,
          circuitoOrigen: datosProvisional.circuitoOrigen || null,
          estadoVinculo: 'PENDIENTE_CREAR',
          observacionesGenerales: 'Nodo registrado en estado provisional como Reserva activa.',
          datosTecnicos: {
            ...(datosProvisional.datosTecnicos || {}),
            codigo: codigo
          },
          proyectoId
        };

        get().addElementoUnifilar(proyectoId, provisionalObj);
        return provisionalObj;
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
        puntosMedicionLocales: state.puntosMedicionLocales || [],
        ccmLocales: state.ccmLocales || [],
        conflictosCircuitos: state.conflictosCircuitos || [],
        syncQueue: Array.isArray(state.syncQueue) ? state.syncQueue : [],
        deletedCompanyIds: Array.isArray(state.deletedCompanyIds) ? state.deletedCompanyIds : []
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          if (!Array.isArray(state.syncQueue)) state.syncQueue = [];
          if (!Array.isArray(state.companies)) state.companies = [];
          if (!Array.isArray(state.elementosLocales)) state.elementosLocales = [];

          // Limpiar automáticamente cualquier fotoBlob o imagen Base64 pesada en syncQueue, elementosLocales y companies
          // para destrabar elementos pendientes con error 413 FUNCTION_PAYLOAD_TOO_LARGE sin perder datos eléctricos
          state.syncQueue = state.syncQueue.map((item) => {
            if (!item) return item;
            const cleanedItem = {
              ...item,
              payload: stripAllImagePayloads(item.payload || {})
            };
            delete cleanedItem.fotoBlob;
            delete cleanedItem.syncError;
            delete cleanedItem.syncFailedAt;
            return cleanedItem;
          });
          state.elementosLocales = state.elementosLocales.map((el) => stripAllImagePayloads(el));
          state.companies = state.companies.map((c) => {
            const stripped = stripAllImagePayloads(c);
            return {
              ...stripped,
              proyectos: (stripped?.proyectos || []).map((p) => ({
                ...p,
                elementosUnifilares: hydrateProjectHierarchyLinks(p.elementosUnifilares || p.tableros || [])
              }))
            };
          });

          // Depurar posibles datos mock residuales ('c-1', 'c-2') de la caché local (IndexedDB)
          const legacyMockCompanyIds = new Set(['c-1', 'c-2']);
          const legacyMockProjectIds = new Set(['p-1']);
          if (state.companies.some((c) => c && legacyMockCompanyIds.has(c.id))) {
            state.companies = state.companies.filter((c) => c && !legacyMockCompanyIds.has(c.id));
            state.proyectosLocales = (state.proyectosLocales || []).filter(
              (p) => p && !legacyMockCompanyIds.has(p.companyId) && !legacyMockCompanyIds.has(p.empresaId) && !legacyMockProjectIds.has(p.id)
            );
            state.elementosLocales = (state.elementosLocales || []).filter(
              (e) => e && !legacyMockCompanyIds.has(e.companyId) && !legacyMockCompanyIds.has(e.empresaId) && !legacyMockProjectIds.has(e.proyectoId)
            );
          }

          // Sincronizar token y usuario con localStorage para evitar tokens antiguos rehidratados de IndexedDB tras logout
          const currentLocalToken = getInitialToken();
          const currentLocalUser = getInitialUser();
          state.token = currentLocalToken || null;
          state.user = currentLocalUser || null;

          if (state.token && state.token !== 'mock-offline-token' && typeof navigator !== 'undefined' && navigator.onLine) {
            // Prioridad Local-First: Solo descargar datos del servidor tras rehidratar si NO hay mutaciones pendientes locales en la cola
            if (state.syncQueue.length === 0) {
              Promise.resolve(state.pullInitialData?.()).catch(() => {});
            }
            if (state.user && state.user.role === 'ADMIN') {
              Promise.resolve(state.fetchUsersList?.()).catch(() => {});
            }
          }
        }
      }
    }
  )
);

export default useStore;
