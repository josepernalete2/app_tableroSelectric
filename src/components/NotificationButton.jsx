import React from 'react';
import { Bell, BellOff, Send, CheckCircle2, AlertTriangle, Info, RotateCcw, Loader2 } from 'lucide-react';
import { usePushNotifications } from '../hooks/usePushNotifications';

export default function NotificationButton() {
  const {
    isSupported,
    permission,
    isSubscribed,
    loading,
    statusMessage,
    statusType,
    subscribeUser,
    unsubscribeUser,
    sendTestNotification
  } = usePushNotifications();

  if (!isSupported) {
    return (
      <div className="flex items-center gap-2 text-xs text-amber-400 bg-amber-950/40 p-2.5 rounded-lg border border-amber-900/50 font-mono">
        <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
        <span>Push Notifications no soportadas en este navegador o modo privado.</span>
      </div>
    );
  }

  // Estilos y badge de mensaje dinámico según tipo de estado
  const renderStatusBanner = () => {
    if (!statusMessage) return null;

    if (statusType === 'error') {
      return (
        <div className="mt-2 flex items-start gap-2 text-[11px] text-rose-300 bg-rose-950/50 p-2.5 rounded-lg border border-rose-900/60 leading-relaxed animate-in fade-in duration-200">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span>{statusMessage}</span>
            {!isSubscribed && permission !== 'denied' && (
              <button
                onClick={subscribeUser}
                disabled={loading}
                className="inline-flex items-center gap-1 text-[10px] font-semibold text-rose-200 hover:text-white bg-rose-900/60 hover:bg-rose-800 px-2 py-1 rounded transition-colors whitespace-nowrap cursor-pointer self-start sm:self-auto"
              >
                <RotateCcw className="w-3 h-3" /> Reintentar
              </button>
            )}
          </div>
        </div>
      );
    }

    if (statusType === 'warning') {
      return (
        <div className="mt-2 flex items-start gap-2 text-[11px] text-amber-300 bg-amber-950/50 p-2.5 rounded-lg border border-amber-900/60 leading-relaxed">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <span>{statusMessage}</span>
        </div>
      );
    }

    if (statusType === 'info') {
      return (
        <div className="mt-2 flex items-start gap-2 text-[11px] text-sky-300 bg-sky-950/50 p-2.5 rounded-lg border border-sky-900/60 leading-relaxed">
          <Info className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
          <span>{statusMessage}</span>
        </div>
      );
    }

    // Default: 'success'
    return (
      <div className="mt-2 flex items-center gap-2 text-[11px] text-emerald-300 bg-emerald-950/50 p-2.5 rounded-lg border border-emerald-900/60 leading-relaxed">
        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
        <span>{statusMessage}</span>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-2 p-3 bg-slate-900/80 border border-slate-800 rounded-xl shadow-lg font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {isSubscribed ? (
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
              <Bell className="w-5 h-5 animate-pulse" />
            </div>
          ) : (
            <div className="p-2 rounded-lg bg-slate-800 text-slate-400 shrink-0">
              <BellOff className="w-5 h-5" />
            </div>
          )}
          <div>
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              Notificaciones Push
            </h4>
            <p className="text-[11px] text-slate-400">
              {isSubscribed 
                ? 'Activas en este dispositivo' 
                : permission === 'denied'
                  ? 'Permisos bloqueados en el navegador'
                  : 'Recibe alertas nativas en tu móvil o tablet'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          {isSubscribed ? (
            <>
              <button
                onClick={() => sendTestNotification()}
                disabled={loading}
                className="px-3 py-1.5 text-xs font-semibold text-sky-400 bg-sky-950/60 hover:bg-sky-900 border border-sky-800/80 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50 min-h-[34px]"
                title="Probar envío de alerta push"
              >
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                <span>Probar</span>
              </button>

              <button
                onClick={unsubscribeUser}
                disabled={loading}
                className="px-3 py-1.5 text-xs font-semibold text-rose-400 bg-rose-950/60 hover:bg-rose-900 border border-rose-800/80 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50 min-h-[34px]"
                title="Desactivar notificaciones en este equipo"
              >
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <BellOff className="w-3.5 h-3.5" />}
                <span>Desactivar</span>
              </button>
            </>
          ) : (
            <button
              onClick={subscribeUser}
              disabled={loading || permission === 'denied'}
              className="px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-indigo-600/30 min-h-[34px]"
              title={permission === 'denied' ? 'Permiso bloqueado en el navegador' : 'Activar notificaciones nativas'}
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Bell className="w-3.5 h-3.5" />}
              <span>{loading ? 'Activando...' : 'Activar Alertas'}</span>
            </button>
          )}
        </div>
      </div>

      {renderStatusBanner()}
    </div>
  );
}

