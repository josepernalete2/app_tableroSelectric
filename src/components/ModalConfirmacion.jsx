import React, { useEffect, useRef } from 'react';
import { AlertTriangle, Trash2, Info, AlertCircle, X } from 'lucide-react';

/**
 * ModalConfirmacion: Componente visual reutilizable para diálogos modales
 * de confirmación y alerta estilizados con Tailwind CSS.
 */
export const ModalConfirmacion = ({
  isOpen,
  title,
  message,
  type = 'danger',
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  isAlert = false,
  onConfirm,
  onCancel,
}) => {
  const confirmButtonRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      // Auto-focus en el botón principal
      const timer = setTimeout(() => {
        confirmButtonRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Manejo de teclado (Escape y Enter)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  // Configuración de estilos según el tipo
  const getTypeConfig = () => {
    switch (type) {
      case 'danger':
        return {
          icon: Trash2,
          iconBg: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
          confirmBtn: 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-900/30 focus:ring-rose-500',
          defaultTitle: 'Confirmar eliminación',
        };
      case 'warning':
        return {
          icon: AlertTriangle,
          iconBg: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
          confirmBtn: 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold shadow-amber-900/30 focus:ring-amber-500',
          defaultTitle: 'Atención requerida',
        };
      case 'info':
      default:
        return {
          icon: Info,
          iconBg: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
          confirmBtn: 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/30 focus:ring-blue-500',
          defaultTitle: 'Información',
        };
    }
  };

  const config = getTypeConfig();
  const IconComponent = config.icon;
  const modalTitle = title || config.defaultTitle;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fade-in no-print"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel?.();
      }}
    >
      <div
        className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden transition-all transform animate-scale-in"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-confirm-title"
      >
        {/* Botón cerrar X */}
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          title="Cerrar"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="p-6">
          <div className="flex items-start gap-4">
            {/* Icono con badge temático */}
            <div
              className={`shrink-0 w-11 h-11 rounded-2xl flex items-center justify-center border shadow-xs ${config.iconBg}`}
            >
              <IconComponent className="w-5 h-5" />
            </div>

            {/* Contenido textual */}
            <div className="flex-1 min-w-0 pr-4">
              <h3
                id="modal-confirm-title"
                className="text-base font-bold text-slate-900 dark:text-slate-100 leading-snug"
              >
                {modalTitle}
              </h3>
              <div className="mt-2 text-xs text-slate-600 dark:text-slate-300 leading-relaxed break-words whitespace-pre-line">
                {message}
              </div>
            </div>
          </div>

          {/* Acciones */}
          <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800/80">
            {!isAlert && (
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
              >
                {cancelText}
              </button>
            )}
            <button
              ref={confirmButtonRef}
              type="button"
              onClick={onConfirm}
              className={`px-5 py-2 text-xs font-bold rounded-xl shadow-md transition-all active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-slate-900 cursor-pointer ${config.confirmBtn}`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModalConfirmacion;
