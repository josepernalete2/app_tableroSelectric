import React, { useState, useEffect, useRef } from 'react';
import EditableCell from './EditableCell';
import EditablePoleCell from './EditablePoleCell';
import { Plus, Minus, Grid, Columns, Settings, RefreshCw, Zap, Image, ClipboardList, Camera, X, Printer, Pencil, Download, Edit3, Trash2, Loader2, Shield, Layers, Box } from 'lucide-react';
import useStore, { getElementCode, getSimpleElementCode, assignSimpleHierarchyCodes, cleanElementName } from '../store/useStore';
import { useConfirm } from '../context/ConfirmContext';
import { API_BASE_URL } from '../utils/api';
import ModalEditarIdElemento from './ModalEditarIdElemento';
import { calcularPotenciaEstimadaTablero } from '../utils/potenciaTablero';

import { compressImageToBase64, getCleanImageUrl } from '../utils/imageUtils';

// Componente para renderizar Base64 / Blobs / URLs de forma segura evitando fugas de memoria
const SafeImage = ({ blob, src, alt, className, style }) => {
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

  return <img src={finalSrc} alt={alt || "Inspección del tablero"} className={className} style={style} onError={() => setHasError(true)} />;
};
import ModalEdicionCircuito from './ModalEdicionCircuito';
import SelectorAlimentadorJerarquico from './SelectorAlimentadorJerarquico';
import { 
  AMP_OPTIONS, 
  COND_OPTIONS, 
  MARCA_OPTIONS, 
  TIPO_OPTIONS, 
  TENSIONES_COVENIN_159_BT,
  TABLERO_CAPACIDADES_POLOS,
  TABLERO_CANTIDAD_POLOS_ESTANDAR,
  TABLERO_USO_ELECTRICO,
  TABLERO_MONTAJE_OPCIONES,
  TABLERO_HERMETICIDAD_NEMA_IP,
  BARRAS_AMP_OPTIONS,
  VOLTAJE_FN_OPTIONS,
  VOLTAJE_LL_OPTIONS,
  ACOMETIDA_OPTIONS
} from '../utils/constants';
import { getCustomOptions, saveCustomOption } from '../utils/customPresets';

