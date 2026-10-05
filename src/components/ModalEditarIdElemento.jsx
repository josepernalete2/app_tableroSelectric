import React, { useState, useEffect } from 'react';
import { ShieldCheck, Edit3, AlertCircle, Check, X, Tag } from 'lucide-react';
import useStore, { getElementCode, PREFIX_MAP } from '../store/useStore';

export default function ModalEditarIdElemento({
  isOpen,
  onClose,
  elemento,
  tipoElemento = 'TABLERO',
  proyectoId = null,
  onSaved = null
}) {
  const user = useStore((state) => state.user);
  const updateElementoCodigo = useStore((state) => state.updateElementoCodigo);
  const showToast = useStore((state) => state.showToast);

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'admin';

  const [nuevoCodigo, setNuevoCodigo] = useState('');
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (elemento) {
      const currentCode = getElementCode(elemento, tipoElemento || elemento.tipoElemento);
      setNuevoCodigo(currentCode || '');
      setError('');
    }
  }, [elemento, tipoElemento, isOpen]);

  if (!isOpen || !elemento) return null;

  // Si no es admin, mostrar denegación de acceso
  if (!isAdmin) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
        <div className="bg-slate-900 border border-red-800/60 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 text-center">
          <div className="w-12 h-12 bg-red-500/10 text-red-400 border border-red-500/30 rounded-full flex items-center justify-center mx-auto">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-white">Acceso Restringido</h3>
          <p className="text-sm text-slate-400">
            La edición directa de los identificadores e IDs visuales de los activos del sistema está reservada exclusivamente para usuarios con rol de <strong className="text-amber-400">Administrador</strong>.
          </p>
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-slate-800 hover:bg-slate-750 text-slate-200 rounded-xl font-bold text-sm transition-all cursor-pointer"
          >
            Entendido y Cerrar
          </button>
        </div>
      </div>
    );
  }

  const currentCode = getElementCode(elemento, tipoElemento || elemento.tipoElemento);
  const currentPrefix = PREFIX_MAP[elemento.tipoElemento || tipoElemento] || 'ele';

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');

    const clean = nuevoCodigo.trim().toLowerCase().replace(/\s+/g, '-');
    if (!clean) {
      setError('El identificador no puede quedar vacío.');
      return;
    }

    if (clean.length > 30) {
      setError('El identificador no debe exceder los 30 caracteres.');
      return;
    }

    setIsSaving(true);
    try {
      const res = await updateElementoCodigo(elemento.id, clean, tipoElemento || elemento.tipoElemento, proyectoId);
      if (res?.success) {
        showToast?.(`ID del elemento actualizado a "${clean}" correctamente.`, 'success');
        onSaved?.(clean);
        onClose();
      } else {
        setError(res?.error || 'Error al actualizar el ID del elemento.');
      }
    } catch (err) {
      setError(err.message || 'Error inesperado al guardar.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden flex flex-col">
        
        {/* Encabezado */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded-xl">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-100">Editar Identificador (ID Visual)</h3>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full uppercase tracking-wider">
                  <ShieldCheck className="w-3 h-3" /> Solo Admin
                </span>
              </div>
              <p className="text-xs text-slate-400 truncate max-w-xs sm:max-w-sm">
                {elemento.nombre || 'Elemento del Proyecto'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cuerpo del Formulario */}
        <form onSubmit={handleSave} className="p-6 space-y-5">
          
          {error && (
            <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-800/80 text-red-300 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          <div className="bg-slate-950/70 border border-slate-800/90 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">ID Actual del Elemento:</span>
              <span className="font-mono font-bold text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded border border-amber-500/30">
                {currentCode}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800/60">
              <span className="text-slate-400">Tipo de Equipo:</span>
              <span className="font-semibold text-slate-300">{tipoElemento || elemento.tipoElemento || 'TABLERO'}</span>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
              Nuevo Identificador / Código Único
            </label>
            <div className="relative">
              <input
                type="text"
                value={nuevoCodigo}
                onChange={(e) => setNuevoCodigo(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                placeholder={`ej. ${currentPrefix}-1, ${currentPrefix}-principal`}
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-xl text-sm font-mono font-bold text-amber-300 placeholder-slate-600 focus:outline-none transition-all"
                autoFocus
              />
            </div>
            <p className="text-[11px] text-slate-500">
              Se recomienda usar el prefijo corto de la categoría seguido del consecutivo (ej. <code className="text-amber-400 font-mono font-bold">{currentPrefix}-1</code>, <code className="text-amber-400 font-mono font-bold">{currentPrefix}-2</code>).
            </p>
          </div>

          {/* Sugerencias rápidas */}
          <div className="space-y-1.5">
            <span className="text-[11px] text-slate-400 font-medium">Sugerencias rápidas:</span>
            <div className="flex flex-wrap gap-1.5">
              {[1, 2, 3, 4, 5].map((num) => {
                const sug = `${currentPrefix}-${num}`;
                return (
                  <button
                    key={sug}
                    type="button"
                    onClick={() => setNuevoCodigo(sug)}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-amber-300 rounded-lg text-xs font-mono font-bold border border-slate-700/80 transition-colors cursor-pointer"
                  >
                    {sug}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl text-[11px] text-amber-400/90 leading-relaxed">
            ℹ️ <strong>Nota Técnica:</strong> Modificar este código cambiará de forma inmediata la etiqueta visible en tarjetas, planillas y planos unifilares sin alterar las relaciones internas ni el UUID de base de datos.
          </div>

          {/* Acciones */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving || !nuevoCodigo.trim()}
              className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-lg shadow-amber-500/20 cursor-pointer disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>{isSaving ? 'Guardando...' : 'Guardar Nuevo ID'}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
