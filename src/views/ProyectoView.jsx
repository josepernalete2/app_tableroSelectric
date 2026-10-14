import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import useStore, { getNextElementId, getElementCode, PREFIX_MAP, formatElementTitleWithId, sortElementsByOrder } from '../store/useStore';
import { useConfirm } from '../context/ConfirmContext';
import ModalDiagramaUnifilar from '../components/ModalDiagramaUnifilar';
import SelectorAlimentadorJerarquico from '../components/SelectorAlimentadorJerarquico';
import AvanceProgressBar from '../components/AvanceProgressBar';
import ElementoCardActions from '../components/ElementoCardActions';
import { 
  TENSIONES_COVENIN_159_BT, 
  TENSIONES_COVENIN_159_MT, 
  TENSIONES_COVENIN_TODAS,
  TABLERO_CAPACIDADES_POLOS,
  TABLERO_CANTIDAD_POLOS_ESTANDAR,
  TABLERO_USO_ELECTRICO,
  TABLERO_MONTAJE_OPCIONES,
  TABLERO_HERMETICIDAD_NEMA_IP,
  MARCA_OPTIONS,
  AMP_OPTIONS,
  TIPO_OPTIONS
} from '../utils/constants';
import { 
  ArrowLeft, 
  Layers, 
  Trash2, 
  Search, 
  AlertTriangle,
  X,
  Check,
  Camera,
  Calendar,
  User,
  Zap,
  Building,
  Gauge,
  Cpu,
  ShieldAlert,
  RefreshCw,
  FileText,
  CheckSquare,
  Settings,
  HelpCircle,
  Plus,
  Edit3,
  Tag,
  FolderOpen,
  MapPin,
  Phone,
  Mail,
  Activity
} from 'lucide-react';
import HelpModal from '../components/HelpModal';
import ModalEditarIdElemento from '../components/ModalEditarIdElemento';
import TensionNominalInput from '../components/TensionNominalInput';
import { compressImageToBase64, getCleanImageUrl } from '../utils/imageUtils';
import { API_BASE_URL } from '../utils/api';
import { calcularPotenciaEstimadaTablero } from '../utils/potenciaTablero';

