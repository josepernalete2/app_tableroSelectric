import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import useStore, {
  getNextElementId,
  getElementCode,
  PREFIX_MAP,
  formatElementTitleWithId,
  sortElementsByOrder,
  resolveElementParentDisplay,
  resolveElementUbicacionDisplay,
  isPlaceholderHierarchyValue,
  DEFAULT_UNIVERSAL_ELEMENT_ORDER
} from '../store/useStore';
import { useConfirm } from '../context/ConfirmContext';
import ModalDiagramaUnifilar from '../components/ModalDiagramaUnifilar';
import SelectorAlimentadorJerarquico from '../components/SelectorAlimentadorJerarquico';
import AvanceProgressBar from '../components/AvanceProgressBar';
import ElementoCardActions from '../components/ElementoCardActions';
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
  HelpCircle,
  Plus,
  Edit3,
  Tag,
  FolderOpen,
  MapPin,
  Phone,
  Mail,
  GitBranch,
  Maximize2,
  Network,
  AlertCircle,
  Eye,
  EyeOff,
  Loader2,
  Clock,
  ArrowUpDown,
  SlidersHorizontal,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  Sparkles
} from 'lucide-react';
import DiagramaUnifilarBlueprint from '../components/DiagramaUnifilarBlueprint';
import HelpModal from '../components/HelpModal';
import ModalEditarIdElemento from '../components/ModalEditarIdElemento';
import TensionNominalInput from '../components/TensionNominalInput';
import { compressImageToBase64, getCleanImageUrl } from '../utils/imageUtils';
import { eliminarImagenEnR2Cliente } from '../utils/syncService';
import { API_BASE_URL } from '../utils/api';
import { calcularPotenciaEstimadaTablero } from '../utils/potenciaTablero';
import { PRESET_UBICACIONES } from '../utils/electricalPresets';

