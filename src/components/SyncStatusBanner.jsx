import React, { useState, useEffect, useRef } from 'react';
import useStore from '../store/useStore';
import { useSync } from '../utils/useSync';
import { Wifi, WifiOff, RefreshCw, CheckCircle2 } from 'lucide-react';

export default function SyncStatusBanner() {
  // Suscripción reactiva directa al slice de Zustand
  const syncQueue = useStore((state) => state.syncQueue || []);
  const pendingCount = syncQueue.length;
  const isStoreSyncing = useStore((state) => state.isSyncing || false);
  const showToast = useStore((state) => state.showToast);

  // Hook de sincronización
  const { isOnline, isSyncing: isHookSyncing, triggerSync } = useSync();

  // Estado local para retroalimentación visual de sincronización manual y éxito
  const [isManualSyncing, setIsManualSyncing] = useState(false);
  const [showSuccessBanner, setShowSuccessBanner] = useState(false);
  const successTimeoutRef = useRef(null);

  // Estado consolidado de sincronización
  const isSyncing = isHookSyncing || isStoreSyncing || isManualSyncing;
  const wasSyncingRef = useRef(isSyncing);

  // Efecto para detectar la finalización de la sincronización y activar el feedback de éxito
  useEffect(() => {
    const wasSyncing = wasSyncingRef.current;

    // Si estaba en proceso de sincronización y terminó, y la cola quedó vacía:
    if (wasSyncing && !isSyncing && pendingCount === 0 && isOnline) {
      setShowSuccessBanner(true);
      if (successTimeoutRef.current) clearTimeout(successTimeoutRef.current);
      successTimeoutRef.current = setTimeout(() => {
        setShowSuccessBanner(false);
      }, 5000);
    }

    wasSyncingRef.current = isSyncing;
  }, [isSyncing, pendingCount, isOnline]);

  // Limpiar timer de feedback de éxito al desmontar
  useEffect(() => {
    return () => {
      if (successTimeoutRef.current) clearTimeout(successTimeoutRef.current);
    };
  }, []);

  // Manejador del botón de sincronización manual
  const handleManualSync = async () => {
    if (isSyncing || !isOnline) return;
    setIsManualSyncing(true);

    try {
      const res = await triggerSync();
      const currentQueueLength = useStore.getState().syncQueue?.length || 0;

      if (currentQueueLength === 0 || (res && res.success)) {
        setShowSuccessBanner(true);
        if (showToast) {
          showToast('¡Sincronizado con éxito! Todos los datos se guardaron en el servidor central.', 'success');
        }
        if (successTimeoutRef.current) clearTimeout(successTimeoutRef.current);
        successTimeoutRef.current = setTimeout(() => {
          setShowSuccessBanner(false);
        }, 5000);
      } else if (res && res.error) {
        if (showToast) {
          showToast(`Error al sincronizar: ${res.error}`, 'error');
        }
      }
    } catch (err) {
      console.error('Error al sincronizar manualmente:', err);
      if (showToast) {
        showToast('Error de comunicación con el servidor central', 'error');
      }
    } finally {
      setIsManualSyncing(false);
    }
  };

  // 1. Modo sin conexión a internet
  if (!isOnline) {
    return (
      <div className="bg-amber-500/10 border-b border-amber-500/20 text-amber-500 px-4 py-2 flex items-center justify-between w-full text-xs font-bold shadow-sm animate-pulse no-print">
        <div className="w-32 hidden sm:block" />
        <div className="flex items-center justify-center gap-2 flex-1 text-center min-w-0">
          <WifiOff className="w-4 h-4 text-amber-500 shrink-0" />
          <span className="truncate">Modo Offline: Los datos de inspección se guardarán de forma local en la tableta.</span>
        </div>
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

  // 2. Proceso de sincronización en curso
  if (isSyncing) {
    return (
      <div className="bg-blue-500/10 border-b border-blue-500/20 text-blue-400 px-4 py-2 flex items-center justify-between w-full text-xs font-semibold shadow-sm no-print">
        <div className="w-32 hidden sm:block" />
        <div className="flex items-center justify-center gap-2 flex-1 text-center min-w-0">
          <RefreshCw className="w-4 h-4 animate-spin text-blue-400 shrink-0" />
          <span className="truncate">
            Sincronizando {pendingCount > 0 ? `${pendingCount} inspección${pendingCount > 1 ? 'es' : ''}` : 'datos'} con el servidor central...
          </span>
        </div>
        <div className="w-32 flex justify-end shrink-0" />
      </div>
    );
  }

  // 3. Estado de éxito temporal tras sincronizar con éxito
  if (showSuccessBanner && pendingCount === 0) {
    return (
      <div className="bg-emerald-500/15 border-b border-emerald-500/30 text-emerald-400 px-4 py-2 flex items-center justify-between w-full text-xs font-bold shadow-sm transition-all duration-300 no-print animate-in fade-in slide-in-from-top-1">
        <div className="w-32 hidden sm:block" />
        <div className="flex items-center justify-center gap-2 flex-1 text-center min-w-0">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="truncate">¡Sincronizado con éxito! Todos los datos han sido guardados en el servidor central.</span>
        </div>
        <div className="w-32 flex justify-end shrink-0">
          <span className="bg-emerald-500/20 text-emerald-300 px-2.5 py-0.5 rounded text-[10px] font-mono border border-emerald-500/30">
            Al día
          </span>
        </div>
      </div>
    );
  }

  // 4. Conexión activa con datos pendientes por sincronizar
  if (pendingCount > 0) {
    return (
      <div className="bg-amber-500/10 border-b border-amber-500/20 text-amber-500 px-4 py-2 flex items-center justify-between w-full text-xs font-bold shadow-sm no-print">
        <div className="w-32 hidden sm:block" />
        <div className="flex items-center justify-center gap-2 flex-1 text-center min-w-0">
          <Wifi className="w-4 h-4 shrink-0 text-amber-500" />
          <span className="truncate">Conexión restablecida. Tienes {pendingCount} elemento{pendingCount > 1 ? 's' : ''} pendiente{pendingCount > 1 ? 's' : ''} por sincronizar.</span>
        </div>
        <div className="w-32 flex justify-end shrink-0">
          <button
            onClick={handleManualSync}
            disabled={isSyncing}
            className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 active:scale-95 disabled:opacity-50 text-slate-950 px-3 py-1 rounded text-[10px] font-extrabold transition-all cursor-pointer shadow-sm shrink-0"
          >
            <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Sincronizando...' : 'Sincronizar Ahora'}
          </button>
        </div>
      </div>
    );
  }

  // 5. Estado normal: Online y completamente sincronizado
  return (
    <div className="bg-emerald-500/10 border-b border-emerald-500/20 text-emerald-500 px-4 py-1.5 flex items-center justify-between w-full text-xs font-semibold shadow-sm transition-all duration-300 no-print">
      <div className="w-12 hidden sm:block" />
      <div className="flex items-center justify-center gap-2 flex-1 text-center min-w-0">
        <Wifi className="w-4 h-4 text-emerald-500 shrink-0" />
        <span className="truncate">Conectado. Todos los datos están sincronizados con el servidor.</span>
      </div>
      <div className="w-12 hidden sm:block" />
    </div>
  );
}
