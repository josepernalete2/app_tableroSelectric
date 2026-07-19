import React, { useState } from 'react';
import { 
  Zap, 
  Cpu, 
  Activity, 
  RefreshCw, 
  FileText, 
  CheckCircle2, 
  ShieldAlert, 
  Save, 
  Edit3, 
  Plus, 
  Trash2,
  Sliders
} from 'lucide-react';

export default function FichaTecnicaComponent({ elementoData, onUpdate }) {
  if (!elementoData) {
    return <div className="text-center p-8 text-slate-400 font-sans">No hay datos del elemento seleccionados.</div>;
  }

  const [isEditing, setIsEditing] = useState(false);

  // Form states locales
  const [nombre, setNombre] = useState(elementoData.nombre || '');
  const [ubicacion, setUbicacion] = useState(elementoData.ubicacion || '');
  const [alimentadoPor, setAlimentadoPor] = useState(elementoData.alimentadoPor || '');
  const [observacionesGenerales, setObservacionesGenerales] = useState(elementoData.observacionesGenerales || '');

  // datosTecnicos JSON
  const [dt, setDt] = useState(elementoData.datosTecnicos || {});

  const tipoElemento = elementoData.tipoElemento || 'TABLERO';

  const handleDtChange = (key, value) => {
    setDt((prev) => ({ ...prev, [key]: value }));
  };

  const handleNestedDtChange = (parentKey, key, value) => {
    setDt((prev) => ({
      ...prev,
      [parentKey]: {
        ...(prev[parentKey] || {}),
        [key]: value
      }
    }));
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (onUpdate) {
      onUpdate({
        ...elementoData,
        nombre,
        ubicacion,
        alimentadoPor,
        observacionesGenerales,
        datosTecnicos: dt
      });
    }
    setIsEditing(false);
  };

  const renderBadge = () => {
    switch (tipoElemento) {
      case 'GENERADOR':
        return <span className="px-3 py-1 bg-amber-950/90 text-amber-400 border border-amber-800/40 rounded-full text-xs font-bold font-mono">⚡ GENERADOR</span>;
      case 'TRANSFER':
        return <span className="px-3 py-1 bg-emerald-950/90 text-emerald-400 border border-emerald-800/40 rounded-full text-xs font-bold font-mono">🔄 TRANSFERENCIA (ATS/MTS)</span>;
      case 'TABLERO':
        return <span className="px-3 py-1 bg-sky-950/90 text-sky-400 border border-sky-800/40 rounded-full text-xs font-bold font-mono">⚡ TABLERO ELÉCTRICO</span>;
      case 'TRANSFORMADOR':
        return <span className="px-3 py-1 bg-purple-950/90 text-purple-400 border border-purple-800/40 rounded-full text-xs font-bold font-mono">⚡ TRANSFORMADOR</span>;
      case 'PUESTA_TIERRA':
        return <span className="px-3 py-1 bg-teal-950/90 text-teal-400 border border-teal-800/40 rounded-full text-xs font-bold font-mono">🛡️ PUESTA A TIERRA</span>;
      default:
        return <span className="px-3 py-1 bg-slate-800 text-slate-300 border border-slate-700 rounded-full text-xs font-bold font-mono">⚙️ EQUIPO TÉCNICO</span>;
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in font-sans pb-12">
      
      {/* Header Card */}
      <div className="bg-slate-955 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800/80 pb-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              {renderBadge()}
              <span className="text-xs text-slate-500 font-mono">ID: {elementoData.id}</span>
            </div>
            {isEditing ? (
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="text-2xl font-black text-slate-100 bg-slate-900 border border-slate-700 rounded-xl px-3 py-1 w-full focus:outline-none focus:border-amber-500"
              />
            ) : (
              <h2 className="text-2xl font-black text-slate-100 tracking-tight">{nombre}</h2>
            )}
          </div>

          <div className="flex items-center gap-3">
            {isEditing ? (
              <button
                onClick={handleSave}
                className="bg-amber-500 text-slate-950 font-semibold hover:bg-amber-400 active:scale-98 transition-all px-4 py-2.5 rounded-lg flex flex-row items-center justify-center gap-2 h-10 whitespace-nowrap cursor-pointer shadow-md"
              >
                <Save className="w-4 h-4" /> Guardar Cambios
              </button>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="bg-slate-900 border border-slate-700 hover:bg-slate-800 text-slate-200 font-semibold active:scale-98 transition-all px-4 py-2.5 rounded-lg flex flex-row items-center justify-center gap-2 h-10 whitespace-nowrap cursor-pointer"
              >
                <Edit3 className="w-4 h-4 text-amber-500" /> Editar Ficha Técnica
              </button>
            )}
          </div>
        </div>

        {/* General Data Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 text-xs">
          <div className="bg-slate-900/60 p-3.5 rounded-xl border border-slate-800">
            <span className="text-slate-500 font-bold block mb-1 uppercase tracking-wider text-[10px]">Ubicación Física</span>
            {isEditing ? (
              <input
                type="text"
                value={ubicacion}
                onChange={(e) => setUbicacion(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-slate-100"
              />
            ) : (
              <span className="text-slate-200 font-semibold">{ubicacion || 'Sin especificación'}</span>
            )}
          </div>

          <div className="bg-slate-900/60 p-3.5 rounded-xl border border-slate-800">
            <span className="text-slate-500 font-bold block mb-1 uppercase tracking-wider text-[10px]">Procedencia / Alimentación</span>
            {isEditing ? (
              <input
                type="text"
                value={alimentadoPor}
                onChange={(e) => setAlimentadoPor(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-slate-100"
              />
            ) : (
              <span className="text-slate-200 font-semibold">{alimentadoPor || 'No definido'}</span>
            )}
          </div>

          <div className="bg-slate-900/60 p-3.5 rounded-xl border border-slate-800">
            <span className="text-slate-500 font-bold block mb-1 uppercase tracking-wider text-[10px]">Estado de Registro</span>
            <span className="text-emerald-400 font-bold flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" /> Registrado en Diagrama
            </span>
          </div>
        </div>
      </div>

      {/* FORMULARIO DINÁMICO ADAPTATIVO SEGÚN EL TIPO DE EQUIPO */}

      {/* A) GENERADOR DE EMERGENCIA */}
      {tipoElemento === 'GENERADOR' && (
        <div className="space-y-6">
          {/* Card 1: Datos de Placa */}
          <div className="bg-slate-955 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-amber-500 uppercase tracking-wider flex items-center gap-2">
              <Zap className="w-4 h-4" /> Datos de Placa (Características Principales)
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                <span className="text-slate-500 font-bold block mb-1">MARCA</span>
                {isEditing ? (
                  <input type="text" value={dt.marca || ''} onChange={(e) => handleDtChange('marca', e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-100 font-mono" />
                ) : (
                  <span className="text-sm font-bold text-slate-100 font-mono">{dt.marca || 'DOMOSA'}</span>
                )}
              </div>

              <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                <span className="text-slate-500 font-bold block mb-1">FASES</span>
                {isEditing ? (
                  <input type="text" value={dt.fases || '3'} onChange={(e) => handleDtChange('fases', e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-100 font-mono" />
                ) : (
                  <span className="text-sm font-bold text-slate-100 font-mono">{dt.fases || '3'}</span>
                )}
              </div>

              <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                <span className="text-slate-500 font-bold block mb-1">POTENCIA (kVA)</span>
                {isEditing ? (
                  <input type="text" value={dt.kva || ''} onChange={(e) => handleDtChange('kva', e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-amber-400 font-mono font-bold" />
                ) : (
                  <span className="text-sm font-extrabold text-amber-400 font-mono">{dt.kva || '580 kVA'}</span>
                )}
              </div>

              <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                <span className="text-slate-500 font-bold block mb-1">VOLTAJE (V)</span>
                {isEditing ? (
                  <input type="text" value={dt.voltajeGeneracion || dt.voltaje || ''} onChange={(e) => handleDtChange('voltajeGeneracion', e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-100 font-mono" />
                ) : (
                  <span className="text-sm font-bold text-slate-100 font-mono">{dt.voltajeGeneracion || dt.voltaje || '208 V'}</span>
                )}
              </div>

              <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                <span className="text-slate-500 font-bold block mb-1">AMPERAJE (A)</span>
                {isEditing ? (
                  <input type="text" value={dt.amperaje || ''} onChange={(e) => handleDtChange('amperaje', e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-100 font-mono" />
                ) : (
                  <span className="text-sm font-bold text-slate-100 font-mono">{dt.amperaje || '1600 A'}</span>
                )}
              </div>

              <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                <span className="text-slate-500 font-bold block mb-1">FACTOR POTENCIA (FP)</span>
                {isEditing ? (
                  <input type="text" value={dt.fp || ''} onChange={(e) => handleDtChange('fp', e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-100 font-mono" />
                ) : (
                  <span className="text-sm font-bold text-slate-100 font-mono">{dt.fp || '0.8 (80%)'}</span>
                )}
              </div>

              <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 col-span-2">
                <span className="text-slate-500 font-bold block mb-1">COMBUSTIBLE</span>
                {isEditing ? (
                  <input type="text" value={dt.combustible || ''} onChange={(e) => handleDtChange('combustible', e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-100 font-mono" />
                ) : (
                  <span className="text-sm font-bold text-slate-100 font-mono">{dt.combustible || 'Diésel / Gasoil (Tanque Principal)'}</span>
                )}
              </div>
            </div>
          </div>

          {/* Card 2: Interruptor del Generador */}
          <div className="bg-slate-955 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-amber-500 uppercase tracking-wider flex items-center gap-2">
              <Sliders className="w-4 h-4" /> Interruptor del Generador
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
              <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                <span className="text-slate-500 font-bold block mb-1">MARCA</span>
                {isEditing ? (
                  <input type="text" value={dt.interruptorMarca || ''} onChange={(e) => handleDtChange('interruptorMarca', e.target.value)} className="w-full bg-slate-955 border border-slate-700 rounded px-2 py-1 text-slate-100 font-mono" />
                ) : (
                  <span className="text-sm font-bold text-slate-100 font-mono">{dt.interruptorMarca || 'CHINT'}</span>
                )}
              </div>

              <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                <span className="text-slate-500 font-bold block mb-1">TIPO</span>
                {isEditing ? (
                  <input type="text" value={dt.interruptorTipo || ''} onChange={(e) => handleDtChange('interruptorTipo', e.target.value)} className="w-full bg-slate-955 border border-slate-700 rounded px-2 py-1 text-slate-100 font-mono" />
                ) : (
                  <span className="text-sm font-bold text-slate-100 font-mono">{dt.interruptorTipo || 'Caja Moldeada'}</span>
                )}
              </div>

              <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                <span className="text-slate-500 font-bold block mb-1">AMP (A)</span>
                {isEditing ? (
                  <input type="text" value={dt.interruptorAmp || ''} onChange={(e) => handleDtChange('interruptorAmp', e.target.value)} className="w-full bg-slate-955 border border-slate-700 rounded px-2 py-1 text-amber-400 font-mono font-bold" />
                ) : (
                  <span className="text-sm font-extrabold text-amber-400 font-mono">{dt.interruptorAmp || '1600 A'}</span>
                )}
              </div>

              <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                <span className="text-slate-500 font-bold block mb-1">COND. FASE</span>
                {isEditing ? (
                  <input type="text" value={dt.condFase || ''} onChange={(e) => handleDtChange('condFase', e.target.value)} className="w-full bg-slate-955 border border-slate-700 rounded px-2 py-1 text-slate-100 font-mono" />
                ) : (
                  <span className="text-sm font-bold text-slate-100 font-mono">{dt.condFase || '2(3X500 MCM)'}</span>
                )}
              </div>

              <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                <span className="text-slate-500 font-bold block mb-1">COND. NEUTRO</span>
                {isEditing ? (
                  <input type="text" value={dt.condNeutro || ''} onChange={(e) => handleDtChange('condNeutro', e.target.value)} className="w-full bg-slate-955 border border-slate-700 rounded px-2 py-1 text-slate-100 font-mono" />
                ) : (
                  <span className="text-sm font-bold text-slate-100 font-mono">{dt.condNeutro || '500 MCM'}</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* B) TRANSFERENCIA (ATS / MTS) */}
      {tipoElemento === 'TRANSFER' && (
        <div className="space-y-6">
          {/* Card 1: Tabla de Medición de Transferencia */}
          <div className="bg-slate-955 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-2">
              <RefreshCw className="w-4 h-4" /> Datos de Conmutación y Voltajes de Transferencia
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
              <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800">
                <span className="text-slate-500 font-bold block mb-1">TIPO</span>
                {isEditing ? (
                  <input type="text" value={dt.tipoTransferencia || ''} onChange={(e) => handleDtChange('tipoTransferencia', e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-100 font-mono" />
                ) : (
                  <span className="text-sm font-bold text-slate-100 font-mono">{dt.tipoTransferencia || 'YUYE-YES1 3200/4P'}</span>
                )}
              </div>

              <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800">
                <span className="text-slate-500 font-bold block mb-1">CAPACIDAD (AMP)</span>
                {isEditing ? (
                  <input type="text" value={dt.capacidadAmperios || ''} onChange={(e) => handleDtChange('capacidadAmperios', e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-emerald-400 font-mono font-bold" />
                ) : (
                  <span className="text-sm font-extrabold text-emerald-400 font-mono">{dt.capacidadAmperios || '3200 A'}</span>
                )}
              </div>

              <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800 md:col-span-2">
                <span className="text-slate-500 font-bold block mb-1">MEDICIÓN VOLTAJES FASE-FASE</span>
                <div className="grid grid-cols-3 gap-2 mt-1 font-mono text-slate-200">
                  <div className="bg-slate-950 p-1.5 rounded text-center border border-slate-800">
                    <span className="text-[9px] text-slate-500 block">VAB</span>
                    <span className="font-bold">{dt.vab || '211 V'}</span>
                  </div>
                  <div className="bg-slate-950 p-1.5 rounded text-center border border-slate-800">
                    <span className="text-[9px] text-slate-500 block">VAC</span>
                    <span className="font-bold">{dt.vac || '208 V'}</span>
                  </div>
                  <div className="bg-slate-950 p-1.5 rounded text-center border border-slate-800">
                    <span className="text-[9px] text-slate-500 block">VBC</span>
                    <span className="font-bold">{dt.vbc || '209 V'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Acometidas de Cables */}
          <div className="bg-slate-955 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-2">
              <Activity className="w-4 h-4" /> Acometidas de Entrada y Salida
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
              <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                <span className="text-slate-500 font-bold block mb-1">ALIMENTACIÓN CORPOELEC / GEN 1</span>
                <span className="text-sm font-bold text-slate-100 font-mono">{dt.alimGen1 || '2(3X500 MCM)'}</span>
              </div>
              <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                <span className="text-slate-500 font-bold block mb-1">ALIMENTACIÓN TRANSF / GEN 2</span>
                <span className="text-sm font-bold text-slate-100 font-mono">{dt.alimGen2 || '2(3X500 MCM)'}</span>
              </div>
              <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                <span className="text-slate-500 font-bold block mb-1">ACOMETIDA CARGA SALIDA</span>
                <span className="text-sm font-bold text-slate-100 font-mono">{dt.acometidaCarga || '2(3X500 MCM)'}</span>
              </div>
              <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                <span className="text-slate-500 font-bold block mb-1">CONDUCTOR NEUTRO</span>
                <span className="text-sm font-bold text-slate-100 font-mono">{dt.neutro || '500 MCM'}</span>
              </div>
              <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                <span className="text-slate-500 font-bold block mb-1">PUESTA A TIERRA</span>
                <span className="text-sm font-bold text-slate-100 font-mono">{dt.tierra || 'NO TIENE'}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* C) TABLERO ELÉCTRICO CON GRILLA DE CIRCUITOS */}
      {tipoElemento === 'TABLERO' && (
        <div className="space-y-6">
          {/* Card 1: Datos Generales & Barras */}
          <div className="bg-slate-955 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-sky-400 uppercase tracking-wider flex items-center gap-2">
              <Zap className="w-4 h-4" /> Barras Principales y Breaker Principal
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
              <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800">
                <span className="text-slate-500 font-bold block mb-1">TIPO DE TABLERO</span>
                <span className="text-sm font-bold text-slate-100 font-mono">{dt.tipoTablero || 'SUPERFICIAL'}</span>
              </div>

              <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800">
                <span className="text-slate-500 font-bold block mb-1">ACOMETIDA ENTRADA</span>
                <span className="text-sm font-bold text-slate-100 font-mono">{dt.acometida || '3X500 MCM'}</span>
              </div>

              <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800 md:col-span-2">
                <span className="text-slate-500 font-bold block mb-1">BARRAS PRINCIPALES (VOLTAJES)</span>
                <div className="grid grid-cols-3 gap-2 mt-1 font-mono text-slate-200">
                  <div className="bg-slate-950 p-1.5 rounded text-center border border-slate-800">
                    <span className="text-[9px] text-slate-500 block">IA</span>
                    <span className="font-bold">{dt.barrasPrincipales?.ia || '211.5 V'}</span>
                  </div>
                  <div className="bg-slate-950 p-1.5 rounded text-center border border-slate-800">
                    <span className="text-[9px] text-slate-500 block">IB</span>
                    <span className="font-bold">{dt.barrasPrincipales?.ib || '207.4 V'}</span>
                  </div>
                  <div className="bg-slate-950 p-1.5 rounded text-center border border-slate-800">
                    <span className="text-[9px] text-slate-500 block">IC</span>
                    <span className="font-bold">{dt.barrasPrincipales?.ic || '208.6 V'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* D) TRANSFORMADOR */}
      {tipoElemento === 'TRANSFORMADOR' && (
        <div className="bg-slate-955 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <h3 className="text-sm font-bold text-purple-400 uppercase tracking-wider flex items-center gap-2">
            <Cpu className="w-4 h-4" /> Parámetros del Transformador de Potencia
          </h3>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs">
            <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800">
              <span className="text-slate-500 font-bold block mb-1">CAPACIDAD (KVA)</span>
              <span className="text-sm font-extrabold text-purple-400 font-mono">{dt.kva || '500 KVA'}</span>
            </div>
            <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800">
              <span className="text-slate-500 font-bold block mb-1">MARCA</span>
              <span className="text-sm font-bold text-slate-100 font-mono">{dt.marca || 'General Electric'}</span>
            </div>
            <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800">
              <span className="text-slate-500 font-bold block mb-1">TIPO</span>
              <span className="text-sm font-bold text-slate-100 font-mono">{dt.tipoTransformador || 'Pedestal'}</span>
            </div>
            <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800">
              <span className="text-slate-500 font-bold block mb-1">CONEXIÓN</span>
              <span className="text-sm font-bold text-slate-100 font-mono">{dt.conexion || 'Estrella - Estrella'}</span>
            </div>
            <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800">
              <span className="text-slate-500 font-bold block mb-1">VOLTAJE PRIMARIO</span>
              <span className="text-sm font-bold text-slate-100 font-mono">{dt.voltajePrimario || '13.8 kV'}</span>
            </div>
            <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800">
              <span className="text-slate-500 font-bold block mb-1">VOLTAJE SECUNDARIO</span>
              <span className="text-sm font-bold text-slate-100 font-mono">{dt.voltajeSecundario || '208 / 120 V'}</span>
            </div>
          </div>
        </div>
      )}

      {/* E) PUESTA A TIERRA */}
      {tipoElemento === 'PUESTA_TIERRA' && (
        <div className="bg-slate-955 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <h3 className="text-sm font-bold text-teal-400 uppercase tracking-wider flex items-center gap-2">
            <ShieldAlert className="w-4 h-4" /> Sistema de Puesta a Tierra y Medición de Fuga
          </h3>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800">
              <span className="text-slate-500 font-bold block mb-1">RESISTENCIA (Ω)</span>
              <span className="text-sm font-bold text-slate-100 font-mono">{dt.resistenciaOhmios || '0.5 Ω'}</span>
            </div>
            <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800">
              <span className="text-slate-500 font-bold block mb-1">CORRIENTE FUGA (A)</span>
              <span className="text-sm font-extrabold text-amber-400 font-mono">{dt.corrienteFugaAmperios || '6.4 A'}</span>
            </div>
            <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800">
              <span className="text-slate-500 font-bold block mb-1">TIPO DE MALLA</span>
              <span className="text-sm font-bold text-slate-100 font-mono">{dt.tipoMalla || 'Malla Concreto'}</span>
            </div>
            <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800">
              <span className="text-slate-500 font-bold block mb-1">CABLE ACOMETIDA</span>
              <span className="text-sm font-bold text-slate-100 font-mono">{dt.cableAcometida || 'Sólido #4'}</span>
            </div>
          </div>
        </div>
      )}

      {/* Observaciones Generales */}
      {observacionesGenerales && (
        <div className="bg-slate-955 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-2">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Observaciones Generales e Informe de Inspección</h3>
          {isEditing ? (
            <textarea
              value={observacionesGenerales}
              onChange={(e) => setObservacionesGenerales(e.target.value)}
              rows={3}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-slate-100 text-xs focus:outline-none focus:border-amber-500 resize-none"
            />
          ) : (
            <p className="text-xs text-slate-300 bg-slate-900/50 p-4 rounded-xl border border-slate-850 leading-relaxed font-sans">
              {observacionesGenerales}
            </p>
          )}
        </div>
      )}

    </div>
  );
}
