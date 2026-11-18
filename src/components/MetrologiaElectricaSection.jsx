import React from 'react';
import { Activity, Zap, Shield, Gauge } from 'lucide-react';

export default function MetrologiaElectricaSection({
  mediciones = {},
  datosTecnicos,
  onChange,
  onNestedChange,
  readOnly = false,
  isEditing,
  titulo = "MEDICIONES",
  subtitulo = "Lectura de tensiones desglosadas L-L, L-N y canales de corriente"
}) {
  const isReadOnly = isEditing !== undefined ? !isEditing : Boolean(readOnly);

  // Extraer mediciones desde prop directa o desde datosTecnicos
  const currentMediciones = (mediciones && typeof mediciones === 'object')
    ? mediciones
    : (datosTecnicos?.mediciones && typeof datosTecnicos.mediciones === 'object')
      ? datosTecnicos.mediciones
      : (datosTecnicos || {});

  const handleChange = (field, val) => {
    if (isReadOnly) return;
    const updated = {
      ...currentMediciones,
      [field]: val
    };

    if (typeof onNestedChange === 'function') {
      onNestedChange('mediciones', field, val);
    }

    if (typeof onChange === 'function') {
      onChange(updated, field, val);
    }
  };

  // Voltajes Línea-Línea (L-L)
  const v_l1_l2 = currentMediciones.v_l1_l2 ?? currentMediciones.v_ab ?? currentMediciones.vab ?? '';
  const v_l1_l3 = currentMediciones.v_l1_l3 ?? currentMediciones.v_ca ?? currentMediciones.vac ?? currentMediciones.v_l3_l1 ?? '';
  const v_l2_l3 = currentMediciones.v_l2_l3 ?? currentMediciones.v_bc ?? currentMediciones.vbc ?? '';

  // Voltajes Línea-Neutro (L-N)
  const v_l1_n = currentMediciones.v_l1_n ?? currentMediciones.v_an ?? currentMediciones.van ?? '';
  const v_l2_n = currentMediciones.v_l2_n ?? currentMediciones.v_bn ?? currentMediciones.vbn ?? '';
  const v_l3_n = currentMediciones.v_l3_n ?? currentMediciones.v_cn ?? currentMediciones.vcn ?? '';

  // 5 Canales de Corriente (A)
  const i_l1 = currentMediciones.i_l1 ?? currentMediciones.ia ?? currentMediciones.il1 ?? '';
  const i_l2 = currentMediciones.i_l2 ?? currentMediciones.ib ?? currentMediciones.il2 ?? '';
  const i_l3 = currentMediciones.i_l3 ?? currentMediciones.ic ?? currentMediciones.il3 ?? '';
  const i_n = currentMediciones.i_n ?? currentMediciones.in ?? currentMediciones.ineutro ?? '';
  const i_pe = currentMediciones.i_pe ?? currentMediciones.ipe ?? currentMediciones.itierra ?? '';

  return (
    <div className="tablero-ficha-card bg-slate-950/60 border border-slate-800 rounded-2xl print:rounded p-4 md:p-5 print:p-2 space-y-4 print:space-y-1.5 font-sans">
      <div className="tablero-amber-header flex flex-col sm:flex-row sm:items-center justify-between gap-2 print:gap-1 border-b border-slate-850 print:border-slate-700 pb-3 print:pb-1 print:px-2 print:py-1 print:rounded-xs">
        <div>
          <h3 className="text-xs md:text-sm print:text-[10px] font-extrabold uppercase tracking-wider text-amber-400 print:text-amber-950 flex items-center gap-2 print:gap-1">
            <Zap className="w-4 h-4 print:w-3 print:h-3 text-amber-500 no-print" />
            {titulo}
          </h3>
          {subtitulo && (
            <p className="text-[10px] print:text-[8px] text-slate-400 print:text-slate-800 font-mono mt-0.5 print:mt-0">
              {subtitulo}
            </p>
          )}
        </div>
        <span className="tablero-badge-amber text-[10px] print:text-[8px] font-mono font-bold px-2 py-0.5 print:px-1.5 print:py-0 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded self-start sm:self-auto">
          Norma COVENIN 159:1997
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 print:grid-cols-2 gap-4 print:gap-2">
        {/* BLOQUE 1: TENSIONES DE LÍNEA (L-L) */}
        <div className="tablero-amber-cell bg-slate-900/50 border border-slate-800/80 print:border-slate-400 rounded-xl print:rounded p-3.5 print:p-1.5 space-y-2.5 print:space-y-1">
          <div className="tablero-subheader-row flex items-center justify-between border-b border-slate-800 print:border-slate-400 pb-1.5 print:pb-0.5 print:px-1.5 print:py-0.5 print:rounded-xs">
            <span className="text-[11px] print:text-[9px] font-bold text-slate-300 print:text-slate-950 uppercase tracking-wide flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-amber-400 no-print" /> Voltajes de Línea (L-L)
            </span>
            <span className="text-[9px] print:text-[8px] font-mono text-slate-500 print:text-slate-800 font-bold">Unidad: Voltios (V)</span>
          </div>
          <div className="grid grid-cols-3 gap-2 print:gap-1.5 text-xs font-mono">
            <div>
              <label className="block text-[10px] print:text-[8px] font-bold text-slate-400 print:text-slate-900 mb-1 print:mb-0.5 text-center">V L1-L2</label>
              <input
                type="text"
                disabled={isReadOnly}
                value={v_l1_l2}
                onChange={(e) => handleChange('v_l1_l2', e.target.value)}
                placeholder="Ej. 208"
                className="no-print w-full bg-slate-950 border border-slate-700 focus:border-amber-500 rounded-lg px-2.5 py-1.5 text-slate-100 text-center text-xs outline-none transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              />
              <div className="hidden print:block text-center text-[10px] font-black text-slate-950 py-0.5 border-b border-slate-400">
                {v_l1_l2 || '—'}
              </div>
            </div>
            <div>
              <label className="block text-[10px] print:text-[8px] font-bold text-slate-400 print:text-slate-900 mb-1 print:mb-0.5 text-center">V L1-L3</label>
              <input
                type="text"
                disabled={isReadOnly}
                value={v_l1_l3}
                onChange={(e) => handleChange('v_l1_l3', e.target.value)}
                placeholder="Ej. 208"
                className="no-print w-full bg-slate-950 border border-slate-700 focus:border-amber-500 rounded-lg px-2.5 py-1.5 text-slate-100 text-center text-xs outline-none transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              />
              <div className="hidden print:block text-center text-[10px] font-black text-slate-950 py-0.5 border-b border-slate-400">
                {v_l1_l3 || '—'}
              </div>
            </div>
            <div>
              <label className="block text-[10px] print:text-[8px] font-bold text-slate-400 print:text-slate-900 mb-1 print:mb-0.5 text-center">V L2-L3</label>
              <input
                type="text"
                disabled={isReadOnly}
                value={v_l2_l3}
                onChange={(e) => handleChange('v_l2_l3', e.target.value)}
                placeholder="Ej. 208"
                className="no-print w-full bg-slate-950 border border-slate-700 focus:border-amber-500 rounded-lg px-2.5 py-1.5 text-slate-100 text-center text-xs outline-none transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              />
              <div className="hidden print:block text-center text-[10px] font-black text-slate-950 py-0.5 border-b border-slate-400">
                {v_l2_l3 || '—'}
              </div>
            </div>
          </div>
        </div>

        {/* BLOQUE 2: TENSIONES DE FASE (L-N) */}
        <div className="tablero-sky-cell bg-slate-900/50 border border-slate-800/80 print:border-slate-400 rounded-xl print:rounded p-3.5 print:p-1.5 space-y-2.5 print:space-y-1">
          <div className="tablero-sky-header flex items-center justify-between border-b border-slate-800 print:border-slate-400 pb-1.5 print:pb-0.5 print:px-1.5 print:py-0.5 print:rounded-xs">
            <span className="text-[11px] print:text-[9px] font-bold text-slate-300 print:text-sky-950 uppercase tracking-wide flex items-center gap-1.5">
              <Gauge className="w-3.5 h-3.5 text-cyan-400 no-print" /> Voltajes de Fase (L-N)
            </span>
            <span className="text-[9px] print:text-[8px] font-mono text-slate-500 print:text-sky-950 font-bold">Unidad: Voltios (V)</span>
          </div>
          <div className="grid grid-cols-3 gap-2 print:gap-1.5 text-xs font-mono">
            <div>
              <label className="block text-[10px] print:text-[8px] font-bold text-slate-400 print:text-slate-900 mb-1 print:mb-0.5 text-center">V L1-N</label>
              <input
                type="text"
                disabled={isReadOnly}
                value={v_l1_n}
                onChange={(e) => handleChange('v_l1_n', e.target.value)}
                placeholder="Ej. 120"
                className="no-print w-full bg-slate-950 border border-slate-700 focus:border-cyan-500 rounded-lg px-2.5 py-1.5 text-slate-100 text-center text-xs outline-none transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              />
              <div className="hidden print:block text-center text-[10px] font-black text-slate-950 py-0.5 border-b border-slate-400">
                {v_l1_n || '—'}
              </div>
            </div>
            <div>
              <label className="block text-[10px] print:text-[8px] font-bold text-slate-400 print:text-slate-900 mb-1 print:mb-0.5 text-center">V L2-N</label>
              <input
                type="text"
                disabled={isReadOnly}
                value={v_l2_n}
                onChange={(e) => handleChange('v_l2_n', e.target.value)}
                placeholder="Ej. 120"
                className="no-print w-full bg-slate-950 border border-slate-700 focus:border-cyan-500 rounded-lg px-2.5 py-1.5 text-slate-100 text-center text-xs outline-none transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              />
              <div className="hidden print:block text-center text-[10px] font-black text-slate-950 py-0.5 border-b border-slate-400">
                {v_l2_n || '—'}
              </div>
            </div>
            <div>
              <label className="block text-[10px] print:text-[8px] font-bold text-slate-400 print:text-slate-900 mb-1 print:mb-0.5 text-center">V L3-N</label>
              <input
                type="text"
                disabled={isReadOnly}
                value={v_l3_n}
                onChange={(e) => handleChange('v_l3_n', e.target.value)}
                placeholder="Ej. 120"
                className="no-print w-full bg-slate-950 border border-slate-700 focus:border-cyan-500 rounded-lg px-2.5 py-1.5 text-slate-100 text-center text-xs outline-none transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              />
              <div className="hidden print:block text-center text-[10px] font-black text-slate-950 py-0.5 border-b border-slate-400">
                {v_l3_n || '—'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* BLOQUE 3: CORRIENTE */}
      <div className="bg-slate-900/50 border border-slate-800/80 print:border-slate-400 rounded-xl print:rounded p-3.5 print:p-1.5 space-y-2.5 print:space-y-1">
        <div className="tablero-subheader-row flex items-center justify-between border-b border-slate-800 print:border-slate-400 pb-1.5 print:pb-0.5 print:px-1.5 print:py-0.5 print:rounded-xs">
          <span className="text-[11px] print:text-[9px] font-bold text-slate-300 print:text-slate-950 uppercase tracking-wide flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-emerald-400 no-print" /> CORRIENTE
          </span>
          <span className="text-[9px] print:text-[8px] font-mono text-slate-500 print:text-slate-800 font-bold">Unidad: Amperios (A)</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 print:grid-cols-5 gap-2.5 print:gap-1.5 text-xs font-mono">
          <div>
            <label className="block text-[10px] print:text-[8px] font-bold text-amber-400 print:text-amber-950 mb-1 print:mb-0.5 flex items-center justify-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-500 no-print"></span> I Línea 1 (I_L1)
            </label>
            <input
              type="text"
              disabled={isReadOnly}
              value={i_l1}
              onChange={(e) => handleChange('i_l1', e.target.value)}
              placeholder="Ej. 650"
              className="no-print w-full bg-slate-950 border border-slate-700 focus:border-amber-500 rounded-lg px-2 py-1.5 text-slate-100 text-center text-xs outline-none font-bold disabled:opacity-60 disabled:cursor-not-allowed"
            />
            <div className="hidden print:block text-center text-[10px] font-black text-slate-950 py-0.5 border-b border-slate-400">
              {i_l1 || '—'}
            </div>
          </div>
          <div>
            <label className="block text-[10px] print:text-[8px] font-bold text-amber-400 print:text-amber-950 mb-1 print:mb-0.5 flex items-center justify-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-500 no-print"></span> I Línea 2 (I_L2)
            </label>
            <input
              type="text"
              disabled={isReadOnly}
              value={i_l2}
              onChange={(e) => handleChange('i_l2', e.target.value)}
              placeholder="Ej. 630"
              className="no-print w-full bg-slate-950 border border-slate-700 focus:border-amber-500 rounded-lg px-2 py-1.5 text-slate-100 text-center text-xs outline-none font-bold disabled:opacity-60 disabled:cursor-not-allowed"
            />
            <div className="hidden print:block text-center text-[10px] font-black text-slate-950 py-0.5 border-b border-slate-400">
              {i_l2 || '—'}
            </div>
          </div>
          <div>
            <label className="block text-[10px] print:text-[8px] font-bold text-amber-400 print:text-amber-950 mb-1 print:mb-0.5 flex items-center justify-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-500 no-print"></span> I Línea 3 (I_L3)
            </label>
            <input
              type="text"
              disabled={isReadOnly}
              value={i_l3}
              onChange={(e) => handleChange('i_l3', e.target.value)}
              placeholder="Ej. 640"
              className="no-print w-full bg-slate-950 border border-slate-700 focus:border-amber-500 rounded-lg px-2 py-1.5 text-slate-100 text-center text-xs outline-none font-bold disabled:opacity-60 disabled:cursor-not-allowed"
            />
            <div className="hidden print:block text-center text-[10px] font-black text-slate-950 py-0.5 border-b border-slate-400">
              {i_l3 || '—'}
            </div>
          </div>
          <div>
            <label className="block text-[10px] print:text-[8px] font-bold text-cyan-400 print:text-sky-950 mb-1 print:mb-0.5 flex items-center justify-center gap-1">
              <span className="w-2 h-2 rounded-full bg-cyan-400 no-print"></span> I Neutro (I_N)
            </label>
            <input
              type="text"
              disabled={isReadOnly}
              value={i_n}
              onChange={(e) => handleChange('i_n', e.target.value)}
              placeholder="Ej. 35"
              className="no-print w-full bg-slate-950 border border-slate-700 focus:border-cyan-500 rounded-lg px-2 py-1.5 text-cyan-300 text-center text-xs outline-none font-bold disabled:opacity-60 disabled:cursor-not-allowed"
            />
            <div className="hidden print:block text-center text-[10px] font-black text-slate-950 py-0.5 border-b border-slate-400">
              {i_n || '—'}
            </div>
          </div>
          <div className="col-span-2 sm:col-span-1 print:col-span-1">
            <label className="block text-[10px] print:text-[8px] font-bold text-emerald-400 print:text-slate-950 mb-1 print:mb-0.5 flex items-center justify-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 no-print"></span> I Tierra (I_PE)
            </label>
            <input
              type="text"
              disabled={isReadOnly}
              value={i_pe}
              onChange={(e) => handleChange('i_pe', e.target.value)}
              placeholder="Ej. 0.5"
              className="no-print w-full bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded-lg px-2 py-1.5 text-emerald-300 text-center text-xs outline-none font-bold disabled:opacity-60 disabled:cursor-not-allowed"
            />
            <div className="hidden print:block text-center text-[10px] font-black text-slate-950 py-0.5 border-b border-slate-400">
              {i_pe || '—'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
