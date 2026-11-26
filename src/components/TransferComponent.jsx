import React, { useState, useEffect, useMemo } from 'react';
import { 
  RefreshCw, 
  Zap, 
  Shield, 
  Layers, 
  Activity, 
  Gauge, 
  Camera, 
  Printer, 
  Save, 
  Edit3, 
  Check, 
  AlertTriangle, 
  Sliders, 
  Cpu, 
  ArrowRightLeft,
  CheckCircle2,
  Clock,
  Settings,
  Info,
  RotateCcw,
  X,
  Link2,
  Plus,
  Eye
} from 'lucide-react';
import useStore, {
  getElementCode,
  getSimpleElementCode,
  cleanElementName,
  resolveElementAlimentaADisplay,
  isPlaceholderHierarchyValue
} from '../store/useStore';
import { useConfirm } from '../context/ConfirmContext';
import SelectorAlimentadorJerarquico from './SelectorAlimentadorJerarquico';
import ModalEditarIdElemento from './ModalEditarIdElemento';
import ElementQuickPreviewModal from './ElementQuickPreviewModal';
import MetrologiaElectricaSection from './MetrologiaElectricaSection';
import DualPhotoUploader from './DualPhotoUploader';
import { 
  TENSIONES_COVENIN_159_BT, 
  TENSIONES_COVENIN_TODAS, 
  FRECUENCIAS_NORMALIZADAS, 
  POLOS_TRANSFERENCIA 
} from '../utils/constants';
import TensionNominalInput from './TensionNominalInput';