// Componente para renderizar Base64 / Blobs / URLs de forma segura con fallback limpio
const SafeImage = ({ blob, src, alt, className, fallback = null }) => {
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
  if (!finalSrc || hasError) return fallback;

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
    updateSubestacion,
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
    vincularJerarquia,
    showToast,
    universalElementOrder,
    elementSortMode,
    setUniversalElementOrder,
    setElementSortMode,
    resetUniversalElementOrder
  } = useStore();

  const company = companies.find((c) => c.id === companyId);
  const proyecto = company?.proyectos?.find((p) => p.id === proyectoId);

  const { confirm, alert: customAlert } = useConfirm();

  const handleDeleteCardPhoto = async (e, item, cardPhotoSrc) => {
    e.stopPropagation();
    if (!item || user?.role === 'CLIENT') return;
    const confirmed = await confirm({
      title: 'Eliminar fotografía',
      message: '¿Eliminar esta fotografía? Se borrará del elemento y de la nube.',
      confirmText: 'Sí, Eliminar',
      cancelText: 'Cancelar',
      type: 'danger'
    });
    if (!confirmed) return;

    const freshToken =
      useStore.getState().token ||
      (typeof localStorage !== 'undefined' ? localStorage.getItem('token') : '') ||
      '';
    if (cardPhotoSrc) {
      eliminarImagenEnR2Cliente(cardPhotoSrc, freshToken);
    }

    const clearedPhoto = {
      foto: null,
      fotoUrl: null,
      imagen: null,
      fotoBlob: null,
      eliminarFoto: true,
      ...(item.datosTecnicos ? { datosTecnicos: { ...item.datosTecnicos, foto: null, fotoUrl: null } } : {})
    };

    const tipo = String(item.tipoElemento || '').toUpperCase();
    if (tipo === 'SUBESTACION' && (proyecto?.inspeccionesSubestacion || []).some((s) => s.id === item.id)) {
      updateSubestacion(proyectoId, item.id, {
        ...clearedPhoto,
        estadoEntorno: { ...(item.estadoEntorno || {}), __foto: null }
      });
    } else if (tipo === 'CCM' && (proyecto?.ccmList || []).some((c) => c.id === item.id)) {
      updateCcm(proyectoId, item.id, {
        ...clearedPhoto,
        parametrosElectricos: { ...(item.parametrosElectricos || {}), __foto: null }
      });
    } else if ((proyecto?.puntosMedicion || []).some((pm) => pm.id === item.id)) {
      updatePuntoMedicion(proyectoId, item.id, clearedPhoto);
    } else {
      updateElementoUnifilar(proyectoId, item.id, clearedPhoto);
    }
    showToast?.('Fotografía eliminada correctamente.', 'info');
  };

  // Estado del modal de eliminación permanente de Elemento / Inspección (solo ADMIN)
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deletePassword, setDeletePassword] = useState('');
  const [showDeletePassword, setShowDeletePassword] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const closeDeleteElementoModal = () => {
    if (isDeleting) return;
    setDeleteTarget(null);
    setDeletePassword('');
    setShowDeletePassword(false);
    setDeleteError('');
  };

  const handleOpenDeleteElementoModal = (item, category = 'UNIFILAR') => {
    if (user?.role !== 'ADMIN') return;
    setDeleteTarget({
      id: item.id,
      ids: [item.id],
      nombre: item.nombre || item.codigo || 'Elemento',
      category,
      isBulk: false
    });
    setDeletePassword('');
    setShowDeletePassword(false);
    setDeleteError('');
  };

  const handleConfirmDeleteElemento = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!deleteTarget || isDeleting) return;
    if (!deletePassword) {
      setDeleteError('Ingresa tu contraseña de administrador.');
      return;
    }
    setIsDeleting(true);
    setDeleteError('');
    try {
      const targetIds = Array.isArray(deleteTarget.ids) ? deleteTarget.ids : [deleteTarget.id];
      for (const eid of targetIds) {
        const res = deleteTarget.category === 'INSPECCION'
          ? await deleteSubestacion(proyectoId, eid, deletePassword)
          : await deleteElementoUnifilar(proyectoId, eid, deletePassword);
        if (!res?.ok) {
          setDeleteError(res?.error || 'Contraseña de administrador incorrecta');
          setIsDeleting(false);
          return;
        }
      }
      setDeleteTarget(null);
      setDeletePassword('');
      setShowDeletePassword(false);
      if (deleteTarget.isBulk) {
        showToast?.(
          deleteTarget.category === 'INSPECCION'
            ? `Se eliminaron ${targetIds.length} fichas de inspección correctamente`
            : `Se eliminaron ${targetIds.length} elementos correctamente`,
          'success'
        );
        setSelectedIds(new Set());
        setIsMultiSelectMode(false);
      } else {
        showToast?.(
          deleteTarget.category === 'INSPECCION'
            ? 'Inspección eliminada correctamente'
            : 'Elemento eliminado correctamente',
          'success'
        );
      }
    } catch (err) {
      setDeleteError(err?.message || 'Error inesperado al eliminar el elemento.');
    } finally {
      setIsDeleting(false);
    }
  };

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

  // Estados de pestaña activa y filtros rápidos por tipo
  const [activeTab, setActiveTab] = useState('UNIFILAR'); // 'UNIFILAR' | 'ESTRUCTURAL'
  const [searchQuery, setSearchQuery] = useState('');
  const [elementoTypeFilter, setElementoTypeFilter] = useState('ALL');
  const [inspeccionTypeFilter, setInspeccionTypeFilter] = useState('ALL');
  const [onlyPendientesFilter, setOnlyPendientesFilter] = useState(false);

  // Modal configurador de orden universal por tipo
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [draftTypeOrder, setDraftTypeOrder] = useState(() =>
    Array.isArray(universalElementOrder) && universalElementOrder.length > 0
      ? [...universalElementOrder]
      : [...DEFAULT_UNIVERSAL_ELEMENT_ORDER]
  );

  const isItemPendiente = (item) => Boolean(
    item?.pendiente ||
    item?.datosTecnicos?.pendiente ||
    item?.estadoEntorno?.__pendiente ||
    item?.parametrosElectricos?.__pendiente
  );

  const handleTogglePendiente = (e, item) => {
    e?.stopPropagation?.();
    if (!item || user?.role === 'CLIENT') return;
    const nextPendiente = !isItemPendiente(item);
    const tipo = String(item.tipoElemento || item.tipo || '').toUpperCase();

    if (
      item._sourceCollection === 'SUBESTACION' ||
      (tipo === 'SUBESTACION' && (proyecto?.inspeccionesSubestacion || proyecto?.subestaciones || []).some((s) => s.id === item.id)) ||
      (proyecto?.inspeccionesSubestacion || []).some((s) => s.id === item.id)
    ) {
      updateSubestacion(proyectoId, item.id, {
        pendiente: nextPendiente,
        estadoEntorno: { ...(item.estadoEntorno || {}), __pendiente: nextPendiente }
      });
    } else if (tipo === 'CCM' && (proyecto?.ccmList || []).some((c) => c.id === item.id)) {
      updateCcm(proyectoId, item.id, {
        pendiente: nextPendiente,
        parametrosElectricos: { ...(item.parametrosElectricos || {}), __pendiente: nextPendiente }
      });
    } else if ((proyecto?.puntosMedicion || []).some((pm) => pm.id === item.id)) {
      updatePuntoMedicion(proyectoId, item.id, { pendiente: nextPendiente });
    } else {
      updateElementoUnifilar(proyectoId, item.id, {
        pendiente: nextPendiente,
        datosTecnicos: { ...(item.datosTecnicos || {}), pendiente: nextPendiente }
      });
    }

    showToast?.(
      nextPendiente
        ? `"${item.nombre || 'Elemento'}" marcado como PENDIENTE`
        : `"${item.nombre || 'Elemento'}" quitado de pendientes`,
      nextPendiente ? 'info' : 'success'
    );
  };

  const ELEMENT_TYPE_META = {
    SUBESTACION: { label: 'Subestaciones', emoji: '🏢' },
    PUNTO_SUMINISTRO: { label: 'Puntos de Suministro', emoji: '🔌' },
    PUNTO_MEDICION: { label: 'Puntos de Medición', emoji: '📏' },
    TRANSFORMADOR: { label: 'Transformadores', emoji: '🔄' },
    GENERADOR: { label: 'Generadores', emoji: '🔋' },
    TRANSFER: { label: 'Transferencias (ATS/MTS)', emoji: '🔀' },
    CCM: { label: 'CCM Motores', emoji: '⚙️' },
    TABLERO: { label: 'Tableros / Paneles Eléctricos', emoji: '⚡' },
    BANCO_CONDENSADOR: { label: 'Bancos de Condensadores', emoji: '⚡' },
    PUESTA_TIERRA: { label: 'Puesta a Tierra', emoji: '🛡️' },
    TERMOGRAFICA: { label: 'Inspección Termográfica', emoji: '🔥' },
    SISTEMA_ATERRAMIENTO: { label: 'Sistema de Aterramiento (SPAT)', emoji: '🛡️' },
    TANQUE_COMBUSTIBLE: { label: 'Tanques de Combustible', emoji: '⛽' },
    OTRO: { label: 'Otros Equipos', emoji: '📦' }
  };

  const getShortElementId = (item) => {
    if (!item) return '';
    const explicit =
      item.codigo ||
      item.codigoCorto ||
      item.idCorto ||
      item.tag ||
      item.datosTecnicos?.codigo ||
      item.datosTecnicos?.tag ||
      item.estadoEntorno?.codigo ||
      item.parametrosElectricos?.codigo ||
      '';
    const raw = String(explicit || getElementCode(item, item.tipoElemento || item.tipo || 'TABLERO') || '').trim();
    if (!raw || raw === '—' || raw === 'N/A' || raw === 'SIN-ID') return '';
    return raw.toUpperCase().replace(/\s+/g, '');
  };

  const sortUniversalList = (list, mode, typeOrder) => {
    if (!Array.isArray(list)) return [];
    if (!mode || mode === 'MANUAL') return list;

    const effectiveOrder = Array.isArray(typeOrder) && typeOrder.length > 0
      ? typeOrder
      : DEFAULT_UNIVERSAL_ELEMENT_ORDER;
    const orderIndexMap = new Map(effectiveOrder.map((t, idx) => [String(t).toUpperCase(), idx]));
    const getTypeRank = (item) => {
      const t = String(item?.tipoElemento || item?.tipo || 'TABLERO').trim().toUpperCase();
      if (orderIndexMap.has(t)) return orderIndexMap.get(t);
      if (t === 'AMBIENTAL_FISICA') return orderIndexMap.get('SUBESTACION') ?? 998;
      return 999;
    };
    const getSortName = (item) => String(formatElementTitleWithId(item?.nombre, item?.id, item?.codigo) || item?.nombre || '').trim();
    const compareAlphaAsc = (a, b) => getSortName(a).localeCompare(getSortName(b), 'es', { numeric: true, sensitivity: 'base' });
    const compareByShortId = (a, b, desc = false) => {
      const idA = getShortElementId(a);
      const idB = getShortElementId(b);
      if (!idA && !idB) return desc ? compareAlphaAsc(b, a) : compareAlphaAsc(a, b);
      if (!idA) return 1;
      if (!idB) return -1;
      const cmp = idA.localeCompare(idB, 'es', { numeric: true, sensitivity: 'base' });
      if (cmp !== 0) return desc ? -cmp : cmp;
      return desc ? compareAlphaAsc(b, a) : compareAlphaAsc(a, b);
    };

    return [...list].sort((a, b) => {
      if (mode === 'id_asc') {
        return compareByShortId(a, b, false);
      }
      if (mode === 'id_desc') {
        return compareByShortId(a, b, true);
      }
      if (mode === 'ALPHA_ASC') {
        return compareAlphaAsc(a, b);
      }
      if (mode === 'ALPHA_DESC') {
        return compareAlphaAsc(b, a);
      }
      if (mode === 'PENDING_FIRST') {
        const pa = isItemPendiente(a) ? 0 : 1;
        const pb = isItemPendiente(b) ? 0 : 1;
        if (pa !== pb) return pa - pb;
        const ra = getTypeRank(a);
        const rb = getTypeRank(b);
        if (ra !== rb) return ra - rb;
        return compareByShortId(a, b, false);
      }
      if (mode === 'TYPE_UNIVERSAL') {
        const ra = getTypeRank(a);
        const rb = getTypeRank(b);
        if (ra !== rb) return ra - rb;
        return compareByShortId(a, b, false);
      }
      return 0;
    });
  };

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

  // Inventario unificado y deduplicado de todos los equipos registrados en el proyecto
  const equiposRegistrados = useMemo(() => {
    const seen = new Set();
    const unified = [];
    (elementos || []).forEach((e) => {
      if (!e?.id || seen.has(e.id)) return;
      seen.add(e.id);
      unified.push({ ...e, tipoElemento: e.tipoElemento || 'TABLERO', _sourceCollection: 'UNIFILAR' });
    });
    (puntosMedicion || []).forEach((p) => {
      if (!p?.id || seen.has(p.id)) return;
      seen.add(p.id);
      unified.push({ ...p, tipoElemento: p.tipoElemento || 'PUNTO_MEDICION', _sourceCollection: 'PUNTO_MEDICION' });
    });
    (proyecto?.ccmList || []).forEach((c) => {
      if (!c?.id || seen.has(c.id)) return;
      seen.add(c.id);
      unified.push({ ...c, tipoElemento: c.tipoElemento || 'CCM', _sourceCollection: 'CCM' });
    });
    return unified;
  }, [elementos, puntosMedicion, proyecto?.ccmList]);

  // Lista jerárquica sincronizada para selectores de procedencia/alimentador
  const todosElementosJerarquia = useMemo(() => {
    const unifilares = (elementos || []).map(e => ({
      ...e,
      nombre: (e.nombre || '').toUpperCase().trim(),
      tipoElemento: e.tipoElemento || 'TABLERO',
      tipo: e.tipoElemento || 'TABLERO',
      codigo: e.codigo || e.datosTecnicos?.codigo || null
    }));
    const subs = (inspecciones || []).map(s => ({
      ...s,
      nombre: (s.nombre || '').toUpperCase().trim(),
      tipoElemento: 'SUBESTACION',
      tipo: 'SUBESTACION',
      codigo: s.codigo || null
    }));
    const puntos = (puntosMedicion || []).map(p => ({
      ...p,
      nombre: (p.nombre || '').toUpperCase().trim(),
      tipoElemento: 'PUNTO_MEDICION',
      tipo: 'PUNTO_MEDICION',
      codigo: p.codigo || null
    }));
    const ccms = (proyecto?.ccmList || []).map(c => ({
      ...c,
      nombre: (c.nombre || '').toUpperCase().trim(),
      tipoElemento: 'CCM',
      tipo: 'CCM',
      codigo: c.codigo || null
    }));
    return [...unifilares, ...subs, ...puntos, ...ccms];
  }, [elementos, inspecciones, puntosMedicion, proyecto?.ccmList]);

  const getInspeccionFilterKey = (item) => {
    const raw = String(item?.tipoElemento || item?.tipo || '').trim().toUpperCase();
    if (!raw || raw === 'AMBIENTAL_FISICA' || raw === 'SUBESTACION') return 'AMBIENTAL_FISICA';
    if (raw === 'SISTEMA_ATERRAMIENTO' || raw === 'PUESTA_TIERRA') return 'SISTEMA_ATERRAMIENTO';
    return raw;
  };

  const elementoFilterChips = useMemo(() => {
    const normalizeTipo = (el) => String(el?.tipoElemento || 'TABLERO').toUpperCase();
    const countFor = (matcher) => equiposRegistrados.filter((el) => matcher(normalizeTipo(el))).length;
    const base = [
      { id: 'ALL', label: 'Todos', count: equiposRegistrados.length },
      { id: 'TABLERO', label: 'Paneles Eléctricos', count: countFor((t) => t === 'TABLERO') },
      { id: 'PUNTO_SUMINISTRO', label: 'Puntos de Suministro / Control', count: countFor((t) => t === 'PUNTO_SUMINISTRO' || t === 'PUNTO_MEDICION') },
      { id: 'TRANSFORMADOR', label: 'Transformadores', count: countFor((t) => t === 'TRANSFORMADOR') },
      { id: 'TRANSFER', label: 'Transferencias', count: countFor((t) => t === 'TRANSFER') },
      { id: 'GENERADOR', label: 'Generadores', count: countFor((t) => t === 'GENERADOR') },
      { id: 'CCM', label: 'CCM', count: countFor((t) => t === 'CCM') },
      { id: 'BANCO_CONDENSADOR', label: 'Banco Cond.', count: countFor((t) => t === 'BANCO_CONDENSADOR') }
    ];
    const covered = new Set(['TABLERO', 'PUNTO_SUMINISTRO', 'PUNTO_MEDICION', 'TRANSFORMADOR', 'TRANSFER', 'GENERADOR', 'CCM', 'BANCO_CONDENSADOR']);
    const extraCounts = new Map();
    equiposRegistrados.forEach((el) => {
      const t = normalizeTipo(el);
      if (!covered.has(t)) {
        extraCounts.set(t, (extraCounts.get(t) || 0) + 1);
      }
    });
    extraCounts.forEach((cnt, t) => {
      base.push({ id: t, label: t === 'OTRO' ? 'Otros Equipos' : t.replace(/_/g, ' '), count: cnt });
    });
    return base;
  }, [equiposRegistrados]);

  const inspeccionFilterChips = useMemo(() => {
    const base = [
      { id: 'ALL', label: 'Todas' },
      { id: 'AMBIENTAL_FISICA', label: 'Ambiental / Subestación' },
      { id: 'TERMOGRAFICA', label: 'Termografía' },
      { id: 'SISTEMA_ATERRAMIENTO', label: 'Aterramiento (SPAT)' },
      { id: 'TANQUE_COMBUSTIBLE', label: 'Tanque Combustible' }
    ];
    const counts = new Map();
    const extraKeys = [];
    const baseIds = new Set(base.map((b) => b.id));
    inspecciones.forEach((item) => {
      const key = getInspeccionFilterKey(item);
      counts.set(key, (counts.get(key) || 0) + 1);
      if (!baseIds.has(key) && !extraKeys.includes(key)) {
        extraKeys.push(key);
      }
    });
    const chips = base.map((b) => ({
      ...b,
      count: b.id === 'ALL' ? inspecciones.length : (counts.get(b.id) || 0)
    }));
    extraKeys.forEach((key) => {
      chips.push({ id: key, label: key.replace(/_/g, ' '), count: counts.get(key) || 0 });
    });
    return chips;
  }, [inspecciones]);

  const pendingElementosCount = useMemo(
    () => equiposRegistrados.filter((e) => isItemPendiente(e)).length,
    [equiposRegistrados]
  );

  const pendingInspeccionesCount = useMemo(
    () => inspecciones.filter((i) => isItemPendiente(i)).length,
    [inspecciones]
  );

  const filteredElementos = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const filtered = equiposRegistrados.filter((e) => {
      if (onlyPendientesFilter && !isItemPendiente(e)) return false;
      const tipo = String(e.tipoElemento || 'TABLERO').toUpperCase();
      if (elementoTypeFilter !== 'ALL') {
        if (elementoTypeFilter === 'PUNTO_SUMINISTRO') {
          if (tipo !== 'PUNTO_SUMINISTRO' && tipo !== 'PUNTO_MEDICION') return false;
        } else if (tipo !== elementoTypeFilter) {
          return false;
        }
      }
      if (!q) return true;
      return (
        e.nombre?.toLowerCase().includes(q) ||
        e.codigo?.toLowerCase().includes(q) ||
        e.tipoElemento?.toLowerCase().includes(q) ||
        e.ubicacion?.toLowerCase().includes(q)
      );
    });
    return sortUniversalList(filtered, elementSortMode, universalElementOrder);
  }, [equiposRegistrados, searchQuery, elementoTypeFilter, onlyPendientesFilter, elementSortMode, universalElementOrder]);

  const filteredInspecciones = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const filtered = inspecciones.filter((i) => {
      if (onlyPendientesFilter && !isItemPendiente(i)) return false;
      if (inspeccionTypeFilter !== 'ALL' && getInspeccionFilterKey(i) !== inspeccionTypeFilter) {
        return false;
      }
      if (!q) return true;
      return (
        i.nombre?.toLowerCase().includes(q) ||
        i.codigo?.toLowerCase().includes(q) ||
        i.tipoElemento?.toLowerCase().includes(q) ||
        i.ubicacion?.toLowerCase().includes(q) ||
        i.inspector?.toLowerCase().includes(q)
      );
    });
    return sortUniversalList(filtered, elementSortMode, universalElementOrder);
  }, [inspecciones, searchQuery, inspeccionTypeFilter, onlyPendientesFilter, elementSortMode, universalElementOrder]);

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

  // Limpiar selección cuando cambia la pestaña, la búsqueda o el filtro rápido
  useEffect(() => {
    setSelectedIds(new Set());
  }, [activeTab, searchQuery, elementoTypeFilter, inspeccionTypeFilter, onlyPendientesFilter]);

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
    const targetList = Array.isArray(items)
      ? items
      : (activeTab === 'UNIFILAR' ? filteredElementos : filteredInspecciones);
    setSelectedIds(new Set((targetList || []).map((i) => i.id)));
  };

  const handleDeselectAll = () => {
    setSelectedIds(new Set());
  };

  const handleDeleteSelected = () => {
    if (user?.role !== 'ADMIN') return;
    const selectedCount = selectedIds.size;
    if (selectedCount === 0) return;

    setDeleteTarget({
      ids: Array.from(selectedIds),
      nombre: `${selectedCount} ${selectedCount === 1 ? 'elemento seleccionado' : 'elementos seleccionados'}`,
      category: activeTab === 'UNIFILAR' ? 'UNIFILAR' : 'INSPECCION',
      isBulk: true
    });
    setDeletePassword('');
    setShowDeletePassword(false);
    setDeleteError('');
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

  // Efecto para rellenar campos en caso de edición (solo los 6 campos esenciales)
  useEffect(() => {
    if (editingElemento) {
      const resolvedUbic = resolveElementUbicacionDisplay(editingElemento);
      const resolvedParent = resolveElementParentDisplay(editingElemento, todosElementosJerarquia);
      const parentObj = resolvedParent && !isPlaceholderHierarchyValue(resolvedParent)
        ? todosElementosJerarquia.find(
            (el) => el.id === editingElemento.alimentadoPorId ||
                    el.id === editingElemento.datosTecnicos?.alimentadorId ||
                    el.nombre === resolvedParent
          )
        : null;

      setNombre(editingElemento.nombre ? String(editingElemento.nombre).toUpperCase() : '');
      setUbicacion(resolvedUbic);
      setAlimentadoPor(isPlaceholderHierarchyValue(resolvedParent) ? '' : resolvedParent);
      setAlimentadoPorId(
        editingElemento.alimentadoPorId ||
        editingElemento.datosTecnicos?.alimentadoPorId ||
        editingElemento.datosTecnicos?.alimentadorId ||
        (parentObj?.id || null)
      );

      // Cargas alimentadas aguas abajo ("ALIMENTA A")
      const downstreamChildren = (todosElementosJerarquia || []).filter(el => el.alimentadoPorId === editingElemento.id);
      const initialAlimentaAIds = downstreamChildren.length > 0
        ? downstreamChildren.map(c => c.id)
        : (editingElemento.datosTecnicos?.alimentaAIds || []);
      const initialAlimentaANombres = downstreamChildren.length > 0
        ? downstreamChildren.map(c => c.nombre).join(', ')
        : (editingElemento.datosTecnicos?.alimentaA || editingElemento.alimentaA || '');

      setAlimentaA(initialAlimentaANombres ? String(initialAlimentaANombres).toUpperCase() : '');
      setAlimentaAIds(Array.isArray(initialAlimentaAIds) ? initialAlimentaAIds : []);

      setObservacionesGenerales(editingElemento.observacionesGenerales ? String(editingElemento.observacionesGenerales).toUpperCase() : '');
      setTipoElemento(editingElemento.tipoElemento || 'TABLERO');
      setEliminarFoto(false);
      setFoto(editingElemento.foto || null);
      setFotoBlob(null);
      setPreviewUrl(editingElemento.foto || null);
    } else {
      setNombre('');
      setUbicacion('');
      setAlimentadoPor('');
      setAlimentadoPorId(null);
      setAlimentaA('');
      setAlimentaAIds([]);
      setObservacionesGenerales('');
      setTipoElemento('TABLERO');
      setEliminarFoto(false);
      setFoto(null);
      setFotoBlob(null);
      setPreviewUrl(null);
    }
  }, [editingElemento]);

  const [showDiagramModal, setShowDiagramModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);

  // Selector de plantilla / tipo de elemento
  const [tipoElemento, setTipoElemento] = useState('TABLERO');

  // Campos comunes simplificados
  const [nombre, setNombre] = useState('');
  const [ubicacion, setUbicacion] = useState('');
  const [alimentadoPor, setAlimentadoPor] = useState('');
  const [alimentadoPorId, setAlimentadoPorId] = useState(null);
  const [alimentaA, setAlimentaA] = useState('');
  const [alimentaAIds, setAlimentaAIds] = useState([]);
  const [observacionesGenerales, setObservacionesGenerales] = useState('');
  const [fotoBlob, setFotoBlob] = useState(null);
  const [foto, setFoto] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [eliminarFoto, setEliminarFoto] = useState(false);

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
      const baseDefaults = tipoElemento === 'TABLERO'
        ? {
            maxPoles: 24,
            fases: 3,
            circuits: [],
            barrasPrincipales: { ia: '0', ib: '0', ic: '0' },
            breakerPrincipal: { marca: '', tipo: '', amp: '' },
            voltaje: { va: '', vb: '', vc: '', vab: '', vbc: '', vca: '' },
            neutroLlegada: { calibre: '', observaciones: '' },
            puestaTierra: { calibre: '', observaciones: '' }
          }
        : {};

      const isTableroTipo = tipoElemento === 'TABLERO';
      const cleanAlimentaAText = isTableroTipo ? '' : (alimentaA ? alimentaA.trim().toUpperCase() : '');
      const cleanAlimentaAIdsList = isTableroTipo ? [] : (Array.isArray(alimentaAIds) ? alimentaAIds : []);
      const cleanParentId = tipoElemento === 'GENERADOR' ? null : (alimentadoPorId || null);
      const cleanAlimentadoPorText = tipoElemento === 'GENERADOR'
        ? 'FUENTE PRIMARIA INDEPENDIENTE'
        : (isPlaceholderHierarchyValue(alimentadoPor) ? '' : alimentadoPor.trim().toUpperCase());
      const cleanUbicacionText = isPlaceholderHierarchyValue(ubicacion) ? '' : ubicacion.trim().toUpperCase();

      const datosTecnicos = {
        ...(editingElemento ? (editingElemento.datosTecnicos || {}) : baseDefaults),
        alimentadoPorId: cleanParentId,
        ...(cleanParentId === null ? { alimentadorId: null } : {}),
        ...((!editingElemento || !isTableroTipo)
          ? {
              alimentaA: cleanAlimentaAText,
              alimentaAIds: cleanAlimentaAIdsList
            }
          : {})
      };

      if (editingElemento) {
        updateElementoUnifilar(proyectoId, editingElemento.id, {
          nombre: nombre.trim().toUpperCase(),
          tipoElemento,
          tension: editingElemento.tension || '',
          ubicacion: cleanUbicacionText,
          alimentadoPor: cleanAlimentadoPorText,
          alimentadoPorId: cleanParentId,
          ...(!isTableroTipo
            ? {
                alimentaA: cleanAlimentaAText,
                alimentaAIds: cleanAlimentaAIdsList
              }
            : {}),
          foto: eliminarFoto ? null : (foto !== undefined ? foto : editingElemento.foto),
          fotoBlob: eliminarFoto ? null : (fotoBlob || null),
          eliminarFoto: Boolean(eliminarFoto),
          observacionesGenerales: observacionesGenerales.trim().toUpperCase(),
          datosTecnicos
        });
        showToast?.("Equipo actualizado correctamente.", "success");
        setEditingElemento(null);
        setAlimentadoPorId(null);
        setAlimentaA('');
        setAlimentaAIds([]);
        setFoto(null);
        setFotoBlob(null);
        setEliminarFoto(false);
        setShowElementoModal(false);
      } else {
        const assignedCode = getNextElementId(tipoElemento, proyectoId);
        const result = addElementoUnifilar(proyectoId, {
          codigo: assignedCode.toUpperCase(),
          nombre: nombre.trim().toUpperCase(),
          tipoElemento,
          tension: '',
          ubicacion: cleanUbicacionText,
          alimentadoPor: cleanAlimentadoPorText,
          alimentadoPorId: cleanParentId,
          alimentaA: cleanAlimentaAText,
          alimentaAIds: cleanAlimentaAIdsList,
          foto,
          fotoBlob,
          observacionesGenerales: observacionesGenerales.trim().toUpperCase(),
          datosTecnicos
        });

        if (result.success) {
          setNombre('');
          setUbicacion('');
          setAlimentadoPor('');
          setAlimentadoPorId(null);
          setAlimentaA('');
          setAlimentaAIds([]);
          setObservacionesGenerales('');
          setFoto(null);
          setFotoBlob(null);
          if (previewUrl && previewUrl.startsWith('blob:')) URL.revokeObjectURL(previewUrl);
          setPreviewUrl(null);
          setShowElementoModal(false);
          showToast?.("Equipo registrado correctamente.", "success");
        } else {
          customAlert(result.error);
        }
      }
    } catch (err) {
      console.error("Error al registrar o actualizar equipo:", err);
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
            {/* Pestaña temporalmente inactiva a solicitud del usuario */}
            {/*
            <button
              onClick={() => setActiveTab('JERARQUIA')}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'JERARQUIA' 
                  ? 'bg-amber-500 text-slate-950 shadow-md' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <GitBranch className="w-4 h-4" /> Jerarquía y Topología
            </button>
            */}
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
                  {/* Controles para Diagrama Unifilar y Jerarquía */}
                  {(activeTab === 'UNIFILAR' || activeTab === 'JERARQUIA') && (
                    <>
                      {activeTab === 'JERARQUIA' && (
                        <button
                          onClick={() => setShowDiagramModal(true)}
                          className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-3.5 py-2 rounded-xl flex items-center justify-center gap-2 h-9 cursor-pointer text-xs shadow-md transition-all active:scale-95"
                          title="Abrir diagrama unifilar en modal ampliado"
                        >
                          <Maximize2 className="w-4 h-4" /> Modo CAD Completo
                        </button>
                      )}

                      {activeTab === 'UNIFILAR' && user?.role === 'ADMIN' && (
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
                      )}

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
              {selectedIds.size > 0 && user?.role === 'ADMIN' && (
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

        {/* CONTENIDO DE PESTAÑA C: JERARQUÍA Y TOPOLOGÍA UNIFILAR */}
        {activeTab === 'JERARQUIA' && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-md font-bold text-slate-200 flex items-center gap-2">
                  <GitBranch className="w-5 h-5 text-amber-500" />
                  Jerarquía y Topología Eléctrica (Diagrama Unifilar)
                </h2>
                <p className="text-xs text-slate-500">
                  Estructura de distribución de potencia: relación directa entre acometidas, transformadores, generadores, transferencias, CCMs y tableros de distribución.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowDiagramModal(true)}
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-4.5 py-2.5 rounded-xl flex items-center justify-center gap-2 text-xs transition-all shadow-md active:scale-98 cursor-pointer"
                >
                  <Maximize2 className="w-4 h-4 fill-slate-950" /> Expandir Modo CAD
                </button>
              </div>
            </div>

            {/* Canvas Interactivo del Diagrama Unifilar */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl relative">
              <div className="p-3 bg-slate-900/60 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2 text-slate-300 font-semibold">
                  <Network className="w-4 h-4 text-amber-400" />
                  <span>Plano Unifilar Vectorial (Topología en Tiempo Real)</span>
                  <span className="text-[10px] bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded border border-amber-500/20 font-mono">
                    {todosElementosJerarquia.length} Nodos
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 flex items-center gap-4">
                  <span className="hidden sm:inline">💡 Haz clic sobre cualquier nodo para inspeccionar sus circuitos</span>
                  <button
                    onClick={() => setShowDiagramModal(true)}
                    className="text-amber-400 hover:text-amber-300 font-bold underline cursor-pointer"
                  >
                    Ver a pantalla completa
                  </button>
                </div>
              </div>
              
              <div className="h-[520px] w-full bg-slate-950 relative">
                {todosElementosJerarquia.length > 0 ? (
                  <DiagramaUnifilarBlueprint
                    elementos={todosElementosJerarquia}
                    onSelectNode={(node) => {
                      if (node?.id) {
                        navigate(`/empresa/${companyId}/tablero/${node.id}`);
                      }
                    }}
                  />
                ) : (
                  <div className="h-full flex flex-col items-center justify-center p-8 text-center text-slate-500 gap-3">
                    <GitBranch className="w-12 h-12 text-slate-700" />
                    <p className="text-sm font-semibold text-slate-400">No hay equipos registrados para construir la jerarquía</p>
                    <button
                      onClick={() => {
                        setTipoElemento('TABLERO');
                        setShowElementoModal(true);
                      }}
                      className="px-4 py-2 bg-amber-500 text-slate-950 rounded-xl text-xs font-bold"
                    >
                      + Registrar Primer Equipo
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Matriz de Enlaces de Alimentación (Topological Feeding Matrix) */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-amber-500" /> Matriz de Enlaces de Alimentación
                  </h3>
                  <p className="text-xs text-slate-500">
                    Inspección y vinculación jerárquica de procedencia para cada tablero y carga eléctrica del proyecto.
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-[10px] uppercase font-bold text-slate-400 tracking-wider bg-slate-900/50">
                      <th className="py-2.5 px-3">Código</th>
                      <th className="py-2.5 px-3">Equipo / Elemento</th>
                      <th className="py-2.5 px-3">Tipo</th>
                      <th className="py-2.5 px-3">Ubicación</th>
                      <th className="py-2.5 px-3">Alimentado Por (Procedencia)</th>
                      <th className="py-2.5 px-3">Alimenta A (Cargas Destino)</th>
                      <th className="py-2.5 px-3">Tensión / Capacidad</th>
                      <th className="py-2.5 px-3 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-sans">
                    {todosElementosJerarquia.map((elem) => {
                      const resolvedParent = resolveElementParentDisplay(elem, todosElementosJerarquia);
                      const resolvedUbic = resolveElementUbicacionDisplay(elem);
                      const isOrphan = !resolvedParent;
                      return (
                        <tr key={elem.id} className="hover:bg-slate-900/40 transition-colors">
                          <td className="py-2.5 px-3 font-mono font-bold text-amber-400">
                            {getElementCode(elem, elem.tipoElemento || elem.tipo || 'TABLERO')}
                          </td>
                          <td className="py-2.5 px-3 font-bold text-slate-200">
                            {elem.nombre}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="px-2 py-0.5 rounded text-[9.5px] font-mono font-bold bg-slate-900 text-slate-300 border border-slate-800">
                              {elem.tipoElemento || elem.tipo || 'TABLERO'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-400 text-[11px]">
                            {resolvedUbic || '—'}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className={`px-2 py-0.5 rounded text-[10.5px] font-medium inline-flex items-center gap-1.5 ${
                              isOrphan 
                                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' 
                                : 'bg-slate-900 text-slate-200 border border-slate-800'
                            }`}>
                              <GitBranch className="w-3 h-3 text-amber-500" />
                              {resolvedParent || 'RAÍZ / ACOMETIDA PRINCIPAL'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            {(() => {
                              const circuitChildIds = new Set();
                              const rawCircuits = elem.datosTecnicos?.circuits || elem.circuits || [];
                              rawCircuits.forEach((c) => {
                                const rawDest = c?.elementoDestinoId || c?.vinculadoId || '';
                                if (!rawDest) return;
                                String(rawDest).split(',').map(s => s.trim()).filter(Boolean).forEach(cid => circuitChildIds.add(cid));
                              });
                              const downstream = todosElementosJerarquia.filter(
                                (c) => c.id !== elem.id && (
                                  c.alimentadoPorId === elem.id ||
                                  (elem.datosTecnicos?.alimentaAIds && elem.datosTecnicos.alimentaAIds.includes(c.id)) ||
                                  (elem.alimentaAIds && elem.alimentaAIds.includes(c.id)) ||
                                  circuitChildIds.has(c.id)
                                )
                              );
                              if (downstream.length === 0) {
                                if (elem.alimentaA) {
                                  return (
                                    <span className="text-emerald-400 font-semibold text-[10.5px]">
                                      {elem.alimentaA}
                                    </span>
                                  );
                                }
                                return (
                                  <span className="text-slate-500 text-[10.5px] italic">
                                    Terminal (Sin cargas)
                                  </span>
                                );
                              }
                              return (
                                <div className="flex flex-wrap gap-1 max-w-xs">
                                  {downstream.map((d) => (
                                    <span
                                      key={d.id}
                                      className="px-1.5 py-0.5 rounded text-[9.5px] font-mono font-semibold bg-emerald-950/60 text-emerald-300 border border-emerald-800/50 flex items-center gap-1 shadow-sm"
                                      title={d.nombre}
                                    >
                                      <Zap className="w-2.5 h-2.5 text-emerald-400" />
                                      {getElementCode(d, d.tipoElemento || d.tipo || 'TABLERO')}
                                    </span>
                                  ))}
                                </div>
                              );
                            })()}
                          </td>
                          <td className="py-2.5 px-3 text-slate-400 font-mono text-[11px]">
                            {elem.tension || elem.datosTecnicos?.nivelTension || elem.datosTecnicos?.kva || elem.datosTecnicos?.capacidadAmperios || '—'}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <button
                              onClick={() => navigate(`/empresa/${companyId}/tablero/${elem.id}`)}
                              className="px-3 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-slate-300 hover:text-amber-400 font-bold text-[11px] transition-colors cursor-pointer"
                            >
                              Inspeccionar
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
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

            {/* Barra de Filtros Rápidos por Tipo de Inspección + Pendientes + Ordenamiento */}
            {inspecciones.length > 0 && (
              <div className="space-y-3 mb-5">
                <div className="flex flex-wrap items-center gap-2">
                  {inspeccionFilterChips.map((chip) => {
                    const isActive = inspeccionTypeFilter === chip.id;
                    return (
                      <button
                        key={chip.id}
                        type="button"
                        onClick={() => setInspeccionTypeFilter(chip.id)}
                        className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1.5 border ${
                          isActive
                            ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm font-black'
                            : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-amber-500/40 hover:text-amber-400'
                        }`}
                      >
                        <span>{chip.label}</span>
                        <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono ${
                          isActive ? 'bg-slate-950/20 text-slate-950' : 'bg-slate-900 text-slate-400'
                        }`}>
                          {chip.count}
                        </span>
                      </button>
                    );
                  })}

                  <button
                    type="button"
                    onClick={() => setOnlyPendientesFilter((v) => !v)}
                    className={`px-3.5 py-1.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1.5 border ${
                      onlyPendientesFilter
                        ? 'bg-orange-500 text-slate-950 border-orange-400 shadow-md shadow-orange-500/20 font-black'
                        : pendingInspeccionesCount > 0
                          ? 'bg-orange-950/50 border-orange-500/50 text-orange-300 hover:bg-orange-950/80'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-orange-500/40 hover:text-orange-300'
                    }`}
                    title="Mostrar únicamente inspecciones marcadas como pendientes"
                  >
                    <Clock className="w-3.5 h-3.5 shrink-0" />
                    <span>Pendientes ({pendingInspeccionesCount})</span>
                  </button>
                </div>

                {/* Controles de Ordenamiento Universal */}
                <div className="flex flex-wrap items-center gap-2 bg-slate-950/70 border border-slate-800/80 p-2 rounded-2xl">
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-semibold px-1.5">
                    <ArrowUpDown className="w-3.5 h-3.5 text-amber-500" />
                    <span>Orden:</span>
                  </div>
                  <select
                    value={elementSortMode}
                    onChange={(e) => {
                      setElementSortMode(e.target.value);
                      showToast?.('Orden actualizado', 'info');
                    }}
                    className="bg-slate-900 border border-slate-700 hover:border-amber-500/50 text-slate-200 text-xs font-semibold rounded-xl px-3 py-2 focus:outline-none focus:border-amber-500 cursor-pointer min-h-[36px]"
                  >
                    <option value="MANUAL">Orden manual / creación</option>
                    <option value="TYPE_UNIVERSAL">Orden por Tipo (Universal)</option>
                    <option value="id_asc">Por ID (A → Z / 1 → 9)</option>
                    <option value="id_desc">Por ID (Z → A / 9 → 1)</option>
                    <option value="ALPHA_ASC">Alfabético (A → Z)</option>
                    <option value="ALPHA_DESC">Alfabético (Z → A)</option>
                    <option value="PENDING_FIRST">Pendientes primero</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => {
                      setElementSortMode('TYPE_UNIVERSAL');
                      showToast?.('Organizado automáticamente según orden universal de tipos', 'success');
                    }}
                    className="px-3 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 min-h-[36px]"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Organizar automáticamente</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDraftTypeOrder(
                        Array.isArray(universalElementOrder) && universalElementOrder.length > 0
                          ? [...universalElementOrder]
                          : [...DEFAULT_UNIVERSAL_ELEMENT_ORDER]
                      );
                      setShowOrderModal(true);
                    }}
                    className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-amber-500/40 text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 min-h-[36px]"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5 text-amber-400" />
                    <span>Orden de tipos</span>
                  </button>
                </div>
              </div>
            )}

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
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="text-sm font-bold text-slate-100 group-hover:text-amber-500 transition-colors truncate flex-1">
                            {formatElementTitleWithId(item.nombre, item.id, item.codigo)}
                          </h3>
                          {user?.role !== 'CLIENT' && (
                            <button
                              type="button"
                              onClick={(e) => handleTogglePendiente(e, item)}
                              className={`shrink-0 px-2.5 py-1.5 rounded-lg text-[10px] font-bold border transition-all cursor-pointer active:scale-95 flex items-center gap-1 ${
                                isItemPendiente(item)
                                  ? 'bg-orange-500/20 border-orange-500/60 text-orange-300 hover:bg-orange-500/30'
                                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-orange-500/40 hover:text-orange-300'
                              }`}
                              title={isItemPendiente(item) ? 'Quitar marca de pendiente' : 'Marcar como pendiente'}
                            >
                              <Clock className="w-3 h-3" />
                              <span>{isItemPendiente(item) ? 'Pendiente ✓' : 'Marcar pendiente'}</span>
                            </button>
                          )}
                        </div>
                        {isItemPendiente(item) && (
                          <div className="pt-0.5">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-orange-500/20 text-orange-300 border border-orange-500/50">
                              <Clock className="w-3 h-3" /> PENDIENTE
                            </span>
                          </div>
                        )}
                        <div className="space-y-1 mt-3 text-[11px] text-slate-400 border-t border-slate-900/60 pt-3">
                          <p className="truncate"><span className="text-slate-500 font-bold">Ubicación:</span> {resolveElementUbicacionDisplay(item) || 'Sin especificar'}</p>
                          <p className="truncate"><span className="text-slate-500 font-bold">Tensión:</span> {item.nivelTension}</p>
                          <p className="truncate flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-slate-600 shrink-0" /><span className="text-slate-500 font-bold">Fecha:</span> {item.fecha}</p>
                          <p className="truncate flex items-center gap-1.5"><User className="w-3.5 h-3.5 text-slate-600 shrink-0" /><span className="text-slate-500 font-bold">Inspector:</span> {item.inspector}</p>
                        </div>
                      </div>

                      {/* Barra de Avance (Obs 4) */}
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
                          onDelete={user?.role === 'ADMIN' ? () => handleOpenDeleteElementoModal(item, 'INSPECCION') : undefined}
                          userRole={user?.role}
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
                  <h3 className="text-sm font-bold text-slate-400">
                    {inspecciones.length > 0 ? 'Sin resultados para este filtro' : 'No hay inspecciones técnicas'}
                  </h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    {inspecciones.length > 0
                      ? 'Prueba seleccionando otro tipo de inspección o limpia la búsqueda actual.'
                      : 'Crea una ficha de Inspección Técnica (Subestación, Termografía, SPAT o Tanque de Combustible).'}
                  </p>
                </div>
                {(inspeccionTypeFilter !== 'ALL' || onlyPendientesFilter || searchQuery.trim()) && (
                  <button
                    type="button"
                    onClick={() => {
                      setInspeccionTypeFilter('ALL');
                      setOnlyPendientesFilter(false);
                      setSearchQuery('');
                    }}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-bold text-amber-400 rounded-xl transition-all cursor-pointer"
                  >
                    Ver todas las inspecciones
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* CONTENIDO DE PESTAÑA B: DIAGRAMA UNIFILAR */}
        {activeTab === 'UNIFILAR' && (
          <div>
            <div className="mb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-md font-bold text-slate-200">Equipos Registrados en el Diagrama Unifilar</h2>
                <p className="text-xs text-slate-500">Paneles Eléctricos, Puntos de Suministro, Transformadores, Transferencias, Generadores, CCM y Bancos de Condensadores.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowDiagramModal(true)}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-4.5 py-2.5 rounded-xl flex items-center justify-center gap-2 text-xs transition-all shadow-md active:scale-98 cursor-pointer self-start md:self-auto"
              >
                <Zap className="w-4 h-4 fill-slate-950" /> Ver Diagrama Gráfico
              </button>
            </div>

            {/* Barra de Filtros Rápidos por Tipo de Equipo + Pendientes + Ordenamiento Universal */}
            {equiposRegistrados.length > 0 && (
              <div className="space-y-3 mb-6">
                <div className="flex flex-wrap items-center gap-2">
                  {elementoFilterChips.map((chip) => {
                    const isActive = elementoTypeFilter === chip.id;
                    return (
                      <button
                        key={chip.id}
                        type="button"
                        onClick={() => setElementoTypeFilter(chip.id)}
                        className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1.5 border ${
                          isActive
                            ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm font-black'
                            : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-amber-500/40 hover:text-amber-400'
                        }`}
                      >
                        <span>{chip.label}</span>
                        <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono ${
                          isActive ? 'bg-slate-950/20 text-slate-950' : 'bg-slate-900 text-slate-400'
                        }`}>
                          {chip.count}
                        </span>
                      </button>
                    );
                  })}

                  <button
                    type="button"
                    onClick={() => setOnlyPendientesFilter((v) => !v)}
                    className={`px-3.5 py-1.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1.5 border ${
                      onlyPendientesFilter
                        ? 'bg-orange-500 text-slate-950 border-orange-400 shadow-md shadow-orange-500/20 font-black'
                        : pendingElementosCount > 0
                          ? 'bg-orange-950/50 border-orange-500/50 text-orange-300 hover:bg-orange-950/80'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-orange-500/40 hover:text-orange-300'
                    }`}
                    title="Filtrar únicamente elementos marcados como pendientes"
                  >
                    <Clock className="w-3.5 h-3.5 shrink-0" />
                    <span>Pendientes ({pendingElementosCount})</span>
                  </button>
                </div>

                {/* Controles de Ordenamiento Universal (PC y Tablet) */}
                <div className="flex flex-wrap items-center gap-2 bg-slate-950/70 border border-slate-800/80 p-2 rounded-2xl">
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-semibold px-1.5">
                    <ArrowUpDown className="w-3.5 h-3.5 text-amber-500" />
                    <span>Orden:</span>
                  </div>
                  <select
                    value={elementSortMode}
                    onChange={(e) => {
                      setElementSortMode(e.target.value);
                      showToast?.('Orden actualizado', 'info');
                    }}
                    className="bg-slate-900 border border-slate-700 hover:border-amber-500/50 text-slate-200 text-xs font-semibold rounded-xl px-3 py-2 focus:outline-none focus:border-amber-500 cursor-pointer min-h-[36px]"
                  >
                    <option value="MANUAL">Orden manual / creación</option>
                    <option value="TYPE_UNIVERSAL">Orden por Tipo (Universal)</option>
                    <option value="id_asc">Por ID (A → Z / 1 → 9)</option>
                    <option value="id_desc">Por ID (Z → A / 9 → 1)</option>
                    <option value="ALPHA_ASC">Alfabético (A → Z)</option>
                    <option value="ALPHA_DESC">Alfabético (Z → A)</option>
                    <option value="PENDING_FIRST">Pendientes primero</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => {
                      setElementSortMode('TYPE_UNIVERSAL');
                      showToast?.('Elementos organizados automáticamente según el orden universal de tipos', 'success');
                    }}
                    className="px-3 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 min-h-[36px]"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Organizar automáticamente</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDraftTypeOrder(
                        Array.isArray(universalElementOrder) && universalElementOrder.length > 0
                          ? [...universalElementOrder]
                          : [...DEFAULT_UNIVERSAL_ELEMENT_ORDER]
                      );
                      setShowOrderModal(true);
                    }}
                    className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-amber-500/40 text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 min-h-[36px]"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5 text-amber-400" />
                    <span>Orden de tipos</span>
                  </button>
                </div>
              </div>
            )}

            {filteredElementos.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredElementos.map((item, index) => {
                  const isTablero = !item.tipoElemento || item.tipoElemento === 'TABLERO';
                  const isTrafo = item.tipoElemento === 'TRANSFORMADOR';
                  const isGen = item.tipoElemento === 'GENERADOR';
                  const isPuestaTierra = item.tipoElemento === 'PUESTA_TIERRA';
                  const isTransfer = item.tipoElemento === 'TRANSFER';
                  const isPuntoSuministro = item.tipoElemento === 'PUNTO_SUMINISTRO' || item.tipoElemento === 'PUNTO_MEDICION';
                  const isCcm = item.tipoElemento === 'CCM';
                  const isBanco = item.tipoElemento === 'BANCO_CONDENSADOR';
                  const isDragging = draggedItemId === item.id;
                  const displayUbicacion = resolveElementUbicacionDisplay(item);
                  const displayAlimentadoPor = resolveElementParentDisplay(item, todosElementosJerarquia);

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
                      {(() => {
                        const cardPhotoSrc =
                          item.foto ||
                          item.fotoUrl ||
                          item.imagen ||
                          item.datos?.foto ||
                          item.datos?.fotoUrl ||
                          item.datosTecnicos?.foto ||
                          item.datosTecnicos?.fotoUrl ||
                          null;
                        const placeholderFallback = (
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
                        );
                        return (
                          <div className="h-32 w-full bg-slate-900 relative overflow-hidden flex items-center justify-center border-b border-slate-900/50">
                            {item.fotoBlob || cardPhotoSrc ? (
                              <>
                                <SafeImage
                                  blob={item.fotoBlob}
                                  src={cardPhotoSrc}
                                  alt={item.nombre}
                                  className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-500"
                                  fallback={placeholderFallback}
                                />
                                {user?.role !== 'CLIENT' && cardPhotoSrc && (
                                  <button
                                    type="button"
                                    onClick={(e) => handleDeleteCardPhoto(e, item, cardPhotoSrc)}
                                    className="absolute bottom-2 right-2 z-20 p-1.5 bg-red-600/90 hover:bg-red-500 text-white rounded-lg shadow-lg border border-red-400/40 transition-all cursor-pointer active:scale-95"
                                    title="Eliminar fotografía"
                                  >
                                    <X className="w-3.5 h-3.5 stroke-[2.5]" />
                                  </button>
                                )}
                              </>
                            ) : (
                              placeholderFallback
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
                        );
                      })()}

                      {/* Contenido de Tarjeta */}
                      <div className="p-5 flex-1 flex flex-col justify-between">
                        <div className="space-y-1">
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="text-sm font-bold text-slate-100 group-hover:text-amber-500 transition-colors truncate flex-1">
                              {formatElementTitleWithId(item.nombre, item.id, item.codigo)}
                            </h3>
                            {user?.role !== 'CLIENT' && (
                              <button
                                type="button"
                                onClick={(e) => handleTogglePendiente(e, item)}
                                className={`shrink-0 px-2.5 py-1.5 rounded-lg text-[10px] font-bold border transition-all cursor-pointer active:scale-95 flex items-center gap-1 ${
                                  isItemPendiente(item)
                                    ? 'bg-orange-500/20 border-orange-500/60 text-orange-300 hover:bg-orange-500/30'
                                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-orange-500/40 hover:text-orange-300'
                                }`}
                                title={isItemPendiente(item) ? 'Quitar marca de pendiente' : 'Marcar como pendiente'}
                              >
                                <Clock className="w-3 h-3" />
                                <span>{isItemPendiente(item) ? 'Pendiente ✓' : 'Marcar pendiente'}</span>
                              </button>
                            )}
                          </div>
                          {isItemPendiente(item) && (
                            <div className="pt-0.5">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-orange-500/20 text-orange-300 border border-orange-500/50">
                                <Clock className="w-3 h-3" /> PENDIENTE
                              </span>
                            </div>
                          )}
                          {isTablero && (
                            <div className="pt-0.5">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 shadow-sm">
                                ⚡ Potencia Estimada: {calcularPotenciaEstimadaTablero(item).texto}
                              </span>
                            </div>
                          )}
                          
                          <div className="space-y-1.5 mt-3 text-[11px] text-slate-400 border-t border-slate-900/60 pt-3">
                            <p className="truncate"><span className="text-slate-500 font-bold">Ubicación:</span> {displayUbicacion || 'Sin especificar'}</p>
                            <p className="truncate"><span className="text-slate-500 font-bold">Alimentado por:</span> {displayAlimentadoPor || 'No definido'}</p>

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

                        {/* Barra de Avance (Obs 4) */}
                        <div className="mt-4 pt-3 border-t border-slate-900/80">
                          <AvanceProgressBar elemento={item} tipoElemento={item.tipoElemento || 'TABLERO'} />
                        </div>

                        {/* Acciones CRUD Directas en Tarjeta (Obs 2 y 24) */}
                        <div className="mt-3">
                          <ElementoCardActions
                            onEdit={() => {
                              if (item._sourceCollection === 'UNIFILAR') {
                                setEditingElemento(item);
                                setShowElementoModal(true);
                              } else {
                                navigate(`/empresa/${companyId}/tablero/${item.id}`);
                              }
                            }}
                            onNewInspection={() => navigate(`/empresa/${companyId}/tablero/${item.id}`)}
                            onMoveUp={() => {
                              if (item._sourceCollection !== 'UNIFILAR') return;
                              moverElemento(companyId, proyectoId, item.id, 'UP', 'UNIFILAR');
                              showToast?.('Posición del equipo actualizada', 'info');
                            }}
                            onMoveDown={() => {
                              if (item._sourceCollection !== 'UNIFILAR') return;
                              moverElemento(companyId, proyectoId, item.id, 'DOWN', 'UNIFILAR');
                              showToast?.('Posición del equipo actualizada', 'info');
                            }}
                            canMoveUp={item._sourceCollection === 'UNIFILAR' && index > 0}
                            canMoveDown={item._sourceCollection === 'UNIFILAR' && index < filteredElementos.length - 1}
                            onDelete={user?.role === 'ADMIN' ? async () => {
                              if (item._sourceCollection === 'UNIFILAR') {
                                handleOpenDeleteElementoModal(item, 'UNIFILAR');
                                return;
                              }
                              const ok = await confirm({
                                title: 'Eliminar Elemento',
                                message: `¿Está seguro de eliminar "${item.nombre}" permanentemente?`,
                                type: 'danger',
                                confirmText: 'Eliminar'
                              });
                              if (ok) {
                                if (item._sourceCollection === 'CCM') {
                                  deleteCcm(proyectoId, item.id);
                                } else {
                                  deletePuntoMedicion(proyectoId, item.id);
                                }
                                showToast?.('Elemento eliminado correctamente', 'success');
                              }
                            } : undefined}
                            userRole={user?.role}
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
                  <h3 className="text-sm font-bold text-slate-400">
                    {equiposRegistrados.length > 0 ? 'Sin equipos para este filtro' : 'No hay equipos registrados'}
                  </h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    {equiposRegistrados.length > 0
                      ? 'Prueba seleccionando otro tipo de equipo o limpia la búsqueda actual.'
                      : 'Registra un Panel Eléctrico, Punto de Suministro, Transformador, Transferencia, Generador, CCM o Banco de Condensadores en este proyecto.'}
                  </p>
                </div>
                {(elementoTypeFilter !== 'ALL' || onlyPendientesFilter || searchQuery.trim()) && (
                  <button
                    type="button"
                    onClick={() => {
                      setElementoTypeFilter('ALL');
                      setOnlyPendientesFilter(false);
                      setSearchQuery('');
                    }}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-bold text-amber-400 rounded-xl transition-all cursor-pointer"
                  >
                    Ver todos los equipos
                  </button>
                )}
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
          
          <div className="relative w-full max-w-4xl max-h-[92vh] bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col z-10 animate-in zoom-in-95 duration-150">
            {/* CABECERA FIJA */}
            <div className="px-5 py-3.5 border-b border-slate-800/80 shrink-0 flex items-center justify-between bg-slate-950/90 backdrop-blur">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500 border border-amber-500/20">
                  <Zap className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-100 flex items-center gap-2">
                    {editingElemento ? `Editar Equipo: ${editingElemento.nombre}` : 'Registrar Equipo Eléctrico'}
                  </h3>
                  <p className="text-[10px] text-slate-400">
                    Identificación, jerarquía eléctrica, evidencia fotográfica y observaciones
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
                    Tipo de Elemento Eléctrico
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
                    { id: 'BANCO_CONDENSADOR', label: '⚡ BANCO COND.' }
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

              {/* GRID PRINCIPAL DE 2 COLUMNAS FLUIDAS */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* ============================================================== */}
                {/* COLUMNA 1: Identificación, Ubicación y Procedencia */}
                {/* ============================================================== */}
                <div className="space-y-3 bg-slate-900/40 p-3.5 rounded-xl border border-slate-800/80">
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
                        list="preset-ubicaciones-list"
                        value={ubicacion}
                        onChange={(e) => setUbicacion(e.target.value.toUpperCase())}
                        placeholder="Ej. SÓTANO - SALA TÉCNICA PRINCIPAL"
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl text-xs text-slate-100 h-9.5"
                      />
                    </div>

                    {/* Jerarquía Bidireccional Topológica */}
                    {tipoElemento === 'GENERADOR' ? (
                      /* Generador es una fuente primaria autónoma independiente: no requiere alimentador aguas arriba */
                      <div className="p-3 bg-emerald-950/40 border border-emerald-500/30 rounded-xl space-y-1">
                        <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wide flex items-center gap-1.5 font-mono">
                          <Zap className="w-3.5 h-3.5 text-emerald-400" /> Fuente de Energía Primaria Autónoma
                        </span>
                        <p className="text-[11px] text-slate-300 leading-relaxed font-sans">
                          Los motogeneradores operan como fuentes primarias autónomas independientes. No poseen ni requieren alimentación aguas arriba.
                        </p>
                      </div>
                    ) : (
                      /* 1. ALIMENTADO POR (Origen aguas arriba / Padre) */
                      <div>
                        <SelectorAlimentadorJerarquico
                          proyectoId={proyectoId}
                          tableroActualId={editingElemento?.id}
                          elementosList={todosElementosJerarquia}
                          value={alimentadoPor}
                          onChange={(val, primaryObj, ids) => {
                            setAlimentadoPor(val ? val.toUpperCase() : '');
                            setAlimentadoPorId(primaryObj?.id || ids?.[0] || null);
                          }}
                          tipoElementoActual={tipoElemento}
                          direccionRelacion="ALIMENTADO_POR"
                          label="ALIMENTADO POR (Origen Aguas Arriba / Padre)"
                          placeholder="Seleccionar Subestación, Trafo, Generador, CCM o Tablero..."
                        />
                      </div>
                    )}

                    {/* 2. ALIMENTA A (Destinos aguas abajo / Salidas) */}
                    {tipoElemento !== 'TABLERO' && (
                      <div>
                        <SelectorAlimentadorJerarquico
                          proyectoId={proyectoId}
                          tableroActualId={editingElemento?.id}
                          elementosList={todosElementosJerarquia}
                          value={alimentaA}
                          multiple={true}
                          onChange={(val, primaryObj, ids) => {
                            setAlimentaA(val ? val.toUpperCase() : '');
                            setAlimentaAIds(Array.isArray(ids) ? ids : []);
                          }}
                          tipoElementoActual={tipoElemento}
                          direccionRelacion="ALIMENTA_A"
                          label={tipoElemento === 'GENERADOR' ? "ALIMENTA A (Transferencias ATS / Tableros / Cargas de Emergencia)" : "ALIMENTA A (Destinos Aguas Abajo / Salidas)"}
                          placeholder={tipoElemento === 'GENERADOR' ? "Enlazar Transferencias ATS, Tableros de Emergencia o Cargas Suministradas..." : "Enlazar uno o varios equipos secundarios que reciben energía..."}
                        />
                      </div>
                    )}
                  </div>

                </div>

                {/* ============================================================== */}
                {/* COLUMNA 2: Evidencia Fotográfica y Observaciones Técnicas */}
                {/* ============================================================== */}
                <div className="space-y-4 bg-slate-900/40 p-3.5 rounded-xl border border-slate-800/80 flex flex-col">
                  <div className="flex items-center gap-1.5 pb-2 border-b border-slate-800">
                    <Camera className="w-3.5 h-3.5 text-amber-400" />
                    <h4 className="text-[10px] font-bold text-slate-200 uppercase tracking-wider">
                      Evidencia Fotográfica y Observaciones
                    </h4>
                  </div>

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
                      onChange={(e) => setObservacionesGenerales(e.target.value.toUpperCase())}
                      rows={5}
                      placeholder="ESTADO DE MANTENIMIENTO, ACCESIBILIDAD O RECOMENDACIONES..."
                      className="w-full px-2.5 py-2 bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-lg text-xs text-slate-100 focus:outline-none placeholder-slate-600 transition-all resize-y min-h-[120px]"
                    />
                  </div>

                </div>

              </div>

              {/* Datalist de Ubicaciones Estandarizadas */}
              <datalist id="preset-ubicaciones-list">
                {PRESET_UBICACIONES.map(u => <option key={u} value={u} />)}
              </datalist>
            </form>

            {/* PIE DE ACCIONES FIJO (STICKY BOTTOM ACTION BAR) */}
            <div className="px-5 py-3 border-t border-slate-800 bg-slate-950/95 backdrop-blur shrink-0 flex items-center justify-between">
              <div className="text-[11px] text-slate-400 hidden sm:flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                <span>Equipo listo para diagramación unifilar</span>
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
                  {editingElemento ? 'Guardar Cambios' : 'Guardar Equipo'}
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
        elementos={todosElementosJerarquia}
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

      {/* Modal Eliminación Permanente de Elemento / Equipo (solo ADMIN) */}
      {deleteTarget && user?.role === 'ADMIN' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={closeDeleteElementoModal} className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm" />
          <form
            onSubmit={handleConfirmDeleteElemento}
            className="relative w-full max-w-md bg-slate-950 border border-red-900/60 rounded-2xl shadow-2xl p-6 space-y-4"
          >
            <div className="flex items-center gap-2 text-red-400">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <h3 className="text-sm font-bold uppercase tracking-wider">
                {deleteTarget.category === 'INSPECCION' ? 'Eliminación de Inspección' : 'Eliminación de Elemento / Equipo'}
              </h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Esta acción eliminará de forma irreversible {deleteTarget.category === 'INSPECCION' ? 'la inspección' : 'el elemento/tablero'} <strong>{deleteTarget.nombre}</strong> y todos sus datos o circuitos asociados. Ingresa tu contraseña de administrador para confirmar:
            </p>
            <div className="relative">
              <input
                type={showDeletePassword ? 'text' : 'password'}
                autoFocus
                value={deletePassword}
                onChange={(e) => { setDeletePassword(e.target.value); setDeleteError(''); }}
                placeholder="Contraseña de administrador"
                disabled={isDeleting}
                className="w-full pl-3 pr-10 py-2 bg-slate-900 border border-slate-700 focus:border-red-500 rounded-lg text-xs text-slate-100 focus:outline-none h-9"
              />
              <button
                type="button"
                onClick={() => setShowDeletePassword((v) => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-400 p-1 cursor-pointer"
                title={showDeletePassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                tabIndex={-1}
              >
                {showDeletePassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
            {deleteError && (
              <p className="text-[11px] text-rose-400 font-medium">{deleteError}</p>
            )}
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={closeDeleteElementoModal}
                disabled={isDeleting}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-xs font-bold rounded-lg text-slate-300 cursor-pointer h-9 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isDeleting}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg text-xs h-9 flex items-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {isDeleting ? (<><Loader2 className="w-3.5 h-3.5 animate-spin" /><span>Eliminando...</span></>) : 'Eliminar Definitivamente'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal Configurador de Orden Universal por Tipo de Elemento (PC y Tablet) */}
      {showOrderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
          <div onClick={() => setShowOrderModal(false)} className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" />
          <div className="relative w-full max-w-xl max-h-[90vh] flex flex-col bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm sm:text-base font-black text-slate-100 flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-amber-500" />
                  Orden Universal por Tipo de Elemento
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Define la prioridad de visualización para todos los proyectos. Dentro de cada tipo se ordenan alfabéticamente.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowOrderModal(false)}
                className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 sm:p-4 overflow-y-auto space-y-2 flex-1">
              {draftTypeOrder.map((typeKey, idx) => {
                const meta = ELEMENT_TYPE_META[typeKey] || { label: typeKey.replace(/_/g, ' '), emoji: '📦' };
                const moveItem = (fromIdx, toIdx) => {
                  if (toIdx < 0 || toIdx >= draftTypeOrder.length || fromIdx === toIdx) return;
                  const next = [...draftTypeOrder];
                  const [moved] = next.splice(fromIdx, 1);
                  next.splice(toIdx, 0, moved);
                  setDraftTypeOrder(next);
                };
                return (
                  <div
                    key={typeKey}
                    className="flex items-center justify-between gap-2 p-2.5 sm:p-3 bg-slate-900/90 border border-slate-800 rounded-xl"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-6 h-6 rounded-lg bg-slate-950 border border-slate-700 text-[11px] font-mono font-bold text-amber-400 flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <span className="text-base shrink-0">{meta.emoji}</span>
                      <span className="text-xs sm:text-sm font-bold text-slate-200 truncate">{meta.label}</span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => moveItem(idx, 0)}
                        className="px-2.5 py-2 rounded-lg bg-slate-950 hover:bg-amber-500/20 border border-slate-700 hover:border-amber-500/50 text-[10px] sm:text-[11px] font-bold text-amber-300 disabled:opacity-25 cursor-pointer disabled:cursor-not-allowed min-h-[36px]"
                        title="Poner este tipo primero"
                      >
                        Poner primero
                      </button>
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => moveItem(idx, idx - 1)}
                        className="p-2 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-700 text-slate-200 disabled:opacity-25 cursor-pointer disabled:cursor-not-allowed min-h-[36px] min-w-[36px] flex items-center justify-center"
                        title="Subir"
                      >
                        <ArrowUp className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === draftTypeOrder.length - 1}
                        onClick={() => moveItem(idx, idx + 1)}
                        className="p-2 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-700 text-slate-200 disabled:opacity-25 cursor-pointer disabled:cursor-not-allowed min-h-[36px] min-w-[36px] flex items-center justify-center"
                        title="Bajar"
                      >
                        <ArrowDown className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="p-3 sm:p-4 border-t border-slate-800 bg-slate-950 flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => {
                  resetUniversalElementOrder();
                  setDraftTypeOrder([...DEFAULT_UNIVERSAL_ELEMENT_ORDER]);
                  showToast?.('Orden predeterminado restablecido', 'info');
                }}
                className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-bold text-slate-300 flex items-center gap-1.5 cursor-pointer min-h-[40px]"
              >
                <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                <span>Restablecer orden predeterminado</span>
              </button>
              <div className="flex items-center gap-2 ml-auto">
                <button
                  type="button"
                  onClick={() => setShowOrderModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-bold text-slate-300 cursor-pointer min-h-[40px]"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setUniversalElementOrder(draftTypeOrder);
                    setElementSortMode('TYPE_UNIVERSAL');
                    setShowOrderModal(false);
                    showToast?.('Orden universal por tipo guardado y aplicado', 'success');
                  }}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black cursor-pointer shadow-md min-h-[40px]"
                >
                  Guardar y Aplicar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default ProyectoView;
