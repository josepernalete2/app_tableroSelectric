import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Zap,
  Building2,
  Gauge,
  AlertCircle,
  Printer,
  Activity,
  Settings,
  RotateCcw,
  Edit3,
  Save,
  Layers,
  GitBranch,
  ShieldCheck,
  X,
  Eye
} from 'lucide-react';
import ModalEdicionCircuito from './ModalEdicionCircuito';
import ModalEditarIdElemento from './ModalEditarIdElemento';
import MetrologiaElectricaSection from './MetrologiaElectricaSection';
import SelectorAlimentadorJerarquico from './SelectorAlimentadorJerarquico';
import DualPhotoUploader from './DualPhotoUploader';
import TensionNominalInput from './TensionNominalInput';
import ElementQuickPreviewModal from './ElementQuickPreviewModal';
import useStore, {
  getElementCode,
  getSimpleElementCode,
  cleanElementName,
  resolveElementParentDisplay,
  resolveElementAlimentaADisplay,
  isPlaceholderHierarchyValue
} from '../store/useStore';
import { useConfirm } from '../context/ConfirmContext';

export default function PuntoMedicionComponent({ puntoData, onUpdate, readOnly, elementosCreados = [] }) {
  const { companies, crearElementoProvisional, showToast } = useStore();
  const { confirm: customConfirm } = useConfirm();
  const [isEditing, setIsEditing] = useState(false);
  const effectivelyReadOnly = Boolean(readOnly || !isEditing);

  const [localData, setLocalData] = useState(puntoData || {});
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewElement, setPreviewElement] = useState(null);

  useEffect(() => {
    if (puntoData) {
      setLocalData(puntoData);
    }
  }, [puntoData]);

  const resolvedElementosCreados = useMemo(() => {
    if (Array.isArray(elementosCreados) && elementosCreados.length > 0) {
      return elementosCreados.filter((e) => e && e.id !== puntoData?.id);
    }
    if (!puntoData?.proyectoId) return [];
    for (const c of (companies || [])) {
      const p = (c.proyectos || []).find((pr) => pr.id === puntoData.proyectoId);
      if (p) {
        return [
          ...(p.elementosUnifilares || p.tableros || []),
          ...(p.inspeccionesSubestacion || p.subestaciones || []),
          ...(p.puntosMedicion || []),
          ...(p.ccmList || [])
        ].filter((e) => e && e.id !== puntoData.id);
      }
    }
    return [];
  }, [elementosCreados, companies, puntoData?.proyectoId, puntoData?.id]);

  const user = useStore((state) => state.user);
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'admin';
  const [modalJerarquiaOpen, setModalJerarquiaOpen] = useState(false);
  const [circuitDataWizard, setCircuitDataWizard] = useState(null);
  const [wizardModo, setWizardModo] = useState('ENTRADA');
  const [isEditIdModalOpen, setIsEditIdModalOpen] = useState(false);

  const sheetRef = useRef(null);
  const printOptimization = useMemo(() => ({ zoom: 0.86, density: 'compact' }), []);

  useEffect(() => {
    const handleBeforePrint = () => {
      const el = sheetRef.current;
      if (!el) return;
      el.style.setProperty('--tablero-print-zoom', String(printOptimization.zoom));
      const printableHeightPx = 940;
      const naturalHeight = el.scrollHeight;
      if (naturalHeight > 0 && naturalHeight * printOptimization.zoom > printableHeightPx) {
        const fittedZoom = Math.max(
          0.62,
          Math.min(printOptimization.zoom, Number((printableHeightPx / naturalHeight).toFixed(3)))
        );
        el.style.setProperty('--tablero-print-zoom', String(fittedZoom));
      }
    };
    window.addEventListener('beforeprint', handleBeforePrint);
    return () => window.removeEventListener('beforeprint', handleBeforePrint);
  }, [printOptimization.zoom]);

  // Resolución bidireccional en tiempo real de Jerarquía (evita choques entre localData y elementos vinculados)
  const autoHierarchy = useMemo(() => {
    if (!puntoData) {
      return {
        upstreamText: '',
        downstream: { ids: [], items: [], names: [], text: '' },
        downstreamBadges: []
      };
    }
    const allElements = [localData, ...resolvedElementosCreados].filter((e) => e && e.id);
    const upstreamText = resolveElementParentDisplay(localData, allElements);
    const downstream = resolveElementAlimentaADisplay(localData, allElements);
    const downstreamBadges = downstream.names.map((nm) => {
      const matched = downstream.items.find(
        (it) => cleanElementName(it.nombre, it.id, it.codigo || it.simpleCode).toUpperCase().trim() === nm
      );
      return {
        id: matched?.id || null,
        nombre: nm,
        code: matched ? getSimpleElementCode(matched, matched.tipoElemento || 'TABLERO') : null
      };
    });
    return { upstreamText, downstream, downstreamBadges };
  }, [puntoData, localData, resolvedElementosCreados]);

  if (!puntoData) {
    return (
      <div className="text-center p-8 text-slate-400">
        No hay datos de punto de medición seleccionados.
      </div>
    );
  }

  const {
    nombre = '',
    alimentadoPor = '',
    alimentaA = '',
    nombreUsuario = '',
    numeroContrato = '',
    empresaDistribuidora = '',
    nivelTensionContrato = '',
    tensionNominal = '',
    potenciaContratada = localData?.potenciaContratada || localData?.capacidadContratadaKva || localData?.cargaContratadaKva || '',
    tarifaAplicable = '',

    // 2. Punto de Acometida
    tipoAcometida = localData?.tipoAcometida || localData?.tipo || '',
    tipo = localData?.tipo || localData?.tipoAcometida || '',
    puntoConexionPCC = '',
    conductorAcometida = '',
    longitudAcometida = '',
    elementoManiobra = '',
    capacidadInterrupcion = '',

    // 3. Sistema de Transformación
    ubicacionTransformador = '',
    propiedadTransformador = '',
    usoTransformador = '',

    // 4. Sistema de Medición
    ubicacionMedidor = '',
    tipoMedicion = '',
    relacionTransformacion = localData?.relacionTransformacion || localData?.datosTecnicos?.relacionTransformacion || '',
    marcaModeloMedidor = '',
    serialMedicion = localData?.serialMedicion || localData?.numeroSerieAno || localData?.codigoElementoPrincipal || '',

    // 5. Observaciones, Foto y Firmas
    observaciones = localData?.observaciones || localData?.observacionesGenerales || '',
    foto = localData?.foto || null,
    fotoBlob = localData?.fotoBlob || null,
    firmaInspector = '',
    firmaSupervisor = ''
  } = localData || {};

  // Valores efectivos para modo lectura (respaldados por autoHierarchy si el usuario no lo editó)
  const displayAlimentadoPor = !isPlaceholderHierarchyValue(alimentadoPor)
    ? alimentadoPor
    : (!isEditing ? autoHierarchy.upstreamText : '');

  const displayAlimentaA = !isPlaceholderHierarchyValue(alimentaA)
    ? alimentaA
    : (!isEditing ? autoHierarchy.downstream.text : '');

  // Botón Configurar Jerarquía: activo solo en edición cuando Tipo de Medición es Indirecta y existe Relación de Transformación
  const canConfigureHierarchy =
    !effectivelyReadOnly &&
    tipoMedicion === 'Indirecta' &&
    Boolean(String(relacionTransformacion || '').trim());

  const updateFields = (patch = {}) => {
    if (effectivelyReadOnly) return;
    setLocalData((prev) => ({
      ...prev,
      ...patch
    }));
  };

  const updateField = (field, value) => {
    updateFields({ [field]: value });
  };

  const handleStartEditing = () => {
    if (readOnly) return;
    setLocalData((prev) => {
      const next = { ...(prev || {}) };
      if (isPlaceholderHierarchyValue(next.alimentadoPor) && autoHierarchy.upstreamText) {
        next.alimentadoPor = autoHierarchy.upstreamText;
      }
      if (isPlaceholderHierarchyValue(next.alimentaA) && autoHierarchy.downstream.text) {
        next.alimentaA = autoHierarchy.downstream.text;
        next.alimentaAIds = autoHierarchy.downstream.ids || [];
      }
      return next;
    });
    setIsEditing(true);
  };

  const handleSave = () => {
    if (readOnly) return;
    const resolvedUbicacion =
      localData?.ubicacion ||
      localData?.puntoConexionPCC ||
      localData?.ubicacionMedidor ||
      puntoData?.ubicacion ||
      '';

    const cleanAlimentadoPor = isPlaceholderHierarchyValue(localData?.alimentadoPor)
      ? ''
      : String(localData.alimentadoPor).trim().toUpperCase();
    const cleanAlimentadoPorId = localData?.alimentadoPorId || null;

    const cleanAlimentaA = isPlaceholderHierarchyValue(localData?.alimentaA)
      ? ''
      : String(localData.alimentaA).trim().toUpperCase();
    const cleanAlimentaAIds = Array.isArray(localData?.alimentaAIds)
      ? localData.alimentaAIds.filter(Boolean)
      : [];

    const serialFinal =
      localData?.serialMedicion ??
      localData?.numeroSerieAno ??
      localData?.codigoElementoPrincipal ??
      '';

    const baseDt =
      localData?.datosTecnicos && typeof localData.datosTecnicos === 'object'
        ? { ...localData.datosTecnicos }
        : {};

    const payloadToSave = {
      ...puntoData,
      ...localData,
      ubicacion: resolvedUbicacion,
      alimentadoPor: cleanAlimentadoPor,
      alimentadoPorId: cleanAlimentadoPorId,
      alimentaA: cleanAlimentaA,
      alimentaAIds: cleanAlimentaAIds,
      serialMedicion: serialFinal,
      numeroSerieAno: serialFinal,
      relacionTransformacion: tipoMedicion === 'Indirecta' ? String(relacionTransformacion || '').trim() : '',
      observacionesGenerales: localData?.observaciones ?? localData?.observacionesGenerales ?? '',
      capacidadContratadaKva: localData?.potenciaContratada ?? localData?.capacidadContratadaKva ?? '',
      cargaContratadaKva: localData?.potenciaContratada ?? localData?.cargaContratadaKva ?? '',
      datosTecnicos: {
        ...baseDt,
        alimentadoPor: cleanAlimentadoPor,
        alimentadoPorId: cleanAlimentadoPorId,
        alimentaA: cleanAlimentaA,
        alimentaAIds: cleanAlimentaAIds,
        serialMedicion: serialFinal,
        numeroSerieAno: serialFinal,
        relacionTransformacion: tipoMedicion === 'Indirecta' ? String(relacionTransformacion || '').trim() : ''
      }
    };

    if (onUpdate) {
      onUpdate(payloadToSave);
    }
    setIsEditing(false);
    showToast?.('Información del Punto de Suministro guardada por completo.', 'success');
  };

  const handleLimpiarFormulario = async () => {
    if (effectivelyReadOnly) return;
    const confirmed = await customConfirm(
      '¿Deseas reiniciar todos los campos de este punto de suministro a valores en blanco?'
    );
    if (!confirmed) return;
    const cleaned = {
      ...localData,
      id: puntoData.id,
      nombre: localData.nombre || puntoData.nombre || '',
      nombreUsuario: '',
      numeroContrato: '',
      empresaDistribuidora: '',
      nivelTensionContrato: '',
      tensionNominal: '',
      potenciaContratada: '',
      capacidadContratadaKva: '',
      cargaContratadaKva: '',
      tarifaAplicable: '',
      codigoElementoPrincipal: '',
      tipoAcometida: '',
      tipo: '',
      puntoConexionPCC: '',
      conductorAcometida: '',
      longitudAcometida: '',
      elementoManiobra: '',
      capacidadInterrupcion: '',
      ubicacionTransformador: '',
      propiedadTransformador: '',
      usoTransformador: '',
      ubicacionMedidor: '',
      tipoMedicion: '',
      relacionTransformacion: '',
      marcaModeloMedidor: '',
      serialMedicion: '',
      numeroSerieAno: '',
      mediciones: {},
      observaciones: '',
      observacionesGenerales: '',
      foto: null,
      fotoBlob: null,
      eliminarFoto: true,
      firmaInspector: '',
      firmaSupervisor: ''
    };
    setLocalData(cleaned);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
  };

  const renderFieldBox = (labelText, value, onChangeFn, placeholderText, opts = {}) => {
    const { mono = false, accentClass = 'text-slate-100' } = opts;
    return (
      <div className="tablero-ficha-card bg-slate-900/90 border border-slate-800 rounded-xl p-3 print:p-1.5 flex flex-col gap-1">
        <span className="tablero-ficha-label text-[10px] print:text-[8.5px] font-bold uppercase tracking-wider text-slate-400 print:text-slate-700">
          {labelText}
        </span>
        {isEditing ? (
          <input
            type="text"
            value={value ?? ''}
            onChange={(e) => onChangeFn(e.target.value)}
            placeholder={placeholderText}
            className={`bg-slate-950 border border-slate-700 focus:border-amber-500 rounded-lg px-3 py-1.5 text-xs text-slate-100 outline-none transition-all placeholder-slate-600 ${mono ? 'font-mono' : ''}`}
          />
        ) : (
          <p className={`text-xs print:text-[10px] font-bold ${accentClass} ${mono ? 'font-mono' : ''} print:text-slate-950 truncate`} title={value || ''}>
            {value || '—'}
          </p>
        )}
      </div>
    );
  };

  return (
    <div
      ref={sheetRef}
      data-print-density={printOptimization.density}
      style={{ '--tablero-print-zoom': printOptimization.zoom }}
      className="tablero-print-sheet tablero-element-sheet max-w-6xl print:max-w-none print:w-full mx-auto space-y-5 print:space-y-1.5 animate-fade-in font-sans pb-16 print:pb-0 print-card print:p-0 print:m-0 select-text"
    >
      {/* ========================================================================= */}
      {/* 1. BARRA DE HERRAMIENTAS Y ACCIONES SUPERIORES (NO PRINT) */}
      {/* ========================================================================= */}
      <div className="flex flex-wrap items-center justify-between gap-4 no-print bg-slate-950/90 backdrop-blur-md p-4 rounded-2xl border border-slate-800 shadow-xl">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2.5 bg-gradient-to-br from-sky-500/20 to-amber-500/15 border border-sky-500/30 rounded-xl shrink-0">
            <Zap className="w-6 h-6 text-amber-400" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-sky-500/15 text-sky-300 border border-sky-500/30">
                🔌 PUNTO DE SUMINISTRO
              </span>
              {nivelTensionContrato && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-900 border border-slate-700 text-emerald-400 uppercase">
                  {nivelTensionContrato}
                </span>
              )}
              {tipoMedicion && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-900 border border-slate-700 text-amber-300 uppercase">
                  Medición {tipoMedicion}
                </span>
              )}
              <div className="flex items-center gap-1">
                <span className="font-mono text-xs font-bold text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded border border-amber-500/30">
                  ID: {getElementCode(localData || puntoData, 'PUNTO_MEDICION')}
                </span>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => setIsEditIdModalOpen(true)}
                    className="p-1 bg-slate-900 hover:bg-amber-500 text-slate-400 hover:text-slate-950 border border-slate-700/80 hover:border-amber-400 rounded-md transition-all shadow-sm cursor-pointer"
                    title="Editar ID del elemento (Solo Administradores)"
                  >
                    <Edit3 className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
            <h1 className="text-lg font-black text-slate-100 mt-0.5 truncate">
              {nombre || 'Punto de Suministro de Energía Eléctrica'}
            </h1>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => window.print()}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 rounded-xl transition-all cursor-pointer flex items-center gap-2 text-xs font-bold shadow-sm"
            title="Guardar como PDF o Imprimir este Formato"
          >
            <Printer className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline">Guardar PDF</span>
          </button>

          {!readOnly && (
            <>
              {isEditing && (
                <button
                  type="button"
                  onClick={handleLimpiarFormulario}
                  className="px-3.5 py-2 bg-slate-900 hover:bg-red-950/60 text-slate-400 hover:text-red-400 border border-slate-800 hover:border-red-800 rounded-xl transition-all font-bold text-xs cursor-pointer flex items-center gap-1.5"
                  title="Reiniciar todos los campos del formulario a blanco"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Limpiar</span>
                </button>
              )}

              {isEditing ? (
                <button
                  type="button"
                  onClick={handleSave}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl transition-all font-black text-xs cursor-pointer flex items-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95"
                >
                  <Save className="w-4 h-4" /> Guardar Cambios
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleStartEditing}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl transition-all font-black text-xs cursor-pointer flex items-center gap-2 shadow-lg shadow-amber-500/20 active:scale-95"
                >
                  <Edit3 className="w-4 h-4" /> Editar Punto de Suministro
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. CUADRO PRINCIPAL DE INGENIERÍA (ESTILO CONTRASTADO Y MODERNO) */}
      {/* ========================================================================= */}
      <div className="tablero-main-table bg-slate-950 border-2 border-slate-800 rounded-2xl print:rounded overflow-hidden shadow-2xl print:shadow-none print:border-slate-900 print:bg-white print:text-slate-950">
        {/* Cabecera Principal */}
        <div className="tablero-header-bar bg-gradient-to-r from-slate-900 via-slate-900 to-slate-850 border-b-2 border-slate-800 p-4 print:p-2 print:border-slate-900">
          <div className="flex flex-col md:flex-row print:flex-row md:items-center print:items-center justify-between gap-3 print:gap-2">
            <div className="flex-1 min-w-0">
              <span className="text-[10px] print:text-[8.5px] font-mono font-bold tracking-widest text-amber-400 print:text-slate-800 uppercase">
                ACOMETIDA Y MEDICIÓN GENERAL • PUNTO DE SUMINISTRO
              </span>
              <h2 className="text-xl print:text-xs font-black text-slate-100 tracking-wide uppercase font-mono print:text-slate-950 mt-0.5">
                {isEditing ? (
                  <input
                    type="text"
                    value={nombre ?? ''}
                    onChange={(e) => updateField('nombre', e.target.value)}
                    placeholder="Ej. PUNTO DE SUMINISTRO PRINCIPAL"
                    className="bg-slate-950 border border-slate-700 focus:border-amber-500 rounded-lg px-3 py-1.5 w-full max-w-xl text-slate-100 font-bold outline-none placeholder-slate-600"
                  />
                ) : (
                  nombre || 'PUNTO DE SUMINISTRO DE ENERGÍA ELÉCTRICA'
                )}
              </h2>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs print:text-[9px] font-mono font-bold text-slate-400 print:text-slate-900">
                Potencia Contratada:
              </span>
              {isEditing ? (
                <input
                  type="text"
                  value={potenciaContratada ?? ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    updateFields({
                      potenciaContratada: val,
                      capacidadContratadaKva: val,
                      cargaContratadaKva: val
                    });
                  }}
                  placeholder="Ej. 500 kVA"
                  className="bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-xs font-mono font-bold text-amber-400 text-center w-32 focus:border-amber-500 focus:outline-none"
                />
              ) : (
                <span className="tablero-badge-amber px-3 py-1 print:px-2 print:py-0.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-lg print:rounded font-mono font-black text-sm print:text-[10px]">
                  {potenciaContratada || '—'}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* SECCIÓN 1: Datos Generales y Jerarquía Automática */}
        <div className="p-5 print:p-2 space-y-4 print:space-y-1.5 border-b-2 border-slate-800 print:border-slate-900 bg-slate-950/60">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h3 className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-2 print:text-slate-900 font-mono">
              <Building2 className="w-4 h-4 text-amber-400 no-print" />
              1. Datos Generales de la Acometida y Suministro
            </h3>
            <span className="tablero-badge-slate text-[10px] print:text-[8px] font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
              Jerarquía Automática Sincronizada
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 print:grid-cols-3 gap-3.5 print:gap-2">
            {renderFieldBox(
              'Nombre del Usuario / Razón Social',
              nombreUsuario,
              (val) => updateField('nombreUsuario', val),
              'Ej. Industrias Eléctricas C.A.'
            )}
            {renderFieldBox(
              'N° de Contrato / Cuenta / NIC',
              numeroContrato,
              (val) => updateField('numeroContrato', val),
              'Ej. NIC-84920491',
              { mono: true, accentClass: 'text-sky-300' }
            )}
            {renderFieldBox(
              'Empresa Distribuidora (ED) / Suministrador',
              empresaDistribuidora,
              (val) => updateField('empresaDistribuidora', val),
              'Ej. CORPOELEC / Suministrador Local',
              { accentClass: 'text-emerald-400' }
            )}

            {/* Nivel de Tensión de Contrato */}
            <div className="tablero-ficha-card bg-slate-900/90 border border-slate-800 rounded-xl p-3 print:p-1.5 flex flex-col gap-1.5">
              <span className="tablero-ficha-label text-[10px] print:text-[8.5px] font-bold uppercase tracking-wider text-slate-400 print:text-slate-700">
                Nivel de Tensión de Contrato
              </span>
              {isEditing ? (
                <div className="grid grid-cols-3 gap-1.5">
                  {['Alta Tensión', 'Media Tensión', 'Baja Tensión'].map((nivel) => {
                    const isSelected = nivelTensionContrato === nivel;
                    return (
                      <button
                        key={nivel}
                        type="button"
                        onClick={() => updateField('nivelTensionContrato', nivel)}
                        className={`py-1.5 px-1.5 text-center rounded-lg border text-[10px] font-bold transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm'
                            : 'bg-slate-950 text-slate-300 border-slate-700 hover:border-amber-500/40'
                        }`}
                      >
                        {nivel}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs print:text-[10px] font-bold text-amber-400 print:text-slate-950">
                  {nivelTensionContrato || '—'}
                </p>
              )}
            </div>

            {/* Tensión Nominal de Suministro */}
            <div className="tablero-ficha-card bg-slate-900/90 border border-slate-800 rounded-xl p-3 print:p-1.5 flex flex-col gap-1">
              <span className="tablero-ficha-label text-[10px] print:text-[8.5px] font-bold uppercase tracking-wider text-slate-400 print:text-slate-700">
                Tensión Nominal de Suministro (COVENIN 159:1997)
              </span>
              {isEditing ? (
                <TensionNominalInput
                  tipo="TODAS"
                  value={tensionNominal ?? ''}
                  onChange={(val) => updateField('tensionNominal', val)}
                  placeholder="Ej. 13800 V o 208Y/120 V"
                />
              ) : (
                <p className="text-xs print:text-[10px] font-bold font-mono text-emerald-400 print:text-slate-950">
                  {tensionNominal || '—'}
                </p>
              )}
            </div>

            {renderFieldBox(
              'Tarifa / Régimen Tarifario Aplicable',
              tarifaAplicable,
              (val) => updateField('tarifaAplicable', val),
              'Ej. Tarifa Industrial General T-2'
            )}
          </div>

          {/* Topología y Jerarquía Eléctrica Bidireccional del Punto de Suministro */}
          <div className="pt-3 print:pt-1.5 border-t border-slate-800 print:border-slate-300 grid grid-cols-1 md:grid-cols-2 print:grid-cols-2 gap-4 print:gap-2">
            {/* ALIMENTADO POR */}
            <div className="tablero-sky-cell bg-gradient-to-b from-sky-950/25 to-slate-900/90 border border-sky-500/30 print:border-slate-500 rounded-xl p-3.5 print:p-2 space-y-1.5">
              <div className="flex items-center justify-between border-b border-sky-500/20 pb-1.5">
                <span className="text-[10px] print:text-[8.5px] font-black uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
                  <GitBranch className="w-3.5 h-3.5 no-print" />
                  ALIMENTADO POR (Origen / Red Eléctrica)
                </span>
              </div>
              {isEditing ? (
                <div className="no-print">
                  <SelectorAlimentadorJerarquico
                    proyectoId={puntoData?.proyectoId}
                    tableroActualId={puntoData?.id}
                    elementosList={resolvedElementosCreados}
                    value={alimentadoPor}
                    multiple={false}
                    tipoElementoActual="PUNTO_MEDICION"
                    direccionRelacion="ALIMENTADO_POR"
                    onChange={(val, selectedObj, ids) => {
                      const upperVal = val ? val.toUpperCase() : '';
                      const parentId = selectedObj?.id || ids?.[0] || null;
                      setLocalData((prev) => ({
                        ...prev,
                        alimentadoPor: upperVal,
                        alimentadoPorId: parentId,
                        datosTecnicos: {
                          ...(prev?.datosTecnicos || {}),
                          alimentadoPor: upperVal,
                          alimentadoPorId: parentId
                        }
                      }));
                    }}
                    label=""
                    placeholder="Seleccionar Red CORPOELEC, Acometida Primaria..."
                  />
                </div>
              ) : displayAlimentadoPor ? (
                <button
                  type="button"
                  onClick={() =>
                    setPreviewElement({
                      id: localData?.alimentadoPorId || localData?.datosTecnicos?.alimentadoPorId || null,
                      nombre: displayAlimentadoPor
                    })
                  }
                  title={`Clic para ver ficha rápida de ${displayAlimentadoPor}`}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sky-500/15 border border-sky-500/30 hover:border-sky-400 text-xs print:text-[10px] font-black font-mono text-slate-100 print:text-slate-950 cursor-pointer transition-all max-w-full"
                >
                  <span className="truncate">{displayAlimentadoPor}</span>
                  <Eye className="w-3.5 h-3.5 text-sky-400 no-print shrink-0" />
                </button>
              ) : (
                <p className="text-xs print:text-[10px] font-black font-mono text-slate-500 print:text-slate-950">—</p>
              )}
            </div>

            {/* ALIMENTA A */}
            <div className="tablero-amber-cell bg-gradient-to-b from-amber-950/25 to-slate-900/90 border border-amber-500/30 print:border-slate-500 rounded-xl p-3.5 print:p-2 space-y-1.5">
              <div className="flex items-center justify-between border-b border-amber-500/20 pb-1.5">
                <span className="text-[10px] print:text-[8.5px] font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 no-print" />
                  ALIMENTA A (Equipos Suministrados Aguas Abajo)
                </span>
              </div>
              {isEditing ? (
                <div className="no-print">
                  <SelectorAlimentadorJerarquico
                    proyectoId={puntoData?.proyectoId}
                    tableroActualId={puntoData?.id}
                    elementosList={resolvedElementosCreados}
                    value={alimentaA}
                    multiple={true}
                    tipoElementoActual="PUNTO_MEDICION"
                    direccionRelacion="ALIMENTA_A"
                    onChange={(formatted, primaryObj, ids) => {
                      const upperFormatted = formatted ? formatted.toUpperCase() : '';
                      const cleanIds = Array.isArray(ids) ? ids.filter(Boolean) : [];
                      setLocalData((prev) => ({
                        ...prev,
                        alimentaA: upperFormatted,
                        alimentaAIds: cleanIds,
                        datosTecnicos: {
                          ...(prev?.datosTecnicos || {}),
                          alimentaA: upperFormatted,
                          alimentaAIds: cleanIds
                        }
                      }));
                    }}
                    label=""
                    placeholder="Seleccionar Subestación, Tableros o Transformadores..."
                  />
                </div>
              ) : (
                <>
                  <div className="no-print">
                    {autoHierarchy.downstreamBadges.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {autoHierarchy.downstreamBadges.map((b, idx) => (
                          <button
                            key={`${b.id || b.nombre}-${idx}`}
                            type="button"
                            onClick={() => setPreviewElement(b)}
                            title={`Clic para ver ficha rápida de ${b.nombre}`}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/15 text-slate-100 border border-amber-500/30 hover:border-amber-400 font-black text-xs cursor-pointer transition-all"
                          >
                            <span className="truncate max-w-[180px]">{b.nombre}</span>
                            {b.code && <span className="text-amber-400 lowercase text-[10px] font-mono">({b.code})</span>}
                            <Eye className="w-3 h-3 text-amber-300/80 shrink-0" />
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs font-black font-mono text-slate-100 truncate">
                        {displayAlimentaA || '—'}
                      </p>
                    )}
                  </div>
                  <p className="hidden print:block text-[10px] font-black font-mono text-slate-950">
                    {displayAlimentaA || '—'}
                  </p>
                </>
              )}
            </div>
          </div>
        </div>

        {/* SECCIÓN 2: Punto de Acometida e Infraestructura de Entrada */}
        <div className="p-5 print:p-2 space-y-4 print:space-y-1.5 border-b-2 border-slate-800 print:border-slate-900 bg-slate-900/40">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2.5 print:border-gray-300">
            <h3 className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-2 print:text-slate-900 font-mono">
              <Zap className="w-4 h-4 text-amber-400 no-print" />
              2. Punto de Acometida e Infraestructura de Entrada
            </h3>
            <button
              type="button"
              disabled={!canConfigureHierarchy}
              onClick={() => {
                if (!canConfigureHierarchy) return;
                setWizardModo('ENTRADA');
                setCircuitDataWizard({
                  id: 'PCC_ACOMETIDA',
                  nombre: 'Punto de Conexión PCC / Acometida Entrada',
                  equipo: puntoConexionPCC || '',
                  poles: [3],
                  breaker: { amp: '', marca: '', tipo: '' }
                });
                setModalJerarquiaOpen(true);
              }}
              className={`no-print inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                canConfigureHierarchy
                  ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 border-amber-400 shadow-md cursor-pointer active:scale-95'
                  : 'bg-slate-900 text-slate-500 border-slate-800 opacity-60 cursor-not-allowed'
              }`}
              title={
                canConfigureHierarchy
                  ? 'Configurar Conexión de Jerarquía (Wizard)'
                  : 'Disponible en edición al seleccionar Medición Indirecta e ingresar la Relación de Transformación'
              }
            >
              <Settings className="w-3.5 h-3.5" /> Configurar Jerarquía
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 print:gap-2">
            {/* TIPO (Acometida) */}
            <div className="tablero-ficha-card bg-slate-900/90 border border-slate-800 rounded-xl p-3 print:p-1.5 md:col-span-2 flex flex-col gap-2">
              <span className="tablero-ficha-label text-[10px] print:text-[8.5px] font-bold uppercase tracking-wider text-slate-400 print:text-slate-700">
                Tipo de Acometida
              </span>
              {isEditing ? (
                <div className="grid grid-cols-3 gap-2.5">
                  {['Aérea', 'Subterránea', 'Mixta'].map((tipoVal) => {
                    const isSelected = tipoAcometida === tipoVal || tipo === tipoVal;
                    return (
                      <button
                        key={tipoVal}
                        type="button"
                        onClick={() => updateFields({ tipoAcometida: tipoVal, tipo: tipoVal })}
                        className={`py-2 px-3 text-center rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md'
                            : 'bg-slate-950 text-slate-300 border-slate-700 hover:border-amber-500/40'
                        }`}
                      >
                        [ {isSelected ? '✓' : ' '} ] {tipoVal}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs print:text-[10px] font-bold text-amber-400 print:text-slate-950">
                  {tipoAcometida || tipo || '—'}
                </p>
              )}
            </div>

            {renderFieldBox(
              'Punto de Conexión (PCC)',
              puntoConexionPCC,
              (val) => updateField('puntoConexionPCC', val),
              'Tag / Código de Poste, Celda o Subestación'
            )}
            {renderFieldBox(
              'Conductor de Acometida (Tipo / Calibre)',
              conductorAcometida,
              (val) => updateField('conductorAcometida', val),
              'Ej. 3x(1x500 kcmil) Cu TTU',
              { mono: true, accentClass: 'text-cyan-300' }
            )}
            {renderFieldBox(
              'Longitud Acometida (metros)',
              longitudAcometida,
              (val) => updateField('longitudAcometida', val),
              'Ej. 45 m / 3 Fases + N',
              { mono: true }
            )}
            {renderFieldBox(
              'Capacidad de Interrupción General (Marca / Modelo / Amperaje)',
              capacidadInterrupcion,
              (val) => updateField('capacidadInterrupcion', val),
              'Ej. Square D / Masterpact NW16 / 1600A - 65kA',
              { mono: true, accentClass: 'text-emerald-400' }
            )}

            {/* Elemento de Maniobra / Protección General */}
            <div className="tablero-ficha-card bg-slate-900/90 border border-slate-800 rounded-xl p-3 print:p-1.5 md:col-span-2 flex flex-col gap-2">
              <span className="tablero-ficha-label text-[10px] print:text-[8.5px] font-bold uppercase tracking-wider text-slate-400 print:text-slate-700">
                Elemento de Maniobra / Protección General
              </span>
              {isEditing ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {['Breaker', 'Cortacircuito Fusible', 'Seccionador', 'Interruptor en Vacío/SF6'].map((elem) => {
                    const isSelected = elementoManiobra === elem;
                    return (
                      <button
                        key={elem}
                        type="button"
                        onClick={() => updateField('elementoManiobra', elem)}
                        className={`py-2 px-2.5 text-center rounded-xl border text-[11px] font-bold transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md'
                            : 'bg-slate-950 text-slate-300 border-slate-700 hover:border-amber-500/40'
                        }`}
                      >
                        [ {isSelected ? '✓' : ' '} ] {elem}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs print:text-[10px] font-bold text-slate-100 print:text-slate-950">
                  {elementoManiobra || '—'}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* SECCIÓN 3: Sistema de Transformación (Si aplica) */}
        <div className="p-5 print:p-2 space-y-4 print:space-y-1.5 border-b-2 border-slate-800 print:border-slate-900 bg-slate-950/60">
          <h3 className="text-xs font-black uppercase tracking-wider text-amber-400 border-b border-slate-800 pb-2.5 flex items-center gap-2 print:text-slate-900 print:border-gray-300 font-mono">
            <Activity className="w-4 h-4 text-amber-400 no-print" />
            3. Sistema de Transformación (Si aplica)
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 print:grid-cols-3 gap-3.5 print:gap-2">
            {/* Ubicación del Transformador */}
            <div className="tablero-ficha-card bg-slate-900/90 border border-slate-800 rounded-xl p-3 print:p-1.5 flex flex-col gap-2">
              <span className="tablero-ficha-label text-[10px] print:text-[8.5px] font-bold uppercase tracking-wider text-slate-400 print:text-slate-700">
                Ubicación del Transformador
              </span>
              {isEditing ? (
                <div className="flex flex-col gap-1.5">
                  {['Intemperie (Poste/Padmounted)', 'Subestación Interior / Caseta'].map((ubic) => {
                    const isSelected = ubicacionTransformador === ubic;
                    return (
                      <button
                        key={ubic}
                        type="button"
                        onClick={() => updateField('ubicacionTransformador', ubic)}
                        className={`py-2 px-3 text-left rounded-xl border text-[11px] font-bold transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md'
                            : 'bg-slate-950 text-slate-300 border-slate-700 hover:border-amber-500/40'
                        }`}
                      >
                        [ {isSelected ? '✓' : ' '} ] {ubic}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs print:text-[10px] font-bold text-slate-100 print:text-slate-950">
                  {ubicacionTransformador || '—'}
                </p>
              )}
            </div>

            {/* Propiedad del Transformador */}
            <div className="tablero-ficha-card bg-slate-900/90 border border-slate-800 rounded-xl p-3 print:p-1.5 flex flex-col gap-2">
              <span className="tablero-ficha-label text-[10px] print:text-[8.5px] font-bold uppercase tracking-wider text-slate-400 print:text-slate-700">
                Propiedad del Transformador
              </span>
              {isEditing ? (
                <div className="flex flex-col gap-1.5">
                  {['Empresa Distribuidora', 'Cliente Privado'].map((prop) => {
                    const isSelected = propiedadTransformador === prop;
                    return (
                      <button
                        key={prop}
                        type="button"
                        onClick={() => updateField('propiedadTransformador', prop)}
                        className={`py-2 px-3 text-left rounded-xl border text-[11px] font-bold transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md'
                            : 'bg-slate-950 text-slate-300 border-slate-700 hover:border-amber-500/40'
                        }`}
                      >
                        [ {isSelected ? '✓' : ' '} ] {prop}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs print:text-[10px] font-bold text-slate-100 print:text-slate-950">
                  {propiedadTransformador || '—'}
                </p>
              )}
            </div>

            {/* Uso del Transformador */}
            <div className="tablero-ficha-card bg-slate-900/90 border border-slate-800 rounded-xl p-3 print:p-1.5 flex flex-col gap-2">
              <span className="tablero-ficha-label text-[10px] print:text-[8.5px] font-bold uppercase tracking-wider text-slate-400 print:text-slate-700">
                Uso del Transformador
              </span>
              {isEditing ? (
                <div className="flex flex-col gap-1.5">
                  {['Exclusivo', 'Compartido'].map((uso) => {
                    const isSelected = usoTransformador === uso;
                    return (
                      <button
                        key={uso}
                        type="button"
                        onClick={() => updateField('usoTransformador', uso)}
                        className={`py-2 px-3 text-left rounded-xl border text-[11px] font-bold transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md'
                            : 'bg-slate-950 text-slate-300 border-slate-700 hover:border-amber-500/40'
                        }`}
                      >
                        [ {isSelected ? '✓' : ' '} ] {uso}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs print:text-[10px] font-bold text-slate-100 print:text-slate-950">
                  {usoTransformador || '—'}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* SECCIÓN 4: Especificaciones del Sistema de Medición */}
        <div className="p-5 print:p-2 space-y-4 print:space-y-1.5 border-b-2 border-slate-800 print:border-slate-900 bg-slate-900/40">
          <h3 className="text-xs font-black uppercase tracking-wider text-amber-400 border-b border-slate-800 pb-2.5 flex items-center gap-2 print:text-slate-900 print:border-gray-300 font-mono">
            <Gauge className="w-4 h-4 text-amber-400 no-print" />
            4. Especificaciones del Sistema de Medición
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 print:gap-2">
            {/* Ubicación del Medidor */}
            <div className="tablero-ficha-card bg-slate-900/90 border border-slate-800 rounded-xl p-3 print:p-1.5 flex flex-col gap-2">
              <span className="tablero-ficha-label text-[10px] print:text-[8.5px] font-bold uppercase tracking-wider text-slate-400 print:text-slate-700">
                Ubicación del Medidor
              </span>
              {isEditing ? (
                <div className="grid grid-cols-2 gap-2">
                  {['Lado de Alta/Media Tensión', 'Lado de Baja Tensión'].map((ubic) => {
                    const isSelected = ubicacionMedidor === ubic;
                    return (
                      <button
                        key={ubic}
                        type="button"
                        onClick={() => updateField('ubicacionMedidor', ubic)}
                        className={`py-2 px-2 text-center rounded-xl border text-[11px] font-bold transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md'
                            : 'bg-slate-950 text-slate-300 border-slate-700 hover:border-amber-500/40'
                        }`}
                      >
                        [ {isSelected ? '✓' : ' '} ] {ubic}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs print:text-[10px] font-bold text-slate-100 print:text-slate-950">
                  {ubicacionMedidor || '—'}
                </p>
              )}
            </div>

            {/* Tipo de Medición */}
            <div className="tablero-ficha-card bg-slate-900/90 border border-slate-800 rounded-xl p-3 print:p-1.5 flex flex-col gap-2">
              <span className="tablero-ficha-label text-[10px] print:text-[8.5px] font-bold uppercase tracking-wider text-slate-400 print:text-slate-700">
                Tipo de Medición
              </span>
              {isEditing ? (
                <div className="grid grid-cols-2 gap-2">
                  {['Directa', 'Indirecta'].map((tipoMed) => {
                    const isSelected = tipoMedicion === tipoMed;
                    return (
                      <button
                        key={tipoMed}
                        type="button"
                        onClick={() => updateField('tipoMedicion', tipoMed)}
                        className={`py-2 px-2 text-center rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md'
                            : 'bg-slate-950 text-slate-300 border-slate-700 hover:border-amber-500/40'
                        }`}
                      >
                        [ {isSelected ? '✓' : ' '} ] {tipoMed}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs print:text-[10px] font-bold text-amber-400 print:text-slate-950">
                  {tipoMedicion || '—'}
                </p>
              )}
            </div>

            {/* Relación de Transformación (TC / TP) - Requerida cuando es Medición Indirecta */}
            {tipoMedicion === 'Indirecta' && (
              <div className="tablero-ficha-card bg-slate-900/90 border border-amber-500/40 rounded-xl p-3 print:p-1.5 md:col-span-2 flex flex-col gap-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="tablero-ficha-label text-[10px] print:text-[8.5px] font-bold uppercase tracking-wider text-amber-400 print:text-slate-800">
                    Relación de Transformación (TC / TP)
                  </span>
                  <span className="text-[9.5px] font-mono text-amber-300/80 no-print">
                    Habilita "Configurar Jerarquía" al completar
                  </span>
                </div>
                {isEditing ? (
                  <input
                    type="text"
                    value={relacionTransformacion ?? ''}
                    onChange={(e) => updateField('relacionTransformacion', e.target.value)}
                    placeholder="Ej. TC 400/5 A • TP 13800/120 V"
                    className="bg-slate-950 border border-amber-500/40 focus:border-amber-500 rounded-lg px-3 py-1.5 text-xs text-slate-100 outline-none font-mono placeholder-slate-600"
                  />
                ) : (
                  <p className="text-xs print:text-[10px] font-bold font-mono text-amber-300 print:text-slate-950">
                    {relacionTransformacion || '—'}
                  </p>
                )}
              </div>
            )}

            {renderFieldBox(
              'Marca / Modelo del Medidor',
              marcaModeloMedidor,
              (val) => updateField('marcaModeloMedidor', val),
              'Ej. Elster A1800 ALPHA / ION7650'
            )}

            {renderFieldBox(
              'Serial de Medición',
              serialMedicion,
              (val) => updateFields({ serialMedicion: val, numeroSerieAno: val }),
              'Ej. SN-7492019',
              { mono: true, accentClass: 'text-cyan-300' }
            )}
          </div>
        </div>

        {/* SECCIÓN 4.1: MEDICIONES */}
        <div className="p-4 print:p-2 bg-slate-950 border-b-2 border-slate-800 print:border-slate-900">
          <MetrologiaElectricaSection
            mediciones={localData?.mediciones || {}}
            onChange={(nuevasMediciones, _field, val) => {
              if (typeof nuevasMediciones === 'object' && nuevasMediciones !== null) {
                updateField('mediciones', nuevasMediciones);
              } else if (typeof nuevasMediciones === 'string') {
                updateField('mediciones', {
                  ...(localData?.mediciones || {}),
                  [nuevasMediciones]: val
                });
              }
            }}
            titulo="MEDICIONES"
            subtitulo="Tensiones Línea-Línea, Línea-Neutro y Canales de Corriente (COVENIN 159)"
            readOnly={effectivelyReadOnly}
            isEditing={isEditing}
          />
        </div>

        {/* SECCIÓN 5 y 6: Observaciones y Fotografía */}
        <div className="grid grid-cols-1 lg:grid-cols-12 print:grid-cols-12 divide-y lg:divide-y-0 print:divide-y-0 lg:divide-x print:divide-x divide-slate-800 print:divide-slate-400 border-b-2 border-slate-800 print:border-slate-900 bg-slate-900/30">
          <div className="lg:col-span-7 print:col-span-7 p-5 print:p-2 space-y-2.5 print:space-y-1">
            <h3 className="text-xs font-black text-amber-400 uppercase tracking-wider flex items-center gap-2 font-mono print:text-slate-900">
              <AlertCircle className="w-4 h-4 text-amber-400 no-print" />
              5. Anomalías u Observaciones
            </h3>
            {isEditing ? (
              <textarea
                value={observaciones}
                onChange={(e) => updateField('observaciones', e.target.value)}
                rows={5}
                className="w-full bg-slate-950 border border-slate-700 focus:border-amber-500 rounded-xl p-3 text-xs text-slate-100 outline-none transition-all placeholder-slate-600 font-mono"
                placeholder="Escriba aquí las observaciones, hallazgos o anomalías detectadas en la acometida, transformador o equipo de medición..."
              />
            ) : (
              <div className="tablero-obs-box p-4 print:p-2 bg-slate-950/80 rounded-xl print:rounded border border-slate-800 text-xs print:text-[9.5px] font-mono text-slate-200 print:text-slate-950 leading-relaxed whitespace-pre-wrap">
                {observaciones || 'Sin observaciones registradas para este punto de suministro.'}
              </div>
            )}
          </div>

          <div className="lg:col-span-5 print:col-span-5 p-5 print:p-2">
            <DualPhotoUploader
              fotoBlob={fotoBlob}
              fotoSrc={foto}
              previewUrl={previewUrl}
              onImageSelected={(file, base64Url) => {
                updateFields({ fotoBlob: file, foto: base64Url, eliminarFoto: false });
                if (previewUrl && previewUrl.startsWith('blob:')) URL.revokeObjectURL(previewUrl);
                setPreviewUrl(base64Url);
              }}
              onRemove={() => {
                updateFields({ fotoBlob: null, foto: null, eliminarFoto: true });
                if (previewUrl && previewUrl.startsWith('blob:')) URL.revokeObjectURL(previewUrl);
                setPreviewUrl(null);
              }}
              readOnly={effectivelyReadOnly}
              label="6. Registro Fotográfico del Punto de Suministro / Medidor"
              sublabel="Captura con cámara en vivo o selecciona desde galería"
            />
          </div>
        </div>

        {/* Cierre y Firmas */}
        <div className="tablero-signatures-box bg-slate-950/80 p-5 print:p-2 space-y-4 print:space-y-1 break-inside-avoid">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-300 border-b border-slate-800 pb-2 flex items-center gap-2 print:text-slate-800 print:border-gray-300 font-mono">
            <ShieldCheck className="w-4 h-4 text-emerald-400 no-print" />
            Cierre del Levantamiento y Validez Técnica
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 print:grid-cols-2 gap-6 print:gap-4">
            <div className="flex flex-col gap-1.5 print:gap-0.5 items-center text-center">
              <span className="text-[10px] print:text-[8.5px] font-bold text-slate-400 uppercase tracking-wide print:text-slate-950">
                Firma del Inspector / Técnico
              </span>
              {isEditing ? (
                <input
                  type="text"
                  value={firmaInspector}
                  onChange={(e) => updateField('firmaInspector', e.target.value)}
                  className="w-full max-w-xs bg-slate-900 border border-slate-700 focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-slate-100 outline-none h-10 transition-all text-center"
                  placeholder="Nombre / Iniciales del Inspector"
                />
              ) : (
                <p className="text-xs font-bold text-slate-100 print:hidden">{firmaInspector || '—'}</p>
              )}
              <div className="hidden print:block w-48 border-b-2 border-slate-900 mt-4 mb-0.5"></div>
              <span className="hidden print:block text-[9.5px] font-black text-slate-950">
                {firmaInspector || '—'}
              </span>
            </div>

            <div className="flex flex-col gap-1.5 print:gap-0.5 items-center text-center">
              <span className="text-[10px] print:text-[8.5px] font-bold text-slate-400 uppercase tracking-wide print:text-slate-950">
                Firma / Sello de la Empresa
              </span>
              {isEditing ? (
                <input
                  type="text"
                  value={firmaSupervisor}
                  onChange={(e) => updateField('firmaSupervisor', e.target.value)}
                  className="w-full max-w-xs bg-slate-900 border border-slate-700 focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-slate-100 outline-none h-10 transition-all text-center"
                  placeholder="Nombre / Sello de la Empresa"
                />
              ) : (
                <p className="text-xs font-bold text-slate-100 print:hidden">{firmaSupervisor || '—'}</p>
              )}
              <div className="hidden print:block w-48 border-b-2 border-slate-900 mt-4 mb-0.5"></div>
              <span className="hidden print:block text-[9.5px] font-black text-slate-950">
                {firmaSupervisor || '—'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Barra inferior de guardado rápido en modo edición */}
      {!readOnly && isEditing && (
        <div className="no-print flex items-center justify-end gap-3 pt-1">
          <button
            type="button"
            onClick={() => {
              setLocalData(puntoData || {});
              setIsEditing(false);
            }}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer border border-slate-700 flex items-center gap-1.5"
          >
            <X className="w-3.5 h-3.5" /> Cancelar Edición
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl font-black text-xs cursor-pointer flex items-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
          >
            <Save className="w-4 h-4" /> Guardar Información Completa
          </button>
        </div>
      )}

      <ModalEdicionCircuito
        isOpen={modalJerarquiaOpen}
        onClose={() => setModalJerarquiaOpen(false)}
        circuitData={circuitDataWizard}
        modo={wizardModo}
        tipoOrigen="PUNTO_MEDICION"
        elementosCreados={resolvedElementosCreados}
        onSave={(circuitId, updated) => {
          if (updated.tipoDestino === 'SUB_TABLERO_PENDIENTE' && puntoData?.proyectoId) {
            const existingProvId = updated.elementoDestinoId || updated.vinculadoId;
            if (!existingProvId) {
              crearElementoProvisional(puntoData.proyectoId, {
                nombre:
                  updated.equipo && updated.equipo !== 'RESERVA (Pendiente por Crear)'
                    ? updated.equipo
                    : `Sub-Tablero Alimentado (${circuitId})`,
                tipoElemento: 'TABLERO',
                circuitoOrigen: circuitId
              });
            }
          }
          if (wizardModo === 'ENTRADA') {
            updateField('puntoConexionPCC', updated.equipo);
          }
        }}
      />

      {/* Modal de Edición de ID Visual (Solo Administradores) */}
      <ModalEditarIdElemento
        isOpen={isEditIdModalOpen}
        onClose={() => setIsEditIdModalOpen(false)}
        elemento={puntoData}
        tipoElemento="PUNTO_MEDICION"
        proyectoId={puntoData?.proyectoId}
      />

      <ElementQuickPreviewModal
        elementRef={previewElement}
        proyectoId={puntoData?.proyectoId}
        onClose={() => setPreviewElement(null)}
      />
    </div>
  );
}