export default function TransferComponent({ 
  transferData, 
  elementoData, 
  onUpdate, 
  readOnly = false 
}) {
  const data = transferData || elementoData;
  const { alert: customAlert, confirm: customConfirm } = useConfirm();
  const user = useStore((state) => state.user);
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'admin';
  const [isEditIdModalOpen, setIsEditIdModalOpen] = useState(false);
  const companies = useStore((state) => state.companies || []);

  const [isEditing, setIsEditing] = useState(false);
  const { addElementoUnifilar, showToast } = useStore();

  // Estados para creación rápida en línea de fuentes
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);
  const [quickCreateTargetField, setQuickCreateTargetField] = useState('fuenteNormal'); // 'fuenteNormal' | 'fuenteEmergencia'
  const [newSourceTipo, setNewSourceTipo] = useState('TRANSFORMADOR');
  const [newSourceNombre, setNewSourceNombre] = useState('');
  const [newSourceUbicacion, setNewSourceUbicacion] = useState('Sala Eléctrica');
  const [newSourceCapacidad, setNewSourceCapacidad] = useState('');
  const [newSourceTension, setNewSourceTension] = useState('208/120 V');

  // Modo selector dual para Fuente Emergencia: 'EXISTENTE' o 'NUEVO'
  const [modoFuenteEmergencia, setModoFuenteEmergencia] = useState('EXISTENTE');

  // Estado para creación rápida de equipo alimentado aguas abajo (Sección 5)
  const [salidaQuickOpen, setSalidaQuickOpen] = useState(false);
  const [newSalidaTipo, setNewSalidaTipo] = useState('TABLERO');
  const [newSalidaNombre, setNewSalidaNombre] = useState('');
  const [previewElement, setPreviewElement] = useState(null);

  // Estados locales editables - Sin datos demo quemados
  const [nombre, setNombre] = useState(data?.nombre || '');
  const [ubicacion, setUbicacion] = useState(data?.ubicacion || '');
  const [observaciones, setObservaciones] = useState(
    data?.observacionesGenerales || data?.datosTecnicos?.observacionTransferencia || ''
  );

  // Datos Técnicos JSON
  const [dt, setDt] = useState(data?.datosTecnicos || {});

  // Foto
  const [fotoBlob, setFotoBlob] = useState(data?.fotoBlob || null);
  const [fotoSrc, setFotoSrc] = useState(data?.foto || null);
  const [previewUrl, setPreviewUrl] = useState(null);

  // Sincronizar si cambian los props
  useEffect(() => {
    if (data) {
      setNombre(data.nombre || '');
      setUbicacion(data.ubicacion || '');
      setObservaciones(data.observacionesGenerales || data.datosTecnicos?.observacionTransferencia || '');
      setDt(data.datosTecnicos || {});
      setFotoBlob(data.fotoBlob || null);
      setFotoSrc(data.foto || null);
    }
  }, [data]);

  // Lista de elementos de jerarquía del proyecto para alimentar los selectores (filtrado estrictamente por el proyecto activo)
  const projectElements = useMemo(() => {
    const list = [];
    const currentProjId = data?.proyectoId || data?.projectId;
    const compId = data?.empresaId || data?.companyId;

    const extractFromProject = (p) => {
      if (!p) return;
      if (Array.isArray(p.elementosUnifilares)) list.push(...p.elementosUnifilares);
      if (Array.isArray(p.tableros)) list.push(...p.tableros);
      if (Array.isArray(p.subestaciones)) list.push(...p.subestaciones);
      if (Array.isArray(p.inspeccionesSubestacion)) list.push(...p.inspeccionesSubestacion);
      if (Array.isArray(p.puntosMedicion)) list.push(...p.puntosMedicion);
      if (Array.isArray(p.ccmList)) list.push(...p.ccmList);
    };

    if (currentProjId) {
      // Búsqueda estricta por proyecto activo
      for (const c of companies) {
        if (c.proyectos) {
          const targetP = c.proyectos.find(p => String(p.id) === String(currentProjId));
          if (targetP) {
            extractFromProject(targetP);
            break;
          }
        }
      }
    } else if (compId) {
      const company = companies.find(c => String(c.id) === String(compId));
      if (company && Array.isArray(company.elementosUnifilares)) {
        list.push(...company.elementosUnifilares);
      }
    }

    // Deduplicar por ID y excluir al propio elemento transfer
    const seen = new Set();
    return list.filter(e => {
      if (!e || !e.id || String(e.id) === String(data?.id) || seen.has(e.id)) return false;
      seen.add(e.id);
      return true;
    });
  }, [companies, data]);

  // Resolución automática y bidireccional de jerarquía (Aguas arriba y Aguas abajo)
  const autoHierarchy = useMemo(() => {
    const empty = {
      fuenteNormalResolved: null,
      fuenteEmergenciaResolved: null,
      upstreamBadges: [],
      alimentaAResolved: { ids: [], items: [], names: [], text: '' },
      downstreamBadges: []
    };
    if (!data) return empty;

    const findMatch = (rawId, rawName) => {
      if (rawId) {
        const byId = projectElements.find((e) => String(e.id) === String(rawId));
        if (byId) return byId;
      }
      if (rawName && !isPlaceholderHierarchyValue(rawName)) {
        const cleanTarget = cleanElementName(String(rawName)).toUpperCase().trim();
        if (cleanTarget && cleanTarget !== 'CORPOELEC') {
          return projectElements.find(
            (e) =>
              cleanElementName(e.nombre, e.id, e.codigo || e.simpleCode).toUpperCase().trim() === cleanTarget ||
              String(e.codigo || '').toUpperCase().trim() === cleanTarget
          ) || null;
        }
      }
      return null;
    };

    const elementCallsSelf = (candidate) => {
      if (!candidate || !candidate.id || !data?.id) return false;
      const cDt = candidate.datosTecnicos || {};
      const cAlimentaIds = [
        ...(Array.isArray(candidate.alimentaAIds) ? candidate.alimentaAIds : []),
        ...(Array.isArray(cDt.alimentaAIds) ? cDt.alimentaAIds : [])
      ].map(String);
      if (cAlimentaIds.includes(String(data.id))) return true;
      const circuits = Array.isArray(cDt.circuits) ? cDt.circuits : (Array.isArray(candidate.circuits) ? candidate.circuits : []);
      return circuits.some((c) => {
        const rawDest = c?.elementoDestinoId || c?.vinculadoId || '';
        return rawDest && String(rawDest).split(',').map((s) => s.trim()).includes(String(data.id));
      });
    };

    const rawNormText = dt.fuenteNormalNombre || dt.alimentacionGenerador1 || dt.alimentacionCorpoelec || '';
    const rawEmergText = dt.fuenteEmergenciaNombre || dt.alimentacionGenerador2 || dt.alimentacionTransfDomosa || '';

    const toBadge = (rawId, rawName) => {
      if (!rawId && isPlaceholderHierarchyValue(rawName)) return null;
      const cleanRaw = !isPlaceholderHierarchyValue(rawName) ? cleanElementName(String(rawName)).toUpperCase().trim() : '';
      if (cleanRaw === 'CORPOELEC' && !rawId) {
        return { id: null, nombre: 'CORPOELEC', code: 'RED', isCorpoelec: true };
      }
      const el = findMatch(rawId, rawName);
      if (el) {
        return {
          id: el.id,
          nombre: cleanElementName(el.nombre, el.id, el.codigo || el.simpleCode).toUpperCase().trim(),
          code: getSimpleElementCode(el, el.tipoElemento || 'TABLERO'),
          isCorpoelec: false
        };
      }
      if (cleanRaw) {
        return { id: rawId || null, nombre: cleanRaw, code: null, isCorpoelec: false };
      }
      return null;
    };

    let fuenteNormalResolved = toBadge(dt.fuenteNormalId, rawNormText);
    let fuenteEmergenciaResolved = toBadge(dt.fuenteEmergenciaId, rawEmergText);

    // Inferencia automática desde elementos aguas arriba que llaman a esta Transferencia en su ALIMENTA A / circuitos
    const reverseParents = projectElements.filter(elementCallsSelf);
    if (!fuenteEmergenciaResolved) {
      const genParent = reverseParents.find((p) => String(p.tipoElemento || p.tipo || '').toUpperCase() === 'GENERADOR');
      if (genParent) {
        fuenteEmergenciaResolved = toBadge(genParent.id, genParent.nombre);
      } else if (data.alimentadoPorId) {
        const directParent = projectElements.find((p) => String(p.id) === String(data.alimentadoPorId));
        if (directParent && String(directParent.tipoElemento || '').toUpperCase() === 'GENERADOR') {
          fuenteEmergenciaResolved = toBadge(directParent.id, directParent.nombre);
        }
      }
    }

    if (!fuenteNormalResolved) {
      const normParent = reverseParents.find((p) => String(p.tipoElemento || p.tipo || '').toUpperCase() !== 'GENERADOR');
      if (normParent) {
        fuenteNormalResolved = toBadge(normParent.id, normParent.nombre);
      } else if (data.alimentadoPorId) {
        const directParent = projectElements.find((p) => String(p.id) === String(data.alimentadoPorId));
        if (directParent && String(directParent.tipoElemento || '').toUpperCase() !== 'GENERADOR') {
          fuenteNormalResolved = toBadge(directParent.id, directParent.nombre);
        }
      }
    }

    const upstreamBadges = [fuenteNormalResolved, fuenteEmergenciaResolved].filter(Boolean);

    const syntheticSelf = { ...data, nombre, datosTecnicos: dt };
    const alimentaAResolved = resolveElementAlimentaADisplay(syntheticSelf, [syntheticSelf, ...projectElements]);
    const downstreamBadges = alimentaAResolved.names.map((nm) => {
      const matched = alimentaAResolved.items.find(
        (it) => cleanElementName(it.nombre, it.id, it.codigo || it.simpleCode).toUpperCase().trim() === nm
      );
      return {
        id: matched?.id || null,
        nombre: nm,
        code: matched ? getSimpleElementCode(matched, matched.tipoElemento || 'TABLERO') : null
      };
    });

    return {
      fuenteNormalResolved,
      fuenteEmergenciaResolved,
      upstreamBadges,
      alimentaAResolved,
      downstreamBadges
    };
  }, [data, dt, nombre, projectElements]);

  const sheetRef = React.useRef(null);
  const hasPhotoAttached = Boolean(fotoBlob || fotoSrc || previewUrl);

  const printOptimization = useMemo(() => {
    const baseZoom = hasPhotoAttached ? 0.86 : 0.94;
    const density = hasPhotoAttached ? 'compact' : 'comfortable';
    return { zoom: baseZoom, density };
  }, [hasPhotoAttached]);

  useEffect(() => {
    const handleBeforePrint = () => {
      const el = sheetRef.current;
      if (!el) return;
      el.style.setProperty('--tablero-print-zoom', String(printOptimization.zoom));
      const printableHeightPx = 940;
      const naturalHeight = el.scrollHeight;
      if (naturalHeight > 0 && naturalHeight * printOptimization.zoom > printableHeightPx) {
        const fittedZoom = Math.max(0.62, Math.min(printOptimization.zoom, Number((printableHeightPx / naturalHeight).toFixed(3))));
        el.style.setProperty('--tablero-print-zoom', String(fittedZoom));
      }
    };
    window.addEventListener('beforeprint', handleBeforePrint);
    return () => window.removeEventListener('beforeprint', handleBeforePrint);
  }, [printOptimization.zoom]);

  // Fallback si no hay datos
  if (!data) {
    return (
      <div className="text-center p-12 text-slate-400 font-sans">
        <RefreshCw className="w-12 h-12 text-slate-600 mx-auto mb-3 animate-spin" />
        <p className="text-sm">No se han encontrado datos para esta unidad de Transferencia.</p>
      </div>
    );
  }

  const handleDtChange = (key, value) => {
    if (readOnly) return;
    setDt(prev => ({ ...prev, [key]: value }));
  };

  const resolveMatchByIdOrName = (rawId, rawName) => {
    if (!rawId && isPlaceholderHierarchyValue(rawName)) return { id: null, nombre: '' };
    const cleanName = !isPlaceholderHierarchyValue(rawName)
      ? cleanElementName(String(rawName)).toUpperCase().trim()
      : '';
    if (cleanName === 'CORPOELEC') return { id: null, nombre: 'CORPOELEC' };
    if (rawId) {
      const foundById = projectElements.find((e) => String(e.id) === String(rawId));
      if (foundById) {
        return {
          id: foundById.id,
          nombre: cleanElementName(foundById.nombre, foundById.id, foundById.codigo || foundById.simpleCode).toUpperCase().trim()
        };
      }
      return { id: rawId, nombre: cleanName };
    }
    if (cleanName) {
      const foundByName = projectElements.find(
        (e) =>
          cleanElementName(e.nombre, e.id, e.codigo || e.simpleCode).toUpperCase().trim() === cleanName ||
          String(e.codigo || '').toUpperCase().trim() === cleanName
      );
      if (foundByName) {
        return {
          id: foundByName.id,
          nombre: cleanElementName(foundByName.nombre, foundByName.id, foundByName.codigo || foundByName.simpleCode).toUpperCase().trim()
        };
      }
    }
    return { id: null, nombre: cleanName };
  };

  // Handler para guardar nueva fuente rápida (con enlace bidireccional automático hacia esta Transferencia)
  const handleCreateQuickSource = async (e, customTipo, customNombre, customCapacidad) => {
    if (e && e.preventDefault) e.preventDefault();
    const tipo = customTipo || newSourceTipo;
    const nombreFuente = (customNombre || newSourceNombre).trim();
    const capacidad = (customCapacidad || newSourceCapacidad).trim();
    if (!nombreFuente) {
      showToast('Por favor introduce un nombre para la fuente.', 'error');
      return;
    }

    const targetProjId = data.proyectoId || data.projectId || (companies.find(c => c.id === (data.empresaId || data.companyId))?.proyectos?.[0]?.id);
    const transferNombreUpper = String(nombre || data.nombre || 'TRANSFERENCIA').toUpperCase().trim();

    const payload = {
      nombre: nombreFuente,
      tipoElemento: tipo,
      ubicacion: newSourceUbicacion.trim() || 'Sala Eléctrica / Caseta de Generación',
      alimentaA: transferNombreUpper,
      alimentaAIds: data?.id ? [data.id] : [],
      datosTecnicos: {
        kva: capacidad,
        potenciaKva: capacidad,
        amperaje: capacidad,
        tensionNominal: newSourceTension || dt.tensionNominal || '208/120 V',
        voltajeGeneracion: newSourceTension || dt.tensionNominal || '208/120 V',
        frecuencia: '60 Hz',
        hz: '60 Hz',
        rpm: '1800 RPM',
        velocidadRpm: '1800 RPM',
        combustible: 'DIESEL',
        alimentaA: transferNombreUpper,
        alimentaAIds: data?.id ? [data.id] : []
      }
    };

    const res = await addElementoUnifilar(targetProjId, payload);
    if (res && res.success) {
      const createdElem = res.elemento;
      const createdName = (createdElem.nombre || nombreFuente).toUpperCase().trim();

      if (quickCreateTargetField === 'fuenteNormal') {
        setDt(prev => ({ ...prev, fuenteNormalNombre: createdName, fuenteNormalId: createdElem.id }));
      } else {
        setDt(prev => ({ ...prev, fuenteEmergenciaNombre: createdName, fuenteEmergenciaId: createdElem.id }));
        setModoFuenteEmergencia('EXISTENTE');
      }

      showToast(`Fuente "${createdName}" creada y enlazada automáticamente.`, 'success');
      setQuickCreateOpen(false);
    } else {
      showToast(res?.error || 'Error al crear la fuente.', 'error');
    }
  };

  // Handler para creación rápida de equipo alimentado aguas abajo desde Sección 5
  const handleCreateQuickSalida = async () => {
    const targetProjId = data.proyectoId || data.projectId || (companies.find(c => c.id === (data.empresaId || data.companyId))?.proyectos?.[0]?.id);
    const defaultLabel = newSalidaTipo === 'CCM'
      ? `CCM Derivado ${projectElements.filter(el => el.tipoElemento === 'CCM').length + 1}`
      : newSalidaTipo === 'TRANSFER'
      ? `Transferencia Secundaria ${projectElements.filter(el => el.tipoElemento === 'TRANSFER').length + 1}`
      : `Sub-Tablero Derivado ${projectElements.filter(el => el.tipoElemento === 'TABLERO').length + 1}`;
    const finalName = (newSalidaNombre || defaultLabel).trim();
    const transferNombreUpper = String(nombre || data.nombre || 'TRANSFERENCIA (ATS/MTS)').toUpperCase().trim();

    const payload = {
      nombre: finalName,
      tipoElemento: newSalidaTipo,
      ubicacion: ubicacion || 'Área de Cargas',
      alimentadoPor: transferNombreUpper,
      alimentadoPorId: data.id,
      datosTecnicos: {
        alimentadoPorId: data.id,
        amperaje: dt.amperaje || '225',
        tensionNominal: dt.tensionNominal || '208Y/120 V'
      }
    };

    const res = await addElementoUnifilar(targetProjId, payload);
    if (res && res.success) {
      const createdElem = res.elemento;
      const createdName = (createdElem?.nombre || finalName).toUpperCase().trim();
      setDt((prev) => {
        const prevIds = Array.isArray(prev.alimentaAIds) ? prev.alimentaAIds.filter(Boolean) : [];
        const nextIds = Array.from(new Set([...prevIds, createdElem.id].filter(Boolean)));
        const prevNames = String(prev.salidaCargaNombre || prev.alimentaA || '')
          .split(',')
          .map((s) => s.trim())
          .filter((s) => !isPlaceholderHierarchyValue(s));
        const nextNames = Array.from(new Set([...prevNames, createdName]));
        const nextText = nextNames.join(', ');
        return {
          ...prev,
          salidaCargaNombre: nextText,
          salidaCargaId: nextIds[0] || createdElem.id,
          alimentaA: nextText,
          alimentaAIds: nextIds
        };
      });
      setSalidaQuickOpen(false);
      setNewSalidaNombre('');
      showToast(`Elemento "${createdName}" creado y enlazado automáticamente.`, 'success');
    } else {
      showToast(res?.error || 'Error al crear el equipo de salida.', 'error');
    }
  };

  const handleStartEditing = () => {
    if (readOnly) return;
    setDt((prev) => {
      const next = { ...(prev || {}) };
      if (isPlaceholderHierarchyValue(next.fuenteNormalNombre) && autoHierarchy.fuenteNormalResolved) {
        next.fuenteNormalNombre = autoHierarchy.fuenteNormalResolved.nombre;
        next.fuenteNormalId = autoHierarchy.fuenteNormalResolved.id || null;
      }
      if (isPlaceholderHierarchyValue(next.fuenteEmergenciaNombre) && autoHierarchy.fuenteEmergenciaResolved) {
        next.fuenteEmergenciaNombre = autoHierarchy.fuenteEmergenciaResolved.nombre;
        next.fuenteEmergenciaId = autoHierarchy.fuenteEmergenciaResolved.id || null;
      }
      if (isPlaceholderHierarchyValue(next.salidaCargaNombre) && autoHierarchy.alimentaAResolved?.text) {
        next.salidaCargaNombre = autoHierarchy.alimentaAResolved.text;
        next.salidaCargaId = autoHierarchy.alimentaAResolved.ids?.[0] || null;
        next.alimentaA = autoHierarchy.alimentaAResolved.text;
        next.alimentaAIds = autoHierarchy.alimentaAResolved.ids || [];
      }
      return next;
    });
    setIsEditing(true);
  };

  const handleSave = () => {
    if (readOnly) return;
    const norm = resolveMatchByIdOrName(
      dt.fuenteNormalId,
      dt.fuenteNormalNombre || dt.alimentacionGenerador1 || dt.alimentacionCorpoelec
    );
    const emerg = resolveMatchByIdOrName(
      dt.fuenteEmergenciaId,
      dt.fuenteEmergenciaNombre || dt.alimentacionGenerador2 || dt.alimentacionTransfDomosa
    );

    const resolvedAlimentadoPorIds = Array.from(new Set([norm.id, emerg.id].filter(Boolean)));
    const resolvedAlimentadoPor = [norm.nombre, emerg.nombre].filter(Boolean).join(' / ');
    const resolvedAlimentadoPorId = norm.id || emerg.id || null;

    const rawSalidaText = dt.salidaCargaNombre || dt.alimentaA || dt.carga || '';
    const explicitSalidaIds = Array.isArray(dt.alimentaAIds)
      ? dt.alimentaAIds.filter(Boolean)
      : (dt.salidaCargaId ? [dt.salidaCargaId] : []);
    const matchedIdsFromText = [];
    if (explicitSalidaIds.length === 0 && !isPlaceholderHierarchyValue(rawSalidaText)) {
      String(rawSalidaText)
        .split(/[,;\n]/)
        .map((t) => t.trim())
        .filter(Boolean)
        .forEach((tok) => {
          const m = resolveMatchByIdOrName(null, tok);
          if (m.id) matchedIdsFromText.push(m.id);
        });
    }
    const finalAlimentaIds = Array.from(new Set([...explicitSalidaIds, ...matchedIdsFromText].filter(Boolean)));
    const finalAlimentaText = !isPlaceholderHierarchyValue(rawSalidaText)
      ? String(rawSalidaText).split(/[,;\n]/).map((s) => s.trim().toUpperCase()).filter(Boolean).join(', ')
      : '';
    const finalSalidaId = finalAlimentaIds[0] || null;

    if (onUpdate) {
      onUpdate({
        ...data,
        nombre,
        ubicacion,
        alimentadoPor: resolvedAlimentadoPor,
        alimentadoPorId: resolvedAlimentadoPorId,
        alimentaA: finalAlimentaText,
        alimentaAIds: finalAlimentaIds,
        observacionesGenerales: observaciones,
        fotoBlob,
        foto: fotoSrc,
        datosTecnicos: {
          ...dt,
          fuenteNormalId: norm.id || null,
          fuenteNormalNombre: norm.nombre,
          fuenteEmergenciaId: emerg.id || null,
          fuenteEmergenciaNombre: emerg.nombre,
          alimentadoPorId: resolvedAlimentadoPorId,
          alimentadoPorIds: resolvedAlimentadoPorIds,
          salidaCargaId: finalSalidaId,
          salidaCargaNombre: finalAlimentaText,
          alimentaA: finalAlimentaText,
          alimentaAIds: finalAlimentaIds,
          observacionTransferencia: observaciones
        }
      });
    }
    setIsEditing(false);
  };

  const handleLimpiarFormulario = async () => {
    if (readOnly) return;
    const confirmed = await customConfirm("¿Deseas reiniciar todos los campos de esta transferencia a valores en blanco?");
    if (!confirmed) return;

    setNombre('');
    setUbicacion('');
    setObservaciones('');
    setDt({});
    setFotoBlob(null);
    setFotoSrc(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
  };

  // Valores de configuración operativa
  const modoOperativo = dt.modoOperativo || dt.tipoTransferenciaOperativa || (dt.tipoTransferencia?.toUpperCase().includes('MANUAL') || dt.tipoTransferencia?.toUpperCase().includes('MTS') ? 'MTS' : 'ATS');
  const estadoServicio = dt.estadoServicio || 'En Servicio'; // 'En Servicio' | 'Fuera de Servicio'
  const tipoTransicion = dt.tipoTransicion || 'ABIERTA'; // 'ABIERTA' | 'CERRADA' | 'RETARDADA'
  const polos = dt.polos || '4P';
  const frecuencia = dt.frecuencia || '60 Hz';

  // Valores de Fuente Normal (Fuente A) - con respaldo automático en modo lectura
  const rawFuenteNormal = dt.fuenteNormalNombre || dt.alimentacionGenerador1 || dt.alimentacionCorpoelec || '';
  const fuenteNormalNombre = !isPlaceholderHierarchyValue(rawFuenteNormal)
    ? rawFuenteNormal
    : (!isEditing ? (autoHierarchy.fuenteNormalResolved?.nombre || '') : '');
  const fuenteNormalTension = dt.fuenteNormalTension || '';
  const fuenteNormalAmperaje = dt.fuenteNormalAmperaje || dt.amperaje || '';
  const fuenteNormalConductor = dt.fuenteNormalConductor || dt.conductorFuenteNormal || '';

  // Valores de Fuente Emergencia (Fuente B) - con respaldo automático en modo lectura
  const rawFuenteEmergencia = dt.fuenteEmergenciaNombre || dt.alimentacionGenerador2 || dt.alimentacionTransfDomosa || '';
  const fuenteEmergenciaNombre = !isPlaceholderHierarchyValue(rawFuenteEmergencia)
    ? rawFuenteEmergencia
    : (!isEditing ? (autoHierarchy.fuenteEmergenciaResolved?.nombre || '') : '');
  const fuenteEmergenciaTension = dt.fuenteEmergenciaTension || '';
  const fuenteEmergenciaAmperaje = dt.fuenteEmergenciaAmperaje || dt.amperaje || '';
  const fuenteEmergenciaConductor = dt.fuenteEmergenciaConductor || dt.conductorFuenteEmergencia || '';

  // Salida a Carga y Acometida de Carga (con respaldo bidireccional automático)
  const rawSalidaCarga = dt.salidaCargaNombre || dt.alimentaA || dt.carga || '';
  const salidaCargaNombre = !isPlaceholderHierarchyValue(rawSalidaCarga)
    ? rawSalidaCarga
    : (!isEditing ? (autoHierarchy.alimentaAResolved?.text || '') : '');
  const acometidaCargaConductor = dt.acometidaCarga || dt.acometidaCargaConductor || dt.neutroConductor || dt.neutro || '';
  const tierraConductor = dt.tierraConductor || dt.tierra || '';

  return (
    <div
      ref={sheetRef}
      data-print-density={printOptimization.density}
      style={{ '--tablero-print-zoom': printOptimization.zoom }}
      className={`tablero-print-sheet tablero-element-sheet max-w-6xl print:max-w-none print:w-full mx-auto space-y-6 print:space-y-1.5 animate-fade-in font-sans pb-16 print:pb-0 print-card print:p-0 print:m-0 ${readOnly ? 'pointer-events-none opacity-95' : ''}`}
    >
      
      {/* ========================================================================= */}
      {/* 1. BARRA DE HERRAMIENTAS Y ACCIONES SUPERIORES (NO PRINT) */}
      {/* ========================================================================= */}
      <div className="flex flex-wrap items-center justify-between gap-4 no-print bg-slate-950/80 backdrop-blur-md p-4 rounded-2xl border border-slate-800 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/30 rounded-xl">
            <RefreshCw className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20">
                🔄 TRANSFERENCIA (ATS/MTS)
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-900 border border-slate-700 text-slate-300 uppercase">
                {modoOperativo === 'ATS' ? 'Modo: Automático (ATS)' : 'Modo: Manual (MTS)'}
              </span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${estadoServicio === 'En Servicio' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-red-950 text-red-400 border border-red-800'}`}>
                {estadoServicio}
              </span>
              <div className="flex items-center gap-1">
                <span className="font-mono text-xs font-bold text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded border border-amber-500/30">
                  ID: {getElementCode(data, 'TRANSFER')}
                </span>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => setIsEditIdModalOpen(true)}
                    className="p-1 bg-slate-900 hover:bg-amber-500 text-slate-400 hover:text-slate-950 border border-slate-700/80 hover:border-amber-400 rounded-md transition-all shadow-sm cursor-pointer"
                    title="Editar ID del elemento (Solo Administradores)"
                  >
                    <Edit3 className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
            <h1 className="text-lg font-black text-slate-100 mt-0.5">
              {nombre || 'Unidad de Transferencia'}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => window.print()}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 rounded-xl transition-all cursor-pointer flex items-center gap-2 text-xs font-bold shadow-sm"
            title="Guardar como PDF o Imprimir Ficha"
          >
            <Printer className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline">Guardar PDF</span>
          </button>

          {!readOnly && (
            <>
              {isEditing && (
                <button
                  type="button"
                  onClick={handleLimpiarFormulario}
                  className="px-3.5 py-2 bg-slate-900 hover:bg-red-950/60 text-slate-400 hover:text-red-400 border border-slate-800 hover:border-red-800 rounded-xl transition-all font-bold text-xs cursor-pointer flex items-center gap-1.5"
                  title="Reiniciar todos los campos a blanco"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Limpiar Formulario</span>
                </button>
              )}

              {isEditing ? (
                <button
                  onClick={handleSave}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl transition-all font-black text-xs cursor-pointer flex items-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95"
                >
                  <Save className="w-4 h-4" /> Guardar Cambios
                </button>
              ) : (
                <button
                  onClick={handleStartEditing}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl transition-all font-black text-xs cursor-pointer flex items-center gap-2 shadow-lg shadow-amber-500/20 active:scale-95"
                >
                  <Edit3 className="w-4 h-4" /> Editar Transferencia
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. CUADRO PRINCIPAL CON TARJETA SUPERIOR DERECHA DE DOBLE FUENTE */}
      {/* ========================================================================= */}
      <div className="tablero-main-table bg-slate-950 border-2 border-slate-800 rounded-2xl print:rounded overflow-hidden shadow-2xl print:shadow-none print:border-slate-900 print:bg-white print:text-slate-950">
        
        {/* Cabecera Principal */}
        <div className="tablero-header-bar bg-gradient-to-r from-slate-900 via-slate-900 to-slate-850 border-b-2 border-slate-800 p-4 print:p-2 print:border-slate-900">
          <div className="flex flex-col md:flex-row print:flex-row md:items-center print:items-center justify-between gap-3 print:gap-2">
            <div>
              <span className="text-[10px] print:text-[8.5px] font-mono font-bold tracking-widest text-amber-400 print:text-slate-800 uppercase">
                SISTEMA DE CONMUTACIÓN DE POTENCIA • TRANSFERENCIA (ATS/MTS)
              </span>
              <h2 className="text-xl print:text-xs font-black text-slate-100 tracking-wide uppercase font-mono print:text-slate-950">
                {isEditing ? (
                  <input
                    type="text"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    placeholder="Ej. ATS-1 - Transferencia Principal Sótano"
                    className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 w-full focus:outline-none focus:border-amber-500 text-slate-100 font-bold placeholder-slate-600"
                  />
                ) : (
                  nombre || 'TRANSFERENCIA (ATS/MTS)'
                )}
              </h2>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-xs print:text-[9px] font-mono font-bold text-slate-400 print:text-slate-900">Capacidad Nominal:</span>
              {isEditing ? (
                <input
                  type="text"
                  value={dt.amperaje !== undefined && dt.amperaje !== null ? dt.amperaje : (dt.capacidadAmperios !== undefined && dt.capacidadAmperios !== null ? dt.capacidadAmperios : '')}
                  onChange={(e) => {
                    const val = e.target.value;
                    handleDtChange('amperaje', val);
                    handleDtChange('capacidadAmperios', val);
                  }}
                  placeholder="Ej. 3200 A o 0"
                  className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs font-mono font-bold text-amber-400 text-center w-28 focus:border-amber-500 focus:outline-none"
                />
              ) : (
                <span className="tablero-badge-amber px-3 py-1 print:px-2 print:py-0.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-lg print:rounded font-mono font-black text-sm print:text-[10px]">
                  {dt.amperaje !== undefined && dt.amperaje !== null && dt.amperaje !== '' ? `${dt.amperaje}` : (dt.capacidadAmperios !== undefined && dt.capacidadAmperios !== null && dt.capacidadAmperios !== '' ? `${dt.capacidadAmperios}` : '—')}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Layout de 2 Columnas Superiores: Izquierda (Generales) y Derecha (Doble Fuente) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 print:grid-cols-12 divide-y lg:divide-y-0 print:divide-y-0 lg:divide-x print:divide-x divide-slate-800 print:divide-slate-400 border-b-2 border-slate-800 print:border-slate-900">
          
          {/* Columna Izquierda: Datos del Equipo y Parámetros Constructivos (5 columnas) */}
          <div className="lg:col-span-5 print:col-span-5 p-5 print:p-2 space-y-4 print:space-y-1.5 bg-slate-900/40">
            <h3 className="text-xs font-black text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Cpu className="w-4 h-4 text-amber-400" />
              Especificaciones Constructivas de Transferencia (ATS/MTS)
            </h3>

            <div className="space-y-3 text-xs font-mono">
              <div className="flex justify-between items-center bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                <span className="text-slate-400 font-bold">UBICACIÓN:</span>
                {isEditing ? (
                  <input
                    type="text"
                    value={ubicacion}
                    onChange={(e) => setUbicacion(e.target.value)}
                    placeholder="Ej. Sala Técnica / Sótano"
                    className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-100 text-right text-xs placeholder-slate-600"
                  />
                ) : (
                  <span className="text-slate-200 font-semibold">{ubicacion || '—'}</span>
                )}
              </div>

              <div className="flex justify-between items-center bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                <span className="text-slate-400 font-bold">MODELO / MARCA:</span>
                {isEditing ? (
                  <input
                    type="text"
                    value={dt.modelo || ''}
                    onChange={(e) => handleDtChange('modelo', e.target.value)}
                    placeholder="Ej. Socomec ATyS / YUYE-YES1"
                    className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-100 text-right text-xs placeholder-slate-600"
                  />
                ) : (
                  <span className="text-slate-200 font-semibold">{dt.modelo || dt.tipoTransferencia || '—'}</span>
                )}
              </div>

              {/* Tensión Nominal Normalizada (COVENIN 159:1997) */}
              <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-400 block font-bold">TENSIÓN NOMINAL (COVENIN 159:1997):</span>
                {isEditing ? (
                  <TensionNominalInput
                    tipo="TODAS"
                    value={dt.tensionNominal || ''}
                    onChange={(val) => handleDtChange('tensionNominal', val)}
                    placeholder="Ej. 208Y/120 V o 13800 V"
                  />
                ) : (
                  <span className="text-emerald-400 font-bold text-sm block mt-0.5">{dt.tensionNominal || '—'}</span>
                )}
              </div>

              {/* Polos y Frecuencia desacoplados */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-bold">N° DE POLOS:</span>
                  {isEditing ? (
                    <select
                      value={polos}
                      onChange={(e) => handleDtChange('polos', e.target.value)}
                      className="w-full mt-1 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-100 text-xs font-bold"
                    >
                      {POLOS_TRANSFERENCIA.map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-amber-400 font-bold text-sm block mt-0.5">{polos}</span>
                  )}
                </div>

                <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-bold">FRECUENCIA:</span>
                  {isEditing ? (
                    <select
                      value={frecuencia}
                      onChange={(e) => handleDtChange('frecuencia', e.target.value)}
                      className="w-full mt-1 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-100 text-xs font-bold"
                    >
                      {FRECUENCIAS_NORMALIZADAS.map(f => (
                        <option key={f} value={f}>{f}</option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-sky-400 font-bold text-sm block mt-0.5">{frecuencia}</span>
                  )}
                </div>
              </div>

              {/* Controlador ATS: Bloqueado y deshabilitado si tipo es MANUAL (MTS) */}
              <div className={`flex justify-between items-center p-2.5 rounded-xl border ${modoOperativo === 'MTS' ? 'bg-slate-950/40 border-slate-850 opacity-60' : 'bg-slate-900/80 border-slate-800'}`}>
                <div className="flex flex-col">
                  <span className="text-slate-400 font-bold">CONTROLADOR ATS:</span>
                  {modoOperativo === 'MTS' && (
                    <span className="text-[9px] text-amber-500 font-semibold">(No Aplica en modo Manual)</span>
                  )}
                </div>
                {isEditing ? (
                  <input
                    type="text"
                    disabled={modoOperativo === 'MTS'}
                    value={modoOperativo === 'MTS' ? 'No Aplica (Transferencia Manual)' : (dt.controladorAts || '')}
                    onChange={(e) => handleDtChange('controladorAts', e.target.value)}
                    placeholder="Ej. Deep Sea DSE 334 / ComAp"
                    className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-100 text-right text-xs placeholder-slate-600 disabled:bg-slate-900 disabled:text-slate-500"
                  />
                ) : (
                  <span className="text-slate-300 font-semibold">
                    {modoOperativo === 'MTS' ? 'No Aplica (Transferencia Manual)' : (dt.controladorAts || '—')}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Columna Derecha: TARJETA SUPERIOR DERECHA - DOBLE FUENTE DE ALIMENTACIÓN (7 columnas) */}
          <div className="lg:col-span-7 print:col-span-7 p-5 print:p-2 space-y-4 print:space-y-1.5 bg-slate-950/60">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h3 className="text-xs font-black text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <Zap className="w-4 h-4 text-emerald-400 no-print" />
                Doble Fuente de Alimentación • Transferencia (ATS/MTS)
              </h3>
              <span className="tablero-badge-slate text-[10px] print:text-[8px] font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                Jerarquía Automática Sincronizada
              </span>
            </div>

            {/* Resumen automático bidireccional (Aguas arriba y Aguas abajo) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 bg-slate-900/70 border border-slate-800/90 print:border-slate-400 rounded-xl p-2.5 print:p-1.5 font-mono text-[10px] print:text-[8.5px]">
              <div className="space-y-1">
                <span className="text-slate-400 print:text-slate-800 font-bold uppercase block">
                  Alimentado por (Entrada automática):
                </span>
                {autoHierarchy.upstreamBadges.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {autoHierarchy.upstreamBadges.map((b, i) => (
                      <button
                        key={`${b.id || b.nombre}-${i}`}
                        type="button"
                        onClick={() => setPreviewElement(b)}
                        title={`Clic para ver ficha rápida de ${b.nombre}`}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border font-bold cursor-pointer hover:ring-1 hover:ring-amber-400/60 transition-all ${
                          b.isCorpoelec
                            ? 'bg-sky-500/15 text-sky-300 border-sky-500/30 print:text-slate-950'
                            : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 print:text-slate-950'
                        }`}
                      >
                        <span className="truncate max-w-[170px]">{b.nombre}</span>
                        {b.code && <span className="text-amber-400 print:text-slate-700 lowercase">({b.code})</span>}
                        <Eye className="w-2.5 h-2.5 opacity-75 no-print shrink-0" />
                      </button>
                    ))}
                  </div>
                ) : (
                  <span className="text-slate-500 italic">Sin alimentador vinculado</span>
                )}
              </div>
              <div className="space-y-1 sm:border-l sm:border-slate-800 sm:pl-2.5">
                <span className="text-slate-400 print:text-slate-800 font-bold uppercase block">
                  Alimenta a (Salida automática):
                </span>
                {autoHierarchy.downstreamBadges.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {autoHierarchy.downstreamBadges.map((b, i) => (
                      <button
                        key={`${b.id || b.nombre}-${i}`}
                        type="button"
                        onClick={() => setPreviewElement(b)}
                        title={`Clic para ver ficha rápida de ${b.nombre}`}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border bg-amber-500/15 text-amber-200 border-amber-500/30 print:text-slate-950 font-bold cursor-pointer hover:ring-1 hover:ring-amber-400/60 transition-all"
                      >
                        <span className="truncate max-w-[170px]">{b.nombre}</span>
                        {b.code && <span className="text-amber-400 print:text-slate-700 lowercase">({b.code})</span>}
                        <Eye className="w-2.5 h-2.5 opacity-75 no-print shrink-0" />
                      </button>
                    ))}
                  </div>
                ) : (
                  <span className="text-slate-500 italic">Sin cargas vinculadas aguas abajo</span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 print:grid-cols-2 gap-3.5 print:gap-2">
              
              {/* Tarjeta 1: FUENTE NORMAL / PRINCIPAL (VERDE) */}
              <div className="tablero-sky-cell bg-gradient-to-b from-emerald-950/30 to-slate-900/90 border border-emerald-500/30 print:border-slate-500 rounded-xl print:rounded p-3.5 print:p-2 space-y-2.5 print:space-y-1 shadow-lg print:shadow-none relative z-20 focus-within:z-40">
                <div className="tablero-sky-header flex items-center justify-between border-b border-emerald-500/20 print:border-slate-400 pb-2 print:pb-1 print:px-1.5 print:py-0.5 print:rounded-xs">
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 print:p-0 rounded-full text-[10px] print:text-[8.5px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 print:border-0">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse no-print"></span>
                    Fuente Normal (Prioridad 1)
                  </span>
                  <span className="text-[10px] print:text-[8.5px] font-mono font-bold text-emerald-400">RED</span>
                </div>

                <div>
                  <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-1 print:mb-0.5">
                    Origen / Alimentador Normal:
                  </label>
                  {isEditing ? (
                    <>
                      <div className="no-print">
                        <SelectorAlimentadorJerarquico
                          value={fuenteNormalNombre}
                          onChange={(val, selectedObj, ids) => {
                            if (readOnly) return;
                            const upperVal = val ? val.toUpperCase() : '';
                            setDt((prev) => ({
                              ...prev,
                              fuenteNormalNombre: upperVal,
                              fuenteNormalId: selectedObj?.id || ids?.[0] || null
                            }));
                          }}
                          proyectoId={data.proyectoId || data.projectId}
                          tableroActualId={data.id}
                          elementosList={projectElements}
                          tipoElementoActual="TRANSFER"
                          direccionRelacion="ALIMENTADO_POR"
                          placeholder="Seleccionar Subestación, Transformador o CORPOELEC..."
                          className="text-xs"
                          label=""
                          allowQuickCreate={true}
                          onQuickCreate={() => {
                            setQuickCreateTargetField('fuenteNormal');
                            setNewSourceTipo('TRANSFORMADOR');
                            setNewSourceNombre(`Transformador Alimentador ${projectElements.filter(e => e.tipoElemento === 'TRANSFORMADOR').length + 1}`);
                            setNewSourceCapacidad(dt.amperaje || '500');
                            setNewSourceTension(dt.tensionNominal || '208/120 V');
                            setQuickCreateOpen(true);
                          }}
                        />
                      </div>
                      <p className="hidden print:block font-black text-slate-950 text-[9.5px] font-mono">
                        {fuenteNormalNombre || '—'}
                      </p>
                    </>
                  ) : (
                    fuenteNormalNombre ? (
                      <button
                        type="button"
                        onClick={() =>
                          setPreviewElement(
                            autoHierarchy.fuenteNormalResolved || {
                              id: dt.fuenteNormalId || null,
                              nombre: fuenteNormalNombre
                            }
                          )
                        }
                        title={`Clic para ver ficha rápida de ${fuenteNormalNombre}`}
                        className="inline-flex items-center gap-1.5 flex-wrap text-left px-2 py-1 -mx-2 rounded-lg hover:bg-emerald-500/10 border border-transparent hover:border-emerald-500/30 transition-all cursor-pointer group"
                      >
                        <span className="font-bold text-slate-100 print:text-slate-950 text-xs print:text-[9.5px] font-mono truncate" title={fuenteNormalNombre}>
                          {fuenteNormalNombre}
                        </span>
                        {autoHierarchy.fuenteNormalResolved?.code && (
                          <span className="no-print px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-emerald-500/15 text-amber-400 border border-emerald-500/30 lowercase">
                            {autoHierarchy.fuenteNormalResolved.code}
                          </span>
                        )}
                        <Eye className="w-3.5 h-3.5 text-emerald-400/70 group-hover:text-emerald-300 no-print shrink-0" />
                      </button>
                    ) : (
                      <p className="font-bold text-slate-500 text-xs font-mono">—</p>
                    )
                  )}
                </div>

                {/* Simplificación de Fuente Normal: Sin campos de tensión redundantes */}
                <div className="text-[10px] font-mono pt-1 border-t border-slate-800/80">
                  <span className="text-slate-500 block font-bold">CAPACIDAD BREAKER PRINCIPAL:</span>
                  {isEditing ? (
                    <input
                      type="text"
                      value={fuenteNormalAmperaje}
                      onChange={(e) => handleDtChange('fuenteNormalAmperaje', e.target.value)}
                      placeholder="Ej. 3200 A"
                      className="w-full mt-1 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-100 text-xs font-mono font-bold"
                    />
                  ) : (
                    <span className="text-slate-300 font-bold block mt-0.5">{fuenteNormalAmperaje || '—'}</span>
                  )}
                </div>

                <div className="text-[10px] font-mono pt-1 border-t border-slate-800/80">
                  <span className="text-slate-500 block font-bold">CONDUCTOR DE ACOMETIDA:</span>
                  {isEditing ? (
                    <input
                      type="text"
                      value={fuenteNormalConductor}
                      onChange={(e) => handleDtChange('fuenteNormalConductor', e.target.value)}
                      placeholder="Ej. 2(3X500 MCM)"
                      className="w-full mt-1 bg-slate-900 border border-slate-700 rounded px-2 py-0.5 text-slate-100 text-xs"
                    />
                  ) : (
                    <span className="text-slate-200 font-bold block mt-0.5">{fuenteNormalConductor || '—'}</span>
                  )}
                </div>
              </div>

              {/* Tarjeta 2: FUENTE EMERGENCIA (ÁMBAR/ROJO) - SELECTOR DUAL */}
              <div className="tablero-amber-cell bg-gradient-to-b from-amber-950/30 to-slate-900/90 border border-amber-500/30 print:border-slate-500 rounded-xl print:rounded p-3.5 print:p-2 space-y-2.5 print:space-y-1 shadow-lg print:shadow-none relative z-10 focus-within:z-40">
                <div className="tablero-amber-header flex items-center justify-between border-b border-amber-500/20 print:border-slate-400 pb-2 print:pb-1 print:px-1.5 print:py-0.5 print:rounded-xs">
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 print:p-0 rounded-full text-[10px] print:text-[8.5px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-400 border border-amber-500/40 print:border-0">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse no-print"></span>
                    Fuente Emergencia (Prioridad 2)
                  </span>
                  <span className="text-[10px] print:text-[8.5px] font-mono font-bold text-amber-400">GEN</span>
                </div>

                {/* Selector Dual en Modo Edición */}
                {isEditing && (
                  <div className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-lg border border-slate-800 mb-1 no-print">
                    <button
                      type="button"
                      onClick={() => setModoFuenteEmergencia('EXISTENTE')}
                      className={`flex-1 py-1 px-2 rounded text-[10px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                        modoFuenteEmergencia === 'EXISTENTE'
                          ? 'bg-amber-500 text-slate-950 shadow-sm'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Link2 className="w-3 h-3" /> Conectar Existente
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setModoFuenteEmergencia('NUEVO');
                        setQuickCreateTargetField('fuenteEmergencia');
                        setNewSourceTipo('GENERADOR');
                        setNewSourceNombre(`Generador Emergencia ${projectElements.filter(e => e.tipoElemento === 'GENERADOR').length + 1}`);
                        setNewSourceCapacidad(dt.amperaje || '500');
                        setNewSourceTension(dt.tensionNominal || '208/120 V');
                      }}
                      className={`flex-1 py-1 px-2 rounded text-[10px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                        modoFuenteEmergencia === 'NUEVO'
                          ? 'bg-amber-500 text-slate-950 shadow-sm'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Plus className="w-3 h-3" /> Registrar al Vuelo
                    </button>
                  </div>
                )}

                <div>
                  <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-1 print:mb-0.5">
                    Origen / Planta Generador:
                  </label>
                  {isEditing ? (
                    <>
                      <div className="no-print">
                        {modoFuenteEmergencia === 'EXISTENTE' ? (
                          <SelectorAlimentadorJerarquico
                            value={fuenteEmergenciaNombre}
                            onChange={(val, selectedObj, ids) => {
                              if (readOnly) return;
                              const upperVal = val ? val.toUpperCase() : '';
                              setDt((prev) => ({
                                ...prev,
                                fuenteEmergenciaNombre: upperVal,
                                fuenteEmergenciaId: selectedObj?.id || ids?.[0] || null
                              }));
                            }}
                            proyectoId={data.proyectoId || data.projectId}
                            tableroActualId={data.id}
                            elementosList={projectElements}
                            tipoElementoActual="TRANSFER"
                            direccionRelacion="ALIMENTADO_POR"
                            placeholder="Seleccionar Generador del proyecto..."
                            className="text-xs"
                            label=""
                            allowQuickCreate={true}
                            onQuickCreate={() => {
                              setModoFuenteEmergencia('NUEVO');
                              setQuickCreateTargetField('fuenteEmergencia');
                              setNewSourceTipo('GENERADOR');
                              setNewSourceNombre(`Generador Emergencia ${projectElements.filter(e => e.tipoElemento === 'GENERADOR').length + 1}`);
                              setNewSourceCapacidad(dt.amperaje || '500');
                              setNewSourceTension(dt.tensionNominal || '208/120 V');
                            }}
                          />
                        ) : (
                          <div className="bg-slate-950/80 p-2.5 rounded-xl border border-amber-500/40 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold text-amber-400 uppercase font-mono">Nuevo Generador al Vuelo:</span>
                              <button
                                type="button"
                                onClick={() => setModoFuenteEmergencia('EXISTENTE')}
                                className="text-[9px] text-slate-400 hover:text-slate-200 underline cursor-pointer"
                              >
                                Cancelar
                              </button>
                            </div>
                            <input
                              type="text"
                              value={newSourceNombre}
                              onChange={(e) => setNewSourceNombre(e.target.value)}
                              placeholder="Nombre (Ej. Planta Diésel Sótano)"
                              className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-100 text-xs"
                            />
                            <div className="grid grid-cols-2 gap-2">
                              <input
                                type="text"
                                value={newSourceCapacidad}
                                onChange={(e) => setNewSourceCapacidad(e.target.value)}
                                placeholder="Capacidad (Ej. 500 kVA)"
                                className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-100 text-xs font-mono"
                              />
                              <button
                                type="button"
                                onClick={(e) => handleCreateQuickSource(e, 'GENERADOR', newSourceNombre, newSourceCapacidad)}
                                className="px-2 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black rounded transition-all cursor-pointer shadow"
                              >
                                Crear y Asignar
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                      <p className="hidden print:block font-black text-slate-950 text-[9.5px] font-mono">
                        {fuenteEmergenciaNombre || '—'}
                      </p>
                    </>
                  ) : (
                    fuenteEmergenciaNombre ? (
                      <button
                        type="button"
                        onClick={() =>
                          setPreviewElement(
                            autoHierarchy.fuenteEmergenciaResolved || {
                              id: dt.fuenteEmergenciaId || null,
                              nombre: fuenteEmergenciaNombre
                            }
                          )
                        }
                        title={`Clic para ver ficha rápida de ${fuenteEmergenciaNombre}`}
                        className="inline-flex items-center gap-1.5 flex-wrap text-left px-2 py-1 -mx-2 rounded-lg hover:bg-amber-500/10 border border-transparent hover:border-amber-500/30 transition-all cursor-pointer group"
                      >
                        <span className="font-bold text-slate-100 print:text-slate-950 text-xs print:text-[9.5px] font-mono truncate" title={fuenteEmergenciaNombre}>
                          {fuenteEmergenciaNombre}
                        </span>
                        {autoHierarchy.fuenteEmergenciaResolved?.code && (
                          <span className="no-print px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 lowercase">
                            {autoHierarchy.fuenteEmergenciaResolved.code}
                          </span>
                        )}
                        <Eye className="w-3.5 h-3.5 text-amber-400/70 group-hover:text-amber-300 no-print shrink-0" />
                      </button>
                    ) : (
                      <p className="font-bold text-slate-500 text-xs font-mono">—</p>
                    )
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 text-[10px] font-mono pt-1 border-t border-slate-800/80">
                  <div>
                    <span className="text-slate-500 block font-bold">TENSIÓN:</span>
                    {isEditing ? (
                      <input
                        type="text"
                        value={fuenteEmergenciaTension}
                        onChange={(e) => handleDtChange('fuenteEmergenciaTension', e.target.value)}
                        placeholder="Ej. 208/120V"
                        className="w-full bg-slate-950 border border-slate-700 rounded px-1.5 py-0.5 text-slate-100 text-[10px]"
                      />
                    ) : (
                      <span className="text-slate-300 font-bold">{fuenteEmergenciaTension || '—'}</span>
                    )}
                  </div>
                  <div>
                    <span className="text-slate-500 block font-bold">CAPACIDAD BREAKER:</span>
                    {isEditing ? (
                      <input
                        type="text"
                        value={fuenteEmergenciaAmperaje}
                        onChange={(e) => handleDtChange('fuenteEmergenciaAmperaje', e.target.value)}
                        placeholder="Ej. 3200 A"
                        className="w-full bg-slate-950 border border-slate-700 rounded px-1.5 py-0.5 text-slate-100 text-[10px]"
                      />
                    ) : (
                      <span className="text-slate-300 font-bold">{fuenteEmergenciaAmperaje || '—'}</span>
                    )}
                  </div>
                </div>

                <div className="text-[10px] font-mono pt-1 border-t border-slate-800/80">
                  <span className="text-slate-500 block font-bold">CONDUCTOR DE ACOMETIDA:</span>
                  {isEditing ? (
                    <input
                      type="text"
                      value={fuenteEmergenciaConductor}
                      onChange={(e) => handleDtChange('fuenteEmergenciaConductor', e.target.value)}
                      placeholder="Ej. 2(3X500 MCM)"
                      className="w-full mt-1 bg-slate-900 border border-slate-700 rounded px-2 py-0.5 text-slate-100 text-xs"
                    />
                  ) : (
                    <span className="text-slate-200 font-bold block mt-0.5">{fuenteEmergenciaConductor || '—'}</span>
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 3. ENCLAVAMIENTO, MODO OPERATIVO Y ESTADO DE SERVICIO */}
        {/* ========================================================================= */}
        <div className="tablero-subheader-row p-4 print:p-2 bg-slate-900/90 border-b-2 border-slate-800 print:border-slate-900">
          <div className="flex flex-col md:flex-row print:flex-row md:items-center print:items-center justify-between gap-4 print:gap-2">
            
            {/* Modo Operativo (ATS / MTS) */}
            <div className="flex items-center gap-3 print:gap-1.5">
              <span className="text-xs print:text-[9px] font-bold text-slate-300 print:text-slate-950 uppercase tracking-wider flex items-center gap-1.5 font-mono">
                <Sliders className="w-4 h-4 text-amber-400 no-print" />
                Modo de Operación:
              </span>
              {isEditing ? (
                <div className="flex gap-2 print:gap-1">
                  <button
                    type="button"
                    onClick={() => handleDtChange('modoOperativo', 'ATS')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                      modoOperativo === 'ATS'
                        ? 'bg-amber-500 text-slate-950 shadow-md'
                        : 'bg-slate-900 text-slate-400 border border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    🔄 Automática (ATS)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDtChange('modoOperativo', 'MTS')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                      modoOperativo === 'MTS'
                        ? 'bg-amber-500 text-slate-950 shadow-md'
                        : 'bg-slate-900 text-slate-400 border border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    🔀 Manual (MTS)
                  </button>
                </div>
              ) : (
                <span className="tablero-badge-amber px-3 py-1 print:px-1.5 print:py-0.5 bg-slate-900 text-amber-400 border border-amber-500/30 rounded-lg print:rounded text-xs print:text-[9px] font-black font-mono">
                  {modoOperativo === 'ATS' ? '🔄 AUTOMÁTICA (ATS)' : '🔀 MANUAL (MTS)'}
                </span>
              )}
            </div>

            {/* Selector de Estado de Servicio (En Servicio / Fuera de Servicio) */}
            <div className="flex items-center gap-3 print:gap-1.5">
              <span className="text-xs print:text-[9px] font-bold text-slate-300 print:text-slate-950 uppercase tracking-wider flex items-center gap-1.5 font-mono">
                <Shield className="w-4 h-4 text-emerald-400 no-print" />
                Estado de Operatividad:
              </span>
              {isEditing ? (
                <select
                  value={estadoServicio}
                  onChange={(e) => handleDtChange('estadoServicio', e.target.value)}
                  className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 font-bold focus:outline-none focus:border-amber-500 cursor-pointer"
                >
                  <option value="En Servicio">🟢 En Servicio</option>
                  <option value="Fuera de Servicio">🔴 Fuera de Servicio</option>
                </select>
              ) : (
                <span className={`px-3 py-1 print:px-1.5 print:py-0.5 rounded-lg print:rounded text-xs print:text-[9px] font-bold font-mono ${
                  estadoServicio === 'En Servicio' 
                    ? 'tablero-active-emerald bg-emerald-950 text-emerald-400 border border-emerald-800' 
                    : 'tablero-active-red bg-red-950 text-red-400 border border-red-800'
                }`}>
                  {estadoServicio === 'En Servicio' ? '🟢 En Servicio' : '🔴 Fuera de Servicio'}
                </span>
              )}
            </div>

            {/* Selector de Tipo de Transición */}
            <div className="flex items-center gap-3 print:gap-1.5">
              <span className="text-xs print:text-[9px] font-bold text-slate-300 print:text-slate-950 uppercase tracking-wider flex items-center gap-1.5 font-mono">
                <ArrowRightLeft className="w-4 h-4 text-sky-400 no-print" />
                Transición:
              </span>
              {isEditing ? (
                <select
                  value={tipoTransicion}
                  onChange={(e) => handleDtChange('tipoTransicion', e.target.value)}
                  className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 font-bold focus:outline-none focus:border-amber-500 cursor-pointer"
                >
                  <option value="ABIERTA">Abierta (Break-Before-Make / I-0-II)</option>
                  <option value="CERRADA">Cerrada (Make-Before-Break / Sin Corte)</option>
                  <option value="RETARDADA">Retardada (Pausa Programada en Cero)</option>
                </select>
              ) : (
                <span className="tablero-badge-sky px-3 py-1 print:px-1.5 print:py-0.5 bg-slate-900 text-sky-400 border border-sky-500/30 rounded-lg print:rounded text-xs print:text-[9px] font-bold font-mono">
                  {tipoTransicion === 'CERRADA' ? '⚡ Cerrada' :
                   tipoTransicion === 'RETARDADA' ? '⏱️ Retardada' :
                   '🔌 Abierta'}
                </span>
              )}
            </div>

          </div>
        </div>

        {/* ========================================================================= */}
        {/* 4. MEDICIONES (COVENIN 159) */}
        {/* ========================================================================= */}
        <div className="p-4 print:p-2 bg-slate-950 border-b-2 border-slate-800 print:border-slate-900">
          <MetrologiaElectricaSection
            mediciones={dt.mediciones || {}}
            onChange={(nuevasMediciones) => handleDtChange('mediciones', nuevasMediciones)}
            readOnly={!isEditing}
            titulo="MEDICIONES"
            subtitulo="Tensiones L-L, L-N y canales de corriente en barra de carga común (COVENIN 159)"
          />
        </div>

        {/* ========================================================================= */}
        {/* 5. CUADRO DE CONDUCTORES, SALIDA A CARGA Y NEUTRO */}
        {/* ========================================================================= */}
        <div className="p-5 print:p-2 space-y-4 print:space-y-1.5 border-b-2 border-slate-800 print:border-slate-900 bg-slate-950">
          <h3 className="text-xs font-black text-slate-200 uppercase tracking-wider flex items-center gap-2 font-mono">
            <Layers className="w-4 h-4 text-amber-400 no-print" />
            Líneas de Salida Conmutada hacia la Carga del Proyecto
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 print:grid-cols-3 gap-4 print:gap-2 font-mono text-xs">
            {/* LÍNEA DE SALIDA FLEXIBLE CON JERARQUÍA BIDIRECCIONAL AUTOMÁTICA */}
            <div className="tablero-ficha-card bg-slate-900/80 p-3.5 print:p-2 rounded-xl border border-slate-800 space-y-2 print:space-y-1 relative z-20 focus-within:z-40">
              <div className="flex items-center justify-between gap-2">
                <span className="tablero-ficha-label text-[10px] print:text-[8.5px] text-slate-400 font-bold uppercase block">
                  CARGA O TABLERO ALIMENTADO:
                </span>
                {isEditing && (
                  <button
                    type="button"
                    onClick={() => setSalidaQuickOpen((prev) => !prev)}
                    className="no-print inline-flex items-center gap-1 text-[9px] text-amber-400 hover:text-amber-300 font-bold underline cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    {salidaQuickOpen ? 'Volver al Selector' : 'Crear Destino'}
                  </button>
                )}
              </div>

              {isEditing ? (
                salidaQuickOpen ? (
                  <div className="no-print bg-slate-950/90 p-2.5 rounded-xl border border-amber-500/40 space-y-2">
                    <span className="text-[10px] font-bold text-amber-400 uppercase block font-mono">
                      Crear Equipo Alimentado al Vuelo:
                    </span>
                    <select
                      value={newSalidaTipo}
                      onChange={(e) => setNewSalidaTipo(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-100 text-xs font-bold cursor-pointer"
                    >
                      <option value="TABLERO">Sub-Tablero / Panel</option>
                      <option value="CCM">Centro de Control (CCM)</option>
                      <option value="TRANSFER">Transferencia Secundaria</option>
                    </select>
                    <input
                      type="text"
                      value={newSalidaNombre}
                      onChange={(e) => setNewSalidaNombre(e.target.value)}
                      placeholder="Nombre opcional (ej. Tablero Hidroneumático)"
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-100 text-xs"
                    />
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setSalidaQuickOpen(false)}
                        className="px-2 py-1 text-[10px] text-slate-400 hover:text-slate-200 cursor-pointer"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={handleCreateQuickSalida}
                        className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 text-[10px] font-black rounded transition-all cursor-pointer shadow"
                      >
                        Crear y Enlazar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="no-print">
                    <SelectorAlimentadorJerarquico
                      value={salidaCargaNombre}
                      multiple={true}
                      proyectoId={data.proyectoId || data.projectId}
                      tableroActualId={data.id}
                      elementosList={projectElements}
                      tipoElementoActual="TRANSFER"
                      direccionRelacion="ALIMENTA_A"
                      label=""
                      placeholder="Seleccionar Tableros, CCM o escribir carga directa..."
                      className="text-xs"
                      onChange={(formatted, primaryObj, ids) => {
                        if (readOnly) return;
                        const upperFormatted = formatted ? formatted.toUpperCase() : '';
                        const cleanIds = Array.isArray(ids) ? ids.filter(Boolean) : [];
                        setDt((prev) => ({
                          ...prev,
                          salidaCargaNombre: upperFormatted,
                          salidaCargaId: cleanIds[0] || null,
                          alimentaA: upperFormatted,
                          alimentaAIds: cleanIds
                        }));
                      }}
                    />
                    <p className="hidden print:block text-slate-950 font-black text-[10px]">
                      {salidaCargaNombre || '—'}
                    </p>
                  </div>
                )
              ) : (
                <>
                  <div className="no-print">
                    {autoHierarchy.downstreamBadges.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {autoHierarchy.downstreamBadges.map((b, i) => (
                          <button
                            key={`${b.id || b.nombre}-${i}`}
                            type="button"
                            onClick={() => setPreviewElement(b)}
                            title={`Clic para ver ficha rápida de ${b.nombre}`}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/15 text-slate-100 border border-amber-500/30 hover:border-amber-400 font-black text-xs cursor-pointer transition-all"
                          >
                            <span className="truncate max-w-[180px]">{b.nombre}</span>
                            {b.code && <span className="text-amber-400 lowercase text-[10px] font-mono">({b.code})</span>}
                            <Eye className="w-3 h-3 text-amber-300/80 shrink-0" />
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="text-slate-100 font-black text-sm truncate" title={salidaCargaNombre}>
                        {salidaCargaNombre || '—'}
                      </p>
                    )}
                  </div>
                  <p className="hidden print:block text-slate-950 font-black text-[10px]">
                    {salidaCargaNombre || '—'}
                  </p>
                </>
              )}
            </div>

            {/* RENOMBRADO TÉCNICO: ACOMETIDA DE CARGA (ANTES BARRA Y CONDUCTOR DE NEUTRO) */}
            <div className="tablero-ficha-card bg-slate-900/80 p-3.5 print:p-2 rounded-xl border border-slate-800 space-y-1.5 print:space-y-1">
              <span className="tablero-ficha-label text-[10px] print:text-[8.5px] text-cyan-400 font-bold uppercase block">
                ACOMETIDA DE CARGA:
              </span>
              {isEditing ? (
                <input
                  type="text"
                  value={acometidaCargaConductor}
                  onChange={(e) => {
                    const val = e.target.value;
                    handleDtChange('acometidaCarga', val);
                    handleDtChange('acometidaCargaConductor', val);
                    handleDtChange('neutroConductor', val);
                  }}
                  placeholder="Ej. 3(1X500 MCM) + 1X500 MCM (N)"
                  className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-100 text-xs font-mono"
                />
              ) : (
                <p className="text-slate-200 print:text-slate-950 font-bold text-xs print:text-[10px]">{acometidaCargaConductor || '—'}</p>
              )}
              <span className="text-[10px] print:text-[8px] text-slate-500 print:text-slate-800 block">Conductor general de acometida hacia barra de carga común</span>
            </div>

            <div className="tablero-ficha-card bg-slate-900/80 p-3.5 print:p-2 rounded-xl border border-slate-800 space-y-1.5 print:space-y-1">
              <span className="tablero-ficha-label text-[10px] print:text-[8.5px] text-emerald-400 font-bold uppercase block">
                TIERRA DE PROTECCIÓN (PE / SPT):
              </span>
              {isEditing ? (
                <input
                  type="text"
                  value={tierraConductor}
                  onChange={(e) => handleDtChange('tierraConductor', e.target.value)}
                  placeholder="Ej. 1X4/0 AWG (SPT)"
                  className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-100 text-xs"
                />
              ) : (
                <p className="text-slate-200 print:text-slate-950 font-bold text-xs print:text-[10px]">{tierraConductor || '—'}</p>
              )}
              <span className="text-[10px] print:text-[8px] text-slate-500 print:text-slate-800 block">Conexión directa a barra de equipotencialidad</span>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 6. REGISTRO FOTOGRÁFICO Y OBSERVACIONES TÉCNICAS */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-12 print:grid-cols-12 divide-y lg:divide-y-0 print:divide-y-0 lg:divide-x print:divide-x divide-slate-800 print:divide-slate-400 bg-slate-900/30">
          
          {/* Observaciones (7 columnas) */}
          <div className={`${hasPhotoAttached ? 'lg:col-span-7 print:col-span-7' : 'lg:col-span-7 print:col-span-12'} p-5 print:p-2 space-y-2.5 print:space-y-1`}>
            <h3 className="text-xs font-black text-slate-300 uppercase tracking-wider flex items-center gap-2 font-mono">
              <Info className="w-4 h-4 text-amber-400 no-print" />
              Observaciones Técnicas y Diagnóstico
            </h3>

            {isEditing ? (
              <textarea
                rows={5}
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                placeholder="Indique notas de conmutación, secuencias de arranque de generadores, hallazgos, etc."
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-slate-100 font-mono focus:outline-none focus:border-amber-500 placeholder-slate-600"
              />
            ) : (
              <div className="tablero-obs-box p-4 print:p-2 bg-slate-950/70 rounded-xl print:rounded border border-slate-800 text-xs print:text-[9.5px] font-mono text-slate-300 print:text-slate-950 leading-relaxed print:leading-tight whitespace-pre-wrap">
                {observaciones || 'Sin observaciones registradas para esta transferencia.'}
              </div>
            )}
          </div>

          {/* Fotografía de la Transferencia con Carga Dual (5 columnas) */}
          <div className={`lg:col-span-5 print:col-span-5 p-5 print:p-2 ${!hasPhotoAttached ? 'no-print' : ''}`}>
            <DualPhotoUploader
              fotoBlob={fotoBlob}
              fotoSrc={fotoSrc}
              previewUrl={previewUrl}
              onImageSelected={(file, uploadedUrl) => {
                setFotoBlob(file);
                setFotoSrc(uploadedUrl);
                if (previewUrl && previewUrl.startsWith('blob:')) URL.revokeObjectURL(previewUrl);
                setPreviewUrl(uploadedUrl);
                onUpdate?.({
                  ...data,
                  nombre,
                  ubicacion,
                  observacionesGenerales: observaciones,
                  fotoBlob: null,
                  foto: uploadedUrl,
                  eliminarFoto: false,
                  datosTecnicos: dt
                });
              }}
              onRemove={() => {
                setFotoBlob(null);
                setFotoSrc(null);
                if (previewUrl && previewUrl.startsWith('blob:')) URL.revokeObjectURL(previewUrl);
                setPreviewUrl(null);
                onUpdate?.({
                  ...data,
                  nombre,
                  ubicacion,
                  observacionesGenerales: observaciones,
                  fotoBlob: null,
                  foto: null,
                  eliminarFoto: true,
                  datosTecnicos: dt
                });
              }}
              readOnly={!isEditing}
              label="Fotografía de la Transferencia"
              sublabel="Cámara en vivo o selección de galería"
            />
          </div>

        </div>

      </div>

      {/* Modal Rápido de Creación de Fuente / Generador en Línea */}
      {quickCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm no-print animate-in fade-in">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-750 rounded-2xl shadow-2xl p-5 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase text-slate-100 font-mono">
                    Crear Fuente de Alimentación
                  </h3>
                  <p className="text-[11px] text-slate-400 font-sans">
                    {quickCreateTargetField === 'fuenteNormal' ? 'Fuente Normal (Prioridad 1)' : 'Fuente Emergencia (Prioridad 2)'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setQuickCreateOpen(false)}
                className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateQuickSource} className="space-y-3.5 text-xs font-mono">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                  Tipo de Fuente
                </label>
                <select
                  value={newSourceTipo}
                  onChange={(e) => {
                    const t = e.target.value;
                    setNewSourceTipo(t);
                    if (t === 'GENERADOR') setNewSourceNombre(`Generador Emergencia ${projectElements.filter(el => el.tipoElemento === 'GENERADOR').length + 1}`);
                    else if (t === 'TRANSFORMADOR') setNewSourceNombre(`Transformador Principal ${projectElements.filter(el => el.tipoElemento === 'TRANSFORMADOR').length + 1}`);
                    else if (t === 'SUBESTACION') setNewSourceNombre(`Subestación ${projectElements.filter(el => el.tipoElemento === 'SUBESTACION').length + 1}`);
                    else if (t === 'PUNTO_SUMINISTRO' || t === 'PUNTO_MEDICION') setNewSourceNombre('Punto de Suministro CORPOELEC');
                  }}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 font-bold focus:outline-none focus:border-amber-500 cursor-pointer"
                >
                  <option value="TRANSFORMADOR">Transformador</option>
                  <option value="GENERADOR">Generador / Planta Eléctrica</option>
                  <option value="SUBESTACION">Subestación / Celda MT</option>
                  <option value="PUNTO_SUMINISTRO">Punto de Suministro / Acometida</option>
                  <option value="TABLERO">Tablero de Distribución</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                  Nombre / Identificador de la Fuente
                </label>
                <input
                  type="text"
                  required
                  value={newSourceNombre}
                  onChange={(e) => setNewSourceNombre(e.target.value)}
                  placeholder="Ej. Generador Planta Diésel 150 kVA"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-amber-500 font-sans"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                    Capacidad (kVA / A)
                  </label>
                  <input
                    type="text"
                    value={newSourceCapacidad}
                    onChange={(e) => setNewSourceCapacidad(e.target.value)}
                    placeholder="Ej. 150 kVA"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                    Tensión Nominal
                  </label>
                  <TensionNominalInput
                    tipo="TODAS"
                    value={newSourceTension}
                    onChange={(val) => setNewSourceTension(val)}
                    placeholder="Ej. 208/120 V o 13.8 kV"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                  Ubicación Física
                </label>
                <input
                  type="text"
                  value={newSourceUbicacion}
                  onChange={(e) => setNewSourceUbicacion(e.target.value)}
                  placeholder="Ej. Caseta de Generación / Sala Eléctrica"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-amber-500 font-sans"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setQuickCreateOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs transition-all shadow-md active:scale-95 cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" /> Crear y Vincular
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Edición de ID Visual (Solo Administradores) */}
      <ModalEditarIdElemento
        isOpen={isEditIdModalOpen}
        onClose={() => setIsEditIdModalOpen(false)}
        elemento={data}
        tipoElemento="TRANSFER"
        proyectoId={data?.proyectoId}
      />

      <ElementQuickPreviewModal
        elementRef={previewElement}
        proyectoId={data?.proyectoId || data?.projectId}
        onClose={() => setPreviewElement(null)}
      />

    </div>
  );
}
