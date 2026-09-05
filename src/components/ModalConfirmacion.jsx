import React from 'react';
import useStore from '../store/useStore';
import { AlertTriangle, Trash2, AlertCircle, HelpCircle, X } from 'lucide-react';

export default function ModalConfirmacion() {
  const { confirmDialog, closeConfirm } = useStore();

  if (!confirmDialog?.isOpen) return null;

  const {
    title = '¿Estás seguro?',
    message = '',
    confirmText = 'Aceptar',
    cancelText = 'Cancelar',
    variant = 'danger',
    onConfirm
  } = confirmDialog;

  const handleConfirm = () => {
    if (typeof onConfirm === 'function') {
      onConfirm();
    }
    closeConfirm();
  };

  let Icon = AlertTriangle;
  let iconBg = 'bg-red-500/10 text-red-400 border-red-500/20';
  let confirmBtnClass = 'bg-red-600 hover:bg-red-500 active:scale-95 text-white shadow-lg shadow-red-600/20';

  if (variant === 'warning') {
    Icon = AlertCircle;
    iconBg = 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    confirmBtnClass = 'bg-amber-600 hover:bg-amber-500 active:scale-95 text-white shadow-lg shadow-amber-600/20';
  } else if (variant === 'info') {
    Icon = HelpCircle;
    iconBg = 'bg-blue-500/10 text-blue-400 border-blue-500/20';
    confirmBtnClass = 'bg-blue-600 hover:bg-blue-500 active:scale-95 text-white shadow-lg shadow-blue-600/20';
  } else if (variant === 'delete') {
    Icon = Trash2;
    iconBg = 'bg-red-500/10 text-red-400 border-red-500/20';
    confirmBtnClass = 'bg-red-600 hover:bg-red-500 active:scale-95 text-white shadow-lg shadow-red-600/20';
  }

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4 animate-in fade-in duration-200">
      {/* Backdrop con desenfoque */}
      <div 
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity"
        onClick={closeConfirm}
      />

      {/* Contenedor Modal */}
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden p-6 text-slate-100 font-sans animate-in zoom-in-95 duration-200">
        
        {/* Botón Cerrar */}
        <button
          onClick={closeConfirm}
          className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-xl border shrink-0 ${iconBg}`}>
            <Icon className="w-6 h-6" />
          </div>

          <div className="flex-1 min-w-0 pr-4">
            <h3 className="text-base font-bold text-slate-100 leading-snug">
              {title}
            </h3>
            {message && (
              <p className="text-xs text-slate-300 mt-2 leading-relaxed whitespace-pre-line font-medium">
                {message}
              </p>
            )}
          </div>
        </div>

        {/* Botones de Acción */}
        <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-slate-800">
          <button
            type="button"
            onClick={closeConfirm}
            className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-750 active:scale-95 rounded-xl border border-slate-700 transition-all cursor-pointer"
          >
            {cancelText}
          </button>

          <button
            type="button"
            onClick={handleConfirm}
            className={`px-5 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${confirmBtnClass}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
