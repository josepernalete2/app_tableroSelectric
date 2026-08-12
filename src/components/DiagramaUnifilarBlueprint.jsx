import React, { useState, useMemo, useRef, useEffect } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, Link2 } from 'lucide-react';
import useStore from '../store/useStore';

export default function DiagramaUnifilarBlueprint({ 
  elementos = [], 
  companyName = 'EMPRESA', 
  projectName = 'PROYECTO', 
  interactive = false,
  selectedNodeId = null,
  onNodeSelect = null
}) {
  const containerRef = useRef(null);
  const { updateElementoUnifilar } = useStore();

  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // Estados de arrastre de Nodos individuales
  const [activeDragNodeId, setActiveDragNodeId] = useState(null);
  const [dragStartMouse, setDragStartMouse] = useState({ x: 0, y: 0 });
  const [dragStartNodePos, setDragStartNodePos] = useState({ x: 0, y: 0 });
  const [tempNodePositions, setTempNodePositions] = useState({}); // { [nodeId]: { x, y } }

  // 1. Procesar jerarquía y niveles (para auto-layout inicial)
  const { nodes, levels, maxNodesInLevel, depth } = useMemo(() => {
    if (!elementos || elementos.length === 0) {
      return { nodes: [], levels: {}, maxNodesInLevel: 0, depth: 0 };
    }

    const nameToNodeMap = new Map();
    elementos.forEach((el) => {
      if (el.nombre) {
        nameToNodeMap.set(el.nombre.toLowerCase().trim(), el);
      }
      if (el.id) {
        nameToNodeMap.set(el.id.toLowerCase().trim(), el);
      }
    });

    const processedNodes = elementos.map((el) => {
      const parentName = el.alimentadoPor ? el.alimentadoPor.toLowerCase().trim() : null;
      const parent = parentName ? nameToNodeMap.get(parentName) : null;
      return {
        ...el,
        parentId: parent ? parent.id : null,
        children: []
      };
    });

    const nodeMap = new Map(processedNodes.map(n => [n.id, n]));
    const roots = [];

    processedNodes.forEach((node) => {
      if (node.parentId && nodeMap.has(node.parentId)) {
        nodeMap.get(node.parentId).children.push(node.id);
      } else {
        roots.push(node.id);
      }
    });

    const levelsMap = {};
    const nodeLevels = {};
    const queue = roots.map(id => ({ id, level: 0 }));

    while (queue.length > 0) {
      const { id, level } = queue.shift();
      const node = nodeMap.get(id);
      if (!node) continue;

      nodeLevels[id] = level;
      if (!levelsMap[level]) levelsMap[level] = [];
      levelsMap[level].push(id);

      node.children.forEach(childId => {
        queue.push({ id: childId, level: level + 1 });
      });
    }

    const finalNodes = processedNodes.map(n => ({
      ...n,
      level: nodeLevels[n.id] !== undefined ? nodeLevels[n.id] : 0
    }));

    let maxCount = 0;
    Object.keys(levelsMap).forEach(lvl => {
      maxCount = Math.max(maxCount, levelsMap[lvl].length);
    });

    return {
      nodes: finalNodes,
      levels: levelsMap,
      maxNodesInLevel: maxCount,
      depth: Object.keys(levelsMap).length
    };
  }, [elementos]);

  // Dimensiones fijas del lienzo CAD para libre posicionamiento (expandible si hay muchos niveles)
  const width = Math.max(1600, maxNodesInLevel * 250 + 200);
  const height = Math.max(1200, depth * 220 + 200);

  // Coordenadas calculadas de auto-layout (como fallback)
  const autoLayoutCoords = useMemo(() => {
    const coords = {};
    Object.keys(levels).forEach((lvlStr) => {
      const lvl = parseInt(lvlStr, 10);
      const lvlNodes = levels[lvl];
      const count = lvlNodes.length;
      const y = 120 + lvl * 180;

      lvlNodes.forEach((id, idx) => {
        const x = (idx + 0.5) * (width / count);
        coords[id] = { x, y };
      });
    });
    return coords;
  }, [levels, width]);

  // Obtener coordenadas finales de un nodo (prioriza temp -> custom -> auto)
  const getNodeCoords = (nodeId) => {
    if (tempNodePositions[nodeId]) {
      return tempNodePositions[nodeId];
    }
    const node = nodes.find(n => n.id === nodeId);
    if (node && node.datosTecnicos?.positionX !== undefined && node.datosTecnicos?.positionY !== undefined) {
      return { 
        x: parseFloat(node.datosTecnicos.positionX), 
        y: parseFloat(node.datosTecnicos.positionY) 
      };
    }
    return autoLayoutCoords[nodeId] || { x: 200, y: 200 };
  };

  // PANNING (Arrastrar lienzo completo)
  const handleCanvasMouseDown = (e) => {
    if (!interactive) return;
    if (e.button !== 0) return; // solo click izquierdo
    if (e.target.closest('.node-element')) return; // No hacer pan si arrastramos un nodo
    
    setIsPanning(true);
    setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleCanvasMouseMove = (e) => {
    if (interactive && isPanning) {
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y
      });
    }

    // Manejar arrastre activo del nodo
    if (interactive && activeDragNodeId) {
      const deltaX = (e.clientX - dragStartMouse.x) / zoom;
      const deltaY = (e.clientY - dragStartMouse.y) / zoom;
      
      setTempNodePositions(prev => ({
        ...prev,
        [activeDragNodeId]: {
          x: dragStartNodePos.x + deltaX,
          y: dragStartNodePos.y + deltaY
        }
      }));
    }
  };

  const handleCanvasMouseUp = () => {
    setIsPanning(false);

    // Finalizar arrastre de nodo y guardar
    if (activeDragNodeId) {
      const finalPos = tempNodePositions[activeDragNodeId];
      if (finalPos) {
        // Snapping a la rejilla de 20px
        const snappedX = Math.round(finalPos.x / 20) * 20;
        const snappedY = Math.round(finalPos.y / 20) * 20;
        
        const node = nodes.find(n => n.id === activeDragNodeId);
        if (node) {
          updateElementoUnifilar(node.proyectoId, activeDragNodeId, {
            datosTecnicos: {
              ...node.datosTecnicos,
              positionX: snappedX,
              positionY: snappedY
            }
          });
        }
      }
      setActiveDragNodeId(null);
    }
  };

  // TOUCH SUPPORT para móviles e iPads
  const handleTouchStart = (e) => {
    if (!interactive) return;
    const touch = e.touches[0];
    if (e.target.closest('.node-element')) {
      const nodeEl = e.target.closest('.node-element');
      const nodeId = nodeEl.dataset.nodeid;
      const startPos = getNodeCoords(nodeId);
      
      setActiveDragNodeId(nodeId);
      setDragStartMouse({ x: touch.clientX, y: touch.clientY });
      setDragStartNodePos(startPos);
    } else {
      setIsPanning(true);
      setPanStart({ x: touch.clientX - pan.x, y: touch.clientY - pan.y });
    }
  };

  const handleTouchMove = (e) => {
    if (!interactive) return;
    const touch = e.touches[0];

    if (activeDragNodeId) {
      const deltaX = (touch.clientX - dragStartMouse.x) / zoom;
      const deltaY = (touch.clientY - dragStartMouse.y) / zoom;
      setTempNodePositions(prev => ({
        ...prev,
        [activeDragNodeId]: {
          x: dragStartNodePos.x + deltaX,
          y: dragStartNodePos.y + deltaY
        }
      }));
    } else if (isPanning) {
      setPan({
        x: touch.clientX - panStart.x,
        y: touch.clientY - panStart.y
      });
    }
  };

  // WHEEL ZOOM
  const handleWheel = (e) => {
    if (!interactive) return;
    e.preventDefault();
    const scaleFactor = 1.1;
    if (e.deltaY < 0) {
      setZoom(prev => Math.min(3, prev * scaleFactor));
    } else {
      setZoom(prev => Math.max(0.3, prev / scaleFactor));
    }
  };

  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setTempNodePositions({});
  };

  // RENDERIZADO DE SÍMBOLOS ELÉCTRICOS
  const renderNodeSymbol = (type, isPrint) => {
    const accentColor = isPrint ? '#000000' : '#f59e0b';
    const trafoColor = isPrint ? '#000000' : '#8b5cf6';
    const transferColor = isPrint ? '#000000' : '#10b981';
    const capacitorColor = isPrint ? '#000000' : '#06b6d4';
    const subColor = isPrint ? '#000000' : '#ec4899';
    const activeFill = isPrint ? 'none' : undefined;

    switch (type) {
      case 'GENERADOR':
        return (
          <g>
            <circle cx="0" cy="0" r="20" fill={activeFill || '#1e1b4b'} stroke={accentColor} strokeWidth="2.5" />
            <text x="0" y="5" textAnchor="middle" fill={accentColor} className="text-sm font-black font-mono">G</text>
          </g>
        );
      case 'TRANSFORMADOR':
        return (
          <g transform="scale(1)">
            <circle cx="0" cy="-8" r="14" fill="none" stroke={trafoColor} strokeWidth="2.5" />
            <circle cx="0" cy="8" r="14" fill="none" stroke={trafoColor} strokeWidth="2.5" />
          </g>
        );
      case 'TRANSFER':
        return (
          <g>
            <rect x="-24" y="-14" width="48" height="28" rx="5" fill={activeFill || '#022c22'} stroke={transferColor} strokeWidth="2.5" />
            <text x="0" y="4" textAnchor="middle" fill={transferColor} className="text-[9px] font-black font-mono">ATS</text>
          </g>
        );
      case 'PUESTA_TIERRA':
        return (
          <g transform="scale(0.9)">
            <line x1="0" y1="-18" x2="0" y2="4" stroke={transferColor} strokeWidth="2.5" />
            <line x1="-14" y1="4" x2="14" y2="4" stroke={transferColor} strokeWidth="2.5" />
            <line x1="-9" y1="10" x2="9" y2="10" stroke={transferColor} strokeWidth="2" />
            <line x1="-4" y1="16" x2="4" y2="16" stroke={transferColor} strokeWidth="1.5" />
          </g>
        );
      case 'SUBESTACION':
        return (
          <g>
            <polygon points="0,-20 18,-6 11,16 -11,16 -18,-6" fill={activeFill || '#311042'} stroke={subColor} strokeWidth="2.5" />
            <rect x="-6" y="-6" width="12" height="12" fill="none" stroke={subColor} strokeWidth="1.5" />
          </g>
        );
      case 'BANCO_CONDENSADOR':
      case 'OTRO':
        return (
          <g>
            <circle cx="0" cy="0" r="18" fill={activeFill || '#083344'} stroke={capacitorColor} strokeWidth="2.5" />
            <line x1="-5" y1="-8" x2="-5" y2="8" stroke={capacitorColor} strokeWidth="2" />
            <line x1="5" y1="-8" x2="5" y2="8" stroke={capacitorColor} strokeWidth="2" />
            <line x1="-12" y1="0" x2="-5" y2="0" stroke={capacitorColor} strokeWidth="1.5" />
            <line x1="5" y1="0" x2="12" y2="0" stroke={capacitorColor} strokeWidth="1.5" />
          </g>
        );
      case 'TABLERO':
      default:
        return (
          <g>
            <rect x="-26" y="-18" width="52" height="36" rx="4" fill={activeFill || '#082f49'} stroke={isPrint ? '#000000' : '#0ea5e9'} strokeWidth="2.5" />
            <line x1="0" y1="-14" x2="0" y2="14" stroke={isPrint ? '#000000' : '#0ea5e9'} strokeWidth="1" strokeDasharray="3,3" />
            <rect x="-18" y="-11" width="8" height="5" fill={isPrint ? '#000000' : '#0ea5e9'} />
            <rect x="10" y="-3" width="8" height="5" fill={isPrint ? '#000000' : '#0ea5e9'} />
            <rect x="-18" y="5" width="8" height="5" fill={isPrint ? '#000000' : '#0ea5e9'} />
          </g>
        );
    }
  };

  const isDarkTheme = interactive;

  return (
    <div 
      className={`w-full select-none ${
        isDarkTheme 
          ? 'bg-slate-950 text-slate-100 flex flex-col h-full' 
          : 'bg-white text-black p-4 border-2 border-black rounded-lg page-break'
      }`}
    >
      {/* Barra de Control de Navegación del Lienzo */}
      {isDarkTheme && (
        <div className="flex justify-between items-center p-2.5 border-b border-slate-900 bg-slate-950 no-print shrink-0">
          <span className="text-[9.5px] font-mono font-bold text-slate-500 uppercase tracking-wider">
            Arrastra elementos para moverlos • Arrastra el fondo para desplazar • Doble clic para reiniciar vista
          </span>
          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 p-0.5 rounded-lg">
            <button 
              onClick={() => setZoom(prev => Math.max(0.3, prev - 0.15))}
              className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded transition-colors cursor-pointer"
              title="Alejar"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[9px] font-mono font-bold px-2 text-slate-400">
              {Math.round(zoom * 100)}%
            </span>
            <button 
              onClick={() => setZoom(prev => Math.min(3, prev + 0.15))}
              className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded transition-colors cursor-pointer"
              title="Acercar"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button 
              onClick={resetView}
              className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded transition-colors cursor-pointer"
              title="Restablecer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Rejilla y Lienzo SVG */}
      <div 
        ref={containerRef}
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={handleCanvasMouseMove}
        onMouseUp={handleCanvasMouseUp}
        onMouseLeave={handleCanvasMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleCanvasMouseUp}
        onWheel={handleWheel}
        onDoubleClick={resetView}
        className={`relative overflow-hidden flex-1 flex items-center justify-center ${
          isDarkTheme ? 'bg-slate-950/95 cursor-grab active:cursor-grabbing' : 'bg-white p-2 min-h-[550px]'
        }`}
      >
        {nodes.length === 0 ? (
          <div className="text-center p-8 text-xs text-slate-600 font-mono">
            No hay elementos unifilares en el diagrama. Agrega algunos desde la barra lateral izquierda.
          </div>
        ) : (
          <div
            style={isDarkTheme ? {
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: 'center center',
              transition: activeDragNodeId || isPanning ? 'none' : 'transform 0.15s ease-out'
            } : {
              width: '100%',
              height: 'auto'
            }}
            className="w-full flex items-center justify-center"
          >
            <svg 
              viewBox={`0 0 ${width} ${height}`} 
              width={isDarkTheme ? width : '100%'}
              height={isDarkTheme ? height : '100%'}
              className="overflow-visible font-mono select-none"
            >
              {/* Defs para Rejilla CAD y Marcadores */}
              <defs>
                {/* Rejilla CAD */}
                {isDarkTheme && (
                  <pattern id="cad-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                    <circle cx="20" cy="20" r="1" fill="#1e293b" />
                    <line x1="0" y1="0" x2="40" y2="0" stroke="#0f172a" strokeWidth="0.5" />
                    <line x1="0" y1="0" x2="0" y2="40" stroke="#0f172a" strokeWidth="0.5" />
                  </pattern>
                )}

                {/* Flechas */}
                <marker 
                  id="arrow-black" 
                  viewBox="0 0 10 10" 
                  refX="22" 
                  refY="5" 
                  markerWidth="5" 
                  markerHeight="5" 
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#000000" />
                </marker>
                <marker 
                  id="arrow-slate" 
                  viewBox="0 0 10 10" 
                  refX="22" 
                  refY="5" 
                  markerWidth="5" 
                  markerHeight="5" 
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#64748b" />
                </marker>
              </defs>

              {/* Fondo Rejilla CAD */}
              {isDarkTheme && (
                <rect width={width} height={height} fill="url(#cad-grid)" rx="8" />
              )}

              {/* 1. Líneas Conectoras (CAD Ortogonal con flechas) */}
              {nodes.map((node) => {
                if (!node.parentId) return null;
                const parentCoords = getNodeCoords(node.parentId);
                const childCoords = getNodeCoords(node.id);

                // Línea con ángulo de 90° (Ortogonal)
                const midY = (parentCoords.y + childCoords.y) / 2;
                const pathData = `M ${parentCoords.x} ${parentCoords.y} L ${parentCoords.x} ${midY} L ${childCoords.x} ${midY} L ${childCoords.x} ${childCoords.y}`;

                return (
                  <g key={`link-${node.id}`}>
                    {/* Línea interactiva gruesa invisible para facilitar el click/hover si se requiriera */}
                    <path 
                      d={pathData} 
                      fill="none" 
                      stroke="transparent" 
                      strokeWidth="10" 
                    />
                    {/* Línea visual */}
                    <path 
                      d={pathData} 
                      fill="none" 
                      stroke={isDarkTheme ? '#475569' : '#000000'} 
                      strokeWidth={isDarkTheme ? '2.5' : '1.5'} 
                      markerEnd={isDarkTheme ? 'url(#arrow-slate)' : 'url(#arrow-black)'}
                    />
                  </g>
                );
              })}

              {/* 2. Dibujar Nodos */}
              {nodes.map((node) => {
                const coords = getNodeCoords(node.id);
                const isSelected = selectedNodeId === node.id;

                return (
                  <g 
                    key={node.id} 
                    transform={`translate(${coords.x}, ${coords.y})`}
                    data-nodeid={node.id}
                    className="node-element group cursor-grab active:cursor-grabbing"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onNodeSelect) onNodeSelect(node);
                    }}
                    onMouseDown={(e) => {
                      if (!interactive) return;
                      e.stopPropagation();
                      setActiveDragNodeId(node.id);
                      setDragStartMouse({ x: e.clientX, y: e.clientY });
                      setDragStartNodePos(coords);
                    }}
                  >
                    {/* Outline de Selección (Estilo CAD fluorescente) */}
                    {isDarkTheme && isSelected && (
                      <rect 
                        x="-34" 
                        y="-26" 
                        width="68" 
                        height="52" 
                        rx="8" 
                        fill="none" 
                        stroke="#f59e0b" 
                        strokeWidth="2.5" 
                        strokeDasharray="4,3" 
                        className="animate-pulse" 
                      />
                    )}

                    {/* Símbolo de Componente */}
                    {renderNodeSymbol(node.tipoElemento, !isDarkTheme)}

                    {/* Texto del Nombre del Equipo */}
                    <text 
                      x="0" 
                      y="36" 
                      textAnchor="middle" 
                      fontSize="9.5"
                      fontWeight="black"
                      fill={isDarkTheme ? (isSelected ? '#f59e0b' : '#cbd5e1') : '#000000'}
                      className="font-sans select-none tracking-wide"
                    >
                      {node.nombre.length > 22 ? `${node.nombre.slice(0, 20)}...` : node.nombre}
                    </text>

                    {/* Identificador (ID) del Equipo */}
                    <text 
                      x="0" 
                      y="-28" 
                      textAnchor="middle" 
                      fontSize="8"
                      fontWeight="bold"
                      fill={isDarkTheme ? '#64748b' : '#334155'}
                      className="font-mono select-none"
                    >
                      {node.id}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        )}
      </div>

      {/* Leyenda y Cajetín en la parte inferior para el Informe y PDF impreso */}
      {!isDarkTheme && (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 border-t-2 border-black pt-4 font-mono text-black text-[10px] uppercase">
          
          {/* Columna 1 y 2: LEYENDA TÉCNICA */}
          <div className="md:col-span-2 border border-black p-3 rounded bg-white">
            <h4 className="font-black text-xs border-b border-black pb-1 mb-2">Leyenda Unifilar</h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              <div className="flex items-center gap-2">
                <svg width="24" height="24" className="overflow-visible shrink-0">
                  <rect x="2" y="2" width="20" height="20" fill="none" stroke="black" strokeWidth="1.5" />
                  <line x1="12" y1="2" x2="12" y2="22" stroke="black" strokeWidth="1" strokeDasharray="1,1" />
                </svg>
                <span>Tablero / Panel</span>
              </div>
              <div className="flex items-center gap-2">
                <svg width="24" height="24" className="overflow-visible shrink-0">
                  <circle cx="12" cy="7" r="8" fill="none" stroke="black" strokeWidth="1.5" />
                  <circle cx="12" cy="17" r="8" fill="none" stroke="black" strokeWidth="1.5" />
                </svg>
                <span>Transformador</span>
              </div>
              <div className="flex items-center gap-2">
                <svg width="24" height="24" className="overflow-visible shrink-0">
                  <circle cx="12" cy="12" r="10" fill="none" stroke="black" strokeWidth="1.5" />
                  <text x="12" y="15" textAnchor="middle" fontSize="10" fontWeight="bold">G</text>
                </svg>
                <span>Generador</span>
              </div>
              <div className="flex items-center gap-2">
                <svg width="24" height="24" className="overflow-visible shrink-0">
                  <rect x="2" y="5" width="20" height="14" fill="none" stroke="black" strokeWidth="1.5" />
                  <text x="12" y="15" textAnchor="middle" fontSize="7" fontWeight="bold">ATS</text>
                </svg>
                <span>Transfer (ATS)</span>
              </div>
              <div className="flex items-center gap-2">
                <svg width="24" height="24" className="overflow-visible shrink-0">
                  <circle cx="12" cy="12" r="9" fill="none" stroke="black" strokeWidth="1.5" />
                  <line x1="9" y1="8" x2="9" y2="16" stroke="black" strokeWidth="1.5" />
                  <line x1="15" y1="8" x2="15" y2="16" stroke="black" strokeWidth="1.5" />
                </svg>
                <span>Banco Condens.</span>
              </div>
              <div className="flex items-center gap-2">
                <svg width="24" height="24" className="overflow-visible shrink-0">
                  <line x1="12" y1="2" x2="12" y2="14" stroke="black" strokeWidth="1.5" />
                  <line x1="4" y1="14" x2="20" y2="14" stroke="black" strokeWidth="1.5" />
                  <line x1="8" y1="18" x2="16" y2="18" stroke="black" strokeWidth="1.5" />
                </svg>
                <span>Puesta a Tierra</span>
              </div>
            </div>
          </div>

          {/* Columna 3: CAJETÍN DE DATOS */}
          <div className="border border-black p-3 rounded bg-white flex flex-col justify-between space-y-1">
            <div>
              <div className="border-b border-black pb-1 mb-1.5 flex justify-between items-center">
                <h4 className="font-black text-xs">Datos del Plano</h4>
                <span className="text-[8px] bg-black text-white px-1.5 py-0.5 rounded font-sans">CAD</span>
              </div>
              <p className="truncate"><strong className="text-slate-600">Empresa:</strong> {companyName}</p>
              <p className="truncate"><strong className="text-slate-600">Proyecto:</strong> {projectName}</p>
              <p className="truncate"><strong className="text-slate-600">Contenido:</strong> Diagrama Unifilar</p>
            </div>
            
            <div className="border-t border-black/30 pt-1.5 text-[8px] flex justify-between items-center text-slate-600 font-sans">
              <span>Fecha: {new Date().toLocaleDateString('es-ES')}</span>
              <span className="font-mono text-black font-bold text-[9px] border border-black px-1">PLANO N° IE-01</span>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
