import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ChevronDown, Zap, Plus, Check, ShieldCheck, Tag } from 'lucide-react';
import { 
  TENSIONES_COVENIN_159_BT, 
  TENSIONES_COVENIN_159_MT, 
  TENSIONES_COVENIN_TODAS,
  CATALOGO_COVENIN_159
} from '../utils/constants';
import { getCustomOptions, saveCustomOption } from '../utils/customPresets';

/**
 * ============================================================================
 * COMPONENTE: TensionNominalInput
 * Normativa: Norma Venezolana COVENIN 159:1997
 * "Tensiones normales en sistemas de distribución y utilización de energía eléctrica"
 * ============================================================================
 * 
 * Permite seleccionar o ingresar niveles de tensión normalizados en el mercado
 * venezolano, con:
 * - Clasificación estricta en Baja Tensión (120 V - 600 V) y Media Tensión (> 600 V - 34,5 kV)
 * - Agrupación por configuración de fases, hilos y conexión (Estrella Y, Delta ▲)
 * - Selector de inserción: Formato Estándar Completo (ej: '208Y/120 V (3Φ - 4 hilos Estrella)')
 *   o Formato Compacto (ej: '208Y/120 V')
 * - Búsqueda tolerante por alias (ej: '13.8', 'delta', 'estrella', '208', '480')
 * - Soporte para escritura libre y autoguardado en almacenamiento local (Local-First)
 */
