import React, { useState, useEffect } from 'react';
import EditableCell from './EditableCell';
import { Plus, Minus, Grid, Columns, Settings, RefreshCw, Zap, Image, ClipboardList, Camera, X, Printer } from 'lucide-react';

// Componente para renderizar Blobs de forma segura evitando fugas de memoria
const SafeImage = ({ blob, src, alt, className }) => {
  const [objectUrl, setObjectUrl] = useState(null);

  useEffect(() => {
    if (blob) {
      const url = URL.createObjectURL(blob);
      setObjectUrl(url);
      return () => {
        URL.revokeObjectURL(url);
      };
    } else {
      setObjectUrl(null);
    }
  }, [blob]);

  const finalSrc = objectUrl || src;
  if (!finalSrc) return null;

  return <img src={finalSrc} alt={alt} className={className} />;
};
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
    foto,
    fotoBlob,
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

  // Group poles for circuits rendering in print
  const printRows = React.useMemo(() => {
    const rows = [];
    for (let i = 0; i < Math.ceil(maxPoles / 2); i++) {
      const oddPole = 2 * i + 1;
      const evenPole = 2 * i + 2;
      const cLeft = normalizedCircuits.find(c => c.poles.includes(oddPole));
      const cRight = normalizedCircuits.find(c => c.poles.includes(evenPole));
      rows.push({ oddPole, evenPole, cLeft, cRight });
    }
    return rows;
  }, [normalizedCircuits, maxPoles]);

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
      
      {/* VISTA DE EDICIÓN EN PANTALLA (OCULTA EN IMPRESIÓN) */}
      <div className="screen-only">
        {/* Grilla Superior Dividida: Tabla a la Izquierda, Foto a la Derecha */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
        
        {/* Lado Izquierdo (3/4 de ancho): Tabla General */}
        <div className="md:col-span-3">
          <table className="w-full border-collapse border-2 border-slate-800 dark:border-slate-700 text-xs table-fixed mb-0">
        <tbody>
          {/* Fila 1: Título General */}
          <tr className="border-b border-slate-800 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/80">
            <td colSpan={7} className="p-0 font-bold text-sm tracking-wide">
              <div className="flex flex-row items-center justify-between gap-4 py-2 px-4 uppercase font-bold text-slate-800 dark:text-slate-200 w-full">
                <div className="flex items-center gap-1.5 min-w-0">
                  <Zap className="w-4 h-4 text-amber-500 fill-amber-500/20 shrink-0" />
                  <span className="shrink-0">Información General de Tablero No.</span>
                </div>
                <div className="flex flex-row items-center gap-2 font-mono truncate text-ellipsis overflow-hidden whitespace-nowrap max-w-[180px] sm:max-w-xs md:max-w-md" title={id}>
                  <EditableCell
                    value={id}
                    onSave={(val) => updateField('id', val)}
                    placeholder="No."
                    className="text-center font-bold text-slate-900 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 truncate overflow-hidden text-ellipsis whitespace-nowrap"
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
    </div>

    {/* Lado Derecho (1/4 de ancho): Foto de Inspección */}
    <div className="md:col-span-1 border-2 border-slate-800 dark:border-slate-700 bg-slate-950/40 rounded-lg p-3 flex flex-col justify-between h-full min-h-[220px]">
      <div>
        <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
          <Camera className="w-3.5 h-3.5 text-amber-500" />
          <span>Foto de Inspección</span>
        </div>
        
        {fotoBlob || foto ? (
          <div className="relative rounded overflow-hidden border border-slate-800 bg-slate-900 aspect-video flex items-center justify-center group shadow">
            <SafeImage blob={fotoBlob} src={foto} alt="Inspección del tablero" className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => {
                onUpdateTablero({
                  ...tableroData,
                  fotoBlob: null,
                  foto: null
                });
              }}
              className="no-print absolute top-1 right-1 p-1 bg-red-600 hover:bg-red-500 text-white rounded cursor-pointer transition-colors shadow"
              title="Eliminar foto"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-slate-800 border-dashed rounded cursor-pointer bg-slate-900/30 hover:bg-slate-900/50 hover:border-slate-700 transition-all select-none">
              <div className="flex flex-col items-center justify-center p-4 text-center">
                <Camera className="w-7 h-7 text-slate-500 mb-1" />
                <span className="text-[10px] font-bold text-slate-400">Tomar Foto</span>
                <span className="text-[9px] text-slate-500">o subir archivo</span>
              </div>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(e) => {
                  const file = e.target.files[0];
                  if (!file) return;
                  
                  if (file.size > 2 * 1024 * 1024) {
                    alert("La imagen es demasiado grande. Máximo 2MB.");
                    return;
                  }
                  
                  onUpdateTablero({
                    ...tableroData,
                    fotoBlob: file,
                    foto: null
                  });
                }}
                className="hidden"
              />
            </label>
          </div>
        )}
      </div>
      
      <div className="text-[9px] text-slate-500 mt-2 leading-relaxed border-t border-slate-900 pt-2 no-print">
        Sube o captura la foto del cableado/gabinete para documentar el tablero.
      </div>
    </div>

  </div>

      {/* 2. GRID DE CIRCUITOS (SIMETRÍA COMPLETA) */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse border-2 border-slate-800 dark:border-slate-700 border-t-0 text-[10px] md:text-[11px] table-fixed min-w-[750px]">
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

      {/* Botones flotantes para exportar a Excel y PDF (no-print) */}
      <div className="fixed bottom-6 right-6 z-40 no-print flex flex-col gap-3">
        <button
          onClick={() => window.print()}
          className="flex items-center justify-center w-14 h-14 bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 rounded-full shadow-2xl transition-all cursor-pointer group hover:rotate-6"
          title="Imprimir / Guardar PDF"
        >
          <Printer className="w-6 h-6 group-hover:scale-110 transition-transform" />
        </button>
        <button
          onClick={() => exportTableroToExcel(tableroData)}
          className="flex items-center justify-center w-14 h-14 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white rounded-full shadow-2xl transition-all cursor-pointer group hover:rotate-6"
          title="Exportar a Excel (.xlsx)"
        >
          <span className="text-xl font-bold group-hover:scale-110 transition-transform">📊</span>
        </button>
      </div>
      
      </div> {/* Fin de screen-only */}

      {/* VISTA DE IMPRESIÓN PROFESIONAL (OCULTA EN PANTALLA, ACTIVA EN IMPRESIÓN) */}
      <div className="print-only print-only-container w-full max-w-[800px] mx-auto bg-white text-slate-900 p-0 font-sans">
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            body {
              background-color: #ffffff !important;
              color: #000000 !important;
            }
            .print-only-container {
              color: #1e293b !important;
              font-size: 10px !important;
              line-height: 1.4 !important;
            }
            .print-header-card {
              background: #0f172a !important;
              background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%) !important;
              color: #ffffff !important;
              border-radius: 8px;
              padding: 16px 20px;
              margin-bottom: 15px;
              print-color-adjust: exact;
              -webkit-print-color-adjust: exact;
            }
            .print-header-title {
              font-size: 16px !important;
              font-weight: 800 !important;
              letter-spacing: 0.5px;
              margin: 0;
              text-transform: uppercase;
              color: #ffffff !important;
            }
            .print-header-subtitle {
              font-size: 10px !important;
              color: #94a3b8 !important;
              margin-top: 3px;
              text-transform: uppercase;
              font-weight: bold;
            }
            .print-id-label {
              font-size: 8px !important;
              color: #94a3b8 !important;
              text-transform: uppercase;
              font-weight: bold;
              margin-bottom: 3px;
            }
            .print-id-badge {
              background-color: #2563eb !important;
              color: #ffffff !important;
              font-family: monospace;
              font-size: 11px !important;
              font-weight: bold;
              padding: 4px 10px;
              border-radius: 4px;
              letter-spacing: 0.5px;
              border: 1px solid rgba(255, 255, 255, 0.1);
              display: inline-block;
              print-color-adjust: exact;
              -webkit-print-color-adjust: exact;
            }
            .print-section-title {
              border-left: 4px solid #2563eb !important;
              padding-left: 8px;
              margin-top: 16px;
              margin-bottom: 8px;
              color: #0f172a !important;
              font-size: 11px !important;
              font-weight: 800 !important;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              print-color-adjust: exact;
              -webkit-print-color-adjust: exact;
            }
            .print-card {
              background-color: #ffffff !important;
              border: 1px solid #e2e8f0 !important;
              border-radius: 6px;
              padding: 10px 14px;
              margin-bottom: 10px;
            }
            .print-info-grid {
              width: 100%;
              border-collapse: collapse;
            }
            .print-info-grid td {
              padding: 5px 8px;
              vertical-align: middle;
              border: none !important;
            }
            .print-info-label {
              font-weight: bold !important;
              color: #475569 !important;
              width: 15%;
              text-transform: uppercase;
              font-size: 9px !important;
            }
            .print-info-value {
              color: #0f172a !important;
              width: 35%;
              font-weight: 500;
            }
            .print-checkbox-box {
              display: inline-block;
              width: 12px;
              height: 12px;
              border: 1.5px solid #2563eb !important;
              border-radius: 2px;
              margin-right: 5px;
              vertical-align: middle;
              position: relative;
              background-color: #ffffff;
              box-sizing: border-box;
              print-color-adjust: exact;
              -webkit-print-color-adjust: exact;
            }
            .print-checkbox-box.checked {
              background-color: #2563eb !important;
            }
            .print-checkbox-box.checked::after {
              content: "" !important;
              position: absolute;
              left: 3px;
              top: 0px;
              width: 3px;
              height: 6px;
              border: solid white !important;
              border-width: 0 1.5px 1.5px 0 !important;
              transform: rotate(45deg);
              print-color-adjust: exact;
              -webkit-print-color-adjust: exact;
            }
            .print-status-badge {
              background-color: #dcfce7 !important;
              color: #15803d !important;
              font-size: 8px !important;
              font-weight: bold !important;
              padding: 2px 8px;
              border-radius: 12px;
              text-transform: uppercase;
              print-color-adjust: exact;
              -webkit-print-color-adjust: exact;
            }
            .print-data-table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 2px;
            }
            .print-data-table th {
              background-color: #f1f5f9 !important;
              color: #475569 !important;
              font-weight: bold !important;
              text-align: left;
              padding: 5px 8px;
              font-size: 8.5px !important;
              text-transform: uppercase;
              border-bottom: 2px solid #cbd5e1 !important;
              print-color-adjust: exact;
              -webkit-print-color-adjust: exact;
            }
            .print-data-table td {
              padding: 6px 8px;
              border-bottom: 1px solid #e2e8f0 !important;
              color: #1e293b !important;
            }
            .print-data-table tbody tr:nth-child(even) {
              background-color: #f8fafc !important;
              print-color-adjust: exact;
              -webkit-print-color-adjust: exact;
            }
            .print-circuits-table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 2px;
            }
            .print-circuits-table th {
              background-color: #0f172a !important;
              color: #ffffff !important;
              font-weight: 800 !important;
              padding: 5px 6px;
              font-size: 8px !important;
              text-transform: uppercase;
              text-align: center;
              border: 1px solid #1e293b !important;
              print-color-adjust: exact;
              -webkit-print-color-adjust: exact;
            }
            .print-circuits-table td {
              padding: 4px 6px;
              border: 1px solid #e2e8f0 !important;
              font-size: 9px !important;
            }
            .print-circuits-table tbody tr:nth-child(even) {
              background-color: #f8fafc !important;
              print-color-adjust: exact;
              -webkit-print-color-adjust: exact;
            }
            .print-circuits-table td.num-col {
              background-color: #f1f5f9 !important;
              color: #0f172a !important;
              font-weight: 800 !important;
              text-align: center;
              width: 3%;
              border-left: 1.5px solid #cbd5e1 !important;
              border-right: 1.5px solid #cbd5e1 !important;
              font-size: 9px !important;
              print-color-adjust: exact;
              -webkit-print-color-adjust: exact;
            }
            .print-circuits-table td.reserva {
              color: #94a3b8 !important;
              font-style: italic;
            }
            .print-comments-box {
              border: 1px solid #e2e8f0 !important;
              border-radius: 6px;
              background-color: #ffffff !important;
              padding: 10px 14px;
              min-height: 40px;
              font-size: 9.5px !important;
              color: #334155 !important;
              line-height: 1.5;
            }
            .print-footer-table {
              margin-top: 25px;
              width: 100%;
              border-collapse: collapse;
            }
            .print-footer-table td {
              border: none !important;
              width: 33.33%;
              text-align: center;
              padding: 0 15px;
              vertical-align: bottom;
              background: transparent !important;
            }
            .print-signature-line {
              border-top: 1px solid #94a3b8 !important;
              margin-top: 35px;
              padding-top: 4px;
              font-size: 8.5px !important;
              color: #475569 !important;
              text-transform: uppercase;
              font-weight: bold;
            }
            .print-footer-value {
              font-size: 9px !important;
              color: #0f172a !important;
              font-weight: bold;
              margin-bottom: 2px;
            }
          }
        ` }} />

        {/* CABECERA PRINCIPAL */}
        <div className="print-header-card">
          <table className="w-full border-collapse border-none">
            <tbody>
              <tr className="border-none">
                <td className="border-none text-left p-0 bg-transparent text-white">
                  <h1 className="print-header-title">Reporte de Inspección Técnica</h1>
                  <div className="print-header-subtitle">Sistemas Eléctricos y Tableros de Distribución</div>
                </td>
                <td style={{ width: '40%' }} className="border-none text-right p-0 bg-transparent text-white">
                  <div className="text-right">
                    <div className="print-id-label">Código de Identificación</div>
                    <div className="print-id-badge">{id}</div>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* SECCIÓN 1: INFORMACIÓN GENERAL */}
        <div className="print-section-title">1. Información General del Tablero</div>
        <div className="print-card">
          <table className="print-info-grid">
            <tbody>
              <tr className="border-none">
                <td className="print-info-label">Ubicación:</td>
                <td className="print-info-value">{ubicacion || 'No especificada'}</td>
                <td className="print-info-label">Tipo de Montaje:</td>
                <td className="print-info-value">
                  <div className="checkbox-container">
                    <span className={`print-checkbox-box ${tipo === 'superficial' ? 'checked' : ''}`}></span>
                    <span className="checkbox-text">Superficial</span>
                  </div>
                  <div className="checkbox-container">
                    <span className={`print-checkbox-box ${tipo === 'empotrado' ? 'checked' : ''}`}></span>
                    <span className="checkbox-text">Empotrado</span>
                  </div>
                </td>
              </tr>
              <tr className="border-none">
                <td className="print-info-label">Alimentado por:</td>
                <td className="print-info-value">{alimentadoPor || 'No especificado'}</td>
                <td className="print-info-label">Estado de Sincro:</td>
                <td className="print-info-value">
                  <span className="print-status-badge">Sincronizado con Servidor</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* SECCIÓN 2: BARRAS PRINCIPALES Y BREAKER PRINCIPAL */}
        <div className="print-section-title">2. Barras Principales y Breaker Principal</div>
        <div className="print-card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="print-data-table">
            <thead>
              <tr>
                <th style={{ width: '15%' }}>Fase</th>
                <th style={{ width: '15%' }}>Voltaje (V)</th>
                <th style={{ width: '15%' }}>Amperaje (A)</th>
                <th style={{ width: '20%' }}>Marca Breaker</th>
                <th style={{ width: '15%' }}>Tipo</th>
                <th style={{ width: '20%' }}>Calibre / Acometida</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-none">
                <td><strong>Fase A (IA)</strong></td>
                <td>{voltaje?.va ? `${voltaje.va} V` : '0 V'}</td>
                <td>{barrasPrincipales?.ia ? `${barrasPrincipales.ia} A` : '0 A'}</td>
                <td rowSpan={3} style={{ verticalAlign: 'middle', textAlign: 'left', borderRight: '1px solid #e2e8f0' }} className="border-r border-slate-200">
                  {breakerPrincipal?.marca || 'N/A'}
                </td>
                <td rowSpan={3} style={{ verticalAlign: 'middle', textAlign: 'left', borderRight: '1px solid #e2e8f0' }} className="border-r border-slate-200">
                  {breakerPrincipal?.tipo || 'N/A'}
                </td>
                <td rowSpan={3} style={{ verticalAlign: 'middle', textAlign: 'left' }}>
                  {acometida || 'N/A'}
                </td>
              </tr>
              <tr className="border-none">
                <td><strong>Fase B (IB)</strong></td>
                <td>{voltaje?.vb ? `${voltaje.vb} V` : '0 V'}</td>
                <td>{barrasPrincipales?.ib ? `${barrasPrincipales.ib} A` : '0 A'}</td>
              </tr>
              <tr className="border-none">
                <td><strong>Fase C (IC)</strong></td>
                <td>{voltaje?.vc ? `${voltaje.vc} V` : '0 V'}</td>
                <td>{barrasPrincipales?.ic ? `${barrasPrincipales.ic} A` : '0 A'}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* SECCIÓN 3: DIRECTORIO DE CIRCUITOS Y PROTECCIONES */}
        <div className="print-section-title">3. Directorio de Circuitos y Protecciones (Breakers)</div>
        <div className="print-card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="print-circuits-table">
            <thead>
              <tr>
                <th className="left-align" style={{ width: '32%', textAlign: 'left' }}>Equipo Alimentado</th>
                <th style={{ width: '10%' }}>Marca/Tipo</th>
                <th style={{ width: '6%' }}>Amp</th>
                <th style={{ width: '4%' }}>#</th>
                <th style={{ width: '4%' }}>#</th>
                <th style={{ width: '6%' }}>Amp</th>
                <th style={{ width: '10%' }}>Marca/Tipo</th>
                <th className="right-align" style={{ width: '32%', textAlign: 'right' }}>Equipo Alimentado</th>
              </tr>
            </thead>
            <tbody>
              {printRows.map((row, idx) => {
                const { oddPole, evenPole, cLeft, cRight } = row;
                
                // Helper to check if a pole is the start of a multi-pole circuit
                const isFirstLeft = cLeft && Math.min(...cLeft.poles) === oddPole;
                const isFirstRight = cRight && Math.min(...cRight.poles) === evenPole;
                
                const rowSpanLeft = cLeft ? cLeft.poles.length : 1;
                const rowSpanRight = cRight ? cRight.poles.length : 1;

                return (
                  <tr key={idx} className="border-none">
                    {/* Polo Impar (Izquierda) */}
                    {isFirstLeft ? (
                      <>
                        <td 
                          rowSpan={rowSpanLeft}
                          className={!cLeft.equipo || cLeft.equipo === 'RESERVA' ? 'print-circuits-td reserva text-left' : 'print-circuits-td font-bold text-slate-800 text-left'}
                        >
                          {cLeft.equipo || 'RESERVA'}
                        </td>
                        <td rowSpan={rowSpanLeft} style={{ textAlign: 'center' }} className="print-circuits-td">
                          {cLeft.breaker?.marca || cLeft.breaker?.tipo ? `${cLeft.breaker.marca || ''} ${cLeft.breaker.tipo || ''}`.trim() : '-'}
                        </td>
                        <td rowSpan={rowSpanLeft} style={{ textAlign: 'center' }} className="print-circuits-td">
                          {cLeft.breaker?.amp || '-'}
                        </td>
                      </>
                    ) : !cLeft ? (
                      <>
                        <td className="print-circuits-td reserva text-left">RESERVA</td>
                        <td style={{ textAlign: 'center' }} className="print-circuits-td">-</td>
                        <td style={{ textAlign: 'center' }} className="print-circuits-td">-</td>
                      </>
                    ) : null}

                    {/* Números de Polo (Centro) */}
                    <td className="num-col">{oddPole}</td>
                    <td className="num-col">{evenPole}</td>

                    {/* Polo Par (Derecha) */}
                    {isFirstRight ? (
                      <>
                        <td rowSpan={rowSpanRight} style={{ textAlign: 'center' }} className="print-circuits-td">
                          {cRight.breaker?.amp || '-'}
                        </td>
                        <td rowSpan={rowSpanRight} style={{ textAlign: 'center' }} className="print-circuits-td">
                          {cRight.breaker?.marca || cRight.breaker?.tipo ? `${cRight.breaker.marca || ''} ${cRight.breaker.tipo || ''}`.trim() : '-'}
                        </td>
                        <td 
                          rowSpan={rowSpanRight} 
                          style={{ textAlign: 'right' }}
                          className={!cRight.equipo || cRight.equipo === 'RESERVA' ? 'print-circuits-td reserva text-right' : 'print-circuits-td font-bold text-slate-800 text-right'}
                        >
                          {cRight.equipo || 'RESERVA'}
                        </td>
                      </>
                    ) : !cRight ? (
                      <>
                        <td style={{ textAlign: 'center' }} className="print-circuits-td">-</td>
                        <td style={{ textAlign: 'center' }} className="print-circuits-td">-</td>
                        <td className="print-circuits-td reserva text-right">RESERVA</td>
                      </>
                    ) : null}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* SECCIÓN 4: NEUTRO DE LLEGADA Y PUESTA A TIERRA */}
        <div className="print-section-title">4. Neutro de Llegada y Puesta a Tierra</div>
        <div className="print-card">
          <table className="print-info-grid">
            <tbody>
              <tr className="border-none">
                <td className="print-info-label" style={{ width: '15%' }}>Neutro de Llegada:</td>
                <td className="print-info-value" style={{ width: '35%' }}>Calibre {neutroLlegada?.calibre || 'N/A'}</td>
                <td className="print-info-label" style={{ width: '15%' }}>Puesta a Tierra:</td>
                <td className="print-info-value" style={{ width: '35%' }}>Calibre {puestaTierra?.calibre || 'N/A'}</td>
              </tr>
              <tr className="border-none">
                <td className="print-info-label" style={{ textTransform: 'capitalize', color: '#64748b' }}>Obs. Neutro:</td>
                <td className="print-info-value" style={{ fontSize: '9px', color: '#475569' }}>
                  {neutroLlegada?.observaciones || 'Sin observaciones.'}
                </td>
                <td className="print-info-label" style={{ textTransform: 'capitalize', color: '#64748b' }}>Obs. Tierra:</td>
                <td className="print-info-value" style={{ fontSize: '9px', color: '#475569' }}>
                  {puestaTierra?.observaciones || 'Sin observaciones.'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* SECCIÓN 5: OBSERVACIONES GENERALES Y RECOMENDACIONES */}
        <div className="print-section-title">5. Observaciones Generales y Recomendaciones</div>
        <div className="print-comments-box">
          {observacionesGenerales || 'El tablero presenta buen estado general de estructura y cableado.'}
        </div>

        {/* PIE DE FIRMA */}
        <table className="print-footer-table">
          <tbody>
            <tr className="border-none">
              <td className="border-none">
                <div className="print-footer-value">Ing. Héctor Pernalete</div>
                <div className="print-signature-line">Inspector Técnico</div>
              </td>
              <td className="border-none">
                <div className="print-footer-value">&nbsp;</div>
                <div className="print-signature-line">Firma / Sello</div>
              </td>
              <td className="border-none">
                <div className="print-footer-value">
                  {new Date().toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                </div>
                <div className="print-signature-line">Fecha</div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

    </div>
  );
};
export default TableroComponent;
