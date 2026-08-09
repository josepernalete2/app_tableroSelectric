import React, { useState, useMemo, useRef, useEffect } from 'react';
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

export default function DiagramaUnifilarBlueprint({ 
  elementos = [], 
  companyName = 'EMPRESA', 
  projectName = 'PROYECTO', 
  interactive = false 
}) {
  const containerRef = useRef(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // 1. Procesar jerarquía y niveles
  const { nodes, levels, maxNodesInLevel, depth } = useMemo(() => {
    if (!elementos || elementos.length === 0) {
      return { nodes: [], levels: {}, maxNodesInLevel: 0, depth: 0 };
    }

    // Normalizar nombres para mapeo de parentId
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

  // Dimensiones del diagrama
  const width = Math.max(900, maxNodesInLevel * 200 + 100);
  const height = Math.max(500, depth * 160 + 100);

  // Coordenadas calculadas de los nodos
  const nodeCoords = useMemo(() => {
    const coords = {};
    Object.keys(levels).forEach((lvlStr) => {
      const lvl = parseInt(lvlStr, 10);
      const lvlNodes = levels[lvl];
      const count = lvlNodes.length;
      const y = 80 + lvl * 150;

      lvlNodes.forEach((id, idx) => {
        const x = (idx + 0.5) * (width / count);
        coords[id] = { x, y };
      });
    });
    return coords;
  }, [levels, width]);

  // Dragging event handlers
  const handleMouseDown = (e) => {
    if (!interactive) return;
    if (e.button !== 0) return; // solo click izquierdo
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e) => {
    if (!isDragging || !interactive) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch support for dragging
  const handleTouchStart = (e) => {
    if (!interactive || e.touches.length !== 1) return;
    setIsDragging(true);
    setDragStart({ 
      x: e.touches[0].clientX - pan.x, 
      y: e.touches[0].clientY - pan.y 
    });
  };

  const handleTouchMove = (e) => {
    if (!isDragging || !interactive || e.touches.length !== 1) return;
    setPan({
      x: e.touches[0].clientX - dragStart.x,
      y: e.touches[0].clientY - dragStart.y
    });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // Wheel zoom support
  const handleWheel = (e) => {
    if (!interactive) return;
    e.preventDefault();
    const scaleFactor = 1.1;
    if (e.deltaY < 0) {
      setZoom(prev => Math.min(3, prev * scaleFactor));
    } else {
      setZoom(prev => Math.max(0.4, prev / scaleFactor));
    }
  };

  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // Renderizado de Símbolos en formato Blueprint B&W o Interactivos
  const renderNodeSymbol = (type, isPrint) => {
    const strokeColor = isPrint ? '#000000' : '#ffffff';
    const accentColor = isPrint ? '#000000' : '#f59e0b';
    const trafoColor = isPrint ? '#000000' : '#8b5cf6';
    const transferColor = isPrint ? '#000000' : '#10b981';
    const capacitorColor = isPrint ? '#000000' : '#06b6d4';
    const activeFill = isPrint ? 'none' : undefined;

    switch (type) {
      case 'GENERADOR':
        return (
          <g>
            <circle cx="0" cy="0" r="20" fill={activeFill || '#1e1b4b'} stroke={accentColor} strokeWidth="2" />
            <text x="0" y="5" textAnchor="middle" fill={accentColor} className="text-sm font-bold font-mono">G</text>
          </g>
        );
      case 'TRANSFORMADOR':
        return (
          <g transform="scale(0.9)">
            <circle cx="0" cy="-7" r="14" fill="none" stroke={trafoColor} strokeWidth="2" />
            <circle cx="0" cy="7" r="14" fill="none" stroke={trafoColor} strokeWidth="2" />
          </g>
        );
      case 'TRANSFER':
        return (
          <g>
            <rect x="-24" y="-14" width="48" height="28" rx="4" fill={activeFill || '#022c22'} stroke={transferColor} strokeWidth="2" />
            <text x="0" y="4" textAnchor="middle" fill={transferColor} className="text-[9px] font-black font-mono">ATS</text>
          </g>
        );
      case 'PUESTA_TIERRA':
        return (
          <g transform="scale(0.8)">
            <line x1="0" y1="-15" x2="0" y2="5" stroke={transferColor} strokeWidth="2" />
            <line x1="-12" y1="5" x2="12" y2="5" stroke={transferColor} strokeWidth="2" />
            <line x1="-8" y1="10" x2="8" y2="10" stroke={transferColor} strokeWidth="2" />
            <line x1="-4" y1="15" x2="4" y2="15" stroke={transferColor} strokeWidth="2" />
          </g>
        );
      case 'BANCO_CONDENSADOR':
        return (
          <g>
            <circle cx="0" cy="0" r="18" fill={activeFill || '#083344'} stroke={capacitorColor} strokeWidth="2" />
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
            <rect x="-26" y="-18" width="52" height="36" rx="4" fill={activeFill || '#082f49'} stroke={isPrint ? '#000000' : '#0ea5e9'} strokeWidth="2" />
            <line x1="0" y1="-14" x2="0" y2="14" stroke={isPrint ? '#000000' : '#0ea5e9'} strokeWidth="1" strokeDasharray="2,2" />
            <rect x="-18" y="-12" width="8" height="5" fill={isPrint ? '#000000' : '#0ea5e9'} />
            <rect x="10" y="-4" width="8" height="5" fill={isPrint ? '#000000' : '#0ea5e9'} />
            <rect x="-18" y="4" width="8" height="5" fill={isPrint ? '#000000' : '#0ea5e9'} />
          </g>
        );
    }
  };

  const isDarkTheme = interactive;

  return (
    <div 
      className={`w-full select-none ${
        isDarkTheme 
          ? 'bg-slate-950/80 text-slate-100 flex flex-col h-full' 
          : 'bg-white text-black p-4 border-2 border-black rounded-lg page-break'
      }`}
    >
      {/* Botones de Control en Modo Interactivo */}
      {isDarkTheme && (
        <div className="flex justify-between items-center p-3 border-b border-slate-800 bg-slate-900/60 no-print shrink-0">
          <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest">
            Control de Navegación: Arrastra para mover | Scroll para Zoom
          </span>
          <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-850 p-0.5 rounded-lg">
            <button 
              onClick={() => setZoom(prev => Math.max(0.4, prev - 0.15))}
              className="p-1 hover:bg-slate-900 text-slate-400 hover:text-white rounded transition-colors"
              title="Alejar"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[9px] font-mono font-bold px-2 text-slate-400">
              {Math.round(zoom * 100)}%
            </span>
            <button 
              onClick={() => setZoom(prev => Math.min(3, prev + 0.15))}
              className="p-1 hover:bg-slate-900 text-slate-400 hover:text-white rounded transition-colors"
              title="Acercar"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button 
              onClick={resetView}
              className="p-1 hover:bg-slate-900 text-slate-400 hover:text-white rounded transition-colors"
              title="Restablecer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Área del Diagrama */}
      <div 
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onWheel={handleWheel}
        className={`relative overflow-hidden flex-1 flex items-center justify-center ${
          isDarkTheme ? 'bg-slate-950 cursor-grab active:cursor-grabbing' : 'bg-white p-2 min-h-[500px]'
        }`}
      >
        {nodes.length === 0 ? (
          <div className="text-center p-8 text-xs text-slate-500 font-mono">
            No hay elementos unifilares para graficar.
          </div>
        ) : (
          <div
            style={isDarkTheme ? {
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: 'center center',
              transition: isDragging ? 'none' : 'transform 0.15s ease-out'
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
              {/* Definición de Flechas de Conexión */}
              <defs>
                <marker 
                  id="arrow-black" 
                  viewBox="0 0 10 10" 
                  refX="14" 
                  refY="5" 
                  markerWidth="5" 
                  markerHeight="5" 
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 10 5 L 0 9 z" fill="#000000" />
                </marker>
                <marker 
                  id="arrow-slate" 
                  viewBox="0 0 10 10" 
                  refX="14" 
                  refY="5" 
                  markerWidth="5" 
                  markerHeight="5" 
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 10 5 L 0 9 z" fill="#475569" />
                </marker>
              </defs>

              {/* 1. Líneas Conectoras (Estilo Planos Eléctricos CAD Ortogonales) */}
              {nodes.map((node) => {
                if (!node.parentId || !nodeCoords[node.parentId]) return null;
                const parent = nodeCoords[node.parentId];
                const child = nodeCoords[node.id];

                // Línea con ángulo de 90° (Ortogonal)
                const midY = (parent.y + child.y) / 2;
                const pathData = `M ${parent.x} ${parent.y} L ${parent.x} ${midY} L ${child.x} ${midY} L ${child.x} ${child.y}`;

                return (
                  <path 
                    key={`link-${node.id}`} 
                    d={pathData} 
                    fill="none" 
                    stroke={isDarkTheme ? '#334155' : '#000000'} 
                    strokeWidth={isDarkTheme ? '2.5' : '1.5'} 
                    markerEnd={isDarkTheme ? 'url(#arrow-slate)' : 'url(#arrow-black)'}
                  />
                );
              })}

              {/* 2. Dibujar Nodos */}
              {nodes.map((node) => {
                const coords = nodeCoords[node.id];
                if (!coords) return null;

                return (
                  <g 
                    key={node.id} 
                    transform={`translate(${coords.x}, ${coords.y})`}
                  >
                    {/* Símbolo de Componente */}
                    {renderNodeSymbol(node.tipoElemento, !isDarkTheme)}

                    {/* Texto del Nombre del Equipo */}
                    <text 
                      x="0" 
                      y="32" 
                      textAnchor="middle" 
                      fontSize="9"
                      fontWeight="bold"
                      fill={isDarkTheme ? '#cbd5e1' : '#000000'}
                    >
                      {node.nombre.length > 24 ? `${node.nombre.slice(0, 22)}...` : node.nombre}
                    </text>

                    {/* Identificador (ID) del Equipo */}
                    <text 
                      x="0" 
                      y="-26" 
                      textAnchor="middle" 
                      fontSize="8"
                      fontWeight="bold"
                      fill={isDarkTheme ? '#64748b' : '#334155'}
                      className="font-mono"
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
