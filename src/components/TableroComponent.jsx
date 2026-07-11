import React, { useState } from 'react';
import EditableCell from './EditableCell';
import { Plus, Minus, Grid, Columns, Settings, RefreshCw, Zap, Image, ClipboardList } from 'lucide-react';
import ModalEdicionCircuito from './ModalEdicionCircuito';
import { exportTableroToExcel } from '../utils/excelExport';

// Common options for dropdowns
const AMP_OPTIONS = ['N/A', '10', '15', '20', '30', '40', '50', '60', '70', '80', '90', '100', '125', '150', '175', '200', '225', '250', '300', '350', '400', '500'];
const COND_OPTIONS = ['N/A', '14', '12', '10', '8', '6', '4', '2', '1/0', '2/0', '3/0', '4/0', '250', '350', '500 MCM', '2X12', '4X12', '3X8 TW', '1X500', 'SOLIDO # 4'];
const MARCA_OPTIONS = ['GE', 'EATON', 'ABB', 'INESLA', 'MG', 'SQUARE D', 'SIEMENS', 'CUTLER-HAMMER', 'N/A'];
const TIPO_OPTIONS = ['TQ', 'TQD', 'M35', 'A2C', 'NS', 'TED32', 'M51', 'TM250', 'QO', 'THQL', 'N/A'];

