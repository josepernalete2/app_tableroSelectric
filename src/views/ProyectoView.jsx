import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import useStore from '../store/useStore';
import ModalDiagramaUnifilar from '../components/ModalDiagramaUnifilar';
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
  RefreshCw,
  FileText,
  CheckSquare,
  Settings
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
    user,
    companies, 
    addElementoUnifilar, 
    deleteElementoUnifilar,
    updateElementoUnifilar,
    addInspeccionSubestacion,
    deleteSubestacion,
    updateProyecto,
    addAlimentador,
    deleteAlimentador,
    showToast
  } = useStore();

  const company = companies.find((c) => c.id === companyId);
  const proyecto = company?.proyectos?.find((p) => p.id === proyectoId);

  // Cargar alimentadores al montar
  useEffect(() => {
    if (proyectoId) {
      useStore.getState().fetchAlimentadores(proyectoId);
    }
  }, [proyectoId]);

  // Estados para Edición de Proyecto
  const [showEditProyectoModal, setShowEditProyectoModal] = useState(false);
  const [editProyectoNombre, setEditProyectoNombre] = useState('');
  const [editProyectoDescripcion, setEditProyectoDescripcion] = useState('');
  const [editProyectoDireccion, setEditProyectoDireccion] = useState('');
  const [editResponsableNombre, setEditResponsableNombre] = useState('');
  const [editResponsableTelefono, setEditResponsableTelefono] = useState('');
  const [editResponsableEmail, setEditResponsableEmail] = useState('');

  // Estados para Alimentadores
  const [showAddAlimModal, setShowAddAlimModal] = useState(false);
  const [alimNombre, setAlimNombre] = useState('');
  const [alimOrigen, setAlimOrigen] = useState('');
  const [alimCapacidad, setAlimCapacidad] = useState('');

  const handleUpdateProyectoSubmit = async (e) => {
    e.preventDefault();
    await updateProyecto(companyId, proyectoId, {
      nombre: editProyectoNombre,
      descripcion: editProyectoDescripcion,
      direccion: editProyectoDireccion,
      responsableNombre: editResponsableNombre || null,
      responsableTelefono: editResponsableTelefono || null,
      responsableEmail: editResponsableEmail || null
    });
    showToast("Proyecto actualizado correctamente.", "success");
    setShowEditProyectoModal(false);
  };

  const handleAddAlimentadorSubmit = async (e) => {
    e.preventDefault();
    if (!alimNombre.trim()) return;

    await addAlimentador({
      nombre: alimNombre.trim(),
      origen: alimOrigen.trim() || null,
      capacidadAmperios: alimCapacidad ? parseFloat(alimCapacidad) : null,
      proyectoId
    });

    setAlimNombre('');
    setAlimOrigen('');
    setAlimCapacidad('');
    setShowAddAlimModal(false);
    showToast("Alimentador agregado correctamente.", "success");
  };

  // Estados de pestaña activa
  const [activeTab, setActiveTab] = useState('UNIFILAR'); // 'UNIFILAR' | 'ESTRUCTURAL'
  const [searchQuery, setSearchQuery] = useState('');

  // Estados de selección múltiple
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());

  // Limpiar selección cuando cambia la pestaña o la búsqueda
  useEffect(() => {
    setSelectedIds(new Set());
  }, [activeTab, searchQuery]);

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
    const ids = activeTab === 'UNIFILAR' 
      ? filteredElementos.map(e => e.id)
      : filteredInspecciones.map(s => s.id);
    setSelectedIds(new Set(ids));
  };

  const handleDeselectAll = () => {
    setSelectedIds(new Set());
  };

  const handleDeleteSelected = () => {
    const selectedCount = selectedIds.size;
    if (selectedCount === 0) return;

    const confirmMsg = activeTab === 'UNIFILAR'
      ? `¿Estás seguro de que deseas eliminar los ${selectedCount} elementos seleccionados del Diagrama Unifilar?`
      : `¿Estás seguro de que deseas eliminar las ${selectedCount} fichas de inspección seleccionadas?`;

    if (window.confirm(confirmMsg)) {
      if (activeTab === 'UNIFILAR') {
        selectedIds.forEach((id) => {
          deleteElementoUnifilar(proyectoId, id);
        });
        showToast?.(`Se eliminaron ${selectedCount} elementos correctamente`, 'success');
      } else {
        selectedIds.forEach((id) => {
          deleteSubestacion(proyectoId, id);
        });
        showToast?.(`Se eliminaron ${selectedCount} fichas de inspección correctamente`, 'success');
      }
      setSelectedIds(new Set());
      setIsMultiSelectMode(false);
    }
  };

  // Modales
  const [showElementoModal, setShowElementoModal] = useState(false);
  const [showInspeccionModal, setShowInspeccionModal] = useState(false);

  // Estado para edición de elementos
  const [editingElemento, setEditingElemento] = useState(null);

  // Efecto para rellenar campos en caso de edición
  useEffect(() => {
    if (editingElemento) {
      setNombre(editingElemento.nombre || '');
      setUbicacion(editingElemento.ubicacion || '');
      setAlimentadoPor(editingElemento.alimentadoPor || '');
      setObservacionesGenerales(editingElemento.observacionesGenerales || '');
      setTipoElemento(editingElemento.tipoElemento || 'TABLERO');
      
      const tech = editingElemento.datosTecnicos || {};
      if (editingElemento.tipoElemento === 'TABLERO') {
        setMaxPoles(tech.maxPoles || 24);
      } else if (editingElemento.tipoElemento === 'TRANSFORMADOR') {
        setKvaTrafo(tech.kva || '500 KVA');
        setMarcaTrafo(tech.marca || '');
        setTipoTrafo(tech.tipoTransformador || 'Pedestal');
        setConexionTrafo(tech.conexion || '');
        setVoltajePrimario(tech.voltajePrimario || '13.8 kV');
        setVoltajeSecundario(tech.voltajeSecundario || '208 / 120 V');
      } else if (editingElemento.tipoElemento === 'GENERADOR') {
        setKvaGen(tech.kva || '580 kVA');
        setCombustibleGen(tech.combustible || 'DIESEL');
        setVoltajeGen(tech.voltajeGeneracion || '208 / 120 V');
        setPotenciaKwGen(tech.potenciaKw || '464 kW');
        setAmperajeGen(tech.amperaje || '1600 A');
      } else if (editingElemento.tipoElemento === 'PUESTA_TIERRA') {
        setResistenciaOhmios(tech.resistenciaOhmios || '0.5 Ω');
        setCorrienteFuga(tech.corrienteFugaAmperios || '6.4 A');
        setTipoMalla(tech.tipoMalla || '');
        setCableAcometidaTierra(tech.cableAcometida || '');
      } else if (editingElemento.tipoElemento === 'TRANSFER') {
        setCapacidadAmperios(tech.capacidadAmperios || '3200 A');
        setTipoTransferencia(tech.tipoTransferencia || 'AUTOMATICA');
        setTensionOperativa(tech.tensionOperativa || '208 V');
      } else {
        setDescripcionOtro(tech.descripcionEspecificaciones || '');
      }
    } else {
      setNombre('');
      setUbicacion('');
      setAlimentadoPor('');
      setObservacionesGenerales('');
      setTipoElemento('TABLERO');
      setMaxPoles(24);
    }
  }, [editingElemento]);

  const [showDiagramModal, setShowDiagramModal] = useState(false);

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
    (e) => e.nombre.toLowerCase().trim() === nombre.toLowerCase().trim() && e.id !== editingElemento?.id
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
        barrasPrincipales: editingElemento?.datosTecnicos?.barrasPrincipales || { ia: '0', ib: '0', ic: '0' },
        breakerPrincipal: editingElemento?.datosTecnicos?.breakerPrincipal || { marca: '', tipo: '', amp: '' },
        voltaje: editingElemento?.datosTecnicos?.voltaje || { va: '208', vb: '205', vc: '205' },
        acometida: editingElemento?.datosTecnicos?.acometida || '',
        circuits: editingElemento?.datosTecnicos?.circuits || [],
        neutroLlegada: editingElemento?.datosTecnicos?.neutroLlegada || { calibre: '', observaciones: '' },
        puestaTierra: editingElemento?.datosTecnicos?.puestaTierra || { calibre: '', observaciones: '' }
      };
    } else if (tipoElemento === 'TRANSFORMADOR') {
      datosTecnicos = {
        marca: marcaTrafo || editingElemento?.datosTecnicos?.marca || '',
        fases: editingElemento?.datosTecnicos?.fases || '3',
        potenciaKva: kvaTrafo || editingElemento?.datosTecnicos?.potenciaKva || '',
        kva: kvaTrafo || editingElemento?.datosTecnicos?.kva || '',
        tipoTransformador: tipoTrafo || editingElemento?.datosTecnicos?.tipoTransformador || 'Pedestal',
        conexion: conexionTrafo || editingElemento?.datosTecnicos?.conexion || '',
        voltajePrimario: voltajePrimario || editingElemento?.datosTecnicos?.voltajePrimario || '',
        voltajeSecundario: voltajeSecundario || editingElemento?.datosTecnicos?.voltajeSecundario || '',
        impedanciaPct: editingElemento?.datosTecnicos?.impedanciaPct || '',
        impedanciaAmp: editingElemento?.datosTecnicos?.impedanciaAmp || '',
        impedanciaTemp: editingElemento?.datosTecnicos?.impedanciaTemp || '',
        tensionPrimaria: editingElemento?.datosTecnicos?.tensionPrimaria || voltajePrimario || '',
        amperiosPrimaria: editingElemento?.datosTecnicos?.amperiosPrimaria || '',
        tensionSecundaria: editingElemento?.datosTecnicos?.tensionSecundaria || voltajeSecundario || '',
        amperiosSecundaria: editingElemento?.datosTecnicos?.amperiosSecundaria || '',
        aislamiento: editingElemento?.datosTecnicos?.aislamiento || '',
        aceite: editingElemento?.datosTecnicos?.aceite || '',
        seco: editingElemento?.datosTecnicos?.seco || '',
        acometidas: editingElemento?.datosTecnicos?.acometidas || {
          primaria: { aerea: false, subterranea: false, calibre: '', tipo: '', terminal: '', fusible: '', pararrayo: '', observaciones: '' },
          secundaria: { aerea: false, subterranea: false, calibre: '', tipo: '', terminal: '', fusible: '', pararrayo: '', observaciones: '' },
          neutro: { aerea: false, subterranea: false, calibre: '', tipo: '', terminal: '', fusible: '', pararrayo: '', observaciones: '' }
        },
        spt: editingElemento?.datosTecnicos?.spt || {
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

    if (editingElemento) {
      updateElementoUnifilar(proyectoId, editingElemento.id, {
        nombre: nombre.trim(),
        tipoElemento,
        ubicacion: ubicacion.trim() || 'Sin ubicación',
        alimentadoPor: alimentadoPor.trim() || 'No definido',
        observacionesGenerales: observacionesGenerales.trim(),
        datosTecnicos
      });
      showToast?.("Elemento actualizado correctamente.", "success");
      setEditingElemento(null);
      setShowElementoModal(false);
    } else {
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
        showToast?.("Elemento registrado correctamente.", "success");
      } else {
        alert(result.error);
      }
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
        
        {/* CARD INFORMACION DEL PROYECTO */}
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
          <div className="flex justify-between items-start gap-4">
            <div>
              <span className="text-[10px] text-amber-500 font-bold uppercase tracking-wider block mb-1">Proyecto Técnico</span>
              <h2 className="text-xl font-extrabold text-slate-100 tracking-tight flex items-center gap-2">
                <Building className="w-5 h-5 text-amber-500" /> {proyecto.nombre}
              </h2>
              <p className="text-xs text-slate-400 mt-1 max-w-2xl">{proyecto.descripcion || 'Sin descripción.'}</p>
            </div>
            {user?.role === 'ADMIN' && activeTab !== 'ESTRUCTURAL' && (
              <button
                onClick={() => {
                  setEditProyectoNombre(proyecto.nombre);
                  setEditProyectoDescripcion(proyecto.descripcion || '');
                  setEditProyectoDireccion(proyecto.direccion || '');
                  setEditResponsableNombre(proyecto.responsableNombre || '');
                  setEditResponsableTelefono(proyecto.responsableTelefono || '');
                  setEditResponsableEmail(proyecto.responsableEmail || '');
                  setShowEditProyectoModal(true);
                }}
                className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-bold rounded-lg text-slate-200 hover:text-slate-100 flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
              >
                Editar Proyecto
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-6 pt-6 border-t border-slate-900">
            <div className="md:col-span-2">
              <span className="text-[10px] text-slate-500 font-bold uppercase block">Ubicación / Dirección</span>
              <span className="text-sm font-semibold text-slate-200">{proyecto.direccion || 'No definida'}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 font-bold uppercase block">Empresa</span>
              <span className="text-sm font-semibold text-slate-200">{company?.nombre}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 font-bold uppercase block">Registro</span>
              <div className="text-[10px] text-slate-400 font-mono mt-1 space-y-0.5">
                <div>Creado: {proyecto.createdAt ? new Date(proyecto.createdAt).toLocaleString('es-ES') : 'N/D'}</div>
                <div>Actualizado: {proyecto.updatedAt ? new Date(proyecto.updatedAt).toLocaleString('es-ES') : 'N/D'}</div>
              </div>
            </div>
          </div>

          {user?.role === 'ADMIN' && (
            <div className="mt-6 pt-6 border-t border-slate-900">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                <User className="w-4 h-4 text-sky-400" /> Responsable del Proyecto (Solo Visible para Administradores)
              </h3>
              <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-900 max-w-md">
                <div className="space-y-1.5 text-xs">
                  <div><strong className="text-slate-450">Nombre:</strong> <span className="text-slate-255 font-semibold">{proyecto.responsableNombre || 'N/D'}</span></div>
                  <div><strong className="text-slate-450">Teléfono:</strong> <span className="text-slate-255 font-semibold">{proyecto.responsableTelefono || 'N/D'}</span></div>
                  <div><strong className="text-slate-450">Email:</strong> <span className="text-slate-255 font-semibold">{proyecto.responsableEmail || 'N/D'}</span></div>
                </div>
              </div>
            </div>
          )}

          {/* LISTADO DE ALIMENTADORES */}
          <div className="mt-6 pt-6 border-t border-slate-900">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-amber-500" /> Alimentadores del Proyecto ({proyecto.alimentadores?.length || 0})
              </h3>
              {user?.role === 'ADMIN' && (
                <button
                  onClick={() => setShowAddAlimModal(true)}
                  className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[10px] font-bold rounded text-amber-500 hover:text-amber-400 transition-all cursor-pointer"
                >
                  + Nuevo Alimentador
                </button>
              )}
            </div>
            {proyecto.alimentadores && proyecto.alimentadores.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {proyecto.alimentadores.map(alim => (
                  <div key={alim.id} className="bg-slate-900/40 border border-slate-850 rounded-xl p-3 flex justify-between items-center text-xs">
                    <div>
                      <div className="font-bold text-slate-200">{alim.nombre}</div>
                      <div className="text-[10px] text-slate-450 mt-0.5">
                        Origen: {alim.origen || 'No definido'} | {alim.capacidadAmperios ? `${alim.capacidadAmperios}A` : 'Amp N/D'}
                      </div>
                    </div>
                    {user?.role === 'ADMIN' && (
                      <button
                        onClick={() => {
                          if (window.confirm(`¿Estás seguro de que deseas eliminar el alimentador "${alim.nombre}"?`)) {
                            deleteAlimentador(proyectoId, alim.id);
                          }
                        }}
                        className="p-1 hover:bg-red-950/40 text-slate-500 hover:text-red-400 rounded transition-colors cursor-pointer"
                        title="Eliminar alimentador"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-slate-500 italic">No se han registrado alimentadores para este proyecto.</p>
            )}
          </div>
        </div>

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

            {/* BOTONES DE ACCIÓN AGRUPADOS POR JERARQUÍA */}
            <div className="flex flex-wrap md:flex-nowrap items-center gap-3 w-full md:w-auto justify-end">
              
              {/* Grupo 1: Generar Informes */}
              <div className="flex items-center bg-slate-950 border border-slate-800 p-1.5 rounded-xl gap-1">
                <button
                  onClick={() => navigate(`/empresa/${companyId}/proyecto/${proyectoId}/informe`)}
                  className="bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-bold transition-all px-3 py-2 rounded-lg flex items-center gap-1.5 h-9 text-xs cursor-pointer shadow-md"
                  title="Generar Informe Técnico PDF completo"
                >
                  <FileText className="w-3.5 h-3.5" /> Informe PDF
                </button>
                <button
                  type="button"
                  disabled
                  title="Exportar a Excel (Próximamente)"
                  className="opacity-40 text-slate-400 font-semibold px-3 py-2 rounded-lg flex items-center gap-1.5 h-9 text-xs cursor-not-allowed bg-slate-900 border border-slate-800"
                >
                  <FileText className="w-3.5 h-3.5 text-slate-500" /> Excel (Futuro)
                </button>
              </div>

              {/* Grupo 2: Controles específicos según Pestaña Activa */}
              {user?.role !== 'CLIENT' && (
                <div className="flex items-center gap-2">
                  {/* Controles para Diagrama Unifilar */}
                  {activeTab === 'UNIFILAR' && (
                    <>
                      <button
                        onClick={() => {
                          setIsMultiSelectMode(!isMultiSelectMode);
                          setSelectedIds(new Set());
                        }}
                        className={`border font-semibold transition-all px-3.5 py-2 rounded-xl flex items-center justify-center gap-2 h-9 cursor-pointer text-xs ${
                          isMultiSelectMode 
                            ? 'bg-amber-500/10 border-amber-500/40 text-amber-500' 
                            : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-850'
                        }`}
                      >
                        <CheckSquare className="w-4 h-4" /> {isMultiSelectMode ? 'Cancelar Selección' : 'Seleccionar Varios'}
                      </button>

                      <button
                        onClick={() => {
                          setTipoElemento('TABLERO');
                          setShowElementoModal(true);
                        }}
                        className="bg-slate-900 border border-slate-800 text-slate-100 font-semibold hover:bg-slate-850 active:scale-95 transition-all px-3.5 py-2 rounded-xl flex items-center justify-center gap-2 h-9 cursor-pointer text-xs"
                      >
                        <Zap className="w-4 h-4 text-amber-500" /> + Crear Elemento
                      </button>
                    </>
                  )}

                  {/* Controles para Inspección Estructural */}
                  {activeTab === 'ESTRUCTURAL' && (
                    <button
                      onClick={() => setShowInspeccionModal(true)}
                      className="bg-slate-900 border border-slate-800 text-slate-100 font-bold hover:bg-slate-850 active:scale-95 transition-all px-3.5 py-2 rounded-xl flex items-center justify-center gap-2 h-9 cursor-pointer text-xs"
                    >
                      <Building className="w-4 h-4 text-amber-500" /> + Crear Inspección
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {isMultiSelectMode && (
          <div className="bg-slate-950 border border-amber-500/30 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 animate-fadeIn shadow-lg shadow-amber-500/5">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <span className="text-xs text-slate-300 font-medium">
                Modo Selección Múltiple: <strong className="text-amber-500 font-bold">{selectedIds.size}</strong> {selectedIds.size === 1 ? 'elemento seleccionado' : 'elementos seleccionados'}
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

        {/* CONTENIDO DE PESTAÑA A: INSPECCIÓN ESTRUCTURAL */}
        {activeTab === 'ESTRUCTURAL' && (
          <div>
            <div className="mb-4">
              <h2 className="text-md font-bold text-slate-200">Fichas de Inspección Estructural y Entorno</h2>
              <p className="text-xs text-slate-500">Inspección de obras civiles, cerramiento y condiciones perimetrales de subestaciones.</p>
            </div>

            {filteredInspecciones.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredInspecciones.map((item) => {
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
                      <div className="h-32 w-full bg-gradient-to-br from-slate-900 to-slate-900/40 relative flex flex-col items-center justify-center border-b border-slate-900/50 select-none">
                        <Building className="w-9 h-9 text-amber-500/70 group-hover:scale-105 transition-transform duration-500" />
                        <span className="text-[9px] uppercase font-bold tracking-widest opacity-35 mt-2">Inspección Visual</span>
                        
                        <div className="absolute top-3 left-3">
                          <span className="px-2 py-0.5 rounded-lg text-[9px] font-bold bg-amber-950/90 text-amber-400 border border-amber-800/30 font-mono">
                            🏢 SUBESTACIÓN
                          </span>
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
                              if (window.confirm(`¿Estás seguro de que deseas eliminar la inspección "${item.nombre}"?`)) {
                                deleteSubestacion(proyectoId, item.id);
                              }
                            }}
                            className="absolute top-3 right-3 p-1.5 bg-slate-950/80 hover:bg-red-955/20 text-slate-500 hover:text-red-400 rounded-lg opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                            title="Eliminar Inspección"
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
                );
              })}
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
            <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-md font-bold text-slate-200">Equipos Registrados en el Diagrama Unifilar</h2>
                <p className="text-xs text-slate-500">Tableros, Transformadores, Generadores, Malla de Puesta a Tierra y Unidades de Transferencia.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowDiagramModal(true)}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-4.5 py-2.5 rounded-xl flex items-center justify-center gap-2 text-xs transition-all shadow-md active:scale-98 cursor-pointer self-start md:self-auto"
              >
                <Zap className="w-4 h-4 fill-slate-950" /> Ver Diagrama Gráfico
              </button>
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
                      onClick={() => {
                        if (isMultiSelectMode) {
                          handleToggleSelect(item.id);
                        } else {
                          navigate(`/empresa/${companyId}/tablero/${item.id}`);
                        }
                      }}
                      className={`bg-slate-950 border flex flex-col justify-between overflow-hidden cursor-pointer transition-all hover:-translate-y-0.5 group rounded-2xl shadow-md hover:shadow-xl ${
                        isMultiSelectMode && selectedIds.has(item.id) 
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
                              🔄 TRANSFER
                            </span>
                          )}
                        </div>

                        {/* Indicador de casilla de verificación para Selección Múltiple */}
                        {isMultiSelectMode && (
                          <div className="absolute top-3 right-3 z-10">
                            <span className={`p-1.5 rounded-lg flex items-center justify-center border transition-all ${
                              selectedIds.has(item.id) 
                                ? 'bg-amber-500 border-amber-400 text-slate-950 shadow-md shadow-amber-500/20' 
                                : 'bg-slate-950/90 border-slate-700 text-slate-500'
                            }`}>
                              {selectedIds.has(item.id) ? (
                                <CheckSquare className="w-3.5 h-3.5" />
                              ) : (
                                <div className="w-3.5 h-3.5 border border-slate-600 rounded-sm" />
                              )}
                            </span>
                          </div>
                        )}

                        {user?.role !== 'CLIENT' && !isMultiSelectMode && (
                          <div className="absolute top-3 right-3 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingElemento(item);
                                setShowElementoModal(true);
                              }}
                              className="p-1.5 bg-slate-950/80 hover:bg-slate-900 text-slate-400 hover:text-amber-500 rounded-lg transition-all cursor-pointer shadow-md"
                              title="Editar Elemento"
                            >
                              <Settings className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (window.confirm(`¿Estás seguro de que deseas eliminar el elemento "${item.nombre}"?`)) {
                                  deleteElementoUnifilar(proyectoId, item.id);
                                }
                              }}
                              className="p-1.5 bg-slate-950/80 hover:bg-red-955/20 text-slate-400 hover:text-red-400 rounded-lg transition-all cursor-pointer shadow-md"
                              title="Eliminar Elemento"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Contenido de Tarjeta */}
                      <div className="p-5 flex-1 flex flex-col justify-between">
                        <div className="space-y-1">
                          <h3 className="text-sm font-bold text-slate-100 group-hover:text-amber-500 transition-colors truncate">
                            {item.nombre}
                          </h3>
                          
                          <div className="space-y-1.5 mt-3 text-[11px] text-slate-400 border-t border-slate-900/60 pt-3">
                            <p className="truncate"><span className="text-slate-500 font-bold">Ubicación:</span> {item.ubicacion}</p>
                            <p className="truncate"><span className="text-slate-500 font-bold">Alimentado por:</span> {item.alimentadoPor || 'No definido'}</p>

                            {/* Mostrar resúmenes enriquecidos de las fichas técnicas reales */}
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
                            <span className="font-bold text-amber-500">Ficha Completa 2025</span>
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
          <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => { setShowElementoModal(false); setEditingElemento(null); }} />
          
          <div className="relative w-full max-w-md bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl p-6 overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center pb-4 border-b border-slate-800 shrink-0">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-500" /> {editingElemento ? `Editar Plantilla: ${editingElemento.nombre}` : 'Registrar Plantilla Técnica'}
              </h3>
              <button 
                onClick={() => { setShowElementoModal(false); setEditingElemento(null); }}
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
                  Alimentado Por (Procedencia / Jerarquía)
                </label>
                <div className="space-y-2">
                  <select
                    value={elementos.some(el => el.nombre === alimentadoPor) ? alimentadoPor : (alimentadoPor ? 'OTRO' : '')}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === 'OTRO') {
                        setAlimentadoPor('');
                      } else {
                        setAlimentadoPor(val);
                      }
                    }}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-xl text-xs text-slate-100 focus:outline-none h-11 cursor-pointer"
                  >
                    <option value="">-- No definido / Ninguno --</option>
                    {elementos.filter(el => el.id !== editingElemento?.id).map(el => (
                      <option key={el.id} value={el.nombre}>
                        {el.nombre} ({el.tipoElemento === 'TABLERO' ? 'PANEL ELÉCTRICO' : el.tipoElemento})
                      </option>
                    ))}
                    <option value="OTRO">Especificar otro (texto libre)...</option>
                  </select>

                  {(!elementos.some(el => el.nombre === alimentadoPor) || alimentadoPor === '') && (
                    <input
                      type="text"
                      value={alimentadoPor}
                      onChange={(e) => setAlimentadoPor(e.target.value)}
                      placeholder="Ej. Transformador 500 KVA o CORPOELEC"
                      className="w-full px-3.5 py-2 bg-slate-900 border border-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-xl text-sm text-slate-100 focus:outline-none placeholder-slate-600 h-11 transition-all"
                    />
                  )}
                </div>
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
                  onClick={() => { setShowElementoModal(false); setEditingElemento(null); }}
                  className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-xs font-bold rounded-lg text-slate-300 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!isElementoFormValid}
                  className="bg-amber-500 text-slate-950 font-semibold hover:bg-amber-400 active:scale-98 transition-all px-4 py-2.5 rounded-lg flex flex-row items-center justify-center gap-2 h-10 whitespace-nowrap text-xs cursor-pointer shadow-md disabled:opacity-40"
                >
                  {editingElemento ? 'Guardar Cambios' : 'Guardar Plantilla'}
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

      {/* Modal de Edición de Proyecto */}
      {showEditProyectoModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn font-sans text-xs">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl p-6 space-y-6">
            <div className="flex justify-between items-center pb-4 border-b border-slate-800">
              <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <Building className="w-5 h-5 text-amber-500" /> Editar Proyecto
              </h3>
              <button 
                onClick={() => setShowEditProyectoModal(false)}
                className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateProyectoSubmit} className="space-y-4">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Nombre del Proyecto</label>
                <input 
                  type="text" 
                  value={editProyectoNombre} 
                  onChange={(e) => setEditProyectoNombre(e.target.value)} 
                  required 
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-amber-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Descripción del Proyecto</label>
                <textarea 
                  value={editProyectoDescripcion} 
                  onChange={(e) => setEditProyectoDescripcion(e.target.value)} 
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-amber-500 text-sm h-20"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Dirección / Ubicación Física</label>
                <input 
                  type="text" 
                  value={editProyectoDireccion} 
                  onChange={(e) => setEditProyectoDireccion(e.target.value)} 
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-amber-500 text-sm"
                />
              </div>

              <div className="border-t border-slate-800 pt-4 mt-4 space-y-4">
                <h4 className="font-bold text-sky-400 uppercase tracking-wider text-[10px]">Responsable del Proyecto</h4>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-slate-500 font-medium mb-1">Nombre</label>
                    <input 
                      type="text" 
                      value={editResponsableNombre} 
                      onChange={(e) => setEditResponsableNombre(e.target.value)} 
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-100 focus:outline-none focus:border-amber-500 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 font-medium mb-1">Teléfono</label>
                    <input 
                      type="text" 
                      value={editResponsableTelefono} 
                      onChange={(e) => setEditResponsableTelefono(e.target.value)} 
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-100 focus:outline-none focus:border-amber-500 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 font-medium mb-1">Email</label>
                    <input 
                      type="email" 
                      value={editResponsableEmail} 
                      onChange={(e) => setEditResponsableEmail(e.target.value)} 
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-100 focus:outline-none focus:border-amber-500 text-xs"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t border-slate-800">
                <button 
                  type="button" 
                  onClick={() => setShowEditProyectoModal(false)}
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

      {/* Modal de Agregar Alimentador */}
      {showAddAlimModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn font-sans text-xs">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full shadow-2xl p-6 space-y-6">
            <div className="flex justify-between items-center pb-4 border-b border-slate-800">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-500" /> Nuevo Alimentador
              </h3>
              <button 
                onClick={() => setShowAddAlimModal(false)}
                className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddAlimentadorSubmit} className="space-y-4">
              <div>
                <label className="block text-slate-450 font-semibold mb-1">Nombre / Identificador</label>
                <input 
                  type="text" 
                  value={alimNombre} 
                  onChange={(e) => setAlimNombre(e.target.value)} 
                  required 
                  placeholder="Ej. Alimentador Principal A"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-amber-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-slate-450 font-semibold mb-1">Origen</label>
                <input 
                  type="text" 
                  value={alimOrigen} 
                  onChange={(e) => setAlimOrigen(e.target.value)} 
                  placeholder="Ej. Subestación Principal"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-amber-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-slate-450 font-semibold mb-1">Capacidad (Amperios)</label>
                <input 
                  type="number" 
                  value={alimCapacidad} 
                  onChange={(e) => setAlimCapacidad(e.target.value)} 
                  placeholder="Ej. 800"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-amber-500 text-sm"
                />
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t border-slate-800">
                <button 
                  type="button" 
                  onClick={() => setShowAddAlimModal(false)}
                  className="px-4 py-2 border border-slate-700 text-slate-350 hover:bg-slate-800 hover:text-slate-200 rounded-lg font-bold transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 bg-amber-500 text-slate-950 hover:bg-amber-400 active:scale-98 rounded-lg font-bold transition-all shadow-md cursor-pointer"
                >
                  Agregar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal del Diagrama Unifilar Gráfico */}
      <ModalDiagramaUnifilar
        isOpen={showDiagramModal}
        onClose={() => setShowDiagramModal(false)}
        elementos={elementos}
        companyName={company?.nombre}
      />

    </div>
  );
};

export default ProyectoView;
