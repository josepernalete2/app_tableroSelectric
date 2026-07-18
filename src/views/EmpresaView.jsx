import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import useStore from '../store/useStore';
import { 
  ArrowLeft, 
  Plus, 
  Search, 
  AlertTriangle,
  FolderOpen,
  X,
  Building,
  Layers
} from 'lucide-react';

export const EmpresaView = () => {
  const { companyId } = useParams();
  const navigate = useNavigate();
  const { 
    companies, 
    addProyecto, 
    addInspeccionSubestacion 
  } = useStore();
  
  const company = companies.find((c) => c.id === companyId);
  
  // Modales y búsqueda
  const [showModal, setShowModal] = useState(false); // Modal Proyecto
  const [showInspeccionModal, setShowInspeccionModal] = useState(false); // Modal Subestación
  const [searchQuery, setSearchQuery] = useState('');

  // Form states de Proyectos
  const [proyectoNombre, setProyectoNombre] = useState('');
  const [proyectoDescripcion, setProyectoDescripcion] = useState('');

  // Form states de Subestaciones
  const [selectedProyectoId, setSelectedProyectoId] = useState('');
  const [subestacionNombre, setSubestacionNombre] = useState('');
  const [ubicacion, setUbicacion] = useState('');
  const [nivelTension, setNivelTension] = useState('');
  const [inspectorName, setInspectorName] = useState('');

  if (!company) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center justify-center p-6 text-center space-y-4 font-sans">
        <AlertTriangle className="w-12 h-12 text-amber-500 animate-pulse" />
        <h2 className="text-lg font-bold">Empresa no encontrada</h2>
        <button onClick={() => navigate('/')} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs rounded-xl font-bold transition-all shadow-md">
          Volver al Dashboard
        </button>
      </div>
    );
  }

  const proyectos = company.proyectos || [];

  // Filtrado de proyectos por búsqueda
  const filteredProjects = proyectos.filter((p) =>
    p.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.descripcion && p.descripcion.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Validación de duplicados de Proyectos
  const nombreProyectoDuplicado = proyectos.some(
    (p) => p.nombre.toLowerCase().trim() === proyectoNombre.toLowerCase().trim()
  );
  const isProyectoValid = proyectoNombre.trim() !== '' && !nombreProyectoDuplicado;

  // Validación de duplicados de Subestaciones
  const targetProyecto = proyectos.find((p) => p.id === selectedProyectoId);
  const nombreSubestacionDuplicado = targetProyecto
    ? (targetProyecto.tableros || []).some(
        (t) => t.nombre.toLowerCase().trim() === subestacionNombre.toLowerCase().trim()
      ) || (targetProyecto.subestaciones || []).some(
        (s) => s.nombre.toLowerCase().trim() === subestacionNombre.toLowerCase().trim()
      )
    : false;
  const isInspeccionValid = selectedProyectoId !== '' && subestacionNombre.trim() !== '' && !nombreSubestacionDuplicado;

  const handleCreateProyecto = (e) => {
    e.preventDefault();
    if (!isProyectoValid) return;

    const result = addProyecto(
      proyectoNombre.trim(),
      proyectoDescripcion.trim(),
      companyId
    );

    if (result.success) {
      setProyectoNombre('');
      setProyectoDescripcion('');
      setShowModal(false);
    } else {
      alert(result.error);
    }
  };

  const handleCreateInspeccion = (e) => {
    e.preventDefault();
    if (!isInspeccionValid) return;

    const result = addInspeccionSubestacion(selectedProyectoId, {
      nombre: subestacionNombre.trim(),
      ubicacion: ubicacion.trim() || 'Sin ubicación',
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
      setUbicacion('');
      setNivelTension('');
      setInspectorName('');
      setSelectedProyectoId('');
      setShowInspeccionModal(false);
    } else {
      alert(result.error);
    }
  };

  const handleOpenInspeccionModal = () => {
    if (proyectos.length === 0) {
      alert('Crea un proyecto primero para poder asociar la inspección.');
      return;
    }
    setSelectedProyectoId(proyectos[0].id);
    setShowInspeccionModal(true);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col antialiased font-sans">
      
      {/* Top Header */}
      <header className="bg-slate-955 border-b border-slate-800/80 px-6 py-4 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/')}
            className="p-2.5 bg-slate-900 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-slate-200 transition-all border border-slate-800 active:scale-95 cursor-pointer"
            title="Volver al Dashboard"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <span className="text-[10px] text-amber-500 font-bold uppercase tracking-wider block">
              Gestión de Empresa
            </span>
            <h1 className="text-lg font-bold text-slate-100 tracking-tight">{company.nombre}</h1>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8 space-y-6">
        
        {/* Actions panel: MAQUETACIÓN RESPONSIVE DE BARRA DE ACCIONES */}
        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 pb-6 border-b border-slate-800/80">
          {/* Buscador a la izquierda */}
          <div className="input-search-container w-full sm:w-64">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar proyecto..."
              className="input-search"
            />
            <Search className="w-4.5 h-4.5 absolute left-3.5 top-3 text-slate-500" />
          </div>

          {/* Botones de creación principales en paralelo a la derecha */}
          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            {/* Botón 1: Crear Proyecto (Fondo Slate con borde sutil - btn-secondary) */}
            <button
              onClick={() => setShowModal(true)}
              className="bg-slate-900/50 border border-slate-700 text-slate-100 font-medium hover:bg-slate-800 active:scale-98 transition-all px-4 py-2.5 rounded-lg flex flex-row items-center justify-center gap-2 h-10 whitespace-nowrap w-full sm:w-auto cursor-pointer"
            >
              <Plus className="w-4.5 h-4.5" /> Crear Proyecto
            </button>

            {/* Botón 2: Crear Inspección (Color de Acento Eléctrico - btn-primary) */}
            <button
              onClick={handleOpenInspeccionModal}
              className="bg-amber-500 text-slate-950 font-semibold hover:bg-amber-400 active:scale-98 transition-all px-4 py-2.5 rounded-lg flex flex-row items-center justify-center gap-2 h-10 whitespace-nowrap w-full sm:w-auto cursor-pointer"
            >
              <Building className="w-4.5 h-4.5" /> Crear Inspección
            </button>
          </div>
        </div>

        {/* CONTENIDO PRINCIPAL: LISTADO DE PROYECTOS */}
        <div>
          <div className="mb-4">
            <h2 className="text-xl font-extrabold text-slate-100 tracking-wide flex items-center gap-2">
              <FolderOpen className="w-5 h-5 text-amber-500" /> Carpetas de Proyectos ({proyectos.length})
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Organiza las inspecciones en carpetas o proyectos técnicos independientes.
            </p>
          </div>

          {filteredProjects.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProjects.map((proj) => (
                <div
                  key={proj.id}
                  onClick={() => navigate(`/empresa/${companyId}/proyecto/${proj.id}`)}
                  className="bg-slate-950 border border-slate-800/80 hover:border-slate-700/60 rounded-2xl shadow-md hover:shadow-xl p-5 flex flex-col justify-between cursor-pointer transition-all hover:translate-y-[-2px] group"
                >
                  <div className="space-y-4">
                    <div className="p-3 bg-slate-900 border border-slate-850 rounded-xl w-max shadow-inner text-amber-500 group-hover:scale-105 transition-transform">
                      <FolderOpen className="w-6 h-6" />
                    </div>
                    
                    <div>
                      <h3 className="text-sm font-bold text-slate-100 group-hover:text-amber-400 transition-colors tracking-tight truncate">
                        {proj.nombre}
                      </h3>
                      <p className="text-[11px] text-slate-450 mt-1 line-clamp-2 leading-relaxed min-h-[32px] font-sans">
                        {proj.descripcion || 'Sin descripción disponible.'}
                      </p>
                    </div>
                  </div>

                  <div className="border-t border-slate-900/60 pt-4 mt-4 space-y-2.5">
                    <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-400">
                      <div className="flex items-center gap-1.5 bg-slate-900/40 p-2 rounded-lg border border-slate-900/60 justify-center">
                        <Layers className="w-3.5 h-3.5 text-sky-450 shrink-0" />
                        <span className="font-mono font-bold text-slate-200">{(proj.tableros || []).length}</span> Tableros
                      </div>
                      <div className="flex items-center gap-1.5 bg-slate-900/40 p-2 rounded-lg border border-slate-900/60 justify-center">
                        <Building className="w-3.5 h-3.5 text-amber-550 shrink-0" />
                        <span className="font-mono font-bold text-slate-200">{(proj.subestaciones || []).length}</span> Subestac.
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[9px] text-slate-500 font-mono">
                      <span>Creado:</span>
                      <span>{proj.createdAt ? new Date(proj.createdAt).toLocaleDateString('es-ES') : 'N/D'}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-16 border-2 border-dashed border-slate-800 rounded-2xl text-center space-y-4 bg-slate-950/20">
              <FolderOpen className="w-12 h-12 text-slate-700 mx-auto" />
              <div className="space-y-1 font-sans">
                <h3 className="text-sm font-bold text-slate-400">No se encontraron proyectos</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Crea una nueva carpeta de proyecto para comenzar a registrar tableros e inspecciones.
                </p>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* MODAL 1: REGISTRAR NUEVO PROYECTO */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setShowModal(false)} />
          
          <div className="relative w-full max-w-md bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl p-6 overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center pb-4 border-b border-slate-800">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
                <FolderOpen className="w-4 h-4 text-amber-500" />
                Registrar Nuevo Proyecto
              </h3>
              <button 
                onClick={() => setShowModal(false)}
                className="p-1.5 hover:bg-slate-900 rounded-lg text-slate-500 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateProyecto} className="mt-4 space-y-4">
              
              {/* Nombre del Proyecto */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">
                  Nombre del Proyecto
                </label>
                <input
                  type="text"
                  required
                  value={proyectoNombre}
                  onChange={(e) => setProyectoNombre(e.target.value)}
                  placeholder="Ej. Inspecciones Planta Baja 2026"
                  className={`w-full px-3.5 py-2.5 bg-slate-900 border focus:ring-1 rounded-xl text-sm text-slate-100 focus:outline-none h-11 transition-all ${
                    nombreProyectoDuplicado 
                      ? 'border-red-500 focus:border-red-500 focus:ring-red-500' 
                      : 'border-slate-800 focus:border-amber-500 focus:ring-amber-500'
                  }`}
                />
                {nombreProyectoDuplicado && (
                  <p className="text-[10px] text-red-555 font-bold flex items-center gap-1.5 mt-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" /> Nombre duplicado: ya existe un proyecto con este nombre.
                  </p>
                )}
              </div>

              {/* Descripción */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">
                  Descripción (Opcional)
                </label>
                <textarea
                  value={proyectoDescripcion}
                  onChange={(e) => setProyectoDescripcion(e.target.value)}
                  placeholder="Describe brevemente el alcance de este proyecto..."
                  rows={4}
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-xl text-sm text-slate-100 focus:outline-none placeholder-slate-655 transition-all font-sans resize-none"
                />
              </div>

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
                  disabled={!isProyectoValid}
                  className="px-4.5 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-bold rounded-xl text-xs transition-colors cursor-pointer shadow-md"
                >
                  Crear Proyecto
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: REGISTRAR NUEVA INSPECCIÓN DE SUBESTACIÓN DESDE EMPRESA */}
      {showInspeccionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setShowInspeccionModal(false)} />
          
          <div className="relative w-full max-w-md bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl p-6 overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center pb-4 border-b border-slate-800">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
                <Building className="w-4 h-4 text-amber-500" />
                Registrar Subestación
              </h3>
              <button 
                onClick={() => setShowInspeccionModal(false)}
                className="p-1.5 hover:bg-slate-900 rounded-lg text-slate-500 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateInspeccion} className="mt-4 space-y-4">
              
              {/* Proyecto de Destino (Requerido) */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">
                  Proyecto Destino (Carpeta)
                </label>
                <select
                  required
                  value={selectedProyectoId}
                  onChange={(e) => setSelectedProyectoId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-xl text-sm text-slate-100 focus:outline-none h-11"
                >
                  {proyectos.map((p) => (
                    <option key={p.id} value={p.id}>{p.nombre}</option>
                  ))}
                </select>
              </div>

              {/* Nombre descriptivo */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">
                  Nombre / Código de la Subestación
                </label>
                <input
                  type="text"
                  required
                  value={subestacionNombre}
                  onChange={(e) => setSubestacionNombre(e.target.value)}
                  placeholder="Ej. Subestación Principal Norte"
                  className={`w-full px-3.5 py-2 bg-slate-900 border focus:ring-1 rounded-xl text-sm text-slate-100 focus:outline-none h-11 transition-all ${
                    nombreSubestacionDuplicado 
                      ? 'border-red-500 focus:border-red-500 focus:ring-red-500' 
                      : 'border-slate-800 focus:border-amber-500 focus:ring-amber-500'
                  }`}
                />
                {nombreSubestacionDuplicado && (
                  <p className="text-[10px] text-red-555 font-bold flex items-center gap-1.5 mt-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" /> Nombre duplicado: ya existe un elemento en este proyecto con este nombre.
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
                  placeholder="Ej. Patio de Transformadores o Sótano 1"
                  className="w-full px-3.5 py-2 bg-slate-900 border border-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-xl text-sm text-slate-100 focus:outline-none placeholder-slate-600 h-11 transition-all"
                />
              </div>

              {/* Nivel de Tensión */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">
                  Nivel de Tensión (kV)
                </label>
                <input
                  type="text"
                  value={nivelTension}
                  onChange={(e) => setNivelTension(e.target.value)}
                  placeholder="Ej. 13.8 kV o 4.16 kV"
                  className="w-full px-3.5 py-2 bg-slate-900 border border-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-xl text-sm text-slate-100 focus:outline-none placeholder-slate-600 h-11 transition-all font-mono"
                />
              </div>

              {/* Nombre del Inspector */}
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

              {/* Botones de Acción */}
              <div className="flex justify-end gap-3 pt-3 border-t border-slate-900/60">
                <button
                  type="button"
                  onClick={() => setShowInspeccionModal(false)}
                  className="px-4.5 py-2.5 bg-slate-900 hover:bg-slate-800 text-xs font-bold rounded-xl text-slate-350 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!isInspeccionValid}
                  className="px-4.5 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-bold rounded-xl text-xs transition-colors cursor-pointer shadow-md"
                >
                  Crear Inspección
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
