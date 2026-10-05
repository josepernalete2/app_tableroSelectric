import React, { useState, useEffect, useRef, useMemo } from 'react';
import { API_BASE_URL } from '../utils/api';
import useStore, { getElementCode } from '../store/useStore';
import {
  Search,
  ChevronDown,
  Zap,
  Building2,
  Cpu,
  Layers,
  Activity,
  Edit3,
  X,
  Check,
  CheckSquare,
  Square,
  AlertCircle,
  Radio,
  Plus
} from 'lucide-react';

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
    case 'TRANSFER':
      return { icon: Activity, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' };
    case 'BANCO_CONDENSADOR':
      return { icon: Zap, color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' };
    case 'PUNTO_MEDICION':
      return { icon: Radio, color: 'text-blue-400 bg-blue-500/10 border-blue-500/30' };
    default:
      return { icon: Zap, color: 'text-slate-400 bg-slate-500/10 border-slate-500/30' };
  }
};

/**
 * Componente Selector Dinámico e Inteligente de Alimentador / Jerarquía con soporte de Selección Múltiple
 */
export default function SelectorAlimentadorJerarquico({
  value = '',
  onChange,
  proyectoId,
  tableroActualId,
  elementosList = null,
  placeholder = 'Seleccionar uno o varios equipos de alimentación...',
  disabled = false,
  label = 'Alimentado Por (Procedencia / Jerarquía)',
  className = '',
  allowQuickCreate = false,
  onQuickCreate = null,
  multiple = true
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [customText, setCustomText] = useState('');

  const containerRef = useRef(null);
  const searchInputRef = useRef(null);

  // Normalizar elementosList externos si se proporcionan
  const normalizedExternalList = useMemo(() => {
    if (!elementosList || !Array.isArray(elementosList)) return null;

    const resolverCategoria = (tipo) => {
      switch (tipo) {
        case 'SUBESTACION': return 'Subestaciones';
        case 'TRANSFORMADOR': return 'Transformadores';
        case 'CCM': return 'Celdas y CCM';
        case 'TABLERO': return 'Tableros Aguas Arriba';
        case 'BANCO_CONDENSADOR': return 'Bancos de Condensadores';
        case 'GENERADOR':
        case 'TRANSFER': return 'Generación y Transferencias';
        case 'PUNTO_MEDICION': return 'Puntos de Medición / Acometidas';
        case 'ALIMENTADOR': return 'Alimentadores Dedicados';
        default: return 'Otros Equipos';
      }
    };

    const resolverNivelTension = (el) => {
      const tech = typeof el.datosTecnicos === 'string'
        ? JSON.parse(el.datosTecnicos || '{}')
        : (el.datosTecnicos || {});

      if (el.tipoElemento === 'TRANSFORMADOR') {
        return tech.voltajeSecundario || tech.tensionSecundaria || tech.voltajePrimario || (tech.kva ? `${tech.kva} kVA` : 'N/D');
      }
      if (el.tipoElemento === 'SUBESTACION') {
        return el.nivelTension ? `${el.nivelTension} kV` : (tech.nivelTension || 'Media/Alta Tensión');
      }
      if (el.tipoElemento === 'TABLERO') {
        return tech.voltajeAcometida || tech.tension || (tech.voltaje?.va ? `${tech.voltaje.va}V` : '208/120 V');
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
      return tech.tension || tech.voltaje || 'N/D';
    };

    return elementosList
      .filter((el) => !tableroActualId || (el.id !== tableroActualId && el.nombre !== tableroActualId))
      .map((el) => ({
        id: el.id,
        codigo: el.codigo || getElementCode(el, el.tipoElemento),
        nombre: el.nombre,
        tipoElemento: el.tipoElemento || 'TABLERO',
        categoria: el.categoria || resolverCategoria(el.tipoElemento),
        nivelTension: el.nivelTension || resolverNivelTension(el),
        ubicacion: el.ubicacion || 'Ubicación no especificada',
        detalles: el.detalles || (el.datosTecnicos?.kva ? `${el.datosTecnicos.kva} kVA` : null)
      }));
  }, [elementosList, tableroActualId]);

  // Cargar datos desde el backend o usar lista normalizada
  useEffect(() => {
    if (normalizedExternalList && normalizedExternalList.length > 0) {
      setItems(normalizedExternalList);
      return;
    }

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
          if (isMounted && data.ok) {
            setItems(data.data || []);
          }
        }
      } catch (err) {
        console.error('Error al cargar potenciales alimentadores:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchFeeders();
    return () => { isMounted = false; };
  }, [proyectoId, tableroActualId, normalizedExternalList]);

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

  // Desglosar `value` en elementos seleccionados
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
      // Buscar por ID, código o nombre
      const found = items.find((item) => 
        item.id === token || 
        item.codigo === token || 
        item.nombre === token || 
        `${item.nombre} (ID: ${item.id})` === token ||
        `${item.nombre} (ID: ${item.codigo})` === token ||
        `${item.nombre} (${item.codigo})` === token ||
        token.toLowerCase().includes(item.nombre.toLowerCase())
      );

      if (found) {
        if (!result.some(r => r.id === found.id)) {
          result.push(found);
        }
      } else if (token) {
        // Objeto virtual/personalizado
        result.push({
          id: `custom_${token.replace(/\s+/g, '_')}`,
          nombre: token,
          codigo: 'EXT',
          tipoElemento: 'OTRO',
          categoria: 'Personalizado',
          nivelTension: 'Personalizado',
          ubicacion: 'Exterior / Directo',
          isCustom: true
        });
      }
    });

    return result;
  }, [value, items]);

  // Filtrado reactivo en tiempo real
  const filteredItems = useMemo(() => {
    if (!search.trim()) return items;
    const term = search.toLowerCase();
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

  // Agrupación visual por categoría
  const groupedItems = useMemo(() => {
    const groups = {};
    filteredItems.forEach((item) => {
      const cat = item.categoria || 'Otros Equipos';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(item);
    });
    return groups;
  }, [filteredItems]);

  const emitChange = (newSelectedItems) => {
    const formattedString = newSelectedItems.map(i => i.nombre).join(', ');
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
    setIsCustomMode(false);
    setCustomText('');
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
              {selectedItems.length === 1 ? '1 Fuente Jerárquica' : `${selectedItems.length} Fuentes Jerárquicas`}
            </span>
          )}
        </div>
      )}

      {/* MODO PERSONALIZADO / ACOMETIDA EXTERNA */}
      {isCustomMode ? (
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              disabled={disabled}
              value={customText}
              onChange={(e) => {
                const val = e.target.value;
                setCustomText(val);
                if (onChange) {
                  const parts = val.split(',').map(s => s.trim()).filter(Boolean);
                  onChange(val, {
                    id: 'CUSTOM',
                    nombre: val,
                    tipoElemento: 'OTRO',
                    categoria: 'Acometida Externa',
                    nivelTension: 'Personalizado',
                    ubicacion: 'Exterior / Directo'
                  }, parts);
                }
              }}
              placeholder="Ej. Acometida CORPOELEC, Generador 1, Generador 2..."
              className="w-full pl-9 pr-8 py-2.5 bg-slate-900 border border-amber-500/40 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition-all font-mono"
            />
            <Edit3 className="w-4 h-4 text-amber-400 absolute left-3 top-3" />
            {customText && (
              <button
                type="button"
                onClick={() => {
                  setCustomText('');
                  if (onChange) onChange('', null, []);
                }}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-200 p-0.5 rounded-md cursor-pointer"
                title="Borrar texto"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <button
            type="button"
            disabled={disabled}
            onClick={() => {
              setIsCustomMode(false);
              setIsOpen(true);
            }}
            className="px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer"
          >
            Ver Catálogo
          </button>
        </div>
      ) : (
        /* MODO SELECTOR DINÁMICO (SOPORTA MÚLTIPLE) */
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
                      className="inline-flex items-center gap-1.5 bg-slate-950/90 text-slate-100 border border-slate-700/80 hover:border-amber-500/40 rounded-lg px-2 py-1 text-xs shadow-xs"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span className={`p-0.5 rounded ${color}`}>
                        <ItemIcon className="w-3 h-3" />
                      </span>
                      <span className="font-semibold text-xs truncate max-w-[160px] sm:max-w-[220px]">
                        {sel.nombre}
                      </span>
                      {sel.codigo && (
                        <span className="font-mono text-[9px] font-bold text-amber-400 bg-amber-500/10 px-1 py-0.2 rounded border border-amber-500/20">
                          {sel.codigo}
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

          {/* MENÚ DESPLEGABLE CON BÚSQUEDA Y CATEGORÍAS */}
          {isOpen && (
            <div className="absolute z-50 left-0 right-0 mt-2 bg-slate-900 border border-slate-750 rounded-2xl shadow-2xl backdrop-blur-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              
              {/* Barra superior de búsqueda y controles de selección múltiple */}
              <div className="p-3 border-b border-slate-800 bg-slate-950/70 space-y-2">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar por nombre, código (gen-1), tensión o tipo..."
                    className="w-full pl-9 pr-8 py-2 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 font-mono"
                  />
                  {search && (
                    <button
                      type="button"
                      onClick={() => setSearch('')}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-white cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400 font-medium">
                    {selectedItems.length > 0 ? (
                      <>Seleccionados: <strong className="text-amber-400">{selectedItems.length}</strong> fuente(s)</>
                    ) : (
                      <span className="text-slate-500">Haz clic para marcar o desmarcar fuentes</span>
                    )}
                  </span>
                  {selectedItems.length > 0 && (
                    <button
                      type="button"
                      onClick={handleClear}
                      className="text-xs text-rose-400 hover:text-rose-300 font-bold cursor-pointer"
                    >
                      Deseleccionar Todo
                    </button>
                  )}
                </div>
              </div>

              {/* Lista de opciones agrupadas con casillas de verificación */}
              <div className="max-h-72 overflow-y-auto divide-y divide-slate-800/60 p-1.5 custom-scrollbar">
                {loading ? (
                  <div className="p-6 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                    Cargando jerarquía eléctrica del proyecto...
                  </div>
                ) : Object.keys(groupedItems).length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400 space-y-1">
                    <AlertCircle className="w-5 h-5 mx-auto text-slate-500 mb-1" />
                    <p className="font-semibold text-slate-300">No se encontraron equipos registrados</p>
                    <p className="text-[11px] text-slate-500">Puedes ingresar una acometida externa manual con la opción de abajo.</p>
                  </div>
                ) : (
                  Object.entries(groupedItems).map(([categoria, group]) => (
                    <div key={categoria} className="py-1.5 first:pt-0 last:pb-0">
                      {/* Cabecera de Categoría */}
                      <div className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center justify-between">
                        <span>{categoria}</span>
                        <span className="text-slate-400 font-mono text-[9px] bg-slate-800 px-1.5 py-0.5 rounded-full">
                          {group.length}
                        </span>
                      </div>

                      {/* Items del Grupo */}
                      <div className="space-y-1 mt-1">
                        {group.map((item) => {
                          const isSelected = selectedItems.some((sel) => sel.id === item.id);
                          const { icon: ItemIcon, color } = getIconAndColor(item.tipoElemento);

                          return (
                            <div
                              key={item.id}
                              onClick={() => handleToggleItem(item)}
                              className={`w-full text-left px-3 py-2 rounded-xl flex items-center justify-between gap-3 transition-colors cursor-pointer select-none ${
                                isSelected
                                  ? 'bg-amber-500/15 text-amber-300 border border-amber-500/40 shadow-xs'
                                  : 'hover:bg-slate-800/80 text-slate-200 border border-transparent'
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                <div className="shrink-0 text-amber-400">
                                  {isSelected ? (
                                    <CheckSquare className="w-4 h-4 fill-amber-500/20" />
                                  ) : (
                                    <Square className="w-4 h-4 text-slate-600" />
                                  )}
                                </div>
                                <div className={`p-1.5 rounded-lg border shrink-0 ${color}`}>
                                  <ItemIcon className="w-3.5 h-3.5" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-semibold text-xs text-slate-100 truncate">
                                      {item.nombre}
                                    </span>
                                    <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
                                      ID: {item.codigo || getElementCode(item, item.tipoElemento)}
                                    </span>
                                    <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-slate-800 text-amber-300 shrink-0">
                                      ⚡ {item.nivelTension}
                                    </span>
                                  </div>
                                  <div className="text-[11px] text-slate-400 truncate mt-0.5">
                                    📍 {item.ubicacion}
                                    {item.detalles ? ` • ${item.detalles}` : ''}
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

              {/* Footer con opciones de creación rápida, entrada manual y botón Listo */}
              <div className="p-2.5 border-t border-slate-800 bg-slate-950/90 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsCustomMode(true);
                      setIsOpen(false);
                    }}
                    className="flex-1 px-3 py-1.5 rounded-xl text-left flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 transition-colors font-medium border border-dashed border-amber-500/30 cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">Texto Manual / Acometida Externa</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition-all cursor-pointer shadow-md shrink-0"
                  >
                    Listo / Aplicar
                  </button>
                </div>

                {(allowQuickCreate || onQuickCreate) && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsOpen(false);
                      if (onQuickCreate) {
                        onQuickCreate();
                      }
                    }}
                    className="w-full px-3 py-1.5 rounded-xl text-left flex items-center gap-2 text-xs text-emerald-400 hover:text-emerald-300 bg-emerald-950/30 hover:bg-emerald-900/40 transition-colors font-bold border border-emerald-500/30 cursor-pointer shadow-sm"
                  >
                    <span className="p-0.5 bg-emerald-500 text-slate-950 rounded font-black text-[10px] leading-none">+</span>
                    <span>Crear nueva fuente / nodo en línea</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* RESUMEN INFERIOR DE FUENTES SELECCIONADAS */}
      {selectedItems.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-slate-500 font-bold uppercase text-[9px] tracking-wide">Fuentes Vinculadas:</span>
          {selectedItems.map((item, idx) => (
            <span key={item.id} className="inline-flex items-center gap-1 text-[11px] text-slate-300 bg-slate-900/70 border border-slate-800 px-2 py-0.5 rounded-md">
              <span className="font-semibold text-slate-200">{item.nombre}</span>
              <span className="text-amber-400 font-mono text-[9.5px]">({item.codigo || getElementCode(item)})</span>
              {idx < selectedItems.length - 1 && <span className="text-slate-600 font-bold">,</span>}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
