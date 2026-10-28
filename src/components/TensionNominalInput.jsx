import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { 
  ChevronDown, 
  Zap, 
  Plus, 
  Check, 
  ShieldCheck, 
  Tag, 
  Search, 
  X, 
  Sparkles,
  SlidersHorizontal,
  Layers,
  Info
} from 'lucide-react';
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
 * Normativa: Norma Venezolana COVENIN 159:1997 / Código Eléctrico Nacional CEN 200
 * "Tensiones normales en sistemas de distribución y utilización de energía eléctrica"
 * ============================================================================
 * 
 * Despliega un cuadro flotante amplio y expansivo (Popover Portal) para la
 * selección de tensiones normalizadas en Punto de Suministro y sistemas eléctricos:
 * - Renderizado en Portal para evitar cualquier recorte o desborde por contenedores padres
 * - Posicionamiento dinámico adaptativo (evita cortes en bordes de pantalla y ajusta verticalmente)
 * - Tarjetas enriquecidas con visualización nítida de magnitud, fases, hilos, conexión y sistema
 * - Pestañas de filtrado (Todas, Baja Tensión 120V-600V, Media Tensión >600V-34.5kV)
 * - Selector rápido de formato: Formato Completo descriptivo vs. Solo Tensión / Magnitud
 * - Búsqueda tolerante en tiempo real y soporte de tensiones personalizadas
 */
