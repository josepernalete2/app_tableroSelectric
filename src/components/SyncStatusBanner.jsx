import React, { useState, useEffect, useRef } from 'react';
import useStore from '../store/useStore';
import { useSync, tieneImagenAdjunta } from '../utils/useSync';
import { useConfirm } from '../context/ConfirmContext';
import {
  Wifi,
  WifiOff,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Trash2,
  Camera,
  FileText,
  X,
  Play
} from 'lucide-react';

export default function SyncStatusBanner() {
  const { confirm: customConfirm } = useConfirm();
  const rawQueue = useStore((state) => state.syncQueue);
  const syncQueue = Array.isArray(rawQueue) ? rawQueue : [];
  const pendingCount = syncQueue.length;
  const isStoreSyncing = useStore((state) => state.isSyncing || false);
  const showToast = useStore((state) => state.showToast);

  // Hook de sincronización enriquecido
  const {
    isOnline,
    isSyncing: isHookSyncing,
    triggerSync,
    syncProgress,
    syncSingleItem,
    removeSingleItem,
    clearQueue
  } = useSync();

  // Estados locales para interactividad y depuración
  const [isManualSyncing, setIsManualSyncing] = useState(false);
  const [singleSyncingId, setSingleSyncingId] = useState(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [showSuccessBanner, setShowSuccessBanner] = useState(false);
  const successTimeoutRef = useRef(null);

  // Estado consolidado de sincronización activa (solo si hay ítems pendientes o envío en curso)
  const isSyncing = isHookSyncing || isStoreSyncing || isManualSyncing;
  const wasSyncingRef = useRef(isSyncing);

  // Elementos con error registrado protegidos
  const failedItems = syncQueue.filter((item) => Boolean(item?.syncError));
  const failedCount = failedItems.length;

  // Efecto reactivo: al terminar cualquier sincronización con éxito o vaciarse la cola
  useEffect(() => {
    const wasSyncing = wasSyncingRef.current;

    // Si estaba sincronizando y terminó, o si la cola quedó en 0 pendientes
    if (wasSyncing && !isSyncing && pendingCount === 0 && isOnline) {
      setShowSuccessBanner(true);
      if (successTimeoutRef.current) clearTimeout(successTimeoutRef.current);
      successTimeoutRef.current = setTimeout(() => {
        setShowSuccessBanner(false);
      }, 4000);
    }

    // Auto-curación de estados: Si no hay elementos pendientes en cola y no hay envío activo,
    // garantizar que los flags de Zustand queden limpios en false / null inmediatamente
    if (pendingCount === 0 && (isStoreSyncing || syncProgress)) {
      useStore.getState().setIsSyncing?.(false);
      useStore.getState().setSyncProgress?.(null);
    }

    wasSyncingRef.current = isSyncing;
  }, [isSyncing, pendingCount, isOnline, isStoreSyncing, syncProgress]);

  useEffect(() => {
    return () => {
      if (successTimeoutRef.current) clearTimeout(successTimeoutRef.current);
    };
  }, []);

  // Manejador del botón manual "Sincronizar Ahora"
  const handleManualSync = async () => {
    if (isSyncing || !isOnline) return;
    setIsManualSyncing(true);

    try {
      const res = await triggerSync();
      if (res && res.success) {
        setShowSuccessBanner(true);
        if (successTimeoutRef.current) clearTimeout(successTimeoutRef.current);
        successTimeoutRef.current = setTimeout(() => {
          setShowSuccessBanner(false);
        }, 5000);
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

  // Reintento de un solo elemento atascado
  const handleRetrySingle = async (itemId) => {
    if (isSyncing || singleSyncingId) return;
    setSingleSyncingId(itemId);
    try {
      await syncSingleItem(itemId);
    } finally {
      setSingleSyncingId(null);
    }
  };

  // Descartar un elemento corrupto o individual
  const handleRemoveSingle = async (itemId, itemName) => {
    const confirmed = await customConfirm({
      title: 'Descartar elemento local',
      message: `¿Estás seguro de que deseas descartar "${itemName || 'este elemento'}" de la cola pendiente? Los cambios locales no sincronizados se perderán permanentemente.`,
      type: 'danger',
      confirmText: 'Descartar',
      cancelText: 'Cancelar'
    });
    if (confirmed) {
      removeSingleItem(itemId);
    }
  };

  // Limpiar toda la cola de sincronización con confirmación
  const handleClearAll = async () => {
    const confirmed = await customConfirm({
      title: 'Limpiar toda la cola de sincronización',
      message: `¿Estás seguro de que deseas forzar el vaciado de los ${pendingCount} elementos pendientes de la tableta? Esta acción descartará las mutaciones pendientes.`,
      type: 'danger',
      confirmText: 'Vaciar Cola',
      cancelText: 'Cancelar'
    });
    if (confirmed) {
      clearQueue();
      setIsDetailsOpen(false);
    }
  };

  // 1. MODO OFFLINE (Sin conexión a internet)
  if (!isOnline) {
    return (
      <div className="bg-amber-500/10 border-b border-amber-500/20 text-amber-500 px-4 py-2 flex items-center justify-between w-full text-xs font-bold shadow-sm animate-pulse no-print">
        <div className="w-32 hidden sm:block" />
        <div className="flex items-center justify-center gap-2 flex-1 text-center min-w-0">
          <WifiOff className="w-4 h-4 text-amber-500 shrink-0" />
          <span className="truncate">Modo Offline: Los datos de inspección se guardarán de forma local en la tableta.</span>
        </div>
        <div className="w-32 flex justify-end shrink-0 gap-1.5 items-center">
          {pendingCount > 0 && (
            <button
              onClick={() => setIsDetailsOpen(!isDetailsOpen)}
              className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 px-2 py-0.5 rounded text-[10px] font-mono border border-amber-500/30 flex items-center gap-1 transition-colors"
            >
              <span>{pendingCount} pendiente{pendingCount > 1 ? 's' : ''}</span>
              {isDetailsOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          )}
        </div>
      </div>
    );
  }

  // 2. SINCRONIZANDO (Solo mostrar si realmente está sincronizando Y hay elementos pendientes o envío directo en curso)
  const isActivelySyncing = isSyncing && (pendingCount > 0 || (syncProgress && syncProgress.current < syncProgress.total));

  if (isActivelySyncing) {
    const current = syncProgress?.current || 0;
    const total = syncProgress?.total || pendingCount || 1;
    const percent = Math.min(100, Math.round((current / total) * 100));
    const displayMessage = syncProgress?.message || (
      syncProgress?.total > 0
        ? `Sincronizando ${syncProgress.current} de ${syncProgress.total}${syncProgress.currentName ? ` (${syncProgress.currentName})` : ''}...`
        : `Sincronizando ${pendingCount > 0 ? `${pendingCount} elemento${pendingCount > 1 ? 's' : ''}` : 'datos'} con el servidor central...`
    );

    return (
      <div className="relative bg-slate-900/95 border-b border-blue-500/30 text-blue-300 px-4 py-2 flex flex-col w-full text-xs font-semibold shadow-md no-print backdrop-blur-sm transition-all duration-300">
        <div className="flex items-center justify-between w-full">
          <div className="w-28 hidden sm:block" />
          <div className="flex items-center justify-center gap-2 flex-1 text-center min-w-0">
            <RefreshCw className="w-4 h-4 animate-spin text-blue-400 shrink-0" />
            <span className="truncate font-medium text-slate-200">
              {displayMessage}
            </span>
          </div>
          <div className="w-28 flex justify-end shrink-0">
            <span className="bg-blue-500/20 text-blue-300 px-2.5 py-0.5 rounded-full text-[10px] font-mono border border-blue-500/30 font-bold">
              {percent}%
            </span>
          </div>
        </div>

        {/* Barra de progreso interactiva en tiempo real */}
        <div className="w-full bg-slate-800/80 h-1.5 rounded-full mt-1.5 overflow-hidden border border-slate-700/50">
          <div
            className="bg-gradient-to-r from-blue-500 to-cyan-400 h-full transition-all duration-300 ease-out rounded-full shadow-sm"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>
    );
  }

  // 3. ESTADO VERDE ESMERALDA GARANTIZADO (Si pendingCount === 0 o showSuccessBanner)
  if (pendingCount === 0 || showSuccessBanner) {
    return (
      <div className="bg-emerald-500/15 border-b border-emerald-500/30 text-emerald-400 px-4 py-2 flex items-center justify-between w-full text-xs font-bold shadow-sm transition-all duration-300 no-print animate-in fade-in slide-in-from-top-1">
        <div className="w-32 hidden sm:block" />
        <div className="flex items-center justify-center gap-2 flex-1 text-center min-w-0">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="truncate">Conectado al servidor central. Sistema sincronizado.</span>
        </div>
        <div className="w-32 flex justify-end shrink-0">
          <span className="bg-emerald-500/20 text-emerald-300 px-2.5 py-0.5 rounded-full text-[10px] font-mono border border-emerald-500/30">
            Al día
          </span>
        </div>
      </div>
    );
  }

  // 4. DATOS PENDIENTES (pendingCount > 0 y la red está activa) + Panel de Depuración
  return (
    <div className="flex flex-col w-full no-print">
      <div
        className={`${
          failedCount > 0 ? 'bg-amber-500/15 border-amber-500/30 text-amber-400' : 'bg-amber-500/10 border-amber-500/20 text-amber-500'
        } border-b px-4 py-2 flex items-center justify-between w-full text-xs font-bold shadow-sm transition-all duration-200`}
      >
        <div className="w-32 hidden sm:block" />
        <div className="flex items-center justify-center gap-2 flex-1 text-center min-w-0">
          {failedCount > 0 ? (
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 animate-bounce" />
          ) : (
            <Wifi className="w-4 h-4 shrink-0 text-amber-500" />
          )}
          <span className="truncate">
            {failedCount > 0
              ? `Atención: ${pendingCount} pendiente${pendingCount > 1 ? 's' : ''} (${failedCount} con error al intentar subir).`
              : `Conexión activa. Tienes ${pendingCount} elemento${pendingCount > 1 ? 's' : ''} pendiente${pendingCount > 1 ? 's' : ''} por sincronizar.`}
          </span>
        </div>

        <div className="w-auto flex justify-end shrink-0 gap-2 items-center">
          {/* Botón para alternar vista de cola detallada */}
          <button
            onClick={() => setIsDetailsOpen(!isDetailsOpen)}
            className="flex items-center gap-1 bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 hover:text-white px-2.5 py-1 rounded text-[10px] font-semibold border border-slate-700 transition-all cursor-pointer"
            title="Ver detalles de la cola de sincronización"
          >
            <span>Cola ({pendingCount})</span>
            {isDetailsOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>

          {/* Botón principal Sincronizar Ahora */}
          <button
            onClick={handleManualSync}
            disabled={isSyncing}
            className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 active:scale-95 disabled:opacity-50 text-slate-950 px-3 py-1 rounded text-[10px] font-extrabold transition-all cursor-pointer shadow-sm shrink-0"
          >
            <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Sincronizando...' : failedCount > 0 ? 'Reintentar Cola' : 'Sincronizar Ahora'}
          </button>
        </div>
      </div>

      {/* PANEL EXPANDIBLE DE DEPURACIÓN LOCAL (FALLBACK Y GESTIÓN INDIVIDUAL) */}
      {isDetailsOpen && (
        <div className="bg-slate-900 border-b border-slate-800 text-slate-200 px-4 py-3 shadow-xl animate-in slide-in-from-top-2 duration-200">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-slate-100">Cola de Sincronización Local</span>
                <span className="bg-slate-800 text-slate-400 px-2 py-0.5 rounded text-[11px] font-mono">
                  {pendingCount} elemento{pendingCount > 1 ? 's' : ''}
                </span>
                {failedCount > 0 && (
                  <span className="bg-red-500/20 text-red-400 border border-red-500/30 px-2 py-0.5 rounded text-[11px] font-mono">
                    {failedCount} con error
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleClearAll}
                  className="flex items-center gap-1 text-red-400 hover:text-red-300 hover:bg-red-500/10 px-2 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer"
                  title="Vaciar toda la cola local si hay elementos corruptos"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Limpiar Cola</span>
                </button>
                <button
                  onClick={() => setIsDetailsOpen(false)}
                  className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 mb-3">
              Los elementos se sincronizan en micro-lotes de 3 en 3 con timeout de 25s. Si un ítem específico falla o está corrupto,
              puedes reintentarlo individualmente o descartarlo sin afectar a los demás.
            </p>

            {/* Lista scrollable de ítems pendientes */}
            <div className="max-h-64 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
              {syncQueue.map((item, idx) => {
                if (!item) return null;
                const tieneFoto = tieneImagenAdjunta(item);
                const itemName = item.payload?.nombre || item.payload?.codigo || 'Elemento sin nombre';
                const itemTipo = item.tipo || 'ELEMENTO';
                const hasError = Boolean(item.syncError);
                const isItemSyncing = singleSyncingId === item.id;

                return (
                  <div
                    key={item.id || idx}
                    className={`flex items-center justify-between p-2.5 rounded-lg border text-xs transition-all ${
                      hasError
                        ? 'bg-red-950/20 border-red-500/30 text-red-200'
                        : 'bg-slate-800/60 border-slate-700/60 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className="shrink-0">
                        {tieneFoto ? (
                          <div className="p-1.5 bg-blue-500/20 text-blue-400 rounded-md" title="Incluye fotografía">
                            <Camera className="w-3.5 h-3.5" />
                          </div>
                        ) : (
                          <div className="p-1.5 bg-slate-700 text-slate-300 rounded-md" title="Mutación estructurada">
                            <FileText className="w-3.5 h-3.5" />
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-100 truncate">{itemName}</span>
                          <span className="bg-slate-700/70 text-slate-300 px-1.5 py-0.5 rounded text-[9px] font-mono uppercase">
                            {itemTipo}
                          </span>
                          {tieneFoto && (
                            <span className="text-[10px] text-cyan-400 font-mono">📎 Con foto</span>
                          )}
                        </div>

                        {hasError ? (
                          <div className="text-[10px] text-red-400 mt-0.5 flex items-center gap-1 break-words">
                            <AlertTriangle className="w-3 h-3 shrink-0" />
                            <span>Error: {item.syncError}</span>
                            {item.retryCount > 0 && (
                              <span className="text-slate-400">({item.retryCount} intento{item.retryCount > 1 ? 's' : ''})</span>
                            )}
                          </div>
                        ) : (
                          <div className="text-[10px] text-amber-400/80 mt-0.5">
                            ⏳ Pendiente por subir al servidor central
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Acciones individuales por ítem */}
                    <div className="flex items-center gap-1.5 shrink-0 ml-3">
                      <button
                        onClick={() => handleRetrySingle(item.id)}
                        disabled={isSyncing || isItemSyncing}
                        className="flex items-center gap-1 bg-blue-600 hover:bg-blue-500 active:scale-95 disabled:opacity-50 text-white px-2 py-1 rounded text-[10px] font-bold transition-all cursor-pointer"
                        title="Reintentar subir solo este elemento"
                      >
                        <RefreshCw className={`w-3 h-3 ${isItemSyncing ? 'animate-spin' : ''}`} />
                        <span>{isItemSyncing ? 'Subiendo...' : 'Reintentar'}</span>
                      </button>

                      <button
                        onClick={() => handleRemoveSingle(item.id, itemName)}
                        disabled={isSyncing || isItemSyncing}
                        className="text-slate-400 hover:text-red-400 hover:bg-red-500/10 p-1 rounded transition-colors cursor-pointer"
                        title="Descartar este elemento de la cola si está corrupto"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
