import React, { useState } from 'react';
import { X, ExternalLink, Info, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import DiagramaUnifilarBlueprint from './DiagramaUnifilarBlueprint';

export default function ModalDiagramaUnifilar({ isOpen, onClose, elementos, companyName, projectName = 'SISTEMA ELÉCTRICO' }) {
  const navigate = useNavigate();
  const [selectedNode, setSelectedNode] = useState(null);

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 print:hidden">
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
            <div className="flex items-center gap-3 no-print">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-slate-950 border border-slate-800 text-slate-355 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-md hover:border-slate-700"
              >
                Imprimir Plano CAD
              </button>
              
              <button 
                onClick={onClose}
                className="p-1.5 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 rounded-xl text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Contenido Dividido */}
          <div className="flex-1 flex overflow-hidden min-h-0">
            
            {/* Panel de Diagrama (Blueprint interactivo) */}
            <div className="flex-1 overflow-hidden relative flex flex-col">
              {/* Hacemos click en los nodos del SVG interactivo para seleccionarlos */}
              <div className="flex-1 overflow-hidden" onClick={(e) => {
                const nodeElement = e.target.closest('g');
                if (nodeElement) {
                  const textNodes = nodeElement.querySelectorAll('text');
                  let foundNode = null;
                  textNodes.forEach(t => {
                    const nodeName = t.textContent;
                    const match = elementos.find(el => el.nombre === nodeName || el.id === nodeName);
                    if (match) foundNode = match;
                  });
                  if (foundNode) {
                    setSelectedNode(foundNode);
                  }
                }
              }}>
                <DiagramaUnifilarBlueprint
                  elementos={elementos}
                  companyName={companyName}
                  projectName={projectName}
                  interactive={true}
                />
              </div>
            </div>

            {/* Panel Lateral de Información de Nodo */}
            <div className="w-80 bg-slate-950/60 p-5 overflow-y-auto shrink-0 flex flex-col justify-between border-l border-slate-850/60 no-print">
              {selectedNode ? (
                <div className="space-y-6">
                  {/* Cabecera Ficha Rápida */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-start">
                      <span className="text-[9px] font-mono font-bold text-slate-500 uppercase tracking-widest block">FICHA TÉCNICA RÁPIDA</span>
                      <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400 uppercase">
                        {selectedNode.tipoElemento}
                      </span>
                    </div>
                    <h4 className="text-sm font-black text-slate-100 tracking-wide font-mono uppercase">{selectedNode.nombre}</h4>
                    <span className="text-[10px] font-bold font-mono text-amber-500">ID: {selectedNode.id}</span>
                  </div>

                  {/* Especificaciones */}
                  <div className="space-y-3.5 border-t border-b border-slate-850/60 py-4">
                    <div className="grid grid-cols-2 gap-2.5 text-xs font-mono">
                      <div className="text-slate-500">Ubicación:</div>
                      <div className="text-slate-200 font-semibold truncate text-right">{selectedNode.ubicacion || '—'}</div>

                      <div className="text-slate-500">Alimentado por:</div>
                      <div className="text-slate-200 font-semibold truncate text-right">{selectedNode.alimentadoPor || '—'}</div>

                      <div className="text-slate-500">Marca:</div>
                      <div className="text-slate-200 font-semibold truncate text-right">
                        {selectedNode.datosTecnicos?.marca || '—'}
                      </div>

                      <div className="text-slate-500">Capacidad/KVA:</div>
                      <div className="text-slate-200 font-semibold text-right">
                        {selectedNode.datosTecnicos?.kva || selectedNode.datosTecnicos?.potenciaKva || '—'}
                      </div>

                      <div className="text-slate-500">Fases/Polos:</div>
                      <div className="text-slate-200 font-semibold text-right">
                        {selectedNode.datosTecnicos?.fases || selectedNode.maxPoles || '—'}
                      </div>
                    </div>
                  </div>

                  {/* Observaciones */}
                  <div className="space-y-1">
                    <span className="text-[9px] font-mono font-bold text-slate-550 uppercase tracking-wider block">Observaciones:</span>
                    <p className="text-[10px] leading-relaxed text-slate-400 font-sans italic bg-slate-900/50 p-2.5 rounded-xl border border-slate-850/60">
                      {selectedNode.observacionesGenerales || 'Sin observaciones generales registradas para este equipo.'}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-20 space-y-3 flex-1 flex flex-col justify-center items-center">
                  <Info className="w-8 h-8 text-slate-750" />
                  <p className="text-[10px] text-slate-500 max-w-[180px] font-sans leading-relaxed">
                    Selecciona cualquier nodo del diagrama unifilar para desplegar sus especificaciones técnicas de forma detallada.
                  </p>
                </div>
              )}

              {/* Acción de Navegación */}
              {selectedNode && (
                <button
                  onClick={() => {
                    onClose();
                    navigate(`/empresa/${selectedNode.empresaId || selectedNode.companyId || companyName}/tablero/${selectedNode.id}`);
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
