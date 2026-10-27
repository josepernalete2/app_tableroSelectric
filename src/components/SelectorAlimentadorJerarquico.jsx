import React, { useState, useEffect, useRef, useMemo } from 'react';
import { API_BASE_URL } from '../utils/api';
import useStore, { getElementCode, cleanElementName } from '../store/useStore';
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
  Plus
} from 'lucide-react';

/**
 * Fuentes de Red Eléctrica Primaria y Acometidas Normalizadas
 * Permite a los inspectores conectar las cabeceras de jerarquía directamente a la red sin texto manual
 */
export const FUENTES_RED_PRIMARIAS = [
  {
    id: 'GRID_CORPOELEC_138KV',
    nombre: 'CORPOELEC RED PRIMARIA 13.8 KV',
    codigo: 'RED-13.8K',
    tipoElemento: 'RED_ELECTRICA',
    categoria: 'Acometidas y Red Eléctrica (SEN)',
    nivelTension: '13.8 kV',
    ubicacion: 'Red de Distribución CORPOELEC',
    detalles: 'Suministro Comercial Media Tensión'
  },
  {
    id: 'GRID_CORPOELEC_24KV',
    nombre: 'CORPOELEC RED PRIMARIA 24.0 KV',
    codigo: 'RED-24K',
    tipoElemento: 'RED_ELECTRICA',
    categoria: 'Acometidas y Red Eléctrica (SEN)',
    nivelTension: '24.0 kV',
    ubicacion: 'Red de Distribución CORPOELEC',
    detalles: 'Suministro Comercial Media Tensión'
  },
  {
    id: 'GRID_CORPOELEC_345KV',
    nombre: 'CORPOELEC RED SUBTRANSMISIÓN 34.5 KV',
    codigo: 'RED-34.5K',
    tipoElemento: 'RED_ELECTRICA',
    categoria: 'Acometidas y Red Eléctrica (SEN)',
    nivelTension: '34.5 kV',
    ubicacion: 'Red de Subtransmisión CORPOELEC',
    detalles: 'Suministro Alta Tensión'
  },
  {
    id: 'GRID_CORPOELEC_BT_208V',
    nombre: 'CORPOELEC ACOMETIDA DIRECTA BT 208Y/120V',
    codigo: 'RED-208V',
    tipoElemento: 'RED_ELECTRICA',
    categoria: 'Acometidas y Red Eléctrica (SEN)',
    nivelTension: '208Y / 120 V',
    ubicacion: 'Acometida de Servicio Público',
    detalles: 'Baja Tensión Comercial / Residencial'
  },
  {
    id: 'GRID_CORPOELEC_BT_480V',
    nombre: 'CORPOELEC ACOMETIDA DIRECTA BT 480Y/277V',
    codigo: 'RED-480V',
    tipoElemento: 'RED_ELECTRICA',
    categoria: 'Acometidas y Red Eléctrica (SEN)',
    nivelTension: '480Y / 277 V',
    ubicacion: 'Acometida de Servicio Industrial',
    detalles: 'Baja Tensión Industrial'
  },
  {
    id: 'GRID_GEN_EXTERNO',
    nombre: 'PLANTA / GENERADOR DE EMERGENCIA EXTERNO',
    codigo: 'GEN-EXT',
    tipoElemento: 'GENERADOR',
    categoria: 'Acometidas y Red Eléctrica (SEN)',
    nivelTension: '480 / 208 V',
    ubicacion: 'Exterior / Caseta de Generación',
    detalles: 'Fuente de Respaldo Auxiliar'
  },
  {
    id: 'GRID_ACOMETIDA_EXTERNA',
    nombre: 'ACOMETIDA EXTERNA GENERAL (PCC)',
    codigo: 'ACOM-EXT',
    tipoElemento: 'RED_ELECTRICA',
    categoria: 'Acometidas y Red Eléctrica (SEN)',
    nivelTension: 'Tensión de Red',
    ubicacion: 'Punto de Conexión Comercial (PCC)',
    detalles: 'Entrada Principal de Alimentación'
  }
];