export default function TensionNominalInput({
  value = '',
  onChange,
  tipo = 'TODAS', // 'BT' | 'MT' | 'TODAS'
  placeholder = 'Ej. 13800 V o 208Y/120 V (COVENIN 159)...',
  className = '',
  disabled = false,
  id = 'tension-nominal-input'
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [formatoModo, setFormatoModo] = useState('completo'); // 'completo' | 'compacto'
  const [activeTab, setActiveTab] = useState(() => (tipo === 'BT' ? 'BT' : tipo === 'MT' ? 'MT' : 'TODAS'));
  const [searchFilter, setSearchFilter] = useState('');
  
  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const popoverRef = useRef(null);
  const searchInputRef = useRef(null);

  // Posicionamiento dinámico para el cuadro flotante expansivo
  const [popoverPos, setPopoverPos] = useState({
    top: 0,
    left: 0,
    width: 680,
    maxHeight: 520,
    openUpward: false,
    isMobile: false
  });

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

  // Sincronizar tab si la propiedad tipo cambia
  useEffect(() => {
    if (tipo === 'BT') setActiveTab('BT');
    else if (tipo === 'MT') setActiveTab('MT');
    else setActiveTab('TODAS');
  }, [tipo]);

  // Cálculo geométrico del cuadro flotante amplio
  const updatePopoverPosition = useCallback(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const isMobile = vw < 640;

    if (isMobile) {
      const panelWidth = Math.min(vw - 20, 520);
      const panelHeight = Math.min(vh - 40, 560);
      const top = Math.max(16, (vh - panelHeight) / 2);
      const left = Math.max(10, (vw - panelWidth) / 2);

      setPopoverPos({
        top,
        left,
        width: panelWidth,
        maxHeight: panelHeight,
        openUpward: false,
        isMobile: true
      });
      return;
    }

    // Desktop / Tablet: cuadro amplio de 640px a 720px
    const panelWidth = Math.min(700, vw - 32);

    // Alineación horizontal: intentar alinear a la izquierda del input
    let left = rect.left;
    // Si se desborda por la derecha de la pantalla, desplazar a la izquierda
    if (left + panelWidth > vw - 16) {
      left = Math.max(16, rect.right - panelWidth);
    }
    if (left < 16) {
      left = 16;
    }

    // Alineación vertical: comprobar espacio inferior vs superior
    const spaceBelow = vh - rect.bottom - 10;
    const spaceAbove = rect.top - 10;
    const openUpward = spaceBelow < 380 && spaceAbove > spaceBelow;

    const maxHeight = Math.min(520, openUpward ? spaceAbove : spaceBelow);
    const top = openUpward ? Math.max(10, rect.top - maxHeight - 6) : rect.bottom + 6;

    setPopoverPos({
      top,
      left,
      width: panelWidth,
      maxHeight,
      openUpward,
      isMobile: false
    });
  }, []);

  // Recalcular posición al abrir, redimensionar o hacer scroll
  useEffect(() => {
    if (!isOpen) return;

    updatePopoverPosition();
    const handleScrollOrResize = () => updatePopoverPosition();

    window.addEventListener('resize', handleScrollOrResize);
    window.addEventListener('scroll', handleScrollOrResize, true);

    return () => {
      window.removeEventListener('resize', handleScrollOrResize);
      window.removeEventListener('scroll', handleScrollOrResize, true);
    };
  }, [isOpen, updatePopoverPosition]);

  // Cerrar al hacer clic fuera (tanto del input como del portal flotante)
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target) &&
        popoverRef.current &&
        !popoverRef.current.contains(e.target)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDownGlobal = (e) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    document.addEventListener('keydown', handleKeyDownGlobal);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDownGlobal);
    };
  }, [isOpen]);

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

  // Filtrar catálogo oficial por pestaña y búsqueda
  const catalogoFiltradoPorTab = useMemo(() => {
    return CATALOGO_COVENIN_159.filter(item => {
      if (activeTab === 'BT') return item.rango === 'BT';
      if (activeTab === 'MT') return item.rango === 'MT';
      return true; // 'TODAS'
    });
  }, [activeTab]);

  // Lista de opciones personalizadas guardadas por el usuario
  const customSavedOptions = useMemo(() => {
    const catalogoLabels = new Set(CATALOGO_COVENIN_159.map(c => c.label.toLowerCase()));
    const catalogoValores = new Set(CATALOGO_COVENIN_159.map(c => c.valor.toLowerCase()));

    return options.filter(opt => {
      const lower = opt.toLowerCase().trim();
      return !catalogoLabels.has(lower) && !catalogoValores.has(lower);
    });
  }, [options]);

  // Término de búsqueda unificado (prioriza búsqueda interna del panel o el valor escrito)
  const effectiveSearchTerm = (searchFilter || value || '').trim().toLowerCase();

  const catalogoCoincidencias = useMemo(() => {
    if (!effectiveSearchTerm) return catalogoFiltradoPorTab;

    return catalogoFiltradoPorTab.filter(item => {
      if (item.valor.toLowerCase().includes(effectiveSearchTerm)) return true;
      if (item.label.toLowerCase().includes(effectiveSearchTerm)) return true;
      if (item.sistema.toLowerCase().includes(effectiveSearchTerm)) return true;
      if (item.subgrupo?.toLowerCase().includes(effectiveSearchTerm)) return true;
      if (item.conexion?.toLowerCase().includes(effectiveSearchTerm)) return true;
      if (item.alias?.some(a => a.toLowerCase().includes(effectiveSearchTerm))) return true;
      return false;
    });
  }, [catalogoFiltradoPorTab, effectiveSearchTerm]);

  const customCoincidencias = useMemo(() => {
    if (!effectiveSearchTerm) return customSavedOptions;
    return customSavedOptions.filter(opt => opt.toLowerCase().includes(effectiveSearchTerm));
  }, [customSavedOptions, effectiveSearchTerm]);

  // Verificar si el valor actual es personalizado y no está en el catálogo
  const isCustomValue = useMemo(() => {
    if (!effectiveSearchTerm) return false;
    const matchCatalogo = CATALOGO_COVENIN_159.some(
      c => c.valor.toLowerCase() === effectiveSearchTerm || c.label.toLowerCase() === effectiveSearchTerm
    );
    const matchCustom = customSavedOptions.some(c => c.toLowerCase() === effectiveSearchTerm);
    return !matchCatalogo && !matchCustom;
  }, [effectiveSearchTerm, customSavedOptions]);

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

  // Conteo de opciones por rango para las pestañas
  const counts = useMemo(() => {
    const btCount = CATALOGO_COVENIN_159.filter(c => c.rango === 'BT').length;
    const mtCount = CATALOGO_COVENIN_159.filter(c => c.rango === 'MT').length;
    return {
      todas: CATALOGO_COVENIN_159.length,
      bt: btCount,
      mt: mtCount
    };
  }, []);

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* Input principal de entrada con disparador de cuadro flotante */}
      <div className="relative flex items-center group">
        <input
          ref={inputRef}
          type="text"
          id={id}
          disabled={disabled}
          value={value}
          onChange={handleInputChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            updatePopoverPosition();
            setIsOpen(true);
          }}
          placeholder={placeholder}
          autoComplete="off"
          className="w-full bg-slate-950 border border-slate-700/80 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-xl px-3.5 py-2.5 pr-10 text-xs font-mono text-slate-100 placeholder-slate-500 outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-inner"
        />
        
        <button
          type="button"
          tabIndex={-1}
          disabled={disabled}
          onClick={() => {
            if (!isOpen) updatePopoverPosition();
            setIsOpen(prev => !prev);
          }}
          className="absolute right-2 p-1.5 text-slate-400 hover:text-amber-400 transition-colors cursor-pointer rounded-lg hover:bg-slate-800"
          title="Abrir catálogo amplio de tensiones COVENIN 159:1997"
        >
          <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180 text-amber-400' : ''}`} />
        </button>
      </div>

      {/* CUADRO FLOTANTE AMPLIO Y EXPANSIVO (RENDERIZADO EN PORTAL) */}
      {isOpen && !disabled && typeof document !== 'undefined' && createPortal(
        <>
          {/* Backdrop tenue en pantallas móviles para máxima concentración */}
          {popoverPos.isMobile && (
            <div 
              className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs z-[99998] animate-in fade-in duration-150"
              onClick={() => setIsOpen(false)}
            />
          )}

          {/* Panel Flotante Principal */}
          <div
            ref={popoverRef}
            style={{
              position: 'fixed',
              top: `${popoverPos.top}px`,
              left: `${popoverPos.left}px`,
              width: `${popoverPos.width}px`,
              maxHeight: `${popoverPos.maxHeight}px`
            }}
            className="z-[99999] flex flex-col bg-slate-900/98 border border-slate-700/90 rounded-2xl shadow-2xl shadow-black/90 backdrop-blur-2xl ring-1 ring-amber-500/30 overflow-hidden animate-in fade-in zoom-in-95 duration-150 select-text"
          >
            {/* CABECERA EXPANSIVA: TÍTULO NORMATIVO Y ACCIONES */}
            <div className="px-4 py-3 bg-slate-950/95 border-b border-slate-800 flex flex-col gap-2.5 shrink-0">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-400">
                    <Zap className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-100 flex items-center gap-1.5 font-mono">
                      <span>COVENIN 159:1997</span>
                      <span className="text-[10px] font-sans font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                        CEN 200
                      </span>
                    </h3>
                    <p className="text-[10px] text-slate-400 font-sans">
                      Catálogo Oficial de Tensiones Normalizadas de Suministro y Utilización
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Selector de Formato de Inserción */}
                  <div className="flex items-center bg-slate-900 p-0.5 rounded-lg border border-slate-800 text-[10px]">
                    <button
                      type="button"
                      onClick={() => setFormatoModo('completo')}
                      className={`px-2 py-1 rounded-md transition-all cursor-pointer font-sans ${
                        formatoModo === 'completo'
                          ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                      title="Inserta descripción con fases e hilos (ej. 208Y/120 V 3Φ-4H Estrella)"
                    >
                      Completo
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormatoModo('compacto')}
                      className={`px-2 py-1 rounded-md transition-all cursor-pointer font-sans ${
                        formatoModo === 'compacto'
                          ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                      title="Inserta solo magnitud de voltaje (ej. 208Y/120 V)"
                    >
                      Solo Voltios
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                    title="Cerrar catálogo"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* BARRA DE FILTRADO RÁPIDO Y BUSCADOR INTERNO */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-1 border-t border-slate-800/80">
                {/* Pestañas de Clasificación Normativa */}
                <div className="flex items-center gap-1 overflow-x-auto pb-0.5 text-xs font-sans">
                  <button
                    type="button"
                    onClick={() => setActiveTab('TODAS')}
                    className={`px-2.5 py-1 rounded-lg text-[10.5px] font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                      activeTab === 'TODAS'
                        ? 'bg-slate-800 text-amber-400 border border-amber-500/30'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent'
                    }`}
                  >
                    <Layers className="w-3 h-3" />
                    <span>Todas</span>
                    <span className="text-[9px] px-1.5 py-0.2 bg-slate-950 rounded-full font-mono text-slate-400">
                      {counts.todas}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('BT')}
                    className={`px-2.5 py-1 rounded-lg text-[10.5px] font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                      activeTab === 'BT'
                        ? 'bg-amber-500/15 text-amber-300 border border-amber-500/40'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent'
                    }`}
                  >
                    <span>⚡ Baja Tensión (120V - 600V)</span>
                    <span className="text-[9px] px-1.5 py-0.2 bg-slate-950 rounded-full font-mono text-slate-400">
                      {counts.bt}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('MT')}
                    className={`px-2.5 py-1 rounded-lg text-[10.5px] font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                      activeTab === 'MT'
                        ? 'bg-sky-500/15 text-sky-300 border border-sky-500/40'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent'
                    }`}
                  >
                    <span>🏭 Media Tensión (&gt;600V - 34.5kV)</span>
                    <span className="text-[9px] px-1.5 py-0.2 bg-slate-950 rounded-full font-mono text-slate-400">
                      {counts.mt}
                    </span>
                  </button>
                </div>

                {/* Buscador Interactivo Integrado */}
                <div className="relative min-w-[180px] sm:w-48">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    placeholder="Filtrar voltios, fases..."
                    className="w-full pl-8 pr-7 py-1 bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-lg text-[11px] text-slate-200 placeholder-slate-600 outline-none font-mono"
                  />
                  {searchFilter && (
                    <button
                      type="button"
                      onClick={() => setSearchFilter('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* CUERPO DEL CATÁLOGO: TARJETAS EXPANSIVAS CON INFORMACIÓN COMPLETA */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-4">
              {gruposNormativos.length > 0 ? (
                gruposNormativos.map((grupo) => (
                  <div key={`${grupo.rango}-${grupo.subgrupo}`} className="space-y-2">
                    {/* Encabezado del Subgrupo */}
                    <div className="px-2 py-1 flex items-center justify-between text-[11px] uppercase font-black tracking-wider text-slate-300 bg-slate-950/60 rounded-lg border border-slate-800/80">
                      <span className="flex items-center gap-1.5 text-amber-400">
                        <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                        {grupo.subgrupo}
                      </span>
                      <span className="text-[9.5px] font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                        {grupo.rangoTexto}
                      </span>
                    </div>

                    {/* Tarjetas de Opciones Expansivas */}
                    <div className="grid grid-cols-1 gap-2">
                      {grupo.items.map((item) => {
                        const isSelected = isItemActive(item);
                        const insertionValue = formatoModo === 'completo' ? item.label : item.valor;
                        const altValue = formatoModo === 'completo' ? item.valor : item.label;

                        return (
                          <div
                            key={item.id}
                            className={`group rounded-xl p-3 sm:p-3.5 transition-all border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                              isSelected
                                ? 'bg-amber-500/15 border-amber-500/60 shadow-md ring-1 ring-amber-500/30'
                                : 'bg-slate-950/50 border-slate-800/90 hover:border-slate-700 hover:bg-slate-800/50'
                            }`}
                          >
                            {/* Información Técnica Nítida */}
                            <div className="flex-1 min-w-0 space-y-1.5">
                              {/* Fila 1: Magnitud Principal y Badges Normativos */}
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`text-sm sm:text-base font-black font-mono tracking-tight ${
                                  isSelected ? 'text-amber-300' : 'text-slate-100 group-hover:text-amber-400'
                                }`}>
                                  {item.valor}
                                </span>

                                {/* Badges Técnicos Claros */}
                                {item.conexion === 'Delta' && (
                                  <span className="text-[10px] font-bold font-sans px-2 py-0.5 rounded-md bg-amber-950/80 text-amber-400 border border-amber-700/60 flex items-center gap-1">
                                    <span>▲</span> Delta 3 Hilos (Sin Neutro)
                                  </span>
                                )}
                                {item.conexion === 'Estrella' && (
                                  <span className="text-[10px] font-bold font-sans px-2 py-0.5 rounded-md bg-sky-950/80 text-sky-400 border border-sky-700/60 flex items-center gap-1">
                                    <span>Y</span> Estrella 4 Hilos (Con Neutro)
                                  </span>
                                )}
                                {item.fases === '1Φ' && (
                                  <span className="text-[10px] font-bold font-sans px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
                                    Monofásico 1Φ • {item.hilos}H
                                  </span>
                                )}
                                {item.fases === '2Φ' && (
                                  <span className="text-[10px] font-bold font-sans px-2 py-0.5 rounded-md bg-purple-950/80 text-purple-300 border border-purple-700/60">
                                    Bifásico 2Φ • {item.hilos}H
                                  </span>
                                )}
                                {item.rango === 'MT' && item.conexion === 'Trifásico 3 hilos' && (
                                  <span className="text-[10px] font-bold font-sans px-2 py-0.5 rounded-md bg-indigo-950/80 text-indigo-300 border border-indigo-700/60">
                                    Trifásico MT 3 Hilos
                                  </span>
                                )}

                                <span className="text-[9.5px] font-mono text-slate-500 ml-auto hidden sm:inline">
                                  {item.norma}
                                </span>
                              </div>

                              {/* Fila 2: Descripción Completa del Sistema (Sin Cortes ni Truncados) */}
                              <p className="text-xs text-slate-300 font-sans leading-relaxed">
                                {item.sistema || item.label}
                                {item.conexion === 'Estrella' && ' — Distribución trifásica estándar comercial/industrial con neutro multiterrizado.'}
                                {item.conexion === 'Delta' && ' — Alimentación para cargas motrices trifásicas y fuerza industrial.'}
                              </p>

                              {/* Fila 3: Alias y Notaciones Equivalentes */}
                              {item.alias && item.alias.length > 0 && (
                                <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                                  <span className="text-[9.5px] text-slate-400 font-sans font-semibold">Equivalencias:</span>
                                  {item.alias.slice(0, 4).map((al) => (
                                    <span key={al} className="text-[9px] font-mono px-1.5 py-0.2 bg-slate-900 text-slate-400 rounded border border-slate-800">
                                      {al}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* Botones de Selección */}
                            <div className="flex sm:flex-col items-center sm:items-end gap-2 shrink-0 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-850">
                              <button
                                type="button"
                                onClick={() => handleSelectOption(insertionValue)}
                                className={`w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-black font-sans flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm ${
                                  isSelected
                                    ? 'bg-amber-500 text-slate-950 hover:bg-amber-400 ring-2 ring-amber-400/50'
                                    : 'bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-200 border border-slate-700 hover:border-amber-500'
                                }`}
                              >
                                {isSelected ? (
                                  <>
                                    <Check className="w-3.5 h-3.5" />
                                    <span>Seleccionado</span>
                                  </>
                                ) : (
                                  <span>Seleccionar</span>
                                )}
                              </button>

                              {/* Botón Alternativo Rápido */}
                              <button
                                type="button"
                                tabIndex={-1}
                                onClick={() => handleSelectOption(altValue)}
                                className="w-full sm:w-auto px-2.5 py-1 text-[9.5px] font-mono text-slate-400 hover:text-amber-300 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg transition-colors cursor-pointer text-center"
                                title={`Insertar variante directa: "${altValue}"`}
                              >
                                {formatoModo === 'completo' ? 'Insertar Solo Voltios' : 'Insertar Formato Completo'}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              ) : null}

              {/* OPCIONES FRECUENTES GUARDADAS POR EL USUARIO (LOCAL-FIRST) */}
              {customCoincidencias.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-slate-800">
                  <div className="px-2 py-1 flex items-center justify-between text-[11px] uppercase font-black tracking-wider text-sky-400 bg-sky-950/40 rounded-lg border border-sky-800/60">
                    <span className="flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5 text-sky-400" />
                      Opciones Personalizadas Guardadas
                    </span>
                    <span className="text-[9.5px] font-mono text-sky-400/80">Local-First</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {customCoincidencias.map((opt) => {
                      const isSelected = value?.trim().toLowerCase() === opt.toLowerCase();

                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => handleSelectOption(opt)}
                          className={`text-left p-3 rounded-xl text-xs font-mono flex items-center justify-between transition-all cursor-pointer border ${
                            isSelected
                              ? 'bg-sky-500/20 text-sky-200 font-black border-sky-500/60 ring-1 ring-sky-500/30'
                              : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-800/70'
                          }`}
                        >
                          <span className="truncate pr-2 font-bold">{opt}</span>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-[9px] font-sans px-1.5 py-0.5 bg-sky-950 text-sky-400 border border-sky-800/60 rounded">
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

              {/* SIN COINCIDENCIAS DIRECTAS */}
              {gruposNormativos.length === 0 && customCoincidencias.length === 0 && (
                <div className="p-6 text-center space-y-2 bg-slate-950/60 rounded-xl border border-slate-800">
                  <p className="text-xs text-slate-300 font-mono">
                    No se encontraron tensiones que coincidan con "{effectiveSearchTerm}"
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Puedes presionar <strong className="text-amber-400">Enter</strong> para usar el valor escrito libremente o guardarlo a continuación.
                  </p>
                </div>
              )}

              {/* BOTÓN PARA GUARDAR Y USAR VALOR PERSONALIZADO NO REGISTRADO */}
              {isCustomValue && (
                <button
                  type="button"
                  onClick={() => handleSelectOption(effectiveSearchTerm.toUpperCase())}
                  className="w-full text-left p-3 rounded-xl text-xs font-mono bg-emerald-950/40 text-emerald-300 border border-emerald-800/60 hover:bg-emerald-900/50 flex items-center justify-between transition-colors cursor-pointer mt-2"
                >
                  <div className="flex items-center gap-2 min-w-0 pr-2">
                    <Plus className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="truncate">
                      Guardar y usar tensión personalizada: <strong>{effectiveSearchTerm.toUpperCase()}</strong>
                    </span>
                  </div>
                  <span className="text-[10px] font-sans px-2 py-0.5 rounded bg-emerald-900/80 text-emerald-300 border border-emerald-700/60 shrink-0">
                    + Registrar
                  </span>
                </button>
              )}
            </div>

            {/* PIE DE PÁGINA INFORMATIVO */}
            <div className="px-4 py-2.5 bg-slate-950 border-t border-slate-800/80 flex items-center justify-between text-[10.5px] text-slate-400 shrink-0">
              <span className="flex items-center gap-1.5 font-sans">
                <Info className="w-3.5 h-3.5 text-amber-500" />
                Haz clic en cualquier opción para seleccionarla directamente.
              </span>
              {value && (
                <span className="font-mono text-slate-400 hidden sm:inline">
                  Seleccionado: <strong className="text-amber-400">{value}</strong>
                </span>
              )}
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  );
}
