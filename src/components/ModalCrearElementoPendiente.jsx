import React, { useState, useEffect, useRef } from 'react';
import { X, Plus, Clock, Zap, MapPin, FileText, Loader2 } from 'lucide-react';
import useStore, { getElementCode } from '../store/useStore';

const TIPOS_ELEMENTO_RAPIDO = [
  { value: 'TABLERO', label: '⚡ Tablero / Panel Eléctrico' },
  { value: 'TRANSFORMADOR', label: '🔄 Transformador' },
  { value: 'TRANSFER', label: '🔀 Transferencia (ATS / MTS)' },
  { value: 'PUNTO_MEDICION', label: '📏 Punto de Medición' },
  { value: 'PUNTO_SUMINISTRO', label: '🔌 Punto de Suministro' },
  { value: 'CCM', label: '⚙️ CCM (Centro Control Motores)' },
  { value: 'SUBESTACION', label: '🏢 Subestación Eléctrica' },
  { value: 'GENERADOR', label: '🔋 Generador / Planta Eléctrica' },
  { value: 'BANCO_CONDENSADOR', label: '⚡ Banco de Condensadores' },
  { value: 'PUESTA_TIERRA', label: '🛡️ Puesta a Tierra (SPAT)' },
  { value: 'OTRO', label: '📦 Otro Equipo / Carga' }
];

/**
 * Modal compacto de creación rápida de elementos marcados como PENDIENTES
 * sin salir ni reiniciar la vista actual (PC y Tablet).
 */
