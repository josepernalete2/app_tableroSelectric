import React from 'react';
import { calcularPorcentajeAvance } from '../utils/calcularAvance';

export const AvanceProgressBar = ({ elemento, tipoElemento, className = '', showDetails = true }) => {
  const { porcentaje, llenos, totalCampos, colorClass, textClass, badgeClass, statusText } = calcularPorcentajeAvance(elemento, tipoElemento);

  return (
    <div className={`space-y-1.5 w-full select-none ${className}`}>
      <div className="flex items-center justify-between text-[10px] gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-slate-400 font-bold uppercase tracking-wider text-[9px] shrink-0">Completitud:</span>
          <span className={`px-2 py-0.5 rounded-md text-[9.5px] font-bold border font-mono truncate shadow-xs ${badgeClass}`}>
            {statusText}
          </span>
        </div>
        
        <div className="flex items-center gap-1.5 shrink-0 font-mono">
          {showDetails && (
            <span className="text-slate-500 text-[9px] hidden sm:inline">
              ({llenos}/{totalCampos})
            </span>
          )}
          <span className={`font-black text-xs ${textClass}`}>
            {porcentaje}%
          </span>
        </div>
      </div>

      {/* Barra con fondo contrastado y borde sutil */}
      <div className="w-full bg-slate-900/90 rounded-full h-2 overflow-hidden border border-slate-800/90 p-[1px] shadow-inner">
        <div 
          className={`h-full ${colorClass} transition-all duration-700 ease-out rounded-full shadow-xs`}
          style={{ width: `${Math.max(porcentaje, 2)}%` }}
        />
      </div>
    </div>
  );
};

export default AvanceProgressBar;
