import React, { useEffect, useState } from 'react';
import useStore from '../store/useStore';
import { CheckCircle2, XCircle, AlertCircle, X } from 'lucide-react';

export default function ToastNotification() {
  const { toast, hideToast } = useStore();
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    if (!toast.show) return;

    setProgress(100);
    const duration = 4000; // 4 seconds
    const intervalTime = 40;
    const step = (intervalTime / duration) * 100;

    const timer = setTimeout(() => {
      hideToast();
    }, duration);

    const progressTimer = setInterval(() => {
      setProgress((prev) => {
        if (prev <= 0) {
          clearInterval(progressTimer);
          return 0;
        }
        return prev - step;
      });
    }, intervalTime);

    return () => {
      clearTimeout(timer);
      clearInterval(progressTimer);
    };
  }, [toast.show, toast.message, hideToast]);

  if (!toast.show) return null;

  let Icon = CheckCircle2;
  let themeClass = 'border-emerald-500/30 text-emerald-400 shadow-emerald-500/5 bg-emerald-950/20';
  let progressColor = 'bg-emerald-500';

  if (toast.type === 'error') {
    Icon = XCircle;
    themeClass = 'border-rose-500/30 text-rose-400 shadow-rose-500/5 bg-rose-950/20';
    progressColor = 'bg-rose-500';
  } else if (toast.type === 'warning' || toast.type === 'info') {
    Icon = AlertCircle;
    themeClass = 'border-amber-500/30 text-amber-400 shadow-amber-500/5 bg-amber-950/20';
    progressColor = 'bg-amber-500';
  }

  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-55 w-full max-w-sm px-4 no-print animate-in slide-in-from-top duration-300 ease-out">
      <div className={`relative flex items-start gap-3 p-4 rounded-2xl border backdrop-blur-md shadow-2xl overflow-hidden ${themeClass}`}>
        <Icon className="w-5 h-5 shrink-0 mt-0.5" />
        
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold leading-relaxed break-words font-sans text-slate-100 pr-4">
            {toast.message}
          </p>
        </div>

        <button 
          onClick={hideToast}
          className="p-0.5 hover:bg-slate-900 rounded-lg text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>

        {/* Barra de progreso de duración */}
        <div className="absolute bottom-0 left-0 w-full h-[3px] bg-slate-900/60">
          <div 
            className={`h-full transition-all duration-75 ease-linear ${progressColor}`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}
