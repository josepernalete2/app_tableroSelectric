import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Zap, 
  Building2, 
  FileText, 
  ShieldCheck, 
  Gauge, 
  AlertCircle, 
  Printer, 
  User, 
  Calendar, 
  Clock, 
  CheckSquare,
  Activity,
  Settings,
  RotateCcw,
  Edit3,
  Save
} from 'lucide-react';
import ModalEdicionCircuito from './ModalEdicionCircuito';
import ModalEditarIdElemento from './ModalEditarIdElemento';
import MetrologiaElectricaSection from './MetrologiaElectricaSection';
import SelectorAlimentadorJerarquico from './SelectorAlimentadorJerarquico';
import DualPhotoUploader from './DualPhotoUploader';
import { TENSIONES_COVENIN_TODAS } from '../utils/constants';
import TensionNominalInput from './TensionNominalInput';
import useStore, { getElementCode } from '../store/useStore';
import { useConfirm } from '../context/ConfirmContext';

export default function PuntoMedicionComponent({ puntoData, onUpdate, readOnly, elementosCreados = [] }) {
  const { companies, crearElementoProvisional, showToast } = useStore();
  const { confirm: customConfirm } = useConfirm();
  const [isEditing, setIsEditing] = useState(false);
  const effectivelyReadOnly = Boolean(readOnly || !isEditing);

  const [localData, setLocalData] = useState(puntoData || {});
  const [previewUrl, setPreviewUrl] = useState(null);

  useEffect(() => {
    if (puntoData) {
      setLocalData(puntoData);
    }
  }, [puntoData]);
  const resolvedElementosCreados = React.useMemo(() => {
    if (Array.isArray(elementosCreados) && elementosCreados.length > 0) {
      return elementosCreados.filter(e => e.id !== puntoData?.id);
    }
    if (!puntoData?.proyectoId) return [];
    for (const c of (companies || [])) {
      const p = (c.proyectos || []).find(pr => pr.id === puntoData.proyectoId);
      if (p) {
        return [
          ...(p.elementosUnifilares || p.tableros || []),
          ...(p.inspeccionesSubestacion || p.subestaciones || []),
          ...(p.puntosMedicion || []),
          ...(p.ccmList || [])
        ].filter(e => e.id !== puntoData.id);
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
  if (!puntoData) {
    return <div className="text-center p-8 text-slate-400">No hay datos de punto de medición seleccionados.</div>;
  }

  const {
    id,
    nombre = '',
    alimentadoPor = '',
    alimentaA = '',
    alimentaAIds = [],
    fecha = '',
    hora = '',
    inspector = '',

    // 1. Datos Generales
    nombreUsuario = '',
    numeroContrato = '',
    empresaDistribuidora = '',
    nivelTensionContrato = '',
    tensionNominal = '',
    potenciaContratada = localData?.potenciaContratada || localData?.capacidadContratadaKva || localData?.cargaContratadaKva || '',
    tarifaAplicable = '',
    codigoElementoPrincipal = '',

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
    marcaModeloMedidor = '',
    numeroSerieAno = '',

    // 5. Observaciones, Foto y Firmas
    observaciones = localData?.observaciones || localData?.observacionesGenerales || '',
    foto = localData?.foto || null,
    fotoBlob = localData?.fotoBlob || null,
    firmaInspector = '',
    firmaSupervisor = ''
  } = localData || {};

  const updateField = (field, value) => {
    if (effectivelyReadOnly) return;
    setLocalData((prev) => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = () => {
    if (readOnly) return;
    const payloadToSave = {
      ...puntoData,
      ...localData,
      observacionesGenerales: localData?.observaciones ?? localData?.observacionesGenerales ?? '',
      capacidadContratadaKva: localData?.potenciaContratada ?? localData?.capacidadContratadaKva ?? '',
      cargaContratadaKva: localData?.potenciaContratada ?? localData?.cargaContratadaKva ?? ''
    };
    if (onUpdate) {
      onUpdate(payloadToSave);
    }
    setIsEditing(false);
    showToast?.('Información del Punto de Suministro guardada por completo.', 'success');
  };

  const handleLimpiarFormulario = async () => {
    if (effectivelyReadOnly) return;
    const confirmed = await customConfirm("¿Deseas reiniciar todos los campos de este punto de suministro a valores en blanco?");
    if (!confirmed) return;
    const cleaned = {
      ...localData,
      id: puntoData.id,
      nombre: localData.nombre || puntoData.nombre || '',
      fecha: '',
      hora: '',
      inspector: '',
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
      marcaModeloMedidor: '',
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

  const sheetRef = useRef(null);

  const printOptimization = useMemo(() => {
    return { zoom: 0.86, density: 'compact' };
  }, []);

  useEffect(() => {
    const handleBeforePrint = () => {
      const el = sheetRef.current;
      if (!el) return;
      el.style.setProperty('--tablero-print-zoom', String(printOptimization.zoom));
      const printableHeightPx = 940;
      const naturalHeight = el.scrollHeight;
      if (naturalHeight > 0 && naturalHeight * printOptimization.zoom > printableHeightPx) {
        const fittedZoom = Math.max(0.62, Math.min(printOptimization.zoom, Number((printableHeightPx / naturalHeight).toFixed(3))));
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
      className={`tablero-print-sheet tablero-element-sheet w-full text-slate-100 bg-slate-900/60 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-xl backdrop-blur-md select-text max-w-5xl print:max-w-none mx-auto space-y-8 print:space-y-1.5 print-card print:bg-white print:text-slate-950 print:border-none print:shadow-none print:p-0 print:m-0 ${readOnly ? 'opacity-90' : ''}`}
    >
      
      {/* Encabezado General */}
      <div className="tablero-header-bar flex flex-col md:flex-row print:flex-row justify-between items-start md:items-center print:items-center gap-4 print:gap-2 pb-6 print:p-2 border-b border-slate-800 print:border-2 print:border-slate-900 print:rounded-xs">
        <div className="flex-1 min-w-0">
          <span className="text-[10px] print:text-[8.5px] text-amber-500 font-extrabold uppercase tracking-widest print:text-slate-800">
            Formato de Levantamiento
          </span>
          <h2 className="text-xl md:text-2xl print:text-xs font-extrabold text-slate-100 tracking-wide mt-1 print:mt-0 print:text-slate-950 uppercase">
            {isEditing ? (
              <input
                type="text"
                value={nombre ?? ''}
                onChange={(e) => updateField('nombre', e.target.value)}
                placeholder="Ej. PUNTO DE SUMINISTRO PRINCIPAL"
                className="bg-slate-950 border border-slate-700 focus:border-amber-500 rounded-xl px-3 py-1.5 w-full max-w-xl text-base md:text-lg font-extrabold text-slate-100 outline-none"
              />
            ) : (
              <>Punto de Medición y Suministro de Energía Eléctrica {nombre ? `— ${nombre}` : ''}</>
            )}
          </h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!readOnly && (
            <>
              {isEditing && (
                <button
                  type="button"
                  onClick={handleLimpiarFormulario}
                  className="no-print bg-slate-800 hover:bg-red-950/60 text-slate-300 hover:text-red-400 font-bold px-3 py-2 rounded-xl flex items-center gap-1.5 text-xs transition-all border border-slate-700 hover:border-red-800 cursor-pointer"
                  title="Reiniciar todos los campos del formulario a blanco"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Limpiar
                </button>
              )}

              {isEditing ? (
                <button
                  type="button"
                  onClick={handleSave}
                  className="no-print px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl transition-all font-black text-xs cursor-pointer flex items-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95"
                >
                  <Save className="w-4 h-4" /> Guardar Cambios
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="no-print px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl transition-all font-black text-xs cursor-pointer flex items-center gap-2 shadow-lg shadow-amber-500/20 active:scale-95"
                >
                  <Edit3 className="w-4 h-4" /> Editar Punto de Suministro
                </button>
              )}
            </>
          )}
          <button
            onClick={() => window.print()}
            className="no-print bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 font-bold px-3.5 py-2 rounded-xl flex items-center gap-2 text-xs transition-all cursor-pointer shadow-sm"
            title="Guardar como PDF o Imprimir este Formato"
          >
            <Printer className="w-4 h-4 text-amber-400" /> Guardar PDF
          </button>
          <div className="flex items-center gap-1">
            <span className="tablero-badge-amber inline-flex items-center justify-center font-mono font-black text-amber-400 bg-amber-500/10 px-2.5 py-1 print:px-2 print:py-0.5 rounded-lg print:rounded border border-amber-500/30 text-xs print:text-[9.5px] shadow-sm">
              ID: {getElementCode(localData || puntoData, 'PUNTO_MEDICION')}
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

      {/* Datos del Inspector y Fecha */}
      <div className="tablero-subheader-row bg-slate-950/40 border border-slate-800/80 rounded-2xl p-5 print:p-2 space-y-4 print:space-y-1 print:border-slate-500">
        <div className="grid grid-cols-1 md:grid-cols-3 print:grid-cols-3 gap-4 print:gap-2">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1 print:text-slate-700">
              <User className="w-3.5 h-3.5 text-amber-500" /> Nombre del Inspector
            </span>
            <input
              type="text"
              disabled={effectivelyReadOnly}
              value={inspector ?? ''}
              onChange={(e) => updateField('inspector', e.target.value)}
              className="bg-slate-900 border border-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-xl px-3 py-2 text-xs text-slate-100 outline-none h-10 transition-all print:bg-white print:text-slate-900 print:border-gray-300 disabled:opacity-60 disabled:cursor-not-allowed"
              placeholder="Ej. Ing. Juan Pérez"
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1 print:text-slate-700">
              <Calendar className="w-3.5 h-3.5 text-amber-500" /> Fecha del Levantamiento
            </span>
            <input
              type="date"
              disabled={effectivelyReadOnly}
              value={fecha ?? ''}
              onChange={(e) => updateField('fecha', e.target.value)}
              className="bg-slate-900 border border-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-xl px-3 py-2 text-xs text-slate-100 outline-none h-10 transition-all font-mono print:bg-white print:text-slate-900 print:border-gray-300 disabled:opacity-60 disabled:cursor-not-allowed"
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1 print:text-slate-700">
              <Clock className="w-3.5 h-3.5 text-amber-500" /> Hora
            </span>
            <input
              type="time"
              disabled={effectivelyReadOnly}
              value={hora ?? ''}
              onChange={(e) => updateField('hora', e.target.value)}
              className="bg-slate-900 border border-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-xl px-3 py-2 text-xs text-slate-100 outline-none h-10 transition-all font-mono print:bg-white print:text-slate-900 print:border-gray-300 disabled:opacity-60 disabled:cursor-not-allowed"
            />
          </div>
        </div>
      </div>

      {/* SECCIÓN 1: Datos Generales de la Acometida y Suministro */}
      <div className="bg-slate-950/40 border border-slate-800/80 rounded-2xl p-5 space-y-4 print:bg-white print:border-gray-300">
        <h3 className="text-xs font-bold uppercase tracking-wider text-amber-500 border-b border-slate-800 pb-2.5 flex items-center gap-2 print:text-slate-900 print:border-gray-300">
          <Building2 className="w-4 h-4 text-amber-500" /> 1. Datos Generales de la Acometida y Suministro
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Nombre Usuario / Razón Social */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-slate-400 print:text-slate-700">Nombre del Usuario / Razón Social</label>
            <input
              type="text"
              disabled={effectivelyReadOnly}
              value={nombreUsuario ?? ''}
              onChange={(e) => updateField('nombreUsuario', e.target.value)}
              className="bg-slate-900 border border-slate-800 focus:border-amber-500 rounded-xl px-3.5 py-2 text-xs text-slate-100 outline-none h-10 transition-all print:bg-white print:text-slate-900 print:border-gray-300 disabled:opacity-60 disabled:cursor-not-allowed"
              placeholder="Ej. Industrias Eléctricas C.A."
            />
          </div>

          {/* N° de Contrato / Cuenta / NIC */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-slate-400 print:text-slate-700">N° de Contrato / Cuenta / NIC</label>
            <input
              type="text"
              disabled={effectivelyReadOnly}
              value={numeroContrato ?? ''}
              onChange={(e) => updateField('numeroContrato', e.target.value)}
              className="bg-slate-900 border border-slate-800 focus:border-amber-500 rounded-xl px-3.5 py-2 text-xs text-slate-100 outline-none h-10 transition-all font-mono print:bg-white print:text-slate-900 print:border-gray-300 disabled:opacity-60 disabled:cursor-not-allowed"
              placeholder="Ej. NIC-84920491"
            />
          </div>

          {/* Empresa Distribuidora */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-slate-400 print:text-slate-700">Empresa Distribuidora (ED) / Suministrador</label>
            <input
              type="text"
              disabled={effectivelyReadOnly}
              value={empresaDistribuidora ?? ''}
              onChange={(e) => updateField('empresaDistribuidora', e.target.value)}
              className="bg-slate-900 border border-slate-800 focus:border-amber-500 rounded-xl px-3.5 py-2 text-xs text-slate-100 outline-none h-10 transition-all print:bg-white print:text-slate-900 print:border-gray-300 disabled:opacity-60 disabled:cursor-not-allowed"
              placeholder="Ej. CORPOELEC / Suministrador Local"
            />
          </div>

          {/* Nivel de Tensión de Contrato */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-slate-400 print:text-slate-700">Nivel de Tensión de Contrato</label>
            <div className="grid grid-cols-3 gap-2">
              {['Alta Tensión', 'Media Tensión', 'Baja Tensión'].map((nivel) => {
                const isSelected = nivelTensionContrato === nivel;
                return (
                  <button
                    key={nivel}
                    type="button"
                    disabled={effectivelyReadOnly}
                    onClick={() => updateField('nivelTensionContrato', nivel)}
                    className={`py-2 px-2 text-center rounded-xl border text-[11px] font-bold transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${
                      isSelected
                        ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-md print:bg-amber-100 print:text-slate-900 print:border-amber-600'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700 print:bg-gray-50 print:text-slate-700 print:border-gray-300'
                    }`}
                  >
                    [ {isSelected ? '✓' : ' '} ] {nivel}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tensión Nominal de Suministro */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-slate-400 print:text-slate-700">Tensión Nominal de Suministro (COVENIN 159:1997)</label>
            <TensionNominalInput
              tipo="TODAS"
              disabled={effectivelyReadOnly}
              value={tensionNominal ?? ''}
              onChange={(val) => updateField('tensionNominal', val)}
              placeholder="Ej. 13800 V o 208Y/120 V"
            />
          </div>

          {/* Potencia Contratada / Conectada */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-slate-400 print:text-slate-700">Potencia Contratada / Conectada (kVA)</label>
            <input
              type="text"
              disabled={effectivelyReadOnly}
              value={potenciaContratada ?? ''}
              onChange={(e) => {
                const val = e.target.value;
                updateField('potenciaContratada', val);
                updateField('capacidadContratadaKva', val);
                updateField('cargaContratadaKva', val);
              }}
              className="bg-slate-900 border border-slate-800 focus:border-amber-500 rounded-xl px-3.5 py-2 text-xs text-slate-100 outline-none h-10 transition-all font-mono print:bg-white print:text-slate-900 print:border-gray-300 disabled:opacity-60 disabled:cursor-not-allowed"
              placeholder="Ej. 500 kVA"
            />
          </div>

          {/* Tarifa / Régimen Tarifario Aplicable */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-slate-400 print:text-slate-700">Tarifa / Régimen Tarifario Aplicable</label>
            <input
              type="text"
              disabled={effectivelyReadOnly}
              value={tarifaAplicable ?? ''}
              onChange={(e) => updateField('tarifaAplicable', e.target.value)}
              className="bg-slate-900 border border-slate-800 focus:border-amber-500 rounded-xl px-3.5 py-2 text-xs text-slate-100 outline-none h-10 transition-all print:bg-white print:text-slate-900 print:border-gray-300 disabled:opacity-60 disabled:cursor-not-allowed"
              placeholder="Ej. Tarifa Industrial General T-2"
            />
          </div>

          {/* Código del Elemento principal */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-slate-400 print:text-slate-700">Código del Elemento Principal</label>
            <input
              type="text"
              disabled={effectivelyReadOnly}
              value={codigoElementoPrincipal ?? ''}
              onChange={(e) => updateField('codigoElementoPrincipal', e.target.value)}
              className="bg-slate-900 border border-slate-800 focus:border-amber-500 rounded-xl px-3.5 py-2 text-xs text-slate-100 outline-none h-10 transition-all font-mono print:bg-white print:text-slate-900 print:border-gray-300 disabled:opacity-60 disabled:cursor-not-allowed uppercase"
              placeholder="Ej. ELEM-MED-01"
            />
          </div>
        </div>

        {/* Topología y Jerarquía Eléctrica del Punto de Medición */}
        <div className="pt-4 print:pt-1.5 border-t border-slate-800 print:border-slate-300 grid grid-cols-1 md:grid-cols-2 print:grid-cols-2 gap-5 print:gap-2">
          {/* ALIMENTADO POR */}
          <div>
            <div className="no-print">
              <SelectorAlimentadorJerarquico
                proyectoId={puntoData?.proyectoId}
                tableroActualId={puntoData?.id}
                value={alimentadoPor}
                disabled={effectivelyReadOnly}
                multiple={false}
                tipoElementoActual="PUNTO_MEDICION"
                direccionRelacion="ALIMENTADO_POR"
                onChange={(val, selectedObj) => {
                  const upperVal = val ? val.toUpperCase() : '';
                  updateField('alimentadoPor', upperVal);
                  updateField('alimentadoPorId', selectedObj?.id || null);
                }}
                label="ALIMENTADO POR (Origen / Red Eléctrica Aguas Arriba)"
                placeholder="Seleccionar Red CORPOELEC, Acometida Primaria..."
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
                proyectoId={puntoData?.proyectoId}
                tableroActualId={puntoData?.id}
                value={alimentaA}
                disabled={effectivelyReadOnly}
                multiple={true}
                tipoElementoActual="PUNTO_MEDICION"
                direccionRelacion="ALIMENTA_A"
                onChange={(formatted, primaryObj, ids) => {
                  const upperFormatted = formatted ? formatted.toUpperCase() : '';
                  updateField('alimentaA', upperFormatted);
                  updateField('alimentaAIds', Array.isArray(ids) ? ids : []);
                }}
                label="ALIMENTA A (Equipos Suministrados Aguas Abajo)"
                placeholder="Seleccionar Subestación, Tableros Principales o Transformadores..."
              />
            </div>
            <div className="hidden print:block tablero-ficha-card p-1.5">
              <span className="tablero-ficha-label block text-[8px] font-black uppercase">ALIMENTA A (EQUIPOS SUMINISTRADOS):</span>
              <span className="text-[9.5px] font-black font-mono text-slate-950">{alimentaA || '—'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* SECCIÓN 2: Punto de Acometida e Infraestructura de Entrada */}
      <div className="bg-slate-950/40 border border-slate-800/80 rounded-2xl p-5 space-y-4 print:bg-white print:border-gray-300">
        <h3 className="text-xs font-bold uppercase tracking-wider text-amber-500 border-b border-slate-800 pb-2.5 flex items-center justify-between print:text-slate-900 print:border-gray-300">
          <span className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-500" /> 2. Punto de Acometida e Infraestructura de Entrada
          </span>
          <button
            type="button"
            disabled={effectivelyReadOnly}
            onClick={() => {
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
            className="no-print inline-flex items-center gap-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer transition-all shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
            title="Configurar Conexión de Jerarquía (Wizard)"
          >
            <Settings className="w-3.5 h-3.5 text-amber-400" /> Configurar Jerarquía
          </button>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* TIPO (Acometida) */}
          <div className="flex flex-col gap-1.5 md:col-span-2">
            <label className="text-[11px] font-bold text-slate-400 print:text-slate-700 uppercase">TIPO</label>
            <div className="grid grid-cols-3 gap-3">
              {['Aérea', 'Subterránea', 'Mixta'].map((tipoVal) => {
                const isSelected = (tipoAcometida === tipoVal) || (tipo === tipoVal);
                return (
                  <button
                    key={tipoVal}
                    type="button"
                    disabled={effectivelyReadOnly}
                    onClick={() => {
                      updateField('tipoAcometida', tipoVal);
                      updateField('tipo', tipoVal);
                    }}
                    className={`py-2 px-3 text-center rounded-xl border text-[11px] font-bold transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${
                      isSelected
                        ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-md print:bg-amber-100 print:text-slate-900 print:border-amber-600'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700 print:bg-gray-50 print:text-slate-700 print:border-gray-300'
                    }`}
                  >
                    [ {isSelected ? '✓' : ' '} ] {tipoVal}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Punto de Conexión (PCC) */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-slate-400 print:text-slate-700">Punto de Conexión (PCC)</label>
            <input
              type="text"
              disabled={effectivelyReadOnly}
              value={puntoConexionPCC ?? ''}
              onChange={(e) => updateField('puntoConexionPCC', e.target.value)}
              className="bg-slate-900 border border-slate-800 focus:border-amber-500 rounded-xl px-3.5 py-2 text-xs text-slate-100 outline-none h-10 transition-all print:bg-white print:text-slate-900 print:border-gray-300 disabled:opacity-60 disabled:cursor-not-allowed"
              placeholder="Tag / Código de Poste, Celda o Subestación"
            />
          </div>

          {/* Conductor de Acometida */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-slate-400 print:text-slate-700">Conductor de Acometida (Tipo / Calibre)</label>
            <input
              type="text"
              disabled={effectivelyReadOnly}
              value={conductorAcometida ?? ''}
              onChange={(e) => updateField('conductorAcometida', e.target.value)}
              className="bg-slate-900 border border-slate-800 focus:border-amber-500 rounded-xl px-3.5 py-2 text-xs text-slate-100 outline-none h-10 transition-all font-mono print:bg-white print:text-slate-900 print:border-gray-300 disabled:opacity-60 disabled:cursor-not-allowed"
              placeholder="Ej. 3x(1x500 kcmil) Cu TTU"
            />
          </div>

          {/* Longitud Acometida / N° Fases */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-slate-400 print:text-slate-700">Longitud Acometida (metros)</label>
            <input
              type="text"
              disabled={effectivelyReadOnly}
              value={longitudAcometida ?? ''}
              onChange={(e) => updateField('longitudAcometida', e.target.value)}
              className="bg-slate-900 border border-slate-800 focus:border-amber-500 rounded-xl px-3.5 py-2 text-xs text-slate-100 outline-none h-10 transition-all font-mono print:bg-white print:text-slate-900 print:border-gray-300 disabled:opacity-60 disabled:cursor-not-allowed"
              placeholder="Ej. 45 m / 3 Fases + N"
            />
          </div>

          {/* Elemento de Maniobra / Protección General */}
          <div className="flex flex-col gap-1.5 md:col-span-2">
            <label className="text-[11px] font-bold text-slate-400 print:text-slate-700">Elemento de Maniobra / Protección General</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
              {['Breaker', 'Cortacircuito Fusible', 'Seccionador', 'Interruptor en Vacío/SF6'].map((elem) => {
                const isSelected = elementoManiobra === elem;
                return (
                  <button
                    key={elem}
                    type="button"
                    disabled={effectivelyReadOnly}
                    onClick={() => updateField('elementoManiobra', elem)}
                    className={`py-2 px-2.5 text-center rounded-xl border text-[10px] font-bold transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${
                      isSelected
                        ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-md print:bg-amber-100 print:text-slate-900 print:border-amber-600'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700 print:bg-gray-50 print:text-slate-700 print:border-gray-300'
                    }`}
                  >
                    [ {isSelected ? '✓' : ' '} ] {elem}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Capacidad de Interrupción General */}
          <div className="flex flex-col gap-1.5 md:col-span-2">
            <label className="text-[11px] font-bold text-slate-400 print:text-slate-700">Capacidad de Interrupción General (Marca / Modelo / Amperaje)</label>
            <input
              type="text"
              disabled={effectivelyReadOnly}
              value={capacidadInterrupcion ?? ''}
              onChange={(e) => updateField('capacidadInterrupcion', e.target.value)}
              className="bg-slate-900 border border-slate-800 focus:border-amber-500 rounded-xl px-3.5 py-2 text-xs text-slate-100 outline-none h-10 transition-all font-mono print:bg-white print:text-slate-900 print:border-gray-300 disabled:opacity-60 disabled:cursor-not-allowed"
              placeholder="Ej. Square D / Masterpact NW16 / 1600A - 65kA"
            />
          </div>
        </div>
      </div>

      {/* SECCIÓN 3: Sistema de Transformación (Si aplica) */}
      <div className="bg-slate-950/40 border border-slate-800/80 rounded-2xl p-5 space-y-4 print:bg-white print:border-gray-300">
        <h3 className="text-xs font-bold uppercase tracking-wider text-amber-500 border-b border-slate-800 pb-2.5 flex items-center gap-2 print:text-slate-900 print:border-gray-300">
          <Activity className="w-4 h-4 text-amber-500" /> 3. Sistema de Transformación (Si aplica)
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Ubicación del Transformador */}
          <div className="flex flex-col gap-2">
            <label className="text-[11px] font-bold text-slate-400 print:text-slate-700">Ubicación del Transformador</label>
            {[
              'Intemperie (Poste/Padmounted)',
              'Subestación Interior / Caseta'
            ].map((ubic) => {
              const isSelected = ubicacionTransformador === ubic;
              return (
                <button
                  key={ubic}
                  type="button"
                  disabled={effectivelyReadOnly}
                  onClick={() => updateField('ubicacionTransformador', ubic)}
                  className={`py-2 px-3 text-left rounded-xl border text-[10px] font-bold transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${
                    isSelected
                      ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-md print:bg-amber-100 print:text-slate-900 print:border-amber-600'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700 print:bg-gray-50 print:text-slate-700 print:border-gray-300'
                  }`}
                >
                  [ {isSelected ? '✓' : ' '} ] {ubic}
                </button>
              );
            })}
          </div>

          {/* Propiedad del Transformador */}
          <div className="flex flex-col gap-2">
            <label className="text-[11px] font-bold text-slate-400 print:text-slate-700">Propiedad del Transformador</label>
            {[
              'Empresa Distribuidora',
              'Cliente Privado'
            ].map((prop) => {
              const isSelected = propiedadTransformador === prop;
              return (
                <button
                  key={prop}
                  type="button"
                  disabled={effectivelyReadOnly}
                  onClick={() => updateField('propiedadTransformador', prop)}
                  className={`py-2 px-3 text-left rounded-xl border text-[10px] font-bold transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${
                    isSelected
                      ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-md print:bg-amber-100 print:text-slate-900 print:border-amber-600'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700 print:bg-gray-50 print:text-slate-700 print:border-gray-300'
                  }`}
                >
                  [ {isSelected ? '✓' : ' '} ] {prop}
                </button>
              );
            })}
          </div>

          {/* Uso del transformador */}
          <div className="flex flex-col gap-2">
            <label className="text-[11px] font-bold text-slate-400 print:text-slate-700">Uso del Transformador</label>
            {[
              'Exclusivo',
              'Compartido'
            ].map((uso) => {
              const isSelected = usoTransformador === uso;
              return (
                <button
                  key={uso}
                  type="button"
                  disabled={effectivelyReadOnly}
                  onClick={() => updateField('usoTransformador', uso)}
                  className={`py-2 px-3 text-left rounded-xl border text-[10px] font-bold transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${
                    isSelected
                      ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-md print:bg-amber-100 print:text-slate-900 print:border-amber-600'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700 print:bg-gray-50 print:text-slate-700 print:border-gray-300'
                  }`}
                >
                  [ {isSelected ? '✓' : ' '} ] {uso}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* SECCIÓN 4: Especificaciones del Sistema de Medición */}
      <div className="bg-slate-950/40 border border-slate-800/80 rounded-2xl p-5 space-y-4 print:bg-white print:border-gray-300">
        <h3 className="text-xs font-bold uppercase tracking-wider text-amber-500 border-b border-slate-800 pb-2.5 flex items-center gap-2 print:text-slate-900 print:border-gray-300">
          <Gauge className="w-4 h-4 text-amber-500" /> 4. Especificaciones del Sistema de Medición
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Ubicación del Medidor */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-slate-400 print:text-slate-700">Ubicación del Medidor</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                'Lado de Alta/Media Tensión',
                'Lado de Baja Tensión'
              ].map((ubic) => {
                const isSelected = ubicacionMedidor === ubic;
                return (
                  <button
                    key={ubic}
                    type="button"
                    disabled={effectivelyReadOnly}
                    onClick={() => updateField('ubicacionMedidor', ubic)}
                    className={`py-2 px-2 text-center rounded-xl border text-[10px] font-bold transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${
                      isSelected
                        ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-md print:bg-amber-100 print:text-slate-900 print:border-amber-600'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700 print:bg-gray-50 print:text-slate-700 print:border-gray-300'
                    }`}
                  >
                    [ {isSelected ? '✓' : ' '} ] {ubic}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tipo de Medición */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-slate-400 print:text-slate-700">Tipo de Medición</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                'Directa',
                'Indirecta'
              ].map((tipo) => {
                const isSelected = tipoMedicion === tipo;
                return (
                  <button
                    key={tipo}
                    type="button"
                    disabled={effectivelyReadOnly}
                    onClick={() => updateField('tipoMedicion', tipo)}
                    className={`py-2 px-2 text-center rounded-xl border text-[10px] font-bold transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${
                      isSelected
                        ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-md print:bg-amber-100 print:text-slate-900 print:border-amber-600'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700 print:bg-gray-50 print:text-slate-700 print:border-gray-300'
                    }`}
                  >
                    [ {isSelected ? '✓' : ' '} ] {tipo}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Marca / Modelo del Medidor */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-slate-400 print:text-slate-700">Marca / Modelo del Medidor</label>
            <input
              type="text"
              disabled={effectivelyReadOnly}
              value={marcaModeloMedidor ?? ''}
              onChange={(e) => updateField('marcaModeloMedidor', e.target.value)}
              className="bg-slate-900 border border-slate-800 focus:border-amber-500 rounded-xl px-3.5 py-2 text-xs text-slate-100 outline-none h-10 transition-all print:bg-white print:text-slate-900 print:border-gray-300 disabled:opacity-60 disabled:cursor-not-allowed"
              placeholder="Ej. Elster A1800 ALPHA / ION7650"
            />
          </div>

          {/* N° de Serie / Año de Fabricación */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-slate-400 print:text-slate-700">N° de Serie / Año de Fabricación</label>
            <input
              type="text"
              disabled={effectivelyReadOnly}
              value={numeroSerieAno ?? ''}
              onChange={(e) => updateField('numeroSerieAno', e.target.value)}
              className="bg-slate-900 border border-slate-800 focus:border-amber-500 rounded-xl px-3.5 py-2 text-xs text-slate-100 outline-none h-10 transition-all font-mono print:bg-white print:text-slate-900 print:border-gray-300 disabled:opacity-60 disabled:cursor-not-allowed"
              placeholder="Ej. SN-7492019 / 2022"
            />
          </div>
        </div>
      </div>

      {/* SECCIÓN 4.1: MEDICIONES */}
      <MetrologiaElectricaSection
        mediciones={localData?.mediciones || {}}
        onChange={(nuevasMediciones, field, val) => {
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

      {/* SECCIÓN 5: Anomalías u observaciones */}
      <div className="tablero-obs-box bg-slate-950/40 border border-slate-800/80 rounded-2xl p-5 print:p-2 space-y-4 print:space-y-1 print:border-slate-500">
        <h3 className="text-xs font-bold uppercase tracking-wider text-amber-500 border-b border-slate-800 pb-2.5 flex items-center gap-2 print:text-slate-900 print:border-gray-300">
          <AlertCircle className="w-4 h-4 text-amber-500 no-print" /> 5. Anomalías u observaciones
        </h3>

        <textarea
          disabled={effectivelyReadOnly}
          value={observaciones}
          onChange={(e) => updateField('observaciones', e.target.value)}
          rows={4}
          className="w-full bg-slate-900 border border-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-xl p-3.5 text-xs text-slate-100 outline-none transition-all placeholder-slate-600 font-sans print:bg-white print:text-slate-900 print:border-gray-300 disabled:opacity-60 disabled:cursor-not-allowed"
          placeholder="Escriba aquí las observaciones, hallazgos o anomalías detectadas en la acometida, transformador o equipo de medición..."
        />
      </div>

      {/* SECCIÓN 5.1: Evidencia Fotográfica del Punto de Suministro */}
      <div className="bg-slate-950/40 border border-slate-800/80 rounded-2xl p-5 print:p-2 space-y-4 print:space-y-1 print:border-slate-500">
        <DualPhotoUploader
          fotoBlob={fotoBlob}
          fotoSrc={foto}
          previewUrl={previewUrl}
          onImageSelected={(file, base64Url) => {
            updateField('fotoBlob', file);
            updateField('foto', base64Url);
            updateField('eliminarFoto', false);
            if (previewUrl && previewUrl.startsWith('blob:')) URL.revokeObjectURL(previewUrl);
            setPreviewUrl(base64Url);
          }}
          onRemove={() => {
            updateField('fotoBlob', null);
            updateField('foto', null);
            updateField('eliminarFoto', true);
            if (previewUrl && previewUrl.startsWith('blob:')) URL.revokeObjectURL(previewUrl);
            setPreviewUrl(null);
          }}
          readOnly={effectivelyReadOnly}
          label="6. Registro Fotográfico del Punto de Suministro / Medidor"
          sublabel="Captura con cámara en vivo o selecciona desde galería"
        />
      </div>

      {/* Cierre y Firmas */}
      <div className="tablero-signatures-box bg-slate-950/40 border border-slate-800/80 rounded-2xl p-5 print:p-2 space-y-4 print:space-y-1 print:mt-1 break-inside-avoid">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-900 pb-2.5 print:text-slate-700 print:border-gray-300">
          Cierre del Levantamiento y Validez Técnica
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 print:grid-cols-2 gap-6 print:gap-4">
          {/* Firma Inspector */}
          <div className="flex flex-col gap-1.5 print:gap-0.5 items-center text-center">
            <span className="text-[10px] print:text-[8.5px] font-bold text-slate-500 uppercase tracking-wide print:text-slate-950">Firma del Inspector / Técnico</span>
            <input
              type="text"
              disabled={effectivelyReadOnly}
              value={firmaInspector}
              onChange={(e) => updateField('firmaInspector', e.target.value)}
              className="w-full max-w-xs bg-slate-900 border border-slate-800 focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-slate-100 outline-none h-10 transition-all text-center no-print disabled:opacity-60 disabled:cursor-not-allowed"
              placeholder="Nombre / Iniciales del Inspector"
            />
            <div className="hidden print:block w-48 border-b-2 border-slate-900 mt-4 mb-0.5"></div>
            <span className="hidden print:block text-[9.5px] font-black text-slate-950">
              {firmaInspector || '—'}
            </span>
          </div>

          {/* Firma Supervisor */}
          <div className="flex flex-col gap-1.5 print:gap-0.5 items-center text-center">
            <span className="text-[10px] print:text-[8.5px] font-bold text-slate-500 uppercase tracking-wide print:text-slate-950">Firma / Sello de la Empresa</span>
            <input
              type="text"
              disabled={effectivelyReadOnly}
              value={firmaSupervisor}
              onChange={(e) => updateField('firmaSupervisor', e.target.value)}
              className="w-full max-w-xs bg-slate-900 border border-slate-800 focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-slate-100 outline-none h-10 transition-all text-center no-print disabled:opacity-60 disabled:cursor-not-allowed"
              placeholder="Nombre / Sello de la Empresa"
            />
            <div className="hidden print:block w-48 border-b-2 border-slate-900 mt-4 mb-0.5"></div>
            <span className="hidden print:block text-[9.5px] font-black text-slate-950">
              {firmaSupervisor || '—'}
            </span>
          </div>
        </div>
      </div>

      {/* Botón flotante / barra inferior de guardado rápido en modo edición */}
      {!readOnly && isEditing && (
        <div className="no-print flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => {
              setLocalData(puntoData || {});
              setIsEditing(false);
            }}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer border border-slate-700"
          >
            Cancelar Edición
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
                nombre: updated.equipo && updated.equipo !== 'RESERVA (Pendiente por Crear)' ? updated.equipo : `Sub-Tablero Alimentado (${circuitId})`,
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
    </div>
  );
}
