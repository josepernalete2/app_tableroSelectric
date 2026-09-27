import React from 'react';
import { Edit3, Trash2, ClipboardList } from 'lucide-react';

export const ElementoCardActions = ({
  onEdit,
  onDelete,
  onNewInspection,
  editLabel = 'Editar Planilla',
  deleteLabel = 'Eliminar Elemento',
  inspectionLabel = 'Registrar Planilla',
  className = '',
  userRole = 'ADMIN',
  readOnly = false
}) => {
  const isReadOnly = readOnly || userRole === 'CLIENT';

  if (isReadOnly) {
    return (
      <div className={`flex items-center gap-2 pt-3 border-t border-slate-900/80 opacity-100 ${className}`}>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onEdit?.();
          }}
          className="flex-1 min-w-0 py-2 px-3 bg-slate-900 hover:bg-slate-850 text-slate-200 border border-slate-800 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 shadow-xs"
          title={editLabel}
        >
          <Edit3 className="w-3.5 h-3.5 text-amber-500 shrink-0" />
          <span className="truncate">Ver Ficha</span>
        </button>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 pt-3 border-t border-slate-900/80 opacity-100 ${className}`}>
      {/* 1. Editar Planilla */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onEdit?.();
        }}
        className="flex-1 min-w-0 py-2 px-2.5 bg-slate-900 hover:bg-slate-850 text-slate-200 hover:text-amber-400 border border-slate-800 hover:border-amber-500/40 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 shadow-xs"
        title={editLabel || "Abrir y editar la planilla técnica de este elemento"}
      >
        <Edit3 className="w-3.5 h-3.5 text-amber-500 shrink-0" />
        <span className="truncate">{editLabel}</span>
      </button>

      {/* 2. Registrar Inspección */}
      {onNewInspection && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onNewInspection();
          }}
          className="shrink-0 py-2 px-2.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 hover:text-amber-300 border border-amber-500/30 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 shadow-xs"
          title={inspectionLabel || "Iniciar o asociar nueva inspección técnica a este activo"}
        >
          <ClipboardList className="w-3.5 h-3.5 shrink-0" />
          <span className="hidden sm:inline">{inspectionLabel}</span>
        </button>
      )}

      {/* 3. Eliminar Elemento */}
      {onDelete && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete?.();
          }}
          className="shrink-0 p-2 bg-slate-900 hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 border border-slate-800 hover:border-rose-900/60 rounded-xl transition-all cursor-pointer active:scale-95 shadow-xs opacity-100"
          title={deleteLabel}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};

export default ElementoCardActions;
