import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  ExternalLink, 
  Info, 
  Zap, 
  Trash2, 
  Link2, 
  Unlink, 
  Plus, 
  Check, 
  Cpu, 
  ShieldAlert, 
  FolderOpen,
  AlertCircle,
  Eye,
  EyeOff,
  Loader2,
  PanelLeft,
  PanelRight,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import DiagramaUnifilarBlueprint from './DiagramaUnifilarBlueprint';
import SelectorAlimentadorJerarquico from './SelectorAlimentadorJerarquico';
import useStore, { getElementCode, resolveElementParentDisplay, resolveElementAlimentaADisplay } from '../store/useStore';
import { useConfirm } from '../context/ConfirmContext';

export default function ModalDiagramaUnifilar({ 
  isOpen, 
  onClose, 
  elementos = [], 
  companyName, 
  projectName = 'SISTEMA ELÉCTRICO',
  proyectoId = null,
  companyId = null
}) {
  const navigate = useNavigate();
  const { user, addElementoUnifilar, updateElementoUnifilar, deleteElementoUnifilar, showToast } = useStore();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [showDeletePassword, setShowDeletePassword] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const [selectedNode, setSelectedNode] = useState(null);
  
  // Estados de edición del nodo seleccionado
  const [editNombre, setEditNombre] = useState('');
  const [editTipo, setEditTipo] = useState('');
  const [editUbicacion, setEditUbicacion] = useState('');
  const [editAlimentadoPor, setEditAlimentadoPor] = useState('');
  const [editAlimentadoPorId, setEditAlimentadoPorId] = useState(null);
  const [editAlimentaA, setEditAlimentaA] = useState('');
  const [editAlimentaAIds, setEditAlimentaAIds] = useState([]);
  const [editKva, setEditKva] = useState('');
  const [editFases, setEditFases] = useState('');
  const [editObservaciones, setEditObservaciones] = useState('');

  // Estados de Modo Conexión
  const [isConnectionMode, setIsConnectionMode] = useState(false);
  const [connectionSource, setConnectionSource] = useState(null); // Nodo origen

  // Paneles laterales independientes y Modo Enfoque ("Expandir Plano")
  const [isNarrowScreen, setIsNarrowScreen] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < 1024 : false
  );
  const [showLeftPanel, setShowLeftPanel] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 1024 : true
  );
  const [showRightPanel, setShowRightPanel] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 1024 : true
  );
  const prevPanelsRef = useRef({ left: true, right: true });

  useEffect(() => {
    const handleResize = () => {
      setIsNarrowScreen(window.innerWidth < 1024);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (isOpen) {
      const narrow = typeof window !== 'undefined' ? window.innerWidth < 1024 : false;
      setIsNarrowScreen(narrow);
      setShowLeftPanel(!narrow);
      setShowRightPanel(!narrow);
    }
  }, [isOpen]);

  const isFocusMode = !showLeftPanel && !showRightPanel;

  const handleToggleFocusMode = () => {
    if (!isFocusMode) {
      prevPanelsRef.current = { left: showLeftPanel, right: showRightPanel };
      setShowLeftPanel(false);
      setShowRightPanel(false);
    } else {
      const prev = prevPanelsRef.current;
      if (prev.left || prev.right) {
        setShowLeftPanel(prev.left);
        setShowRightPanel(prev.right);
      } else {
        setShowLeftPanel(true);
        setShowRightPanel(true);
      }
    }
  };

  // Sincronizar formulario cuando cambia el nodo seleccionado
  useEffect(() => {
    if (selectedNode) {
      setEditNombre(selectedNode.nombre || '');
      setEditTipo(selectedNode.tipoElemento || 'TABLERO');
      setEditUbicacion(selectedNode.ubicacion || '');
      const resolvedParentDisplay = resolveElementParentDisplay(selectedNode, elementos);
      setEditAlimentadoPor(resolvedParentDisplay || selectedNode.alimentadoPor || '');
      setEditAlimentadoPorId(selectedNode.alimentadoPorId || selectedNode.datosTecnicos?.alimentadoPorId || null);

      const downResolved = resolveElementAlimentaADisplay(selectedNode, elementos);
      setEditAlimentaA(downResolved.text || selectedNode.datosTecnicos?.alimentaA || selectedNode.alimentaA || '');
      setEditAlimentaAIds(
        downResolved.ids.length > 0
          ? downResolved.ids
          : (selectedNode.datosTecnicos?.alimentaAIds || selectedNode.alimentaAIds || [])
      );
      setEditKva(selectedNode.datosTecnicos?.kva || selectedNode.datosTecnicos?.potenciaKva || '');
      setEditFases(selectedNode.datosTecnicos?.fases || selectedNode.maxPoles || '');
      setEditObservaciones(selectedNode.observacionesGenerales || '');
    } else {
      setEditAlimentadoPorId(null);
      setEditAlimentaA('');
      setEditAlimentaAIds([]);
      resetEditForm();
    }
  }, [selectedNode, elementos]);

  // Actualizar la referencia del nodo seleccionado si los elementos cambian (reactividad)
  useEffect(() => {
    if (selectedNode) {
      const updated = elementos.find(el => el.id === selectedNode.id);
      if (updated) {
        setSelectedNode(updated);
      } else {
        setSelectedNode(null);
      }
    }
  }, [elementos]);

  const resetEditForm = () => {
    setEditNombre('');
    setEditTipo('');
    setEditUbicacion('');
    setEditAlimentadoPor('');
    setEditAlimentadoPorId(null);
    setEditKva('');
    setEditFases('');
    setEditObservaciones('');
  };

  // Catálogo de símbolos eléctricos para el panel izquierdo

  const catalogOfSymbols = [
    { 
      type: 'TABLERO', 
      label: 'Tablero Eléctrico', 
      desc: 'Panel de distribución', 
      icon: <div className="w-5 h-4 border border-slate-400 bg-slate-950 flex items-center justify-center text-[7px]">⚡</div> 
    },
    { 
      type: 'TRANSFORMADOR', 
      label: 'Transformador', 
      desc: 'Reductor/Elevador', 
      icon: (
        <svg width="20" height="20" viewBox="0 0 20 20" className="overflow-visible fill-none stroke-current text-violet-400">
          <circle cx="10" cy="7" r="5" strokeWidth="1.5" />
          <circle cx="10" cy="13" r="5" strokeWidth="1.5" />
        </svg>
      ) 
    },
    { 
      type: 'GENERADOR', 
      label: 'Generador / Planta', 
      desc: 'Generador auxiliar', 
      icon: <div className="w-5 h-5 rounded-full border border-amber-500 flex items-center justify-center text-[10px] font-bold text-amber-500 bg-amber-950/20">G</div> 
    },
    { 
      type: 'TRANSFER', 
      label: 'TRANSFERENCIA (ATS/MTS)', 
      desc: 'Conmutador ATS / MTS', 
      icon: <div className="w-7 h-4 border border-emerald-500 rounded text-[7px] font-black text-center text-emerald-400 bg-emerald-950/20 leading-tight">ATS</div> 
    },
    { 
      type: 'SUBESTACION', 
      label: 'Celda / Subestación', 
      desc: 'Módulo de maniobra', 
      icon: <Cpu className="w-4 h-4 text-purple-400" /> 
    },
    { 
      type: 'OTRO', 
      label: 'Carga / Banco Cond.', 
      desc: 'Otros componentes', 
      icon: <Info className="w-4 h-4 text-sky-400" /> 
    }
  ];

  // Agregar nuevo símbolo al lienzo
  const handleAddSymbol = async (type) => {
    const defaultPositions = [
      { x: 250, y: 150 },
      { x: 350, y: 150 },
      { x: 450, y: 150 },
      { x: 550, y: 150 },
      { x: 250, y: 300 },
      { x: 450, y: 300 }
    ];
    // Evitar solapamientos iniciales burdos
    const randomPos = defaultPositions[Math.floor(Math.random() * defaultPositions.length)];
    
    const count = elementos.filter(el => el.tipoElemento === type).length + 1;
    const defaultNames = {
      TABLERO: `Tablero Distribución ${count}`,
      TRANSFORMADOR: `Transformador Principal ${count}`,
      GENERADOR: `Generador Emergencia ${count}`,
      TRANSFER: `Transferencia (ATS/MTS) ${count}`,
      SUBESTACION: `Celda Subestación ${count}`,
      OTRO: `Equipo Especial ${count}`
    };

    const targetCompanyId = companyId || (elementos.length > 0 ? elementos[0].empresaId || elementos[0].companyId : null);

    const payload = {
      nombre: defaultNames[type] || `Equipo ${type} ${count}`,
      tipoElemento: type,
      ubicacion: 'Sala Eléctrica',
      alimentadoPor: '',
      observacionesGenerales: '',
      companyId: targetCompanyId,
      proyectoId: proyectoId,
      datosTecnicos: {
        positionX: randomPos.x,
        positionY: randomPos.y,
        kva: type === 'TRANSFORMADOR' || type === 'GENERADOR' ? '75' : '',
        fases: '3'
      }
    };

    const res = await addElementoUnifilar(proyectoId, payload);
    if (res && res.success) {
      showToast(`${type} agregado al diagrama correctamente.`, 'success');
      setSelectedNode(res.elemento);
    } else {
      showToast(res?.error || 'Error al agregar elemento.', 'error');
    }
  };

  // Guardar propiedades editadas
  const handleSaveProperties = async (e) => {
    if (e) e.preventDefault();
    if (!selectedNode) return;

    const isTableroTipo = editTipo === 'TABLERO';
    const cleanAlimentaAText = !isTableroTipo && editAlimentaA ? editAlimentaA.trim().toUpperCase() : '';
    const updated = {
      nombre: editNombre.trim().toUpperCase(),
      tipoElemento: editTipo,
      ubicacion: editUbicacion.trim().toUpperCase(),
      alimentadoPor: editAlimentadoPor ? editAlimentadoPor.trim().toUpperCase() : '',
      alimentadoPorId: editAlimentadoPorId || null,
      ...(!isTableroTipo
        ? {
            alimentaA: cleanAlimentaAText,
            alimentaAIds: editAlimentaAIds
          }
        : {}),
      observacionesGenerales: editObservaciones.trim().toUpperCase(),
      datosTecnicos: {
        ...selectedNode.datosTecnicos,
        alimentadoPorId: editAlimentadoPorId || null,
        ...(!isTableroTipo
          ? {
              alimentaA: cleanAlimentaAText,
              alimentaAIds: editAlimentaAIds
            }
          : {}),
        kva: editKva.trim(),
        fases: editFases.trim(),
        positionX: selectedNode.datosTecnicos?.positionX || 300,
        positionY: selectedNode.datosTecnicos?.positionY || 200
      }
    };

    await updateElementoUnifilar(proyectoId || selectedNode.proyectoId, selectedNode.id, updated);
    showToast('Propiedades del elemento actualizadas.', 'success');
  };

  // Obtener elementos aguas abajo que quedarán huérfanos si se elimina el nodo
  const getDownstreamOrphans = (node) => {
    if (!node) return [];
    return elementos.filter(el => {
      if (el.id === node.id) return false;
      const matchName = el.alimentadoPor && el.alimentadoPor.toLowerCase().trim() === (node.nombre || '').toLowerCase().trim();
      const matchId = el.alimentadoPor && (el.alimentadoPor.includes(node.id) || el.alimentadoPor === node.id);
      const matchDirectId = el.alimentadoPorId === node.id || el.origenId === node.id;
      return matchName || matchId || matchDirectId;
    });
  };

  // Abrir modal de eliminación con contraseña de Admin
  const handleDeleteElement = () => {
    if (!selectedNode || user?.role !== 'ADMIN') return;
    setDeletePassword('');
    setShowDeletePassword(false);
    setDeleteError('');
    setShowDeleteModal(true);
  };

  const handleConfirmDeleteElement = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!selectedNode || isDeleting || user?.role !== 'ADMIN') return;
    if (!deletePassword) {
      setDeleteError('Ingresa tu contraseña de administrador.');
      return;
    }
    setIsDeleting(true);
    setDeleteError('');
    try {
      const idToDelete = selectedNode.id;
      const res = await deleteElementoUnifilar(proyectoId || selectedNode.proyectoId, idToDelete, deletePassword);
      if (!res?.ok) {
        setDeleteError(res?.error || 'Contraseña de administrador incorrecta');
        setIsDeleting(false);
        return;
      }

      // Desconectar huérfanos en memoria tras eliminación exitosa
      for (const el of elementos) {
        if (
          el.alimentadoPor === selectedNode.nombre || 
          el.alimentadoPor === selectedNode.id ||
          el.alimentadoPor?.includes(selectedNode.id) ||
          el.alimentadoPorId === selectedNode.id
        ) {
          await updateElementoUnifilar(proyectoId || el.proyectoId, el.id, { 
            alimentadoPor: '',
            alimentadoPorId: null
          });
        }
      }

      const deletedName = selectedNode.nombre;
      setSelectedNode(null);
      setShowDeleteModal(false);
      setDeletePassword('');
      showToast(`Equipo "${deletedName}" eliminado del diagrama.`, 'info');
    } catch (err) {
      setDeleteError(err?.message || 'Error inesperado al eliminar el equipo.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Atajo de teclado: Tecla Delete / Backspace para borrar nodo seleccionado (Solo ADMIN)
  useEffect(() => {
    if (!isOpen || !selectedNode || user?.role !== 'ADMIN' || showDeleteModal) return;

    const handleKeyDown = (e) => {
      const activeTag = document.activeElement?.tagName?.toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select') return;

      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        handleDeleteElement();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedNode, elementos, user?.role, showDeleteModal]);

  // Desconectar elemento seleccionado
  const handleDisconnectElement = async () => {
    if (!selectedNode) return;
    setEditAlimentadoPor('');
    setEditAlimentadoPorId(null);
    await updateElementoUnifilar(proyectoId || selectedNode.proyectoId, selectedNode.id, {
      alimentadoPor: '',
      alimentadoPorId: null
    });
    showToast('Conexión de alimentación removida.', 'info');
  };

  // Manejar click en nodo del lienzo
  const handleNodeClick = (node) => {
    if (isConnectionMode) {
      // Flujo de Conexión
      if (!connectionSource) {
        // Seleccionar origen
        setConnectionSource(node);
        showToast(`Origen seleccionado: ${node.nombre}. Haz clic en el equipo destino para conectarlo.`, 'info');
      } else {
        // Seleccionar destino
        if (connectionSource.id === node.id) {
          showToast('No puedes conectar un equipo consigo mismo.', 'error');
          return;
        }
        
        // El destino es alimentado por el origen
        updateElementoUnifilar(proyectoId || node.proyectoId, node.id, { 
          alimentadoPor: connectionSource.nombre,
          alimentadoPorId: connectionSource.id
        });

        showToast(`Conexión establecida: ${connectionSource.nombre} ➔ ${node.nombre}`, 'success');
        
        // Resetear modo conexión
        setIsConnectionMode(false);
        setConnectionSource(null);
      }
    } else {
      setSelectedNode(node);
      if (isNarrowScreen) {
        setShowRightPanel(true);
      }
    }
  };

  // Lista de posibles alimentadores (excluye al nodo mismo para evitar bucles)
  const potentialFeeders = elementos.filter(el => selectedNode && el.id !== selectedNode.id);

  // Imprimir / Exportar Diagrama Unifilar en EXACTAMENTE 1 página horizontal (A4 Landscape)
  const handlePrintDiagrama = () => {
    const liveSvg = document.querySelector('svg[data-unifilar-svg="true"]');
    if (!liveSvg) {
      window.print();
      return;
    }

    const clonedSvg = liveSvg.cloneNode(true);
    clonedSvg.removeAttribute('width');
    clonedSvg.removeAttribute('height');
    clonedSvg.removeAttribute('style');
    clonedSvg.setAttribute('preserveAspectRatio', 'xMidYMid meet');

    // Eliminar rectángulo de rejilla oscura CAD si existe
    clonedSvg.querySelectorAll('rect').forEach((r) => {
      const fill = String(r.getAttribute('fill') || '');
      if (fill.includes('cad-grid')) {
        r.remove();
      }
    });

    // Calcular bounding box real del contenido del diagrama
    let minX = 0;
    let minY = 0;
    let bboxW = 1600;
    let bboxH = 1000;
    try {
      const liveBBox = liveSvg.getBBox();
      if (liveBBox && liveBBox.width > 10 && liveBBox.height > 10) {
        const pad = 60;
        minX = Math.floor(liveBBox.x - pad);
        minY = Math.floor(liveBBox.y - pad);
        bboxW = Math.ceil(liveBBox.width + pad * 2);
        bboxH = Math.ceil(liveBBox.height + pad * 2);
      }
    } catch {
      const vb = String(liveSvg.getAttribute('viewBox') || '').trim().split(/\s+/).map(Number);
      if (vb.length === 4 && vb.every(Number.isFinite)) {
        [minX, minY, bboxW, bboxH] = vb;
      }
    }
    clonedSvg.setAttribute('viewBox', `${minX} ${minY} ${bboxW} ${bboxH}`);

    // Forzar colores de alto contraste aptos para hoja blanca
    clonedSvg.querySelectorAll('text').forEach((t) => {
      const curFill = String(t.getAttribute('fill') || '').toLowerCase();
      if (!curFill || curFill === '#cbd5e1' || curFill === '#e2e8f0' || curFill === '#f8fafc' || curFill === '#64748b' || curFill === '#94a3b8' || curFill === 'white' || curFill === '#ffffff') {
        t.setAttribute('fill', '#0f172a');
      }
    });
    clonedSvg.querySelectorAll('path, line, polyline, polygon, rect, circle').forEach((el) => {
      const stroke = String(el.getAttribute('stroke') || '').toLowerCase();
      const fill = String(el.getAttribute('fill') || '').toLowerCase();
      if (stroke === '#cbd5e1' || stroke === '#94a3b8' || stroke === '#64748b' || stroke === '#334155' || stroke === '#475569') {
        el.setAttribute('stroke', '#1e293b');
      }
      if (fill === '#0f172a' || fill === '#020617' || fill === '#1e293b' || fill === '#082f49' || fill === '#1e1b4b' || fill === '#022c22' || fill === '#311042' || fill === '#083344') {
        el.setAttribute('fill', '#f8fafc');
      }
    });

    const serializer = new XMLSerializer();
    const svgMarkup = serializer.serializeToString(clonedSvg);
    const fechaStr = new Date().toLocaleDateString('es-ES');
    const safeCompany = String(companyName || 'EMPRESA').replace(/</g, '&lt;');
    const safeProject = String(projectName || 'PROYECTO').replace(/</g, '&lt;');

    const htmlDoc = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>Diagrama Unifilar - ${safeProject}</title>
  <style>
    @page { size: A4 landscape; margin: 8mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      width: 100%;
      height: 100%;
      background: #ffffff;
      color: #0f172a;
      font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
      overflow: hidden;
    }
    .sheet {
      width: 100%;
      height: 100vh;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: 4mm;
      border: 1.5px solid #0f172a;
      overflow: hidden;
      page-break-after: avoid;
      page-break-inside: avoid;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1.5px solid #0f172a;
      padding-bottom: 3mm;
      margin-bottom: 2mm;
      flex-shrink: 0;
    }
    .header-title { font-size: 13pt; font-weight: 900; letter-spacing: 0.04em; text-transform: uppercase; }
    .header-meta { font-size: 8.5pt; color: #334155; text-align: right; line-height: 1.35; }
    .canvas-wrap {
      flex: 1;
      min-height: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      background: #ffffff;
    }
    .canvas-wrap svg {
      width: 100%;
      height: 100%;
      max-height: 175mm;
      object-fit: contain;
      display: block;
    }
    .footer {
      border-top: 1px solid #cbd5e1;
      padding-top: 2mm;
      margin-top: 2mm;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 7.5pt;
      color: #334155;
      flex-shrink: 0;
      white-space: nowrap;
      overflow: hidden;
    }
  </style>
</head>
<body>
  <div class="sheet">
    <div class="header">
      <div>
        <div class="header-title">DIAGRAMA UNIFILAR</div>
        <div style="font-size: 9pt; font-weight: 700; color: #1e293b;">${safeCompany} — ${safeProject}</div>
      </div>
      <div class="header-meta">
        <div><strong>Fecha:</strong> ${fechaStr}</div>
        <div><strong>Plano:</strong> IE-01 • Escala: Ajuste Automático</div>
      </div>
    </div>
    <div class="canvas-wrap">${svgMarkup}</div>
    <div class="footer">
      <span><strong>Leyenda:</strong> ⚡ Tablero/Panel • 🔄 Transformador • 🔋 Generador • 🔀 Transferencia (ATS) • 🏢 Subestación • 🛡️ Puesta a Tierra</span>
      <span>Generado por Selectric CAD</span>
    </div>
  </div>
  <script>
    window.onload = function () {
      setTimeout(function () {
        window.focus();
        window.print();
      }, 150);
    };
  </script>
</body>
</html>`;

    const printWin = window.open('', '_blank', 'width=1200,height=820');
    if (printWin) {
      printWin.document.open();
      printWin.document.write(htmlDoc);
      printWin.document.close();
      return;
    }

    // Fallback con iframe oculto si el navegador bloqueó popups
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);
    const idoc = iframe.contentWindow?.document;
    if (idoc) {
      idoc.open();
      idoc.write(htmlDoc);
      idoc.close();
      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => iframe.remove(), 2000);
      }, 200);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-3 print:hidden">
        {/* Backdrop */}
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200" />

        {/* Ventana Principal */}
        <div className={`relative w-full ${isFocusMode ? 'max-w-[98vw]' : 'max-w-[96vw] xl:max-w-7xl'} h-[96vh] bg-slate-900/90 border border-slate-800 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200`}>
          
          {/* Cabecera */}
          <div className="flex flex-wrap justify-between items-center gap-2 p-3 sm:p-4 border-b border-slate-800 bg-slate-950/45 shrink-0 select-none">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2 bg-amber-955 rounded-xl border border-amber-800/40 animate-pulse shrink-0">
                <Zap className="w-5 h-5 text-amber-500 animate-bounce" style={{ animationDuration: '3s' }} />
              </div>
              <div className="min-w-0">
                <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-100 font-mono flex items-center gap-2 truncate">
                  Editor de Diagrama Unifilar CAD <span className="hidden sm:inline text-[10px] text-amber-500 bg-amber-950/60 border border-amber-900 px-2 py-0.5 rounded-full font-sans lowercase">interactivo</span>
                </h3>
                <p className="text-[10px] text-slate-455 font-sans truncate">
                  {companyName} — {projectName} • Arrastra equipos, haz clic para editar o usa el trazador de conexiones.
                </p>
              </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 no-print">
              {/* Controles independientes de paneles y Modo Enfoque */}
              <button
                type="button"
                onClick={() => setShowLeftPanel((v) => !v)}
                className={`px-2.5 py-1.5 border text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer min-h-[34px] ${
                  showLeftPanel
                    ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                    : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white'
                }`}
                title={showLeftPanel ? 'Ocultar Panel de Símbolos' : 'Mostrar Panel de Símbolos'}
              >
                <PanelLeft className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Símbolos</span>
              </button>

              <button
                type="button"
                onClick={() => setShowRightPanel((v) => !v)}
                className={`px-2.5 py-1.5 border text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer min-h-[34px] ${
                  showRightPanel
                    ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                    : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white'
                }`}
                title={showRightPanel ? 'Ocultar Panel de Información' : 'Mostrar Panel de Información'}
              >
                <PanelRight className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Información</span>
              </button>

              <button
                type="button"
                onClick={handleToggleFocusMode}
                className={`px-2.5 py-1.5 border text-xs font-black rounded-xl transition-all flex items-center gap-1.5 cursor-pointer min-h-[34px] shadow-sm ${
                  isFocusMode
                    ? 'bg-amber-500 border-amber-400 text-slate-950 hover:bg-amber-400'
                    : 'bg-slate-950 border-slate-700 text-amber-300 hover:border-amber-500/50 hover:bg-slate-900'
                }`}
                title={isFocusMode ? 'Restaurar paneles laterales' : 'Ocultar ambos paneles y expandir el plano al 100%'}
              >
                {isFocusMode ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                <span>{isFocusMode ? 'Restaurar Paneles' : 'Expandir Plano'}</span>
              </button>

              {/* Botón de Modo Conexión */}
              <button
                onClick={() => {
                  setIsConnectionMode(!isConnectionMode);
                  setConnectionSource(null);
                  if(!isConnectionMode) {
                    showToast('Modo de conexión activado. Haz clic en el equipo alimentador (origen).', 'info');
                  }
                }}
                className={`px-3 py-1.5 border text-xs font-black rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-md min-h-[34px] ${
                  isConnectionMode 
                    ? 'bg-amber-500 border-amber-400 text-slate-950 hover:bg-amber-400 animate-pulse' 
                    : 'bg-slate-950 border-slate-800 text-slate-350 hover:text-white hover:border-slate-700'
                }`}
              >
                <Link2 className="w-4 h-4" /> 
                <span className="hidden sm:inline">{isConnectionMode ? 'Conectando...' : 'Trazar Conexión'}</span>
              </button>

              <button
                type="button"
                onClick={handlePrintDiagrama}
                className="px-3 py-1.5 bg-slate-950 border border-slate-800 text-slate-355 hover:text-white rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-md hover:border-slate-700 min-h-[34px]"
              >
                Imprimir / PDF
              </button>
              
              <button 
                onClick={onClose}
                className="p-1.5 hover:bg-slate-855 border border-slate-800 hover:border-slate-700 rounded-xl text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Banner informativo de Modo Conexión */}
          {isConnectionMode && (
            <div className="bg-amber-500 text-slate-950 font-bold px-5 py-2.5 text-xs text-center flex items-center justify-center gap-2.5 shrink-0 font-mono animate-slideDown select-none">
              <Zap className="w-4 h-4 fill-current animate-bounce" />
              <span>
                {connectionSource 
                  ? `[1/2] Origen seleccionado: ${connectionSource.nombre}. Ahora haz clic en el equipo de DESTINO para conectarlo.` 
                  : 'MODO CONEXIÓN ACTIVO: Haz clic en el equipo de ORIGEN (alimentador principal / tablero de distribución).'}
              </span>
              <button 
                onClick={() => {
                  setIsConnectionMode(false);
                  setConnectionSource(null);
                }}
                className="ml-4 px-2 py-0.5 border border-slate-950/40 rounded text-[9px] hover:bg-slate-950 hover:text-amber-500 font-bold transition-all uppercase"
              >
                Cancelar
              </button>
            </div>
          )}

          {/* Contenido Principal */}
          <div className="flex-1 flex overflow-hidden min-h-0 relative">
            
            {/* Backdrop para paneles superpuestos en pantallas < 1024px */}
            {isNarrowScreen && (showLeftPanel || showRightPanel) && (
              <div
                onClick={() => {
                  setShowLeftPanel(false);
                  setShowRightPanel(false);
                }}
                className="absolute inset-0 bg-slate-950/60 backdrop-blur-[1px] z-20 lg:hidden"
              />
            )}

            {/* 1. PALETA DE SÍMBOLOS (Izquierda - Ocultable / Overlay en Tablet) */}
            {showLeftPanel && (
              <div className={`${
                isNarrowScreen
                  ? 'absolute inset-y-0 left-0 z-30 w-64 bg-slate-950 shadow-2xl'
                  : 'w-56 bg-slate-955/60 shrink-0'
              } p-4 border-r border-slate-800/80 flex flex-col space-y-4 select-none no-print`}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono mb-1">Equipos & Símbolos</h4>
                    <p className="text-[9.5px] text-slate-450 leading-relaxed">
                      Haz clic en cualquier símbolo para insertarlo en el plano interactivo.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowLeftPanel(false)}
                    className="p-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer shrink-0"
                    title="Ocultar panel de símbolos"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                
                <div className="space-y-2 flex-1 overflow-y-auto pr-1">
                  {catalogOfSymbols.map(sym => (
                    <button
                      key={sym.type}
                      onClick={() => {
                        handleAddSymbol(sym.type);
                        if (isNarrowScreen) setShowLeftPanel(false);
                      }}
                      className="w-full p-2.5 bg-slate-900/60 hover:bg-slate-800/80 active:scale-98 border border-slate-800 hover:border-slate-700 rounded-xl flex items-center gap-3 transition-all text-left text-xs group cursor-pointer"
                    >
                      <div className="w-9 h-9 shrink-0 flex items-center justify-center bg-slate-950 rounded-xl text-slate-455 group-hover:text-amber-500 group-hover:bg-slate-900 border border-slate-800 transition-all shadow-inner">
                        {sym.icon}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-slate-200 group-hover:text-white transition-colors truncate">{sym.label}</div>
                        <div className="text-[9px] text-slate-500 truncate">{sym.desc}</div>
                      </div>
                    </button>
                  ))}
                </div>

                <div className="pt-3 border-t border-slate-800/60 text-[9px] text-slate-500 leading-normal font-sans">
                  💡 <strong>Consejo:</strong> Arrastra libremente los símbolos una vez colocados en el lienzo para organizar el diagrama.
                </div>
              </div>
            )}

            {/* 2. LIENZO (Centro - 100% cuando ambos paneles están ocultos) */}
            <div className="flex-1 min-w-0 overflow-hidden relative flex flex-col bg-slate-950">
              {/* Pestañas flotantes discretas cuando los paneles laterales están ocultos */}
              {!showLeftPanel && (
                <button
                  type="button"
                  onClick={() => setShowLeftPanel(true)}
                  className="absolute top-3 left-3 z-20 px-2.5 py-1.5 bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 hover:border-amber-500/50 text-slate-200 hover:text-amber-300 rounded-xl text-[11px] font-bold flex items-center gap-1.5 shadow-lg backdrop-blur-sm transition-all cursor-pointer no-print min-h-[34px]"
                  title="Mostrar Panel de Símbolos"
                >
                  <PanelLeft className="w-3.5 h-3.5 text-amber-400" />
                  <span>Símbolos</span>
                </button>
              )}

              {!showRightPanel && (
                <button
                  type="button"
                  onClick={() => setShowRightPanel(true)}
                  className="absolute top-3 right-3 z-20 px-2.5 py-1.5 bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 hover:border-amber-500/50 text-slate-200 hover:text-amber-300 rounded-xl text-[11px] font-bold flex items-center gap-1.5 shadow-lg backdrop-blur-sm transition-all cursor-pointer no-print min-h-[34px]"
                  title="Mostrar Panel de Información del Elemento"
                >
                  <PanelRight className="w-3.5 h-3.5 text-amber-400" />
                  <span>{selectedNode ? `Info: ${selectedNode.nombre?.slice(0, 14)}` : 'Información'}</span>
                </button>
              )}

              <div className="flex-1 overflow-hidden">
                <DiagramaUnifilarBlueprint
                  elementos={elementos}
                  companyName={companyName}
                  projectName={projectName}
                  interactive={true}
                  selectedNodeId={selectedNode?.id}
                  onNodeSelect={handleNodeClick}
                />
              </div>
            </div>

            {/* 3. PANEL DE PROPIEDADES (Derecha - Ocultable / Overlay en Tablet) */}
            {showRightPanel && (
            <div className={`${
              isNarrowScreen
                ? 'absolute inset-y-0 right-0 z-30 w-80 max-w-[90vw] bg-slate-950 shadow-2xl'
                : 'w-80 bg-slate-955/60 shrink-0'
            } p-5 overflow-y-auto flex flex-col justify-between border-l border-slate-800/80 no-print select-none`}>
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800/80 lg:hidden">
                <span className="text-[10px] font-mono font-bold text-amber-400 uppercase tracking-wider">Información del Equipo</span>
                <button
                  type="button"
                  onClick={() => setShowRightPanel(false)}
                  className="p-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
                  title="Cerrar panel de información"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              {selectedNode ? (
                <div className="space-y-5 flex-1 flex flex-col justify-between">
                  <div className="space-y-5">
                    {/* Ficha técnica cabecera */}
                    <div className="space-y-1.5 pb-4 border-b border-slate-850">
                      <div className="flex justify-between items-start">
                        <span className="text-[9px] font-mono font-bold text-slate-550 uppercase tracking-widest">FICHA TÉCNICA</span>
                        <span className="text-[9.5px] font-mono font-bold px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-amber-500 uppercase">
                          {selectedNode.tipoElemento}
                        </span>
                      </div>
                      <h4 className="text-sm font-black text-slate-100 tracking-wide font-mono uppercase truncate">{selectedNode.nombre}</h4>
                      <span className="text-[9.5px] font-mono font-bold text-slate-500">ID: {getElementCode(selectedNode, selectedNode.tipoElemento)}</span>
                    </div>

                    {/* Formulario de Edición */}
                    <form onSubmit={handleSaveProperties} className="space-y-4 text-xs font-mono">
                      <div>
                        <label className="block text-slate-450 font-bold mb-1 uppercase text-[9px] tracking-wider">Nombre del Equipo</label>
                        <input
                          type="text"
                          value={editNombre}
                          onChange={(e) => setEditNombre(e.target.value)}
                          placeholder="Ej. Tablero General A"
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-amber-500 font-sans"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-450 font-bold mb-1 uppercase text-[9px] tracking-wider">Tipo de Equipo</label>
                        <select
                          value={editTipo}
                          onChange={(e) => setEditTipo(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-amber-500 font-sans cursor-pointer"
                        >
                          <option value="TABLERO">Tablero Eléctrico</option>
                          <option value="TRANSFORMADOR">Transformador</option>
                          <option value="GENERADOR">Generador / Planta</option>
                          <option value="TRANSFER">Transferencia (ATS/MTS)</option>
                          <option value="SUBESTACION">Celda Subestación</option>
                          <option value="OTRO">Otro Elemento</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-slate-450 font-bold mb-1 uppercase text-[9px] tracking-wider">Ubicación Física</label>
                        <input
                          type="text"
                          value={editUbicacion}
                          onChange={(e) => setEditUbicacion(e.target.value)}
                          placeholder="Ej. Cuarto de Bombas"
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-amber-500 font-sans"
                        />
                      </div>

                      {/* Dropdown de Alimentación Jerárquico (Padre) */}
                      <div>
                        <SelectorAlimentadorJerarquico
                          proyectoId={proyectoId || selectedNode?.proyectoId}
                          tableroActualId={selectedNode?.id}
                          elementosList={elementos}
                          value={editAlimentadoPor}
                          multiple={false}
                          tipoElementoActual={editTipo}
                          direccionRelacion="ALIMENTADO_POR"
                          onChange={(val, primaryObj, ids) => {
                            setEditAlimentadoPor(val ? val.toUpperCase() : '');
                            setEditAlimentadoPorId(primaryObj?.id || ids?.[0] || null);
                          }}
                          label="Alimentado por (Origen de Flujo)"
                          placeholder="Ninguno (Origen del Sistema)..."
                        />
                      </div>

                      {/* Dropdown de Cargas Aguas Abajo (Alimenta A) */}
                      {editTipo !== 'TABLERO' && (
                        <div>
                          <SelectorAlimentadorJerarquico
                            proyectoId={proyectoId || selectedNode?.proyectoId}
                            tableroActualId={selectedNode?.id}
                            elementosList={elementos}
                            value={editAlimentaA}
                            multiple={true}
                            onChange={(formatted, primaryObj, ids) => {
                              setEditAlimentaA(formatted ? formatted.toUpperCase() : '');
                              setEditAlimentaAIds(Array.isArray(ids) ? ids : []);
                            }}
                            label="Alimenta A (Cargas Aguas Abajo / Salidas)"
                            placeholder="Ninguno (Elemento terminal)..."
                          />
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-slate-450 font-bold mb-1 uppercase text-[9px] tracking-wider">Capacidad / KVA</label>
                          <input
                            type="text"
                            value={editKva}
                            onChange={(e) => setEditKva(e.target.value)}
                            placeholder="Ej. 150 kVA"
                            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-amber-500 font-sans"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-450 font-bold mb-1 uppercase text-[9px] tracking-wider">Fases / Polos</label>
                          <input
                            type="text"
                            value={editFases}
                            onChange={(e) => setEditFases(e.target.value)}
                            placeholder="Ej. 3F / 42P"
                            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-amber-500 font-sans"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-slate-450 font-bold mb-1 uppercase text-[9px] tracking-wider font-mono">Observaciones</label>
                        <textarea
                          value={editObservaciones}
                          onChange={(e) => setEditObservaciones(e.target.value)}
                          placeholder="Notas del equipo..."
                          rows="3"
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-amber-500 font-sans resize-none text-[11px]"
                        />
                      </div>

                      <button
                        type="submit"
                        className="w-full py-2 bg-amber-500 text-slate-950 font-black hover:bg-amber-400 active:scale-98 transition-all rounded-xl cursor-pointer text-center font-sans shadow-md flex items-center justify-center gap-1.5"
                      >
                        <Check className="w-4 h-4" /> Guardar Cambios
                      </button>
                    </form>
                  </div>

                  {/* Acciones Rápidas del Nodo (Navegar y Eliminar) */}
                  <div className="space-y-2.5 pt-4 border-t border-slate-855 mt-6 shrink-0">
                    {selectedNode.tipoElemento === 'TABLERO' && (
                      <button
                        onClick={() => {
                          onClose();
                          navigate(`/empresa/${selectedNode.empresaId || companyId}/tablero/${selectedNode.id}`);
                        }}
                        className="w-full bg-slate-100 text-slate-950 font-black hover:bg-white active:scale-98 transition-all px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 text-xs cursor-pointer shadow-md"
                      >
                        Abrir Ficha de Polos <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    )}
                    
                    {user?.role === 'ADMIN' && (
                      <button
                        onClick={handleDeleteElement}
                        className="w-full bg-red-950/20 hover:bg-red-900/30 border border-red-900/40 text-red-400 font-bold transition-all px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 text-xs cursor-pointer shadow-sm"
                        title="Eliminar equipo (Atajo: Tecla Supr / Delete)"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Eliminar Equipo (Supr)
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-20 space-y-3 flex-1 flex flex-col justify-center items-center">
                  <Info className="w-8 h-8 text-slate-700" />
                  <p className="text-[10px] text-slate-500 max-w-[200px] font-sans leading-relaxed">
                    Haz clic sobre cualquier equipo en el diagrama unifilar para ver o editar sus especificaciones técnicas, cambiar sus conexiones o eliminarlo.
                  </p>
                </div>
              )}
            </div>
            )}

          </div>

        </div>
      </div>

      {showDeleteModal && selectedNode && user?.role === 'ADMIN' && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 print:hidden">
          <div onClick={() => !isDeleting && setShowDeleteModal(false)} className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm" />
          <form
            onSubmit={handleConfirmDeleteElement}
            className="relative w-full max-w-md bg-slate-950 border border-red-900/60 rounded-2xl shadow-2xl p-6 space-y-4"
          >
            <div className="flex items-center gap-2 text-red-400">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <h3 className="text-sm font-bold uppercase tracking-wider">Eliminación de Equipo</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Esta acción eliminará de forma irreversible el equipo <strong>{selectedNode.nombre}</strong> y sus circuitos asociados. Ingresa tu contraseña de administrador para confirmar:
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
                onClick={() => setShowDeleteModal(false)}
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
                {isDeleting ? (<><Loader2 className="w-3.5 h-3.5 animate-spin" /><span>Eliminando...</span></>) : 'Eliminar Equipo'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Versión invisible para imprimir que se activa con el print CSS */}
      <div className="hidden print:block fixed inset-0 bg-white z-50 w-screen h-screen p-0 m-0">
        <DiagramaUnifilarBlueprint
          elementos={elementos}
          companyName={companyName}
          projectName={projectName}
          interactive={false}
        />
      </div>
    </>
  );
}
