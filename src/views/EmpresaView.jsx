import React, { useState, useEffect } from 'react';
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
  Layers,
  Zap,
  Trash2,
  Camera,
  Calendar,
  User,
  Cpu,
  ShieldAlert,
  RefreshCw,
  CheckSquare
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

export const EmpresaView = () => {
  const { companyId } = useParams();
  const navigate = useNavigate();
  
  const { 
    user,
    companies, 
    addProyecto, 
    addElementoUnifilar,
    deleteElementoUnifilar,
    updateEmpresa,
    showToast
  } = useStore();
  
  const company = companies.find((c) => c.id === companyId);
  
  // Estados para Edición de Empresa
  const [showEditEmpresaModal, setShowEditEmpresaModal] = useState(false);
  const [editNombre, setEditNombre] = useState('');
  const [editRif, setEditRif] = useState('');
  const [editDireccionFiscal, setEditDireccionFiscal] = useState('');
  const [editGerente1Nombre, setEditGerente1Nombre] = useState('');
  const [editGerente1Telefono, setEditGerente1Telefono] = useState('');
  const [editGerente1Email, setEditGerente1Email] = useState('');
  const [editGerente2Nombre, setEditGerente2Nombre] = useState('');
  const [editGerente2Telefono, setEditGerente2Telefono] = useState('');
  const [editGerente2Email, setEditGerente2Email] = useState('');

  const handleUpdateEmpresaSubmit = async (e) => {
    e.preventDefault();
    await updateEmpresa(companyId, {
      nombre: editNombre,
      rif: editRif,
      direccionFiscal: editDireccionFiscal,
      gerente1Nombre: editGerente1Nombre || null,
      gerente1Telefono: editGerente1Telefono || null,
      gerente1Email: editGerente1Email || null,
      gerente2Nombre: editGerente2Nombre || null,
      gerente2Telefono: editGerente2Telefono || null,
      gerente2Email: editGerente2Email || null
    });
    showToast("Datos de la empresa actualizados correctamente.", "success");
    setShowEditEmpresaModal(false);
  };

  // Modales y búsqueda
  const [showModal, setShowModal] = useState(false); // Modal Proyecto
  const [showElementoModal, setShowElementoModal] = useState(false); // Modal Elemento
  const [searchQuery, setSearchQuery] = useState('');

  // Estados de selección múltiple
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());

  // Limpiar selección cuando cambia la búsqueda
  useEffect(() => {
    setSelectedIds(new Set());
  }, [searchQuery]);

  const handleToggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    const ids = filteredElementosGenerales.map(e => e.id);
    setSelectedIds(new Set(ids));
  };

  const handleDeselectAll = () => {
    setSelectedIds(new Set());
  };

  const handleDeleteSelected = () => {
    const selectedCount = selectedIds.size;
    if (selectedCount === 0) return;

    if (window.confirm(`¿Estás seguro de que deseas eliminar los ${selectedCount} equipos seleccionados?`)) {
      selectedIds.forEach((id) => {
        deleteElementoUnifilar(null, id);
      });
      showToast?.(`Se eliminaron ${selectedCount} equipos correctamente`, 'success');
      setSelectedIds(new Set());
      setIsMultiSelectMode(false);
    }
  };

  // Form states de Proyectos
  const [proyectoNombre, setProyectoNombre] = useState('');
  const [proyectoDescripcion, setProyectoDescripcion] = useState('');

  // Form states de Elementos (Fuera de Proyectos)
  const [tipoElemento, setTipoElemento] = useState('TABLERO');
  const [elementoNombre, setElementoNombre] = useState('');
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
  const [tipoTrafo, setTipoTrafo] = useState('Pedestal');
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
  const elementosGenerales = company.elementosUnifilares || [];

  const filteredProjects = proyectos.filter((p) =>
    p.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.descripcion && p.descripcion.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredElementosGenerales = elementosGenerales.filter((item) =>
    item.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (item.ubicacion && item.ubicacion.toLowerCase().includes(searchQuery.toLowerCase())) ||
    item.tipoElemento.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const nombreProyectoDuplicado = proyectos.some(
    (p) => p.nombre.toLowerCase().trim() === proyectoNombre.toLowerCase().trim()
  );
  const isProyectoValid = proyectoNombre.trim() !== '' && !nombreProyectoDuplicado;

  const nombreElementoDuplicado = elementosGenerales.some(
    (e) => e.nombre.toLowerCase().trim() === elementoNombre.toLowerCase().trim()
  );
  const isElementoValid = elementoNombre.trim() !== '' && !nombreElementoDuplicado;

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

  const handleCreateElemento = (e) => {
    e.preventDefault();
    if (!isElementoValid) return;

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
        marca: marcaTrafo || '',
        fases: '3',
        potenciaKva: kvaTrafo || '',
        kva: kvaTrafo || '',
        tipoTransformador: tipoTrafo || 'Pedestal',
        conexion: conexionTrafo || '',
        voltajePrimario: voltajePrimario || '',
        voltajeSecundario: voltajeSecundario || '',
        impedanciaPct: '',
        impedanciaAmp: '',
        impedanciaTemp: '',
        tensionPrimaria: voltajePrimario || '',
        amperiosPrimaria: '',
        tensionSecundaria: voltajeSecundario || '',
        amperiosSecundaria: '',
        aislamiento: '',
        aceite: '',
        seco: '',
        acometidas: {
          primaria: { aerea: false, subterranea: false, calibre: '', tipo: '', terminal: '', fusible: '', pararrayo: '', observaciones: '' },
          secundaria: { aerea: false, subterranea: false, calibre: '', tipo: '', terminal: '', fusible: '', pararrayo: '', observaciones: '' },
          neutro: { aerea: false, subterranea: false, calibre: '', tipo: '', terminal: '', fusible: '', pararrayo: '', observaciones: '' }
        },
        spt: {
          barillaCalibre: '',
          barillaCantidad: '',
          barillaConfiguracion: '',
          conductorCalibre: '',
          conductorTipoSold: '',
          resistencia: '',
          fechaMedicion: ''
        }
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

    const result = addElementoUnifilar({
      proyectoId: null,
      companyId,
      nombre: elementoNombre.trim(),
      tipoElemento,
      ubicacion: ubicacion.trim() || 'Sin ubicación',
      alimentadoPor: alimentadoPor.trim() || 'No definido',
      fotoBlob,
      observacionesGenerales: observacionesGenerales.trim(),
      datosTecnicos
    });

    if (result.success) {
      setElementoNombre('');
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

  const handleOpenTableroModal = () => {
    setShowElementoModal(true);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col antialiased font-sans">
      
      {/* Top Header */}
      <header className="bg-slate-950 border-b border-slate-800/80 px-6 py-4 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/')}
            className="p-2.5 bg-slate-900 hover:bg-slate-800 rounded-xl text-slate-450 hover:text-slate-200 transition-all border border-slate-800 active:scale-95 cursor-pointer"
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
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8 space-y-8">
        
        {/* CARD INFORMACION DE LA EMPRESA */}
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
          <div className="flex justify-between items-start gap-4">
            <div>
              <span className="text-[10px] text-amber-500 font-bold uppercase tracking-wider block mb-1">Ficha Técnica</span>
              <h2 className="text-xl font-extrabold text-slate-100 tracking-tight flex items-center gap-2">
                <Building className="w-5 h-5 text-amber-500" /> {company.nombre}
              </h2>
            </div>
            {user?.role === 'ADMIN' && (
              <button
                onClick={() => {
                  setEditNombre(company.nombre);
                  setEditRif(company.rif || '');
                  setEditDireccionFiscal(company.direccionFiscal || '');
                  setEditGerente1Nombre(company.gerente1Nombre || '');
                  setEditGerente1Telefono(company.gerente1Telefono || '');
                  setEditGerente1Email(company.gerente1Email || '');
                  setEditGerente2Nombre(company.gerente2Nombre || '');
                  setEditGerente2Telefono(company.gerente2Telefono || '');
                  setEditGerente2Email(company.gerente2Email || '');
                  setShowEditEmpresaModal(true);
                }}
                className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-bold rounded-lg text-slate-200 hover:text-slate-100 flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
              >
                Editar Empresa
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-6 pt-6 border-t border-slate-900">
            <div>
              <span className="text-[10px] text-slate-500 font-bold uppercase block">RIF</span>
              <span className="text-sm font-semibold text-slate-200">{company.rif || 'J-N/D'}</span>
            </div>
            <div className="md:col-span-2">
              <span className="text-[10px] text-slate-500 font-bold uppercase block">Dirección Fiscal</span>
              <span className="text-sm font-semibold text-slate-200">{company.direccionFiscal || 'N/D'}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 font-bold uppercase block">Registro</span>
              <div className="text-[10px] text-slate-400 font-mono mt-1 space-y-0.5">
                <div>Creado: {company.createdAt ? new Date(company.createdAt).toLocaleString('es-ES') : 'N/D'}</div>
                <div>Actualizado: {company.updatedAt ? new Date(company.updatedAt).toLocaleString('es-ES') : 'N/D'}</div>
              </div>
            </div>
          </div>

          {user?.role === 'ADMIN' && (
            <div className="mt-6 pt-6 border-t border-slate-900">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                <User className="w-4 h-4 text-sky-400" /> Contacto Gerencial (Solo Visible para Administradores)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Gerente 1 */}
                <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-900">
                  <span className="text-[10px] text-sky-400 font-bold uppercase block mb-2">Gerente Principal</span>
                  <div className="space-y-1.5 text-xs">
                    <div><strong className="text-slate-450">Nombre:</strong> <span className="text-slate-255 font-semibold">{company.gerente1Nombre || 'N/D'}</span></div>
                    <div><strong className="text-slate-450">Teléfono:</strong> <span className="text-slate-255 font-semibold">{company.gerente1Telefono || 'N/D'}</span></div>
                    <div><strong className="text-slate-450">Email:</strong> <span className="text-slate-255 font-semibold">{company.gerente1Email || 'N/D'}</span></div>
                  </div>
                </div>

                {/* Gerente 2 */}
                <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-900">
                  <span className="text-[10px] text-sky-400 font-bold uppercase block mb-2">Gerente Secundario</span>
                  <div className="space-y-1.5 text-xs">
                    <div><strong className="text-slate-450">Nombre:</strong> <span className="text-slate-255 font-semibold">{company.gerente2Nombre || 'N/D'}</span></div>
                    <div><strong className="text-slate-450">Teléfono:</strong> <span className="text-slate-255 font-semibold">{company.gerente2Telefono || 'N/D'}</span></div>
                    <div><strong className="text-slate-450">Email:</strong> <span className="text-slate-255 font-semibold">{company.gerente2Email || 'N/D'}</span></div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Actions panel */}
        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 pb-6 border-b border-slate-800/80">
          <div className="input-search-container w-full sm:w-64">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar proyecto o equipo..."
              className="input-search"
            />
            <Search className="w-4.5 h-4.5 absolute left-3.5 top-3 text-slate-500" />
          </div>

          <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 w-full sm:w-auto justify-end">

          {user?.role !== 'CLIENT' && (
            <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 w-full sm:w-auto justify-end">
              {/* Botón Selección Múltiple */}
              <button
                onClick={() => {
                  setIsMultiSelectMode(!isMultiSelectMode);
                  setSelectedIds(new Set());
                }}
                className={`border font-semibold transition-all px-4 py-2.5 rounded-lg flex flex-row items-center justify-center gap-2 h-10 whitespace-nowrap w-full sm:w-auto cursor-pointer text-xs ${
                  isMultiSelectMode 
                    ? 'bg-amber-500/10 border-amber-500/40 text-amber-500' 
                    : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <CheckSquare className="w-4 h-4" /> {isMultiSelectMode ? 'Cancelar Selección' : 'Seleccionar Varios'}
              </button>

              {/* Botón Principal: + Crear Elemento fuera de proyectos */}
              <button
                onClick={handleOpenTableroModal}
                className="bg-amber-500 text-slate-950 font-bold hover:bg-amber-400 active:scale-98 transition-all px-4 py-2.5 rounded-lg flex flex-row items-center justify-center gap-2 h-10 whitespace-nowrap w-full sm:w-auto cursor-pointer text-xs shadow-md"
              >
                <Zap className="w-4 h-4 text-slate-950 fill-slate-950" /> + Crear Elemento
              </button>

              {/* Botón Secundario: + Crear Proyecto */}
              <button
                onClick={() => setShowModal(true)}
                className="bg-slate-900 border border-slate-700 text-slate-100 font-semibold hover:bg-slate-800 active:scale-98 transition-all px-4 py-2.5 rounded-lg flex flex-row items-center justify-center gap-2 h-10 whitespace-nowrap w-full sm:w-auto cursor-pointer text-xs"
              >
                <Plus className="w-4 h-4" /> + Crear Proyecto
              </button>
            </div>
          )}
          </div>
        </div>

        {isMultiSelectMode && (
          <div className="bg-slate-950 border border-amber-500/30 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 animate-fadeIn shadow-lg shadow-amber-500/5">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <span className="text-xs text-slate-300 font-medium">
                Modo Selección Múltiple: <strong className="text-amber-500 font-bold">{selectedIds.size}</strong> {selectedIds.size === 1 ? 'equipo seleccionado' : 'equipos seleccionados'}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
              <button
                onClick={handleSelectAll}
                className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-[11px] font-semibold text-slate-300 transition-all cursor-pointer hover:text-slate-100"
              >
                Seleccionar Todo
              </button>
              <button
                onClick={handleDeselectAll}
                className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-[11px] font-semibold text-slate-300 transition-all cursor-pointer hover:text-slate-100"
              >
                Deseleccionar Todo
              </button>
              {selectedIds.size > 0 && user?.role !== 'CLIENT' && (
                <button
                  onClick={handleDeleteSelected}
                  className="px-3.5 py-2 bg-red-950/40 hover:bg-red-900/60 border border-red-800/40 rounded-xl text-[11px] font-bold text-red-400 hover:text-red-300 flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Eliminar ({selectedIds.size})
                </button>
              )}
              <button
                onClick={() => {
                  setIsMultiSelectMode(false);
                  setSelectedIds(new Set());
                }}
                className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-[11px] font-semibold text-slate-400 hover:text-slate-200 transition-all cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* LISTADO DE PROYECTOS */}
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
                      <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-relaxed min-h-[32px] font-sans">
                        {proj.descripcion || 'Sin descripción disponible.'}
                      </p>
                    </div>
                  </div>

                  <div className="border-t border-slate-900/60 pt-4 mt-4 space-y-2.5">
                    <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-400">
                      <div className="flex items-center gap-1.5 bg-slate-900/40 p-2 rounded-lg border border-slate-900/60 justify-center">
                        <Layers className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                        <span className="font-mono font-bold text-slate-200">{(proj.elementosUnifilares || proj.tableros || []).length}</span> Equipos
                      </div>
                      <div className="flex items-center gap-1.5 bg-slate-900/40 p-2 rounded-lg border border-slate-900/60 justify-center">
                        <Building className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        <span className="font-mono font-bold text-slate-200">{(proj.inspeccionesSubestacion || proj.subestaciones || []).length}</span> Subestac.
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

        {/* LISTADO DE EQUIPOS GENERALES (FUERA DE PROYECTOS) */}
        <div className="pt-8 border-t border-slate-800/80">
          <div className="mb-4">
            <h2 className="text-xl font-extrabold text-slate-100 tracking-wide flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-500" /> Equipos fuera de Carpetas ({elementosGenerales.length})
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Equipos registrados directamente a nivel de empresa, fuera de carpetas de proyectos.
            </p>
          </div>

          {filteredElementosGenerales.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredElementosGenerales.map((item) => {
                const isTablero = item.tipoElemento === 'TABLERO';
                const isTrafo = item.tipoElemento === 'TRANSFORMADOR';
                const isGen = item.tipoElemento === 'GENERADOR';
                const isPuestaTierra = item.tipoElemento === 'PUESTA_TIERRA';
                const isTransfer = item.tipoElemento === 'TRANSFER';
                const isSelected = selectedIds.has(item.id);

                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      if (isMultiSelectMode) {
                        handleToggleSelect(item.id);
                      } else {
                        navigate(`/empresa/${companyId}/tablero/${item.id}`);
                      }
                    }}
                    className={`bg-slate-950 border flex flex-col justify-between overflow-hidden cursor-pointer transition-all hover:-translate-y-0.5 group rounded-2xl shadow-md hover:shadow-xl ${
                      isMultiSelectMode && isSelected 
                        ? 'border-amber-500 shadow-amber-500/5 ring-1 ring-amber-500/20' 
                        : 'border-slate-800/80 hover:border-slate-700/60'
                    }`}
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
                            🔄 TRANSFERENCIA
                          </span>
                        )}
                      </div>

                      {/* Indicador de casilla de verificación para Selección Múltiple */}
                      {isMultiSelectMode && (
                        <div className="absolute top-3 right-3 z-10">
                          <span className={`p-1.5 rounded-lg flex items-center justify-center border transition-all ${
                            isSelected 
                              ? 'bg-amber-500 border-amber-400 text-slate-950 shadow-md shadow-amber-500/20' 
                              : 'bg-slate-950/90 border-slate-700 text-slate-500'
                          }`}>
                            {isSelected ? (
                              <CheckSquare className="w-3.5 h-3.5" />
                            ) : (
                              <div className="w-3.5 h-3.5 border border-slate-600 rounded-sm" />
                            )}
                          </span>
                        </div>
                      )}

                      {user?.role !== 'CLIENT' && !isMultiSelectMode && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm(`¿Estás seguro de que deseas eliminar el equipo "${item.nombre}"?`)) {
                              deleteElementoUnifilar(null, item.id);
                            }
                          }}
                          className="absolute top-3 right-3 p-1.5 bg-slate-950/80 hover:bg-red-955/20 text-slate-400 hover:text-red-400 rounded-lg opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                          title="Eliminar Equipo"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="p-5 flex-1 flex flex-col justify-between">
                      <div className="space-y-1">
                        <h3 className="text-sm font-bold text-slate-100 group-hover:text-amber-500 transition-colors truncate">
                          {item.nombre}
                        </h3>
                        <div className="space-y-1.5 mt-3 text-[11px] text-slate-400 border-t border-slate-900/60 pt-3">
                          <p className="truncate"><span className="text-slate-500 font-bold">Ubicación:</span> {item.ubicacion}</p>
                          <p className="truncate"><span className="text-slate-500 font-bold">Alimentador:</span> {item.alimentadoPor}</p>
                          
                          <div className="pt-2">
                            {isTablero && (
                              <p className="text-sky-400 font-mono font-semibold text-[10px] bg-sky-950/40 p-1.5 rounded-lg border border-sky-900/40">
                                ⚡ Capacidad: {item.datosTecnicos?.maxPoles || 24} Polos ({item.datosTecnicos?.voltajeAcometida || '208/120 V'})
                              </p>
                            )}
                            {isTrafo && (
                              <p className="text-purple-400 font-mono font-semibold text-[10px] bg-purple-950/40 p-1.5 rounded-lg border border-purple-900/40">
                                ⚡ {item.datosTecnicos?.kva || '500 KVA'} | GE {item.datosTecnicos?.conexion || 'Estrella-Estrella'} ({item.datosTecnicos?.voltajePrimario || '13.8 kV'})
                              </p>
                            )}
                            {isGen && (
                              <p className="text-amber-400 font-mono font-semibold text-[10px] bg-amber-950/40 p-1.5 rounded-lg border border-amber-900/40">
                                ⚡ {item.datosTecnicos?.kva || '580 kVA'} | {item.datosTecnicos?.voltajeGeneracion || '208 V'} | Breaker {item.datosTecnicos?.amperaje || '1600 A'}
                              </p>
                            )}
                            {isPuestaTierra && (
                              <p className="text-teal-400 font-mono font-semibold text-[10px] bg-teal-950/40 p-1.5 rounded-lg border border-teal-900/40">
                                🛡️ Corriente Fuga: {item.datosTecnicos?.corrienteFugaAmperios || '6.4 A'} | {item.datosTecnicos?.tipoMalla || 'Malla Concreto'}
                              </p>
                            )}
                            {isTransfer && (
                              <p className="text-emerald-400 font-mono font-semibold text-[10px] bg-emerald-950/40 p-1.5 rounded-lg border border-emerald-900/40">
                                🔄 {item.datosTecnicos?.capacidadAmperios || '3200 A'} | {item.datosTecnicos?.tipoTransferencia || 'ATS YUYE-YES1'}
                              </p>
                            )}
                          </div>
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
                          <span className="font-bold text-amber-500 font-mono">Ficha Completa 2025</span>
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
                <h3 className="text-sm font-bold text-slate-400">No hay equipos generales</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Registra un equipo técnico directamente a nivel de empresa.
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
                      ? 'border-red-500 focus:border-red-500 focus:ring-red-550' 
                      : 'border-slate-800 focus:border-amber-500 focus:ring-amber-500'
                  }`}
                />
                {nombreProyectoDuplicado && (
                  <p className="text-[10px] text-red-555 font-bold flex items-center gap-1.5 mt-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" /> Nombre duplicado: ya existe un proyecto con este nombre.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">
                  Descripción (Opcional)
                </label>
                <textarea
                  value={proyectoDescripcion}
                  onChange={(e) => setProyectoDescripcion(e.target.value)}
                  placeholder="Describe brevemente el alcance de este proyecto..."
                  rows={4}
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-xl text-sm text-slate-100 focus:outline-none placeholder-slate-600 transition-all font-sans resize-none"
                />
              </div>

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
                  className="bg-amber-500 text-slate-950 font-semibold hover:bg-amber-400 active:scale-98 transition-all px-4 py-2.5 rounded-lg flex flex-row items-center justify-center gap-2 h-10 whitespace-nowrap text-xs cursor-pointer shadow-md disabled:opacity-40"
                >
                  Crear Proyecto
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* MODAL MULTI-PLANTILLA DE ELEMENTOS UNIFILARES EN LA EMPRESA */}
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
                className="p-1.5 hover:bg-slate-900 rounded-lg text-slate-505 transition-colors cursor-pointer"
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
                <div className="grid grid-cols-4 gap-2 bg-slate-900 p-1.5 rounded-xl border border-slate-800 text-[10px]">
                  {[
                    { id: 'TABLERO', label: 'PANEL ELÉCTRICO' },
                    { id: 'TRANSFER', label: 'TRANSFERENCIA' },
                    { id: 'GENERADOR', label: 'GENERADOR' },
                    { id: 'TRANSFORMADOR', label: 'TRANSFORMADOR' }
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTipoElemento(t.id)}
                      className={`py-2 px-2 font-black rounded-lg transition-all text-center truncate cursor-pointer ${
                        tipoElemento === t.id 
                          ? 'bg-amber-500 text-slate-950 shadow-md' 
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
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
                  value={elementoNombre}
                  onChange={(e) => setElementoNombre(e.target.value)}
                  placeholder={`Ej. ${tipoElemento === 'TABLERO' ? 'Tablero Principal (TAB 20)' : tipoElemento === 'TRANSFORMADOR' ? 'Transformador GE 500 KVA' : tipoElemento === 'PUESTA_TIERRA' ? 'Malla Puesta a Tierra N° 1' : 'Generador DOMOSA 1'}`}
                  className={`w-full px-3.5 py-2 bg-slate-900 border focus:ring-1 rounded-xl text-sm text-slate-100 focus:outline-none h-11 transition-all ${
                    nombreElementoDuplicado 
                      ? 'border-red-500 focus:border-red-500 focus:ring-red-550' 
                      : 'border-slate-800 focus:border-amber-500 focus:ring-amber-500'
                  }`}
                />
                {nombreElementoDuplicado && (
                  <p className="text-[10px] text-red-555 font-bold flex items-center gap-1.5 mt-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" /> Nombre duplicado: ya existe este equipo en la empresa.
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
                      <input type="text" value={corrienteFuga} onChange={(e) => setCorrienteFuga(e.target.value)} placeholder="Ej. 6.4 A" className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-100 h-10 font-mono text-amber-450" />
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
                  className="px-4.5 py-2.5 bg-slate-900 hover:bg-slate-850 text-xs font-bold rounded-xl text-slate-350 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!isElementoValid}
                  className="bg-amber-500 text-slate-950 font-bold hover:bg-amber-400 active:scale-98 transition-all px-4.5 py-2.5 rounded-xl flex items-center justify-center gap-2 h-11 text-xs cursor-pointer shadow-md disabled:opacity-40"
                >
                  Guardar Plantilla
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Modal de Edición de Empresa */}
      {showEditEmpresaModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl p-6 space-y-6">
            <div className="flex justify-between items-center pb-4 border-b border-slate-800">
              <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <Building className="w-5 h-5 text-amber-500" /> Editar Empresa
              </h3>
              <button 
                onClick={() => setShowEditEmpresaModal(false)}
                className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateEmpresaSubmit} className="space-y-4 font-sans text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Nombre Comercial</label>
                <input 
                  type="text" 
                  value={editNombre} 
                  onChange={(e) => setEditNombre(e.target.value)} 
                  required 
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">RIF</label>
                  <input 
                    type="text" 
                    value={editRif} 
                    onChange={(e) => setEditRif(e.target.value)} 
                    required 
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Dirección Fiscal</label>
                  <input 
                    type="text" 
                    value={editDireccionFiscal} 
                    onChange={(e) => setEditDireccionFiscal(e.target.value)} 
                    required 
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="border-t border-slate-800 pt-4 mt-4 space-y-4">
                <h4 className="font-bold text-sky-400 uppercase tracking-wider text-[10px]">Gerente Principal</h4>
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-1">
                    <label className="block text-slate-500 font-medium mb-1">Nombre</label>
                    <input 
                      type="text" 
                      value={editGerente1Nombre} 
                      onChange={(e) => setEditGerente1Nombre(e.target.value)} 
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-100 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div className="col-span-1">
                    <label className="block text-slate-500 font-medium mb-1">Teléfono</label>
                    <input 
                      type="text" 
                      value={editGerente1Telefono} 
                      onChange={(e) => setEditGerente1Telefono(e.target.value)} 
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-100 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div className="col-span-1">
                    <label className="block text-slate-500 font-medium mb-1">Email</label>
                    <input 
                      type="email" 
                      value={editGerente1Email} 
                      onChange={(e) => setEditGerente1Email(e.target.value)} 
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-100 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-800 pt-4 mt-4 space-y-4">
                <h4 className="font-bold text-sky-400 uppercase tracking-wider text-[10px]">Gerente Secundario</h4>
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-1">
                    <label className="block text-slate-500 font-medium mb-1">Nombre</label>
                    <input 
                      type="text" 
                      value={editGerente2Nombre} 
                      onChange={(e) => setEditGerente2Nombre(e.target.value)} 
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-100 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div className="col-span-1">
                    <label className="block text-slate-500 font-medium mb-1">Teléfono</label>
                    <input 
                      type="text" 
                      value={editGerente2Telefono} 
                      onChange={(e) => setEditGerente2Telefono(e.target.value)} 
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-100 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div className="col-span-1">
                    <label className="block text-slate-500 font-medium mb-1">Email</label>
                    <input 
                      type="email" 
                      value={editGerente2Email} 
                      onChange={(e) => setEditGerente2Email(e.target.value)} 
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-100 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t border-slate-800">
                <button 
                  type="button" 
                  onClick={() => setShowEditEmpresaModal(false)}
                  className="px-4 py-2 border border-slate-700 text-slate-350 hover:bg-slate-800 hover:text-slate-200 rounded-lg font-bold transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 bg-amber-500 text-slate-950 hover:bg-amber-400 active:scale-98 rounded-lg font-bold transition-all shadow-md cursor-pointer"
                >
                  Guardar Cambios
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
