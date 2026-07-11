import React, { useState, useEffect, useRef } from 'react';

/**
 * Reusable cell component that implements "Tap-to-Edit" logic.
 * It displays clean text, and morphs into a form control on click.
 */
export const EditableCell = ({
  value = '',
  onSave,
  type = 'text',
  options = [],
  className = '',
  inputClassName = '',
  placeholder = '',
  disabled = false,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const inputRef = useRef(null);

  // Sync editValue when parent value changes
  useEffect(() => {
    setEditValue(value);
  }, [value]);

  // Focus the input when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      // For text inputs, select the text for easier replacement
      if (type === 'text' || type === 'number') {
        inputRef.current.select?.();
      }
    }
  }, [isEditing, type]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      setIsEditing(false);
      onSave(editValue);
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setEditValue(value); // revert changes
    }
  };

  const handleBlur = () => {
    setIsEditing(false);
    onSave(editValue);
  };

  if (disabled) {
    return (
      <div className={`p-1.5 min-h-[1.75rem] text-slate-800 dark:text-slate-200 select-none ${className}`}>
        {value || <span className="opacity-30">—</span>}
      </div>
    );
  }

  if (isEditing) {
    if (type === 'select') {
      return (
        <select
          ref={inputRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className={`w-full px-1 py-0.5 text-xs text-slate-900 bg-amber-50 dark:bg-slate-800 dark:text-slate-100 border border-amber-300 focus:outline-none focus:ring-1 focus:ring-amber-500 rounded h-7 ${inputClassName}`}
        >
          <option value="">—</option>
          {options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      );
    }

    if (type === 'textarea') {
      return (
        <textarea
          ref={inputRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={(e) => {
            // Commit on Enter, unless Shift is pressed for newlines
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              setIsEditing(false);
              onSave(editValue);
            } else if (e.key === 'Escape') {
              setIsEditing(false);
              setEditValue(value);
            }
          }}
          className={`w-full p-1 text-xs text-slate-900 bg-amber-50 dark:bg-slate-800 dark:text-slate-100 border border-amber-300 focus:outline-none focus:ring-1 focus:ring-amber-500 rounded min-h-[3rem] resize-y ${inputClassName}`}
          placeholder={placeholder}
        />
      );
    }

    return (
      <input
        ref={inputRef}
        type={type === 'number' ? 'text' : type} // Use text for custom decimals/fractions if preferred
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={`w-full px-1.5 py-0.5 text-xs text-slate-900 bg-amber-50 dark:bg-slate-800 dark:text-slate-100 border border-amber-300 focus:outline-none focus:ring-1 focus:ring-amber-500 rounded h-7 ${inputClassName}`}
      />
    );
  }

  // Display mode
  const displayVal = value !== undefined && value !== null ? String(value) : '';
  const isEmpty = displayVal.trim() === '';

  return (
    <div
      onClick={() => setIsEditing(true)}
      className={`p-1.5 min-h-[1.75rem] transition-colors duration-150 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/50 break-words ${
        isEmpty ? 'text-slate-400 dark:text-slate-600 italic' : 'text-slate-900 dark:text-slate-100 font-mono'
      } ${className}`}
    >
      {isEmpty ? (placeholder || '—') : displayVal}
    </div>
  );
};
export default EditableCell;
