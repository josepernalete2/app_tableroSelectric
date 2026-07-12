import React from 'react';
import { useSync } from '../utils/useSync';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';

export default function SyncStatusBanner() {
  const { isOnline, isSyncing, pendingCount, triggerSync } = useSync();

  if (!isOnline) {
    return (
      <div className="bg-amber-500/10 border-b border-amber-500/20 text-amber-500 px-4 py-2 flex items-center justify-between w-full text-xs font-bold shadow-sm animate-pulse">
        {/* Espaciador izquierdo para centrar el bloque del mensaje */}
        <div className="w-32 hidden sm:block" />
        
        {/* Contenido centrado de estado */}
        <div className="flex items-center justify-center gap-2 flex-1 text-center min-w-0">
          <WifiOff className="w-4 h-4 text-amber-500 shrink-0" />
          <span className="truncate">Modo Offline: Los datos de inspección se guardarán de forma local en la tableta.</span>
        </div>
        
        {/* Espaciador/Badge a la derecha */}
        <div className="w-32 flex justify-end shrink-0">
          {pendingCount > 0 && (
            <span className="bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded text-[10px] font-mono border border-amber-500/30">
              {pendingCount} pendiente{pendingCount > 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>
    );
  }

  if (isSyncing) {
    return (
      <div className="bg-blue-500/10 border-b border-blue-500/20 text-blue-400 px-4 py-2 flex items-center justify-between w-full text-xs font-semibold shadow-sm">
        {/* Espaciador izquierdo para centrar el bloque del mensaje */}
        <div className="w-32 hidden sm:block" />
        
        {/* Contenido centrado de estado */}
        <div className="flex items-center justify-center gap-2 flex-1 text-center min-w-0">
          <RefreshCw className="w-4 h-4 animate-spin text-blue-400 shrink-0" />
          <span className="truncate">Sincronizando {pendingCount} inspección{pendingCount > 1 ? 'es' : ''} con el servidor central...</span>
        </div>
        
        {/* Espaciador a la derecha */}
        <div className="w-32 flex justify-end shrink-0" />
      </div>
    );
  }

  if (pendingCount > 0) {
    return (
      <div className="bg-amber-500/10 border-b border-amber-500/20 text-amber-500 px-4 py-2 flex items-center justify-between w-full text-xs font-bold shadow-sm">
        {/* Espaciador izquierdo para centrar el bloque del mensaje */}
        <div className="w-32 hidden sm:block" />
        
        {/* Contenido centrado de estado */}
        <div className="flex items-center justify-center gap-2 flex-1 text-center min-w-0">
          <Wifi className="w-4 h-4 shrink-0 text-amber-500" />
          <span className="truncate">Conexión restablecida. Tienes datos pendientes por sincronizar.</span>
        </div>
        
        {/* Botón de acción a la derecha */}
        <div className="w-32 flex justify-end shrink-0">
          <button
            onClick={triggerSync}
            className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 px-3 py-1 rounded text-[10px] font-extrabold transition-all cursor-pointer shadow-sm shrink-0"
          >
            <RefreshCw className="w-3 h-3" /> Sincronizar Ahora
          </button>
        </div>
      </div>
    );
  }

  // Si está online y todo está sincronizado
  return (
    <div className="bg-emerald-500/10 border-b border-emerald-500/20 text-emerald-500 px-4 py-1.5 flex items-center justify-between w-full text-xs font-semibold shadow-sm transition-all duration-300">
      {/* Espaciador izquierdo para centrar el bloque del mensaje */}
      <div className="w-12 hidden sm:block" />
      
      {/* Contenido centrado de estado */}
      <div className="flex items-center justify-center gap-2 flex-1 text-center min-w-0">
        <Wifi className="w-4 h-4 text-emerald-500 shrink-0" />
        <span className="truncate">Conectado. Todos los datos están sincronizados con el servidor.</span>
      </div>
      
      {/* Espaciador a la derecha */}
      <div className="w-12 hidden sm:block" />
    </div>
  );
}
