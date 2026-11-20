import React, { useState, useEffect, useRef, useMemo } from 'react';
import { API_BASE_URL } from '../utils/api';
import useStore, { getSimpleElementCode, assignSimpleHierarchyCodes, cleanElementName } from '../store/useStore';
import {
  Search,
  ChevronDown,
  Zap,
  Building2,
  Cpu,
  Layers,
  Activity,
  X,
  Check,
  CheckSquare,
  Square,
  AlertCircle,
  Radio,
  ArrowRightLeft,
  Flame,
  Plus,
  Edit3,
  Eye
} from 'lucide-react';
import ElementQuickPreviewModal from './ElementQuickPreviewModal';

/**
 * Compatibilidad de exportación: arrays vacíos para eliminar fuentes genéricas / SEN
 * que saturaban la interfaz sin pertenecer a la base de datos real del proyecto.
 */
export const FUENTES_RED_PRIMARIAS = [];
export const FUENTES_AUTONOMAS_PRIMARIAS = [];

/**
 * Opción fija e inmutable de suministro eléctrico externo nacional (CORPOELEC).
 */
export const CORPOELEC_OPTION = Object.freeze({
  id: 'CORPOELEC',
  nombre: 'CORPOELEC',
  codigo: 'corpoelec',
  tipoElemento: 'RED_PUBLICA',
  categoria: 'Red Eléctrica Nacional',
  nivelTension: 'Red Pública Nacional',
  ubicacion: 'Compañía Eléctrica Nacional (CORPOELEC)',
  isCorpoelec: true,
  isFixedSource: true
});

/**
 * Retorna el icono temático y colores según el tipo de elemento eléctrico
 */
