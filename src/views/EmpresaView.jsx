import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import useStore from '../store/useStore';
import { 
  ArrowLeft, 
  Layers, 
  Plus, 
  Trash2, 
  Search, 
  AlertTriangle,
  FolderOpen,
  Sliders,
  CheckCircle2,
  X,
  Camera,
  Shield,
  Clock,
  User,
  Calendar
} from 'lucide-react';

// Componente para renderizar Blobs de forma segura evitando fugas de memoria
export const SafeImage = ({ blob, src, alt, className }) => {
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

export const EmpresaView = () => {
  const { companyId } = useParams();
  const navigate = useNavigate();
  const { 
    companies, 
    addTablero, 
    deleteTablero,
    addInspeccionSubestacion,
    deleteSubestacion 
  } = useStore();
  
  const company = companies.find((c) => c.id === companyId);
  
  // Modales de control
  const [showModal, setShowModal] = useState(false);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [tipoPlantillaSelected, setTipoPlantillaSelected] = useState('TABLERO_TERMOGRAFIA'); // 'TABLERO_TERMOGRAFIA' | 'INSPECCION_SUBESTACION'
  const [searchQuery, setSearchQuery] = useState('');

  // Form states comunes
  const [tableroId, setTableroId] = useState('');
  const [tableroNombre, setTableroNombre] = useState('');
  const [ubicacion, setUbicacion] = useState('');
  const [alimentadoPor, setAlimentadoPor] = useState(''); // Reutilizado como Nivel de Tensión para Subestaciones
  const [maxPoles, setMaxPoles] = useState(24);
  const [fotoBlob, setFotoBlob] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  
  // Campos específicos de subestaciones
  const [inspectorName, setInspectorName] = useState('');

  if (!company) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center justify-center p-6 text-center space-y-4">
        <AlertTriangle className="w-12 h-12 text-amber-500" />
        <h2 className="text-lg font-bold">Empresa no encontrada</h2>
        <button onClick={() => navigate('/')} className="px-4 py-2 bg-slate-800 rounded-lg text-xs">
          Volver al Dashboard
        </button>
      </div>
    );
  }

  // Combinación y ordenamiento de ambos tipos de inspecciones
  const combinedItems = [
    ...(company.tableros || []).map(t => ({ ...t, tipoEntidad: 'TABLERO' })),
    ...(company.subestaciones || []).map(s => ({ ...s, tipoEntidad: 'SUBESTACION' }))
  ];

  // Filtrado de búsqueda
  const filteredItems = combinedItems.filter((item) =>
    item.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (item.ubicacion && item.ubicacion.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Validaciones en tiempo real para Tableros
  const idDuplicado = (company.tableros || []).some(
    (t) => t.id.toLowerCase().trim() === tableroId.toLowerCase().trim()
  );
  
  const nombreDuplicado = (company.tableros || []).some(
    (t) => t.nombre.toLowerCase().trim() === tableroNombre.toLowerCase().trim()
  ) || (company.subestaciones || []).some(
    (s) => s.nombre.toLowerCase().trim() === tableroNombre.toLowerCase().trim()
  );

  // Validación de formulario dinámico
  const isValid = tipoPlantillaSelected === 'INSPECCION_SUBESTACION'
    ? tableroNombre.trim() !== '' && !nombreDuplicado
    : tableroId.trim() !== '' && tableroNombre.trim() !== '' && !idDuplicado && !nombreDuplicado;

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert("La imagen es demasiado grande. Por favor elija una de menos de 2MB.");
      return;
    }

    setFotoBlob(file);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleCreateInspeccion = (e) => {
    e.preventDefault();
    if (!isValid) return;

    if (tipoPlantillaSelected === 'INSPECCION_SUBESTACION') {
      const result = addInspeccionSubestacion(companyId, {
        nombre: tableroNombre.trim(),
        ubicacion: ubicacion.trim() || 'Sin ubicación',
        nivelTension: alimentadoPor.trim() || 'No definido',
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
        // Resetear formulario
        setTableroNombre('');
        setUbicacion('');
        setAlimentadoPor('');
        setInspectorName('');
        setShowModal(false);
      } else {
        alert(result.error);
      }
    } else {
      const result = addTablero(companyId, {
        id: tableroId.trim(),
        nombre: tableroNombre.trim(),
        ubicacion: ubicacion.trim() || 'Sin ubicación',
        maxPoles: parseInt(maxPoles, 10),
        alimentadoPor: alimentadoPor.trim(),
        fotoBlob,
        circuits: []
      });

      if (result.success) {
        setTableroId('');
        setTableroNombre('');
        setUbicacion('');
        setAlimentadoPor('');
        setFotoBlob(null);
        if (previewUrl) {
          URL.revokeObjectURL(previewUrl);
        }
        setPreviewUrl(null);
        setMaxPoles(24);
        setShowModal(false);
      } else {
        alert(result.error);
      }
    }
  };

  const openFormWithTemplate = (tipo) => {
    setTipoPlantillaSelected(tipo);
    setShowTemplateSelector(false);
    setShowModal(true);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col antialiased">
      
      {/* Top Header */}
      <header className="bg-slate-950 border-b border-slate-800 px-6 py-4 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate('/')}
            className="p-2 hover:bg-slate-900 rounded-xl text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <span className="text-[10px] text-amber-500 font-bold uppercase tracking-wider">Gestión de Empresa</span>
            <h1 className="text-base font-bold text-slate-100">{company.nombre}</h1>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8 space-y-6">
        
        {/* Actions panel */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-slate-800">
          <div>
            <h2 className="text-xl font-extrabold text-slate-100 tracking-wide flex items-center gap-2">
              <FolderOpen className="w-5 h-5 text-amber-500" /> Inspecciones Registradas ({combinedItems.length})
            </h2>
            <p className="text-xs text-slate-400 mt-1">Crea nuevas inspecciones en campo o selecciona un registro existente para editar.</p>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {/* Buscador */}
            <div className="relative w-full md:w-64">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar inspección..."
                className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-xl text-xs text-slate-100 placeholder-slate-600 focus:outline-none h-10"
              />
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-600" />
            </div>

            <button
              onClick={() => setShowTemplateSelector(true)}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs shadow-md active:scale-95 transition-all cursor-pointer w-full md:w-auto"
            >
              <Plus className="w-4 h-4" /> Crear Inspección
            </button>
          </div>
        </div>

        {/* Grid de Inspecciones */}
        {filteredItems.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                onClick={() => navigate(`/empresa/${company.id}/tablero/${item.id}`)}
                className="bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-2xl shadow-md hover:shadow-lg flex flex-col justify-between overflow-hidden cursor-pointer transition-all hover:translate-y-[-2px] group"
              >
                {/* Header visual de Tarjeta */}
                {item.tipoEntidad === 'TABLERO' ? (
                  <div className="h-32 w-full bg-slate-900 relative overflow-hidden flex items-center justify-center border-b border-slate-900/60">
                    {item.fotoBlob || item.foto ? (
                      <SafeImage 
                        blob={item.fotoBlob}
                        src={item.foto} 
                        alt={item.nombre} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-slate-700 gap-1 select-none">
                        <Layers className="w-8 h-8 opacity-30" />
                        <span className="text-[9px] uppercase font-bold tracking-widest opacity-35">Sin Foto</span>
                      </div>
                    )}
                    
                    {/* Badge Tipo Plantilla */}
                    <div className="absolute top-3 left-3 flex gap-2">
                      <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-slate-950/80 text-amber-500 border border-amber-500/20 font-mono backdrop-blur-sm">
                        TABLERO
                      </span>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm(`¿Estás seguro de que deseas eliminar permanentemente el tablero "${item.nombre}"?`)) {
                          deleteTablero(company.id, item.id);
                        }
                      }}
                      className="absolute top-3 right-3 p-1.5 bg-slate-950/85 hover:bg-red-950/80 text-slate-400 hover:text-red-400 rounded-lg backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                      title="Eliminar Tablero"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  // Layout para Subestaciones (Icono Grande)
                  <div className="h-32 w-full bg-slate-900/80 relative flex flex-col items-center justify-center border-b border-slate-900/60 select-none">
                    <Shield className="w-10 h-10 text-amber-500 opacity-60 group-hover:scale-110 transition-transform duration-500" />
                    <span className="text-[9px] uppercase font-bold tracking-widest opacity-40 mt-1">Inspección Visual</span>
                    
                    {/* Badge Tipo Plantilla */}
                    <div className="absolute top-3 left-3 flex gap-2">
                      <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-slate-950/80 text-amber-500 border border-amber-500/20 font-mono backdrop-blur-sm">
                        SUBESTACIÓN
                      </span>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm(`¿Estás seguro de que deseas eliminar permanentemente la inspección de subestación "${item.nombre}"?`)) {
                          deleteSubestacion(company.id, item.id);
                        }
                      }}
                      className="absolute top-3 right-3 p-1.5 bg-slate-950/85 hover:bg-red-950/80 text-slate-400 hover:text-red-400 rounded-lg backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                      title="Eliminar Inspección"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* Contenido de la Tarjeta */}
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-100 group-hover:text-amber-400 transition-colors truncate">
                      {item.nombre}
                    </h3>
                    
                    {item.tipoEntidad === 'TABLERO' ? (
                      <div className="space-y-1.5 mt-3 text-[11px] text-slate-400 border-t border-slate-900 pt-3">
                        <p className="truncate"><span className="text-slate-500 font-bold font-sans">Ubicación:</span> {item.ubicacion}</p>
                        <p className="truncate"><span className="text-slate-500 font-bold font-sans">Alimentado por:</span> {item.alimentadoPor || 'No definido'}</p>
                        <p><span className="text-slate-500 font-bold font-sans">Capacidad:</span> {item.maxPoles} polos</p>
                      </div>
                    ) : (
                      <div className="space-y-1.5 mt-3 text-[11px] text-slate-400 border-t border-slate-900 pt-3">
                        <p className="truncate flex items-center gap-1"><Calendar className="w-3 h-3 text-slate-600 shrink-0" /><span className="text-slate-500 font-bold">Fecha:</span> {item.fecha}</p>
                        <p className="truncate flex items-center gap-1"><User className="w-3 h-3 text-slate-600 shrink-0" /><span className="text-slate-500 font-bold">Inspector:</span> {item.inspector}</p>
                        <p className="truncate"><span className="text-slate-500 font-bold">Tensión:</span> {item.nivelTension}</p>
                      </div>
                    )}
                  </div>

                  {item.tipoEntidad === 'TABLERO' ? (
                    <div className="flex items-center justify-between mt-5 text-[10px] bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                      <span className="text-slate-400 font-medium">Circuitos Registrados:</span>
                      <span className="font-bold text-amber-500 font-mono">
                        {item.circuits?.length || 0} de {item.maxPoles}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between mt-5 text-[10px] bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                      <span className="text-slate-400 font-medium">Evaluación Completa:</span>
                      <span className="font-bold text-amber-500">
                        Sí (6 Secciones)
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 border-2 border-dashed border-slate-800 rounded-2xl text-center space-y-3">
            <Sliders className="w-12 h-12 text-slate-700 mx-auto" />
            <h3 className="text-sm font-bold text-slate-400">No se encontraron inspecciones</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto font-sans">Esta empresa aún no tiene inspecciones técnicas registradas o el filtro de búsqueda no coincide.</p>
            <button
              onClick={() => setShowTemplateSelector(true)}
              className="mt-2 inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-lg text-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Crear Inspección
            </button>
          </div>
        )}
      </main>

      {/* MODAL 1: SELECTOR DE PLANTILLAS */}
      {showTemplateSelector && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowTemplateSelector(false)} />
          
          <div className="relative w-full max-w-xl bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl p-6 overflow-hidden">
            <div className="flex justify-between items-center pb-4 border-b border-slate-800">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">
                Seleccionar Plantilla de Inspección
              </h3>
              <button 
                onClick={() => setShowTemplateSelector(false)}
                className="p-1.5 hover:bg-slate-900 rounded-lg text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mt-6">
              {/* Opción 1: Tablero Eléctrico */}
              <div 
                onClick={() => openFormWithTemplate('TABLERO_TERMOGRAFIA')}
                className="bg-slate-900/50 border border-slate-800/80 hover:border-amber-500/50 rounded-2xl p-5 flex flex-col justify-between cursor-pointer transition-all hover:translate-y-[-2px] group"
              >
                <div className="flex flex-col gap-3">
                  <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl w-max shadow-inner text-amber-500 group-hover:scale-105 transition-transform">
                    <Layers className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-200 group-hover:text-amber-400 transition-colors">
                    Ficha de Tablero Eléctrico y Termografía
                  </h4>
                  <p className="text-[10px] text-slate-500 leading-relaxed">
                    Registro detallado de acometida, tensiones, corrientes, breaker principal, matriz de circuitos par/impar y termografía.
                  </p>
                </div>
                <span className="text-[10px] font-extrabold text-amber-500 uppercase tracking-widest mt-6 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                  Seleccionar →
                </span>
              </div>

              {/* Opción 2: Inspección Visual Subestación */}
              <div 
                onClick={() => openFormWithTemplate('INSPECCION_SUBESTACION')}
                className="bg-slate-900/50 border border-slate-800/80 hover:border-amber-500/50 rounded-2xl p-5 flex flex-col justify-between cursor-pointer transition-all hover:translate-y-[-2px] group"
              >
                <div className="flex flex-col gap-3">
                  <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl w-max shadow-inner text-amber-500 group-hover:scale-105 transition-transform">
                    <Shield className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-200 group-hover:text-amber-400 transition-colors">
                    Inspección Visual de Subestación
                  </h4>
                  <p className="text-[10px] text-slate-500 leading-relaxed">
                    Formato de 6 etapas de evaluación (B/R/M) de entorno, obras civiles, transformador, puesta a tierra y sala de control.
                  </p>
                </div>
                <span className="text-[10px] font-extrabold text-amber-500 uppercase tracking-widest mt-6 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                  Seleccionar →
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: FORMULARIO DETALLADO (DINÁMICO) */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          
          <div className="relative w-full max-w-md bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl p-6 overflow-hidden">
            <div className="flex justify-between items-center pb-4 border-b border-slate-800">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">
                {tipoPlantillaSelected === 'INSPECCION_SUBESTACION' 
                  ? 'Registrar Subestación' 
                  : 'Registrar Nuevo Tablero'}
              </h3>
              <button 
                onClick={() => setShowModal(false)}
                className="p-1.5 hover:bg-slate-900 rounded-lg text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateInspeccion} className="mt-4 space-y-4">
              
              {/* ID / Código (Solo para TABLERO) */}
              {tipoPlantillaSelected === 'TABLERO_TERMOGRAFIA' && (
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">
                    ID / Código del Tablero
                  </label>
                  <input
                    type="text"
                    required
                    value={tableroId}
                    onChange={(e) => setTableroId(e.target.value)}
                    placeholder="Ej. TD-11"
                    className={`w-full px-3 py-2 bg-slate-900 border focus:ring-1 rounded-lg text-sm text-slate-100 focus:outline-none h-10 ${
                      idDuplicado 
                        ? 'border-red-500 focus:border-red-500 focus:ring-red-500' 
                        : 'border-slate-700 focus:border-amber-500 focus:ring-amber-500'
                    }`}
                  />
                  {idDuplicado && (
                    <p className="text-[10px] text-red-500 font-bold flex items-center gap-1 mt-1.5">
                      <AlertTriangle className="w-3.5 h-3.5" /> ID duplicado: ya existe un tablero con este código en el cliente.
                    </p>
                  )}
                </div>
              )}

              {/* Nombre descriptivo (Común) */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">
                  {tipoPlantillaSelected === 'INSPECCION_SUBESTACION' 
                    ? 'Nombre / Código de la Subestación' 
                    : 'Nombre Descriptivo del Tablero'}
                </label>
                <input
                  type="text"
                  required
                  value={tableroNombre}
                  onChange={(e) => setTableroNombre(e.target.value)}
                  placeholder={tipoPlantillaSelected === 'INSPECCION_SUBESTACION'
                    ? 'Ej. Subestación Principal Norte'
                    : 'Ej. Tablero Distribución Sótano'}
                  className={`w-full px-3 py-2 bg-slate-900 border focus:ring-1 rounded-lg text-sm text-slate-100 focus:outline-none h-10 ${
                    nombreDuplicado 
                      ? 'border-red-500 focus:border-red-500 focus:ring-red-500' 
                      : 'border-slate-700 focus:border-amber-500 focus:ring-amber-500'
                  }`}
                />
                {nombreDuplicado && (
                  <p className="text-[10px] text-red-500 font-bold flex items-center gap-1 mt-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" /> Nombre duplicado: ya existe un elemento registrado con este nombre.
                  </p>
                )}
              </div>

              {/* Ubicación (Común) */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">
                  Ubicación Física
                </label>
                <input
                  type="text"
                  value={ubicacion}
                  onChange={(e) => setUbicacion(e.target.value)}
                  placeholder="Ej. Patio de Transformadores o Sótano 1"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-lg text-sm text-slate-100 focus:outline-none placeholder-slate-600 h-10"
                />
              </div>

              {/* Nivel de Tensión (Subestación) o Alimentación (Tablero) */}
              {tipoPlantillaSelected === 'INSPECCION_SUBESTACION' ? (
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">
                    Nivel de Tensión (kV)
                  </label>
                  <input
                    type="text"
                    value={alimentadoPor}
                    onChange={(e) => setAlimentadoPor(e.target.value)}
                    placeholder="Ej. 13.8 kV o 4.16 kV"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-lg text-sm text-slate-100 focus:outline-none placeholder-slate-600 h-10 font-mono"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">
                    Alimentado Por (Procedencia)
                  </label>
                  <input
                    type="text"
                    value={alimentadoPor}
                    onChange={(e) => setAlimentadoPor(e.target.value)}
                    placeholder="Ej. Interruptor 3x100A en Subestación"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-lg text-sm text-slate-100 focus:outline-none placeholder-slate-600 h-10"
                  />
                </div>
              )}

              {/* Nombre del Inspector (Solo para Subestación) */}
              {tipoPlantillaSelected === 'INSPECCION_SUBESTACION' && (
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">
                    Nombre del Inspector
                  </label>
                  <input
                    type="text"
                    value={inspectorName}
                    onChange={(e) => setInspectorName(e.target.value)}
                    placeholder="Ej. Ing. Carlos Pérez"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-lg text-sm text-slate-100 focus:outline-none placeholder-slate-600 h-10"
                  />
                </div>
              )}

              {/* Parámetros de Polos y Fotos (Solo para TABLERO) */}
              {tipoPlantillaSelected === 'TABLERO_TERMOGRAFIA' && (
                <>
                  {/* Número de Polos */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">
                      Número Máximo de Polos
                    </label>
                    <select
                      value={maxPoles}
                      onChange={(e) => setMaxPoles(parseInt(e.target.value, 10))}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-lg text-sm text-slate-100 focus:outline-none h-10"
                    >
                      <option value={12}>12 Polos</option>
                      <option value={24}>24 Polos</option>
                      <option value={30}>30 Polos</option>
                      <option value={42}>42 Polos</option>
                      <option value={60}>60 Polos</option>
                    </select>
                  </div>

                  {/* Foto del Tablero */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                      <Camera className="w-3.5 h-3.5 text-amber-500" />
                      Foto o Imagen del Tablero
                    </label>
                    
                    {previewUrl ? (
                      <div className="relative rounded-lg overflow-hidden border border-slate-700 bg-slate-900 aspect-video flex items-center justify-center group shadow-md">
                        <img src={previewUrl} alt="Vista previa del tablero" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => {
                            setFotoBlob(null);
                            if (previewUrl) URL.revokeObjectURL(previewUrl);
                            setPreviewUrl(null);
                          }}
                          className="absolute top-2 right-2 p-1.5 bg-slate-950/80 hover:bg-red-600 text-white rounded-lg cursor-pointer shadow-md transition-colors"
                          title="Eliminar imagen"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center w-full">
                        <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-slate-800 border-dashed rounded-xl cursor-pointer bg-slate-900/40 hover:bg-slate-900/70 hover:border-slate-700 transition-all select-none">
                          <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            <Camera className="w-8 h-8 text-slate-500 mb-2" />
                            <p className="mb-1 text-xs text-slate-400">
                              <span className="font-bold">Tomar Foto</span> o subir archivo
                            </p>
                            <p className="text-[10px] text-slate-500">
                              PNG, JPG (Máx. 2MB)
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
                </>
              )}

              {/* Botones de Guardar */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-xs font-bold rounded-lg text-slate-300 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!isValid}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-bold rounded-lg text-xs cursor-pointer shadow-md"
                >
                  Crear {tipoPlantillaSelected === 'INSPECCION_SUBESTACION' ? 'Subestación' : 'Tablero'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default EmpresaView;
