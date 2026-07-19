import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import useStore from '../store/useStore';
import { 
  ArrowLeft, 
  Layers, 
  Trash2, 
  Search, 
  AlertTriangle,
  X,
  Camera,
  Calendar,
  User,
  Zap,
  Building,
  Cpu,
  ShieldAlert,
  RefreshCw
} from 'lucide-react';

// Componente para renderizar Blobs de forma segura evitando fugas de memoria
const SafeImage = ({ blob, src, alt, className }) => {
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

  return <img src={finalSrc} alt={alt} className={className} />;
};

export const ProyectoView = () => {
  const { companyId, proyectoId } = useParams();
  const navigate = useNavigate();
  
  const { 
    companies, 
    addElementoUnifilar, 
    deleteElementoUnifilar,
    addInspeccionSubestacion,
    deleteSubestacion 
  } = useStore();

  const company = companies.find((c) => c.id === companyId);
  const proyecto = company?.proyectos?.find((p) => p.id === proyectoId);

  // Estados de pestaña activa
  const [activeTab, setActiveTab] = useState('UNIFILAR'); // 'UNIFILAR' | 'ESTRUCTURAL'
  const [searchQuery, setSearchQuery] = useState('');

  // Modales
  const [showElementoModal, setShowElementoModal] = useState(false);
  const [showInspeccionModal, setShowInspeccionModal] = useState(false);

  // Selector de plantilla / tipo de elemento
  const [tipoElemento, setTipoElemento] = useState('TABLERO'); // 'TABLERO' | 'TRANSFORMADOR' | 'GENERADOR' | 'PUESTA_TIERRA' | 'TRANSFER' | 'OTRO'

  // Campos comunes
  const [nombre, setNombre] = useState('');
  const [ubicacion, setUbicacion] = useState('');
  const [alimentadoPor, setAlimentadoPor] = useState('');
  const [observacionesGenerales, setObservacionesGenerales] = useState('');
  const [fotoBlob, setFotoBlob] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  // Campos de Tablero
  const [maxPoles, setMaxPoles] = useState(24);

  // Campos de Transformador
  const [kvaTrafo, setKvaTrafo] = useState('500 KVA');
  const [marcaTrafo, setMarcaTrafo] = useState('General Electric (GE)');
  const [tipoTrafo, setTipoTrafo] = useState('Pedestal'); // 'Pedestal' | 'Seco' | 'Poste'
  const [conexionTrafo, setConexionTrafo] = useState('Estrella - Estrella (Aterrizado)');
  const [voltajePrimario, setVoltajePrimario] = useState('13.8 kV');
  const [voltajeSecundario, setVoltajeSecundario] = useState('208 / 120 V');

  // Campos de Generador
  const [kvaGen, setKvaGen] = useState('580 kVA');
  const [combustibleGen, setCombustibleGen] = useState('DIESEL');
  const [voltajeGen, setVoltajeGen] = useState('208 / 120 V');
  const [potenciaKwGen, setPotenciaKwGen] = useState('464 kW');
  const [amperajeGen, setAmperajeGen] = useState('1600 A');

  // Campos de Puesta a Tierra
  const [resistenciaOhmios, setResistenciaOhmios] = useState('0.5 Ω');
  const [corrienteFuga, setCorrienteFuga] = useState('6.4 A');
  const [tipoMalla, setTipoMalla] = useState('Malla Subestación Concreto');
  const [cableAcometidaTierra, setCableAcometidaTierra] = useState('Sólido #4 Desnudo');

  // Campos de Transfer
  const [capacidadAmperios, setCapacidadAmperios] = useState('3200 A');
  const [tipoTransferencia, setTipoTransferencia] = useState('AUTOMATICA');
  const [tensionOperativa, setTensionOperativa] = useState('208 V');

  // Campos de Otro
  const [descripcionOtro, setDescripcionOtro] = useState('');

  // Campos de Inspección Estructural
  const [subestacionNombre, setSubestacionNombre] = useState('');
  const [subestacionUbicacion, setSubestacionUbicacion] = useState('');
  const [nivelTension, setNivelTension] = useState('13.8 kV');
  const [inspectorName, setInspectorName] = useState('');

  if (!company || !proyecto) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center justify-center p-6 text-center space-y-4 font-sans">
        <AlertTriangle className="w-12 h-12 text-amber-500 animate-pulse" />
        <h2 className="text-lg font-bold">Proyecto o Empresa no encontrado</h2>
        <button 
          onClick={() => navigate(`/empresa/${companyId || ''}`)} 
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs rounded-xl font-bold transition-all shadow-md"
        >
          Volver a la Empresa
        </button>
      </div>
    );
  }

  const elementos = proyecto.elementosUnifilares || proyecto.tableros || [];
  const inspecciones = proyecto.inspeccionesSubestacion || proyecto.subestaciones || [];

  const filteredElementos = elementos.filter((item) =>
    item.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (item.ubicacion && item.ubicacion.toLowerCase().includes(searchQuery.toLowerCase())) ||
    item.tipoElemento.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredInspecciones = inspecciones.filter((item) =>
    item.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (item.ubicacion && item.ubicacion.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (item.inspector && item.inspector.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const nombreElementoDuplicado = elementos.some(
    (e) => e.nombre.toLowerCase().trim() === nombre.toLowerCase().trim()
  );

  const nombreInspeccionDuplicado = inspecciones.some(
    (s) => s.nombre.toLowerCase().trim() === subestacionNombre.toLowerCase().trim()
  );

  const isElementoFormValid = nombre.trim() !== '' && !nombreElementoDuplicado;
  const isInspeccionFormValid = subestacionNombre.trim() !== '' && !nombreInspeccionDuplicado;

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert("La imagen es demasiado grande. Por favor elija una de menos de 2MB.");
      return;
    }

    setFotoBlob(file);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleCreateElemento = (e) => {
    e.preventDefault();
    if (!isElementoFormValid) return;

    let datosTecnicos = {};

    if (tipoElemento === 'TABLERO') {
      datosTecnicos = {
        maxPoles: parseInt(maxPoles, 10),
        barrasPrincipales: { ia: '0', ib: '0', ic: '0' },
        breakerPrincipal: { marca: '', tipo: '', amp: '' },
        voltaje: { va: '208', vb: '205', vc: '205' },
        acometida: '',
        circuits: [],
        neutroLlegada: { calibre: '', observaciones: '' },
        puestaTierra: { calibre: '', observaciones: '' }
      };
    } else if (tipoElemento === 'TRANSFORMADOR') {
      datosTecnicos = {
        kva: kvaTrafo,
        marca: marcaTrafo,
        tipoTransformador: tipoTrafo,
        conexion: conexionTrafo,
        voltajePrimario,
        voltajeSecundario
      };
    } else if (tipoElemento === 'GENERADOR') {
      datosTecnicos = {
        kva: kvaGen,
        combustible: combustibleGen,
        voltajeGeneracion: voltajeGen,
        potenciaKw: potenciaKwGen,
        amperaje: amperajeGen
      };
    } else if (tipoElemento === 'PUESTA_TIERRA') {
      datosTecnicos = {
        resistenciaOhmios,
        corrienteFugaAmperios: corrienteFuga,
        tipoMalla,
        cableAcometida: cableAcometidaTierra
      };
    } else if (tipoElemento === 'TRANSFER') {
      datosTecnicos = {
        capacidadAmperios,
        tipoTransferencia,
        tensionOperativa
      };
    } else {
      datosTecnicos = {
        descripcionEspecificaciones: descripcionOtro
      };
    }

    const result = addElementoUnifilar(proyectoId, {
      nombre: nombre.trim(),
      tipoElemento,
      ubicacion: ubicacion.trim() || 'Sin ubicación',
      alimentadoPor: alimentadoPor.trim() || 'No definido',
      fotoBlob,
      observacionesGenerales: observacionesGenerales.trim(),
      datosTecnicos
    });

    if (result.success) {
      setNombre('');
      setUbicacion('');
      setAlimentadoPor('');
      setObservacionesGenerales('');
      setFotoBlob(null);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      setShowElementoModal(false);
    } else {
      alert(result.error);
    }
  };

  const handleCreateInspeccion = (e) => {
    e.preventDefault();
    if (!isInspeccionFormValid) return;

    const result = addInspeccionSubestacion(proyectoId, {
      nombre: subestacionNombre.trim(),
      ubicacion: subestacionUbicacion.trim() || 'Sin ubicación',
      nivelTension: nivelTension.trim() || 'No definido',
      inspector: inspectorName.trim() || 'No asignado',
      fecha: new Date().toISOString().split('T')[0],
      hora: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
      estadoEntorno: {},
      obrasCiviles: {},
      equiposPrincipales: {},
      puestaTierra: {},
      edificioControl: {}
    });

    if (result.success) {
      setSubestacionNombre('');
      setSubestacionUbicacion('');
      setNivelTension('13.8 kV');
      setInspectorName('');
      setShowInspeccionModal(false);
    } else {
      alert(result.error);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col antialiased font-sans">
      
      {/* Top Header */}
      <header className="bg-slate-950 border-b border-slate-800/80 px-6 py-4 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate(`/empresa/${companyId}`)}
            className="p-2.5 bg-slate-900 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-slate-200 transition-all border border-slate-800 active:scale-95 cursor-pointer"
            title="Volver a la Empresa"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <span className="text-[10px] text-amber-500 font-bold uppercase tracking-wider block">
              Proyecto de: {company.nombre}
            </span>
            <h1 className="text-lg font-bold text-slate-100 tracking-tight">{proyecto.nombre}</h1>
            {proyecto.descripcion && (
              <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{proyecto.descripcion}</p>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8 space-y-6">
        
        {/* Navigation & Control Panel */}
        <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 pb-6 border-b border-slate-800/80">
          
          {/* Pestañas de Selección de Rama */}
          <div className="flex bg-slate-950 p-1.5 rounded-2xl border border-slate-800 self-start">
            <button
              onClick={() => setActiveTab('UNIFILAR')}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'UNIFILAR' 
                  ? 'bg-amber-500 text-slate-950 shadow-md' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Zap className="w-4 h-4" /> Diagrama Unifilar
            </button>
            <button
              onClick={() => setActiveTab('ESTRUCTURAL')}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'ESTRUCTURAL' 
                  ? 'bg-amber-500 text-slate-950 shadow-md' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Building className="w-4 h-4" /> Inspección Estructural
            </button>
          </div>

          {/* Buscador & Botones en Paralelo */}
          <div className="flex flex-wrap md:flex-nowrap items-center gap-3 justify-end w-full md:w-auto">
            
            {/* Buscador */}
            <div className="relative w-full md:w-60">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar en esta sección..."
                className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none h-10 transition-all"
              />
              <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
            </div>

            {/* DOS BOTONES DE CREACIÓN EN PARALELO CON CLASES UNIFICADAS AMARILLAS RECTANGULARES */}
            <div className="flex flex-row items-center gap-3 w-full md:w-auto justify-end">
              <button
                onClick={() => {
                  setTipoElemento('TABLERO');
                  setShowElementoModal(true);
                }}
                className="bg-amber-500 text-slate-950 font-semibold hover:bg-amber-400 active:scale-98 transition-all px-4 py-2.5 rounded-lg flex flex-row items-center justify-center gap-2 h-10 whitespace-nowrap w-full md:w-auto cursor-pointer"
              >
                <Zap className="w-4.5 h-4.5" /> + Crear Elemento
              </button>

              <button
                onClick={() => setShowInspeccionModal(true)}
                className="bg-amber-500 text-slate-950 font-semibold hover:bg-amber-400 active:scale-98 transition-all px-4 py-2.5 rounded-lg flex flex-row items-center justify-center gap-2 h-10 whitespace-nowrap w-full md:w-auto cursor-pointer"
              >
                <Building className="w-4.5 h-4.5" /> + Crear Inspección
              </button>
            </div>
          </div>
        </div>

        {/* CONTENIDO DE PESTAÑA A: INSPECCIÓN ESTRUCTURAL */}
        {activeTab === 'ESTRUCTURAL' && (
          <div>
            <div className="mb-4">
              <h2 className="text-md font-bold text-slate-200">Fichas de Inspección Estructural y Entorno</h2>
              <p className="text-xs text-slate-500">Inspección de obras civiles, cerramiento y condiciones perimetrales de subestaciones.</p>
            </div>

            {filteredInspecciones.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredInspecciones.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => navigate(`/empresa/${companyId}/tablero/${item.id}`)}
                    className="bg-slate-950 border border-slate-800/80 hover:border-slate-700/60 rounded-2xl shadow-md hover:shadow-xl flex flex-col justify-between overflow-hidden cursor-pointer transition-all hover:-translate-y-0.5 group"
                  >
                    <div className="h-32 w-full bg-gradient-to-br from-slate-900 to-slate-900/40 relative flex flex-col items-center justify-center border-b border-slate-900/50 select-none">
                      <Building className="w-9 h-9 text-amber-500/70 group-hover:scale-105 transition-transform duration-500" />
                      <span className="text-[9px] uppercase font-bold tracking-widest opacity-35 mt-2">Inspección Visual</span>
                      
                      <div className="absolute top-3 left-3">
                        <span className="px-2 py-0.5 rounded-lg text-[9px] font-bold bg-amber-950/90 text-amber-400 border border-amber-800/30 font-mono">
                          🏢 SUBESTACIÓN
                        </span>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm(`¿Estás seguro de que deseas eliminar la inspección "${item.nombre}"?`)) {
                            deleteSubestacion(proyectoId, item.id);
                          }
                        }}
                        className="absolute top-3 right-3 p-1.5 bg-slate-950/80 hover:bg-red-950/80 text-slate-400 hover:text-red-400 rounded-lg opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                        title="Eliminar Inspección"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="p-5 flex-1 flex flex-col justify-between">
                      <div className="space-y-1">
                        <h3 className="text-sm font-bold text-slate-100 group-hover:text-amber-500 transition-colors truncate">
                          {item.nombre}
                        </h3>
                        <div className="space-y-1 mt-3 text-[11px] text-slate-400 border-t border-slate-900/60 pt-3">
                          <p className="truncate"><span className="text-slate-500 font-bold">Ubicación:</span> {item.ubicacion}</p>
                          <p className="truncate"><span className="text-slate-500 font-bold">Tensión:</span> {item.nivelTension}</p>
                          <p className="truncate flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-slate-600 shrink-0" /><span className="text-slate-500 font-bold">Fecha:</span> {item.fecha}</p>
                          <p className="truncate flex items-center gap-1.5"><User className="w-3.5 h-3.5 text-slate-600 shrink-0" /><span className="text-slate-500 font-bold">Inspector:</span> {item.inspector}</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between mt-5 text-[10px] bg-slate-900/40 p-2.5 rounded-xl border border-slate-800/60">
                        <span className="text-slate-400 font-medium">Evaluación:</span>
                        <span className="font-bold text-amber-500">6 Secciones Estructurales</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-16 border-2 border-dashed border-slate-800 rounded-2xl text-center space-y-4 bg-slate-950/20">
                <Building className="w-12 h-12 text-slate-700 mx-auto" />
                <div className="space-y-1 font-sans">
                  <h3 className="text-sm font-bold text-slate-400">No hay inspecciones civiles</h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Crea una ficha de Inspección Estructural de Subestación para evaluar obras civiles.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* CONTENIDO DE PESTAÑA B: DIAGRAMA UNIFILAR */}
        {activeTab === 'UNIFILAR' && (
          <div>
            <div className="mb-4">
              <h2 className="text-md font-bold text-slate-200">Equipos Registrados en el Diagrama Unifilar</h2>
              <p className="text-xs text-slate-500">Tableros, Transformadores, Generadores, Malla de Puesta a Tierra y Unidades de Transferencia.</p>
            </div>

            {filteredElementos.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredElementos.map((item) => {
                  const isTablero = item.tipoElemento === 'TABLERO';
                  const isTrafo = item.tipoElemento === 'TRANSFORMADOR';
                  const isGen = item.tipoElemento === 'GENERADOR';
                  const isPuestaTierra = item.tipoElemento === 'PUESTA_TIERRA';
                  const isTransfer = item.tipoElemento === 'TRANSFER';

                  return (
                    <div
                      key={item.id}
                      onClick={() => navigate(`/empresa/${companyId}/tablero/${item.id}`)}
                      className="bg-slate-950 border border-slate-800/80 hover:border-slate-700/60 rounded-2xl shadow-md hover:shadow-xl flex flex-col justify-between overflow-hidden cursor-pointer transition-all hover:-translate-y-0.5 group"
                    >
                      {/* Cabecera de Tarjeta */}
                      <div className="h-32 w-full bg-slate-900 relative overflow-hidden flex items-center justify-center border-b border-slate-900/50">
                        {item.fotoBlob || item.foto ? (
                          <SafeImage 
                            blob={item.fotoBlob}
                            src={item.foto} 
                            alt={item.nombre} 
                            className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-500" 
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center text-slate-700 gap-1.5 select-none">
                            {isTablero && <Zap className="w-8 h-8 opacity-25 text-sky-400" />}
                            {isTrafo && <Cpu className="w-8 h-8 opacity-25 text-purple-400" />}
                            {isGen && <Zap className="w-8 h-8 opacity-25 text-amber-400" />}
                            {isPuestaTierra && <ShieldAlert className="w-8 h-8 opacity-25 text-teal-400" />}
                            {isTransfer && <RefreshCw className="w-8 h-8 opacity-25 text-emerald-400" />}
                            {!isTablero && !isTrafo && !isGen && !isPuestaTierra && !isTransfer && <Layers className="w-8 h-8 opacity-25 text-slate-400" />}
                            <span className="text-[9px] uppercase font-bold tracking-widest opacity-30">Sin Imagen</span>
                          </div>
                        )}
                        
                        {/* Badge por tipoElemento */}
                        <div className="absolute top-3 left-3">
                          {isTablero && (
                            <span className="px-2.5 py-0.5 rounded-lg text-[9px] font-bold bg-sky-950/95 text-sky-400 border border-sky-800/40 font-mono">
                              ⚡ TABLERO
                            </span>
                          )}
                          {isTrafo && (
                            <span className="px-2.5 py-0.5 rounded-lg text-[9px] font-bold bg-purple-950/95 text-purple-400 border border-purple-800/40 font-mono">
                              ⚡ TRANSFORMADOR
                            </span>
                          )}
                          {isGen && (
                            <span className="px-2.5 py-0.5 rounded-lg text-[9px] font-bold bg-amber-950/95 text-amber-400 border border-amber-800/40 font-mono">
                              ⚡ GENERADOR
                            </span>
                          )}
                          {isPuestaTierra && (
                            <span className="px-2.5 py-0.5 rounded-lg text-[9px] font-bold bg-teal-950/95 text-teal-400 border border-teal-800/40 font-mono">
                              🛡️ PUESTA A TIERRA
                            </span>
                          )}
                          {isTransfer && (
                            <span className="px-2.5 py-0.5 rounded-lg text-[9px] font-bold bg-emerald-950/95 text-emerald-400 border border-emerald-800/40 font-mono">
                              🔄 TRANSFER
                            </span>
                          )}
                        </div>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm(`¿Estás seguro de que deseas eliminar el elemento "${item.nombre}"?`)) {
                              deleteElementoUnifilar(proyectoId, item.id);
                            }
                          }}
                          className="absolute top-3 right-3 p-1.5 bg-slate-950/80 hover:bg-red-950/80 text-slate-400 hover:text-red-400 rounded-lg opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                          title="Eliminar Elemento"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Contenido de Tarjeta */}
                      <div className="p-5 flex-1 flex flex-col justify-between">
                        <div className="space-y-1">
                          <h3 className="text-sm font-bold text-slate-100 group-hover:text-amber-500 transition-colors truncate">
                            {item.nombre}
                          </h3>
                          
                          <div className="space-y-1 mt-3 text-[11px] text-slate-400 border-t border-slate-900/60 pt-3">
                            <p className="truncate"><span className="text-slate-500 font-bold">Ubicación:</span> {item.ubicacion}</p>
                            <p className="truncate"><span className="text-slate-500 font-bold">Alimentado por:</span> {item.alimentadoPor || 'No definido'}</p>

                            {/* Mostrar campos representativos del informe técnico */}
                            {isTablero && (
                              <p><span className="text-slate-500 font-bold">Capacidad:</span> {item.datosTecnicos?.maxPoles || 24} Polos</p>
                            )}
                            {isTrafo && (
                              <p><span className="text-slate-500 font-bold">Potencia:</span> {item.datosTecnicos?.kva || '500 KVA'} ({item.datosTecnicos?.conexion || 'Estrella'})</p>
                            )}
                            {isGen && (
                              <p><span className="text-slate-500 font-bold">Potencia / Comb:</span> {item.datosTecnicos?.kva || '580 kVA'} - {item.datosTecnicos?.combustible || 'Diésel'}</p>
                            )}
                            {isPuestaTierra && (
                              <p><span className="text-slate-500 font-bold">Corriente Fuga:</span> <span className="text-amber-400 font-bold">{item.datosTecnicos?.corrienteFugaAmperios || '0 A'}</span></p>
                            )}
                            {isTransfer && (
                              <p><span className="text-slate-500 font-bold">Capacidad / Tipo:</span> {item.datosTecnicos?.capacidadAmperios || '3200A'} ({item.datosTecnicos?.tipoTransferencia || 'ATS'})</p>
                            )}
                          </div>
                        </div>

                        {/* Footer */}
                        {isTablero ? (
                          <div className="flex items-center justify-between mt-5 text-[10px] bg-slate-900/40 p-2.5 rounded-xl border border-slate-800/60">
                            <span className="text-slate-400 font-medium">Circuitos Registrados:</span>
                            <span className="font-bold text-sky-400 font-mono">
                              {item.datosTecnicos?.circuits?.length || 0} de {item.datosTecnicos?.maxPoles || 24}
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between mt-5 text-[10px] bg-slate-900/40 p-2.5 rounded-xl border border-slate-800/60">
                            <span className="text-slate-400 font-medium">Ficha Técnica:</span>
                            <span className="font-bold text-amber-500">Parámetros Completos</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-16 border-2 border-dashed border-slate-800 rounded-2xl text-center space-y-4 bg-slate-950/20">
                <Zap className="w-12 h-12 text-slate-700 mx-auto" />
                <div className="space-y-1 font-sans">
                  <h3 className="text-sm font-bold text-slate-400">No hay equipos registrados</h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Registra un Tablero, Transformador, Generador, Puesta a Tierra o Transfer en este proyecto.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

      </main>

      {/* MODAL MULTI-PLANTILLA DE ELEMENTOS UNIFILARES */}
      {showElementoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setShowElementoModal(false)} />
          
          <div className="relative w-full max-w-md bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl p-6 overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center pb-4 border-b border-slate-800 shrink-0">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-500" /> Registrar Plantilla Técnica
              </h3>
              <button 
                onClick={() => setShowElementoModal(false)}
                className="p-1.5 hover:bg-slate-900 rounded-lg text-slate-500 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateElemento} className="mt-4 space-y-4 overflow-y-auto pr-1 flex-1">
              
              {/* Selector de Tipo de Plantilla */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">
                  Tipo de Plantilla de Elemento
                </label>
                <div className="grid grid-cols-3 gap-1.5 bg-slate-900 p-1.5 rounded-xl border border-slate-800 text-[9px]">
                  {[
                    { id: 'TABLERO', label: 'TABLERO' },
                    { id: 'TRANSFORMADOR', label: 'TRAFO' },
                    { id: 'GENERADOR', label: 'GENERADOR' },
                    { id: 'PUESTA_TIERRA', label: 'P. TIERRA' },
                    { id: 'TRANSFER', label: 'TRANSFER' },
                    { id: 'OTRO', label: 'OTRO' }
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTipoElemento(t.id)}
                      className={`py-1.5 px-2 font-black rounded-lg transition-all text-center truncate ${
                        tipoElemento === t.id 
                          ? 'bg-amber-500 text-slate-950' 
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Nombre descriptivo */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">
                  Nombre descriptivo del equipo
                </label>
                <input
                  type="text"
                  required
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder={`Ej. ${tipoElemento === 'TABLERO' ? 'Tablero Principal (TAB 20)' : tipoElemento === 'TRANSFORMADOR' ? 'Transformador GE 500 KVA' : tipoElemento === 'PUESTA_TIERRA' ? 'Malla Puesta a Tierra N° 1' : 'Generador DOMOSA 1'}`}
                  className={`w-full px-3.5 py-2 bg-slate-900 border focus:ring-1 rounded-xl text-sm text-slate-100 focus:outline-none h-11 transition-all ${
                    nombreElementoDuplicado 
                      ? 'border-red-500 focus:border-red-500 focus:ring-red-500' 
                      : 'border-slate-800 focus:border-amber-500 focus:ring-amber-500'
                  }`}
                />
                {nombreElementoDuplicado && (
                  <p className="text-[10px] text-red-550 font-bold flex items-center gap-1.5 mt-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" /> Nombre duplicado: ya existe este equipo en el proyecto.
                  </p>
                )}
              </div>

              {/* Ubicación */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">
                  Ubicación Física
                </label>
                <input
                  type="text"
                  value={ubicacion}
                  onChange={(e) => setUbicacion(e.target.value)}
                  placeholder="Ej. Sótano Sala Técnica o Estacionamiento Exterior"
                  className="w-full px-3.5 py-2 bg-slate-900 border border-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-xl text-sm text-slate-100 focus:outline-none placeholder-slate-600 h-11 transition-all"
                />
              </div>

              {/* Alimentación */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">
                  Alimentado Por (Procedencia)
                </label>
                <input
                  type="text"
                  value={alimentadoPor}
                  onChange={(e) => setAlimentadoPor(e.target.value)}
                  placeholder="Ej. Transformador 500 KVA o CORPOELEC"
                  className="w-full px-3.5 py-2 bg-slate-900 border border-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-xl text-sm text-slate-100 focus:outline-none placeholder-slate-600 h-11 transition-all"
                />
              </div>

              {/* CAMPOS ESPECÍFICOS SEGÚN EL ENUM */}

              {/* TABLERO */}
              {tipoElemento === 'TABLERO' && (
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">
                    Número Máximo de Polos
                  </label>
                  <select
                    value={maxPoles}
                    onChange={(e) => setMaxPoles(parseInt(e.target.value, 10))}
                    className="w-full px-3 py-2.5 bg-slate-900 border border-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-xl text-sm text-slate-100 focus:outline-none h-11"
                  >
                    <option value={12}>12 Polos</option>
                    <option value={24}>24 Polos</option>
                    <option value={30}>30 Polos</option>
                    <option value={42}>42 Polos</option>
                    <option value={60}>60 Polos</option>
                  </select>
                </div>
              )}

              {/* TRANSFORMADOR */}
              {tipoElemento === 'TRANSFORMADOR' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Potencia KVA</label>
                      <input type="text" value={kvaTrafo} onChange={(e) => setKvaTrafo(e.target.value)} placeholder="Ej. 500 KVA" className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-100 h-10 font-mono" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Marca</label>
                      <input type="text" value={marcaTrafo} onChange={(e) => setMarcaTrafo(e.target.value)} placeholder="Ej. GE" className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-100 h-10" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Tipo Transformador</label>
                      <select value={tipoTrafo} onChange={(e) => setTipoTrafo(e.target.value)} className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-100 h-10">
                        <option value="Pedestal">Pedestal</option>
                        <option value="Seco">Seco / Uso Interior</option>
                        <option value="Poste">Montaje en Poste</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Conexión</label>
                      <input type="text" value={conexionTrafo} onChange={(e) => setConexionTrafo(e.target.value)} placeholder="Ej. Estrella - Estrella" className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-100 h-10" />
                    </div>
                  </div>
                </div>
              )}

              {/* GENERADOR */}
              {tipoElemento === 'GENERADOR' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Capacidad kVA</label>
                      <input type="text" value={kvaGen} onChange={(e) => setKvaGen(e.target.value)} placeholder="Ej. 580 kVA" className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-100 h-10 font-mono" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Combustible</label>
                      <select value={combustibleGen} onChange={(e) => setCombustibleGen(e.target.value)} className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-100 h-10">
                        <option value="DIESEL">DIÉSEL / GASOIL</option>
                        <option value="GAS">GAS NATURAL</option>
                        <option value="GASOLINA">GASOLINA</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Voltaje Generación</label>
                      <input type="text" value={voltajeGen} onChange={(e) => setVoltajeGen(e.target.value)} placeholder="Ej. 208 / 120 V" className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-100 h-10 font-mono" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Interruptor Amperaje</label>
                      <input type="text" value={amperajeGen} onChange={(e) => setAmperajeGen(e.target.value)} placeholder="Ej. 1600 A" className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-100 h-10 font-mono" />
                    </div>
                  </div>
                </div>
              )}

              {/* PUESTA A TIERRA */}
              {tipoElemento === 'PUESTA_TIERRA' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Resistencia (Ω)</label>
                      <input type="text" value={resistenciaOhmios} onChange={(e) => setResistenciaOhmios(e.target.value)} placeholder="Ej. 0.5 Ω" className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-100 h-10 font-mono" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Corriente Fuga (A)</label>
                      <input type="text" value={corrienteFuga} onChange={(e) => setCorrienteFuga(e.target.value)} placeholder="Ej. 6.4 A" className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-100 h-10 font-mono text-amber-400" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Tipo de Malla / Ubicación</label>
                    <input type="text" value={tipoMalla} onChange={(e) => setTipoMalla(e.target.value)} placeholder="Ej. Malla debajo de concreto" className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-100 h-10" />
                  </div>
                </div>
              )}

              {/* TRANSFER */}
              {tipoElemento === 'TRANSFER' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Capacidad Amperios</label>
                    <input type="text" value={capacidadAmperios} onChange={(e) => setCapacidadAmperios(e.target.value)} placeholder="Ej. 3200 A" className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-100 h-10 font-mono" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Tipo Transferencia</label>
                    <select value={tipoTransferencia} onChange={(e) => setTipoTransferencia(e.target.value)} className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-100 h-10">
                      <option value="AUTOMATICA">AUTOMÁTICA (ATS)</option>
                      <option value="MANUAL">MANUAL (MTS)</option>
                    </select>
                  </div>
                </div>
              )}

              {/* OTRO */}
              {tipoElemento === 'OTRO' && (
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">
                    Especificaciones Técnicas
                  </label>
                  <textarea value={descripcionOtro} onChange={(e) => setDescripcionOtro(e.target.value)} rows={3} placeholder="Detalles técnicos adicionales..." className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none resize-none" />
                </div>
              )}

              {/* Observaciones generales */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">
                  Observaciones del Informe Técnico
                </label>
                <textarea
                  value={observacionesGenerales}
                  onChange={(e) => setObservacionesGenerales(e.target.value)}
                  rows={2}
                  placeholder="Detalles del estado de mantenimiento, polvo, humedad o recomendaciones..."
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-xl text-xs text-slate-100 focus:outline-none placeholder-slate-650 transition-all resize-none"
                />
              </div>

              {/* Foto Offline Blob */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                  <Camera className="w-4 h-4 text-amber-500" />
                  Foto o Imagen de la Placa Técnico
                </label>
                
                {previewUrl ? (
                  <div className="relative rounded-xl overflow-hidden border border-slate-800 bg-slate-900 aspect-video flex items-center justify-center group shadow-md shrink-0">
                    <img src={previewUrl} alt="Vista previa" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => {
                        setFotoBlob(null);
                        if (previewUrl) URL.revokeObjectURL(previewUrl);
                        setPreviewUrl(null);
                      }}
                      className="absolute top-2 right-2 p-1.5 bg-slate-950/80 hover:bg-red-650 text-white rounded-lg cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-center w-full">
                    <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-slate-800 border-dashed rounded-xl cursor-pointer bg-slate-900/20 hover:bg-slate-900/40 hover:border-slate-700 transition-all select-none">
                      <div className="flex flex-col items-center justify-center pt-3 pb-3">
                        <Camera className="w-5 h-5 text-slate-500 mb-1" />
                        <p className="text-[11px] text-slate-450">
                          <span className="font-bold">Tomar Foto</span> o subir
                        </p>
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={handleImageChange}
                        className="hidden"
                      />
                    </label>
                  </div>
                )}
              </div>

              {/* Botones de acción con estilo amarillo unificado */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-900 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowElementoModal(false)}
                  className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-xs font-bold rounded-lg text-slate-300 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!isElementoFormValid}
                  className="bg-amber-500 text-slate-950 font-semibold hover:bg-amber-400 active:scale-98 transition-all px-4 py-2.5 rounded-lg flex flex-row items-center justify-center gap-2 h-10 whitespace-nowrap text-xs cursor-pointer shadow-md disabled:opacity-40"
                >
                  Guardar Plantilla
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* MODAL FICHA DE INSPECCIÓN ESTRUCTURAL */}
      {showInspeccionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setShowInspeccionModal(false)} />
          
          <div className="relative w-full max-w-md bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl p-6 overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center pb-4 border-b border-slate-800">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
                <Building className="w-4 h-4 text-amber-500" /> Registrar Inspección Estructural Subestación
              </h3>
              <button 
                onClick={() => setShowInspeccionModal(false)}
                className="p-1.5 hover:bg-slate-900 rounded-lg text-slate-500 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateInspeccion} className="mt-4 space-y-4">
              
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">
                  Nombre de la Subestación
                </label>
                <input
                  type="text"
                  required
                  value={subestacionNombre}
                  onChange={(e) => setSubestacionNombre(e.target.value)}
                  placeholder="Ej. Subestación Principal Sótano 2"
                  className={`w-full px-3.5 py-2 bg-slate-900 border focus:ring-1 rounded-xl text-sm text-slate-100 focus:outline-none h-11 transition-all ${
                    nombreInspeccionDuplicado 
                      ? 'border-red-500 focus:border-red-500 focus:ring-red-500' 
                      : 'border-slate-800 focus:border-amber-500 focus:ring-amber-500'
                  }`}
                />
                {nombreInspeccionDuplicado && (
                  <p className="text-[10px] text-red-550 font-bold flex items-center gap-1.5 mt-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" /> Nombre duplicado: ya existe esta subestación registrada.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">
                  Ubicación Física
                </label>
                <input
                  type="text"
                  value={subestacionUbicacion}
                  onChange={(e) => setSubestacionUbicacion(e.target.value)}
                  placeholder="Ej. Patio de Transformadores Norte"
                  className="w-full px-3.5 py-2 bg-slate-900 border border-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-xl text-sm text-slate-100 focus:outline-none placeholder-slate-600 h-11 transition-all"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">
                  Nivel de Tensión (kV)
                </label>
                <input
                  type="text"
                  value={nivelTension}
                  onChange={(e) => setNivelTension(e.target.value)}
                  placeholder="Ej. 13.8 kV, 4.16 kV"
                  className="w-full px-3.5 py-2 bg-slate-900 border border-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-xl text-sm text-slate-100 focus:outline-none h-11 font-mono"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">
                  Nombre del Inspector Encargado
                </label>
                <input
                  type="text"
                  value={inspectorName}
                  onChange={(e) => setInspectorName(e.target.value)}
                  placeholder="Ej. Ing. Juan Carlos"
                  className="w-full px-3.5 py-2 bg-slate-900 border border-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-xl text-sm text-slate-100 focus:outline-none placeholder-slate-600 h-11 transition-all"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-900">
                <button
                  type="button"
                  onClick={() => setShowInspeccionModal(false)}
                  className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-xs font-bold rounded-lg text-slate-300 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!isInspeccionFormValid}
                  className="bg-amber-500 text-slate-950 font-semibold hover:bg-amber-400 active:scale-98 transition-all px-4 py-2.5 rounded-lg flex flex-row items-center justify-center gap-2 h-10 whitespace-nowrap text-xs cursor-pointer shadow-md disabled:opacity-40"
                >
                  Crear Ficha
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default ProyectoView;