const getIconAndColor = (tipo) => {
  switch (tipo) {
    case 'RED_PUBLICA':
      return { icon: Zap, color: 'text-sky-400 bg-sky-500/15 border-sky-500/40' };
    case 'SUBESTACION':
      return { icon: Building2, color: 'text-rose-400 bg-rose-500/10 border-rose-500/30' };
    case 'TRANSFORMADOR':
      return { icon: Zap, color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' };
    case 'CCM':
      return { icon: Cpu, color: 'text-purple-400 bg-purple-500/10 border-purple-500/30' };
    case 'TABLERO':
      return { icon: Layers, color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30' };
    case 'GENERADOR':
      return { icon: Flame, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' };
    case 'TRANSFER':
      return { icon: ArrowRightLeft, color: 'text-teal-400 bg-teal-500/10 border-teal-500/30' };
    case 'BANCO_CONDENSADOR':
      return { icon: Zap, color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' };
    case 'PUNTO_MEDICION':
      return { icon: Radio, color: 'text-blue-400 bg-blue-500/10 border-blue-500/30' };
    case 'ALIMENTADOR':
      return { icon: Zap, color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30' };
    case 'MANUAL':
      return { icon: Edit3, color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' };
    default:
      return { icon: Zap, color: 'text-slate-400 bg-slate-500/10 border-slate-500/30' };
  }
};

/**
 * Extrae EXCLUSIVAMENTE los elementos pertenecientes al proyecto actual.
 * Aplica aislamiento estricto: nunca mezcla elementos de otros proyectos o empresas.
 */
const extractStoreProjectElements = (projId, companyId = null) => {
  const storeState = useStore.getState();
  const list = [];
  const seenIds = new Set();

  const addIfNew = (item, defaultTipo = 'TABLERO') => {
    if (!item || !item.id) return;
    const key = String(item.id);
    if (seenIds.has(key)) return;
    seenIds.add(key);

    const tipo = item.tipoElemento || item.tipo || defaultTipo;
    const rawCodigo = item.codigo || item.datosTecnicos?.codigo || null;
    const cleanedNombre = cleanElementName(item.nombre, item.id, rawCodigo).toUpperCase().trim();

    list.push({
      id: item.id,
      codigo: rawCodigo,
      orden: item.orden ?? item.datosTecnicos?.orden ?? null,
      createdAt: item.createdAt || null,
      nombre: cleanedNombre || tipo,
      tipoElemento: tipo,
      ubicacion: item.ubicacion || item.plantaInstalacion || 'Ubicación registrada',
      datosTecnicos: item.datosTecnicos || item.parametrosElectricos || {},
      nivelTension: item.nivelTension || item.tensionNominal || item.tension || null
    });
  };

  // REGLA ESTRICTA DE AISLAMIENTO:
  // Si hay proyectoId, extraer ÚNICA Y EXCLUSIVAMENTE los elementos del proyecto en curso.
  if (projId) {
    const companies = storeState.companies || [];
    for (const c of companies) {
      if (Array.isArray(c.proyectos)) {
        const targetProj = c.proyectos.find(p => String(p.id) === String(projId));
        if (targetProj) {
          (targetProj.elementosUnifilares || []).forEach(e => addIfNew(e, e.tipoElemento || 'TABLERO'));
          (targetProj.tableros || []).forEach(t => addIfNew(t, 'TABLERO'));
          (targetProj.subestaciones || targetProj.inspeccionesSubestacion || []).forEach(s => addIfNew(s, 'SUBESTACION'));
          (targetProj.puntosMedicion || []).forEach(pm => addIfNew(pm, 'PUNTO_MEDICION'));
          (targetProj.ccmList || targetProj.ccms || []).forEach(ccm => addIfNew(ccm, 'CCM'));
          (targetProj.alimentadores || []).forEach(a => addIfNew(a, 'ALIMENTADOR'));
          break; // Detener búsqueda para impedir cualquier fuga entre proyectos
        }
      }
    }

    // Elementos guardados localmente u offline que pertenezcan estrictamente a este proyectoId
    (storeState.elementosLocales || []).forEach(e => {
      if (String(e.proyectoId) === String(projId)) addIfNew(e, e.tipoElemento || 'TABLERO');
    });
    (storeState.tablerosLocales || []).forEach(t => {
      if (String(t.proyectoId) === String(projId)) addIfNew(t, 'TABLERO');
    });
    (storeState.subestacionesLocales || []).forEach(s => {
      if (String(s.proyectoId) === String(projId)) addIfNew(s, 'SUBESTACION');
    });
    (storeState.puntosMedicionLocales || []).forEach(pm => {
      if (String(pm.proyectoId) === String(projId)) addIfNew(pm, 'PUNTO_MEDICION');
    });
    (storeState.ccmLocales || []).forEach(ccm => {
      if (String(ccm.proyectoId) === String(projId)) addIfNew(ccm, 'CCM');
    });
    (storeState.alimentadoresLocales || []).forEach(a => {
      if (String(a.proyectoId) === String(projId)) addIfNew(a, 'ALIMENTADOR');
    });

    return list;
  }

  // Si no se suministra proyectoId (por ejemplo en vistas raíz de empresa), filtrar estrictamente por empresa sin mezclar otros proyectos
  if (companyId) {
    const companies = storeState.companies || [];
    const targetComp = companies.find(c => String(c.id) === String(companyId));
    if (targetComp && Array.isArray(targetComp.elementosUnifilares)) {
      targetComp.elementosUnifilares.forEach(e => {
        if (!e.proyectoId) addIfNew(e, e.tipoElemento || 'TABLERO');
      });
    }
  }

  return list;
};

/**
 * Componente Selector Dinámico e Inteligente de Jerarquía Eléctrica
 * Permite seleccionar nodos registrados en el proyecto actual o ingresar nombres manuales libres.
 */
export default function SelectorAlimentadorJerarquico({
  value = '',
  onChange,
  proyectoId,
  tableroActualId,
  elementosList = null,
  placeholder = 'Seleccionar equipo del proyecto o escribir manual...',
  disabled = false,
  label = 'Alimentado Por (Procedencia / Jerarquía)',
  className = '',
  allowQuickCreate = false,
  onQuickCreate = null,
  multiple = false,
  tipoElementoActual = 'TABLERO',
  direccionRelacion = null,
  companyId = null
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [remoteItems, setRemoteItems] = useState([]);
  const [loading, setLoading] = useState(false);

  // Modo de Entrada Manual
  const [isManualMode, setIsManualMode] = useState(false);
  const [manualInput, setManualInput] = useState('');
  const [previewElement, setPreviewElement] = useState(null);

  const containerRef = useRef(null);
  const searchInputRef = useRef(null);
  const manualInputRef = useRef(null);

  // Determinar dirección de relación (ALIMENTADO_POR o ALIMENTA_A)
  const isAlimentaA = useMemo(() => {
    if (direccionRelacion) return direccionRelacion === 'ALIMENTA_A';
    const l = String(label || '').toLowerCase();
    const p = String(placeholder || '').toLowerCase();
    return l.includes('alimenta a') || l.includes('salidas') || l.includes('suministrados') || p.includes('secundari');
  }, [direccionRelacion, label, placeholder]);

  // Normalizador de categorías para agrupación visual
  const resolverCategoria = (tipo) => {
    switch (tipo) {
      case 'SUBESTACION': return 'Subestaciones';
      case 'TRANSFORMADOR': return 'Transformadores';
      case 'CCM': return 'Celdas y CCM';
      case 'TABLERO': return 'Tableros de Distribución';
      case 'BANCO_CONDENSADOR': return 'Bancos de Condensadores';
      case 'GENERADOR': return 'Generadores y Plantas Eléctricas';
      case 'TRANSFER': return 'Sistemas de Transferencia (ATS/MTS)';
      case 'PUNTO_MEDICION': return 'Puntos de Medición / Suministro';
      case 'ALIMENTADOR': return 'Alimentadores Dedicados';
      case 'MANUAL': return 'Entrada Manual';
      default: return 'Otros Equipos';
    }
  };

  const resolverNivelTension = (el) => {
    if (el.nivelTension) return String(el.nivelTension).trim();
    const tech = typeof el.datosTecnicos === 'string'
      ? (() => { try { return JSON.parse(el.datosTecnicos || '{}'); } catch { return {}; } })()
      : (el.datosTecnicos || {});

    if (el.tipoElemento === 'TRANSFORMADOR') {
      return tech.voltajeSecundario || tech.tensionSecundaria || tech.voltajePrimario || (tech.kva ? `${tech.kva} kVA` : 'N/D');
    }
    if (el.tipoElemento === 'SUBESTACION') {
      if (!el.nivelTension) return tech.nivelTension || 'Media/Alta Tensión';
      const str = String(el.nivelTension).trim();
      return (str.toLowerCase().includes('v') || str.toLowerCase().includes('kv')) ? str : `${str} kV`;
    }
    if (el.tipoElemento === 'TABLERO') {
      return tech.voltajeAcometida || tech.tension || (tech.voltaje?.va ? `${tech.voltaje.va} V` : '208/120 V');
    }
    if (el.tipoElemento === 'CCM') {
      return tech.tension || '480/277 V';
    }
    if (el.tipoElemento === 'BANCO_CONDENSADOR') {
      return tech.tensionNominal || (tech.potenciaReactivaTotal ? `${tech.potenciaReactivaTotal} kVAR` : 'Compensación Reactiva');
    }
    if (el.tipoElemento === 'PUNTO_MEDICION') {
      return tech.tensionNominal || tech.nivelTensionContrato || 'Acometida Red';
    }
    if (el.tipoElemento === 'GENERADOR') {
      return tech.voltajeGeneracion || tech.tension || (tech.kva ? `${tech.kva} kVA` : '480 / 208 V');
    }
    return tech.tension || tech.voltaje || 'N/D';
  };

  // Cargar datos remotos desde el backend si hay proyectoId (filtrado exclusivo de proyecto)
  useEffect(() => {
    if (!proyectoId) return;

    let isMounted = true;
    const fetchFeeders = async () => {
      try {
        setLoading(true);
        const token = useStore.getState().token || localStorage.getItem('token') || '';
        const url = `${API_BASE_URL}/api/jerarquia/alimentadores/${proyectoId}${tableroActualId ? `?excluirId=${tableroActualId}` : ''}`;
        const res = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        const contentType = res.headers.get('content-type') || '';
        if (res.ok && contentType.includes('application/json')) {
          const data = await res.json();
          if (isMounted && data.ok && Array.isArray(data.data)) {
            setRemoteItems(data.data);
          }
        }
      } catch (err) {
        // En offline continuamos con el store local del proyecto
        console.warn('Operando en modo local/offline para selector jerárquico:', err.message);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchFeeders();
    return () => { isMounted = false; };
  }, [proyectoId, tableroActualId]);

  // Consolidar lista completa aplicando aislamiento estricto por proyecto
  // y asignando identificadores simples correlativos en minúsculas (med-1, tra-1, tab-2...).
  const items = useMemo(() => {
    const combinedMap = new Map();

    const mergeIntoMap = (el, defaultTipo = 'TABLERO', fromStore = false) => {
      if (!el || !el.id) return;
      const prev = combinedMap.get(el.id) || {};
      const tipo = el.tipoElemento || el.tipo || prev.tipoElemento || defaultTipo;
      const incomingCode = el.simpleCode || el.codigo || el.datosTecnicos?.codigo || null;
      const rawCodigo = prev._fromStore
        ? (prev.codigo || el.simpleCode || null)
        : (incomingCode || prev.codigo || null);
      const rawNombre = el.nombre || prev.nombre || '';
      const cleanedNombre = cleanElementName(rawNombre, el.id, rawCodigo).toUpperCase().trim();
      const mergedTech = (el.datosTecnicos && Object.keys(el.datosTecnicos).length > 0)
        ? el.datosTecnicos
        : (prev.datosTecnicos || el.parametrosElectricos || {});

      combinedMap.set(el.id, {
        ...prev,
        ...el,
        _fromStore: prev._fromStore || fromStore,
        id: el.id,
        codigo: rawCodigo,
        orden: el.orden ?? el.datosTecnicos?.orden ?? prev.orden ?? null,
        createdAt: el.createdAt || prev.createdAt || null,
        datosTecnicos: mergedTech,
        nombre: cleanedNombre || tipo,
        tipoElemento: tipo,
        categoria: el.categoria || prev.categoria || resolverCategoria(tipo),
        nivelTension: el.nivelTension || prev.nivelTension || resolverNivelTension({ ...el, tipoElemento: tipo, datosTecnicos: mergedTech }),
        ubicacion: el.ubicacion || prev.ubicacion || 'Ubicación registrada',
        detalles: el.detalles || prev.detalles || null
      });
    };

    // 1. Extraer del Zustand store filtrando EXCLUSIVAMENTE por el proyecto actual
    const storeItems = extractStoreProjectElements(proyectoId, companyId);
    storeItems.forEach(el => mergeIntoMap(el, el.tipoElemento, true));

    // 2. Incorporar lista externa si se pasó por props (verificando coincidencia estricta de proyectoId)
    if (Array.isArray(elementosList) && elementosList.length > 0) {
      elementosList
        .filter(el => {
          if (!el || !el.id) return false;
          if (proyectoId && el.proyectoId && String(el.proyectoId) !== String(proyectoId)) {
            return false;
          }
          return true;
        })
        .forEach(el => mergeIntoMap(el, el.tipoElemento || el.tipo || 'TABLERO'));
    }

    // 3. Incorporar resultados del backend (ya filtrados por proyectoId)
    if (Array.isArray(remoteItems) && remoteItems.length > 0) {
      remoteItems
        .filter(el => {
          if (!el || !el.id) return false;
          if (proyectoId && el.proyectoId && String(el.proyectoId) !== String(proyectoId)) {
            return false;
          }
          return true;
        })
        .forEach(el => mergeIntoMap(el, el.tipoElemento || 'TABLERO'));
    }

    // Asignar IDs simples uniformes sobre el proyecto completo antes de excluir el elemento actual
    const normalizedAll = assignSimpleHierarchyCodes(Array.from(combinedMap.values()));

    return normalizedAll.filter((el) => {
      if (!el || !el.id) return false;
      if (tableroActualId && (
        String(el.id) === String(tableroActualId) ||
        String(el.nombre || '').toUpperCase() === String(tableroActualId).toUpperCase()
      )) {
        return false;
      }
      return true;
    });
  }, [elementosList, remoteItems, proyectoId, tableroActualId, companyId, tipoElementoActual, isAlimentaA]);

  // Enfocar input correspondiente al abrir o al cambiar de modo
  useEffect(() => {
    if (isOpen) {
      if (isManualMode && manualInputRef.current) {
        setTimeout(() => manualInputRef.current?.focus(), 60);
      } else if (!isManualMode && searchInputRef.current) {
        setTimeout(() => searchInputRef.current?.focus(), 60);
      }
    }
  }, [isOpen, isManualMode]);

  // Desglosar y asociar `value` con elementos registrados o asignaciones manuales
  const selectedItems = useMemo(() => {
    if (!value) return [];

    let tokens = [];
    if (Array.isArray(value)) {
      tokens = value.map(v => typeof v === 'object' ? (v.id || v.nombre) : String(v));
    } else if (typeof value === 'string') {
      tokens = value.split(',').map(s => s.trim()).filter(Boolean);
    }

    const result = [];
    const IGNORED_PLACEHOLDERS = new Set(['NO DEFINIDO', 'NO DEFINIDA', 'SIN ALIMENTACIÓN', 'SIN ALIMENTACION', '—', '-']);

    tokens.forEach((token) => {
      const cleanToken = cleanElementName(token).toUpperCase().trim();
      const rawUpper = token.toUpperCase().trim();

      if (!rawUpper || IGNORED_PLACEHOLDERS.has(rawUpper) || IGNORED_PLACEHOLDERS.has(cleanToken)) {
        return;
      }

      if (rawUpper === 'CORPOELEC' || cleanToken === 'CORPOELEC') {
        if (!result.some(r => r.id === CORPOELEC_OPTION.id)) {
          result.push(CORPOELEC_OPTION);
        }
        return;
      }

      // Buscar por ID exacto, código, nombre o coincidencia normalizada
      const found = items.find((item) => {
        const itemNombre = (item.nombre || '').toUpperCase().trim();
        const itemCodigo = (item.codigo || '').toUpperCase().trim();
        const itemId = String(item.id).toUpperCase().trim();

        return (
          itemId === rawUpper ||
          itemCodigo === rawUpper ||
          itemNombre === rawUpper ||
          itemNombre === cleanToken ||
          `${itemNombre} (ID: ${itemCodigo})` === rawUpper ||
          `${itemNombre} (ID: ${itemId})` === rawUpper ||
          `${itemNombre} (${itemCodigo})` === rawUpper ||
          cleanToken === itemNombre
        );
      });

      if (found) {
        if (!result.some(r => r.id === found.id)) {
          result.push(found);
        }
      } else if (token) {
        // Elemento manual / personalizado no registrado en base de datos
        result.push({
          id: `manual_${token.replace(/\s+/g, '_')}`,
          nombre: token.toUpperCase(),
          codigo: 'MANUAL',
          tipoElemento: 'MANUAL',
          categoria: 'Entrada Manual',
          nivelTension: 'Personalizado',
          ubicacion: 'Definido manualmente',
          isManual: true
        });
      }
    });

    return result;
  }, [value, items]);

  // Filtrado reactivo de búsqueda
  const filteredItems = useMemo(() => {
    if (!search.trim()) return items;
    const term = search.toLowerCase().trim();
    return items.filter(
      (item) =>
        item.nombre?.toLowerCase().includes(term) ||
        item.codigo?.toLowerCase().includes(term) ||
        item.tipoElemento?.toLowerCase().includes(term) ||
        item.ubicacion?.toLowerCase().includes(term) ||
        item.nivelTension?.toLowerCase().includes(term) ||
        item.detalles?.toLowerCase().includes(term)
    );
  }, [items, search]);

  // Agrupación visual por categoría con orden de prioridad industrial
  const groupedItems = useMemo(() => {
    const rawGroups = {};
    filteredItems.forEach((item) => {
      const cat = item.categoria || 'Otros Equipos';
      if (!rawGroups[cat]) rawGroups[cat] = [];
      rawGroups[cat].push(item);
    });

    const priorityCategories = (() => {
      if (tipoElementoActual === 'GENERADOR') {
        return ['Sistemas de Transferencia (ATS/MTS)', 'Subestaciones', 'Transformadores'];
      }
      if (tipoElementoActual === 'SUBESTACION') {
        return ['Subestaciones', 'Transformadores', 'Puntos de Medición / Suministro'];
      }
      if (tipoElementoActual === 'TRANSFORMADOR') {
        return ['Subestaciones', 'Puntos de Medición / Suministro', 'Generadores y Plantas Eléctricas'];
      }
      if (isAlimentaA) {
        return ['Tableros de Distribución', 'Celdas y CCM', 'Sistemas de Transferencia (ATS/MTS)', 'Bancos de Condensadores'];
      }
      return [
        'Transformadores',
        'Subestaciones',
        'Sistemas de Transferencia (ATS/MTS)',
        'Celdas y CCM',
        'Tableros de Distribución',
        'Generadores y Plantas Eléctricas',
        'Puntos de Medición / Suministro',
        'Alimentadores Dedicados'
      ];
    })();

    const sortedGroups = {};
    priorityCategories.forEach(cat => {
      if (rawGroups[cat]) {
        sortedGroups[cat] = rawGroups[cat];
        delete rawGroups[cat];
      }
    });
    Object.keys(rawGroups).forEach(cat => {
      sortedGroups[cat] = rawGroups[cat];
    });

    return sortedGroups;
  }, [filteredItems, tipoElementoActual, isAlimentaA]);

  const emitChange = (newSelectedItems) => {
    const formattedString = newSelectedItems.map(i => i.nombre.toUpperCase().trim()).join(', ');
    const ids = newSelectedItems
      .filter(i => !i.isManual && !i.isCorpoelec)
      .map(i => i.id);
    const primary = newSelectedItems.length > 0 ? newSelectedItems[0] : null;
    const primaryObj = primary
      ? ((primary.isManual || primary.isCorpoelec)
        ? { ...primary, id: null, externalSourceId: primary.id }
        : primary)
      : null;

    if (onChange) {
      onChange(formattedString, primaryObj, ids, newSelectedItems);
    }
  };

  const handleToggleItem = (item) => {
    if (!multiple) {
      emitChange([item]);
      // En selección simple el cambio viaja de inmediato, pero el cuadro permanece abierto
      // hasta que el inspector decida cerrarlo explícitamente con (X) o Listo / Confirmar
      return;
    }

    const isAlreadySelected = selectedItems.some((sel) => sel.id === item.id);
    let updated;
    if (isAlreadySelected) {
      updated = selectedItems.filter((sel) => sel.id !== item.id);
    } else {
      updated = [...selectedItems, item];
    }
    emitChange(updated);
  };

  const handleRemoveItem = (id, e) => {
    if (e) e.stopPropagation();
    const updated = selectedItems.filter((item) => item.id !== id);
    emitChange(updated);
  };

  const handleClear = (e) => {
    if (e) e.stopPropagation();
    emitChange([]);
  };

  const isCorpoelecSelected = selectedItems.some(
    (sel) => sel.isCorpoelec || sel.id === CORPOELEC_OPTION.id
  );

  const handleSelectCorpoelec = () => {
    setIsManualMode(false);
    if (multiple) {
      if (isCorpoelecSelected) {
        emitChange(selectedItems.filter((sel) => sel.id !== CORPOELEC_OPTION.id && !sel.isCorpoelec));
      } else {
        emitChange([...selectedItems, CORPOELEC_OPTION]);
      }
      return;
    }
    emitChange([CORPOELEC_OPTION]);
  };

  // Manejador de Entrada Manual Libre
  const handleApplyManual = (customText = null) => {
    const raw = typeof customText === 'string' ? customText : manualInput;
    const clean = (raw || '').toUpperCase().trim();
    if (!clean) return;

    const manualItem = {
      id: `manual_${Date.now()}`,
      nombre: clean,
      codigo: 'MANUAL',
      tipoElemento: 'MANUAL',
      categoria: 'Entrada Manual',
      nivelTension: 'Personalizado',
      ubicacion: 'Definido manualmente',
      isManual: true
    };

    if (multiple) {
      const exists = selectedItems.some(i => i.nombre.toUpperCase().trim() === clean);
      if (!exists) {
        emitChange([...selectedItems, manualItem]);
      }
    } else {
      emitChange([manualItem]);
    }

    setManualInput('');
    setIsManualMode(false);
  };

  // Si el elemento actual es un GENERADOR y la dirección es ALIMENTADO_POR,
  // se omite el selector ya que el generador es una fuente primaria autónoma independiente.
  if (tipoElementoActual === 'GENERADOR' && !isAlimentaA) {
    return (
      <div className={`w-full p-3 bg-emerald-950/40 border border-emerald-500/30 rounded-xl space-y-1 ${className}`}>
        <span className="text-[10.5px] font-bold text-emerald-400 uppercase tracking-wide flex items-center gap-1.5 font-mono">
          <Zap className="w-3.5 h-3.5 text-emerald-400" /> Fuente de Energía Primaria Autónoma
        </span>
        <p className="text-[11px] text-slate-300 leading-relaxed font-sans">
          Los motogeneradores operan como fuentes primarias autónomas independientes. No requieren ni reciben alimentación aguas arriba.
        </p>
      </div>
    );
  }

  return (
    <div className={`w-full space-y-1.5 ${className}`} ref={containerRef}>
      {label && (
        <div className="flex items-center justify-between">
          <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            {label}
          </label>
          {selectedItems.length > 0 && (
            <span className="text-[10px] text-amber-400 font-mono font-bold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              {selectedItems.length === 1 ? '1 Nodo Enlazado' : `${selectedItems.length} Nodos Enlazados`}
            </span>
          )}
        </div>
      )}

      {/* DISPARADOR DEL SELECTOR DINÁMICO */}
      <div className="relative">
        <div
          onClick={() => {
            if (!disabled) setIsOpen(!isOpen);
          }}
          className={`w-full min-h-[46px] px-3 py-2 rounded-xl text-left border flex items-center justify-between gap-2 min-w-0 overflow-hidden transition-all duration-200 cursor-pointer ${
            isOpen
              ? 'bg-slate-900 border-amber-500 ring-2 ring-amber-500/20 shadow-lg shadow-amber-500/5'
              : 'bg-slate-900 hover:bg-slate-850 border-slate-800 hover:border-slate-750'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {/* Lista de Chips Seleccionados */}
          {selectedItems.length > 0 ? (
            <div className="flex flex-wrap items-center gap-1.5 min-w-0 flex-1 max-w-full py-0.5">
              {selectedItems.map((sel) => {
                const { icon: ItemIcon, color } = getIconAndColor(sel.tipoElemento);
                return (
                  <span
                    key={sel.id}
                    className="inline-flex items-center gap-1.5 max-w-full min-w-0 bg-slate-950/90 text-slate-100 border border-slate-700/80 hover:border-amber-400/70 rounded-lg px-2 py-1 text-xs shadow-xs cursor-pointer transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPreviewElement(sel);
                    }}
                    title={`Clic para ver ficha rápida de ${sel.nombre}`}
                  >
                    <span className={`p-0.5 rounded shrink-0 ${color}`}>
                      <ItemIcon className="w-3 h-3" />
                    </span>
                    <span className="font-bold text-xs truncate min-w-0 flex-1 uppercase" title={sel.nombre}>
                      {sel.nombre}
                    </span>
                    {sel.isCorpoelec ? (
                      <span className="shrink-0 whitespace-nowrap text-[8.5px] font-bold uppercase text-sky-300 bg-sky-500/15 px-1.5 py-0.5 rounded border border-sky-500/30">
                        RED NACIONAL
                      </span>
                    ) : sel.isManual ? (
                      <span className="shrink-0 whitespace-nowrap text-[8.5px] font-bold uppercase text-amber-300 bg-amber-500/15 px-1.5 py-0.5 rounded border border-amber-500/30">
                        Manual
                      </span>
                    ) : (
                      (sel.codigo || sel.tipoElemento) && (
                        <span className="shrink-0 whitespace-nowrap font-mono lowercase text-[9px] font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                          {sel.codigo || getSimpleElementCode(sel, sel.tipoElemento)}
                        </span>
                      )
                    )}
                    <Eye className="w-3 h-3 text-slate-400 shrink-0" />
                    {!disabled && (
                      <button
                        type="button"
                        onClick={(e) => handleRemoveItem(sel.id, e)}
                        className="shrink-0 text-slate-400 hover:text-red-400 p-0.5 rounded transition-colors cursor-pointer"
                        title={`Quitar ${sel.nombre}`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </span>
                );
              })}
            </div>
          ) : (
            <span className="text-xs sm:text-sm text-slate-500 truncate min-w-0 flex-1 font-mono">
              {placeholder}
            </span>
          )}

          <div className="flex items-center gap-1 shrink-0 ml-auto">
            {selectedItems.length > 0 && !disabled && (
              <button
                type="button"
                onClick={handleClear}
                className="p-1 text-slate-400 hover:text-rose-400 rounded-md transition-colors cursor-pointer"
                title="Limpiar toda la selección"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <ChevronDown
              className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                isOpen ? 'rotate-180 text-amber-400' : ''
              }`}
            />
          </div>
        </div>

        {/* MODAL FLOTANTE SUPERPUESTO (Z-[100]) CON BLOQUEO DE CIERRE EXTERNO Y BOTÓN EXPLÍCITO (X) */}
        {isOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-5 bg-slate-950/75 backdrop-blur-xs select-none">
            {/* Contenedor Flotante Estático: clic fuera NO lo cierra */}
            <div
              className="relative w-full max-w-2xl max-h-[88vh] bg-slate-900 border border-slate-700/90 rounded-2xl shadow-2xl flex flex-col overflow-hidden ring-1 ring-amber-500/30 animate-in zoom-in-95 duration-150"
              onClick={(e) => e.stopPropagation()}
            >
              {/* 1. Cabecera con Título, Tipo y Botón Explícito de Cierre (X) */}
              <div className="px-4 py-3 sm:px-5 sm:py-3.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-3 shrink-0">
                <div className="min-w-0">
                  <span className="text-[10px] font-mono font-bold text-amber-500 uppercase tracking-widest block">
                    {isAlimentaA ? 'TOPOLOGÍA AGUAS ABAJO • SALIDAS' : 'TOPOLOGÍA AGUAS ARRIBA • PROCEDENCIA'}
                  </span>
                  <h3 className="text-sm font-bold text-slate-100 truncate flex items-center gap-2">
                    <Layers className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>{label || (isAlimentaA ? 'Seleccionar Equipos Alimentados (Alimenta A)' : 'Seleccionar Origen Eléctrico (Alimentado Por)')}</span>
                  </h3>
                </div>

                {/* Botón Explícito de Cierre (X) - Única forma autorizada de cerrar */}
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded-xl transition-all cursor-pointer shadow-sm shrink-0"
                  title="Cerrar cuadro de selección (X)"
                >
                  <X className="w-5 h-5 text-amber-400 hover:text-white" />
                </button>
              </div>

              {/* 2. Selector de Modo Fijo: [📋 Equipos del Proyecto] | [⚡ CORPOELEC] | [📝 Escribir Nombre / Manual] */}
              <div className="px-4 py-2.5 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between gap-2 shrink-0 flex-wrap">
                <div className="flex items-center gap-1.5 p-1 bg-slate-900 rounded-xl border border-slate-800 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setIsManualMode(false)}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      !isManualMode && !( !isAlimentaA && isCorpoelecSelected )
                        ? 'bg-amber-500 text-slate-950 shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Equipos del Proyecto ({items.length})</span>
                  </button>

                  {!isAlimentaA && (
                    <button
                      type="button"
                      onClick={handleSelectCorpoelec}
                      title="Fijar compañía eléctrica nacional CORPOELEC como fuente de alimentación"
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer border ${
                        isCorpoelecSelected && !isManualMode
                          ? 'bg-sky-500 text-slate-950 border-sky-400 shadow-sm ring-2 ring-sky-400/30'
                          : 'bg-sky-500/10 text-sky-300 border-sky-500/30 hover:bg-sky-500/20 hover:border-sky-400/60'
                      }`}
                    >
                      <Zap className={`w-3.5 h-3.5 ${isCorpoelecSelected && !isManualMode ? 'text-slate-950' : 'text-sky-400'}`} />
                      <span>CORPOELEC</span>
                      {isCorpoelecSelected && !isManualMode && (
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      )}
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setIsManualMode(true);
                      if (!manualInput) {
                        if (typeof value === 'string' && value.trim()) {
                          setManualInput(value.trim().toUpperCase());
                        } else if (search.trim()) {
                          setManualInput(search.trim().toUpperCase());
                        }
                      }
                    }}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      isManualMode
                        ? 'bg-amber-500 text-slate-950 shadow-sm'
                        : 'text-slate-400 hover:text-amber-400 hover:bg-slate-850'
                    }`}
                  >
                    <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                    <span>📝 Escribir Nombre / Manual</span>
                  </button>
                </div>

                <span className="text-[10px] text-slate-500 font-mono hidden sm:inline-block">
                  Aislamiento Activo • Proyecto Actual
                </span>
              </div>

              {/* 3. Contenido del Modal según el Modo Activo */}
              {isManualMode ? (
                /* VISTA DE ENTRADA MANUAL LIBRE */
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-slate-900/60 custom-scrollbar">
                  <div className="p-3.5 bg-amber-500/10 border border-amber-500/25 rounded-2xl flex items-start gap-3">
                    <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl shrink-0 mt-0.5">
                      <Edit3 className="w-4 h-4" />
                    </div>
                    <div className="text-xs space-y-1">
                      <h4 className="font-bold text-amber-300">Modo de Entrada Manual de Texto Libre</h4>
                      <p className="text-slate-300 leading-relaxed">
                        Permite registrar el nombre de un alimentador, acometida o equipo cuando aún no ha sido dado de alta formalmente en este proyecto o proviene de una fuente no modelada.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3 bg-slate-950/80 p-4 rounded-2xl border border-slate-800 shadow-inner">
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wide">
                      Nombre o Descripción del Alimentador / Procedencia:
                    </label>
                    <div className="relative">
                      <input
                        ref={manualInputRef}
                        type="text"
                        value={manualInput}
                        onChange={(e) => setManualInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleApplyManual();
                          }
                        }}
                        placeholder="Ej: ACOMETIDA GENERAL EDIFICIO B, TRANSFORMADOR DE POSTE..."
                        className="w-full pl-4 pr-10 py-3 bg-slate-900 border border-slate-700 rounded-xl text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 font-mono shadow-inner uppercase"
                        autoFocus
                      />
                      {manualInput && (
                        <button
                          type="button"
                          onClick={() => setManualInput('')}
                          className="absolute right-3 top-3 text-slate-400 hover:text-white cursor-pointer p-1 rounded"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {/* Sugerencias Rápidas de Nomenclatura */}
                    <div className="space-y-1.5 pt-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                        Sugerencias Rápidas de Nomenclatura:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {[
                          'ACOMETIDA GENERAL DE RED',
                          'TRANSFORMADOR DE POSTE',
                          'PLANTA ELÉCTRICA DE EMERGENCIA',
                          'SUBESTACIÓN PRINCIPAL',
                          'ACOMETIDA EXTERNA BT',
                          'GENERADOR DE RESPALDO'
                        ].map((sug) => (
                          <button
                            key={sug}
                            type="button"
                            onClick={() => setManualInput(sug)}
                            className="text-[11px] font-mono px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-850 text-slate-300 hover:text-amber-300 border border-slate-800 hover:border-amber-500/40 transition-colors cursor-pointer"
                          >
                            + {sug}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Botones de Acción dentro del Formulario */}
                    <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-850">
                      <button
                        type="button"
                        onClick={() => setIsManualMode(false)}
                        className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-slate-200 hover:bg-slate-900 transition-all cursor-pointer flex items-center gap-1.5"
                      >
                        <Layers className="w-4 h-4" />
                        <span>Volver a la Lista de Equipos</span>
                      </button>

                      <button
                        type="button"
                        disabled={!manualInput.trim()}
                        onClick={() => handleApplyManual()}
                        className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-black text-xs rounded-xl shadow-md transition-all active:scale-95 cursor-pointer flex items-center gap-2"
                      >
                        <Check className="w-4 h-4" />
                        <span>Aplicar Nombre Manual</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                /* VISTA DE LISTA DE EQUIPOS REGISTRADOS EN EL PROYECTO */
                <>
                  {/* Barra Superior de Búsqueda Reactiva con Botón a Modo Manual */}
                  <div className="p-3.5 sm:p-4 border-b border-slate-800 bg-slate-950/80 space-y-2.5 shrink-0">
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                        <input
                          ref={searchInputRef}
                          type="text"
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                          placeholder="Buscar por ID simple (med-1, tra-1, tab-2), nombre, tipo o tensión..."
                          className="w-full pl-10 pr-9 py-2.5 sm:py-3 bg-slate-900 border border-slate-700/80 rounded-xl text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 font-mono shadow-inner"
                        />
                        {search && (
                          <button
                            type="button"
                            onClick={() => setSearch('')}
                            className="absolute right-3 top-3.5 text-slate-400 hover:text-white cursor-pointer p-0.5 rounded"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setIsManualMode(true);
                          if (search.trim()) setManualInput(search.trim().toUpperCase());
                        }}
                        className="px-3 py-2.5 sm:py-3 bg-slate-900 hover:bg-slate-850 text-amber-400 border border-amber-500/30 hover:border-amber-500/60 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 shadow-sm"
                        title="Cambiar a entrada manual libre de texto"
                      >
                        <Edit3 className="w-4 h-4" />
                        <span className="hidden sm:inline">📝 Manual</span>
                      </button>
                    </div>

                    {/* Confirmación visual cuando CORPOELEC está fijado */}
                    {!isAlimentaA && isCorpoelecSelected && (
                      <div className="p-2.5 bg-sky-500/10 border border-sky-500/40 rounded-xl flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 text-xs text-sky-200 min-w-0">
                          <Zap className="w-4 h-4 text-sky-400 shrink-0" />
                          <span className="truncate">
                            Fuente Externa Fijada: <strong className="text-sky-300 font-black">CORPOELEC</strong> — Compañía Eléctrica Nacional
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => handleRemoveItem(CORPOELEC_OPTION.id, e)}
                          className="text-[11px] font-bold text-rose-400 hover:text-rose-300 px-2 py-0.5 rounded hover:bg-rose-500/10 cursor-pointer shrink-0"
                        >
                          Quitar
                        </button>
                      </div>
                    )}

                    {/* Opción rápida si el término buscado no está en la base de datos */}
                    {search.trim() && (
                      <div className="p-2.5 bg-slate-900/90 border border-amber-500/30 rounded-xl flex items-center justify-between gap-2">
                        <div className="text-xs text-slate-300 truncate">
                          ¿No registrado? Usar <strong className="text-amber-400 font-mono">"{search.toUpperCase()}"</strong> como manual
                        </div>
                        <button
                          type="button"
                          onClick={() => handleApplyManual(search)}
                          className="px-3 py-1 bg-amber-500 text-slate-950 rounded-lg text-xs font-bold hover:bg-amber-400 cursor-pointer shrink-0 shadow-sm"
                        >
                          📝 Asignar
                        </button>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-xs px-0.5">
                      <span className="text-slate-400 font-medium">
                        {selectedItems.length > 0 ? (
                          <>Enlazados: <strong className="text-amber-400 font-bold">{selectedItems.length}</strong> equipo(s)</>
                        ) : (
                          <span className="text-slate-500">
                            {multiple ? 'Marca uno o varios equipos del proyecto' : 'Selecciona un equipo registrado en el proyecto'}
                          </span>
                        )}
                      </span>
                      {selectedItems.length > 0 && (
                        <button
                          type="button"
                          onClick={handleClear}
                          className="text-xs text-rose-400 hover:text-rose-300 font-bold cursor-pointer transition-colors px-2 py-0.5 rounded hover:bg-rose-500/10"
                        >
                          Deseleccionar Todo
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Lista Agrupada de Equipos con Scroll Cómodo */}
                  <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60 p-3 sm:p-4 custom-scrollbar">
                    {loading ? (
                      <div className="p-12 text-center text-xs text-slate-400 flex items-center justify-center gap-2.5">
                        <div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                        <span>Consultando equipos del proyecto en la base de datos...</span>
                      </div>
                    ) : Object.keys(groupedItems).length === 0 ? (
                      <div className="p-10 text-center text-xs text-slate-400 space-y-3">
                        <AlertCircle className="w-8 h-8 mx-auto text-amber-500/70 mb-1" />
                        <p className="font-bold text-slate-200 text-sm">
                          {search ? 'Sin coincidencias para la búsqueda' : 'No hay otros equipos registrados en este proyecto'}
                        </p>
                        <p className="text-xs text-slate-400 max-w-sm mx-auto">
                          Puedes registrar equipos en el diagrama unifilar del proyecto o ingresar el nombre del alimentador directamente.
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setIsManualMode(true);
                            if (search.trim()) setManualInput(search.trim().toUpperCase());
                          }}
                          className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition-all cursor-pointer shadow-md inline-flex items-center gap-2"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>📝 Escribir Nombre / Manual</span>
                        </button>
                      </div>
                    ) : (
                      Object.entries(groupedItems).map(([categoria, group]) => (
                        <div key={categoria} className="py-2.5 first:pt-0 last:pb-0">
                          {/* Cabecera de Categoría */}
                          <div className="px-3 py-1.5 text-[11px] font-black uppercase tracking-wider text-slate-400 flex items-center justify-between bg-slate-950/60 rounded-lg mb-1.5">
                            <span>{categoria}</span>
                            <span className="text-slate-400 font-mono text-[10px] bg-slate-800 px-2 py-0.5 rounded-full border border-slate-750 font-bold">
                              {group.length}
                            </span>
                          </div>

                          {/* Items del Grupo */}
                          <div className="space-y-1.5">
                            {group.map((item) => {
                              const isSelected = selectedItems.some((sel) => sel.id === item.id);
                              const { icon: ItemIcon, color } = getIconAndColor(item.tipoElemento);

                              return (
                                <div
                                  key={item.id}
                                  onClick={() => handleToggleItem(item)}
                                  className={`w-full text-left px-3.5 py-3 rounded-xl flex items-center justify-between gap-3 transition-all cursor-pointer select-none min-h-[52px] active:scale-[0.99] ${
                                    isSelected
                                      ? 'bg-amber-500/15 text-amber-200 border border-amber-500/40 shadow-sm'
                                      : 'hover:bg-slate-800/90 active:bg-slate-800 text-slate-200 border border-slate-800/60 hover:border-slate-700'
                                  }`}
                                >
                                  <div className="flex items-center gap-3 min-w-0 flex-1">
                                    <div className="shrink-0 text-amber-400 p-0.5">
                                      {multiple ? (
                                        isSelected ? (
                                          <CheckSquare className="w-5 h-5 fill-amber-500/20 text-amber-400" />
                                        ) : (
                                          <Square className="w-5 h-5 text-slate-600" />
                                        )
                                      ) : (
                                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                                          isSelected ? 'border-amber-400 bg-amber-400' : 'border-slate-600'
                                        }`}>
                                          {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-slate-950" />}
                                        </div>
                                      )}
                                    </div>
                                    <div className={`p-2 rounded-xl border shrink-0 ${color}`}>
                                      <ItemIcon className="w-4 h-4" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-bold text-xs sm:text-sm text-slate-100 uppercase">
                                          {item.nombre}
                                        </span>
                                        {item.codigo && (
                                          <span className="px-2 py-0.5 rounded text-[10px] font-mono lowercase font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30 shrink-0">
                                            {item.codigo}
                                          </span>
                                        )}
                                        {item.nivelTension && (
                                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-amber-300 border border-slate-700/60 shrink-0">
                                            ⚡ {item.nivelTension}
                                          </span>
                                        )}
                                      </div>
                                      <div className="text-xs text-slate-400 truncate mt-1 flex items-center gap-1.5">
                                        <span>📍 {item.ubicacion}</span>
                                        {item.detalles && <span className="text-slate-500 font-medium">• {item.detalles}</span>}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </>
              )}

              {/* 4. Footer con Resumen y Botones Explícitos de Cierre */}
              <div className="p-3 sm:p-3.5 border-t border-slate-800 bg-slate-950 flex items-center justify-between gap-3 shrink-0">
                <span className="text-xs text-slate-400 font-medium truncate">
                  {selectedItems.length > 0
                    ? `${selectedItems.length} equipo(s) seleccionado(s)`
                    : 'Sin selección activa'}
                </span>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold text-xs rounded-xl transition-all cursor-pointer border border-slate-800"
                  >
                    Cerrar (X)
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="px-6 py-2 bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-black text-xs rounded-xl transition-all cursor-pointer shadow-md"
                  >
                    Listo / Confirmar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Resumen inferior de nodos seleccionados */}
      {selectedItems.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 pt-0.5 min-w-0 max-w-full">
          <span className="text-slate-500 font-bold uppercase text-[9px] tracking-wide shrink-0">Topología Vinculada:</span>
          {selectedItems.map((item, idx) => (
            <button
              key={item.id}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setPreviewElement(item);
              }}
              title={`Clic para ver ficha rápida de ${item.nombre}`}
              className="inline-flex items-center gap-1 max-w-full min-w-0 text-[11px] text-slate-300 bg-slate-900/70 border border-slate-800 hover:border-amber-400/60 px-2 py-0.5 rounded-md cursor-pointer transition-colors"
            >
              <span className="font-semibold text-slate-200 uppercase truncate min-w-0">{item.nombre}</span>
              <span className={`font-mono text-[9.5px] shrink-0 whitespace-nowrap ${item.isCorpoelec ? 'text-sky-400 uppercase' : 'text-amber-400 lowercase'}`}>
                {item.isCorpoelec
                  ? '(CORPOELEC • RED NACIONAL)'
                  : item.isManual
                  ? '(manual)'
                  : `(${item.codigo || getSimpleElementCode(item, item.tipoElemento)})`}
              </span>
              <Eye className="w-2.5 h-2.5 text-slate-400 shrink-0" />
              {idx < selectedItems.length - 1 && <span className="text-slate-600 font-bold shrink-0">,</span>}
            </button>
          ))}
        </div>
      )}

      <ElementQuickPreviewModal
        elementRef={previewElement}
        proyectoId={proyectoId}
        onClose={() => setPreviewElement(null)}
      />
    </div>
  );
}
