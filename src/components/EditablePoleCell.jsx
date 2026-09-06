import React, { useState, useEffect, useRef } from 'react';
import { Pencil } from 'lucide-react';

/**
 * EditablePoleCell: Componente especializado para la columna de numeración/código de polo (#).
 * Permite edición en línea mediante doble clic o clic en el icono de lápiz.
 * Maneja confirmación con Enter/onBlur y cancelación con Escape.
 */
export const EditablePoleCell = ({
  poleNumber,
  value = '',
  onSave,
  disabled = false,
  className = '',
  placeholder = '',
}) => {
  const [isEditing, setIsEditing] = useState(false);
  
  // Si no hay valor personalizado, se usa el número de polo por defecto
  const displayValue = (value !== undefined && value !== null && String(value).trim() !== '')
    ? String(value).trim()
    : String(poleNumber);

  const [editValue, setEditValue] = useState(displayValue);
  const inputRef = useRef(null);

  // Sincronizar valor cuando cambie desde props
  useEffect(() => {
    setEditValue(displayValue);
  }, [displayValue]);

  // Auto-focus y selección al entrar en modo edición
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = () => {
    setIsEditing(false);
    const trimmed = typeof editValue === 'string' ? editValue.trim() : String(editValue || '');
    onSave?.(trimmed);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsEditing(false);
      setEditValue(displayValue);
    }
  };

  if (disabled) {
    return (
      <span className={`font-mono font-bold select-none ${className}`}>
        {displayValue}
      </span>
    );
  }

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        placeholder={placeholder || String(poleNumber)}
        className="w-full max-w-[64px] text-center text-xs font-mono font-bold px-1 py-0.5 bg-amber-50 dark:bg-slate-800 text-amber-800 dark:text-amber-300 border border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-500 rounded shadow-inner"
        autoComplete="off"
      />
    );
  }

  const isCustomized = displayValue !== String(poleNumber);

  return (
    <div
      onDoubleClick={() => setIsEditing(true)}
      title="Doble clic o clic en el lápiz para editar el código/etiqueta del polo"
      className="relative group/polecell inline-flex items-center justify-center cursor-pointer w-full py-0.5 min-h-[1.5rem] select-none hover:bg-amber-500/20 dark:hover:bg-amber-500/10 rounded transition-colors"
    >
      <span
        className={`font-mono font-bold tracking-tight ${
          isCustomized 
            ? 'text-amber-800 dark:text-amber-300 underline decoration-amber-400/50 underline-offset-2' 
            : 'text-amber-700 dark:text-amber-400'
        } ${className}`}
      >
        {displayValue}
      </span>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsEditing(true);
        }}
        title="Editar código de polo"
        className="no-print opacity-0 group-hover/polecell:opacity-100 transition-opacity ml-1 p-0.5 text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-200 hover:bg-amber-200/50 dark:hover:bg-amber-900/40 rounded cursor-pointer"
      >
        <Pencil className="w-2.5 h-2.5" />
      </button>
    </div>
  );
};

export default EditablePoleCell;