/**
 * Fuentes Autónomas Primarias (Generadores y Sistemas de Emergencia/Cogeneración)
 * Los generadores operan como fuentes primarias autónomas independientes de la red externa
 */
export const FUENTES_AUTONOMAS_PRIMARIAS = [
  {
    id: 'ORIGEN_AUTONOMO_MECANICO',
    nombre: 'GENERACIÓN AUTÓNOMA (SISTEMA PRIMARIO / MOTOGENERADOR)',
    codigo: 'GEN-AUTO',
    tipoElemento: 'GENERADOR',
    categoria: 'Fuentes Autónomas / Generación',
    nivelTension: 'Energía Mecánica / Combustible',
    ubicacion: 'Caseta de Generación / Sala de Máquinas',
    detalles: 'Fuente primaria independiente de la red eléctrica'
  },
  {
    id: 'ORIGEN_COGENERACION_PARALELO',
    nombre: 'SISTEMA DE COGENERACIÓN / SINCRONISMO EN PARALELO',
    codigo: 'COGEN-PAR',
    tipoElemento: 'GENERADOR',
    categoria: 'Fuentes Autónomas / Generación',
    nivelTension: 'Media / Baja Tensión Sincronizada',
    ubicacion: 'Subestación / Sala de Sincronismo',
    detalles: 'Operación en paralelo con la red o fuentes alternas'
  }
];

/**
 * Retorna el icono temático y colores según el tipo de elemento eléctrico
 */
const getIconAndColor = (tipo) => {
  switch (tipo) {
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
    case 'RED_ELECTRICA':
      return { icon: Zap, color: 'text-orange-400 bg-orange-500/10 border-orange-500/30' };
    default:
      return { icon: Zap, color: 'text-slate-400 bg-slate-500/10 border-slate-500/30' };
  }
};

/**
 * Extrae EXCLUSIVAMENTE los elementos pertenecientes al proyecto actual.
 * Aplica aislamiento estricto multitenant: nunca mezcla elementos de otras empresas o proyectos.
 */
