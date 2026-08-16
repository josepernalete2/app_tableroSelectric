import { Shield, Hammer, Activity, Compass, Home, Save, User, Calendar, Clock, Zap, Printer } from 'lucide-react';

export default function SubestacionComponent({ subestacionData, onUpdate, readOnly }) {
  if (!subestacionData) return <div className="text-center p-8 text-slate-400">No hay datos de subestación seleccionados.</div>;

  const {
    id,
    nombre,
    ubicacion,
    fecha,
    hora,
    inspector,
    nivelTension,
    estadoEntorno = {},
    obrasCiviles = {},
    equiposPrincipales = {},
    puestaTierra = {},
    edificioControl = {},
    firmaInspector = "",
    firmaSupervisor = ""
  } = subestacionData;

  const updateField = (field, value) => {
    if (readOnly) return;
    onUpdate({
      ...subestacionData,
      [field]: value
    });
  };

  const updateSectionItem = (section, elementKey, type, value) => {
    if (readOnly) return;
    const sectionData = subestacionData[section] || {};
    const itemData = sectionData[elementKey] || { estado: 'B', observaciones: '' };
    
    onUpdate({
      ...subestacionData,
      [section]: {
        ...sectionData,
        [elementKey]: {
          ...itemData,
          [type]: value
        }
      }
    });
  };

  // Definición de las secciones y sus correspondientes elementos
  const SECCIONES = [
    {
      key: 'estadoEntorno',
      title: '2. Estado del Entorno y Perímetro',
      icon: <Compass className="w-5 h-5 text-amber-500" />,
      description: 'Evalúe visualmente las condiciones de seguridad exterior del perímetro.',
      elements: [
        { key: 'cercaPerimetral', label: 'Cerca perimetral / Muros' },
        { key: 'portonAcceso', label: 'Portón de acceso y candados' },
        { key: 'senalizacionSeguridad', label: 'Señalización de seguridad' },
        { key: 'estadoViasAcceso', label: 'Estado de vías de acceso' },
        { key: 'controlMaleza', label: 'Control de maleza y vegetación' },
        { key: 'sistemaDrenaje', label: 'Sistema de drenaje de aguas' }
      ]
    },
    {
      key: 'obrasCiviles',
      title: '3. Obras Civiles y Estructuras Soportes',
      icon: <Hammer className="w-5 h-5 text-amber-500" />,
      description: 'Inspección del estado físico de las bases de concreto y soportes de equipos.',
      elements: [
        { key: 'basesConcreto', label: 'Bases de concreto (Fisuras/Asentamientos)' },
        { key: 'estructurasMetalicas', label: 'Estructuras metálicas (Óxido/Corrosión)' },
        { key: 'porticosLlegada', label: 'Pórticos de llegada y salida' },
        { key: 'tornilleriaConexiones', label: 'Tornillería y conexiones mecánicas' },
        { key: 'murosCortafuegos', label: 'Muros cortafuegos (si aplica)' },
        { key: 'estadoGravilla', label: 'Estado de la gravilla/piedra chancada' }
      ]
    },
    {
      key: 'equiposPrincipales',
      title: '4. Inspección Visual de Equipos Principales',
      icon: <Activity className="w-5 h-5 text-amber-500" />,
      description: 'Detección de fugas, suciedad, daños mecánicos y niveles de fluidos.',
      elements: [
        { key: 'transfFugasAceite', label: 'Transformador: Fugas de aceite' },
        { key: 'transfNivelAceite', label: 'Transformador: Nivel de aceite' },
        { key: 'interruptoresPotencia', label: 'Interruptores de potencia (Estado visual)' },
        { key: 'seccionadoresCortadores', label: 'Seccionadores (cortadores)' },
        { key: 'transformadoresMedida', label: 'Transformadores de medida (CT/PT)' },
        { key: 'pararrayosAisladores', label: 'Pararrayos (Contadores/Aisladores)' },
        { key: 'aisladoresPorcelana', label: 'Aisladores de porcelana/poliméricos' }
      ]
    },
    {
      key: 'puestaTierra',
      title: '5. Sistema de Puesta a Tierra y Conexiones',
      icon: <Shield className="w-5 h-5 text-amber-500" />,
      description: 'Verificación visual y estado de conexiones de puesta a tierra (SPT).',
      elements: [
        { key: 'medicionResistencia', label: 'Mediciones de resistencia de malla de tierra' },
        { key: 'conexionesVisibles', label: 'Conexiones visibles de equipos a tierra' },
        { key: 'estadoCableSpt', label: 'Estado del cable de SPT' },
        { key: 'corrosionConectores', label: 'Corrosión en conectores de tierra' }
      ]
    },
    {
      key: 'edificioControl',
      title: '6. Edificio de Control y Sala de Tableros',
      icon: <Home className="w-5 h-5 text-amber-500" />,
      description: 'Verificación de equipos, limpieza, iluminación y sistemas de seguridad.',
      elements: [
        { key: 'tablerosControl', label: 'Tableros y control' },
        { key: 'bancoCondensadores', label: 'Banco de condensadores' },
        { key: 'sistemaIluminacion', label: 'Sistema de iluminación (Normal/Emergencia)' },
        { key: 'extintoresIncendios', label: 'Estado de extintores de incendios' }
      ]
    }
  ];

  return (
    <div className={`w-full text-slate-100 bg-slate-900/60 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-xl backdrop-blur-md select-text max-w-5xl mx-auto space-y-8 print-card print:bg-white print:text-slate-900 print:border-none print:shadow-none print:p-0 print:m-0 ${readOnly ? 'pointer-events-none opacity-90' : ''}`}>
      {/* Encabezado General */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b border-slate-800 print:border-gray-200">
        <div>
          <span className="text-[10px] text-amber-500 font-extrabold uppercase tracking-widest print:text-amber-600">Inspección de Subestación Eléctrica</span>
          <h2 className="text-xl md:text-2xl font-extrabold text-slate-100 tracking-wide mt-1 print:text-slate-900">{nombre}</h2>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => window.print()}
            className="no-print bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-3.5 py-2 rounded-lg flex items-center gap-2 text-xs transition-all cursor-pointer shadow-sm"
            title="Guardar como PDF o Imprimir esta Inspección"
          >
            <Printer className="w-4 h-4" /> Guardar PDF
          </button>
          <span className="inline-flex items-center justify-center font-mono font-black text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/30 text-xs shadow-sm">
            ID: {id}
          </span>
        </div>
      </div>

      {/* 1. Información General */}
      <div className="bg-slate-950/40 border border-slate-800/80 rounded-2xl p-5 space-y-4 print:bg-slate-50 print:border-gray-200">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-900 pb-2.5 flex items-center gap-2 print:text-slate-700 print:border-gray-200">
          <User className="w-4 h-4 text-amber-500 print:text-amber-600" /> 1. Información General
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* Ubicación / Código */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide print:text-slate-600">Ubicación / Código</span>
            <input
              type="text"
              value={ubicacion}
              onChange={(e) => updateField('ubicacion', e.target.value)}
              className="bg-slate-900 border border-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-xl px-3 py-2 text-xs text-slate-100 outline-none h-10 transition-all print:bg-white print:text-slate-900 print:border-gray-300 print:placeholder-transparent"
              placeholder="Ej. Patio de Transformadores A"
            />
          </div>

          {/* Nivel de Tensión */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide print:text-slate-600">Nivel de Tensión (kV)</span>
            <input
              type="text"
              value={nivelTension}
              onChange={(e) => updateField('nivelTension', e.target.value)}
              className="bg-slate-900 border border-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-xl px-3 py-2 text-xs text-slate-100 outline-none h-10 transition-all font-mono print:bg-white print:text-slate-900 print:border-gray-300 print:placeholder-transparent"
              placeholder="Ej. 13.8 kV"
            />
          </div>

          {/* Inspector */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide print:text-slate-600">Nombre del Inspector</span>
            <input
              type="text"
              value={inspector}
              onChange={(e) => updateField('inspector', e.target.value)}
              className="bg-slate-900 border border-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-xl px-3 py-2 text-xs text-slate-100 outline-none h-10 transition-all print:bg-white print:text-slate-900 print:border-gray-300 print:placeholder-transparent"
              placeholder="Nombre y Apellido"
            />
          </div>

          {/* Fecha */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1.5 print:text-slate-600">
              <Calendar className="w-3.5 h-3.5 text-slate-400 print:text-slate-500" /> Fecha de Inspección
            </span>
            <input
              type="date"
              value={fecha}
              onChange={(e) => updateField('fecha', e.target.value)}
              className="bg-slate-900 border border-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-xl px-3 py-2 text-xs text-slate-100 outline-none h-10 transition-all font-mono print:bg-white print:text-slate-900 print:border-gray-300"
            />
          </div>

          {/* Hora */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1.5 print:text-slate-600">
              <Clock className="w-3.5 h-3.5 text-slate-400 print:text-slate-500" /> Hora
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

      {/* Bloques de Evaluación Visual */}
      <div className="space-y-8">
        {SECCIONES.map((sec) => {
          const sectionData = subestacionData[sec.key] || {};

          return (
            <div key={sec.key} className="bg-slate-950/20 border border-slate-800/80 rounded-2xl overflow-hidden shadow-sm print:bg-white print:border-gray-200 print:shadow-none">
              {/* Encabezado Sección */}
              <div className="bg-slate-950/40 px-5 py-4 border-b border-slate-800 flex items-start gap-3 print:bg-slate-50 print:border-gray-200">
                <div className="p-2 bg-slate-900 border border-slate-800 rounded-xl mt-0.5 shadow-inner print:bg-white print:border-gray-300">
                  {sec.icon}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-200 print:text-slate-800">{sec.title}</h3>
                  <p className="text-[10px] text-slate-500 mt-1 print:text-slate-500">{sec.description}</p>
                </div>
              </div>

              {/* Grid / Tabla para los Elementos */}
              <div className="divide-y divide-slate-800/60 print:divide-gray-200">
                {sec.elements.map((elem) => {
                  const item = sectionData[elem.key] || { estado: 'B', observaciones: '' };

                  return (
                    <div key={elem.key} className="p-4 md:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-900/10 transition-all print:bg-white print:text-slate-900">
                      {/* Nombre del Elemento */}
                      <div className="md:w-[35%] flex flex-col">
                        <span className="text-xs font-bold text-slate-200 print:text-slate-800">{elem.label}</span>
                      </div>

                      {/* Botones de Estado (B / R / M) */}
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mr-2 hidden md:inline print:text-slate-500">Estado:</span>
                        <div className="flex bg-slate-900/60 p-1 rounded-xl border border-slate-800/80 shadow-inner print:bg-gray-100 print:border-gray-300 print:shadow-none">
                          {[
                            { value: 'B', label: 'Bueno', color: 'bg-emerald-500 text-slate-950 font-bold', hover: 'hover:text-emerald-400' },
                            { value: 'R', label: 'Regular', color: 'bg-amber-500 text-slate-950 font-bold', hover: 'hover:text-amber-400' },
                            { value: 'M', label: 'Malo', color: 'bg-red-500 text-white font-bold', hover: 'hover:text-red-400' }
                          ].map((opt) => {
                            const isSelected = item.estado === opt.value;
                            return (
                              <button
                                key={opt.value}
                                type="button"
                                onClick={() => updateSectionItem(sec.key, elem.key, 'estado', opt.value)}
                                className={`px-3 py-1.5 text-[10px] rounded-lg font-bold transition-all cursor-pointer ${
                                  isSelected 
                                    ? opt.color + ' shadow-md scale-105 print:shadow-none print:scale-100' 
                                    : 'text-slate-400 hover:bg-slate-800/50 print:text-slate-400 print:hover:bg-transparent ' + opt.hover
                                }`}
                              >
                                {opt.value}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Input de Observaciones */}
                      <div className="flex-1 min-w-[30%]">
                        <input
                          type="text"
                          value={item.observaciones || ''}
                          onChange={(e) => updateSectionItem(sec.key, elem.key, 'observaciones', e.target.value)}
                          className="w-full bg-slate-900/50 border border-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-xl px-3 py-2 text-xs text-slate-100 outline-none h-10 transition-all placeholder-slate-600 font-sans print:bg-white print:text-slate-900 print:border-gray-300 print:placeholder-transparent"
                          placeholder="Observaciones / Hallazgos encontrados..."
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Cierre / Firmas */}
      <div className="bg-slate-950/40 border border-slate-800/80 rounded-2xl p-5 space-y-4 print:bg-slate-50 print:border-gray-200 print:mt-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-900 pb-2.5 print:text-slate-700 print:border-gray-200">
          Firma y Cierre de Inspección
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Firma Inspector */}
          <div className="flex flex-col gap-1.5 items-center text-center">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide print:text-slate-600">Firma del Inspector</span>
            <input
              type="text"
              value={firmaInspector}
              onChange={(e) => updateField('firmaInspector', e.target.value)}
              className="w-full max-w-xs bg-slate-900 border border-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-xl px-3 py-2 text-xs text-slate-100 outline-none h-10 transition-all text-center no-print"
              placeholder="Iniciales o Nombre del Inspector"
            />
            <span className="hidden print:block text-xs font-bold text-slate-900 mt-1 h-6">
              {firmaInspector || '___________________________'}
            </span>
            <div className="hidden print:block w-48 border-b border-gray-400 mt-6 h-1"></div>
          </div>

          {/* Firma / Sello de la Empresa */}
          <div className="flex flex-col gap-1.5 items-center text-center">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide print:text-slate-600">Firma / Sello de la Empresa</span>
            <input
              type="text"
              value={firmaSupervisor}
              onChange={(e) => updateField('firmaSupervisor', e.target.value)}
              className="w-full max-w-xs bg-slate-900 border border-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-xl px-3 py-2 text-xs text-slate-100 outline-none h-10 transition-all text-center no-print"
              placeholder="Nombre / Sello de la Empresa"
            />
            <span className="hidden print:block text-xs font-bold text-slate-900 mt-1 h-6">
              {firmaSupervisor || '___________________________'}
            </span>
            <div className="hidden print:block w-48 border-b border-gray-400 mt-6 h-1"></div>
          </div>
        </div>
      </div>

      {/* Leyenda de Evaluación */}
      <div className="text-[10px] text-slate-500 text-center leading-relaxed border-t border-slate-800 pt-4 font-sans select-none print:border-gray-200 print:text-slate-500">
        <span className="font-bold text-slate-400 uppercase print:text-slate-600">Nota de Evaluación:</span> B = Bueno, R = Regular (Requiere mantenimiento preventivo), M = Malo (Acción correctiva inmediata).
      </div>
    </div>
  );
}
