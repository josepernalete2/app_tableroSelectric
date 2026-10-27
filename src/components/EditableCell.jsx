import React, { useState, useEffect, useRef, useId, useMemo } from 'react';
import { getCustomOptions, saveCustomOption } from '../utils/customPresets';

/**
 * Celda reutilizable interactiva con soporte de edición "Tap-to-Edit",
 * listas desplegables integradas y autoguardado automático de presets personalizados.
 */
export const EditableCell = ({
  value = '',
  onSave,
  type = 'text',
  options = [],
  category = null,
  className = '',
  inputClassName = '',
  placeholder = '',
  disabled = false,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const inputRef = useRef(null);
  const uniqueId = useId();
  const datalistId = `dl-${uniqueId.replace(/:/g, '')}`;

  // Sincronizar valor local cuando cambie la propiedad externa
  useEffect(() => {
    setEditValue(value);
  }, [value]);

  // Obtener opciones combinadas (predeterminadas + guardadas por el usuario en localStorage)
  const combinedOptions = useMemo(() => {
    if (category) {
      return getCustomOptions(category, options);
    }
    return options || [];
  }, [category, options]);

  // Enfocar y seleccionar texto al iniciar la edición
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      if (type !== 'textarea') {
        inputRef.current.select?.();
      }
    }
  }, [isEditing, type]);

  // Normalización técnica de texto a mayúsculas y sin espacios redundantes
  const normalizeText = (text) => {
    if (typeof text !== 'string') return text;
    return text.trim().replace(/\s+/g, ' ').toUpperCase();
  };

  // Guardado y persistencia automática de presets personalizados
  const handleCommit = (rawVal) => {
    setIsEditing(false);
    const normalized = normalizeText(rawVal);

    if (category && normalized) {
      saveCustomOption(category, normalized, options);
    }

    if (onSave) {
      onSave(normalized);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleCommit(editValue);
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setEditValue(value); // Revertir al valor original
    }
  };

  const handleBlur = () => {
    handleCommit(editValue);
  };

  if (disabled) {
    return (
      <div className={`p-1.5 min-h-[1.75rem] text-slate-800 dark:text-slate-200 select-none ${className}`}>
        {value || <span className="opacity-30">—</span>}
      </div>
    );
  }

  if (isEditing) {
    if (type === 'textarea') {
      return (
        <textarea
          ref={inputRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleCommit(editValue);
            } else if (e.key === 'Escape') {
              setIsEditing(false);
              setEditValue(value);
            }
          }}
          className={`w-full p-1 text-xs text-slate-900 bg-amber-50 dark:bg-slate-800 dark:text-slate-100 border border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-500 rounded min-h-[3rem] resize-y ${inputClassName}`}
          placeholder={placeholder}
        />
      );
    }

    return (
      <div className="relative w-full">
        <input
          ref={inputRef}
          type="text"
          list={combinedOptions.length > 0 ? datalistId : undefined}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoComplete="off"
          className={`w-full px-1.5 py-0.5 text-xs text-slate-900 bg-amber-50 dark:bg-slate-800 dark:text-slate-100 border border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-500 rounded h-7 font-sans ${inputClassName}`}
        />
        {combinedOptions.length > 0 && (
          <datalist id={datalistId}>
            {combinedOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </datalist>
        )}
      </div>
    );
  }

  // Modo de visualización limpia
  const displayVal = value !== undefined && value !== null ? String(value) : '';
  const isEmpty = displayVal.trim() === '';

  return (
    <div
      onClick={() => setIsEditing(true)}
      title="Haz clic para editar o seleccionar preset"
      className={`p-1.5 min-h-[1.75rem] transition-colors duration-150 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/50 break-words ${
        isEmpty ? 'text-slate-400 dark:text-slate-600 italic' : 'text-slate-900 dark:text-slate-100 font-mono'
      } ${className}`}
    >
      {isEmpty ? (placeholder || '—') : displayVal}
    </div>
  );
};

export default EditableCell;
