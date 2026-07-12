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
  Camera
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
  const { companies, addTablero, deleteTablero } = useStore();
  
  const company = companies.find((c) => c.id === companyId);
  
  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Form states for new Tablero
  const [tableroId, setTableroId] = useState('');
  const [tableroNombre, setTableroNombre] = useState('');
  const [ubicacion, setUbicacion] = useState('');
  const [maxPoles, setMaxPoles] = useState(24);
  const [alimentadoPor, setAlimentadoPor] = useState('');
  const [fotoBlob, setFotoBlob] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

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

  // Real-time validation checks for duplicates inside this company
  const idDuplicado = company.tableros.some(
    (t) => t.id.toLowerCase().trim() === tableroId.toLowerCase().trim()
  );
  
  const nombreDuplicado = company.tableros.some(
    (t) => t.nombre.toLowerCase().trim() === tableroNombre.toLowerCase().trim()
  );

  const isValid = tableroId.trim() !== '' && tableroNombre.trim() !== '' && !idDuplicado && !nombreDuplicado;

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert("La imagen es demasiado grande. Por favor elija una de menos de 2MB.");
      return;
    }

    setFotoBlob(file);
    // Revocar URL anterior si existía para evitar fugas de memoria
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleCreateTablero = (e) => {
    e.preventDefault();
    if (!isValid) return;

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
      // Reset form states
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
  };

  const filteredTableros = company.tableros.filter((t) =>
    t.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.ubicacion.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
              <FolderOpen className="w-5 h-5 text-amber-500" /> Tableros Registrados ({company.tableros.length})
            </h2>
            <p className="text-xs text-slate-400 mt-1">Crea nuevos tableros de inspección o selecciona uno para editar su esquema de distribución.</p>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {/* Buscador */}
            <div className="relative w-full md:w-64">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar tablero..."
                className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-xl text-xs text-slate-100 placeholder-slate-600 focus:outline-none h-10"
              />
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-600" />
            </div>

            <button
              onClick={() => setShowModal(true)}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs shadow-md active:scale-95 transition-all cursor-pointer w-full md:w-auto"
            >
              <Plus className="w-4 h-4" /> Crear Tablero
            </button>
          </div>
        </div>

        {/* Tableros Grid */}
        {filteredTableros.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTableros.map((tablero) => (
              <div
                key={tablero.id}
                onClick={() => navigate(`/empresa/${company.id}/tablero/${tablero.id}`)}
                className="bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-2xl shadow-md hover:shadow-lg flex flex-col justify-between overflow-hidden cursor-pointer transition-all hover:translate-y-[-2px] group"
              >
                {/* Header visual con Foto */}
                <div className="h-32 w-full bg-slate-900 relative overflow-hidden flex items-center justify-center border-b border-slate-900/60">
                  {tablero.fotoBlob || tablero.foto ? (
                    <SafeImage 
                      blob={tablero.fotoBlob}
                      src={tablero.foto} 
                      alt={tablero.nombre} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-slate-700 gap-1 select-none">
                      <Layers className="w-8 h-8 opacity-30" />
                      <span className="text-[9px] uppercase font-bold tracking-widest opacity-35">Sin Foto</span>
                    </div>
                  )}
                  <div className="absolute top-3 left-3">
                    <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-slate-950/80 text-amber-500 border border-amber-500/20 font-mono backdrop-blur-sm">
                      ID: {tablero.id}
                    </span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (window.confirm(`¿Estás seguro de que deseas eliminar permanentemente el tablero "${tablero.nombre}" (ID: ${tablero.id})?`)) {
                        deleteTablero(company.id, tablero.id);
                      }
                    }}
                    className="absolute top-3 right-3 p-1.5 bg-slate-950/85 hover:bg-red-950/80 text-slate-400 hover:text-red-400 rounded-lg backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                    title="Eliminar Tablero"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Contenido de la Tarjeta */}
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-100 group-hover:text-amber-400 transition-colors">
                      {tablero.nombre}
                    </h3>
                    
                    <div className="space-y-1.5 mt-3 text-[11px] text-slate-400 border-t border-slate-900 pt-3">
                      <p className="truncate"><span className="text-slate-500 font-bold">Ubicación:</span> {tablero.ubicacion}</p>
                      <p className="truncate"><span className="text-slate-500 font-bold">Alimentado por:</span> {tablero.alimentadoPor || 'No definido'}</p>
                      <p><span className="text-slate-500 font-bold">Capacidad:</span> {tablero.maxPoles} polos</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-5 text-[10px] bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-slate-400 font-medium">Circuitos Registrados:</span>
                    <span className="font-bold text-amber-500 font-mono">
                      {tablero.circuits?.length || 0} de {tablero.maxPoles}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 border-2 border-dashed border-slate-800 rounded-2xl text-center space-y-3">
            <Sliders className="w-12 h-12 text-slate-700 mx-auto" />
            <h3 className="text-sm font-bold text-slate-400">No se encontraron tableros</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">Esta empresa aún no tiene tableros registrados o el filtro de búsqueda no coincide.</p>
            <button
              onClick={() => setShowModal(true)}
              className="mt-2 inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-lg text-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Crear Tablero
            </button>
          </div>
        )}
      </main>

      {/* Modal Crear Tablero */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          
          <div className="relative w-full max-w-md bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl p-6 overflow-hidden">
            <div className="flex justify-between items-center pb-4 border-b border-slate-800">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">
                Registrar Nuevo Tablero
              </h3>
              <button 
                onClick={() => setShowModal(false)}
                className="p-1.5 hover:bg-slate-900 rounded-lg text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateTablero} className="mt-4 space-y-4">
              
              {/* ID / Código */}
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

              {/* Nombre descriptivo */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">
                  Nombre Descriptivo
                </label>
                <input
                  type="text"
                  required
                  value={tableroNombre}
                  onChange={(e) => setTableroNombre(e.target.value)}
                  placeholder="Ej. Tablero Distribución Sótano"
                  className={`w-full px-3 py-2 bg-slate-900 border focus:ring-1 rounded-lg text-sm text-slate-100 focus:outline-none h-10 ${
                    nombreDuplicado 
                      ? 'border-red-500 focus:border-red-500 focus:ring-red-500' 
                      : 'border-slate-700 focus:border-amber-500 focus:ring-amber-500'
                  }`}
                />
                {nombreDuplicado && (
                  <p className="text-[10px] text-red-500 font-bold flex items-center gap-1 mt-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" /> Nombre duplicado: ya existe un tablero con este nombre.
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
                  placeholder="Ej. Sala de compresores sotano"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-lg text-sm text-slate-100 focus:outline-none placeholder-slate-600 h-10"
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
                  placeholder="Ej. Interruptor 3x100A en Subestación"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-lg text-sm text-slate-100 focus:outline-none placeholder-slate-600 h-10"
                />
              </div>

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

              {/* Foto del Tablero (Tomar foto o subir archivo) */}
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
                  Crear Tablero
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
