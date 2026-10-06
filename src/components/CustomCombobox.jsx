import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Plus, Check } from 'lucide-react';
import { getCustomOptions, saveCustomOption } from '../utils/customPresets';

/**
 * Combobox reutilizable con Escritura Libre y Autoguardado de Opciones Frecuentes
 */
export default function CustomCombobox({
  value = '',
  onChange,
  category = 'general',
  defaultOptions = [],
  placeholder = 'Escribir o seleccionar...',
  className = '',
  disabled = false,
  id
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  const [options, setOptions] = useState(() => getCustomOptions(category, defaultOptions));

  useEffect(() => {
    const handleUpdate = (e) => {
      if (!e.detail || e.detail.category === category) {
        setOptions(getCustomOptions(category, defaultOptions));
      }
    };
    window.addEventListener('custom_options_updated', handleUpdate);
    return () => window.removeEventListener('custom_options_updated', handleUpdate);
  }, [category, defaultOptions]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e) => {
    onChange?.(e.target.value);
  };

  const handleBlur = () => {
    if (value && value.trim()) {
      saveCustomOption(category, value, defaultOptions);
    }
  };

  const handleSelectOption = (opt) => {
    onChange?.(opt);
    saveCustomOption(category, opt, defaultOptions);
    setIsOpen(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (value && value.trim()) {
        saveCustomOption(category, value, defaultOptions);
      }
      setIsOpen(false);
      inputRef.current?.blur();
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const filteredOptions = value?.trim()
    ? options.filter(opt => opt.toLowerCase().includes(value.toLowerCase().trim()))
    : options;

  const isCustomValue = value && !defaultOptions.some(b => b.toLowerCase() === value.toLowerCase().trim());

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      <div className="relative flex items-center">
        <input
          ref={inputRef}
          type="text"
          id={id}
          disabled={disabled}
          value={value}
          onChange={handleInputChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          autoComplete="off"
          className="w-full bg-slate-950 border border-slate-700/80 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-xl px-3 py-2 pr-9 text-xs font-mono text-slate-100 placeholder-slate-500 outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-inner"
        />
        
        <button
          type="button"
          tabIndex={-1}
          disabled={disabled}
          onClick={() => setIsOpen(prev => !prev)}
          className="absolute right-2 p-1 text-slate-400 hover:text-amber-400 transition-colors cursor-pointer rounded-lg hover:bg-slate-800"
        >
          <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180 text-amber-400' : ''}`} />
        </button>
      </div>

      {isOpen && !disabled && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-slate-900 border border-slate-700/90 rounded-xl shadow-2xl overflow-hidden backdrop-blur-md max-h-52 overflow-y-auto ring-1 ring-amber-500/20 animate-in fade-in zoom-in-95 duration-100">
          <div className="p-1 space-y-0.5">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt) => {
                const isSelected = value?.trim().toLowerCase() === opt.toLowerCase();
                const isPreset = defaultOptions.includes(opt);

                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => handleSelectOption(opt)}
                    className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-mono flex items-center justify-between transition-colors cursor-pointer ${
                      isSelected 
                        ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40' 
                        : 'text-slate-200 hover:bg-slate-800/80 hover:text-white'
                    }`}
                  >
                    <span className="truncate">{opt}</span>
                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      {!isPreset && (
                        <span className="text-[9px] px-1.5 py-0.2 bg-sky-950 text-sky-400 border border-sky-800 rounded font-sans">
                          Frecuente
                        </span>
                      )}
                      {isSelected && <Check className="w-3.5 h-3.5 text-amber-400" />}
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="p-2.5 text-center text-xs text-slate-400 font-mono">
                Presiona <span className="text-amber-400 font-bold">Enter</span> para guardar "{value}"
              </div>
            )}

            {isCustomValue && !filteredOptions.some(o => o.toLowerCase() === value.toLowerCase().trim()) && (
              <button
                type="button"
                onClick={() => handleSelectOption(value)}
                className="w-full text-left px-3 py-1.5 rounded-lg text-xs font-mono bg-emerald-950/40 text-emerald-300 border border-emerald-800/60 hover:bg-emerald-900/50 flex items-center gap-2 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="truncate">Guardar nueva: <strong>{value}</strong></span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
