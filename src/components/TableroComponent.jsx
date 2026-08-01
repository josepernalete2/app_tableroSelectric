import React, { useState, useEffect } from 'react';
import EditableCell from './EditableCell';
import { Plus, Minus, Grid, Columns, Settings, RefreshCw, Zap, Image, ClipboardList, Camera, X, Printer } from 'lucide-react';
import useStore from '../store/useStore';

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


// Common options for dropdowns
const AMP_OPTIONS = ['N/A', '10', '15', '20', '30', '40', '50', '60', '70', '80', '90', '100', '125', '150', '175', '200', '225', '250', '300', '350', '400', '500'];
const COND_OPTIONS = ['N/A', '14', '12', '10', '8', '6', '4', '2', '1/0', '2/0', '3/0', '4/0', '250', '350', '500 MCM', '2X12', '4X12', '3X8 TW', '1X500', 'SOLIDO # 4'];
const MARCA_OPTIONS = ['GE', 'EATON', 'ABB', 'INESLA', 'MG', 'SQUARE D', 'SIEMENS', 'CUTLER-HAMMER', 'N/A'];
const TIPO_OPTIONS = ['TQ', 'TQD', 'M35', 'A2C', 'NS', 'TED32', 'M51', 'TM250', 'QO', 'THQL', 'N/A'];

