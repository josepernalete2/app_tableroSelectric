import React from 'react';
import { Activity, Zap, Shield, Gauge } from 'lucide-react';

export default function MetrologiaElectricaSection({
  mediciones = {},
  onChange,
  readOnly = false,
  titulo = "Metrología Eléctrica y Medición de Red (COVENIN 159)",
  subtitulo = "Lectura de tensiones desglosadas L-L, L-N y 5 canales de corriente de servicio"
}) {
  const handleChange = (field, val) => {
    if (readOnly || !onChange) return;
    onChange({
      ...mediciones,
      [field]: val
    });
  };

  // Voltajes Línea-Línea (L-L)
  const v_l1_l2 = mediciones.v_l1_l2 ?? mediciones.v_ab ?? mediciones.vab ?? '';
  const v_l1_l3 = mediciones.v_l1_l3 ?? mediciones.v_ca ?? mediciones.vac ?? '';
  const v_l2_l3 = mediciones.v_l2_l3 ?? mediciones.v_bc ?? mediciones.vbc ?? '';

  // Voltajes Línea-Neutro (L-N)
  const v_l1_n = mediciones.v_l1_n ?? mediciones.v_an ?? mediciones.van ?? '';
  const v_l2_n = mediciones.v_l2_n ?? mediciones.v_bn ?? mediciones.vbn ?? '';
  const v_l3_n = mediciones.v_l3_n ?? mediciones.v_cn ?? mediciones.vcn ?? '';

  // 5 Canales de Corriente (A)
  const i_l1 = mediciones.i_l1 ?? mediciones.ia ?? mediciones.il1 ?? '';
  const i_l2 = mediciones.i_l2 ?? mediciones.ib ?? mediciones.il2 ?? '';
  const i_l3 = mediciones.i_l3 ?? mediciones.ic ?? mediciones.il3 ?? '';
  const i_n = mediciones.i_n ?? mediciones.in ?? '';
  const i_pe = mediciones.i_pe ?? mediciones.ipe ?? mediciones.itierra ?? '';

  return (
    <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 md:p-5 space-y-4 print:bg-white print:border-gray-300 print:text-black font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-850 pb-3">
        <div>
          <h3 className="text-xs md:text-sm font-extrabold uppercase tracking-wider text-amber-400 flex items-center gap-2 print:text-slate-900">
            <Zap className="w-4 h-4 text-amber-500" />
            {titulo}
          </h3>
          {subtitulo && (
            <p className="text-[10px] text-slate-400 font-mono mt-0.5 print:text-slate-600">
              {subtitulo}
            </p>
          )}
        </div>
        <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded self-start sm:self-auto">
          Norma COVENIN 159:1997
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* BLOQUE 1: TENSIONES DE LÍNEA (L-L) */}
        <div className="bg-slate-900/50 border border-slate-800/80 rounded-xl p-3.5 space-y-2.5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
            <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wide flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-amber-400" /> Voltajes de Línea (L-L)
            </span>
            <span className="text-[9px] font-mono text-slate-500 font-bold">Unidad: Voltios (V)</span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-xs font-mono">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 mb-1">V L1-L2</label>
              <input
                type="text"
                disabled={readOnly}
                value={v_l1_l2}
                onChange={(e) => handleChange('v_l1_l2', e.target.value)}
                placeholder="Ej. 208"
                className="w-full bg-slate-950 border border-slate-700 focus:border-amber-500 rounded-lg px-2.5 py-1.5 text-slate-100 text-center text-xs outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 mb-1">V L1-L3</label>
              <input
                type="text"
                disabled={readOnly}
                value={v_l1_l3}
                onChange={(e) => handleChange('v_l1_l3', e.target.value)}
                placeholder="Ej. 208"
                className="w-full bg-slate-950 border border-slate-700 focus:border-amber-500 rounded-lg px-2.5 py-1.5 text-slate-100 text-center text-xs outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 mb-1">V L2-L3</label>
              <input
                type="text"
                disabled={readOnly}
                value={v_l2_l3}
                onChange={(e) => handleChange('v_l2_l3', e.target.value)}
                placeholder="Ej. 208"
                className="w-full bg-slate-950 border border-slate-700 focus:border-amber-500 rounded-lg px-2.5 py-1.5 text-slate-100 text-center text-xs outline-none transition-all"
              />
            </div>
          </div>
        </div>

        {/* BLOQUE 2: TENSIONES DE FASE (L-N) */}
        <div className="bg-slate-900/50 border border-slate-800/80 rounded-xl p-3.5 space-y-2.5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
            <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wide flex items-center gap-1.5">
              <Gauge className="w-3.5 h-3.5 text-cyan-400" /> Voltajes de Fase (L-N)
            </span>
            <span className="text-[9px] font-mono text-slate-500 font-bold">Unidad: Voltios (V)</span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-xs font-mono">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 mb-1">V L1-N</label>
              <input
                type="text"
                disabled={readOnly}
                value={v_l1_n}
                onChange={(e) => handleChange('v_l1_n', e.target.value)}
                placeholder="Ej. 120"
                className="w-full bg-slate-950 border border-slate-700 focus:border-cyan-500 rounded-lg px-2.5 py-1.5 text-slate-100 text-center text-xs outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 mb-1">V L2-N</label>
              <input
                type="text"
                disabled={readOnly}
                value={v_l2_n}
                onChange={(e) => handleChange('v_l2_n', e.target.value)}
                placeholder="Ej. 120"
                className="w-full bg-slate-950 border border-slate-700 focus:border-cyan-500 rounded-lg px-2.5 py-1.5 text-slate-100 text-center text-xs outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 mb-1">V L3-N</label>
              <input
                type="text"
                disabled={readOnly}
                value={v_l3_n}
                onChange={(e) => handleChange('v_l3_n', e.target.value)}
                placeholder="Ej. 120"
                className="w-full bg-slate-950 border border-slate-700 focus:border-cyan-500 rounded-lg px-2.5 py-1.5 text-slate-100 text-center text-xs outline-none transition-all"
              />
            </div>
          </div>
        </div>
      </div>

      {/* BLOQUE 3: CINCO CANALES DE CORRIENTE */}
      <div className="bg-slate-900/50 border border-slate-800/80 rounded-xl p-3.5 space-y-2.5">
        <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
          <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wide flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-emerald-400" /> Cinco Canales de Corriente (Fases, Neutro y Tierra)
          </span>
          <span className="text-[9px] font-mono text-slate-500 font-bold">Unidad: Amperios (A)</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-xs font-mono">
          <div>
            <label className="block text-[10px] font-bold text-amber-400 mb-1 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span> I Línea 1 (I_L1)
            </label>
            <input
              type="text"
              disabled={readOnly}
              value={i_l1}
              onChange={(e) => handleChange('i_l1', e.target.value)}
              placeholder="Ej. 650"
              className="w-full bg-slate-950 border border-slate-700 focus:border-amber-500 rounded-lg px-2 py-1.5 text-slate-100 text-center text-xs outline-none font-bold"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-amber-400 mb-1 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span> I Línea 2 (I_L2)
            </label>
            <input
              type="text"
              disabled={readOnly}
              value={i_l2}
              onChange={(e) => handleChange('i_l2', e.target.value)}
              placeholder="Ej. 630"
              className="w-full bg-slate-950 border border-slate-700 focus:border-amber-500 rounded-lg px-2 py-1.5 text-slate-100 text-center text-xs outline-none font-bold"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-amber-400 mb-1 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span> I Línea 3 (I_L3)
            </label>
            <input
              type="text"
              disabled={readOnly}
              value={i_l3}
              onChange={(e) => handleChange('i_l3', e.target.value)}
              placeholder="Ej. 640"
              className="w-full bg-slate-950 border border-slate-700 focus:border-amber-500 rounded-lg px-2 py-1.5 text-slate-100 text-center text-xs outline-none font-bold"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-cyan-400 mb-1 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-cyan-400"></span> I Neutro (I_N)
            </label>
            <input
              type="text"
              disabled={readOnly}
              value={i_n}
              onChange={(e) => handleChange('i_n', e.target.value)}
              placeholder="Ej. 35"
              className="w-full bg-slate-950 border border-slate-700 focus:border-cyan-500 rounded-lg px-2 py-1.5 text-cyan-300 text-center text-xs outline-none font-bold"
            />
          </div>
          <div className="col-span-2 sm:col-span-1">
            <label className="block text-[10px] font-bold text-emerald-400 mb-1 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span> I Tierra (I_PE)
            </label>
            <input
              type="text"
              disabled={readOnly}
              value={i_pe}
              onChange={(e) => handleChange('i_pe', e.target.value)}
              placeholder="Ej. 0.5"
              className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded-lg px-2 py-1.5 text-emerald-300 text-center text-xs outline-none font-bold"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
