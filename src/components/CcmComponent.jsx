import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Cpu, 
  Building2, 
  Zap, 
  Activity, 
  ShieldCheck, 
  AlertCircle, 
  Printer, 
  User, 
  Calendar, 
  Clock, 
  Plus, 
  Trash2, 
  Layers, 
  Thermometer, 
  CheckSquare, 
  FileText,
  Settings,
  Edit3,
  Save,
  Loader2
} from 'lucide-react';
import ModalEdicionCircuito from './ModalEdicionCircuito';
import ModalEditarIdElemento from './ModalEditarIdElemento';
import SelectorAlimentadorJerarquico from './SelectorAlimentadorJerarquico';
import DualPhotoUploader from './DualPhotoUploader';
import useStore, { getElementCode, cleanElementName } from '../store/useStore';

export default function CcmComponent({ ccmData, onUpdate, readOnly, elementosCreados = [] }) {
  const { companies, crearElementoProvisional, showToast } = useStore();
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveCambios = async () => {
    if (readOnly || isSaving) return;
    setIsSaving(true);
    try {
      const latestPhoto =
        typeof ccmData?.foto === 'string' && !ccmData.foto.startsWith('data:image/')
          ? ccmData.foto
          : null;
      const res = await Promise.resolve(
        onUpdate({
          ...ccmData,
          foto: latestPhoto,
          fotoBlob: null
        })
      );
      const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
      if (res && res.ok === false) {
        showToast?.(res.error || 'Error al guardar cambios del CCM en el servidor.', 'error');
      } else if (!isOnline) {
        showToast?.('Guardado localmente (pendiente de sincronizar)', 'info');
      } else {
        showToast?.('Cambios guardados en el servidor', 'success');
      }
    } catch (err) {
      showToast?.(err?.message || 'Error al guardar los cambios del CCM.', 'error');
    } finally {
      setIsSaving(false);
    }
  };
  const resolvedElementosCreados = React.useMemo(() => {
    if (Array.isArray(elementosCreados) && elementosCreados.length > 0) {
      return elementosCreados.filter(e => e.id !== ccmData?.id);
    }
    if (!ccmData?.proyectoId) return [];
    for (const c of (companies || [])) {
      const p = (c.proyectos || []).find(pr => pr.id === ccmData.proyectoId);
      if (p) {
        return [
          ...(p.elementosUnifilares || p.tableros || []),
          ...(p.inspeccionesSubestacion || p.subestaciones || []),
          ...(p.puntosMedicion || []),
          ...(p.ccmList || [])
        ].filter(e => e.id !== ccmData.id);
      }
    }
    return [];
  }, [elementosCreados, companies, ccmData?.proyectoId, ccmData?.id]);
  const user = useStore((state) => state.user);
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'admin';
  const [modalJerarquiaOpen, setModalJerarquiaOpen] = useState(false);
  const [circuitDataWizard, setCircuitDataWizard] = useState(null);
  const [wizardModo, setWizardModo] = useState('SALIDA');
  const [isEditIdModalOpen, setIsEditIdModalOpen] = useState(false);
  if (!ccmData) {
    return <div className="text-center p-8 text-slate-400">No hay datos de CCM seleccionados.</div>;
  }

  const {
    id,
    nombre = '',
    alimentadoPor = '',
    alimentaA = '',
    alimentaAIds = [],
    plantaInstalacion = '',
    areaProceso = '',
    fabricanteMarca = '',
    modeloSerie = '',
    gradoNemaIp = '',
    fecha = '',
    inspector = '',
    supervisor = '',
    anoFabricacionInstalacion = '',

    // Secciones estructuradas
    parametrosElectricos = {},
    gavetasBucketLog = [],
    inspeccionFisica = {},
    seguridadTermografia = {},
    hallazgosCriticos = [],

    firmaInspector = '',
    firmaSupervisor = ''
  } = ccmData;

  const updateFields = (patch = {}) => {
    if (readOnly) return;
    onUpdate({
      ...ccmData,
      ...patch
    });
  };

  const updateField = (field, value) => {
    updateFields({ [field]: value });
  };

  const updateParametro = (key, field, value) => {
    if (readOnly) return;
    const currentParams = ccmData.parametrosElectricos || {};
    const paramObj = currentParams[key] || {};
    onUpdate({
      ...ccmData,
      parametrosElectricos: {
        ...currentParams,
        [key]: {
          ...paramObj,
          [field]: value
        }
      }
    });
  };

  const updateInspeccionFisica = (key, field, value) => {
    if (readOnly) return;
    const currentFisica = ccmData.inspeccionFisica || {};
    const itemObj = currentFisica[key] || {};
    onUpdate({
      ...ccmData,
      inspeccionFisica: {
        ...currentFisica,
        [key]: {
          ...itemObj,
          [field]: value
        }
      }
    });
  };

  const updateSeguridad = (key, field, value) => {
    if (readOnly) return;
    const currentSeg = ccmData.seguridadTermografia || {};
    const itemObj = currentSeg[key] || {};
    onUpdate({
      ...ccmData,
      seguridadTermografia: {
        ...currentSeg,
        [key]: {
          ...itemObj,
          [field]: value
        }
      }
    });
  };

  // Lógica para Gavetas (Bucket Log)
  const addGaveta = () => {
    if (readOnly) return;
    const currentGavetas = ccmData.gavetasBucketLog || [];
    const newGaveta = {
      id: 'g-' + Date.now() + '-' + Math.round(Math.random() * 1000),
      gaveta: `G-0${currentGavetas.length + 1}`,
      tagEquipo: '',
      hpKw: '',
      tipoArranque: 'Directo (DOL)',
      proteccion: '',
      marcaModeloVfd: '',
      redComms: '',
      estadoObs: 'Operativo'
    };
    onUpdate({
      ...ccmData,
      gavetasBucketLog: [...currentGavetas, newGaveta]
    });
  };

  const updateGaveta = (gavetaId, field, value) => {
    if (readOnly) return;
    const currentGavetas = ccmData.gavetasBucketLog || [];
    const updatedGavetas = currentGavetas.map((g) => {
      if (g.id === gavetaId) {
        return { ...g, [field]: value };
      }
      return g;
    });
    onUpdate({
      ...ccmData,
      gavetasBucketLog: updatedGavetas
    });
  };

  const deleteGaveta = (gavetaId) => {
    if (readOnly) return;
    const currentGavetas = ccmData.gavetasBucketLog || [];
    onUpdate({
      ...ccmData,
      gavetasBucketLog: currentGavetas.filter((g) => g.id !== gavetaId)
    });
  };

  // Lógica para Hallazgos Críticos
  const addHallazgo = () => {
    if (readOnly) return;
    const currentHallazgos = ccmData.hallazgosCriticos || [];
    const newHallazgo = {
      id: 'h-' + Date.now(),
      itemNum: String(currentHallazgos.length + 1).padStart(2, '0'),
      descripcion: ''
    };
    onUpdate({
      ...ccmData,
      hallazgosCriticos: [...currentHallazgos, newHallazgo]
    });
  };

  const updateHallazgo = (hId, value) => {
    if (readOnly) return;
    const currentHallazgos = ccmData.hallazgosCriticos || [];
    onUpdate({
      ...ccmData,
      hallazgosCriticos: currentHallazgos.map((h) => h.id === hId ? { ...h, descripcion: value } : h)
    });
  };

  const deleteHallazgo = (hId) => {
    if (readOnly) return;
    const currentHallazgos = ccmData.hallazgosCriticos || [];
    onUpdate({
      ...ccmData,
      hallazgosCriticos: currentHallazgos.filter((h) => h.id !== hId)
    });
  };

  // Listas de gavetas y hallazgos sin datos ficticios de ejemplo
  const defaultGavetas = Array.isArray(ccmData.gavetasBucketLog)
    ? ccmData.gavetasBucketLog
    : [];

  const defaultHallazgos = Array.isArray(ccmData.hallazgosCriticos)
    ? ccmData.hallazgosCriticos
    : [];

  const sheetRef = useRef(null);

  const printOptimization = useMemo(() => {
    const numGavetas = defaultGavetas.length;
    const numHallazgos = defaultHallazgos.length;
    let baseZoom = 0.84;
    let density = 'compact';
    if (numGavetas > 6 || numHallazgos > 3) {
      baseZoom = 0.74;
      density = 'ultra';
    } else if (numGavetas > 2) {
      baseZoom = 0.79;
      density = 'compact';
    }
    return { zoom: baseZoom, density };
  }, [defaultGavetas.length, defaultHallazgos.length]);

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
          <span className="text-[10px] print:text-[8.5px] text-amber-500 font-extrabold uppercase tracking-widest print:text-slate-800">
            Formato de Levantamiento de Información Técnica
          </span>
          <h2 className="text-xl md:text-2xl print:text-xs font-extrabold text-slate-100 tracking-wide mt-1 print:mt-0 print:text-slate-950 uppercase">
            Centro de Control de Motores (CCM) Industrial {nombre ? `— ${nombre}` : ''}
          </h2>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {!readOnly && (
            <button
              type="button"
              onClick={handleSaveCambios}
              disabled={isSaving}
              className="no-print bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-black px-4 py-2 rounded-xl flex items-center gap-2 text-xs transition-all cursor-pointer shadow-md"
              title="Guardar todos los cambios del CCM en el servidor"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>{isSaving ? 'Guardando...' : 'Guardar Cambios'}</span>
            </button>
          )}
          <button
            onClick={() => window.print()}
            className="no-print bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-4 py-2 rounded-xl flex items-center gap-2 text-xs transition-all cursor-pointer shadow-md"
            title="Guardar como PDF o Imprimir esta Inspección de CCM"
          >
            <Printer className="w-4 h-4" /> Guardar PDF
          </button>
          <div className="flex items-center gap-1">
            <span className="tablero-badge-amber inline-flex items-center justify-center font-mono font-black text-amber-400 bg-amber-500/10 px-2.5 py-1 print:px-2 print:py-0.5 rounded-lg print:rounded border border-amber-500/30 text-xs print:text-[9.5px] shadow-sm">
              ID: {getElementCode(ccmData, 'CCM')}
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

      {/* 1. DATOS GENERALES E IDENTIFICACIÓN */}
      <div className="bg-slate-950/40 border border-slate-800/80 rounded-2xl p-5 print:p-2 space-y-4 print:space-y-1.5 print:bg-white print:border-slate-500">
        <h3 className="text-xs font-bold uppercase tracking-wider text-amber-500 border-b border-slate-800 pb-2.5 flex items-center gap-2 print:text-slate-900 print:border-gray-300">
          <Building2 className="w-4 h-4 text-amber-500 no-print" /> 1. Datos Generales e Identificación
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 print:grid-cols-3 gap-4 print:gap-1.5">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-slate-400 print:text-slate-700 uppercase">Planta / Instalación</label>
            <input
              type="text"
              value={plantaInstalacion}
              onChange={(e) => {
                const nextPlanta = e.target.value;
                updateFields({
                  plantaInstalacion: nextPlanta,
                  ubicacion: [nextPlanta, areaProceso].map(s => String(s || '').trim()).filter(Boolean).join(' - ')
                });
              }}
              className="bg-slate-900 border border-slate-800 focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-slate-100 outline-none h-10 transition-all print:bg-white print:text-slate-900 print:border-gray-300"
              placeholder="Ej. Planta Procesadora Central"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-slate-400 print:text-slate-700 uppercase">Área / Proceso</label>
            <input
              type="text"
              value={areaProceso}
              onChange={(e) => {
                const nextArea = e.target.value;
                updateFields({
                  areaProceso: nextArea,
                  ubicacion: [plantaInstalacion, nextArea].map(s => String(s || '').trim()).filter(Boolean).join(' - ')
                });
              }}
              className="bg-slate-900 border border-slate-800 focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-slate-100 outline-none h-10 transition-all print:bg-white print:text-slate-900 print:border-gray-300"
              placeholder="Ej. Cuarto Eléctrico 02 - Bombeo"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-slate-400 print:text-slate-700 uppercase">Tag / Identificación CCM</label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => updateField('nombre', e.target.value)}
              className="bg-slate-900 border border-slate-800 focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-slate-100 font-bold outline-none h-10 transition-all print:bg-white print:text-slate-900 print:border-gray-300"
              placeholder="Ej. CCM-IND-01"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-slate-400 print:text-slate-700 uppercase">Fabricante / Marca</label>
            <input
              type="text"
              value={fabricanteMarca}
              onChange={(e) => updateField('fabricanteMarca', e.target.value)}
              className="bg-slate-900 border border-slate-800 focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-slate-100 outline-none h-10 transition-all print:bg-white print:text-slate-900 print:border-gray-300"
              placeholder="Ej. Allen-Bradley / Siemens / Schneider"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-slate-400 print:text-slate-700 uppercase">Modelo / Serie</label>
            <input
              type="text"
              value={modeloSerie}
              onChange={(e) => updateField('modeloSerie', e.target.value)}
              className="bg-slate-900 border border-slate-800 focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-slate-100 outline-none h-10 transition-all font-mono print:bg-white print:text-slate-900 print:border-gray-300"
              placeholder="Ej. Centerline 2100 / SN-948102"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-slate-400 print:text-slate-700 uppercase">Grado NEMA / IP</label>
            <input
              type="text"
              value={gradoNemaIp}
              onChange={(e) => updateField('gradoNemaIp', e.target.value)}
              className="bg-slate-900 border border-slate-800 focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-slate-100 outline-none h-10 transition-all font-mono print:bg-white print:text-slate-900 print:border-gray-300"
              placeholder="Ej. NEMA 12 / IP54"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-slate-400 print:text-slate-700 uppercase">Fecha del Levantamiento</label>
            <input
              type="date"
              value={fecha}
              onChange={(e) => updateField('fecha', e.target.value)}
              className="bg-slate-900 border border-slate-800 focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-slate-100 outline-none h-10 transition-all font-mono print:bg-white print:text-slate-900 print:border-gray-300"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-slate-400 print:text-slate-700 uppercase">Levantado por (Inspector)</label>
            <input
              type="text"
              value={inspector}
              onChange={(e) => updateField('inspector', e.target.value)}
              className="bg-slate-900 border border-slate-800 focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-slate-100 outline-none h-10 transition-all print:bg-white print:text-slate-900 print:border-gray-300"
              placeholder="Nombre del Inspector"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-slate-400 print:text-slate-700 uppercase">Año Fabricación / Instalación</label>
            <input
              type="text"
              value={anoFabricacionInstalacion}
              onChange={(e) => updateField('anoFabricacionInstalacion', e.target.value)}
              className="bg-slate-900 border border-slate-800 focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-slate-100 outline-none h-10 transition-all font-mono print:bg-white print:text-slate-900 print:border-gray-300 uppercase"
              placeholder="Ej. 2018 / 2019"
            />
          </div>
        </div>

        {/* Topología y Jerarquía Eléctrica del CCM */}
        <div className="pt-4 print:pt-1.5 border-t border-slate-800 print:border-slate-300 grid grid-cols-1 md:grid-cols-2 print:grid-cols-2 gap-5 print:gap-2">
          {/* ALIMENTADO POR */}
          <div>
            <div className="no-print">
              <SelectorAlimentadorJerarquico
                proyectoId={ccmData?.proyectoId}
                tableroActualId={ccmData?.id}
                value={alimentadoPor}
                disabled={readOnly}
                multiple={false}
                tipoElementoActual="CCM"
                direccionRelacion="ALIMENTADO_POR"
                onChange={(val, selectedObj) => {
                  const upperVal = val ? val.toUpperCase() : '';
                  updateFields({
                    alimentadoPor: upperVal,
                    alimentadoPorId: selectedObj?.id || null
                  });
                }}
                label="ALIMENTADO POR (Alimentador Principal / Trafo / Subestación)"
                placeholder="Seleccionar Transformador, Subestación o Tablero General..."
              />
            </div>
            <div className="hidden print:block tablero-ficha-card p-1.5">
              <span className="tablero-ficha-label block text-[8px] font-black uppercase">ALIMENTADO POR:</span>
              <span className="text-[9.5px] font-black font-mono text-slate-950">{alimentadoPor || '—'}</span>
            </div>
          </div>

          {/* ALIMENTA A */}
          <div>
            <div className="no-print">
              <SelectorAlimentadorJerarquico
                proyectoId={ccmData?.proyectoId}
                tableroActualId={ccmData?.id}
                value={alimentaA}
                disabled={readOnly}
                multiple={true}
                tipoElementoActual="CCM"
                direccionRelacion="ALIMENTA_A"
                onChange={(formatted, primaryObj, ids) => {
                  const upperFormatted = formatted ? formatted.toUpperCase() : '';
                  updateFields({
                    alimentaA: upperFormatted,
                    alimentaAIds: Array.isArray(ids) ? ids : []
                  });
                }}
                label="ALIMENTA A (Cargas y Sub-Paneles Suministrados)"
                placeholder="Seleccionar Motores, Gavetas, Sub-Tableros o Cargas..."
              />
            </div>
            <div className="hidden print:block tablero-ficha-card p-1.5">
              <span className="tablero-ficha-label block text-[8px] font-black uppercase">ALIMENTA A (CARGAS Y SUB-PANELES):</span>
              <span className="text-[9.5px] font-black font-mono text-slate-950">{alimentaA || '—'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. PARÁMETROS ELÉCTRICOS GENERALES */}
      <div className="bg-slate-950/40 border border-slate-800/80 rounded-2xl p-5 print:p-2 space-y-4 print:space-y-1.5 print:bg-white print:border-slate-500">
        <h3 className="text-xs font-bold uppercase tracking-wider text-amber-500 border-b border-slate-800 pb-2.5 flex items-center gap-2 print:text-slate-900 print:border-gray-300">
          <Zap className="w-4 h-4 text-amber-500 no-print" /> 2. Parámetros Eléctricos Generales
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-900 text-slate-400 text-[10px] font-extrabold uppercase border-b border-slate-800 print:bg-slate-100 print:text-slate-700 print:border-gray-300">
                <th className="py-2.5 px-3">Parámetro Eléctrico</th>
                <th className="py-2.5 px-3">Valor Nominal</th>
                <th className="py-2.5 px-3">Valor Medido / Ajuste</th>
                <th className="py-2.5 px-3">Notas / Observaciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 print:divide-gray-200">
              {[
                { key: 'tensionPrincipal', label: 'Tensión Principal Nominal (V)', defNominal: '480V / 380V' },
                { key: 'frecuencia', label: 'Frecuencia (Hz)', defNominal: '60 Hz / 50 Hz' },
                { key: 'sistemaFases', label: 'Sistema de Fases e Hilos', defNominal: '3Ø3W / 3Ø4W' },
                { key: 'busPrincipal', label: 'Capacidad de Bus Principal (A)', defNominal: '2000 A' },
                { key: 'sccrCorto', label: 'Nivel de Cortocircuito / SCCR (kA)', defNominal: '65 kA' },
                { key: 'tensionControl', label: 'Tensión de Control / Auxiliar', defNominal: '110V AC / 24V DC' },
                { key: 'interruptorMain', label: 'Interruptor Principal (Main)', defNominal: 'Marca/Modelo/Amp' }
              ].map((p) => {
                const itemData = parametrosElectricos[p.key] || {};
                return (
                  <tr key={p.key} className="hover:bg-slate-900/30 print:hover:bg-transparent">
                    <td className="py-2 px-3 font-semibold text-slate-200 print:text-slate-800">{p.label}</td>
                    <td className="py-2 px-3">
                      <input
                        type="text"
                        value={itemData.nominal || ''}
                        onChange={(e) => updateParametro(p.key, 'nominal', e.target.value)}
                        placeholder={p.defNominal}
                        className="w-full bg-slate-900/60 border border-slate-800 focus:border-amber-500 rounded-lg px-2.5 py-1 text-xs text-slate-100 outline-none font-mono print:bg-white print:text-slate-900 print:border-gray-300"
                      />
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="text"
                        value={itemData.medido || ''}
                        onChange={(e) => updateParametro(p.key, 'medido', e.target.value)}
                        placeholder="Medido / Ajustado"
                        className="w-full bg-slate-900/60 border border-slate-800 focus:border-amber-500 rounded-lg px-2.5 py-1 text-xs text-slate-100 outline-none font-mono print:bg-white print:text-slate-900 print:border-gray-300"
                      />
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="text"
                        value={itemData.notas || ''}
                        onChange={(e) => updateParametro(p.key, 'notas', e.target.value)}
                        placeholder="Observaciones..."
                        className="w-full bg-slate-900/60 border border-slate-800 focus:border-amber-500 rounded-lg px-2.5 py-1 text-xs text-slate-100 outline-none print:bg-white print:text-slate-900 print:border-gray-300"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. REGISTRO TÉCNICO DE GAVETAS / COMPARTIMENTOS (BUCKET LOG) */}
      <div className="bg-slate-950/40 border border-slate-800/80 rounded-2xl p-5 print:p-2 space-y-4 print:space-y-1.5 print:bg-white print:border-slate-500">
        <div className="flex justify-between items-center border-b border-slate-800 pb-2.5 print:pb-0.5 print:border-none">
          <h3 className="text-xs font-bold uppercase tracking-wider text-amber-500 flex items-center gap-2 print:text-slate-900 w-full">
            <Layers className="w-4 h-4 text-amber-500 no-print" /> 3. Registro Técnico de Gavetas / Compartimentos (Bucket Log)
          </h3>
          <button
            type="button"
            onClick={addGaveta}
            className="no-print bg-slate-900 hover:bg-slate-800 border border-slate-800 text-amber-400 font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 text-xs transition-all cursor-pointer shrink-0 ml-2"
          >
            <Plus className="w-3.5 h-3.5" /> Agregar Gaveta
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-900 text-slate-400 text-[10px] font-extrabold uppercase border-b border-slate-800 print:bg-slate-100 print:text-slate-700 print:border-gray-300">
                <th className="py-2.5 px-2.5 w-16">Gaveta</th>
                <th className="py-2.5 px-2.5">Tag Equipo / Motor</th>
                <th className="py-2.5 px-2.5 w-20">HP / kW</th>
                <th className="py-2.5 px-2.5">Tipo Arranque</th>
                <th className="py-2.5 px-2.5">Protección / Breaker</th>
                <th className="py-2.5 px-2.5">Marca/Modelo VFD o Arrancador</th>
                <th className="py-2.5 px-2.5">Red / Comms</th>
                <th className="py-2.5 px-2.5">Estado / Obs.</th>
                <th className="py-2.5 px-2 w-10 no-print"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 print:divide-gray-200">
              {defaultGavetas.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-6 px-4 text-center text-xs text-slate-500 italic print:text-slate-600">
                    Sin gavetas registradas. Haz clic en "+ Agregar Gaveta" para registrar las salidas del CCM.
                  </td>
                </tr>
              ) : defaultGavetas.map((g) => (
                <tr key={g.id} className="hover:bg-slate-900/30 print:hover:bg-transparent">
                  <td className="py-2 px-2">
                    <input
                      type="text"
                      value={g.gaveta}
                      onChange={(e) => updateGaveta(g.id, 'gaveta', e.target.value)}
                      className="w-full bg-slate-900/60 border border-slate-800 focus:border-amber-500 rounded-lg px-2 py-1 text-xs text-slate-100 outline-none font-mono font-bold print:bg-white print:text-slate-900 print:border-gray-300"
                    />
                  </td>
                  <td className="py-2 px-2">
                    <input
                      type="text"
                      value={g.tagEquipo}
                      onChange={(e) => updateGaveta(g.id, 'tagEquipo', e.target.value)}
                      placeholder="Ej. Bomba Agua Potable"
                      className="w-full bg-slate-900/60 border border-slate-800 focus:border-amber-500 rounded-lg px-2 py-1 text-xs text-slate-100 outline-none print:bg-white print:text-slate-900 print:border-gray-300"
                    />
                  </td>
                  <td className="py-2 px-2">
                    <input
                      type="text"
                      value={g.hpKw}
                      onChange={(e) => updateGaveta(g.id, 'hpKw', e.target.value)}
                      placeholder="25 HP"
                      className="w-full bg-slate-900/60 border border-slate-800 focus:border-amber-500 rounded-lg px-2 py-1 text-xs text-slate-100 outline-none font-mono print:bg-white print:text-slate-900 print:border-gray-300"
                    />
                  </td>
                  <td className="py-2 px-2">
                    <input
                      type="text"
                      value={g.tipoArranque}
                      onChange={(e) => updateGaveta(g.id, 'tipoArranque', e.target.value)}
                      placeholder="DOL / VFD / SoftStart"
                      className="w-full bg-slate-900/60 border border-slate-800 focus:border-amber-500 rounded-lg px-2 py-1 text-xs text-slate-100 outline-none print:bg-white print:text-slate-900 print:border-gray-300"
                    />
                  </td>
                  <td className="py-2 px-2">
                    <input
                      type="text"
                      value={g.proteccion}
                      onChange={(e) => updateGaveta(g.id, 'proteccion', e.target.value)}
                      placeholder="Guardamotor 32A"
                      className="w-full bg-slate-900/60 border border-slate-800 focus:border-amber-500 rounded-lg px-2 py-1 text-xs text-slate-100 outline-none print:bg-white print:text-slate-900 print:border-gray-300"
                    />
                  </td>
                  <td className="py-2 px-2">
                    <input
                      type="text"
                      value={g.marcaModeloVfd}
                      onChange={(e) => updateGaveta(g.id, 'marcaModeloVfd', e.target.value)}
                      placeholder="PowerFlex 525 / N/A"
                      className="w-full bg-slate-900/60 border border-slate-800 focus:border-amber-500 rounded-lg px-2 py-1 text-xs text-slate-100 outline-none print:bg-white print:text-slate-900 print:border-gray-300"
                    />
                  </td>
                  <td className="py-2 px-2">
                    <input
                      type="text"
                      value={g.redComms}
                      onChange={(e) => updateGaveta(g.id, 'redComms', e.target.value)}
                      placeholder="EtherNet/IP / Modbus"
                      className="w-full bg-slate-900/60 border border-slate-800 focus:border-amber-500 rounded-lg px-2 py-1 text-xs text-slate-100 outline-none print:bg-white print:text-slate-900 print:border-gray-300"
                    />
                  </td>
                  <td className="py-2 px-2">
                    <input
                      type="text"
                      value={g.estadoObs}
                      onChange={(e) => updateGaveta(g.id, 'estadoObs', e.target.value)}
                      placeholder="Operativo / Mantenim."
                      className="w-full bg-slate-900/60 border border-slate-800 focus:border-amber-500 rounded-lg px-2 py-1 text-xs text-slate-100 outline-none print:bg-white print:text-slate-900 print:border-gray-300"
                    />
                  </td>
                  <td className="py-2 px-1 text-center no-print">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setWizardModo('SALIDA');
                          setCircuitDataWizard({
                            id: g.id,
                            nombre: `Gaveta ${g.gaveta} (${g.tagEquipo || 'Sin Tag'})`,
                            equipo: g.tagEquipo || '',
                            poles: [1],
                            breaker: { amp: g.proteccion || '', marca: '', tipo: '' }
                          });
                          setModalJerarquiaOpen(true);
                        }}
                        className="p-1 hover:bg-amber-500/20 text-amber-400 rounded-lg transition-all cursor-pointer"
                        title="Configurar Conexión / Carga (Wizard)"
                      >
                        <Settings className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteGaveta(g.id)}
                        className="p-1 hover:bg-red-955/20 text-slate-500 hover:text-red-400 rounded-lg transition-all cursor-pointer"
                        title="Eliminar Gaveta"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. INSPECCIÓN FÍSICA Y AMBIENTAL DEL GABINETE */}
      <div className="bg-slate-950/40 border border-slate-800/80 rounded-2xl p-5 print:p-2 space-y-4 print:space-y-1 print:bg-white print:border-slate-500">
        <h3 className="text-xs font-bold uppercase tracking-wider text-amber-500 border-b border-slate-800 pb-2.5 flex items-center gap-2 print:text-slate-900 print:border-gray-300">
          <Activity className="w-4 h-4 text-amber-500 no-print" /> 4. Inspección Física y Ambiental del Gabinete
        </h3>

        <div className="space-y-4 print:space-y-1">
          {[
            { key: 'limpiezaPolvo', label: 'Limpieza Interna / Polvo', options: ['Buena', 'Aceptable', 'Polvo / Acumulación Crítica'] },
            { key: 'humedadAgua', label: 'Humedad / Evidencia de Agua', options: ['Ausente', 'Filtración Superior', 'Condensación'] },
            { key: 'acometidaCables', label: 'Acometida / Entrada Cables', options: ['Superior', 'Inferior'] },
            { key: 'ventilacion', label: 'Ventilación y Extracción', options: ['Operativo', 'Filtros Obstruidos', 'Inoperativo'] },
            { key: 'puestaTierra', label: 'Puesta a Tierra (Malla General)', options: ['Conectada y Ajustada', 'Corroída', 'Desconectada'] }
          ].map((item) => {
            const dataObj = inspeccionFisica[item.key] || {};
            return (
              <div key={item.key} className="p-3.5 print:py-1 print:px-2 bg-slate-900/40 border border-slate-800/80 rounded-xl print:rounded flex flex-col md:flex-row print:flex-row md:items-center print:items-center justify-between gap-3 print:gap-2 print:bg-white print:border-slate-300">
                <span className="text-xs print:text-[9px] font-bold text-slate-200 w-48 print:w-40 shrink-0 print:text-slate-950">{item.label}</span>
                <div className="flex flex-wrap gap-2 print:gap-1">
                  {item.options.map((opt) => {
                    const isSelected = dataObj.estado === opt;
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => updateInspeccionFisica(item.key, 'estado', opt)}
                        className={`px-2.5 py-1 rounded-lg border text-[10px] font-bold transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-md print:bg-amber-100 print:text-slate-900 print:border-amber-600'
                            : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700 print:bg-white print:text-slate-700 print:border-gray-300'
                        }`}
                      >
                        [ {isSelected ? '✓' : ' '} ] {opt}
                      </button>
                    );
                  })}
                </div>
                <input
                  type="text"
                  value={dataObj.observaciones || ''}
                  onChange={(e) => updateInspeccionFisica(item.key, 'observaciones', e.target.value)}
                  placeholder="Observaciones específicas..."
                  className="flex-1 min-w-[200px] print:min-w-[120px] bg-slate-900 border border-slate-800 focus:border-amber-500 rounded-xl px-3 py-1.5 text-xs text-slate-100 outline-none print:bg-white print:text-slate-900 print:border-gray-300"
                />
              </div>
            );
          })}

          {/* Campo Especial: Temperatura Cuarto CCM */}
          <div className="p-3.5 print:py-1 print:px-2 bg-slate-900/40 border border-slate-800/80 rounded-xl print:rounded flex flex-col md:flex-row print:flex-row md:items-center print:items-center justify-between gap-3 print:gap-2 print:bg-white print:border-slate-300">
            <span className="text-xs print:text-[9px] font-bold text-slate-200 w-48 print:w-40 shrink-0 print:text-slate-950 flex items-center gap-1.5">
              <Thermometer className="w-4 h-4 text-amber-500 no-print" /> Temperatura Cuarto CCM
            </span>
            <div className="flex items-center gap-3 print:gap-2">
              <span className="text-xs print:text-[9px] text-slate-400 print:text-slate-800">Medida:</span>
              <input
                type="text"
                value={inspeccionFisica.temperaturaMedida || ''}
                onChange={(e) => updateField('inspeccionFisica', { ...inspeccionFisica, temperaturaMedida: e.target.value })}
                placeholder="24 °C"
                className="w-24 print:w-16 bg-slate-900 border border-slate-800 focus:border-amber-500 rounded-xl px-2.5 py-1 text-xs text-slate-100 font-mono outline-none print:bg-white print:text-slate-900 print:border-gray-300"
              />
              <span className="text-xs print:text-[9px] text-slate-400 print:text-slate-800 ml-2">Aire Acondicionado:</span>
              {['Sí', 'No'].map((opt) => {
                const isSelected = inspeccionFisica.aireAcondicionado === opt;
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => updateField('inspeccionFisica', { ...inspeccionFisica, aireAcondicionado: opt })}
                    className={`px-3 py-1 rounded-lg border text-[10px] font-bold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-md print:bg-amber-100 print:text-slate-900 print:border-amber-600'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700 print:bg-white print:text-slate-700 print:border-gray-300'
                    }`}
                  >
                    [ {isSelected ? '✓' : ' '} ] {opt}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* 5. SEGURIDAD, SEÑALÉTICA Y TERMOGRAFÍA PREDICTIVA */}
      <div className="bg-slate-950/40 border border-slate-800/80 rounded-2xl p-5 print:p-2 space-y-4 print:space-y-1 print:bg-white print:border-slate-500">
        <h3 className="text-xs font-bold uppercase tracking-wider text-amber-500 border-b border-slate-800 pb-2.5 flex items-center gap-2 print:text-slate-900 print:border-gray-300">
          <ShieldCheck className="w-4 h-4 text-amber-500 no-print" /> 5. Seguridad, Señalética y Termografía Predictiva
        </h3>

        <div className="space-y-3 print:space-y-1">
          {[
            { key: 'arcFlash', label: 'Etiquetado Arc Flash (Riesgo)', options: ['Presente y Legible', 'Ausente / Ilegible'] },
            { key: 'unifilarPuerta', label: 'Diagrama Unifilar en Puerta', options: ['Actualizado', 'Desactualizado', 'No Existe'] },
            { key: 'interlockMecanico', label: 'Interlock Mecánico de Puertas', options: ['Operativo / Funcional', 'Forzado / Inoperativo'] },
            { key: 'inspeccionTermografica', label: 'Inspección Termográfica', options: ['Sin Puntos Calientes', 'Punto Caliente Detectado'] }
          ].map((item) => {
            const dataObj = seguridadTermografia[item.key] || {};
            return (
              <div key={item.key} className="p-3.5 print:py-1 print:px-2 bg-slate-900/40 border border-slate-800/80 rounded-xl print:rounded flex flex-col md:flex-row print:flex-row md:items-center print:items-center justify-between gap-3 print:gap-2 print:bg-white print:border-slate-300">
                <span className="text-xs print:text-[9px] font-bold text-slate-200 w-52 print:w-40 shrink-0 print:text-slate-950">{item.label}</span>
                <div className="flex flex-wrap gap-2 print:gap-1">
                  {item.options.map((opt) => {
                    const isSelected = dataObj.estado === opt;
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => updateSeguridad(item.key, 'estado', opt)}
                        className={`px-2.5 py-1 rounded-lg border text-[10px] font-bold transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-md print:bg-amber-100 print:text-slate-900 print:border-amber-600'
                            : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700 print:bg-white print:text-slate-700 print:border-gray-300'
                        }`}
                      >
                        [ {isSelected ? '✓' : ' '} ] {opt}
                      </button>
                    );
                  })}
                </div>
                <input
                  type="text"
                  value={dataObj.detalle || ''}
                  onChange={(e) => updateSeguridad(item.key, 'detalle', e.target.value)}
                  placeholder="Detalle / Registro de Anomalía..."
                  className="flex-1 min-w-[200px] print:min-w-[120px] bg-slate-900 border border-slate-800 focus:border-amber-500 rounded-xl px-3 py-1.5 text-xs text-slate-100 outline-none print:bg-white print:text-slate-900 print:border-gray-300"
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* 6. OBSERVACIONES Y HALLAZGOS CRÍTICOS */}
      <div className="tablero-obs-box bg-slate-950/40 border border-slate-800/80 rounded-2xl p-5 print:p-2 space-y-4 print:space-y-1 print:border-slate-500">
        <div className="flex justify-between items-center border-b border-slate-800 pb-2.5 print:pb-0.5 print:border-none">
          <h3 className="text-xs font-bold uppercase tracking-wider text-amber-500 flex items-center gap-2 print:text-slate-900 w-full">
            <AlertCircle className="w-4 h-4 text-amber-500 no-print" /> 6. Observaciones y Hallazgos Críticos
          </h3>
          <button
            type="button"
            onClick={addHallazgo}
            className="no-print bg-slate-900 hover:bg-slate-800 border border-slate-800 text-amber-400 font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 text-xs transition-all cursor-pointer shrink-0 ml-2"
          >
            <Plus className="w-3.5 h-3.5" /> Agregar Hallazgo
          </button>
        </div>

        <div className="space-y-2.5 print:space-y-1">
          {defaultHallazgos.length === 0 ? (
            <p className="text-xs print:text-[9px] text-slate-500 italic py-2 print:py-0.5 print:text-slate-800">
              Sin hallazgos críticos registrados.
            </p>
          ) : defaultHallazgos.map((h) => (
            <div key={h.id} className="flex items-center gap-3 print:gap-1.5">
              <span className="tablero-badge-amber px-2.5 py-1 print:px-1.5 print:py-0.5 bg-slate-900 border border-slate-800 rounded-lg text-xs print:text-[8.5px] font-mono font-bold text-amber-500">
                {h.itemNum}
              </span>
              <input
                type="text"
                value={h.descripcion}
                onChange={(e) => updateHallazgo(h.id, e.target.value)}
                placeholder="Descripción del hallazgo crítico o recomendación de mantenimiento..."
                className="flex-1 bg-slate-900/60 border border-slate-800 focus:border-amber-500 rounded-xl px-3.5 py-2 text-xs text-slate-100 outline-none transition-all print:bg-white print:text-slate-900 print:border-gray-300"
              />
              <button
                type="button"
                onClick={() => deleteHallazgo(h.id)}
                className="p-2 hover:bg-red-955/40 text-slate-500 hover:text-red-400 rounded-lg transition-all cursor-pointer no-print"
                title="Eliminar Hallazgo"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Registro Fotográfico del CCM */}
      <div className={`bg-slate-950/40 border border-slate-800/80 rounded-2xl p-5 print:p-2 ${!ccmData?.foto ? 'no-print' : ''}`}>
        <DualPhotoUploader
          fotoBlob={ccmData?.fotoBlob || null}
          fotoSrc={ccmData?.foto || null}
          onImageSelected={(file, uploadedUrl) => {
            onUpdate?.({
              ...ccmData,
              fotoBlob: null,
              foto: uploadedUrl,
              eliminarFoto: false
            });
          }}
          onRemove={() => {
            onUpdate?.({
              ...ccmData,
              fotoBlob: null,
              foto: null,
              eliminarFoto: true
            });
          }}
          readOnly={readOnly}
          label="Fotografía del Centro de Control de Motores (CCM)"
          sublabel="Cámara en vivo o selección desde galería"
        />
      </div>

      {/* 7. CONTROL DE REGISTRO Y FIRMAS DE CONFORMIDAD */}
      <div className="tablero-signatures-box bg-slate-950/40 border border-slate-800/80 rounded-2xl p-5 print:p-2 space-y-4 print:space-y-1 print:mt-1 break-inside-avoid">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-900 pb-2.5 print:text-slate-700 print:border-gray-300">
          7. Control de Registro y Firmas de Conformidad
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 print:grid-cols-2 gap-6 print:gap-4">
          {/* Firma Inspector */}
          <div className="flex flex-col gap-2 print:gap-0.5 items-center text-center">
            <span className="text-[10px] print:text-[8.5px] font-bold text-slate-500 uppercase tracking-wide print:text-slate-950">Realizado por (Inspector de Campo)</span>
            <input
              type="text"
              value={firmaInspector}
              onChange={(e) => updateField('firmaInspector', e.target.value)}
              className="w-full max-w-xs bg-slate-900 border border-slate-800 focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-slate-100 outline-none h-10 transition-all text-center no-print"
              placeholder="Firma / Nombre del Inspector"
            />
            <div className="hidden print:block w-48 border-b-2 border-slate-900 mt-4 mb-0.5"></div>
            <span className="hidden print:block text-[9.5px] font-black text-slate-950">
              {firmaInspector || '—'}
            </span>
          </div>

          {/* Firma Supervisor */}
          <div className="flex flex-col gap-2 print:gap-0.5 items-center text-center">
            <span className="text-[10px] print:text-[8.5px] font-bold text-slate-500 uppercase tracking-wide print:text-slate-950">Revisado y Aprobado por (Supervisor)</span>
            <input
              type="text"
              value={firmaSupervisor}
              onChange={(e) => updateField('firmaSupervisor', e.target.value)}
              className="w-full max-w-xs bg-slate-900 border border-slate-800 focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-slate-100 outline-none h-10 transition-all text-center no-print"
              placeholder="Firma / Nombre del Supervisor"
            />
            <div className="hidden print:block w-48 border-b-2 border-slate-900 mt-4 mb-0.5"></div>
            <span className="hidden print:block text-[9.5px] font-black text-slate-950">
              {firmaSupervisor || '—'}
            </span>
          </div>
        </div>
      </div>

      <ModalEdicionCircuito
        isOpen={modalJerarquiaOpen}
        onClose={() => setModalJerarquiaOpen(false)}
        circuitData={circuitDataWizard}
        modo={wizardModo}
        tipoOrigen="CCM"
        elementosCreados={resolvedElementosCreados}
        proyectoId={ccmData?.proyectoId}
        parentElement={ccmData ? { id: ccmData.id, nombre: ccmData.nombre, proyectoId: ccmData.proyectoId, empresaId: ccmData.empresaId } : null}
        onSave={(circuitId, updated) => {
          if (updated.tipoDestino === 'SUB_TABLERO_PENDIENTE' && ccmData.proyectoId) {
            const existingProvId = updated.elementoDestinoId || updated.vinculadoId;
            let prov = null;
            if (existingProvId) {
              prov = (companies || []).flatMap(c => c.proyectos || []).flatMap(p => p.elementosUnifilares || p.tableros || []).find(e => e.id === existingProvId);
            }
            if (!prov) {
              prov = crearElementoProvisional(ccmData.proyectoId, {
                nombre: updated.equipo && updated.equipo !== 'RESERVA (Pendiente por Crear)' ? updated.equipo : `Sub-Tablero desde CCM (${circuitId})`,
                tipoElemento: 'TABLERO',
                circuitoOrigen: circuitId
              });
            }
            if (prov) {
              updated.vinculadoId = prov.id;
              updated.elementoDestinoId = prov.id;
              updated.tipoElementoDestino = 'TABLERO';
              updated.equipo = `${cleanElementName(prov.nombre, prov.id, prov.codigo)} (ID: ${getElementCode(prov, 'TABLERO')})`;
              updated.tipoDestino = 'SUB_TABLERO';
            }
          }
          if (updated.equipo) updateGaveta(circuitId, 'tagEquipo', updated.equipo);
          if (updated.detallesTecnicos?.esquemaArranque) updateGaveta(circuitId, 'tipoArranque', updated.detallesTecnicos.esquemaArranque);
          if (updated.detallesTecnicos?.hpKw) updateGaveta(circuitId, 'hpKw', updated.detallesTecnicos.hpKw);
          if (updated.detallesTecnicos?.proteccion || updated.breaker?.amp) updateGaveta(circuitId, 'proteccion', updated.detallesTecnicos?.proteccion || updated.breaker?.amp);
          if (updated.detallesTecnicos?.redComms) updateGaveta(circuitId, 'redComms', updated.detallesTecnicos.redComms);
        }}
      />

      {/* Modal de Edición de ID Visual (Solo Administradores) */}
      <ModalEditarIdElemento
        isOpen={isEditIdModalOpen}
        onClose={() => setIsEditIdModalOpen(false)}
        elemento={ccmData}
        tipoElemento="CCM"
        proyectoId={ccmData?.proyectoId}
      />

    </div>
  );
}
