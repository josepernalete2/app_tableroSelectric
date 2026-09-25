import React from 'react';
import { useNavigate } from 'react-router-dom';
import useStore from '../store/useStore';
import { 
  AlertTriangle, 
  X, 
  ExternalLink, 
  CheckCircle2, 
  Trash2, 
  ShieldAlert, 
  Zap,
  Layers,
  ArrowRight
} from 'lucide-react';

export default function PanelConflictosCircuitos() {
  const navigate = useNavigate();
  const { 
    conflictosCircuitos = [], 
    isPanelConflictosOpen, 
    setPanelConflictosOpen, 
    resolverConflictoCircuito, 
    limpiarConflictosCircuitos 
  } = useStore();

  const totalConflictos = conflictosCircuitos.length;

  if (totalConflictos === 0 && !isPanelConflictosOpen) {
    return null;
  }

  return (
    <>
      {/* Botón flotante indicador de conflictos cuando el drawer está cerrado */}
      {!isPanelConflictosOpen && totalConflictos > 0 && (
        <div className="fixed bottom-6 left-6 z-45 no-print animate-bounce">
          <button
            onClick={() => setPanelConflictosOpen(true)}
            className="flex items-center gap-2.5 px-4 py-3 bg-amber-550 hover:bg-amber-400 text-slate-950 font-black rounded-2xl shadow-2xl border-2 border-amber-300 transition-all cursor-pointer group hover:scale-105"
            title="Ver conflictos de circuitos detectados"
          >
            <AlertTriangle className="w-5 h-5 text-slate-950 animate-pulse" />
            <span className="text-xs tracking-wider uppercase font-mono">
              {totalConflictos} {totalConflictos === 1 ? 'Conflicto de Polos' : 'Conflictos de Polos'}
            </span>
            <span className="w-2 h-2 rounded-full bg-red-600 animate-ping" />
          </button>
        </div>
      )}

      {/* Drawer / Panel lateral deslizable */}
      {isPanelConflictosOpen && (
        <div className="fixed inset-0 z-55 flex justify-end no-print">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity animate-in fade-in"
            onClick={() => setPanelConflictosOpen(false)}
          />

          {/* Panel */}
          <div className="relative w-full max-w-md h-full bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="p-4 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-100 uppercase tracking-wider font-mono">
                    Conflictos de Circuitos
                  </h3>
                  <p className="text-[11px] text-slate-400 font-sans">
                    {totalConflictos} {totalConflictos === 1 ? 'incidencia detectada' : 'incidencias detectadas'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                {totalConflictos > 0 && (
                  <button
                    onClick={limpiarConflictosCircuitos}
                    className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-red-400 rounded-lg transition-colors cursor-pointer"
                    title="Limpiar todos los conflictos"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => setPanelConflictosOpen(false)}
                  className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Listado de Conflictos */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5 custom-scrollbar">
              {totalConflictos === 0 ? (
                <div className="text-center py-16 space-y-3 text-slate-400">
                  <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
                  <p className="text-xs font-bold text-slate-200">No hay conflictos pendientes</p>
                  <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                    Todos los polos y circuitos del proyecto se encuentran asignados correctamente sin solapamientos.
                  </p>
                </div>
              ) : (
                conflictosCircuitos.map((conflicto) => {
                  const polosStr = Array.isArray(conflicto.polos) 
                    ? conflicto.polos.join(', ') 
                    : (conflicto.polos || 'N/A');

                  return (
                    <div 
                      key={conflicto.id}
                      className="p-4 bg-slate-950/80 border border-amber-500/30 rounded-2xl space-y-3 shadow-lg hover:border-amber-500/50 transition-all group"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                            POLO(S): {polosStr}
                          </span>
                          <span className="text-[10px] font-mono text-slate-500">
                            {conflicto.tipo || 'SOLAPAMIENTO'}
                          </span>
                        </div>
                        <button
                          onClick={() => resolverConflictoCircuito(conflicto.id)}
                          className="text-[10px] font-bold text-slate-400 hover:text-emerald-400 flex items-center gap-1 transition-colors cursor-pointer"
                          title="Marcar como resuelto"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> Resolver
                        </button>
                      </div>

                      <div>
                        <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5 font-mono">
                          <Layers className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          {conflicto.tableroNombre || `Tablero ${conflicto.tableroId || ''}`}
                        </h4>
                        <p className="text-[11px] text-slate-400 font-sans mt-1 leading-relaxed">
                          {conflicto.descripcion}
                        </p>
                      </div>

                      {conflicto.equipoExistente && conflicto.equipoNuevo && (
                        <div className="p-2.5 bg-slate-900/90 rounded-xl text-[10px] font-mono border border-slate-800 space-y-1">
                          <div className="text-slate-400 truncate">
                            <strong className="text-amber-400">Existente:</strong> {conflicto.equipoExistente}
                          </div>
                          <div className="text-slate-400 truncate">
                            <strong className="text-sky-400">En conflicto:</strong> {conflicto.equipoNuevo}
                          </div>
                        </div>
                      )}

                      {/* Botón de acción: Ir al Sitio */}
                      <div className="pt-2 border-t border-slate-900 flex justify-end">
                        <button
                          onClick={() => {
                            setPanelConflictosOpen(false);
                            if (conflicto.empresaId && conflicto.tableroId) {
                              navigate(`/empresa/${conflicto.empresaId}/tablero/${conflicto.tableroId}#pole-${Array.isArray(conflicto.polos) ? conflicto.polos[0] : conflicto.polos}`);
                            }
                          }}
                          className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                        >
                          <span>Resolver / Ir al Sitio</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="p-3.5 border-t border-slate-800 bg-slate-950 text-center text-[10px] text-slate-500 font-sans">
              Sistema No Bloqueante de Integridad Eléctrica (Selectric)
            </div>
          </div>
        </div>
      )}
    </>
  );
}
