import React, { useState, useEffect, useRef, useMemo } from 'react';
import { API_BASE_URL } from '../utils/api';
import useStore from '../store/useStore';
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
  AlertCircle,
  Radio
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
    case 'PUNTO_MEDICION':
      return { icon: Radio, color: 'text-blue-400 bg-blue-500/10 border-blue-500/30' };
    default:
      return { icon: Zap, color: 'text-slate-400 bg-slate-500/10 border-slate-500/30' };
  }
};

/**
 * Componente Selector Dinámico e Inteligente de Alimentador / Nodo Padre Jerárquico
 */
export default function SelectorAlimentadorJerarquico({
  value = '',
  onChange,
  proyectoId,
  tableroActualId,
  elementosList = null,
  placeholder = 'Seleccionar equipo o acometida de alimentación...',
  disabled = false,
  label = 'Alimentado Por (Procedencia / Jerarquía)',
  className = ''
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
      if (el.tipoElemento === 'PUNTO_MEDICION') {
        return tech.tensionNominal || tech.nivelTensionContrato || 'Acometida Red';
      }
      return tech.tension || tech.voltaje || 'N/D';
    };

    return elementosList
      .filter((el) => !tableroActualId || (el.id !== tableroActualId && el.nombre !== tableroActualId))
      .map((el) => ({
        id: el.id,
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

  // Sincronizar el valor inicial con el estado local
  useEffect(() => {
    if (!value) {
      setCustomText('');
      return;
    }
    const found = items.find(
      (item) => item.nombre === value || item.id === value || `${item.nombre} (ID: ${item.id})` === value
    );
    if (!found && value && value.trim() !== '') {
      setIsCustomMode(true);
      setCustomText(value);
    } else if (found) {
      setIsCustomMode(false);
    }
  }, [value, items]);

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

  // Elemento seleccionado actual
  const selectedItem = useMemo(() => {
    if (!value) return null;
    return items.find(
      (item) => item.nombre === value || item.id === value || `${item.nombre} (ID: ${item.id})` === value
    );
  }, [value, items]);

  // Filtrado reactivo en tiempo real
  const filteredItems = useMemo(() => {
    if (!search.trim()) return items;
    const term = search.toLowerCase();
    return items.filter(
      (item) =>
        item.nombre?.toLowerCase().includes(term) ||
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

  const handleSelect = (item) => {
    setIsCustomMode(false);
    setCustomText('');
    setIsOpen(false);
    setSearch('');
    if (onChange) {
      onChange(item.nombre, item);
    }
  };

  const handleClear = (e) => {
    e.stopPropagation();
    setIsCustomMode(false);
    setCustomText('');
    if (onChange) {
      onChange('', null);
    }
  };

  return (
    <div className={`w-full space-y-1.5 ${className}`} ref={containerRef}>
      {label && (
        <div className="flex items-center justify-between">
          <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            {label}
          </label>
          {selectedItem && (
            <span className="text-[10px] text-amber-400 font-mono font-bold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              Nodo Jerárquico Vinculado
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
                  onChange(val, {
                    id: 'CUSTOM',
                    nombre: val,
                    tipoElemento: 'OTRO',
                    categoria: 'Acometida Externa',
                    nivelTension: 'Personalizado',
                    ubicacion: 'Exterior / Directo'
                  });
                }
              }}
              placeholder="Ej. Acometida Directa CORPOELEC, Generador Móvil, etc."
              className="w-full pl-9 pr-8 py-2.5 bg-slate-900 border border-amber-500/40 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition-all font-mono"
            />
            <Edit3 className="w-4 h-4 text-amber-400 absolute left-3 top-3" />
            {customText && (
              <button
                type="button"
                onClick={() => {
                  setCustomText('');
                  if (onChange) onChange('', null);
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
        /* MODO SELECTOR DINÁMICO */
        <div className="relative">
          <button
            type="button"
            disabled={disabled}
            onClick={() => setIsOpen(!isOpen)}
            className={`w-full min-h-[46px] px-3.5 py-2 rounded-xl text-left border flex items-center justify-between gap-3 transition-all duration-200 cursor-pointer ${
              isOpen
                ? 'bg-slate-900 border-amber-500 ring-2 ring-amber-500/20 shadow-lg shadow-amber-500/5'
                : 'bg-slate-900 hover:bg-slate-850 border-slate-800 hover:border-slate-750'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {selectedItem ? (
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                {(() => {
                  const { icon: ItemIcon, color } = getIconAndColor(selectedItem.tipoElemento);
                  return (
                    <div className={`p-1.5 rounded-lg border shrink-0 ${color}`}>
                      <ItemIcon className="w-4 h-4" />
                    </div>
                  );
                })()}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-slate-100 truncate">
                      {selectedItem.nombre}
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 shrink-0">
                      ⚡ {selectedItem.nivelTension}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                    <span className="truncate">{selectedItem.ubicacion}</span>
                    {selectedItem.detalles && (
                      <>
                        <span className="text-slate-600">•</span>
                        <span className="text-slate-400 truncate">{selectedItem.detalles}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <span className="text-sm text-slate-500 truncate font-mono">
                {value || placeholder}
              </span>
            )}

            <div className="flex items-center gap-1.5 shrink-0">
              {value && (
                <span
                  role="button"
                  tabIndex={0}
                  onClick={handleClear}
                  className="p-1 text-slate-400 hover:text-rose-400 rounded-md transition-colors"
                  title="Limpiar selección"
                >
                  <X className="w-4 h-4" />
                </span>
              )}
              <ChevronDown
                className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                  isOpen ? 'rotate-180 text-amber-400' : ''
                }`}
              />
            </div>
          </button>

          {/* MENÚ DESPLEGABLE CON BÚSQUEDA Y CATEGORÍAS */}
          {isOpen && (
            <div className="absolute z-50 left-0 right-0 mt-2 bg-slate-900 border border-slate-750 rounded-2xl shadow-2xl backdrop-blur-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              {/* Barra de búsqueda */}
              <div className="p-3 border-b border-slate-800 bg-slate-950/50">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar por nombre, tipo, nivel de tensión o ubicación..."
                    className="w-full pl-9 pr-8 py-2 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 font-mono"
                  />
                  {search && (
                    <button
                      type="button"
                      onClick={() => setSearch('')}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Lista de opciones agrupadas */}
              <div className="max-h-64 overflow-y-auto divide-y divide-slate-800/60 p-1.5 custom-scrollbar">
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
                      <div className="space-y-0.5 mt-1">
                        {group.map((item) => {
                          const isSelected = selectedItem?.id === item.id || value === item.nombre;
                          const { icon: ItemIcon, color } = getIconAndColor(item.tipoElemento);

                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => handleSelect(item)}
                              className={`w-full text-left px-2.5 py-2 rounded-xl flex items-center justify-between gap-3 transition-colors cursor-pointer ${
                                isSelected
                                  ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                                  : 'hover:bg-slate-800/80 text-slate-200'
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                <div className={`p-1.5 rounded-lg border shrink-0 ${color}`}>
                                  <ItemIcon className="w-3.5 h-3.5" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-semibold text-xs text-slate-100 truncate">
                                      {item.nombre}
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
                              {isSelected && <Check className="w-4 h-4 text-amber-400 shrink-0" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Opción: Entrada Manual / Acometida Externa */}
              <div className="p-2 border-t border-slate-800 bg-slate-950/70 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsCustomMode(true);
                    setIsOpen(false);
                  }}
                  className="w-full px-3 py-2 rounded-xl text-left flex items-center gap-2 text-xs text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 transition-colors font-medium border border-dashed border-amber-500/30 cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Personalizado / Acometida Externa (Texto Manual)</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* INSIGNIA SECUNDARIA RESUMEN DEL ALIMENTADOR SELECCIONADO */}
      {selectedItem && (
        <div className="flex items-center flex-wrap gap-2 px-3 py-1.5 bg-slate-900/60 border border-slate-800 rounded-xl text-[11px] text-slate-300 animate-in fade-in">
          <span className="text-slate-500 font-bold uppercase text-[9px] tracking-wide">Origen:</span>
          <span className="font-semibold text-slate-200">{selectedItem.nombre}</span>
          <span className="text-slate-600">•</span>
          <span className="text-amber-400 font-mono font-medium">⚡ {selectedItem.nivelTension}</span>
          <span className="text-slate-600">•</span>
          <span className="text-slate-400 truncate">📍 {selectedItem.ubicacion}</span>
        </div>
      )}
    </div>
  );
}
