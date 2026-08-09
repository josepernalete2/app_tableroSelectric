import React, { useState, useMemo } from 'react';
import { X, ZoomIn, ZoomOut, Maximize2, FileText, ExternalLink, Info, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// Componente SafeImage para renderizar imágenes de forma segura (con blobs o url)
const SafeImage = ({ blob, src, alt, className }) => {
  const [objectUrl, setObjectUrl] = React.useState(null);

  React.useEffect(() => {
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

export default function ModalDiagramaUnifilar({ isOpen, onClose, elementos, companyName }) {
  const navigate = useNavigate();
  const [selectedNode, setSelectedNode] = useState(null);
  const [zoom, setZoom] = useState(1);

  // 1. Procesar la jerarquía de los elementos
  const { nodes, levels, maxNodesInLevel, depth } = useMemo(() => {
    if (!elementos || elementos.length === 0) {
      return { nodes: [], levels: {}, maxNodesInLevel: 0, depth: 0 };
    }

    // Normalizar nombres para búsquedas
    const nameToNodeMap = new Map();
    elementos.forEach((el) => {
      if (el.nombre) {
        nameToNodeMap.set(el.nombre.toLowerCase().trim(), el);
      }
    });

    // Construir lista de nodos con sus hijos
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

    // Llenar listas de hijos y encontrar raíces
    const roots = [];
    processedNodes.forEach((node) => {
      if (node.parentId && nodeMap.has(node.parentId)) {
        nodeMap.get(node.parentId).children.push(node.id);
      } else {
        roots.push(node.id);
      }
    });

    // Calcular niveles usando BFS a partir de las raíces
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

    // Formatear resultados
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

  // 2. Calcular posiciones del diagrama
  const width = Math.max(800, maxNodesInLevel * 200 + 100);
  const height = Math.max(500, depth * 160 + 100);

  const nodeCoords = useMemo(() => {
    const coords = {};
    Object.keys(levels).forEach((lvlStr) => {
      const lvl = parseInt(lvlStr, 10);
      const lvlNodes = levels[lvl];
      const count = lvlNodes.length;
      const y = 80 + lvl * 160;

      lvlNodes.forEach((id, idx) => {
        // Distribuir horizontalmente de forma centrada
        const x = (idx + 0.5) * (width / count);
        coords[id] = { x, y };
      });
    });
    return coords;
  }, [levels, width]);

  const renderNodeSymbol = (type, x, y) => {
    switch (type) {
      case 'GENERADOR':
        return (
          <g>
            <circle cx={x} cy={y} r="24" fill="#1e1b4b" stroke="#f59e0b" strokeWidth="2.5" className="filter drop-shadow-[0_0_8px_rgba(245,158,11,0.2)]" />
            <text x={x} y={y + 6} textAnchor="middle" fill="#f59e0b" className="text-sm font-black font-mono">G</text>
          </g>
        );
      case 'TRANSFORMADOR':
        return (
          <g>
            {/* Símbolo tradicional de dos círculos entrelazados */}
            <circle cx={x} cy={y - 8} r="16" fill="none" stroke="#8b5cf6" strokeWidth="2.5" className="filter drop-shadow-[0_0_8px_rgba(139,92,246,0.2)]" />
            <circle cx={x} cy={y + 8} r="16" fill="none" stroke="#8b5cf6" strokeWidth="2.5" className="filter drop-shadow-[0_0_8px_rgba(139,92,246,0.2)]" />
            <text x={x + 22} y={y + 4} className="text-[9px] font-bold font-mono fill-violet-400">⚯</text>
          </g>
        );
      case 'TRANSFER':
        return (
          <g>
            <rect x={x - 28} y={y - 18} width="56" height="36" rx="8" fill="#022c22" stroke="#10b981" strokeWidth="2.5" className="filter drop-shadow-[0_0_8px_rgba(16,185,129,0.2)]" />
            <text x={x} y={y + 5} textAnchor="middle" fill="#10b981" className="text-[10px] font-black font-mono">ATS</text>
          </g>
        );
      case 'PUESTA_TIERRA':
        return (
          <g>
            {/* Símbolo clásico de puesta a tierra */}
            <line x1={x} y1={y - 18} x2={x} y2={y + 6} stroke="#10b981" strokeWidth="2.5" />
            <line x1={x - 16} y1={y + 6} x2={x + 16} y2={y + 6} stroke="#10b981" strokeWidth="2.5" />
            <line x1={x - 10} y1={y + 12} x2={x + 10} y2={y + 12} stroke="#10b981" strokeWidth="2.5" />
            <line x1={x - 4} y1={y + 18} x2={x + 4} y2={y + 18} stroke="#10b981" strokeWidth="2.5" />
          </g>
        );
      case 'TABLERO':
      default:
        return (
          <g>
            <rect x={x - 30} y={y - 20} width="60" height="40" rx="4" fill="#082f49" stroke="#0ea5e9" strokeWidth="2.5" className="filter drop-shadow-[0_0_8px_rgba(14,165,233,0.2)]" />
            {/* Detalle interno para que parezca un tablero de breakers */}
            <line x1={x} y1={y - 14} x2={x} y2={y + 14} stroke="#0ea5e9" strokeWidth="1.5" strokeDasharray="2,2" />
            <rect x={x - 22} y={y - 14} width="10" height="6" fill="#0ea5e9" opacity="0.6" />
            <rect x={x + 12} y={y - 4} width="10" height="6" fill="#0ea5e9" opacity="0.6" />
            <rect x={x - 22} y={y + 6} width="10" height="6" fill="#0ea5e9" opacity="0.6" />
          </g>
        );
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200" onClick={onClose} />

      {/* Ventana Principal */}
      <div className="relative w-full max-w-6xl h-[90vh] bg-slate-900/90 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
        
        {/* Cabecera */}
        <div className="flex justify-between items-center p-5 border-b border-slate-800 bg-slate-950/45 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-violet-950/60 rounded-xl border border-violet-800/40">
              <Zap className="w-5 h-5 text-violet-400" />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-100 font-mono">
                Diagrama Unifilar Gráfico - {companyName || 'Empresa'}
              </h3>
              <p className="text-[10px] text-slate-500 font-sans">
                Esquema visual interactivo de interconexiones y flujo eléctrico aguas abajo.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Controles de Zoom */}
            <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl p-1 no-print">
              <button 
                onClick={() => setZoom(prev => Math.max(0.5, prev - 0.15))}
                className="p-1.5 hover:bg-slate-900 rounded-lg text-slate-400 hover:text-slate-100 transition-colors"
                title="Alejar"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="text-[10px] font-bold font-mono px-2.5 text-slate-400">
                {Math.round(zoom * 100)}%
              </span>
              <button 
                onClick={() => setZoom(prev => Math.min(2, prev + 0.15))}
                className="p-1.5 hover:bg-slate-900 rounded-lg text-slate-400 hover:text-slate-100 transition-colors"
                title="Acercar"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={() => window.print()}
              className="px-3.5 py-1.5 bg-slate-950 border border-slate-800 text-slate-300 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2"
            >
              Imprimir
            </button>
            
            <button 
              onClick={onClose}
              className="p-1.5 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Contenido Dividido */}
        <div className="flex-1 flex overflow-hidden min-h-0">
          
          {/* Panel de Diagrama (SVG con Scroll y Zoom) */}
          <div className="flex-1 overflow-auto bg-slate-950/40 p-6 relative flex items-center justify-center border-r border-slate-800">
            {nodes.length === 0 ? (
              <div className="text-center p-8 space-y-2">
                <Info className="w-10 h-10 text-slate-700 mx-auto" />
                <p className="text-xs text-slate-500 font-sans">No hay elementos registrados para mostrar el diagrama unifilar.</p>
              </div>
            ) : (
              <div 
                style={{ transform: `scale(${zoom})`, transformOrigin: 'center' }}
                className="transition-transform duration-250 ease-out"
              >
                <svg width={width} height={height} className="overflow-visible font-mono">
                  {/* Definición de Marcador para Flechas */}
                  <defs>
                    <marker 
                      id="arrow" 
                      viewBox="0 0 10 10" 
                      refX="18" 
                      refY="5" 
                      markerWidth="6" 
                      markerHeight="6" 
                      orient="auto-start-reverse"
                    >
                      <path d="M 0 1 L 10 5 L 0 9 z" fill="#475569" />
                    </marker>
                  </defs>

                  {/* 1. Dibujar Líneas Conectoras (detrás de los nodos) */}
                  {nodes.map((node) => {
                    if (!node.parentId || !nodeCoords[node.parentId]) return null;
                    const parent = nodeCoords[node.parentId];
                    const child = nodeCoords[node.id];

                    // Trazar una curva spline suave para la conexión
                    const midY = (parent.y + child.y) / 2;
                    const pathData = `M ${parent.x} ${parent.y} C ${parent.x} ${midY}, ${child.x} ${midY}, ${child.x} ${child.y}`;

                    return (
                      <path 
                        key={`link-${node.id}`} 
                        d={pathData} 
                        fill="none" 
                        stroke="#334155" 
                        strokeWidth="2.5" 
                        markerEnd="url(#arrow)"
                        className="transition-all hover:stroke-amber-500/50 hover:stroke-[3.5px] cursor-pointer"
                      />
                    );
                  })}

                  {/* 2. Dibujar Nodos */}
                  {nodes.map((node) => {
                    const coords = nodeCoords[node.id];
                    if (!coords) return null;
                    const isSelected = selectedNode?.id === node.id;

                    return (
                      <g 
                        key={node.id} 
                        transform={`translate(${coords.x}, ${coords.y})`}
                        onClick={() => setSelectedNode(node)}
                        className="cursor-pointer group"
                      >
                        {/* Círculo Interactivo Invisible */}
                        <circle cx="0" cy="0" r="32" fill="transparent" />

                        {/* Aura de Selección */}
                        {isSelected && (
                          <circle cx="0" cy="0" r="30" fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeDasharray="4,4" className="animate-spin duration-10000" />
                        )}

                        {/* Símbolo Específico */}
                        {renderNodeSymbol(node.tipoElemento, 0, 0)}

                        {/* Nombre del Nodo */}
                        <text 
                          x="0" 
                          y="38" 
                          textAnchor="middle" 
                          className={`text-[9px] font-bold tracking-tight select-none ${
                            isSelected ? 'fill-amber-400 font-black' : 'fill-slate-350 group-hover:fill-slate-100'
                          }`}
                        >
                          {node.nombre.length > 22 ? `${node.nombre.slice(0, 20)}...` : node.nombre}
                        </text>

                        {/* ID del Nodo */}
                        <text 
                          x="0" 
                          y="-32" 
                          textAnchor="middle" 
                          className="text-[8px] font-bold fill-slate-500 font-mono select-none"
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

          {/* Panel Lateral de Información de Nodo */}
          <div className="w-80 bg-slate-950/60 p-5 overflow-y-auto shrink-0 flex flex-col justify-between">
            {selectedNode ? (
              <div className="space-y-6">
                {/* Cabecera Ficha Rápida */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-start">
                    <span className="text-[9px] font-mono font-bold text-slate-505 uppercase tracking-widest block">FICHA TÉCNICA RÁPIDA</span>
                    <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400 uppercase">
                      {selectedNode.tipoElemento}
                    </span>
                  </div>
                  <h4 className="text-sm font-black text-slate-100 tracking-wide font-mono uppercase">{selectedNode.nombre}</h4>
                  <span className="text-[10px] font-bold font-mono text-amber-500">ID: {selectedNode.id}</span>
                </div>

                {/* Especificaciones */}
                <div className="space-y-3.5 border-t border-b border-slate-850 py-4">
                  <div className="grid grid-cols-2 gap-2.5 text-xs font-mono">
                    <div className="text-slate-500">Ubicación:</div>
                    <div className="text-slate-200 font-semibold truncate text-right">{selectedNode.ubicacion || '—'}</div>

                    <div className="text-slate-500">Alimentado por:</div>
                    <div className="text-slate-200 font-semibold truncate text-right">{selectedNode.alimentadoPor || '—'}</div>

                    <div className="text-slate-500">Marca/Modelo:</div>
                    <div className="text-slate-200 font-semibold truncate text-right">
                      {selectedNode.datosTecnicos?.marca || selectedNode.datosTecnicos?.modelo || '—'}
                    </div>

                    <div className="text-slate-500">Potencia/KVA:</div>
                    <div className="text-slate-200 font-semibold text-right">
                      {selectedNode.datosTecnicos?.kva || selectedNode.datosTecnicos?.potenciaKva || '—'}
                    </div>

                    <div className="text-slate-500">Fases/Polos:</div>
                    <div className="text-slate-200 font-semibold text-right">
                      {selectedNode.datosTecnicos?.fases || selectedNode.datosTecnicos?.maxPoles || '—'}
                    </div>
                  </div>
                </div>

                {/* Observaciones */}
                <div className="space-y-1">
                  <span className="text-[9px] font-mono font-bold text-slate-505 uppercase tracking-wider block">Observaciones:</span>
                  <p className="text-[10px] leading-relaxed text-slate-400 font-sans italic bg-slate-900/50 p-2.5 rounded-xl border border-slate-850">
                    {selectedNode.observacionesGenerales || 'Sin observaciones generales registradas para este equipo.'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-20 space-y-3 flex-1 flex flex-col justify-center items-center">
                <Info className="w-8 h-8 text-slate-700" />
                <p className="text-[10px] text-slate-505 max-w-[180px] font-sans">
                  Selecciona cualquier nodo del diagrama unifilar para desplegar sus especificaciones técnicas de forma detallada.
                </p>
              </div>
            )}

            {/* Acción de Navegación */}
            {selectedNode && (
              <button
                onClick={() => {
                  onClose();
                  navigate(`/empresa/${selectedNode.empresaId || selectedNode.companyId}/tablero/${selectedNode.id}`);
                }}
                className="w-full mt-6 bg-slate-100 text-slate-950 font-black hover:bg-white active:scale-98 transition-all px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 text-xs cursor-pointer shadow-md"
              >
                Abrir Ficha Completa <ExternalLink className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