export const TableroComponent = ({ tableroData, onUpdateTablero }) => {
  const [editingCircuit, setEditingCircuit] = useState(null);
  const [elementosPorCrear, setElementosPorCrear] = useState([]);

  if (!tableroData) return <div className="text-center p-8">No hay datos de tablero seleccionados.</div>;

  const {
    id,
    ubicacion,
    alimentadoPor,
    tipo,
    barrasPrincipales = {},
    breakerPrincipal = {},
    voltaje = {},
    acometida,
    maxPoles = 30,
    circuits = [],
    neutroLlegada = {},
    puestaTierra = {},
    observacionesGenerales = "",
  } = tableroData;

  // Normalize circuits: ensure all poles from 1 to maxPoles are represented exactly once
  const normalizedCircuits = React.useMemo(() => {
    const list = [...circuits];
    const coveredPoles = new Set();
    list.forEach(c => c.poles.forEach(p => coveredPoles.add(p)));

    // Fill in missing poles
    for (let pole = 1; pole <= maxPoles; pole++) {
      if (!coveredPoles.has(pole)) {
        list.push({
          id: `auto_${pole}`,
          side: pole % 2 === 1 ? 'left' : 'right',
          poles: [pole],
          equipo: 'RESERVA',
          breaker: { marca: '', tipo: '', amp: '' },
          conductor: '',
        });
      }
    }

    // Sort circuits by their first pole number
    return list.sort((a, b) => Math.min(...a.poles) - Math.min(...b.poles));
  }, [circuits, maxPoles]);

  // Update specific fields of the main tablero structure
  const updateField = (path, value) => {
    const newData = { ...tableroData };
    
    if (path.includes('.')) {
      const [parent, child] = path.split('.');
      newData[parent] = { ...newData[parent], [child]: value };
    } else {
      newData[path] = value;
    }
    
    onUpdateTablero(newData);
  };

  // Update a single circuit's properties
  const updateCircuit = (circuitId, field, value) => {
    const newData = { ...tableroData };
    newData.circuits = normalizedCircuits.map(c => {
      if (c.id === circuitId) {
        if (field.startsWith('breaker.')) {
          const [_, subField] = field.split('.');
          return {
            ...c,
            breaker: { ...c.breaker, [subField]: value }
          };
        }
        return { ...c, [field]: value };
      }
      return c;
    });
    onUpdateTablero(newData);
  };

  const saveCircuitFromModal = (circuitId, updatedFields) => {
    const newData = { ...tableroData };
    newData.circuits = normalizedCircuits.map(c => {
      if (c.id === circuitId) {
        return {
          ...c,
          ...updatedFields
        };
      }
      return c;
    });
    onUpdateTablero(newData);
  };

  // Group a pole with the next pole on the same side
  const groupWithNext = (circuitId, side) => {
    const circuitIndex = normalizedCircuits.findIndex(c => c.id === circuitId);
    if (circuitIndex === -1) return;

    const circuit = normalizedCircuits[circuitIndex];
    const maxPole = Math.max(...circuit.poles);
    const nextPole = maxPole + 2;

    if (nextPole > maxPoles) return; // Exceeds limit

    // Find the circuit that contains the next pole
    const nextCircuit = normalizedCircuits.find(c => c.poles.includes(nextPole));
    if (!nextCircuit || nextCircuit.id === circuit.id) return;

    const newData = { ...tableroData };
    
    // Combine poles and remove the next circuit
    newData.circuits = normalizedCircuits
      .map(c => {
        if (c.id === circuitId) {
          // Merge poles lists and keep them sorted
          const mergedPoles = Array.from(new Set([...c.poles, ...nextCircuit.poles])).sort((a, b) => a - b);
          return { ...c, poles: mergedPoles };
        }
        return c;
      })
      .filter(c => c.id !== nextCircuit.id);

    onUpdateTablero(newData);
  };

  // Split a multi-pole circuit into individual single-pole circuits
  const splitCircuit = (circuitId) => {
    const circuit = normalizedCircuits.find(c => c.id === circuitId);
    if (!circuit || circuit.poles.length <= 1) return;

    const newData = { ...tableroData };
    
    // Remove the grouped circuit, and add single pole circuits for each pole in group
    const baseCircuits = normalizedCircuits.filter(c => c.id !== circuitId);
    const splitPoles = circuit.poles.map(pole => ({
      id: `split_${pole}_${Date.now()}`,
      side: circuit.side,
      poles: [pole],
      equipo: circuit.equipo || 'RESERVA',
      breaker: { ...circuit.breaker },
      conductor: circuit.conductor,
    }));

    newData.circuits = [...baseCircuits, ...splitPoles].sort((a, b) => Math.min(...a.poles) - Math.min(...b.poles));
    onUpdateTablero(newData);
  };

  // Split rendering rows into left (odd) and right (even) poles
  const oddPoles = Array.from({ length: Math.ceil(maxPoles / 2) }, (_, i) => 2 * i + 1);
  
  // Find circuit by pole number
  const findCircuitByPole = (pole) => {
    return normalizedCircuits.find(c => c.poles.includes(pole));
  };

  return (
    <div className="w-full text-slate-900 dark:text-slate-100 print-card font-sans select-text">
      
      {/* 1. SECCIÓN CABECERA */}
      <table className="w-full border-collapse border-2 border-slate-800 dark:border-slate-700 text-xs table-fixed mb-0">
        <tbody>
          {/* Fila 1: Título General */}
          <tr className="border-b border-slate-800 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/80">
            <td colSpan={7} className="p-0 text-center font-bold text-sm tracking-wide">
              <div className="flex justify-center items-center gap-1 py-1.5 uppercase font-bold text-slate-800 dark:text-slate-200">
                <Zap className="w-4 h-4 text-amber-500 fill-amber-500/20" />
                <span>Información General de Tablero No.</span>
                <div className="w-16 inline-block font-mono">
                  <EditableCell
                    value={id}
                    onSave={(val) => updateField('id', val)}
                    placeholder="No."
                    className="text-center font-bold text-slate-900 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20"
                  />
                </div>
              </div>
            </td>
          </tr>

          {/* Fila 2: Ubicación */}
          <tr className="border-b border-slate-800 dark:border-slate-700">
            <td className="w-24 p-2 bg-slate-50 dark:bg-slate-800/40 font-semibold border-r border-slate-800 dark:border-slate-700 uppercase">
              Ubicación:
            </td>
            <td colSpan={6} className="p-0 font-medium">
              <EditableCell
                value={ubicacion}
                onSave={(val) => updateField('ubicacion', val)}
                placeholder="Indique la ubicación física detallada del tablero..."
                className="px-3"
              />
            </td>
          </tr>

          {/* Fila 3: Alimentado Por */}
          <tr className="border-b border-slate-800 dark:border-slate-700">
            <td className="w-24 p-2 bg-slate-50 dark:bg-slate-800/40 font-semibold border-r border-slate-800 dark:border-slate-700 uppercase">
              Alimentado Por:
            </td>
            <td colSpan={6} className="p-0 font-medium">
              <EditableCell
                value={alimentadoPor}
                onSave={(val) => updateField('alimentadoPor', val)}
                placeholder="Indique procedencia de la alimentación, interruptor y calibre..."
                className="px-3"
              />
            </td>
          </tr>

          {/* Fila 4: Encabezados de Parámetros */}
          <tr className="border-b border-slate-800 dark:border-slate-700 text-center font-semibold bg-slate-50 dark:bg-slate-800/60">
            <td colSpan={2} className="border-r border-slate-800 dark:border-slate-700 p-1 uppercase">
              Barras Principales
            </td>
            <td colSpan={3} className="border-r border-slate-800 dark:border-slate-700 p-0 uppercase">
              <div className="flex items-center justify-between px-2 py-1 bg-slate-100 dark:bg-slate-800 border-b border-slate-800 dark:border-slate-700">
                <span className="text-[10px]">Tipo de Tablero</span>
                <div className="flex gap-3">
                  <label className="flex items-center gap-1 cursor-pointer select-none">
                    <input
                      type="radio"
                      checked={tipo === 'superficial'}
                      onChange={() => updateField('tipo', 'superficial')}
                      className="accent-amber-500 w-3 h-3 cursor-pointer"
                    />
                    <span className={tipo === 'superficial' ? 'font-bold text-amber-500' : ''}>Superficial</span>
                  </label>
                  <label className="flex items-center gap-1 cursor-pointer select-none">
                    <input
                      type="radio"
                      checked={tipo === 'empotrado'}
                      onChange={() => updateField('tipo', 'empotrado')}
                      className="accent-amber-500 w-3 h-3 cursor-pointer"
                    />
                    <span className={tipo === 'empotrado' ? 'font-bold text-amber-500' : ''}>Empotrado</span>
                  </label>
                </div>
              </div>
              <div className="py-1">BREAKER PRINCIPAL</div>
            </td>
            <td className="border-r border-slate-800 dark:border-slate-700 p-1 uppercase w-20">
              Voltaje
            </td>
            <td className="p-1 uppercase">
              Acometida
            </td>
          </tr>

          {/* Fila 5: Sub-encabezados de Breaker */}
          <tr className="border-b border-slate-800 dark:border-slate-700 text-center font-bold text-[10px] bg-slate-100 dark:bg-slate-800/80">
            <td colSpan={2} className="border-r border-slate-800 dark:border-slate-700 p-0.5">FASE / AMPERIOS</td>
            <td className="border-r border-slate-800 dark:border-slate-700 p-0.5 w-24">MARCA</td>
            <td className="border-r border-slate-800 dark:border-slate-700 p-0.5 w-20">TIPO</td>
            <td className="border-r border-slate-800 dark:border-slate-700 p-0.5 w-20">AMP</td>
            <td className="border-r border-slate-800 dark:border-slate-700 p-0.5">V-FASE</td>
            <td className="p-0.5">CALIBRE/DETALLES</td>
          </tr>

          {/* Fila 6 (IA) */}
          <tr className="border-b border-slate-800 dark:border-slate-700">
            <td className="w-12 text-center bg-slate-50 dark:bg-slate-800/30 border-r border-slate-800 dark:border-slate-700 font-bold font-mono">IA</td>
            <td className="w-20 p-0 border-r border-slate-800 dark:border-slate-700 text-center">
              <EditableCell
                value={barrasPrincipales.ia}
                onSave={(val) => updateField('barrasPrincipales.ia', val)}
                placeholder="0"
                className="text-center font-mono"
              />
            </td>
            {/* Breaker Principal Marca (spans 3 rows) */}
            <td rowSpan={3} className="p-0 border-r border-slate-800 dark:border-slate-700 text-center align-middle font-medium bg-amber-500/5">
              <EditableCell
                value={breakerPrincipal.marca}
                onSave={(val) => updateField('breakerPrincipal.marca', val)}
                type="select"
                options={MARCA_OPTIONS}
                placeholder="Marca"
                className="text-center font-bold"
              />
            </td>
            {/* Breaker Principal Tipo (spans 3 rows) */}
            <td rowSpan={3} className="p-0 border-r border-slate-800 dark:border-slate-700 text-center align-middle bg-amber-500/5">
              <EditableCell
                value={breakerPrincipal.tipo}
                onSave={(val) => updateField('breakerPrincipal.tipo', val)}
                placeholder="Tipo"
                className="text-center"
              />
            </td>
            {/* Breaker Principal Amp (spans 3 rows) */}
            <td rowSpan={3} className="p-0 border-r border-slate-800 dark:border-slate-700 text-center align-middle font-bold bg-amber-500/5">
              <EditableCell
                value={breakerPrincipal.amp}
                onSave={(val) => updateField('breakerPrincipal.amp', val)}
                type="select"
                options={AMP_OPTIONS}
                placeholder="Amp"
                className="text-center font-mono text-amber-600 dark:text-amber-400"
              />
            </td>
            <td className="p-0 border-r border-slate-800 dark:border-slate-700 text-center">
              <EditableCell
                value={voltaje.va}
                onSave={(val) => updateField('voltaje.va', val)}
                placeholder="0"
                className="text-center font-mono"
              />
            </td>
            {/* Acometida (spans 3 rows) */}
            <td rowSpan={3} className="p-0 text-center align-middle font-medium bg-slate-50/50 dark:bg-slate-900/30">
              <EditableCell
                value={acometida}
                onSave={(val) => updateField('acometida', val)}
                placeholder="3X 3/0..."
                className="text-center font-mono text-blue-600 dark:text-blue-400"
              />
            </td>
          </tr>

          {/* Fila 7 (IB) */}
          <tr className="border-b border-slate-800 dark:border-slate-700">
            <td className="text-center bg-slate-50 dark:bg-slate-800/30 border-r border-slate-800 dark:border-slate-700 font-bold font-mono">IB</td>
            <td className="p-0 border-r border-slate-800 dark:border-slate-700 text-center">
              <EditableCell
                value={barrasPrincipales.ib}
                onSave={(val) => updateField('barrasPrincipales.ib', val)}
                placeholder="0"
                className="text-center font-mono"
              />
            </td>
            <td className="p-0 border-r border-slate-800 dark:border-slate-700 text-center">
              <EditableCell
                value={voltaje.vb}
                onSave={(val) => updateField('voltaje.vb', val)}
                placeholder="0"
                className="text-center font-mono"
              />
            </td>
          </tr>

          {/* Fila 8 (IC) */}
          <tr>
            <td className="text-center bg-slate-50 dark:bg-slate-800/30 border-r border-slate-800 dark:border-slate-700 font-bold font-mono">IC</td>
            <td className="p-0 border-r border-slate-800 dark:border-slate-700 text-center">
              <EditableCell
                value={barrasPrincipales.ic}
                onSave={(val) => updateField('barrasPrincipales.ic', val)}
                placeholder="0"
                className="text-center font-mono"
              />
            </td>
            <td className="p-0 border-r border-slate-800 dark:border-slate-700 text-center">
              <EditableCell
                value={voltaje.vc}
                onSave={(val) => updateField('voltaje.vc', val)}
                placeholder="0"
                className="text-center font-mono"
              />
            </td>
          </tr>
        </tbody>
      </table>

      {/* 2. GRID DE CIRCUITOS (SIMETRÍA COMPLETA) */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse border-2 border-slate-800 dark:border-slate-700 border-t-0 text-[11px] table-fixed min-w-[900px]">
          <thead>
            {/* Encabezado Nivel 1 */}
            <tr className="border-b border-slate-800 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-center font-bold text-xs">
              <th rowSpan={2} className="border-r border-slate-800 dark:border-slate-700 p-2 w-[22%]">EQUIPO QUE ALIMENTA</th>
              <th colSpan={3} className="border-r border-slate-800 dark:border-slate-700 p-1">PROTECCIÓN (BREAKER)</th>
              <th rowSpan={2} className="border-r border-slate-800 dark:border-slate-700 p-2 w-[8%]">COND.</th>
              <th rowSpan={2} className="border-r border-2 border-slate-800 dark:border-slate-700 p-2 w-[4%] bg-amber-500/10 text-amber-600 dark:text-amber-400 font-mono font-bold text-center">#</th>
              <th rowSpan={2} className="border-r border-slate-800 dark:border-slate-700 p-2 w-[4%] bg-amber-500/10 text-amber-600 dark:text-amber-400 font-mono font-bold text-center">#</th>
              <th rowSpan={2} className="border-r border-slate-800 dark:border-slate-700 p-2 w-[8%]">COND.</th>
              <th colSpan={3} className="border-r border-slate-800 dark:border-slate-700 p-1">PROTECCIÓN (BREAKER)</th>
              <th rowSpan={2} className="p-2 w-[22%]">EQUIPO QUE ALIMENTA</th>
            </tr>
            {/* Encabezado Nivel 2 */}
            <tr className="border-b border-2 border-slate-800 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-center font-bold text-[9px] uppercase tracking-wider">
              {/* Left Breaker subheaders */}
              <th className="border-r border-slate-800 dark:border-slate-700 p-1 w-[8%]">MARCA</th>
              <th className="border-r border-slate-800 dark:border-slate-700 p-1 w-[7%]">TIPO</th>
              <th className="border-r border-slate-800 dark:border-slate-700 p-1 w-[6%]">AMP.</th>
              {/* Right Breaker subheaders (AMP., TIPO, MARCA for symmetry) */}
              <th className="border-r border-slate-800 dark:border-slate-700 p-1 w-[6%]">AMP.</th>
              <th className="border-r border-slate-800 dark:border-slate-700 p-1 w-[7%]">TIPO</th>
              <th className="border-r border-slate-800 dark:border-slate-700 p-1 w-[8%]">MARCA</th>
            </tr>
          </thead>
          <tbody>
            {oddPoles.map((oddPole, rowIndex) => {
              const evenPole = oddPole + 1;

              // Find circuit representing the current left (odd) and right (even) poles
              const cLeft = findCircuitByPole(oddPole);
              const cRight = findCircuitByPole(evenPole);

              // Determine if this is the first pole of a multi-pole group to apply rowSpan
              const isFirstLeft = cLeft && Math.min(...cLeft.poles) === oddPole;
              const isFirstRight = cRight && Math.min(...cRight.poles) === evenPole;

              // Calculate rowSpan counts
              const rowSpanLeft = cLeft ? cLeft.poles.length : 1;
              const rowSpanRight = cRight ? cRight.poles.length : 1;

              return (
                <tr
                  key={rowIndex}
                  className="border-b border-slate-800 dark:border-slate-700 hover:bg-slate-50/20 dark:hover:bg-slate-800/10 min-h-[32px]"
                >
                  {/* === LADO IZQUIERDO (IMPAR) === */}
                  {isFirstLeft && (
                    <>
                      {/* Equipo que Alimenta */}
                      <td
                        rowSpan={rowSpanLeft}
                        className="border-r border-slate-800 dark:border-slate-700 p-1.5 font-medium align-middle cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors relative group/cell"
                        onClick={() => setEditingCircuit(cLeft)}
                      >
                        <div className="flex flex-col justify-center min-h-[2rem] pr-6">
                          <div className="flex items-center justify-between">
                            <span className={`text-xs ${
                              !cLeft.equipo || cLeft.equipo === 'RESERVA' 
                                ? 'text-slate-400 dark:text-slate-600 italic' 
                                : 'text-slate-900 dark:text-slate-100 font-bold'
                            }`}>
                              {cLeft.equipo || 'RESERVA'}
                            </span>
                            {cLeft.fotografia && (
                              <Image className="w-3.5 h-3.5 text-amber-500 shrink-0 ml-1" />
                            )}
                          </div>
                          
                          {/* Badges based on tipoDestino */}
                          {cLeft.tipoDestino === 'ARTEFACTO' && (
                            <span className="inline-flex items-center w-max px-1 py-0.5 rounded text-[8px] font-bold bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 mt-1">
                              🔌 ARTEFACTO
                            </span>
                          )}
                          {cLeft.tipoDestino === 'SUB_TABLERO' && (
                            <span className="inline-flex items-center w-max px-1 py-0.5 rounded text-[8px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 mt-1">
                              ⚡ SUB-TABLERO
                            </span>
                          )}
                          {cLeft.tipoDestino === 'SUB_TABLERO_PENDIENTE' && (
                            <span className="inline-flex items-center w-max px-1 py-0.5 rounded text-[8px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 mt-1">
                              ⚠️ POR CREAR
                            </span>
                          )}
                        </div>
                        {rowSpanLeft > 1 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              splitCircuit(cLeft.id);
                            }}
                            title="Separar Polos"
                            className="no-print absolute right-1 top-1/2 -translate-y-1/2 p-0.5 opacity-0 group-hover/cell:opacity-100 bg-red-500 hover:bg-red-600 text-white rounded cursor-pointer shadow-sm transition-opacity z-10"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                        )}
                      </td>

                      {/* Breaker Marca */}
                      <td
                        rowSpan={rowSpanLeft}
                        className="border-r border-slate-800 dark:border-slate-700 p-0 text-center align-middle"
                      >
                        <EditableCell
                          value={cLeft.breaker.marca}
                          onSave={(val) => updateCircuit(cLeft.id, 'breaker.marca', val)}
                          type="select"
                          options={MARCA_OPTIONS}
                          placeholder=""
                          className="text-center font-bold font-sans"
                        />
                      </td>

                      {/* Breaker Tipo */}
                      <td
                        rowSpan={rowSpanLeft}
                        className="border-r border-slate-800 dark:border-slate-700 p-0 text-center align-middle"
                      >
                        <EditableCell
                          value={cLeft.breaker.tipo}
                          onSave={(val) => updateCircuit(cLeft.id, 'breaker.tipo', val)}
                          type="select"
                          options={TIPO_OPTIONS}
                          placeholder=""
                          className="text-center"
                        />
                      </td>

                      {/* Breaker Amp */}
                      <td
                        rowSpan={rowSpanLeft}
                        className="border-r border-slate-800 dark:border-slate-700 p-0 text-center align-middle font-bold"
                      >
                        <EditableCell
                          value={cLeft.breaker.amp}
                          onSave={(val) => updateCircuit(cLeft.id, 'breaker.amp', val)}
                          type="select"
                          options={AMP_OPTIONS}
                          placeholder=""
                          className="text-center font-mono text-amber-600 dark:text-amber-400"
                        />
                      </td>

                      {/* Conductor calibre */}
                      <td
                        rowSpan={rowSpanLeft}
                        className="border-r border-slate-800 dark:border-slate-700 p-0 text-center align-middle font-medium"
                      >
                        <EditableCell
                          value={cLeft.conductor}
                          onSave={(val) => updateCircuit(cLeft.id, 'conductor', val)}
                          type="select"
                          options={COND_OPTIONS}
                          placeholder=""
                          className="text-center font-mono text-slate-700 dark:text-slate-300"
                        />
                      </td>
                    </>
                  )}

                  {/* Número de Polo Impar */}
                  <td className="border-r-2 border-slate-800 dark:border-slate-700 p-1 text-center font-mono font-bold bg-amber-500/10 dark:bg-amber-500/5 text-amber-700 dark:text-amber-400 select-none align-middle relative group/pole">
                    <div className="flex flex-col items-center justify-center min-h-[1.75rem]">
                      <span>{oddPole}</span>
                      {/* Interactive Group Control */}
                      {oddPole < maxPoles - 1 && isFirstLeft && rowSpanLeft === 1 && (
                        <button
                          onClick={() => groupWithNext(cLeft.id, 'left')}
                          title="Agrupar con siguiente"
                          className="no-print absolute bottom-0 left-1/2 -translate-x-1/2 opacity-0 group-hover/pole:opacity-100 p-0.5 bg-amber-500 hover:bg-amber-600 text-white rounded-full cursor-pointer shadow transition-opacity"
                        >
                          <Plus className="w-2.5 h-2.5" />
                        </button>
                      )}
                    </div>
                  </td>

                  {/* === LADO DERECHO (PAR) === */}
                  {/* Número de Polo Par */}
                  <td className="border-r border-slate-800 dark:border-slate-700 p-1 text-center font-mono font-bold bg-amber-500/10 dark:bg-amber-500/5 text-amber-700 dark:text-amber-400 select-none align-middle relative group/pole-right">
                    <div className="flex flex-col items-center justify-center min-h-[1.75rem]">
                      <span>{evenPole}</span>
                      {/* Interactive Group Control */}
                      {evenPole < maxPoles && isFirstRight && rowSpanRight === 1 && (
                        <button
                          onClick={() => groupWithNext(cRight.id, 'right')}
                          title="Agrupar con siguiente"
                          className="no-print absolute bottom-0 left-1/2 -translate-x-1/2 opacity-0 group-hover/pole-right:opacity-100 p-0.5 bg-amber-500 hover:bg-amber-600 text-white rounded-full cursor-pointer shadow transition-opacity"
                        >
                          <Plus className="w-2.5 h-2.5" />
                        </button>
                      )}
                    </div>
                  </td>

                  {isFirstRight && (
                    <>
                      {/* Conductor calibre */}
                      <td
                        rowSpan={rowSpanRight}
                        className="border-r border-slate-800 dark:border-slate-700 p-0 text-center align-middle font-medium"
                      >
                        <EditableCell
                          value={cRight.conductor}
                          onSave={(val) => updateCircuit(cRight.id, 'conductor', val)}
                          type="select"
                          options={COND_OPTIONS}
                          placeholder=""
                          className="text-center font-mono text-slate-700 dark:text-slate-300"
                        />
                      </td>

                      {/* Breaker Amp */}
                      <td
                        rowSpan={rowSpanRight}
                        className="border-r border-slate-800 dark:border-slate-700 p-0 text-center align-middle font-bold"
                      >
                        <EditableCell
                          value={cRight.breaker.amp}
                          onSave={(val) => updateCircuit(cRight.id, 'breaker.amp', val)}
                          type="select"
                          options={AMP_OPTIONS}
                          placeholder=""
                          className="text-center font-mono text-amber-600 dark:text-amber-400"
                        />
                      </td>

                      {/* Breaker Tipo */}
                      <td
                        rowSpan={rowSpanRight}
                        className="border-r border-slate-800 dark:border-slate-700 p-0 text-center align-middle"
                      >
                        <EditableCell
                          value={cRight.breaker.tipo}
                          onSave={(val) => updateCircuit(cRight.id, 'breaker.tipo', val)}
                          type="select"
                          options={TIPO_OPTIONS}
                          placeholder=""
                          className="text-center"
                        />
                      </td>

                      {/* Breaker Marca */}
                      <td
                        rowSpan={rowSpanRight}
                        className="border-r border-slate-800 dark:border-slate-700 p-0 text-center align-middle"
                      >
                        <EditableCell
                          value={cRight.breaker.marca}
                          onSave={(val) => updateCircuit(cRight.id, 'breaker.marca', val)}
                          type="select"
                          options={MARCA_OPTIONS}
                          placeholder=""
                          className="text-center font-bold font-sans"
                        />
                      </td>

                      {/* Equipo que Alimenta */}
                      <td
                        rowSpan={rowSpanRight}
                        className="p-1.5 font-medium align-middle cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors relative group/cell"
                        onClick={() => setEditingCircuit(cRight)}
                      >
                        <div className="flex flex-col justify-center min-h-[2rem] pr-6">
                          <div className="flex items-center justify-between">
                            <span className={`text-xs ${
                              !cRight.equipo || cRight.equipo === 'RESERVA' 
                                ? 'text-slate-400 dark:text-slate-600 italic' 
                                : 'text-slate-900 dark:text-slate-100 font-bold'
                            }`}>
                              {cRight.equipo || 'RESERVA'}
                            </span>
                            {cRight.fotografia && (
                              <Image className="w-3.5 h-3.5 text-amber-500 shrink-0 ml-1" />
                            )}
                          </div>
                          
                          {/* Badges based on tipoDestino */}
                          {cRight.tipoDestino === 'ARTEFACTO' && (
                            <span className="inline-flex items-center w-max px-1 py-0.5 rounded text-[8px] font-bold bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 mt-1">
                              🔌 ARTEFACTO
                            </span>
                          )}
                          {cRight.tipoDestino === 'SUB_TABLERO' && (
                            <span className="inline-flex items-center w-max px-1 py-0.5 rounded text-[8px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 mt-1">
                              ⚡ SUB-TABLERO
                            </span>
                          )}
                          {cRight.tipoDestino === 'SUB_TABLERO_PENDIENTE' && (
                            <span className="inline-flex items-center w-max px-1 py-0.5 rounded text-[8px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 mt-1">
                              ⚠️ POR CREAR
                            </span>
                          )}
                        </div>
                        {rowSpanRight > 1 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              splitCircuit(cRight.id);
                            }}
                            title="Separar Polos"
                            className="no-print absolute right-1 top-1/2 -translate-y-1/2 p-0.5 opacity-0 group-hover/cell:opacity-100 bg-red-500 hover:bg-red-600 text-white rounded cursor-pointer shadow-sm transition-opacity z-10"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                        )}
                      </td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 3. SECCIÓN PIE DE PÁGINA */}
      <table className="w-full border-collapse border-2 border-slate-800 dark:border-slate-700 border-t-0 text-xs table-fixed mb-0">
        <tbody>
          {/* Neutro de llegada */}
          <tr className="border-b border-slate-800 dark:border-slate-700">
            <td className="w-[30%] p-2 font-bold bg-slate-50 dark:bg-slate-800/40 border-r border-slate-800 dark:border-slate-700 uppercase">
              Neutro de Llegada
            </td>
            <td className="w-[15%] p-0 border-r border-slate-800 dark:border-slate-700 text-center font-semibold uppercase">
              <div className="text-[10px] text-slate-500 font-bold bg-slate-100 dark:bg-slate-800 border-b border-slate-800 dark:border-slate-700 p-0.5">Calib Cond.</div>
              <EditableCell
                value={neutroLlegada.calibre}
                onSave={(val) => updateField('neutroLlegada.calibre', val)}
                type="select"
                options={COND_OPTIONS}
                placeholder="Calibre"
                className="text-center font-mono"
              />
            </td>
            <td className="w-[5%] border-r border-slate-800 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/50"></td>
            <td className="p-0">
              <EditableCell
                value={neutroLlegada.observaciones}
                onSave={(val) => updateField('neutroLlegada.observaciones', val)}
                placeholder="Observaciones de Neutro (ej: Color de cable, barra)..."
                className="px-3 text-slate-700 dark:text-slate-300 font-mono"
              />
            </td>
          </tr>

          {/* Puesta a tierra */}
          <tr className="border-b border-slate-800 dark:border-slate-700">
            <td className="p-2 font-bold bg-slate-50 dark:bg-slate-800/40 border-r border-slate-800 dark:border-slate-700 uppercase">
              Puesta a Tierra
            </td>
            <td className="p-0 border-r border-slate-800 dark:border-slate-700 text-center font-semibold uppercase">
              <div className="text-[10px] text-slate-500 font-bold bg-slate-100 dark:bg-slate-800 border-b border-slate-800 dark:border-slate-700 p-0.5">Calib Cond.</div>
              <EditableCell
                value={puestaTierra.calibre}
                onSave={(val) => updateField('puestaTierra.calibre', val)}
                type="select"
                options={COND_OPTIONS}
                placeholder="Calibre"
                className="text-center font-mono"
              />
            </td>
            <td className="border-r border-slate-800 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/50"></td>
            <td className="p-0">
              <EditableCell
                value={puestaTierra.observaciones}
                onSave={(val) => updateField('puestaTierra.observaciones', val)}
                placeholder="Observaciones de Puesta a Tierra (ej: Malla, malla del edificio)..."
                className="px-3 text-slate-700 dark:text-slate-300 font-mono"
              />
            </td>
          </tr>

          {/* Observaciones generales */}
          <tr>
            <td colSpan={4} className="p-0 align-top">
              <div className="bg-slate-100 dark:bg-slate-800 px-3 py-1 font-bold border-b border-slate-800 dark:border-slate-700 uppercase tracking-wide text-[10px] text-slate-600 dark:text-slate-400">
                Observaciones Generales
              </div>
              <EditableCell
                value={observacionesGenerales}
                onSave={(val) => updateField('observacionesGenerales', val)}
                type="textarea"
                placeholder="Describa el estado general del tablero, hallazgos, reparaciones pendientes o recomendaciones..."
                className="px-3 py-2 text-slate-800 dark:text-slate-200 min-h-[4rem] font-sans"
              />
            </td>
          </tr>
        </tbody>
      </table>

      {/* Lista de Elementos por Crear (segun Diagrama de Flujo: Crear Elemento) */}
      {elementosPorCrear.length > 0 && (
        <div className="mt-8 p-6 bg-slate-50 dark:bg-slate-800/20 border border-slate-200 dark:border-slate-800 rounded-2xl no-print shadow-sm">
          <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-3 flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-amber-500" /> Lista de Elementos por Crear ({elementosPorCrear.length})
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {elementosPorCrear.map((item, idx) => (
              <div 
                key={idx} 
                className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs flex items-center justify-between"
              >
                <div>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{item.nombre}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5 font-mono">Polo Circuito: {item.circuitoId.replace('auto_', '')}</p>
                </div>
                <span className="px-2 py-0.5 rounded text-[8px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                  PENDIENTE
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal interactivo de Edición Condicional de Circuitos */}
      <ModalEdicionCircuito
        isOpen={!!editingCircuit}
        onClose={() => setEditingCircuit(null)}
        circuitData={editingCircuit}
        onSave={saveCircuitFromModal}
        onAgregarPorCrear={(item) => {
          setElementosPorCrear((prev) => [...prev, item]);
        }}
      />

      {/* Botón flotante para exportar a Excel (no-print) */}
      <div className="fixed bottom-6 right-6 z-40 no-print flex flex-col gap-3">
        <button
          onClick={() => exportTableroToExcel(tableroData)}
          className="flex items-center justify-center w-14 h-14 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white rounded-full shadow-2xl transition-all cursor-pointer group hover:rotate-6"
          title="Exportar a Excel (.xlsx)"
        >
          <span className="text-xl font-bold group-hover:scale-110 transition-transform">📊</span>
        </button>
      </div>

    </div>
  );
};
export default TableroComponent;
