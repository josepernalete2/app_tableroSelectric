import React, { useState, useEffect, useMemo } from 'react';
import { 
  RefreshCw, 
  Zap, 
  Shield, 
  Layers, 
  Activity, 
  Gauge, 
  Camera, 
  Printer, 
  Save, 
  Edit3, 
  Check, 
  AlertTriangle, 
  Sliders, 
  Cpu, 
  ArrowRightLeft,
  CheckCircle2,
  Clock,
  Settings,
  Info,
  RotateCcw
} from 'lucide-react';
import useStore from '../store/useStore';
import { useConfirm } from '../context/ConfirmContext';
import SelectorAlimentadorJerarquico from './SelectorAlimentadorJerarquico';
import MetrologiaElectricaSection from './MetrologiaElectricaSection';
import DualPhotoUploader from './DualPhotoUploader';
import { 
  TENSIONES_COVENIN_159_BT, 
  TENSIONES_COVENIN_TODAS, 
  FRECUENCIAS_NORMALIZADAS, 
  POLOS_TRANSFERENCIA 
} from '../utils/constants';

export default function TransferComponent({ 
  transferData, 
  elementoData, 
  onUpdate, 
  readOnly = false 
}) {
  const data = transferData || elementoData;
  const { alert: customAlert, confirm: customConfirm } = useConfirm();
  const companies = useStore((state) => state.companies || []);

  const [isEditing, setIsEditing] = useState(false);

  // Lista de elementos de jerarquía del proyecto para alimentar los selectores
  const projectElements = useMemo(() => {
    const list = [];
    const compId = data?.empresaId || data?.companyId;
    const company = companies.find(c => c.id === compId);
    if (!company) {
      companies.forEach(c => {
        if (c.elementosUnifilares) list.push(...c.elementosUnifilares);
        if (c.proyectos) {
          c.proyectos.forEach(p => {
            const elList = p.elementosUnifilares || p.tableros || [];
            list.push(...elList);
          });
        }
      });
      return list.filter(e => e.id !== data?.id);
    }

    if (company.elementosUnifilares) list.push(...company.elementosUnifilares);
    if (company.proyectos) {
      company.proyectos.forEach(p => {
        const elList = p.elementosUnifilares || p.tableros || [];
        list.push(...elList);
      });
    }
    return list.filter(e => e.id !== data?.id);
  }, [companies, data]);

  // Estados locales editables - Sin datos demo quemados
  const [nombre, setNombre] = useState(data?.nombre || '');
  const [ubicacion, setUbicacion] = useState(data?.ubicacion || '');
  const [observaciones, setObservaciones] = useState(
    data?.observacionesGenerales || data?.datosTecnicos?.observacionTransferencia || ''
  );

  // Datos Técnicos JSON
  const [dt, setDt] = useState(data?.datosTecnicos || {});

  // Foto
  const [fotoBlob, setFotoBlob] = useState(data?.fotoBlob || null);
  const [fotoSrc, setFotoSrc] = useState(data?.foto || null);
  const [previewUrl, setPreviewUrl] = useState(null);

  // Sincronizar si cambian los props
  useEffect(() => {
    if (data) {
      setNombre(data.nombre || '');
      setUbicacion(data.ubicacion || '');
      setObservaciones(data.observacionesGenerales || data.datosTecnicos?.observacionTransferencia || '');
      setDt(data.datosTecnicos || {});
      setFotoBlob(data.fotoBlob || null);
      setFotoSrc(data.foto || null);
    }
  }, [data]);

  // Fallback si no hay datos
  if (!data) {
    return (
      <div className="text-center p-12 text-slate-400 font-sans">
        <RefreshCw className="w-12 h-12 text-slate-600 mx-auto mb-3 animate-spin" />
        <p className="text-sm">No se han encontrado datos para esta unidad de Transferencia.</p>
      </div>
    );
  }

  const handleDtChange = (key, value) => {
    if (readOnly) return;
    setDt(prev => ({ ...prev, [key]: value }));
  };

  const handleNestedDtChange = (parentKey, key, value) => {
    if (readOnly) return;
    setDt(prev => ({
      ...prev,
      [parentKey]: {
        ...(prev[parentKey] || {}),
        [key]: value
      }
    }));
  };

  const handleSave = () => {
    if (readOnly) return;
    if (onUpdate) {
      onUpdate({
        ...data,
        nombre,
        ubicacion,
        observacionesGenerales: observaciones,
        fotoBlob,
        foto: fotoSrc,
        datosTecnicos: {
          ...dt,
          observacionTransferencia: observaciones
        }
      });
    }
    setIsEditing(false);
  };

  const handleLimpiarFormulario = async () => {
    if (readOnly) return;
    const confirmed = await customConfirm("¿Deseas reiniciar todos los campos de esta transferencia a valores en blanco?");
    if (!confirmed) return;

    setNombre('');
    setUbicacion('');
    setObservaciones('');
    setDt({});
    setFotoBlob(null);
    setFotoSrc(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
  };

  // Valores de configuración operativa
  const modoOperativo = dt.modoOperativo || dt.tipoTransferenciaOperativa || (dt.tipoTransferencia?.toUpperCase().includes('MANUAL') || dt.tipoTransferencia?.toUpperCase().includes('MTS') ? 'MTS' : 'ATS');
  const estadoServicio = dt.estadoServicio || 'En Servicio'; // 'En Servicio' | 'Fuera de Servicio'
  const tipoTransicion = dt.tipoTransicion || 'ABIERTA'; // 'ABIERTA' | 'CERRADA' | 'RETARDADA'
  const tipoEnclavamiento = dt.tipoEnclavamiento || 'MECANICO_ELECTRICO';
  const polos = dt.polos || '4P';
  const frecuencia = dt.frecuencia || '60 Hz';

  // Valores de Fuente Normal (Fuente A)
  const fuenteNormalNombre = dt.fuenteNormalNombre || dt.alimentacionGenerador1 || dt.alimentacionCorpoelec || '';
  const fuenteNormalTension = dt.fuenteNormalTension || '';
  const fuenteNormalAmperaje = dt.fuenteNormalAmperaje || dt.amperaje || '';
  const fuenteNormalConductor = dt.fuenteNormalConductor || dt.conductorFuenteNormal || '';

  // Valores de Fuente Emergencia (Fuente B)
  const fuenteEmergenciaNombre = dt.fuenteEmergenciaNombre || dt.alimentacionGenerador2 || dt.alimentacionTransfDomosa || '';
  const fuenteEmergenciaTension = dt.fuenteEmergenciaTension || '';
  const fuenteEmergenciaAmperaje = dt.fuenteEmergenciaAmperaje || dt.amperaje || '';
  const fuenteEmergenciaConductor = dt.fuenteEmergenciaConductor || dt.conductorFuenteEmergencia || '';

  // Salida a Carga
  const salidaCargaNombre = dt.salidaCargaNombre || dt.carga || '';
  const salidaCargaConductor = dt.salidaCargaConductor || '';
  const neutroConductor = dt.neutroConductor || dt.neutro || '';
  const tierraConductor = dt.tierraConductor || dt.tierra || '';

  return (
    <div className={`max-w-6xl mx-auto space-y-6 animate-fade-in font-sans pb-16 print-card print:p-0 print:m-0 ${readOnly ? 'pointer-events-none opacity-95' : ''}`}>
      
      {/* ========================================================================= */}
      {/* 1. BARRA DE HERRAMIENTAS Y ACCIONES SUPERIORES (NO PRINT) */}
      {/* ========================================================================= */}
      <div className="flex flex-wrap items-center justify-between gap-4 no-print bg-slate-950/80 backdrop-blur-md p-4 rounded-2xl border border-slate-800 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/30 rounded-xl">
            <RefreshCw className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20">
                {modoOperativo === 'ATS' ? '🔄 TRANSFERENCIA AUTOMÁTICA (ATS)' : '🔀 TRANSFERENCIA MANUAL (MTS)'}
              </span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${estadoServicio === 'En Servicio' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-red-950 text-red-400 border border-red-800'}`}>
                {estadoServicio}
              </span>
              <span className="font-mono text-xs font-bold text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                ID: {data.id}
              </span>
            </div>
            <h1 className="text-lg font-black text-slate-100 mt-0.5">
              {nombre || 'Unidad de Transferencia'}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => window.print()}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 rounded-xl transition-all cursor-pointer flex items-center gap-2 text-xs font-bold shadow-sm"
            title="Guardar como PDF o Imprimir Ficha"
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
                  title="Reiniciar todos los campos a blanco"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Limpiar Formulario</span>
                </button>
              )}

              {isEditing ? (
                <button
                  onClick={handleSave}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl transition-all font-black text-xs cursor-pointer flex items-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95"
                >
                  <Save className="w-4 h-4" /> Guardar Cambios
                </button>
              ) : (
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl transition-all font-black text-xs cursor-pointer flex items-center gap-2 shadow-lg shadow-amber-500/20 active:scale-95"
                >
                  <Edit3 className="w-4 h-4" /> Editar Transferencia
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. CUADRO PRINCIPAL CON TARJETA SUPERIOR DERECHA DE DOBLE FUENTE */}
      {/* ========================================================================= */}
      <div className="bg-slate-950 border-2 border-slate-800 rounded-2xl overflow-hidden shadow-2xl print:border-black print:bg-white print:text-black">
        
        {/* Cabecera Principal */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-slate-850 border-b-2 border-slate-800 p-4 print:bg-gray-100 print:border-black">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <span className="text-[10px] font-mono font-bold tracking-widest text-amber-400 uppercase">
                SISTEMA DE CONMUTACIÓN DE POTENCIA • {modoOperativo === 'ATS' ? 'AUTOMATIC TRANSFER SWITCH' : 'MANUAL TRANSFER SWITCH'}
              </span>
              <h2 className="text-xl font-black text-slate-100 tracking-wide uppercase font-mono print:text-black">
                {isEditing ? (
                  <input
                    type="text"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    placeholder="Ej. ATS-1 - Transferencia Principal Sótano"
                    className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 w-full focus:outline-none focus:border-amber-500 text-slate-100 font-bold placeholder-slate-600"
                  />
                ) : (
                  nombre || 'ATS - Transferencia'
                )}
              </h2>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-slate-400">Capacidad Nominal:</span>
              {isEditing ? (
                <input
                  type="text"
                  value={dt.amperaje || dt.capacidadAmperios || ''}
                  onChange={(e) => handleDtChange('amperaje', e.target.value)}
                  placeholder="Ej. 3200 A"
                  className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs font-mono font-bold text-amber-400 text-center w-28"
                />
              ) : (
                <span className="px-3 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-lg font-mono font-black text-sm">
                  {dt.amperaje || dt.capacidadAmperios ? `${dt.amperaje || dt.capacidadAmperios}` : '—'}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Layout de 2 Columnas Superiores: Izquierda (Generales) y Derecha (Doble Fuente) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-800 border-b-2 border-slate-800">
          
          {/* Columna Izquierda: Datos del Equipo y Parámetros Constructivos (5 columnas) */}
          <div className="lg:col-span-5 p-5 space-y-4 bg-slate-900/40">
            <h3 className="text-xs font-black text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Cpu className="w-4 h-4 text-amber-400" />
              Especificaciones Constructivas del ATS / MTS
            </h3>

            <div className="space-y-3 text-xs font-mono">
              <div className="flex justify-between items-center bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                <span className="text-slate-400 font-bold">UBICACIÓN:</span>
                {isEditing ? (
                  <input
                    type="text"
                    value={ubicacion}
                    onChange={(e) => setUbicacion(e.target.value)}
                    placeholder="Ej. Sala Técnica / Sótano"
                    className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-100 text-right text-xs placeholder-slate-600"
                  />
                ) : (
                  <span className="text-slate-200 font-semibold">{ubicacion || '—'}</span>
                )}
              </div>

              <div className="flex justify-between items-center bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                <span className="text-slate-400 font-bold">MODELO / MARCA:</span>
                {isEditing ? (
                  <input
                    type="text"
                    value={dt.modelo || ''}
                    onChange={(e) => handleDtChange('modelo', e.target.value)}
                    placeholder="Ej. Socomec ATyS / YUYE-YES1"
                    className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-100 text-right text-xs placeholder-slate-600"
                  />
                ) : (
                  <span className="text-slate-200 font-semibold">{dt.modelo || dt.tipoTransferencia || '—'}</span>
                )}
              </div>

              {/* Tensión Nominal Normalizada (COVENIN 159) */}
              <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-400 block font-bold">TENSIÓN NOMINAL (COVENIN 159):</span>
                {isEditing ? (
                  <select
                    value={dt.tensionNominal || ''}
                    onChange={(e) => handleDtChange('tensionNominal', e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-100 text-xs font-bold"
                  >
                    <option value="">-- Seleccionar Tensión Normalizada --</option>
                    {TENSIONES_COVENIN_159_BT.map(v => (
                      <option key={v} value={v}>{v}</option>
                    ))}
                  </select>
                ) : (
                  <span className="text-emerald-400 font-bold text-sm block mt-0.5">{dt.tensionNominal || '—'}</span>
                )}
              </div>

              {/* Polos y Frecuencia desacoplados */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-bold">N° DE POLOS:</span>
                  {isEditing ? (
                    <select
                      value={polos}
                      onChange={(e) => handleDtChange('polos', e.target.value)}
                      className="w-full mt-1 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-100 text-xs font-bold"
                    >
                      {POLOS_TRANSFERENCIA.map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-amber-400 font-bold text-sm block mt-0.5">{polos}</span>
                  )}
                </div>

                <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-bold">FRECUENCIA:</span>
                  {isEditing ? (
                    <select
                      value={frecuencia}
                      onChange={(e) => handleDtChange('frecuencia', e.target.value)}
                      className="w-full mt-1 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-100 text-xs font-bold"
                    >
                      {FRECUENCIAS_NORMALIZADAS.map(f => (
                        <option key={f} value={f}>{f}</option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-sky-400 font-bold text-sm block mt-0.5">{frecuencia}</span>
                  )}
                </div>
              </div>

              {/* Controlador ATS: Bloqueado y deshabilitado si tipo es MANUAL (MTS) */}
              <div className={`flex justify-between items-center p-2.5 rounded-xl border ${modoOperativo === 'MTS' ? 'bg-slate-950/40 border-slate-850 opacity-60' : 'bg-slate-900/80 border-slate-800'}`}>
                <div className="flex flex-col">
                  <span className="text-slate-400 font-bold">CONTROLADOR ATS:</span>
                  {modoOperativo === 'MTS' && (
                    <span className="text-[9px] text-amber-500 font-semibold">(No Aplica en modo Manual)</span>
                  )}
                </div>
                {isEditing ? (
                  <input
                    type="text"
                    disabled={modoOperativo === 'MTS'}
                    value={modoOperativo === 'MTS' ? 'No Aplica (Transferencia Manual)' : (dt.controladorAts || '')}
                    onChange={(e) => handleDtChange('controladorAts', e.target.value)}
                    placeholder="Ej. Deep Sea DSE 334 / ComAp"
                    className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-100 text-right text-xs placeholder-slate-600 disabled:bg-slate-900 disabled:text-slate-500"
                  />
                ) : (
                  <span className="text-slate-300 font-semibold">
                    {modoOperativo === 'MTS' ? 'No Aplica (Transferencia Manual)' : (dt.controladorAts || '—')}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Columna Derecha: TARJETA SUPERIOR DERECHA - DOBLE FUENTE DE ALIMENTACIÓN (7 columnas) */}
          <div className="lg:col-span-7 p-5 space-y-4 bg-slate-950/60">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <Zap className="w-4 h-4 text-emerald-400" />
                Doble Fuente de Alimentación de la Transferencia
              </h3>
              <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                Jerarquía Activa
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              
              {/* Tarjeta 1: FUENTE NORMAL / PRINCIPAL (VERDE) */}
              <div className="bg-gradient-to-b from-emerald-950/30 to-slate-900/90 border border-emerald-500/30 rounded-xl p-3.5 space-y-2.5 shadow-lg relative overflow-hidden">
                <div className="flex items-center justify-between border-b border-emerald-500/20 pb-2">
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    Fuente Normal (Prioridad 1)
                  </span>
                  <span className="text-[10px] font-mono font-bold text-emerald-400">RED</span>
                </div>

                <div>
                  <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Origen / Alimentador Normal:
                  </label>
                  {isEditing ? (
                    <SelectorAlimentadorJerarquico
                      value={fuenteNormalNombre}
                      onChange={(val) => handleDtChange('fuenteNormalNombre', val)}
                      proyectoId={data.proyectoId}
                      tableroActualId={data.id}
                      elementosList={projectElements}
                      placeholder="Seleccionar Subestación, Transformador..."
                      className="text-xs"
                      label=""
                    />
                  ) : (
                    <p className="font-bold text-slate-100 text-xs font-mono truncate" title={fuenteNormalNombre}>
                      {fuenteNormalNombre || '—'}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 text-[10px] font-mono pt-1 border-t border-slate-800/80">
                  <div>
                    <span className="text-slate-500 block font-bold">TENSIÓN:</span>
                    {isEditing ? (
                      <input
                        type="text"
                        value={fuenteNormalTension}
                        onChange={(e) => handleDtChange('fuenteNormalTension', e.target.value)}
                        placeholder="Ej. 208/120V"
                        className="w-full bg-slate-950 border border-slate-700 rounded px-1.5 py-0.5 text-slate-100 text-[10px]"
                      />
                    ) : (
                      <span className="text-slate-300 font-bold">{fuenteNormalTension || '—'}</span>
                    )}
                  </div>
                  <div>
                    <span className="text-slate-500 block font-bold">CAPACIDAD BREAKER:</span>
                    {isEditing ? (
                      <input
                        type="text"
                        value={fuenteNormalAmperaje}
                        onChange={(e) => handleDtChange('fuenteNormalAmperaje', e.target.value)}
                        placeholder="Ej. 3200 A"
                        className="w-full bg-slate-950 border border-slate-700 rounded px-1.5 py-0.5 text-slate-100 text-[10px]"
                      />
                    ) : (
                      <span className="text-slate-300 font-bold">{fuenteNormalAmperaje || '—'}</span>
                    )}
                  </div>
                </div>

                <div className="text-[10px] font-mono pt-1 border-t border-slate-800/80">
                  <span className="text-slate-500 block font-bold">CONDUCTOR DE ACOMETIDA:</span>
                  {isEditing ? (
                    <input
                      type="text"
                      value={fuenteNormalConductor}
                      onChange={(e) => handleDtChange('fuenteNormalConductor', e.target.value)}
                      placeholder="Ej. 2(3X500 MCM)"
                      className="w-full mt-1 bg-slate-900 border border-slate-700 rounded px-2 py-0.5 text-slate-100 text-xs"
                    />
                  ) : (
                    <span className="text-slate-200 font-bold block mt-0.5">{fuenteNormalConductor || '—'}</span>
                  )}
                </div>
              </div>

              {/* Tarjeta 2: FUENTE EMERGENCIA (ÁMBAR/ROJO) */}
              <div className="bg-gradient-to-b from-amber-950/30 to-slate-900/90 border border-amber-500/30 rounded-xl p-3.5 space-y-2.5 shadow-lg relative overflow-hidden">
                <div className="flex items-center justify-between border-b border-amber-500/20 pb-2">
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-400 border border-amber-500/40">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                    Fuente Emergencia (Prioridad 2)
                  </span>
                  <span className="text-[10px] font-mono font-bold text-amber-400">GEN</span>
                </div>

                <div>
                  <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Origen / Planta Generador:
                  </label>
                  {isEditing ? (
                    <SelectorAlimentadorJerarquico
                      value={fuenteEmergenciaNombre}
                      onChange={(val) => handleDtChange('fuenteEmergenciaNombre', val)}
                      proyectoId={data.proyectoId}
                      tableroActualId={data.id}
                      elementosList={projectElements}
                      placeholder="Seleccionar Generador / Planta..."
                      className="text-xs"
                      label=""
                    />
                  ) : (
                    <p className="font-bold text-slate-100 text-xs font-mono truncate" title={fuenteEmergenciaNombre}>
                      {fuenteEmergenciaNombre || '—'}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 text-[10px] font-mono pt-1 border-t border-slate-800/80">
                  <div>
                    <span className="text-slate-500 block font-bold">TENSIÓN:</span>
                    {isEditing ? (
                      <input
                        type="text"
                        value={fuenteEmergenciaTension}
                        onChange={(e) => handleDtChange('fuenteEmergenciaTension', e.target.value)}
                        placeholder="Ej. 208/120V"
                        className="w-full bg-slate-950 border border-slate-700 rounded px-1.5 py-0.5 text-slate-100 text-[10px]"
                      />
                    ) : (
                      <span className="text-slate-300 font-bold">{fuenteEmergenciaTension || '—'}</span>
                    )}
                  </div>
                  <div>
                    <span className="text-slate-500 block font-bold">CAPACIDAD BREAKER:</span>
                    {isEditing ? (
                      <input
                        type="text"
                        value={fuenteEmergenciaAmperaje}
                        onChange={(e) => handleDtChange('fuenteEmergenciaAmperaje', e.target.value)}
                        placeholder="Ej. 3200 A"
                        className="w-full bg-slate-950 border border-slate-700 rounded px-1.5 py-0.5 text-slate-100 text-[10px]"
                      />
                    ) : (
                      <span className="text-slate-300 font-bold">{fuenteEmergenciaAmperaje || '—'}</span>
                    )}
                  </div>
                </div>

                <div className="text-[10px] font-mono pt-1 border-t border-slate-800/80">
                  <span className="text-slate-500 block font-bold">CONDUCTOR DE ACOMETIDA:</span>
                  {isEditing ? (
                    <input
                      type="text"
                      value={fuenteEmergenciaConductor}
                      onChange={(e) => handleDtChange('fuenteEmergenciaConductor', e.target.value)}
                      placeholder="Ej. 2(3X500 MCM)"
                      className="w-full mt-1 bg-slate-900 border border-slate-700 rounded px-2 py-0.5 text-slate-100 text-xs"
                    />
                  ) : (
                    <span className="text-slate-200 font-bold block mt-0.5">{fuenteEmergenciaConductor || '—'}</span>
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 3. ENCLAVAMIENTO, MODO OPERATIVO Y ESTADO DE SERVICIO */}
        {/* ========================================================================= */}
        <div className="p-4 bg-slate-900/90 border-b-2 border-slate-800">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            
            {/* Modo Operativo (ATS / MTS) */}
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5 font-mono">
                <Sliders className="w-4 h-4 text-amber-400" />
                Modo de Operación:
              </span>
              {isEditing ? (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleDtChange('modoOperativo', 'ATS')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                      modoOperativo === 'ATS'
                        ? 'bg-amber-500 text-slate-950 shadow-md'
                        : 'bg-slate-900 text-slate-400 border border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    🔄 Automática (ATS)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDtChange('modoOperativo', 'MTS')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                      modoOperativo === 'MTS'
                        ? 'bg-amber-500 text-slate-950 shadow-md'
                        : 'bg-slate-900 text-slate-400 border border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    🔀 Manual (MTS)
                  </button>
                </div>
              ) : (
                <span className="px-3 py-1 bg-slate-900 text-amber-400 border border-amber-500/30 rounded-lg text-xs font-black font-mono">
                  {modoOperativo === 'ATS' ? '🔄 AUTOMÁTICA (ATS)' : '🔀 MANUAL (MTS)'}
                </span>
              )}
            </div>

            {/* Selector de Estado de Servicio (En Servicio / Fuera de Servicio) */}
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5 font-mono">
                <Shield className="w-4 h-4 text-emerald-400" />
                Estado de Operatividad:
              </span>
              {isEditing ? (
                <select
                  value={estadoServicio}
                  onChange={(e) => handleDtChange('estadoServicio', e.target.value)}
                  className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 font-bold focus:outline-none focus:border-amber-500 cursor-pointer"
                >
                  <option value="En Servicio">🟢 En Servicio</option>
                  <option value="Fuera de Servicio">🔴 Fuera de Servicio</option>
                </select>
              ) : (
                <span className={`px-3 py-1 rounded-lg text-xs font-bold font-mono ${
                  estadoServicio === 'En Servicio' 
                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' 
                    : 'bg-red-950 text-red-400 border border-red-800'
                }`}>
                  {estadoServicio === 'En Servicio' ? '🟢 En Servicio' : '🔴 Fuera de Servicio'}
                </span>
              )}
            </div>

            {/* Selector de Tipo de Transición */}
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5 font-mono">
                <ArrowRightLeft className="w-4 h-4 text-sky-400" />
                Transición:
              </span>
              {isEditing ? (
                <select
                  value={tipoTransicion}
                  onChange={(e) => handleDtChange('tipoTransicion', e.target.value)}
                  className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 font-bold focus:outline-none focus:border-amber-500 cursor-pointer"
                >
                  <option value="ABIERTA">Abierta (Break-Before-Make / I-0-II)</option>
                  <option value="CERRADA">Cerrada (Make-Before-Break / Sin Corte)</option>
                  <option value="RETARDADA">Retardada (Pausa Programada en Cero)</option>
                </select>
              ) : (
                <span className="px-3 py-1 bg-slate-900 text-sky-400 border border-sky-500/30 rounded-lg text-xs font-bold font-mono">
                  {tipoTransicion === 'CERRADA' ? '⚡ Cerrada' :
                   tipoTransicion === 'RETARDADA' ? '⏱️ Retardada' :
                   '🔌 Abierta'}
                </span>
              )}
            </div>

          </div>
        </div>

        {/* ========================================================================= */}
        {/* 4. METROLOGÍA ELÉCTRICA COMPLETA (COVENIN 159) */}
        {/* ========================================================================= */}
        <div className="p-4 bg-slate-950 border-b-2 border-slate-800">
          <MetrologiaElectricaSection
            mediciones={dt.mediciones || {}}
            onChange={(nuevasMediciones) => handleDtChange('mediciones', nuevasMediciones)}
            readOnly={!isEditing}
            titulo="Parámetros de Medición en Barra de Carga Común (COVENIN 159)"
            subtitulo="Tensiones L-L, L-N y 5 canales de corriente (Fases A, B, C, Neutro N y Tierra PE)"
          />
        </div>

        {/* ========================================================================= */}
        {/* 5. CUADRO DE CONDUCTORES, SALIDA A CARGA Y NEUTRO */}
        {/* ========================================================================= */}
        <div className="p-5 space-y-4 border-b-2 border-slate-800 bg-slate-950">
          <h3 className="text-xs font-black text-slate-200 uppercase tracking-wider flex items-center gap-2 font-mono">
            <Layers className="w-4 h-4 text-amber-400" />
            Líneas de Salida Conmutada hacia la Carga del Proyecto
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
            <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800 space-y-1.5">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">
                CARGA O TABLERO ALIMENTADO:
              </span>
              {isEditing ? (
                <SelectorAlimentadorJerarquico
                  value={salidaCargaNombre}
                  onChange={(val) => handleDtChange('salidaCargaNombre', val)}
                  proyectoId={data.proyectoId}
                  tableroActualId={data.id}
                  elementosList={projectElements}
                  placeholder="Seleccionar Tablero Destino..."
                  className="text-xs"
                  label=""
                />
              ) : (
                <p className="text-slate-100 font-black text-sm truncate" title={salidaCargaNombre}>
                  {salidaCargaNombre || '—'}
                </p>
              )}
              <div className="pt-1">
                <span className="text-[10px] text-slate-500 block">Conductor Salida:</span>
                {isEditing ? (
                  <input
                    type="text"
                    value={salidaCargaConductor}
                    onChange={(e) => handleDtChange('salidaCargaConductor', e.target.value)}
                    placeholder="Ej. 2(3X500 MCM)"
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-0.5 text-slate-100 text-xs mt-0.5"
                  />
                ) : (
                  <span className="text-slate-300 font-bold text-xs">{salidaCargaConductor || '—'}</span>
                )}
              </div>
            </div>

            <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800 space-y-1.5">
              <span className="text-[10px] text-cyan-400 font-bold uppercase block">
                BARRA Y CONDUCTOR DE NEUTRO (N):
              </span>
              {isEditing ? (
                <input
                  type="text"
                  value={neutroConductor}
                  onChange={(e) => handleDtChange('neutroConductor', e.target.value)}
                  placeholder="Ej. 1X500 MCM (Barra directa)"
                  className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-100 text-xs"
                />
              ) : (
                <p className="text-slate-200 font-bold text-xs">{neutroConductor || '—'}</p>
              )}
              <span className="text-[10px] text-slate-500 block">Configuración: Barra sólida pasante</span>
            </div>

            <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800 space-y-1.5">
              <span className="text-[10px] text-emerald-400 font-bold uppercase block">
                TIERRA DE PROTECCIÓN (PE / SPT):
              </span>
              {isEditing ? (
                <input
                  type="text"
                  value={tierraConductor}
                  onChange={(e) => handleDtChange('tierraConductor', e.target.value)}
                  placeholder="Ej. 1X4/0 AWG (SPT)"
                  className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-100 text-xs"
                />
              ) : (
                <p className="text-slate-200 font-bold text-xs">{tierraConductor || '—'}</p>
              )}
              <span className="text-[10px] text-slate-500 block">Conexión directa a barra de equipotencialidad</span>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 6. REGISTRO FOTOGRÁFICO Y OBSERVACIONES TÉCNICAS */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-800 bg-slate-900/30">
          
          {/* Observaciones (7 columnas) */}
          <div className="lg:col-span-7 p-5 space-y-2.5">
            <h3 className="text-xs font-black text-slate-300 uppercase tracking-wider flex items-center gap-2 font-mono">
              <Info className="w-4 h-4 text-amber-400" />
              Observaciones Técnicas y Diagnóstico
            </h3>

            {isEditing ? (
              <textarea
                rows={5}
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                placeholder="Indique notas de conmutación, secuencias de arranque de generadores, hallazgos, etc."
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-slate-100 font-mono focus:outline-none focus:border-amber-500 placeholder-slate-600"
              />
            ) : (
              <div className="p-4 bg-slate-950/70 rounded-xl border border-slate-800 text-xs font-mono text-slate-300 leading-relaxed whitespace-pre-wrap">
                {observaciones || 'Sin observaciones registradas para esta transferencia.'}
              </div>
            )}
          </div>

          {/* Fotografía de la Transferencia con Carga Dual (5 columnas) */}
          <div className="lg:col-span-5 p-5">
            <DualPhotoUploader
              fotoBlob={fotoBlob}
              fotoSrc={fotoSrc}
              previewUrl={previewUrl}
              onImageSelected={(file) => {
                setFotoBlob(file);
                if (previewUrl) URL.revokeObjectURL(previewUrl);
                setPreviewUrl(URL.createObjectURL(file));
              }}
              onRemove={() => {
                setFotoBlob(null);
                setFotoSrc(null);
                if (previewUrl) URL.revokeObjectURL(previewUrl);
                setPreviewUrl(null);
              }}
              readOnly={!isEditing}
              label="Fotografía de la Transferencia"
              sublabel="Cámara en vivo o selección de galería"
            />
          </div>

        </div>

      </div>

    </div>
  );
}