export default function TensionNominalInput({
  value = '',
  onChange,
  tipo = 'BT', // 'BT' | 'MT' | 'TODAS'
  placeholder = 'Ej. 208Y/120 V o 13800 V (COVENIN 159)...',
  className = '',
  disabled = false,
  id = 'tension-nominal-input'
}) {
  const [isOpen, setIsOpen] = useState(false);
  // 'completo' = Inserta formato con descripción de hilos/conexión; 'compacto' = Inserta solo valor de tensión
  const [formatoModo, setFormatoModo] = useState('completo');
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  // Opciones base según el tipo requerido
  const baseOptions = useMemo(() => {
    if (tipo === 'MT') return TENSIONES_COVENIN_159_MT;
    if (tipo === 'TODAS') return TENSIONES_COVENIN_TODAS;
    return TENSIONES_COVENIN_159_BT;
  }, [tipo]);

  const categoryKey = `tensiones_${tipo.toLowerCase()}`;
  const [options, setOptions] = useState(() => getCustomOptions(categoryKey, baseOptions));

  // Escuchar actualizaciones de presets personalizados entre componentes
  useEffect(() => {
    const handleUpdate = (e) => {
      if (!e.detail || e.detail.category === categoryKey || e.detail.category === 'tensiones_todas') {
        setOptions(getCustomOptions(categoryKey, baseOptions));
      }
    };
    window.addEventListener('custom_options_updated', handleUpdate);
    return () => window.removeEventListener('custom_options_updated', handleUpdate);
  }, [categoryKey, baseOptions]);

  // Cerrar al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e) => {
    const val = e.target.value;
    onChange?.(val);
  };

  const persistCurrentValue = (valToSave) => {
    const target = valToSave || value;
    if (target && target.trim()) {
      saveCustomOption(categoryKey, target.trim(), baseOptions);
      saveCustomOption('tensiones_todas', target.trim(), TENSIONES_COVENIN_TODAS);
    }
  };

  const handleBlur = () => {
    persistCurrentValue();
  };

  const handleSelectOption = (selectedValue) => {
    onChange?.(selectedValue);
    persistCurrentValue(selectedValue);
    setIsOpen(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      persistCurrentValue();
      setIsOpen(false);
      inputRef.current?.blur();
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  // Mapa de búsqueda rápida en el catálogo maestro COVENIN 159
  const catalogoFiltrado = useMemo(() => {
    return CATALOGO_COVENIN_159.filter(item => {
      if (tipo === 'BT') return item.rango === 'BT';
      if (tipo === 'MT') return item.rango === 'MT';
      return true; // 'TODAS'
    });
  }, [tipo]);

  // Lista de opciones personalizadas guardadas por el usuario (que no estén en el catálogo oficial)
  const customSavedOptions = useMemo(() => {
    const catalogoLabels = new Set(catalogoFiltrado.map(c => c.label.toLowerCase()));
    const catalogoValores = new Set(catalogoFiltrado.map(c => c.valor.toLowerCase()));

    return options.filter(opt => {
      const lower = opt.toLowerCase().trim();
      return !catalogoLabels.has(lower) && !catalogoValores.has(lower);
    });
  }, [options, catalogoFiltrado]);

  // Filtro tolerante e inteligente al tipear
  const searchTerm = (value || '').trim().toLowerCase();

  const catalogoCoincidencias = useMemo(() => {
    if (!searchTerm) return catalogoFiltrado;

    return catalogoFiltrado.filter(item => {
      if (item.valor.toLowerCase().includes(searchTerm)) return true;
      if (item.label.toLowerCase().includes(searchTerm)) return true;
      if (item.sistema.toLowerCase().includes(searchTerm)) return true;
      if (item.subgrupo?.toLowerCase().includes(searchTerm)) return true;
      if (item.conexion?.toLowerCase().includes(searchTerm)) return true;
      if (item.alias?.some(a => a.toLowerCase().includes(searchTerm))) return true;
      return false;
    });
  }, [catalogoFiltrado, searchTerm]);

  const customCoincidencias = useMemo(() => {
    if (!searchTerm) return customSavedOptions;
    return customSavedOptions.filter(opt => opt.toLowerCase().includes(searchTerm));
  }, [customSavedOptions, searchTerm]);

  // Verificar si el valor actual es personalizado
  const isCustomValue = useMemo(() => {
    if (!searchTerm) return false;
    const matchCatalogo = catalogoFiltrado.some(
      c => c.valor.toLowerCase() === searchTerm || c.label.toLowerCase() === searchTerm
    );
    const matchCustom = customSavedOptions.some(c => c.toLowerCase() === searchTerm);
    return !matchCatalogo && !matchCustom;
  }, [searchTerm, catalogoFiltrado, customSavedOptions]);

  // Helper para verificar si un ítem está seleccionado
  const isItemActive = (item) => {
    if (!value) return false;
    const current = value.trim().toLowerCase();
    return current === item.valor.toLowerCase() || 
           current === item.label.toLowerCase() ||
           item.alias?.some(a => a.toLowerCase() === current);
  };

  // Agrupación visual de los ítems del catálogo
  const gruposNormativos = useMemo(() => {
    const grupos = {};
    catalogoCoincidencias.forEach(item => {
      const key = `${item.rangoTexto} — ${item.subgrupo}`;
      if (!grupos[key]) {
        grupos[key] = {
          rango: item.rango,
          rangoTexto: item.rangoTexto,
          subgrupo: item.subgrupo,
          items: []
        };
      }
      grupos[key].items.push(item);
    });
    return Object.values(grupos);
  }, [catalogoCoincidencias]);

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* Input principal de entrada con disparador de dropdown */}
      <div className="relative flex items-center">
        <input
          ref={inputRef}
          type="text"
          id={id}
          disabled={disabled}
          value={value}
          onChange={handleInputChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          autoComplete="off"
          className="w-full bg-slate-950 border border-slate-700/80 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-xl px-3.5 py-2 pr-10 text-xs font-mono text-slate-100 placeholder-slate-500 outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-inner"
        />
        
        <button
          type="button"
          tabIndex={-1}
          disabled={disabled}
          onClick={() => setIsOpen(prev => !prev)}
          className="absolute right-2 p-1.5 text-slate-400 hover:text-amber-400 transition-colors cursor-pointer rounded-lg hover:bg-slate-800"
          title="Ver tensiones normalizadas COVENIN 159:1997"
        >
          <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180 text-amber-400' : ''}`} />
        </button>
      </div>

      {/* Menú Desplegable con Estandarización COVENIN 159:1997 */}
      {isOpen && !disabled && (
        <div className="absolute z-50 left-0 right-0 mt-1.5 bg-slate-900 border border-slate-700/90 rounded-xl shadow-2xl overflow-hidden backdrop-blur-md max-h-80 overflow-y-auto ring-1 ring-amber-500/20 animate-in fade-in zoom-in-95 duration-100">
          
          {/* Encabezado Normativo y Selector de Formato */}
          <div className="px-3 py-2 bg-slate-950/90 border-b border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1.5 text-[10px] font-mono text-slate-400">
            <span className="flex items-center gap-1.5 font-bold text-amber-400">
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              <span>COVENIN 159:1997</span>
              <span className="text-[9px] px-1.5 py-0.2 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded font-sans">
                {tipo === 'BT' ? 'Baja Tensión' : tipo === 'MT' ? 'Media Tensión' : 'BT / MT'}
              </span>
            </span>

            {/* Alternador de Formato (Completo vs Compacto) */}
            <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-800 text-[10px]">
              <button
                type="button"
                onClick={() => setFormatoModo('completo')}
                className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
                  formatoModo === 'completo'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Inserta valor con sistema de hilos y conexión (ej. 208Y/120 V 3Φ-4H)"
              >
                Completo
              </button>
              <button
                type="button"
                onClick={() => setFormatoModo('compacto')}
                className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
                  formatoModo === 'compacto'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Inserta únicamente la magnitud de tensión (ej. 208Y/120 V)"
              >
                Solo Tensión
              </button>
            </div>
          </div>

          <div className="p-1.5 space-y-2">
            {/* 1. SECCIONES DEL CATÁLOGO OFICIAL COVENIN 159 */}
            {gruposNormativos.length > 0 ? (
              gruposNormativos.map((grupo) => (
                <div key={`${grupo.rango}-${grupo.subgrupo}`} className="space-y-1">
                  {/* Título del Subgrupo */}
                  <div className="px-2 pt-1 pb-0.5 flex items-center justify-between text-[10px] uppercase font-bold tracking-wider text-slate-400 border-b border-slate-800/60">
                    <span className="flex items-center gap-1 text-slate-300">
                      <ShieldCheck className="w-3 h-3 text-amber-400" />
                      {grupo.subgrupo}
                    </span>
                    <span className="text-[9px] font-mono text-slate-500">
                      {grupo.rangoTexto}
                    </span>
                  </div>

                  {/* Opciones del Subgrupo */}
                  <div className="space-y-0.5">
                    {grupo.items.map((item) => {
                      const isSelected = isItemActive(item);
                      const insertionValue = formatoModo === 'completo' ? item.label : item.valor;
                      const altValue = formatoModo === 'completo' ? item.valor : item.label;

                      return (
                        <div
                          key={item.id}
                          className={`w-full group rounded-lg text-xs font-mono flex items-center justify-between transition-colors border ${
                            isSelected 
                              ? 'bg-amber-500/15 border-amber-500/40 text-amber-200' 
                              : 'border-transparent hover:bg-slate-800/80 hover:border-slate-700/60 text-slate-200'
                          }`}
                        >
                          {/* Botón Principal (Inserta según el formato seleccionado) */}
                          <button
                            type="button"
                            onClick={() => handleSelectOption(insertionValue)}
                            className="flex-1 text-left px-2.5 py-1.5 flex items-center justify-between min-w-0 cursor-pointer"
                          >
                            <div className="flex flex-col min-w-0 pr-2">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className={`font-bold font-mono ${isSelected ? 'text-amber-300' : 'text-slate-100 group-hover:text-amber-400'}`}>
                                  {item.valor}
                                </span>

                                {/* Badges Técnicos Normativos */}
                                {item.conexion === 'Delta' && (
                                  <span className="text-[9px] font-sans px-1.5 py-0.2 rounded bg-amber-950/70 text-amber-400 border border-amber-800/60">
                                    ▲ Delta 3H
                                  </span>
                                )}
                                {item.conexion === 'Estrella' && (
                                  <span className="text-[9px] font-sans px-1.5 py-0.2 rounded bg-sky-950/70 text-sky-400 border border-sky-800/60">
                                    Y Estrella 4H
                                  </span>
                                )}
                                {item.fases === '1Φ' && (
                                  <span className="text-[9px] font-sans px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700">
                                    1Φ 2H
                                  </span>
                                )}
                                {item.fases === '2Φ' && (
                                  <span className="text-[9px] font-sans px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700">
                                    2Φ {item.hilos}H
                                  </span>
                                )}
                              </div>

                              <span className="text-[10px] text-slate-400 truncate mt-0.5 font-sans">
                                {item.sistema}
                              </span>
                            </div>

                            {isSelected && (
                              <Check className="w-4 h-4 text-amber-400 shrink-0 ml-1" />
                            )}
                          </button>

                          {/* Botón Rápido Alternativo (Inserta la otra variante: valor directo o label completo) */}
                          <button
                            type="button"
                            tabIndex={-1}
                            onClick={() => handleSelectOption(altValue)}
                            className="shrink-0 px-2 py-1 mr-1 text-[9px] font-sans text-slate-400 hover:text-amber-300 bg-slate-950/60 hover:bg-slate-800 border border-slate-800 rounded transition-colors cursor-pointer"
                            title={`Insertar alternativa: "${altValue}"`}
                          >
                            {formatoModo === 'completo' ? 'Solo V' : 'Completo'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            ) : null}

            {/* 2. OPCIONES FRECUENTES GUARDADAS POR EL USUARIO */}
            {customCoincidencias.length > 0 && (
              <div className="space-y-1 pt-1 border-t border-slate-800">
                <div className="px-2 pt-1 pb-0.5 flex items-center justify-between text-[10px] uppercase font-bold tracking-wider text-slate-400">
                  <span className="flex items-center gap-1 text-sky-400">
                    <Tag className="w-3 h-3 text-sky-400" />
                    Opciones Frecuentes Guardadas
                  </span>
                  <span className="text-[9px] font-mono text-slate-500">Local-First</span>
                </div>

                <div className="space-y-0.5">
                  {customCoincidencias.map((opt) => {
                    const isSelected = value?.trim().toLowerCase() === opt.toLowerCase();

                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => handleSelectOption(opt)}
                        className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-mono flex items-center justify-between transition-colors cursor-pointer border ${
                          isSelected 
                            ? 'bg-sky-500/20 text-sky-300 font-bold border-sky-500/40' 
                            : 'border-transparent text-slate-200 hover:bg-slate-800/80 hover:text-white'
                        }`}
                      >
                        <span className="truncate">{opt}</span>
                        <div className="flex items-center gap-1.5 shrink-0 ml-2">
                          <span className="text-[9px] px-1.5 py-0.2 bg-sky-950 text-sky-400 border border-sky-800 rounded font-sans">
                            Guardado
                          </span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-sky-400" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 3. SIN COINCIDENCIAS DIRECTAS */}
            {gruposNormativos.length === 0 && customCoincidencias.length === 0 && (
              <div className="p-3 text-center text-xs text-slate-400 font-mono">
                No coincide con catálogo COVENIN 159. Presiona <span className="text-amber-400 font-bold">Enter</span> para usar "{value}"
              </div>
            )}

            {/* 4. BOTÓN PARA USAR VALOR PERSONALIZADO NO REGISTRADO */}
            {isCustomValue && (
              <button
                type="button"
                onClick={() => handleSelectOption(value)}
                className="w-full text-left px-3 py-2 rounded-lg text-xs font-mono bg-emerald-950/40 text-emerald-300 border border-emerald-800/60 hover:bg-emerald-900/50 flex items-center gap-2 transition-colors cursor-pointer mt-1"
              >
                <Plus className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="truncate">Guardar y usar personalizado: <strong>{value}</strong></span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

