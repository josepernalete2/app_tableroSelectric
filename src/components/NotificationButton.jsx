import React from 'react';
import { Bell, BellOff, Send, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { usePushNotifications } from '../hooks/usePushNotifications';

export default function NotificationButton() {
  const {
    isSupported,
    permission,
    isSubscribed,
    loading,
    statusMessage,
    subscribeUser,
    unsubscribeUser,
    sendTestNotification
  } = usePushNotifications();

  if (!isSupported) {
    return (
      <div className="flex items-center gap-2 text-xs text-amber-500 bg-amber-950/40 p-2.5 rounded-lg border border-amber-900/50 font-mono">
        <AlertTriangle className="w-4 h-4 shrink-0" />
        <span>Push Notifications no disponibles en este navegador.</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 p-3 bg-slate-900/80 border border-slate-800 rounded-xl shadow-lg font-sans">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {isSubscribed ? (
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Bell className="w-5 h-5 animate-pulse" />
            </div>
          ) : (
            <div className="p-2 rounded-lg bg-slate-800 text-slate-400">
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
                  ? 'Bloqueadas por el usuario'
                  : 'Recibe alertas nativas en tu móvil'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isSubscribed ? (
            <>
              <button
                onClick={() => sendTestNotification()}
                disabled={loading}
                className="px-3 py-1.5 text-xs font-semibold text-sky-400 bg-sky-950/60 hover:bg-sky-900 border border-sky-800/80 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                title="Probar envío de notificación"
              >
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                <span>Probar</span>
              </button>

              <button
                onClick={unsubscribeUser}
                disabled={loading}
                className="px-3 py-1.5 text-xs font-semibold text-rose-400 bg-rose-950/60 hover:bg-rose-900 border border-rose-800/80 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <BellOff className="w-3.5 h-3.5" />}
                <span>Desactivar</span>
              </button>
            </>
          ) : (
            <button
              onClick={subscribeUser}
              disabled={loading || permission === 'denied'}
              className="px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-md shadow-indigo-600/30"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Bell className="w-3.5 h-3.5" />}
              <span>Activar Alertas</span>
            </button>
          )}
        </div>
      </div>

      {statusMessage && (
        <div className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-300 bg-slate-950/60 p-2 rounded border border-slate-800 font-mono">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span className="truncate">{statusMessage}</span>
        </div>
      )}
    </div>
  );
}