export default function ModalCrearElementoPendiente({
  isOpen,
  onClose,
  empresaId = null,
  proyectoId,
  suggestedName = '',
  defaultTipo = 'TABLERO',
  contextLabel = '',
  alimentadoPorPredefinido = null,
  onCreated
}) {
  const {
    addElementoUnifilar,
    addInspeccionSubestacion,
    addPuntoMedicion,
    addCcm,
    showToast
  } = useStore();

  const [tipoElemento, setTipoElemento] = useState(defaultTipo || 'TABLERO');
  const [nombre, setNombre] = useState(suggestedName || '');
  const [ubicacion, setUbicacion] = useState('');
  const [nota, setNota] = useState('');
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const nameInputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setTipoElemento(defaultTipo || 'TABLERO');
      setNombre(suggestedName ? String(suggestedName).trim() : '');
      setUbicacion('');
      setNota('');
      setError('');
      setIsSaving(false);
      setTimeout(() => {
        nameInputRef.current?.focus?.();
      }, 60);
    }
  }, [isOpen, suggestedName, defaultTipo]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    if (isSaving) return;

    const cleanNombre = String(nombre || '').trim().toUpperCase();
    if (!cleanNombre) {
      setError('Ingresa un nombre para el elemento pendiente.');
      nameInputRef.current?.focus?.();
      return;
    }
    if (!proyectoId) {
      setError('No se identificó el proyecto actual.');
      return;
    }

    setIsSaving(true);
    setError('');

    try {
      const cleanUbic = String(ubicacion || '').trim().toUpperCase();
      const cleanNota = String(nota || '').trim().toUpperCase();
      const parentId = alimentadoPorPredefinido?.id || null;
      const parentNombre = alimentadoPorPredefinido?.nombre
        ? String(alimentadoPorPredefinido.nombre).trim().toUpperCase()
        : '';

      let createdItem = null;
      const today = new Date().toISOString().split('T')[0];

      if (tipoElemento === 'SUBESTACION') {
        const res = addInspeccionSubestacion(proyectoId, {
          nombre: cleanNombre,
          ubicacion: cleanUbic || 'POR DEFINIR',
          fecha: today,
          hora: '08:00',
          inspector: 'Pendiente',
          nivelTension: '13.8 kV',
          observacionesGenerales: cleanNota,
          pendiente: true,
          estadoEntorno: {
            __pendiente: true,
            notaRapida: cleanNota
          }
        });
        if (!res?.success) throw new Error(res?.error || 'Error al crear la subestación pendiente.');
        createdItem = { ...res.subestacion, tipoElemento: 'SUBESTACION', pendiente: true };
      } else if (tipoElemento === 'CCM') {
        const res = addCcm(proyectoId, {
          nombre: cleanNombre,
          plantaInstalacion: cleanUbic || 'POR DEFINIR',
          ubicacion: cleanUbic || 'POR DEFINIR',
          alimentadoPor: parentNombre,
          alimentadoPorId: parentId,
          observacionesGenerales: cleanNota,
          pendiente: true,
          parametrosElectricos: {
            __pendiente: true,
            notaRapida: cleanNota,
            ...(parentId ? { alimentadoPorId: parentId } : {})
          }
        });
        if (!res?.success) throw new Error(res?.error || 'Error al crear el CCM pendiente.');
        createdItem = { ...res.ccm, tipoElemento: 'CCM', pendiente: true };
      } else if (tipoElemento === 'PUNTO_MEDICION') {
        const res = addPuntoMedicion(proyectoId, {
          nombre: cleanNombre,
          ubicacion: cleanUbic || 'POR DEFINIR',
          alimentadoPor: parentNombre,
          alimentadoPorId: parentId,
          observaciones: cleanNota,
          pendiente: true
        });
        if (!res?.success) throw new Error(res?.error || 'Error al crear el punto de medición pendiente.');
        createdItem = { ...res.puntoMedicion, tipoElemento: 'PUNTO_MEDICION', pendiente: true };
      } else {
        const res = addElementoUnifilar(proyectoId, {
          companyId: empresaId || undefined,
          nombre: cleanNombre,
          tipoElemento,
          ubicacion: cleanUbic || 'POR DEFINIR',
          alimentadoPor: tipoElemento === 'GENERADOR' ? 'FUENTE PRIMARIA INDEPENDIENTE' : parentNombre,
          alimentadoPorId: tipoElemento === 'GENERADOR' ? null : parentId,
          observacionesGenerales: cleanNota,
          pendiente: true,
          datosTecnicos: {
            pendiente: true,
            notaRapida: cleanNota,
            ...(tipoElemento !== 'GENERADOR' && parentId ? { alimentadoPorId: parentId } : {})
          }
        });
        if (!res?.success) throw new Error(res?.error || 'Error al crear el elemento pendiente.');
        createdItem = {
          ...res.elemento,
          pendiente: true,
          codigo: res.elemento?.codigo || getElementCode(res.elemento, tipoElemento)
        };
      }

      showToast?.('Elemento pendiente creado y vinculado', 'success');
      if (onCreated && createdItem) {
        onCreated(createdItem);
      }
      onClose?.();
    } catch (err) {
      setError(err?.message || 'Ocurrió un error al crear el elemento pendiente.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={(e) => {
        e.stopPropagation();
        if (!isSaving) onClose?.();
      }}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md bg-slate-900 border border-orange-500/40 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
      >
        {/* Cabecera */}
        <div className="p-4 border-b border-slate-800 bg-slate-950/80 flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5 min-w-0">
            <div className="p-2 rounded-xl bg-orange-500/15 border border-orange-500/40 text-orange-400 shrink-0 mt-0.5">
              <Clock className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-black text-slate-100 flex items-center gap-2 flex-wrap">
                <span>Crear Elemento Pendiente</span>
                <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-orange-500/20 text-orange-300 border border-orange-500/40">
                  PENDIENTE
                </span>
              </h3>
              {contextLabel && (
                <p className="text-[11px] text-amber-400 font-semibold mt-0.5 truncate" title={contextLabel}>
                  Contexto: {contextLabel}
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            disabled={isSaving}
            onClick={() => onClose?.()}
            className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer shrink-0"
            title="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Cuerpo del formulario */}
        <div className="p-4 space-y-3.5 text-xs">
          {alimentadoPorPredefinido?.nombre && (
            <div className="px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-200 flex items-center gap-2">
              <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="truncate">
                Se vinculará alimentado por: <strong className="font-mono text-amber-300">{alimentadoPorPredefinido.nombre}</strong>
              </span>
            </div>
          )}

          {/* 1. Tipo de elemento */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Tipo de Elemento
            </label>
            <select
              value={tipoElemento}
              onChange={(e) => setTipoElemento(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 hover:border-slate-600 focus:border-amber-500 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-100 focus:outline-none cursor-pointer min-h-[40px]"
            >
              {TIPOS_ELEMENTO_RAPIDO.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* 2. Nombre del elemento con botón X (Limpiar) */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Nombre del Elemento *
            </label>
            <div className="relative">
              <input
                ref={nameInputRef}
                type="text"
                value={nombre}
                onChange={(e) => {
                  setNombre(e.target.value);
                  if (error) setError('');
                }}
                placeholder="Ej. Tablero Principal Sótano, Trafo 2..."
                className="w-full bg-slate-950 border border-slate-700 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-xl pl-3 pr-10 py-2.5 text-xs sm:text-sm font-semibold text-slate-100 placeholder-slate-500 focus:outline-none uppercase min-h-[42px]"
              />
              {nombre && (
                <button
                  type="button"
                  onClick={() => {
                    setNombre('');
                    nameInputRef.current?.focus?.();
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
                  title="Limpiar nombre"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* 3. Ubicación (opcional) */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
              <MapPin className="w-3 h-3 text-slate-500" />
              Ubicación (opcional)
            </label>
            <input
              type="text"
              value={ubicacion}
              onChange={(e) => setUbicacion(e.target.value)}
              placeholder="Ej. Cuarto Eléctrico PB, Azotea..."
              className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none uppercase min-h-[38px]"
            />
          </div>

          {/* 4. Nota / detalle rápido (opcional) */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
              <FileText className="w-3 h-3 text-slate-500" />
              Nota / detalle rápido (opcional)
            </label>
            <input
              type="text"
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              placeholder="Ej. Levantar planilla completa en sitio..."
              className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none uppercase min-h-[38px]"
            />
          </div>

          {error && (
            <p className="text-[11px] font-semibold text-rose-400 bg-rose-950/30 border border-rose-500/30 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 sm:p-4 border-t border-slate-800 bg-slate-950/90 flex items-center justify-end gap-2.5">
          <button
            type="button"
            disabled={isSaving}
            onClick={() => onClose?.()}
            className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-bold text-slate-300 cursor-pointer min-h-[40px]"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 disabled:opacity-60 text-slate-950 text-xs font-black cursor-pointer shadow-md flex items-center gap-1.5 min-h-[40px]"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Creando...</span>
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>Crear y Vincular</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