const extractStoreProjectElements = (projId, currentId, companyId = null) => {
  const storeState = useStore.getState();
  const companies = storeState.companies || [];
  const list = [];
  const seenIds = new Set();

  const addIfNew = (item, defaultTipo = 'TABLERO') => {
    if (!item || !item.id) return;
    if (currentId && (String(item.id) === String(currentId) || String(item.nombre || '').toUpperCase() === String(currentId).toUpperCase())) return;
    const key = String(item.id);
    if (seenIds.has(key)) return;
    seenIds.add(key);

    const tipo = item.tipoElemento || defaultTipo;
    list.push({
      id: item.id,
      codigo: item.codigo || getElementCode(item, tipo),
      nombre: (item.nombre || `EQUIPO ${item.id}`).toUpperCase().trim(),
      tipoElemento: tipo,
      ubicacion: item.ubicacion || item.plantaInstalacion || 'Ubicación registrada',
      datosTecnicos: item.datosTecnicos || item.parametrosElectricos || {},
      nivelTension: item.nivelTension || item.tensionNominal || item.tension || null
    });
  };

  // 1. MODO PROYECTO ESTRICTO: Si hay proyectoId, extraer únicamente de dicho proyecto
  if (projId) {
    for (const c of companies) {
      if (Array.isArray(c.proyectos)) {
        const targetProj = c.proyectos.find(p => String(p.id) === String(projId));
        if (targetProj) {
          (targetProj.elementosUnifilares || []).forEach(e => addIfNew(e, e.tipoElemento || 'TABLERO'));
          (targetProj.tableros || []).forEach(t => addIfNew(t, 'TABLERO'));
          (targetProj.subestaciones || targetProj.inspeccionesSubestacion || []).forEach(s => addIfNew(s, 'SUBESTACION'));
          (targetProj.puntosMedicion || []).forEach(pm => addIfNew(pm, 'PUNTO_MEDICION'));
          (targetProj.ccmList || targetProj.ccms || []).forEach(ccm => addIfNew(ccm, 'CCM'));
          break; // Proyecto único encontrado; detener búsqueda para impedir fugas
        }
      }
    }

    // Elementos guardados en cola u offline que coincidan estrictamente con este proyectoId
    (storeState.elementosLocales || []).forEach(e => {
      if (String(e.proyectoId) === String(projId)) addIfNew(e, e.tipoElemento || 'TABLERO');
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
  } else if (companyId) {
    // 2. MODO EMPRESA ESTRICTO: Si no hay proyectoId pero sí companyId (equipos en la raíz de empresa)
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
 * Consulta exclusivamente los equipos registrados en el proyecto actual y previene entradas manuales por texto
 */
export default function SelectorAlimentadorJerarquico({
  value = '',
  onChange,
  proyectoId,
  tableroActualId,
  elementosList = null,
  placeholder = 'Seleccionar equipo de la base de datos...',
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

  const containerRef = useRef(null);
  const searchInputRef = useRef(null);

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
      case 'RED_ELECTRICA': return 'Acometidas y Red Eléctrica (SEN)';
      case 'SUBESTACION': return 'Subestaciones';
      case 'TRANSFORMADOR': return 'Transformadores';
      case 'CCM': return 'Celdas y CCM';
      case 'TABLERO': return 'Tableros de Distribución';
      case 'BANCO_CONDENSADOR': return 'Bancos de Condensadores';
      case 'GENERADOR': return 'Generadores y Plantas Eléctricas';
      case 'TRANSFER': return 'Sistemas de Transferencia (ATS/MTS)';
      case 'PUNTO_MEDICION': return 'Puntos de Medición / Suministro';
      case 'ALIMENTADOR': return 'Alimentadores Dedicados';
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

  // Consolidar lista completa aplicando reglas topológicas por tipo de elemento:
  // - GENERADORES: fuentes primarias autónomas en ALIMENTADO_POR
  // - SUBESTACIONES / TRAFOS: Red CORPOELEC en ALIMENTADO_POR
  // - ALIMENTA_A: nunca inyecta a la Red Pública Nacional; solo enlaza cargas del proyecto
  const items = useMemo(() => {
    const combinedMap = new Map();

    // 1. Fuentes Primarias de Entrada (Solo para relación aguas arriba / ALIMENTADO_POR)
    if (!isAlimentaA) {
      if (tipoElementoActual === 'GENERADOR') {
        FUENTES_AUTONOMAS_PRIMARIAS.forEach(f => combinedMap.set(f.id, f));
      } else {
        FUENTES_RED_PRIMARIAS.forEach(f => combinedMap.set(f.id, f));
      }
    }

    // 2. Extraer del Zustand store filtrando EXCLUSIVAMENTE por el proyecto actual
    const storeItems = extractStoreProjectElements(proyectoId, tableroActualId, companyId);
    storeItems.forEach(el => {
      combinedMap.set(el.id, {
        id: el.id,
        codigo: el.codigo || getElementCode(el, el.tipoElemento),
        nombre: (el.nombre || '').toUpperCase().trim(),
        tipoElemento: el.tipoElemento || 'TABLERO',
        categoria: resolverCategoria(el.tipoElemento),
        nivelTension: resolverNivelTension(el),
        ubicacion: el.ubicacion || 'Ubicación registrada',
        detalles: el.detalles || null
      });
    });

    // 3. Incorporar lista externa si se pasó por props (verificando coincidencia de proyectoId)
    if (Array.isArray(elementosList) && elementosList.length > 0) {
      elementosList
        .filter(el => {
          if (!el || !el.id) return false;
          if (tableroActualId && (String(el.id) === String(tableroActualId) || String(el.nombre || '').toUpperCase() === String(tableroActualId).toUpperCase())) {
            return false;
          }
          // Aislamiento: si se pasa proyectoId y el elemento posee proyectoId, deben coincidir exactamente
          if (proyectoId && el.proyectoId && String(el.proyectoId) !== String(proyectoId)) {
            return false;
          }
          return true;
        })
        .forEach(el => {
          const tipo = el.tipoElemento || el.tipo || 'TABLERO';
          combinedMap.set(el.id, {
            id: el.id,
            codigo: el.codigo || getElementCode(el, tipo),
            nombre: (el.nombre || '').toUpperCase().trim(),
            tipoElemento: tipo,
            categoria: el.categoria || resolverCategoria(tipo),
            nivelTension: el.nivelTension || resolverNivelTension(el),
            ubicacion: el.ubicacion || 'Ubicación registrada',
            detalles: el.detalles || null
          });
        });
    }

    // 4. Incorporar resultados del backend (ya filtrados por proyectoId)
    if (Array.isArray(remoteItems) && remoteItems.length > 0) {
      remoteItems
        .filter(el => {
          if (!el || !el.id) return false;
          if (tableroActualId && (String(el.id) === String(tableroActualId) || String(el.nombre || '').toUpperCase() === String(tableroActualId).toUpperCase())) {
            return false;
          }
          return true;
        })
        .forEach(el => {
          const tipo = el.tipoElemento || 'TABLERO';
          combinedMap.set(el.id, {
            id: el.id,
            codigo: el.codigo || getElementCode(el, tipo),
            nombre: (el.nombre || '').toUpperCase().trim(),
            tipoElemento: tipo,
            categoria: el.categoria || resolverCategoria(tipo),
            nivelTension: el.nivelTension || resolverNivelTension(el),
            ubicacion: el.ubicacion || 'Ubicación registrada',
            detalles: el.detalles || null
          });
        });
    }

    return Array.from(combinedMap.values());
  }, [elementosList, remoteItems, proyectoId, tableroActualId, companyId, tipoElementoActual, isAlimentaA]);

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Enfocar input de búsqueda al abrir
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  // Desglosar y asociar `value` con elementos registrados o históricos
  const selectedItems = useMemo(() => {
    if (!value) return [];

    let tokens = [];
    if (Array.isArray(value)) {
      tokens = value.map(v => typeof v === 'object' ? (v.id || v.nombre) : String(v));
    } else if (typeof value === 'string') {
      tokens = value.split(',').map(s => s.trim()).filter(Boolean);
    }

    const result = [];
    tokens.forEach((token) => {
      const cleanToken = cleanElementName(token).toUpperCase().trim();
      const rawUpper = token.toUpperCase().trim();

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
        // Objeto histórico para preservar compatibilidad con registros antiguos
        result.push({
          id: `legacy_${token.replace(/\s+/g, '_')}`,
          nombre: token.toUpperCase(),
          codigo: 'REG-HIST',
          tipoElemento: 'OTRO',
          categoria: 'Registros Previos',
          nivelTension: 'Topología Guardada',
          ubicacion: 'Registro Existente en Base de Datos',
          isLegacy: true
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

    // Orden de prioridad sugerido por tipo de elemento
    const priorityCategories = (() => {
      if (tipoElementoActual === 'GENERADOR') {
        return ['Fuentes Autónomas / Generación', 'Acometidas y Red Eléctrica (SEN)', 'Sistemas de Transferencia (ATS/MTS)'];
      }
      if (tipoElementoActual === 'SUBESTACION') {
        return ['Acometidas y Red Eléctrica (SEN)', 'Subestaciones', 'Transformadores'];
      }
      if (tipoElementoActual === 'TRANSFORMADOR') {
        return ['Subestaciones', 'Puntos de Medición / Suministro', 'Acometidas y Red Eléctrica (SEN)', 'Generadores y Plantas Eléctricas'];
      }
      if (isAlimentaA) {
        return ['Tableros de Distribución', 'Celdas y CCM', 'Sistemas de Transferencia (ATS/MTS)', 'Bancos de Condensadores'];
      }
      return [
        'Transformadores',
        'Sistemas de Transferencia (ATS/MTS)',
        'Celdas y CCM',
        'Tableros de Distribución',
        'Generadores y Plantas Eléctricas',
        'Subestaciones',
        'Acometidas y Red Eléctrica (SEN)',
        'Puntos de Medición / Suministro'
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
    const ids = newSelectedItems.map(i => i.id);
    const primaryObj = newSelectedItems.length > 0 ? newSelectedItems[0] : null;

    if (onChange) {
      onChange(formattedString, primaryObj, ids, newSelectedItems);
    }
  };

  const handleToggleItem = (item) => {
    if (!multiple) {
      emitChange([item]);
      setIsOpen(false);
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

      {/* DISPARADOR DEL SELECTOR DINÁMICO (NO PERMITE ESCRITURA LIBRE) */}
      <div className="relative">
        <div
          onClick={() => {
            if (!disabled) setIsOpen(!isOpen);
          }}
          className={`w-full min-h-[46px] px-3.5 py-2 rounded-xl text-left border flex flex-wrap items-center justify-between gap-2 transition-all duration-200 cursor-pointer ${
            isOpen
              ? 'bg-slate-900 border-amber-500 ring-2 ring-amber-500/20 shadow-lg shadow-amber-500/5'
              : 'bg-slate-900 hover:bg-slate-850 border-slate-800 hover:border-slate-750'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {/* Lista de Chips Seleccionados */}
          {selectedItems.length > 0 ? (
            <div className="flex flex-wrap items-center gap-1.5 min-w-0 flex-1 py-0.5">
              {selectedItems.map((sel) => {
                const { icon: ItemIcon, color } = getIconAndColor(sel.tipoElemento);
                return (
                  <span
                    key={sel.id}
                    className="inline-flex items-center gap-1.5 bg-slate-950/90 text-slate-100 border border-slate-700/80 hover:border-amber-500/40 rounded-lg px-2.5 py-1 text-xs shadow-xs"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <span className={`p-0.5 rounded ${color}`}>
                      <ItemIcon className="w-3 h-3" />
                    </span>
                    <span className="font-bold text-xs truncate max-w-[180px] sm:max-w-[260px] uppercase">
                      {sel.nombre}
                    </span>
                    {sel.codigo && (
                      <span className="font-mono text-[9px] font-bold text-amber-400 bg-amber-500/10 px-1 py-0.2 rounded border border-amber-500/20">
                        {sel.codigo}
                      </span>
                    )}
                    {sel.isLegacy && (
                      <span className="text-[8.5px] font-bold uppercase text-orange-400 bg-orange-500/10 px-1 py-0.2 rounded border border-orange-500/20">
                        Previo
                      </span>
                    )}
                    {!disabled && (
                      <button
                        type="button"
                        onClick={(e) => handleRemoveItem(sel.id, e)}
                        className="text-slate-400 hover:text-red-400 p-0.5 rounded transition-colors cursor-pointer"
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
            <span className="text-xs sm:text-sm text-slate-500 truncate font-mono">
              {placeholder}
            </span>
          )}

          <div className="flex items-center gap-1.5 shrink-0 ml-auto">
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

        {/* MENÚ DESPLEGABLE CON BUSCADOR INTELIGENTE Y LISTA DE NODOS REGISTRADOS */}
        {isOpen && (
          <div className="absolute z-50 left-0 right-0 sm:left-0 sm:right-auto w-full sm:w-[520px] md:w-[620px] max-w-[96vw] mt-2 bg-slate-900/98 border border-slate-700/90 rounded-2xl shadow-2xl backdrop-blur-2xl overflow-hidden ring-1 ring-amber-500/20 animate-in fade-in zoom-in-95 duration-150">
            
            {/* Barra superior de búsqueda reactiva */}
            <div className="p-3.5 sm:p-4 border-b border-slate-800 bg-slate-950/80 space-y-2.5">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar equipo por nombre, ID (tab-1, tra-1), tipo o tensión..."
                  className="w-full pl-10 pr-9 py-2.5 sm:py-3 bg-slate-900 border border-slate-700/80 rounded-xl text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 font-mono shadow-inner uppercase"
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

              <div className="flex items-center justify-between text-xs px-0.5">
                <span className="text-slate-400 font-medium">
                  {selectedItems.length > 0 ? (
                    <>Enlazados: <strong className="text-amber-400 font-bold">{selectedItems.length}</strong> equipo(s)</>
                  ) : (
                    <span className="text-slate-500">
                      {multiple ? 'Marca uno o varios equipos de la lista' : 'Selecciona un equipo de la base de datos'}
                    </span>
                  )}
                </span>
                {selectedItems.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClear}
                    className="text-xs text-rose-400 hover:text-rose-300 font-bold cursor-pointer transition-colors px-1.5 py-0.5 rounded hover:bg-rose-500/10"
                  >
                    Deseleccionar Todo
                  </button>
                )}
              </div>
            </div>

            {/* Lista de equipos agrupados con área táctil cómoda */}
            <div className="max-h-64 sm:max-h-72 overflow-y-auto divide-y divide-slate-800/60 p-2.5 overscroll-contain custom-scrollbar scroll-smooth">
              {loading ? (
                <div className="p-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2.5">
                  <div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                  <span>Cargando equipos registrados en la base de datos...</span>
                </div>
              ) : Object.keys(groupedItems).length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400 space-y-1.5">
                  <AlertCircle className="w-6 h-6 mx-auto text-slate-500 mb-1" />
                  <p className="font-bold text-slate-300 text-sm">No se encontraron equipos registrados</p>
                  <p className="text-xs text-slate-500">Verifica el término de búsqueda o crea un elemento en el proyecto.</p>
                </div>
              ) : (
                Object.entries(groupedItems).map(([categoria, group]) => (
                  <div key={categoria} className="py-2 first:pt-0 last:pb-0">
                    {/* Cabecera de Categoría */}
                    <div className="px-3 py-1.5 text-[11px] font-black uppercase tracking-wider text-slate-400 flex items-center justify-between bg-slate-950/40 rounded-lg mb-1">
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
                            className={`w-full text-left px-3.5 py-3 rounded-xl flex items-center justify-between gap-3 transition-all cursor-pointer select-none min-h-[50px] active:scale-[0.99] ${
                              isSelected
                                ? 'bg-amber-500/15 text-amber-200 border border-amber-500/40 shadow-sm'
                                : 'hover:bg-slate-800/90 active:bg-slate-800 text-slate-200 border border-transparent'
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
                                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30 shrink-0">
                                      ID: {item.codigo}
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

            {/* Footer con botón de Listo / Aplicar */}
            <div className="p-3 border-t border-slate-800 bg-slate-950/90 flex items-center justify-between gap-2.5">
              <span className="text-[11px] text-slate-400 font-medium">
                {selectedItems.length > 0
                  ? `${selectedItems.length} equipo(s) seleccionado(s)`
                  : 'Sin selección activa'}
              </span>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-black text-xs rounded-xl transition-all cursor-pointer shadow-md min-h-[40px]"
              >
                Listo / Confirmar
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Resumen inferior de nodos seleccionados */}
      {selectedItems.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
          <span className="text-slate-500 font-bold uppercase text-[9px] tracking-wide">Topología Vinculada:</span>
          {selectedItems.map((item, idx) => (
            <span key={item.id} className="inline-flex items-center gap-1 text-[11px] text-slate-300 bg-slate-900/70 border border-slate-800 px-2 py-0.5 rounded-md">
              <span className="font-semibold text-slate-200 uppercase">{item.nombre}</span>
              <span className="text-amber-400 font-mono text-[9.5px]">({item.codigo || getElementCode(item)})</span>
              {idx < selectedItems.length - 1 && <span className="text-slate-600 font-bold">,</span>}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
