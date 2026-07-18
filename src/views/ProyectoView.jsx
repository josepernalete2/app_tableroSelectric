import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import useStore from '../store/useStore';
import { 
  ArrowLeft, 
  Layers, 
  Trash2, 
  Search, 
  AlertTriangle,
  FolderOpen,
  Sliders,
  X,
  Camera,
  Shield,
  Calendar,
  User,
  Zap,
  Building
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
    addTablero, 
    deleteTablero,
    addInspeccionSubestacion,
    deleteSubestacion 
  } = useStore();

  // Encontrar empresa y proyecto actual
  const company = companies.find((c) => c.id === companyId);
  const proyecto = company?.proyectos?.find((p) => p.id === proyectoId);

  // Modales y búsqueda
  const [showModal, setShowModal] = useState(false);
  const [tipoElemento, setTipoElemento] = useState('TABLERO'); // 'TABLERO' | 'SUBESTACION'
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

  if (!company || !proyecto) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center justify-center p-6 text-center space-y-4 font-sans font-sans">
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

  // Combinar y clasificar elementos del proyecto
  const combinedItems = [
    ...(proyecto.tableros || []).map(t => ({ ...t, tipoEntidad: 'TABLERO' })),
    ...(proyecto.subestaciones || []).map(s => ({ ...s, tipoEntidad: 'SUBESTACION' }))
  ];

  // Filtrado de búsqueda
  const filteredItems = combinedItems.filter((item) =>
    item.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (item.ubicacion && item.ubicacion.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Validaciones de duplicados locales
  const idDuplicado = (proyecto.tableros || []).some(
    (t) => t.id.toLowerCase().trim() === tableroId.toLowerCase().trim()
  );

  const nombreDuplicado = (proyecto.tableros || []).some(
    (t) => t.nombre.toLowerCase().trim() === tableroNombre.toLowerCase().trim()
  ) || (proyecto.subestaciones || []).some(
    (s) => s.nombre.toLowerCase().trim() === tableroNombre.toLowerCase().trim()
  );

  const isValid = tipoElemento === 'SUBESTACION'
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

  const handleCreateElemento = (e) => {
    e.preventDefault();
    if (!isValid) return;

    if (tipoElemento === 'SUBESTACION') {
      const result = addInspeccionSubestacion(proyectoId, {
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
        setTableroNombre('');
        setUbicacion('');
        setAlimentadoPor('');
        setInspectorName('');
        setShowModal(false);
      } else {
        alert(result.error);
      }
    } else {
      const result = addTablero(proyectoId, {
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

  const abrirFormulario = (tipo) => {
    setTipoElemento(tipo);
    setShowModal(true);
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
           {/* Actions panel */}
        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 pb-6 border-b border-slate-800/80">
          <div>
            <h2 className="text-xl font-extrabold text-slate-100 tracking-tight flex items-center gap-2">
              <FolderOpen className="w-5 h-5 text-amber-500" /> Elementos del Proyecto ({combinedItems.length})
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Selecciona un elemento para ver la ficha técnica o capturar mediciones.
            </p>
          </div>

          <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 justify-end w-full sm:w-auto">
            {/* Buscador */}
            <div className="input-search-container w-full sm:w-64">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por nombre o ID..."
                className="input-search"
              />
              <Search className="w-4.5 h-4.5 absolute left-3.5 top-3 text-slate-500" />
            </div>

            {/* DOS BOTONES DE CREACIÓN EN PARALELO */}
            <div className="flex flex-row items-center gap-3 w-full sm:w-auto justify-end">
              {/* Botón Primario: Crear Inspección (btn-primary) */}
              <button
                onClick={() => abrirFormulario('SUBESTACION')}
                className="bg-amber-500 text-slate-950 font-semibold hover:bg-amber-400 active:scale-98 transition-all px-4 py-2.5 rounded-lg flex flex-row items-center justify-center gap-2 h-10 whitespace-nowrap w-full sm:w-auto cursor-pointer"
              >
                <Building className="w-4.5 h-4.5" /> Crear Inspección
              </button>

              {/* Botón Secundario: Crear Tablero (btn-secondary) */}
              <button
                onClick={() => abrirFormulario('TABLERO')}
                className="bg-slate-900/50 border border-slate-700 text-slate-100 font-medium hover:bg-slate-800 active:scale-98 transition-all px-4 py-2.5 rounded-lg flex flex-row items-center justify-center gap-2 h-10 whitespace-nowrap w-full sm:w-auto cursor-pointer"
              >
                <Zap className="w-4.5 h-4.5" /> Crear Tablero
              </button>
            </div>
          </div>
        </div>

        {/* Grid de Inspecciones */}
        {filteredItems.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                onClick={() => navigate(`/empresa/${companyId}/tablero/${item.id}`)}
                className="bg-slate-950 border border-slate-800/80 hover:border-slate-700/60 rounded-2xl shadow-md hover:shadow-xl flex flex-col justify-between overflow-hidden cursor-pointer transition-all hover:translate-y-[-2px] group"
              >
                {/* Header visual de Tarjeta */}
                {item.tipoEntidad === 'TABLERO' ? (
                  <div className="h-36 w-full bg-slate-900 relative overflow-hidden flex items-center justify-center border-b border-slate-900/50">
                    {item.fotoBlob || item.foto ? (
                      <SafeImage 
                        blob={item.fotoBlob}
                        src={item.foto} 
                        alt={item.nombre} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-slate-700 gap-1.5 select-none">
                        <Layers className="w-8 h-8 opacity-25" />
                        <span className="text-[9px] uppercase font-bold tracking-widest opacity-30">Sin Imagen</span>
                      </div>
                    )}
                    
                    {/* Badge de color con icono solicitado: ⚡ TABLERO */}
                    <div className="absolute top-3 left-3">
                      <span className="px-2.5 py-1 rounded-lg text-[9px] font-bold bg-sky-950/95 text-sky-400 border border-sky-800/30 font-mono backdrop-blur-md shadow-sm">
                        ⚡ TABLERO
                      </span>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm(`¿Estás seguro de que deseas eliminar permanentemente el tablero "${item.nombre}"?`)) {
                          deleteTablero(proyectoId, item.id);
                        }
                      }}
                      className="absolute top-3 right-3 p-2 bg-slate-950/85 hover:bg-red-950/80 text-slate-400 hover:text-red-450 rounded-xl backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all cursor-pointer border border-slate-800/40"
                      title="Eliminar Tablero"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  /* Layout para Subestaciones */
                  <div className="h-36 w-full bg-gradient-to-br from-slate-900 to-slate-900/40 relative flex flex-col items-center justify-center border-b border-slate-900/50 select-none">
                    <Building className="w-10 h-10 text-amber-550/70 group-hover:scale-110 transition-transform duration-500" />
                    <span className="text-[9px] uppercase font-bold tracking-widest opacity-35 mt-2">Inspección Visual</span>
                    
                    {/* Badge de color con icono solicitado: 🏢 SUBESTACIÓN */}
                    <div className="absolute top-3 left-3">
                      <span className="px-2.5 py-1 rounded-lg text-[9px] font-bold bg-amber-950/95 text-amber-500 border border-amber-800/30 font-mono backdrop-blur-md shadow-sm">
                        🏢 SUBESTACIÓN
                      </span>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm(`¿Estás seguro de que deseas eliminar permanentemente la inspección de subestación "${item.nombre}"?`)) {
                          deleteSubestacion(proyectoId, item.id);
                        }
                      }}
                      className="absolute top-3 right-3 p-2 bg-slate-950/85 hover:bg-red-950/80 text-slate-400 hover:text-red-450 rounded-xl backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all cursor-pointer border border-slate-800/40"
                      title="Eliminar Inspección"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* Contenido de la Tarjeta */}
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-slate-100 group-hover:text-amber-550 transition-colors truncate">
                      {item.nombre}
                    </h3>
                    
                    {item.tipoEntidad === 'TABLERO' ? (
                      <div className="space-y-1.5 mt-3 text-[11px] text-slate-400 border-t border-slate-900/60 pt-3 font-sans">
                        <p className="truncate"><span className="text-slate-500 font-bold">Ubicación:</span> {item.ubicacion}</p>
                        <p className="truncate"><span className="text-slate-500 font-bold">Alimentado por:</span> {item.alimentadoPor || 'No definido'}</p>
                        <p><span className="text-slate-500 font-bold">Capacidad:</span> {item.maxPoles} polos</p>
                      </div>
                    ) : (
                      <div className="space-y-1.5 mt-3 text-[11px] text-slate-400 border-t border-slate-900/60 pt-3 font-sans">
                        <p className="truncate flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-slate-600 shrink-0" /><span className="text-slate-500 font-bold">Fecha:</span> {item.fecha}</p>
                        <p className="truncate flex items-center gap-1.5"><User className="w-3.5 h-3.5 text-slate-600 shrink-0" /><span className="text-slate-500 font-bold">Inspector:</span> {item.inspector}</p>
                        <p className="truncate"><span className="text-slate-500 font-bold">Tensión:</span> {item.nivelTension}</p>
                      </div>
                    )}
                  </div>

                  {item.tipoEntidad === 'TABLERO' ? (
                    <div className="flex items-center justify-between mt-5 text-[10px] bg-slate-900/40 p-2.5 rounded-xl border border-slate-800/60">
                      <span className="text-slate-400 font-medium">Circuitos Registrados:</span>
                      <span className="font-bold text-sky-400 font-mono">
                        {item.circuits?.length || 0} de {item.maxPoles}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between mt-5 text-[10px] bg-slate-900/40 p-2.5 rounded-xl border border-slate-800/60">
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
          <div className="p-16 border-2 border-dashed border-slate-800 rounded-2xl text-center space-y-4 bg-slate-950/20">
            <Sliders className="w-12 h-12 text-slate-700 mx-auto" />
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-slate-400">No se encontraron elementos</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto font-sans">
                Este proyecto aún no contiene elementos técnicos registrados. Utiliza los botones de arriba para registrar uno.
              </p>
            </div>
          </div>
        )}
      </main>

      {/* MODAL PRINCIPAL DE FORMULARIO DETALLADO (DINÁMICO) */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setShowModal(false)} />
          
          <div className="relative w-full max-w-md bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl p-6 overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center pb-4 border-b border-slate-800">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
                {tipoElemento === 'SUBESTACION' ? (
                  <Building className="w-4 h-4 text-amber-550" />
                ) : (
                  <Zap className="w-4 h-4 text-sky-450" />
                )}
                {tipoElemento === 'SUBESTACION' 
                  ? 'Registrar Subestación' 
                  : 'Registrar Nuevo Tablero'}
              </h3>
              <button 
                onClick={() => setShowModal(false)}
                className="p-1.5 hover:bg-slate-900 rounded-lg text-slate-500 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateElemento} className="mt-4 space-y-4">
              
              {/* ID / Código (Solo para TABLERO) */}
              {tipoElemento === 'TABLERO' && (
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
                    className={`w-full px-3.5 py-2 bg-slate-900 border focus:ring-1 rounded-xl text-sm text-slate-100 focus:outline-none h-11 transition-all ${
                      idDuplicado 
                        ? 'border-red-500 focus:border-red-500 focus:ring-red-500' 
                        : 'border-slate-800 focus:border-amber-500 focus:ring-amber-500'
                    }`}
                  />
                  {idDuplicado && (
                    <p className="text-[10px] text-red-550 font-bold flex items-center gap-1.5 mt-1.5">
                      <AlertTriangle className="w-3.5 h-3.5" /> ID duplicado: ya existe un tablero con este código.
                    </p>
                  )}
                </div>
              )}

              {/* Nombre descriptivo (Común) */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">
                  {tipoElemento === 'SUBESTACION' 
                    ? 'Nombre / Código de la Subestación' 
                    : 'Nombre Descriptivo del Tablero'}
                </label>
                <input
                  type="text"
                  required
                  value={tableroNombre}
                  onChange={(e) => setTableroNombre(e.target.value)}
                  placeholder={tipoElemento === 'SUBESTACION'
                    ? 'Ej. Subestación Principal Norte'
                    : 'Ej. Tablero Distribución Sótano'}
                  className={`w-full px-3.5 py-2 bg-slate-900 border focus:ring-1 rounded-xl text-sm text-slate-100 focus:outline-none h-11 transition-all ${
                    nombreDuplicado 
                      ? 'border-red-500 focus:border-red-500 focus:ring-red-500' 
                      : 'border-slate-800 focus:border-amber-500 focus:ring-amber-500'
                  }`}
                />
                {nombreDuplicado && (
                  <p className="text-[10px] text-red-550 font-bold flex items-center gap-1.5 mt-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" /> Nombre duplicado: ya existe un elemento con este nombre.
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
                  className="w-full px-3.5 py-2 bg-slate-900 border border-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-xl text-sm text-slate-100 focus:outline-none placeholder-slate-600 h-11 transition-all"
                />
              </div>

              {/* Nivel de Tensión (Subestación) o Alimentación (Tablero) */}
              {tipoElemento === 'SUBESTACION' ? (
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">
                    Nivel de Tensión (kV)
                  </label>
                  <input
                    type="text"
                    value={alimentadoPor}
                    onChange={(e) => setAlimentadoPor(e.target.value)}
                    placeholder="Ej. 13.8 kV o 4.16 kV"
                    className="w-full px-3.5 py-2 bg-slate-900 border border-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-xl text-sm text-slate-100 focus:outline-none placeholder-slate-605 h-11 transition-all font-mono"
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
                    className="w-full px-3.5 py-2 bg-slate-900 border border-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-xl text-sm text-slate-100 focus:outline-none placeholder-slate-600 h-11 transition-all"
                  />
                </div>
              )}

              {/* Nombre del Inspector (Solo para Subestación) */}
              {tipoElemento === 'SUBESTACION' && (
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">
                    Nombre del Inspector
                  </label>
                  <input
                    type="text"
                    value={inspectorName}
                    onChange={(e) => setInspectorName(e.target.value)}
                    placeholder="Ej. Ing. Carlos Pérez"
                    className="w-full px-3.5 py-2 bg-slate-900 border border-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-xl text-sm text-slate-100 focus:outline-none placeholder-slate-600 h-11 transition-all"
                  />
                </div>
              )}

              {/* Parámetros de Polos y Fotos (Solo para TABLERO) */}
              {tipoElemento === 'TABLERO' && (
                <>
                  {/* Número de Polos */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">
                      Número Máximo de Polos
                    </label>
                    <select
                      value={maxPoles}
                      onChange={(e) => setMaxPoles(parseInt(e.target.value, 10))}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-850 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-xl text-sm text-slate-100 focus:outline-none h-11"
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
                      <Camera className="w-4 h-4 text-amber-500" />
                      Foto o Imagen del Tablero
                    </label>
                    
                    {previewUrl ? (
                      <div className="relative rounded-xl overflow-hidden border border-slate-800 bg-slate-900 aspect-video flex items-center justify-center group shadow-lg">
                        <img src={previewUrl} alt="Vista previa del tablero" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => {
                            setFotoBlob(null);
                            if (previewUrl) URL.revokeObjectURL(previewUrl);
                            setPreviewUrl(null);
                          }}
                          className="absolute top-2.5 right-2.5 p-1.5 bg-slate-950/80 hover:bg-red-600 text-white rounded-lg shadow-md cursor-pointer transition-colors"
                          title="Eliminar imagen"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center w-full">
                        <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-slate-850 border-dashed rounded-xl cursor-pointer bg-slate-900/20 hover:bg-slate-900/40 hover:border-slate-700 transition-all select-none">
                          <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            <Camera className="w-7 h-7 text-slate-500 mb-1.5" />
                            <p className="mb-0.5 text-xs text-slate-450">
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

              {/* Botones de Acción */}
              <div className="flex justify-end gap-3 pt-3 border-t border-slate-900/60">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4.5 py-2.5 bg-slate-900 hover:bg-slate-800 text-xs font-bold rounded-xl text-slate-350 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!isValid}
                  className="px-4.5 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-bold rounded-xl text-xs transition-colors cursor-pointer shadow-md"
                >
                  Crear {tipoElemento === 'SUBESTACION' ? 'Subestación' : 'Tablero'}
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
