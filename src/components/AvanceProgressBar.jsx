import React from 'react';
import { calcularPorcentajeAvance } from '../utils/calcularAvance';

export const AvanceProgressBar = ({ elemento, tipoElemento, className = '' }) => {
  const { porcentaje, colorClass, textClass, label } = calcularPorcentajeAvance(elemento, tipoElemento);

  return (
    <div className={`space-y-1.5 w-full ${className}`}>
      <div className="flex items-center justify-between text-[10px] font-bold">
        <span className="text-slate-400">Completitud Técnica:</span>
        <span className={`${textClass} font-mono font-black`}>{label}</span>
      </div>
      <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden border border-slate-800">
        <div 
          className={`h-full ${colorClass} transition-all duration-500 rounded-full`}
          style={{ width: `${porcentaje}%` }}
        />
      </div>
    </div>
  );
};

export default AvanceProgressBar;
