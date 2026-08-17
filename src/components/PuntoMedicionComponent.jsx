import React, { useState } from 'react';
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
  Settings
} from 'lucide-react';
import ModalEdicionCircuito from './ModalEdicionCircuito';
import useStore from '../store/useStore';

export default function PuntoMedicionComponent({ puntoData, onUpdate, readOnly }) {
  const { crearElementoProvisional } = useStore();
  const [modalJerarquiaOpen, setModalJerarquiaOpen] = useState(false);
  const [circuitDataWizard, setCircuitDataWizard] = useState(null);
  const [wizardModo, setWizardModo] = useState('ENTRADA');
  if (!puntoData) {
    return <div className="text-center p-8 text-slate-400">No hay datos de punto de medición seleccionados.</div>;
  }

  const {
    id,
    nombre = '',
    fecha = '',
    hora = '',
    inspector = '',

    // 1. Datos Generales
    nombreUsuario = '',
    numeroContrato = '',
    empresaDistribuidora = '',
    nivelTensionContrato = '',
    tensionNominal = '',
    potenciaContratada = '',
    tarifaAplicable = '',
    codigoElementoPrincipal = '',

    // 2. Punto de Acometida
    tipoAcometida = '',
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

    // 5. Observaciones y Firmas
    observaciones = '',
    firmaInspector = '',
    firmaSupervisor = ''
  } = puntoData;

  const updateField = (field, value) => {
    if (readOnly) return;
    onUpdate({
      ...puntoData,
      [field]: value
    });
  };

  return (
    <div className={`w-full text-slate-100 bg-slate-900/60 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-xl backdrop-blur-md select-text max-w-5xl mx-auto space-y-8 print-card print:bg-white print:text-slate-900 print:border-none print:shadow-none print:p-0 print:m-0 ${readOnly ? 'pointer-events-none opacity-90' : ''}`}>
      
      {/* Encabezado General */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b border-slate-800 print:border-gray-300">
        <div>
          <span className="text-[10px] text-amber-500 font-extrabold uppercase tracking-widest print:text-amber-700">
            Formato de Levantamiento
          </span>
          <h2 className="text-xl md:text-2xl font-extrabold text-slate-100 tracking-wide mt-1 print:text-slate-900">
            Punto de Medición y Suministro de Energía Eléctrica
          </h2>
          {nombre && (
            <p className="text-xs font-semibold text-slate-400 mt-1 print:text-slate-600">
              Identificador: <span className="text-amber-400 print:text-slate-900">{nombre}</span>
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => window.print()}
            className="no-print bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-4 py-2 rounded-xl flex items-center gap-2 text-xs transition-all cursor-pointer shadow-md"
            title="Guardar como PDF o Imprimir este Formato"
          >
            <Printer className="w-4 h-4" /> Guardar PDF
          </button>
          <span className="inline-flex items-center justify-center font-mono font-black text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/30 text-xs shadow-sm">
            ID: {id}
          </span>
        </div>
      </div>

      {/* Datos del Inspector y Fecha */}
      <div className="bg-slate-950/40 border border-slate-800/80 rounded-2xl p-5 space-y-4 print:bg-slate-50 print:border-gray-300">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1 print:text-slate-700">
              <User className="w-3.5 h-3.5 text-amber-500" /> Nombre del Inspector
            </span>
            <input
              type="text"
              value={inspector}
              onChange={(e) => updateField('inspector', e.target.value)}
              className="bg-slate-900 border border-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-xl px-3 py-2 text-xs text-slate-100 outline-none h-10 transition-all print:bg-white print:text-slate-900 print:border-gray-300"
              placeholder="Ej. Ing. Juan Pérez"
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1 print:text-slate-700">
              <Calendar className="w-3.5 h-3.5 text-amber-500" /> Fecha del Levantamiento
            </span>
            <input
              type="date"
              value={fecha}
              onChange={(e) => updateField('fecha', e.target.value)}
              className="bg-slate-900 border border-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-xl px-3 py-2 text-xs text-slate-100 outline-none h-10 transition-all font-mono print:bg-white print:text-slate-900 print:border-gray-300"
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1 print:text-slate-700">
              <Clock className="w-3.5 h-3.5 text-amber-500" /> Hora
            </span>
            <input
              type="time"
              value={hora}
              onChange={(e) => updateField('hora', e.target.value)}
              className="bg-slate-900 border border-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-xl px-3 py-2 text-xs text-slate-100 outline-none h-10 transition-all font-mono print:bg-white print:text-slate-900 print:border-gray-300"
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
              value={nombreUsuario}
              onChange={(e) => updateField('nombreUsuario', e.target.value)}
              className="bg-slate-900 border border-slate-800 focus:border-amber-500 rounded-xl px-3.5 py-2 text-xs text-slate-100 outline-none h-10 transition-all print:bg-white print:text-slate-900 print:border-gray-300"
              placeholder="Ej. Industrias Eléctricas C.A."
            />
          </div>

          {/* N° de Contrato / Cuenta / NIC */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-slate-400 print:text-slate-700">N° de Contrato / Cuenta / NIC</label>
            <input
              type="text"
              value={numeroContrato}
              onChange={(e) => updateField('numeroContrato', e.target.value)}
              className="bg-slate-900 border border-slate-800 focus:border-amber-500 rounded-xl px-3.5 py-2 text-xs text-slate-100 outline-none h-10 transition-all font-mono print:bg-white print:text-slate-900 print:border-gray-300"
              placeholder="Ej. NIC-84920491"
            />
          </div>

          {/* Empresa Distribuidora */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-slate-400 print:text-slate-700">Empresa Distribuidora (ED) / Suministrador</label>
            <input
              type="text"
              value={empresaDistribuidora}
              onChange={(e) => updateField('empresaDistribuidora', e.target.value)}
              className="bg-slate-900 border border-slate-800 focus:border-amber-500 rounded-xl px-3.5 py-2 text-xs text-slate-100 outline-none h-10 transition-all print:bg-white print:text-slate-900 print:border-gray-300"
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
                    onClick={() => updateField('nivelTensionContrato', nivel)}
                    className={`py-2 px-2 text-center rounded-xl border text-[11px] font-bold transition-all cursor-pointer ${
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
            <label className="text-[11px] font-bold text-slate-400 print:text-slate-700">Tensión Nominal de Suministro (kV / V)</label>
            <input
              type="text"
              value={tensionNominal}
              onChange={(e) => updateField('tensionNominal', e.target.value)}
              className="bg-slate-900 border border-slate-800 focus:border-amber-500 rounded-xl px-3.5 py-2 text-xs text-slate-100 outline-none h-10 transition-all font-mono print:bg-white print:text-slate-900 print:border-gray-300"
              placeholder="Ej. 13.8 kV / 208 V"
            />
          </div>

          {/* Potencia Contratada / Conectada */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-slate-400 print:text-slate-700">Potencia Contratada / Conectada (kVA)</label>
            <input
              type="text"
              value={potenciaContratada}
              onChange={(e) => updateField('potenciaContratada', e.target.value)}
              className="bg-slate-900 border border-slate-800 focus:border-amber-500 rounded-xl px-3.5 py-2 text-xs text-slate-100 outline-none h-10 transition-all font-mono print:bg-white print:text-slate-900 print:border-gray-300"
              placeholder="Ej. 500 kVA"
            />
          </div>

          {/* Tarifa / Régimen Tarifario Aplicable */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-slate-400 print:text-slate-700">Tarifa / Régimen Tarifario Aplicable</label>
            <input
              type="text"
              value={tarifaAplicable}
              onChange={(e) => updateField('tarifaAplicable', e.target.value)}
              className="bg-slate-900 border border-slate-800 focus:border-amber-500 rounded-xl px-3.5 py-2 text-xs text-slate-100 outline-none h-10 transition-all print:bg-white print:text-slate-900 print:border-gray-300"
              placeholder="Ej. Tarifa Industrial General T-2"
            />
          </div>

          {/* Código del Elemento principal */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-slate-400 print:text-slate-700">Código del Elemento Principal</label>
            <input
              type="text"
              value={codigoElementoPrincipal}
              onChange={(e) => updateField('codigoElementoPrincipal', e.target.value)}
              className="bg-slate-900 border border-slate-800 focus:border-amber-500 rounded-xl px-3.5 py-2 text-xs text-slate-100 outline-none h-10 transition-all font-mono print:bg-white print:text-slate-900 print:border-gray-300"
              placeholder="Ej. ELEM-MED-01"
            />
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
            className="no-print inline-flex items-center gap-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer transition-all shadow-sm"
            title="Configurar Conexión de Jerarquía (Wizard)"
          >
            <Settings className="w-3.5 h-3.5 text-amber-400" /> Configurar Jerarquía
          </button>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Tipo de Acometida */}
          <div className="flex flex-col gap-1.5 md:col-span-2">
            <label className="text-[11px] font-bold text-slate-400 print:text-slate-700">Tipo de Acometida</label>
            <div className="grid grid-cols-3 gap-3">
              {['Aérea', 'Subterránea', 'Mixta'].map((tipo) => {
                const isSelected = tipoAcometida === tipo;
                return (
                  <button
                    key={tipo}
                    type="button"
                    onClick={() => updateField('tipoAcometida', tipo)}
                    className={`py-2 px-3 text-center rounded-xl border text-[11px] font-bold transition-all cursor-pointer ${
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

          {/* Punto de Conexión (PCC) */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-slate-400 print:text-slate-700">Punto de Conexión (PCC)</label>
            <input
              type="text"
              value={puntoConexionPCC}
              onChange={(e) => updateField('puntoConexionPCC', e.target.value)}
              className="bg-slate-900 border border-slate-800 focus:border-amber-500 rounded-xl px-3.5 py-2 text-xs text-slate-100 outline-none h-10 transition-all print:bg-white print:text-slate-900 print:border-gray-300"
              placeholder="Tag / Código de Poste, Celda o Subestación"
            />
          </div>

          {/* Conductor de Acometida */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-slate-400 print:text-slate-700">Conductor de Acometida (Tipo / Calibre)</label>
            <input
              type="text"
              value={conductorAcometida}
              onChange={(e) => updateField('conductorAcometida', e.target.value)}
              className="bg-slate-900 border border-slate-800 focus:border-amber-500 rounded-xl px-3.5 py-2 text-xs text-slate-100 outline-none h-10 transition-all font-mono print:bg-white print:text-slate-900 print:border-gray-300"
              placeholder="Ej. 3x(1x500 kcmil) Cu TTU"
            />
          </div>

          {/* Longitud Acometida / N° Fases */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-slate-400 print:text-slate-700">Longitud Acometida (metros)</label>
            <input
              type="text"
              value={longitudAcometida}
              onChange={(e) => updateField('longitudAcometida', e.target.value)}
              className="bg-slate-900 border border-slate-800 focus:border-amber-500 rounded-xl px-3.5 py-2 text-xs text-slate-100 outline-none h-10 transition-all font-mono print:bg-white print:text-slate-900 print:border-gray-300"
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
                    onClick={() => updateField('elementoManiobra', elem)}
                    className={`py-2 px-2.5 text-center rounded-xl border text-[10px] font-bold transition-all cursor-pointer ${
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
              value={capacidadInterrupcion}
              onChange={(e) => updateField('capacidadInterrupcion', e.target.value)}
              className="bg-slate-900 border border-slate-800 focus:border-amber-500 rounded-xl px-3.5 py-2 text-xs text-slate-100 outline-none h-10 transition-all font-mono print:bg-white print:text-slate-900 print:border-gray-300"
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
                  onClick={() => updateField('ubicacionTransformador', ubic)}
                  className={`py-2 px-3 text-left rounded-xl border text-[10px] font-bold transition-all cursor-pointer ${
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
                  onClick={() => updateField('propiedadTransformador', prop)}
                  className={`py-2 px-3 text-left rounded-xl border text-[10px] font-bold transition-all cursor-pointer ${
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
                  onClick={() => updateField('usoTransformador', uso)}
                  className={`py-2 px-3 text-left rounded-xl border text-[10px] font-bold transition-all cursor-pointer ${
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
                    onClick={() => updateField('ubicacionMedidor', ubic)}
                    className={`py-2 px-2 text-center rounded-xl border text-[10px] font-bold transition-all cursor-pointer ${
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
                    onClick={() => updateField('tipoMedicion', tipo)}
                    className={`py-2 px-2 text-center rounded-xl border text-[10px] font-bold transition-all cursor-pointer ${
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
              value={marcaModeloMedidor}
              onChange={(e) => updateField('marcaModeloMedidor', e.target.value)}
              className="bg-slate-900 border border-slate-800 focus:border-amber-500 rounded-xl px-3.5 py-2 text-xs text-slate-100 outline-none h-10 transition-all print:bg-white print:text-slate-900 print:border-gray-300"
              placeholder="Ej. Elster A1800 ALPHA / ION7650"
            />
          </div>

          {/* N° de Serie / Año de Fabricación */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-slate-400 print:text-slate-700">N° de Serie / Año de Fabricación</label>
            <input
              type="text"
              value={numeroSerieAno}
              onChange={(e) => updateField('numeroSerieAno', e.target.value)}
              className="bg-slate-900 border border-slate-800 focus:border-amber-500 rounded-xl px-3.5 py-2 text-xs text-slate-100 outline-none h-10 transition-all font-mono print:bg-white print:text-slate-900 print:border-gray-300"
              placeholder="Ej. SN-7492019 / 2022"
            />
          </div>
        </div>
      </div>

      {/* SECCIÓN 5: Anomalías u observaciones */}
      <div className="bg-slate-950/40 border border-slate-800/80 rounded-2xl p-5 space-y-4 print:bg-white print:border-gray-300">
        <h3 className="text-xs font-bold uppercase tracking-wider text-amber-500 border-b border-slate-800 pb-2.5 flex items-center gap-2 print:text-slate-900 print:border-gray-300">
          <AlertCircle className="w-4 h-4 text-amber-500" /> 5. Anomalías u observaciones
        </h3>

        <textarea
          value={observaciones}
          onChange={(e) => updateField('observaciones', e.target.value)}
          rows={4}
          className="w-full bg-slate-900 border border-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-xl p-3.5 text-xs text-slate-100 outline-none transition-all placeholder-slate-600 font-sans print:bg-white print:text-slate-900 print:border-gray-300"
          placeholder="Escriba aquí las observaciones, hallazgos o anomalías detectadas en la acometida, transformador o equipo de medición..."
        />
      </div>

      {/* Cierre y Firmas */}
      <div className="bg-slate-950/40 border border-slate-800/80 rounded-2xl p-5 space-y-4 print:bg-slate-50 print:border-gray-300 print:mt-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-900 pb-2.5 print:text-slate-700 print:border-gray-300">
          Cierre del Levantamiento y Validez Técnica
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Firma Inspector */}
          <div className="flex flex-col gap-1.5 items-center text-center">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide print:text-slate-700">Firma del Inspector / Técnico</span>
            <input
              type="text"
              value={firmaInspector}
              onChange={(e) => updateField('firmaInspector', e.target.value)}
              className="w-full max-w-xs bg-slate-900 border border-slate-800 focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-slate-100 outline-none h-10 transition-all text-center no-print"
              placeholder="Nombre / Iniciales del Inspector"
            />
            <span className="hidden print:block text-xs font-bold text-slate-900 mt-1 h-6">
              {firmaInspector || '___________________________'}
            </span>
            <div className="hidden print:block w-48 border-b border-gray-400 mt-6 h-1"></div>
          </div>

          {/* Firma Supervisor */}
          <div className="flex flex-col gap-1.5 items-center text-center">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide print:text-slate-700">Firma / Sello de la Empresa</span>
            <input
              type="text"
              value={firmaSupervisor}
              onChange={(e) => updateField('firmaSupervisor', e.target.value)}
              className="w-full max-w-xs bg-slate-900 border border-slate-800 focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-slate-100 outline-none h-10 transition-all text-center no-print"
              placeholder="Nombre / Sello de la Empresa"
            />
            <span className="hidden print:block text-xs font-bold text-slate-900 mt-1 h-6">
              {firmaSupervisor || '___________________________'}
            </span>
            <div className="hidden print:block w-48 border-b border-gray-400 mt-6 h-1"></div>
          </div>
        </div>
      </div>

      <ModalEdicionCircuito
        isOpen={modalJerarquiaOpen}
        onClose={() => setModalJerarquiaOpen(false)}
        circuitData={circuitDataWizard}
        modo={wizardModo}
        tipoOrigen="PUNTO_MEDICION"
        elementosCreados={[]}
        onSave={(circuitId, updated) => {
          if (updated.tipoDestino === 'SUB_TABLERO_PENDIENTE' && puntoData?.proyectoId) {
            crearElementoProvisional(puntoData.proyectoId, {
              nombre: updated.equipo,
              tipoElemento: 'TABLERO',
              circuitoOrigen: circuitId
            });
          }
          if (wizardModo === 'ENTRADA') {
            updateField('puntoConexionPCC', updated.equipo);
          }
        }}
      />
    </div>
  );
}