export const TableroComponent = ({ tableroData, onUpdateTablero, readOnly }) => {
  const [editingCircuit, setEditingCircuit] = useState(null);
  const [elementosPorCrear, setElementosPorCrear] = useState([]);

  const { companies, updateTableroAlimentador } = useStore();

  const project = React.useMemo(() => {
    if (!tableroData?.id) return null;
    for (const c of companies) {
      if (c.proyectos) {
        for (const p of c.proyectos) {
          const tableros = p.elementosUnifilares || p.tableros || [];
          if (tableros.some(t => t.id === tableroData.id)) {
            return p;
          }
        }
      }
    }
    return null;
  }, [companies, tableroData?.id]);

  const alimentadores = project?.alimentadores || [];

  // Normalize circuits: ensure all poles from 1 to maxPoles are represented exactly once
  const maxPoles = tableroData?.maxPoles || 30;
  const circuits = tableroData?.circuits || [];

  const normalizedCircuits = React.useMemo(() => {
    if (!tableroData) return [];
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
  }, [circuits, maxPoles, tableroData]);



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
    neutroLlegada = {},
    puestaTierra = {},
    observacionesGenerales = "",
  } = tableroData;

  // Update specific fields of the main tablero structure
  const updateField = (path, value) => {
    if (readOnly) return;
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
    if (readOnly) return;
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
    if (readOnly) return;
    const newData = { ...tableroData };
    let currentCircuits = [...(tableroData.circuits || [])];

    if (updatedFields === null) {
      // Remove from custom circuits list so it falls back to auto-generated RESERVA
      currentCircuits = currentCircuits.filter(c => c.id !== circuitId && !c.id.startsWith('auto_'));
    } else {
      const isAuto = circuitId.startsWith('auto_');
      if (isAuto) {
        // Create new custom circuit
        currentCircuits.push({
          id: `circ_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          ...updatedFields
        });
      } else {
        // Update existing custom circuit
        currentCircuits = currentCircuits.map(c => {
          if (c.id === circuitId) {
            return { ...c, ...updatedFields };
          }
          return c;
        });
      }
    }

    // Filter out completely empty default circuits to prevent database bloat
    newData.circuits = currentCircuits.filter(c => {
      const hasBreaker = c.breaker && (c.breaker.marca || c.breaker.tipo || c.breaker.amp);
      const hasConductor = c.conductor && c.conductor !== 'N/A' && c.conductor !== 'N/D';
      const hasEquipo = c.equipo && c.equipo !== 'RESERVA' && c.equipo !== 'DISPONIBLE';
      return hasBreaker || hasConductor || hasEquipo || c.fotografia || c.tipoDestino;
    });

    onUpdateTablero(newData);
  };

  // Group a pole with the next pole on the same side (maximum 3 poles)
  const groupWithNext = (circuitId) => {
    if (readOnly) return;
    const circuit = normalizedCircuits.find(c => c.id === circuitId);
    if (!circuit) return;

    if (circuit.poles.length >= 3) {
      alert("El número máximo de polos agrupados es 3.");
      return;
    }

    const currentMaxPole = Math.max(...circuit.poles);
    const targetPole = currentMaxPole + 2; // Next pole on the same side
    if (targetPole > maxPoles) return;

    // Helper to determine if a circuit is actually occupied by customized data
    const isOccupiedByRealCircuit = (c) => {
      const hasBreaker = c.breaker && (c.breaker.marca || c.breaker.tipo || c.breaker.amp);
      const hasConductor = c.conductor && c.conductor !== 'N/A' && c.conductor !== 'N/D' && c.conductor !== '';
      const hasRealName = c.equipo && c.equipo !== 'RESERVA' && c.equipo !== 'DISPONIBLE' && !c.equipo.startsWith('RESERVA') && !c.equipo.startsWith('DISPONIBLE');
      return hasBreaker || hasConductor || hasRealName || c.fotografia || c.tipoDestino;
    };

    const targetOccupied = (tableroData.circuits || []).find(c => c.id !== circuitId && c.poles.includes(targetPole));
    if (targetOccupied && isOccupiedByRealCircuit(targetOccupied)) {
      alert(`El polo ${targetPole} ya está ocupado por el circuito "${targetOccupied.equipo}".`);
      return;
    }

    const newData = { ...tableroData };
    let existingCircuits = [...(tableroData.circuits || [])];
    
    // If the target pole was occupied by an empty custom circuit, filter it out to absorb it
    if (targetOccupied) {
      existingCircuits = existingCircuits.filter(c => c.id !== targetOccupied.id);
    }

    const targetCircuit = existingCircuits.find(c => c.id === circuitId);
    const newPoles = [...circuit.poles, targetPole].sort((a, b) => a - b);

    if (targetCircuit) {
      newData.circuits = existingCircuits.map(c => {
        if (c.id === circuitId) {
          return { ...c, poles: newPoles };
        }
        return c;
      });
    } else {
      newData.circuits = [
        ...existingCircuits,
        {
          id: `circ_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          side: circuit.side,
          poles: newPoles,
          equipo: 'RESERVA',
          breaker: { marca: '', tipo: '', amp: '' },
          conductor: '',
        }
      ];
    }

    onUpdateTablero(newData);
  };

  // Split a multi-pole circuit: simply deleting it restores individual single poles
  const splitCircuit = (circuitId) => {
    if (readOnly) return;
    const newData = { ...tableroData };
    newData.circuits = (tableroData.circuits || []).filter(c => c.id !== circuitId);
    onUpdateTablero(newData);
  };

  // Split rendering rows into left (odd) and right (even) poles
  const oddPoles = Array.from({ length: Math.ceil(maxPoles / 2) }, (_, i) => 2 * i + 1);
  
  // Find circuit by pole number
  const findCircuitByPole = (pole) => {
    return normalizedCircuits.find(c => c.poles.includes(pole));
  };

  return (
    <div className={`w-full text-slate-900 dark:text-slate-100 print-card font-sans select-text ${readOnly ? 'pointer-events-none opacity-90' : ''}`}>
      
      {/* VISTA DE EDICIÓN EN PANTALLA (OCULTA EN IMPRESIÓN) */}
      <div>
        {/* Grilla Superior Dividida: Tabla a la Izquierda, Foto a la Derecha */}
        <div className="grid grid-cols-1 lg:grid-cols-4 print:grid-cols-4 gap-4 mb-4">
        
        {/* Lado Izquierdo (3/4 de ancho): Tabla General */}
        <div className="lg:col-span-3 print:col-span-3">
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
            <td colSpan={6} className="p-2 font-medium">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div className="flex-1">
                  <EditableCell
                    value={alimentadoPor}
                    onSave={(val) => updateField('alimentadoPor', val)}
                    placeholder="Indique procedencia de la alimentación, interruptor y calibre..."
                    className="px-1"
                  />
                </div>
                {alimentadores.length > 0 && (
                  <div className="flex items-center gap-1.5 shrink-0 bg-slate-105 border border-slate-800/20 dark:bg-slate-900/40 dark:border-slate-750 px-2 py-1 rounded">
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold">Vincular Alimentador:</span>
                    <select
                      value={tableroData.datosTecnicos?.alimentadorId || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        const selectedAlim = alimentadores.find(a => a.id === val);
                        updateField('datosTecnicos.alimentadorId', val || null);
                        if (selectedAlim) {
                          updateField('alimentadoPor', `${selectedAlim.nombre} (${selectedAlim.capacidadAmperios ? selectedAlim.capacidadAmperios + 'A' : 'N/D'})`);
                        }
                        updateTableroAlimentador(project?.id, tableroData.id, val || null);
                      }}
                      className="bg-transparent text-slate-900 dark:text-slate-100 font-bold border-none text-[11px] focus:outline-none cursor-pointer"
                    >
                      <option value="" className="bg-slate-900 text-slate-100">-- Ninguno --</option>
                      {alimentadores.map(a => (
                        <option key={a.id} value={a.id} className="bg-slate-900 text-slate-100">
                          {a.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </td>
          </tr>

          {/* Fila Opcional: Capacidad, Fases y Tensión */}
          <tr className="border-b border-slate-800 dark:border-slate-700">
            <td className="w-24 p-2 bg-slate-50 dark:bg-slate-800/40 font-semibold border-r border-slate-800 dark:border-slate-700 uppercase">
              Parámetros Panel:
            </td>
            <td colSpan={6} className="p-2 font-medium">
              <div className="flex flex-wrap items-center gap-6 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold">Capacidad Gabinete:</span>
                  <select
                    value={maxPoles}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      const maxCircPosition = circuits.reduce((acc, c) => {
                        const maxVal = Math.max(...c.poles);
                        return maxVal > acc ? maxVal : acc;
                      }, 0);
                      if (val < maxCircPosition) {
                        alert(`No se puede reducir la capacidad a ${val} polos porque hay circuitos ocupando posiciones hasta el polo ${maxCircPosition}.`);
                        return;
                      }
                      updateField('maxPoles', val);
                    }}
                    className="bg-transparent text-slate-900 dark:text-slate-100 font-bold border-none text-[11px] focus:outline-none cursor-pointer"
                  >
                    {[12, 24, 30, 42, 48, 60, 72, 84, 96].map(opt => (
                      <option key={opt} value={opt} className="bg-slate-900 text-slate-100">{opt} Polos</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold">Fases:</span>
                  <select
                    value={tableroData.fases !== undefined ? tableroData.fases : 3}
                    onChange={(e) => updateField('fases', parseInt(e.target.value, 10))}
                    className="bg-transparent text-slate-900 dark:text-slate-100 font-bold border-none text-[11px] focus:outline-none cursor-pointer"
                  >
                    {[1, 2, 3].map(opt => (
                      <option key={opt} value={opt} className="bg-slate-900 text-slate-100">{opt} Fase(s)</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold">Tensión Nominal:</span>
                  <EditableCell
                    value={tableroData.tension || ''}
                    onSave={(val) => updateField('tension', val)}
                    placeholder="Ej: 208/120V"
                    className="font-bold inline-block w-24 px-1"
                  />
                </div>
              </div>
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
    <div 
      className="md:col-span-1 print:col-span-1 border-2 border-slate-800 dark:border-slate-700 bg-slate-950/40 rounded-lg p-3 flex flex-col justify-between h-full"
      style={{ minHeight: `${tableroData.fotoScale || 220}px` }}
    >
      <div>
        <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
          <Camera className="w-3.5 h-3.5 text-amber-500" />
          <span>Foto de Inspección</span>
        </div>
        
        {fotoBlob || foto ? (
          <div 
            className="relative rounded overflow-hidden border border-slate-800 bg-slate-900 flex items-center justify-center group shadow w-full"
            style={{ height: `${tableroData.fotoScale || 220}px` }}
          >
            <SafeImage 
              blob={fotoBlob} 
              src={foto} 
              alt="Inspección del tablero" 
              className="w-full h-full object-cover" 
              style={{ maxHeight: `${tableroData.fotoScale || 220}px` }}
            />
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

        {/* Slider de ajuste de tamaño (solo visible si hay foto y en pantalla) */}
        {(fotoBlob || foto) && (
          <div className="no-print mt-3 pt-3 border-t border-slate-850 space-y-1.5">
            <div className="flex justify-between items-center text-[9px] font-bold text-slate-400 uppercase">
              <span>Ajustar tamaño en PDF</span>
              <span className="text-amber-500 font-mono">{tableroData.fotoScale || 220}px</span>
            </div>
            <input
              type="range"
              min="120"
              max="350"
              value={tableroData.fotoScale || 220}
              onChange={(e) => updateField('fotoScale', parseInt(e.target.value))}
              className="w-full h-1 bg-slate-850 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
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

            {/* Botón flotante para exportar a PDF (no-print) */}
      <div className="fixed bottom-6 right-6 z-40 no-print">
        <button
          onClick={() => window.print()}
          className="flex items-center justify-center w-14 h-14 bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 rounded-full shadow-2xl transition-all cursor-pointer group hover:rotate-6"
          title="Imprimir / Guardar PDF"
        >
          <Printer className="w-6 h-6 group-hover:scale-110 transition-transform" />
        </button>
      </div>

      {/* Cierre / Firmas */}
      <div className="mt-8 bg-slate-100 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 print:bg-slate-50 print:border-gray-300 print:mt-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700 pb-2.5">
          Firma y Cierre de Inspección
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Firma Inspector */}
          <div className="flex flex-col gap-1.5 items-center text-center">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Firma del Inspector</span>
            <input
              type="text"
              value={tableroData.firmaInspector || ''}
              onChange={(e) => updateField('firmaInspector', e.target.value)}
              className="w-full max-w-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-750 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 outline-none h-10 transition-all text-center no-print"
              placeholder="Nombre del Inspector"
            />
            <span className="hidden print:block text-xs font-bold text-slate-900 mt-1 h-6">
              {tableroData.firmaInspector || '___________________________'}
            </span>
            <div className="hidden print:block w-48 border-b border-gray-400 mt-6 h-1"></div>
          </div>

          {/* Firma / Sello de la Empresa */}
          <div className="flex flex-col gap-1.5 items-center text-center">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Firma / Sello de la Empresa</span>
            <input
              type="text"
              value={tableroData.firmaSupervisor || ''}
              onChange={(e) => updateField('firmaSupervisor', e.target.value)}
              className="w-full max-w-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-750 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 outline-none h-10 transition-all text-center no-print"
              placeholder="Nombre / Sello de la Empresa"
            />
            <span className="hidden print:block text-xs font-bold text-slate-900 mt-1 h-6">
              {tableroData.firmaSupervisor || '___________________________'}
            </span>
            <div className="hidden print:block w-48 border-b border-gray-400 mt-6 h-1"></div>
          </div>
        </div>
      </div>

      </div> {/* Fin de screen-container */}
    </div>
  );
};
export default TableroComponent;
