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
  Info
} from 'lucide-react';
import useStore from '../store/useStore';
import { useConfirm } from '../context/ConfirmContext';
import SelectorAlimentadorJerarquico from './SelectorAlimentadorJerarquico';

// Componente para renderizar Blobs o URLs de imagen de forma segura
const SafeImage = ({ blob, src, alt, className, style }) => {
  const [objectUrl, setObjectUrl] = useState(null);

  useEffect(() => {
    if (blob) {
      const url = URL.createObjectURL(blob);
      setObjectUrl(url);
      return () => {
        URL.revokeObjectURL(url);
      };
    } else {
      setObjectUrl(null);
    }
  }, [blob]);

  const finalSrc = objectUrl || src;
  if (!finalSrc) return null;

  return <img src={finalSrc} alt={alt} className={className} style={style} />;
};

export default function TransferComponent({ 
  transferData, 
  elementoData, 
  onUpdate, 
  readOnly = false 
}) {
  const data = transferData || elementoData;
  const { alert: customAlert } = useConfirm();
  const companies = useStore((state) => state.companies || []);

  const [isEditing, setIsEditing] = useState(false);

  // Fallback si no hay datos
  if (!data) {
    return (
      <div className="text-center p-12 text-slate-400 font-sans">
        <RefreshCw className="w-12 h-12 text-slate-600 mx-auto mb-3 animate-spin" />
        <p className="text-sm">No se han encontrado datos para esta unidad de Transferencia.</p>
      </div>
    );
  }

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

  // Estados locales editables
  const [nombre, setNombre] = useState(data.nombre || 'ATS-1 - Transferencia Principal');
  const [ubicacion, setUbicacion] = useState(data.ubicacion || 'SALA TÉCNICA / SÓTANO');
  const [observaciones, setObservaciones] = useState(
    data.observacionesGenerales || data.datosTecnicos?.observacionTransferencia || 'TRANSFERENCIA AUTOMÁTICA CON ENCLAVAMIENTO MECÁNICO Y ELÉCTRICO.'
  );

  // Datos Técnicos JSON
  const [dt, setDt] = useState(data.datosTecnicos || {});

  // Foto
  const [fotoBlob, setFotoBlob] = useState(data.fotoBlob || null);
  const [fotoSrc, setFotoSrc] = useState(data.foto || null);
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

  const handleImageChange = (e) => {
    if (readOnly) return;
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
      customAlert("La imagen seleccionada supera los 3MB. Por favor elija un archivo más liviano.");
      return;
    }
    setFotoBlob(file);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(file));
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

  // Valores de configuración operativa
  const modoOperativo = dt.modoOperativo || dt.tipoTransferenciaOperativa || (dt.tipoTransferencia?.toUpperCase().includes('MANUAL') || dt.tipoTransferencia?.toUpperCase().includes('MTS') ? 'MTS' : 'ATS');
  const tipoTransicion = dt.tipoTransicion || 'ABIERTA'; // 'ABIERTA' | 'CERRADA' | 'RETARDADA'
  const tipoEnclavamiento = dt.tipoEnclavamiento || 'MECANICO_ELECTRICO';

  // Valores de Fuente Normal (Fuente A)
  const fuenteNormalNombre = dt.fuenteNormalNombre || dt.alimentacionGenerador1 || dt.alimentacionCorpoelec || 'RED COMERCIAL / CORPOELEC (TRAFO 1)';
  const fuenteNormalTension = dt.fuenteNormalTension || '208 / 120 V';
  const fuenteNormalAmperaje = dt.fuenteNormalAmperaje || dt.amperaje || '3200 A';
  const fuenteNormalConductor = dt.fuenteNormalConductor || dt.conductorFuenteNormal || '2(3X500 MCM)';

  // Valores de Fuente Emergencia (Fuente B)
  const fuenteEmergenciaNombre = dt.fuenteEmergenciaNombre || dt.alimentacionGenerador2 || dt.alimentacionTransfDomosa || 'PLANTA ELÉCTRICA DE EMERGENCIA (GEN-1)';
  const fuenteEmergenciaTension = dt.fuenteEmergenciaTension || '208 / 120 V';
  const fuenteEmergenciaAmperaje = dt.fuenteEmergenciaAmperaje || dt.amperaje || '3200 A';
  const fuenteEmergenciaConductor = dt.fuenteEmergenciaConductor || dt.conductorFuenteEmergencia || '2(3X500 MCM)';

  // Salida a Carga
  const salidaCargaNombre = dt.salidaCargaNombre || dt.carga || 'TABLERO PRINCIPAL DE EMERGENCIA (TPE)';
  const salidaCargaConductor = dt.salidaCargaConductor || '2(3X500 MCM)';
  const neutroConductor = dt.neutroConductor || dt.neutro || '1X500 MCM (BARRA DIRECTA)';
  const tierraConductor = dt.tierraConductor || dt.tierra || '1X4/0 AWG (SPT)';

  // Mediciones de voltajes y corrientes
  const v_ab = dt.mediciones?.v_ab || dt.voltaje?.vab || dt.vab || '208';
  const v_bc = dt.mediciones?.v_bc || dt.voltaje?.vbc || dt.vbc || '209';
  const v_ca = dt.mediciones?.v_ca || dt.voltaje?.vac || dt.vac || '208';
  const v_an = dt.mediciones?.v_an || '120';
  const v_bn = dt.mediciones?.v_bn || '120';
  const v_cn = dt.mediciones?.v_cn || '121';

  const i_l1 = dt.mediciones?.i_l1 || '640';
  const i_l2 = dt.mediciones?.i_l2 || '625';
  const i_l3 = dt.mediciones?.i_l3 || '630';
  const i_n = dt.mediciones?.i_n || '45';

  const frecuenciaHz = dt.mediciones?.frecuencia || '60.0';
  const factorPotencia = dt.mediciones?.fp || '0.92';
  const potenciaKw = dt.mediciones?.potenciaKw || '215';

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
              <span className="font-mono text-xs font-bold text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                ID: {data.id}
              </span>
            </div>
            <h1 className="text-lg font-black text-slate-100 mt-0.5">
              {nombre}
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
                    className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 w-full focus:outline-none focus:border-amber-500 text-slate-100 font-bold"
                  />
                ) : (
                  nombre
                )}
              </h2>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-slate-400">Capacidad Nominal:</span>
              <span className="px-3 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-lg font-mono font-black text-sm">
                {dt.amperaje || dt.capacidadAmperios || '3200 A'}
              </span>
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
                    className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-100 text-right text-xs"
                  />
                ) : (
                  <span className="text-slate-200 font-semibold">{ubicacion || 'SALA TÉCNICA SÓTANO'}</span>
                )}
              </div>

              <div className="flex justify-between items-center bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                <span className="text-slate-400 font-bold">MODELO / MARCA:</span>
                {isEditing ? (
                  <input
                    type="text"
                    value={dt.modelo || ''}
                    onChange={(e) => handleDtChange('modelo', e.target.value)}
                    placeholder="Ej. YUYE-YES1 3200/4P / Socomec"
                    className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-100 text-right text-xs"
                  />
                ) : (
                  <span className="text-slate-200 font-semibold">{dt.modelo || dt.tipoTransferencia || 'YUYE-YES1 3200/4P'}</span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-bold">TENSIÓN NOMINAL:</span>
                  {isEditing ? (
                    <input
                      type="text"
                      value={dt.tensionNominal || '208 / 120 V'}
                      onChange={(e) => handleDtChange('tensionNominal', e.target.value)}
                      className="w-full mt-1 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-100 text-xs"
                    />
                  ) : (
                    <span className="text-emerald-400 font-bold text-sm block mt-0.5">{dt.tensionNominal || '208 / 120 V'}</span>
                  )}
                </div>

                <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-bold">POLOS Y FRECUENCIA:</span>
                  {isEditing ? (
                    <input
                      type="text"
                      value={dt.polosFrecuencia || '4P (Neutro) • 60 Hz'}
                      onChange={(e) => handleDtChange('polosFrecuencia', e.target.value)}
                      className="w-full mt-1 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-100 text-xs"
                    />
                  ) : (
                    <span className="text-amber-400 font-bold text-sm block mt-0.5">{dt.polosFrecuencia || '4P (Neutro) • 60 Hz'}</span>
                  )}
                </div>
              </div>

              <div className="flex justify-between items-center bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                <span className="text-slate-400 font-bold">CONTROLADOR ATS:</span>
                {isEditing ? (
                  <input
                    type="text"
                    value={dt.controladorAts || 'Módulo Automático Digital Integrado'}
                    onChange={(e) => handleDtChange('controladorAts', e.target.value)}
                    className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-100 text-right text-xs"
                  />
                ) : (
                  <span className="text-slate-300 font-semibold">{dt.controladorAts || 'Módulo Automático Digital Integrado'}</span>
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
                      {fuenteNormalNombre}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 text-[10px] font-mono pt-1 border-t border-slate-800/80">
                  <div>
                    <span className="text-slate-500 block font-bold">TENSIÓN NOMINAL:</span>
                    {isEditing ? (
                      <input
                        type="text"
                        value={fuenteNormalTension}
                        onChange={(e) => handleDtChange('fuenteNormalTension', e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded px-1.5 py-0.5 text-slate-100 text-[10px]"
                      />
                    ) : (
                      <span className="text-emerald-400 font-bold">{fuenteNormalTension}</span>
                    )}
                  </div>
                  <div>
                    <span className="text-slate-500 block font-bold">CAPACIDAD BREAKER:</span>
                    {isEditing ? (
                      <input
                        type="text"
                        value={fuenteNormalAmperaje}
                        onChange={(e) => handleDtChange('fuenteNormalAmperaje', e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded px-1.5 py-0.5 text-slate-100 text-[10px]"
                      />
                    ) : (
                      <span className="text-slate-200 font-bold">{fuenteNormalAmperaje}</span>
                    )}
                  </div>
                </div>

                <div className="text-[10px] font-mono bg-slate-950/70 p-2 rounded-lg border border-slate-800">
                  <span className="text-slate-400 block font-bold">CONDUCTOR ACOMETIDA NORMAL:</span>
                  {isEditing ? (
                    <input
                      type="text"
                      value={fuenteNormalConductor}
                      onChange={(e) => handleDtChange('fuenteNormalConductor', e.target.value)}
                      className="w-full mt-1 bg-slate-900 border border-slate-700 rounded px-2 py-0.5 text-slate-100 text-xs"
                    />
                  ) : (
                    <span className="text-slate-200 font-bold block mt-0.5">{fuenteNormalConductor}</span>
                  )}
                </div>
              </div>

              {/* Tarjeta 2: FUENTE DE EMERGENCIA / RESPALDO (ÁMBAR/NARANJA) */}
              <div className="bg-gradient-to-b from-amber-950/30 to-slate-900/90 border border-amber-500/30 rounded-xl p-3.5 space-y-2.5 shadow-lg relative overflow-hidden">
                <div className="flex items-center justify-between border-b border-amber-500/20 pb-2">
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-400 border border-amber-500/40">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                    Fuente Emergencia (Respaldo)
                  </span>
                  <span className="text-[10px] font-mono font-bold text-amber-400">GEN</span>
                </div>

                <div>
                  <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Origen / Planta de Respaldo:
                  </label>
                  {isEditing ? (
                    <SelectorAlimentadorJerarquico
                      value={fuenteEmergenciaNombre}
                      onChange={(val) => handleDtChange('fuenteEmergenciaNombre', val)}
                      proyectoId={data.proyectoId}
                      tableroActualId={data.id}
                      elementosList={projectElements}
                      placeholder="Seleccionar Generador, Planta, UPS..."
                      className="text-xs"
                      label=""
                    />
                  ) : (
                    <p className="font-bold text-slate-100 text-xs font-mono truncate" title={fuenteEmergenciaNombre}>
                      {fuenteEmergenciaNombre}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 text-[10px] font-mono pt-1 border-t border-slate-800/80">
                  <div>
                    <span className="text-slate-500 block font-bold">TENSIÓN NOMINAL:</span>
                    {isEditing ? (
                      <input
                        type="text"
                        value={fuenteEmergenciaTension}
                        onChange={(e) => handleDtChange('fuenteEmergenciaTension', e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded px-1.5 py-0.5 text-slate-100 text-[10px]"
                      />
                    ) : (
                      <span className="text-amber-400 font-bold">{fuenteEmergenciaTension}</span>
                    )}
                  </div>
                  <div>
                    <span className="text-slate-500 block font-bold">CAPACIDAD BREAKER:</span>
                    {isEditing ? (
                      <input
                        type="text"
                        value={fuenteEmergenciaAmperaje}
                        onChange={(e) => handleDtChange('fuenteEmergenciaAmperaje', e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded px-1.5 py-0.5 text-slate-100 text-[10px]"
                      />
                    ) : (
                      <span className="text-slate-200 font-bold">{fuenteEmergenciaAmperaje}</span>
                    )}
                  </div>
                </div>

                <div className="text-[10px] font-mono bg-slate-950/70 p-2 rounded-lg border border-slate-800">
                  <span className="text-slate-400 block font-bold">CONDUCTOR ACOMETIDA EMERGENCIA:</span>
                  {isEditing ? (
                    <input
                      type="text"
                      value={fuenteEmergenciaConductor}
                      onChange={(e) => handleDtChange('fuenteEmergenciaConductor', e.target.value)}
                      className="w-full mt-1 bg-slate-900 border border-slate-700 rounded px-2 py-0.5 text-slate-100 text-xs"
                    />
                  ) : (
                    <span className="text-slate-200 font-bold block mt-0.5">{fuenteEmergenciaConductor}</span>
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 3. ENCLAVAMIENTO, MODO OPERATIVO Y TIPO DE TRANSICIÓN */}
        {/* ========================================================================= */}
        <div className="p-4 bg-slate-900/90 border-b-2 border-slate-800">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            
            {/* Selector de Modo Operativo */}
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5 font-mono">
                <Sliders className="w-4 h-4 text-amber-400" />
                Estado Operativo:
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

            {/* Selector de Tipo de Transición */}
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5 font-mono">
                <ArrowRightLeft className="w-4 h-4 text-emerald-400" />
                Tipo de Transición:
              </span>
              {isEditing ? (
                <select
                  value={tipoTransicion}
                  onChange={(e) => handleDtChange('tipoTransicion', e.target.value)}
                  className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 font-bold focus:outline-none focus:border-amber-500 cursor-pointer"
                >
                  <option value="ABIERTA">Transición Abierta (Break-Before-Make / I-0-II)</option>
                  <option value="CERRADA">Transición Cerrada (Make-Before-Break / Sin Corte)</option>
                  <option value="RETARDADA">Transición Retardada (Pausa Programada en Cero)</option>
                </select>
              ) : (
                <span className="px-3 py-1 bg-slate-900 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-bold font-mono">
                  {tipoTransicion === 'CERRADA' ? '⚡ Transición Cerrada (Make-Before-Break)' :
                   tipoTransicion === 'RETARDADA' ? '⏱️ Transición Retardada con Pausa' :
                   '🔌 Transición Abierta (Break-Before-Make)'}
                </span>
              )}
            </div>

            {/* Tipo de Enclavamiento */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono text-slate-400 font-semibold">Enclavamiento:</span>
              {isEditing ? (
                <select
                  value={tipoEnclavamiento}
                  onChange={(e) => handleDtChange('tipoEnclavamiento', e.target.value)}
                  className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-100 font-semibold"
                >
                  <option value="MECANICO_ELECTRICO">Mecánico + Eléctrico (Interlocked)</option>
                  <option value="SOLO_MECANICO">Solo Mecánico</option>
                  <option value="MOTORIZADO_ELECTRONICO">Motorizado con Lógica Electrónica</option>
                </select>
              ) : (
                <span className="text-xs font-bold text-slate-200 font-mono">
                  {tipoEnclavamiento === 'SOLO_MECANICO' ? 'Solo Mecánico' :
                   tipoEnclavamiento === 'MOTORIZADO_ELECTRONICO' ? 'Motorizado Electrónico' :
                   'Mecánico + Eléctrico'}
                </span>
              )}
            </div>

          </div>
        </div>

        {/* ========================================================================= */}
        {/* 4. CUADRO DE MEDICIÓN Y FASES LIMPIAS (ESTANDARIZADAS SIN "(red normal)") */}
        {/* ========================================================================= */}
        <div className="border-b-2 border-slate-800">
          <div className="bg-slate-900 p-3 text-center border-b border-slate-800">
            <h3 className="text-xs md:text-sm font-black text-amber-400 uppercase tracking-wider font-mono">
              ⚡ PARÁMETROS DE MEDICIÓN EN BARRA DE CARGA COMÚN
            </h3>
            <p className="text-[10px] text-slate-400 font-mono mt-0.5">
              Barra de conmutación común para Fuente Normal y Fuente de Emergencia
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse font-mono print:border-black">
              <thead>
                <tr className="bg-slate-900/80 border-b border-slate-800 text-slate-300 font-bold uppercase text-[11px]">
                  <th className="p-3 border-r border-slate-800 w-1/4">FASE / LÍNEA (ESTÁNDAR)</th>
                  <th className="p-3 border-r border-slate-800 text-center w-1/5">VOLTAJE L-L (V)</th>
                  <th className="p-3 border-r border-slate-800 text-center w-1/5">VOLTAJE L-N (V)</th>
                  <th className="p-3 border-r border-slate-800 text-center w-1/5">CORRIENTE EN CARGA (A)</th>
                  <th className="p-3 text-center w-1/5">ESTADO / BALANCE</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-slate-100">
                
                {/* FASE A / L1 */}
                <tr className="hover:bg-slate-900/40 transition-colors">
                  <td className="p-3 font-black text-amber-400 border-r border-slate-800 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                    Fase A / L1
                  </td>
                  <td className="p-3 text-center border-r border-slate-800 font-bold">
                    {isEditing ? (
                      <input
                        type="text"
                        value={v_ab}
                        onChange={(e) => handleNestedDtChange('mediciones', 'v_ab', e.target.value)}
                        className="w-20 bg-slate-950 border border-slate-700 rounded text-center text-xs py-1"
                      />
                    ) : (
                      `V_AB: ${v_ab} V`
                    )}
                  </td>
                  <td className="p-3 text-center border-r border-slate-800 font-bold text-slate-300">
                    {isEditing ? (
                      <input
                        type="text"
                        value={v_an}
                        onChange={(e) => handleNestedDtChange('mediciones', 'v_an', e.target.value)}
                        className="w-20 bg-slate-950 border border-slate-700 rounded text-center text-xs py-1"
                      />
                    ) : (
                      `V_AN: ${v_an} V`
                    )}
                  </td>
                  <td className="p-3 text-center border-r border-slate-800 font-bold text-emerald-400">
                    {isEditing ? (
                      <input
                        type="text"
                        value={i_l1}
                        onChange={(e) => handleNestedDtChange('mediciones', 'i_l1', e.target.value)}
                        className="w-20 bg-slate-950 border border-slate-700 rounded text-center text-xs py-1 text-emerald-400"
                      />
                    ) : (
                      `${i_l1} A`
                    )}
                  </td>
                  <td className="p-3 text-center text-[10px] font-bold text-emerald-400">
                    <span className="inline-flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      <CheckCircle2 className="w-3 h-3" /> Nominal
                    </span>
                  </td>
                </tr>

                {/* FASE B / L2 */}
                <tr className="hover:bg-slate-900/40 transition-colors">
                  <td className="p-3 font-black text-amber-400 border-r border-slate-800 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                    Fase B / L2
                  </td>
                  <td className="p-3 text-center border-r border-slate-800 font-bold">
                    {isEditing ? (
                      <input
                        type="text"
                        value={v_bc}
                        onChange={(e) => handleNestedDtChange('mediciones', 'v_bc', e.target.value)}
                        className="w-20 bg-slate-950 border border-slate-700 rounded text-center text-xs py-1"
                      />
                    ) : (
                      `V_BC: ${v_bc} V`
                    )}
                  </td>
                  <td className="p-3 text-center border-r border-slate-800 font-bold text-slate-300">
                    {isEditing ? (
                      <input
                        type="text"
                        value={v_bn}
                        onChange={(e) => handleNestedDtChange('mediciones', 'v_bn', e.target.value)}
                        className="w-20 bg-slate-950 border border-slate-700 rounded text-center text-xs py-1"
                      />
                    ) : (
                      `V_BN: ${v_bn} V`
                    )}
                  </td>
                  <td className="p-3 text-center border-r border-slate-800 font-bold text-emerald-400">
                    {isEditing ? (
                      <input
                        type="text"
                        value={i_l2}
                        onChange={(e) => handleNestedDtChange('mediciones', 'i_l2', e.target.value)}
                        className="w-20 bg-slate-950 border border-slate-700 rounded text-center text-xs py-1 text-emerald-400"
                      />
                    ) : (
                      `${i_l2} A`
                    )}
                  </td>
                  <td className="p-3 text-center text-[10px] font-bold text-emerald-400">
                    <span className="inline-flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      <CheckCircle2 className="w-3 h-3" /> Nominal
                    </span>
                  </td>
                </tr>

                {/* FASE C / L3 */}
                <tr className="hover:bg-slate-900/40 transition-colors">
                  <td className="p-3 font-black text-amber-400 border-r border-slate-800 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                    Fase C / L3
                  </td>
                  <td className="p-3 text-center border-r border-slate-800 font-bold">
                    {isEditing ? (
                      <input
                        type="text"
                        value={v_ca}
                        onChange={(e) => handleNestedDtChange('mediciones', 'v_ca', e.target.value)}
                        className="w-20 bg-slate-950 border border-slate-700 rounded text-center text-xs py-1"
                      />
                    ) : (
                      `V_CA: ${v_ca} V`
                    )}
                  </td>
                  <td className="p-3 text-center border-r border-slate-800 font-bold text-slate-300">
                    {isEditing ? (
                      <input
                        type="text"
                        value={v_cn}
                        onChange={(e) => handleNestedDtChange('mediciones', 'v_cn', e.target.value)}
                        className="w-20 bg-slate-950 border border-slate-700 rounded text-center text-xs py-1"
                      />
                    ) : (
                      `V_CN: ${v_cn} V`
                    )}
                  </td>
                  <td className="p-3 text-center border-r border-slate-800 font-bold text-emerald-400">
                    {isEditing ? (
                      <input
                        type="text"
                        value={i_l3}
                        onChange={(e) => handleNestedDtChange('mediciones', 'i_l3', e.target.value)}
                        className="w-20 bg-slate-950 border border-slate-700 rounded text-center text-xs py-1 text-emerald-400"
                      />
                    ) : (
                      `${i_l3} A`
                    )}
                  </td>
                  <td className="p-3 text-center text-[10px] font-bold text-emerald-400">
                    <span className="inline-flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      <CheckCircle2 className="w-3 h-3" /> Nominal
                    </span>
                  </td>
                </tr>

                {/* NEUTRO (N) */}
                <tr className="bg-slate-900/20">
                  <td className="p-3 font-bold text-slate-300 border-r border-slate-800 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-cyan-500"></span>
                    Neutro (N)
                  </td>
                  <td className="p-3 text-center border-r border-slate-800 text-slate-500 font-semibold">—</td>
                  <td className="p-3 text-center border-r border-slate-800 text-slate-500 font-semibold">—</td>
                  <td className="p-3 text-center border-r border-slate-800 font-bold text-cyan-400">
                    {isEditing ? (
                      <input
                        type="text"
                        value={i_n}
                        onChange={(e) => handleNestedDtChange('mediciones', 'i_n', e.target.value)}
                        className="w-20 bg-slate-950 border border-slate-700 rounded text-center text-xs py-1 text-cyan-400"
                      />
                    ) : (
                      `${i_n} A`
                    )}
                  </td>
                  <td className="p-3 text-center text-[10px] font-bold text-slate-400 font-mono">
                    Corriente Desbalance
                  </td>
                </tr>

              </tbody>
            </table>
          </div>

          {/* Barra de Totales y Potencias */}
          <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-slate-800 bg-slate-900/60 p-3 text-xs font-mono border-t border-slate-800">
            <div className="p-2 text-center">
              <span className="text-[10px] text-slate-400 block font-bold">FRECUENCIA:</span>
              <span className="text-amber-400 font-extrabold text-sm">{frecuenciaHz} Hz</span>
            </div>
            <div className="p-2 text-center">
              <span className="text-[10px] text-slate-400 block font-bold">FACTOR DE POTENCIA (FP):</span>
              <span className="text-emerald-400 font-extrabold text-sm">{factorPotencia}</span>
            </div>
            <div className="p-2 text-center">
              <span className="text-[10px] text-slate-400 block font-bold">POTENCIA ACTIVA ESTIMADA:</span>
              <span className="text-slate-100 font-extrabold text-sm">{potenciaKw} kW</span>
            </div>
            <div className="p-2 text-center">
              <span className="text-[10px] text-slate-400 block font-bold">ESTADO DE TRANSFERENCIA:</span>
              <span className="text-emerald-400 font-extrabold text-xs inline-flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> Alimentando Carga
              </span>
            </div>
          </div>
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
                  {salidaCargaNombre}
                </p>
              )}
              <span className="text-[10px] text-slate-500 block">Conductor Salida: {salidaCargaConductor}</span>
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
                  className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-100 text-xs"
                />
              ) : (
                <p className="text-slate-200 font-bold text-xs">{neutroConductor}</p>
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
                  className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-100 text-xs"
                />
              ) : (
                <p className="text-slate-200 font-bold text-xs">{tierraConductor}</p>
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
                placeholder="Indique notas de conmutación, secuencias de arranque de generadores, etc."
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-slate-100 font-mono focus:outline-none focus:border-amber-500"
              />
            ) : (
              <div className="p-4 bg-slate-950/70 rounded-xl border border-slate-800 text-xs font-mono text-slate-300 leading-relaxed whitespace-pre-wrap">
                {observaciones || 'Sin observaciones registradas para esta transferencia.'}
              </div>
            )}
          </div>

          {/* Fotografía de la Transferencia (5 columnas) */}
          <div className="lg:col-span-5 p-5 text-center flex flex-col justify-center items-center">
            {fotoBlob || fotoSrc || previewUrl ? (
              <div className="w-full max-w-sm rounded-xl overflow-hidden border border-slate-700 shadow-xl print:border-black">
                <SafeImage 
                  blob={fotoBlob} 
                  src={previewUrl || fotoSrc} 
                  alt="Transferencia Eléctrica" 
                  className="w-full object-cover rounded-xl"
                  style={{ maxHeight: `${dt.fotoScale || 260}px` }}
                />
              </div>
            ) : (
              <div className="p-6 border-2 border-dashed border-slate-800 rounded-xl text-center space-y-2 w-full no-print bg-slate-950/40">
                <Camera className="w-8 h-8 text-slate-600 mx-auto" />
                <span className="text-xs text-slate-500 font-mono block">Sin fotografía de la transferencia</span>
                {!readOnly && (
                  <label className="inline-block px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-400 text-xs font-bold rounded-lg cursor-pointer transition-colors">
                    Adjuntar Foto
                    <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                  </label>
                )}
              </div>
            )}

            {/* Ajuste de escala de foto */}
            {(fotoBlob || fotoSrc || previewUrl) && !readOnly && (
              <div className="no-print mt-3 w-full max-w-xs space-y-1">
                <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 font-mono uppercase">
                  <span>Ajustar altura</span>
                  <span className="text-amber-400">{dt.fotoScale || 260}px</span>
                </div>
                <input
                  type="range"
                  min="140"
                  max="380"
                  value={dt.fotoScale || 260}
                  onChange={(e) => handleDtChange('fotoScale', parseInt(e.target.value, 10))}
                  className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                />
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
}
