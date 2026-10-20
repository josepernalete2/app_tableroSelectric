import React, { useState, useEffect } from 'react';
import EditableCell from './EditableCell';
import { Plus, Minus, Grid, Columns, Settings, RefreshCw, Zap, Image, ClipboardList, Camera, X, Printer, Pencil, Download, Edit3, Trash2, Loader2, Shield, Layers, Box } from 'lucide-react';
import useStore, { getElementCode, cleanElementName } from '../store/useStore';
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
  TABLERO_HERMETICIDAD_NEMA_IP
} from '../utils/constants';
import { getCustomOptions, saveCustomOption } from '../utils/customPresets';

export const TableroComponent = ({ tableroData, onUpdateTablero, readOnly }) => {
  const [isEditable, setIsEditable] = useState(false);
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

  const alimentadores = React.useMemo(() => {
    if (!project) return [];
    return (project.elementosUnifilares || project.tableros || []).filter(e => e.id !== tableroData?.id);
  }, [project, tableroData?.id]);

  const todosElementosCreados = React.useMemo(() => {
    if (!project) return [];
    const unifilares = (project.elementosUnifilares || project.tableros || []).map(e => ({
      id: e.id,
      nombre: e.nombre,
      tipo: e.tipoElemento || 'TABLERO'
    }));
    const subestaciones = (project.subestaciones || project.inspeccionesSubestacion || []).map(s => ({
      id: s.id,
      nombre: s.nombre,
      tipo: 'SUBESTACION'
    }));
    const puntos = (project.puntosMedicion || []).map(p => ({
      id: p.id,
      nombre: p.nombre,
      tipo: 'PUNTO_MEDICION'
    }));
    const ccms = (project.ccmList || []).map(c => ({
      id: c.id,
      nombre: c.nombre,
      tipo: 'CCM'
    }));
    return [...unifilares, ...subestaciones, ...puntos, ...ccms].filter(e => e.id !== tableroData?.id);
  }, [project, tableroData?.id]);

  const renderCircuitEquipo = (equipoText, vinculadoId, elementoDestinoId, tipoDestino, tipoElementoDestino) => {
    if (!equipoText || equipoText === 'RESERVA') {
      return <span className="text-xs text-slate-400 dark:text-slate-600 italic font-mono">RESERVA</span>;
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

    // Resolver IDs de elementos a códigos amigables y estandarizados (ej. TAB-1, TRS-1, GEN-1, CCM-1)
    let idBadges = [];
    if (rawElementId) {
      const idList = String(rawElementId).split(',').map(s => s.trim()).filter(Boolean);
      idBadges = idList.map(id => {
        const found = alimentadores.find(e => e.id === id || e.codigo === id);
        if (found) {
          return {
            id,
            code: getElementCode(found, found.tipoElemento || elementType),
            name: cleanElementName(found.nombre, found.id, found.codigo)
          };
        }
        return {
          id,
          code: getElementCode(id, elementType),
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

    return (
      <div className="flex flex-col gap-0.5">
        <span className="text-xs font-bold text-slate-900 dark:text-slate-100">{cleanName}</span>
        {idBadges.length > 0 && (
          <div className="flex items-center gap-1 flex-wrap mt-0.5">
            {idBadges.map((badge, bIdx) => (
              <span
                key={bIdx}
                className="inline-flex items-center w-max px-1.5 py-0.5 rounded text-[9.5px] font-mono font-bold bg-amber-500/10 text-amber-500 border border-amber-500/30 shadow-sm"
              >
                ID: {badge.code}
              </span>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderTipoDestinoBadge = (tipoDestino, tipoElementoDestino) => {
    const t = (tipoElementoDestino || tipoDestino || '').toUpperCase();
    if (!t) return null;

    if (t === 'ARTEFACTO' || t === 'CARGA_DIRECTA') {
      return (
        <span className="inline-flex items-center w-max px-1 py-0.5 rounded text-[8px] font-bold bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 mt-1">
          🔌 ARTEFACTO
        </span>
      );
    }
    if (t === 'TRANSFER' || t === 'ATS' || t === 'MTS') {
      return (
        <span className="inline-flex items-center w-max px-1 py-0.5 rounded text-[8px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 mt-1">
          🔄 TRANSFERENCIA (ATS/MTS)
        </span>
      );
    }
    if (t === 'GENERADOR' || t === 'GEN' || t === 'PLANTA') {
      return (
        <span className="inline-flex items-center w-max px-1 py-0.5 rounded text-[8px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 mt-1">
          ⚡ GENERADOR
        </span>
      );
    }
    if (t === 'CCM' || t === 'MOTOR') {
      return (
        <span className="inline-flex items-center w-max px-1 py-0.5 rounded text-[8px] font-bold bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300 mt-1">
          ⚙️ CCM
        </span>
      );
    }
    if (t === 'SUBESTACION' || t === 'SE') {
      return (
        <span className="inline-flex items-center w-max px-1 py-0.5 rounded text-[8px] font-bold bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300 mt-1">
          🏛️ SUBESTACIÓN
        </span>
      );
    }
    if (t === 'TRANSFORMADOR' || t === 'TRAFO') {
      return (
        <span className="inline-flex items-center w-max px-1 py-0.5 rounded text-[8px] font-bold bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 mt-1">
          🔌 TRANSFORMADOR
        </span>
      );
    }
    if (t === 'PUNTO_MEDICION' || t === 'MEDIDOR') {
      return (
        <span className="inline-flex items-center w-max px-1 py-0.5 rounded text-[8px] font-bold bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300 mt-1">
          📊 MEDIDOR
        </span>
      );
    }
    if (t === 'SUB_TABLERO' || t === 'TABLERO') {
      return (
        <span className="inline-flex items-center w-max px-1 py-0.5 rounded text-[8px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 mt-1">
          🏢 SUB-TABLERO
        </span>
      );
    }
    if (t === 'SUB_TABLERO_PENDIENTE') {
      return (
        <span className="inline-flex items-center w-max px-1 py-0.5 rounded text-[8px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 mt-1">
          ⏳ RESERVA PENDIENTE
        </span>
      );
    }
    return (
      <span className="inline-flex items-center w-max px-1 py-0.5 rounded text-[8px] font-bold bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 mt-1">
        🔗 {t}
      </span>
    );
  };

  // Normalize circuits: ensure all poles from 1 to maxPoles are represented exactly once
  const maxPoles = tableroData?.maxPoles || 30;
  const circuits = tableroData?.circuits || [];

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
    montaje = (tipo === 'empotrado' || tipo === 'Empotrar / Embutir') 
      ? 'Empotrar / Embutir' 
      : ((tipo === 'autosoportado' || String(tipo).toLowerCase().includes('autosoportado')) 
        ? 'Autosoportado (Gabinete de Piso / Switchgear)' 
        : (tableroData.montaje || 'Superficial')),
    capacidadPolos = tableroData.capacidadPolos || (tableroData.fases === 1 ? 'Monopolar (1F)' : (tableroData.fases === 2 ? 'Bipolar (2F)' : 'Tripolar (3F)')),
    usoElectrico = tableroData.usoElectrico || tableroData.funcionPrincipal || 'TG (Tablero General)',
    nivelHermeticidad = tableroData.nivelHermeticidad || tableroData.nemaIp || 'Uso Interior Seco (NEMA 1 / IP20)',
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

  // Update specific fields of the main tablero structure
  const updateField = (path, value) => {
    if (effectivelyReadOnly) return;
    const newData = { ...tableroData };
    
    if (path.includes('.')) {
      const [parent, child] = path.split('.');
      newData[parent] = { ...newData[parent], [child]: value };
    } else {
      newData[path] = value;
    }
    
    onUpdateTablero(newData);
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
    newData.circuits = normalizedCircuits.map(c => {
      if (c.id === circuitId) {
        if (field.startsWith('breaker.')) {
          const [_, subField] = field.split('.');
          return {
            ...c,
            breaker: { ...c.breaker, [subField]: value }
          };
        }
        return { ...c, [field]: value };
      }
      return c;
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
      const hasBreaker = c.breaker && (c.breaker.marca || c.breaker.tipo || c.breaker.amp);
      const hasConductor = c.conductor && c.conductor !== 'N/A' && c.conductor !== 'N/D' && c.conductor !== '';
      const hasEquipo = c.equipo && c.equipo !== 'RESERVA' && c.equipo !== 'DISPONIBLE';
      const hasFicha = c.ficha && (c.ficha.descripcion || c.ficha.potenciaWatts);
      const isMultiPole = Array.isArray(c.poles) && c.poles.length > 1;
      const hasPoleLabel = !!(c.codigoPolo || c.polo_label || c.poloLabel);
      return hasBreaker || hasConductor || hasEquipo || c.fotografia || c.tipoDestino || c.vinculadoId || hasFicha || isMultiPole || hasPoleLabel;
    });

    onUpdateTablero(newData);
  };

  const saveCircuitFromModal = (circuitId, updatedFields) => {
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
        updatedFields.equipo = `${cleanElementName(prov.nombre, prov.id, prov.codigo)} (ID: ${getElementCode(prov, prov.tipoElemento || updatedFields.tipoElementoProvisional || 'TABLERO')})`;
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
      // Remove from custom circuits list so it falls back to auto-generated RESERVA
      currentCircuits = currentCircuits.filter(c => c.id !== circuitId && !c.id.startsWith('auto_'));
    } else {
      const isAuto = circuitId.startsWith('auto_');
      if (isAuto) {
        // Create new custom circuit
        currentCircuits.push({
          id: `circ_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          ...updatedFields
        });
      } else {
        // Update existing custom circuit
        currentCircuits = currentCircuits.map(c => {
          if (c.id === circuitId) {
            return { ...c, ...updatedFields };
          }
          return c;
        });
      }
    }

    // Filter out completely empty default circuits to prevent database bloat
    newData.circuits = currentCircuits.filter(c => {
      const hasBreaker = c.breaker && (c.breaker.marca || c.breaker.tipo || c.breaker.amp);
      const hasConductor = c.conductor && c.conductor !== 'N/A' && c.conductor !== 'N/D' && c.conductor !== '';
      const hasEquipo = c.equipo && c.equipo !== 'RESERVA' && c.equipo !== 'DISPONIBLE';
      const hasFicha = c.ficha && (c.ficha.descripcion || c.ficha.potenciaWatts);
      const isMultiPole = Array.isArray(c.poles) && c.poles.length > 1;
      const hasPoleLabel = !!(c.codigoPolo || c.polo_label || c.poloLabel);
      const hasDestino = !!(c.elementoDestinoId || c.vinculadoId || c.tipoElementoDestino || c.tipoDestino);
      return hasBreaker || hasConductor || hasEquipo || c.fotografia || hasDestino || hasFicha || isMultiPole || hasPoleLabel;
    });

    onUpdateTablero(newData);
  };

  // Group a pole with the next pole on the same side (maximum 3 poles)
  const groupWithNext = (circuitId) => {
    if (readOnly) return;
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
      saveCircuitFromModal(circuitId, null);
      showToast(`Circuito en polo(s) [${polesStr}] eliminado y restablecido a reserva`, 'success');
    }
  };

  // Split rendering rows into left (odd) and right (even) poles
  const oddPoles = Array.from({ length: Math.ceil(maxPoles / 2) }, (_, i) => 2 * i + 1);
  
  // Find circuit by pole number
  const findCircuitByPole = (pole) => {
    return normalizedCircuits.find(c => c.poles.includes(pole));
  };

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
    <div className={`w-full text-slate-900 dark:text-slate-100 print-card font-sans select-text ${readOnly ? 'pointer-events-none opacity-90' : ''}`}>
      
      {/* VISTA DE EDICIÓN EN PANTALLA (OCULTA EN IMPRESIÓN) */}
      <div>
        {/* Grilla Superior Dividida: Tabla a la Izquierda, Foto a la Derecha */}
        <div className="grid grid-cols-1 lg:grid-cols-4 print:grid-cols-4 gap-4 mb-4">
        
        {/* Lado Izquierdo (3/4 de ancho): Tabla General */}
        <div className="lg:col-span-3 print:col-span-3">
          <table className="w-full border-collapse border-2 border-slate-800 dark:border-slate-700 text-xs table-fixed mb-0">
        <tbody>
          {/* Fila 1: Título General y Barra de Acciones */}
          <tr className="border-b border-slate-800 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/80">
            <td colSpan={8} className="p-0 font-bold text-sm tracking-wide">
              <div className="flex flex-row items-center justify-between gap-4 py-2.5 px-4 uppercase font-bold text-slate-800 dark:text-slate-200 w-full">
                <div className="flex items-center gap-2 min-w-0 flex-wrap">
                  <Zap className="w-4 h-4 text-amber-500 fill-amber-500/20 shrink-0" />
                  <span className="font-mono font-black tracking-wide text-xs sm:text-sm truncate">
                    {tableroData?.nombre ? cleanElementName(tableroData.nombre, tableroData.id, tableroData.codigo).toUpperCase() : 'INFORMACIÓN GENERAL DE PANEL ELÉCTRICO / TABLERO'}
                  </span>
                  <div className="flex items-center gap-1.5 shrink-0 ml-1 flex-wrap">
                    <span className="inline-flex items-center font-mono font-bold text-xs bg-amber-500/10 text-amber-400 border border-amber-500/30 px-2.5 py-0.5 rounded-lg shadow-sm">
                      ID: {getElementCode(tableroData, 'TABLERO')}
                    </span>
                    <span className="inline-flex items-center font-mono font-bold text-xs bg-sky-500/10 text-sky-400 border border-sky-500/30 px-2.5 py-0.5 rounded-lg shadow-sm">
                      ⚡ Pot. Estimada: {calcularPotenciaEstimadaTablero(tableroData).texto}
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
            <td className="w-24 p-2 bg-slate-50 dark:bg-slate-800/40 font-semibold border-r border-slate-800 dark:border-slate-700 uppercase">
              Ubicación:
            </td>
            <td colSpan={7} className="p-0 font-medium">
              <EditableCell
                value={ubicacion}
                onSave={(val) => updateField('ubicacion', val)}
                placeholder="Indique la ubicación física detallada del tablero..."
                disabled={effectivelyReadOnly}
                className="px-3"
              />
            </td>
          </tr>

          {/* Fila 3: Alimentado Por Jerárquico Dinámico */}
          <tr className="border-b border-slate-800 dark:border-slate-700">
            <td className="w-28 p-2.5 bg-slate-50 dark:bg-slate-800/40 font-semibold border-r border-slate-800 dark:border-slate-700 uppercase text-xs">
              Alimentado Por:
            </td>
            <td colSpan={7} className="p-2.5 font-medium">
              <SelectorAlimentadorJerarquico
                proyectoId={project?.id}
                tableroActualId={tableroData?.id}
                value={alimentadoPor}
                disabled={effectivelyReadOnly}
                onChange={(val, selectedObj) => {
                  updateField('alimentadoPor', val);
                  if (selectedObj?.tipoElemento === 'ALIMENTADOR') {
                    updateField('datosTecnicos.alimentadorId', selectedObj.id);
                    updateTableroAlimentador(project?.id, tableroData.id, selectedObj.id);
                  } else {
                    updateField('datosTecnicos.alimentadorId', selectedObj?.id !== 'CUSTOM' ? (selectedObj?.id || null) : null);
                    updateTableroAlimentador(project?.id, tableroData.id, selectedObj?.id !== 'CUSTOM' ? (selectedObj?.id || null) : null);
                  }
                }}
                label=""
                placeholder="Seleccionar Subestación, Transformador, CCM, Tablero o Acometida..."
              />
            </td>
          </tr>

          {/* Fila: FICHA TÉCNICA - Clasificación Completa del Tablero */}
          <tr className="border-b border-slate-800 dark:border-slate-700 bg-slate-900/40">
            <td className="w-28 p-2.5 bg-slate-50 dark:bg-slate-800/60 font-black border-r border-slate-800 dark:border-slate-700 uppercase tracking-wider text-amber-500 font-mono text-[11px] align-top py-3">
              FICHA TÉCNICA
            </td>
            <td colSpan={7} className="p-3 font-medium">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 text-xs">
                
                {/* 1. Uso Eléctrico (Función Principal con Siglas) */}
                <div className="flex flex-col gap-1 bg-slate-950/60 p-2 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-amber-400 uppercase font-bold tracking-wider truncate">Uso Eléctrico:</span>
                  <select
                    value={usoElectrico}
                    disabled={effectivelyReadOnly}
                    onChange={(e) => {
                      updateField('usoElectrico', e.target.value);
                      updateField('funcionPrincipal', e.target.value);
                    }}
                    className="bg-slate-900 text-slate-100 font-semibold border border-slate-700 rounded px-2 py-1 text-[11px] focus:outline-none focus:border-amber-500 cursor-pointer w-full disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {TABLERO_USO_ELECTRICO.map(opt => (
                      <option key={opt} value={opt} className="bg-slate-900 text-slate-100">{opt}</option>
                    ))}
                  </select>
                </div>

                {/* 2. Capacidades (Número de Polos / Fases de Alimentación) */}
                <div className="flex flex-col gap-1 bg-slate-950/60 p-2 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-amber-400 uppercase font-bold tracking-wider truncate">Capacidad (Alimentación):</span>
                  <select
                    value={capacidadPolos}
                    disabled={effectivelyReadOnly}
                    onChange={(e) => {
                      const val = e.target.value;
                      let f = 3;
                      if (val.includes('1F')) f = 1;
                      else if (val.includes('2F')) f = 2;
                      updateField('capacidadPolos', val);
                      updateField('fases', f);
                    }}
                    className="bg-slate-900 text-slate-100 font-semibold border border-slate-700 rounded px-2 py-1 text-[11px] focus:outline-none focus:border-amber-500 cursor-pointer w-full disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {TABLERO_CAPACIDADES_POLOS.map(opt => (
                      <option key={opt} value={opt} className="bg-slate-900 text-slate-100">{opt}</option>
                    ))}
                  </select>
                </div>

                {/* 3. Cantidad de Polos (Opciones normalizadas estrictas) */}
                <div className="flex flex-col gap-1 bg-slate-950/60 p-2 rounded-lg border border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-amber-400 uppercase font-bold tracking-wider truncate">Cantidad Polos:</span>
                    <span className="font-mono text-amber-500 font-bold text-[10px]">{maxPoles} P</span>
                  </div>
                  <select
                    value={maxPoles}
                    disabled={effectivelyReadOnly}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      if (!val) return;
                      const maxCircPosition = circuits.reduce((acc, c) => {
                        const maxVal = Math.max(...(c.poles || [1]));
                        return maxVal > acc ? maxVal : acc;
                      }, 0);
                      if (val < maxCircPosition) {
                        customAlert(`No se puede reducir la capacidad a ${val} polos porque hay circuitos ocupando posiciones hasta el polo ${maxCircPosition}.`);
                        return;
                      }
                      updateField('maxPoles', val);
                    }}
                    className="bg-slate-900 text-slate-100 font-bold border border-slate-700 rounded px-2 py-1 text-[11px] focus:outline-none focus:border-amber-500 cursor-pointer w-full disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {TABLERO_CANTIDAD_POLOS_ESTANDAR.map(opt => (
                      <option key={opt} value={opt} className="bg-slate-900 text-slate-100">{opt} Polos</option>
                    ))}
                  </select>
                </div>

                {/* 4. Montaje y Accesibilidad (Protección Mecánica) */}
                <div className="flex flex-col gap-1 bg-slate-950/60 p-2 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-amber-400 uppercase font-bold tracking-wider truncate">Montaje:</span>
                  <select
                    value={montaje}
                    disabled={effectivelyReadOnly}
                    onChange={(e) => {
                      const val = e.target.value;
                      let t = 'superficial';
                      if (val.toLowerCase().includes('empotrar') || val.toLowerCase().includes('embutir')) t = 'empotrado';
                      else if (val.toLowerCase().includes('autosoportado')) t = 'autosoportado';
                      updateField('montaje', val);
                      updateField('tipo', t);
                    }}
                    className="bg-slate-900 text-slate-100 font-semibold border border-slate-700 rounded px-2 py-1 text-[11px] focus:outline-none focus:border-amber-500 cursor-pointer w-full disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {TABLERO_MONTAJE_OPCIONES.map(opt => (
                      <option key={opt} value={opt} className="bg-slate-900 text-slate-100">{opt}</option>
                    ))}
                  </select>
                </div>

                {/* 5. Nivel de Hermeticidad (Protección Ambiental NEMA / IP) */}
                <div className="flex flex-col gap-1 bg-slate-950/60 p-2 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-amber-400 uppercase font-bold tracking-wider truncate">Hermeticidad:</span>
                  <select
                    value={nivelHermeticidad}
                    disabled={effectivelyReadOnly}
                    onChange={(e) => {
                      updateField('nivelHermeticidad', e.target.value);
                      updateField('nemaIp', e.target.value);
                    }}
                    className="bg-slate-900 text-slate-100 font-semibold border border-slate-700 rounded px-2 py-1 text-[11px] focus:outline-none focus:border-amber-500 cursor-pointer w-full disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {TABLERO_HERMETICIDAD_NEMA_IP.map(opt => (
                      <option key={opt} value={opt} className="bg-slate-900 text-slate-100">{opt}</option>
                    ))}
                  </select>
                </div>

                {/* 6. Tensión Nominal (COVENIN 159:1997) */}
                <div className="flex flex-col gap-1 bg-slate-950/60 p-2 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-amber-400 uppercase font-bold tracking-wider truncate">Tensión (COVENIN):</span>
                  <input
                    type="text"
                    list="covenin-voltajes-tablero"
                    value={tableroData.tension || tableroData?.datosTecnicos?.tensionNominal || ''}
                    disabled={effectivelyReadOnly}
                    onChange={(e) => {
                      updateField('tension', e.target.value);
                      updateField('datosTecnicos.tensionNominal', e.target.value);
                    }}
                    onBlur={() => {
                      if (tableroData.tension) {
                        saveCustomOption('tensiones_bt', tableroData.tension, TENSIONES_COVENIN_159_BT);
                        saveCustomOption('tensiones_todas', tableroData.tension);
                      }
                    }}
                    placeholder="Ej: 208Y/120 V"
                    className="bg-slate-900 text-slate-100 font-bold border border-slate-700 rounded px-2 py-1 text-[11px] focus:outline-none focus:border-amber-500 font-mono w-full disabled:opacity-60 disabled:cursor-not-allowed"
                  />
                  <datalist id="covenin-voltajes-tablero">
                    {getCustomOptions('tensiones_bt', TENSIONES_COVENIN_159_BT).map(v => <option key={v} value={v}>{v}</option>)}
                  </datalist>
                </div>

              </div>
            </td>
          </tr>

          {/* Fila 4: Encabezados de Parámetros, Breaker Principal y Voltajes (Fase y Línea) */}
          <tr className="border-b border-slate-800 dark:border-slate-700 text-center font-semibold bg-slate-50 dark:bg-slate-800/60">
            <td colSpan={2} className="border-r border-slate-800 dark:border-slate-700 p-2 uppercase font-bold text-slate-300">
              Barras Principales
            </td>
            <td colSpan={3} className="border-r border-slate-800 dark:border-slate-700 p-2 uppercase font-bold text-amber-400">
              BREAKER PRINCIPAL
            </td>
            <td colSpan={2} className="border-r border-slate-800 dark:border-slate-700 p-1 uppercase font-bold text-sky-400">
              Voltajes
            </td>
            <td className="p-1 uppercase">
              Acometida
            </td>
          </tr>

          {/* Fila 5: Sub-encabezados de Breaker y Voltajes */}
          <tr className="border-b border-slate-800 dark:border-slate-700 text-center font-bold text-[10px] bg-slate-100 dark:bg-slate-800/80">
            <td colSpan={2} className="border-r border-slate-800 dark:border-slate-700 p-0.5">FASE / AMPERIOS</td>
            <td className="border-r border-slate-800 dark:border-slate-700 p-0.5 w-20">MARCA</td>
            <td className="border-r border-slate-800 dark:border-slate-700 p-0.5 w-20">TIPO</td>
            <td className="border-r border-slate-800 dark:border-slate-700 p-0.5 w-16">AMP</td>
            <td className="border-r border-slate-800 dark:border-slate-700 p-0.5 w-18 text-sky-400 font-mono">V (F-N)</td>
            <td className="border-r border-slate-800 dark:border-slate-700 p-0.5 w-18 text-amber-400 font-mono">V (L-L)</td>
            <td className="p-0.5">CALIBRE/DETALLES</td>
          </tr>

          {/* Fila 6 (IA) */}
          <tr className="border-b border-slate-800 dark:border-slate-700">
            <td className="w-12 text-center bg-slate-50 dark:bg-slate-800/30 border-r border-slate-800 dark:border-slate-700 font-bold font-mono">IA</td>
            <td className="w-20 p-0 border-r border-slate-800 dark:border-slate-700 text-center">
              <EditableCell
                value={barrasPrincipales.ia}
                onSave={(val) => updateField('barrasPrincipales.ia', val)}
                placeholder="0"
                disabled={effectivelyReadOnly}
                className="text-center font-mono"
              />
            </td>
            {/* Breaker Principal Marca (spans 3 rows) */}
            <td rowSpan={3} className="p-0 border-r border-slate-800 dark:border-slate-700 text-center align-middle font-medium bg-amber-500/5">
              <EditableCell
                value={breakerPrincipal.marca}
                onSave={(val) => updateField('breakerPrincipal.marca', val)}
                type="select"
                options={MARCA_OPTIONS}
                placeholder="Marca"
                disabled={effectivelyReadOnly}
                className="text-center font-bold"
              />
            </td>
            {/* Breaker Principal Tipo (spans 3 rows) */}
            <td rowSpan={3} className="p-0 border-r border-slate-800 dark:border-slate-700 text-center align-middle bg-amber-500/5">
              <EditableCell
                value={breakerPrincipal.tipo}
                onSave={(val) => updateField('breakerPrincipal.tipo', val)}
                type="select"
                options={TIPO_OPTIONS}
                placeholder="Tipo"
                disabled={effectivelyReadOnly}
                className="text-center"
              />
            </td>
            {/* Breaker Principal Amp (spans 3 rows) */}
            <td rowSpan={3} className="p-0 border-r border-slate-800 dark:border-slate-700 text-center align-middle font-bold bg-amber-500/5">
              <EditableCell
                value={breakerPrincipal.amp}
                onSave={(val) => updateField('breakerPrincipal.amp', val)}
                type="select"
                options={AMP_OPTIONS}
                placeholder="Ej: 225A"
                disabled={effectivelyReadOnly}
                className="text-center font-mono text-amber-600 dark:text-amber-400"
              />
            </td>
            {/* Voltaje Fase Va */}
            <td className="p-0 border-r border-slate-800 dark:border-slate-700 text-center">
              <EditableCell
                value={voltaje.va}
                onSave={(val) => updateField('voltaje.va', val)}
                placeholder="Ej: 120V"
                disabled={effectivelyReadOnly}
                className="text-center font-mono"
              />
            </td>
            {/* Voltaje Línea Vab */}
            <td className="p-0 border-r border-slate-800 dark:border-slate-700 text-center bg-slate-50/30 dark:bg-slate-900/20">
              <EditableCell
                value={voltaje.vab}
                onSave={(val) => updateField('voltaje.vab', val)}
                placeholder="Ej: 208V"
                disabled={effectivelyReadOnly}
                className="text-center font-mono font-semibold text-amber-600 dark:text-amber-400"
              />
            </td>
            {/* Acometida (spans 3 rows) */}
            <td rowSpan={3} className="p-0 text-center align-middle font-medium bg-slate-50/50 dark:bg-slate-900/30">
              <EditableCell
                value={acometida}
                onSave={(val) => updateField('acometida', val)}
                placeholder="3X 3/0..."
                disabled={effectivelyReadOnly}
                className="text-center font-mono text-blue-600 dark:text-blue-400"
              />
            </td>
          </tr>

          {/* Fila 7 (IB) */}
          <tr className="border-b border-slate-800 dark:border-slate-700">
            <td className="text-center bg-slate-50 dark:bg-slate-800/30 border-r border-slate-800 dark:border-slate-700 font-bold font-mono">IB</td>
            <td className="p-0 border-r border-slate-800 dark:border-slate-700 text-center">
              <EditableCell
                value={barrasPrincipales.ib}
                onSave={(val) => updateField('barrasPrincipales.ib', val)}
                placeholder="0"
                disabled={effectivelyReadOnly}
                className="text-center font-mono"
              />
            </td>
            {/* Voltaje Fase Vb */}
            <td className="p-0 border-r border-slate-800 dark:border-slate-700 text-center">
              <EditableCell
                value={voltaje.vb}
                onSave={(val) => updateField('voltaje.vb', val)}
                placeholder="Ej: 120V"
                disabled={effectivelyReadOnly}
                className="text-center font-mono"
              />
            </td>
            {/* Voltaje Línea Vbc */}
            <td className="p-0 border-r border-slate-800 dark:border-slate-700 text-center bg-slate-50/30 dark:bg-slate-900/20">
              <EditableCell
                value={voltaje.vbc}
                onSave={(val) => updateField('voltaje.vbc', val)}
                placeholder="Ej: 208V"
                disabled={effectivelyReadOnly}
                className="text-center font-mono font-semibold text-amber-600 dark:text-amber-400"
              />
            </td>
          </tr>

          {/* Fila 8 (IC) */}
          <tr>
            <td className="text-center bg-slate-50 dark:bg-slate-800/30 border-r border-slate-800 dark:border-slate-700 font-bold font-mono">IC</td>
            <td className="p-0 border-r border-slate-800 dark:border-slate-700 text-center">
              <EditableCell
                value={barrasPrincipales.ic}
                onSave={(val) => updateField('barrasPrincipales.ic', val)}
                placeholder="0"
                disabled={effectivelyReadOnly}
                className="text-center font-mono"
              />
            </td>
            {/* Voltaje Fase Vc */}
            <td className="p-0 border-r border-slate-800 dark:border-slate-700 text-center">
              <EditableCell
                value={voltaje.vc}
                onSave={(val) => updateField('voltaje.vc', val)}
                placeholder="Ej: 120V"
                disabled={effectivelyReadOnly}
                className="text-center font-mono"
              />
            </td>
            {/* Voltaje Línea Vca */}
            <td className="p-0 border-r border-slate-800 dark:border-slate-700 text-center bg-slate-50/30 dark:bg-slate-900/20">
              <EditableCell
                value={voltaje.vca}
                onSave={(val) => updateField('voltaje.vca', val)}
                placeholder="Ej: 208V"
                disabled={effectivelyReadOnly}
                className="text-center font-mono font-semibold text-amber-600 dark:text-amber-400"
              />
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    {/* Lado Derecho (1/4 de ancho): Foto de Inspección */}
    <div 
      className="md:col-span-1 print:col-span-1 border-2 border-slate-800 dark:border-slate-700 bg-slate-950/40 rounded-lg p-3 flex flex-col justify-between h-full"
      style={{ minHeight: `${tableroData.fotoScale || 220}px` }}
    >
      <div>
        <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
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
            className="relative rounded overflow-hidden border border-slate-800 bg-slate-900 flex items-center justify-center group shadow w-full"
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
          <div className="flex-1 flex flex-col items-center justify-center gap-2 p-1">
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
      <div className="overflow-x-auto">
        <table className="w-full border-collapse border-2 border-slate-800 dark:border-slate-700 border-t-0 text-[10px] md:text-[11px] table-fixed min-w-[750px]">
          <thead>
            {/* Encabezado Nivel 1 */}
            <tr className="border-b border-slate-800 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-center font-bold text-xs">
              <th rowSpan={2} className="border-r border-slate-800 dark:border-slate-700 p-2 w-[22%]">EQUIPO QUE ALIMENTA</th>
              <th colSpan={3} className="border-r border-slate-800 dark:border-slate-700 p-1">PROTECCIÓN (BREAKER)</th>
              <th rowSpan={2} className="border-r border-slate-800 dark:border-slate-700 p-2 w-[8%]">COND.</th>
              <th rowSpan={2} className="border-r border-2 border-slate-800 dark:border-slate-700 p-2 w-[4%] bg-amber-500/10 text-amber-600 dark:text-amber-400 font-mono font-bold text-center">#</th>
              <th rowSpan={2} className="border-r border-slate-800 dark:border-slate-700 p-2 w-[4%] bg-amber-500/10 text-amber-600 dark:text-amber-400 font-mono font-bold text-center">#</th>
              <th rowSpan={2} className="border-r border-slate-800 dark:border-slate-700 p-2 w-[8%]">COND.</th>
              <th colSpan={3} className="border-r border-slate-800 dark:border-slate-700 p-1">PROTECCIÓN (BREAKER)</th>
              <th rowSpan={2} className="p-2 w-[22%]">EQUIPO QUE ALIMENTA</th>
            </tr>
            {/* Encabezado Nivel 2 */}
            <tr className="border-b border-2 border-slate-800 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-center font-bold text-[9px] uppercase tracking-wider">
              {/* Left Breaker subheaders */}
              <th className="border-r border-slate-800 dark:border-slate-700 p-1 w-[8%]">MARCA</th>
              <th className="border-r border-slate-800 dark:border-slate-700 p-1 w-[7%]">TIPO</th>
              <th className="border-r border-slate-800 dark:border-slate-700 p-1 w-[6%]">AMP.</th>
              {/* Right Breaker subheaders (AMP., TIPO, MARCA for symmetry) */}
              <th className="border-r border-slate-800 dark:border-slate-700 p-1 w-[6%]">AMP.</th>
              <th className="border-r border-slate-800 dark:border-slate-700 p-1 w-[7%]">TIPO</th>
              <th className="border-r border-slate-800 dark:border-slate-700 p-1 w-[8%]">MARCA</th>
            </tr>
          </thead>
          <tbody>
            {oddPoles.map((oddPole, rowIndex) => {
              const evenPole = oddPole + 1;

              // Find circuit representing the current left (odd) and right (even) poles
              const cLeft = findCircuitByPole(oddPole);
              const cRight = findCircuitByPole(evenPole);

              // Determine if this is the first pole of a multi-pole group to apply rowSpan
              const isFirstLeft = cLeft && Math.min(...cLeft.poles) === oddPole;
              const isFirstRight = cRight && Math.min(...cRight.poles) === evenPole;

              // Calculate rowSpan counts
              const rowSpanLeft = cLeft ? cLeft.poles.length : 1;
              const rowSpanRight = cRight ? cRight.poles.length : 1;

              return (
                <tr
                  key={rowIndex}
                  className="border-b border-slate-800 dark:border-slate-700 hover:bg-slate-50/20 dark:hover:bg-slate-800/10 min-h-[32px]"
                >
                  {/* === LADO IZQUIERDO (IMPAR) === */}
                  {isFirstLeft && (
                    <>
                      {/* Equipo que Alimenta */}
                      <td
                        rowSpan={rowSpanLeft}
                        className="border-r border-slate-800 dark:border-slate-700 p-1.5 font-medium align-middle cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors relative group/cell"
                        onClick={() => {
                          if (effectivelyReadOnly) {
                            showToast('Planilla bloqueada en Modo Seguro. Pulsa "Editar Planilla" para desbloquear.', 'info');
                            return;
                          }
                          setEditingCircuit(cLeft);
                        }}
                      >
                        <div className="flex flex-col justify-center min-h-[2rem] pr-6">
                          <div className="flex items-center justify-between">
                            {renderCircuitEquipo(cLeft.equipo, cLeft.vinculadoId, cLeft.elementoDestinoId, cLeft.tipoDestino, cLeft.tipoElementoDestino)}
                            {cLeft.fotografia && (
                              <Image className="w-3.5 h-3.5 text-amber-500 shrink-0 ml-1" />
                            )}
                          </div>
                          
                          {/* Badges based on tipoDestino / tipoElementoDestino */}
                          {renderTipoDestinoBadge(cLeft.tipoDestino, cLeft.tipoElementoDestino)}
                        </div>

                        {/* Botones de acción contextual sobre el circuito */}
                        {!effectivelyReadOnly && (
                          <div className="no-print absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-1 z-10">
                            {rowSpanLeft > 1 && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  splitCircuit(cLeft.id);
                                }}
                                title="Separar Polos"
                                className="p-1 opacity-80 hover:opacity-100 bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-slate-950 border border-amber-500/40 rounded cursor-pointer shadow-sm transition-all"
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
                          </div>
                        )}
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
                          options={TIPO_OPTIONS}
                          placeholder=""
                          disabled={effectivelyReadOnly}
                          className="text-center"
                        />
                      </td>

                      {/* Breaker Amp */}
                      <td
                        rowSpan={rowSpanLeft}
                        className="border-r border-slate-800 dark:border-slate-700 p-0 text-center align-middle font-bold"
                      >
                        <EditableCell
                          value={cLeft.breaker.amp}
                          onSave={(val) => updateCircuit(cLeft.id, 'breaker.amp', val)}
                          type="select"
                          options={AMP_OPTIONS}
                          placeholder=""
                          disabled={effectivelyReadOnly}
                          className="text-center font-mono text-amber-600 dark:text-amber-400"
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
                          options={COND_OPTIONS}
                          placeholder=""
                          disabled={effectivelyReadOnly}
                          className="text-center font-mono text-slate-700 dark:text-slate-300"
                        />
                      </td>
                    </>
                  )}

                  {/* Número de Polo Impar (Barra Colectora Física Fija) */}
                  <td className="border-r-2 border-slate-800 dark:border-slate-700 p-0 text-center font-mono font-bold bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 align-middle select-none relative group/pole cursor-default">
                    <div className="flex items-center justify-center min-h-[1.75rem] px-1 relative">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300 select-none">{oddPole}</span>
                      
                      {/* Botones de acción en cada polo seleccionado */}
                      {!effectivelyReadOnly && (
                        <div className="no-print absolute inset-0 flex items-center justify-center gap-0.5 bg-slate-900/90 backdrop-blur-xs opacity-0 group-hover/pole:opacity-100 transition-opacity z-10 px-0.5">
                          {oddPole < maxPoles - 1 && isFirstLeft && rowSpanLeft === 1 && (
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
                  {/* Número de Polo Par (Barra Colectora Física Fija) */}
                  <td className="border-r border-slate-800 dark:border-slate-700 p-0 text-center font-mono font-bold bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 align-middle select-none relative group/pole-right cursor-default">
                    <div className="flex items-center justify-center min-h-[1.75rem] px-1 relative">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300 select-none">{evenPole}</span>
                      
                      {/* Botones de acción en cada polo seleccionado */}
                      {!effectivelyReadOnly && (
                        <div className="no-print absolute inset-0 flex items-center justify-center gap-0.5 bg-slate-900/90 backdrop-blur-xs opacity-0 group-hover/pole-right:opacity-100 transition-opacity z-10 px-0.5">
                          {evenPole < maxPoles && isFirstRight && rowSpanRight === 1 && (
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

                  {isFirstRight && (
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
                          options={COND_OPTIONS}
                          placeholder=""
                          disabled={effectivelyReadOnly}
                          className="text-center font-mono text-slate-700 dark:text-slate-300"
                        />
                      </td>

                      {/* Breaker Amp */}
                      <td
                        rowSpan={rowSpanRight}
                        className="border-r border-slate-800 dark:border-slate-700 p-0 text-center align-middle font-bold"
                      >
                        <EditableCell
                          value={cRight.breaker.amp}
                          onSave={(val) => updateCircuit(cRight.id, 'breaker.amp', val)}
                          type="select"
                          options={AMP_OPTIONS}
                          placeholder=""
                          disabled={effectivelyReadOnly}
                          className="text-center font-mono text-amber-600 dark:text-amber-400"
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
                          options={TIPO_OPTIONS}
                          placeholder=""
                          disabled={effectivelyReadOnly}
                          className="text-center"
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
                          options={MARCA_OPTIONS}
                          placeholder=""
                          disabled={effectivelyReadOnly}
                          className="text-center font-bold font-sans"
                        />
                      </td>

                      {/* Equipo que Alimenta */}
                      <td
                        rowSpan={rowSpanRight}
                        className="p-1.5 font-medium align-middle cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors relative group/cell"
                        onClick={() => {
                          if (effectivelyReadOnly) {
                            showToast('Planilla bloqueada en Modo Seguro. Pulsa "Editar Planilla" para desbloquear.', 'info');
                            return;
                          }
                          setEditingCircuit(cRight);
                        }}
                      >
                        <div className="flex flex-col justify-center min-h-[2rem] pr-6">
                          <div className="flex items-center justify-between">
                            {renderCircuitEquipo(cRight.equipo, cRight.vinculadoId, cRight.elementoDestinoId, cRight.tipoDestino, cRight.tipoElementoDestino)}
                            {cRight.fotografia && (
                              <Image className="w-3.5 h-3.5 text-amber-500 shrink-0 ml-1" />
                            )}
                          </div>
                          
                          {/* Badges based on tipoDestino / tipoElementoDestino */}
                          {renderTipoDestinoBadge(cRight.tipoDestino, cRight.tipoElementoDestino)}
                        </div>

                        {/* Botones de acción contextual sobre el circuito derecho */}
                        {!effectivelyReadOnly && (
                          <div className="no-print absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-1 z-10">
                            {rowSpanRight > 1 && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  splitCircuit(cRight.id);
                                }}
                                title="Separar Polos"
                                className="p-1 opacity-80 hover:opacity-100 bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-slate-950 border border-amber-500/40 rounded cursor-pointer shadow-sm transition-all"
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
                          </div>
                        )}
                      </td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 3. SECCIÓN PIE DE PÁGINA */}
      <table className="w-full border-collapse border-2 border-slate-800 dark:border-slate-700 border-t-0 text-xs table-fixed mb-0">
        <tbody>
          {/* Neutro de llegada */}
          <tr className="border-b border-slate-800 dark:border-slate-700">
            <td className="w-[30%] p-2 font-bold bg-slate-50 dark:bg-slate-800/40 border-r border-slate-800 dark:border-slate-700 uppercase">
              Neutro de Llegada
            </td>
            <td className="w-[15%] p-0 border-r border-slate-800 dark:border-slate-700 text-center font-semibold uppercase">
              <div className="text-[10px] text-slate-500 font-bold bg-slate-100 dark:bg-slate-800 border-b border-slate-800 dark:border-slate-700 p-0.5">Calib Cond.</div>
              <EditableCell
                value={neutroLlegada.calibre}
                onSave={(val) => updateField('neutroLlegada.calibre', val)}
                type="select"
                options={COND_OPTIONS}
                placeholder="Calibre"
                disabled={effectivelyReadOnly}
                className="text-center font-mono"
              />
            </td>
            <td className="w-[5%] border-r border-slate-800 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/50"></td>
            <td className="p-0">
              <EditableCell
                value={neutroLlegada.observaciones}
                onSave={(val) => updateField('neutroLlegada.observaciones', val)}
                placeholder="Observaciones de Neutro (ej: Color de cable, barra)..."
                disabled={effectivelyReadOnly}
                className="px-3 text-slate-700 dark:text-slate-300 font-mono"
              />
            </td>
          </tr>

          {/* Puesta a tierra */}
          <tr className="border-b border-slate-800 dark:border-slate-700">
            <td className="p-2 font-bold bg-slate-50 dark:bg-slate-800/40 border-r border-slate-800 dark:border-slate-700 uppercase">
              Puesta a Tierra
            </td>
            <td className="p-0 border-r border-slate-800 dark:border-slate-700 text-center font-semibold uppercase">
              <div className="text-[10px] text-slate-500 font-bold bg-slate-100 dark:bg-slate-800 border-b border-slate-800 dark:border-slate-700 p-0.5">Calib Cond.</div>
              <EditableCell
                value={puestaTierra.calibre}
                onSave={(val) => updateField('puestaTierra.calibre', val)}
                type="select"
                options={COND_OPTIONS}
                placeholder="Calibre"
                disabled={effectivelyReadOnly}
                className="text-center font-mono"
              />
            </td>
            <td className="border-r border-slate-800 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/50"></td>
            <td className="p-0">
              <EditableCell
                value={puestaTierra.observaciones}
                onSave={(val) => updateField('puestaTierra.observaciones', val)}
                placeholder="Observaciones de Puesta a Tierra (ej: Malla, malla del edificio)..."
                disabled={effectivelyReadOnly}
                className="px-3 text-slate-700 dark:text-slate-300 font-mono"
              />
            </td>
          </tr>

          {/* Observaciones generales */}
          <tr>
            <td colSpan={4} className="p-0 align-top">
              <div className="bg-slate-100 dark:bg-slate-800 px-3 py-1 font-bold border-b border-slate-800 dark:border-slate-700 uppercase tracking-wide text-[10px] text-slate-600 dark:text-slate-400">
                Observaciones Generales
              </div>
              <EditableCell
                value={observacionesGenerales}
                onSave={(val) => updateField('observacionesGenerales', val)}
                type="textarea"
                placeholder="Describa el estado general del tablero, hallazgos, reparaciones pendientes o recomendaciones..."
                disabled={effectivelyReadOnly}
                className="px-3 py-2 text-slate-800 dark:text-slate-200 min-h-[4rem] font-sans"
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
                  <p className="text-[10px] text-slate-400 mt-0.5 font-mono">Polo Circuito: {item.circuitoId.replace('auto_', '')}</p>
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
      <div className="mt-8 bg-slate-100 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 print:bg-slate-50 print:border-gray-300 print:mt-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700 pb-2.5">
          Firma y Cierre de Inspección
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Firma Inspector */}
          <div className="flex flex-col gap-1.5 items-center text-center">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Firma del Inspector</span>
            <input
              type="text"
              value={tableroData.firmaInspector || ''}
              onChange={(e) => updateField('firmaInspector', e.target.value)}
              className="w-full max-w-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-750 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 outline-none h-10 transition-all text-center no-print"
              placeholder="Nombre del Inspector"
            />
            <span className="hidden print:block text-xs font-bold text-slate-900 mt-1 h-6">
              {tableroData.firmaInspector || '___________________________'}
            </span>
            <div className="hidden print:block w-48 border-b border-gray-400 mt-6 h-1"></div>
          </div>

          {/* Firma / Sello de la Empresa */}
          <div className="flex flex-col gap-1.5 items-center text-center">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Firma / Sello de la Empresa</span>
            <input
              type="text"
              value={tableroData.firmaSupervisor || ''}
              onChange={(e) => updateField('firmaSupervisor', e.target.value)}
              className="w-full max-w-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-750 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 outline-none h-10 transition-all text-center no-print"
              placeholder="Nombre / Sello de la Empresa"
            />
            <span className="hidden print:block text-xs font-bold text-slate-900 mt-1 h-6">
              {tableroData.firmaSupervisor || '___________________________'}
            </span>
            <div className="hidden print:block w-48 border-b border-gray-400 mt-6 h-1"></div>
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