export const TableroComponent = ({ tableroData, onUpdateTablero, readOnly }) => {
  const [isEditable, setIsEditable] = useState(!readOnly);
  const effectivelyReadOnly = Boolean(readOnly || !isEditable);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [editingCircuit, setEditingCircuit] = useState(null);
  const [elementosPorCrear, setElementosPorCrear] = useState(
    tableroData?.elementosPorCrear || tableroData?.datosTecnicos?.elementosPorCrear || []
  );

  const { 
    companies, 
    updateTableroAlimentador, 
    addElementoUnifilar,
    registrarConflictoCircuito,
    showToast,
    setPanelConflictosOpen,
    user
  } = useStore();
  const { confirm, alert: customAlert } = useConfirm();
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'admin';
  const [isEditIdModalOpen, setIsEditIdModalOpen] = useState(false);

  const project = React.useMemo(() => {
    if (!tableroData) return null;
    for (const c of companies) {
      if (c.proyectos) {
        for (const p of c.proyectos) {
          if (tableroData.proyectoId && p.id === tableroData.proyectoId) {
            return p;
          }
          const tableros = p.elementosUnifilares || p.tableros || [];
          if (tableros.some(t => t.id === tableroData.id)) {
            return p;
          }
        }
      }
    }
    return null;
  }, [companies, tableroData?.id, tableroData?.proyectoId]);

  const todosElementosProyecto = React.useMemo(() => {
    if (!project) return [];
    const byId = new Map();
    const pushAll = (arr = [], defaultTipo = 'TABLERO') => {
      (arr || []).forEach((item) => {
        if (!item || !item.id || byId.has(item.id)) return;
        const tipo = item.tipoElemento || item.tipo || defaultTipo;
        byId.set(item.id, {
          id: item.id,
          nombre: item.nombre,
          tipo,
          tipoElemento: tipo,
          codigo: item.codigo || item.datosTecnicos?.codigo || null,
          datosTecnicos: item.datosTecnicos || item.parametrosElectricos || {},
          ubicacion: item.ubicacion || item.plantaInstalacion || null,
          nivelTension: item.nivelTension || item.tensionNominal || item.tension || null,
          orden: item.orden ?? item.datosTecnicos?.orden ?? null,
          createdAt: item.createdAt || null,
          proyectoId: item.proyectoId || project.id
        });
      });
    };

    pushAll(project.elementosUnifilares || project.tableros || [], 'TABLERO');
    pushAll(project.subestaciones || project.inspeccionesSubestacion || [], 'SUBESTACION');
    pushAll(project.puntosMedicion || [], 'PUNTO_MEDICION');
    pushAll(project.ccmList || project.ccms || [], 'CCM');
    pushAll(project.alimentadores || [], 'ALIMENTADOR');

    return assignSimpleHierarchyCodes(Array.from(byId.values()));
  }, [project]);

  const alimentadores = React.useMemo(
    () => todosElementosProyecto.filter((e) => e.id !== tableroData?.id),
    [todosElementosProyecto, tableroData?.id]
  );

  const todosElementosCreados = alimentadores;

  const renderTipoDestinoBadge = (tipoDestino, tipoElementoDestino) => {
    const t = (tipoElementoDestino || tipoDestino || '').toUpperCase();
    if (!t || t === 'RESERVA') return null;

    if (t === 'ARTEFACTO' || t === 'CARGA_DIRECTA') {
      return (
        <span className="tablero-badge-slate inline-flex items-center w-max px-1.5 py-0.5 print:px-1 print:py-0 rounded text-[8px] print:text-[7.5px] font-bold bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 leading-tight">
          🔌 ARTEFACTO
        </span>
      );
    }
    if (t === 'TRANSFER' || t === 'ATS' || t === 'MTS') {
      return (
        <span className="tablero-badge-slate inline-flex items-center w-max px-1.5 py-0.5 print:px-1 print:py-0 rounded text-[8px] print:text-[7.5px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 leading-tight">
          🔄 TRANSFERENCIA (ATS/MTS)
        </span>
      );
    }
    if (t === 'GENERADOR' || t === 'GEN' || t === 'PLANTA') {
      return (
        <span className="tablero-badge-slate inline-flex items-center w-max px-1.5 py-0.5 print:px-1 print:py-0 rounded text-[8px] print:text-[7.5px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 leading-tight">
          ⚡ GENERADOR
        </span>
      );
    }
    if (t === 'CCM' || t === 'MOTOR') {
      return (
        <span className="tablero-badge-slate inline-flex items-center w-max px-1.5 py-0.5 print:px-1 print:py-0 rounded text-[8px] print:text-[7.5px] font-bold bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300 leading-tight">
          ⚙️ CCM
        </span>
      );
    }
    if (t === 'SUBESTACION' || t === 'SE') {
      return (
        <span className="tablero-badge-slate inline-flex items-center w-max px-1.5 py-0.5 print:px-1 print:py-0 rounded text-[8px] print:text-[7.5px] font-bold bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300 leading-tight">
          🏛️ SUBESTACIÓN
        </span>
      );
    }
    if (t === 'TRANSFORMADOR' || t === 'TRAFO') {
      return (
        <span className="tablero-badge-slate inline-flex items-center w-max px-1.5 py-0.5 print:px-1 print:py-0 rounded text-[8px] print:text-[7.5px] font-bold bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 leading-tight">
          🔌 TRANSFORMADOR
        </span>
      );
    }
    if (t === 'PUNTO_MEDICION' || t === 'MEDIDOR' || t === 'PUNTO_SUMINISTRO') {
      return (
        <span className="tablero-badge-slate inline-flex items-center w-max px-1.5 py-0.5 print:px-1 print:py-0 rounded text-[8px] print:text-[7.5px] font-bold bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300 leading-tight">
          📊 {t === 'PUNTO_SUMINISTRO' ? 'PUNTO SUMINISTRO' : 'MEDIDOR'}
        </span>
      );
    }
    if (t === 'SUB_TABLERO' || t === 'TABLERO') {
      return (
        <span className="tablero-badge-slate inline-flex items-center w-max px-1.5 py-0.5 print:px-1 print:py-0 rounded text-[8px] print:text-[7.5px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 leading-tight">
          🏢 SUB-TABLERO
        </span>
      );
    }
    if (t === 'SUB_TABLERO_PENDIENTE') {
      return (
        <span className="tablero-badge-amber inline-flex items-center w-max px-1.5 py-0.5 print:px-1 print:py-0 rounded text-[8px] print:text-[7.5px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 leading-tight">
          ⏳ RESERVA PENDIENTE
        </span>
      );
    }
    return (
      <span className="tablero-badge-slate inline-flex items-center w-max px-1.5 py-0.5 print:px-1 print:py-0 rounded text-[8px] print:text-[7.5px] font-bold bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 leading-tight">
        🔗 {t.replace(/_/g, ' ')}
      </span>
    );
  };

  const renderCircuitEquipo = (equipoText, vinculadoId, elementoDestinoId, tipoDestino, tipoElementoDestino) => {
    if (!equipoText || equipoText === 'RESERVA') {
      return <span className="text-xs print:text-[9.5px] text-slate-400 dark:text-slate-600 print:text-slate-600 italic font-mono font-semibold leading-tight">RESERVA</span>;
    }

    let cleanName = String(equipoText).trim();
    let rawElementId = elementoDestinoId || vinculadoId || null;
    let elementType = tipoElementoDestino || tipoDestino || 'TABLERO';

    // Extraer ID si viene embebido en texto: "Nombre (ID: xxx)" o "Nombre (xxx)"
    const match = cleanName.match(/^(.*?)(?:\s*\((?:ID:\s*)?([a-zA-Z0-9_-]+)\))?$/i);
    if (match) {
      if (match[1]) cleanName = match[1].trim();
      if (match[2] && !rawElementId) rawElementId = match[2].trim();
    }

    // Limpiar cualquier UUID embebido en el nombre
    cleanName = cleanElementName(cleanName, rawElementId);

    // Resolver IDs de elementos a códigos simples estandarizados (ej. med-1, tra-1, tab-2, sub-1, ccm-1)
    let idBadges = [];
    if (rawElementId) {
      const idList = String(rawElementId).split(',').map(s => s.trim()).filter(Boolean);
      idBadges = idList.map(id => {
        const found = todosElementosProyecto.find(
          e => e.id === id || e.simpleCode === id || (e.codigo && e.codigo.toLowerCase() === String(id).toLowerCase())
        );
        if (found) {
          return {
            id,
            code: found.simpleCode,
            name: cleanElementName(found.nombre, found.id, found.simpleCode)
          };
        }
        return {
          id,
          code: getSimpleElementCode(id, elementType),
          name: null
        };
      });
    }

    // Si el nombre resultante sigue siendo un UUID crudo o quedó vacío, reemplazar por el nombre o código amigable
    const isNameUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanName);
    if ((!cleanName || isNameUuid) && idBadges.length > 0 && idBadges[0].name) {
      cleanName = idBadges.map(b => b.name).filter(Boolean).join(', ');
    } else if (isNameUuid && idBadges.length > 0) {
      cleanName = idBadges.map(b => b.code).join(', ');
    }

    const tipoBadge = renderTipoDestinoBadge(tipoDestino, tipoElementoDestino);

    return (
      <div className="flex flex-col gap-0.5 print:gap-0 leading-snug print:leading-tight">
        <span className="text-xs print:text-[10px] font-bold text-slate-950 dark:text-slate-100 print:text-slate-950 break-words leading-snug print:leading-tight">{cleanName}</span>
        {(idBadges.length > 0 || tipoBadge) && (
          <div className="flex items-center gap-1 flex-wrap mt-0.5 print:mt-0.5">
            {idBadges.map((badge, bIdx) => (
              <span
                key={bIdx}
                className="tablero-badge-amber inline-flex items-center w-max px-1.5 py-0.5 print:px-1 print:py-0 rounded text-[9.5px] print:text-[8px] font-mono lowercase font-bold bg-amber-500/10 text-amber-500 border border-amber-500/30 shadow-sm leading-tight"
              >
                {badge.code}
              </span>
            ))}
            {tipoBadge}
          </div>
        )}
      </div>
    );
  };

  // Normalize circuits: ensure all poles from 1 to maxPoles are represented exactly once
  const maxPoles = React.useMemo(() => {
    const raw = tableroData?.maxPoles ?? tableroData?.datosTecnicos?.maxPoles;
    const parsed = parseInt(raw, 10);
    return Number.isInteger(parsed) && parsed > 0 ? Math.min(parsed, 120) : 30;
  }, [tableroData?.maxPoles, tableroData?.datosTecnicos?.maxPoles]);
  const circuits = React.useMemo(() => tableroData?.circuits || [], [tableroData?.circuits]);
  const [polesInput, setPolesInput] = useState(() => String(maxPoles));

  useEffect(() => {
    setPolesInput(String(maxPoles));
  }, [maxPoles, tableroData?.id]);

  const isCircuitOccupiedForResize = (c) => {
    if (!c) return false;
    const rawEquipo = (c.equipo || '').trim();
    const hasEquipo = Boolean(rawEquipo && rawEquipo !== 'RESERVA' && rawEquipo !== 'DISPONIBLE');
    const hasBreaker = Boolean(c.breaker && (c.breaker.marca || c.breaker.tipo || c.breaker.amp));
    const hasConductor = Boolean(c.conductor && c.conductor !== 'N/A' && c.conductor !== 'N/D' && c.conductor.trim() !== '');
    const hasFicha = Boolean(c.ficha && (c.ficha.descripcion || c.ficha.potenciaWatts));
    const hasDestino = Boolean(
      c.elementoDestinoId ||
      c.vinculadoId ||
      (c.tipoDestino && c.tipoDestino !== 'RESERVA' && c.tipoDestino !== 'DISPONIBLE')
    );
    return hasEquipo || hasBreaker || hasConductor || hasFicha || Boolean(c.fotografia) || hasDestino;
  };

  const maxOccupiedRealPole = React.useMemo(() => {
    return circuits.reduce((acc, c) => {
      if (!isCircuitOccupiedForResize(c)) return acc;
      const topPole = Math.max(...(c.poles || [c.posicionPolo || 1]));
      return topPole > acc ? topPole : acc;
    }, 0);
  }, [circuits]);

  const normalizedCircuits = React.useMemo(() => {
    if (!tableroData) return [];
    const list = circuits.map(c => {
      const firstPole = Array.isArray(c.poles) && c.poles.length > 0 ? c.poles[0] : 1;
      const customLabel = c.codigoPolo || c.polo_label || c.poloLabel || (tableroData.poleLabels && tableroData.poleLabels[firstPole]) || '';
      return {
        ...c,
        poles: Array.isArray(c.poles) && c.poles.length > 0 ? c.poles : [1],
        breaker: c.breaker || { marca: '', tipo: '', amp: '' },
        codigoPolo: customLabel,
        polo_label: customLabel
      };
    });

    const coveredPoles = new Set();
    list.forEach(c => {
      if (Array.isArray(c.poles)) {
        c.poles.forEach(p => coveredPoles.add(p));
      }
    });

    // Fill in missing poles
    for (let pole = 1; pole <= maxPoles; pole++) {
      if (!coveredPoles.has(pole)) {
        const customLabel = (tableroData.poleLabels && tableroData.poleLabels[pole]) || '';
        list.push({
          id: `auto_${pole}`,
          side: pole % 2 === 1 ? 'left' : 'right',
          poles: [pole],
          equipo: 'RESERVA',
          breaker: { marca: '', tipo: '', amp: '' },
          conductor: '',
          codigoPolo: customLabel,
          polo_label: customLabel
        });
      }
    }

    // Sort circuits by their first pole number
    return list.sort((a, b) => {
      const minA = Array.isArray(a.poles) && a.poles.length > 0 ? Math.min(...a.poles) : 0;
      const minB = Array.isArray(b.poles) && b.poles.length > 0 ? Math.min(...b.poles) : 0;
      return minA - minB;
    });
  }, [circuits, maxPoles, tableroData]);



  if (!tableroData) return <div className="text-center p-8">No hay datos de tablero seleccionados.</div>;

  const {
    id,
    ubicacion,
    alimentadoPor,
    tipo,
    foto,
    fotoBlob,
    barrasPrincipales = {},
    breakerPrincipal = {},
    voltaje = {},
    acometida,
    neutroLlegada = {},
    puestaTierra = {},
    observacionesGenerales = "",
  } = tableroData;

  const rawMontajeFromTipo = (tipo === 'empotrado' || tipo === 'Empotrar / Embutir')
    ? 'Empotrar / Embutir'
    : ((tipo === 'autosoportado' || String(tipo || '').toLowerCase().includes('autosoportado'))
      ? 'Autosoportado (Gabinete de Piso / Switchgear)'
      : 'Superficial');

  const montaje = tableroData.montaje !== undefined
    ? tableroData.montaje
    : (tableroData.datosTecnicos?.montaje !== undefined ? tableroData.datosTecnicos.montaje : rawMontajeFromTipo);

  const capacidadPolos = tableroData.capacidadPolos !== undefined
    ? tableroData.capacidadPolos
    : (tableroData.datosTecnicos?.capacidadPolos !== undefined
      ? tableroData.datosTecnicos.capacidadPolos
      : (tableroData.fases === 1 ? 'Monopolar (1F)' : (tableroData.fases === 2 ? 'Bipolar (2F)' : 'Tripolar (3F)')));

  const usoElectrico = tableroData.usoElectrico !== undefined
    ? tableroData.usoElectrico
    : (tableroData.funcionPrincipal !== undefined
      ? tableroData.funcionPrincipal
      : (tableroData.datosTecnicos?.usoElectrico !== undefined ? tableroData.datosTecnicos.usoElectrico : 'TG (Tablero General)'));

  const nivelHermeticidad = tableroData.nivelHermeticidad !== undefined
    ? tableroData.nivelHermeticidad
    : (tableroData.nemaIp !== undefined
      ? tableroData.nemaIp
      : (tableroData.datosTecnicos?.nivelHermeticidad !== undefined ? tableroData.datosTecnicos.nivelHermeticidad : 'Uso Interior Seco (NEMA 1 / IP20)'));

  // Update multiple fields atomically to avoid stale-closure overwrites
  const updateFields = (updates = {}) => {
    if (effectivelyReadOnly) return;
    const newData = { ...tableroData };
    Object.entries(updates).forEach(([path, value]) => {
      if (path.includes('.')) {
        const [parent, child] = path.split('.');
        newData[parent] = { ...(newData[parent] || {}), [child]: value };
      } else {
        newData[path] = value;
      }
    });
    onUpdateTablero(newData);
  };

  // Update specific fields of the main tablero structure
  const updateField = (path, value) => {
    updateFields({ [path]: value });
  };

  const commitPolesInput = (rawOverride = null) => {
    const raw = String(rawOverride !== null ? rawOverride : (polesInput || '')).trim();
    const parsed = parseInt(raw, 10);
    if (!raw || Number.isNaN(parsed) || parsed < 1) {
      setPolesInput(String(maxPoles));
      return;
    }
    const clamped = Math.max(1, Math.min(120, parsed));
    if (clamped < maxOccupiedRealPole) {
      customAlert(`No se puede reducir la capacidad a ${clamped} polos porque hay circuitos ocupando posiciones hasta el polo ${maxOccupiedRealPole}.`);
      setPolesInput(String(maxPoles));
      return;
    }
    setPolesInput(String(clamped));
    const cleanedCircuits = (tableroData.circuits || []).filter((c) => {
      const topPole = Math.max(...(c.poles || [c.posicionPolo || 1]));
      return topPole <= clamped || isCircuitOccupiedForResize(c);
    });
    updateFields({
      maxPoles: clamped,
      'datosTecnicos.maxPoles': clamped,
      circuits: cleanedCircuits
    });
  };

  // Manejo de fotografía robusto con compresión Base64 y soporte offline multipart
  const handlePhotoSelected = async (file) => {
    if (effectivelyReadOnly || !file) return;
    if (file.size > 10 * 1024 * 1024) {
      customAlert("La imagen seleccionada supera los 10MB. Por favor elija un archivo más liviano.");
      return;
    }
    setIsUploadingPhoto(true);
    try {
      // 1. Compresión instantánea a Base64 para almacenamiento serializable seguro en localforage
      const base64DataUrl = await compressImageToBase64(file);
      onUpdateTablero({
        ...tableroData,
        fotoBlob: file,
        foto: base64DataUrl,
        eliminarFoto: false
      });
      showToast?.("Fotografía del tablero adjuntada con éxito.", "success");
    } catch (err) {
      console.error("Error al procesar fotografía Base64:", err);
      // Fallback seguro usando FileReader nativo
      try {
        const reader = new FileReader();
        reader.onload = (e) => {
          onUpdateTablero({
            ...tableroData,
            fotoBlob: file,
            foto: e.target.result,
            eliminarFoto: false
          });
          showToast?.("Fotografía adjuntada.", "success");
        };
        reader.readAsDataURL(file);
      } catch (fallbackErr) {
        customAlert("No se pudo procesar la imagen seleccionada.");
      }
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  // Eliminación limpia de fotografía con sincronización
  const handleRemovePhoto = async () => {
    if (effectivelyReadOnly) return;
    const isConfirmed = await confirm({
      title: 'Eliminar Fotografía',
      message: '¿Estás seguro de que deseas eliminar la fotografía adjunta de este tablero?',
      confirmText: 'Sí, Eliminar',
      cancelText: 'Cancelar',
      type: 'danger'
    });
    if (isConfirmed) {
      onUpdateTablero({
        ...tableroData,
        fotoBlob: null,
        foto: null,
        eliminarFoto: true
      });
      showToast?.("Fotografía eliminada.", "info");
    }
  };

  // Update a single circuit's properties
  const updateCircuit = (circuitId, field, value) => {
    if (effectivelyReadOnly) return;
    const newData = { ...tableroData };
    let currentCircuits = [...(tableroData.circuits || [])];

    const existingIndex = currentCircuits.findIndex(c => c.id === circuitId);

    if (existingIndex >= 0) {
      const c = currentCircuits[existingIndex];
      let updated;
      if (field.startsWith('breaker.')) {
        const [_, subField] = field.split('.');
        updated = {
          ...c,
          breaker: { ...(c.breaker || {}), [subField]: value }
        };
      } else {
        updated = { ...c, [field]: value };
      }
      currentCircuits[existingIndex] = updated;
    } else {
      const base = normalizedCircuits.find(c => c.id === circuitId);
      if (base) {
        const persistentId = circuitId.startsWith('auto_')
          ? `circ_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`
          : circuitId;
        let updated = {
          ...base,
          id: persistentId
        };
        if (field.startsWith('breaker.')) {
          const [_, subField] = field.split('.');
          updated.breaker = { ...(base.breaker || {}), [subField]: value };
        } else {
          updated[field] = value;
        }
        currentCircuits.push(updated);
      }
    }

    newData.circuits = currentCircuits.filter(c => {
      const isCustom = Boolean(c.id && !String(c.id).startsWith('auto_'));
      const hasBreaker = c.breaker && (c.breaker.marca || c.breaker.tipo || c.breaker.amp);
      const hasConductor = c.conductor && c.conductor !== 'N/A' && c.conductor !== 'N/D' && c.conductor !== '';
      const hasEquipo = c.equipo && c.equipo !== 'RESERVA' && c.equipo !== 'DISPONIBLE';
      const hasFicha = c.ficha && (c.ficha.descripcion || c.ficha.potenciaWatts);
      const isMultiPole = Array.isArray(c.poles) && c.poles.length > 1;
      const hasPoleLabel = !!(c.codigoPolo || c.polo_label || c.poloLabel);
      const hasDestino = !!(c.elementoDestinoId || c.vinculadoId || c.tipoElementoDestino || c.tipoDestino);
      return isCustom || hasBreaker || hasConductor || hasEquipo || c.fotografia || hasDestino || hasFicha || isMultiPole || hasPoleLabel;
    });

    onUpdateTablero(newData);
  };

  // Update or assign a custom pole label / nomenclature
  const handleUpdatePoleLabel = (poleNumber, newLabel) => {
    if (readOnly) return;
    const newData = { ...tableroData };
    let currentCircuits = [...(tableroData.circuits || [])];

    // Actualizar mapa global de etiquetas de polo
    newData.poleLabels = {
      ...(tableroData.poleLabels || {}),
      [poleNumber]: newLabel
    };

    // Buscar si ya existe un circuito que contenga este polo
    const existingIndex = currentCircuits.findIndex(c => Array.isArray(c.poles) && c.poles.includes(poleNumber));

    if (existingIndex >= 0) {
      currentCircuits[existingIndex] = {
        ...currentCircuits[existingIndex],
        codigoPolo: newLabel,
        polo_label: newLabel,
        poloLabel: newLabel
      };
    } else {
      // Si era un polo vacío/auto, crear circuito para persistir su etiqueta personalizada
      currentCircuits.push({
        id: `circ_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        side: poleNumber % 2 === 1 ? 'left' : 'right',
        poles: [poleNumber],
        equipo: 'RESERVA',
        breaker: { marca: '', tipo: '', amp: '' },
        conductor: '',
        codigoPolo: newLabel,
        polo_label: newLabel,
        poloLabel: newLabel
      });
    }

    newData.circuits = currentCircuits.filter(c => {
      const isCustom = Boolean(c.id && !String(c.id).startsWith('auto_'));
      const hasBreaker = c.breaker && (c.breaker.marca || c.breaker.tipo || c.breaker.amp);
      const hasConductor = c.conductor && c.conductor !== 'N/A' && c.conductor !== 'N/D' && c.conductor !== '';
      const hasEquipo = c.equipo && c.equipo !== 'RESERVA' && c.equipo !== 'DISPONIBLE';
      const hasFicha = c.ficha && (c.ficha.descripcion || c.ficha.potenciaWatts);
      const isMultiPole = Array.isArray(c.poles) && c.poles.length > 1;
      const hasPoleLabel = !!(c.codigoPolo || c.polo_label || c.poloLabel);
      return isCustom || hasBreaker || hasConductor || hasEquipo || c.fotografia || c.tipoDestino || c.vinculadoId || hasFicha || isMultiPole || hasPoleLabel;
    });

    onUpdateTablero(newData);
  };

  const saveCircuitFromModal = (circuitId, updatedFields, circuitPoles) => {
    if (effectivelyReadOnly) return;
    const newData = { ...tableroData };
    const projId = project?.id || tableroData?.proyectoId;

    if (updatedFields && (updatedFields.tipoDestino === 'SUB_TABLERO_PENDIENTE' || updatedFields.tipoDestino === 'ELEMENTO_PENDIENTE')) {
      const existingProvId = updatedFields.elementoDestinoId || updatedFields.vinculadoId;
      let prov = null;
      if (existingProvId && project) {
        prov = (project.elementosUnifilares || project.tableros || []).find(e => e.id === existingProvId);
      }
      if (!prov && projId) {
        const polesStr = Array.isArray(updatedFields.poles) && updatedFields.poles.length > 0
          ? updatedFields.poles.join(', ')
          : (updatedFields.posicionPolo || circuitId);

        const provType = updatedFields.tipoElementoProvisional || updatedFields.tipoElementoDestino || 'TABLERO';
        const defaultName = `${provType} Alimentado (Polo ${polesStr})`;
        const provName = updatedFields.nombreProvisional || updatedFields.equipo || defaultName;

        if (addElementoUnifilar) {
          const res = addElementoUnifilar(projId, {
            nombre: provName && provName !== 'RESERVA (Pendiente por Crear)' ? provName : defaultName,
            tipoElemento: provType,
            circuitoOrigen: circuitId
          });
          prov = res?.elemento || null;
        }
      }

      if (prov) {
        updatedFields.vinculadoId = prov.id;
        updatedFields.elementoDestinoId = prov.id;
        updatedFields.tipoElementoDestino = prov.tipoElemento || updatedFields.tipoElementoProvisional || 'TABLERO';
        const provSimpleCode = getSimpleElementCode(prov, prov.tipoElemento || updatedFields.tipoElementoProvisional || 'TABLERO');
        updatedFields.equipo = `${cleanElementName(prov.nombre, prov.id, provSimpleCode)} (${provSimpleCode})`;
        updatedFields.tipoDestino = prov.tipoElemento === 'TABLERO' ? 'SUB_TABLERO' : 'ELEMENTO_VINCULADO';

        const pendingItem = { id: prov.id, nombre: prov.nombre, tipoElemento: prov.tipoElemento, circuitoId: circuitId };
        const filteredPendientes = (elementosPorCrear || []).filter(item => item.circuitoId !== circuitId && item.id !== prov.id);
        const updatedList = [...filteredPendientes, pendingItem];
        setElementosPorCrear(updatedList);
        newData.elementosPorCrear = updatedList;
      } else {
        const provName = updatedFields.nombreProvisional || updatedFields.equipo || 'Sub-Tablero Pendiente';
        updatedFields.equipo = provName;
      }
    }

    let currentCircuits = [...(tableroData.circuits || [])];

    if (updatedFields === null) {
      // CIRUGÍA EXACTA: Eliminar ÚNICAMENTE el circuito o polos seleccionados
      const targetInNormalized = normalizedCircuits.find(c => c.id === circuitId);
      const targetInCurrent = currentCircuits.find(c => c.id === circuitId);
      
      const targetPoleList = Array.isArray(circuitPoles) && circuitPoles.length > 0
        ? circuitPoles
        : (targetInNormalized?.poles || targetInCurrent?.poles || (String(circuitId).startsWith('auto_') ? [parseInt(String(circuitId).replace('auto_', ''), 10)] : []));

      const isAuto = !circuitId || String(circuitId).startsWith('auto_');

      // Filtrar estrictamente solo el circuito que coincida por ID o por sus polos específicos
      currentCircuits = currentCircuits.filter(c => {
        // Coincidencia exacta de ID
        if (circuitId && c.id === circuitId) return false;
        // Si era un auto pole, eliminar el que coincida con los polos del objetivo
        if (isAuto && targetPoleList.length > 0 && Array.isArray(c.poles) && c.poles.some(p => targetPoleList.includes(p))) {
          return false;
        }
        // Si no es auto y tiene coincidencia exacta de polos
        if (!isAuto && targetPoleList.length > 0 && Array.isArray(c.poles) && c.poles.length === targetPoleList.length && c.poles.every(p => targetPoleList.includes(p))) {
          return false;
        }
        return true;
      });

      // Limpiar de elementosPorCrear si este circuito tenía algún pendiente
      if (newData.elementosPorCrear) {
        newData.elementosPorCrear = newData.elementosPorCrear.filter(item => item.circuitoId !== circuitId);
      }
      setElementosPorCrear(prev => (prev || []).filter(item => item.circuitoId !== circuitId));

      newData.circuits = currentCircuits;
    } else {
      const targetPoles = Array.isArray(updatedFields?.poles) && updatedFields.poles.length > 0
        ? updatedFields.poles
        : [updatedFields?.posicionPolo || 1];

      // Find existing circuit if any (by circuitId or by pole overlap)
      const existingCircuit = currentCircuits.find(c => c.id === circuitId || c.poles?.some(p => targetPoles.includes(p)));
      
      // Filter out any previous entries for this circuitId or overlapping poles
      const otherCircuits = currentCircuits.filter(c => c.id !== circuitId && !c.poles?.some(p => targetPoles.includes(p)));

      const persistentId = (existingCircuit && !existingCircuit.id.startsWith('auto_'))
        ? existingCircuit.id
        : (!circuitId.startsWith('auto_') ? circuitId : `circ_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`);

      const savedCircuit = {
        ...(existingCircuit || {}),
        ...updatedFields,
        id: persistentId,
        poles: targetPoles,
        numPolos: targetPoles.length,
        posicionPolo: Math.min(...targetPoles)
      };

      currentCircuits = [...otherCircuits, savedCircuit];
      newData.circuits = currentCircuits;
    }

    onUpdateTablero(newData);
  };

  // Group a pole with the next pole on the same side (maximum 3 poles)
  const groupWithNext = (circuitId) => {
    if (effectivelyReadOnly) return;
    const circuit = normalizedCircuits.find(c => c.id === circuitId);
    if (!circuit) return;

    if (circuit.poles.length >= 3) {
      showToast("El número máximo de polos agrupados es 3.", "warning");
      return;
    }

    const currentMaxPole = Math.max(...circuit.poles);
    const targetPole = currentMaxPole + 2; // Next pole on the same side
    if (targetPole > maxPoles) return;

    // Helper to determine if a circuit is actually occupied by customized data
    const isOccupiedByRealCircuit = (c) => {
      const hasBreaker = c.breaker && (c.breaker.marca || c.breaker.tipo || c.breaker.amp);
      const hasConductor = c.conductor && c.conductor !== 'N/A' && c.conductor !== 'N/D' && c.conductor !== '';
      const hasRealName = c.equipo && c.equipo !== 'RESERVA' && c.equipo !== 'DISPONIBLE' && !c.equipo.startsWith('RESERVA') && !c.equipo.startsWith('DISPONIBLE');
      return hasBreaker || hasConductor || hasRealName || c.fotografia || c.tipoDestino;
    };

    const targetOccupied = (tableroData.circuits || []).find(c => c.id !== circuitId && c.poles.includes(targetPole));
    if (targetOccupied && isOccupiedByRealCircuit(targetOccupied)) {
      registrarConflictoCircuito({
        tableroId: tableroData.id,
        tableroNombre: tableroData.nombre || 'Tablero Eléctrico',
        empresaId: project?.empresaId || project?.companyId || tableroData.empresaId,
        proyectoId: project?.id || tableroData.proyectoId,
        polos: [targetPole],
        circuitoId: circuit.id,
        circuitoNombre: circuit.equipo || `Circuito Polo ${circuit.poles[0]}`,
        equipoExistente: targetOccupied.equipo,
        equipoNuevo: circuit.equipo,
        descripcion: `Unión de polos [${[...circuit.poles, targetPole].join(', ')}] absorbe el polo ${targetPole} ocupado previamente por "${targetOccupied.equipo}".`,
        tipo: 'SOLAPAMIENTO_POLOS'
      });
      showToast(`Conflicto en polo ${targetPole}. Incidencia agregada a la cola.`, 'warning', {
        label: 'Ver Conflicto',
        onClick: () => setPanelConflictosOpen(true)
      });
    }

    const newData = { ...tableroData };
    let existingCircuits = [...(tableroData.circuits || [])];
    
    // If the target pole was occupied by an empty custom circuit, filter it out to absorb it
    if (targetOccupied) {
      existingCircuits = existingCircuits.filter(c => c.id !== targetOccupied.id);
    }

    const targetCircuit = existingCircuits.find(c => c.id === circuitId);
    const newPoles = [...circuit.poles, targetPole].sort((a, b) => a - b);

    if (targetCircuit) {
      newData.circuits = existingCircuits.map(c => {
        if (c.id === circuitId) {
          return { ...c, poles: newPoles, numPolos: newPoles.length };
        }
        return c;
      });
    } else {
      newData.circuits = [
        ...existingCircuits,
        {
          id: `circ_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          side: circuit.side,
          poles: newPoles,
          numPolos: newPoles.length,
          equipo: circuit.equipo || 'RESERVA',
          breaker: circuit.breaker || { marca: '', tipo: '', amp: '' },
          conductor: circuit.conductor || '',
        }
      ];
    }

    onUpdateTablero(newData);
  };

  // Split a multi-pole circuit: preserves the primary circuit on minPole and releases joined poles
  const splitCircuit = (circuitId) => {
    if (effectivelyReadOnly) return;
    const circuit = normalizedCircuits.find(c => c.id === circuitId);
    const newData = { ...tableroData };

    if (circuit && Array.isArray(circuit.poles) && circuit.poles.length > 1) {
      const minPole = Math.min(...circuit.poles);
      const isCustomId = !circuit.id.startsWith('auto_');

      if (isCustomId) {
        newData.circuits = (tableroData.circuits || []).map(c => {
          if (c.id === circuitId) {
            return {
              ...c,
              poles: [minPole],
              numPolos: 1,
              posicionPolo: minPole
            };
          }
          return c;
        });
      } else {
        newData.circuits = (tableroData.circuits || []).filter(c => c.id !== circuitId);
      }

      showToast(`Circuito desacoplado. Se conservaron los datos en el polo principal ${minPole}.`, 'info');
    } else {
      newData.circuits = (tableroData.circuits || []).filter(c => c.id !== circuitId);
    }

    onUpdateTablero(newData);
  };

  // Delete / Reset a circuit back to default RESERVA
  const handleDeleteCircuit = async (circuitId) => {
    if (effectivelyReadOnly) return;
    const circuit = normalizedCircuits.find(c => c.id === circuitId);
    if (!circuit) return;

    const polesStr = Array.isArray(circuit.poles) && circuit.poles.length > 0 
      ? circuit.poles.join(', ') 
      : (circuit.posicionPolo || 'seleccionado');
    const circuitName = circuit.equipo && circuit.equipo !== 'RESERVA' ? `"${circuit.equipo}"` : `del polo [${polesStr}]`;

    const isConfirmed = await confirm({
      title: 'Eliminar Circuito / Carga',
      message: `¿Estás seguro de que deseas eliminar el circuito ${circuitName} asignado al polo / grupo [${polesStr}] y restablecerlo como RESERVA disponible?`,
      confirmText: 'Sí, Eliminar Circuito',
      cancelText: 'Cancelar',
      type: 'danger'
    });

    if (isConfirmed) {
      saveCircuitFromModal(circuitId, null, circuit.poles);
      showToast(`Circuito en polo(s) [${polesStr}] eliminado y restablecido a reserva`, 'success');
    }
  };

  // Split rendering rows into left (odd) and right (even) poles
  const oddPoles = React.useMemo(
    () => Array.from({ length: Math.ceil(maxPoles / 2) }, (_, i) => 2 * i + 1),
    [maxPoles]
  );
  
  // Find circuit by pole number
  const findCircuitByPole = (pole) => {
    return normalizedCircuits.find(c => c.poles.includes(pole));
  };

  // Pre-compute collision-free rowSpan layout for left (odd) and right (even) poles
  const tableRowsLayout = React.useMemo(() => {
    const coveredLeft = new Set();
    const coveredRight = new Set();
    const totalRows = oddPoles.length;

    return oddPoles.map((oddPole, rowIndex) => {
      const evenPole = oddPole + 1;
      const hasEvenPole = evenPole <= maxPoles;
      const cLeft = findCircuitByPole(oddPole);
      const cRight = hasEvenPole ? findCircuitByPole(evenPole) : null;

      let renderLeft = false;
      let rowSpanLeft = 1;
      if (!coveredLeft.has(oddPole)) {
        renderLeft = true;
        let span = 1;
        if (cLeft && Array.isArray(cLeft.poles) && cLeft.poles.length > 1) {
          const sameParityPoles = cLeft.poles.filter(p => p % 2 === 1 && p >= oddPole && p <= maxPoles).sort((a, b) => a - b);
          span = Math.max(1, Math.min(sameParityPoles.length, totalRows - rowIndex));
        }
        rowSpanLeft = span;
        for (let i = 0; i < span; i++) {
          coveredLeft.add(oddPole + i * 2);
        }
      }

      let renderRight = false;
      let rowSpanRight = 1;
      if (hasEvenPole && !coveredRight.has(evenPole)) {
        renderRight = true;
        let span = 1;
        if (cRight && Array.isArray(cRight.poles) && cRight.poles.length > 1) {
          const sameParityPoles = cRight.poles.filter(p => p % 2 === 0 && p >= evenPole && p <= maxPoles).sort((a, b) => a - b);
          span = Math.max(1, Math.min(sameParityPoles.length, totalRows - rowIndex));
        }
        rowSpanRight = span;
        for (let i = 0; i < span; i++) {
          coveredRight.add(evenPole + i * 2);
        }
      }

      return {
        oddPole,
        evenPole,
        hasEvenPole,
        cLeft,
        cRight,
        renderLeft,
        rowSpanLeft,
        renderRight,
        rowSpanRight
      };
    });
  }, [oddPoles, normalizedCircuits, maxPoles]);

  const hasPhoto = Boolean(fotoBlob || foto);
  const tensionActual = tableroData.tension !== undefined
    ? tableroData.tension
    : (tableroData?.datosTecnicos?.tensionNominal !== undefined ? tableroData.datosTecnicos.tensionNominal : '');
  const sheetRef = useRef(null);

  // Motor automático de análisis y optimización para que toda la planilla quepa siempre en 1 sola hoja Carta
  const printOptimization = React.useMemo(() => {
    const totalRows = oddPoles.length; // ej: 8 filas para 16P, 12 para 24P, 15 para 30P, 21 para 42P
    const obsLength = (observacionesGenerales || '').length;
    const obsLines = Math.max(1, Math.ceil(obsLength / 85));

    // Estimar altura de las filas de circuitos según la cantidad de texto y badges en cada fila
    let circuitsEstimatedPx = 38; // Encabezado de 2 niveles de la tabla de circuitos
    tableRowsLayout.forEach(({ cLeft, cRight, renderLeft, rowSpanLeft, renderRight, rowSpanRight }) => {
      let rowBasePx = 22;
      if (renderLeft && cLeft && rowSpanLeft === 1) {
        const hasBadgesL = Boolean(cLeft.vinculadoId || cLeft.elementoDestinoId || (cLeft.tipoDestino && cLeft.tipoDestino !== 'RESERVA'));
        const nameLinesL = Math.ceil(String(cLeft.equipo || '').length / 22);
        const neededL = 8 + nameLinesL * 13 + (hasBadgesL ? 16 : 0);
        if (neededL > rowBasePx) rowBasePx = neededL;
      }
      if (renderRight && cRight && rowSpanRight === 1) {
        const hasBadgesR = Boolean(cRight.vinculadoId || cRight.elementoDestinoId || (cRight.tipoDestino && cRight.tipoDestino !== 'RESERVA'));
        const nameLinesR = Math.ceil(String(cRight.equipo || '').length / 22);
        const neededR = 8 + nameLinesR * 13 + (hasBadgesR ? 16 : 0);
        if (neededR > rowBasePx) rowBasePx = neededR;
      }
      circuitsEstimatedPx += rowBasePx;
    });

    // Verificar también bloques multipolo (2P / 3P) que puedan requerir altura mínima
    tableRowsLayout.forEach(({ cLeft, cRight, renderLeft, rowSpanLeft, renderRight, rowSpanRight }) => {
      if (renderLeft && cLeft && rowSpanLeft > 1) {
        const hasBadgesL = Boolean(cLeft.vinculadoId || cLeft.elementoDestinoId || (cLeft.tipoDestino && cLeft.tipoDestino !== 'RESERVA'));
        const nameLinesL = Math.ceil(String(cLeft.equipo || '').length / 22);
        const neededL = 10 + nameLinesL * 13 + (hasBadgesL ? 18 : 0);
        const allocated = rowSpanLeft * 22;
        if (neededL > allocated) {
          circuitsEstimatedPx += (neededL - allocated) * 0.6;
        }
      }
      if (renderRight && cRight && rowSpanRight > 1) {
        const hasBadgesR = Boolean(cRight.vinculadoId || cRight.elementoDestinoId || (cRight.tipoDestino && cRight.tipoDestino !== 'RESERVA'));
        const nameLinesR = Math.ceil(String(cRight.equipo || '').length / 22);
        const neededR = 10 + nameLinesR * 13 + (hasBadgesR ? 18 : 0);
        const allocated = rowSpanRight * 22;
        if (neededR > allocated) {
          circuitsEstimatedPx += (neededR - allocated) * 0.6;
        }
      }
    });

    const topSectionPx = 245; // Tabla general superior + Ficha Técnica + Barras/Breaker/Voltajes
    const footerSectionPx = 88 + (obsLines - 1) * 14; // Neutro + Tierra + Observaciones
    const signaturesPx = 68; // Bloque de Firmas y Cierre

    const totalEstimatedPx = topSectionPx + circuitsEstimatedPx + footerSectionPx + signaturesPx;
    const singlePageBudgetPx = 940; // Altura útil segura de 1 hoja Carta vertical con márgenes de 6mm

    let density = 'comfortable';
    if (totalRows >= 16 || totalEstimatedPx > 1060) {
      density = 'ultra';
    } else if (totalRows >= 11 || totalEstimatedPx > 880) {
      density = 'compact';
    }

    // Factor de compresión que aporta el modo de densidad CSS
    const densityFactor = density === 'ultra' ? 0.84 : density === 'compact' ? 0.91 : 1.0;
    const adjustedHeightPx = totalEstimatedPx * densityFactor;

    let zoom = 1;
    if (adjustedHeightPx > singlePageBudgetPx) {
      zoom = Math.max(0.65, Number((singlePageBudgetPx / adjustedHeightPx).toFixed(3)));
    }

    return {
      density,
      zoom,
      photoPrintMaxPx: density === 'ultra' ? 135 : density === 'compact' ? 155 : 175
    };
  }, [oddPoles.length, observacionesGenerales, tableRowsLayout]);

  // Ajuste dinámico adicional justo al disparar la impresión del navegador (Ctrl+P o botones PDF)
  useEffect(() => {
    const handleBeforePrint = () => {
      const el = sheetRef.current;
      if (!el) return;
      el.style.setProperty('--tablero-print-zoom', String(printOptimization.zoom));
    };

    window.addEventListener('beforeprint', handleBeforePrint);
    return () => {
      window.removeEventListener('beforeprint', handleBeforePrint);
    };
  }, [printOptimization.zoom]);

  const handleExportDXF = async () => {
    try {
      const tableroId = tableroData?.id;
      if (!tableroId) {
        customAlert("ID de tablero no disponible.");
        return;
      }
      const token = useStore.getState().token || localStorage.getItem('token');
      const headers = {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      };

      let response = await fetch(`${API_BASE_URL}/api/tableros/${tableroId}/dxf`, { headers });

      // Fallback a POST con datos locales si la búsqueda por ID en la BD primaria no lo localiza
      if (!response.ok) {
        response = await fetch(`${API_BASE_URL}/api/tableros/dxf/export-custom`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...headers
          },
          body: JSON.stringify({ tablero: tableroData })
        });
      }

      if (!response.ok) {
        throw new Error(`Error en el servidor (HTTP ${response.status})`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `unifilar_${(tableroData.nombre || 'tablero').replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase()}.dxf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Error al descargar DXF:', err);
      customAlert('No se pudo descargar el archivo DXF: ' + err.message);
    }
  };


  const handlePrintPDF = () => {
    window.print();
  };

  return (
    <div
      ref={sheetRef}
      data-print-density={printOptimization.density}
      style={{ '--tablero-print-zoom': printOptimization.zoom }}
      className={`w-full text-slate-900 dark:text-slate-100 print-card tablero-print-sheet font-sans select-text ${readOnly ? 'pointer-events-none opacity-90' : ''}`}
    >
      
      {/* PLANILLA DEL TABLERO ELÉCTRICO */}
      <div>
        {/* Grilla Superior Dividida: Tabla a la Izquierda, Foto a la Derecha */}
        <div className="grid grid-cols-1 lg:grid-cols-4 print:grid-cols-4 gap-4 print:gap-2 mb-4 print:mb-1.5 items-stretch">
        
        {/* Lado Izquierdo: Tabla General (ocupa 4/4 en PDF si no hay foto adjunta, o 3/4 si hay foto) */}
        <div className={hasPhoto ? 'lg:col-span-3 print:col-span-3' : 'lg:col-span-3 print:col-span-4'}>
          <table className="tablero-main-table w-full border-collapse border-2 border-slate-800 dark:border-slate-700 text-xs table-fixed mb-0">
            <colgroup>
              <col style={{ width: '7%' }} />
              <col style={{ width: '13%' }} />
              <col style={{ width: '14%' }} />
              <col style={{ width: '14%' }} />
              <col style={{ width: '10%' }} />
              <col style={{ width: '12%' }} />
              <col style={{ width: '12%' }} />
              <col style={{ width: '18%' }} />
            </colgroup>
        <tbody>
          {/* Fila 1: Título General y Barra de Acciones */}
          <tr className="tablero-header-bar border-b border-slate-800 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/80">
            <td colSpan={8} className="p-0 font-bold text-sm tracking-wide">
              <div className="flex flex-row items-center justify-between gap-4 py-2.5 px-4 print:py-1 print:px-2.5 uppercase font-bold text-slate-900 dark:text-slate-200 w-full">
                <div className="flex items-center gap-2 min-w-0 flex-wrap">
                  <Zap className="w-4 h-4 text-amber-500 fill-amber-500/20 shrink-0" />
                  <span className="font-mono font-black tracking-wide text-xs sm:text-sm print:text-xs text-slate-950 dark:text-slate-100">
                    {tableroData?.nombre ? cleanElementName(tableroData.nombre, tableroData.id, tableroData.codigo).toUpperCase() : 'INFORMACIÓN GENERAL DE PANEL ELÉCTRICO / TABLERO'}
                  </span>
                  <div className="flex items-center gap-1.5 shrink-0 ml-1 flex-wrap">
                    <span className="tablero-badge-amber inline-flex items-center font-mono font-bold text-xs print:text-[9.5px] bg-amber-500/10 text-amber-400 border border-amber-500/30 px-2.5 py-0.5 print:px-2 print:py-0 rounded-lg shadow-sm">
                      ID: {getElementCode(tableroData, 'TABLERO')}
                    </span>
                    <span className="tablero-badge-sky inline-flex items-center font-mono font-bold text-xs print:text-[9.5px] bg-sky-500/10 text-sky-400 border border-sky-500/30 px-2.5 py-0.5 print:px-2 print:py-0 rounded-lg shadow-sm">
                      ⚡ Pot. Estimada: {calcularPotenciaEstimadaTablero(tableroData).texto}
                    </span>
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => setIsEditIdModalOpen(true)}
                        className="no-print p-1 bg-slate-900 hover:bg-amber-500 text-slate-400 hover:text-slate-950 border border-slate-700/80 hover:border-amber-400 rounded-md transition-all shadow-sm cursor-pointer"
                        title="Editar ID del elemento (Solo Administradores)"
                      >
                        <Edit3 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 no-print">
                  {/* Botón Modo Seguro / Editar Planilla (Obs Fase 2) */}
                  {!readOnly && (
                    <button
                      type="button"
                      onClick={() => {
                        const next = !isEditable;
                        setIsEditable(next);
                        showToast(
                          next 
                            ? 'Planilla desbloqueada. Los campos ahora son editables.' 
                            : 'Modo Seguro activado. Planilla protegida contra toques accidentales.',
                          next ? 'success' : 'info'
                        );
                      }}
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer border ${
                        isEditable 
                          ? 'bg-amber-500 hover:bg-amber-600 text-slate-950 border-amber-400 ring-2 ring-amber-400/30' 
                          : 'bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border-emerald-500/40'
                      }`}
                      title={isEditable ? 'Planilla desbloqueada. Haz clic para bloquear en Modo Seguro.' : 'Modo Seguro activo. Haz clic para editar la planilla.'}
                    >
                      {isEditable ? (
                        <>
                          <Pencil className="w-3.5 h-3.5 text-slate-950" />
                          <span>Bloquear Planilla</span>
                        </>
                      ) : (
                        <>
                          <Shield className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Editar Planilla</span>
                        </>
                      )}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleExportDXF}
                    className="flex items-center gap-1.5 px-2.5 py-1 bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-400 border border-cyan-500/40 rounded-lg text-xs font-bold transition cursor-pointer"
                    title="Descargar diagrama unifilar en formato AutoCAD DXF"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Descargar DXF</span>
                  </button>
                  <button
                    type="button"
                    onClick={handlePrintPDF}
                    className="flex items-center gap-1.5 px-2.5 py-1 bg-violet-600/20 hover:bg-violet-600/30 text-violet-400 border border-violet-500/40 rounded-lg text-xs font-bold transition cursor-pointer"
                    title="Imprimir o guardar como PDF"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Imprimir / PDF</span>
                  </button>
                </div>
              </div>
            </td>
          </tr>

          {/* Fila 2: Ubicación */}
          <tr className="border-b border-slate-800 dark:border-slate-700">
            <td colSpan={2} className="tablero-label-cell p-2 print:py-1 print:px-2 bg-slate-50 dark:bg-slate-800/40 font-bold border-r border-slate-800 dark:border-slate-700 uppercase text-[11px] print:text-[10px]">
              Ubicación:
            </td>
            <td colSpan={6} className="p-0 font-semibold">
              <EditableCell
                value={ubicacion}
                onSave={(val) => updateField('ubicacion', val)}
                placeholder="Indique la ubicación física detallada del tablero..."
                disabled={effectivelyReadOnly}
                className="px-3 print:py-1 print:px-2"
              />
            </td>
          </tr>

          {/* Fila 3: Alimentado Por Jerárquico Dinámico */}
          <tr className="border-b border-slate-800 dark:border-slate-700">
            <td colSpan={2} className="tablero-label-cell p-2.5 print:py-1 print:px-2 bg-slate-50 dark:bg-slate-800/40 font-bold border-r border-slate-800 dark:border-slate-700 uppercase text-[11px] print:text-[10px]">
              Alimentado Por:
            </td>
            <td colSpan={6} className="p-2.5 print:py-1 print:px-2 font-medium">
              <div className="no-print">
                <SelectorAlimentadorJerarquico
                  proyectoId={project?.id}
                  tableroActualId={tableroData?.id}
                  elementosList={todosElementosCreados}
                  value={alimentadoPor}
                  disabled={effectivelyReadOnly}
                  multiple={false}
                  tipoElementoActual="TABLERO"
                  direccionRelacion="ALIMENTADO_POR"
                  onChange={(val, selectedObj) => {
                    const upperVal = val ? val.toUpperCase() : '';
                    const alimentadorId = selectedObj?.id || null;
                    updateFields({
                      alimentadoPor: upperVal,
                      alimentadoPorId: alimentadorId,
                      'datosTecnicos.alimentadoPorId': alimentadorId,
                      'datosTecnicos.alimentadorId': selectedObj?.tipoElemento === 'ALIMENTADOR' ? selectedObj.id : alimentadorId
                    });
                    updateTableroAlimentador(project?.id, tableroData.id, alimentadorId);
                  }}
                  label=""
                  placeholder="Seleccionar Subestación, Transformador, Generador, CCM o Acometida..."
                />
              </div>
              <div className="hidden print:block font-mono font-bold text-slate-950 text-[10.5px] leading-tight">
                {alimentadoPor ? String(alimentadoPor).toUpperCase() : '—'}
              </div>
            </td>
          </tr>

          {/* Fila: FICHA TÉCNICA - Clasificación Completa del Tablero */}
          <tr className="border-b border-slate-800 dark:border-slate-700 bg-slate-900/40">
            <td colSpan={2} className="tablero-amber-header p-2.5 print:py-1.5 print:px-2 bg-slate-50 dark:bg-slate-800/60 font-black border-r border-slate-800 dark:border-slate-700 uppercase tracking-wider text-amber-500 font-mono text-[11px] print:text-[10px] align-middle">
              FICHA TÉCNICA
            </td>
            <td colSpan={6} className="p-3 print:p-1.5 font-medium">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 print:grid-cols-3 gap-3 print:gap-1.5 text-xs">
                
                {/* 1. Uso Eléctrico (Escritura Libre con Sugerencias) */}
                <div className="tablero-ficha-card flex flex-col gap-1 print:gap-0.5 bg-slate-950/60 p-2 print:py-1 print:px-1.5 rounded-lg border border-slate-800">
                  <span className="tablero-ficha-label text-[10px] print:text-[8.5px] text-amber-400 uppercase font-bold tracking-wider leading-tight">Uso Eléctrico:</span>
                  <input
                    type="text"
                    list="tablero-uso-electrico-list"
                    value={usoElectrico}
                    disabled={effectivelyReadOnly}
                    onChange={(e) => {
                      const val = e.target.value;
                      updateFields({
                        usoElectrico: val,
                        funcionPrincipal: val,
                        'datosTecnicos.usoElectrico': val
                      });
                    }}
                    onBlur={(e) => {
                      const v = e.target.value?.trim();
                      if (v) saveCustomOption('tablero_uso_electrico', v, TABLERO_USO_ELECTRICO);
                    }}
                    placeholder="Ej: TG (Tablero General)"
                    className="no-print bg-slate-900 text-slate-100 font-semibold border border-slate-700 rounded px-2 py-1 text-[11px] focus:outline-none focus:border-amber-500 w-full disabled:opacity-60 disabled:cursor-not-allowed"
                  />
                  <datalist id="tablero-uso-electrico-list">
                    {getCustomOptions('tablero_uso_electrico', TABLERO_USO_ELECTRICO).map(opt => (
                      <option key={opt} value={opt} />
                    ))}
                  </datalist>
                  <div className="hidden print:block text-[9.5px] font-bold text-slate-950 leading-tight break-words">
                    {usoElectrico || '—'}
                  </div>
                </div>

                {/* 2. Capacidad / Alimentación (Escritura Libre con Sugerencias) */}
                <div className="tablero-ficha-card flex flex-col gap-1 print:gap-0.5 bg-slate-950/60 p-2 print:py-1 print:px-1.5 rounded-lg border border-slate-800">
                  <span className="tablero-ficha-label text-[10px] print:text-[8.5px] text-amber-400 uppercase font-bold tracking-wider leading-tight">Capacidad (Alimentación):</span>
                  <input
                    type="text"
                    list="tablero-capacidad-polos-list"
                    value={capacidadPolos}
                    disabled={effectivelyReadOnly}
                    onChange={(e) => {
                      const val = e.target.value;
                      const lower = val.toLowerCase();
                      let f = tableroData.fases || 3;
                      if (lower.includes('1f') || lower.includes('monopolar')) f = 1;
                      else if (lower.includes('2f') || lower.includes('bipolar')) f = 2;
                      else if (lower.includes('3f') || lower.includes('tripolar')) f = 3;
                      updateFields({
                        capacidadPolos: val,
                        fases: f,
                        'datosTecnicos.capacidadPolos': val,
                        'datosTecnicos.fases': f
                      });
                    }}
                    onBlur={(e) => {
                      const v = e.target.value?.trim();
                      if (v) saveCustomOption('tablero_capacidad_polos', v, TABLERO_CAPACIDADES_POLOS);
                    }}
                    placeholder="Ej: Tripolar (3F)"
                    className="no-print bg-slate-900 text-slate-100 font-semibold border border-slate-700 rounded px-2 py-1 text-[11px] focus:outline-none focus:border-amber-500 w-full disabled:opacity-60 disabled:cursor-not-allowed"
                  />
                  <datalist id="tablero-capacidad-polos-list">
                    {getCustomOptions('tablero_capacidad_polos', TABLERO_CAPACIDADES_POLOS).map(opt => (
                      <option key={opt} value={opt} />
                    ))}
                  </datalist>
                  <div className="hidden print:block text-[9.5px] font-bold text-slate-950 leading-tight break-words">
                    {capacidadPolos || '—'}
                  </div>
                </div>

                {/* 3. Cantidad de Polos (Campo Numérico Editable Libre + Sugerencias) */}
                <div className="tablero-ficha-card flex flex-col gap-1 print:gap-0.5 bg-slate-950/60 p-2 print:py-1 print:px-1.5 rounded-lg border border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="tablero-ficha-label text-[10px] print:text-[8.5px] text-amber-400 uppercase font-bold tracking-wider leading-tight">Cantidad Polos:</span>
                    <span className="no-print font-mono text-amber-500 font-bold text-[10px]">{maxPoles} P</span>
                  </div>
                  <input
                    type="text"
                    inputMode="numeric"
                    list="tablero-cantidad-polos-list"
                    value={polesInput}
                    disabled={effectivelyReadOnly}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/\D/g, '');
                      setPolesInput(raw);
                      if (!raw) return;
                      const parsed = parseInt(raw, 10);
                      if (!Number.isNaN(parsed) && parsed >= 1 && parsed <= 120 && parsed >= maxOccupiedRealPole) {
                        updateFields({
                          maxPoles: parsed,
                          'datosTecnicos.maxPoles': parsed
                        });
                      }
                    }}
                    onBlur={() => commitPolesInput()}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        commitPolesInput();
                        e.currentTarget.blur();
                      } else if (e.key === 'Escape') {
                        setPolesInput(String(maxPoles));
                        e.currentTarget.blur();
                      }
                    }}
                    placeholder="Ej: 3, 20, 30, 42..."
                    className="no-print bg-slate-900 text-slate-100 font-mono font-bold border border-slate-700 rounded px-2 py-1 text-[11px] focus:outline-none focus:border-amber-500 w-full disabled:opacity-60 disabled:cursor-not-allowed"
                  />
                  <datalist id="tablero-cantidad-polos-list">
                    {Array.from(new Set([3, 4, 6, 8, 12, ...TABLERO_CANTIDAD_POLOS_ESTANDAR, 20, 30, 32, 48, 54, 72, 84]))
                      .sort((a, b) => a - b)
                      .map((opt) => (
                        <option key={opt} value={String(opt)}>{opt} Polos</option>
                      ))}
                  </datalist>
                  <div className="hidden print:block text-[9.5px] font-bold font-mono text-slate-950 leading-tight">
                    {maxPoles} Polos ({maxPoles} P)
                  </div>
                </div>

                {/* 4. Montaje y Accesibilidad (Escritura Libre con Sugerencias) */}
                <div className="tablero-ficha-card flex flex-col gap-1 print:gap-0.5 bg-slate-950/60 p-2 print:py-1 print:px-1.5 rounded-lg border border-slate-800">
                  <span className="tablero-ficha-label text-[10px] print:text-[8.5px] text-amber-400 uppercase font-bold tracking-wider leading-tight">Montaje:</span>
                  <input
                    type="text"
                    list="tablero-montaje-list"
                    value={montaje}
                    disabled={effectivelyReadOnly}
                    onChange={(e) => {
                      const val = e.target.value;
                      let t = 'superficial';
                      if (val.toLowerCase().includes('empotrar') || val.toLowerCase().includes('embutir')) t = 'empotrado';
                      else if (val.toLowerCase().includes('autosoportado')) t = 'autosoportado';
                      updateFields({
                        montaje: val,
                        tipo: t,
                        'datosTecnicos.montaje': val,
                        'datosTecnicos.tipo': t
                      });
                    }}
                    onBlur={(e) => {
                      const v = e.target.value?.trim();
                      if (v) saveCustomOption('tablero_montaje', v, TABLERO_MONTAJE_OPCIONES);
                    }}
                    placeholder="Ej: Superficial"
                    className="no-print bg-slate-900 text-slate-100 font-semibold border border-slate-700 rounded px-2 py-1 text-[11px] focus:outline-none focus:border-amber-500 w-full disabled:opacity-60 disabled:cursor-not-allowed"
                  />
                  <datalist id="tablero-montaje-list">
                    {getCustomOptions('tablero_montaje', TABLERO_MONTAJE_OPCIONES).map(opt => (
                      <option key={opt} value={opt} />
                    ))}
                  </datalist>
                  <div className="hidden print:block text-[9.5px] font-bold text-slate-950 leading-tight break-words">
                    {montaje || '—'}
                  </div>
                </div>

                {/* 5. Nivel de Hermeticidad (Escritura Libre con Sugerencias) */}
                <div className="tablero-ficha-card flex flex-col gap-1 print:gap-0.5 bg-slate-950/60 p-2 print:py-1 print:px-1.5 rounded-lg border border-slate-800">
                  <span className="tablero-ficha-label text-[10px] print:text-[8.5px] text-amber-400 uppercase font-bold tracking-wider leading-tight">Hermeticidad:</span>
                  <input
                    type="text"
                    list="tablero-hermeticidad-list"
                    value={nivelHermeticidad}
                    disabled={effectivelyReadOnly}
                    onChange={(e) => {
                      const val = e.target.value;
                      updateFields({
                        nivelHermeticidad: val,
                        nemaIp: val,
                        'datosTecnicos.nivelHermeticidad': val
                      });
                    }}
                    onBlur={(e) => {
                      const v = e.target.value?.trim();
                      if (v) saveCustomOption('tablero_hermeticidad', v, TABLERO_HERMETICIDAD_NEMA_IP);
                    }}
                    placeholder="Ej: NEMA 1 / IP20"
                    className="no-print bg-slate-900 text-slate-100 font-semibold border border-slate-700 rounded px-2 py-1 text-[11px] focus:outline-none focus:border-amber-500 w-full disabled:opacity-60 disabled:cursor-not-allowed"
                  />
                  <datalist id="tablero-hermeticidad-list">
                    {getCustomOptions('tablero_hermeticidad', TABLERO_HERMETICIDAD_NEMA_IP).map(opt => (
                      <option key={opt} value={opt} />
                    ))}
                  </datalist>
                  <div className="hidden print:block text-[9.5px] font-bold text-slate-950 leading-tight break-words">
                    {nivelHermeticidad || '—'}
                  </div>
                </div>

                {/* 6. Tensión Nominal (COVENIN 159:1997) */}
                <div className="tablero-ficha-card flex flex-col gap-1 print:gap-0.5 bg-slate-950/60 p-2 print:py-1 print:px-1.5 rounded-lg border border-slate-800">
                  <span className="tablero-ficha-label text-[10px] print:text-[8.5px] text-amber-400 uppercase font-bold tracking-wider leading-tight">Tensión (COVENIN):</span>
                  <input
                    type="text"
                    list="covenin-voltajes-tablero"
                    value={tensionActual}
                    disabled={effectivelyReadOnly}
                    onChange={(e) => {
                      const val = e.target.value;
                      updateFields({
                        tension: val,
                        'datosTecnicos.tensionNominal': val
                      });
                    }}
                    onBlur={() => {
                      if (tableroData.tension) {
                        saveCustomOption('tensiones_bt', tableroData.tension, TENSIONES_COVENIN_159_BT);
                        saveCustomOption('tensiones_todas', tableroData.tension);
                      }
                    }}
                    placeholder="Ej: 208Y/120 V"
                    className="no-print bg-slate-900 text-slate-100 font-bold border border-slate-700 rounded px-2 py-1 text-[11px] focus:outline-none focus:border-amber-500 font-mono w-full disabled:opacity-60 disabled:cursor-not-allowed"
                  />
                  <datalist id="covenin-voltajes-tablero">
                    {getCustomOptions('tensiones_bt', TENSIONES_COVENIN_159_BT).map(v => <option key={v} value={v}>{v}</option>)}
                  </datalist>
                  <div className="hidden print:block text-[9.5px] font-bold font-mono text-slate-950 leading-tight break-words">
                    {tensionActual || '—'}
                  </div>
                </div>

              </div>
            </td>
          </tr>

          {/* Fila 4: Encabezados de Parámetros, Breaker Principal y Voltajes (Fase y Línea) */}
          <tr className="tablero-section-row border-b border-slate-800 dark:border-slate-700 text-center font-bold bg-slate-50 dark:bg-slate-800/60 text-[11px] print:text-[10px]">
            <td colSpan={2} className="tablero-label-cell border-r border-slate-800 dark:border-slate-700 p-2 print:py-1 uppercase font-extrabold text-slate-800 dark:text-slate-300">
              Barras Principales
            </td>
            <td colSpan={3} className="tablero-amber-header border-r border-slate-800 dark:border-slate-700 p-2 print:py-1 uppercase font-extrabold text-amber-500 dark:text-amber-400">
              BREAKER PRINCIPAL
            </td>
            <td colSpan={2} className="tablero-sky-header border-r border-slate-800 dark:border-slate-700 p-1.5 print:py-1 uppercase font-extrabold text-sky-600 dark:text-sky-400">
              Voltajes
            </td>
            <td className="tablero-label-cell p-1.5 print:py-1 uppercase font-extrabold text-slate-800 dark:text-slate-300">
              Acometida
            </td>
          </tr>

          {/* Fila 5: Sub-encabezados de Breaker y Voltajes */}
          <tr className="tablero-subheader-row border-b border-slate-800 dark:border-slate-700 text-center font-bold text-[10px] print:text-[9px] bg-slate-100 dark:bg-slate-800/80">
            <td colSpan={2} className="border-r border-slate-800 dark:border-slate-700 py-1 print:py-0.5 px-1">FASE / AMPERIOS</td>
            <td className="border-r border-slate-800 dark:border-slate-700 py-1 print:py-0.5 px-1">MARCA</td>
            <td className="border-r border-slate-800 dark:border-slate-700 py-1 print:py-0.5 px-1">TIPO</td>
            <td className="border-r border-slate-800 dark:border-slate-700 py-1 print:py-0.5 px-1">AMP</td>
            <td className="border-r border-slate-800 dark:border-slate-700 py-1 print:py-0.5 px-1 text-sky-600 dark:text-sky-400 font-mono">V (F-N)</td>
            <td className="border-r border-slate-800 dark:border-slate-700 py-1 print:py-0.5 px-1 text-amber-600 dark:text-amber-400 font-mono">V (L-L)</td>
            <td className="py-1 print:py-0.5 px-1">CALIBRE / DETALLES</td>
          </tr>

          {/* Fila 6 (IA) */}
          <tr className="border-b border-slate-800 dark:border-slate-700">
            <td className="tablero-label-cell text-center bg-slate-50 dark:bg-slate-800/30 border-r border-slate-800 dark:border-slate-700 font-bold font-mono">IA</td>
            <td className="p-0 border-r border-slate-800 dark:border-slate-700 text-center">
              <EditableCell
                value={barrasPrincipales.ia}
                onSave={(val) => updateField('barrasPrincipales.ia', val)}
                category="barras_amperios"
                options={BARRAS_AMP_OPTIONS}
                placeholder="Ej: 225A"
                disabled={effectivelyReadOnly}
                className="text-center font-mono"
              />
            </td>
            {/* Breaker Principal Marca (spans 3 rows) */}
            <td rowSpan={3} className="tablero-amber-cell p-0 border-r border-slate-800 dark:border-slate-700 text-center align-middle font-bold bg-amber-500/5">
              <EditableCell
                value={breakerPrincipal.marca}
                onSave={(val) => updateField('breakerPrincipal.marca', val)}
                type="select"
                category="marcas_breaker"
                options={MARCA_OPTIONS}
                placeholder="Marca"
                disabled={effectivelyReadOnly}
                className="text-center font-bold"
              />
            </td>
            {/* Breaker Principal Tipo (spans 3 rows) */}
            <td rowSpan={3} className="tablero-amber-cell p-0 border-r border-slate-800 dark:border-slate-700 text-center align-middle bg-amber-500/5">
              <EditableCell
                value={breakerPrincipal.tipo}
                onSave={(val) => updateField('breakerPrincipal.tipo', val)}
                type="select"
                category="tipos_breaker"
                options={TIPO_OPTIONS}
                placeholder="Tipo"
                disabled={effectivelyReadOnly}
                className="text-center font-semibold"
              />
            </td>
            {/* Breaker Principal Amp (spans 3 rows) */}
            <td rowSpan={3} className="tablero-amber-cell p-0 border-r border-slate-800 dark:border-slate-700 text-center align-middle font-bold bg-amber-500/5">
              <EditableCell
                value={breakerPrincipal.amp}
                onSave={(val) => updateField('breakerPrincipal.amp', val)}
                type="select"
                category="breaker_amperios"
                options={AMP_OPTIONS}
                placeholder="Ej: 225A"
                disabled={effectivelyReadOnly}
                className="text-center font-mono font-bold text-amber-600 dark:text-amber-400"
              />
            </td>
            {/* Voltaje Fase Va */}
            <td className="tablero-sky-cell p-0 border-r border-slate-800 dark:border-slate-700 text-center">
              <EditableCell
                value={voltaje.va}
                onSave={(val) => updateField('voltaje.va', val)}
                category="voltajes_fn"
                options={VOLTAJE_FN_OPTIONS}
                placeholder="Ej: 120 V"
                disabled={effectivelyReadOnly}
                className="text-center font-mono"
              />
            </td>
            {/* Voltaje Línea Vab */}
            <td className="tablero-amber-cell p-0 border-r border-slate-800 dark:border-slate-700 text-center bg-slate-50/30 dark:bg-slate-900/20">
              <EditableCell
                value={voltaje.vab}
                onSave={(val) => updateField('voltaje.vab', val)}
                category="voltajes_ll"
                options={VOLTAJE_LL_OPTIONS}
                placeholder="Ej: 208 V"
                disabled={effectivelyReadOnly}
                className="text-center font-mono font-bold text-amber-600 dark:text-amber-400"
              />
            </td>
            {/* Acometida (spans 3 rows) */}
            <td rowSpan={3} className="tablero-sky-cell p-0 text-center align-middle font-bold bg-slate-50/50 dark:bg-slate-900/30">
              <EditableCell
                value={acometida}
                onSave={(val) => updateField('acometida', val)}
                category="calibres_acometida"
                options={ACOMETIDA_OPTIONS}
                placeholder="3X 3/0..."
                disabled={effectivelyReadOnly}
                className="text-center font-mono font-bold text-blue-600 dark:text-blue-400"
              />
            </td>
          </tr>

          {/* Fila 7 (IB) */}
          <tr className="border-b border-slate-800 dark:border-slate-700">
            <td className="tablero-label-cell text-center bg-slate-50 dark:bg-slate-800/30 border-r border-slate-800 dark:border-slate-700 font-bold font-mono">IB</td>
            <td className="p-0 border-r border-slate-800 dark:border-slate-700 text-center">
              <EditableCell
                value={barrasPrincipales.ib}
                onSave={(val) => updateField('barrasPrincipales.ib', val)}
                category="barras_amperios"
                options={BARRAS_AMP_OPTIONS}
                placeholder="Ej: 225A"
                disabled={effectivelyReadOnly}
                className="text-center font-mono"
              />
            </td>
            {/* Voltaje Fase Vb */}
            <td className="tablero-sky-cell p-0 border-r border-slate-800 dark:border-slate-700 text-center">
              <EditableCell
                value={voltaje.vb}
                onSave={(val) => updateField('voltaje.vb', val)}
                category="voltajes_fn"
                options={VOLTAJE_FN_OPTIONS}
                placeholder="Ej: 120 V"
                disabled={effectivelyReadOnly}
                className="text-center font-mono"
              />
            </td>
            {/* Voltaje Línea Vbc */}
            <td className="tablero-amber-cell p-0 border-r border-slate-800 dark:border-slate-700 text-center bg-slate-50/30 dark:bg-slate-900/20">
              <EditableCell
                value={voltaje.vbc}
                onSave={(val) => updateField('voltaje.vbc', val)}
                category="voltajes_ll"
                options={VOLTAJE_LL_OPTIONS}
                placeholder="Ej: 208 V"
                disabled={effectivelyReadOnly}
                className="text-center font-mono font-bold text-amber-600 dark:text-amber-400"
              />
            </td>
          </tr>

          {/* Fila 8 (IC) */}
          <tr>
            <td className="tablero-label-cell text-center bg-slate-50 dark:bg-slate-800/30 border-r border-slate-800 dark:border-slate-700 font-bold font-mono">IC</td>
            <td className="p-0 border-r border-slate-800 dark:border-slate-700 text-center">
              <EditableCell
                value={barrasPrincipales.ic}
                onSave={(val) => updateField('barrasPrincipales.ic', val)}
                category="barras_amperios"
                options={BARRAS_AMP_OPTIONS}
                placeholder="Ej: 225A"
                disabled={effectivelyReadOnly}
                className="text-center font-mono"
              />
            </td>
            {/* Voltaje Fase Vc */}
            <td className="tablero-sky-cell p-0 border-r border-slate-800 dark:border-slate-700 text-center">
              <EditableCell
                value={voltaje.vc}
                onSave={(val) => updateField('voltaje.vc', val)}
                category="voltajes_fn"
                options={VOLTAJE_FN_OPTIONS}
                placeholder="Ej: 120 V"
                disabled={effectivelyReadOnly}
                className="text-center font-mono"
              />
            </td>
            {/* Voltaje Línea Vca */}
            <td className="tablero-amber-cell p-0 border-r border-slate-800 dark:border-slate-700 text-center bg-slate-50/30 dark:bg-slate-900/20">
              <EditableCell
                value={voltaje.vca}
                onSave={(val) => updateField('voltaje.vca', val)}
                category="voltajes_ll"
                options={VOLTAJE_LL_OPTIONS}
                placeholder="Ej: 208 V"
                disabled={effectivelyReadOnly}
                className="text-center font-mono font-bold text-amber-600 dark:text-amber-400"
              />
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    {/* Lado Derecho (1/4 de ancho): Foto de Inspección */}
    <div 
      className={`tablero-photo-box md:col-span-1 print:col-span-1 border-2 border-slate-800 dark:border-slate-700 bg-slate-950/40 rounded-lg print:rounded-none p-3 print:p-1.5 flex flex-col justify-between h-full print:min-h-0 ${!hasPhoto ? 'no-print' : ''}`}
      style={{ minHeight: `${tableroData.fotoScale || 220}px` }}
    >
      <div>
        <div className="flex items-center gap-1.5 text-[10px] print:text-[9px] font-bold text-slate-400 print:text-slate-900 uppercase tracking-wider mb-2 print:mb-1">
          <Camera className="w-3.5 h-3.5 text-amber-500" />
          <span>Foto de Inspección</span>
        </div>
        
        {isUploadingPhoto ? (
          <div 
            className="rounded overflow-hidden border border-slate-800 bg-slate-900 flex flex-col items-center justify-center gap-2 p-4 text-center shadow w-full"
            style={{ height: `${tableroData.fotoScale || 220}px` }}
          >
            <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
            <span className="text-[11px] font-bold text-amber-300">Optimizando imagen...</span>
            <span className="text-[9px] text-slate-400 font-mono">Comprimiendo para almacenamiento offline</span>
          </div>
        ) : (fotoBlob || foto) ? (
          <div 
            className="tablero-photo-frame relative rounded overflow-hidden border border-slate-800 bg-slate-900 flex items-center justify-center group shadow w-full"
            style={{ height: `${tableroData.fotoScale || 220}px` }}
          >
            <SafeImage 
              blob={fotoBlob instanceof Blob || fotoBlob instanceof File ? fotoBlob : null} 
              src={foto || (typeof fotoBlob === 'string' ? fotoBlob : null)} 
              alt="Inspección del tablero" 
              className="w-full h-full object-cover" 
              style={{ maxHeight: `${tableroData.fotoScale || 220}px` }}
            />
            {!effectivelyReadOnly && (
              <button
                type="button"
                onClick={handleRemovePhoto}
                className="no-print absolute top-1.5 right-1.5 p-1.5 bg-red-600/90 hover:bg-red-500 text-white rounded-lg cursor-pointer transition-all shadow-md active:scale-95"
                title="Eliminar foto del tablero"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-2 p-1 no-print">
            <label className={`flex items-center justify-center gap-1.5 w-full py-2.5 px-3 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/40 rounded-xl text-xs font-bold transition-all shadow-sm ${effectivelyReadOnly ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer active:scale-95'}`}>
              <Camera className="w-4 h-4 text-amber-400" />
              <span>Cámara en Vivo</span>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                disabled={effectivelyReadOnly}
                onChange={(e) => {
                  const file = e.target.files && e.target.files[0];
                  if (file) handlePhotoSelected(file);
                }}
                className="hidden"
              />
            </label>
            <label className={`flex items-center justify-center gap-1.5 w-full py-2.5 px-3 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-750 rounded-xl text-xs font-semibold transition-all ${effectivelyReadOnly ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer active:scale-95'}`}>
              <Image className="w-4 h-4 text-slate-400" />
              <span>Galería / Archivos</span>
              <input
                type="file"
                accept="image/*"
                disabled={effectivelyReadOnly}
                onChange={(e) => {
                  const file = e.target.files && e.target.files[0];
                  if (file) handlePhotoSelected(file);
                }}
                className="hidden"
              />
            </label>
          </div>
        )}

        {/* Slider de ajuste de tamaño (solo visible si hay foto y en pantalla) */}
        {(fotoBlob || foto) && (
          <div className="no-print mt-3 pt-3 border-t border-slate-850 space-y-1.5">
            <div className="flex justify-between items-center text-[9px] font-bold text-slate-400 uppercase">
              <span>Ajustar tamaño en PDF</span>
              <span className="text-amber-500 font-mono">{tableroData.fotoScale || 220}px</span>
            </div>
            <input
              type="range"
              min="120"
              max="350"
              value={tableroData.fotoScale || 220}
              onChange={(e) => updateField('fotoScale', parseInt(e.target.value))}
              className="w-full h-1 bg-slate-850 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
          </div>
        )}
      </div>
      
      <div className="text-[9px] text-slate-500 mt-2 leading-relaxed border-t border-slate-900 pt-2 no-print">
        Sube o captura la foto del cableado/gabinete para documentar el tablero.
      </div>
    </div>

  </div>

      {/* 2. GRID DE CIRCUITOS (SIMETRÍA COMPLETA) */}
      <div className="overflow-x-auto print:overflow-visible">
        <table className="tablero-circuits-table w-full border-collapse border-2 border-slate-800 dark:border-slate-700 border-t-0 print:border-t-2 text-[10px] md:text-[11px] table-fixed min-w-[750px] print:min-w-0 print:w-full">
          <colgroup>
            <col style={{ width: '21%' }} />
            <col style={{ width: '7.5%' }} />
            <col style={{ width: '6.5%' }} />
            <col style={{ width: '5.5%' }} />
            <col style={{ width: '5.5%' }} />
            <col style={{ width: '4%' }} />
            <col style={{ width: '4%' }} />
            <col style={{ width: '5.5%' }} />
            <col style={{ width: '5.5%' }} />
            <col style={{ width: '6.5%' }} />
            <col style={{ width: '7.5%' }} />
            <col style={{ width: '21%' }} />
          </colgroup>
          <thead>
            {/* Encabezado Nivel 1 */}
            <tr className="tablero-header-bar border-b border-slate-800 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-center font-extrabold text-xs print:text-[10px]">
              <th rowSpan={2} className="border-r border-slate-800 dark:border-slate-700 p-2 print:py-1 print:px-1.5">EQUIPO QUE ALIMENTA</th>
              <th colSpan={3} className="tablero-amber-header border-r border-slate-800 dark:border-slate-700 p-1 print:py-0.5">PROTECCIÓN (BREAKER)</th>
              <th rowSpan={2} className="border-r border-slate-800 dark:border-slate-700 p-2 print:py-1 print:px-1">COND.</th>
              <th rowSpan={2} className="tablero-pole-header border-r-2 border-slate-800 dark:border-slate-700 p-2 print:py-1 print:px-0.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-mono font-black text-center">#</th>
              <th rowSpan={2} className="tablero-pole-header border-r border-slate-800 dark:border-slate-700 p-2 print:py-1 print:px-0.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-mono font-black text-center">#</th>
              <th rowSpan={2} className="border-r border-slate-800 dark:border-slate-700 p-2 print:py-1 print:px-1">COND.</th>
              <th colSpan={3} className="tablero-amber-header border-r border-slate-800 dark:border-slate-700 p-1 print:py-0.5">PROTECCIÓN (BREAKER)</th>
              <th rowSpan={2} className="p-2 print:py-1 print:px-1.5">EQUIPO QUE ALIMENTA</th>
            </tr>
            {/* Encabezado Nivel 2 */}
            <tr className="tablero-subheader-row border-b-2 border-slate-800 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-center font-bold text-[9px] print:text-[8.5px] uppercase tracking-wider">
              {/* Left Breaker subheaders */}
              <th className="border-r border-slate-800 dark:border-slate-700 py-1 print:py-0.5 px-1">MARCA</th>
              <th className="border-r border-slate-800 dark:border-slate-700 py-1 print:py-0.5 px-1">TIPO</th>
              <th className="border-r border-slate-800 dark:border-slate-700 py-1 print:py-0.5 px-1">AMP.</th>
              {/* Right Breaker subheaders (AMP., TIPO, MARCA for symmetry) */}
              <th className="border-r border-slate-800 dark:border-slate-700 py-1 print:py-0.5 px-1">AMP.</th>
              <th className="border-r border-slate-800 dark:border-slate-700 py-1 print:py-0.5 px-1">TIPO</th>
              <th className="border-r border-slate-800 dark:border-slate-700 py-1 print:py-0.5 px-1">MARCA</th>
            </tr>
          </thead>
          <tbody>
            {tableRowsLayout.map(({ oddPole, evenPole, hasEvenPole, cLeft, cRight, renderLeft, rowSpanLeft, renderRight, rowSpanRight }, rowIndex) => {
              return (
                <tr
                  key={rowIndex}
                  className="tablero-circuit-row border-b border-slate-800 dark:border-slate-700 hover:bg-slate-50/20 dark:hover:bg-slate-800/10 min-h-[32px] print:min-h-0"
                >
                  {/* === LADO IZQUIERDO (IMPAR) === */}
                  {renderLeft && cLeft && (
                    <>
                      {/* Equipo que Alimenta */}
                      <td
                        rowSpan={rowSpanLeft}
                        className="border-r border-slate-800 dark:border-slate-700 p-1.5 print:py-1 print:px-1.5 font-medium align-middle relative group/cell"
                      >
                        <div className="flex flex-col justify-center min-h-[1.85rem] print:min-h-0 pr-14 print:pr-0">
                          <div className="flex items-center justify-between gap-1">
                            {renderCircuitEquipo(cLeft.equipo, cLeft.vinculadoId, cLeft.elementoDestinoId, cLeft.tipoDestino, cLeft.tipoElementoDestino)}
                            {cLeft.fotografia && (
                              <Image className="no-print w-3.5 h-3.5 text-amber-500 shrink-0 ml-1" />
                            )}
                          </div>
                        </div>

                        {/* Botones de acción contextual sobre el circuito */}
                        <div className="no-print absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-1 z-10">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (effectivelyReadOnly) {
                                showToast('Planilla bloqueada en Modo Seguro. Pulsa "Editar Planilla" para desbloquear.', 'info');
                                return;
                              }
                              setEditingCircuit(cLeft);
                            }}
                            title={`Editar circuito (Polos [${cLeft.poles?.join(', ')}])`}
                            className="p-1 opacity-85 hover:opacity-100 bg-amber-500/20 hover:bg-amber-500 text-amber-400 hover:text-slate-950 border border-amber-500/40 rounded cursor-pointer shadow-sm transition-all"
                          >
                            <Edit3 className="w-3 h-3" />
                          </button>
                          {!effectivelyReadOnly && (
                            <>
                              {rowSpanLeft > 1 && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    splitCircuit(cLeft.id);
                                  }}
                                  title="Separar Polos"
                                  className="p-1 opacity-80 hover:opacity-100 bg-slate-700/50 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-600 rounded cursor-pointer shadow-sm transition-all"
                                >
                                  <Minus className="w-3 h-3" />
                                </button>
                              )}
                              {cLeft && (!cLeft.id.startsWith('auto_') || (cLeft.equipo && cLeft.equipo !== 'RESERVA') || (cLeft.breaker && (cLeft.breaker.amp || cLeft.breaker.marca))) && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteCircuit(cLeft.id);
                                  }}
                                  title={`Eliminar circuito ${cLeft.equipo || ''} (Polos [${cLeft.poles?.join(', ')}])`}
                                  className="p-1 opacity-80 hover:opacity-100 bg-rose-500/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/40 rounded cursor-pointer shadow-sm transition-all"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>

                      {/* Breaker Marca */}
                      <td
                        rowSpan={rowSpanLeft}
                        className="border-r border-slate-800 dark:border-slate-700 p-0 text-center align-middle"
                      >
                        <EditableCell
                          value={cLeft.breaker.marca}
                          onSave={(val) => updateCircuit(cLeft.id, 'breaker.marca', val)}
                          type="select"
                          category="marcas_breaker"
                          options={MARCA_OPTIONS}
                          placeholder=""
                          disabled={effectivelyReadOnly}
                          className="text-center font-bold font-sans"
                        />
                      </td>

                      {/* Breaker Tipo */}
                      <td
                        rowSpan={rowSpanLeft}
                        className="border-r border-slate-800 dark:border-slate-700 p-0 text-center align-middle"
                      >
                        <EditableCell
                          value={cLeft.breaker.tipo}
                          onSave={(val) => updateCircuit(cLeft.id, 'breaker.tipo', val)}
                          type="select"
                          category="tipos_breaker"
                          options={TIPO_OPTIONS}
                          placeholder=""
                          disabled={effectivelyReadOnly}
                          className="text-center font-semibold"
                        />
                      </td>

                      {/* Breaker Amp */}
                      <td
                        rowSpan={rowSpanLeft}
                        className="tablero-amber-cell border-r border-slate-800 dark:border-slate-700 p-0 text-center align-middle font-bold"
                      >
                        <EditableCell
                          value={cLeft.breaker.amp}
                          onSave={(val) => updateCircuit(cLeft.id, 'breaker.amp', val)}
                          type="select"
                          category="breaker_amperios"
                          options={AMP_OPTIONS}
                          placeholder=""
                          disabled={effectivelyReadOnly}
                          className="text-center font-mono font-bold text-amber-600 dark:text-amber-400"
                        />
                      </td>

                      {/* Conductor calibre */}
                      <td
                        rowSpan={rowSpanLeft}
                        className="border-r border-slate-800 dark:border-slate-700 p-0 text-center align-middle font-medium"
                      >
                        <EditableCell
                          value={cLeft.conductor}
                          onSave={(val) => updateCircuit(cLeft.id, 'conductor', val)}
                          type="select"
                          category="conductores"
                          options={COND_OPTIONS}
                          placeholder=""
                          disabled={effectivelyReadOnly}
                          className="text-center font-mono font-semibold text-slate-800 dark:text-slate-300"
                        />
                      </td>
                    </>
                  )}

                  {/* Número de Polo Impar (Barra Colectora Física Fija) */}
                  <td className="tablero-pole-cell border-r-2 border-slate-800 dark:border-slate-700 p-0 text-center font-mono font-bold bg-slate-100 dark:bg-slate-800/80 text-slate-800 dark:text-slate-300 align-middle select-none relative group/pole cursor-default">
                    <div className="flex items-center justify-center min-h-[1.75rem] print:min-h-[1.25rem] px-0.5 relative">
                      <EditablePoleCell
                        poleNumber={oddPole}
                        value={cLeft?.codigoPolo || cLeft?.polo_label || (tableroData.poleLabels && tableroData.poleLabels[oddPole]) || ''}
                        onSave={(val) => handleUpdatePoleLabel(oddPole, val)}
                        disabled={effectivelyReadOnly}
                        className="text-xs print:text-[10px] font-bold text-slate-900 dark:text-slate-300"
                      />
                      
                      {/* Botones de acción en cada polo seleccionado */}
                      {!effectivelyReadOnly && (
                        <div className="no-print absolute right-0.5 top-0.5 flex items-center justify-center gap-0.5 bg-slate-900/90 backdrop-blur-xs opacity-0 group-hover/pole:opacity-100 transition-opacity z-10 px-0.5 rounded">
                          {oddPole + 2 <= maxPoles && renderLeft && rowSpanLeft === 1 && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                groupWithNext(cLeft.id, 'left');
                              }}
                              title="Agrupar con siguiente polo"
                              className="p-0.5 bg-amber-500 hover:bg-amber-600 text-white rounded cursor-pointer shadow transition-all"
                            >
                              <Plus className="w-2.5 h-2.5" />
                            </button>
                          )}
                          {cLeft && (!cLeft.id.startsWith('auto_') || (cLeft.equipo && cLeft.equipo !== 'RESERVA') || (cLeft.breaker && (cLeft.breaker.amp || cLeft.breaker.marca))) && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteCircuit(cLeft.id);
                              }}
                              title={`Eliminar circuito del polo ${oddPole}`}
                              className="p-0.5 bg-rose-600 hover:bg-rose-500 text-white rounded cursor-pointer shadow transition-all"
                            >
                              <Trash2 className="w-2.5 h-2.5" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </td>

                  {/* === LADO DERECHO (PAR) === */}
                  {!hasEvenPole ? (
                    <>
                      <td className="tablero-pole-cell border-r border-slate-800 dark:border-slate-700 p-0 text-center font-mono font-bold bg-slate-100/60 dark:bg-slate-900/50 text-slate-400 dark:text-slate-600 align-middle select-none">
                        <div className="flex items-center justify-center min-h-[1.75rem] print:min-h-[1.25rem] px-0.5">—</div>
                      </td>
                      <td colSpan={5} className="p-1.5 text-center bg-slate-50/40 dark:bg-slate-900/30 text-slate-400 dark:text-slate-600 font-mono text-[10px] select-none">
                        —
                      </td>
                    </>
                  ) : (
                    <>
                      {/* Número de Polo Par (Barra Colectora Física Fija) */}
                      <td className="tablero-pole-cell border-r border-slate-800 dark:border-slate-700 p-0 text-center font-mono font-bold bg-slate-100 dark:bg-slate-800/80 text-slate-800 dark:text-slate-300 align-middle select-none relative group/pole-right cursor-default">
                        <div className="flex items-center justify-center min-h-[1.75rem] print:min-h-[1.25rem] px-0.5 relative">
                          <EditablePoleCell
                            poleNumber={evenPole}
                            value={cRight?.codigoPolo || cRight?.polo_label || (tableroData.poleLabels && tableroData.poleLabels[evenPole]) || ''}
                            onSave={(val) => handleUpdatePoleLabel(evenPole, val)}
                            disabled={effectivelyReadOnly}
                            className="text-xs print:text-[10px] font-bold text-slate-900 dark:text-slate-300"
                          />
                          
                          {/* Botones de acción en cada polo seleccionado */}
                          {!effectivelyReadOnly && (
                            <div className="no-print absolute right-0.5 top-0.5 flex items-center justify-center gap-0.5 bg-slate-900/90 backdrop-blur-xs opacity-0 group-hover/pole-right:opacity-100 transition-opacity z-10 px-0.5 rounded">
                              {evenPole + 2 <= maxPoles && renderRight && rowSpanRight === 1 && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    groupWithNext(cRight.id, 'right');
                                  }}
                                  title="Agrupar con siguiente polo"
                                  className="p-0.5 bg-amber-500 hover:bg-amber-600 text-white rounded cursor-pointer shadow transition-all"
                                >
                                  <Plus className="w-2.5 h-2.5" />
                                </button>
                              )}
                              {cRight && (!cRight.id.startsWith('auto_') || (cRight.equipo && cRight.equipo !== 'RESERVA') || (cRight.breaker && (cRight.breaker.amp || cRight.breaker.marca))) && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteCircuit(cRight.id);
                                  }}
                                  title={`Eliminar circuito del polo ${evenPole}`}
                                  className="p-0.5 bg-rose-600 hover:bg-rose-500 text-white rounded cursor-pointer shadow transition-all"
                                >
                                  <Trash2 className="w-2.5 h-2.5" />
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </td>

                      {renderRight && cRight && (
                        <>
                          {/* Conductor calibre */}
                          <td
                            rowSpan={rowSpanRight}
                            className="border-r border-slate-800 dark:border-slate-700 p-0 text-center align-middle font-medium"
                          >
                            <EditableCell
                              value={cRight.conductor}
                              onSave={(val) => updateCircuit(cRight.id, 'conductor', val)}
                              type="select"
                              category="conductores"
                              options={COND_OPTIONS}
                              placeholder=""
                              disabled={effectivelyReadOnly}
                              className="text-center font-mono font-semibold text-slate-800 dark:text-slate-300"
                            />
                          </td>

                          {/* Breaker Amp */}
                          <td
                            rowSpan={rowSpanRight}
                            className="tablero-amber-cell border-r border-slate-800 dark:border-slate-700 p-0 text-center align-middle font-bold"
                          >
                            <EditableCell
                              value={cRight.breaker.amp}
                              onSave={(val) => updateCircuit(cRight.id, 'breaker.amp', val)}
                              type="select"
                              category="breaker_amperios"
                              options={AMP_OPTIONS}
                              placeholder=""
                              disabled={effectivelyReadOnly}
                              className="text-center font-mono font-bold text-amber-600 dark:text-amber-400"
                            />
                          </td>

                          {/* Breaker Tipo */}
                          <td
                            rowSpan={rowSpanRight}
                            className="border-r border-slate-800 dark:border-slate-700 p-0 text-center align-middle"
                          >
                            <EditableCell
                              value={cRight.breaker.tipo}
                              onSave={(val) => updateCircuit(cRight.id, 'breaker.tipo', val)}
                              type="select"
                              category="tipos_breaker"
                              options={TIPO_OPTIONS}
                              placeholder=""
                              disabled={effectivelyReadOnly}
                              className="text-center font-semibold"
                            />
                          </td>

                          {/* Breaker Marca */}
                          <td
                            rowSpan={rowSpanRight}
                            className="border-r border-slate-800 dark:border-slate-700 p-0 text-center align-middle"
                          >
                            <EditableCell
                              value={cRight.breaker.marca}
                              onSave={(val) => updateCircuit(cRight.id, 'breaker.marca', val)}
                              type="select"
                              category="marcas_breaker"
                              options={MARCA_OPTIONS}
                              placeholder=""
                              disabled={effectivelyReadOnly}
                              className="text-center font-bold font-sans"
                            />
                          </td>

                          {/* Equipo que Alimenta */}
                          <td
                            rowSpan={rowSpanRight}
                            className="p-1.5 print:py-1 print:px-1.5 font-medium align-middle relative group/cell"
                          >
                            <div className="flex flex-col justify-center min-h-[1.85rem] print:min-h-0 pr-14 print:pr-0">
                              <div className="flex items-center justify-between gap-1">
                                {renderCircuitEquipo(cRight.equipo, cRight.vinculadoId, cRight.elementoDestinoId, cRight.tipoDestino, cRight.tipoElementoDestino)}
                                {cRight.fotografia && (
                                  <Image className="no-print w-3.5 h-3.5 text-amber-500 shrink-0 ml-1" />
                                )}
                              </div>
                            </div>

                            {/* Botones de acción contextual sobre el circuito derecho */}
                            <div className="no-print absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-1 z-10">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (effectivelyReadOnly) {
                                    showToast('Planilla bloqueada en Modo Seguro. Pulsa "Editar Planilla" para desbloquear.', 'info');
                                    return;
                                  }
                                  setEditingCircuit(cRight);
                                }}
                                title={`Editar circuito (Polos [${cRight.poles?.join(', ')}])`}
                                className="p-1 opacity-85 hover:opacity-100 bg-amber-500/20 hover:bg-amber-500 text-amber-400 hover:text-slate-950 border border-amber-500/40 rounded cursor-pointer shadow-sm transition-all"
                              >
                                <Edit3 className="w-3 h-3" />
                              </button>
                              {!effectivelyReadOnly && (
                                <>
                                  {rowSpanRight > 1 && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        splitCircuit(cRight.id);
                                      }}
                                      title="Separar Polos"
                                      className="p-1 opacity-80 hover:opacity-100 bg-slate-700/50 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-600 rounded cursor-pointer shadow-sm transition-all"
                                    >
                                      <Minus className="w-3 h-3" />
                                    </button>
                                  )}
                                  {cRight && (!cRight.id.startsWith('auto_') || (cRight.equipo && cRight.equipo !== 'RESERVA') || (cRight.breaker && (cRight.breaker.amp || cRight.breaker.marca))) && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteCircuit(cRight.id);
                                      }}
                                      title={`Eliminar circuito ${cRight.equipo || ''} (Polos [${cRight.poles?.join(', ')}])`}
                                      className="p-1 opacity-80 hover:opacity-100 bg-rose-500/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/40 rounded cursor-pointer shadow-sm transition-all"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  )}
                                </>
                              )}
                            </div>
                          </td>
                        </>
                      )}
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 3. SECCIÓN PIE DE PÁGINA */}
      <table className="tablero-footer-table w-full border-collapse border-2 border-slate-800 dark:border-slate-700 border-t-0 text-xs table-fixed mb-0 break-inside-avoid">
        <colgroup>
          <col style={{ width: '21%' }} />
          <col style={{ width: '19%' }} />
          <col style={{ width: '60%' }} />
        </colgroup>
        <tbody>
          {/* Neutro de llegada */}
          <tr className="border-b border-slate-800 dark:border-slate-700">
            <td className="tablero-label-cell p-2 print:py-1 print:px-2 font-bold bg-slate-50 dark:bg-slate-800/40 border-r border-slate-800 dark:border-slate-700 uppercase text-[11px] print:text-[9.5px]">
              Neutro de Llegada
            </td>
            <td className="p-0 border-r border-slate-800 dark:border-slate-700 text-center font-semibold uppercase">
              <div className="tablero-subheader-row text-[10px] print:text-[8px] text-slate-600 dark:text-slate-400 font-bold bg-slate-100 dark:bg-slate-800 border-b border-slate-800 dark:border-slate-700 py-0.5 print:py-0 px-1">
                Calibre Cond.
              </div>
              <EditableCell
                value={neutroLlegada.calibre}
                onSave={(val) => updateField('neutroLlegada.calibre', val)}
                type="select"
                category="conductores"
                options={COND_OPTIONS}
                placeholder="Calibre"
                disabled={effectivelyReadOnly}
                className="text-center font-mono font-bold print:py-0.5"
              />
            </td>
            <td className="p-0 align-middle">
              <EditableCell
                value={neutroLlegada.observaciones}
                onSave={(val) => updateField('neutroLlegada.observaciones', val)}
                placeholder="Observaciones de Neutro (ej: Color de cable, barra)..."
                disabled={effectivelyReadOnly}
                className="px-3 print:px-2 print:py-0.5 text-slate-900 dark:text-slate-300 font-mono"
              />
            </td>
          </tr>

          {/* Puesta a tierra */}
          <tr className="border-b border-slate-800 dark:border-slate-700">
            <td className="tablero-label-cell p-2 print:py-1 print:px-2 font-bold bg-slate-50 dark:bg-slate-800/40 border-r border-slate-800 dark:border-slate-700 uppercase text-[11px] print:text-[9.5px]">
              Puesta a Tierra
            </td>
            <td className="p-0 border-r border-slate-800 dark:border-slate-700 text-center font-semibold uppercase">
              <div className="tablero-subheader-row text-[10px] print:text-[8px] text-slate-600 dark:text-slate-400 font-bold bg-slate-100 dark:bg-slate-800 border-b border-slate-800 dark:border-slate-700 py-0.5 print:py-0 px-1">
                Calibre Cond.
              </div>
              <EditableCell
                value={puestaTierra.calibre}
                onSave={(val) => updateField('puestaTierra.calibre', val)}
                type="select"
                category="conductores"
                options={COND_OPTIONS}
                placeholder="Calibre"
                disabled={effectivelyReadOnly}
                className="text-center font-mono font-bold print:py-0.5"
              />
            </td>
            <td className="p-0 align-middle">
              <EditableCell
                value={puestaTierra.observaciones}
                onSave={(val) => updateField('puestaTierra.observaciones', val)}
                placeholder="Observaciones de Puesta a Tierra (ej: Malla, malla del edificio)..."
                disabled={effectivelyReadOnly}
                className="px-3 print:px-2 print:py-0.5 text-slate-900 dark:text-slate-300 font-mono"
              />
            </td>
          </tr>

          {/* Observaciones generales */}
          <tr>
            <td colSpan={3} className="p-0 align-top">
              <div className="tablero-subheader-row bg-slate-100 dark:bg-slate-800 px-3 print:px-2 py-1 print:py-0.5 font-bold border-b border-slate-800 dark:border-slate-700 uppercase tracking-wide text-[10px] print:text-[9px] text-slate-800 dark:text-slate-400">
                Observaciones Generales
              </div>
              <EditableCell
                value={observacionesGenerales}
                onSave={(val) => updateField('observacionesGenerales', val)}
                type="textarea"
                placeholder="Describa el estado general del tablero, hallazgos, reparaciones pendientes o recomendaciones..."
                disabled={effectivelyReadOnly}
                className="px-3 py-2 print:px-2 print:py-1 text-slate-950 dark:text-slate-200 min-h-[3.25rem] print:min-h-[1.5rem] font-sans"
              />
            </td>
          </tr>
        </tbody>
      </table>

      {/* Lista de Elementos por Crear (segun Diagrama de Flujo: Crear Elemento) */}
      {elementosPorCrear.length > 0 && (
        <div className="mt-8 p-6 bg-slate-50 dark:bg-slate-800/20 border border-slate-200 dark:border-slate-800 rounded-2xl no-print shadow-sm">
          <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-3 flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-amber-500" /> Lista de Elementos por Crear ({elementosPorCrear.length})
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {elementosPorCrear.map((item, idx) => (
              <div 
                key={idx} 
                className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs flex items-center justify-between"
              >
                <div>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{item.nombre}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5 font-mono">
                    Polo Circuito: {Array.isArray(item.polos) && item.polos.length > 0
                      ? item.polos.join(', ')
                      : (circuits.find(c => c.id === item.circuitoId)?.poles?.join(', ') || String(item.circuitoId || '').replace('auto_', '').replace(/^circ_\d+_\w+$/, 'Salida Configurada'))}
                  </p>
                </div>
                <span className="px-2 py-0.5 rounded text-[8px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                  PENDIENTE
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal interactivo de Edición Condicional de Circuitos */}
      <ModalEdicionCircuito
        key={editingCircuit ? (editingCircuit.id || `pole_${editingCircuit.posicionPolo || editingCircuit.poles?.[0] || '1'}`) : 'closed'}
        isOpen={!!editingCircuit}
        onClose={() => setEditingCircuit(null)}
        circuitData={editingCircuit}
        tableroCircuits={circuits}
        maxPolos={maxPoles}
        onSave={saveCircuitFromModal}
        elementosCreados={todosElementosCreados}
      />

      {/* Botón flotante para exportar a PDF (no-print) */}
      <div className="fixed bottom-6 right-6 z-40 no-print">
        <button
          onClick={() => window.print()}
          className="flex items-center justify-center w-14 h-14 bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 rounded-full shadow-2xl transition-all cursor-pointer group hover:rotate-6"
          title="Imprimir / Guardar PDF"
        >
          <Printer className="w-6 h-6 group-hover:scale-110 transition-transform" />
        </button>
      </div>

      {/* Cierre / Firmas */}
      <div className="tablero-signatures-box mt-8 bg-slate-100 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-2xl print:rounded-lg p-5 print:py-2 print:px-3 space-y-4 print:space-y-1.5 print:mt-2 break-inside-avoid">
        <h3 className="text-xs print:text-[9.5px] font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-400 print:text-slate-950 border-b border-slate-300 dark:border-slate-700 pb-2 print:pb-1">
          Firma y Cierre de Inspección
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 print:grid-cols-2 gap-6 print:gap-6">
          {/* Firma Inspector */}
          <div className="flex flex-col gap-1.5 items-center text-center">
            <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 print:text-slate-900 uppercase tracking-wide no-print">Firma del Inspector</span>
            <input
              type="text"
              value={tableroData.firmaInspector || ''}
              onChange={(e) => updateField('firmaInspector', e.target.value)}
              className="w-full max-w-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-750 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 outline-none h-10 transition-all text-center no-print"
              placeholder="Nombre del Inspector"
            />
            <div className="hidden print:flex flex-col items-center w-full pt-4">
              <div className="w-52 border-b-2 border-slate-800 mb-1"></div>
              <span className="text-[9.5px] font-extrabold text-slate-950 uppercase leading-tight">
                {tableroData.firmaInspector || 'Inspector Técnico'}
              </span>
              <span className="text-[8px] font-semibold text-slate-700 uppercase tracking-wider leading-tight">
                Firma del Inspector
              </span>
            </div>
          </div>

          {/* Firma / Sello de la Empresa */}
          <div className="flex flex-col gap-1.5 items-center text-center">
            <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 print:text-slate-900 uppercase tracking-wide no-print">Firma / Sello de la Empresa</span>
            <input
              type="text"
              value={tableroData.firmaSupervisor || ''}
              onChange={(e) => updateField('firmaSupervisor', e.target.value)}
              className="w-full max-w-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-750 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 outline-none h-10 transition-all text-center no-print"
              placeholder="Nombre / Sello de la Empresa"
            />
            <div className="hidden print:flex flex-col items-center w-full pt-4">
              <div className="w-52 border-b-2 border-slate-800 mb-1"></div>
              <span className="text-[9.5px] font-extrabold text-slate-950 uppercase leading-tight">
                {tableroData.firmaSupervisor || tableroData.nombreEmpresa || 'Supervisor / Cliente'}
              </span>
              <span className="text-[8px] font-semibold text-slate-700 uppercase tracking-wider leading-tight">
                Firma / Sello de la Empresa
              </span>
            </div>
          </div>
        </div>
      </div>

      </div> {/* Fin de screen-container */}

      {/* Modal de Edición de ID Visual (Solo Administradores) */}
      <ModalEditarIdElemento
        isOpen={isEditIdModalOpen}
        onClose={() => setIsEditIdModalOpen(false)}
        elemento={tableroData}
        tipoElemento="TABLERO"
        proyectoId={project?.id || tableroData?.proyectoId}
      />
    </div>
  );
};
export default TableroComponent;