// Componente para renderizar Base64 / Blobs / URLs de forma segura
const SafeImage = ({ blob, src, alt, className }) => {
  const [objectUrl, setObjectUrl] = useState(null);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
    if (blob instanceof Blob || blob instanceof File) {
      const url = URL.createObjectURL(blob);
      setObjectUrl(url);
      return () => {
        URL.revokeObjectURL(url);
      };
    } else {
      setObjectUrl(null);
    }
  }, [blob, src]);

  const rawSrc = objectUrl || (typeof src === 'string' ? src : null);
  const finalSrc = getCleanImageUrl(rawSrc, API_BASE_URL);
  if (!finalSrc || hasError) return null;

  return (
    <img 
      src={finalSrc} 
      alt={alt || "Evidencia fotográfica"} 
      className={className} 
      onError={() => setHasError(true)}
    />
  );
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
    addPuntoMedicion,
    deletePuntoMedicion,
    updatePuntoMedicion,
    addCcm,
    deleteCcm,
    updateCcm,
    updateProyecto,
    moverElemento,
    reordenarColeccion,
    showToast
  } = useStore();

  const company = companies.find((c) => c.id === companyId);
  const proyecto = company?.proyectos?.find((p) => p.id === proyectoId);

  const { confirm, alert: customAlert } = useConfirm();

  // Estados para Edición de Proyecto
  const [showEditProyectoModal, setShowEditProyectoModal] = useState(false);
  const [editProyectoNombre, setEditProyectoNombre] = useState('');
  const [editProyectoDescripcion, setEditProyectoDescripcion] = useState('');
  const [editProyectoDireccion, setEditProyectoDireccion] = useState('');
  const [editResponsableNombre, setEditResponsableNombre] = useState('');
  const [editResponsableTelefono, setEditResponsableTelefono] = useState('');
  const [editResponsableEmail, setEditResponsableEmail] = useState('');

  const handleUpdateProyectoSubmit = async (e) => {
    e.preventDefault();
    if (!editProyectoNombre.trim()) return;

    const finalDireccion = editProyectoDireccion.trim() || company?.direccion || company?.ubicacion || '';

    updateProyecto(companyId, proyectoId, {
      nombre: editProyectoNombre.trim(),
      descripcion: editProyectoDescripcion.trim(),
      direccion: finalDireccion,
      ubicacion: finalDireccion,
      responsableNombre: editResponsableNombre.trim(),
      responsableTelefono: editResponsableTelefono.trim(),
      responsableEmail: editResponsableEmail.trim(),
      responsable: {
        nombre: editResponsableNombre.trim(),
        telefono: editResponsableTelefono.trim(),
        email: editResponsableEmail.trim()
      }
    });

    setShowEditProyectoModal(false);
    showToast?.("Información del proyecto actualizada.", "success");
  };

  const handleOpenEditModal = () => {
    setEditProyectoNombre(proyecto?.nombre || '');
    setEditProyectoDescripcion(proyecto?.descripcion || '');
    setEditProyectoDireccion(proyecto?.direccion || proyecto?.ubicacion || company?.direccion || company?.ubicacion || '');
    setEditResponsableNombre(proyecto?.responsableNombre || (typeof proyecto?.responsable === 'object' ? proyecto?.responsable?.nombre : proyecto?.responsable) || company?.contactoPrincipal || company?.responsable || '');
    setEditResponsableTelefono(proyecto?.responsableTelefono || (typeof proyecto?.responsable === 'object' ? proyecto?.responsable?.telefono : '') || company?.telefono || '');
    setEditResponsableEmail(proyecto?.responsableEmail || (typeof proyecto?.responsable === 'object' ? proyecto?.responsable?.email : '') || company?.email || '');
    setShowEditProyectoModal(true);
  };

  // Estados de pestaña activa
  const [activeTab, setActiveTab] = useState('UNIFILAR'); // 'UNIFILAR' | 'ESTRUCTURAL'
  const [searchQuery, setSearchQuery] = useState('');

  // Estado para Modal de Edición de ID (Solo Administradores)
  const [editIdModalData, setEditIdModalData] = useState({ isOpen: false, elemento: null, tipoElemento: 'TABLERO' });

  // Estado para arrastrar y soltar (Drag and Drop)
  const [draggedItemId, setDraggedItemId] = useState(null);

  // Obtención y ordenamiento cronológico / personalizado estricto
  const elementos = useMemo(() => {
    return sortElementsByOrder(proyecto?.elementosUnifilares || proyecto?.tableros || []);
  }, [proyecto]);

  const inspecciones = useMemo(() => {
    return sortElementsByOrder(proyecto?.inspeccionesSubestacion || proyecto?.subestaciones || []);
  }, [proyecto]);

  const puntosMedicion = useMemo(() => {
    return sortElementsByOrder(proyecto?.puntosMedicion || []);
  }, [proyecto]);

  const filteredElementos = useMemo(() => {
    if (!searchQuery.trim()) return elementos;
    const q = searchQuery.toLowerCase();
    return elementos.filter(e => 
      e.nombre?.toLowerCase().includes(q) || 
      e.codigo?.toLowerCase().includes(q) || 
      e.tipoElemento?.toLowerCase().includes(q) ||
      e.ubicacion?.toLowerCase().includes(q)
    );
  }, [elementos, searchQuery]);

  const filteredInspecciones = useMemo(() => {
    if (!searchQuery.trim()) return inspecciones;
    const q = searchQuery.toLowerCase();
    return inspecciones.filter(i => 
      i.nombre?.toLowerCase().includes(q) || 
      i.codigo?.toLowerCase().includes(q) || 
      i.tipoElemento?.toLowerCase().includes(q) ||
      i.ubicacion?.toLowerCase().includes(q) ||
      i.inspector?.toLowerCase().includes(q)
    );
  }, [inspecciones, searchQuery]);

  const filteredPuntosMedicion = useMemo(() => {
    if (!searchQuery.trim()) return puntosMedicion;
    const q = searchQuery.toLowerCase();
    return puntosMedicion.filter(item => 
      (item.nombre && item.nombre.toLowerCase().includes(q)) ||
      (item.nombreUsuario && item.nombreUsuario.toLowerCase().includes(q)) ||
      (item.numeroContrato && item.numeroContrato.toLowerCase().includes(q)) ||
      (item.codigoElementoPrincipal && item.codigoElementoPrincipal.toLowerCase().includes(q))
    );
  }, [puntosMedicion, searchQuery]);

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

  const handleSelectAll = (items) => {
    setSelectedIds(new Set(items.map((i) => i.id)));
  };

  const handleDeselectAll = () => {
    setSelectedIds(new Set());
  };

  const handleDeleteSelected = async () => {
    const selectedCount = selectedIds.size;
    if (selectedCount === 0) return;

    const confirmMsg = activeTab === 'UNIFILAR'
      ? `¿Estás seguro de que deseas eliminar los ${selectedCount} elementos seleccionados del Diagrama Unifilar?`
      : `¿Estás seguro de que deseas eliminar las ${selectedCount} fichas de inspección seleccionadas?`;

    const ok = await confirm({
      title: 'Eliminar elementos seleccionados',
      message: confirmMsg,
      type: 'danger',
      confirmText: 'Eliminar seleccionados'
    });

    if (ok) {
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
  const [showPuntoMedicionModal, setShowPuntoMedicionModal] = useState(false);
  const [showCcmModal, setShowCcmModal] = useState(false);

  // Campos de Punto de Medición
  const [puntoMedicionNombre, setPuntoMedicionNombre] = useState('');
  const [puntoMedicionUsuario, setPuntoMedicionUsuario] = useState('');
  const [puntoMedicionNIC, setPuntoMedicionNIC] = useState('');
  const [puntoMedicionNivelTension, setPuntoMedicionNivelTension] = useState('Media Tensión');

  // Campos de CCM
  const [ccmNombre, setCcmNombre] = useState('');
  const [ccmPlanta, setCcmPlanta] = useState('');
  const [ccmArea, setCcmArea] = useState('');

  const handleCreateCcmSubmit = (e) => {
    e.preventDefault();
    if (!ccmNombre.trim()) {
      showToast?.('Por favor ingresa la identificación o tag del CCM.', 'error');
      return;
    }

    const payload = {
      nombre: ccmNombre,
      plantaInstalacion: ccmPlanta,
      areaProceso: ccmArea,
      fecha: new Date().toISOString().split('T')[0],
      inspector: user?.nombre || user?.username || 'Inspector',
      supervisor: '',
      parametrosElectricos: {},
      gavetasBucketLog: [],
      inspeccionFisica: {},
      seguridadTermografia: {},
      hallazgosCriticos: []
    };

    const result = addCcm(proyectoId, payload);
    if (result.success) {
      showToast?.('Centro de Control de Motores (CCM) creado exitosamente', 'success');
      setShowCcmModal(false);
      setCcmNombre('');
      setCcmPlanta('');
      setCcmArea('');
    } else {
      showToast?.(result.error || 'Error al crear el CCM', 'error');
    }
  };

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
        setTableroCapacidadPolos(tech.capacidadPolos || (tech.fases === 1 ? 'Monopolar (1F)' : (tech.fases === 2 ? 'Bipolar (2F)' : 'Tripolar (3F)')));
        setTableroUsoElectrico(tech.usoElectrico || 'TDF (Tablero de Distribución y Fuerza)');
        setTableroMontaje(tech.montaje || (tech.tipo === 'empotrado' ? 'Empotrar / Embutir' : (tech.tipo === 'autosoportado' ? 'Autosoportado (Gabinete de Piso / Switchgear)' : 'Superficial')));
        setTableroHermeticidad(tech.nivelHermeticidad || 'Uso Interior Seco (NEMA 1 / IP20)');
        setTableroTension(tech.tensionNominal || editingElemento.tension || '208Y/120 V (3Φ - 4 hilos Estrella)');
        setBreakerMarca(tech.breakerPrincipal?.marca || '');
        setBreakerTipo(tech.breakerPrincipal?.tipo || '');
        setBreakerAmp(tech.breakerPrincipal?.amp || '100');
        setVoltajeVa(tech.voltaje?.va || '208');
        setVoltajeVb(tech.voltaje?.vb || '205');
        setVoltajeVc(tech.voltaje?.vc || '205');
        setCorrienteIa(tech.barrasPrincipales?.ia || '0');
        setCorrienteIb(tech.barrasPrincipales?.ib || '0');
        setCorrienteIc(tech.barrasPrincipales?.ic || '0');
        setAcometidaConductor(tech.acometida || '');
      } else if (editingElemento.tipoElemento === 'TRANSFORMADOR') {
        setKvaTrafo(tech.kva || tech.potenciaKva || '');
        setMarcaTrafo(tech.marca || '');
        setTipoTrafo(tech.tipoTransformador || 'Pedestal');
        setConexionTrafo(tech.conexion || '');
        setVoltajePrimario(tech.voltajePrimario || tech.tensionPrimaria || '');
        setVoltajeSecundario(tech.voltajeSecundario || tech.tensionSecundaria || '');
      } else if (editingElemento.tipoElemento === 'GENERADOR') {
        setKvaGen(tech.kva || '');
        setCombustibleGen(tech.combustible || tech.tipoCombustible || 'DIESEL');
        setVoltajeGen(tech.voltajeGeneracion || tech.voltaje || '');
        setPotenciaKwGen(tech.potenciaKw || tech.kw || '');
        setAmperajeGen(tech.amperaje || '');
      } else if (editingElemento.tipoElemento === 'PUESTA_TIERRA') {
        setResistenciaOhmios(tech.resistenciaOhmios || '');
        setCorrienteFuga(tech.corrienteFugaAmperios || '');
        setTipoMalla(tech.tipoMalla || '');
        setCableAcometidaTierra(tech.cableAcometida || '');
      } else if (editingElemento.tipoElemento === 'TRANSFER') {
        setCapacidadAmperios(tech.capacidadAmperios || '');
        setTipoTransferencia(tech.tipoTransferencia || 'AUTOMATICA');
        setTensionOperativa(tech.tensionOperativa || '');
      } else if (editingElemento.tipoElemento === 'BANCO_CONDENSADOR') {
        setKvarTotal(tech.potenciaReactivaTotal || tech.kvarTotal || '');
        setPasosCondensador(tech.numPasos || tech.pasosCondensador || '');
        setTipoBanco(tech.tipoCompensacion === 'Fija' ? 'FIJO' : 'AUTOMATICO');
        setTensionBanco(tech.tensionNominal || tech.tensionBanco || '');
      } else if (editingElemento.tipoElemento === 'PUNTO_SUMINISTRO') {
        setSuministroTension(tech.nivelTension || tech.tensionNominal || '');
        setSuministroEmpresa(tech.empresaDistribuidora || 'CORPOELEC');
        setSuministroTipoAcometida(tech.tipoAcometida || 'Subterránea');
        setSuministroCapacidad(tech.capacidadContratadaKva || tech.cargaContratadaKva || tech.capacidadKva || '');
        setSuministroTipoMedicion(tech.tipoMedicion || 'Medición Directa (Baja Tensión)');
        setSuministroEnlaceCorpoelec(tech.enlaceCorpoelec !== undefined ? tech.enlaceCorpoelec : true);
        setSuministroNumeroContrato(tech.numeroContrato || tech.contrato || '');
        setSuministroNic(tech.nic || tech.numeroMedidor || '');
        setSuministroPosteTrafo(tech.posteTransformador || tech.posteTrafo || '');
      } else if (editingElemento.tipoElemento === 'CCM') {
        setCcmCapacidadBarra(tech.capacidadBarraAmperios || '');
        setCcmTension(tech.tensionOperativa || '');
        setCcmBreakerPrincipal(tech.breakerPrincipal || '');
        setCcmNumeroGavetas(tech.numeroGavetas || 8);
      } else {
        setDescripcionOtro(tech.descripcionEspecificaciones || '');
      }
      setFoto(editingElemento.foto || null);
      setFotoBlob(null);
      setPreviewUrl(editingElemento.foto || null);
    } else {
      setNombre('');
      setUbicacion('');
      setAlimentadoPor('');
      setObservacionesGenerales('');
      setTipoElemento('TABLERO');
      setMaxPoles(24);
      setTableroCapacidadPolos('Tripolar (3F)');
      setTableroUsoElectrico('TDF (Tablero de Distribución y Fuerza)');
      setTableroMontaje('Superficial');
      setTableroHermeticidad('Uso Interior Seco (NEMA 1 / IP20)');
      setTableroTension('208Y/120 V (3Φ - 4 hilos Estrella)');
      setBreakerMarca('');
      setBreakerTipo('');
      setBreakerAmp('100');
      setVoltajeVa('208');
      setVoltajeVb('205');
      setVoltajeVc('205');
      setCorrienteIa('0');
      setCorrienteIb('0');
      setCorrienteIc('0');
      setAcometidaConductor('');
      setEliminarFoto(false);
      setKvaTrafo('');
      setMarcaTrafo('');
      setConexionTrafo('');
      setVoltajePrimario('');
      setVoltajeSecundario('');
      setKvaGen('');
      setVoltajeGen('');
      setPotenciaKwGen('');
      setAmperajeGen('');
      setResistenciaOhmios('');
      setCorrienteFuga('');
      setTipoMalla('');
      setCableAcometidaTierra('');
      setCapacidadAmperios('');
      setTensionOperativa('');
      setKvarTotal('');
      setPasosCondensador('');
      setTensionBanco('');
      setSuministroTension('');
      setSuministroEmpresa('CORPOELEC');
      setSuministroTipoAcometida('Subterránea');
      setSuministroCapacidad('');
      setSuministroTipoMedicion('Medición Directa (Baja Tensión)');
      setSuministroEnlaceCorpoelec(true);
      setSuministroNumeroContrato('');
      setSuministroNic('');
      setSuministroPosteTrafo('');
      setCcmCapacidadBarra('');
      setCcmTension('');
      setCcmBreakerPrincipal('');
      setDescripcionOtro('');
      setFoto(null);
      setFotoBlob(null);
      setPreviewUrl(null);
    }
  }, [editingElemento]);

  const [showDiagramModal, setShowDiagramModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);

  // Selector de plantilla / tipo de elemento
  const [tipoElemento, setTipoElemento] = useState('TABLERO'); // 'TABLERO' | 'TRANSFORMADOR' | 'GENERADOR' | 'PUESTA_TIERRA' | 'TRANSFER' | 'PUNTO_SUMINISTRO' | 'CCM' | 'BANCO_CONDENSADOR' | 'OTRO'

  // Campos comunes
  const [nombre, setNombre] = useState('');
  const [ubicacion, setUbicacion] = useState('');
  const [alimentadoPor, setAlimentadoPor] = useState('');
  const [observacionesGenerales, setObservacionesGenerales] = useState('');
  const [fotoBlob, setFotoBlob] = useState(null);
  const [foto, setFoto] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  // Campos de Tablero
  const [maxPoles, setMaxPoles] = useState(24);
  const [tableroCapacidadPolos, setTableroCapacidadPolos] = useState('Tripolar (3F)');
  const [tableroUsoElectrico, setTableroUsoElectrico] = useState('TDF (Tablero de Distribución y Fuerza)');
  const [tableroMontaje, setTableroMontaje] = useState('Superficial');
  const [tableroHermeticidad, setTableroHermeticidad] = useState('Uso Interior Seco (NEMA 1 / IP20)');
  const [tableroTension, setTableroTension] = useState('208Y/120 V (3Φ - 4 hilos Estrella)');
  const [eliminarFoto, setEliminarFoto] = useState(false);

  // Parámetros Técnicos de Interruptor Principal, Metrología y Acometida
  const [breakerMarca, setBreakerMarca] = useState('');
  const [breakerTipo, setBreakerTipo] = useState('');
  const [breakerAmp, setBreakerAmp] = useState('100');
  const [voltajeVa, setVoltajeVa] = useState('208');
  const [voltajeVb, setVoltajeVb] = useState('205');
  const [voltajeVc, setVoltajeVc] = useState('205');
  const [corrienteIa, setCorrienteIa] = useState('0');
  const [corrienteIb, setCorrienteIb] = useState('0');
  const [corrienteIc, setCorrienteIc] = useState('0');
  const [acometidaConductor, setAcometidaConductor] = useState('');

  // Campos de Transformador
  const [kvaTrafo, setKvaTrafo] = useState('');
  const [marcaTrafo, setMarcaTrafo] = useState('');
  const [tipoTrafo, setTipoTrafo] = useState('Pedestal'); // 'Pedestal' | 'Seco' | 'Poste'
  const [conexionTrafo, setConexionTrafo] = useState('');
  const [voltajePrimario, setVoltajePrimario] = useState('');
  const [voltajeSecundario, setVoltajeSecundario] = useState('');

  // Campos de Generador
  const [kvaGen, setKvaGen] = useState('');
  const [combustibleGen, setCombustibleGen] = useState('DIESEL');
  const [voltajeGen, setVoltajeGen] = useState('');
  const [potenciaKwGen, setPotenciaKwGen] = useState('');
  const [amperajeGen, setAmperajeGen] = useState('');

  // Campos de Puesta a Tierra
  const [resistenciaOhmios, setResistenciaOhmios] = useState('');
  const [corrienteFuga, setCorrienteFuga] = useState('');
  const [tipoMalla, setTipoMalla] = useState('');
  const [cableAcometidaTierra, setCableAcometidaTierra] = useState('');

  // Campos de Transfer
  const [capacidadAmperios, setCapacidadAmperios] = useState('');
  const [tipoTransferencia, setTipoTransferencia] = useState('AUTOMATICA');
  const [tensionOperativa, setTensionOperativa] = useState('');

  // Campos de Banco de Condensadores
  const [kvarTotal, setKvarTotal] = useState('');
  const [pasosCondensador, setPasosCondensador] = useState('');
  const [tipoBanco, setTipoBanco] = useState('AUTOMATICO');
  const [tensionBanco, setTensionBanco] = useState('');

  // Campos de Punto de Suministro
  const [suministroTension, setSuministroTension] = useState('');
  const [suministroEmpresa, setSuministroEmpresa] = useState('CORPOELEC');
  const [suministroTipoAcometida, setSuministroTipoAcometida] = useState('Subterránea');
  const [suministroCapacidad, setSuministroCapacidad] = useState('');
  const [suministroTipoMedicion, setSuministroTipoMedicion] = useState('Medición Directa (Baja Tensión)');
  const [suministroEnlaceCorpoelec, setSuministroEnlaceCorpoelec] = useState(true);
  const [suministroNumeroContrato, setSuministroNumeroContrato] = useState('');
  const [suministroNic, setSuministroNic] = useState('');
  const [suministroPosteTrafo, setSuministroPosteTrafo] = useState('');

  // Campos de CCM Elemento
  const [ccmCapacidadBarra, setCcmCapacidadBarra] = useState('');
  const [ccmTension, setCcmTension] = useState('');
  const [ccmBreakerPrincipal, setCcmBreakerPrincipal] = useState('');
  const [ccmNumeroGavetas, setCcmNumeroGavetas] = useState(8);

  // Campos de Otro
  const [descripcionOtro, setDescripcionOtro] = useState('');

  // Campos de Inspecciones Separadas (Capa 2)
  const [tipoInspeccionModal, setTipoInspeccionModal] = useState('AMBIENTAL_FISICA'); // 'AMBIENTAL_FISICA' | 'TERMOGRAFICA' | 'SISTEMA_ATERRAMIENTO' | 'TANQUE_COMBUSTIBLE'

  // 1. Ambiental / Física (Subestación)
  const [subestacionNombre, setSubestacionNombre] = useState('');
  const [subestacionUbicacion, setSubestacionUbicacion] = useState('');
  const [nivelTension, setNivelTension] = useState('13.8 kV');
  const [inspectorName, setInspectorName] = useState('');

  // 2. Termográfica
  const [termoNombre, setTermoNombre] = useState('');
  const [termoUbicacion, setTermoUbicacion] = useState('');
  const [termoTempAmbiente, setTermoTempAmbiente] = useState('25');
  const [termoTempPuntoCaliente, setTermoTempPuntoCaliente] = useState('');
  const [termoTempRef, setTermoTempRef] = useState('30');
  const [termoCamara, setTermoCamara] = useState('FLIR E8-XT');

  // 3. Sistema de Aterramiento (PAT)
  const [patNombre, setPatNombre] = useState('');
  const [patUbicacion, setPatUbicacion] = useState('');
  const [patResistencia, setPatResistencia] = useState('');
  const [patMetodo, setPatMetodo] = useState('Caída de Potencial (62%)');
  const [patTipo, setPatTipo] = useState('Malla con Varillas');
  const [patUnion, setPatUnion] = useState('Soldadura Exotérmica (Cadweld)');
  const [patTelurometro, setPatTelurometro] = useState('AEMC 4630');

  // 4. Tanque de Combustible
  const [tanqueNombre, setTanqueNombre] = useState('');
  const [tanqueUbicacion, setTanqueUbicacion] = useState('');
  const [tanqueTipoCombustible, setTanqueTipoCombustible] = useState('DIESEL');
  const [tanqueCapacidadLitros, setTanqueCapacidadLitros] = useState('2000');
  const [tanqueNivelPorcentaje, setTanqueNivelPorcentaje] = useState('75');
  const [tanqueConsumoLh, setTanqueConsumoLh] = useState('45');
  const [tanqueDique110, setTanqueDique110] = useState('CONFORME');

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

  const nombreElementoDuplicado = elementos.some(
    (e) => e.nombre.toLowerCase().trim() === nombre.toLowerCase().trim() && e.id !== editingElemento?.id
  );

  const nombreInspeccionDuplicado = inspecciones.some(
    (s) => s.nombre.toLowerCase().trim() === subestacionNombre.toLowerCase().trim()
  );

  const isElementoFormValid = nombre.trim() !== '' && !nombreElementoDuplicado;

  const isInspeccionFormValid = 
    tipoInspeccionModal === 'AMBIENTAL_FISICA' || tipoInspeccionModal === 'SUBESTACION'
      ? (subestacionNombre.trim() !== '' && !nombreInspeccionDuplicado)
      : tipoInspeccionModal === 'TERMOGRAFICA'
        ? termoNombre.trim() !== ''
        : tipoInspeccionModal === 'SISTEMA_ATERRAMIENTO' || tipoInspeccionModal === 'PUESTA_TIERRA'
          ? (patNombre.trim() !== '' || subestacionNombre.trim() !== '')
          : tipoInspeccionModal === 'TANQUE_COMBUSTIBLE'
            ? tanqueNombre.trim() !== ''
            : true;

  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      customAlert("La imagen es demasiado grande. Por favor elija una de menos de 10MB.");
      return;
    }

    try {
      const base64Url = await compressImageToBase64(file);
      setFotoBlob(file);
      setFoto(base64Url);
      setEliminarFoto(false);
      if (previewUrl && previewUrl.startsWith('blob:')) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(base64Url);
    } catch (err) {
      console.error("Error al procesar imagen Base64:", err);
      setFotoBlob(file);
      setEliminarFoto(false);
      if (previewUrl && previewUrl.startsWith('blob:')) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleCreateElemento = (e) => {
    e.preventDefault();
    if (!isElementoFormValid) return;

    try {
      let datosTecnicos = {};

    if (tipoElemento === 'TABLERO') {
      const fasesCalc = tableroCapacidadPolos?.includes('Monopolar') ? 1 : (tableroCapacidadPolos?.includes('Bipolar') ? 2 : 3);
      const tipoCalc = tableroMontaje?.toLowerCase().includes('empotrar') ? 'empotrado' : (tableroMontaje?.toLowerCase().includes('autosoportado') ? 'autosoportado' : 'superficial');

      datosTecnicos = {
        ...(editingElemento?.datosTecnicos || {}),
        maxPoles: parseInt(maxPoles, 10) || 24,
        capacidadPolos: tableroCapacidadPolos || 'Tripolar (3F)',
        fases: fasesCalc,
        usoElectrico: tableroUsoElectrico || 'TDF (Tablero de Distribución y Fuerza)',
        montaje: tableroMontaje || 'Superficial',
        tipo: tipoCalc,
        nivelHermeticidad: tableroHermeticidad || 'Uso Interior Seco (NEMA 1 / IP20)',
        tensionNominal: tableroTension || '208Y/120 V (3Φ - 4 hilos Estrella)',
        barrasPrincipales: {
          ia: String(corrienteIa !== undefined && corrienteIa !== null ? corrienteIa : '0').trim(),
          ib: String(corrienteIb !== undefined && corrienteIb !== null ? corrienteIb : '0').trim(),
          ic: String(corrienteIc !== undefined && corrienteIc !== null ? corrienteIc : '0').trim()
        },
        breakerPrincipal: {
          marca: breakerMarca || '',
          tipo: breakerTipo || '',
          amp: String(breakerAmp || '100').trim()
        },
        voltaje: {
          va: String(voltajeVa !== undefined && voltajeVa !== null ? voltajeVa : '208').trim(),
          vb: String(voltajeVb !== undefined && voltajeVb !== null ? voltajeVb : '205').trim(),
          vc: String(voltajeVc !== undefined && voltajeVc !== null ? voltajeVc : '205').trim()
        },
        acometida: acometidaConductor.trim(),
        circuits: editingElemento?.datosTecnicos?.circuits || [],
        neutroLlegada: editingElemento?.datosTecnicos?.neutroLlegada || { calibre: '', observaciones: '' },
        puestaTierra: editingElemento?.datosTecnicos?.puestaTierra || { calibre: '', observaciones: '' }
      };
    } else if (tipoElemento === 'TRANSFORMADOR') {
      const kvaNum = parseFloat(String(kvaTrafo || editingElemento?.datosTecnicos?.kva || editingElemento?.datosTecnicos?.potenciaKva || 0).replace(/[^0-9.]/g, '')) || null;
      const fpTrafo = parseFloat(editingElemento?.datosTecnicos?.factorPotencia || 0.9) || 0.9;
      const kvarCalc = kvaNum ? Math.round(kvaNum * Math.sqrt(Math.max(0, 1 - Math.pow(fpTrafo, 2))) * 100) / 100 : null;
      const secVolts = parseFloat(String(voltajeSecundario || editingElemento?.datosTecnicos?.voltajeSecundario || '208').replace(/[^0-9.]/g, '')) || 208;
      const secAmps = kvaNum && secVolts > 0 ? Math.round(((kvaNum * 1000) / (Math.sqrt(3) * secVolts)) * 100) / 100 : null;

      datosTecnicos = {
        marca: marcaTrafo || editingElemento?.datosTecnicos?.marca || '',
        fases: editingElemento?.datosTecnicos?.fases || '3',
        potenciaKva: kvaTrafo || editingElemento?.datosTecnicos?.potenciaKva || '',
        kva: kvaNum || kvaTrafo || '',
        capEx: editingElemento?.datosTecnicos?.capEx || kvaNum || null,
        capRe: editingElemento?.datosTecnicos?.capRe || kvarCalc || null,
        kvar: editingElemento?.datosTecnicos?.kvar || kvarCalc || null,
        factorPotencia: fpTrafo,
        corrienteNominalA: editingElemento?.datosTecnicos?.corrienteNominalA || secAmps,
        corrienteNominalB: editingElemento?.datosTecnicos?.corrienteNominalB || secAmps,
        corrienteNominalC: editingElemento?.datosTecnicos?.corrienteNominalC || secAmps,
        corrienteSecundaria: editingElemento?.datosTecnicos?.corrienteSecundaria || secAmps,
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
        amperiosSecundaria: editingElemento?.datosTecnicos?.amperiosSecundaria || secAmps || '',
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
          tipo: '',
          barillaConfiguracion: '',
          conductorCalibre: '',
          conductorTipoSold: '',
          resistencia: '',
          amp: '',
          fechaMedicion: ''
        }
      };
    } else if (tipoElemento === 'GENERADOR') {
      const kvaGenNum = parseFloat(String(kvaGen || editingElemento?.datosTecnicos?.kva || 0).replace(/[^0-9.]/g, '')) || null;
      const kwGenNum = parseFloat(String(potenciaKwGen || editingElemento?.datosTecnicos?.kw || editingElemento?.datosTecnicos?.potenciaKw || 0).replace(/[^0-9.]/g, '')) || (kvaGenNum ? Math.round(kvaGenNum * 0.8 * 100) / 100 : null);
      const fpGen = parseFloat(editingElemento?.datosTecnicos?.factorPotencia || 0.8) || 0.8;
      const kvarGen = kvaGenNum ? Math.round(kvaGenNum * Math.sqrt(Math.max(0, 1 - Math.pow(fpGen, 2))) * 100) / 100 : null;
      const ampGenNum = parseFloat(String(amperajeGen || editingElemento?.datosTecnicos?.amperaje || 0).replace(/[^0-9.]/g, '')) || null;

      datosTecnicos = {
        kva: kvaGenNum || kvaGen,
        kw: kwGenNum || potenciaKwGen,
        potenciaKw: kwGenNum || potenciaKwGen,
        kvar: editingElemento?.datosTecnicos?.kvar || kvarGen,
        factorPotencia: fpGen,
        voltajeGeneracion: voltajeGen || editingElemento?.datosTecnicos?.voltajeGeneracion || editingElemento?.datosTecnicos?.voltaje || '',
        voltaje: voltajeGen || editingElemento?.datosTecnicos?.voltaje || editingElemento?.datosTecnicos?.voltajeGeneracion || '',
        amperaje: ampGenNum || amperajeGen,
        tipoCombustible: combustibleGen || editingElemento?.datosTecnicos?.tipoCombustible || editingElemento?.datosTecnicos?.combustible || 'DIESEL',
        combustible: combustibleGen || editingElemento?.datosTecnicos?.combustible || 'DIESEL',
        capacidadCombustible: editingElemento?.datosTecnicos?.capacidadCombustible || null,
        consumoEspecificado: editingElemento?.datosTecnicos?.consumoEspecificado || null,
        horasOperacion: editingElemento?.datosTecnicos?.horasOperacion || null,
        horasReserva: editingElemento?.datosTecnicos?.horasReserva || null
      };
    } else if (tipoElemento === 'BANCO_CONDENSADOR') {
      datosTecnicos = editingElemento?.datosTecnicos || {
        marca: '', modelo: '', alimentador: '', calibreConductor: '', fabricante: '', anioFabricacion: '',
        tensionNominal: tensionBanco || '208 V', tensionRegistrada: tensionBanco || '208 V', frecuencia: '60 Hz', 
        potenciaReactivaTotal: kvarTotal || '150 kVAR',
        corrienteNominalTotal: '', numFases: 'Trifásico', conexion: 'Estrella', nivelAislamientoBIL: '',
        tipoCompensacion: tipoBanco === 'AUTOMATICO' ? 'Automática (Pasos)' : 'Fija', numPasos: pasosCondensador || '6', secuenciaPasosKvar: '',
        tipoConmutacion: 'Contactores dedicados', potenciaIndividual: '', capacitanciaMuf: '',
        tensionCondensador: '', tecnologiaDielectrica: 'Polipropileno metalizado',
        resistenciaDescarga: 'Sí', seguridad: 'Desconectador por sobrepresión',
        factorDesintonizacion: 'N/A', tipoNucleo: 'Núcleo de Hierro con Entrehierro',
        claseAislamientoTermico: 'Clase H (180°C)', proteccionTermica: 'Sensor Bimetálico / PT100 integrado',
        reguladorMarcaModelo: '', relacionTc: '', puertoComunicacion: 'RS-485 (Modbus RTU)',
        interruptorPrincipalAmp: '', proteccionPasos: 'Fusibles', gradoProteccionEnvolvente: 'IP54',
        dimensionesAlto: '', dimensionesAncho: '', dimensionesProf: '',
        sistemaEnfriamiento: 'Ventilación Forzada', temperaturaC: '', humedadPct: ''
      };
    } else if (tipoElemento === 'PUNTO_SUMINISTRO') {
      datosTecnicos = {
        ...(editingElemento?.datosTecnicos || {}),
        nivelTension: suministroTension || '13.8 kV',
        tensionNominal: suministroTension || '13.8 kV',
        empresaDistribuidora: suministroEmpresa || 'CORPOELEC',
        tipoAcometida: suministroTipoAcometida || 'Subterránea',
        capacidadContratadaKva: suministroCapacidad || '',
        cargaContratadaKva: suministroCapacidad || '',
        tipoMedicion: suministroTipoMedicion || 'Medición Directa (Baja Tensión)',
        enlaceCorpoelec: Boolean(suministroEnlaceCorpoelec),
        numeroContrato: suministroNumeroContrato || '',
        nic: suministroNic || '',
        posteTransformador: suministroPosteTrafo || ''
      };
    } else if (tipoElemento === 'CCM') {
      datosTecnicos = {
        capacidadBarraAmperios: ccmCapacidadBarra || '1200 A',
        tensionOperativa: ccmTension || '480 V',
        breakerPrincipal: ccmBreakerPrincipal || '1200A 3P',
        numeroGavetas: parseInt(ccmNumeroGavetas, 10) || 8
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
        tension: tipoElemento === 'TABLERO' ? (tableroTension || '208Y/120 V (3Φ - 4 hilos Estrella)') : (editingElemento.tension || ''),
        ubicacion: ubicacion.trim() || 'Sin ubicación',
        alimentadoPor: alimentadoPor.trim() || 'No definido',
        foto: eliminarFoto ? null : (foto !== undefined ? foto : editingElemento.foto),
        fotoBlob: eliminarFoto ? null : (fotoBlob || null),
        eliminarFoto: Boolean(eliminarFoto),
        observacionesGenerales: observacionesGenerales.trim(),
        datosTecnicos
      });
      showToast?.("Elemento actualizado correctamente.", "success");
      setEditingElemento(null);
      setFoto(null);
      setFotoBlob(null);
      setEliminarFoto(false);
      setShowElementoModal(false);
    } else {
      const assignedCode = getNextElementId(tipoElemento, proyectoId);
      const result = addElementoUnifilar(proyectoId, {
        codigo: assignedCode,
        nombre: nombre.trim(),
        tipoElemento,
        tension: tipoElemento === 'TABLERO' ? (tableroTension || '208Y/120 V (3Φ - 4 hilos Estrella)') : '',
        ubicacion: ubicacion.trim() || 'Sin ubicación',
        alimentadoPor: alimentadoPor.trim() || 'No definido',
        foto,
        fotoBlob,
        observacionesGenerales: observacionesGenerales.trim(),
        datosTecnicos
      });

      if (result.success) {
        setNombre('');
        setUbicacion('');
        setAlimentadoPor('');
        setObservacionesGenerales('');
        setFoto(null);
        setFotoBlob(null);
        if (previewUrl && previewUrl.startsWith('blob:')) URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
        setShowElementoModal(false);
        showToast?.("Elemento registrado correctamente.", "success");
      } else {
        customAlert(result.error);
      }
    }
  } catch (err) {
    console.error("Error al registrar o actualizar elemento:", err);
    showToast?.("No se pudo completar el registro: " + (err.message || 'Error inesperado'), "error");
  }
};

  const handleCreateInspeccion = (e) => {
    e.preventDefault();
    if (!isInspeccionFormValid) return;

    if (tipoInspeccionModal === 'AMBIENTAL_FISICA' || tipoInspeccionModal === 'SUBESTACION') {
      const result = addInspeccionSubestacion(proyectoId, {
        nombre: subestacionNombre.trim() || 'Subestación Principal',
        ubicacion: subestacionUbicacion.trim() || 'Sala Eléctrica',
        nivelTension: nivelTension.trim() || '13.8 kV',
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
        showToast?.("Inspección Ambiental o Física registrada exitosamente.", "success");
      } else {
        customAlert(result.error);
      }
      return;
    }

    if (tipoInspeccionModal === 'TERMOGRAFICA') {
      const tPunto = parseFloat(termoTempPuntoCaliente) || 0;
      const tRef = parseFloat(termoTempRef) || 0;
      const deltaT = (tPunto - tRef).toFixed(1);
      let severidad = 'NORMAL';
      if (deltaT > 40) severidad = 'CRITICA';
      else if (deltaT > 20) severidad = 'ALTA';
      else if (deltaT > 10) severidad = 'MODERADA';

      const result = addInspeccionSubestacion(proyectoId, {
        nombre: termoNombre.trim() || `IT-1: Inspección Termográfica`,
        tipoElemento: 'TERMOGRAFICA',
        ubicacion: termoUbicacion.trim() || 'Sala Eléctrica',
        nivelTension: 'Termografía',
        inspector: inspectorName.trim() || user?.username || 'Inspector',
        fecha: new Date().toISOString().split('T')[0],
        hora: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
        estadoEntorno: {},
        obrasCiviles: {},
        equiposPrincipales: {
          temperaturaAmbiente: termoTempAmbiente,
          temperaturaPuntoCaliente: termoTempPuntoCaliente,
          temperaturaReferencia: termoTempRef,
          deltaT,
          severidadNeta: severidad,
          camaraModelo: termoCamara
        },
        puestaTierra: {},
        edificioControl: {}
      });

      if (result.success) {
        setTermoNombre('');
        setTermoUbicacion('');
        setTermoTempPuntoCaliente('');
        setShowInspeccionModal(false);
        showToast?.("Inspección Termográfica registrada exitosamente.", "success");
      } else {
        customAlert(result.error);
      }
      return;
    }

    if (tipoInspeccionModal === 'SISTEMA_ATERRAMIENTO' || tipoInspeccionModal === 'PUESTA_TIERRA') {
      const rOhms = parseFloat(patResistencia) || 0;
      let cumplimientoIeee = 'CUMPLE (Excelente <= 5Ω)';
      if (rOhms > 10) cumplimientoIeee = 'NO CUMPLE (> 10Ω - Requiere Mantenimiento)';
      else if (rOhms > 5) cumplimientoIeee = 'ACEPTABLE (<= 10Ω)';

      const result = addInspeccionSubestacion(proyectoId, {
        nombre: (patNombre || subestacionNombre).trim() || `PAT-1: Sistema de Aterramiento`,
        tipoElemento: 'SISTEMA_ATERRAMIENTO',
        ubicacion: (patUbicacion || subestacionUbicacion).trim() || 'Patio / Sala Eléctrica',
        nivelTension: 'Aterramiento PAT',
        inspector: inspectorName.trim() || user?.username || 'Inspector',
        fecha: new Date().toISOString().split('T')[0],
        hora: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
        estadoEntorno: {},
        obrasCiviles: {},
        equiposPrincipales: {},
        puestaTierra: {
          resistenciaOhms: patResistencia.trim() || '',
          metodoMedicion: patMetodo || 'Caída de Potencial (62%)',
          tipoSistemaPat: patTipo || 'Malla con Varillas',
          tipoUnion: patUnion || 'Soldadura Exotérmica (Cadweld)',
          telurometro: patTelurometro,
          cumplimientoIeee80: cumplimientoIeee
        },
        edificioControl: {}
      });

      if (result.success) {
        setPatNombre('');
        setPatUbicacion('');
        setPatResistencia('');
        setSubestacionNombre('');
        setSubestacionUbicacion('');
        setShowInspeccionModal(false);
        showToast?.("Inspección del Sistema de Aterramiento registrada exitosamente.", "success");
      } else {
        customAlert(result.error);
      }
      return;
    }

    if (tipoInspeccionModal === 'TANQUE_COMBUSTIBLE') {
      const capLitros = parseFloat(tanqueCapacidadLitros) || 0;
      const nivelPct = parseFloat(tanqueNivelPorcentaje) || 0;
      const consumo = parseFloat(tanqueConsumoLh) || 1;
      const litrosActuales = ((capLitros * nivelPct) / 100).toFixed(0);
      const autonomiaHoras = (litrosActuales / (consumo || 1)).toFixed(1);

      const result = addInspeccionSubestacion(proyectoId, {
        nombre: tanqueNombre.trim() || `TK-1: Tanque de Combustible`,
        tipoElemento: 'TANQUE_COMBUSTIBLE',
        ubicacion: tanqueUbicacion.trim() || 'Área de Generación',
        nivelTension: 'Combustible',
        inspector: inspectorName.trim() || user?.username || 'Inspector',
        fecha: new Date().toISOString().split('T')[0],
        hora: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
        estadoEntorno: {
          tipoCombustible: tanqueTipoCombustible,
          capacidadLitros: tanqueCapacidadLitros,
          nivelPorcentaje: tanqueNivelPorcentaje,
          litrosActuales,
          consumoLh: tanqueConsumoLh,
          autonomiaHorasCalculada: autonomiaHoras,
          diqueContencion110: tanqueDique110
        },
        obrasCiviles: {},
        equiposPrincipales: {},
        puestaTierra: {},
        edificioControl: {}
      });

      if (result.success) {
        setTanqueNombre('');
        setTanqueUbicacion('');
        setShowInspeccionModal(false);
        showToast?.("Inspección de Tanque de Combustible registrada exitosamente.", "success");
      } else {
        customAlert(result.error);
      }
      return;
    }
  };

  const handleCreatePuntoMedicion = (e) => {
    e.preventDefault();
    if (!puntoMedicionNombre.trim()) return;

    const result = addPuntoMedicion(proyectoId, {
      nombre: puntoMedicionNombre.trim(),
      nombreUsuario: puntoMedicionUsuario.trim() || '',
      numeroContrato: puntoMedicionNIC.trim() || '',
      nivelTensionContrato: puntoMedicionNivelTension || 'Media Tensión',
      inspector: user?.username || 'Inspector',
      fecha: new Date().toISOString().split('T')[0],
      hora: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
    });

    if (result.success) {
      setPuntoMedicionNombre('');
      setPuntoMedicionUsuario('');
      setPuntoMedicionNIC('');
      setShowPuntoMedicionModal(false);
      showToast?.('Punto de Medición registrado con éxito', 'success');
    } else {
      customAlert(result.error);
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
                onClick={handleOpenEditModal}
                className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-bold rounded-lg text-slate-200 hover:text-slate-100 flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
              >
                Editar Proyecto
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-6 pt-6 border-t border-slate-900">
            <div className="md:col-span-2">
              <span className="text-[10px] text-slate-500 font-bold uppercase block">Ubicación / Dirección</span>
              <span className="text-sm font-semibold text-slate-200">{proyecto.direccion || proyecto.ubicacion || company?.direccion || company?.ubicacion || 'No definida'}</span>
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

          {user?.role !== 'CLIENT' && (
            <div className="mt-6 pt-6 border-t border-slate-900">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                <User className="w-4 h-4 text-sky-400" /> Persona a Cargo / Responsable del Proyecto
              </h3>
              <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-900 max-w-md">
                <div className="space-y-1.5 text-xs">
                  <div>
                    <strong className="text-slate-400">Nombre:</strong>{' '}
                    <span className="text-slate-200 font-semibold">
                      {proyecto.responsableNombre || (typeof proyecto.responsable === 'object' ? proyecto.responsable?.nombre : proyecto.responsable) || 'No definido'}
                    </span>
                  </div>
                  <div>
                    <strong className="text-slate-400">Teléfono:</strong>{' '}
                    <span className="text-slate-200 font-semibold font-mono">
                      {proyecto.responsableTelefono || (typeof proyecto.responsable === 'object' ? proyecto.responsable?.telefono : '') || 'No definido'}
                    </span>
                  </div>
                  <div>
                    <strong className="text-slate-400">Email:</strong>{' '}
                    <span className="text-slate-200 font-semibold">
                      {proyecto.responsableEmail || (typeof proyecto.responsable === 'object' ? proyecto.responsable?.email : '') || 'No definido'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}


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
              <Building className="w-4 h-4" /> Inspecciones
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
                  onClick={() => setShowHelpModal(true)}
                  className="bg-slate-900 border border-slate-800 hover:border-amber-500/40 text-slate-300 hover:text-amber-400 font-semibold px-3 py-2 rounded-lg flex items-center gap-1.5 h-9 text-xs transition-all cursor-pointer shadow-sm"
                  title="Manual de Usuario, Matriz de Roles y Normativa Eléctrica"
                >
                  <HelpCircle className="w-3.5 h-3.5 text-amber-500" /> Ayuda / Manual
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

                  {/* Controles para Inspecciones */}
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

        {/* CONTENIDO DE PESTAÑA A: INSPECCIONES */}
        {activeTab === 'ESTRUCTURAL' && (
          <div>
            <div className="mb-4">
              <h2 className="text-md font-bold text-slate-200">Fichas de Inspecciones Técnicas</h2>
              <p className="text-xs text-slate-500">Inspecciones de obras civiles, termografía, sistema de aterramiento (SPAT) y tanques de combustible.</p>
            </div>

            {filteredInspecciones.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredInspecciones.map((item, index) => {
                  const isSelected = selectedIds.has(item.id);
                  const isDragging = draggedItemId === item.id;
                  return (
                    <div
                      key={item.id}
                      draggable={!isMultiSelectMode}
                      onDragStart={(e) => {
                        e.dataTransfer.setData('text/plain', item.id);
                        setDraggedItemId(item.id);
                      }}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        const sourceId = e.dataTransfer.getData('text/plain');
                        if (sourceId && sourceId !== item.id) {
                          const sourceIdx = inspecciones.findIndex(x => x.id === sourceId);
                          const targetIdx = inspecciones.findIndex(x => x.id === item.id);
                          if (sourceIdx !== -1 && targetIdx !== -1) {
                            const newOrder = [...inspecciones];
                            const [removed] = newOrder.splice(sourceIdx, 1);
                            newOrder.splice(targetIdx, 0, removed);
                            reordenarColeccion(companyId, proyectoId, newOrder.map(x => x.id), 'INSPECCION');
                            showToast?.('Orden de inspecciones actualizado', 'success');
                          }
                        }
                        setDraggedItemId(null);
                      }}
                      onClick={() => {
                        if (isMultiSelectMode) {
                          handleToggleSelect(item.id);
                        } else {
                          navigate(`/empresa/${companyId}/tablero/${item.id}`);
                        }
                      }}
                      className={`bg-slate-950 border flex flex-col justify-between overflow-hidden cursor-pointer transition-all hover:-translate-y-0.5 group rounded-2xl shadow-md hover:shadow-xl ${
                        isDragging ? 'opacity-40 border-dashed border-amber-500 scale-98' : ''
                      } ${
                        isMultiSelectMode && isSelected 
                          ? 'border-amber-500 shadow-amber-500/5 ring-1 ring-amber-500/20' 
                          : 'border-slate-800/80 hover:border-slate-700/60'
                      }`}
                    >
                      <div className="h-32 w-full bg-gradient-to-br from-slate-900 to-slate-900/40 relative flex flex-col items-center justify-center border-b border-slate-900/50 select-none">
                        <Building className="w-9 h-9 text-amber-500/70 group-hover:scale-105 transition-transform duration-500" />
                        <span className="text-[9px] uppercase font-bold tracking-widest opacity-35 mt-2">
                          {item.tipoElemento === 'TERMOGRAFICA' ? 'Inspección Termográfica' : item.tipoElemento === 'SISTEMA_ATERRAMIENTO' ? 'Puesta a Tierra (SPAT)' : item.tipoElemento === 'TANQUE_COMBUSTIBLE' ? 'Tanque de Combustible' : 'Inspección Visual / Civil'}
                        </span>
                        
                        <div className="absolute top-3 left-3 flex items-center gap-1.5">
                          <span className="px-2 py-0.5 bg-slate-900/90 text-slate-400 border border-slate-800 rounded-lg text-[9.5px] font-mono font-bold">
                            #{index + 1}
                          </span>
                          <span className="px-3 py-1 bg-amber-950/90 text-amber-500 border border-amber-800/50 rounded-full text-[10px] font-bold font-mono">
                            {item.tipoElemento === 'TERMOGRAFICA' ? '🔥 TERMOGRAFÍA' : item.tipoElemento === 'SISTEMA_ATERRAMIENTO' ? '🛡️ SPAT ATERRAMIENTO' : item.tipoElemento === 'TANQUE_COMBUSTIBLE' ? '⛽ TANQUE COMBUSTIBLE' : '🏢 SUBESTACIÓN'}
                          </span>
                        </div>

                        {!isMultiSelectMode && (
                          <div className="absolute top-3 right-3 flex items-center gap-1.5">
                            <span className="font-mono font-black text-amber-400 bg-slate-900 border border-amber-500/30 px-2.5 py-0.5 rounded-lg text-xs shadow-sm">
                              ID: {getElementCode(item, item.tipoElemento || 'SUBESTACION')}
                            </span>
                            {user?.role === 'ADMIN' && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditIdModalData({ isOpen: true, elemento: item, tipoElemento: item.tipoElemento || 'SUBESTACION' });
                                }}
                                className="p-1 bg-slate-900/90 hover:bg-amber-500 text-slate-400 hover:text-slate-950 border border-slate-700/80 hover:border-amber-400 rounded-md transition-all shadow-sm cursor-pointer"
                                title="Editar ID del elemento (Solo Administradores)"
                              >
                                <Edit3 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                    <div className="p-5 flex-1 flex flex-col justify-between">
                      <div className="space-y-1">
                        <h3 className="text-sm font-bold text-slate-100 group-hover:text-amber-500 transition-colors truncate">
                          {formatElementTitleWithId(item.nombre, item.id, item.codigo)}
                        </h3>
                        <div className="space-y-1 mt-3 text-[11px] text-slate-400 border-t border-slate-900/60 pt-3">
                          <p className="truncate"><span className="text-slate-500 font-bold">Ubicación:</span> {item.ubicacion}</p>
                          <p className="truncate"><span className="text-slate-500 font-bold">Tensión:</span> {item.nivelTension}</p>
                          <p className="truncate flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-slate-600 shrink-0" /><span className="text-slate-500 font-bold">Fecha:</span> {item.fecha}</p>
                          <p className="truncate flex items-center gap-1.5"><User className="w-3.5 h-3.5 text-slate-600 shrink-0" /><span className="text-slate-500 font-bold">Inspector:</span> {item.inspector}</p>
                        </div>
                      </div>

                      {/* Barra de Avance y Porcentaje de Completitud (Obs 4) */}
                      <div className="mt-4 pt-3 border-t border-slate-900/80">
                        <AvanceProgressBar elemento={item} tipoElemento={item.tipoElemento || 'SUBESTACION'} />
                      </div>

                      {/* Acciones CRUD Directas en Tarjeta (Obs 2 y 24) con Reordenamiento */}
                      <div className="mt-3">
                        <ElementoCardActions
                          onEdit={() => navigate(`/empresa/${companyId}/tablero/${item.id}`)}
                          onNewInspection={() => navigate(`/empresa/${companyId}/tablero/${item.id}`)}
                          onMoveUp={() => {
                            moverElemento(companyId, proyectoId, item.id, 'UP', 'INSPECCION');
                            showToast?.('Posición de inspección actualizada', 'info');
                          }}
                          onMoveDown={() => {
                            moverElemento(companyId, proyectoId, item.id, 'DOWN', 'INSPECCION');
                            showToast?.('Posición de inspección actualizada', 'info');
                          }}
                          canMoveUp={index > 0}
                          canMoveDown={index < filteredInspecciones.length - 1}
                          onDelete={async () => {
                            const ok = await confirm({
                              title: 'Eliminar Inspección',
                              message: `¿Estás seguro de que deseas eliminar la inspección "${item.nombre}"?`,
                              type: 'danger',
                              confirmText: 'Eliminar'
                            });
                            if (ok) {
                              deleteSubestacion(proyectoId, item.id);
                            }
                          }}
                          readOnly={user?.role === 'CLIENT'}
                        />
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
                  <h3 className="text-sm font-bold text-slate-400">No hay inspecciones técnicas</h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Crea una ficha de Inspección Técnica (Subestación, Termografía, SPAT o Tanque de Combustible).
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
                <p className="text-xs text-slate-500">Tableros, Transformadores, Generadores, Puntos de Suministro, Mallas de Tierra y Transferencias.</p>
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
                {filteredElementos.map((item, index) => {
                  const isTablero = item.tipoElemento === 'TABLERO';
                  const isTrafo = item.tipoElemento === 'TRANSFORMADOR';
                  const isGen = item.tipoElemento === 'GENERADOR';
                  const isPuestaTierra = item.tipoElemento === 'PUESTA_TIERRA';
                  const isTransfer = item.tipoElemento === 'TRANSFER';
                  const isPuntoSuministro = item.tipoElemento === 'PUNTO_SUMINISTRO';
                  const isCcm = item.tipoElemento === 'CCM';
                  const isBanco = item.tipoElemento === 'BANCO_CONDENSADOR';
                  const isDragging = draggedItemId === item.id;

                  return (
                    <div
                      key={item.id}
                      draggable={!isMultiSelectMode}
                      onDragStart={(e) => {
                        e.dataTransfer.setData('text/plain', item.id);
                        setDraggedItemId(item.id);
                      }}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        const sourceId = e.dataTransfer.getData('text/plain');
                        if (sourceId && sourceId !== item.id) {
                          const sourceIdx = elementos.findIndex(x => x.id === sourceId);
                          const targetIdx = elementos.findIndex(x => x.id === item.id);
                          if (sourceIdx !== -1 && targetIdx !== -1) {
                            const newOrder = [...elementos];
                            const [removed] = newOrder.splice(sourceIdx, 1);
                            newOrder.splice(targetIdx, 0, removed);
                            reordenarColeccion(companyId, proyectoId, newOrder.map(x => x.id), 'UNIFILAR');
                            showToast?.('Orden de diagrama unifilar actualizado', 'success');
                          }
                        }
                        setDraggedItemId(null);
                      }}
                      onClick={() => {
                        if (isMultiSelectMode) {
                          handleToggleSelect(item.id);
                        } else {
                          navigate(`/empresa/${companyId}/tablero/${item.id}`);
                        }
                      }}
                      className={`bg-slate-950 border flex flex-col justify-between overflow-hidden cursor-pointer transition-all hover:-translate-y-0.5 group rounded-2xl shadow-md hover:shadow-xl ${
                        isDragging ? 'opacity-40 border-dashed border-amber-500 scale-98' : ''
                      } ${
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
                            {isPuntoSuministro && <Gauge className="w-8 h-8 opacity-25 text-blue-400" />}
                            {isCcm && <Cpu className="w-8 h-8 opacity-25 text-amber-400" />}
                            {isBanco && <Layers className="w-8 h-8 opacity-25 text-emerald-400" />}
                            {!isTablero && !isTrafo && !isGen && !isPuestaTierra && !isTransfer && !isPuntoSuministro && !isCcm && !isBanco && <Layers className="w-8 h-8 opacity-25 text-slate-400" />}
                            <span className="text-[9px] uppercase font-bold tracking-widest opacity-30">Sin Imagen</span>
                          </div>
                        )}
                        
                        {/* Badges de tipo e ID */}
                        <div className="absolute top-3 left-3 flex items-center gap-1.5">
                          <span className="px-2 py-0.5 bg-slate-900/90 text-slate-400 border border-slate-800 rounded-lg text-[9.5px] font-mono font-bold">
                            #{index + 1}
                          </span>
                          {isTablero && (
                            <span className="px-3.5 py-1 bg-amber-950/90 text-amber-500 border border-amber-800/50 rounded-full text-[10px] font-bold font-mono">
                              ⚡ PANEL ELÉCTRICO
                            </span>
                          )}
                          {isTrafo && (
                            <span className="px-3.5 py-1 bg-amber-950/90 text-amber-500 border border-amber-800/50 rounded-full text-[10px] font-bold font-mono">
                              🔄 TRANSFORMADOR
                            </span>
                          )}
                          {isGen && (
                            <span className="px-3.5 py-1 bg-amber-950/90 text-amber-500 border border-amber-800/50 rounded-full text-[10px] font-bold font-mono">
                              🔋 GENERADOR
                            </span>
                          )}
                          {isPuestaTierra && (
                            <span className="px-3.5 py-1 bg-amber-950/90 text-amber-500 border border-amber-800/50 rounded-full text-[10px] font-bold font-mono">
                              🛡️ PUESTA A TIERRA
                            </span>
                          )}
                          {isTransfer && (
                            <span className="px-3.5 py-1 bg-amber-950/90 text-amber-500 border border-amber-800/50 rounded-full text-[10px] font-bold font-mono">
                              🔀 TRANSFERENCIA (ATS/MTS)
                            </span>
                          )}
                          {isPuntoSuministro && (
                            <span className="px-3.5 py-1 bg-amber-950/90 text-amber-500 border border-amber-800/50 rounded-full text-[10px] font-bold font-mono">
                              🔌 PTO. SUMINISTRO
                            </span>
                          )}
                          {isCcm && (
                            <span className="px-3.5 py-1 bg-amber-950/90 text-amber-500 border border-amber-800/50 rounded-full text-[10px] font-bold font-mono">
                              ⚙️ CCM MOTORES
                            </span>
                          )}
                          {isBanco && (
                            <span className="px-3.5 py-1 bg-amber-950/90 text-amber-500 border border-amber-800/50 rounded-full text-[10px] font-bold font-mono">
                              ⚡ BANCO CONDENSADOR
                            </span>
                          )}
                        </div>

                        {!isMultiSelectMode && (
                          <div className="absolute top-3 right-3 flex items-center gap-1.5">
                            <span className="font-mono font-black text-amber-400 bg-slate-900 border border-amber-500/30 px-2.5 py-0.5 rounded-lg text-xs shadow-sm">
                              ID: {getElementCode(item, item.tipoElemento)}
                            </span>
                            {user?.role === 'ADMIN' && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditIdModalData({ isOpen: true, elemento: item, tipoElemento: item.tipoElemento });
                                }}
                                className="p-1 bg-slate-900/90 hover:bg-amber-500 text-slate-400 hover:text-slate-950 border border-slate-700/80 hover:border-amber-400 rounded-md transition-all shadow-sm cursor-pointer"
                                title="Editar ID del elemento (Solo Administradores)"
                              >
                                <Edit3 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        )}

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
                      </div>

                      {/* Contenido de Tarjeta */}
                      <div className="p-5 flex-1 flex flex-col justify-between">
                        <div className="space-y-1">
                          <h3 className="text-sm font-bold text-slate-100 group-hover:text-amber-500 transition-colors truncate">
                            {formatElementTitleWithId(item.nombre, item.id, item.codigo)}
                          </h3>
                          {isTablero && (
                            <div className="pt-0.5">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 shadow-sm">
                                ⚡ Potencia Estimada: {calcularPotenciaEstimadaTablero(item).texto}
                              </span>
                            </div>
                          )}
                          
                          <div className="space-y-1.5 mt-3 text-[11px] text-slate-400 border-t border-slate-900/60 pt-3">
                            <p className="truncate"><span className="text-slate-500 font-bold">Ubicación:</span> {item.ubicacion}</p>
                            <p className="truncate"><span className="text-slate-500 font-bold">Alimentado por:</span> {item.alimentadoPor || 'No definido'}</p>

                            {/* Mostrar resúmenes enriquecidos de las fichas técnicas reales */}
                            {isTablero && (
                              <p className="text-sky-400 font-mono font-semibold text-[10px] bg-sky-950/40 p-1.5 rounded-lg border border-sky-900/40 flex items-center justify-between">
                                <span>⚡ Capacidad: {item.datosTecnicos?.maxPoles || 24} Polos ({item.datosTecnicos?.voltajeAcometida || '208/120 V'})</span>
                                <span className="text-amber-400 font-bold ml-1">{calcularPotenciaEstimadaTablero(item).etiquetaCorta}</span>
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
                            {isPuntoSuministro && (
                              <p className="text-blue-400 font-mono font-semibold text-[10px] bg-blue-950/40 p-1.5 rounded-lg border border-blue-900/40">
                                🔌 {item.datosTecnicos?.nivelTension || '13.8 kV'} | {item.datosTecnicos?.cargaContratadaKva || item.datosTecnicos?.capacidadContratadaKva || '1000 kVA'} | {item.datosTecnicos?.tipoMedicion || 'Medición Directa BT'}
                              </p>
                            )}
                            {isCcm && (
                              <p className="text-amber-400 font-mono font-semibold text-[10px] bg-amber-950/40 p-1.5 rounded-lg border border-amber-900/40">
                                ⚙️ Barra: {item.datosTecnicos?.capacidadBarraAmperios || '1200 A'} | {item.datosTecnicos?.numeroGavetas || 8} Gavetas ({item.datosTecnicos?.tensionOperativa || '480 V'})
                              </p>
                            )}
                            {isBanco && (
                              <p className="text-emerald-400 font-mono font-semibold text-[10px] bg-emerald-950/40 p-1.5 rounded-lg border border-emerald-900/40">
                                ⚡ {item.datosTecnicos?.potenciaReactivaTotal || '150 kVAR'} | {item.datosTecnicos?.numPasos || 6} Pasos ({item.datosTecnicos?.tensionNominal || '208 V'})
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Barra de Avance y Porcentaje de Completitud (Obs 4) */}
                        <div className="mt-4 pt-3 border-t border-slate-900/80">
                          <AvanceProgressBar elemento={item} tipoElemento={item.tipoElemento || 'TABLERO'} />
                        </div>

                        {/* Acciones CRUD Directas en Tarjeta (Obs 2 y 24) */}
                        <div className="mt-3">
                          <ElementoCardActions
                            onEdit={() => {
                              setEditingElemento(item);
                              setShowElementoModal(true);
                            }}
                            onNewInspection={() => navigate(`/empresa/${companyId}/tablero/${item.id}`)}
                            onMoveUp={() => {
                              moverElemento(companyId, proyectoId, item.id, 'UP', 'UNIFILAR');
                              showToast?.('Posición del equipo actualizada', 'info');
                            }}
                            onMoveDown={() => {
                              moverElemento(companyId, proyectoId, item.id, 'DOWN', 'UNIFILAR');
                              showToast?.('Posición del equipo actualizada', 'info');
                            }}
                            canMoveUp={index > 0}
                            canMoveDown={index < filteredElementos.length - 1}
                            onDelete={async () => {
                              const ok = await confirm({
                                title: 'Eliminar Elemento',
                                message: `¿Estás seguro de que deseas eliminar el elemento "${item.nombre}"?`,
                                type: 'danger',
                                confirmText: 'Eliminar'
                              });
                              if (ok) {
                                deleteElementoUnifilar(proyectoId, item.id);
                              }
                            }}
                            readOnly={user?.role === 'CLIENT'}
                          />
                        </div>
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

            {/* MODAL MULTI-PLANTILLA DE ELEMENTOS UNIFILARES (RESPONSIVE GRID FLUIDO & STICKY ACTIONS) */}
      {showElementoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-hidden">
          <div 
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150" 
            onClick={() => { setShowElementoModal(false); setEditingElemento(null); }}
          />
          
          <div className="relative w-full max-w-5xl xl:max-w-6xl max-h-[92vh] bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col z-10 animate-in zoom-in-95 duration-150">
            {/* CABECERA FIJA */}
            <div className="px-5 py-3.5 border-b border-slate-800/80 shrink-0 flex items-center justify-between bg-slate-950/90 backdrop-blur">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500 border border-amber-500/20">
                  <Zap className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-100 flex items-center gap-2">
                    {editingElemento ? `Editar Plantilla: ${editingElemento.nombre}` : 'Registrar Plantilla Técnica'}
                  </h3>
                  <p className="text-[10px] text-slate-400">
                    Ficha técnica estandarizada y metrología eléctrica de ingeniería
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-lg font-mono text-[10.5px] font-bold">
                  Código: {editingElemento ? getElementCode(editingElemento, editingElemento.tipoElemento) : getNextElementId(tipoElemento, proyectoId)}
                </span>
                <button 
                  type="button"
                  onClick={() => { setShowElementoModal(false); setEditingElemento(null); }}
                  className="p-1.5 hover:bg-slate-900 rounded-lg text-slate-400 hover:text-slate-100 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* CUERPO DEL FORMULARIO CON SCROLL INTERNO Y GRID FLUIDO */}
            <form id="elemento-form" onSubmit={handleCreateElemento} className="flex-1 overflow-y-auto px-5 py-4 space-y-4 text-xs">
              
              {/* Selector de Tipo de Elemento (Grid Responsivo Compacto) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                    Tipo de Elemento Eléctrico (Plantilla Técnica)
                  </label>
                  <span className="text-[10px] text-amber-400 font-semibold font-mono">
                    {tipoElemento}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 bg-slate-900/60 p-1.5 rounded-xl border border-slate-800 text-[10px]">
                  {[
                    { id: 'TABLERO', label: '⚡ PANEL ELÉCTRICO' },
                    { id: 'PUNTO_SUMINISTRO', label: '🔌 PTO. SUMINISTRO' },
                    { id: 'GENERADOR', label: '🔋 GENERADOR' },
                    { id: 'TRANSFORMADOR', label: '🔄 TRANSFORMADOR' },
                    { id: 'TRANSFER', label: '🔀 TRANSFERENCIA' },
                    { id: 'CCM', label: '⚙️ CCM (MOTORES)' },
                    { id: 'BANCO_CONDENSADOR', label: '⚡ BANCO COND.' },
                    { id: 'PUESTA_TIERRA', label: '🛡️ PUESTA TIERRA' }
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTipoElemento(t.id)}
                      className={`py-2 px-2.5 font-bold rounded-lg transition-all text-center cursor-pointer flex items-center justify-center gap-1.5 ${
                        tipoElemento === t.id 
                          ? 'bg-amber-500 text-slate-950 shadow-md font-black' 
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
                      }`}
                    >
                      <span className="truncate">{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* GRID PRINCIPAL DE 3 COLUMNAS FLUIDAS */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                
                {/* ============================================================== */}
                {/* COLUMNA 1: Identificación, Ubicación y Procedencia */}
                {/* ============================================================== */}
                <div className="space-y-3 bg-slate-900/40 p-3.5 rounded-xl border border-slate-800/80 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center gap-1.5 pb-2 border-b border-slate-800">
                      <Tag className="w-3.5 h-3.5 text-amber-400" />
                      <h4 className="text-[10px] font-bold text-slate-200 uppercase tracking-wider">
                        Identificación y Jerarquía
                      </h4>
                    </div>

                    {/* Nombre descriptivo */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">
                        Nombre descriptivo del equipo <span className="text-amber-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={nombre}
                        onChange={(e) => setNombre(e.target.value)}
                        placeholder={`Ej. ${PREFIX_MAP[tipoElemento] || 'tab'}-1: Nombre Descriptivo`}
                        className={`w-full px-3 py-2 bg-slate-950 border focus:ring-1 rounded-xl text-xs text-slate-100 focus:outline-none h-9.5 transition-all ${
                          nombreElementoDuplicado 
                            ? 'border-red-500 focus:border-red-500 focus:ring-red-500' 
                            : 'border-slate-800 focus:border-amber-500 focus:ring-amber-500'
                        }`}
                      />
                      {nombreElementoDuplicado && (
                        <p className="text-[10px] text-red-400 font-bold flex items-center gap-1 mt-1">
                          <AlertTriangle className="w-3 h-3" /> Nombre duplicado en este proyecto.
                        </p>
                      )}
                    </div>

                    {/* Ubicación física */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">
                        Ubicación Física
                      </label>
                      <input
                        type="text"
                        value={ubicacion}
                        onChange={(e) => setUbicacion(e.target.value)}
                        placeholder="Ej. Sótano Sala Técnica o Piso 2"
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl text-xs text-slate-100 h-9.5"
                      />
                    </div>

                    {/* Procedencia / Alimentado Por */}
                    <div>
                      <SelectorAlimentadorJerarquico
                        proyectoId={proyectoId}
                        tableroActualId={editingElemento?.id}
                        elementosList={elementos}
                        value={alimentadoPor}
                        onChange={(val) => setAlimentadoPor(val)}
                        label="Alimentado Por (Procedencia / Jerarquía)"
                        placeholder="Seleccionar Subestación, Trafo, CCM o Tablero..."
                      />
                    </div>
                  </div>

                  {/* Nota informativa técnica */}
                  <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80 text-[10px] text-slate-400">
                    <p className="font-bold text-amber-400 flex items-center gap-1">
                      <Zap className="w-3 h-3" /> Marco Normativo:
                    </p>
                    <p className="text-[9.5px] text-slate-400 mt-0.5">COVENIN 159:1997 / Código Eléctrico Nacional (CEN 200)</p>
                  </div>
                </div>

                {/* ============================================================== */}
                {/* COLUMNA 2: Ficha Técnica y Clasificación según tipo */}
                {/* ============================================================== */}
                <div className="space-y-3 bg-slate-900/40 p-3.5 rounded-xl border border-slate-800/80">
                  <div className="flex items-center gap-1.5 pb-2 border-b border-slate-800">
                    <Layers className="w-3.5 h-3.5 text-amber-400" />
                    <h4 className="text-[10px] font-bold text-slate-200 uppercase tracking-wider">
                      Ficha Técnica y Clasificación
                    </h4>
                  </div>

                  {/* TABLERO */}
                  {tipoElemento === 'TABLERO' && (
                    <div className="space-y-2.5">
                      {/* 1. Uso Eléctrico */}
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">
                          Uso Eléctrico (Función Principal)
                        </label>
                        <select
                          value={tableroUsoElectrico}
                          onChange={(e) => setTableroUsoElectrico(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-lg text-xs text-slate-100 h-9"
                        >
                          {TABLERO_USO_ELECTRICO.map((opc) => (
                            <option key={opc} value={opc}>{opc}</option>
                          ))}
                        </select>
                      </div>

                      {/* 2. Capacidad y Cantidad de Polos */}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">
                            Alimentación / Fases
                          </label>
                          <select
                            value={tableroCapacidadPolos}
                            onChange={(e) => setTableroCapacidadPolos(e.target.value)}
                            className="w-full px-2 py-1.5 bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-lg text-xs text-slate-100 h-9"
                          >
                            {TABLERO_CAPACIDADES_POLOS.map((opc) => (
                              <option key={opc} value={opc}>{opc}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">
                            Cantidad de Polos
                          </label>
                          <select
                            value={maxPoles}
                            onChange={(e) => setMaxPoles(parseInt(e.target.value, 10))}
                            className="w-full px-2 py-1.5 bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-lg text-xs font-mono font-bold text-amber-400 h-9"
                          >
                            {TABLERO_CANTIDAD_POLOS_ESTANDAR.map((p) => (
                              <option key={p} value={p}>{p} Polos</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* 3. Montaje y Hermeticidad */}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">
                            Montaje
                          </label>
                          <select
                            value={tableroMontaje}
                            onChange={(e) => setTableroMontaje(e.target.value)}
                            className="w-full px-2 py-1.5 bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-lg text-xs text-slate-100 h-9 truncate"
                          >
                            {TABLERO_MONTAJE_OPCIONES.map((opc) => (
                              <option key={opc} value={opc}>{opc}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">
                            Hermeticidad NEMA/IP
                          </label>
                          <select
                            value={tableroHermeticidad}
                            onChange={(e) => setTableroHermeticidad(e.target.value)}
                            className="w-full px-2 py-1.5 bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-lg text-xs text-slate-100 h-9 truncate"
                          >
                            {TABLERO_HERMETICIDAD_NEMA_IP.map((opc) => (
                              <option key={opc} value={opc}>{opc}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* 4. Tensión Nominal COVENIN 159 */}
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">
                          Tensión Nominal (COVENIN 159:1997)
                        </label>
                        <TensionNominalInput
                          tipo="BT"
                          value={tableroTension}
                          onChange={(val) => setTableroTension(val)}
                          placeholder="Ej. 208Y/120 V (3Φ - 4 hilos Estrella)"
                        />
                      </div>
                    </div>
                  )}

                  {/* TRANSFORMADOR */}
                  {tipoElemento === 'TRANSFORMADOR' && (
                    <div className="space-y-2.5">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Potencia KVA</label>
                          <input type="text" value={kvaTrafo} onChange={(e) => setKvaTrafo(e.target.value)} placeholder="Ej. 500 KVA" className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 h-9 font-mono" />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Marca</label>
                          <input type="text" value={marcaTrafo} onChange={(e) => setMarcaTrafo(e.target.value)} placeholder="Ej. GE / ABB" className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 h-9" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Tipo Transformador</label>
                          <select value={tipoTrafo} onChange={(e) => setTipoTrafo(e.target.value)} className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 h-9">
                            <option value="Pedestal">Pedestal (Aceite)</option>
                            <option value="Seco">Seco (Encapsulado)</option>
                            <option value="Aceite">Aceite (Sumergido)</option>
                            <option value="Poste">Montaje en Poste</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Conexión</label>
                          <input type="text" value={conexionTrafo} onChange={(e) => setConexionTrafo(e.target.value)} placeholder="Delta - Estrella (Dyn11)" className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 h-9" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Tensión Primaria MT</label>
                        <TensionNominalInput
                          tipo="MT"
                          value={voltajePrimario}
                          onChange={(val) => setVoltajePrimario(val)}
                          placeholder="Ej. 13800 V (13.8 kV)"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Tensión Secundaria BT</label>
                        <TensionNominalInput
                          tipo="BT"
                          value={voltajeSecundario}
                          onChange={(val) => setVoltajeSecundario(val)}
                          placeholder="Ej. 208Y/120 V o 480Y/277 V"
                        />
                      </div>
                    </div>
                  )}

                  {/* GENERADOR */}
                  {tipoElemento === 'GENERADOR' && (
                    <div className="space-y-2.5">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Capacidad kVA</label>
                          <input type="text" value={kvaGen} onChange={(e) => setKvaGen(e.target.value)} placeholder="Ej. 500 kVA" className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 h-9 font-mono" />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Potencia kW</label>
                          <input type="text" value={potenciaKwGen} onChange={(e) => setPotenciaKwGen(e.target.value)} placeholder="Ej. 400 kW" className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 h-9 font-mono" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Voltaje Generación</label>
                          <TensionNominalInput tipo="BT" value={voltajeGen} onChange={(val) => setVoltajeGen(val)} placeholder="Ej. 208/120 V" />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Amperaje Breaker</label>
                          <input type="text" value={amperajeGen} onChange={(e) => setAmperajeGen(e.target.value)} placeholder="Ej. 1600 A" className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 h-9 font-mono" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Combustible</label>
                        <select value={combustibleGen} onChange={(e) => setCombustibleGen(e.target.value)} className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 h-9">
                          <option value="DIESEL">DIÉSEL / GASOIL</option>
                          <option value="GAS">GAS NATURAL</option>
                          <option value="GASOLINA">GASOLINA</option>
                        </select>
                      </div>
                    </div>
                  )}

                  {/* PUNTO DE SUMINISTRO */}
                  {tipoElemento === 'PUNTO_SUMINISTRO' && (
                    <div className="space-y-2.5">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Tensión Suministro</label>
                          <TensionNominalInput tipo="TODAS" value={suministroTension} onChange={(val) => setSuministroTension(val)} placeholder="Ej. 13.8 kV o 208 V" />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Carga Contratada</label>
                          <input type="text" value={suministroCapacidad} onChange={(e) => setSuministroCapacidad(e.target.value)} placeholder="Ej. 1000 kVA" className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 h-9 font-mono" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Tipo de Medición</label>
                        <select value={suministroTipoMedicion} onChange={(e) => setSuministroTipoMedicion(e.target.value)} className="w-full px-2 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 h-9">
                          <option value="Medición Directa (Baja Tensión)">Medición Directa (Baja Tensión)</option>
                          <option value="Medición Indirecta BT">Medición Indirecta BT (con TCs)</option>
                          <option value="Medición Indirecta AT/MT">Medición Indirecta AT/MT (TCs y TPs)</option>
                        </select>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">NIC / Medidor</label>
                          <input type="text" value={suministroNic} onChange={(e) => setSuministroNic(e.target.value)} placeholder="Ej. NIC 49210" className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 h-9 font-mono" />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Nro. Contrato</label>
                          <input type="text" value={suministroNumeroContrato} onChange={(e) => setSuministroNumeroContrato(e.target.value)} placeholder="Ej. C-84920" className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 h-9 font-mono" />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TRANSFERENCIA (ATS/MTS) */}
                  {tipoElemento === 'TRANSFER' && (
                    <div className="space-y-2.5">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Capacidad Amperios</label>
                          <input type="text" value={capacidadAmperios} onChange={(e) => setCapacidadAmperios(e.target.value)} placeholder="Ej. 1600 A" className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 h-9 font-mono" />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Modo Operación</label>
                          <select value={tipoTransferencia} onChange={(e) => setTipoTransferencia(e.target.value)} className="w-full px-2 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 h-9">
                            <option value="AUTOMATICA">AUTOMÁTICA (ATS)</option>
                            <option value="MANUAL">MANUAL (MTS)</option>
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Tensión Operativa</label>
                        <TensionNominalInput tipo="BT" value={tensionOperativa} onChange={(val) => setTensionOperativa(val)} placeholder="Ej. 208Y/120 V o 480Y/277 V" />
                      </div>
                    </div>
                  )}

                  {/* CCM (MOTORES) */}
                  {tipoElemento === 'CCM' && (
                    <div className="space-y-2.5">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Capacidad Barra (A)</label>
                          <input type="text" value={ccmCapacidadBarra} onChange={(e) => setCcmCapacidadBarra(e.target.value)} placeholder="Ej. 1200 A" className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 h-9 font-mono" />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Tensión Operativa</label>
                          <TensionNominalInput tipo="BT" value={ccmTension} onChange={(val) => setCcmTension(val)} placeholder="Ej. 480 V o 208 V" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Breaker Principal</label>
                          <input type="text" value={ccmBreakerPrincipal} onChange={(e) => setCcmBreakerPrincipal(e.target.value)} placeholder="Ej. 1200A 3P" className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 h-9 font-mono" />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Nro. de Gavetas</label>
                          <input type="number" min="1" max="48" value={ccmNumeroGavetas} onChange={(e) => setCcmNumeroGavetas(e.target.value)} placeholder="8" className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 h-9 font-mono" />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* BANCO DE CONDENSADORES */}
                  {tipoElemento === 'BANCO_CONDENSADOR' && (
                    <div className="space-y-2.5">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Capacidad Total (kVAR)</label>
                          <input type="text" value={kvarTotal} onChange={(e) => setKvarTotal(e.target.value)} placeholder="Ej. 150 kVAR" className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 h-9 font-mono" />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Pasos / Escalones</label>
                          <input type="text" value={pasosCondensador} onChange={(e) => setPasosCondensador(e.target.value)} placeholder="Ej. 6 pasos" className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 h-9 font-mono" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Tipo Banco</label>
                          <select value={tipoBanco} onChange={(e) => setTipoBanco(e.target.value)} className="w-full px-2 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 h-9">
                            <option value="AUTOMATICO">AUTOMÁTICO</option>
                            <option value="FIJO">FIJO</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Tensión Operativa</label>
                          <TensionNominalInput tipo="BT" value={tensionBanco} onChange={(val) => setTensionBanco(val)} placeholder="Ej. 208 V o 480 V" />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* PUESTA A TIERRA */}
                  {tipoElemento === 'PUESTA_TIERRA' && (
                    <div className="space-y-2.5">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Resistencia (Ω)</label>
                          <input type="text" value={resistenciaOhmios} onChange={(e) => setResistenciaOhmios(e.target.value)} placeholder="Ej. 0.5 Ω" className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 h-9 font-mono" />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Corriente Fuga (A)</label>
                          <input type="text" value={corrienteFuga} onChange={(e) => setCorrienteFuga(e.target.value)} placeholder="Ej. 4.2 A" className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 h-9 font-mono text-amber-400" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Tipo de Malla / Ubicación</label>
                        <input type="text" value={tipoMalla} onChange={(e) => setTipoMalla(e.target.value)} placeholder="Ej. Malla debajo de losa / Sala Eléctrica" className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 h-9" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Cable Acometida Tierra</label>
                        <input type="text" value={cableAcometidaTierra} onChange={(e) => setCableAcometidaTierra(e.target.value)} placeholder="Ej. #2/0 AWG Cu Desnudo" className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 h-9 font-mono" />
                      </div>
                    </div>
                  )}

                  {/* OTRO */}
                  {tipoElemento === 'OTRO' && (
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Especificaciones Técnicas</label>
                      <textarea value={descripcionOtro} onChange={(e) => setDescripcionOtro(e.target.value)} rows={3} placeholder="Detalles técnicos específicos..." className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none resize-none" />
                    </div>
                  )}
                </div>

                {/* ============================================================== */}
                {/* COLUMNA 3: Metrología Eléctrica, Interruptor, Foto y Notas */}
                {/* ============================================================== */}
                <div className="space-y-3 bg-slate-900/40 p-3.5 rounded-xl border border-slate-800/80">
                  <div className="flex items-center gap-1.5 pb-2 border-b border-slate-800">
                    <Gauge className="w-3.5 h-3.5 text-amber-400" />
                    <h4 className="text-[10px] font-bold text-slate-200 uppercase tracking-wider">
                      {tipoElemento === 'TABLERO' ? 'Metrología e Interruptor Principal' : 'Mediciones y Parámetros'}
                    </h4>
                  </div>

                  {/* Campos específicos de TABLERO en Columna 3 */}
                  {tipoElemento === 'TABLERO' && (
                    <div className="space-y-2.5">
                      {/* Interruptor Principal */}
                      <div className="bg-slate-950/70 p-2.5 rounded-lg border border-slate-800 space-y-1.5">
                        <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wide flex items-center gap-1">
                          <Zap className="w-3 h-3" /> Interruptor Principal (Main Breaker)
                        </span>
                        <div className="grid grid-cols-3 gap-1.5">
                          <div>
                            <label className="block text-[9px] text-slate-400 uppercase">Marca</label>
                            <input
                              type="text"
                              list="breaker-marcas"
                              value={breakerMarca}
                              onChange={(e) => setBreakerMarca(e.target.value)}
                              placeholder="Ej. GE"
                              className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded text-xs text-slate-100 font-bold h-8 text-center"
                            />
                            <datalist id="breaker-marcas">
                              {MARCA_OPTIONS.map(m => <option key={m} value={m} />)}
                            </datalist>
                          </div>
                          <div>
                            <label className="block text-[9px] text-slate-400 uppercase">Tipo</label>
                            <input
                              type="text"
                              list="breaker-tipos"
                              value={breakerTipo}
                              onChange={(e) => setBreakerTipo(e.target.value)}
                              placeholder="Ej. TQD"
                              className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded text-xs text-slate-100 h-8 text-center"
                            />
                            <datalist id="breaker-tipos">
                              {TIPO_OPTIONS.map(t => <option key={t} value={t} />)}
                            </datalist>
                          </div>
                          <div>
                            <label className="block text-[9px] text-slate-400 uppercase">Amperaje</label>
                            <input
                              type="text"
                              list="breaker-amps"
                              value={breakerAmp}
                              onChange={(e) => setBreakerAmp(e.target.value)}
                              placeholder="100"
                              className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded text-xs text-amber-400 font-mono font-bold h-8 text-center"
                            />
                            <datalist id="breaker-amps">
                              {AMP_OPTIONS.map(a => <option key={a} value={a} />)}
                            </datalist>
                          </div>
                        </div>
                      </div>

                      {/* Metrología Inicial (Voltajes y Corrientes) */}
                      <div className="bg-slate-950/70 p-2.5 rounded-lg border border-slate-800 space-y-1.5">
                        <span className="text-[10px] font-bold text-sky-400 uppercase tracking-wide flex items-center gap-1">
                          <Activity className="w-3 h-3" /> Metrología Inicial (Mediciones)
                        </span>
                        
                        <div className="grid grid-cols-3 gap-1.5 text-center">
                          <div>
                            <span className="text-[9px] text-slate-400 font-mono">Va (V)</span>
                            <input
                              type="text"
                              value={voltajeVa}
                              onChange={(e) => setVoltajeVa(e.target.value)}
                              placeholder="208"
                              className="w-full px-1.5 py-1 bg-slate-900 border border-slate-700 rounded text-xs text-slate-100 font-mono text-center h-8"
                            />
                          </div>
                          <div>
                            <span className="text-[9px] text-slate-400 font-mono">Vb (V)</span>
                            <input
                              type="text"
                              value={voltajeVb}
                              onChange={(e) => setVoltajeVb(e.target.value)}
                              placeholder="205"
                              className="w-full px-1.5 py-1 bg-slate-900 border border-slate-700 rounded text-xs text-slate-100 font-mono text-center h-8"
                            />
                          </div>
                          <div>
                            <span className="text-[9px] text-slate-400 font-mono">Vc (V)</span>
                            <input
                              type="text"
                              value={voltajeVc}
                              onChange={(e) => setVoltajeVc(e.target.value)}
                              placeholder="205"
                              className="w-full px-1.5 py-1 bg-slate-900 border border-slate-700 rounded text-xs text-slate-100 font-mono text-center h-8"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-1.5 text-center pt-1 border-t border-slate-800">
                          <div>
                            <span className="text-[9px] text-slate-400 font-mono">Ia (A)</span>
                            <input
                              type="text"
                              value={corrienteIa}
                              onChange={(e) => setCorrienteIa(e.target.value)}
                              placeholder="0"
                              className="w-full px-1.5 py-1 bg-slate-900 border border-slate-700 rounded text-xs text-amber-400 font-mono font-bold text-center h-8"
                            />
                          </div>
                          <div>
                            <span className="text-[9px] text-slate-400 font-mono">Ib (A)</span>
                            <input
                              type="text"
                              value={corrienteIb}
                              onChange={(e) => setCorrienteIb(e.target.value)}
                              placeholder="0"
                              className="w-full px-1.5 py-1 bg-slate-900 border border-slate-700 rounded text-xs text-amber-400 font-mono font-bold text-center h-8"
                            />
                          </div>
                          <div>
                            <span className="text-[9px] text-slate-400 font-mono">Ic (A)</span>
                            <input
                              type="text"
                              value={corrienteIc}
                              onChange={(e) => setCorrienteIc(e.target.value)}
                              placeholder="0"
                              className="w-full px-1.5 py-1 bg-slate-900 border border-slate-700 rounded text-xs text-amber-400 font-mono font-bold text-center h-8"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Acometida */}
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">
                          Acometida / Calibre Conductor
                        </label>
                        <input
                          type="text"
                          value={acometidaConductor}
                          onChange={(e) => setAcometidaConductor(e.target.value)}
                          placeholder="Ej. 3x 3/0 AWG + 1x 1/0 N (Cu)"
                          className="w-full px-2.5 py-1 bg-slate-950 border border-slate-800 rounded-lg text-xs text-blue-400 font-mono h-8.5"
                        />
                      </div>
                    </div>
                  )}

                  {/* Foto Offline Blob */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1 flex items-center gap-1.5">
                      <Camera className="w-3.5 h-3.5 text-amber-500" />
                      Foto de la Placa Técnico / Equipo
                    </label>
                    
                    {previewUrl || foto ? (
                      <div className="relative rounded-xl overflow-hidden border border-slate-800 bg-slate-950 aspect-video flex items-center justify-center group shadow-md shrink-0">
                        <img src={previewUrl || foto} alt="Vista previa" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => {
                            setFotoBlob(null);
                            setFoto(null);
                            setEliminarFoto(true);
                            if (previewUrl && previewUrl.startsWith('blob:')) URL.revokeObjectURL(previewUrl);
                            setPreviewUrl(null);
                          }}
                          className="absolute top-2 right-2 p-1.5 bg-slate-950/80 hover:bg-rose-600 text-white rounded-lg cursor-pointer transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center w-full">
                        <label className="flex flex-col items-center justify-center w-full h-20 border-2 border-slate-800 border-dashed rounded-xl cursor-pointer bg-slate-950/40 hover:bg-slate-900/40 hover:border-slate-700 transition-all select-none">
                          <div className="flex flex-col items-center justify-center py-2">
                            <Camera className="w-4 h-4 text-slate-500 mb-0.5" />
                            <p className="text-[10px] text-slate-400">
                              <span className="font-bold text-amber-400">Adjuntar Foto</span> o capturar
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

                  {/* Observaciones generales */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">
                      Observaciones del Informe Técnico
                    </label>
                    <textarea
                      value={observacionesGenerales}
                      onChange={(e) => setObservacionesGenerales(e.target.value)}
                      rows={2}
                      placeholder="Estado de mantenimiento, accesibilidad o recomendaciones..."
                      className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-lg text-xs text-slate-100 focus:outline-none placeholder-slate-600 transition-all resize-none h-14"
                    />
                  </div>

                </div>

              </div>

            </form>

            {/* PIE DE ACCIONES FIJO (STICKY BOTTOM ACTION BAR) */}
            <div className="px-5 py-3 border-t border-slate-800 bg-slate-950/95 backdrop-blur shrink-0 flex items-center justify-between">
              <div className="text-[11px] text-slate-400 hidden sm:flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                <span>Ficha técnica lista para diagramación unifilar</span>
              </div>
              <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => { setShowElementoModal(false); setEditingElemento(null); }}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-xs font-bold rounded-xl text-slate-300 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  form="elemento-form"
                  disabled={!isElementoFormValid}
                  className="bg-amber-500 text-slate-950 font-black hover:bg-amber-400 active:scale-98 transition-all px-5 py-2 rounded-xl flex items-center justify-center gap-2 text-xs cursor-pointer shadow-lg shadow-amber-500/20 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {editingElemento ? 'Guardar Cambios' : 'Guardar Plantilla'}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}


      {/* MODAL CREAR INSPECCIÓN TÉCNICA (CAPA 2 - 4 INSPECCIONES SEPARADAS) */}
      {showInspeccionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200" />
          
          <div className="relative w-full max-w-lg bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl p-6 overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center pb-4 border-b border-slate-800 shrink-0">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
                <Building className="w-4 h-4 text-amber-500" /> Registrar Inspección Técnica (Capa 2)
              </h3>
              <button 
                onClick={() => setShowInspeccionModal(false)}
                className="p-1.5 hover:bg-slate-900 rounded-lg text-slate-500 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateInspeccion} className="mt-4 space-y-4 overflow-y-auto pr-1 flex-1">
              
              {/* Selector de 4 Inspecciones Separadas */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">
                  Tipo de Inspección Técnica
                </label>
                <div className="grid grid-cols-2 gap-1.5 bg-slate-900 p-1.5 rounded-xl border border-slate-800 text-[10px]">
                  {[
                    { id: 'AMBIENTAL_FISICA', label: '🏢 AMBIENTAL O FÍSICA' },
                    { id: 'TERMOGRAFICA', label: '🌡️ TERMOGRÁFICA' },
                    { id: 'SISTEMA_ATERRAMIENTO', label: '🛡️ SISTEMA ATERRAMIENTO' },
                    { id: 'TANQUE_COMBUSTIBLE', label: '⛽ TANQUE COMBUSTIBLE' }
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTipoInspeccionModal(t.id)}
                      className={`py-2 px-2.5 font-bold rounded-lg transition-all text-center cursor-pointer ${
                        tipoInspeccionModal === t.id 
                          ? 'bg-amber-500 text-slate-950 shadow-md font-black' 
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* CAMPOS SEGÚN CADA INSPECCIÓN POR SEPARADO */}

              {/* 1. AMBIENTAL O FÍSICA */}
              {(tipoInspeccionModal === 'AMBIENTAL_FISICA' || tipoInspeccionModal === 'SUBESTACION') && (
                <>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">
                      Nombre de la Subestación / Sala Eléctrica
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
                        <AlertTriangle className="w-3.5 h-3.5" /> Nombre duplicado: ya existe esta inspección.
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
                      placeholder="Ej. Patio de Transformadores Norte / Sala Eléctrica"
                      className="w-full px-3.5 py-2 bg-slate-900 border border-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-xl text-sm text-slate-100 focus:outline-none placeholder-slate-600 h-11 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">
                      Nivel de Tensión (COVENIN 159:1997)
                    </label>
                    <TensionNominalInput
                      tipo="TODAS"
                      value={nivelTension}
                      onChange={(val) => setNivelTension(val)}
                      placeholder="Ej. 13800 V, 4800 V, 34500 V"
                    />
                  </div>
                </>
              )}

              {/* 2. TERMOGRÁFICA */}
              {tipoInspeccionModal === 'TERMOGRAFICA' && (
                <>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">
                      Nombre / Tag de la Inspección Termográfica
                    </label>
                    <input
                      type="text"
                      required
                      value={termoNombre}
                      onChange={(e) => setTermoNombre(e.target.value)}
                      placeholder="Ej. IT-01: Termografía Tableros Principales"
                      className="w-full px-3.5 py-2 bg-slate-900 border border-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-xl text-sm text-slate-100 focus:outline-none h-11 transition-all"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Ubicación / Equipo</label>
                      <input type="text" value={termoUbicacion} onChange={(e) => setTermoUbicacion(e.target.value)} placeholder="Ej. Interruptor Principal TAB-01" className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-100 h-10" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Cámara Termográfica</label>
                      <input type="text" value={termoCamara} onChange={(e) => setTermoCamara(e.target.value)} placeholder="Ej. FLIR E8-XT / Fluke Ti480" className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-100 h-10" />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2.5 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">T. Ambiente (°C)</label>
                      <input type="number" step="0.1" value={termoTempAmbiente} onChange={(e) => setTermoTempAmbiente(e.target.value)} placeholder="25" className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 font-mono h-9" />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">T. Punto (°C)</label>
                      <input type="number" step="0.1" value={termoTempPuntoCaliente} onChange={(e) => setTermoTempPuntoCaliente(e.target.value)} placeholder="48.5" className="w-full px-2.5 py-1.5 bg-slate-950 border border-amber-500/50 rounded-lg text-xs text-amber-400 font-mono h-9 font-bold" />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">T. Ref (°C)</label>
                      <input type="number" step="0.1" value={termoTempRef} onChange={(e) => setTermoTempRef(e.target.value)} placeholder="30" className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 font-mono h-9" />
                    </div>
                  </div>

                  {/* Cálculo en vivo de Delta T y Severidad */}
                  {termoTempPuntoCaliente && (
                    <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                      <div>
                        <span className="text-[10px] text-slate-500 block uppercase font-bold">Gradiente Térmico (ΔT)</span>
                        <span className="font-mono font-bold text-amber-400 text-sm">
                          {(parseFloat(termoTempPuntoCaliente || 0) - parseFloat(termoTempRef || 0)).toFixed(1)} °C
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-500 block uppercase font-bold">Severidad NETA/NFPA</span>
                        {(() => {
                          const dtVal = parseFloat(termoTempPuntoCaliente || 0) - parseFloat(termoTempRef || 0);
                          if (dtVal > 40) return <span className="px-2 py-0.5 bg-red-950 border border-red-800 text-red-400 font-black rounded-lg text-[10px]">CRÍTICA (&gt;40°C)</span>;
                          if (dtVal > 20) return <span className="px-2 py-0.5 bg-amber-950 border border-amber-800 text-amber-400 font-black rounded-lg text-[10px]">ALTA (21-40°C)</span>;
                          if (dtVal > 10) return <span className="px-2 py-0.5 bg-yellow-950 border border-yellow-800 text-yellow-400 font-black rounded-lg text-[10px]">MODERADA (11-20°C)</span>;
                          return <span className="px-2 py-0.5 bg-emerald-950 border border-emerald-800 text-emerald-400 font-black rounded-lg text-[10px]">NORMAL (≤10°C)</span>;
                        })()}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* 3. SISTEMA DE ATERRAMIENTO */}
              {(tipoInspeccionModal === 'SISTEMA_ATERRAMIENTO' || tipoInspeccionModal === 'PUESTA_TIERRA') && (
                <>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">
                      Nombre / Tag del Sistema de Aterramiento (PAT)
                    </label>
                    <input
                      type="text"
                      required
                      value={patNombre || subestacionNombre}
                      onChange={(e) => { setPatNombre(e.target.value); setSubestacionNombre(e.target.value); }}
                      placeholder="Ej. PAT-01: Malla Pozo Principal Transformador"
                      className="w-full px-3.5 py-2 bg-slate-900 border border-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-xl text-sm text-slate-100 focus:outline-none h-11 transition-all"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">
                        Resistencia Ohmios (Ω)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={patResistencia}
                        onChange={(e) => setPatResistencia(e.target.value)}
                        placeholder="Ej. 2.5 Ω"
                        className="w-full px-3 py-2 bg-slate-900 border border-amber-500/40 rounded-xl text-xs text-amber-400 h-10 font-mono font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">
                        Método Medición
                      </label>
                      <select
                        value={patMetodo}
                        onChange={(e) => setPatMetodo(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-100 h-10"
                      >
                        <option value="Caída de Potencial (62%)">Caída de Potencial (62%)</option>
                        <option value="Método de 3 Puntos">Método de 3 Puntos</option>
                        <option value="Pinza de Tierra (Sin Picas)">Pinza de Tierra (Sin Picas)</option>
                        <option value="Método Wenner (4 Picas)">Método Wenner (4 Picas)</option>
                      </select>
                    </div>
                  </div>

                  {patResistencia && (
                    <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800 text-xs flex items-center justify-between">
                      <span className="text-[10px] text-slate-500 uppercase font-bold">Criterio IEEE 80 / Código</span>
                      {parseFloat(patResistencia) > 10 ? (
                        <span className="text-red-450 font-bold">⚠️ &gt; 10 Ω (Requiere Mantenimiento)</span>
                      ) : parseFloat(patResistencia) > 5 ? (
                        <span className="text-amber-450 font-bold">🟡 ≤ 10 Ω (Aceptable)</span>
                      ) : (
                        <span className="text-emerald-450 font-bold">✅ ≤ 5 Ω (Excelente para Subestación)</span>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">
                        Tipo de Sistema PAT
                      </label>
                      <select
                        value={patTipo}
                        onChange={(e) => setPatTipo(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-100 h-10"
                      >
                        <option value="Malla con Varillas">Malla con Varillas Copperweld</option>
                        <option value="Pozo Individual">Pozo a Tierra Individual</option>
                        <option value="Anillo Perimetral">Anillo Perimetral Edificio</option>
                        <option value="Malla Profunda">Malla Profunda</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">
                        Tipo de Unión
                      </label>
                      <select
                        value={patUnion}
                        onChange={(e) => setPatUnion(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-100 h-10"
                      >
                        <option value="Soldadura Exotérmica (Cadweld)">Soldadura Exotérmica (Cadweld)</option>
                        <option value="Conector Mecánico Bronce">Conector Mecánico Bronce</option>
                        <option value="Terminal a Compresión">Terminal a Compresión</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">
                      Ubicación Física
                    </label>
                    <input
                      type="text"
                      value={patUbicacion || subestacionUbicacion}
                      onChange={(e) => { setPatUbicacion(e.target.value); setSubestacionUbicacion(e.target.value); }}
                      placeholder="Ej. Patio de Transformadores Norte / Sala Eléctrica"
                      className="w-full px-3.5 py-2 bg-slate-900 border border-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-xl text-sm text-slate-100 focus:outline-none placeholder-slate-600 h-11 transition-all"
                    />
                  </div>
                </>
              )}

              {/* 4. TANQUE DE COMBUSTIBLE */}
              {tipoInspeccionModal === 'TANQUE_COMBUSTIBLE' && (
                <>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">
                      Nombre / Tag del Tanque de Combustible
                    </label>
                    <input
                      type="text"
                      required
                      value={tanqueNombre}
                      onChange={(e) => setTanqueNombre(e.target.value)}
                      placeholder="Ej. TK-01: Tanque Principal Diésel Generador"
                      className="w-full px-3.5 py-2 bg-slate-900 border border-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-xl text-sm text-slate-100 focus:outline-none h-11 transition-all"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Tipo de Combustible</label>
                      <select value={tanqueTipoCombustible} onChange={(e) => setTanqueTipoCombustible(e.target.value)} className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-100 h-10">
                        <option value="DIESEL">Diésel / Gasoil</option>
                        <option value="GASOLINA">Gasolina</option>
                        <option value="GAS">Gas Licuado / GLP</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Capacidad Total (L)</label>
                      <input type="number" value={tanqueCapacidadLitros} onChange={(e) => setTanqueCapacidadLitros(e.target.value)} placeholder="Ej. 2000" className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-100 h-10 font-mono" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Nivel Actual (%)</label>
                      <input type="number" min="0" max="100" value={tanqueNivelPorcentaje} onChange={(e) => setTanqueNivelPorcentaje(e.target.value)} placeholder="Ej. 75" className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-100 h-10 font-mono" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Consumo Generador (L/h)</label>
                      <input type="number" step="0.1" value={tanqueConsumoLh} onChange={(e) => setTanqueConsumoLh(e.target.value)} placeholder="Ej. 45" className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-100 h-10 font-mono" />
                    </div>
                  </div>

                  {/* Autonomía Calculada en Tiempo Real */}
                  <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-[10px] text-slate-500 block uppercase font-bold">Litros Actuales</span>
                      <span className="font-mono font-bold text-amber-400 text-sm">
                        {((parseFloat(tanqueCapacidadLitros || 0) * parseFloat(tanqueNivelPorcentaje || 0)) / 100).toFixed(0)} Litros
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-500 block uppercase font-bold">Autonomía Estimada</span>
                      <span className="font-mono font-black text-emerald-400 text-sm">
                        {((parseFloat(tanqueCapacidadLitros || 0) * (parseFloat(tanqueNivelPorcentaje || 0) / 100)) / (parseFloat(tanqueConsumoLh) || 1)).toFixed(1)} Horas
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Dique Contención 110%</label>
                      <select value={tanqueDique110} onChange={(e) => setTanqueDique110(e.target.value)} className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-100 h-10">
                        <option value="CONFORME">Conforme (110% sin fugas)</option>
                        <option value="NO_CONFORME">No Conforme / Sin Dique</option>
                        <option value="CON_FILTRACION">Con Filtración / Fisuras</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Ubicación Tanque</label>
                      <input type="text" value={tanqueUbicacion} onChange={(e) => setTanqueUbicacion(e.target.value)} placeholder="Ej. Sala de Generación / Exterior" className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-100 h-10" />
                    </div>
                  </div>
                </>
              )}

              {/* Inspector Encargado */}
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

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-900 shrink-0">
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
                  className="bg-amber-500 text-slate-950 font-black hover:bg-amber-400 active:scale-98 transition-all px-4 py-2.5 rounded-lg flex flex-row items-center justify-center gap-2 h-10 whitespace-nowrap text-xs cursor-pointer shadow-md disabled:opacity-40"
                >
                  Crear Ficha de Inspección
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* MODAL CREAR PUNTO DE MEDICIÓN */}
      {showPuntoMedicionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200" />
          
          <div className="relative w-full max-w-md bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl p-6 overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center pb-4 border-b border-slate-800">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
                <Gauge className="w-4 h-4 text-amber-500" /> Registrar Punto de Medición
              </h3>
              <button 
                onClick={() => setShowPuntoMedicionModal(false)}
                className="p-1.5 hover:bg-slate-900 rounded-lg text-slate-500 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreatePuntoMedicion} className="mt-4 space-y-4">
              
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">
                  Nombre / Identificador del Punto
                </label>
                <input
                  type="text"
                  required
                  value={puntoMedicionNombre}
                  onChange={(e) => setPuntoMedicionNombre(e.target.value)}
                  placeholder="Ej. Punto de Medición Principal Acometida 1"
                  className="w-full px-3.5 py-2 bg-slate-900 border border-slate-800 focus:border-amber-500 focus:ring-amber-500 rounded-xl text-sm text-slate-100 focus:outline-none h-11 transition-all"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">
                  Nombre del Usuario / Razón Social
                </label>
                <input
                  type="text"
                  value={puntoMedicionUsuario}
                  onChange={(e) => setPuntoMedicionUsuario(e.target.value)}
                  placeholder="Ej. Comercial Selectric C.A."
                  className="w-full px-3.5 py-2 bg-slate-900 border border-slate-800 focus:border-amber-500 focus:ring-amber-500 rounded-xl text-sm text-slate-100 focus:outline-none placeholder-slate-600 h-11 transition-all"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">
                  N° de Contrato / NIC
                </label>
                <input
                  type="text"
                  value={puntoMedicionNIC}
                  onChange={(e) => setPuntoMedicionNIC(e.target.value)}
                  placeholder="Ej. NIC-8492019"
                  className="w-full px-3.5 py-2 bg-slate-900 border border-slate-800 focus:border-amber-500 focus:ring-amber-500 rounded-xl text-sm text-slate-100 focus:outline-none h-11 font-mono"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">
                  Nivel de Tensión de Contrato
                </label>
                <select
                  value={puntoMedicionNivelTension}
                  onChange={(e) => setPuntoMedicionNivelTension(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-900 border border-slate-800 focus:border-amber-500 focus:ring-amber-500 rounded-xl text-sm text-slate-100 focus:outline-none h-11 transition-all"
                >
                  <option value="Baja Tensión">Baja Tensión</option>
                  <option value="Media Tensión">Media Tensión</option>
                  <option value="Alta Tensión">Alta Tensión</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-900">
                <button
                  type="button"
                  onClick={() => setShowPuntoMedicionModal(false)}
                  className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-xs font-bold rounded-lg text-slate-300 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!puntoMedicionNombre.trim()}
                  className="bg-amber-500 text-slate-950 font-semibold hover:bg-amber-400 active:scale-98 transition-all px-4 py-2.5 rounded-lg flex flex-row items-center justify-center gap-2 h-10 whitespace-nowrap text-xs cursor-pointer shadow-md disabled:opacity-40"
                >
                  Registrar Punto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal para Crear Nuevo CCM */}
      {showCcmModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4 font-sans">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
                <Cpu className="w-4 h-4 text-amber-500" /> Registrar Nuevo CCM
              </h3>
              <button 
                onClick={() => setShowCcmModal(false)}
                className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCcmSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 font-bold mb-1 uppercase text-[10px]">
                  Tag / Identificación del CCM <span className="text-amber-500">*</span>
                </label>
                <input
                  type="text"
                  value={ccmNombre}
                  onChange={(e) => setCcmNombre(e.target.value)}
                  placeholder="Ej. CCM-IND-01"
                  required
                  className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-3 py-2 text-slate-100 outline-none h-10 transition-all font-bold"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1 uppercase text-[10px]">
                  Planta / Instalación
                </label>
                <input
                  type="text"
                  value={ccmPlanta}
                  onChange={(e) => setCcmPlanta(e.target.value)}
                  placeholder="Ej. Planta Procesadora Central"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-3 py-2 text-slate-100 outline-none h-10 transition-all"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1 uppercase text-[10px]">
                  Área / Proceso
                </label>
                <input
                  type="text"
                  value={ccmArea}
                  onChange={(e) => setCcmArea(e.target.value)}
                  placeholder="Ej. Cuarto Eléctrico 02 - Bombeo"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-3 py-2 text-slate-100 outline-none h-10 transition-all"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCcmModal(false)}
                  className="px-4 py-2 border border-slate-700 text-slate-400 hover:bg-slate-800 rounded-xl font-bold transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl transition-all shadow-md"
                >
                  Crear CCM
                </button>
              </div>
            </form>
          </div>
        </div>
      )}



      {/* Modal de Edición de Proyecto */}
      {showEditProyectoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200" />
          
          <div className="relative w-full max-w-lg bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl p-6 overflow-hidden max-h-[92vh] flex flex-col animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center pb-4 border-b border-slate-800 shrink-0">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
                <FolderOpen className="w-4 h-4 text-amber-500" />
                Editar Información del Proyecto
              </h3>
              <button 
                onClick={() => setShowEditProyectoModal(false)}
                className="p-1.5 hover:bg-slate-900 rounded-lg text-slate-500 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateProyectoSubmit} className="mt-4 space-y-4 overflow-y-auto pr-1">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">
                  Nombre del Proyecto *
                </label>
                <input
                  type="text"
                  required
                  value={editProyectoNombre}
                  onChange={(e) => setEditProyectoNombre(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-xl text-sm text-slate-100 focus:outline-none h-11 transition-all font-bold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-amber-500" /> Ubicación / Dirección de la Obra o Planta
                </label>
                <input
                  type="text"
                  value={editProyectoDireccion}
                  onChange={(e) => setEditProyectoDireccion(e.target.value)}
                  placeholder="Ej. Galpón 4, Av. Industrial, Valencia"
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-xl text-sm text-slate-100 focus:outline-none h-11 transition-all"
                />
              </div>

              <div className="bg-slate-900/40 p-3.5 rounded-xl border border-slate-800/80 space-y-3">
                <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-sky-400" /> Persona a Cargo / Responsable Técnico
                </span>

                <div>
                  <label className="block text-[9.5px] font-semibold text-slate-400 uppercase mb-1">
                    Nombre Completo
                  </label>
                  <input
                    type="text"
                    value={editResponsableNombre}
                    onChange={(e) => setEditResponsableNombre(e.target.value)}
                    placeholder="Ej. Ing. Carlos Mendoza"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 rounded-lg text-xs text-slate-100 focus:outline-none transition-all"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[9.5px] font-semibold text-slate-400 uppercase mb-1 flex items-center gap-1">
                      <Phone className="w-3 h-3 text-slate-400" /> Teléfono
                    </label>
                    <input
                      type="text"
                      value={editResponsableTelefono}
                      onChange={(e) => setEditResponsableTelefono(e.target.value)}
                      placeholder="+58 412 1234567"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 rounded-lg text-xs text-slate-100 focus:outline-none transition-all font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[9.5px] font-semibold text-slate-400 uppercase mb-1 flex items-center gap-1">
                      <Mail className="w-3 h-3 text-slate-400" /> Correo
                    </label>
                    <input
                      type="email"
                      value={editResponsableEmail}
                      onChange={(e) => setEditResponsableEmail(e.target.value)}
                      placeholder="carlos@empresa.com"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 rounded-lg text-xs text-slate-100 focus:outline-none transition-all"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">
                  Descripción / Alcance (Opcional)
                </label>
                <textarea
                  value={editProyectoDescripcion}
                  onChange={(e) => setEditProyectoDescripcion(e.target.value)}
                  placeholder="Describe brevemente el alcance de este proyecto..."
                  rows={2}
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-xl text-sm text-slate-100 focus:outline-none placeholder-slate-600 transition-all font-sans resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-900/60 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowEditProyectoModal(false)}
                  className="px-4.5 py-2.5 bg-slate-900 hover:bg-slate-800 text-xs font-bold rounded-xl text-slate-350 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!editProyectoNombre.trim()}
                  className="bg-amber-500 text-slate-950 font-semibold hover:bg-amber-400 active:scale-98 transition-all px-4 py-2.5 rounded-lg flex flex-row items-center justify-center gap-2 h-10 whitespace-nowrap text-xs cursor-pointer shadow-md disabled:opacity-40"
                >
                  Guardar Cambios
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
        proyectoId={proyectoId}
        companyId={companyId}
      />

      {/* Modal de Centro de Ayuda, Roles y Normativa Eléctrica (Capa 7) */}
      <HelpModal
        isOpen={showHelpModal}
        onClose={() => setShowHelpModal(false)}
      />

      {/* Modal de Edición de ID Visual (Solo Administradores) */}
      <ModalEditarIdElemento
        isOpen={editIdModalData.isOpen}
        onClose={() => setEditIdModalData({ isOpen: false, elemento: null, tipoElemento: 'TABLERO' })}
        elemento={editIdModalData.elemento}
        tipoElemento={editIdModalData.tipoElemento}
        proyectoId={proyectoId}
      />

    </div>
  );
};

export default ProyectoView;
