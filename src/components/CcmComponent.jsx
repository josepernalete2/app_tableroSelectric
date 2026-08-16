import React from 'react';
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
  FileText
} from 'lucide-react';

export default function CcmComponent({ ccmData, onUpdate, readOnly }) {
  if (!ccmData) {
    return <div className="text-center p-8 text-slate-400">No hay datos de CCM seleccionados.</div>;
  }

  const {
    id,
    nombre = '',
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

  const updateField = (field, value) => {
    if (readOnly) return;
    onUpdate({
      ...ccmData,
      [field]: value
    });
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

  // Valores predeterminados de gavetas si está vacío
  const defaultGavetas = (ccmData.gavetasBucketLog && ccmData.gavetasBucketLog.length > 0) 
    ? ccmData.gavetasBucketLog 
    : [
        { id: 'g-1', gaveta: 'G-01', tagEquipo: 'Bomba Agua Potable 1', hpKw: '25 HP', tipoArranque: 'Directo (DOL)', proteccion: 'Guardamotor 32A', marcaModeloVfd: 'N/A (Contactor)', redComms: 'Modbus RTU', estadoObs: 'Operativo' },
        { id: 'g-2', gaveta: 'G-02', tagEquipo: 'Ventilador Tiro Forzado', hpKw: '50 HP', tipoArranque: 'VFD', proteccion: 'Breaker C63A', marcaModeloVfd: 'PowerFlex 525', redComms: 'EtherNet/IP', estadoObs: 'Operativo' },
        { id: 'g-3', gaveta: 'G-03', tagEquipo: 'Agitador Tanque A', hpKw: '15 HP', tipoArranque: 'Estrella-Triáng.', proteccion: 'Contactor + Térmico', marcaModeloVfd: 'N/A', redComms: 'Discreta', estadoObs: 'Mantenim.' },
        { id: 'g-4', gaveta: 'G-04', tagEquipo: 'RESERVA DISPONIBLE', hpKw: '-', tipoArranque: '-', proteccion: '-', marcaModeloVfd: '-', redComms: '-', estadoObs: 'Disponible' }
      ];

  const defaultHallazgos = (ccmData.hallazgosCriticos && ccmData.hallazgosCriticos.length > 0)
    ? ccmData.hallazgosCriticos
    : [
        { id: 'h-1', itemNum: '01', descripcion: 'Sustitución recomendada de filtros de polvo obstruidos en gabinete superior.' },
        { id: 'h-2', itemNum: '02', descripcion: 'Se sugiere actualización del diagrama unifilar en puerta de acceso.' }
      ];

  return (
    <div className={`w-full text-slate-100 bg-slate-900/60 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-xl backdrop-blur-md select-text max-w-5xl mx-auto space-y-8 print-card print:bg-white print:text-slate-900 print:border-none print:shadow-none print:p-0 print:m-0 ${readOnly ? 'pointer-events-none opacity-90' : ''}`}>
      
      {/* Encabezado General */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b border-slate-800 print:border-gray-300">
        <div>
          <span className="text-[10px] text-amber-500 font-extrabold uppercase tracking-widest print:text-amber-700">
            Formato de Levantamiento de Información Técnica
          </span>
          <h2 className="text-xl md:text-2xl font-extrabold text-slate-100 tracking-wide mt-1 print:text-slate-900">
            Centro de Control de Motores (CCM) Industrial
          </h2>
          {nombre && (
            <p className="text-xs font-semibold text-slate-400 mt-1 print:text-slate-600">
              Tag / Identificación: <span className="text-amber-400 font-bold print:text-slate-900">{nombre}</span>
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => window.print()}
            className="no-print bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-4 py-2 rounded-xl flex items-center gap-2 text-xs transition-all cursor-pointer shadow-md"
            title="Guardar como PDF o Imprimir esta Inspección de CCM"
          >
            <Printer className="w-4 h-4" /> Guardar PDF
          </button>
          <span className="inline-flex items-center justify-center font-mono font-black text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/30 text-xs shadow-sm">
            ID: {id}
          </span>
        </div>
      </div>

      {/* 1. DATOS GENERALES E IDENTIFICACIÓN */}
      <div className="bg-slate-950/40 border border-slate-800/80 rounded-2xl p-5 space-y-4 print:bg-white print:border-gray-300">
        <h3 className="text-xs font-bold uppercase tracking-wider text-amber-500 border-b border-slate-800 pb-2.5 flex items-center gap-2 print:text-slate-900 print:border-gray-300">
          <Building2 className="w-4 h-4 text-amber-500" /> 1. Datos Generales e Identificación
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-slate-400 print:text-slate-700 uppercase">Planta / Instalación</label>
            <input
              type="text"
              value={plantaInstalacion}
              onChange={(e) => updateField('plantaInstalacion', e.target.value)}
              className="bg-slate-900 border border-slate-800 focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-slate-100 outline-none h-10 transition-all print:bg-white print:text-slate-900 print:border-gray-300"
              placeholder="Ej. Planta Procesadora Central"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-slate-400 print:text-slate-700 uppercase">Área / Proceso</label>
            <input
              type="text"
              value={areaProceso}
              onChange={(e) => updateField('areaProceso', e.target.value)}
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
              className="bg-slate-900 border border-slate-800 focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-slate-100 outline-none h-10 transition-all font-mono print:bg-white print:text-slate-900 print:border-gray-300"
              placeholder="Ej. 2018 / 2019"
            />
          </div>
        </div>
      </div>

      {/* 2. PARÁMETROS ELÉCTRICOS GENERALES */}
      <div className="bg-slate-950/40 border border-slate-800/80 rounded-2xl p-5 space-y-4 print:bg-white print:border-gray-300">
        <h3 className="text-xs font-bold uppercase tracking-wider text-amber-500 border-b border-slate-800 pb-2.5 flex items-center gap-2 print:text-slate-900 print:border-gray-300">
          <Zap className="w-4 h-4 text-amber-500" /> 2. Parámetros Eléctricos Generales
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
      <div className="bg-slate-950/40 border border-slate-800/80 rounded-2xl p-5 space-y-4 print:bg-white print:border-gray-300">
        <div className="flex justify-between items-center border-b border-slate-800 pb-2.5 print:border-gray-300">
          <h3 className="text-xs font-bold uppercase tracking-wider text-amber-500 flex items-center gap-2 print:text-slate-900">
            <Layers className="w-4 h-4 text-amber-500" /> 3. Registro Técnico de Gavetas / Compartimentos (Bucket Log)
          </h3>
          <button
            type="button"
            onClick={addGaveta}
            className="no-print bg-slate-900 hover:bg-slate-800 border border-slate-800 text-amber-400 font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 text-xs transition-all cursor-pointer"
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
              {defaultGavetas.map((g) => (
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
                    <button
                      type="button"
                      onClick={() => deleteGaveta(g.id)}
                      className="p-1 hover:bg-red-950/40 text-slate-500 hover:text-red-400 rounded-lg transition-all cursor-pointer"
                      title="Eliminar Gaveta"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. INSPECCIÓN FÍSICA Y AMBIENTAL DEL GABINETE */}
      <div className="bg-slate-950/40 border border-slate-800/80 rounded-2xl p-5 space-y-4 print:bg-white print:border-gray-300">
        <h3 className="text-xs font-bold uppercase tracking-wider text-amber-500 border-b border-slate-800 pb-2.5 flex items-center gap-2 print:text-slate-900 print:border-gray-300">
          <Activity className="w-4 h-4 text-amber-500" /> 4. Inspección Física y Ambiental del Gabinete
        </h3>

        <div className="space-y-4">
          {[
            { key: 'limpiezaPolvo', label: 'Limpieza Interna / Polvo', options: ['Buena', 'Aceptable', 'Polvo / Acumulación Crítica'] },
            { key: 'humedadAgua', label: 'Humedad / Evidencia de Agua', options: ['Ausente', 'Filtración Superior', 'Condensación'] },
            { key: 'acometidaCables', label: 'Acometida / Entrada Cables', options: ['Superior', 'Inferior'] },
            { key: 'ventilacion', label: 'Ventilación y Extracción', options: ['Operativo', 'Filtros Obstruidos', 'Inoperativo'] },
            { key: 'puestaTierra', label: 'Puesta a Tierra (Malla General)', options: ['Conectada y Ajustada', 'Corroída', 'Desconectada'] }
          ].map((item) => {
            const dataObj = inspeccionFisica[item.key] || {};
            return (
              <div key={item.key} className="p-3.5 bg-slate-900/40 border border-slate-800/80 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3 print:bg-gray-50 print:border-gray-300">
                <span className="text-xs font-bold text-slate-200 w-48 print:text-slate-800">{item.label}</span>
                <div className="flex flex-wrap gap-2">
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
                  className="flex-1 min-w-[200px] bg-slate-900 border border-slate-800 focus:border-amber-500 rounded-xl px-3 py-1.5 text-xs text-slate-100 outline-none print:bg-white print:text-slate-900 print:border-gray-300"
                />
              </div>
            );
          })}

          {/* Campo Especial: Temperatura Cuarto CCM */}
          <div className="p-3.5 bg-slate-900/40 border border-slate-800/80 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3 print:bg-gray-50 print:border-gray-300">
            <span className="text-xs font-bold text-slate-200 w-48 print:text-slate-800 flex items-center gap-1.5">
              <Thermometer className="w-4 h-4 text-amber-500" /> Temperatura Cuarto CCM
            </span>
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-400 print:text-slate-700">Medida:</span>
              <input
                type="text"
                value={inspeccionFisica.temperaturaMedida || ''}
                onChange={(e) => updateField('inspeccionFisica', { ...inspeccionFisica, temperaturaMedida: e.target.value })}
                placeholder="24 °C"
                className="w-24 bg-slate-900 border border-slate-800 focus:border-amber-500 rounded-xl px-2.5 py-1 text-xs text-slate-100 font-mono outline-none print:bg-white print:text-slate-900 print:border-gray-300"
              />
              <span className="text-xs text-slate-400 print:text-slate-700 ml-2">Aire Acondicionado:</span>
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
      <div className="bg-slate-950/40 border border-slate-800/80 rounded-2xl p-5 space-y-4 print:bg-white print:border-gray-300">
        <h3 className="text-xs font-bold uppercase tracking-wider text-amber-500 border-b border-slate-800 pb-2.5 flex items-center gap-2 print:text-slate-900 print:border-gray-300">
          <ShieldCheck className="w-4 h-4 text-amber-500" /> 5. Seguridad, Señalética y Termografía Predictiva
        </h3>

        <div className="space-y-3">
          {[
            { key: 'arcFlash', label: 'Etiquetado Arc Flash (Riesgo)', options: ['Presente y Legible', 'Ausente / Ilegible'] },
            { key: 'unifilarPuerta', label: 'Diagrama Unifilar en Puerta', options: ['Actualizado', 'Desactualizado', 'No Existe'] },
            { key: 'interlockMecanico', label: 'Interlock Mecánico de Puertas', options: ['Operativo / Funcional', 'Forzado / Inoperativo'] },
            { key: 'inspeccionTermografica', label: 'Inspección Termográfica', options: ['Sin Puntos Calientes', 'Punto Caliente Detectado'] }
          ].map((item) => {
            const dataObj = seguridadTermografia[item.key] || {};
            return (
              <div key={item.key} className="p-3.5 bg-slate-900/40 border border-slate-800/80 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3 print:bg-gray-50 print:border-gray-300">
                <span className="text-xs font-bold text-slate-200 w-52 print:text-slate-800">{item.label}</span>
                <div className="flex flex-wrap gap-2">
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
                  className="flex-1 min-w-[200px] bg-slate-900 border border-slate-800 focus:border-amber-500 rounded-xl px-3 py-1.5 text-xs text-slate-100 outline-none print:bg-white print:text-slate-900 print:border-gray-300"
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* 6. OBSERVACIONES Y HALLAZGOS CRÍTICOS */}
      <div className="bg-slate-950/40 border border-slate-800/80 rounded-2xl p-5 space-y-4 print:bg-white print:border-gray-300">
        <div className="flex justify-between items-center border-b border-slate-800 pb-2.5 print:border-gray-300">
          <h3 className="text-xs font-bold uppercase tracking-wider text-amber-500 flex items-center gap-2 print:text-slate-900">
            <AlertCircle className="w-4 h-4 text-amber-500" /> 6. Observaciones y Hallazgos Críticos
          </h3>
          <button
            type="button"
            onClick={addHallazgo}
            className="no-print bg-slate-900 hover:bg-slate-800 border border-slate-800 text-amber-400 font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 text-xs transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> Agregar Hallazgo
          </button>
        </div>

        <div className="space-y-2.5">
          {defaultHallazgos.map((h) => (
            <div key={h.id} className="flex items-center gap-3">
              <span className="px-2.5 py-1 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono font-bold text-amber-500 print:bg-gray-100 print:text-slate-900 print:border-gray-300">
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

      {/* 7. CONTROL DE REGISTRO Y FIRMAS DE CONFORMIDAD */}
      <div className="bg-slate-950/40 border border-slate-800/80 rounded-2xl p-5 space-y-4 print:bg-slate-50 print:border-gray-300 print:mt-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-900 pb-2.5 print:text-slate-700 print:border-gray-300">
          7. Control de Registro y Firmas de Conformidad
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Firma Inspector */}
          <div className="flex flex-col gap-2 items-center text-center">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide print:text-slate-700">Realizado por (Inspector de Campo)</span>
            <input
              type="text"
              value={firmaInspector}
              onChange={(e) => updateField('firmaInspector', e.target.value)}
              className="w-full max-w-xs bg-slate-900 border border-slate-800 focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-slate-100 outline-none h-10 transition-all text-center no-print"
              placeholder="Firma / Nombre del Inspector"
            />
            <span className="hidden print:block text-xs font-bold text-slate-900 mt-1 h-6">
              {firmaInspector || '___________________________'}
            </span>
            <div className="hidden print:block w-48 border-b border-gray-400 mt-6 h-1"></div>
          </div>

          {/* Firma Supervisor */}
          <div className="flex flex-col gap-2 items-center text-center">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide print:text-slate-700">Revisado y Aprobado por (Supervisor)</span>
            <input
              type="text"
              value={firmaSupervisor}
              onChange={(e) => updateField('firmaSupervisor', e.target.value)}
              className="w-full max-w-xs bg-slate-900 border border-slate-800 focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-slate-100 outline-none h-10 transition-all text-center no-print"
              placeholder="Firma / Nombre del Supervisor"
            />
            <span className="hidden print:block text-xs font-bold text-slate-900 mt-1 h-6">
              {firmaSupervisor || '___________________________'}
            </span>
            <div className="hidden print:block w-48 border-b border-gray-400 mt-6 h-1"></div>
          </div>
        </div>
      </div>

    </div>
  );
}
