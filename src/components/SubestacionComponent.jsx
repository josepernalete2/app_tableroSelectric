import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Shield, Hammer, Activity, Compass, Home, Save, User, Calendar, Clock, Zap, Printer, RotateCcw, Edit3, Layers, Loader2 } from 'lucide-react';
import useStore, { getElementCode } from '../store/useStore';
import { useConfirm } from '../context/ConfirmContext';
import MetrologiaElectricaSection from './MetrologiaElectricaSection';
import ModalEditarIdElemento from './ModalEditarIdElemento';
import DualPhotoUploader from './DualPhotoUploader';
import SelectorAlimentadorJerarquico from './SelectorAlimentadorJerarquico';
import { TENSIONES_COVENIN_159_MT, TENSIONES_COVENIN_TODAS } from '../utils/constants';
import TensionNominalInput from './TensionNominalInput';

export default function SubestacionComponent({ subestacionData, onUpdate, readOnly }) {
  const { alert: customAlert, confirm: customConfirm } = useConfirm();
  const user = useStore((state) => state.user);
  const showToast = useStore((state) => state.showToast);
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'admin';
  const [isEditIdModalOpen, setIsEditIdModalOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveCambios = async () => {
    if (readOnly || isSaving || !subestacionData) return;
    setIsSaving(true);
    try {
      const latestPhoto =
        typeof subestacionData?.foto === 'string' && !subestacionData.foto.startsWith('data:image/')
          ? subestacionData.foto
          : null;
      const res = await Promise.resolve(
        onUpdate({
          ...subestacionData,
          foto: latestPhoto,
          fotoBlob: null
        })
      );
      const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
      if (res && res.ok === false) {
        showToast?.(res.error || 'Error al guardar cambios de la subestación en el servidor.', 'error');
      } else if (!isOnline) {
        showToast?.('Guardado localmente (pendiente de sincronizar)', 'info');
      } else {
        showToast?.('Cambios guardados en el servidor', 'success');
      }
    } catch (err) {
      showToast?.(err?.message || 'Error al guardar los cambios de la subestación.', 'error');
    } finally {
      setIsSaving(false);
    }
  };
  if (!subestacionData) return <div className="text-center p-8 text-slate-400">No hay datos de subestación seleccionados.</div>;

  const {
    id,
    nombre = '',
    ubicacion = '',
    alimentadoPor = '',
    alimentaA = '',
    alimentaAIds = [],
    fecha = '',
    hora = '',
    inspector = '',
    nivelTension = '',
    fotoBlob = null,
    foto = null,
    mediciones = {},
    estadoEntorno = {},
    obrasCiviles = {},
    equiposPrincipales = {},
    puestaTierra = {},
    edificioControl = {},
    firmaInspector = "",
    firmaSupervisor = ""
  } = subestacionData;

  const updateField = (field, value) => {
    if (readOnly) return;
    onUpdate({
      ...subestacionData,
      [field]: value
    });
  };

  const handleLimpiarFormulario = async () => {
    if (readOnly) return;
    const confirmed = await customConfirm("¿Deseas reiniciar todos los campos de esta inspección de subestación a blanco?");
    if (!confirmed) return;

    onUpdate({
      ...subestacionData,
      ubicacion: '',
      inspector: '',
      nivelTension: '',
      fotoBlob: null,
      foto: null,
      mediciones: {},
      estadoEntorno: {},
      obrasCiviles: {},
      equiposPrincipales: {},
      puestaTierra: {},
      edificioControl: {},
      firmaInspector: '',
      firmaSupervisor: ''
    });
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
  };

  const updateSectionItem = (section, elementKey, type, value) => {
    if (readOnly) return;
    const sectionData = subestacionData[section] || {};
    const itemData = sectionData[elementKey] || { estado: 'B', observaciones: '' };
    
    onUpdate({
      ...subestacionData,
      [section]: {
        ...sectionData,
        [elementKey]: {
          ...itemData,
          [type]: value
        }
      }
    });
  };

  // Definición de las secciones y sus correspondientes elementos
  const SECCIONES = [
    {
      key: 'estadoEntorno',
      title: '2. Estado del Entorno y Perímetro',
      icon: <Compass className="w-5 h-5 text-amber-500" />,
      description: 'Evalúe visualmente las condiciones de seguridad exterior del perímetro.',
      elements: [
        { key: 'cercaPerimetral', label: 'Cerca perimetral / Muros' },
        { key: 'portonAcceso', label: 'Portón de acceso y candados' },
        { key: 'senalizacionSeguridad', label: 'Señalización de seguridad' },
        { key: 'estadoViasAcceso', label: 'Estado de vías de acceso' },
        { key: 'controlMaleza', label: 'Control de maleza y vegetación' },
        { key: 'sistemaDrenaje', label: 'Sistema de drenaje de aguas' }
      ]
    },
    {
      key: 'obrasCiviles',
      title: '3. Obras Civiles y Estructuras Soportes',
      icon: <Hammer className="w-5 h-5 text-amber-500" />,
      description: 'Inspección del estado físico de las bases de concreto y soportes de equipos.',
      elements: [
        { key: 'basesConcreto', label: 'Bases de concreto (Fisuras/Asentamientos)' },
        { key: 'estructurasMetalicas', label: 'Estructuras metálicas (Óxido/Corrosión)' },
        { key: 'porticosLlegada', label: 'Pórticos de llegada y salida' },
        { key: 'tornilleriaConexiones', label: 'Tornillería y conexiones mecánicas' },
        { key: 'murosCortafuegos', label: 'Muros cortafuegos (si aplica)' },
        { key: 'estadoGravilla', label: 'Estado de la gravilla/piedra chancada' }
      ]
    },
    {
      key: 'equiposPrincipales',
      title: '4. Inspección Visual de Equipos Principales',
      icon: <Activity className="w-5 h-5 text-amber-500" />,
      description: 'Detección de fugas, suciedad, daños mecánicos y niveles de fluidos.',
      elements: [
        { key: 'transfFugasAceite', label: 'Transformador: Fugas de aceite' },
        { key: 'transfNivelAceite', label: 'Transformador: Nivel de aceite' },
        { key: 'interruptoresPotencia', label: 'Interruptores de potencia (Estado visual)' },
        { key: 'seccionadoresCortadores', label: 'Seccionadores (cortadores)' },
        { key: 'transformadoresMedida', label: 'Transformadores de medida (CT/PT)' },
        { key: 'pararrayosAisladores', label: 'Pararrayos (Contadores/Aisladores)' },
        { key: 'aisladoresPorcelana', label: 'Aisladores de porcelana/poliméricos' }
      ]
    },
    {
      key: 'puestaTierra',
      title: '5. Sistema de Puesta a Tierra y Conexiones',
      icon: <Shield className="w-5 h-5 text-amber-500" />,
      description: 'Verificación visual y estado de conexiones de puesta a tierra (SPT).',
      elements: [
        { key: 'medicionResistencia', label: 'Mediciones de resistencia de malla de tierra' },
        { key: 'conexionesVisibles', label: 'Conexiones visibles de equipos a tierra' },
        { key: 'estadoCableSpt', label: 'Estado del cable de SPT' },
        { key: 'corrosionConectores', label: 'Corrosión en conectores de tierra' }
      ]
    },
    {
      key: 'edificioControl',
      title: '6. Edificio de Control y Sala de Tableros',
      icon: <Home className="w-5 h-5 text-amber-500" />,
      description: 'Verificación de equipos, limpieza, iluminación y sistemas de seguridad.',
      elements: [
        { key: 'tablerosControl', label: 'Tableros y control' },
        { key: 'bancoCondensadores', label: 'Banco de condensadores' },
        { key: 'sistemaIluminacion', label: 'Sistema de iluminación (Normal/Emergencia)' },
        { key: 'extintoresIncendios', label: 'Estado de extintores de incendios' }
      ]
    }
  ];

  const sheetRef = useRef(null);
  const hasPhotoAttached = Boolean(fotoBlob || foto || previewUrl);

  const printOptimization = useMemo(() => {
    return {
      zoom: hasPhotoAttached ? 0.80 : 0.86,
      density: 'compact'
    };
  }, [hasPhotoAttached]);

  useEffect(() => {
    const handleBeforePrint = () => {
      const el = sheetRef.current;
      if (!el) return;
      el.style.setProperty('--tablero-print-zoom', String(printOptimization.zoom));
      const printableHeightPx = 940;
      const naturalHeight = el.scrollHeight;
      if (naturalHeight > 0 && naturalHeight * printOptimization.zoom > printableHeightPx) {
        const fittedZoom = Math.max(0.60, Math.min(printOptimization.zoom, Number((printableHeightPx / naturalHeight).toFixed(3))));
        el.style.setProperty('--tablero-print-zoom', String(fittedZoom));
      }
    };
    window.addEventListener('beforeprint', handleBeforePrint);
    return () => window.removeEventListener('beforeprint', handleBeforePrint);
  }, [printOptimization.zoom]);

  return (
    <div
      ref={sheetRef}
      data-print-density={printOptimization.density}
      style={{ '--tablero-print-zoom': printOptimization.zoom }}
      className={`tablero-print-sheet tablero-element-sheet w-full text-slate-100 bg-slate-900/60 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-xl backdrop-blur-md select-text max-w-5xl print:max-w-none mx-auto space-y-8 print:space-y-1.5 print-card print:bg-white print:text-slate-950 print:border-none print:shadow-none print:p-0 print:m-0 ${readOnly ? 'pointer-events-none opacity-90' : ''}`}
    >
      {/* Encabezado General */}
      <div className="tablero-header-bar flex flex-col md:flex-row print:flex-row justify-between items-start md:items-center print:items-center gap-4 print:gap-2 pb-6 print:p-2 border-b border-slate-800 print:border-2 print:border-slate-900 print:rounded-xs">
        <div>
          <span className="text-[10px] print:text-[8.5px] text-amber-500 font-extrabold uppercase tracking-widest print:text-slate-800">Inspección de Subestación Eléctrica</span>
          <h2 className="text-xl md:text-2xl print:text-xs font-extrabold text-slate-100 tracking-wide mt-1 print:mt-0 print:text-slate-950 uppercase">{nombre || 'Subestación Eléctrica'}</h2>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {!readOnly && (
            <button
              type="button"
              onClick={handleSaveCambios}
              disabled={isSaving}
              className="no-print bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-black px-3.5 py-2 rounded-lg flex items-center gap-1.5 text-xs transition-all cursor-pointer shadow-sm"
              title="Guardar todos los cambios de la subestación en el servidor"
            >
              {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              <span>{isSaving ? 'Guardando...' : 'Guardar Cambios'}</span>
            </button>
          )}
          {!readOnly && (
            <button
              type="button"
              onClick={handleLimpiarFormulario}
              className="no-print bg-slate-900 hover:bg-red-950/60 text-slate-400 hover:text-red-400 border border-slate-800 hover:border-red-800 font-bold px-3 py-2 rounded-lg flex items-center gap-1.5 text-xs transition-all cursor-pointer"
              title="Reiniciar todos los campos a blanco"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Limpiar Formulario</span>
            </button>
          )}
          <button
            onClick={() => window.print()}
            className="no-print bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-3.5 py-2 rounded-lg flex items-center gap-2 text-xs transition-all cursor-pointer shadow-sm"
            title="Guardar como PDF o Imprimir esta Inspección"
          >
            <Printer className="w-4 h-4" /> Guardar PDF
          </button>
          <div className="flex items-center gap-1">
            <span className="tablero-badge-amber inline-flex items-center justify-center font-mono font-black text-amber-400 bg-amber-500/10 px-2.5 py-1 print:px-2 print:py-0.5 rounded-lg print:rounded border border-amber-500/30 text-xs print:text-[9.5px] shadow-sm">
              ID: {getElementCode(subestacionData, 'SUBESTACION')}
            </span>
            {isAdmin && (
              <button
                type="button"
                onClick={() => setIsEditIdModalOpen(true)}
                className="no-print p-1 bg-slate-900 hover:bg-amber-500 text-slate-400 hover:text-slate-950 border border-slate-700/80 hover:border-amber-400 rounded-md transition-all shadow-sm cursor-pointer"
                title="Editar ID del elemento (Solo Administradores)"
              >
                <Edit3 className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 1. Información General */}
      <div className="bg-slate-950/40 border border-slate-800/80 rounded-2xl p-5 print:p-2 space-y-4 print:space-y-1.5 print:bg-white print:border-slate-500">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-900 pb-2.5 flex items-center gap-2 print:text-slate-700 print:border-gray-200">
          <User className="w-4 h-4 text-amber-500 no-print" /> 1. Información General
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 print:grid-cols-5 gap-5 print:gap-2">
          {/* Ubicación / Código */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide print:text-slate-600">Ubicación / Código</span>
            <input
              type="text"
              value={ubicacion}
              onChange={(e) => updateField('ubicacion', e.target.value)}
              className="bg-slate-900 border border-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-xl px-3 py-2 text-xs text-slate-100 outline-none h-10 transition-all print:bg-white print:text-slate-900 print:border-gray-300 print:placeholder-transparent"
              placeholder="Ej. Patio de Transformadores A"
            />
          </div>

          {/* Nivel de Tensión Normalizado (COVENIN 159:1997) */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide print:text-slate-600">Nivel de Tensión (COVENIN 159:1997)</span>
            <TensionNominalInput
              tipo="TODAS"
              disabled={readOnly}
              value={nivelTension}
              onChange={(val) => updateField('nivelTension', val)}
              placeholder="Ej. 13800 V, 4800 V o 34500 V"
            />
          </div>

          {/* Inspector */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide print:text-slate-600">Nombre del Inspector</span>
            <input
              type="text"
              value={inspector}
              onChange={(e) => updateField('inspector', e.target.value)}
              className="bg-slate-900 border border-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-xl px-3 py-2 text-xs text-slate-100 outline-none h-10 transition-all print:bg-white print:text-slate-900 print:border-gray-300 print:placeholder-transparent"
              placeholder="Nombre y Apellido"
            />
          </div>

          {/* Fecha */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1.5 print:text-slate-600">
              <Calendar className="w-3.5 h-3.5 text-slate-400 print:text-slate-500" /> Fecha de Inspección
            </span>
            <input
              type="date"
              value={fecha}
              onChange={(e) => updateField('fecha', e.target.value)}
              className="bg-slate-900 border border-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-xl px-3 py-2 text-xs text-slate-100 outline-none h-10 transition-all font-mono print:bg-white print:text-slate-900 print:border-gray-300"
            />
          </div>

          {/* Hora */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1.5 print:text-slate-600">
              <Clock className="w-3.5 h-3.5 text-slate-400 print:text-slate-500" /> Hora
            </span>
            <input
              type="time"
              value={hora}
              onChange={(e) => updateField('hora', e.target.value)}
              className="bg-slate-900 border border-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-xl px-3 py-2 text-xs text-slate-100 outline-none h-10 transition-all font-mono print:bg-white print:text-slate-900 print:border-gray-300"
            />
          </div>
        </div>

        {/* Topología y Jerarquía Eléctrica de la Subestación */}
        <div className="pt-4 print:pt-1.5 border-t border-slate-900 print:border-slate-300 grid grid-cols-1 md:grid-cols-2 print:grid-cols-2 gap-5 print:gap-2">
          {/* ALIMENTADO POR */}
          <div>
            <div className="no-print">
              <SelectorAlimentadorJerarquico
                proyectoId={subestacionData?.proyectoId}
                tableroActualId={subestacionData?.id}
                value={alimentadoPor}
                disabled={readOnly}
                multiple={false}
                tipoElementoActual="SUBESTACION"
                direccionRelacion="ALIMENTADO_POR"
                onChange={(val, selectedObj) => {
                  const upperVal = val ? val.toUpperCase() : '';
                  updateField('alimentadoPor', upperVal);
                  updateField('alimentadoPorId', selectedObj?.id || null);
                }}
                label="ALIMENTADO POR (Origen / Red Eléctrica Aguas Arriba)"
                placeholder="Seleccionar Red CORPOELEC, Acometida Primaria o Generador..."
              />
            </div>
            <div className="hidden print:block tablero-ficha-card p-1.5">
              <span className="tablero-ficha-label block text-[8px] font-black uppercase">ALIMENTADO POR (ORIGEN / RED ELÉCTRICA):</span>
              <span className="text-[9.5px] font-black font-mono text-slate-950">{alimentadoPor || '—'}</span>
            </div>
          </div>

          {/* ALIMENTA A */}
          <div>
            <div className="no-print">
              <SelectorAlimentadorJerarquico
                proyectoId={subestacionData?.proyectoId}
                tableroActualId={subestacionData?.id}
                value={alimentaA}
                disabled={readOnly}
                multiple={true}
                tipoElementoActual="SUBESTACION"
                direccionRelacion="ALIMENTA_A"
                onChange={(formatted, primaryObj, ids) => {
                  const upperFormatted = formatted ? formatted.toUpperCase() : '';
                  updateField('alimentaA', upperFormatted);
                  updateField('alimentaAIds', Array.isArray(ids) ? ids : []);
                }}
                label="ALIMENTA A (Cargas y Transformadores Suministrados)"
                placeholder="Seleccionar Transformadores, CCMs o Tableros alimentados..."
              />
            </div>
            <div className="hidden print:block tablero-ficha-card p-1.5">
              <span className="tablero-ficha-label block text-[8px] font-black uppercase">ALIMENTA A (CARGAS Y TRANSFORMADORES):</span>
              <span className="text-[9.5px] font-black font-mono text-slate-950">{alimentaA || '—'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* MEDICIONES de la Subestación */}
      <MetrologiaElectricaSection
        mediciones={mediciones}
        onChange={(nuevasMediciones) => updateField('mediciones', nuevasMediciones)}
        readOnly={readOnly}
        titulo="MEDICIONES"
        subtitulo="Medición de voltajes de línea L-L, fase L-N y canales de corriente en celda o barraje"
      />

      {/* Bloques de Evaluación Visual */}
      <div className="space-y-8 print:space-y-0 print:grid print:grid-cols-2 print:gap-2">
        {SECCIONES.map((sec, secIdx) => {
          const sectionData = subestacionData[sec.key] || {};
          const isLastOdd = SECCIONES.length % 2 === 1 && secIdx === SECCIONES.length - 1;

          return (
            <div key={sec.key} className={`${isLastOdd ? 'print:col-span-2' : ''} bg-slate-950/20 border border-slate-800/80 rounded-2xl print:rounded overflow-hidden shadow-sm print:bg-white print:border-slate-500 print:shadow-none break-inside-avoid`}>
              {/* Encabezado Sección */}
              <div className="bg-slate-950/40 px-5 py-4 print:p-1.5 border-b border-slate-800 print:border-slate-400 flex items-start gap-3">
                <div className="no-print p-2 bg-slate-900 border border-slate-800 rounded-xl mt-0.5 shadow-inner">
                  {sec.icon}
                </div>
                <div className="w-full">
                  <h3 className="text-sm font-bold text-slate-200 print:text-slate-950 print:mb-0">{sec.title}</h3>
                  <p className="no-print text-[10px] text-slate-500 mt-1">{sec.description}</p>
                </div>
              </div>

              {/* Grid / Tabla para los Elementos */}
              <div className={`divide-y divide-slate-800/60 print:divide-slate-300 ${isLastOdd ? 'print:grid print:grid-cols-2 print:divide-y-0 print:gap-x-3 print:p-1' : ''}`}>
                {sec.elements.map((elem) => {
                  const item = sectionData[elem.key] || { estado: 'B', observaciones: '' };

                  return (
                    <div key={elem.key} className="p-4 md:p-5 print:py-0.5 print:px-1.5 flex flex-col md:flex-row print:flex-row md:items-center print:items-center justify-between gap-4 print:gap-1.5 hover:bg-slate-900/10 transition-all print:bg-white print:text-slate-950 print:border-b print:border-slate-200">
                      {/* Nombre del Elemento */}
                      <div className="md:w-[35%] print:w-[44%] shrink-0 flex flex-col">
                        <span className="text-xs print:text-[8.5px] font-bold text-slate-200 print:text-slate-950 leading-tight">{elem.label}</span>
                      </div>

                      {/* Botones de Estado (B / R / M) */}
                      <div className="flex items-center gap-2 print:gap-0.5 shrink-0">
                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mr-2 hidden md:inline no-print">Estado:</span>
                        <div className="flex bg-slate-900/60 p-1 print:p-0.5 rounded-xl print:rounded border border-slate-800/80 shadow-inner print:bg-white print:border-slate-300 print:shadow-none gap-0.5">
                          {[
                            { value: 'B', label: 'Bueno', color: 'bg-emerald-500 text-slate-950 font-bold', hover: 'hover:text-emerald-400' },
                            { value: 'R', label: 'Regular', color: 'bg-amber-500 text-slate-950 font-bold', hover: 'hover:text-amber-400' },
                            { value: 'M', label: 'Malo', color: 'bg-red-500 text-white font-bold', hover: 'hover:text-red-400' }
                          ].map((opt) => {
                            const isSelected = item.estado === opt.value;
                            return (
                              <button
                                key={opt.value}
                                type="button"
                                onClick={() => updateSectionItem(sec.key, elem.key, 'estado', opt.value)}
                                className={`px-3 py-1.5 print:px-1.5 print:py-0 text-[10px] print:text-[8px] rounded-lg font-bold transition-all cursor-pointer ${
                                  isSelected 
                                    ? opt.color + ' shadow-md scale-105 print:shadow-none print:scale-100' 
                                    : 'bg-slate-900 text-slate-400 hover:bg-slate-800/50 print:text-slate-500 ' + opt.hover
                                }`}
                              >
                                {opt.value}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Input de Observaciones */}
                      <div className="flex-1 min-w-[30%] print:min-w-0">
                        <input
                          type="text"
                          value={item.observaciones || ''}
                          onChange={(e) => updateSectionItem(sec.key, elem.key, 'observaciones', e.target.value)}
                          className="w-full bg-slate-900/50 border border-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-xl px-3 py-2 text-xs text-slate-100 outline-none h-10 transition-all placeholder-slate-600 font-sans print:bg-white print:text-slate-950 print:border-slate-300 print:placeholder-transparent"
                          placeholder="Observaciones / Hallazgos encontrados..."
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Carga Dual de Fotografías de la Subestación */}
      <div className={`bg-slate-950/40 border border-slate-800/80 rounded-2xl p-5 print:p-2 ${!hasPhotoAttached ? 'no-print' : ''}`}>
        <DualPhotoUploader
          fotoBlob={fotoBlob}
          fotoSrc={foto}
          previewUrl={previewUrl}
          onImageSelected={(file, base64Url) => {
            updateField('fotoBlob', file);
            updateField('foto', base64Url);
            if (previewUrl && previewUrl.startsWith('blob:')) URL.revokeObjectURL(previewUrl);
            setPreviewUrl(base64Url);
          }}
          onRemove={() => {
            updateField('fotoBlob', null);
            updateField('foto', null);
            if (previewUrl && previewUrl.startsWith('blob:')) URL.revokeObjectURL(previewUrl);
            setPreviewUrl(null);
          }}
          readOnly={readOnly}
          label="Fotografía de la Subestación / Patio de Transformadores"
          sublabel="Cámara en vivo o selección desde galería"
        />
      </div>

      {/* Cierre / Firmas */}
      <div className="tablero-signatures-box bg-slate-950/40 border border-slate-800/80 rounded-2xl p-5 print:p-2 space-y-4 print:space-y-1 print:mt-1 break-inside-avoid">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-900 pb-2.5 print:text-slate-700 print:border-gray-200">
          Firma y Cierre de Inspección
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 print:grid-cols-2 gap-6 print:gap-4">
          {/* Firma Inspector */}
          <div className="flex flex-col gap-1.5 print:gap-0.5 items-center text-center">
            <span className="text-[10px] print:text-[8.5px] font-bold text-slate-500 uppercase tracking-wide print:text-slate-950">Firma del Inspector</span>
            <input
              type="text"
              value={firmaInspector}
              onChange={(e) => updateField('firmaInspector', e.target.value)}
              className="w-full max-w-xs bg-slate-900 border border-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-xl px-3 py-2 text-xs text-slate-100 outline-none h-10 transition-all text-center no-print"
              placeholder="Iniciales o Nombre del Inspector"
            />
            <div className="hidden print:block w-48 border-b-2 border-slate-900 mt-4 mb-0.5"></div>
            <span className="hidden print:block text-[9.5px] font-black text-slate-950">
              {firmaInspector || '—'}
            </span>
          </div>

          {/* Firma / Sello de la Empresa */}
          <div className="flex flex-col gap-1.5 print:gap-0.5 items-center text-center">
            <span className="text-[10px] print:text-[8.5px] font-bold text-slate-500 uppercase tracking-wide print:text-slate-950">Firma / Sello de la Empresa</span>
            <input
              type="text"
              value={firmaSupervisor}
              onChange={(e) => updateField('firmaSupervisor', e.target.value)}
              className="w-full max-w-xs bg-slate-900 border border-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-xl px-3 py-2 text-xs text-slate-100 outline-none h-10 transition-all text-center no-print"
              placeholder="Nombre / Sello de la Empresa"
            />
            <div className="hidden print:block w-48 border-b-2 border-slate-900 mt-4 mb-0.5"></div>
            <span className="hidden print:block text-[9.5px] font-black text-slate-950">
              {firmaSupervisor || '—'}
            </span>
          </div>
        </div>
      </div>

      {/* Leyenda de Evaluación */}
      <div className="text-[10px] print:text-[8px] text-slate-500 text-center leading-relaxed print:leading-tight border-t border-slate-800 pt-4 print:pt-1 font-sans select-none print:border-slate-300 print:text-slate-800">
        <span className="font-bold text-slate-400 uppercase print:text-slate-950">Nota de Evaluación:</span> B = Bueno, R = Regular (Requiere mantenimiento preventivo), M = Malo (Acción correctiva inmediata).
      </div>

      {/* Modal de Edición de ID Visual (Solo Administradores) */}
      <ModalEditarIdElemento
        isOpen={isEditIdModalOpen}
        onClose={() => setIsEditIdModalOpen(false)}
        elemento={subestacionData}
        tipoElemento="SUBESTACION"
        proyectoId={subestacionData?.proyectoId}
      />
    </div>
  );
}
