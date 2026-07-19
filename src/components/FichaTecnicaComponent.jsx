import React from 'react';
import { Zap, Cpu, Activity, RefreshCw, FileText, CheckCircle2, ShieldAlert, ArrowLeft } from 'lucide-react';

export default function FichaTecnicaComponent({ elementoData, onUpdate }) {
  if (!elementoData) {
    return <div className="text-center p-8 text-slate-400">No hay datos del elemento seleccionados.</div>;
  }

  const {
    id,
    nombre,
    tipoElemento,
    ubicacion,
    alimentadoPor,
    foto,
    fotoBlob,
    observacionesGenerales,
    datosTecnicos = {}
  } = elementoData;

  const renderBadge = () => {
    switch (tipoElemento) {
      case 'GENERADOR':
        return <span className="px-3 py-1 bg-amber-950/80 text-amber-400 border border-amber-800/40 rounded-full text-xs font-bold font-mono">⚡ GENERADOR</span>;
      case 'TRANSFER':
        return <span className="px-3 py-1 bg-emerald-950/80 text-emerald-400 border border-emerald-800/40 rounded-full text-xs font-bold font-mono">🔄 TRANSFER (ATS/MTS)</span>;
      case 'TABLERO':
        return <span className="px-3 py-1 bg-sky-950/80 text-sky-400 border border-sky-800/40 rounded-full text-xs font-bold font-mono">⚡ TABLERO ELÉCTRICO</span>;
      default:
        return <span className="px-3 py-1 bg-purple-950/80 text-purple-400 border border-purple-800/40 rounded-full text-xs font-bold font-mono">⚙️ EQUIPO ESPECIAL</span>;
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in font-sans">
      {/* Header Card */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800/80 pb-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              {renderBadge()}
              <span className="text-xs text-slate-500 font-mono">ID: {id}</span>
            </div>
            <h2 className="text-2xl font-black text-slate-100 tracking-tight">{nombre}</h2>
          </div>
        </div>

        {/* General Data Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 text-xs">
          <div className="bg-slate-900/60 p-3.5 rounded-xl border border-slate-800">
            <span className="text-slate-500 font-bold block mb-1 uppercase tracking-wider text-[10px]">Ubicación Física</span>
            <span className="text-slate-200 font-semibold">{ubicacion || 'Sin especificación'}</span>
          </div>

          <div className="bg-slate-900/60 p-3.5 rounded-xl border border-slate-800">
            <span className="text-slate-500 font-bold block mb-1 uppercase tracking-wider text-[10px]">Procedencia / Alimentación</span>
            <span className="text-slate-200 font-semibold">{alimentadoPor || 'No definido'}</span>
          </div>

          <div className="bg-slate-900/60 p-3.5 rounded-xl border border-slate-800">
            <span className="text-slate-500 font-bold block mb-1 uppercase tracking-wider text-[10px]">Estado de Registro</span>
            <span className="text-emerald-400 font-bold flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" /> Registrado en Diagrama
            </span>
          </div>
        </div>
      </div>

      {/* Technical Specifications Sheet (Datos Técnicos Adaptativos) */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <h3 className="text-sm font-bold text-amber-500 uppercase tracking-wider flex items-center gap-2">
          <Cpu className="w-4 h-4 text-amber-500" /> Ficha Técnica de Parámetros Específicos
        </h3>

        {Object.keys(datosTecnicos).length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {Object.entries(datosTecnicos).map(([key, val]) => {
              // Convert camelCase or raw keys into nicely formatted titles
              const formattedKey = key
                .replace(/([A-Z])/g, ' $1')
                .replace(/^./, (str) => str.toUpperCase());

              const stringVal = typeof val === 'object' ? JSON.stringify(val) : String(val);

              return (
                <div key={key} className="bg-slate-900/90 p-4 rounded-xl border border-slate-800 hover:border-slate-700/80 transition-colors">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block mb-1">
                    {formattedKey}
                  </span>
                  <span className="text-sm font-bold text-slate-100 font-mono">
                    {stringVal || 'N/A'}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-8 text-center border-2 border-dashed border-slate-800 rounded-xl">
            <FileText className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="text-xs text-slate-400">No hay parámetros adicionales registrados en datos técnicos.</p>
          </div>
        )}
      </div>

      {/* Observaciones Generales */}
      {observacionesGenerales && (
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-2">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Observaciones Generales</h3>
          <p className="text-sm text-slate-300 bg-slate-900/50 p-4 rounded-xl border border-slate-850 leading-relaxed">
            {observacionesGenerales}
          </p>
        </div>
      )}
    </div>
  );
}
